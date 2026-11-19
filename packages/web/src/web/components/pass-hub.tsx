import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/game/save";
import {
  DAILY_BONUS, ELITE_PRICE, LOGIN_REWARDS, PASS_TRACK, XP_PER_TIER, PASS_TIERS, WEEKLY_BONUS,
  buyElite, claimAll, claimDailyBonus, claimLogin, claimMission, claimTier, claimWeekly, claimWeeklyBonus,
  fmtCountdown, loginStatus, missionDef, msUntilReset, msUntilWeek, passPending, passTier, refreshPass,
  rerollMission, rewardIcon, rewardText, seasonDaysLeft, usePass, weeklyDef, type MissionState, type Reward,
} from "@/game/pass";
import { PassReveal } from "./pass-reveal";
import "./pass-hub.css";

type Tab = "passe" | "missoes" | "diario";

function RewardChip({ r, big }: { r: Reward; big?: boolean }) {
  return <span className={`ps-reward${big ? " is-big" : ""}`} title={rewardText(r)}>
    <img src={rewardIcon(r)} alt="" />
    <b>{r.gold ? r.gold : r.bars ? `${r.bars}` : r.item ? `${r.item[1]}×` : r.xp ? `${r.xp}` : ""}</b>
  </span>;
}

function MissionRow({ m, i, weekly, canReroll, onClaim, onReroll }: { m: MissionState; i: number; weekly?: boolean; canReroll: boolean; onClaim: () => void; onReroll?: () => void }) {
  const def = weekly ? weeklyDef(m.kind) : missionDef(m.kind);
  const done = m.prog >= m.target;
  const pct = Math.min(100, (m.prog / m.target) * 100);
  return <li style={{ ["--i" as string]: i }} className={`${m.claimed ? "is-claimed" : done ? "is-done" : ""}${weekly ? " is-weekly" : ""}`}>
    <div className="ps-m-main">
      <b>{def.label}</b>
      <div className="ps-m-bar"><i style={{ width: `${pct}%` }} /><span>{m.prog}/{m.target}</span></div>
    </div>
    {onReroll && !m.claimed && !done && canReroll && <button data-skin="none" className="ps-reroll" onClick={onReroll} aria-label="Trocar missão" title="Trocar missão (1× por dia)">↻</button>}
    <button data-skin="none" className="ps-m-claim" disabled={!done || m.claimed} onClick={onClaim}>
      {m.claimed ? <span className="ps-stamp">FEITO</span> : <><small>+{def.reward.passXp} XP</small><span>{def.reward.gold}<img src="/ui/icon_coins.png" alt="" /></span></>}
    </button>
  </li>;
}

