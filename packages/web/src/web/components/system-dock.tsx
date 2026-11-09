import { useEffect, useMemo, useState } from "react";
import type { Screen } from "@/screens/menu";
import { useGame } from "@/game/save";
import { systemUnlocked, UNLOCK_LEVEL } from "@/game/progression";
import { SYSTEM_GUIDES } from "@/game/system-guides";
import "./system-dock.css";

type Sys = Exclude<Screen, "menu">;
type Group = { id: string; label: string; tag: string; tone: string; items: Sys[] };

const GROUPS: Group[] = [
  { id: "jornada", label: "JORNADA", tag: "HISTÓRIA E COMBATE", tone: "#ffb21a", items: ["story", "modes", "tournaments", "ranked", "online", "pantheon"] },
  { id: "equipe", label: "EQUIPE", tag: "HANGAR E SUPORTE", tone: "#35e2f0", items: ["roster", "engineer", "lab", "drones", "pets", "cards"] },
  { id: "cidade", label: "CIDADE", tag: "DISTRITOS E RECURSOS", tone: "#6dffb0", items: ["shop", "mine", "contracts", "academy", "power", "observatory", "museum", "portal"] },
  { id: "piloto", label: "PILOTO", tag: "REGISTRO E ESTILO", tone: "#ff7ad9", items: ["profile", "mastery", "skins"] },
];
const BUILDING: Partial<Record<Sys, string>> = { roster: "hangar", modes: "arena", tournaments: "tourney", ranked: "ranked", shop: "shop", engineer: "engineer", pets: "pets", cards: "cards", mine: "mine", lab: "lab", observatory: "observatory", academy: "academy", contracts: "contracts", power: "power", museum: "museum", portal: "portal" };
const OVERHAUL: Partial<Record<Sys, string>> = { story: "story", online: "arena", pantheon: "star", drones: "repair", profile: "pilot", mastery: "ultimate", skins: "hangar" };
const SHORT: Partial<Record<Sys, string>> = { modes: "Arena", online: "Online PvP", roster: "Hangar", story: "História", drones: "Drones", profile: "Perfil", lab: "Laboratório", pantheon: "Panteão" };
const iconOf = (id: Sys) => BUILDING[id] ? `/city/b_${BUILDING[id]}.png` : `/overhaul/${OVERHAUL[id] || "star"}.webp`;
const nameOf = (id: Sys) => SHORT[id] || SYSTEM_GUIDES[id]?.name || id;
const QUICK: [Sys, string, string][] = [["story", "story", "HISTÓRIA"], ["roster", "hangar", "HANGAR"], ["modes", "arena", "ARENA"], ["online", "coliseum", "ONLINE"]];

export function SystemDock({ onEnter, disabled, onHome }: { onEnter: (id: Sys) => void; disabled: boolean; onHome?: () => void }) {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("todos");
  const unlocked = (id: Sys) => systemUnlocked(g, id);
  const go = (id: Sys) => { if (!disabled && unlocked(id)) { setOpen(false); onEnter(id); } };
  const all = useMemo(() => GROUPS.flatMap(x => x.items), []);
  const active = all.filter(id => systemUnlocked(g, id)).length;
  const next = all.filter(id => !systemUnlocked(g, id)).sort((a, b) => UNLOCK_LEVEL[a] - UNLOCK_LEVEL[b])[0];
  const shown = tab === "todos" ? GROUPS : GROUPS.filter(x => x.id === tab);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); e.stopPropagation(); };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return <nav className={`mc-dock${open ? " is-open" : ""}`} aria-label="Sistemas da cidade">
    <div className="mc-dock-rail">
      {QUICK.map(([id, art, label]) => <button key={id} data-skin="none" data-testid={`dock-${id}`} className={`mc-dock-tile${id === "story" ? " is-story" : ""}`} disabled={disabled} onClick={() => go(id)}>
        <img src={`/overhaul/${art}.webp`} alt="" /><span>{label}</span>
      </button>)}
      <i className="mc-dock-sep" aria-hidden />
      <button data-skin="none" className="mc-dock-tile is-all" disabled={disabled} aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <span className="mc-dock-burger" aria-hidden><b /><b /><b /></span><span>SISTEMAS</span><em>{active}</em>
      </button>
    </div>
    <div className="mc-dock-chips">
      {onHome && <button data-skin="none" className="mc-dock-chip" disabled={disabled} onClick={onHome} aria-label="Voltar para casa-laboratório"><img src="/city/b_lab.png" alt="" />CASA · FORJA</button>}
      <button data-skin="none" data-testid="pantheon-button" className="mc-dock-chip is-myth" disabled={disabled || !unlocked("pantheon")} onClick={() => go("pantheon")} aria-label="Abrir Panteão">
        <span className="pt-sheet" style={{ width: 18, height: 18, backgroundImage: "url(/mythic/emblem.webp)" }} />
        {unlocked("pantheon") ? "PANTEÃO" : `PANTEÃO · NV ${UNLOCK_LEVEL.pantheon}`}
      </button>
    </div>

    {open && <div className="mc-dock-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="mc-dock-panel" role="dialog" aria-modal="true" aria-label="Central de sistemas">
        <header>
          <div><small>CENTRAL DE SISTEMAS</small><strong>PILOTO NV {g.playerLevel}</strong><span>{active}/{all.length} SINAIS ATIVOS</span></div>
          <button data-skin="none" className="mc-dock-x" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
        </header>
        <div className="mc-dock-tabs" role="tablist">
          {[{ id: "todos", label: "TODOS", tone: "#d7f8ff" }, ...GROUPS].map(t => <button key={t.id} data-skin="none" role="tab" aria-selected={tab === t.id} style={{ ["--tone" as string]: t.tone }} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="mc-dock-scroll">
          {shown.map(group => <section key={group.id} className="mc-dock-group" style={{ ["--tone" as string]: group.tone }}>
            <h3><b>{group.label}</b><span>{group.tag}</span><em>{group.items.filter(unlocked).length}/{group.items.length}</em></h3>
            <div className="mc-dock-grid">
              {group.items.map(id => {
                const on = unlocked(id);
                return <button key={id} data-skin="none" className={`mc-dock-card${on ? "" : " is-locked"}`} disabled={disabled || !on} onClick={() => go(id)} title={SYSTEM_GUIDES[id]?.mission}>
                  <span className="mc-dock-icon"><img src={iconOf(id)} alt="" loading="lazy" /></span>
                  <strong>{nameOf(id)}</strong>
                  <small>{on ? (SYSTEM_GUIDES[id]?.tag || "CAPÍTULOS E ESCOLHAS") : `BLOQUEADO · NV ${UNLOCK_LEVEL[id]}`}</small>
                  {!on && <i className="mc-dock-lock" aria-hidden>NV{UNLOCK_LEVEL[id]}</i>}
                </button>;
              })}
            </div>
          </section>)}
        </div>
        <footer>{next
          ? <><span>PRÓXIMO SINAL · <b>{nameOf(next)}</b> no nível {UNLOCK_LEVEL[next]}</span><i><u style={{ width: `${Math.min(100, g.playerLevel / UNLOCK_LEVEL[next] * 100)}%` }} /></i></>
          : <span>TODOS OS SISTEMAS DA CIDADE ESTÃO ONLINE</span>}</footer>
      </section>
    </div>}
  </nav>;
}
