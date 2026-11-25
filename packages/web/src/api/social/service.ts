import { and, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { db } from "../database";
import { socialProfiles as profiles, chatMessages as chats, directMessages as dms, socialBlocks as blocks, guildMembers as members, guilds, onlineRecords, onlineRatings } from "../database/schema";
import { fail, friendlyName, type Tx, type User } from "../online/service";

const DAY = 86_400_000;
export const safeText = (text: string) => text.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\b(?:puta|merda|caralho|porra|foda(?:-se)?|viado|buceta|fdp|fuck|shit)\b/giu, m => "*".repeat(m.length)).trim();
export async function ensureProfile(tx: Tx, user: User) {
  await tx.insert(profiles).values({ userId: user.id, name: safeText(friendlyName(user)), updated: Date.now() }).onConflictDoNothing();
}
export async function publicProfile(id: string) {
  const [p] = await db.select({ userId: profiles.userId, name: profiles.name, bio: profiles.bio, title: profiles.title, avatar: profiles.avatar, showcase: profiles.showcase, level: profiles.level, robots: profiles.robots, tag: guilds.tag, guild: guilds.name, role: members.role, wins: onlineRecords.wins, losses: onlineRecords.losses, rating: onlineRatings.rating }).from(profiles)
    .leftJoin(members, eq(members.userId, profiles.userId)).leftJoin(guilds, eq(guilds.id, members.guildId)).leftJoin(onlineRecords, eq(onlineRecords.userId, profiles.userId)).leftJoin(onlineRatings, eq(onlineRatings.userId, profiles.userId)).where(eq(profiles.userId, id));
  if (!p) return fail("Perfil ainda não publicado.");
  return { ...p, showcase: JSON.parse(p.showcase) as string[] };
}
export async function publish(user: User, data: { name?: string; title?: string; bio?: string; avatar?: string; showcase?: string[]; level?: number; robots?: number }) {
  await db.transaction(async tx => {
    await ensureProfile(tx, user);
    if (!Object.keys(data).length) return;
    const { showcase, name, title, bio, ...stats } = data;
    const clean = name === undefined ? undefined : safeText(name);
    if (clean !== undefined && clean.length < 2) fail("Use pelo menos dois caracteres no nome.");
    await tx.update(profiles).set({ ...stats, name: clean, title: title === undefined ? undefined : safeText(title), bio: bio === undefined ? undefined : safeText(bio), showcase: showcase && JSON.stringify(showcase), updated: Date.now() }).where(eq(profiles.userId, user.id));
  }, { behavior: "immediate" });
  return publicProfile(user.id);
}
export async function directory(user: User, term: string) {
  return db.select({ userId: profiles.userId, name: profiles.name, avatar: profiles.avatar }).from(profiles).where(and(sql`${profiles.userId} != ${user.id}`, sql`instr(lower(${profiles.name}), lower(${term})) > 0`)).orderBy(desc(profiles.updated)).limit(30);
}
async function channel(tx: Tx | typeof db, user: User, scope: "global" | "guild") {
  if (scope === "global") return { key: "global", tag: "" };
  const [m] = await tx.select({ id: members.guildId, tag: guilds.tag }).from(members).innerJoin(guilds, eq(guilds.id, members.guildId)).where(eq(members.userId, user.id));
  if (!m) return fail("Entre em uma guilda para abrir este canal.");
  return { key: `guild:${m.id}`, tag: m.tag };
}
export async function messages(user: User, scope: "global" | "guild") {
  const c = await channel(db, user, scope);
  const rows = await db.select({ id: chats.id, userId: chats.userId, name: sql<string>`coalesce(${profiles.name}, ${chats.name})`, tag: sql<string>`coalesce(${guilds.tag}, '')`, text: chats.text, at: chats.at }).from(chats)
    .leftJoin(profiles, eq(profiles.userId, chats.userId)).leftJoin(members, eq(members.userId, chats.userId)).leftJoin(guilds, eq(guilds.id, members.guildId))
    .where(and(eq(chats.channel, c.key), gt(chats.at, Date.now() - 14 * DAY), sql`not exists (select 1 from ${blocks} where ${blocks.userId} = ${user.id} and ${blocks.blockedId} = ${chats.userId})`)).orderBy(desc(chats.id)).limit(60);
  return rows.reverse();
}
async function throttle(tx: Tx, user: User, now: number) {
  const [line] = await tx.select({ id: chats.id }).from(chats).where(and(eq(chats.userId, user.id), gt(chats.at, now - 1500))).limit(1);
  const [pv] = await tx.select({ id: dms.id }).from(dms).where(and(eq(dms.fromId, user.id), gt(dms.at, now - 1500))).limit(1);
  if (line || pv) fail("Aguarde um instante antes de mandar outra mensagem.");
}
export async function send(user: User, scope: "global" | "guild", raw: string) {
  const text = safeText(raw); if (!text) return fail("Digite uma mensagem.");
  return db.transaction(async tx => {
    const now = Date.now(); await throttle(tx, user, now);
    const c = await channel(tx, user, scope); await ensureProfile(tx, user);
    await tx.insert(chats).values({ channel: c.key, userId: user.id, name: friendlyName(user), tag: c.tag, text, at: now });
    if (Math.random() < 0.05) await tx.delete(chats).where(lt(chats.at, now - 14 * DAY));
    return { ok: true };
  }, { behavior: "immediate" });
}
export async function dm(user: User, to: string, raw: string) {
  const text = safeText(raw); if (!text || to === user.id) return fail("Mensagem ou destinatário inválido.");
  return db.transaction(async tx => {
    const now = Date.now(); await throttle(tx, user, now);
    const [target] = await tx.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, to));
    const [blocked] = await tx.select({ id: blocks.id }).from(blocks).where(or(and(eq(blocks.userId, user.id), eq(blocks.blockedId, to)), and(eq(blocks.userId, to), eq(blocks.blockedId, user.id))));
    if (!target || blocked) fail("Este piloto não pode receber sua mensagem.");
    await ensureProfile(tx, user);
    await tx.insert(dms).values({ fromId: user.id, toId: to, text, at: now });
    return { ok: true };
  }, { behavior: "immediate" });
}
const between = (me: string, peer: string) => or(and(eq(dms.fromId, me), eq(dms.toId, peer)), and(eq(dms.fromId, peer), eq(dms.toId, me)));
export async function thread(user: User, peer: string) {
  return db.transaction(async tx => {
    const rows = await tx.select().from(dms).where(between(user.id, peer)).orderBy(desc(dms.id)).limit(60);
    if (rows.length) await tx.update(dms).set({ read: 1 }).where(and(eq(dms.fromId, peer), eq(dms.toId, user.id), eq(dms.read, 0), sql`${dms.id} <= ${rows[0].id}`));
    return rows.reverse();
  }, { behavior: "immediate" });
}
export async function inbox(user: User) {
  const peer = sql<string>`case when ${dms.fromId} = ${user.id} then ${dms.toId} else ${dms.fromId} end`;
  return db.select({ userId: profiles.userId, name: profiles.name, avatar: profiles.avatar, at: sql<number>`max(${dms.at})`, unread: sql<number>`sum(case when ${dms.toId} = ${user.id} and ${dms.read} = 0 then 1 else 0 end)` }).from(dms)
    .innerJoin(profiles, eq(profiles.userId, peer)).where(or(eq(dms.fromId, user.id), eq(dms.toId, user.id))).groupBy(profiles.userId).orderBy(sql`max(${dms.at}) desc`).limit(40);
}
export async function block(user: User, peer: string, active: boolean) {
  if (peer === user.id) return fail("Não é possível bloquear seu próprio perfil.");
  const id = JSON.stringify([user.id, peer]);
  if (active) await db.insert(blocks).values({ id, userId: user.id, blockedId: peer }).onConflictDoNothing();
  else await db.delete(blocks).where(eq(blocks.id, id));
  return { ok: true };
}
export async function blocked(user: User, peer: string) {
  const [row] = await db.select({ id: blocks.id }).from(blocks).where(and(eq(blocks.userId, user.id), eq(blocks.blockedId, peer)));
  return { active: !!row };
}
