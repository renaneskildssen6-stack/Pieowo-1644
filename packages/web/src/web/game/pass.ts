/**
 * Passe de temporada (estilo Brawl Pass), missões diárias e recompensa de login.
 * Vive numa chave própria do localStorage: saves antigos continuam intactos.
 */
import { useSyncExternalStore } from "react";
import { ITEMS } from "./config";
import { ORES } from "./mining";
import { addGold, addItem, addPlayerXP, getState, setState } from "./save";

const KEY = "mecha_pass_v1";
export const PASS_TIERS = 30;
export const XP_PER_TIER = 120;
export const ELITE_PRICE = 3000;

export type Reward = { gold?: number; xp?: number; item?: [string, number]; bars?: number; passXp?: number };
export type MissionKind = "play" | "win" | "ko" | "damage" | "crit" | "online" | "doubles" | "flawless" | "hits";
export interface MissionDef { kind: MissionKind; target: number; label: string; reward: Reward }
export interface MissionState { kind: MissionKind; target: number; prog: number; claimed: boolean }

interface PassSave {
  season: string;
  xp: number;
  elite: boolean;
  free: number[];
  premium: number[];
  day: string;
  missions: MissionState[];
  bonusClaimed: boolean;
  login: { last: string; streak: number; claimed: string };
  /** Campos novos (saves antigos recebem padrões via fresh()). */
  rerolled: string;
  week: string;
  weekly: MissionState[];
  weeklyBonus: boolean;
}

const POOL: MissionDef[] = [
  { kind: "play", target: 3, label: "JOGUE 3 BATALHAS", reward: { passXp: 80, gold: 150 } },
  { kind: "win", target: 2, label: "VENÇA 2 BATALHAS", reward: { passXp: 110, gold: 200 } },
  { kind: "ko", target: 6, label: "ABATA 6 ROBÔS", reward: { passXp: 100, gold: 180 } },
  { kind: "damage", target: 2500, label: "CAUSE 2500 DE DANO", reward: { passXp: 100, gold: 180 } },
  { kind: "crit", target: 4, label: "ACERTE 4 CRÍTICOS", reward: { passXp: 90, gold: 160 } },
  { kind: "online", target: 1, label: "JOGUE 1 PARTIDA ONLINE", reward: { passXp: 140, gold: 250 } },
  { kind: "doubles", target: 1, label: "LUTE 1 VEZ EM DUPLAS 2v2", reward: { passXp: 120, gold: 200 } },
  { kind: "flawless", target: 1, label: "VENÇA SEM PERDER ROBÔS", reward: { passXp: 150, gold: 260 } },
  { kind: "hits", target: 25, label: "ACERTE 25 GOLPES", reward: { passXp: 80, gold: 140 } },
];
/** Missões semanais: metas grandes, recompensas grandes. */
const WEEKLY_POOL: MissionDef[] = [
  { kind: "play", target: 15, label: "JOGUE 15 BATALHAS", reward: { passXp: 300, gold: 700 } },
  { kind: "win", target: 10, label: "VENÇA 10 BATALHAS", reward: { passXp: 380, gold: 900 } },
  { kind: "ko", target: 30, label: "ABATA 30 ROBÔS", reward: { passXp: 340, gold: 800, bars: 2 } },
  { kind: "damage", target: 15000, label: "CAUSE 15000 DE DANO", reward: { passXp: 340, gold: 800 } },
  { kind: "online", target: 4, label: "JOGUE 4 PARTIDAS ONLINE", reward: { passXp: 420, gold: 1000, bars: 3 } },
  { kind: "hits", target: 120, label: "ACERTE 120 GOLPES", reward: { passXp: 300, gold: 700 } },
];
export const WEEKLY_BONUS: Reward = { passXp: 500, gold: 2000, bars: 6, item: ["revive_core", 1] };
export const DAILY_BONUS: Reward = { passXp: 200, gold: 400, item: ["mega_repair", 1] };

/** Calendário de 7 dias; o 7º é o baú grande. */
export const LOGIN_REWARDS: Reward[] = [
  { gold: 200 },
  { item: ["repair_kit", 2] },
  { gold: 400, passXp: 60 },
  { bars: 3 },
  { gold: 600, item: ["energy_cell", 2] },
  { xp: 250, passXp: 100 },
  { gold: 1500, bars: 6, item: ["revive_core", 1], passXp: 200 },
];

