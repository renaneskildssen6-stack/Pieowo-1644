import { useEffect, useMemo, useState } from "react";
import { RobotSprite } from "@/components/pixel";
import { CORES, CORE_MAP, LAB_MAX, draftPower, draftRarity, draftRatios, scrapValue, toDraft, type CustomRobot, type LabDraft } from "@/game/lab";
import { draftSynergy } from "@/game/lab-synergy";
import { scrapCustom, useGame } from "@/game/save";
import { SynergyChips } from "@/screens/lab-fx";
import { RARITY_COLOR, RARITY_LABEL } from "@/screens/lab-bench";

const STATS: ["hp" | "mp" | "str" | "def" | "ag", string, string][] = [
  ["hp", "HP", "#57d76a"], ["mp", "MP", "#c07bff"], ["str", "FOR", "#ff7a3a"], ["def", "DEF", "#5fb4ff"], ["ag", "AGI", "#5dff8f"],
];

function Card({ c, i, lvl, fresh, onEdit, onScrap }: { c: CustomRobot; i: number; lvl: number; fresh: boolean; onEdit: () => void; onScrap: () => void }) {
  const [arm, setArm] = useState(false);
  const [clip, setClip] = useState<"idle" | "attack">("idle");
  useEffect(() => { if (!arm) return; const t = window.setTimeout(() => setArm(false), 2600); return () => window.clearTimeout(t); }, [arm]);
  useEffect(() => { if (clip === "idle") return; const t = window.setTimeout(() => setClip("idle"), 900); return () => window.clearTimeout(t); }, [clip]);
  const d = toDraft(c);
  const r = draftRatios(d);
  const rar = draftRarity(d);
  const syn = draftSynergy(d);
  const core = CORE_MAP[c.core] ?? CORES[0];
  return <div className={`lab-card is-${rar}${fresh ? " is-fresh" : ""}`} style={{ ["--i" as string]: i, ["--rc" as string]: RARITY_COLOR[rar] }}>
    <button type="button" className="lab-card-bot" onClick={() => setClip("attack")} aria-label={`Testar ${c.name}`}>
      <span className="lab-card-aura" aria-hidden />
      <RobotSprite key={clip} robotId={c.id} clip={clip} size={84} fps={clip === "idle" ? 4 : 8} loop={clip === "idle"} />
      <span className="lab-card-lv mk-title">NV {lvl}</span>
    </button>
    <div className="lab-card-info">
      <div className="lab-card-top">
        <b className="mk-title">{c.name}</b>
        <span className="mk-title lab-card-rar">{RARITY_LABEL[rar]}</span>
      </div>
      <span className="mk-title lab-card-el">◆ {core.element} · POT {draftPower(d)}</span>
      <div className="lab-card-stats">
        {STATS.map(([k, l, col]) => <div key={k} style={{ ["--sc" as string]: col }}>
          <span className="mk-title">{l}</span><i><b style={{ width: `${Math.max(0, Math.min(1, (r[k] - 60) / 85)) * 100}%` }} /></i><span className="mk-title">{r[k]}</span>
        </div>)}
      </div>
      <SynergyChips syn={syn} compact />
      <div className="lab-card-act">
        <button type="button" className="mk-btn mk-title" onClick={onEdit}>⧉ COPIAR P/ BANCADA</button>
        <button type="button" className={`mk-btn mk-title lab-scrap${arm ? " is-arm" : ""}`} onClick={() => (arm ? onScrap() : setArm(true))}>
          {arm ? "CONFIRMAR?" : `DESMONTAR +${scrapValue(c)}`}
        </button>
      </div>
    </div>
  </div>;
}

/** Hangar de protótipos: cards com pedestal, stats, conjuntos, cópia para a bancada e desmonte em 2 toques. */
export function LabHangar({ fresh, onEdit, onEmpty }: { fresh: string | null; onEdit: (d: LabDraft) => void; onEmpty: () => void }) {
  const g = useGame();
  const [sort, setSort] = useState<"new" | "pow">("new");
  const [msg, setMsg] = useState("");
  const list = useMemo(() => {
    const l = g.customs.slice();
    return sort === "pow" ? l.sort((a, b) => draftPower(toDraft(b)) - draftPower(toDraft(a))) : l.sort((a, b) => b.createdAt - a.createdAt);
  }, [g.customs, sort]);

  return <div className="mk-scroll lab-hangar" style={{ flex: 1 }}>
    <div className="lab-cap">
      <span className="mk-title">VAGAS {g.customs.length}/{LAB_MAX}</span>
      <span className="lab-cap-pips" aria-hidden>{Array.from({ length: LAB_MAX }, (_, i) => <i key={i} className={i < g.customs.length ? "is-on" : ""} style={{ ["--i" as string]: i }} />)}</span>
      <div className="lab-chips">
        <button type="button" className="mk-title" aria-pressed={sort === "new"} onClick={() => setSort("new")}>RECENTES</button>
        <button type="button" className="mk-title" aria-pressed={sort === "pow"} onClick={() => setSort("pow")}>POTÊNCIA</button>
      </div>
    </div>
    {msg && <div key={msg} className="mk-title lab-msg is-pop">{msg}</div>}
    {list.length === 0 && <div className="lab-empty">
      <div className="lab-empty-holo" aria-hidden>?</div>
      <span className="mk-title">NENHUM PROTÓTIPO AINDA.</span>
      <button type="button" className="mk-btn mk-title" onClick={onEmpty}>IR PARA A BANCADA ▶</button>
    </div>}
    <div className="lab-cards">
      {list.map((c, i) => <Card key={c.id} c={c} i={i} fresh={c.id === fresh} lvl={g.robots.find((x) => x.id === c.id)?.level ?? 1}
        onEdit={() => onEdit({ ...toDraft(c), name: `${c.name}`.slice(0, 12) + " 2" })}
        onScrap={() => { const got = scrapCustom(c.id); setMsg(`${c.name} DESMONTADO · +${got} OURO`); }} />)}
    </div>
  </div>;
}
