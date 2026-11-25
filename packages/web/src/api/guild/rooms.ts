import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { guildChallenges as rooms, guildBattles as battles } from "../database/schema";
import { botTeam } from "../online/engine";
import { fail, type Tx, type User } from "../online/service";
import { member, memberName, requireMember, txRun } from "./members";
import { launch, pilot } from "./battles";

const TTL = 10 * 60_000;
type Seat = { id: string; name: string; robot: string };
type Room = typeof rooms.$inferSelect;
const seatsOf = (r: Room) => JSON.parse(r.seats) as (Seat | null)[];
const fresh = (id: string) => and(eq(rooms.guildId, id), isNull(rooms.matchId), gt(rooms.updated, Date.now() - TTL));
async function leaveMine(tx: Tx, guild: string, id: string) {
  for (const room of await tx.select().from(rooms).where(fresh(guild))) {
    const seats = seatsOf(room);
    if (!seats.some(s => s?.id === id)) continue;
    if (room.hostId === id) await tx.delete(rooms).where(eq(rooms.id, room.id));
    else await tx.update(rooms).set({ seats: JSON.stringify(seats.map(s => s?.id === id ? null : s)), updated: Date.now() }).where(eq(rooms.id, room.id));
  }
}
export async function listRooms(user: User) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id);
    const rows = await tx.select().from(rooms).where(fresh(m.guildId)).orderBy(desc(rooms.created)).limit(30);
    return rows.map(r => ({ ...r, seats: seatsOf(r) }));
  });
}
export async function open(user: User, mode: "x1" | "x2", robot: string) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id), now = Date.now();
    await tx.delete(rooms).where(and(eq(rooms.guildId, m.guildId), lt(rooms.updated, now - TTL)));
    await leaveMine(tx, m.guildId, user.id);
    const id = crypto.randomUUID(), seats = [{ id: user.id, robot, name: await memberName(tx, user) }, ...Array<null>(mode === "x2" ? 3 : 1).fill(null)];
    await tx.insert(rooms).values({ id, guildId: m.guildId, mode, hostId: user.id, seats: JSON.stringify(seats), created: now, updated: now });
    return { id };
  });
}
export async function seat(user: User, id: string, index: number, robot: string) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id);
    const [r] = await tx.select().from(rooms).where(and(eq(rooms.id, id), fresh(m.guildId)));
    if (!r) return fail("Sala indisponível.");
    const seats = seatsOf(r);
    if (index >= seats.length || (seats[index] && seats[index]?.id !== user.id)) fail("Assento indisponível.");
    if (!seats.some(s => s?.id === user.id)) await leaveMine(tx, m.guildId, user.id);
    const next = seats.map((s, i) => i === index ? null : s?.id === user.id ? null : s);
    next[index] = { id: user.id, name: await memberName(tx, user), robot };
    await tx.update(rooms).set({ seats: JSON.stringify(next), updated: Date.now() }).where(eq(rooms.id, id));
    return { ok: true };
  });
}
export async function leave(user: User) {
  return txRun(async tx => { await leaveMine(tx, (await requireMember(tx, user.id)).guildId, user.id); return { ok: true }; });
}
export async function start(user: User, id: string) {
  return txRun(async tx => {
    const m = await requireMember(tx, user.id), now = Date.now();
    const [r] = await tx.select().from(rooms).where(and(eq(rooms.id, id), fresh(m.guildId)));
    if (!r || r.hostId !== user.id) return fail("Somente quem criou a sala pode iniciar.");
    const seats = seatsOf(r), split = seats.length / 2;
    for (let i = 0; i < seats.length; i++) if (seats[i] && (await member(tx, seats[i]!.id))?.guildId !== m.guildId) seats[i] = null;
    if (!seats.slice(0, split).some(Boolean) || !seats.slice(split).some(Boolean)) fail("É preciso pelo menos um piloto de cada lado.");
    for (const team of [seats.slice(0, split), seats.slice(split)]) if (team.length === 2 && team[0] && team[1] && team[0].robot === team[1].robot) fail("Escolham robôs diferentes dentro de cada equipe.");
    const used = seats.flatMap(s => s ? [s.robot] : []);
    const pilots = seats.map((s, i) => {
      const side = i < split ? "player" : "enemy";
      if (s) return pilot(s.id, s.name, side, [s.robot]);
      const bot = botTeam(1, used)[0]; used.push(bot);
      return pilot(`bot-${i}`, "SUPORTE IA", side, [bot], true);
    });
    const matchId = await launch(tx, pilots, r.mode === "x2" ? "doubles" : "duel", now);
    await tx.insert(battles).values({ matchId, guildId: m.guildId, userId: user.id, kind: "duel", created: now });
    await tx.update(rooms).set({ matchId, updated: now }).where(eq(rooms.id, id));
    return { matchId };
  });
}
