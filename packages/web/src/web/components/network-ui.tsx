import { useEffect, useRef, useState, type ReactNode } from "react";
import { authClient, completeManagedRedirect } from "@/lib/auth";
import { AuthPanel, guestLogin } from "@/screens/online";
import { errText } from "@/screens/online-battle";
import { CATALOG_IDS, ROBOT_MAP, faceUrl } from "@/game/robots";
import "@/screens/network.css";
import { NetworkAccount } from "@/queries/network-key";

let connecting: Promise<string | null> | undefined;
export function NetworkGate({ onBack, children }: { onBack: () => void; children: (user: {id: string; name: string}) => ReactNode }) {
  const session = authClient.useSession();
  const [ready, setReady] = useState(false), [attempted, setAttempted] = useState(false);
  const user = session.data?.user;
  useEffect(() => { void completeManagedRedirect().catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready || session.isPending || user || attempted) return;
    connecting ??= guestLogin().catch(() => "Login indisponível").finally(() => { connecting = undefined; });
    let alive = true;
    void connecting.finally(() => { if (alive) setAttempted(true); });
    return () => { alive = false; };
  }, [ready, session.isPending, user, attempted]);
  if (!ready || session.isPending || (!user && !attempted)) return <div className="mo-screen mo-center"><p className="mo-kicker">CONECTANDO AO SERVIDOR…</p><button className="mo-ghost" onClick={onBack}>VOLTAR</button></div>;
  return user ? <NetworkAccount.Provider value={user.id}>{children(user)}</NetworkAccount.Provider> : <AuthPanel onBack={onBack} />;
}
export function NetworkFrame({ title, lead, kind, onBack, tabs, children }: { title: string; lead: string; kind: "guild" | "social"; onBack: () => void; tabs?: ReactNode; children: ReactNode }) {
  return <main className={`mc-net mc-net-${kind}`}><div className="mc-net-shell">
    <header className="mc-net-top"><button onClick={onBack}>‹ VOLTAR</button><span><i /> SERVIDOR ONLINE</span></header>
    <section className="mc-net-hero"><div><small>MECHA CHAMPIONS / {kind === "guild" ? "OPERAÇÕES" : "COMUNICAÇÕES"}</small><h1>{title}</h1><p>{lead}</p></div></section>
    {tabs}<div className="mc-net-body">{children}</div>
  </div></main>;
}
export function Notice({error}: {error: unknown}) { return error ? <p role="alert" className="mc-net-error">{errText(error)}</p> : null; }
export function useNetworkAction(after?: () => void) {
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async <T,>(work: () => Promise<T>, success?: (data: T) => void) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { const data = await work(); success?.(data); after?.(); }
    catch (e) { setError(e); }
    finally { lock.current = false; setBusy(false); }
  };
  return {run, busy, error};
}
export function RobotPick({ value, onChange, label, excluded = [] }: { value: string; onChange: (id: string) => void; label: string; excluded?: string[] }) {
  return <label className="mc-net-robot">{label}<div>{value && <img src={faceUrl(value)} alt="" loading="lazy" />}<select value={value} onChange={e => onChange(e.target.value)}>
    {!value && <option value="">Selecione um robô</option>}
    {CATALOG_IDS.map(id => <option key={id} value={id} disabled={excluded.includes(id) && id !== value}>{ROBOT_MAP[id]?.name ?? id}</option>)}
  </select></div></label>;
}
export const number = (n: number) => n.toLocaleString("pt-BR");
export const when = (ms: number) => new Date(ms).toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
