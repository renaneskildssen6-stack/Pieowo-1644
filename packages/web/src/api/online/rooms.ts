import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import { onlineRooms as rooms, onlineTickets as tickets } from "../database/schema";
import { botTeam, validateTeam } from "./engine";
import { createMatch, fail, friendlyName, idle, type Pilot, type Tx, type User } from "./service";

/** Salas DUPLAS 2v2: 4 assentos (0-1 = equipe AZUL, 2-3 = equipe VERMELHA), 1 robô por piloto. */
interface Seat { userId: string; name: string; robot: string; seen: number }
type Room = typeof rooms.$inferSelect;
const STALE = 30_000;
const ROOM_TTL = 10 * 60_000;

const seatsOf = (r: Room): (Seat | null)[] => { const s = JSON.parse(r.seats || "[]"); return [0, 1, 2, 3].map(i => s[i] ?? null); };
async function save(tx: Tx, code: string, seats: (Seat | null)[], extra: Partial<Room> = {}) {
  await tx.update(rooms).set({ seats: JSON.stringify(seats), updated: Date.now(), ...extra }).where(eq(rooms.code, code));
}
function checkRobot(robot: string) { try { validateTeam([robot]); } catch (e) { fail((e as Error).message); } }
async function findMine(tx: Tx, userId: string): Promise<Room | undefined> {
  const list = await tx.select().from(rooms).where(sql`${rooms.seats} LIKE ${`%"userId":"${userId}"%`}`);
  return list.find(r => !r.matchId && seatsOf(r).some(s => s?.userId === userId));
}
function present(r: Room, user: User) {
  const seats = seatsOf(r);
  return {
    code: r.code, isPublic: !!r.isPublic, isHost: r.hostId === user.id, matchId: r.matchId,
    mySeat: seats.findIndex(s => s?.userId === user.id),
    seats: seats.map(s => s ? { name: s.name, robot: s.robot, mine: s.userId === user.id, host: s.userId === r.hostId } : null),
  };
}
async function leaveAll(tx: Tx, user: User) {
  const r = await findMine(tx, user.id);
  if (!r) return;
  if (r.hostId === user.id) { await tx.delete(rooms).where(eq(rooms.code, r.code)); return; }
  await save(tx, r.code, seatsOf(r).map(s => s?.userId === user.id ? null : s));
}

