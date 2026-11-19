import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ITEM_MAP } from "@/game/config";
import {
  SAGAS, STORY_CHAPTERS, STORY_MAP, chapterArc, chapterRequirement, chapterSaga, chapterTag, chapterUnlocked,
  type SagaId, type StoryChapter,
} from "@/game/story";
import { StoryCast } from "@/components/story-cast";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Props { cleared: string[]; last: string | null; hasTeam: boolean; playerLevel: number; onOpen: (c: StoryChapter) => void; onBack: () => void }

export function StoryMap({ cleared, last, hasTeam, playerLevel, onOpen, onBack }: Props) {
  const focus = useRef<HTMLElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [mapView, setMapView] = useState({ x: 0, y: 0, zoom: 1 });

  const nextOpen = STORY_CHAPTERS.findIndex((c, i) => chapterUnlocked(cleared, i) && !cleared.includes(c.id));
  const sagaStats = useMemo(() => SAGAS.map((s) => {
    const idx = STORY_CHAPTERS.map((c, i) => (chapterSaga(c) === s.id ? i : -1)).filter((i) => i >= 0);
    return {
      saga: s, idx,
      done: idx.filter((i) => cleared.includes(STORY_CHAPTERS[i].id)).length,
      open: idx.some((i) => chapterUnlocked(cleared, i)),
      fresh: idx.some((i) => chapterUnlocked(cleared, i) && !cleared.includes(STORY_CHAPTERS[i].id)),
    };
  }), [cleared]);

  const [tab, setTab] = useState<SagaId>(() => {
    // saga do último capítulo jogado; senão a do próximo capítulo aberto da campanha principal
    const lastC = last ? STORY_MAP[last] : undefined;
    if (lastC) return chapterSaga(lastC);
    const main = STORY_CHAPTERS.findIndex((c, i) => chapterSaga(c) !== 4 && chapterUnlocked(cleared, i) && !cleared.includes(c.id));
    return main >= 0 ? chapterSaga(STORY_CHAPTERS[main]) : 1;
  });
  const cur = sagaStats.find((s) => s.saga.id === tab) ?? sagaStats[0];
  const idx = cur.idx;
  const sagaNext = idx.find((i) => chapterUnlocked(cleared, i) && !cleared.includes(STORY_CHAPTERS[i].id)) ?? -1;
  const focusIdx = last && idx.some((i) => STORY_CHAPTERS[i].id === last) ? idx.find((i) => STORY_CHAPTERS[i].id === last)! : sagaNext >= 0 ? sagaNext : idx[0];

  useEffect(() => {
    setMapView({ x: 0, y: 0, zoom: 1 });
    focus.current?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [tab]);

  const points = idx.map((i, k) => STORY_CHAPTERS[i].map ?? { x: 22 + (k % 2) * 44, y: 92 - k * 9, region: k < 6 ? "CINTURÃO AURORA" : "ROTA HELIX" });
  const mapDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: mapView.x, oy: mapView.y };
  };
  const mapMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const x = d.ox + e.clientX - d.x, y = d.oy + e.clientY - d.y;
    setMapView((v) => ({ ...v, x, y }));
  };
  const mapUp = () => { drag.current = null; };
  const zoom = (delta: number) => setMapView((v) => ({ ...v, zoom: Math.max(.72, Math.min(1.8, +(v.zoom + delta).toFixed(2))) }));
  const saga = cur.saga;

  return (
    <div className="ms-root ms-map" data-testid="story-map" style={{ ["--saga" as string]: saga.tone }}>
      <img key={saga.bg} className="ms-bg sg-bg" src={saga.bg} alt="" />
      <div className="ms-shade" />
      <header className="ms-map-head">
        <button className="ai-plate" onClick={onBack}>← CIDADE</button>
        <div>
          <small>MODO HISTÓRIA · {saga.short}</small>
          <h1>{saga.title}</h1>
        </div>
        <span className="ms-progress" aria-label={`${cleared.length} de ${STORY_CHAPTERS.length} capítulos`}>{cleared.length}/{STORY_CHAPTERS.length}</span>
      </header>

      <nav className="sg-tabs" role="tablist" aria-label="Sagas">
        {sagaStats.map(({ saga: s, idx: list, done, open, fresh }) => (
          <button key={s.id} role="tab" type="button" data-skin="none" aria-selected={s.id === tab} disabled={!open}
            className={`sg-tab${s.id === tab ? " is-on" : ""}${open ? "" : " is-locked"}${fresh && s.id !== tab ? " is-fresh" : ""}`}
            style={{ ["--tone" as string]: s.tone }} onClick={() => setTab(s.id)} data-testid={`story-saga-${s.id}`}>
            <small>{s.short}</small>
            <b>{open ? s.title : "BLOQUEADA"}</b>
            <i><em style={{ width: `${(done / Math.max(1, list.length)) * 100}%` }} /></i>
            <span>{open ? `${done}/${list.length}` : "🔒"}</span>
          </button>
        ))}
      </nav>
      <p className="sg-tagline">{saga.tagline}</p>

      {!hasTeam && <p className="ms-warn">Conclua o tutorial e monte uma equipe no Hangar para lutar na história.</p>}
      <section className="ms-route-panel" aria-label="Mapa de lugares da campanha">
        <header className="ms-route-head"><div><small>ATLAS DE NAVEGAÇÃO · ARRASTE PARA EXPLORAR</small><h2>ROTA · {saga.short}</h2></div><div className="ms-route-tools"><button className="ai-plate" aria-label="Afastar mapa" onClick={() => zoom(-.12)}>−</button><strong>{Math.round(mapView.zoom * 100)}%</strong><button className="ai-plate" aria-label="Aproximar mapa" onClick={() => zoom(.12)}>+</button><button className="ai-plate" onClick={() => setMapView({ x: 0, y: 0, zoom: 1 })}>CENTRAR</button></div></header>
        <div className="ms-route-viewport" onPointerDown={mapDown} onPointerMove={mapMove} onPointerUp={mapUp} onPointerCancel={mapUp} onWheel={(e) => zoom(e.deltaY < 0 ? .06 : -.06)}>
          <div className="ms-route-world" style={{ transform: `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.zoom})` }}>
            <div className="ms-route-glow" />
            {tab !== 4 && <svg className="ms-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} /></svg>}
            {points.map((p, k) => {
              const i = idx[k]; const c = STORY_CHAPTERS[i]; const unlocked = chapterUnlocked(cleared, i); const done = cleared.includes(c.id);
              return <button key={c.id} className={`ms-route-node${done ? " is-done" : ""}${unlocked ? "" : " is-locked"}${i === sagaNext ? " is-next" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} disabled={!unlocked} onClick={() => onOpen(c)} aria-label={`${c.title}, ${p.region}, ${unlocked ? "disponível" : "bloqueado"}`}><span>{chapterTag(c)}</span><b>{c.title}</b><small>{p.region}</small></button>;
            })}
          </div>
        </div>
        <p className="ms-route-hint">PINÇA OU RODA DO MOUSE: ZOOM · ARRASTE COM UM DEDO: APROXIME-SE DE CADA REGIÃO</p>
      </section>

      <StoryCast cleared={cleared} />

      <ol className="ms-chapters" key={tab}>
        {idx.map((i, k) => {
          const c = STORY_CHAPTERS[i];
          const unlocked = chapterUnlocked(cleared, i);
          const done = cleared.includes(c.id);
          const arc = chapterArc(c);
          const newArc = k === 0 || chapterArc(STORY_CHAPTERS[idx[k - 1]]) !== arc;
          const req = chapterRequirement(i);
          return (
            <Fragment key={c.id}>
              {newArc && tab !== 4 && <li className="sg-arc" aria-hidden="true"><span>{arc}</span></li>}
              <li ref={i === focusIdx ? (el) => { focus.current = el; } : undefined} className={`ms-chapter${done ? " is-done" : ""}${unlocked ? "" : " is-locked"}${i === sagaNext ? " is-next" : ""}`} style={{ ["--i" as string]: k }}>
                <div className="ms-chapter-art"><img src={c.thumb} alt="" loading="lazy" /><span>{chapterTag(c)}</span></div>
                <div className="ms-chapter-body">
                  <small>{arc} · {done ? "CONCLUÍDO" : unlocked ? (i === sagaNext || i === nextOpen ? "NOVO" : "DISPONÍVEL") : "BLOQUEADO"} · NV RECOMENDADO {c.recommended}{unlocked && !done && playerLevel < c.recommended ? " ⚠" : ""}</small>
                  <h2>{c.title}</h2>
                  <p>{unlocked ? c.synopsis : `Vença “${req?.title ?? "o capítulo anterior"}” para liberar.`}</p>
                  <em>{done ? "Estreia recebida · replay paga as lutas" : `Estreia: ${c.reward.gold.toLocaleString("pt-BR")}g · ${c.reward.xp.toLocaleString("pt-BR")} XP · ${c.reward.qty}× ${ITEM_MAP[c.reward.item]?.name ?? c.reward.item}`}</em>
                </div>
                <button className={`ai-plate${unlocked && !done ? " is-primary" : ""}`} data-testid={`story-play-${c.id}`} disabled={!unlocked} onClick={() => onOpen(c)}>{done ? "REJOGAR" : unlocked ? "JOGAR" : "🔒"}</button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
