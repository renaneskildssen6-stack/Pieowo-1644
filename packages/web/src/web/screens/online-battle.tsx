import { RankedDelta } from "./online-ranked";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORPCError } from "@orpc/client";
import { combatView, type CombatAction } from "@/game/combat";
import type { RobotSave } from "@/game/engine";
import { EMOTE_LIST, emoteArt, emoteOf } from "@/game/emotes";
import { BattleScreen, type RemoteBattle } from "@/screens/battle";
import { useEmote, useOnlineAction, useOnlineMatch, useRematch, useSurrender } from "@/queries/online";

export const errText = (e: unknown) => (e as { message?: string } | null)?.message ?? "Falha de conexão com o servidor.";

function useClock(deadline: number, serverNow: number, tick = 250) {
  const offset = useRef(0);
  useEffect(() => { offset.current = serverNow - Date.now(); }, [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), tick); return () => window.clearInterval(t); }, [tick]);
  return { seconds: Math.max(0, Math.ceil((deadline - (now + offset.current)) / 1000)), now: now + offset.current };
}

/** Relógio isolado: só ele re-renderiza a cada tick (antes a batalha inteira re-renderizava 4x/s). */
const TurnClock = memo(function TurnClock({ deadline, serverNow, mine, finished, onZero }: { deadline: number; serverNow: number; mine: boolean; finished: boolean; onZero: () => void }) {
  const { seconds } = useClock(deadline, serverNow, 500);
  const zero = useRef(onZero); zero.current = onZero;
  useEffect(() => { if (!finished && seconds === 0) { const t = window.setTimeout(() => zero.current(), 900); return () => window.clearTimeout(t); } }, [seconds, finished]);
  if (finished) return null;
  return <b className="mo-clock" data-low={mine && seconds <= 15} aria-label={`${seconds} segundos`}>{String(seconds).padStart(2, "0")}s</b>;
});

/** Balões de emote com relógio próprio (somem após 3,5 s). */
const Bubbles = memo(function Bubbles({ chat, serverNow }: { chat: { at: number; userId: string; emote: string; name: string; mine: boolean }[]; serverNow: number }) {
  const recent = chat.some(c => serverNow - c.at < 4000);
  const { now } = useClock(0, serverNow, recent ? 300 : 2000);
  const shown = chat.filter(c => now - c.at < 3500);
  return <div className="mo-bubbles" aria-live="polite">{shown.map(b => <div key={b.at + b.userId} className="mo-bubble" data-mine={b.mine}>
    <EmoteIcon id={b.emote} size={56} /><small>{b.name}</small>
  </div>)}</div>;
});

