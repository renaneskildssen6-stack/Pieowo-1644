import { useEffect, useState } from "react";
import { LAB_MAX, buildCost, type LabDraft } from "@/game/lab";
import { loadDraft, saveDraft } from "@/game/lab-tools";
import { buildCustom, totalBars, useGame } from "@/game/save";
import { TopBar } from "@/screens/roster";
import { LabBench } from "@/screens/lab-bench";
import { LabHangar } from "@/screens/lab-hangar";
import { LabCeremony } from "@/screens/lab-ceremony";

/** Fase F — laboratório de construção de robôs. */
export function LabScreen({ onBack }: { onBack: () => void }) {
  const g = useGame();
  const [tab, setTab] = useState<"montar" | "hangar">("montar");
  const [draft, setDraft] = useState<LabDraft>(() => loadDraft());
  const [msg, setMsg] = useState("");
  const [built, setBuilt] = useState<{ id: string; draft: LabDraft } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  // Rascunho persiste entre aberturas (chave própria, não mexe no save).
  useEffect(() => { const t = window.setTimeout(() => saveDraft(draft), 250); return () => window.clearTimeout(t); }, [draft]);
  useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(""), 2600); return () => window.clearTimeout(t); }, [msg]);

  const cost = buildCost(draft);
  const bars = totalBars(g);
  const full = g.customs.length >= LAB_MAX;
  const canBuild = !full && g.gold >= cost.gold && bars >= cost.bars;

  function doBuild() {
    const id = buildCustom(draft);
    if (!id) { setMsg(full ? "LABORATORIO CHEIO" : "RECURSOS INSUFICIENTES"); return; }
    setBuilt({ id, draft: { ...draft } });
  }
  function closeCeremony() {
    if (!built) return;
    setFresh(built.id);
    setDraft((d) => ({ ...d, name: "" }));
    setBuilt(null);
    setTab("hangar");
  }

  const TABS = [
    { id: "montar", label: "BANCADA", icon: "⚙" },
    { id: "hangar", label: `PROTÓTIPOS ${g.customs.length}/${LAB_MAX}`, icon: "▣" },
  ] as const;

  return (
    <div className="lab-root" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <TopBar title="LABORATORIO" gold={g.gold} onBack={onBack} />
      <div className="lab-tabs" role="tablist" style={{ ["--t" as string]: tab === "montar" ? 0 : 1 }}>
        <span className="lab-tabs-ink" aria-hidden />
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className="mk-title" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            <i>{t.icon}</i>{t.label}
          </button>
        ))}
      </div>
      <div className="lab-view" key={tab}>
        {tab === "montar"
          ? <LabBench draft={draft} setDraft={setDraft} onBuild={doBuild} canBuild={canBuild} cost={cost} gold={g.gold} bars={bars} full={full} msg={msg} />
          : <LabHangar fresh={fresh} onEmpty={() => setTab("montar")} onEdit={(d) => { setDraft(d); setTab("montar"); setMsg("PROJETO COPIADO PARA A BANCADA"); }} />}
      </div>
      {built && <LabCeremony id={built.id} draft={built.draft} onClose={closeCeremony} />}
    </div>
  );
}
