import { useState } from "react";
import { Notice, number, RobotPick, useNetworkAction, when } from "@/components/network-ui";
import { guildApi, useGuildRooms, useGuildStatus } from "@/queries/guild";
import { CATALOG_IDS, faceUrl, ROBOT_MAP } from "@/game/robots";
import { getState } from "@/game/save";

type Status = NonNullable<ReturnType<typeof useGuildStatus>["data"]>;
const seeded = () => [...new Set([...getState().team.filter(id => CATALOG_IDS.includes(id)), ...CATALOG_IDS])].slice(0, 4);
export function WarPanel({ s, searching, staff, refresh, fight }: { s: Status; searching: boolean; staff: boolean; refresh: () => void; fight: (id:string) => void }) {
  const {run,busy,error} = useNetworkAction(refresh), [team,setTeam] = useState(seeded), [target,setTarget] = useState("");
  const defender = s.targets.some(t => t.id === target) ? target : s.targets[0]?.id ?? "";
  const w = s.war, canAttack = w && w.starts >= s.me.joined && w.ends - s.now >= 60000;
  return <><section className="mc-net-card">
    <div className="mc-net-heading"><div><small>OPERAÇÃO ASSÍNCRONA / 24H</small><h2>Guerra de Guildas</h2></div><span className="mc-net-pill">{w ? "EM ANDAMENTO" : searching ? "BUSCANDO RIVAL" : "SEM GUERRA"}</span></div>
    {w ? <><div className="mc-net-score"><div><small>[{w.tagA}]</small><b>{w.nameA}</b><strong>{w.scoreA}</strong></div><i>VS</i><div><small>[{w.tagB}]</small><b>{w.nameB}</b><strong>{w.scoreB}</strong></div></div><p>Encerra em {when(w.ends)} · {s.warLeft}/3 investidas restantes.</p>
      <p>Defesas controladas pela IA. Vitória vale +3 pontos. Monte uma equipe de três robôs.</p>
      {s.targets.length > 0 && <label>Defensor rival<select value={defender} onChange={e=>setTarget(e.target.value)}>{s.targets.map(t=><option value={t.id} key={t.id}>{t.name}{t.custom ? " · Defesa registrada" : " · Defesa padrão"}</option>)}</select></label>}
      <TeamPicks team={team} setTeam={setTeam} size={3} />
      <button className="mc-net-primary" disabled={busy || !canAttack || !defender || s.warLeft <= 0 || !!s.activeMatch} onClick={() => void run(() => guildApi.attack({kind:"war",team:team.slice(0,3),target:defender}), r => fight(r.matchId))}>ATACAR DEFESA</button>
    </> : <><p>A guerra começa quando outra guilda entra na fila. Vitórias valem troféus e XP para o clã.</p>{staff && <button className="mc-net-primary" disabled={busy} onClick={() => void run(() => guildApi.war({search:!searching}))}>{searching ? "CANCELAR BUSCA" : "BUSCAR GUILDA RIVAL"}</button>}</>}
    <Notice error={error} />
  </section><section className="mc-net-card"><h2>Histórico de guerras</h2>{!s.history.length && <p>Nenhuma guerra concluída.</p>}{s.history.map(w => <div className="mc-net-list-button" key={w.id}><span>[{w.tagA}] {w.scoreA} × {w.scoreB} [{w.tagB}]</span><small>{w.winner ? w.winner === s.me.guildId ? "VITÓRIA" : "DERROTA" : "EMPATE"} · {when(w.ends)}</small></div>)}</section></>;
}
export function BossPanel({ s, refresh, fight }: { s: Status; refresh: () => void; fight: (id:string) => void }) {
  const {run,busy,error} = useNetworkAction(refresh), [team,setTeam] = useState(seeded), [size,setSize] = useState(3);
  const b = s.boss;
  return <><section className="mc-net-card mc-net-boss"><div className="mc-net-identity"><img src={faceUrl(b.robot)} alt="" /><div><small>RAID SEMANAL · SETOR {b.tier}</small><h2>TITÃ DA GUILDA</h2><p>{ROBOT_MAP[b.robot]?.name ?? b.robot}</p></div></div>
    <label>Vida compartilhada · {number(b.hp)} / {number(b.maxHp)}<progress max={b.maxHp} value={b.hp} /></label><p>{s.bossLeft}/3 ataques hoje · {b.kills} Titãs destruídos nesta semana.</p><p>O dano ao Titã conta mesmo se você perder. Ao derrotá-lo, a guilda recebe XP e abre um setor mais difícil.</p>
    <label>Tamanho do esquadrão<select value={size} onChange={e=>setSize(+e.target.value)}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n === 1 ? "robô" : "robôs"}</option>)}</select></label>
    <TeamPicks team={team} setTeam={setTeam} size={size} /><button className="mc-net-primary" disabled={busy || !s.bossLeft || !!s.activeMatch} onClick={()=>void run(()=>guildApi.attack({kind:"boss",team:team.slice(0,size)}),r=>fight(r.matchId))}>ATACAR TITÃ</button><Notice error={error} />
  </section><section className="mc-net-card"><h2>Seus ataques de hoje</h2>{!s.log.some(b=>b.kind === "boss") && <p>Nenhum ataque registrado hoje.</p>}{s.log.filter(b=>b.kind === "boss").map(b=><div className="mc-net-list-button" key={b.matchId}><span>{when(b.created)}</span><small>{b.settled ? `${number(b.value)} DE DANO AO TITÃ` : "EM ANDAMENTO"}</small></div>)}</section></>;
}
export function DefensePanel({ defense, refresh }: { defense: string; refresh: () => void }) {
  const [team,setTeam]=useState(() => defense === "[]" ? seeded().slice(0,3) : JSON.parse(defense) as string[]), [saved,setSaved]=useState(false);
  const {run,busy,error}=useNetworkAction(refresh);
  return <section className="mc-net-card"><h2>Defesa de guerra</h2><p>A IA comanda seus três robôs quando a guilda rival ataca.</p><TeamPicks team={team} setTeam={a=>{setSaved(false);setTeam(a);}} size={3} /><button disabled={busy} onClick={()=>void run(()=>guildApi.defense({team}),()=>setSaved(true))}>REGISTRAR DEFESA</button><Notice error={error}/>{saved && <p role="status">Defesa registrada.</p>}</section>;
}
function TeamPicks({ team, setTeam, size }: { team:string[]; setTeam:(a:string[])=>void; size:number }) {
  return <div className="mc-net-team">{team.slice(0,size).map((id,i)=><RobotPick key={i} value={id} label={`ROBÔ ${i+1}`} excluded={team.filter((_,n)=>n!==i)} onChange={next=>setTeam(team.map((v,n)=>n===i?next:v))} />)}</div>;
}
export function ArenaPanel({ id, activeMatch, refresh, fight }: { id:string; activeMatch:string|null; refresh:()=>void; fight:(id:string)=>void }) {
  const rooms = useGuildRooms(true), [robot,setRobot] = useState(seeded()[0]);
  const mine = rooms.data?.find(r=>r.seats.some(s=>s?.id === id));
  const {run,busy,error} = useNetworkAction(()=>{void rooms.refetch();refresh();});
  return <><section className="mc-net-card"><h2>Arena interna</h2><p>Desafie pilotos da sua guilda em tempo real. No 2×2, a IA preenche as vagas desde que haja um piloto em cada lado.</p><RobotPick label="Seu robô" value={robot} onChange={setRobot} />
    <div className="mc-net-actions">{mine ? <button disabled={busy} onClick={()=>void run(()=>guildApi.leave())}>SAIR DA SALA</button> : <><button className="mc-net-primary" disabled={busy || !!activeMatch} onClick={()=>void run(()=>guildApi.open({mode:"x1",robot}))}>CRIAR X1</button><button disabled={busy || !!activeMatch} onClick={()=>void run(()=>guildApi.open({mode:"x2",robot}))}>CRIAR X2</button></>}</div><Notice error={error || rooms.error} />
  </section>{!rooms.data?.length && <p className="mc-net-muted">Nenhuma sala aguardando pilotos.</p>}{rooms.data?.map(r=>{
    const split = r.seats.length / 2, hasRivals = r.seats.slice(0,split).some(Boolean) && r.seats.slice(split).some(Boolean);
    return <section className="mc-net-card" key={r.id}><div className="mc-net-heading"><h2>{r.mode.toUpperCase()} · {r.seats.find(s=>s?.id===r.hostId)?.name ?? "PILOTO"}</h2><span className="mc-net-pill">{r.seats.filter(Boolean).length}/{r.seats.length}</span></div>
      <div className="mc-net-team">{r.seats.map((s,index)=><button key={index} disabled={busy || !!activeMatch || (!!s && s.id !== id)} onClick={()=>void run(()=>guildApi.seat({id:r.id,index,robot}))}><small>{index < split ? "AZUL" : "VERMELHO"}</small><br />{s ? `${s.name} · ${ROBOT_MAP[s.robot]?.name ?? s.robot}` : "OCUPAR VAGA"}</button>)}</div>
      {r.hostId===id && <button className="mc-net-primary" disabled={busy || !hasRivals || !!activeMatch} onClick={()=>void run(()=>guildApi.start({id:r.id}),data=>fight(data.matchId))}>INICIAR DUELO</button>}
    </section>;
  })}</>;
}
