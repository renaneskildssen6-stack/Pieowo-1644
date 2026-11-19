import "./lab.css";
import "./lab2.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { RobotSprite } from "@/components/pixel";
import { preloadParts, setCustomSet } from "@/game/compose";
import {
  CORES, CORE_MAP, LAB_HUES, SLOT_LABEL, SLOT_OPTIONS,
  draftPower, draftRarity, draftRatios, partLabel, partSetOf,
  type LabDraft, type Slot,
} from "@/game/lab";
import { draftSynergy } from "@/game/lab-synergy";
import { CountUp, StatRadar, SynergyChips } from "@/screens/lab-fx";
import { PartPicker } from "@/screens/lab-parts";
import { LabFinal } from "@/screens/lab-final";
import { randomName } from "@/game/lab-tools";

export const PREVIEW_ID = "lab_preview";
const SLOTS: Slot[] = ["head", "torso", "arm", "leg", "deco"];
type Step = Slot | "paint" | "core" | "name";
const STEPS: { id: Step; label: string }[] = [
  { id: "head", label: "CABEÇA" }, { id: "torso", label: "TORSO" }, { id: "arm", label: "BRAÇOS" },
  { id: "leg", label: "PERNAS" }, { id: "deco", label: "MÓDULO" }, { id: "paint", label: "PINTURA" },
  { id: "core", label: "NÚCLEO" }, { id: "name", label: "FINAL" },
];
/** Altura (px a partir do chão da vitrine) onde cada peça encaixa. */
const SNAP_Y: Record<Step, number> = { head: 150, torso: 108, arm: 100, leg: 54, deco: 126, paint: 100, core: 104, name: 100 };
export const RARITY_COLOR: Record<string, string> = { bronze: "#c98b4b", silver: "#c8d6e5", gold: "#ffb43a" };
export const RARITY_LABEL: Record<string, string> = { bronze: "BRONZE", silver: "PRATA", gold: "OURO" };
const STAT_NAMES: [keyof ReturnType<typeof draftRatios>, string, string][] = [
  ["hp", "HP", "#57d76a"], ["mp", "MP", "#c07bff"], ["str", "FOR", "#ff7a3a"], ["def", "DEF", "#5fb4ff"], ["ag", "AGI", "#5dff8f"],
];
type PreviewClip = "idle" | "attack" | "damage" | "guard" | "enter";
const CLIPS: { id: PreviewClip; label: string }[] = [
  { id: "idle", label: "POSE" }, { id: "attack", label: "ATAQUE" }, { id: "guard", label: "GUARDA" }, { id: "enter", label: "ENTRADA" },
];
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const pct = (v: number) => Math.max(0, Math.min(1, (v - 60) / 85)) * 100;

