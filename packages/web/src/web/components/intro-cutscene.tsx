import { useEffect, useRef, useState } from "react";
import "./intro-cutscene.css";

/**
 * Abertura cinematográfica: 15 planos de IA animados em tempo real (60 qps, relógio próprio —
 * o currentTime do áudio só ressincroniza). Cada plano tem fundo e personagem em camadas
 * separadas (paralaxe 2.5D), respiração, balanço, piscadas, ondulação, luz e partículas em profundidade.
 */
type Fx = "stars" | "rays" | "neon" | "embers" | "dust" | "void" | "dark" | "sparks" | "spot" | "holo";
interface Anim {
  layer?: boolean;          // usa /intro/sNN_bg.webp + sNN_fg.webp
  breathe?: number;         // amplitude da respiração (escala Y)
  sway?: number;            // balanço em radianos
  bob?: number;             // flutuação vertical (fração da altura)
  wave?: number;            // ondulação horizontal em faixas (px da arte)
  split?: boolean;          // metades do personagem avançam uma contra a outra (duelo)
  pop?: number;             // zoom extra do personagem ao longo do plano
  blink?: [number, number, number, number]; // retângulo da piscada (coords 1024×576)
  eyes?: [number, number][]; // olhos que acendem
  spin?: [number, number, number, number]; // núcleo girando [cx, cy, raio, vel]
}
interface Shot { kicker: string; lines: [string, string]; from: [number, number, number]; to: [number, number, number]; fx: Fx[]; light?: [number, number, string]; flash?: number; shake?: number; a?: Anim }

