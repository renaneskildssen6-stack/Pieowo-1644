import { useState } from "react";
import { CORES, CORE_MAP, SLOT_LABEL, draftPower, draftRarity, partLabel, type LabDraft, type Slot } from "@/game/lab";
import { loadPresets, randomName, savePresets, type Presets } from "@/game/lab-tools";

const SLOTS: Slot[] = ["head", "torso", "arm", "leg", "deco"];
const RARITY_COLOR: Record<string, string> = { bronze: "#c98b4b", silver: "#c8d6e5", gold: "#ffb43a" };

/** Etapa final: nome (com gerador), projetos salvos, resumo, custo e botão de construir. */
export function LabFinal({ draft, setDraft, goStep, onBuild, canBuild, cost, gold, bars, full, onLoad }: {
  draft: LabDraft;
  setDraft: (fn: (d: LabDraft) => LabDraft) => void;
  goStep: (s: Slot | "core") => void;
  onBuild: () => void;
  canBuild: boolean;
  cost: { gold: number; bars: number };
  gold: number;
  bars: number;
  full: boolean;
  onLoad: (d: LabDraft) => void;
}) {
  const [presets, setPresets] = useState<Presets>(() => loadPresets());
  const [spin, setSpin] = useState(0);
  const [saved, setSaved] = useState(-1);
  const core = CORE_MAP[draft.core] ?? CORES[0];
  const put = (p: Presets) => { setPresets(p); savePresets(p); };
  const save = (i: number) => {
    const p = presets.slice(); p[i] = { ...draft, name: draft.name || `PROJETO ${i + 1}` }; put(p);
    setSaved(i); window.setTimeout(() => setSaved(-1), 900);
  };
  const lackG = Math.max(0, cost.gold - gold), lackB = Math.max(0, cost.bars - bars);

  return <div className="lab-final">
    <label className="mk-title" htmlFor="lab-name">NOME DO CHASSI</label>
    <div className="lab-name-row">
      <input id="lab-name" className="mk-title" value={draft.name} maxLength={14} placeholder="PROTOTIPO"
        onChange={(e) => { const name = e.target.value.slice(0, 14); setDraft((d) => ({ ...d, name })); }} />
      <button type="button" className="mk-btn lab-dice" aria-label="Gerar nome" title="Gerar nome"
        onClick={() => { setSpin((n) => n + 1); setDraft((d) => ({ ...d, name: randomName(d.core) })); }}>
        <span key={spin}>⚄</span>
      </button>
    </div>

    <div className="lab-summary mk-title">
      {SLOTS.map((s, i) => {
        const url = s === "deco" ? draft.deco : draft[s];
        return <button key={s} type="button" style={{ ["--i" as string]: i }} onClick={() => goStep(s)}>
          {url ? <img src={url} alt="" style={{ filter: `hue-rotate(${draft.hue}deg)` }} /> : <span className="lab-none-s">∅</span>}
          <span>{SLOT_LABEL[s]}</span><b>{url ? partLabel(s, url as string).replace(/^[A-Z]+ /, "") : "—"}</b>
        </button>;
      })}
      <button type="button" style={{ ["--i" as string]: 5 }} onClick={() => goStep("core")}><span className="lab-none-s">◆</span><span>NÚCLEO</span><b>{core.element}</b></button>
    </div>

    <div className="lab-presets">
      <span className="mk-title">PROJETOS SALVOS</span>
      <div>
        {presets.map((p, i) => p ? (
          <div key={i} className={`lab-preset${saved === i ? " is-saved" : ""}`} style={{ ["--r" as string]: RARITY_COLOR[draftRarity(p)] }}>
            <button type="button" className="mk-title" onClick={() => onLoad(p)} title="Carregar projeto">
              <img src={p.head} alt="" style={{ filter: `hue-rotate(${p.hue}deg)` }} />
              <b>{p.name}</b><small>POT {draftPower(p)}</small>
            </button>
            <button type="button" className="lab-preset-x" aria-label="Sobrescrever" title="Salvar por cima" onClick={() => save(i)}>⤓</button>
            <button type="button" className="lab-preset-x" aria-label="Apagar" title="Apagar" onClick={() => { const n = presets.slice(); n[i] = null; put(n); }}>×</button>
          </div>
        ) : (
          <button key={i} type="button" className="lab-preset is-empty mk-title" onClick={() => save(i)}>+ SALVAR</button>
        ))}
      </div>
    </div>

    <div className="mk-title lab-cost">
      <span className={lackG ? "is-lack" : "is-ok"}><img src="/ui/icon_coins.png" alt="" />{cost.gold}{lackG > 0 && <small>FALTA {lackG}</small>}</span>
      <span className={lackB ? "is-lack" : "is-ok"}>{cost.bars} LINGOTES <small>({bars})</small></span>
    </div>
    <button type="button" className={`mk-btn lab-build${canBuild ? " is-ready" : ""}`} onClick={onBuild} disabled={!canBuild}>
      {full ? "LABORATÓRIO CHEIO" : canBuild ? "▶ CONSTRUIR ROBÔ" : "RECURSOS INSUFICIENTES"}
    </button>
    <small className="mk-title lab-hint">LINGOTES SAEM DA REFINARIA DA MINA PROFUNDA. PROJETOS FICAM SALVOS NESTE APARELHO.</small>
  </div>;
}