const itemIds = ITEMS.map((i) => i.id);
const pick = (i: number) => itemIds[i % itemIds.length];
/** Trilha gratuita e trilha ELITE, uma recompensa por nível. */
export const PASS_TRACK: { free: Reward; elite: Reward }[] = Array.from({ length: PASS_TIERS }, (_, i) => {
  const t = i + 1;
  const big = t % 10 === 0;
  const mid = t % 5 === 0;
  return {
    free: big ? { gold: 1500 + t * 40, bars: 6 } : mid ? { item: [pick(t), 2], xp: 200 } : t % 2 ? { gold: 120 + t * 15 } : { item: [pick(t), 1] },
    elite: big ? { gold: 3000 + t * 60, bars: 12, item: ["revive_core", 2] } : mid ? { bars: 5, xp: 400 } : t % 2 ? { gold: 260 + t * 25 } : { item: [pick(t + 3), 2], bars: 1 },
  };
});

const pad = (n: number) => String(n).padStart(2, "0");
export function todayKey(d = new Date()): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const seasonKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function dayDiff(a: string, b: string): number {
  const p = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 86400000);
}
function hash(s: string): number { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function weekKey(d = new Date()): string {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return todayKey(t);
}
function rollMissions(day: string, src = POOL, count = 4): MissionState[] {
  let h = hash(day);
  const pool = [...src];
  const out: MissionState[] = [];
  while (out.length < count && pool.length) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const [m] = pool.splice(h % pool.length, 1);
    out.push({ kind: m.kind, target: m.target, prog: 0, claimed: false });
  }
  return out;
}

function fresh(): PassSave {
  const day = todayKey();
  const week = weekKey();
  return { season: seasonKey(), xp: 0, elite: false, free: [], premium: [], day, missions: rollMissions(day), bonusClaimed: false, login: { last: "", streak: 0, claimed: "" }, rerolled: "", week, weekly: rollMissions("w" + week, WEEKLY_POOL, 3), weeklyBonus: false };
}

function load(): PassSave {
  let s: PassSave;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    s = raw ? { ...fresh(), ...(JSON.parse(raw) as Partial<PassSave>) } as PassSave : fresh();
  } catch { s = fresh(); }
  return roll(s);
}

/** Vira o dia / a temporada quando necessário. */
function roll(s: PassSave): PassSave {
  const day = todayKey();
  if (s.season !== seasonKey()) s = { ...s, season: seasonKey(), xp: 0, elite: false, free: [], premium: [] };
  if (s.day !== day) s = { ...s, day, missions: rollMissions(day), bonusClaimed: false };
  const week = weekKey();
  if (s.week !== week || !Array.isArray(s.weekly)) s = { ...s, week, weekly: rollMissions("w" + week, WEEKLY_POOL, 3), weeklyBonus: false };
  return s;
}

let pass: PassSave = load();
const subs = new Set<() => void>();
function commit(next: PassSave) {
  pass = next;
  try { localStorage.setItem(KEY, JSON.stringify(pass)); } catch { /* memória */ }
  for (const f of subs) f();
}
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function usePass(): PassSave {
  return useSyncExternalStore(subscribe, () => pass, () => pass);
}
export function refreshPass() { const r = roll(pass); if (r !== pass) commit(r); }

