export const SITES = {
  landing: { name: 'Pouso Aurora', kind: 'Área segura', x: 95, y: 250, cost: 0, tier: 1, ore: 0, gold: 0, log: '', desc: 'Sua nave está no platô. Volte aqui para decolar, guardar amostras ou recarregar.' },
  salt: { name: 'Mar de Sal Negro', kind: 'Planície mineral', x: 223, y: 317, cost: 1, tier: 1, ore: 2, gold: 90, log: 'O sal é negro só na superfície. Sob a crosta, os cristais conduzem mais energia que os cabos da Aurora.', desc: 'A crosta crepita sob os pés. Cristais negros crescem nos canais secos.' },
  echo: { name: 'Desfiladeiro do Eco', kind: 'Anomalia acústica', x: 251, y: 158, cost: 1, tier: 1, ore: 2, gold: 90, log: 'O eco chegou antes do ruído. Deixamos um relógio no desfiladeiro para medir o atraso.', desc: 'Ravinas azuladas devolvem o som na ordem errada. Há uma amostra no fundo.' },
  relay: { name: 'Farol Desativado', kind: 'Ruína de navegação', x: 390, y: 224, cost: 1, tier: 1, ore: 3, gold: 120, log: 'A torre ainda transmitia. A sequência de luzes aponta para uma fenda dentro da caldeira.', desc: 'Uma velha antena repete três sinais luminosos. Aqui você pode instalar um posto de recarga.' },
  reef: { name: 'Recife Suspenso', kind: 'Campo gravitacional', x: 463, y: 107, cost: 2, tier: 2, ore: 4, gold: 160, log: 'As lâminas de pedra flutuam alinhadas ao campo magnético. Desligar o motor por um instante bastou para atravessar.', desc: 'Placas de basalto pairam acima do solo. Exige motor orbital nível 2.' },
  storm: { name: 'Caldeira Rubra', kind: 'Tempestade térmica', x: 526, y: 299, cost: 2, tier: 1, ore: 4, gold: 180, log: 'Na caldeira, a blindagem ficou incandescente. No epicentro encontramos poeira de um material que não existe na cidade.', desc: 'Ventos abrasivos cercam a caldeira. Exige blindagem térmica nível 1.' },
  vault: { name: 'Câmara do Horizonte', kind: 'Vestígio extrassolar', x: 665, y: 192, cost: 2, tier: 2, ore: 6, gold: 350, log: 'A câmara guarda um mapa do céu visto de outro sistema. As estrelas não batem com nenhum catálogo da Aurora.', desc: 'A porta responde às coordenadas do Farol. Exige o sinal decifrado e motor orbital nível 2.' },
} as const;
export type Site = keyof typeof SITES;
export const SITE_IDS = Object.keys(SITES) as Site[];
export const ROUTES: [Site, Site][] = [['landing','salt'],['landing','echo'],['salt','relay'],['echo','relay'],['relay','reef'],['relay','storm'],['reef','vault'],['storm','vault']];
export const adjacent = (from: Site, to: Site) => ROUTES.some(([a,b]) => (a===from&&b===to)||(a===to&&b===from));
export const SIGNAL = ['onda','pulso','estrela'] as const;
export type Signal = typeof SIGNAL[number];
export const MODULES = {
  command: { name: 'Comando da base', desc: 'Libera instalações avançadas. Nível 3 permite motor orbital nível 3 e blindagem nível 2.', prices: [[350,2],[650,5]] },
  drive: { name: 'Motor orbital', desc: 'Nível 2 alcança regiões distantes. Cada nível adicional aumenta a bateria de exploração em 2.', prices: [[250,2],[450,4]] },
  shield: { name: 'Blindagem térmica', desc: 'Nível 1 abre a Caldeira Rubra. No nível 2 entrar nela custa só 1 carga.', prices: [[200,2],[320,3]] },
} as const;
export type Module = keyof typeof MODULES;
export interface Aurora {
  command: number; drive: number; shield: number; ore: number;
  surveyed: Site[]; outpost: boolean; decoded: boolean; flights: number; circuit: boolean;
  mission: { site: Site; charge: number; ore: number; gold: number } | null;
}
export const freshAurora = (): Aurora => ({ command: 1, drive: 1, shield: 0, ore: 0, surveyed: [], outpost: false, decoded: false, flights: 0, circuit: false, mission: null });
export const capacity = (s: Aurora) => 4 + 2 * (s.drive - 1);
export const priceOf = (s: Aurora, m: Module) => MODULES[m].prices[s[m] - (m==='shield'?0:1)];
export const requirements = (s: Aurora, m: Module) => m==='command' || s.command >= s[m] + (m==='shield'?2:1);
const isSite = (x: unknown): x is Site => typeof x==='string' && SITE_IDS.includes(x as Site);
export function normalizeAurora(raw?: Partial<Aurora>): Aurora {
  const n = (v: unknown, min: number, max: number) => typeof v==='number' && Number.isFinite(v) ? Math.max(min,Math.min(max,Math.floor(v))) : min;
  const base = freshAurora();
  if (!raw || typeof raw!=='object') return base;
  const command=n(raw.command,1,3), drive=n(raw.drive,1,command), shield=n(raw.shield,0,command-1);
  const surveyed=Array.isArray(raw.surveyed)?[...new Set(raw.surveyed.filter((x)=>isSite(x)&&x!=='landing'))]:[];
  const mission=raw.mission;
  return { command,drive,shield,surveyed,circuit:raw.circuit===true,ore:n(raw.ore,0,999),outpost:raw.outpost===true&&surveyed.includes('relay'),decoded:raw.decoded===true&&surveyed.includes('relay'),flights:n(raw.flights,0,99999),mission:mission&&isSite(mission.site)?{site:mission.site,charge:n(mission.charge,0,capacity({...base,drive})),ore:n(mission.ore,0,21),gold:n(mission.gold,0,990)}:null };
}
export const costTo = (s: Aurora, site: Site) => site==='storm'&&s.shield===2?1:site==='landing'?1:SITES[site].cost;
export function routeBlock(s: Aurora, target: Site): string {
  const run=s.mission;
  if (!run) return 'Nenhuma expedição ativa.';
  if (run.site===target) return 'Você está aqui.';
  if (!adjacent(run.site,target)) return 'Sem rota direta. Passe pelo setor vizinho.';
  if (s.drive<SITES[target].tier) return 'Requer motor orbital nível 2.';
  if (target==='storm'&&!s.shield) return 'Requer blindagem térmica nível 1.';
  if (target==='vault'&&!s.decoded) return 'Decifre o sinal no Farol Desativado.';
  if (run.charge<costTo(s,target)) return 'Bateria insuficiente. Use o resgate se não houver rota de volta.';
  return '';
}
