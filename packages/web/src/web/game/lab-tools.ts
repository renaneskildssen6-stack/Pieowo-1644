/* Laboratório — notas de peça, ordenação, gerador de nomes, projetos salvos
 * e rascunho persistente (chaves próprias no localStorage, sem tocar no save). */
import { CORES, CORE_MAP, LAB_HUES, SLOT_OPTIONS, emptyDraft, partStats, type LabDraft, type Slot } from "./lab";
import { partFamily } from "./lab-synergy";

export type Grade = "S" | "A" | "B" | "C";
export const GRADE_COLOR: Record<Grade, string> = { S: "#ffd23c", A: "#c07bff", B: "#35e2f0", C: "#7d94ad" };
export type SortKey = "base" | "grade" | "str" | "def" | "ag" | "hp" | "mp";
export const SORTS: { id: SortKey; label: string }[] = [
  { id: "base", label: "PADRÃO" }, { id: "grade", label: "NOTA" }, { id: "str", label: "FOR" },
  { id: "def", label: "DEF" }, { id: "ag", label: "AGI" }, { id: "hp", label: "HP" }, { id: "mp", label: "MP" },
];

export const partScore = (slot: Slot, url: string): number => {
  const s = partStats(slot, url);
  return s.hp + s.mp + s.str + s.def + s.ag;
};

const gradeCache = new Map<string, Grade>();
/** Nota relativa às outras peças do mesmo slot (top 15% = S). */
export function partGrade(slot: Slot, url: string): Grade {
  const key = `${slot}:${url}`;
  const hit = gradeCache.get(key);
  if (hit) return hit;
  const list = SLOT_OPTIONS[slot].map((u) => partScore(slot, u)).sort((a, b) => b - a);
  const rank = list.indexOf(partScore(slot, url)) / Math.max(1, list.length - 1);
  const g: Grade = rank <= 0.15 ? "S" : rank <= 0.4 ? "A" : rank <= 0.72 ? "B" : "C";
  gradeCache.set(key, g);
  return g;
}

export function sortParts(slot: Slot, sort: SortKey, fam: string): string[] {
  let list = SLOT_OPTIONS[slot].slice();
  if (fam !== "all") list = list.filter((u) => partFamily(u).id === fam);
  if (sort === "base") return list;
  if (sort === "grade") return list.sort((a, b) => partScore(slot, b) - partScore(slot, a));
  return list.sort((a, b) => partStats(slot, b)[sort] - partStats(slot, a)[sort]);
}

// ---------------------------------------------------------- gerador de nome
const PRE: Record<string, string[]> = {
  chama: ["PIRO", "BRASA", "IGNIS"], toxina: ["VENO", "MIASMA", "TOXO"], raio: ["VOLT", "TROVO", "FAISCA"],
  prisma: ["LUMEN", "PRISMA", "ARCO"], gravidade: ["GRAVI", "ORBITA", "ANCORA"], vampiro: ["NOCTA", "DRENO", "VAMPI"],
  bastiao: ["BASTIA", "MURO", "EGIDE"], adrenalina: ["TURBO", "FURIA", "NITRO"], nanite: ["NANO", "MEDI", "CELULA"],
  ruina: ["RUINA", "CAOS", "ERODE"],
};
const SUF = ["-X", " MK", "ZOR", "TRON", " PRIME", "DRAK", "-7", " OMEGA", "RAX", "GEAR"];
export function randomName(core: string): string {
  const p = PRE[core] ?? PRE.chama;
  const a = p[Math.floor(Math.random() * p.length)];
  const b = SUF[Math.floor(Math.random() * SUF.length)];
  return (a + b).slice(0, 14);
}

// ------------------------------------------------------- validação de draft
export function validDraft(x: unknown): LabDraft | null {
  if (!x || typeof x !== "object") return null;
  const d = x as LabDraft;
  const base = emptyDraft();
  const ok = (slot: Slot, v: unknown) => typeof v === "string" && SLOT_OPTIONS[slot].includes(v);
  return {
    name: typeof d.name === "string" ? d.name.slice(0, 14) : "",
    core: CORE_MAP[d.core] ? d.core : CORES[0].id,
    head: ok("head", d.head) ? d.head : base.head,
    torso: ok("torso", d.torso) ? d.torso : base.torso,
    arm: ok("arm", d.arm) ? d.arm : base.arm,
    leg: ok("leg", d.leg) ? d.leg : base.leg,
    deco: d.deco === null ? null : ok("deco", d.deco) ? d.deco : null,
    hue: LAB_HUES.some((h) => h.hue === d.hue) ? d.hue : base.hue,
  };
}

const DRAFT_KEY = "mecha_lab_draft_v1";
const PRESET_KEY = "mecha_lab_presets_v1";
export const PRESET_MAX = 4;

export function loadDraft(): LabDraft {
  try { return validDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")) ?? emptyDraft(); } catch { return emptyDraft(); }
}
export function saveDraft(d: LabDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* cheio */ }
}

export type Presets = (LabDraft | null)[];
export function loadPresets(): Presets {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESET_KEY) ?? "[]");
    const arr = Array.isArray(raw) ? raw : [];
    return Array.from({ length: PRESET_MAX }, (_, i) => (arr[i] ? validDraft(arr[i]) : null));
  } catch { return Array(PRESET_MAX).fill(null); }
}
export function savePresets(p: Presets): void {
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); } catch { /* cheio */ }
}
