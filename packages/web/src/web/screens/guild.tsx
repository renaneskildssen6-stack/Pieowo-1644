import { useState } from "react";
import { NetworkFrame, NetworkGate, Notice, number, useNetworkAction } from "@/components/network-ui";
import { PublicProfile } from "@/components/public-profile";
import { guildApi, useGuildHome, useGuildList, useGuildStatus } from "@/queries/guild";
import { ArenaPanel, BossPanel, DefensePanel, WarPanel } from "./guild-operations";
import { OnlineBattle } from "./online-battle";

type Tab = "base" | "war" | "boss" | "arena";
type Home = NonNullable<ReturnType<typeof useGuildHome>["data"]>;
export function GuildScreen({ onBack, onChat }: { onBack:()=>void; onChat:()=>void }) {
  return <NetworkGate onBack={onBack}>{u=><GuildTerminal key={u.id} id={u.id} onBack={onBack} onChat={onChat} />}</NetworkGate>;
}
function GuildTerminal({id,onBack,onChat}:{id:string;onBack:()=>void;onChat:()=>void}) {
  const [tab,setTab]=useState<Tab>("base"), [match,setMatch]=useState(""), [profile,setProfile]=useState("");
  const home = useGuildHome(!match), g = home.data?.guild, staff = home.data?.me?.role !== "member";
  const status = useGuildStatus(!!g && !match, tab === "arena" || tab === "war");
  const refresh = () => { void home.refetch(); if(g) void status.refetch(); };
  const label: [Tab,string][] = [["base","QUARTEL"],["war","GUERRA"],["boss","CHEFE"],["arena","ARENA X1 / X2"]];
  if (match) return <OnlineBattle id={match} onNext={setMatch} onExit={()=>{setMatch("");refresh();}} allowRematch={false} />;
  return <NetworkFrame title={g ? g.name : "COMANDO DE GUILDAS"} lead={g ? g.motto || `[${g.tag}] · Quartel de operações` : "Forme seu clã, organize a defesa e dispute o controle do setor."} kind="guild" onBack={onBack}
    tabs={g && <nav className="mc-net-tabs" aria-label="Operações">{label.map(([t,name])=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{name}</button>)}<button onClick={onChat}>CHAT ›</button></nav>}>
    <Notice error={home.error || (g && status.error)} />
    {home.isPending && <p>CARREGANDO QUARTEL…</p>}
    {home.data && !g && <GuildDirectory home={home.data} refresh={()=>{setTab("base");refresh();}} />}
    {status.data?.activeMatch && g && <div className="mc-net-resume"><b>COMBATE EM ANDAMENTO</b><button className="mc-net-primary" onClick={()=>setMatch(status.data!.activeMatch!)}>RETOMAR COMBATE ›</button></div>}
    {g && home.data && tab === "base" && <GuildBase home={home.data} onProfile={setProfile} refresh={refresh} />}
    {g && tab === "war" && status.data && <WarPanel s={status.data} searching={!!g.warSearch && Date.now()-g.warSearch < 86400000} staff={staff} refresh={refresh} fight={setMatch} />}
    {g && tab === "boss" && status.data && <BossPanel s={status.data} refresh={refresh} fight={setMatch} />}
    {g && tab === "arena" && <ArenaPanel id={id} activeMatch={status.data?.activeMatch ?? null} refresh={refresh} fight={setMatch} />}
    {profile && <PublicProfile id={profile} mine={id} close={()=>setProfile("")} />}
  </NetworkFrame>;
}
const emblems = ["bronze","ouro","platina","diamante","mestre","lenda"] as const;
const role = (v: string) => v === "leader" ? "LÍDER" : v === "officer" ? "OFICIAL" : "MEMBRO";
function GuildDirectory({home,refresh}:{home:Home;refresh:()=>void}) {
  const [form,setForm]=useState(false), [term,setTerm]=useState(""), [query,setQuery]=useState(""), [name,setName]=useState(""), [tag,setTag]=useState(""), [motto,setMotto]=useState(""), [emblem,setEmblem]=useState<typeof emblems[number]>("ouro"), [color,setColor]=useState("#ffbc66"), [joinMode,setJoinMode]=useState<"open"|"request">("open");
  const guilds=useGuildList(query,!form), {run,busy,error}=useNetworkAction(()=>{refresh();void guilds.refetch();});
  return <section className="mc-net-card"><div className="mc-net-heading"><h2>{form ? "Fundar uma guilda" : "Guildas do servidor"}</h2><button className="mc-net-primary" onClick={()=>setForm(!form)}>{form ? "‹ LISTA" : "+ CRIAR GUILDA"}</button></div><Notice error={error || (!form && guilds.error)} />
    {form ? <form className="mc-net-form" onSubmit={e=>{e.preventDefault();void run(()=>guildApi.create({name,tag,motto,emblem,color,joinMode}));}}>
      <label>Nome da guilda<input required minLength={3} maxLength={28} value={name} onChange={e=>setName(e.target.value)} /></label><label>Tag (3–4 letras ou números)<input required pattern="[A-Za-z0-9]{3,4}" maxLength={4} value={tag} onChange={e=>setTag(e.target.value.toUpperCase())} /></label>
      <label>Lema<input maxLength={90} value={motto} onChange={e=>setMotto(e.target.value)} /></label><label>Ingresso<select value={joinMode} onChange={e=>setJoinMode(e.target.value as typeof joinMode)}><option value="open">Aberto</option><option value="request">Após aprovação</option></select></label>
      <fieldset><legend>Emblema</legend><div className="mc-net-emblems">{emblems.map(v=><button key={v} type="button" aria-pressed={v===emblem} aria-label={v} onClick={()=>setEmblem(v)}><img src={`/ranks/${v}.png`} alt="" /></button>)}</div></fieldset><label>Cor do clã<input type="color" value={color} onChange={e=>setColor(e.target.value)} /></label>
      <button className="mc-net-primary" disabled={busy}>FUNDAR GUILDA</button>
    </form> : <><form className="mc-net-compose" onSubmit={e=>{e.preventDefault();setQuery(term.trim());}}><input aria-label="Buscar guilda" placeholder="Buscar por nome ou tag…" value={term} maxLength={32} onChange={e=>setTerm(e.target.value)} /><button>BUSCAR</button></form>
      {guilds.data?.length===0 && <p>Nenhuma guilda encontrada. Funde a primeira!</p>}{guilds.data?.map(g=>{const pending=home.requests.some(r=>r.guildId===g.id);return <div className="mc-net-list-button" key={g.id}><img src={`/ranks/${g.emblem}.png`} alt="" /><div><b style={{color:g.color}}>[{g.tag}] {g.name}</b><br /><small>NV {g.level} · {g.count} PILOTOS · {number(g.trophies)} TROFÉUS</small>{g.motto && <p>{g.motto}</p>}</div><button disabled={busy || pending} onClick={()=>void run(()=>guildApi.join({id:g.id}))}>{pending ? "PENDENTE" : g.joinMode==="open" ? "ENTRAR" : "PEDIR VAGA"}</button></div>;})}
    </>}
  </section>;
}
function GuildBase({home,onProfile,refresh}:{home:Home;onProfile:(id:string)=>void;refresh:()=>void}) {
  const g=home.guild!, me=home.me!, {run,busy,error}=useNetworkAction(refresh);
  const [confirm,setConfirm]=useState<{target:string;action:"leave"|"kick"|"transfer"} | null>(null);
  const manage=(target:string,action:"leave"|"kick"|"transfer"|"officer"|"member")=>void run(()=>guildApi.manage({target,action}),()=>setConfirm(null));
  return <><section className="mc-net-card"><div className="mc-net-identity"><img src={`/ranks/${g.emblem}.png`} alt="" /><div><small style={{color:g.color}}>[{g.tag}] · {role(me.role)}</small><h2>{g.name}</h2></div></div><div className="mc-net-stats"><div><strong>{g.level}</strong><small>NÍVEL</small></div><div><strong>{number(g.trophies)}</strong><small>TROFÉUS</small></div><div><strong>{g.wins} / {g.losses}</strong><small>GUERRAS V / D</small></div><div><strong>{home.members.length}/{Math.min(30,10+2*g.level)}</strong><small>PILOTOS</small></div></div><label>XP da guilda · {g.xp} / {g.level*200}<progress max={g.level*200} value={g.xp} /></label></section>
  <section className="mc-net-card"><h2>Pilotos do clã</h2><Notice error={error} />{home.members.map(m=><div className="mc-net-member" key={m.userId}><div className="mc-net-heading"><button onClick={()=>onProfile(m.userId)}>{m.name}</button><small>{role(m.role)}</small></div><p>{m.contribution} CONTRIB. · {m.warPoints} PTS GUERRA · {number(m.bossDamage)} DANO RAID · {m.duelWins}/{m.duelLosses} ARENA</p>
      {m.userId!==me.userId && (me.role==="leader" || (me.role==="officer" && m.role==="member")) && <div className="mc-net-actions">{me.role==="leader" && <><button disabled={busy} onClick={()=>manage(m.userId,m.role==="officer"?"member":"officer")}>{m.role==="officer"?"REBAIXAR":"PROMOVER"}</button><button disabled={busy} onClick={()=>setConfirm({target:m.userId,action:"transfer"})}>TRANSFERIR LIDERANÇA</button></>}<button disabled={busy} onClick={()=>setConfirm({target:m.userId,action:"kick"})}>REMOVER</button></div>}
    </div>)}<button onClick={()=>setConfirm({target:me.userId,action:"leave"})}>SAIR DA GUILDA</button>{confirm && <div className="mc-net-actions"><span>{confirm.action==="leave" && me.role==="leader" && home.members.length===1 ? "DISSOLVER A GUILDA?" : "CONFIRMAR AÇÃO?"}</span><button className="mc-net-primary" disabled={busy} onClick={()=>manage(confirm.target,confirm.action)}>CONFIRMAR</button><button disabled={busy} onClick={()=>setConfirm(null)}>CANCELAR</button></div>}</section>
    {home.requests.length>0 && <section className="mc-net-card"><h2>Pedidos de entrada</h2>{home.requests.map(r=><div className="mc-net-list-button" key={r.id}><button onClick={()=>onProfile(r.userId)}>{r.name}</button><div className="mc-net-actions"><button disabled={busy} onClick={()=>void run(()=>guildApi.decide({target:r.userId,accept:true}))}>ACEITAR</button><button disabled={busy} onClick={()=>void run(()=>guildApi.decide({target:r.userId,accept:false}))}>RECUSAR</button></div></div>)}</section>}
    <DefensePanel key={me.userId} defense={me.defense} refresh={refresh} />
  </>;
}
