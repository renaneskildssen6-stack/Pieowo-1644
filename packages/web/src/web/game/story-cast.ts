/**
 * Elenco das Sagas II–III e dos Contos de Aurora.
 * Lado "left" = aliado (retrato à esquerda na cena); "right" = rival/antagonista.
 */
export interface CastSpeaker { name: string; portrait?: string; side: "left" | "right"; tone: string; role?: string }

const npc = (n: string) => `/story/npc-${n}.webp`;
const bust = (id: string) => `/busts/${id}_bust.png`;

export const CAST = {
  // --- humanos (retratos inéditos)
  kael: { name: "KAEL VOSS", portrait: npc("kael"), side: "right", tone: "#ff5b3d", role: "Ex-campeão de Aurora. Rival." },
  seraphine: { name: "IMPERATRIZ SERAPHINE", portrait: npc("seraphine"), side: "right", tone: "#ff6be8", role: "Soberana do Império de Vésper, selada há séculos." },
  otto: { name: "DR. OTTO BRANDT", portrait: npc("otto"), side: "left", tone: "#7dff8a", role: "Inventor recluso. Criou algo que não devia." },
  mira: { name: "MIRA “PIXEL”", portrait: npc("mira"), side: "left", tone: "#3ff0d8", role: "Hacker do Mercado Subterrâneo." },
  juno: { name: "CAPITÃ JUNO", portrait: npc("juno"), side: "left", tone: "#ffc44d", role: "Pirata do céu, comandante da frota Vento-Livre." },
  condutor: { name: "O CONDUTOR", portrait: npc("condutor"), side: "right", tone: "#ff3348", role: "IA da Guerra Fundadora. Quer afinar o mundo." },
  haru: { name: "MESTRE HARU", portrait: npc("haru"), side: "left", tone: "#e8c27a", role: "Último mestre do Dojo da Montanha." },
  iris: { name: "ÍRIS, A ORÁCULO", portrait: npc("iris"), side: "left", tone: "#c8b6ff", role: "Lê a partitura do destino." },
  // --- mechas e criaturas (bustos)
  kagemaru: { name: "KAGEMARU · MECHA DE KAEL", portrait: bust("kagemaru"), side: "right", tone: "#ff7a5c", role: "Lâmina-sombra de Kael." },
  shogunplate: { name: "SHOGUN PLATE", portrait: bust("shogunplate"), side: "right", tone: "#d9a35b", role: "Guardião ancestral do dojo." },
  crimsonaria: { name: "CRIMSON ARIA · GUARDA IMPERIAL", portrait: bust("crimsonaria"), side: "right", tone: "#ff3d6e", role: "Campeã da Imperatriz." },
  tempestcrown: { name: "TEMPEST CROWN · ARAUTO", portrait: bust("tempestcrown"), side: "right", tone: "#b48cff", role: "Arauto da Coroa Fraturada." },
  cindercrown: { name: "CINDER CROWN · MECHA IMPERIAL", portrait: bust("cindercrown"), side: "right", tone: "#ff9a3d", role: "O corpo de guerra de Seraphine." },
  clockthrone: { name: "CLOCK THRONE · 1º MOVIMENTO", portrait: bust("clockthrone"), side: "right", tone: "#e0b24a", role: "Primeiro movimento da sinfonia." },
  boneorchestra: { name: "BONE ORCHESTRA · 2º MOVIMENTO", portrait: bust("boneorchestra"), side: "right", tone: "#d6d0c2", role: "Segundo movimento da sinfonia." },
  aetherbell: { name: "AETHER BELL · 3º MOVIMENTO", portrait: bust("aetherbell"), side: "right", tone: "#8fe3ff", role: "Terceiro movimento da sinfonia." },
  cathedron: { name: "CATHEDRON · CORPO DO CONDUTOR", portrait: bust("cathedron"), side: "right", tone: "#ff4040", role: "A catedral que anda." },
  gearwidow: { name: "GEAR WIDOW", portrait: bust("gearwidow"), side: "right", tone: "#c58a4a", role: "Tece cabos como teias." },
  sirenfall: { name: "SIRENFALL", portrait: bust("sirenfall"), side: "right", tone: "#5ad8ff", role: "Canta para afundar cargueiros." },
  scrapbaron: { name: "BARÃO DA SUCATA", portrait: bust("scrapbaron"), side: "right", tone: "#c9813a", role: "Irmão do Rei. Muito mais ganancioso." },
  dicelord: { name: "LORD DOS DADOS", portrait: bust("npc_dicelord"), side: "right", tone: "#ffe066", role: "Aposta núcleos de robôs." },
  minotaur: { name: "MINOTAURO MUSGO", portrait: bust("npc_minotaur"), side: "right", tone: "#8ad46a", role: "Guardião do labirinto-jardim." },
  lanternghast: { name: "FANTASMA-LANTERNA", portrait: bust("lanternghast"), side: "right", tone: "#9dffcf", role: "Espera um piloto que não volta." },
  skyforgewing: { name: "SKYFORGE WING · NAVE DE JUNO", portrait: bust("skyforgewing"), side: "left", tone: "#ffd27a", role: "Asa de forja da frota Vento-Livre." },
  circuitmonk: { name: "MONGE DE CIRCUITO", portrait: bust("circuitmonk"), side: "right", tone: "#79f2b0", role: "Guardião do protótipo proibido." },
  mirrorage: { name: "MIRRORAGE · NOBRE DE CRISTAL", portrait: bust("mirrorage"), side: "right", tone: "#c9a7ff", role: "Dança na corte de Vésper há três séculos." },
  ironsentinel: { name: "IRON SENTINEL · GUARDA DE AURORA", portrait: bust("ironsentinel"), side: "right", tone: "#9fb4c8", role: "Sentinela da cidade, afinada pela melodia." },
  nebulaseer: { name: "NEBULA SEER", portrait: bust("nebulaseer"), side: "right", tone: "#a98cff", role: "Lê estrelas para Íris." },
  titanforge: { name: "TITAN FORGE · PORTEIRO DA TORRE", portrait: bust("titanforge"), side: "right", tone: "#ff8a3d", role: "Forja e guarda a Torre de Engrenagens." },
  magnetarch: { name: "MAGNETARCH · A BATUTA", portrait: bust("magnetarch"), side: "right", tone: "#ff4d6d", role: "A batuta viva do Condutor." },
  cobaltronin: { name: "COBALT RONIN", portrait: bust("cobaltronin"), side: "right", tone: "#5aa8ff", role: "Primeiro mecha de Kael." },
  hollowseer: { name: "VIDENTE OCO", portrait: bust("hollowseer"), side: "right", tone: "#b9a4ff", role: "Sentinela do templo de Íris." },
} satisfies Record<string, CastSpeaker>;

export type CastId = keyof typeof CAST;

/** Humanos aliados ficam à esquerda; todos os outros com side "left" também. */
export const CAST_ALLIES = (Object.keys(CAST) as CastId[]).filter((k) => CAST[k].side === "left");
