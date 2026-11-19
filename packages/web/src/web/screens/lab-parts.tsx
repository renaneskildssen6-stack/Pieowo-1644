import { useMemo, useState } from "react";
import { partLabel, partStats, type LabDraft, type Slot } from "@/game/lab";
import { FAMILIES, partFamily } from "@/game/lab-synergy";
import { GRADE_COLOR, SORTS, partGrade, sortParts, type SortKey } from "@/game/lab-tools";

const FOCUS: Record<Slot, ["str" | "def" | "ag" | "hp" | "mp", string]> = {
  head: ["mp", "MP"], torso: ["def", "DEF"], arm: ["str", "FOR"], leg: ["ag", "AGI"], deco: ["str", "FOR"],
};

/** Grade de peças com ordenação, filtro de família, nota e brilho de raridade. */
export function PartPicker({ slot, draft, onPick, onHover }: {
  slot: Slot;
  draft: LabDraft;
  onPick: (url: string | null) => void;
  onHover: (d: LabDraft | null) => void;
}) {
  const [sort, setSort] = useState<SortKey>("base");
  const [fam, setFam] = useState("all");
  const list = useMemo(() => sortParts(slot, sort, fam), [slot, sort, fam]);
  const cur = slot === "deco" ? draft.deco : draft[slot];
  const curFam = slot !== "deco" && cur ? partFamily(cur) : null;
  const [fk, fl] = sort !== "base" && sort !== "grade" ? [sort, SORTS.find((s) => s.id === sort)!.label] : FOCUS[slot];

  return <>
    <div className="lab-tools">
      <div className="lab-chips" role="radiogroup" aria-label="Ordenar">
        {SORTS.map((s) => <button key={s.id} type="button" className="mk-title" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>)}
      </div>
      {slot !== "deco" && <div className="lab-chips is-fam" role="radiogroup" aria-label="Família">
        <button type="button" className="mk-title" aria-pressed={fam === "all"} onClick={() => setFam("all")}>TODAS</button>
        {FAMILIES.map((f) => <button key={f.id} type="button" className="mk-title" style={{ ["--c" as string]: f.color }} aria-pressed={fam === f.id} onClick={() => setFam(f.id)}><i />{f.name}</button>)}
      </div>}
    </div>
    <div className="lab-parts" key={`${slot}-${sort}-${fam}`}>
      {slot === "deco" && fam === "all" && (
        <button type="button" className="lab-part" style={{ ["--i" as string]: 0 }} aria-pressed={draft.deco === null} onClick={() => onPick(null)}
          onPointerEnter={() => onHover({ ...draft, deco: null })} onPointerLeave={() => onHover(null)}>
          <span className="lab-none">∅</span><small className="mk-title">NENHUM</small>
        </button>
      )}
      {list.map((url, i) => {
        const st = partStats(slot, url);
        const g = partGrade(slot, url);
        const f = partFamily(url);
        const on = cur === url;
        const match = slot !== "deco" && curFam && !on && f.id === curFam.id;
        return (
          <button key={url} type="button" className={`lab-part is-g${g}${match ? " is-match" : ""}`} aria-pressed={on}
            style={{ ["--i" as string]: i + 1, ["--g" as string]: GRADE_COLOR[g], ["--c" as string]: f.color }}
            onClick={() => onPick(url)}
            onPointerEnter={() => onHover({ ...draft, [slot]: url } as LabDraft)} onPointerLeave={() => onHover(null)}>
            <b className="lab-grade mk-title">{g}</b>
            {slot !== "deco" && <i className="lab-fam" title={f.name} />}
            <img src={url} alt="" draggable={false} style={{ filter: `hue-rotate(${draft.hue}deg)` }} />
            <small className="mk-title">{partLabel(slot, url).replace(/^[A-Z]+ /, "")}</small>
            <em className="mk-title"><span>{fl} {st[fk]}</span></em>
            <span className="lab-mini" aria-hidden>
              <i style={{ width: `${Math.min(100, st.str * 6)}%`, background: "#ff7a3a" }} />
              <i style={{ width: `${Math.min(100, st.def * 6)}%`, background: "#5fb4ff" }} />
              <i style={{ width: `${Math.min(100, st.ag * 6)}%`, background: "#5dff8f" }} />
            </span>
          </button>
        );
      })}
      {!list.length && <div className="mk-title lab-hint" style={{ gridColumn: "1/-1", textAlign: "center", padding: 12 }}>NENHUMA PEÇA DESTA FAMÍLIA</div>}
    </div>
  </>;
}
