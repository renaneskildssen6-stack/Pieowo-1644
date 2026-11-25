import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, desc, sql, isNull, gt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import { guildBattles, onlineTickets as tickets, onlineMatches as matches, onlineRecords as records, onlineReceipts as receipts, onlineRooms as rooms } from "../database/schema";
import { botTeam, competitiveCombat, perspective, playOnline, validateTeam, TURN_MS } from "./engine";
import type { BattleEvent, Combat, CombatAction, Side } from "../../web/game/combat";
import { compactEvents, eventsFor, type Transition } from "./events";
import { applyRanked, pickRankedFoe, rankedLobby, ratingOf } from "./ranked";
import { botWaitMs, rankedBot } from "./ranked-bot";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Match = typeof matches.$inferSelect;
export type User = { id: string; name: string };
/** Piloto de uma partida: humano (userId real) ou IA do servidor (bot). */
export interface Pilot { userId: string; name: string; side: Side; uids: string[]; robots: string[]; bot?: boolean; rating?: number }
export interface ChatLine { userId: string; name: string; side: Side; emote: string; at: number }
const WAIT_TTL = 45_000;
const ONLINE_MS = 15_000;
export const EMOTES = ["gg", "hi", "lol", "angry", "cry", "wow", "think", "thumbs", "fire", "sorry", "taunt", "love"] as const;

function withEvents(m: Match, events: BattleEvent[]): Match {
  const list: Transition[] = JSON.parse(m.events || "[]");
  list.push({ revision: m.revision, events: compactEvents(events) });
  return { ...m, events: JSON.stringify(list.slice(-6)) };
}
export const fail = (message: string): never => { throw new ORPCError("BAD_REQUEST", { message }); };
export function friendlyName(user: User) { return (user.name || "PILOTO").slice(0, 40); }
async function oneMatch(tx: Tx, id: string): Promise<Match> {
  const [m] = await tx.select().from(matches).where(eq(matches.id, id));
  if (!m) throw new ORPCError("NOT_FOUND", { message: "Partida não encontrada." });
  return m;
}
/** Pilotos da partida; partidas antigas (sem a coluna) derivam de host/guest. */
export function pilotsOf(m: Match, c: Combat): Pilot[] {
  const list: Pilot[] = JSON.parse(m.pilots || "[]");
  if (list.length) return list;
  return [
    { userId: m.hostId, name: m.hostName, side: "player", uids: c.player.fighters.map(f => f.uid), robots: c.player.fighters.map(f => f.robotId) },
    { userId: m.guestId, name: m.guestName, side: "enemy", uids: c.enemy.fighters.map(f => f.uid), robots: c.enemy.fighters.map(f => f.robotId) },
  ];
}
function pilotOf(m: Match, c: Combat, userId: string): Pilot {
  const p = pilotsOf(m, c).find(x => x.userId === userId && !x.bot);
  if (!p) throw new ORPCError("FORBIDDEN", { message: "Você não participa desta partida." });
  return p;
}
const ownerPilot = (m: Match, c: Combat) => c.ready ? pilotsOf(m, c).find(p => p.uids.includes(c.ready!)) ?? null : null;