const SHOT_SEC = 4;
/** Mantido para compatibilidade: 50 quadros-chave por plano; a reprodução interpola a 60 qps. */
export const INTRO_FRAMES_PER_SHOT = 50;
const SHOTS: Shot[] = [
  { kicker: "ANTES DO TEMPO", lines: ["Antes das cidades, antes das estrelas, havia apenas o Silêncio.", "E no Silêncio, uma faísca se recusou a apagar."], from: [1, .5, .5], to: [1.45, .5, .5], fx: ["stars"], light: [.5, .5, "255,214,120"], a: { spin: [.5, .5, .08, .9] } },
  { kicker: "A PRIMEIRA LUZ", lines: ["A faísca cresceu até virar um núcleo maior que a noite: a Primeira Luz.", "Ela não iluminava. Ela escrevia mapas de mundos que ainda não existiam."], from: [1.3, .5, .55], to: [1.04, .5, .5], fx: ["rays", "dust"], light: [.5, .45, "255,200,90"], flash: 0, a: { spin: [.5, .42, .2, .35] } },
  { kicker: "SETOR 01 · AURORA", lines: ["No primeiro mapa nasceu Aurora — trilhos, reatores e milhões de vidas.", "Uma cidade alimentada por um fragmento da Luz, enterrado sob a Linha Aurora."], from: [1.22, .18, .5], to: [1.22, .82, .5], fx: ["neon"], light: [.5, .3, "90,230,255"] },
  { kicker: "A FORJA FUNDADORA", lines: ["Para protegê-la, os engenheiros fundadores forjaram os Campeões:", "chassis de guerra que só despertam quando ouvem a voz de um piloto."], from: [1.1, .5, .65], to: [1.38, .5, .38], fx: ["embers", "sparks"], light: [.5, .5, "255,140,40"], shake: .4, a: { layer: true, breathe: .006, pop: .06 } },
  { kicker: "O VÍNCULO", lines: ["Cada chassi guarda um estilhaço da Primeira Luz.", "Piloto e máquina dividem o mesmo reator — as vitórias e as cicatrizes."], from: [1.12, .35, .5], to: [1.4, .76, .6], fx: ["dust", "holo"], light: [.78, .62, "255,200,80"], a: { layer: true, breathe: .012, sway: .006, pop: .05 } },
  { kicker: "AS BORDAS DO MAPA", lines: ["Mas toda luz projeta sombra. Onde o mapa termina, algo despertou.", "O Arconte do Vazio: a vontade do Silêncio, vestida de aço."], from: [1.45, .5, .32], to: [1.08, .5, .5], fx: ["void"], light: [.5, .3, "170,80,255"], shake: 1, a: { layer: true, wave: 7, breathe: .01, pop: .08 } },
  { kicker: "O ECLIPSE", lines: ["Ele não quer conquistar Aurora. Quer desligá-la.", "Uma a uma, as luzes se apagam — e quem esquece a luz para de lutar."], from: [1.05, .5, .55], to: [1.25, .5, .3], fx: ["dark", "void", "neon"], light: [.5, .2, "150,70,255"] },
  { kicker: "O PANTEÃO", lines: ["Antes da cidade, a Luz criou guardiões em Asgard, no Olimpo e em Duat.", "Vinte e sete chassis divinos dormem, esperando quem mereça acordá-los."], from: [1.25, .14, .5], to: [1.25, .86, .5], fx: ["rays", "dust"], light: [.5, .15, "255,226,150"], a: { layer: true, breathe: .008, bob: .006, pop: .04 } },
  { kicker: "O EQUILÍBRIO", lines: ["Quem despertar o Panteão decidirá a balança entre a Luz e o Vazio.", "E as duas forças já começaram a recrutar."], from: [1.12, .28, .5], to: [1.12, .72, .5], fx: ["sparks", "void"], light: [.5, .35, "255,240,200"], a: { spin: [.27, .3, .2, -.25] } },
  { kicker: "FERRO-VELHO INDUSTRIAL", lines: ["Nos subsolos, catadores arrancam núcleos dos trens da Linha Aurora.", "Sobre um trono de sucata, um rei vende a cidade a quem pagar mais."], from: [1.32, .5, .42], to: [1.08, .5, .5], fx: ["embers", "dust"], light: [.5, .4, "255,120,50"], a: { layer: true, breathe: .007, bob: .004, pop: .05 } },
  { kicker: "O COLISEU", lines: ["Enquanto isso, Aurora ainda celebra seus campeões no Coliseu,", "sem saber que cada duelo alimenta o reator que a mantém viva."], from: [1.05, .5, .5], to: [1.32, .5, .56], fx: ["spot", "neon", "sparks"], light: [.5, .55, "255,80,200"], flash: 2.35, shake: .6, a: { layer: true, split: true } },
  { kicker: "COMANDO PRIMEIRA LUZ", lines: ["A Comandante Lyra reuniu o último esquadrão da Guerra Fundadora.", "Ela leu os sinais: o eclipse chega em sete noites."], from: [1.08, .45, .5], to: [1.3, .4, .42], fx: ["holo"], light: [.55, .35, "60,230,240"], a: { layer: true, breathe: .01, sway: .005, pop: .05, blink: [468, 96, 106, 40] } },
  { kicker: "A FORJA DE NARA", lines: ["A Engenheira Nara, ferreira-chefe de Aurora, reconstrói chassis com as próprias mãos.", "Mas nenhuma forja aguenta sete noites sem um campeão."], from: [1.08, .48, .5], to: [1.3, .45, .4], fx: ["sparks", "embers"], light: [.3, .45, "255,170,60"], shake: .3, a: { layer: true, breathe: .012, sway: .008, pop: .05, blink: [380, 104, 148, 66] } },
  { kicker: "HANGAR 01", lines: ["No fundo do hangar, um chassi dourado esperou por quarenta anos.", "Seu nome é Aurorion. Ele recusou todos os pilotos."], from: [1, .5, .38], to: [1.26, .5, .52], fx: ["rays", "dust"], light: [.5, .05, "230,240,255"], a: { layer: true, breathe: .008, bob: .01, pop: .1 } },
  { kicker: "SINAL RECEBIDO", lines: ["Até hoje.", "Piloto — a Primeira Luz escolheu você."], from: [1.55, .5, .45], to: [1.08, .5, .5], fx: ["sparks"], light: [.5, .42, "90,240,255"], flash: 1.45, shake: .5, a: { eyes: [[.426, .523], [.565, .515]] } },
];
const TOTAL_SEC = SHOTS.length * SHOT_SEC;
export const INTRO_TOTAL_FRAMES = SHOTS.length * INTRO_FRAMES_PER_SHOT;
const FADE = .55;

