import { useEffect, useRef, useState } from 'react';
import { decode, dock, establishOutpost, improve, launch, recharge, survey, traverse } from '@/game/aurora-actions';
import { useGame } from '@/game/save';
import { adjacent, capacity, costTo, MODULES, priceOf, requirements, routeBlock, SITE_IDS, SITES, SIGNAL, type Module, type Signal, type Site } from '@/game/vespera';
import { VesperaMap, VesperaOrbit } from './vespera-map';

export type AuroraPanel = 'command'|'orbital'|'archive';
const moduleKeys = Object.keys(MODULES) as Module[];
const destinations = SITE_IDS.filter(s=>s!=='landing');
const symbols: Record<Signal,string> = { onda:'≈ Onda', pulso:'◇ Pulso', estrela:'✦ Estrela' };

export function AuroraConsole({panel,onClose,onPanel}:{panel:AuroraPanel;onClose:()=>void;onPanel:(panel:AuroraPanel)=>void}) {
 const {aurora:a,gold}=useGame();
 const [notice,setNotice]=useState('');
 const back=useRef<HTMLButtonElement>(null);
 const scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{back.current?.focus();scroll.current?.scrollTo(0,0);setNotice('');},[panel]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[onClose]);
 const perform=(fn:()=>boolean,msg:string)=>{if(fn()){setNotice(msg);return true}setNotice('Operação indisponível. Confira os requisitos.');return false};
 return <section className="mc-aurora" aria-label={panel==='orbital'?'Hangar orbital':panel==='archive'?'Arquivo de Véspera':'Comando da base'}>
  <header><button data-skin="none" ref={back} onClick={onClose}>← CASA</button><strong>{panel==='orbital'?a.mission?'SUPERFÍCIE V-09':'HANGAR ORBITAL':panel==='archive'?'ARQUIVO DE VÉSPERA':'COMANDO DA BASE'}</strong><span>{a.ore} FRAG.<br/>{gold} OURO</span></header>
  <div className="au-scroll" ref={scroll}><div className="au-inner">
   {notice&&<p className="au-note" role="status">{notice}</p>}
   {panel==='command'&&<>
    <div className="au-hero au-home-hero"><span className="au-kicker">INSTALAÇÃO PRIVADA · SETOR 01</span><h2>Base Aurora</h2><p>Fragmentos trazidos de Véspera alimentam a base. Melhore a nave e a blindagem para explorar além do platô.</p></div>
    <div className="au-stat"><span>BASE NÍVEL {a.command}</span><span>BATERIA {capacity(a)} CARGAS</span><span>{a.outpost?'POSTO AVANÇADO ATIVO':'POSTO AVANÇADO NÃO INSTALADO'}</span></div>
    {a.mission&&<p className="au-note">Recolha a nave antes de instalar melhorias.</p>}
    {moduleKeys.map(m=>{
      const item=MODULES[m], price=priceOf(a,m), available=requirements(a,m);
      return <article className="au-row" key={m}><div><h3>{item.name} <strong>· NV {a[m]}</strong></h3><p>{item.desc}</p>{price&&<small>{price[0]} ouro + {price[1]} fragmentos{!available?` · requer base nível ${a[m]+(m==='shield'?2:1)}`:''}</small>}</div><button data-skin="none" disabled={!price||!available||!!a.mission||gold<price[0]||a.ore<price[1]} onClick={()=>perform(()=>improve(m),`${item.name}: melhoria instalada.`)}>{price?`MELHORAR ${item.name.toUpperCase()}`:'NÍVEL MÁXIMO'}</button></article>;
    })}
    <div className="au-detail"><h3>Circuito Aurora</h3><p>{a.circuit?'Seis núcleos recolhidos. Distintivo no arquivo.':'Colete os seis núcleos espalhados pela casa para ganhar 300 ouro uma vez. Use o especial para atrair núcleos próximos.'}</p></div>
    <div className="au-actions"><button data-skin="none" onClick={()=>onPanel('orbital')}>{a.mission?'RETOMAR EXPEDIÇÃO':'ABRIR HANGAR ORBITAL'}</button><button data-skin="none" onClick={()=>onPanel('archive')}>VER ARQUIVO DE VÉSPERA</button></div>
   </>}
   {panel==='archive'&&<>
    <div className="au-hero au-home-hero"><span className="au-kicker">REGISTRO PESSOAL · {a.surveyed.length}/{destinations.length} DESCOBERTAS</span><h2>Arquivo de Véspera</h2><p>O diário registra o que você encontrou em cada setor. As notas ficam mesmo após um resgate.</p></div>
    <div className="au-stat"><span>{a.flights} RETORNOS À BASE</span><span>{a.decoded?'SINAL DECIFRADO':'SINAL NÃO DECIFRADO'}</span>{a.circuit&&<span>✦ CIRCUITO AURORA CONCLUÍDO</span>}{a.surveyed.length===destinations.length&&<span>✦ DISTINTIVO CARTÓGRAFO DE VÉSPERA</span>}</div>
    {destinations.map((site,i)=><article className="au-detail" key={site}><span className="au-kicker">REGISTRO 0{i+1} · {a.surveyed.includes(site)?'CATALOGADO':'NÃO CATALOGADO'}</span><h3>{SITES[site].name}</h3><p>{a.surveyed.includes(site)?SITES[site].log:'Analise este setor na superfície para revelar a descoberta.'}</p></article>)}
    <button data-skin="none" onClick={()=>onPanel('orbital')}>ABRIR HANGAR ORBITAL</button>
   </>}
   {panel==='orbital'&&(a.mission?<Surface key="surface" perform={perform}/>:<>
    <div className="au-hero au-orbital"><VesperaOrbit/><span className="au-kicker">DESTINO V-09 · CONSTELAÇÃO DA QUILHA</span><h2>Véspera</h2><p>Um planeta de sal negro, ruínas que ainda transmitem e rochas suspensas. O pouso é gratuito; o terreno cobra bateria.</p></div>
    <div className="au-stat"><span>7 SETORES MAPEADOS</span><span>{capacity(a)} CARGAS POR SAÍDA</span><span>MOTOR NV {a.drive}</span></div>
    <div className="au-detail"><h3>Plano de voo</h3><p>Parta de Pouso Aurora, siga as rotas e analise cada setor. Volte ao pouso para trazer a carga inteira à base. Um resgate de emergência preserva os fragmentos, mas perde metade do ouro embarcado.</p><div className="au-actions"><button data-skin="none" className="au-primary" onClick={()=>{if(perform(launch,'Pouso confirmado. Selecione um setor vizinho.'))scroll.current?.scrollTo(0,0)}}>DECOLAR PARA VÉSPERA →</button><button data-skin="none" onClick={()=>onPanel('command')}>MELHORIAS DA BASE</button></div></div>
   </>)}
  </div></div>
 </section>;
}

