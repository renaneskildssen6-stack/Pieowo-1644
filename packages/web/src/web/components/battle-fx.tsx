import { useEffect, useRef } from "react";
import type { Side } from "@/game/battle";
import { worldEffectFor } from "@/game/anim";
import { floorOf } from "@/components/arena-floor";

/**
 * Iluminação dinâmica + partículas + objetos animados da arena.
 * Dois canvas em baixa resolução (pixel duro) num único loop a ~30 qps:
 *  - fundo (abaixo dos robôs): poças de luz no chão, feixes, lâmpadas, drones, clima distante;
 *  - frente (acima dos robôs): luz/sombra dinâmica, faíscas, ondas de choque, clima próximo.
 * Pausa com a aba oculta; com movimento reduzido desenha só a luz estática.
 */

export interface FxHurt { key: number; side: Side; heavy: boolean }
export interface FxProps {
  arena: string;
  weather: string;
  colors: Record<Side, string>;
  reduced: boolean;
  hurt: FxHurt | null;
  dying: { key: number; side: Side } | null;
  shot: { side: Side; kind: string } | null;
  power: { key: number; side: Side } | null;
  vfxKey: { key: number; side: Side } | null;
}

type Kind = "rise" | "fall" | "drift" | "streak" | "rain" | "snow" | "bubble" | "puff";
interface Amb { kind: Kind; colors: string[]; rate: number; size: [number, number]; glow: boolean; alpha: number }
const AMB: Record<string, Amb> = {
  wildfire: { kind: "rise", colors: ["#ff8a2a", "#ffd36a", "#ff4a1a"], rate: 16, size: [1, 2], glow: true, alpha: 1 },
  blizzard: { kind: "snow", colors: ["#ffffff", "#cfefff"], rate: 26, size: [1, 2], glow: false, alpha: .85 },
  ash: { kind: "fall", colors: ["#9a9aa2", "#5b5b63", "#7a7a80", "#ff7a3a"], rate: 12, size: [1, 2], glow: false, alpha: .8 },
  overgrowth: { kind: "drift", colors: ["#c8ff8a", "#7dff6a", "#f4ff9a"], rate: 6, size: [1, 1], glow: true, alpha: 1 },
  holy: { kind: "rise", colors: ["#fff2b0", "#ffe08a", "#ffffff"], rate: 8, size: [1, 1], glow: true, alpha: .9 },
  aurora: { kind: "drift", colors: ["#7fe4ff", "#b980ff", "#a8ffd9"], rate: 7, size: [1, 1], glow: true, alpha: .9 },
  tsunami: { kind: "bubble", colors: ["#7ff0d6", "#bfffff"], rate: 9, size: [1, 2], glow: false, alpha: .7 },
  sand: { kind: "streak", colors: ["#ffd08a", "#c48a52", "#e6b274"], rate: 22, size: [1, 1], glow: false, alpha: .7 },
  thunderstorm: { kind: "rain", colors: ["#9fc3ff", "#cfe0ff"], rate: 46, size: [1, 1], glow: false, alpha: .55 },
  steam: { kind: "puff", colors: ["#d7dbe4", "#aab2c0"], rate: 3, size: [4, 8], glow: false, alpha: .14 },
  gears: { kind: "fall", colors: ["#ffb04a", "#fff1a8", "#ff7a1a"], rate: 8, size: [1, 1], glow: true, alpha: 1 },
  meteor: { kind: "streak", colors: ["#ffd36a", "#ff8a2a", "#ffffff"], rate: 2, size: [1, 2], glow: true, alpha: 1 },
  alarm: { kind: "drift", colors: ["#ffffff", "#ff8a8a"], rate: 5, size: [1, 1], glow: false, alpha: .45 },
  vortex: { kind: "streak", colors: ["#ffffff", "#cfefff"], rate: 14, size: [1, 1], glow: false, alpha: .35 },
  eclipse: { kind: "drift", colors: ["#c08cff", "#6a3aff", "#ff5ad8"], rate: 7, size: [1, 2], glow: true, alpha: .9 },
};
const DUST: Amb = { kind: "drift", colors: ["#ffffff", "#ffe9c0"], rate: 6, size: [1, 1], glow: false, alpha: .4 };

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; glow: boolean; alpha: number; g: number; front: boolean; kind: number }
interface Light { x: number; y: number; r: number; color: string; life: number; max: number; power: number }
interface Ring { x: number; y: number; r: number; v: number; life: number; max: number; color: string }