type P = { x: number; y: number; vx: number; vy: number; s: number; a: number; c: string; front: boolean };
function rng(seed: number) { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function particles(shot: Shot, i: number): P[] {
  const r = rng(i * 977 + 13), out: P[] = [];
  for (const fx of shot.fx) {
    const n = fx === "stars" ? 140 : fx === "dust" ? 60 : fx === "embers" ? 70 : fx === "sparks" ? 46 : fx === "void" ? 70 : fx === "neon" ? 26 : fx === "holo" ? 30 : 0;
    for (let k = 0; k < n; k++) {
      const p: P = { x: r(), y: r(), vx: 0, vy: 0, s: 1 + r() * 2, a: .3 + r() * .7, c: "255,255,255", front: r() < .4 };
      if (fx === "stars") { p.s = r() < .9 ? 1 : 2; p.c = r() < .2 ? "255,220,150" : "200,225,255"; p.a = .2 + r() * .8; p.front = false; }
      if (fx === "dust") { p.vx = (r() - .5) * .04; p.vy = -r() * .05; p.c = "255,236,190"; p.a = .15 + r() * .4; }
      if (fx === "embers") { p.y = .6 + r() * .5; p.vx = (r() - .5) * .12; p.vy = -.25 - r() * .5; p.c = r() < .5 ? "255,170,60" : "255,110,30"; p.s = 1 + r() * 2.5; }
      if (fx === "sparks") { const ang = r() * Math.PI * 2, sp = .2 + r() * .6; p.x = shot.light?.[0] ?? .5; p.y = shot.light?.[1] ?? .5; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp - .1; p.c = r() < .5 ? "255,230,140" : "130,240,255"; p.s = 1 + r() * 2; }
      if (fx === "void") { p.vx = (.5 - p.x) * .5; p.vy = (.3 - p.y) * .5; p.c = r() < .5 ? "180,90,255" : "90,40,160"; p.s = 1.5 + r() * 3; }
      if (fx === "neon") { p.y = .1 + r() * .5; p.vx = (r() < .5 ? -1 : 1) * (.3 + r() * .5); p.c = r() < .5 ? "80,240,255" : "255,190,90"; p.s = 2; p.front = false; }
      if (fx === "holo") { p.vy = -.05 - r() * .08; p.c = "90,240,240"; p.s = 1 + r(); }
      out.push(p);
    }
  }
  return out;
}
const ease = (p: number) => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const num = (i: number) => String(i + 1).padStart(2, "0");
const load = (src: string) => { const im = new Image(); im.decoding = "async"; im.src = src; return im; };
const ok = (im?: HTMLImageElement) => !!im && im.complete && im.naturalWidth > 0;

export function IntroCutscene({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(0);
  const [shot, setShot] = useState(0);
  const [title, setTitle] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; audio.current?.pause(); onDone(); };

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const main = SHOTS.map((_, i) => load(`/intro/s${num(i)}.webp`));
    const bgs = SHOTS.map((s, i) => s.a?.layer ? load(`/intro/s${num(i)}_bg.webp`) : undefined);
    const fgs = SHOTS.map((s, i) => s.a?.layer ? load(`/intro/s${num(i)}_fg.webp`) : undefined);
    const blinks = SHOTS.map((s, i) => s.a?.blink ? load(`/intro/s${num(i)}_blink.webp`) : undefined);
    const all = [...main, ...bgs, ...fgs, ...blinks].filter((x): x is HTMLImageElement => !!x);
    const parts = SHOTS.map(particles);
    const grain = document.createElement("canvas"); grain.width = grain.height = 128;
    { const g = grain.getContext("2d")!, d = g.createImageData(128, 128), r = rng(7); for (let k = 0; k < d.data.length; k += 4) { const v = r() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 20; } g.putImageData(d, 0, 0); }
    let loaded = 0, raf = 0, start = 0, alive = true, lastShot = -1, titled = false, grainPat: CanvasPattern | null = null, grainSeed = 0;
    const a = new Audio("/intro/theme.mp3"); a.preload = "auto"; a.volume = .85; audio.current = a;
    const begin = () => { if (!alive) return; start = performance.now(); a.play().catch(() => {}); raf = requestAnimationFrame(tick); };
    all.forEach(im => { const on = () => { loaded++; setReady(loaded / all.length); if (loaded === all.length) begin(); }; if (ok(im)) on(); else { im.onload = on; im.onerror = on; } });

    const draw = (ctx: CanvasRenderingContext2D, W: number, H: number, i: number, lt: number, alpha: number, T: number) => {
      const s = SHOTS[i], an = s.a ?? {}, im = main[i], p = Math.min(1, Math.max(0, lt / SHOT_SEC)), e = ease(p);
      const sc = s.from[0] + (s.to[0] - s.from[0]) * e, fx = s.from[1] + (s.to[1] - s.from[1]) * e, fy = s.from[2] + (s.to[2] - s.from[2]) * e;
      const iw = im.naturalWidth || 1024, ih = im.naturalHeight || 576, base = Math.max(W / iw, H / ih) * sc, dw = iw * base, dh = ih * base;
      let ox = W / 2 - fx * dw, oy = H / 2 - fy * dh;
      ox = Math.min(0, Math.max(W - dw, ox)); oy = Math.min(0, Math.max(H - dh, oy));
      const m = reduce ? 0 : 1;
      // câmera na mão: deriva suave contínua
      ox += Math.sin(T * .7 + i) * W * .003 * m; oy += Math.cos(T * .53 + i) * H * .003 * m;
      if (s.shake && m) { const k = Math.max(0, 1 - Math.abs(lt - (s.flash ?? 0)) / 1.2); ox += Math.sin(T * 47) * 5 * s.shake * (.3 + k); oy += Math.cos(T * 39) * 4 * s.shake * (.3 + k); }
      const toX = (x: number) => ox + x * dw, toY = (y: number) => oy + y * dh;
      ctx.globalAlpha = alpha; ctx.globalCompositeOperation = "source-over";
      const bg = an.layer && ok(bgs[i]) ? bgs[i]! : im, fg = an.layer && ok(fgs[i]) ? fgs[i] : undefined;
      // fundo anda menos que o personagem → profundidade
      const bx = fg ? (fx - .5) * dw * .015 : 0;
      if (ok(bg)) ctx.drawImage(bg, ox + bx - dw * .01, oy - dh * .01, dw * 1.02, dh * 1.02);
      if (an.spin && ok(im)) {
        const [cx, cy, rr, sp] = an.spin, X = toX(cx), Y = toY(cy), R = rr * dw;
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha * .55;
        ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.clip();
        ctx.translate(X, Y); ctx.rotate(T * sp * m); ctx.scale(1 + .04 * Math.sin(T * 2), 1 + .04 * Math.sin(T * 2)); ctx.translate(-X, -Y);
        ctx.drawImage(im, ox, oy, dw, dh); ctx.restore(); ctx.globalAlpha = alpha;
      }
      if (s.fx.includes("dark")) { ctx.fillStyle = `rgba(4,0,14,${.15 + p * .45})`; ctx.fillRect(0, 0, W, H); }
      const px = Math.max(2, Math.round(Math.min(W, H) / 260));
      const dots = (front: boolean) => {
        ctx.globalCompositeOperation = "lighter";
        for (const q of parts[i]) {
          if (q.front !== front) continue;
          let x = q.x + q.vx * p * (front ? 1.4 : 1), y = q.y + q.vy * p * (front ? 1.4 : 1);
          if (s.fx.includes("sparks") && q.vx && q.vy) y += .35 * p * p;
          x = ((x % 1) + 1) % 1; y = ((y % 1) + 1) % 1;
          const tw = s.fx.includes("stars") ? .5 + .5 * Math.sin(T * 7 + q.x * 40) : .75 + .25 * Math.sin(T * 9 + q.y * 30);
          ctx.fillStyle = `rgba(${q.c},${q.a * tw * alpha})`;
          const z = Math.round(q.s * px * (front ? .9 : .6));
          ctx.fillRect(Math.round(x * W / px) * px, Math.round(y * H / px) * px, z, z);
          if (s.fx.includes("neon") && q.s === 2) ctx.fillRect(Math.round(x * W) - z * 6, Math.round(y * H), z * 6, 1);
        }
        ctx.globalCompositeOperation = "source-over";
      };
      dots(false);
      if (fg) {
        const ax = toX(.5), ay = toY(1), pop = 1 + (an.pop ?? 0) * e, br = Math.sin(T * 2.3 + i) * (an.breathe ?? 0) * m;
        ctx.save();
        ctx.translate(ax - bx * 1.5, ay + Math.sin(T * 1.6 + i) * (an.bob ?? 0) * dh * m);
        ctx.rotate(Math.sin(T * 1.1 + i) * (an.sway ?? 0) * m);
        ctx.scale(pop * (1 - br * .35), pop * (1 + br));
        ctx.translate(-ax, -ay);
        if (an.split) {
          const hit = 2.35, k = lt < hit ? ease(Math.min(1, lt / hit)) : 1 - .35 * ease(Math.min(1, (lt - hit) / 1.2)), d = dw * .085 * k * m;
          ctx.drawImage(fg, 0, 0, iw / 2, ih, ox + d, oy, dw / 2, dh);
          ctx.drawImage(fg, iw / 2, 0, iw / 2, ih, ox + dw / 2 - d, oy, dw / 2, dh);
        } else if (an.wave && m) {
          const st = 6;
          for (let y = 0; y < ih; y += st) { const w = Math.sin(y * .035 + T * 2.6) * an.wave * (1 - y / ih * .6) * base; ctx.drawImage(fg, 0, y, iw, st, ox + w, oy + y * base, dw, st * base + 1); }
        } else ctx.drawImage(fg, ox, oy, dw, dh);
        if (an.blink && ok(blinks[i])) {
          const cyc = (lt + i * .37) % 2.6;
          if (cyc > 2.38) { const [x, y, w, h] = an.blink, k = iw / 1024; ctx.drawImage(blinks[i]!, ox + x * k * base, oy + y * k * base, w * k * base, h * k * base); }
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = "lighter";
      if (s.light) {
        const [lx, ly, c] = s.light, pulse = .55 + .25 * Math.sin(T * 6.9) + (i === 0 ? p * .6 : 0), R = Math.max(W, H) * (.25 + (i === 0 ? p * .25 : .1));
        const g = ctx.createRadialGradient(toX(lx), toY(ly), 0, toX(lx), toY(ly), R);
        g.addColorStop(0, `rgba(${c},${.34 * pulse * alpha})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (s.fx.includes("rays") && s.light) {
        const [lx, ly, c] = s.light, cx = toX(lx), cy = toY(ly);
        for (let k = 0; k < 9; k++) {
          const ang = Math.PI * .5 + (k - 4) * .16 + Math.sin(T * .9 + k) * .03, len = Math.max(W, H) * 1.3, wid = .05 + (k % 3) * .02;
          ctx.fillStyle = `rgba(${c},${(.05 + .04 * Math.sin(T * 3.7 + k * 2)) * alpha})`; ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang - wid) * len, cy + Math.sin(ang - wid) * len); ctx.lineTo(cx + Math.cos(ang + wid) * len, cy + Math.sin(ang + wid) * len); ctx.fill();
        }
      }
      if (s.fx.includes("spot")) {
        for (let k = 0; k < 3; k++) {
          const sx = W * (.2 + k * .3), ang = Math.PI / 2 + Math.sin(T * 2.2 + k * 2.1) * .5;
          ctx.fillStyle = `rgba(${k === 1 ? "255,90,210" : "90,230,255"},${.08 * alpha})`; ctx.beginPath(); ctx.moveTo(sx, 0);
          ctx.lineTo(sx + Math.cos(ang - .12) * H * 1.4, Math.sin(ang - .12) * H * 1.4); ctx.lineTo(sx + Math.cos(ang + .12) * H * 1.4, Math.sin(ang + .12) * H * 1.4); ctx.fill();
        }
      }
      if (an.eyes) {
        const k = Math.max(0, Math.min(1, (lt - 1.2) / .5)), fl = .85 + .15 * Math.sin(T * 18);
        for (const [x, y] of an.eyes) {
          const X = toX(x), Y = toY(y), R = dw * (.02 + .05 * k);
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, `rgba(170,255,255,${k * fl * alpha})`); g.addColorStop(.35, `rgba(60,230,255,${.55 * k * alpha})`); g.addColorStop(1, "rgba(60,230,255,0)");
          ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
          ctx.fillStyle = `rgba(120,245,255,${.5 * k * fl * alpha})`; ctx.fillRect(X - W * .22 * k, Y - 1, W * .44 * k, 2);
        }
      }
      if (s.fx.includes("holo")) { ctx.fillStyle = `rgba(80,240,240,${(Math.sin(T * 9) > .85 ? .08 : .025) * alpha})`; for (let y = Math.floor(T * 40) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 1); }
      dots(true);
      ctx.globalCompositeOperation = "source-over";
      if (s.flash !== undefined) { const d = lt - s.flash; if (d >= 0 && d < .4) { ctx.fillStyle = `rgba(255,250,235,${(1 - d / .4) * .75 * alpha})`; ctx.fillRect(0, 0, W, H); } }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const c = canvas.current; if (!c) { raf = requestAnimationFrame(tick); return; }
      let t = Math.max(0, (now - start) / 1000);
      // o currentTime do <audio> só atualiza ~4×/s: usamos relógio próprio e corrigimos só a deriva grande
      if (!a.paused && a.currentTime > 0 && Math.abs(a.currentTime - t) > .35) { start = now - a.currentTime * 1000; t = a.currentTime; }
      if (t >= TOTAL_SEC) { setEnding(true); setTimeout(finish, 900); return; }
      const dpr = Math.min(1.5, window.devicePixelRatio || 1), W = Math.min(1920, Math.round(c.clientWidth * dpr)), H = Math.round(W * c.clientHeight / Math.max(1, c.clientWidth));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; grainPat = null; }
      const ctx = c.getContext("2d")!; ctx.imageSmoothingEnabled = false;
      const i = Math.max(0, Math.min(SHOTS.length - 1, Math.floor(t / SHOT_SEC))), lt = t - i * SHOT_SEC;
      ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      if (lt < FADE && i > 0) { draw(ctx, W, H, i - 1, SHOT_SEC + lt, 1, t); draw(ctx, W, H, i, lt, lt / FADE, t); }
      else draw(ctx, W, H, i, lt, 1, t);
      grainPat ??= ctx.createPattern(grain, "repeat");
      if (grainPat) { if (Math.floor(t * 24) !== grainSeed) grainSeed = Math.floor(t * 24); const r = rng(grainSeed); ctx.save(); ctx.translate(Math.floor(r() * 128), Math.floor(r() * 128)); ctx.fillStyle = grainPat; ctx.fillRect(-128, -128, W + 256, H + 256); ctx.restore(); }
      if (i !== lastShot) { lastShot = i; setShot(i); }
      if (!titled && i === SHOTS.length - 1 && lt > 2.4) { titled = true; setTitle(true); }
      if (bar.current) bar.current.style.width = `${(t / TOTAL_SEC) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); finish(); } };
    window.addEventListener("keydown", key);
    return () => { alive = false; cancelAnimationFrame(raf); a.pause(); a.src = ""; window.removeEventListener("keydown", key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  const s = SHOTS[shot];
  return <div className={`mc-intro${ending ? " is-ending" : ""}`} role="dialog" aria-label="Abertura de Mecha Champions">
    <canvas ref={canvas} aria-hidden />
    <div className="mc-intro-vignette" aria-hidden />
    <i className="mc-intro-bar is-top" aria-hidden /><i className="mc-intro-bar is-bottom" aria-hidden />
    {ready < 1 && <div className="mc-intro-load" role="status"><small>SINTONIZANDO TRANSMISSÃO</small><b><u style={{ width: `${Math.round(ready * 100)}%` }} /></b></div>}
    {ready >= 1 && <div className="mc-intro-caption" key={shot} aria-live="polite">
      <small>{num(shot)} / {SHOTS.length} · {s.kicker}</small>
      <p className="is-a">{s.lines[0]}</p>
      <p className="is-b">{s.lines[1]}</p>
    </div>}
    {title && <div className="mc-intro-title" aria-hidden><small>REMULU GAMES APRESENTA</small><strong>MECHA CHAMPIONS</strong><span>CRÔNICAS DA PRIMEIRA LUZ</span></div>}
    <div className="mc-intro-ui">
      <button data-skin="none" onClick={() => setMuted(v => !v)} aria-pressed={muted}>{muted ? "SOM OFF" : "SOM ON"}</button>
      <button data-skin="none" className="is-skip" onClick={finish} data-testid="intro-skip">PULAR ▸▸</button>
    </div>
    <i ref={bar} className="mc-intro-progress" style={{ width: 0 }} aria-hidden />
  </div>;
}
