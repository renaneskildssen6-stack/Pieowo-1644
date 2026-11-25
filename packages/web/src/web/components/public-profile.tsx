import { useEffect, useRef } from "react";
import { faceUrl, ROBOT_MAP } from "@/game/robots";
import { useBlocked, usePilot, socialApi } from "@/queries/social";
import { Notice, number, useNetworkAction } from "./network-ui";

type Card = NonNullable<ReturnType<typeof usePilot>["data"]>;
export function PilotCard({ p }: { p: Card }) {
  return <section className="mc-net-card mc-net-profile">
    <div className="mc-net-identity">{p.avatar ? <img src={faceUrl(p.avatar)} alt="" /> : <div className="mc-net-avatar">{p.name.slice(0, 2).toUpperCase()}</div>}<div>
      <small>{p.tag ? `[${p.tag}] ${p.guild}` : "PILOTO INDEPENDENTE"}</small><h2>{p.name}</h2>{p.title && <p>{p.title}</p>}
    </div></div>
    {p.bio && <p>{p.bio}</p>}
    <div className="mc-net-stats"><div><strong>{number(p.wins ?? 0)} / {number(p.losses ?? 0)}</strong><small>V / D ONLINE</small></div><div><strong>{number(p.rating ?? 1000)}</strong><small>ELO</small></div><div><strong>NV {number(p.level)}</strong><small>PROGRESSO DO SAVE</small></div><div><strong>{number(p.robots)}</strong><small>ROBÔS NO SAVE</small></div></div>
    {p.showcase.length > 0 && <><h3>VITRINE DE ROBÔS</h3><div className="mc-net-showcase">{p.showcase.map((id, i) => <div key={`${id}-${i}`}><img src={faceUrl(id)} alt="" loading="lazy" /><small>{ROBOT_MAP[id]?.name ?? id}</small></div>)}</div></>}
  </section>;
}
export function PublicProfile({ id, mine, close, onMessage, onBlock }: { id: string; mine: string; close: () => void; onMessage?: (id: string, name: string) => void; onBlock?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const p = usePilot(id), blocked = useBlocked(id, id !== mine && !!onMessage);
  const { run, busy, error } = useNetworkAction(() => { void blocked.refetch(); onBlock?.(); });
  return <dialog className="mc-net-dialog" ref={dialog} aria-label="Perfil público" onCancel={e => {e.preventDefault(); close();}}>
    <header className="mc-net-top"><small>CARTÃO DE PILOTO</small><button onClick={close}>FECHAR</button></header>
    <Notice error={p.error || error} />{p.isPending && <p>CARREGANDO PERFIL…</p>}{p.data && <PilotCard p={p.data} />}
    {p.data && id !== mine && onMessage && <div className="mc-net-actions">
      {!blocked.data?.active && <button className="mc-net-primary" onClick={() => onMessage(id, p.data!.name)}>ABRIR PV</button>}
      <button disabled={busy || !blocked.data} onClick={() => void run(() => socialApi.block({id, active: !blocked.data?.active}))}>{blocked.data?.active ? "DESBLOQUEAR" : "BLOQUEAR"}</button>
    </div>}
  </dialog>;
}
