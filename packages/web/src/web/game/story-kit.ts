/**
 * Tipos e atalhos compartilhados pelos arquivos de dados da história.
 * Fica separado de story.ts para que os arquivos de saga possam usar L()/B() sem import circular.
 */
import type { CastId } from "./story-cast";

export type BaseSpeakerId =
  | "lyra" | "nara" | "aurorion" | "narrador" | "sistema"
  | "scavenger" | "scrapking" | "siegetank" | "mirrorduelist" | "chronoguard" | "voidarchon"
  | "lyra_orbit" | "voidnavigator"
  | "eventhorizon" | "valkyrune" | "aurumtitan" | "scarabking";
export type SpeakerId = BaseSpeakerId | CastId;

export interface Speaker { name: string; portrait?: string; side: "left" | "right"; tone: string; role?: string }

export type StoryFx = "shake" | "flash" | "glitch" | "zoom" | "alarm" | "quake";

export interface StoryLine {
  kind: "line";
  who: SpeakerId;
  text: string;
  fx?: StoryFx;
  /** mostra a fala só se a flag tiver esse valor. */
  when?: [string, string];
}
export interface StoryChoice {
  kind: "choice";
  flag: string;
  prompt: string;
  options: { value: string; label: string; reply: StoryLine[] }[];
}
export interface StoryEnemy { id: string; level: number; trained: number; statScale?: number }
export interface StoryBattle {
  kind: "battle";
  id: string;
  label: string;
  arena: string;
  enemies: StoryEnemy[];
}
export interface StoryBackdrop { kind: "bg"; art: string }
export type StoryBeat = StoryLine | StoryChoice | StoryBattle | StoryBackdrop;

export interface StoryChapter {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  synopsis: string;
  art: string;
  thumb: string;
  recommended: number;
  reward: { gold: number; xp: number; item: string; qty: number };
  beats: StoryBeat[];
  /** Posição no mapa panorâmico vertical da campanha. Ausente nos capítulos antigos = legado. */
  map?: { x: number; y: number; region: string };
  /** 1 = Crônicas da Primeira Luz (padrão), 2 = Coroa Fraturada, 3 = Sinfonia de Ferro, 4 = Contos. */
  saga?: SagaId;
  /** Capítulo que precisa estar concluído. Ausente = o capítulo anterior da lista. */
  requires?: string;
  /** Rótulo curto exibido no lugar do número (ex.: "C3" nos contos). */
  tag?: string;
  arc?: string;
  /** Último capítulo da saga: texto do epílogo exibido na conclusão. */
  final?: string;
}

export type SagaId = 1 | 2 | 3 | 4;
export interface SagaInfo { id: SagaId; title: string; short: string; tagline: string; bg: string; tone: string }
export const SAGAS: SagaInfo[] = [
  { id: 1, title: "CRÔNICAS DA PRIMEIRA LUZ", short: "SAGA I", tagline: "Aurora, o Vazio e o Panteão.", bg: "/story/cover.webp", tone: "#35e2f0" },
  { id: 2, title: "A COROA FRATURADA", short: "SAGA II", tagline: "Uma imperatriz selada acorda. Um rival volta.", bg: "/story/s-coroa.webp", tone: "#ff6be8" },
  { id: 3, title: "A SINFONIA DE FERRO", short: "SAGA III", tagline: "Alguém quer afinar todas as máquinas do mundo.", bg: "/story/s-torre.webp", tone: "#ff4040" },
  { id: 4, title: "CONTOS DE AURORA", short: "CONTOS", tagline: "Histórias paralelas que liberam ao longo da Saga I.", bg: "/story/s-dojo.webp", tone: "#ffc44d" },
];

export const L = (who: SpeakerId, text: string, fx?: StoryFx, when?: [string, string]): StoryLine => ({ kind: "line", who, text, fx, when });
export const art = (n: string) => `/story/${n}.webp`;
export const intro = (n: number) => `/intro/s${String(n).padStart(2, "0")}.webp`;

/** Inimigo com treino proporcional ao nível (mesma curva dos capítulos antigos). */
export const E = (id: string, level: number, statScale?: number): StoryEnemy => ({
  id, level, trained: Math.round(level * (level < 30 ? 0.64 : 0.73)), statScale: statScale ?? (level < 20 ? 0.85 : level < 50 ? 0.95 : 1),
});
export const B = (id: string, label: string, arena: string, ...enemies: StoryEnemy[]): StoryBattle => ({ kind: "battle", id, label, arena, enemies });
export const C = (flag: string, prompt: string, options: StoryChoice["options"]): StoryChoice => ({ kind: "choice", flag, prompt, options });
/** Arte + miniatura de uma cena em /story (ex.: "s-neon" → s-neon.webp e s-neon-thumb.webp). */
export const scene = (n: string) => ({ art: art(n), thumb: art(`${n}-thumb`) });