export async function duoCreate(user: User, robot: string, isPublic: boolean) {
  checkRobot(robot);
  return db.transaction(async tx => {
    const now = Date.now(); await idle(tx, user); await leaveAll(tx, user);
    await tx.delete(rooms).where(sql`${rooms.updated} < ${now - ROOM_TTL}`);
    const code = randomBytes(3).toString("hex").toUpperCase();
    const seats: (Seat | null)[] = [{ userId: user.id, name: friendlyName(user), robot, seen: now }, null, null, null];
    await tx.insert(rooms).values({ code, hostId: user.id, isPublic: isPublic ? 1 : 0, seats: JSON.stringify(seats), matchId: null, updated: now, created: now });
    return present((await tx.select().from(rooms).where(eq(rooms.code, code)))[0], user);
  }, { behavior: "immediate" });
}
/** Sem código: entra numa sala pública com vaga; se não houver, cria uma. */
export async function duoJoin(user: User, robot: string, code?: string) {
  checkRobot(robot);
  const result = await db.transaction(async tx => {
    const now = Date.now(); await idle(tx, user); await leaveAll(tx, user);
    let room: Room | undefined;
    if (code) {
      room = (await tx.select().from(rooms).where(eq(rooms.code, code.toUpperCase())))[0];
      if (!room || room.matchId) fail("Sala não encontrada ou já iniciada.");
    } else {
      const open = await tx.select().from(rooms).where(and(eq(rooms.isPublic, 1), sql`${rooms.matchId} IS NULL`, sql`${rooms.updated} > ${now - STALE}`)).limit(30);
      room = open.find(r => seatsOf(r).some(s => !s));
      if (!room) return null;
    }
    const seats = seatsOf(room!);
    // Preenche primeiro o time com menos gente para equilibrar.
    const order = (seats[0] ? 1 : 0) + (seats[1] ? 1 : 0) <= (seats[2] ? 1 : 0) + (seats[3] ? 1 : 0) ? [1, 0, 2, 3] : [2, 3, 1, 0];
    const free = order.find(i => !seats[i]);
    if (free === undefined) fail("Sala cheia.");
    seats[free!] = { userId: user.id, name: friendlyName(user), robot, seen: now };
    await save(tx, room!.code, seats);
    return present((await tx.select().from(rooms).where(eq(rooms.code, room!.code)))[0], user);
  }, { behavior: "immediate" });
  return result ?? duoCreate(user, robot, true);
}
/** Polling da sala: mantém presença e remove assentos abandonados. */
export async function duoRoom(user: User, code: string) {
  return db.transaction(async tx => {
    const now = Date.now();
    const [r] = await tx.select().from(rooms).where(eq(rooms.code, code.toUpperCase()));
    if (!r) throw new ORPCError("NOT_FOUND", { message: "A sala foi fechada." });
    if (r.matchId) return present(r, user);
    const seats = seatsOf(r).map(s => s && s.userId === user.id ? { ...s, seen: now } : s);
    if (!seats.some(s => s?.userId === user.id)) throw new ORPCError("NOT_FOUND", { message: "Você saiu da sala." });
    const host = seats.find(s => s?.userId === r.hostId);
    if (!host || now - host.seen > STALE) { await tx.delete(rooms).where(eq(rooms.code, r.code)); throw new ORPCError("NOT_FOUND", { message: "O anfitrião saiu." }); }
    const kept = seats.map(s => s && now - s.seen > STALE ? null : s);
    await save(tx, r.code, kept);
    return present({ ...r, seats: JSON.stringify(kept) }, user);
  }, { behavior: "immediate" });
}
export async function duoSeat(user: User, code: string, seat: number) {
  return db.transaction(async tx => {
    const [r] = await tx.select().from(rooms).where(eq(rooms.code, code.toUpperCase()));
    if (!r || r.matchId) fail("Sala indisponível.");
    const seats = seatsOf(r!); const from = seats.findIndex(s => s?.userId === user.id);
    if (from < 0) fail("Você não está nesta sala.");
    if (seats[seat]) fail("Assento ocupado.");
    seats[seat] = seats[from]; seats[from] = null;
    await save(tx, r!.code, seats);
    return present({ ...r!, seats: JSON.stringify(seats) }, user);
  }, { behavior: "immediate" });
}
/** Anfitrião inicia: vagas vazias viram IA. */
export async function duoStart(user: User, code: string) {
  return db.transaction(async tx => {
    const now = Date.now();
    const [r] = await tx.select().from(rooms).where(eq(rooms.code, code.toUpperCase()));
    if (!r) fail("Sala não encontrada.");
    if (r!.matchId) return present(r!, user);
    if (r!.hostId !== user.id) fail("Só o anfitrião pode iniciar.");
    const seats = seatsOf(r!);
    const used = seats.filter(Boolean).map(s => s!.robot);
    const pilots: Pilot[] = seats.map((s, i) => {
      const side = i < 2 ? "player" : "enemy";
      if (s) return { userId: s.userId, name: s.name, side, uids: [], robots: [s.robot] };
      const robot = botTeam(1, used)[0]; used.push(robot);
      return { userId: `bot${i}`, name: `IA ${i + 1}`, side, uids: [], robots: [robot], bot: true };
    });
    for (const p of pilots) if (!p.bot) await idle(tx, { id: p.userId, name: p.name });
    const id = await createMatch(tx, pilots, "doubles", now);
    for (const p of pilots) if (!p.bot) {
      await tx.delete(tickets).where(eq(tickets.userId, p.userId));
      await tx.insert(tickets).values({ userId: p.userId, name: p.name, team: JSON.stringify(p.robots), kind: "duo", code: null, matchId: id, heartbeat: now, joined: now });
    }
    await save(tx, r!.code, seats, { matchId: id });
    return present({ ...r!, matchId: id }, user);
  }, { behavior: "immediate" });
}
export async function duoLeave(user: User) {
  return db.transaction(async tx => { await leaveAll(tx, user); return { ok: true }; }, { behavior: "immediate" });
}
