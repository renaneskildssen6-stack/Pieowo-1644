import { faceUrl, spriteUrl } from "./robots";
/* ---------------------------------------------------------------------------
 * Fase C — sprites de exploracao por acao.
 *
 * Todo robo do jogo usa o mesmo padrao de sprite sheet: uma tira de
 * 2048x128 com 16 quadros de 128px (grade 4x4 achatada):
 *   quadros  0-3  -> ocioso
 *   quadros  4-7  -> ataque
 *   quadros  8-11 -> dano / guarda
 *   quadros 12-15 -> teleporte (usado para pulo, queda e interacao)
 *
 * Isso deixa QUALQUER um dos 220 robos jogavel no hub, sem arte extra.
 * ------------------------------------------------------------------------- */

export const HERO_FRAME = 128;
export const HERO_FRAMES = 16;

export type HeroClip =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "land"
  | "attack"
  | "interact"
  | "hurt";

export type ClipDef = {
  /** indices de quadro na tira. */
  frames: number[];
  /** quadros por segundo. */
  fps: number;
  /** false = congela no ultimo quadro em vez de repetir. */
  loop: boolean;
  /** deslocamento vertical senoidal (px) aplicado ao desenhar. */
  bob: number;
  /** inclinacao em radianos aplicada ao sprite. */
  tilt: number;
  /** escala extra do sprite. */
  scale: number;
};

export const HERO_CLIPS: Record<HeroClip, ClipDef> = {
  idle: { frames: [0, 1, 2, 3], fps: 5, loop: true, bob: 1.5, tilt: 0, scale: 1 },
  walk: { frames: [0, 1, 2, 3], fps: 9, loop: true, bob: 3.5, tilt: 0.03, scale: 1 },
  run: { frames: [0, 1, 2, 3], fps: 15, loop: true, bob: 5.5, tilt: 0.1, scale: 1.02 },
  jump: { frames: [12, 13], fps: 9, loop: false, bob: 0, tilt: -0.06, scale: 1.04 },
  fall: { frames: [14, 15], fps: 8, loop: false, bob: 0, tilt: 0.06, scale: 0.98 },
  land: { frames: [8], fps: 10, loop: false, bob: 0, tilt: 0, scale: 1 },
  attack: { frames: [4, 5, 6, 7], fps: 14, loop: false, bob: 0, tilt: 0, scale: 1.05 },
  interact: { frames: [12, 13, 14, 15], fps: 12, loop: false, bob: 0, tilt: 0, scale: 1 },
  hurt: { frames: [8, 9, 10, 11], fps: 10, loop: false, bob: 0, tilt: -0.08, scale: 0.98 },
};

/** duracao total de um clipe em ms. */
export function clipMs(c: HeroClip): number {
  const d = HERO_CLIPS[c];
  return (d.frames.length / d.fps) * 1000;
}

/** quadro atual do clipe a partir do tempo decorrido (segundos). */
export function clipFrame(c: HeroClip, elapsed: number): number {
  const d = HERO_CLIPS[c];
  const i = Math.floor(elapsed * d.fps);
  const idx = d.loop ? i % d.frames.length : Math.min(i, d.frames.length - 1);
  return d.frames[idx];
}

/** tira de exploracao do robo (desenhada a mao ou composta em runtime). */
export function heroSheet(robotId: string): string {
  return spriteUrl(robotId);
}

/** retrato 64x64 do robo. */
export function heroFace(robotId: string): string {
  return faceUrl(robotId);
}

/* ---------------------------------------------------------------------------
 * Pose procedural de locomocao: ciclo de passos com pulinho, squash/stretch
 * no apoio, balanco alternado e inclinacao para frente. Compartilhado por
 * casa, cidade, mapa e torneio para o andar ficar consistente.
 * ------------------------------------------------------------------------- */
export type HeroPose = { dy: number; rot: number; sx: number; sy: number; shadow: number; footfall: boolean };

const lastStep = new WeakMap<object, number>();

/** pose do heroi. `key` (qualquer objeto estavel) detecta o instante do passo. */
export function heroPose(clip: HeroClip, time: number, key?: object): HeroPose {
  const moving = clip === "walk" || clip === "run";
  if (!moving) {
    const breath = Math.sin(time * 3.2);
    if (key) lastStep.delete(key);
    return clip === "idle"
      ? { dy: breath * 0.8, rot: 0, sx: 1 - breath * 0.012, sy: 1 + breath * 0.018, shadow: 1, footfall: false }
      : { dy: 0, rot: HERO_CLIPS[clip].tilt, sx: 1, sy: 1, shadow: clip === "jump" || clip === "fall" ? 0.6 : 1, footfall: false };
  }
  const run = clip === "run";
  const rate = run ? 3.4 : 2.2; // passos por segundo / 2 (ciclo = 2 passos)
  const ph = time * rate * Math.PI * 2;
  const lift = Math.abs(Math.sin(ph)); // 0 = pe no chao, 1 = topo do passo
  const amp = run ? 7 : 4.2;
  const contact = 1 - lift;
  const squash = Math.pow(contact, 3);
  let footfall = false;
  if (key) {
    const step = Math.floor((ph + Math.PI / 2) / Math.PI);
    const prev = lastStep.get(key);
    if (prev !== undefined && prev !== step) footfall = true;
    lastStep.set(key, step);
  }
  return {
    dy: -lift * amp,
    rot: (run ? 0.12 : 0.05) + Math.sin(ph) * (run ? 0.05 : 0.07),
    sx: 1 + squash * (run ? 0.08 : 0.05),
    sy: 1 - squash * (run ? 0.09 : 0.06) + lift * 0.03,
    shadow: 1 - lift * 0.25,
    footfall,
  };
}

/** desenha um quadro do heroi com a pose, ancorado nos pes em (0,0). */
export function drawHeroPosed(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  frame: number,
  size: number,
  pose: HeroPose,
) {
  ctx.save();
  ctx.translate(0, pose.dy);
  ctx.rotate(pose.rot);
  ctx.scale(pose.sx, pose.sy);
  ctx.drawImage(sheet, frame * HERO_FRAME, 0, HERO_FRAME, HERO_FRAME, -size / 2, -size, size, size);
  ctx.restore();
}

type Dust = { x: number; y: number; vx: number; life: number; r: number };
const dustStore = new WeakMap<object, Dust[]>();

/** levanta poeira no passo; x/y em coordenadas de tela, face = direcao. */
export function kickDust(key: object, x: number, y: number, face: number, strong = false) {
  const list = dustStore.get(key) ?? [];
  const n = strong ? 4 : 2;
  for (let i = 0; i < n; i++) list.push({ x: x - face * (6 + i * 4), y: y - 2, vx: -face * (18 + Math.random() * 30), life: 0, r: 3 + Math.random() * 3 });
  if (list.length > 40) list.splice(0, list.length - 40);
  dustStore.set(key, list);
}

/** anda e desenha a poeira (blocos pixelados que sobem e somem). */
export function drawDust(ctx: CanvasRenderingContext2D, key: object, dt: number, color = "#c9d6e6") {
  const list = dustStore.get(key);
  if (!list?.length) return;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.life += dt;
    if (d.life > 0.45) { list.splice(i, 1); continue; }
    d.x += d.vx * dt;
    d.y -= 22 * dt;
    const k = d.life / 0.45;
    const s = Math.round(d.r * (1 + k));
    ctx.globalAlpha = 0.55 * (1 - k);
    ctx.fillRect(Math.round(d.x - s / 2), Math.round(d.y - s / 2), s, s);
  }
  ctx.restore();
}
