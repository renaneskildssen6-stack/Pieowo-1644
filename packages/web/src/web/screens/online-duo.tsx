import { useEffect, useState } from "react";
import { ROBOT_MAP, faceUrl } from "@/game/robots";
import { useDuoMutations, useDuoRoom } from "@/queries/online";
import { errText } from "./online-battle";

const ROOM_KEY = "mecha.duoRoom";

/** DUPLAS 2v2 online: cada piloto leva 1 robô; vagas vazias viram IA quando o anfitrião inicia. */
export function DuoPanel({ robot, onMatch }: { robot: string | null; onMatch: (id: string) => void }) {
  const [code, setCode] = useState<string | null>(() => sessionStorage.getItem(ROOM_KEY));
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const room = useDuoRoom(code);
  const m = useDuoMutations();
  const enter = (c: string | null) => { setCode(c); if (c) sessionStorage.setItem(ROOM_KEY, c); else sessionStorage.removeItem(ROOM_KEY); };
  const matchId = room.data?.matchId;
  useEffect(() => { if (matchId) { enter(null); onMatch(matchId); } }, [matchId, onMatch]);
  useEffect(() => { if (room.isError) enter(null); }, [room.isError]);
  const err = m.create.error ?? m.join.error ?? m.seat.error ?? m.start.error ?? (room.isError ? room.error : null);

  if (!code || !room.data) return <section className="mo-duo">
    <p className="mo-kicker">DUPLAS 2v2 · 1 ROBÔ POR PILOTO</p>
    <p className="mo-note">Dois robôs em campo por lado. Jogue com um amigo contra outra dupla — vagas vazias são preenchidas pela IA.</p>
    <div className="mo-duo-pick">{robot ? <><img src={faceUrl(robot)} alt="" /><b>{ROBOT_MAP[robot]?.name}</b></> : <span>Escolha 1 robô no catálogo abaixo</span>}</div>
    <button className="mo-primary" disabled={!robot || m.join.isPending} onClick={() => robot && m.join.mutate({ robot }, { onSuccess: r => enter(r.code) })}>BUSCAR DUPLA PÚBLICA</button>
    <button className="mo-secondary" disabled={!robot || m.create.isPending} onClick={() => robot && m.create.mutate({ robot, isPublic: false }, { onSuccess: r => enter(r.code) })}>CRIAR SALA COM AMIGOS</button>
    <form className="mo-join" onSubmit={e => { e.preventDefault(); if (robot) m.join.mutate({ robot, code: input }, { onSuccess: r => enter(r.code) }); }}>
      <input value={input} onChange={e => setInput(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase())} placeholder="CÓDIGO" aria-label="Código da sala de duplas" />
      <button className="mo-secondary" disabled={!robot || input.length !== 6 || m.join.isPending}>ENTRAR</button>
    </form>
    {err && <p className="mo-error" role="alert">{errText(err)}</p>}
  </section>;

  const r = room.data;
  const filled = r.seats.filter(Boolean).length;
  const seat = (i: number) => {
    const s = r.seats[i];
    return <button key={i} className="mo-seat" data-mine={!!s?.mine} data-empty={!s} disabled={!!s || m.seat.isPending}
      onClick={() => m.seat.mutate({ code: r.code, seat: i }, { onSuccess: () => void room.refetch() })}>
      {s ? <><img src={faceUrl(s.robot)} alt="" /><b>{s.name}{s.host ? " ★" : ""}</b><small>{ROBOT_MAP[s.robot]?.name}</small></> : <><span>IA</span><small>toque para trocar</small></>}
    </button>;
  };
  return <section className="mo-duo">
    <p className="mo-kicker">SALA DE DUPLAS · {filled}/4 PILOTOS</p>
    <button className="mo-code" onClick={() => void navigator.clipboard?.writeText(r.code).then(() => setCopied(true))}>{r.code}</button>
    <small className="mo-note">{copied ? "CÓDIGO COPIADO" : r.isPublic ? "Sala pública — outros pilotos entram pela busca." : "Envie o código aos amigos."}</small>
    <div className="mo-duo-teams">
      <div className="mo-duo-team" data-team="a"><h4>EQUIPE AZUL</h4>{seat(0)}{seat(1)}</div>
      <b className="mo-duo-vs">VS</b>
      <div className="mo-duo-team" data-team="b"><h4>EQUIPE VERMELHA</h4>{seat(2)}{seat(3)}</div>
    </div>
    {r.isHost
      ? <button className="mo-primary" disabled={m.start.isPending} onClick={() => m.start.mutate({ code: r.code }, { onSuccess: v => v.matchId && onMatch(v.matchId) })}>INICIAR {filled < 4 ? `(${4 - filled} IA)` : "2v2"}</button>
      : <p className="mo-note">Aguardando o anfitrião iniciar…</p>}
    <button className="mo-secondary" onClick={() => { m.leave.mutate({}); enter(null); }}>SAIR DA SALA</button>
    {err && <p className="mo-error" role="alert">{errText(err)}</p>}
  </section>;
}
