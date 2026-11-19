import { desc, eq, inArray } from "drizzle-orm";
import { onlineRatings as ratings, type onlineTickets } from "../database/schema";
import { RANKS } from "../../web/game/ranked";
import type { Side } from "../../web/game/combat";
import type { Pilot, Tx } from "./service";

/** RANQUEADA ONLINE: Elo autoritativo no servidor. Fila ranqueada: humanos ou, se a fila estiver vazia, um bot com rating próximo (vale igual). */
export const BASE_RATING = 1000;
export const PLACEMENTS = 5;
type Ticket = typeof onlineTickets.$inferSelect;
type Rating = typeof ratings.$inferSelect;

/** Rating → rank do jogo (27 degraus: SUCATA III … SINGULARIDADE), 50 pontos por divisão. */
export function rankIndexOf(rating: number) {
  return Math.max(0, Math.min(RANKS.length - 1, Math.floor((rating - 700) / 50)));
}
export function rankInfo(rating: number, games: number) {
  const r = RANKS[rankIndexOf(rating)];
  const floor = 700 + r.index * 50;
  return { rating, name: r.name, tierId: r.tier.id, color: r.tier.color, emblem: r.tier.emblem, placing: games < PLACEMENTS,
    placementsLeft: Math.max(0, PLACEMENTS - games), progress: r.index === RANKS.length - 1 ? 100 : Math.round(((rating - floor) / 50) * 100) };
}
async function ratingsOf(tx: Tx, ids: string[]): Promise<Map<string, Rating>> {
  if (!ids.length) return new Map();
  const rows = await tx.select().from(ratings).where(inArray(ratings.userId, ids));
  return new Map(rows.map(r => [r.userId, r]));
}
/** Escolhe o rival mais próximo em rating; a janela abre com o tempo de fila (±120 → qualquer um após ~40 s). */
export async function pickRankedFoe(tx: Tx, me: Pick<Ticket, "userId" | "team" | "joined">, candidates: Ticket[], now: number): Promise<Ticket | undefined> {
  const size = JSON.parse(me.team).length;
  const pool = candidates.filter(t => JSON.parse(t.team).length === size);
  if (!pool.length) return undefined;
  const map = await ratingsOf(tx, [me.userId, ...pool.map(t => t.userId)]);
  const mine = map.get(me.userId)?.rating ?? BASE_RATING;
  let best: Ticket | undefined, bestGap = Infinity;
  for (const t of pool) {
    const gap = Math.abs((map.get(t.userId)?.rating ?? BASE_RATING) - mine);
    const window = 120 + ((now - Math.min(t.joined, me.joined)) / 1000) * 25;
    if (gap <= window && gap < bestGap) { best = t; bestGap = gap; }
  }
  return best;
}
/** Aplica o resultado: Elo por média do lado rival; K maior nas 5 classificatórias. Devolve { userId: delta }. */
export async function applyRanked(tx: Tx, pilots: Pilot[], winSide: Side, now: number): Promise<Record<string, number>> {
  const humans = pilots.filter(p => !p.bot);
  const map = await ratingsOf(tx, humans.map(p => p.userId));
  const cur = (id: string) => map.get(id)?.rating ?? BASE_RATING;
  const val = (p: Pilot) => p.bot ? p.rating ?? BASE_RATING : cur(p.userId);
  const avg = (s: Side) => { const l = pilots.filter(p => p.side === s); return l.reduce((a, p) => a + val(p), 0) / Math.max(1, l.length); };
  const deltas: Record<string, number> = {};
  for (const p of humans) {
    const row = map.get(p.userId);
    const games = (row?.wins ?? 0) + (row?.losses ?? 0);
    const won = p.side === winSide;
    const expected = 1 / (1 + 10 ** ((avg(p.side === "player" ? "enemy" : "player") - cur(p.userId)) / 400));
    const k = games < PLACEMENTS ? 48 : 28;
    let delta = Math.round(k * ((won ? 1 : 0) - expected));
    if (won) delta = Math.max(6, delta); else delta = Math.min(-6, delta);
    const streak = won ? Math.max(0, row?.streak ?? 0) + 1 : Math.min(0, row?.streak ?? 0) - 1;
    if (won && streak >= 3) delta += 4; // bônus de sequência
    const rating = Math.max(0, cur(p.userId) + delta);
    deltas[p.userId] = rating - cur(p.userId);
    const values = { userId: p.userId, name: p.name, rating, peak: Math.max(rating, row?.peak ?? BASE_RATING), wins: (row?.wins ?? 0) + (won ? 1 : 0), losses: (row?.losses ?? 0) + (won ? 0 : 1), streak, updated: now };
    await tx.insert(ratings).values(values).onConflictDoUpdate({ target: ratings.userId, set: values });
  }
  return deltas;
}
export async function ratingOf(tx: Tx, userId: string) {
  const [row] = await tx.select().from(ratings).where(eq(ratings.userId, userId));
  return row?.rating ?? BASE_RATING;
}
/** Painel do lobby: meu rating/tier e o top 10 do servidor. */
export async function rankedLobby(tx: Tx, userId: string) {
  const [row] = await tx.select().from(ratings).where(eq(ratings.userId, userId));
  const top = await tx.select().from(ratings).orderBy(desc(ratings.rating)).limit(10);
  const games = (row?.wins ?? 0) + (row?.losses ?? 0);
  return {
    me: { ...rankInfo(row?.rating ?? BASE_RATING, games), wins: row?.wins ?? 0, losses: row?.losses ?? 0, peak: row?.peak ?? BASE_RATING, streak: row?.streak ?? 0 },
    leaders: top.map(r => ({ name: r.name, rating: r.rating, wins: r.wins, losses: r.losses, ...pick(rankInfo(r.rating, r.wins + r.losses)) })),
  };
}
const pick = (i: ReturnType<typeof rankInfo>) => ({ rank: i.name, color: i.color, emblem: i.emblem, placing: i.placing });
