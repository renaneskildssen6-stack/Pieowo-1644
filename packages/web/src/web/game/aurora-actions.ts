import { getState, setState } from './save';
import { capacity, costTo, priceOf, requirements, routeBlock, SITES, SIGNAL, type Aurora, type Module, type Signal, type Site } from './vespera';

const update = (aurora: Aurora, gold = 0) => setState(s=>({...s,aurora,gold:s.gold+gold}));
export function improve(module: Module) {
  const {aurora:a,gold}=getState(), price=priceOf(a,module);
  if (!price || a.mission || !requirements(a,module) || gold<price[0] || a.ore<price[1]) return false;
  update({...a,[module]:a[module]+1,ore:a.ore-price[1]},-price[0]);
  return true;
}
export function launch() {
  const a=getState().aurora;
  if(a.mission) return false;
  update({...a,mission:{site:'landing',charge:capacity(a),ore:0,gold:0}});
  return true;
}
export function traverse(site: Site) {
  const a=getState().aurora, m=a.mission;
  if(!m||routeBlock(a,site)) return false;
  update({...a,mission:{...m,site,charge:m.charge-costTo(a,site)}});
  return true;
}
export function survey() {
  const a=getState().aurora, m=a.mission;
  if(!m||m.site==='landing'||a.surveyed.includes(m.site)) return false;
  const {ore,gold}=SITES[m.site];
  update({...a,surveyed:[...a.surveyed,m.site],mission:{...m,ore:m.ore+ore,gold:m.gold+gold}});
  return true;
}
export function decode(sequence: Signal[]) {
  const a=getState().aurora;
  if(a.mission?.site!=='relay'||!a.surveyed.includes('relay')||a.decoded||sequence.length!==SIGNAL.length||!SIGNAL.every((x,i)=>sequence[i]===x)) return false;
  update({...a,decoded:true});
  return true;
}
export function establishOutpost() {
  const a=getState().aurora,m=a.mission;
  if(!m||m.site!=='relay'||!a.surveyed.includes('relay')||a.outpost||a.ore+m.ore<2) return false;
  const onBoard=Math.min(2,m.ore);
  update({...a,outpost:true,ore:a.ore-(2-onBoard),mission:{...m,ore:m.ore-onBoard,charge:capacity(a)}});
  return true;
}
export function recharge() {
  const a=getState().aurora,m=a.mission;
  if(!m||!(m.site==='landing'||m.site==='relay'&&a.outpost)||m.charge===capacity(a)) return false;
  update({...a,mission:{...m,charge:capacity(a)}});
  return true;
}
export function dock(rescue = false) {
  const a=getState().aurora,m=a.mission;
  if(!m||(!rescue&&m.site!=='landing')) return false;
  // Rescue drops half the gold, never the irreplaceable upgrade material.
  update({...a,ore:a.ore+m.ore,flights:a.flights+1,mission:null},rescue?Math.floor(m.gold/2):m.gold);
  return true;
}

export function finishCircuit() {
  const a=getState().aurora;
  if(a.circuit) return false;
  update({...a,circuit:true},300);
  return true;
}