const SCALE = 3; // px de tela por pixel do canvas → visual pixelado e barato
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function BattleFx(props: FxProps) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const live = useRef(props); live.current = props;
  const sim = useRef({ parts: [] as P[], lights: [] as Light[], rings: [] as Ring[], flash: 0, flashColor: "#ffffff", bolt: null as null | { pts: [number, number][]; life: number } });
  const pos = useRef<Record<Side, { x: number; y: number; feet: number; s: number }>>({ player: { x: 40, y: 60, feet: 80, s: 40 }, enemy: { x: 100, y: 60, feet: 80, s: 40 } });

  // ---- eventos de combate → luz e partículas
  const burst = (side: Side, color: string, n: number, speed: number, power: number, ring: boolean) => {
    const S = sim.current, p = pos.current[side];
    const lite = isLite();
    for (let i = 0; i < (lite ? Math.ceil(n * .6) : n); i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(.3, 1) * speed;
      S.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .35, life: 0, max: rnd(.35, .8), size: Math.random() < .25 ? 2 : 1, color: Math.random() < .3 ? "#ffffff" : color, glow: true, alpha: 1, g: 40, front: true, kind: 1 });
    }
    S.lights.push({ x: p.x, y: p.y, r: p.s * (1 + Math.min(1, power) * .6), color, life: 0, max: .26 + power * .24, power: Math.min(1, .5 + power * .4) });
    if (ring) S.rings.push({ x: p.x, y: p.y, r: 2, v: p.s * (2.2 + power * 1.4), life: 0, max: .42, color });
  };
  const other = (s: Side): Side => (s === "player" ? "enemy" : "player");
  useEffect(() => { const h = props.hurt; if (!h) return; const c = live.current.colors[other(h.side)]; burst(h.side, c, h.heavy ? 26 : 14, h.heavy ? 95 : 65, h.heavy ? 1 : .45, true); if (h.heavy) { sim.current.flash = .5; sim.current.flashColor = c; } }, [props.hurt?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = props.dying; if (!d) return;
    const t = window.setTimeout(() => { burst(d.side, "#ffb23a", 40, 120, 1.4, true); burst(d.side, "#ff5a2a", 14, 60, .6, false); sim.current.flash = .8; sim.current.flashColor = "#ffd27a"; smoke(d.side); }, 380);
    return () => window.clearTimeout(t);
  }, [props.dying?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const v = props.vfxKey; if (!v) return; const c = live.current.colors[v.side]; burst(v.side, c, 8, 40, .3, false); }, [props.vfxKey?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const p = props.power; if (!p) return; const c = live.current.colors[p.side]; burst(p.side, c, 30, 70, 1.2, true); sim.current.flash = .6; sim.current.flashColor = c; }, [props.power?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const smoke = (side: Side) => {
    const p = pos.current[side];
    for (let i = 0; i < (isLite() ? 5 : 9); i++) sim.current.parts.push({ x: p.x + rnd(-p.s * .4, p.s * .4), y: p.feet - rnd(0, p.s * .5), vx: rnd(-8, 8), vy: rnd(-14, -5), life: 0, max: rnd(1.2, 2), size: (rnd(4, 8)) | 0, color: "#2a2a30", glow: false, alpha: .55, g: -2, front: true, kind: 2 });
  };

  useEffect(() => {
    const bc = back.current, fc = front.current;
    if (!bc || !fc) return;
    const bx = bc.getContext("2d"), fx = fc.getContext("2d");
    if (!bx || !fx) return;
    const lite = isLite();
    const cap = lite ? 90 : 170;
    const stepMs = lite ? 1000 / 24 : 1000 / 30;
    let W = 0, H = 0, raf = 0, last = performance.now(), acc = 0, spawn = 0, frame = 0, t = 0;
    let nextBolt = rnd(3, 7), drone: null | { x: number; y: number; v: number; ph: number } = null, nextDrone = rnd(2, 6);

    const resize = () => {
      const w = Math.max(40, Math.round(fc.clientWidth / SCALE)), h = Math.max(40, Math.round(fc.clientHeight / SCALE));
      if (w === W && h === H) return;
      W = w; H = h;
      for (const c of [bc, fc]) { c.width = W; c.height = H; }
    };
    const measure = () => {
      const cr = fc.getBoundingClientRect();
      if (!cr.width) return;
      const k = fc.clientWidth / cr.width / SCALE; // desfaz o zoom da câmera
      const root = fc.closest(".mk-battle") ?? document;
      for (const side of ["player", "enemy"] as Side[]) {
        const el = root.querySelector(`.mk-battle-fighter-${side}:not(.mk-battle-partner)`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        pos.current[side] = { x: (r.left + r.width / 2 - cr.left) * k, y: (r.top + r.height * .52 - cr.top) * k, feet: (r.bottom - cr.top) * k, s: Math.max(14, r.width * k * .5) };
      }
    };

    // objetos fixos da arena (determinísticos por arena)
    const props0 = live.current;
    const effect = worldEffectFor(props0.arena, props0.weather);
    const amb = AMB[effect] ?? DUST;
    const floor = floorOf(props0.arena);
    const seed = hash(props0.arena);
    const lamps = Array.from({ length: lite ? 2 : 3 }, (_, i) => ({ fx: ((seed >> (i * 5)) % 70 + 15 + i * 7) % 90 / 100 + .05, fy: .1 + ((seed >> (i * 3)) % 20) / 100, ph: i * 1.7 }));
    const beams = /alarm|gears|meteor|vortex|holy|aurora/.test(effect) || /neodojo|orbital|throne|hangar|undercity|archive|spire/.test(props0.arena);
    const beamColor = effect === "alarm" ? "#ff3a3a" : effect === "holy" ? "#fff2b0" : floor.glow;

    const spawnAmbient = (n: number) => {
      for (let i = 0; i < n && sim.current.parts.length < cap; i++) {
        const fr = Math.random() < .35;
        const c = pick(amb.colors);
        let x = rnd(0, W), y = rnd(0, H), vx = 0, vy = 0, g = 0, max = rnd(3, 6);
        switch (amb.kind) {
          case "rise": y = H * rnd(.55, 1); vx = rnd(-4, 4); vy = rnd(-18, -7); break;
          case "fall": y = -2; vx = rnd(-3, 3); vy = rnd(5, 12); g = effect === "gears" ? 30 : 0; break;
          case "snow": y = -2; x = rnd(-W * .2, W); vx = rnd(6, 14); vy = rnd(12, 22); break;
          case "rain": y = -4; x = rnd(-W * .3, W); vx = 22; vy = 120; max = 1.4; break;
          case "bubble": y = H + 2; vx = 0; vy = rnd(-14, -6); break;
          case "streak": x = effect === "meteor" ? rnd(W * .2, W * 1.1) : -4; y = effect === "meteor" ? rnd(0, H * .3) : rnd(H * .2, H * .95); vx = effect === "meteor" ? -rnd(60, 90) : rnd(50, 90); vy = effect === "meteor" ? rnd(25, 40) : rnd(-2, 2); max = 2.5; break;
          case "puff": y = H * rnd(.6, 1); vx = rnd(-3, 3); vy = rnd(-6, -3); max = rnd(4, 7); break;
          default: vx = rnd(-3, 3); vy = rnd(-3, 2); break;
        }
        const sz = rnd(amb.size[0], amb.size[1] + .99) | 0;
        sim.current.parts.push({ x, y, vx, vy, life: 0, max, size: fr ? sz + (amb.kind === "puff" ? 3 : 1) : sz, color: c, glow: amb.glow, alpha: amb.alpha * (fr ? .8 : .6), g, front: fr, kind: 0 });
      }
    };

    const drawGlow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) => {
      if (r < 1 || a <= .01) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(color, a)); g.addColorStop(.45, rgba(color, a * .35)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const render = (dt: number) => {
      const S = sim.current, P = live.current, cols = P.colors;
      const pp = pos.current.player, ep = pos.current.enemy;
      const reduced = P.reduced;
      // ---------------- fundo
      bx.clearRect(0, 0, W, H);
      bx.globalCompositeOperation = "lighter";
      // feixes de luz de cima (sobem e descem devagar)
      const shafts = lite ? 2 : 3;
      for (let i = 0; i < shafts; i++) {
        const cx = W * (.18 + i * .32) + Math.sin(t * .25 + i * 2) * W * .05;
        const a = .05 + .03 * Math.sin(t * .6 + i);
        const g = bx.createLinearGradient(0, 0, 0, H * .9);
        g.addColorStop(0, rgba(floor.glow, a * 1.05)); g.addColorStop(1, rgba(floor.glow, 0));
        bx.fillStyle = g;
        bx.beginPath(); bx.moveTo(cx - W * .03, 0); bx.lineTo(cx + W * .03, 0); bx.lineTo(cx + W * .11, H * .9); bx.lineTo(cx - W * .07, H * .9); bx.closePath(); bx.fill();
      }
      // holofotes varrendo
      if (beams && !reduced) {
        for (let i = 0; i < 2; i++) {
          const ox = i ? W * .92 : W * .08, ang = Math.PI / 2 + Math.sin(t * (.35 + i * .1) + i * 3) * .55 * (i ? -1 : 1);
          const len = H * 1.1, spread = .1;
          const g = bx.createLinearGradient(ox, H, ox + Math.cos(ang) * len, H - Math.sin(ang) * len);
          g.addColorStop(0, rgba(beamColor, .16)); g.addColorStop(1, rgba(beamColor, 0));
          bx.fillStyle = g;
          bx.beginPath(); bx.moveTo(ox, H);
          bx.lineTo(ox + Math.cos(ang - spread) * len, H - Math.sin(ang - spread) * len);
          bx.lineTo(ox + Math.cos(ang + spread) * len, H - Math.sin(ang + spread) * len);
          bx.closePath(); bx.fill();
        }
      }
      // lâmpadas tremeluzindo
      for (const l of lamps) {
        const fl = reduced ? .8 : .7 + .3 * Math.sin(t * 9 + l.ph) * Math.sin(t * 2.3 + l.ph * 2) + (Math.random() < .015 ? -.5 : 0);
        drawGlow(bx, l.fx * W, l.fy * H, Math.min(W, H) * .1, floor.glow, .35 * fl);
        bx.fillStyle = rgba("#ffffff", .7 * fl); bx.fillRect((l.fx * W) | 0, (l.fy * H) | 0, 1, 1);
      }
      // poças de luz sob os robôs (cor do elemento), pulsando
      for (const [p, c, side] of [[pp, cols.player, "player"], [ep, cols.enemy, "enemy"]] as const) {
        const act = P.shot?.side === side ? 1 : 0;
        const pulse = reduced ? 1 : 1 + .12 * Math.sin(t * 2.4 + (side === "enemy" ? 1.5 : 0));
        bx.save(); bx.translate(p.x, p.feet - 1); bx.scale(1, .28);
        drawGlow(bx, 0, 0, p.s * (1.5 + act * .5) * pulse, c, .32 + act * .25);
        bx.restore();
        drawGlow(bx, p.x, p.y, p.s * 1.4, c, .045 + act * .04);
      }
      // drone de patrulha cruzando o fundo
      if (!reduced) {
        nextDrone -= dt;
        if (!drone && nextDrone <= 0) { const dir = Math.random() < .5 ? 1 : -1; drone = { x: dir > 0 ? -10 : W + 10, y: rnd(H * .08, H * .22), v: dir * rnd(14, 24), ph: 0 }; }
        if (drone) {
          drone.x += drone.v * dt; drone.ph += dt;
          const dy = drone.y + Math.sin(drone.ph * 3) * 1.5;
          bx.globalCompositeOperation = "source-over";
          bx.fillStyle = "#05070d"; bx.fillRect(drone.x - 3 | 0, dy | 0, 7, 2); bx.fillRect(drone.x - 5 | 0, dy - 1 | 0, 2, 1); bx.fillRect(drone.x + 3 | 0, dy - 1 | 0, 2, 1); bx.fillRect(drone.x | 0, dy + 2 | 0, 1, 1);
          bx.globalCompositeOperation = "lighter";
          const blink = (drone.ph * 2) % 1 < .5;
          bx.fillStyle = blink ? "#ff4a4a" : "#4aff8a"; bx.fillRect(drone.x + (drone.v > 0 ? 3 : -4) | 0, dy | 0, 1, 1);
          const g = bx.createLinearGradient(drone.x, dy, drone.x, dy + H * .3);
          g.addColorStop(0, rgba("#bfefff", .12)); g.addColorStop(1, rgba("#bfefff", 0));
          bx.fillStyle = g; bx.beginPath(); bx.moveTo(drone.x - 1, dy + 2); bx.lineTo(drone.x + 1, dy + 2); bx.lineTo(drone.x + 7, dy + H * .3); bx.lineTo(drone.x - 7, dy + H * .3); bx.closePath(); bx.fill();
          if (drone.x < -20 || drone.x > W + 20) { drone = null; nextDrone = rnd(7, 14); }
        }
      }
      // relâmpago (tempestade)
      if (effect === "thunderstorm" && !reduced) {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          nextBolt = rnd(4, 9);
          let x = rnd(W * .1, W * .9), y = 0; const pts: [number, number][] = [[x, y]];
          while (y < H * .55) { y += rnd(4, 9); x += rnd(-5, 5); pts.push([x, y]); }
          S.bolt = { pts, life: .22 }; S.flash = Math.max(S.flash, .55); S.flashColor = "#cfe0ff";
        }
        if (S.bolt) {
          S.bolt.life -= dt;
          bx.strokeStyle = rgba("#eaf2ff", Math.min(1, S.bolt.life * 6)); bx.lineWidth = 1;
          bx.beginPath(); S.bolt.pts.forEach(([x, y], i) => (i ? bx.lineTo(x, y) : bx.moveTo(x, y))); bx.stroke();
          if (S.bolt.life <= 0) S.bolt = null;
        }
      }

      // ---------------- frente: sombra dinâmica com furos de luz
      fx.clearRect(0, 0, W, H);
      fx.globalCompositeOperation = "source-over";
      fx.fillStyle = "rgba(3,5,14,.24)"; fx.fillRect(0, 0, W, H);
      fx.globalCompositeOperation = "destination-out";
      const hole = (x: number, y: number, r: number, a: number) => { const g = fx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, a)})`); g.addColorStop(1, "rgba(0,0,0,0)"); fx.fillStyle = g; fx.fillRect(x - r, y - r, r * 2, r * 2); };
      hole(W / 2, H * .45, Math.max(W, H) * .55, .7);
      hole(pp.x, pp.y, pp.s * 2.6, 1); hole(ep.x, ep.y, ep.s * 2.6, 1);
      for (const l of S.lights) hole(l.x, l.y, l.r * 2.4, l.power * (1 - l.life / l.max));
      fx.globalCompositeOperation = "lighter";
      // brilho de contorno de quem age
      if (P.shot) { const p = pos.current[P.shot.side]; drawGlow(fx, p.x, p.y, p.s * 1.3, cols[P.shot.side], P.shot.kind === "power" ? .12 : .06); }
      // luzes de impacto
      for (let i = S.lights.length - 1; i >= 0; i--) {
        const l = S.lights[i]; l.life += dt;
        if (l.life >= l.max) { S.lights.splice(i, 1); continue; }
        const k = 1 - l.life / l.max;
        drawGlow(fx, l.x, l.y, l.r * (1 + (1 - k) * .6), l.color, l.power * k * .3);
        drawGlow(fx, l.x, l.y, l.r * .3, "#ffffff", l.power * k * .18);
      }
      // ondas de choque
      for (let i = S.rings.length - 1; i >= 0; i--) {
        const r = S.rings[i]; r.life += dt; r.r += r.v * dt;
        if (r.life >= r.max) { S.rings.splice(i, 1); continue; }
        fx.strokeStyle = rgba(r.color, (1 - r.life / r.max) * .9); fx.lineWidth = 1;
        fx.beginPath(); fx.ellipse(r.x, r.y, r.r, r.r * .6, 0, 0, Math.PI * 2); fx.stroke();
      }

      // ---------------- partículas (ambiente + combate)
      if (!reduced) {
        spawn += dt * amb.rate * (lite ? .6 : 1) * (W / 240);
        const n = spawn | 0; spawn -= n; spawnAmbient(Math.min(n, 6));
      }
      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i];
        p.life += dt;
        if (p.life >= p.max || p.y > H + 12 || p.x < -30 || p.x > W + 30 || p.y < -14) { S.parts.splice(i, 1); continue; }
        if (amb.kind === "drift" && p.kind === 0) { p.vx += Math.sin(t * 1.3 + i) * dt * 4; p.vy += Math.cos(t * 1.1 + i * .7) * dt * 3; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 1) { p.vx *= 1 - dt * 2.2; p.vy *= 1 - dt * 1.2; }
        const k = p.life / p.max;
        let a = p.alpha * (k < .15 ? k / .15 : 1 - Math.max(0, k - .6) / .4);
        if (amb.kind === "drift" && amb.glow && p.kind === 0) a *= .45 + .55 * Math.max(0, Math.sin(t * 3 + i)); // vaga-lumes piscando
        const ctx = p.front ? fx : bx;
        ctx.globalCompositeOperation = p.glow ? "lighter" : "source-over";
        if (p.kind === 2) { ctx.fillStyle = rgba(p.color, a * (1 - k)); const s = p.size * (1 + k); ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill(); continue; }
        if (amb.kind === "puff" && p.kind === 0) { ctx.fillStyle = rgba(p.color, a); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + k), 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.fillStyle = rgba(p.color, a);
        if (p.kind === 1 || (amb.kind === "rain" || amb.kind === "streak") && p.kind === 0) {
          // rastro: faísca/chuva/meteoro alongados na direção do movimento
          const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(p.kind === 1 ? 4 : 6, sp * .05);
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = p.size;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len); ctx.stroke();
        } else ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
        if (p.glow && p.front && a > .5 && (i & 3) === 0) drawGlow(ctx, p.x, p.y, 3 + p.size * 2, p.color, a * .25);
      }
      // clarão global (golpe pesado, relâmpago, K.O.)
      if (S.flash > 0) {
        fx.globalCompositeOperation = "lighter";
        fx.fillStyle = rgba(S.flashColor, S.flash * .1); fx.fillRect(0, 0, W, H);
        S.flash = Math.max(0, S.flash - dt * 2.4);
      }
      fx.globalCompositeOperation = "source-over"; bx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      acc += now - last; last = now;
      if (acc < stepMs) return;
      const dt = Math.min(.1, acc / 1000); acc = 0; t += dt;
      if ((frame++ & 15) === 0) { resize(); measure(); }
      render(dt);
    };
    resize(); measure();
    if (live.current.reduced) { render(0); const ro = new ResizeObserver(() => { resize(); measure(); render(0); }); ro.observe(fc); return () => ro.disconnect(); }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [props.arena, props.weather, props.reduced]);

  const css = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", imageRendering: "pixelated" } as const;
  return <>
    <canvas ref={back} className="mk-fx-back" aria-hidden style={{ ...css, zIndex: 1 }} />
    <canvas ref={front} className="mk-fx-front" aria-hidden style={{ ...css, zIndex: 3 }} />
  </>;
}

function isLite() {
  return typeof window === "undefined" || !!window.matchMedia?.("(pointer: coarse), (max-width: 900px)").matches;
}