/** Cria a partida a partir dos pilotos (lado player = anfitrião canônico). IA preenche quem for bot. */
export async function createMatch(tx: Tx, pilots: Pilot[], mode: "duel" | "doubles", now: number, ranked = false): Promise<string> {
  const side = (s: Side) => pilots.filter(p => p.side === s);
  for (const s of ["player", "enemy"] as Side[]) {
    let i = 0;
    for (const p of side(s)) p.uids = p.robots.map(() => `${s}${i++}`);
  }
  const botUids = pilots.filter(p => p.bot).flatMap(p => p.uids);
  const c = competitiveCombat(side("player").flatMap(p => p.robots), side("enemy").flatMap(p => p.robots), { doubles: mode === "doubles", botUids });
  const id = randomUUID();
  const host = side("player").find(p => !p.bot) ?? pilots.find(p => !p.bot)!;
  const guest = side("enemy").find(p => !p.bot) ?? side("enemy")[0];
  await tx.insert(matches).values({ id, hostId: host.userId, guestId: guest.userId, hostName: host.name, guestName: guest.name,
    state: JSON.stringify(c), deadline: now + TURN_MS, created: now, mode, pilots: JSON.stringify(pilots), ranked: ranked ? 1 : 0,
    seen: JSON.stringify(Object.fromEntries(pilots.filter(p => !p.bot).map(p => [p.userId, now]))) });
  return id;
}
async function finalize(tx: Tx, m: Match, c: Combat, now: number): Promise<Match> {
  if (m.finished || c.phase !== "over") return m;
  const pilots = pilotsOf(m, c);
  const winSide: Side = c.result === "win" ? "player" : "enemy";
  const winner = pilots.find(p => p.side === winSide && !p.bot)?.userId ?? "bot";
  // Ranking só conta partidas 100% humanas.
  if (!pilots.some(p => p.bot)) for (const p of pilots) {
    const won = p.side === winSide ? 1 : 0;
    await tx.insert(records).values({ userId: p.userId, name: p.name, wins: won, losses: 1 - won })
      .onConflictDoUpdate({ target: records.userId, set: { name: p.name, wins: sql`${records.wins} + ${won}`, losses: sql`${records.losses} + ${1 - won}` } });
  }
  const rankDelta = m.ranked ? JSON.stringify(await applyRanked(tx, pilots, winSide, now)) : m.rankDelta;
  return { ...m, finished: now, winnerId: winner, rankDelta };
}
async function save(tx: Tx, m: Match): Promise<void> {
  await tx.update(matches).set({ state: m.state, events: m.events, revision: m.revision, deadline: m.deadline, missedHost: m.missedHost, missedGuest: m.missedGuest, finished: m.finished, winnerId: m.winnerId, pilots: m.pilots, rankDelta: m.rankDelta }).where(eq(matches.id, m.id));
}
async function expireTurn(tx: Tx, m: Match, now: number): Promise<Match> {
  if (m.finished || now < m.deadline) return m;
  const c: Combat = JSON.parse(m.state);
  const owner = ownerPilot(m, c);
  if (!owner) return m;
  const side = owner.side;
  const next = { ...m, revision: m.revision + 1, deadline: now + TURN_MS };
  const missed = side === "player" ? ++next.missedHost : ++next.missedGuest;
  let events: BattleEvent[];
  const pilots = pilotsOf(m, c);
  const hasAlly = pilots.some(p => p.side === side && p.userId !== owner.userId && !p.bot);
  if (missed >= 2 && hasAlly) {
    // Duplas: piloto ausente vira IA para o parceiro não perder por abandono.
    const text = `${owner.name} caiu da conexão — a IA assume o robô.`;
    owner.bot = true; c.botUids = [...new Set([...(c.botUids ?? []), ...owner.uids])];
    next.pilots = JSON.stringify(pilots);
    if (side === "player") next.missedHost = 0; else next.missedGuest = 0;
    c.log.push(text);
    events = [{ t: "msg", text }, ...playOnline(c, side, { kind: "pass" })];
  } else if (missed >= 3) {
    c.phase = "over"; c.ready = null; c.result = side === "player" ? "lose" : "win";
    const text = `${owner.name}: três turnos sem resposta — derrota por abandono.`;
    c.log.push(text); events = [{ t: "msg", text }, { t: "end", result: c.result }];
  } else {
    const text = `Tempo esgotado: ${owner.name} perdeu o turno (${missed}/3).`;
    c.log.push(text);
    events = [{ t: "msg", text }, ...playOnline(c, side, { kind: "pass" })];
  }
  const finished = await finalize(tx, withEvents({ ...next, state: JSON.stringify(c) }, events), c, now);
  await save(tx, finished); return finished;
}
function view(m: Match, userId: string, now: number) {
  const c: Combat = JSON.parse(m.state);
  const pilots = pilotsOf(m, c);
  const me = pilotOf(m, c, userId);
  const side = me.side;
  const owner = ownerPilot(m, c);
  const seen: Record<string, number> = JSON.parse(m.seen || "{}");
  const foes = pilots.filter(p => p.side !== side), allies = pilots.filter(p => p.side === side && p.userId !== userId);
  const label = (p: Pilot) => p.bot && !m.ranked ? `${p.name} (IA)` : p.name;
  const votes: string[] = JSON.parse(m.rematch || "[]");
  return { id: m.id, revision: m.revision, deadline: m.deadline, serverNow: now, mode: m.mode as "duel" | "doubles",
    combat: perspective(c, side), mine: !!owner && owner.userId === userId && !owner.bot && !m.finished,
    turnName: owner ? label(owner) : null, allyTurn: !!owner && owner.side === side && owner.userId !== userId,
    myName: me.name, myUids: me.uids, allyName: allies.map(label).join(" & ") || null,
    opponentName: foes.map(label).join(" & "),
    opponentOnline: foes.some(p => p.bot || (seen[p.userId] ?? 0) > now - ONLINE_MS),
    vsBot: !m.ranked && pilots.some(p => p.bot),
    ranked: !!m.ranked, rankDelta: (JSON.parse(m.rankDelta || "{}") as Record<string, number>)[userId] ?? null,
    finished: !!m.finished, won: m.finished ? (c.result === "win") === (side === "player") : null,
    missed: side === "player" ? m.missedHost : m.missedGuest,
    chat: (JSON.parse(m.chat || "[]") as ChatLine[]).map(l => ({ ...l, mine: l.side === side })),
    rematchVotes: votes.length, rematchMine: votes.includes(userId), rematchNeeded: pilots.filter(p => !p.bot).length, nextId: m.nextId,
    transitions: (JSON.parse(m.events || "[]") as Transition[]).map(t => ({ revision: t.revision, events: eventsFor(t.events, side) })) };
}
export type OnlineMatchView = ReturnType<typeof view>;
export async function idle(tx: Tx, user: User): Promise<void> {
  const [t] = await tx.select().from(tickets).where(eq(tickets.userId, user.id));
  if (!t) return;
  if (t.matchId && !(await oneMatch(tx, t.matchId)).finished) fail("Você já tem uma partida ativa. Retome-a antes de iniciar outra.");
  await tx.delete(tickets).where(eq(tickets.userId, user.id));
}
type Ticket = typeof tickets.$inferSelect;
const pilotFrom = (t: Ticket, side: Side): Pilot => ({ userId: t.userId, name: t.name, side, uids: [], robots: JSON.parse(t.team) });
async function pair(tx: Tx, a: Ticket, b: Ticket, now: number, ranked = false): Promise<string> {
  const id = await createMatch(tx, [pilotFrom(a, "player"), pilotFrom(b, "enemy")], "duel", now, ranked);
  await tx.update(tickets).set({ matchId: id, code: null }).where(eq(tickets.userId, a.userId));
  await tx.update(tickets).set({ matchId: id, code: null }).where(eq(tickets.userId, b.userId));
  return id;
}
export async function enterQueue(user: User, team: string[], privateRoom: boolean, ranked = false) {
  if (ranked && privateRoom) fail("A ranqueada usa só a fila pública.");
  try { validateTeam(team); } catch (e) { fail((e as Error).message); }
  return db.transaction(async tx => {
    const now = Date.now(); await idle(tx, user);
    const code = privateRoom ? randomBytes(5).toString("hex").toUpperCase() : null;
    const ticket = { userId: user.id, name: friendlyName(user), team: JSON.stringify(team), kind: privateRoom ? "private" : ranked ? "ranked" : "public", code, matchId: null, heartbeat: now, joined: now };
    await tx.insert(tickets).values(ticket);
    if (ranked) {
      const candidates = await tx.select().from(tickets).where(and(eq(tickets.kind, "ranked"), sql`${tickets.matchId} IS NULL`, sql`${tickets.userId} != ${user.id}`, sql`${tickets.heartbeat} > ${now - WAIT_TTL}`)).orderBy(tickets.joined).limit(100);
      const foe = await pickRankedFoe(tx, ticket, candidates, now);
      if (foe) await pair(tx, foe, ticket, now, true);
    } else if (!privateRoom) {
      const candidates = await tx.select().from(tickets).where(and(eq(tickets.kind, "public"), sql`${tickets.matchId} IS NULL`, sql`${tickets.userId} != ${user.id}`, sql`${tickets.heartbeat} > ${now - WAIT_TTL}`)).orderBy(tickets.joined).limit(100);
      const foe = candidates.find(t => JSON.parse(t.team).length === team.length);
      if (foe) await pair(tx, foe, ticket, now);
    }
    return { ok: true, code };
  }, { behavior: "immediate" });
}
/** Fila demorou: enfrenta a IA do servidor com uma equipe sorteada do mesmo tamanho (não conta no ranking). */
export async function versusBot(user: User) {
  return db.transaction(async tx => {
    const now = Date.now();
    const [t] = await tx.select().from(tickets).where(eq(tickets.userId, user.id));
    if (!t) fail("Entre na fila primeiro.");
    if (t!.matchId) return { matchId: t!.matchId };
    if (t!.kind === "ranked") fail("Na ranqueada o rival é sorteado pela fila.");
    const team: string[] = JSON.parse(t!.team);
    const bot: Pilot = { userId: "bot", name: "IA RIVAL", side: "enemy", uids: [], robots: botTeam(team.length, team), bot: true };
    const id = await createMatch(tx, [pilotFrom(t!, "player"), bot], "duel", now);
    await tx.update(tickets).set({ matchId: id, code: null }).where(eq(tickets.userId, user.id));
    return { matchId: id };
  }, { behavior: "immediate" });
}
export async function joinRoom(user: User, team: string[], code: string) {
  try { validateTeam(team); } catch (e) { fail((e as Error).message); }
  return db.transaction(async tx => {
    const now = Date.now();
    const [host] = await tx.select().from(tickets).where(eq(tickets.code, code.toUpperCase()));
    if (!host || host.matchId || host.heartbeat < now - WAIT_TTL) fail("Sala expirada ou código incorreto. O anfitrião precisa estar no lobby.");
    if (host!.userId === user.id) fail("Não é possível enfrentar a própria conta.");
    if (JSON.parse(host!.team).length !== team.length) fail(`Esta sala exige equipe de ${JSON.parse(host!.team).length} robô(s).`);
    await idle(tx, user);
    const ticket = { userId: user.id, name: friendlyName(user), team: JSON.stringify(team), kind: "private", code: null, matchId: null, heartbeat: now, joined: now };
    await tx.insert(tickets).values(ticket); const id = await pair(tx, host!, ticket, now);
    return { matchId: id };
  }, { behavior: "immediate" });
}
export async function lobby(user: User) {
  return db.transaction(async tx => {
    const now = Date.now();
    let ticket: Ticket | undefined = (await tx.select().from(tickets).where(eq(tickets.userId, user.id)))[0];
    if (ticket && !ticket.matchId && ticket.heartbeat < now - WAIT_TTL) {
      await tx.delete(tickets).where(eq(tickets.userId, user.id)); ticket = undefined;
    }
    if (ticket) await tx.update(tickets).set({ heartbeat: now }).where(eq(tickets.userId, user.id));
    if (ticket?.kind === "ranked" && !ticket.matchId) {
      // A janela de rating abre com o tempo: tenta parear de novo a cada consulta do lobby.
      const candidates = await tx.select().from(tickets).where(and(eq(tickets.kind, "ranked"), isNull(tickets.matchId), sql`${tickets.userId} != ${user.id}`, gt(tickets.heartbeat, now - WAIT_TTL))).orderBy(tickets.joined).limit(100);
      const foe = await pickRankedFoe(tx, ticket, candidates, now);
      if (foe) ticket = { ...ticket, matchId: await pair(tx, foe, ticket, now, true) };
      else if (now - ticket.joined >= botWaitMs(ticket.userId, ticket.joined)) {
        // Ninguém na janela: às vezes o rival é um bot com rating próximo (vale rating como uma partida normal).
        const bot = rankedBot(JSON.parse(ticket.team), await ratingOf(tx, ticket.userId));
        const id = await createMatch(tx, [pilotFrom(ticket, "player"), bot], "duel", now, true);
        await tx.update(tickets).set({ matchId: id, code: null }).where(eq(tickets.userId, ticket.userId));
        ticket = { ...ticket, matchId: id };
      }
    }
    const active = ticket?.matchId ? await expireTurn(tx, await oneMatch(tx, ticket.matchId), now) : null;
    const ranked = await rankedLobby(tx, user.id);
    const leaders = await tx.select({ name: records.name, wins: records.wins, losses: records.losses }).from(records).orderBy(desc(records.wins)).limit(10);
    const [record] = await tx.select().from(records).where(eq(records.userId, user.id));
    const [{ n: queued }] = await tx.select({ n: sql<number>`count(*)` }).from(tickets).where(and(isNull(tickets.matchId), gt(tickets.heartbeat, now - WAIT_TTL)));
    const [{ n: live }] = await tx.select({ n: sql<number>`count(*)` }).from(matches).where(and(isNull(matches.finished), gt(matches.deadline, now - 120_000)));
    const [{ n: duoRooms }] = await tx.select({ n: sql<number>`count(*)` }).from(rooms).where(and(isNull(rooms.matchId), gt(rooms.updated, now - 30_000)));
    return { ticket: ticket ? { kind: ticket.kind, code: ticket.code, matchId: ticket.matchId, team: JSON.parse(ticket.team) as string[], joined: ticket.joined, matchFinished: !!active?.finished } : null,
      record: { wins: record?.wins ?? 0, losses: record?.losses ?? 0 }, leaders, ranked, serverNow: now,
      stats: { queued: Number(queued), live: Number(live), duoRooms: Number(duoRooms) } };
  }, { behavior: "immediate" });
}
export async function cancelQueue(user: User) {
  return db.transaction(async tx => { await idle(tx, user); return { ok: true }; }, { behavior: "immediate" });
}
async function touch(tx: Tx, m: Match, userId: string, now: number) {
  const seen: Record<string, number> = JSON.parse(m.seen || "{}");
  if ((seen[userId] ?? 0) > now - 3000) return;
  seen[userId] = now;
  await tx.update(matches).set({ seen: JSON.stringify(seen) }).where(eq(matches.id, m.id));
  m.seen = JSON.stringify(seen);
}
export async function matchState(user: User, id: string): Promise<OnlineMatchView> {
  return db.transaction(async tx => {
    const now = Date.now(); let m = await oneMatch(tx, id); pilotOf(m, JSON.parse(m.state), user.id);
    m = await expireTurn(tx, m, now); await touch(tx, m, user.id, now); return view(m, user.id, now);
  }, { behavior: "immediate" });
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
/** Long-poll: segura a requisição até a revisão/chat mudar (ou ~12 s). Resposta quase instantânea sem WebSocket. */
export async function waitMatch(user: User, id: string, revision: number, chatAt: number): Promise<OnlineMatchView> {
  const until = Date.now() + 12_000; let lastFull = 0;
  for (;;) {
    let row: { revision: number; chat: string | null; finished: number | boolean | null; deadline: number; nextId: string | null } | undefined;
    // Banco ocupado (escrita do bot/rival) não deve virar erro 500 no long-poll: tenta de novo até o limite.
    try { [row] = await db.select({ revision: matches.revision, chat: matches.chat, finished: matches.finished, deadline: matches.deadline, nextId: matches.nextId, rematch: matches.rematch }).from(matches).where(eq(matches.id, id)); }
    catch (e) { if (Date.now() >= until) throw e; await sleep(200); continue; }
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Partida não encontrada." });
    const chat: ChatLine[] = JSON.parse(row.chat || "[]");
    const changed = row.revision !== revision || (chat[chat.length - 1]?.at ?? 0) > chatAt || !!row.nextId;
    const now = Date.now();
    if (changed || now >= until || (!row.finished && now >= row.deadline) || now - lastFull > 6000) {
      let v: OnlineMatchView;
      try { v = await matchState(user, id); }
      catch (e) { if (e instanceof ORPCError || Date.now() >= until) throw e; await sleep(200); continue; }
      if (changed || now >= until || v.revision !== revision) return v;
      lastFull = now;
    }
    await sleep(450);
  }
}
export async function action(user: User, input: { id: string; revision: number; requestId: string; action: CombatAction }): Promise<OnlineMatchView> {
  return db.transaction(async tx => {
    const now = Date.now(); let m = await oneMatch(tx, input.id);
    const receiptId = `${input.id}:${user.id}:${input.requestId}`;
    const [receipt] = await tx.select().from(receipts).where(eq(receipts.id, receiptId));
    if (receipt) return view(m, user.id, now);
    m = await expireTurn(tx, m, now);
    if (m.finished || m.revision !== input.revision) return view(m, user.id, now);
    const c: Combat = JSON.parse(m.state);
    const me = pilotOf(m, c, user.id);
    if (!c.ready || !me.uids.includes(c.ready)) fail("Não é seu turno.");
    let events: BattleEvent[] = [];
    try { events = playOnline(c, me.side, input.action); } catch (e) { fail((e as Error).message); }
    m = withEvents({ ...m, state: JSON.stringify(c), revision: m.revision + 1, deadline: now + TURN_MS,
      missedHost: me.side === "player" ? 0 : m.missedHost, missedGuest: me.side === "enemy" ? 0 : m.missedGuest }, events);
    m = await finalize(tx, m, c, now); await save(tx, m); await touch(tx, m, user.id, now);
    await tx.insert(receipts).values({ id: receiptId, matchId: m.id, userId: user.id, requestId: input.requestId, revision: m.revision });
    return view(m, user.id, now);
  }, { behavior: "immediate" });
}
export async function emote(user: User, id: string, emoteId: string) {
  if (!(EMOTES as readonly string[]).includes(emoteId)) fail("Emote inválido.");
  return db.transaction(async tx => {
    const now = Date.now(); const m = await oneMatch(tx, id); const me = pilotOf(m, JSON.parse(m.state), user.id);
    const chat: ChatLine[] = JSON.parse(m.chat || "[]");
    if (chat.filter(l => l.userId === user.id && l.at > now - 2500).length) fail("Calma, piloto — um emote a cada 2,5 s.");
    chat.push({ userId: user.id, name: me.name, side: me.side, emote: emoteId, at: now });
    await tx.update(matches).set({ chat: JSON.stringify(chat.slice(-12)) }).where(eq(matches.id, id));
    return { ok: true, at: now };
  }, { behavior: "immediate" });
}
/** Revanche: quando todos os humanos votam, nasce uma nova partida com os mesmos pilotos e lados trocados. */
export async function rematch(user: User, id: string) {
  return db.transaction(async tx => {
    const now = Date.now(); const m = await oneMatch(tx, id); const c: Combat = JSON.parse(m.state);
    pilotOf(m, c, user.id);
    if (!m.finished) fail("A partida ainda não terminou.");
    const [guildBattle] = await tx.select({ id: guildBattles.matchId }).from(guildBattles).where(eq(guildBattles.matchId, id));
    if (guildBattle) fail("Abra um novo desafio pelo quartel da guilda.");
    if (m.nextId) return { nextId: m.nextId };
    if (m.ranked) fail("Ranqueada não tem revanche — volte à fila para a próxima.");
    const votes = new Set<string>(JSON.parse(m.rematch || "[]")); votes.add(user.id);
    const pilots = pilotsOf(m, c).map(p => ({ ...p, uids: [], bot: p.bot && p.userId.startsWith("bot") ? true : undefined }));
    const humans = pilots.filter(p => !p.bot);
    let nextId: string | null = null;
    if (humans.every(p => votes.has(p.userId))) {
      const swapped = pilots.map(p => ({ ...p, side: (p.side === "player" ? "enemy" : "player") as Side }));
      const ordered = [...swapped.filter(p => p.side === "player"), ...swapped.filter(p => p.side === "enemy")];
      nextId = await createMatch(tx, ordered, m.mode === "doubles" ? "doubles" : "duel", now);
      for (const p of humans) await tx.update(tickets).set({ matchId: nextId }).where(eq(tickets.userId, p.userId));
    }
    await tx.update(matches).set({ rematch: JSON.stringify([...votes]), nextId }).where(eq(matches.id, id));
    return { nextId };
  }, { behavior: "immediate" });
}
export async function surrender(user: User, id: string) {
  return db.transaction(async tx => {
    const now = Date.now(); let m = await oneMatch(tx, id);
    if (!m.finished) {
      const c: Combat = JSON.parse(m.state); const side = pilotOf(m, c, user.id).side;
      c.phase = "over"; c.ready = null; c.result = side === "player" ? "lose" : "win";
      const text = `${friendlyName(user)} desistiu da partida.`;
      c.log.push(text);
      m = withEvents({ ...m, state: JSON.stringify(c), revision: m.revision + 1 }, [{ t: "msg", text }, { t: "end", result: c.result }]);
      m = await finalize(tx, m, c, now); await save(tx, m);
    }
    return view(m, user.id, now);
  }, { behavior: "immediate" });
}