function Surface({perform}:{perform:(fn:()=>boolean,msg:string)=>boolean}) {
 const {aurora:a}=useGame();
 const m=a.mission;
 const [selected,setSelected]=useState<Site>(m?.site??'landing');
 const [code,setCode]=useState<Signal[]>([]);
 const [signalStatus,setSignalStatus]=useState('');
 if(!m) return null;
 const site=SITES[selected], current=m.site===selected, known=a.surveyed.includes(selected);
 const problem=routeBlock(a,selected), relay=m.site==='relay', landing=m.site==='landing';
 const move=()=>{if(perform(()=>traverse(selected),`Chegada: ${site.name}.`)){setCode([]);setSignalStatus('')}};
 return <>
  <div className="au-stat"><span>VÉSPERA · {SITES[m.site].name.toUpperCase()}</span><span>{a.surveyed.length}/6 ANÁLISES</span></div>
  <div className="au-detail"><label htmlFor="au-charge">Bateria do veículo · {m.charge}/{capacity(a)}</label><progress id="au-charge" value={m.charge} max={capacity(a)}/><p>Carga a bordo: {m.ore} fragmentos · {m.gold} ouro</p></div>
  <VesperaMap here={m.site} selected={selected} surveyed={a.surveyed} onSelect={setSelected}/>
  <p className="au-map-key">◆ Sua posição · ✓ Catalogado · Pontilhado: rota navegável</p>
  <div className="au-route-list" aria-label="Setores próximos">{[m.site,...SITE_IDS.filter(id=>adjacent(m.site,id))].map(id=><button data-skin="none" key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}>{SITES[id].name}</button>)}</div>
  <article className="au-detail">
   <span className="au-kicker">{site.kind} {known?'· CATALOGADO':''}</span><h3>{site.name}</h3><p>{site.desc}</p>
   {(!current||selected!=='landing')&&<div className="au-actions">{!current?<><button data-skin="none" className="au-primary" disabled={!!problem} onClick={move}>PERCORRER ROTA · {costTo(a,selected)} CARGA(S)</button>{problem&&<span className="au-muted">{problem}</span>}</>:<><button data-skin="none" className="au-primary" disabled={known} onClick={()=>perform(survey,`Análise concluída: +${site.ore} fragmentos e +${site.gold} ouro a bordo.`)}>{known?'SETOR ANALISADO':'ANALISAR SETOR'}</button>{!known&&<b>+{site.ore} frag. · +{site.gold} ouro</b>}</>}</div>}
   {current&&relay&&a.surveyed.includes('relay')&&<>
    {!a.outpost&&<div className="au-actions"><button data-skin="none" disabled={m.ore+a.ore<2} onClick={()=>perform(establishOutpost,'Posto ativado. Bateria recarregada.')}>INSTALAR POSTO · 2 FRAGMENTOS</button></div>}
    {!a.decoded?<div className="au-signal"><h4>Sinal interrompido</h4><p>Na base da antena: “O oceano chama, o coração responde, o céu encerra”. Repita os três sinais.</p><p aria-live="polite">Entrada: {code.length?code.map(s=>symbols[s]).join(' / '):'—'}</p><div className="au-actions">{SIGNAL.map(s=><button data-skin="none" key={s} disabled={code.length>=3} onClick={()=>{setCode([...code,s]);setSignalStatus('')}}>{symbols[s]}</button>)}</div><div className="au-actions"><button data-skin="none" disabled={code.length!==3} onClick={()=>{if(decode(code))setSignalStatus('');else{setCode([]);setSignalStatus('Frequência incorreta. Releia a pista.')}}}>TRANSMITIR</button><button data-skin="none" disabled={!code.length} onClick={()=>{setCode([]);setSignalStatus('')}}>LIMPAR</button></div>{signalStatus&&<p role="status">{signalStatus}</p>}</div>:<p className="au-note">Sinal decifrado. Coordenadas da Câmara do Horizonte registradas.</p>}
   </>}
   {current&&(landing||relay&&a.outpost)&&<div className="au-actions"><button data-skin="none" disabled={m.charge===capacity(a)} onClick={()=>perform(recharge,'Bateria cheia.')}>RECARREGAR</button>{landing&&<button data-skin="none" className="au-primary" onClick={()=>perform(()=>dock(),`Retorno completo: +${m.ore} fragmentos e +${m.gold} ouro na base.`)}>DECOLAR DE VOLTA À BASE</button>}</div>}
  </article>
  {!landing&&<details className="au-detail"><summary>Resgate de emergência</summary><p>Retorna à Aurora com todos os fragmentos e {Math.floor(m.gold/2)} dos {m.gold} ouros a bordo.</p><div className="au-actions"><button data-skin="none" onClick={()=>perform(()=>dock(true),'Resgate concluído. Fragmentos transferidos à base.')}>CONFIRMAR RESGATE</button></div></details>}
 </>;
}
