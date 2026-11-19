import { useEffect, useRef } from "react";
import { RobotSprite } from "@/components/pixel";
import { CORES, CORE_MAP, draftPower, draftRarity, draftRatios, type LabDraft } from "@/game/lab";
import { draftSynergy } from "@/game/lab-synergy";
import { CountUp, SynergyChips } from "@/screens/lab-fx";
import { RARITY_COLOR, RARITY_LABEL } from "@/screens/lab-bench";

const STATS: ["hp" | "mp" | "str" | "def" | "ag", string, string][] = [
  ["hp", "HP", "#57d76a"], ["mp", "MP", "#c07bff"], ["str", "FOR", "#ff7a3a"], ["def", "DEF", "#5fb4ff"], ["ag", "AGI", "#5dff8f"],
];

/** Cerimônia de construção: projeto azul → silhueta → flash → revelação com raridade, potência e stats. */
export function LabCeremony({ id, draft, onClose }: { id: string; draft: LabDraft; onClose: () => void }) {
  const rar = draftRarity(draft);
  const rc = RARITY_COLOR[rar];
  const r = draftRatios(draft);
  const syn = draftSynergy(draft);
  const core = CORE_MAP[draft.core] ?? CORES[0];
  useEffect(() => {
    const t0 = Date.now();
    const key = (e: KeyboardEvent) => { if (Date.now() - t0 > 900 && ["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const opened = useRef(Date.now());

  return <div className={`lab-cer is-${rar}`} style={{ ["--rc" as string]: rc }} role="dialog" aria-label="Robô construído"
    onPointerDown={() => { if (Date.now() - opened.current > 1600) onClose(); }}>
    <div className="lab-cer-grid" aria-hidden />
    <div className="lab-cer-rays" aria-hidden />
    <div className="lab-cer-flash" aria-hidden />
    <span className="mk-title lab-cer-kick">PROTÓTIPO CONCLUÍDO</span>
    <div className="lab-cer-bot">
      <div className="lab-cer-sil"><RobotSprite robotId={id} clip="enter" size={176} fps={8} loop={false} /></div>
      <div className="lab-cer-plate" aria-hidden />
      <div className="lab-cer-sparks" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * (360 / 14)}deg` }} />)}</div>
    </div>
    <b className="mk-title lab-cer-rar">{RARITY_LABEL[rar]}</b>
    <b className="mk-title lab-cer-name">{(draft.name || "PROTOTIPO").toUpperCase()}</b>
    <span className="mk-title lab-cer-el">◆ {core.element} · POT <CountUp value={draftPower(draft)} ms={1200} from={0} /></span>
    <div className="lab-cer-stats">
      {STATS.map(([k, l, c], i) => <div key={k} style={{ ["--i" as string]: i, ["--sc" as string]: c }}>
        <span className="mk-title">{l}</span>
        <span className="lab-cer-bar"><i style={{ width: `${Math.max(0, Math.min(1, (r[k] - 60) / 85)) * 100}%` }} /></span>
        <span className="mk-title">{r[k]}</span>
      </div>)}
    </div>
    <div className="lab-cer-syn"><SynergyChips syn={syn} compact /></div>
    <em className="mk-title lab-cer-tap">TOQUE PARA CONTINUAR</em>
  </div>;
}