export function EmoteIcon({ id, size = 40 }: { id: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const e = emoteOf(id);
  return broken
    ? <span className="mo-emote-glyph" style={{ fontSize: size * 0.7 }} aria-hidden>{e.glyph}</span>
    : <img className="mo-emote-img" src={emoteArt(e.id)} alt="" width={size} height={size} onError={() => setBroken(true)} />;
}

/** Batalha online autoritativa: long-poll, emotes, presença, vez do parceiro (2v2) e revanche. */
export function OnlineBattle({ id, onExit, onNext, allowRematch = true }: { id: string; onExit: () => void; onNext: (id: string) => void; allowRematch?: boolean }) {
  const match = useOnlineMatch(id);
  const action = useOnlineAction(), surrender = useSurrender(), emote = useEmote(), rematch = useRematch();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tray, setTray] = useState(false);
  const view = match.data;
  const refetch = match.refetch;
  const onZero = useCallback(() => void refetch(), [refetch]);
  useEffect(() => { if (view?.nextId) onNext(view.nextId); }, [view?.nextId, onNext]);

  const battle = useMemo(() => view ? combatView(view.combat) : null, [view]);
  const teamsRef = useRef<{ id: string; player: RobotSave[]; enemy: RobotSave[] } | null>(null);
  if (view && teamsRef.current?.id !== view.id) {
    const save = (robotId: string): RobotSave => ({ id: robotId, level: 10, xp: 0, trained: { str: 0, def: 0, agl: 0 }, borrowed: true, gadgetLevel: 0 });
    teamsRef.current = { id: view.id, player: view.combat.player.fighters.map(f => save(f.robotId)), enemy: view.combat.enemy.fighters.map(f => save(f.robotId)) };
  }
  const teams = teamsRef.current;

  const sendImpl = async (a: CombatAction) => {
    if (!view || a.kind === "item" || a.kind === "auto") return;
    const command = a.kind === "cover" ? (a.withUid ? { kind: "cover" as const, withUid: a.withUid } : null) : a;
    if (!command) return;
    setError(null);
    const input = { id, revision: view.revision, requestId: crypto.randomUUID(), action: command };
    try { await action.mutateAsync(input); }
    catch (e) {
      // Só falha de rede repete (mesmo requestId = idempotente); recusa do servidor apenas ressincroniza.
      if (e instanceof ORPCError) { setError(errText(e)); void refetch(); return; }
      try { await action.mutateAsync(input); } catch (again) { setError(errText(again)); void refetch(); }
    }
  };
  const sendRef = useRef(sendImpl); sendRef.current = sendImpl;
  const send = useCallback((a: CombatAction) => void sendRef.current(a), []);
  const sendEmote = (e: string) => { setTray(false); emote.mutate({ id, emote: e }, { onSuccess: () => void refetch(), onError: err => setError(errText(err)) }); };

  if (match.isError && !view) return <div className="mo-screen mo-center"><p className="mo-error">{errText(match.error)}</p><button className="mo-secondary" onClick={onExit}>VOLTAR AO LOBBY</button></div>;
  if (!view || !battle || !teams) return <div className="mo-screen mo-center"><div className="mo-scan" aria-hidden><i /><i /><i /><i /><i /></div><p className="mo-kicker">SINCRONIZANDO PARTIDA…</p></div>;

  const turnLabel = view.finished ? "PARTIDA ENCERRADA" : view.mine ? "SUA VEZ" : view.allyTurn ? `VEZ DE ${view.turnName?.toUpperCase()}` : "VEZ DO OPONENTE";
  const header = <div className="mo-turnbar" data-mine={view.mine}>
    <span className="mo-turn">{turnLabel}</span>
    <TurnClock deadline={view.deadline} serverNow={view.serverNow} mine={view.mine} finished={view.finished} onZero={onZero} />
    <span className="mo-rival">
      {view.allyName && <em>+ {view.allyName} · </em>}vs {view.opponentName}{view.missed ? ` · perdas ${view.missed}/3` : ""}
      {!view.opponentOnline && !view.finished && <i className="mo-offline">OPONENTE DESCONECTADO</i>}
    </span>
    {!view.finished && (confirm
      ? <span className="mo-confirm"><button onClick={() => { setConfirm(false); surrender.mutate({ id }); }}>CONFIRMAR</button><button onClick={() => setConfirm(false)}>NÃO</button></span>
      : <button className="mo-surrender" onClick={() => setConfirm(true)}>DESISTIR</button>)}
    {(error || surrender.error || match.isError) && <p className="mo-error" role="alert">{error ?? (surrender.error ? errText(surrender.error) : "Conexão instável — tentando de novo…")}</p>}
  </div>;
  const waitingFor = view.allyTurn ? view.turnName ?? "PARCEIRO" : view.turnName ?? view.opponentName;
  const remote: RemoteBattle = {
    battle, revision: view.revision, transitions: view.transitions, mine: view.mine,
    sending: action.isPending, send, header,
    waiting: <div className="mo-waiting"><span className="mo-scan mo-scan-sm" aria-hidden><i /><i /><i /></span>AGUARDANDO {waitingFor.toUpperCase()}…</div>,
  };
  const rematchLabel = view.rematchMine ? `AGUARDANDO REVANCHE ${view.rematchVotes}/${view.rematchNeeded}` : view.rematchVotes ? `ACEITAR REVANCHE ${view.rematchVotes}/${view.rematchNeeded}` : "REVANCHE";
  return <div className="mo-battle">
    <BattleScreen key={id} remote={remote} arena={view.combat.arena} playerTeam={teams.player} enemyTeam={teams.enemy}
      items={{}} label={`${view.mode === "doubles" ? "DUPLAS 2v2" : view.ranked ? "RANQUEADA ONLINE" : "ONLINE"} · ${view.myName} vs ${view.opponentName}`} recordProgress={false}
      onUseItem={() => {}} onFinish={onExit} />
    <Bubbles chat={view.chat} serverNow={view.serverNow} />
    <div className="mo-emotes" data-open={tray}>
      <button className="mo-emote-toggle" aria-expanded={tray} aria-label="Emotes" onClick={() => setTray(t => !t)}><EmoteIcon id="hi" size={30} /></button>
      {tray && <div className="mo-emote-tray">{EMOTE_LIST.map(e => <button key={e.id} onClick={() => sendEmote(e.id)} disabled={emote.isPending} aria-label={e.label}><EmoteIcon id={e.id} size={42} /><small>{e.label}</small></button>)}</div>}
    </div>
    {view.finished && view.ranked && <RankedDelta delta={view.rankDelta} />}
    {view.finished && <div className="mo-rematch">
      {allowRematch && !view.ranked && <button className="mo-primary" disabled={view.rematchMine || rematch.isPending} onClick={() => rematch.mutate({ id }, { onSuccess: r => { if (r.nextId) onNext(r.nextId); else void refetch(); }, onError: e => setError(errText(e)) })}>{rematchLabel}</button>}
      <button className="mo-secondary" onClick={onExit}>{view.ranked ? "PRÓXIMA RANQUEADA" : "LOBBY"}</button>
    </div>}
  </div>;
}
