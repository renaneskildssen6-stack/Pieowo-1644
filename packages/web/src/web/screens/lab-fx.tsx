import { useEffect, useRef, useState } from "react";
import { bonusText, type SynergyInfo } from "@/game/lab-synergy";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Número que corre até o alvo (ease-out). */
export function useCountUp(target: number, ms = 520, from?: number): number {
  const [v, setV] = useState(from ?? target);
  const cur = useRef(from ?? target);
  useEffect(() => {
    if (reduced()) { cur.current = target; setV(target); return; }
    const start = cur.current, t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const n = Math.round(start + (target - start) * e);
      cur.current = n; setV(n);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function CountUp({ value, ms, from }: { value: number; ms?: number; from?: number }) {
  return <>{useCountUp(value, ms, from)}</>;
}

type R = { hp: number; mp: number; str: number; def: number; ag: number };
const AX: (keyof R)[] = ["hp", "str", "ag", "mp", "def"];
const AX_L = ["HP", "FOR", "AGI", "MP", "DEF"];

function pts(r: R, rad: number, c: number): string {
  return AX.map((k, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / AX.length;
    const v = Math.max(0.08, Math.min(1, (r[k] - 60) / 85));
    return `${(c + Math.cos(a) * rad * v).toFixed(1)},${(c + Math.sin(a) * rad * v).toFixed(1)}`;
  }).join(" ");
}

/** Radar pentagonal dos 5 atributos; `cmp` desenha o fantasma da comparação. */
export function StatRadar({ r, cmp, size = 92, color = "#35e2f0" }: { r: R; cmp?: R | null; size?: number; color?: string }) {
  const c = size / 2, rad = c - 12;
  const ring = (k: number) => AX.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / AX.length;
    return `${(c + Math.cos(a) * rad * k).toFixed(1)},${(c + Math.sin(a) * rad * k).toFixed(1)}`;
  }).join(" ");
  return <svg className="lab-radar" width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden>
    {[1, 0.66, 0.33].map((k) => <polygon key={k} points={ring(k)} fill="none" stroke="rgba(125,148,173,.28)" strokeWidth="1" />)}
    {cmp && <polygon className="lab-radar-cmp" points={pts(cmp, rad, c)} fill="rgba(255,255,255,.12)" stroke="#fff" strokeDasharray="2 2" strokeWidth="1" />}
    <polygon className="lab-radar-shape" points={pts(r, rad, c)} fill={`${color}44`} stroke={color} strokeWidth="1.5" />
    {AX_L.map((l, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / AX.length;
      return <text key={l} x={c + Math.cos(a) * (rad + 7)} y={c + Math.sin(a) * (rad + 7) + 2} textAnchor="middle" fontSize="5" fill="#7d94ad" fontFamily="'Press Start 2P',monospace">{l}</text>;
    })}
  </svg>;
}

/** Chips de conjunto ativo (2/3/4 peças) + PROJETO ORIGINAL. */
export function SynergyChips({ syn, compact }: { syn: SynergyInfo; compact?: boolean }) {
  if (!syn.sets.length && !syn.original) return compact ? null : <div className="lab-syn is-empty mk-title">SEM CONJUNTO · COMBINE 2+ PEÇAS DA MESMA FAMÍLIA</div>;
  return <div className={`lab-syn${compact ? " is-compact" : ""}`}>
    {syn.sets.map((s) => <span key={s.fam.id} className="mk-title" style={{ ["--c" as string]: s.fam.color }}>
      <i>{s.count}</i>{s.fam.name}{!compact && <em>{bonusText(s.bonus)}</em>}
    </span>)}
    {syn.original && <span className="mk-title is-orig" style={{ ["--c" as string]: "#ffd23c" }}><i>★</i>ORIGINAL{!compact && <em>+3 TUDO</em>}</span>}
  </div>;
}
