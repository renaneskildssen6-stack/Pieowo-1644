/* ---------------------------------------------------------------------------
 * Laboratório — famílias de peças e bônus de conjunto.
 * Cada peça pertence a uma família pelo número do arquivo (i % 4). Juntar
 * peças da mesma família nos 4 slots principais libera bônus reais de stats,
 * e usar o mesmo número em tudo forma o "PROJETO ORIGINAL".
 * Sem dependências do lab.ts para evitar import circular.
 * ------------------------------------------------------------------------- */

export type FamilyId = "tita" | "falcao" | "vulcano" | "arcano";
type K = "hp" | "mp" | "str" | "def" | "ag";

export interface FamilyDef {
  id: FamilyId;
  name: string;
  color: string;
  stat: string;
  /** bônus por patamar: 2, 3 e 4 peças */
  tiers: [Partial<Record<K, number>>, Partial<Record<K, number>>, Partial<Record<K, number>>];
}

export const FAMILIES: FamilyDef[] = [
  { id: "tita", name: "TITÃ", color: "#5fb4ff", stat: "DEF/HP", tiers: [{ def: 4 }, { def: 7, hp: 4 }, { def: 11, hp: 8 }] },
  { id: "falcao", name: "FALCÃO", color: "#5dff8f", stat: "AGI", tiers: [{ ag: 4 }, { ag: 7, mp: 3 }, { ag: 12, mp: 5 }] },
  { id: "vulcano", name: "VULCANO", color: "#ff7a3a", stat: "FOR", tiers: [{ str: 4 }, { str: 7, hp: 3 }, { str: 12, hp: 5 }] },
  { id: "arcano", name: "ARCANO", color: "#c07bff", stat: "MP", tiers: [{ mp: 4 }, { mp: 7, ag: 3 }, { mp: 12, ag: 5 }] },
];
export const FAMILY_MAP = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<FamilyId, FamilyDef>;

/** Número do arquivo da peça (head3 / headb3 → 3). */
export function partNum(url: string): number {
  const m = /(\d+)\.png$/.exec(url);
  return m ? Number(m[1]) : 0;
}

export function partFamily(url: string): FamilyDef {
  return FAMILIES[partNum(url) % FAMILIES.length];
}

export interface SynergyInfo {
  sets: { fam: FamilyDef; count: number; bonus: Partial<Record<K, number>> }[];
  original: boolean;
  bonus: Record<K, number>;
}

/** Bônus de conjunto para cabeça/torso/braços/pernas. */
export function draftSynergy(d: { head: string; torso: string; arm: string; leg: string }): SynergyInfo {
  const urls = [d.head, d.torso, d.arm, d.leg];
  const count = new Map<FamilyId, number>();
  for (const u of urls) { const f = partFamily(u).id; count.set(f, (count.get(f) ?? 0) + 1); }
  const bonus: Record<K, number> = { hp: 0, mp: 0, str: 0, def: 0, ag: 0 };
  const sets: SynergyInfo["sets"] = [];
  for (const [id, n] of count) {
    if (n < 2) continue;
    const fam = FAMILY_MAP[id];
    const b = fam.tiers[Math.min(2, n - 2)];
    for (const k of Object.keys(b) as K[]) bonus[k] += b[k] ?? 0;
    sets.push({ fam, count: n, bonus: b });
  }
  const nums = urls.map(partNum);
  const original = nums.every((n) => n === nums[0]);
  if (original) for (const k of Object.keys(bonus) as K[]) bonus[k] += 3;
  sets.sort((a, b) => b.count - a.count);
  return { sets, original, bonus };
}

export function bonusText(b: Partial<Record<K, number>>): string {
  const L: Record<K, string> = { hp: "HP", mp: "MP", str: "FOR", def: "DEF", ag: "AGI" };
  return (Object.keys(b) as K[]).filter((k) => b[k]).map((k) => `+${b[k]} ${L[k]}`).join(" ");
}