export function LabBench({ draft, setDraft, onBuild, canBuild, cost, gold, bars, full, msg }: {
  draft: LabDraft;
  setDraft: (fn: (d: LabDraft) => LabDraft) => void;
  onBuild: () => void;
  canBuild: boolean;
  cost: { gold: number; bars: number };
  gold: number;
  bars: number;
  full: boolean;
  msg: string;
}) {
  const [step, setStep] = useState<Step>("head");
  const [rev, setRev] = useState(0);
  const [clip, setClip] = useState<PreviewClip>("idle");
  const [snap, setSnap] = useState<{ key: number; slot: Step; url: string | null } | null>(null);
  const [hover, setHover] = useState<LabDraft | null>(null);
  const [delta, setDelta] = useState<{ key: number; from: ReturnType<typeof draftRatios> } | null>(null);
  const [scan, setScan] = useState(0);
  const snapKey = useRef(0);

  useEffect(() => {
    let alive = true;
    void preloadParts().then(() => { if (alive) { setCustomSet(PREVIEW_ID, partSetOf(draft)); setRev((n) => n + 1); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setCustomSet(PREVIEW_ID, partSetOf(draft)); setRev((n) => n + 1); }, [draft]);
  useEffect(() => {
    if (clip === "idle") return;
    const id = window.setTimeout(() => setClip("idle"), 900);
    return () => window.clearTimeout(id);
  }, [clip, rev]);
  useEffect(() => {
    if (!delta) return;
    const id = window.setTimeout(() => setDelta(null), 1700);
    return () => window.clearTimeout(id);
  }, [delta]);

  const ratios = useMemo(() => draftRatios(draft), [draft]);
  const syn = useMemo(() => draftSynergy(draft), [draft]);
  const cmp = useMemo(() => (hover ? draftRatios(hover) : null), [hover]);
  const power = draftPower(draft);
  const hoverPower = hover ? draftPower(hover) : null;
  const rarity = draftRarity(draft);
  const core = CORE_MAP[draft.core] ?? CORES[0];
  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const rc = RARITY_COLOR[rarity];

  const apply = (fn: (d: LabDraft) => LabDraft, slot: Step, url: string | null = null) => {
    setDelta({ key: Date.now(), from: ratios });
    setDraft(fn);
    setHover(null);
    snapKey.current += 1;
    setSnap({ key: snapKey.current, slot, url });
    setClip("enter");
  };
  const choose = (slot: Slot, url: string | null) => apply((d) => ({ ...d, [slot]: url }) as LabDraft, slot, url);
  const randomize = () => {
    setScan((n) => n + 1);
    apply((d) => {
      const core = pick(CORES).id;
      return {
        ...d, head: pick(SLOT_OPTIONS.head), torso: pick(SLOT_OPTIONS.torso), arm: pick(SLOT_OPTIONS.arm), leg: pick(SLOT_OPTIONS.leg),
        deco: Math.random() < 0.25 ? null : pick(SLOT_OPTIONS.deco), hue: pick(LAB_HUES).hue, core, name: d.name || randomName(core),
      };
    }, "name");
  };
  const isSlot = (s: Step): s is Slot => (SLOTS as string[]).includes(s);
  // Comparação: hover (desktop) ou a última troca (toque) por ~1.7s.
  const base = hover ? ratios : delta ? delta.from : ratios;
  const next = hover ? cmp! : ratios;

  return (
    <div className="mk-scroll lab-bench" style={{ flex: 1 }}>
      {/* ---------------------------------------------------- vitrine */}
      <div className={`lab-stage is-${rarity}`} style={{ ["--rc" as string]: rc }}>
        <div className="lab-grid-floor" aria-hidden />
        <div className="lab-aura" aria-hidden />
        <div className="lab-beam" aria-hidden />
        <div className="lab-rings" aria-hidden><i /><i /></div>
        <div key={`scan${scan}`} className="lab-scan" aria-hidden />
        {snap && <div key={snap.key} className="lab-snap" style={{ ["--y" as string]: `${SNAP_Y[snap.slot]}px` }} aria-hidden>
          {snap.url && <img className="lab-fly" src={snap.url} alt="" style={{ filter: `hue-rotate(${draft.hue}deg)` }} />}
          <span className="lab-weld"><i /><i /><i /><i /><i /><i /><i /><i /></span>
          <span className="lab-ring-pulse" />
        </div>}
        <div key={snap?.key ?? 0} className={`lab-robot${snap?.url ? " is-snap" : ""}`}>
          <RobotSprite key={`${rev}-${clip}`} robotId={PREVIEW_ID} clip={clip} size={168} fps={clip === "idle" ? 5 : 8} loop={clip === "idle"} />
        </div>
        <div className="lab-plate" aria-hidden />
        <div className="lab-pow">
          <span className="mk-title lab-rar" style={{ color: rc }}>{RARITY_LABEL[rarity]}</span>
          <b className="mk-title"><small>POT</small><CountUp value={power} /></b>
          {hoverPower !== null && hoverPower !== power && <em className={`mk-title ${hoverPower > power ? "is-up" : "is-down"}`}>{hoverPower > power ? "▲" : "▼"}{Math.abs(hoverPower - power)}</em>}
          <span className="lab-pow-bar" aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, ((power - 400) / 180) * 100))}%` }} /><s style={{ left: "44.4%" }} /><s style={{ left: "77.7%" }} /></span>
        </div>
        <span className="mk-title lab-tag is-right" style={{ color: "var(--mk-accent2)" }}>◆ {core.element}</span>
        <div className="lab-syn-stage"><SynergyChips syn={syn} compact /></div>
        <div className="lab-clips">
          {CLIPS.map((c) => <button key={c.id} type="button" className="mk-title" aria-pressed={clip === c.id} onClick={() => setClip(c.id)}>{c.label}</button>)}
        </div>
      </div>

      {/* ------------------------------------------------------- stats */}
      <div className="lab-stats2">
        <StatRadar r={ratios} cmp={hover ? cmp : delta ? delta.from : null} color={rc} />
        <div className="lab-stats">
          {STAT_NAMES.map(([k, label, col]) => {
            const v = base[k], n = next[k], d = n - v;
            return (
              <div key={k} className="lab-stat" style={{ ["--sc" as string]: col }}>
                <span className="mk-title">{label}</span>
                <div className="lab-bar">
                  <i style={{ width: `${pct(Math.min(v, n))}%` }} />
                  {d !== 0 && <b key={delta?.key} className={d > 0 ? "is-up" : "is-down"} style={{ left: `${pct(Math.min(v, n))}%`, width: `${pct(Math.max(v, n)) - pct(Math.min(v, n))}%` }} />}
                </div>
                <span className="mk-title lab-num"><CountUp value={n} ms={380} />{d !== 0 && <em key={delta?.key} className={d > 0 ? "is-up" : "is-down"}>{d > 0 ? `+${d}` : d}</em>}</span>
              </div>
            );
          })}
        </div>
      </div>
      <SynergyChips syn={syn} />

      {/* ------------------------------------------------------ passos */}
      <div className="lab-steps-wrap">
        <div className="lab-steps" role="tablist">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" role="tab" className="mk-title" aria-selected={step === s.id} data-done={i < stepIdx || undefined} onClick={() => setStep(s.id)}>
              <small>{i < stepIdx ? "✓" : i + 1}</small>{s.label}
            </button>
          ))}
        </div>
        <span className="lab-steps-prog" aria-hidden><i style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} /></span>
      </div>

      <div className="lab-panel" key={step}>
        {isSlot(step) && (
          <>
            <div className="mk-title lab-panel-head">
              <span>{SLOT_LABEL[step]}</span>
              <span className="lab-current">{(step === "deco" ? draft.deco : draft[step]) ? partLabel(step, (step === "deco" ? draft.deco : draft[step]) as string) : "SEM MÓDULO"}</span>
            </div>
            <PartPicker slot={step} draft={draft} onPick={(u) => choose(step, u)} onHover={setHover} />
          </>
        )}
        {step === "paint" && (
          <>
            <div className="mk-title lab-panel-head"><span>PINTURA</span><span className="lab-current">{LAB_HUES.find((h) => h.hue === draft.hue)?.name ?? `${draft.hue}°`}</span></div>
            <div className="lab-swatches">
              {LAB_HUES.map((h, i) => (
                <button key={h.hue} type="button" className="lab-swatch" style={{ ["--i" as string]: i, ["--h" as string]: `${h.hue}deg` }} aria-pressed={draft.hue === h.hue} onClick={() => apply((d) => ({ ...d, hue: h.hue }), "paint")}>
                  <img src={draft.torso} alt="" style={{ filter: `hue-rotate(${h.hue}deg)` }} />
                  <small className="mk-title">{h.name}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {step === "core" && (
          <div className="lab-cores">
            {CORES.map((c, i) => (
              <button key={c.id} type="button" className="lab-core" style={{ ["--i" as string]: i }} aria-pressed={draft.core === c.id} onClick={() => apply((d) => ({ ...d, core: c.id }), "core")}
                onPointerEnter={() => setHover({ ...draft, core: c.id })} onPointerLeave={() => setHover(null)}>
                <b className="mk-title">◆ {c.element}</b>
                <small>{c.desc}</small>
                <em className="mk-title">{Object.entries(c.bonus).map(([k, v]) => `${(v ?? 0) > 0 ? "+" : ""}${v} ${({ hp: "HP", mp: "MP", str: "FOR", def: "DEF", ag: "AGI" } as Record<string, string>)[k]}`).join(" ")}</em>
              </button>
            ))}
          </div>
        )}
        {step === "name" && (
          <LabFinal draft={draft} setDraft={setDraft} goStep={(s) => setStep(s)} onBuild={onBuild} canBuild={canBuild} cost={cost} gold={gold} bars={bars} full={full}
            onLoad={(p) => apply(() => ({ ...p }), "name")} />
        )}
        {msg && <div className="mk-title lab-msg">{msg}</div>}
      </div>

      <div className="lab-nav">
        <button type="button" className="mk-btn mk-title" disabled={stepIdx === 0} onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)].id)}>◀ VOLTAR</button>
        <button type="button" className="mk-btn mk-title lab-rand" onClick={randomize}>⚄ ALEATÓRIO</button>
        <button type="button" className="mk-btn mk-title" disabled={stepIdx === STEPS.length - 1} onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIdx + 1)].id)}>PRÓXIMO ▶</button>
      </div>
    </div>
  );
}