export const missionDef = (k: MissionKind) => POOL.find((m) => m.kind === k)!;
export const weeklyDef = (k: MissionKind) => WEEKLY_POOL.find((m) => m.kind === k) ?? POOL.find((m) => m.kind === k)!;
/** Milissegundos até a meia-noite (novas missões) e até segunda-feira (semanais). */
export function msUntilReset(): number { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime(); }
export function msUntilWeek(): number { const n = new Date(); const d = (8 - n.getDay()) % 7 || 7; return new Date(n.getFullYear(), n.getMonth(), n.getDate() + d).getTime() - n.getTime(); }
export function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return d ? `${d}D ${pad(h)}H` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
/** Troca uma missão diária não concluída (1× por dia). */
export function rerollMission(i: number): boolean {
  refreshPass();
  const m = pass.missions[i];
  if (!m || m.claimed || m.prog >= m.target || pass.rerolled === pass.day) return false;
  const used = new Set(pass.missions.map((x) => x.kind));
  const options = POOL.filter((x) => !used.has(x.kind));
  if (!options.length) return false;
  const n = options[hash(pass.day + i + Date.now()) % options.length];
  commit({ ...pass, rerolled: pass.day, missions: pass.missions.map((x, j) => (j === i ? { kind: n.kind, target: n.target, prog: 0, claimed: false } : x)) });
  return true;
}
export function claimWeekly(i: number): boolean {
  refreshPass();
  const m = pass.weekly[i];
  if (!m || m.claimed || m.prog < m.target) return false;
  commit({ ...pass, weekly: pass.weekly.map((x, j) => (j === i ? { ...x, claimed: true } : x)) });
  grant(weeklyDef(m.kind).reward);
  return true;
}
export function claimWeeklyBonus(): boolean {
  if (pass.weeklyBonus || !pass.weekly.every((m) => m.claimed)) return false;
  commit({ ...pass, weeklyBonus: true });
  grant(WEEKLY_BONUS);
  return true;
}
export const passTier = (xp = pass.xp) => Math.min(PASS_TIERS, Math.floor(xp / XP_PER_TIER));
export function seasonDaysLeft(): number {
  const n = new Date();
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return Math.max(1, Math.ceil((end.getTime() - n.getTime()) / 86400000));
}

export function grant(r: Reward) {
  if (r.gold) addGold(r.gold);
  if (r.xp) addPlayerXP(r.xp);
  if (r.item) addItem(r.item[0], r.item[1]);
  if (r.bars) {
    const ore = ORES[2].id;
    setState((s) => ({ ...s, mining: { ...s.mining, bars: { ...s.mining.bars, [ore]: (s.mining.bars[ore] ?? 0) + r.bars! } } }));
  }
  if (r.passXp) commit({ ...pass, xp: Math.min(PASS_TIERS * XP_PER_TIER, pass.xp + r.passXp) });
}

export function claimMission(i: number): boolean {
  refreshPass();
  const m = pass.missions[i];
  if (!m || m.claimed || m.prog < m.target) return false;
  commit({ ...pass, missions: pass.missions.map((x, j) => (j === i ? { ...x, claimed: true } : x)) });
  grant(missionDef(m.kind).reward);
  return true;
}
export function claimDailyBonus(): boolean {
  if (pass.bonusClaimed || !pass.missions.every((m) => m.claimed)) return false;
  commit({ ...pass, bonusClaimed: true });
  grant(DAILY_BONUS);
  return true;
}

/** Dia atual do calendário de login (0..6) e se já foi resgatado hoje. */
export function loginStatus(s = pass): { index: number; claimedToday: boolean; streak: number } {
  const today = todayKey();
  if (s.login.claimed === today) return { index: (s.login.streak - 1) % 7, claimedToday: true, streak: s.login.streak };
  const keep = s.login.last && dayDiff(s.login.last, today) === 1;
  const streak = keep ? s.login.streak : 0;
  return { index: streak % 7, claimedToday: false, streak };
}
export function claimLogin(): Reward | null {
  const st = loginStatus();
  if (st.claimedToday) return null;
  const today = todayKey();
  const reward = LOGIN_REWARDS[st.index];
  commit({ ...pass, login: { last: today, streak: st.streak + 1, claimed: today } });
  grant(reward);
  return reward;
}

export function buyElite(): boolean {
  if (pass.elite || getState().gold < ELITE_PRICE) return false;
  addGold(-ELITE_PRICE);
  commit({ ...pass, elite: true });
  return true;
}
export function claimTier(tier: number, track: "free" | "elite"): boolean {
  if (tier < 1 || tier > passTier()) return false;
  if (track === "elite" && !pass.elite) return false;
  const list = track === "free" ? pass.free : pass.premium;
  if (list.includes(tier)) return false;
  commit(track === "free" ? { ...pass, free: [...pass.free, tier] } : { ...pass, premium: [...pass.premium, tier] });
  grant(PASS_TRACK[tier - 1][track]);
  return true;
}

/** Quantas coisas estão prontas para resgatar (badge do botão). */
export function passPending(s = pass): number {
  const t = passTier(s.xp);
  let n = s.missions.filter((m) => !m.claimed && m.prog >= m.target).length;
  if (!loginStatus(s).claimedToday) n++;
  if (!s.bonusClaimed && s.missions.every((m) => m.claimed)) n++;
  n += (s.weekly ?? []).filter((m) => !m.claimed && m.prog >= m.target).length;
  if (!s.weeklyBonus && (s.weekly ?? []).length && s.weekly.every((m) => m.claimed)) n++;
  for (let i = 1; i <= t; i++) { if (!s.free.includes(i)) n++; if (s.elite && !s.premium.includes(i)) n++; }
  return n;
}

