import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../database";
import { guilds, guildMembers as members, guildRequests as requests, guildChallenges as rooms, guildWars as wars, socialProfiles as profiles } from "../database/schema";
import { fail, type Tx, type User } from "../online/service";
import { ensureProfile, safeText } from "../social/service";

export const txRun = <T>(run: (tx: Tx) => Promise<T>) => db.transaction(run, { behavior: "immediate" });
export const capacity = (level: number) => Math.min(30, 10 + 2 * level);
export const xpNeed = (level: number) => 200 * level;
export const DAY = 86_400_000;
export async function member(tx: Tx | typeof db, id: string) { return (await tx.select().from(members).where(eq(members.userId, id)))[0]; }
export async function guild(tx: Tx | typeof db, id: string) {
  const [g] = await tx.select().from(guilds).where(eq(guilds.id, id));
  return g ?? fail("Guilda não encontrada.");
}
export async function requireMember(tx: Tx | typeof db, id: string, staff = false) {
  const m = await member(tx, id);
  if (!m || (staff && m.role === "member")) return fail(staff ? "Ação reservada à liderança." : "Entre em uma guilda primeiro.");
  return m;
}
export async function roster(tx: Tx | typeof db, id: string) {
  return tx.select().from(members).where(eq(members.guildId, id)).orderBy(sql`case ${members.role} when 'leader' then 0 when 'officer' then 1 else 2 end`, desc(members.contribution));
}
export async function addXp(tx: Tx, id: string, amount: number) {
  const g = await guild(tx, id); let level = g.level, xp = g.xp + amount;
  while (xp >= xpNeed(level)) { xp -= xpNeed(level); level++; }
  await tx.update(guilds).set({ xp, level }).where(eq(guilds.id, id));
}
export async function list(term: string) {
  return db.select({ id: guilds.id, name: guilds.name, tag: guilds.tag, emblem: guilds.emblem, color: guilds.color, level: guilds.level, joinMode: guilds.joinMode, motto: guilds.motto, trophies: guilds.trophies, count: sql<number>`(select count(*) from ${members} where ${members.guildId} = ${guilds.id})` }).from(guilds)
    .where(or(sql`instr(lower(${guilds.name}), lower(${term})) > 0`, sql`instr(lower(${guilds.tag}), lower(${term})) > 0`)).orderBy(desc(guilds.trophies), desc(guilds.level), guilds.name).limit(40);
}
export async function home(user: User) {
  const me = await member(db, user.id);
  if (!me) return { me: null, guild: null, members: [], requests: await db.select().from(requests).where(eq(requests.userId, user.id)) };
  return { me, guild: await guild(db, me.guildId), members: await roster(db, me.guildId), requests: me.role === "member" ? [] : await db.select().from(requests).where(eq(requests.guildId, me.guildId)).limit(50) };
}
async function enroll(tx: Tx, id: string, name: string, g: Awaited<ReturnType<typeof guild>>, role = "member") {
  if (await member(tx, id)) fail("O piloto já está em uma guilda.");
  if ((await roster(tx, g.id)).length >= capacity(g.level)) fail("A guilda está cheia.");
  await tx.insert(members).values({ userId: id, name, guildId: g.id, joined: Date.now(), role });
  await tx.delete(requests).where(eq(requests.userId, id));
}
export async function create(user: User, input: Pick<typeof guilds.$inferInsert, "name" | "tag" | "emblem" | "color" | "motto" | "joinMode">) {
  return txRun(async tx => {
    if (await member(tx, user.id)) fail("Saia da guilda atual primeiro.");
    const name = safeText(input.name), tag = input.tag.toUpperCase();
    if (name.length < 3) fail("Nome da guilda inválido.");
    const [clash] = await tx.select({ id: guilds.id }).from(guilds).where(or(sql`lower(${guilds.name}) = lower(${name})`, eq(guilds.tag, tag)));
    if (clash) fail("Nome ou tag já em uso.");
    await ensureProfile(tx, user);
    const id = crypto.randomUUID();
    await tx.insert(guilds).values({ ...input, id, leaderId: user.id, name, tag, motto: safeText(input.motto ?? ""), created: Date.now() });
    await enroll(tx, user.id, safeText(user.name), await guild(tx, id), "leader");
    return { id };
  });
}
export async function join(user: User, id: string) {
  return txRun(async tx => {
    if (await member(tx, user.id)) fail("Saia da guilda atual primeiro.");
    const g = await guild(tx, id); const name = safeText(user.name);
    await ensureProfile(tx, user);
    if (g.joinMode === "open") { await enroll(tx, user.id, name, g); return { pending: false }; }
    if ((await roster(tx, id)).length >= capacity(g.level)) fail("A guilda está cheia.");
    if ((await tx.select({ id: requests.id }).from(requests).where(eq(requests.userId, user.id)).limit(8)).length >= 8) fail("Você já tem oito pedidos pendentes.");
    await tx.insert(requests).values({ id: `${id}:${user.id}`, userId: user.id, guildId: id, name, created: Date.now() }).onConflictDoNothing();
    return { pending: true };
  });
}
export async function decide(user: User, target: string, accept: boolean) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id, true);
    const [r] = await tx.select().from(requests).where(and(eq(requests.guildId, m.guildId), eq(requests.userId, target)));
    if (!r) return fail("Pedido não encontrado.");
    if (accept) await enroll(tx, r.userId, r.name, await guild(tx, m.guildId));
    else await tx.delete(requests).where(eq(requests.id, r.id));
    return { ok: true };
  });
}
export async function manage(user: User, target: string, action: "kick" | "officer" | "member" | "transfer" | "leave") {
  return txRun(async tx => {
    const me = await requireMember(tx, user.id); const g = await guild(tx, me.guildId);
    const t = action === "leave" ? me : await requireMember(tx, target);
    if (t.guildId !== g.id || (action !== "leave" && (t.userId === user.id || me.role === "member" || (me.role === "officer" && (action !== "kick" || t.role !== "member"))))) fail("Você não pode alterar este piloto.");
    if (action === "leave" && me.role === "leader") {
      if ((await roster(tx, g.id)).length > 1) fail("Transfira a liderança antes de sair.");
      const [active] = await tx.select({ id: wars.id }).from(wars).where(and(eq(wars.status, "active"), or(eq(wars.guildA, g.id), eq(wars.guildB, g.id))));
      if (active) fail("Finalize a guerra no painel antes de dissolver a guilda.");
      await tx.delete(requests).where(eq(requests.guildId, g.id));
      await tx.delete(rooms).where(eq(rooms.guildId, g.id));
      await tx.delete(guilds).where(eq(guilds.id, g.id));
    }
    if (action === "leave" || action === "kick") await tx.delete(members).where(eq(members.userId, t.userId));
    else if (action === "transfer") {
      await tx.update(members).set({ role: "officer" }).where(eq(members.userId, me.userId));
      await tx.update(members).set({ role: "leader" }).where(eq(members.userId, t.userId));
      await tx.update(guilds).set({ leaderId: t.userId }).where(eq(guilds.id, g.id));
    } else await tx.update(members).set({ role: action }).where(eq(members.userId, t.userId));
    return { ok: true };
  });
}
export async function defense(user: User, team: string[]) {
  await requireMember(db, user.id);
  await db.update(members).set({ defense: JSON.stringify(team) }).where(eq(members.userId, user.id));
  return { ok: true };
}
export async function memberName(tx: Tx, user: User) {
  const [p] = await tx.select({ name: profiles.name }).from(profiles).where(eq(profiles.userId, user.id));
  return p?.name || user.name;
}
