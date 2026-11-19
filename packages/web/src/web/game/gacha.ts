/**
 * PORTAL NEXUS — invocação (gacha) dos chassis exclusivos de gacha-robots.ts.
 *
 * Taxas base: C 55 · R 28 · E 12 · L 4.2 · M 0.8 (%).
 * Pity: a cada 10 tiros sem ÉPICO+ o 10º é ÉPICO+ garantido; a partir do
 * tiro 45 sem LENDÁRIO+ a chance sobe (soft pity) e no 60º é garantido
 * (85% LENDÁRIO / 15% MÍTICO). Duplicatas viram ouro + fragmentos.
 * Estado próprio em localStorage (`mcc_gacha_v1`) — não toca no save principal.
 */
import { useSyncExternalStore } from "react";
import { GACHA_TIER, TIER_ORDER, gachaPool, type GachaTier } from "./gacha-robots";
import { getState, grantGachaRobot, setState } from "./save";

export const RATES: Record<GachaTier, number> = { C: 55, R: 28, E: 12, L: 4.2, M: 0.8 };
export const PITY_EPIC = 10;
export const PITY_LEGEND = 60;
export const SOFT_PITY = 45;
export const COST = {
  one: { gold: 1500, diamonds: 20 },
  ten: { gold: 13500, diamonds: 180 },
} as const;
export const FRAG_PER_PULL = 60;
export const DUP_GOLD: Record<GachaTier, number> = { C: 300, R: 700, E: 1800, L: 5000, M: 12000 };
export const DUP_FRAGS: Record<GachaTier, number> = { C: 2, R: 5, E: 12, L: 30, M: 60 };

export type Currency = "gold" | "diamonds" | "free" | "frags";

export interface PullResult {
  id: string;
  tier: GachaTier;
  isNew: boolean;
  gold: number;
  frags: number;
}

export interface GachaState {
  pity10: number;
  pityL: number;
  pulls: number;
  frags: number;
  freeDay: string;
  history: { id: string; tier: GachaTier; t: number }[];
}

const KEY = "mcc_gacha_v1";
const fresh = (): GachaState => ({ pity10: 0, pityL: 0, pulls: 0, frags: 0, freeDay: "", history: [] });

function load(): GachaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<GachaState>;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    return {
      pity10: n(p.pity10),
      pityL: n(p.pityL),
      pulls: n(p.pulls),
      frags: n(p.frags),
      freeDay: typeof p.freeDay === "string" ? p.freeDay : "",
      history: Array.isArray(p.history)
        ? p.history.filter((h) => h && typeof h.id === "string" && GACHA_TIER[h.id]).slice(0, 60)
        : [],
    };
  } catch {
    return fresh();
  }
}

let gs: GachaState = load();
const subs = new Set<() => void>();
function commit(next: GachaState) {
  gs = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(gs));
  } catch {
    /* modo privado */
  }
  for (const s of subs) s();
}

export function getGacha(): GachaState {
  return gs;
}

export function useGacha(): GachaState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    getGacha,
    getGacha,
  );
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function freeAvailable(s: GachaState = gs): boolean {
  return s.freeDay !== today();
}

/** Chance efetiva de LENDÁRIO+ no próximo tiro (com soft pity). */
export function legendChance(pityL: number = gs.pityL): number {
  const base = RATES.L + RATES.M;
  if (pityL + 1 >= PITY_LEGEND) return 100;
  if (pityL + 1 <= SOFT_PITY) return base;
  return Math.min(100, base + (pityL + 1 - SOFT_PITY) * 3);
}

function rollTier(pity10: number, pityL: number, rnd: () => number): GachaTier {
  if (pityL + 1 >= PITY_LEGEND) return rnd() < 0.15 ? "M" : "L";
  const lm = legendChance(pityL);
  const r = rnd() * 100;
  if (r < lm) return rnd() * (RATES.L + RATES.M) < RATES.M ? "M" : "L";
  if (pity10 + 1 >= PITY_EPIC) return "E";
  const rest = 100 - lm;
  const x = ((r - lm) / rest) * (RATES.C + RATES.R + RATES.E);
  if (x < RATES.E) return "E";
  if (x < RATES.E + RATES.R) return "R";
  return "C";
}

function pick(tier: GachaTier, owned: Set<string>, rnd: () => number): string {
  const pool = gachaPool(tier);
  // robôs ainda não possuídos pesam 2x — a coleção avança sem tirar a sorte.
  const w = pool.map((id) => (owned.has(id) ? 1 : 2));
  let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function canPay(n: 1 | 10, cur: Currency): boolean {
  const s = getState();
  if (cur === "free") return n === 1 && freeAvailable();
  if (cur === "frags") return gs.frags >= FRAG_PER_PULL * n;
  const c = n === 1 ? COST.one : COST.ten;
  return cur === "gold" ? s.gold >= c.gold : s.diamonds >= c.diamonds;
}

/** Executa a invocação. Retorna null quando não dá para pagar. */
export function pull(n: 1 | 10, cur: Currency, rnd: () => number = Math.random): PullResult[] | null {
  if (!canPay(n, cur)) return null;
  const c = n === 1 ? COST.one : COST.ten;
  if (cur === "gold") setState((s) => ({ ...s, gold: s.gold - c.gold }));
  if (cur === "diamonds") setState((s) => ({ ...s, diamonds: s.diamonds - c.diamonds }));

  let { pity10, pityL, frags } = gs;
  if (cur === "frags") frags -= FRAG_PER_PULL * n;
  const owned = new Set(getState().robots.map((r) => r.id));
  const out: PullResult[] = [];
  for (let i = 0; i < n; i++) {
    const tier = rollTier(pity10, pityL, rnd);
    const ti = TIER_ORDER.indexOf(tier);
    pity10 = ti >= 2 ? 0 : pity10 + 1;
    pityL = ti >= 3 ? 0 : pityL + 1;
    const id = pick(tier, owned, rnd);
    const isNew = !owned.has(id);
    if (isNew) {
      grantGachaRobot(id);
      owned.add(id);
      out.push({ id, tier, isNew, gold: 0, frags: 0 });
    } else {
      frags += DUP_FRAGS[tier];
      out.push({ id, tier, isNew, gold: DUP_GOLD[tier], frags: DUP_FRAGS[tier] });
    }
  }
  const refund = out.reduce((a, r) => a + r.gold, 0);
  if (refund) setState((s) => ({ ...s, gold: s.gold + refund }));
  const t = Date.now();
  commit({
    pity10,
    pityL,
    frags,
    pulls: gs.pulls + n,
    freeDay: cur === "free" ? today() : gs.freeDay,
    history: [...out.map((r) => ({ id: r.id, tier: r.tier, t })), ...gs.history].slice(0, 60),
  });
  return out;
}

/** Maior raridade de um lote — define a cor do brilho do portal. */
export function topTier(rs: PullResult[]): GachaTier {
  let best = 0;
  for (const r of rs) best = Math.max(best, TIER_ORDER.indexOf(r.tier));
  return TIER_ORDER[best];
}

export function ownedCount(): { owned: number; total: number } {
  const ids = Object.keys(GACHA_TIER);
  const have = new Set(getState().robots.map((r) => r.id));
  return { owned: ids.filter((i) => have.has(i)).length, total: ids.length };
}