/** Resgata tudo que estiver pronto (missões liberam XP que liberam níveis: repete até estabilizar). */
export function claimAll(): Reward[] {
  const got: Reward[] = [];
  for (let guard = 0; guard < 8; guard++) {
    const before = got.length;
    pass.missions.forEach((m, i) => { if (claimMission(i)) got.push(missionDef(m.kind).reward); });
    if (claimDailyBonus()) got.push(DAILY_BONUS);
    pass.weekly.forEach((m, i) => { if (claimWeekly(i)) got.push(weeklyDef(m.kind).reward); });
    if (claimWeeklyBonus()) got.push(WEEKLY_BONUS);
    const l = claimLogin(); if (l) got.push(l);
    for (let t = 1; t <= passTier(); t++) {
      if (claimTier(t, "free")) got.push(PASS_TRACK[t - 1].free);
      if (pass.elite && claimTier(t, "elite")) got.push(PASS_TRACK[t - 1].elite);
    }
    if (got.length === before) break;
  }
  return got;
}
/** Soma várias recompensas numa só (para o pop-up de revelação). */
export function mergeRewards(list: Reward[]): Reward[] {
  const sum: Reward = {};
  const items = new Map<string, number>();
  for (const r of list) {
    if (r.gold) sum.gold = (sum.gold ?? 0) + r.gold;
    if (r.bars) sum.bars = (sum.bars ?? 0) + r.bars;
    if (r.xp) sum.xp = (sum.xp ?? 0) + r.xp;
    if (r.passXp) sum.passXp = (sum.passXp ?? 0) + r.passXp;
    if (r.item) items.set(r.item[0], (items.get(r.item[0]) ?? 0) + r.item[1]);
  }
  const out: Reward[] = [];
  if (sum.gold) out.push({ gold: sum.gold });
  if (sum.bars) out.push({ bars: sum.bars });
  items.forEach((n, id) => out.push({ item: [id, n] }));
  if (sum.xp) out.push({ xp: sum.xp });
  if (sum.passXp) out.push({ passXp: sum.passXp });
  return out;
}

export interface BattleTrack { win: boolean; online?: boolean; doubles?: boolean; kills: number; crits: number; damage: number; hits: number; flawless: boolean }
/** Chamado ao fim de qualquer batalha (offline ou online). */
export function trackBattle(b: BattleTrack) {
  const base = roll(pass);
  const add: Record<MissionKind, number> = {
    play: 1, win: b.win ? 1 : 0, ko: b.kills, damage: b.damage, crit: b.crits,
    online: b.online ? 1 : 0, doubles: b.doubles ? 1 : 0, flawless: b.win && b.flawless ? 1 : 0, hits: b.hits,
  };
  const bump = (m: MissionState) => (m.claimed ? m : { ...m, prog: Math.min(m.target, m.prog + Math.max(0, Math.round(add[m.kind]))) });
  const missions = base.missions.map(bump);
  const weekly = base.weekly.map(bump);
  const gain = b.win ? 30 : 12;
  commit({ ...base, missions, weekly, xp: Math.min(PASS_TIERS * XP_PER_TIER, base.xp + gain) });
}

export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`${r.gold} OURO`);
  if (r.bars) parts.push(`${r.bars} LINGOTES`);
  if (r.item) parts.push(`${r.item[1]}× ${ITEMS.find((i) => i.id === r.item![0])?.name ?? r.item[0]}`);
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.passXp) parts.push(`${r.passXp} XP PASSE`);
  return parts.join(" · ");
}
export function rewardIcon(r: Reward): string {
  if (r.gold && r.gold >= 1000) return "/ui/icon_coins.png";
  if (r.item) return ITEMS.find((i) => i.id === r.item![0])?.icon ?? "/ui/icon_star.png";
  if (r.bars) return "/ui/ore_2.png";
  if (r.gold) return "/ui/icon_coins.png";
  if (r.xp) return "/ui/icon_arrowup.png";
  return "/ui/icon_star.png";
}
