import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/game/save";
import { portraitUrl, ROBOT_MAP } from "@/game/robots";
import { GACHA_BLUEPRINTS, TIER_INFO, TIER_ORDER, type GachaTier } from "@/game/gacha-robots";
import {
  COST, FRAG_PER_PULL, PITY_EPIC, PITY_LEGEND, RATES,
  canPay, freeAvailable, legendChance, pull, topTier, useGacha,
  type Currency, type PullResult,
} from "@/game/gacha";
import { GachaCard, TierStars } from "@/components/gacha-card";
import "./gacha.css";

type Phase = "idle" | "charge" | "burst" | "cards";
type Pay = Exclude<Currency, "free">;

const CHARGE_MS: Record<GachaTier, number> = { C: 2600, R: 2600, E: 3000, L: 3600, M: 4000 };
const fmt = (n: number) => n.toLocaleString("pt-BR");

function useReduced() {
  const [r, setR] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return r;
}

export function GachaScreen({ onBack }: { onBack: () => void }) {
  const g = useGame();
  const gs = useGacha();
  const reduced = useReduced();
  const [pay, setPay] = useState<Pay>("gold");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<PullResult[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<GachaTier | null>(null);
  const [info, setInfo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const onVid = useRef<HTMLVideoElement>(null);
  const top = results.length ? topTier(results) : "C";

  const clear = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => clear, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const toCards = useCallback(() => {
    clear();
    setPhase("cards");
  }, []);

  function invoke(n: 1 | 10, cur: Currency) {
    if (phase === "charge" || phase === "burst") return;
    const res = pull(n, cur);
    if (!res) {
      setMsg(cur === "gold" ? "OURO INSUFICIENTE" : cur === "diamonds" ? "DIAMANTES INSUFICIENTES" : cur === "frags" ? "FRAGMENTOS INSUFICIENTES" : "TIRO GRÁTIS JÁ USADO HOJE");
      later(() => setMsg(null), 1800);
      return;
    }
    clear();
    setMsg(null);
    setResults(res);
    setFlipped(res.map(() => reduced));
    if (reduced) {
      setPhase("cards");
      return;
    }
    const t = topTier(res);
    setPhase("charge");
    const v = onVid.current;
    if (v) {
      try {
        v.currentTime = 1.3;
        void v.play().catch(() => undefined);
      } catch {
        /* sem vídeo — o brilho CSS segura a cena */
      }
    }
    later(() => setPhase("burst"), CHARGE_MS[t]);
    later(() => setPhase("cards"), CHARGE_MS[t] + 650);
  }

  function flip(i: number) {
    if (flipped[i]) return;
    setFlipped((f) => f.map((x, j) => (j === i ? true : x)));
    const t = results[i]?.tier;
    if (!reduced && (t === "L" || t === "M")) {
      setFlash(t);
      later(() => setFlash(null), 900);
    }
  }

  function revealAll() {
    const order = results.map((_, i) => i).filter((i) => !flipped[i]);
    if (reduced) {
      setFlipped(results.map(() => true));
      return;
    }
    order.forEach((i, k) => later(() => flip2(i), k * 170));
  }
  // versão sem closure velha (usada em lote)
  function flip2(i: number) {
    setFlipped((f) => f.map((x, j) => (j === i ? true : x)));
    const t = results[i]?.tier;
    if (t === "L" || t === "M") {
      setFlash(t);
      later(() => setFlash(null), 900);
    }
  }

  const allOpen = flipped.length > 0 && flipped.every(Boolean);
  const news = results.filter((r) => r.isNew).length;
  const dupGold = results.reduce((a, r) => a + r.gold, 0);
  const dupFrags = results.reduce((a, r) => a + r.frags, 0);
  const free = freeAvailable(gs);
  const nextEpic = PITY_EPIC - gs.pity10;
  const nextLegend = PITY_LEGEND - gs.pityL;
  const lc = legendChance(gs.pityL);
  const ownedSet = useMemo(() => new Set(g.robots.map((r) => r.id)), [g.robots]);
  const ownedN = GACHA_BLUEPRINTS.filter((b) => ownedSet.has(b.id)).length;
  const price = (n: 1 | 10) =>
    pay === "frags" ? `${FRAG_PER_PULL * n}◆` : pay === "gold" ? fmt((n === 1 ? COST.one : COST.ten).gold) : fmt((n === 1 ? COST.one : COST.ten).diamonds);
  const busy = phase === "charge" || phase === "burst";

  return (
    <div className={`gx-root ph-${phase} top-${top}${flash ? ` flash-${flash}` : ""}`} data-testid="gacha">
      <div className="gx-bg" aria-hidden />
      <header className="gx-top">
        <button className="gx-back" data-skin="none" onClick={onBack} disabled={busy}>◀ CIDADE</button>
        <div className="gx-title">
          <h1>PORTAL NEXUS</h1>
          <small>
            INVOCAÇÃO · {ownedN}/{GACHA_BLUEPRINTS.length} CHASSIS
          </small>
        </div>
        <div className="gx-wallet">
          <span><img src="/ui/icon_coins.png" alt="" />{fmt(g.gold)}</span>
          <span className="is-dia"><i className="gx-dia" aria-hidden />{g.diamonds}</span>
          <span className="is-frag"><i aria-hidden>◆</i>{gs.frags}</span>
        </div>
      </header>

      <section className="gx-stage" onClick={busy ? toCards : undefined}>
        <div className="gx-portal">
          <img className="gx-poster" src="/gacha/portal.jpg" alt="" aria-hidden />
          {!reduced && (
            <video className="gx-vid is-idle" src="/gacha/portal_idle.mp4" poster="/gacha/portal.jpg" autoPlay loop muted playsInline preload="auto" aria-hidden />
          )}
          {!reduced && (
            <video ref={onVid} className="gx-vid is-on" src="/gacha/portal_on.mp4" muted playsInline preload="auto" aria-hidden />
          )}
          <span className="gx-tint" aria-hidden />
          <span className="gx-rays" aria-hidden />
          <span className="gx-ring" aria-hidden />
          <span className="gx-sparks" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
          </span>
          <span className="gx-core" aria-hidden />
        </div>
        {busy && <span className="gx-skip">TOQUE PARA PULAR</span>}
        <span className="gx-flash" aria-hidden />
      </section>

      {phase !== "cards" && (
        <section className="gx-panel">
          <div className="gx-pity">
            <span>ÉPICO+ em <b>{nextEpic}</b></span>
            <span className="is-l">LENDÁRIO+ em <b>{nextLegend}</b>{lc > RATES.L + RATES.M && <em> · {lc.toFixed(1)}%</em>}</span>
            <button data-skin="none" className="gx-info-btn" onClick={() => setInfo(true)}>ACERVO & TAXAS</button>
          </div>
          <div className="gx-pay" role="radiogroup" aria-label="Moeda">
            {([["gold", "OURO"], ["diamonds", "DIAMANTES"], ["frags", "FRAGMENTOS"]] as [Pay, string][]).map(([id, l]) => (
              <button key={id} data-skin="none" role="radio" aria-checked={pay === id} className={pay === id ? "is-on" : ""} onClick={() => setPay(id)}>
                {l}
              </button>
            ))}
          </div>
          <div className="gx-pulls">
            <button data-skin="none" data-testid="gacha-x1" className="gx-pull is-one" disabled={busy || !canPay(1, pay)} onClick={() => invoke(1, pay)}>
              <span className="gx-pull-hex" aria-hidden />
              <b>INVOCAR ×1</b>
              <small>{price(1)} {pay === "gold" ? "OURO" : pay === "diamonds" ? "💎" : ""}</small>
            </button>
            <button data-skin="none" data-testid="gacha-x10" className="gx-pull is-ten" disabled={busy || !canPay(10, pay)} onClick={() => invoke(10, pay)}>
              <span className="gx-pull-hex" aria-hidden />
              <b>INVOCAR ×10</b>
              <small>{price(10)} {pay === "gold" ? "OURO" : pay === "diamonds" ? "💎" : ""} · ÉPICO+ GARANTIDO</small>
            </button>
          </div>
          <button data-skin="none" data-testid="gacha-free" className={`gx-free${free ? " is-ready" : ""}`} disabled={busy || !free} onClick={() => invoke(1, "free")}>
            {free ? "★ INVOCAÇÃO GRÁTIS DO DIA ★" : "GRÁTIS DE NOVO AMANHÃ"}
          </button>
          {msg && <p className="gx-msg" role="status">{msg}</p>}
        </section>
      )}

      {phase === "cards" && (
        <section className={`gx-deck n-${results.length}`} data-testid="gacha-deck">
          <div className="gx-cards">
            {results.map((r, i) => (
              <GachaCard key={`${r.id}-${i}`} r={r} index={i} big={results.length === 1} flipped={flipped[i]} onFlip={() => flip(i)} />
            ))}
          </div>
          <footer className="gx-deck-foot">
            {allOpen ? (
              <>
                <span className="gx-sum">
                  <b>{news}</b> NOVO{news === 1 ? "" : "S"}
                  {dupGold > 0 && <> · DUPLICATAS +{fmt(dupGold)} OURO · +{dupFrags}◆</>}
                </span>
                <button data-skin="none" className="gx-act" onClick={() => { setPhase("idle"); setResults([]); }}>CONTINUAR</button>
                <button data-skin="none" className="gx-act is-hot" disabled={!canPay(results.length === 10 ? 10 : 1, pay)} onClick={() => invoke(results.length === 10 ? 10 : 1, pay)}>
                  DE NOVO ×{results.length === 10 ? 10 : 1}
                </button>
              </>
            ) : (
              <>
                <span className="gx-sum">TOQUE NAS CARTAS PARA REVELAR</span>
                <button data-skin="none" className="gx-act is-hot" data-testid="gacha-reveal" onClick={revealAll}>REVELAR TUDO</button>
              </>
            )}
          </footer>
        </section>
      )}

      {info && <InfoPanel owned={ownedSet} onClose={() => setInfo(false)} />}
    </div>
  );
}

function InfoPanel({ owned, onClose }: { owned: Set<string>; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div className="gx-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="gx-modal-box" role="dialog" aria-modal="true" aria-label="Acervo e taxas">
        <header>
          <strong>ACERVO NEXUS</strong>
          <button data-skin="none" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="gx-rates">
          {[...TIER_ORDER].reverse().map((t) => (
            <span key={t} style={{ ["--tc" as string]: TIER_INFO[t].color }}>
              <b>{TIER_INFO[t].label}</b><TierStars tier={t} /><em>{String(RATES[t]).replace(".", ",")}%</em>
            </span>
          ))}
          <p>10º tiro sem ÉPICO+ é garantido · do 45º a chance de LENDÁRIO+ sobe 3%/tiro · 60º é LENDÁRIO+ garantido (15% MÍTICO). Chassis que você ainda não tem pesam 2× dentro da raridade. Duplicatas devolvem ouro e fragmentos.</p>
        </div>
        <div className="gx-coll">
          {[...TIER_ORDER].reverse().map((t) => (
            <div key={t} className="gx-coll-row" style={{ ["--tc" as string]: TIER_INFO[t].color }}>
              <h4>{TIER_INFO[t].label}</h4>
              <div>
                {GACHA_BLUEPRINTS.filter((b) => b.tier === t).map((b) => {
                  const has = owned.has(b.id);
                  return (
                    <figure key={b.id} className={has ? "is-own" : ""} title={has ? ROBOT_MAP[b.id]?.name : "???"}>
                      <img src={portraitUrl(b.id)} alt="" loading="lazy" />
                      <figcaption>{has ? b.name : "???"}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
