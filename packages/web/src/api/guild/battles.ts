import { and, desc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import { guilds, guildMembers as members, guildWars as wars, guildBoss as bosses, guildBattles as battles, onlineMatches as matches, onlineTickets as tickets } from "../database/schema";
import { botTeam } from "../online/engine";
import { createMatch, fail, idle, pilotsOf, type Pilot, type Tx, type User } from "../online/service";
import type { Combat } from "../../web/game/combat";
import { addXp, DAY, guild, memberName, requireMember, roster, txRun } from "./members";

export const ATTEMPTS = 3;
const dayStart = (now: number) => Math.floor(now / DAY) * DAY;
const weekStart = (now: number) => Math.floor((now + 3 * DAY) / (7 * DAY)) * 7 * DAY - 3 * DAY;
const warFilter = (id: string) => or(eq(wars.guildA, id), eq(wars.guildB, id));
type Defender = { id: string; name: string; team: string[]; custom: boolean };
async function snapshot(tx: Tx, guildId: string): Promise<Defender[]> {
  return (await roster(tx, guildId)).map(m => ({ id: m.userId, name: m.name, team: m.defense === "[]" ? botTeam(3) : JSON.parse(m.defense), custom: m.defense !== "[]" }));
}
const defenders = (w: typeof wars.$inferSelect, id: string): Defender[] => JSON.parse(w.guildA === id ? w.defensesB : w.defensesA);
const bossHP = (tier: number) => 2400 + 850 * (tier - 1);
export const pilot = (userId: string, name: string, side: Pilot["side"], robots: string[], bot = false): Pilot => ({ userId, name, side, robots, uids: [], bot });
export async function launch(tx: Tx, pilots: Pilot[], mode: "duel" | "doubles", now: number) {
  for (const p of pilots) if (!p.bot) await idle(tx, { id: p.userId, name: p.name });
  const id = await createMatch(tx, pilots, mode, now);
  for (const p of pilots) if (!p.bot) await tx.insert(tickets).values({ userId: p.userId, name: p.name, team: JSON.stringify(p.robots), kind: "guild", matchId: id, joined: now, heartbeat: now });
  return id;
}
async function refreshBoss(tx: Tx, id: string, now: number) {
  const [b] = await tx.select().from(bosses).where(eq(bosses.guildId, id));
  const week = weekStart(now);
  if (b?.week === week) return b;
  const next = { guildId: id, tier: 1, hp: bossHP(1), maxHp: bossHP(1), robot: botTeam(1)[0], week, kills: 0 };
  await tx.insert(bosses).values(next).onConflictDoUpdate({ target: bosses.guildId, set: next });
  return next;
}
async function settle(tx: Tx, guildId: string, now: number) {
  const pending = await tx.select({ b: battles, match: matches }).from(battles).innerJoin(matches, eq(matches.id, battles.matchId))
    .where(and(eq(battles.guildId, guildId), eq(battles.settled, 0), or(sql`${matches.finished} is not null`, sql`${matches.deadline} < ${now - 6 * 60_000}`))).orderBy(matches.finished);
  for (const { b, match } of pending) {
    let value = 0, won = Number(match.winnerId === b.userId);
    const c: Combat = JSON.parse(match.state);
    if (!match.finished) {
      c.phase = "over"; c.ready = null; c.result = "lose";
      await tx.update(matches).set({ state: JSON.stringify(c), finished: now, winnerId: "abandoned", revision: match.revision + 1 }).where(eq(matches.id, match.id));
    } else if (b.kind === "war" && b.warId) {
      const [w] = await tx.select().from(wars).where(and(eq(wars.id, b.warId), eq(wars.status, "active")));
      if (w && match.finished <= w.ends && won) {
        value = 3;
        await tx.update(wars).set(w.guildA === guildId ? { scoreA: sql`${wars.scoreA} + ${value}` } : { scoreB: sql`${wars.scoreB} + ${value}` }).where(eq(wars.id, w.id));
      }
    } else if (b.kind === "boss") {
      const boss = await refreshBoss(tx, guildId, now);
      if (b.warId === `${boss.week}:${boss.tier}`) {
        const f = c.enemy.fighters[0];
        value = Math.min(boss.hp, Math.max(0, f.maxHp - f.hp));
        if (value) {
          if (value >= boss.hp) {
            const tier = boss.tier + 1, hp = bossHP(tier);
            await tx.update(bosses).set({ tier, hp, maxHp: hp, robot: botTeam(1, [boss.robot])[0], kills: boss.kills + 1 }).where(eq(bosses.guildId, guildId));
            await addXp(tx, guildId, 100 * boss.tier);
          } else await tx.update(bosses).set({ hp: boss.hp - value }).where(eq(bosses.guildId, guildId));
        }
      }
    } else if (b.kind === "duel") {
      for (const p of pilotsOf(match, c).filter(p => !p.bot)) {
        const win = (c.result === "win") === (p.side === "player");
        await tx.update(members).set(win ? { duelWins: sql`${members.duelWins} + 1` } : { duelLosses: sql`${members.duelLosses} + 1` }).where(and(eq(members.guildId, guildId), eq(members.userId, p.userId)));
      }
      won = Number(c.result === "win");
    }
    await tx.update(battles).set({ settled: 1, value, won }).where(eq(battles.matchId, b.matchId));
    if (value > 0) {
      const scope = and(eq(members.guildId, guildId), eq(members.userId, b.userId));
      await tx.update(members).set(b.kind === "war" ? { warPoints: sql`${members.warPoints} + ${value}`, contribution: sql`${members.contribution} + 15` } : { bossDamage: sql`${members.bossDamage} + ${value}`, contribution: sql`${members.contribution} + ${Math.max(1, Math.floor(value / 25))}` }).where(scope);
      await addXp(tx, guildId, b.kind === "war" ? 15 : Math.max(1, Math.floor(value / 25)));
    }
  }
}
async function activeWar(tx: Tx, id: string, now: number) {
  const [w] = await tx.select().from(wars).where(and(warFilter(id), eq(wars.status, "active")));
  if (!w || w.ends > now) return w;
  await settle(tx, w.guildA, now);
  await settle(tx, w.guildB, now);
  const [final] = await tx.select().from(wars).where(eq(wars.id, w.id));
  const winner = final.scoreA === final.scoreB ? null : final.scoreA > final.scoreB ? w.guildA : w.guildB;
  await tx.update(wars).set({ status: "finished", winner }).where(eq(wars.id, w.id));
  for (const g of [w.guildA, w.guildB]) {
    if (winner === g) {
      await tx.update(guilds).set({ wins: sql`${guilds.wins} + 1`, trophies: sql`${guilds.trophies} + 30` }).where(eq(guilds.id, g));
      await addXp(tx, g, 80);
    } else if (winner) await tx.update(guilds).set({ losses: sql`${guilds.losses} + 1`, trophies: sql`max(0, ${guilds.trophies} - 20)` }).where(eq(guilds.id, g));
  }
  return undefined;
}
export async function queueWar(user: User, search: boolean) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id, true), g = await guild(tx, m.guildId), now = Date.now();
    if (await activeWar(tx, g.id, now)) fail("Já existe uma guerra ativa.");
    if (!search) { await tx.update(guilds).set({ warSearch: null }).where(eq(guilds.id, g.id)); return { paired: false }; }
    const [opp] = await tx.select().from(guilds).where(and(sql`${guilds.id} != ${g.id}`, gt(guilds.warSearch, now - DAY))).orderBy(guilds.warSearch).limit(1);
    if (!opp) { await tx.update(guilds).set({ warSearch: now }).where(eq(guilds.id, g.id)); return { paired: false }; }
    await tx.insert(wars).values({ id: crypto.randomUUID(), guildA: opp.id, guildB: g.id, nameA: opp.name, nameB: g.name, tagA: opp.tag, tagB: g.tag, defensesA: JSON.stringify(await snapshot(tx, opp.id)), defensesB: JSON.stringify(await snapshot(tx, g.id)), starts: now, ends: now + DAY });
    await tx.update(guilds).set({ warSearch: null }).where(or(eq(guilds.id, g.id), eq(guilds.id, opp.id)));
    return { paired: true };
  });
}
export async function status(user: User) {
  return txRun(async tx => {
    const me = await requireMember(tx, user.id); const id = me.guildId, now = Date.now();
    await settle(tx, id, now);
    let war = await activeWar(tx, id, now); const boss = await refreshBoss(tx, id, now);
    if (war) { await settle(tx, war.guildA === id ? war.guildB : war.guildA, now); war = await activeWar(tx, id, now); }
    const history = await tx.select().from(wars).where(and(warFilter(id), eq(wars.status, "finished"))).orderBy(desc(wars.ends)).limit(5);
    const targets = war ? defenders(war, id).map(({id, name, custom}) => ({ id, name, custom })) : [];
    const mine = await tx.select().from(battles).where(and(eq(battles.guildId, id), eq(battles.userId, user.id), or(gte(battles.created, dayStart(now)), ...(war ? [eq(battles.warId, war.id)] : [])))).orderBy(desc(battles.created));
    const [ticket] = await tx.select({ id: tickets.matchId }).from(tickets).innerJoin(matches, eq(matches.id, tickets.matchId)).innerJoin(battles, eq(battles.matchId, matches.id)).where(and(eq(tickets.userId, user.id), isNull(matches.finished), eq(battles.guildId, id)));
    const publicWar = ({ defensesA: _a, defensesB: _b, ...rest }: typeof wars.$inferSelect) => rest;
    return { now, me, war: war && publicWar(war), boss, targets, history: history.map(publicWar), activeMatch: ticket?.id ?? null, warLeft: war ? ATTEMPTS - mine.filter(b => b.warId === war.id).length : 0, bossLeft: ATTEMPTS - mine.filter(b => b.kind === "boss" && b.created >= dayStart(now)).length, log: mine.slice(0, 6) };
  });
}
export async function attack(user: User, kind: "war" | "boss", team: string[], target?: string) {
  return txRun(async tx => {
    const me = await requireMember(tx, user.id), id = me.guildId, now = Date.now(); await settle(tx, id, now);
    let ref: string, foe: Pilot;
    if (kind === "war") {
      const war = await activeWar(tx, id, now);
      if (team.length !== 3) return fail("As equipes de guerra usam três robôs.");
      if (!war || me.joined > war.starts || war.ends - now < 60_000) return fail("Você não pode atacar nesta guerra agora.");
      const rival = defenders(war, id).find(r => r.id === target);
      if (!rival) return fail("Defensor inválido.");
      foe = pilot("bot-war", rival.name, "enemy", rival.team, true); ref = war.id;
    } else {
      const boss = await refreshBoss(tx, id, now);
      foe = pilot("bot-boss", "TITÃ DA GUILDA", "enemy", [boss.robot, ...botTeam(team.length - 1, [boss.robot, ...team])], true); ref = `${boss.week}:${boss.tier}`;
    }
    const prior = await tx.select({ id: battles.matchId, target: battles.target }).from(battles).where(and(eq(battles.guildId, id), eq(battles.userId, user.id), eq(battles.kind, kind), kind === "war" ? eq(battles.warId, ref) : gte(battles.created, dayStart(now))));
    if (prior.length >= ATTEMPTS) fail("Você usou todas as investidas disponíveis.");
    const matchId = await launch(tx, [pilot(user.id, await memberName(tx, user), "player", team), foe], "duel", now);
    if (kind === "boss") {
      const [m] = await tx.select().from(matches).where(eq(matches.id, matchId));
      const c: Combat = JSON.parse(m.state), f = c.enemy.fighters[0];
      const damage = Math.max(0, f.maxHp - f.hp), tier = Number(ref.split(":")[1]);
      f.maxHp = Math.round(f.maxHp * Math.min(6, 2.1 + tier * 0.35)); f.hp = Math.max(1, f.maxHp - damage); f.name = `TITÃ · SETOR ${tier}`;
      await tx.update(matches).set({ state: JSON.stringify(c) }).where(eq(matches.id, matchId));
    }
    await tx.insert(battles).values({ matchId, kind, guildId: id, userId: user.id, warId: ref, target: target ?? null, targetName: foe.name, created: now });
    return { matchId };
  });
}
