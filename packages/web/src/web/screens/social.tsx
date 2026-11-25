import { useEffect, useRef, useState } from "react";
import { NetworkFrame, NetworkGate, Notice, RobotPick, useNetworkAction, when } from "@/components/network-ui";
import { PilotCard, PublicProfile } from "@/components/public-profile";
import { socialApi, useChat, useInbox, useMyProfile, usePilots, useThread } from "@/queries/social";
import { getState } from "@/game/save";
import { CATALOG_IDS } from "@/game/robots";

type Tab = "global" | "guild" | "pv" | "pilots" | "me";
type Peer = { id: string; name: string };
export function SocialScreen({onBack, initial = "global"}: {onBack: () => void; initial?: "global" | "guild"}) {
  return <NetworkGate onBack={onBack}>{u => <SocialTerminal key={u.id} id={u.id} onBack={onBack} initial={initial} />}</NetworkGate>;
}
function SocialTerminal({id, onBack, initial}: {id: string; onBack: () => void; initial: Tab}) {
  const [tab, setTab] = useState<Tab>(initial), [profile, setProfile] = useState(""), [peer, setPeer] = useState<Peer | null>(null), [draft, setDraft] = useState(""), [term, setTerm] = useState(""), [search, setSearch] = useState("");
  const isChat = tab === "global" || tab === "guild", scope = tab === "guild" ? "guild" : "global", chatting = isChat || (tab === "pv" && !!peer);
  const me = useMyProfile(), chat = useChat(scope, isChat), inbox = useInbox(), thread = useThread(peer?.id ?? "", tab === "pv"), pilots = usePilots(search, tab === "pilots");
  const unread = inbox.data?.reduce((sum, item) => sum + Number(item.unread), 0) ?? 0;
  const { run, busy, error } = useNetworkAction();
  const setChannel = (t: Tab) => { setDraft(""); setTab(t); };
  const pickPeer = (id: string, name: string) => {setPeer({id, name});setChannel("pv");setProfile("");};
  useEffect(() => { if (tab === "pv" && thread.data?.some(m => m.toId === id && !m.read)) void inbox.refetch(); }, [thread.data, tab, id, inbox.refetch]);
  const rows = isChat ? (chat.data ?? []) : (thread.data ?? []).map(m => ({id:m.id, userId:m.fromId, name:m.fromId === id ? me.data?.name ?? "Você" : peer?.name ?? "Piloto", tag:"", text:m.text, at:m.at}));
  const log = useRef<HTMLDivElement>(null), sticky = useRef(true);
  useEffect(() => { sticky.current = true; }, [tab, peer?.id]);
  useEffect(() => { if (log.current && sticky.current) log.current.scrollTop = log.current.scrollHeight; }, [rows[rows.length - 1]?.id, tab, peer?.id]);
  const tabs: [Tab, string][] = [["global","SERVER"],["guild","GUILDA"],["pv",`PV${unread ? ` · ${unread}` : ""}`],["pilots","PILOTOS"],["me","MEU PERFIL"]];
  return <NetworkFrame title="REDE SOCIAL" lead="Canal aberto para os pilotos do servidor." kind="social" onBack={onBack} tabs={<nav className="mc-net-tabs" aria-label="Comunicações">{tabs.map(([t,label]) => <button key={t} aria-pressed={tab === t} onClick={() => setChannel(t)}>{label}</button>)}</nav>}>
    <Notice error={error || me.error || (isChat ? chat.error : tab === "pv" ? (peer ? thread.error : inbox.error) : tab === "pilots" ? pilots.error : null)} />
    {tab === "pv" && !peer && <section className="mc-net-card"><h2>Mensagens privadas</h2><p>Toque no perfil de um piloto para começar um PV.</p>{!inbox.data?.length && <p className="mc-net-muted">Nenhuma conversa ainda.</p>}{inbox.data?.map(p => <button className="mc-net-list-button" key={p.userId} onClick={() => pickPeer(p.userId, p.name)}><span>{p.name}</span><small>{p.unread ? `${p.unread} NOVAS` : when(p.at)}</small></button>)}<button onClick={() => setChannel("pilots")}>BUSCAR PILOTOS</button></section>}
    {chatting && <section className="mc-net-card mc-net-chat"><header><h2>{isChat ? (scope === "global" ? "Canal do servidor" : "Canal da guilda") : peer?.name}</h2>{!isChat && <button onClick={() => {setPeer(null);setDraft("");}}>‹ CONVERSAS</button>}</header>
      <div className="mc-net-log" ref={log} role="log" aria-label="Mensagens" onScroll={e => {const a = e.currentTarget; sticky.current = a.scrollHeight - a.scrollTop - a.clientHeight < 70;}}>
        {!rows.length && <p className="mc-net-muted">{(isChat ? chat.isPending : thread.isPending) ? "CARREGANDO…" : "Nenhuma mensagem neste canal."}</p>}
        {rows.map(m => <article key={m.id} className={m.userId === id ? "mine" : ""}><div><button onClick={() => setProfile(m.userId)}>{m.tag && `[${m.tag}] `}{m.name}</button><time>{when(m.at)}</time></div><p>{m.text}</p></article>)}
      </div>
      <form className="mc-net-compose" onSubmit={e => {e.preventDefault();const text = draft.trim();if (!text) return;const work = isChat ? () => socialApi.send({scope,text}) : () => socialApi.dm({id:peer!.id,text});void run(work, () => {setDraft("");sticky.current=true;void (isChat ? chat.refetch() : thread.refetch());});}}>
        <input aria-label="Mensagem" placeholder="Digite uma mensagem…" maxLength={200} value={draft} disabled={busy || (isChat && !!chat.error)} onChange={e => setDraft(e.target.value)} /><button className="mc-net-primary" disabled={busy || !draft.trim() || (isChat && !!chat.error)}>ENVIAR</button>
      </form><small className="mc-net-muted">{draft.length}/200 · ANTISPAM ATIVO</small>
    </section>}
    {tab === "pilots" && <section className="mc-net-card"><h2>Diretório de pilotos</h2><form className="mc-net-compose" onSubmit={e => {e.preventDefault();setSearch(term.trim());}}><input aria-label="Nome do piloto" placeholder="Buscar por nome…" value={term} maxLength={40} onChange={e => setTerm(e.target.value)} /><button className="mc-net-primary">BUSCAR</button></form>{pilots.data?.map(p => <button className="mc-net-list-button" key={p.userId} onClick={() => setProfile(p.userId)}><span>{p.name}</span><small>VER PERFIL ›</small></button>)}{pilots.data?.length === 0 && <p>Nenhum piloto encontrado.</p>}</section>}
    {tab === "me" && me.data && <ProfileEdit key={me.data.userId} p={me.data} refresh={() => void me.refetch()} />}
    {profile && <PublicProfile id={profile} mine={id} close={() => setProfile("")} onMessage={pickPeer} onBlock={() => {if (isChat) void chat.refetch(); if (tab === "pilots") void pilots.refetch();}} />}
  </NetworkFrame>;
}
function ProfileEdit({p, refresh}: {p: NonNullable<ReturnType<typeof useMyProfile>["data"]>; refresh: () => void}) {
  const [name,setName] = useState(p.name.slice(0,24)), [title,setTitle] = useState(p.title), [bio,setBio] = useState(p.bio), [avatar,setAvatar] = useState(p.avatar), [saved,setSaved] = useState(false);
  const {run,busy,error} = useNetworkAction(refresh);
  return <><PilotCard p={p} /><form className="mc-net-card mc-net-form" onSubmit={e => {e.preventDefault();setSaved(false);const g = getState(); void run(() => socialApi.publish({name,title,bio,avatar,showcase:g.team.filter(id => CATALOG_IDS.includes(id)).slice(0,4),level:Math.min(9999,g.playerLevel),robots:Math.min(10000,g.robots.length)}), () => setSaved(true));}}>
    <h2>Editar cartão público</h2><label>Nome<input value={name} required minLength={2} maxLength={24} onChange={e=>setName(e.target.value)} /></label><label>Título<input value={title} maxLength={30} onChange={e=>setTitle(e.target.value)} /></label><label>Biografia<textarea value={bio} maxLength={140} rows={3} onChange={e=>setBio(e.target.value)} /></label><RobotPick label="Avatar" value={avatar} onChange={setAvatar} />
    <p>A equipe ativa, o nível e o tamanho da coleção do seu save também serão exibidos.</p><Notice error={error} />{saved && <p role="status">Perfil publicado.</p>}<button className="mc-net-primary" disabled={busy}>PUBLICAR PERFIL</button>
  </form></>;
}