/** Botão + painel do Passe / Missões / Diário (abre por cima da cidade). */
export function PassHub({ disabled, onOpenChange }: { disabled?: boolean; onOpenChange?: (open: boolean) => void }) {
  const p = usePass();
  const g = useGame();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("passe");
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [reveal, setReveal] = useState<{ title: string; rewards: Reward[] } | null>(null);
  const [just, setJust] = useState("");
  const [now, setNow] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const tier = passTier(p.xp);
  const login = loginStatus(p);
  const pending = passPending(p);
  const weekly = p.weekly ?? [];

  useEffect(() => { refreshPass(); onOpenChange?.(open); }, [open, onOpenChange]);
  // Abre sozinho uma vez por dia no calendário de login.
  useEffect(() => {
    if (!login.claimedToday && !disabled && sessionStorage.getItem("mc_pass_auto") !== p.day) {
      sessionStorage.setItem("mc_pass_auto", p.day);
      setTab("diario"); setOpen(true);
    }
  }, [disabled, login.claimedToday, p.day]);
  useEffect(() => {
    if (!open || tab !== "passe" || !trackRef.current) return;
    const el = trackRef.current.querySelector<HTMLElement>(`[data-tier="${Math.max(1, tier)}"]`);
    const box = trackRef.current;
    if (el) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [open, tab, tier]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!open || tab !== "missoes") return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open, tab]);
  const show = useCallback((title: string, rewards: Reward[], mark = "") => {
    setReveal({ title, rewards });
    if (mark) { setJust(mark); window.setTimeout(() => setJust((j) => (j === mark ? "" : j)), 1100); }
  }, []);
  const closeReveal = useCallback(() => setReveal(null), []);
  const onAll = () => { const got = claimAll(); if (got.length) show(got.length === 1 ? "RECOMPENSA!" : `${got.length} RECOMPENSAS!`, got); };

  const say = (text: string) => { const key = Date.now(); setToast({ key, text }); window.setTimeout(() => setToast((t) => (t?.key === key ? null : t)), 1800); };
  const inTier = tier >= PASS_TIERS ? XP_PER_TIER : p.xp - tier * XP_PER_TIER;

  return <>
    <button data-skin="none" className={`ps-open${pending > 0 ? " has-pending" : ""}`} disabled={disabled} onClick={() => setOpen(true)} aria-label="Abrir passe e missões">
      <span className="ps-open-tier">{tier}</span>
      <span className="ps-open-txt"><b>PASSE</b><small>MISSÕES</small></span>
      {pending > 0 && <em>{pending > 9 ? "9+" : pending}</em>}
    </button>
    {open && <div className="ps-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="ps-panel" role="dialog" aria-modal="true" aria-label="Passe de temporada">
        <header className="ps-head">
          <div className="ps-head-l">
            <small>TEMPORADA {p.season} · {seasonDaysLeft()}D RESTANTES</small>
            <strong>PASSE MECHA{p.elite && <i className="ps-elite-tag">ELITE</i>}</strong>
          </div>
          {pending > 0 && <button data-skin="none" className="ps-all" onClick={onAll}>RESGATAR TUDO<em>{pending}</em></button>}
          <button data-skin="none" className="ps-x" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
        </header>
        <div className="ps-xp">
          <span className="ps-xp-tier">{tier}</span>
          <div className="ps-xp-bar"><i key={tier} style={{ width: `${(inTier / XP_PER_TIER) * 100}%` }} /><span>{tier >= PASS_TIERS ? "MÁXIMO" : `${inTier}/${XP_PER_TIER} XP`}</span></div>
          <span className="ps-xp-tier is-next">{Math.min(PASS_TIERS, tier + 1)}</span>
        </div>
        <nav className="ps-tabs">
          {([["passe", "PASSE"], ["missoes", "MISSÕES"], ["diario", "DIÁRIO"]] as const).map(([id, label]) =>
            <button key={id} data-skin="none" aria-selected={tab === id} onClick={() => setTab(id)}>{label}{id === "missoes" && (p.missions.some((m) => !m.claimed && m.prog >= m.target) || weekly.some((m) => !m.claimed && m.prog >= m.target)) && <i className="ps-dot" />}{id === "diario" && !login.claimedToday && <i className="ps-dot" />}</button>)}
        </nav>

        {tab === "passe" && <div className="ps-body" key="passe">
          <div className="ps-final">
            <span className="ps-final-orb"><RewardChip r={PASS_TRACK[PASS_TIERS - 1].elite} big /></span>
            <div><small>RECOMPENSA FINAL · NÍVEL {PASS_TIERS}</small><b>{rewardText(PASS_TRACK[PASS_TIERS - 1].free)}</b><i><u style={{ width: `${(tier / PASS_TIERS) * 100}%` }} /></i></div>
            <strong>{tier}/{PASS_TIERS}</strong>
          </div>
          {!p.elite && <div className="ps-buy">
            <div><b>PASSE ELITE</b><small>DOBRE AS RECOMPENSAS: LINGOTES, NÚCLEOS E MUITO OURO</small></div>
            <button data-skin="none" disabled={g.gold < ELITE_PRICE} onClick={() => buyElite() ? show("PASSE ELITE ATIVADO!", [PASS_TRACK[PASS_TIERS - 1].elite]) : say("OURO INSUFICIENTE")}>
              <img src="/ui/icon_coins.png" alt="" />{ELITE_PRICE}
            </button>
          </div>}
          <div className="ps-legend"><span>GRÁTIS</span><span className="is-elite">ELITE</span></div>
          <div className="ps-track" ref={trackRef}>
            {PASS_TRACK.map((t, i) => {
              const n = i + 1;
              const reached = n <= tier;
              const fGot = p.free.includes(n);
              const eGot = p.premium.includes(n);
              const big = n % 10 === 0;
              const seg = reached ? 100 : n === tier + 1 ? (inTier / XP_PER_TIER) * 100 : 0;
              return <div key={n} data-tier={n} style={{ ["--seg" as string]: `${seg}%`, ["--i" as string]: Math.abs(n - Math.max(1, tier)) }} className={`ps-col${reached ? " is-reached" : ""}${n === tier ? " is-current" : ""}${n === tier + 1 ? " is-next" : ""}`}>
                <button data-skin="none" className={`ps-cell${fGot ? " is-got" : reached ? " is-ready" : ""}${big ? " is-big" : ""}`}
                  disabled={!reached || fGot} onClick={() => claimTier(n, "free") && show(`NÍVEL ${n}`, [t.free], `f${n}`)}>
                  <RewardChip r={t.free} big={big} />{fGot && <i className={`ps-check${just === `f${n}` ? " is-just" : ""}`} />}
                </button>
                <span className="ps-num">{n}</span>
                <button data-skin="none" className={`ps-cell is-elite${eGot ? " is-got" : reached && p.elite ? " is-ready" : ""}${!p.elite ? " is-locked" : ""}${big ? " is-big" : ""}`}
                  disabled={!reached || eGot || !p.elite} onClick={() => claimTier(n, "elite") && show(`NÍVEL ${n} · ELITE`, [t.elite], `e${n}`)}>
                  <RewardChip r={t.elite} big={big} />{eGot && <i className={`ps-check${just === `e${n}` ? " is-just" : ""}`} />}{!p.elite && <i className="ps-lock" />}
                </button>
              </div>;
            })}
          </div>
          <p className="ps-hint">VITÓRIA +30 XP · DERROTA +12 XP · MISSÕES DÃO MUITO MAIS</p>
        </div>}

        {tab === "missoes" && <div className="ps-body" key="missoes">
          <div className="ps-sec" data-t={now}><b>DIÁRIAS</b><span>NOVAS EM {fmtCountdown(msUntilReset())}</span></div>
          <ul className="ps-missions">
            {p.missions.map((m, i) => <MissionRow key={m.kind + i} m={m} i={i} canReroll={p.rerolled !== p.day}
              onReroll={() => rerollMission(i) && say("MISSÃO TROCADA!")}
              onClaim={() => claimMission(i) && show("MISSÃO CONCLUÍDA", [missionDef(m.kind).reward])} />)}
          </ul>
          {p.rerolled !== p.day && <p className="ps-hint">↻ TROQUE 1 MISSÃO DIÁRIA POR DIA</p>}
          <div className={`ps-bonus${p.bonusClaimed ? " is-claimed" : p.missions.every((m) => m.claimed) ? " is-ready" : ""}`}>
            <span className="ps-chest" aria-hidden />
            <div><b>BAÚ DO DIA</b><small>{rewardText(DAILY_BONUS)}</small><i className="ps-pips">{p.missions.map((m, i) => <u key={i} className={m.claimed ? "is-on" : ""} />)}</i></div>
            <button data-skin="none" disabled={p.bonusClaimed || !p.missions.every((m) => m.claimed)} onClick={() => claimDailyBonus() && show("BAÚ DO DIA ABERTO!", [DAILY_BONUS])}>
              {p.bonusClaimed ? "OK" : "ABRIR"}
            </button>
          </div>
          <div className="ps-sec is-weekly"><b>SEMANAIS</b><span>RENOVA EM {fmtCountdown(msUntilWeek())}</span></div>
          <ul className="ps-missions">
            {weekly.map((m, i) => <MissionRow key={m.kind + i} m={m} i={i + 4} weekly canReroll={false}
              onClaim={() => claimWeekly(i) && show("SEMANAL CONCLUÍDA", [weeklyDef(m.kind).reward])} />)}
          </ul>
          <div className={`ps-bonus is-weekly${p.weeklyBonus ? " is-claimed" : weekly.length && weekly.every((m) => m.claimed) ? " is-ready" : ""}`}>
            <span className="ps-chest is-epic" aria-hidden />
            <div><b>COFRE SEMANAL</b><small>{rewardText(WEEKLY_BONUS)}</small><i className="ps-pips">{weekly.map((m, i) => <u key={i} className={m.claimed ? "is-on" : ""} />)}</i></div>
            <button data-skin="none" disabled={p.weeklyBonus || !weekly.length || !weekly.every((m) => m.claimed)} onClick={() => claimWeeklyBonus() && show("COFRE SEMANAL ABERTO!", [WEEKLY_BONUS])}>
              {p.weeklyBonus ? "OK" : "ABRIR"}
            </button>
          </div>
        </div>}

        {tab === "diario" && <div className="ps-body" key="diario">
          <p className="ps-hint">ENTRE TODO DIA · SEQUÊNCIA ATUAL: {login.streak} {login.streak === 1 ? "DIA" : "DIAS"}</p>
          <div className="ps-cal">
            {LOGIN_REWARDS.map((r, i) => {
              const got = i < login.index || (login.claimedToday && i === login.index);
              const today = i === login.index && !login.claimedToday;
              return <div key={i} style={{ ["--i" as string]: i }} className={`ps-day${got ? " is-got" : ""}${today ? " is-today" : ""}${i === 6 ? " is-big" : ""}${just === `d${i}` ? " is-just" : ""}`}>
                <small>DIA {i + 1}</small>
                <RewardChip r={r} big={i === 6} />
                <span className="ps-day-txt">{rewardText(r)}</span>
                {got && <i className="ps-check" />}
              </div>;
            })}
          </div>
          <button data-skin="none" className="ps-claim" disabled={login.claimedToday} onClick={() => { const idx = login.index; const r = claimLogin(); if (r) show(`DIA ${idx + 1} RESGATADO!`, [r], `d${idx}`); }}>
            {login.claimedToday ? "VOLTE AMANHÃ" : "RESGATAR RECOMPENSA"}
          </button>
        </div>}
        {toast && <div key={toast.key} className="ps-toast"><b>{toast.text}</b></div>}
        {reveal && <PassReveal title={reveal.title} rewards={reveal.rewards} onClose={closeReveal} />}
      </section>
    </div>}
  </>;
}
