/**
 * NEXUS — 59 chassis EXCLUSIVOS do portal de invocação (gacha).
 *
 * Nunca saem de torneio, loja, contrato ou cápsula: `unlockRobot` e
 * `lockedRobotIds` os recusam (ver save.ts). Só `grantGachaRobot` os entrega.
 * Ficam fora de CATALOG_IDS (competitivo online usa o catálogo fixo).
 */
import { VFX, type SkillEffect } from "./skills";

export type GachaTier = "C" | "R" | "E" | "L" | "M";
type Arch = "tank" | "bruiser" | "speed" | "mage" | "bal";

export interface GachaBlueprint {
  id: string;
  name: string;
  element: string;
  rarity: "bronze" | "silver" | "gold";
  ratios: { hp: number; mp: number; str: number; def: number; ag: number; mv: number; xv: number };
  bio: string;
  vfxStrong: string;
  vfxSpecial: string;
  names: [string, string, string, string];
  effect: SkillEffect;
  tier: GachaTier;
}

export const TIER_ORDER: GachaTier[] = ["C", "R", "E", "L", "M"];
export const TIER_INFO: Record<GachaTier, { label: string; short: string; color: string; glow: string; stars: number }> = {
  C: { label: "COMUM", short: "C", color: "#b9c4d6", glow: "rgba(185,196,214,.55)", stars: 1 },
  R: { label: "RARO", short: "R", color: "#4fb6ff", glow: "rgba(79,182,255,.6)", stars: 2 },
  E: { label: "ÉPICO", short: "E", color: "#c070ff", glow: "rgba(192,112,255,.65)", stars: 3 },
  L: { label: "LENDÁRIO", short: "L", color: "#ffc93a", glow: "rgba(255,201,58,.7)", stars: 4 },
  M: { label: "MÍTICO", short: "M", color: "#ff5fd2", glow: "rgba(255,95,210,.75)", stars: 5 },
};

const BASE: Record<GachaTier, [number, number, number, number, number, number, number]> = {
  C: [108, 92, 104, 106, 96, 9, 10],
  R: [110, 104, 112, 106, 108, 11, 12],
  E: [114, 112, 120, 110, 112, 13, 14],
  L: [118, 120, 126, 114, 116, 15, 16],
  M: [124, 126, 132, 118, 120, 16, 17],
};
const ARCH: Record<Arch, [number, number, number, number, number]> = {
  tank: [12, -4, -4, 12, -10],
  bruiser: [6, -8, 8, 0, -4],
  speed: [-6, 0, 2, -8, 14],
  mage: [-6, 14, 2, -6, 0],
  bal: [0, 0, 0, 0, 0],
};
const EFFECT: Record<string, SkillEffect> = {
  FOGO: { type: "burn", power: 14, turns: 3, chance: 0.75 },
  TOXICO: { type: "poison", power: 16, turns: 3, chance: 0.75 },
  ELETRICO: { type: "paralyze", power: 0, turns: 2, chance: 0.5 },
  QUANTICO: { type: "paralyze", power: 0, turns: 2, chance: 0.5 },
  LUZ: { type: "blind", power: 25, turns: 3, chance: 0.75 },
  COSMICO: { type: "blind", power: 25, turns: 3, chance: 0.75 },
  CRISTAL: { type: "blind", power: 25, turns: 3, chance: 0.75 },
  SOMBRA: { type: "drain", power: 15, turns: 3, chance: 0.75 },
  ARCANO: { type: "drain", power: 15, turns: 3, chance: 0.75 },
  GELO: { type: "trapped", power: 0, turns: 3, chance: 0.5 },
  IMPACTO: { type: "weakening", power: 28, turns: 3, chance: 0.75 },
  PERFURACAO: { type: "weakening", power: 28, turns: 3, chance: 0.75 },
  METAL: { type: "damage_reduction", power: 30, turns: 3, chance: 0.75 },
  TERRA: { type: "damage_reduction", power: 30, turns: 3, chance: 0.75 },
  VENTO: { type: "adrenalin", power: 25, turns: 3, chance: 0.75 },
  LAMINA: { type: "adrenalin", power: 25, turns: 3, chance: 0.75 },
  AGUA: { type: "hp_regen", power: 14, turns: 3, chance: 0.75 },
  BIO: { type: "hp_regen", power: 14, turns: 3, chance: 0.75 },
};
const FX: Record<string, [string, string]> = {
  FOGO: [VFX.inferno, VFX.meteor], TOXICO: [VFX.toxic, VFX.curse], ELETRICO: [VFX.thunder, VFX.plasma],
  QUANTICO: [VFX.chrono, VFX.void], LUZ: [VFX.laser, VFX.prism], COSMICO: [VFX.cosmos, VFX.meteor],
  CRISTAL: [VFX.prism, VFX.frost], SOMBRA: [VFX.void, VFX.siphon], ARCANO: [VFX.curse, VFX.siphon],
  GELO: [VFX.frost, VFX.cyclone], IMPACTO: [VFX.impact, VFX.shockwave], PERFURACAO: [VFX.slash, VFX.impact],
  METAL: [VFX.clang, VFX.ward], TERRA: [VFX.quake, VFX.shield], VENTO: [VFX.cyclone, VFX.sonic],
  LAMINA: [VFX.slash, VFX.sonic], AGUA: [VFX.torrent, VFX.heal], BIO: [VFX.bloom, VFX.heal],
};

function g(
  id: string, name: string, element: string, tier: GachaTier, arch: Arch, bio: string,
  names: [string, string, string, string],
): GachaBlueprint {
  const t = TIER_ORDER.indexOf(tier);
  const b = BASE[tier]; const a = ARCH[arch];
  const e = EFFECT[element];
  const fx = FX[element];
  return {
    id: `g_${id}`, name, element, tier,
    rarity: tier === "C" ? "bronze" : tier === "R" ? "silver" : "gold",
    ratios: { hp: b[0] + a[0], mp: b[1] + a[1], str: b[2] + a[2], def: b[3] + a[3], ag: b[4] + a[4], mv: b[5], xv: b[6] },
    bio, names,
    vfxStrong: fx[0], vfxSpecial: fx[1],
    effect: { ...e, power: e.power ? e.power + t * 3 : 0, chance: Math.min(0.95, +(e.chance + t * 0.04).toFixed(2)) },
  };
}

export const GACHA_BLUEPRINTS: GachaBlueprint[] = [
  // ——— COMUNS ———
  g("rivette", "RIVETTE", "METAL", "C", "tank", "Operário de rebites. Aperta parafusos no meio do combate.", ["CHAVE CERTEIRA", "REBITE RAPIDO", "PRENSA DE OFICINA", "CHAPA SOLDADA"]),
  g("emberkit", "EMBERKIT", "FOGO", "C", "speed", "Raposinha de brasa. A cauda vira tocha quando se irrita.", ["MORDIDA QUENTE", "CAUDA DE BRASA", "FAISCA FELINA", "PELO DE CINZA"]),
  g("frostpip", "FROSTPIP", "GELO", "C", "tank", "Pinguim de cristal. Escorrega e congela o chão por onde passa.", ["BICADA GELIDA", "ESCORREGAO", "NEVASCA MIUDA", "CASCA DE GELO"]),
  g("voltbug", "VOLTBUG", "ELETRICO", "C", "speed", "Besouro-bateria. Antenas que descarregam mil volts.", ["ZUMBIDO", "ANTENA VOLT", "CURTO-CIRCUITO", "CARAPACA ISOLANTE"]),
  g("mossguard", "MOSSGUARD", "BIO", "C", "tank", "Guardião de musgo. O escudo-folha cresce a cada golpe que leva.", ["GALHADA", "ESPORO", "RAIZ CURATIVA", "ESCUDO FOLHA"]),
  g("tidebolt", "TIDEBOLT", "AGUA", "C", "bal", "Canhão de maré portátil. Atira bolhas de alta pressão.", ["JATO CURTO", "BOLHA PRESSAO", "CANHAO DE MARE", "CORTINA D'AGUA"]),
  g("gravelon", "GRAVELON", "TERRA", "C", "tank", "Pedregulho ambulante. Punhos de rocha que não sentem dor.", ["SOCO DE PEDRA", "AVALANCHE", "TREMOR", "PELE DE ROCHA"]),
  g("galewing", "GALEWING", "VENTO", "C", "speed", "Pássaro-turbina. Corta o ar antes de você piscar.", ["RAJADA", "ASA CORTANTE", "REDEMOINHO", "VOO EVASIVO"]),
  g("spikeroo", "SPIKEROO", "PERFURACAO", "C", "bruiser", "Canguru-broca. Salta e perfura com a cauda espiral.", ["CHUTE BROCA", "SALTO ESPIRAL", "PERFURADOR", "GUARDA DE ESPINHO"]),
  g("toxipunk", "TOXIPUNK", "TOXICO", "C", "bruiser", "Punk dos canos. O moicano expele fumaça corrosiva.", ["CABECADA", "LATA TOXICA", "NUVEM PUNK", "COURO ACIDO"]),
  g("boltnut", "BOLTNUT", "METAL", "C", "tank", "Caixote de porcas e parafusos. Teimoso como aço.", ["PORCA VOADORA", "TORQUE", "PARAFUSAO", "ARRUELA ESCUDO"]),
  g("cinderpaw", "CINDERPAW", "FOGO", "C", "speed", "Gato de carvão. Patas em brasa deixam pegadas ardentes.", ["ARRANHAO", "PATA DE BRASA", "SALTO CINZA", "SETE VIDAS"]),
  g("sleetron", "SLEETRON", "GELO", "C", "bal", "Boneco de granizo. Braços de pingente afiados.", ["GRANIZO", "PINGENTE", "CHUVA DE NEVE", "MURO DE GEADA"]),
  g("zappo", "ZAPPO", "ELETRICO", "C", "mage", "Bobina Tesla com pernas. Sorri enquanto eletrocuta.", ["CHOQUINHO", "BOBINA", "ARCO TESLA", "CAMPO ESTATICO"]),
  g("sproutek", "SPROUTEK", "BIO", "C", "mage", "Broto de laboratório. A folha na cabeça faz fotossíntese de energia.", ["SEMENTE", "VINHA", "FLORADA", "FOTOSSINTESE"]),
  g("bubblor", "BUBBLOR", "AGUA", "C", "bal", "Escafandro de cúpula. Prende inimigos em bolhas.", ["BOLHINHA", "ARPAO", "BOLHA PRISAO", "CUPULA DE AR"]),
  g("pebblex", "PEBBLEX", "TERRA", "C", "tank", "Golem de seixos empilhados. Monta-se de novo quando cai.", ["SEIXO", "EMPILHADA", "DESLIZAMENTO", "REMONTAR"]),
  g("whirlo", "WHIRLO", "VENTO", "C", "speed", "Pilota o próprio tornado. Nunca toca o chão.", ["SOPRO", "GIRO", "TORNADO MIRIM", "OLHO DO VENTO"]),
  g("drillbit", "DRILLBIT", "PERFURACAO", "C", "bruiser", "Toupeira mineradora. Três brocas, zero paciência.", ["BROCADA", "TUNEL", "BROCA TRIPLA", "CASCO BLINDADO"]),
  g("smoggy", "SMOGGY", "TOXICO", "C", "tank", "Chaminé ambulante. Sua fumaça roxa enferruja tudo.", ["BAFORADA", "FULIGEM", "SMOG DENSO", "CORTINA DE FUMACA"]),
  // ——— RAROS ———
  g("katanax", "KATANAX", "LAMINA", "R", "speed", "Samurai carmesim. Um corte, uma sentença.", ["IAI", "CORTE CARMESIM", "MIL LAMINAS", "POSTURA KENJUTSU"]),
  g("lumenta", "LUMENTA", "LUZ", "R", "mage", "Sacerdotisa do prisma. O cajado concentra luz solar.", ["RAIO LUMEN", "CAJADO SOLAR", "AURORA SAGRADA", "VEU DE LUZ"]),
  g("nocturne", "NOCTURNE", "SOMBRA", "R", "speed", "Ninja da meia-noite. O cachecol roxo é a última coisa que se vê.", ["KUNAI", "PASSO SOMBRIO", "ECLIPSE NINJA", "MANTO NOTURNO"]),
  g("prismara", "PRISMARA", "CRISTAL", "R", "speed", "Duelista de cristal. Lâminas-prisma refratam cada golpe.", ["FACETA", "PRISMA DUPLO", "REFRACAO", "ESPELHO CRISTAL"]),
  g("hammerjaw", "HAMMERJAW", "IMPACTO", "R", "bruiser", "Brigão do martelo. Mandíbula de aço, temperamento de bigorna.", ["MARTELADA", "BIGORNA", "TERREMOTO DE FERRO", "GUARDA PESADA"]),
  g("quarklet", "QUARKLET", "QUANTICO", "R", "mage", "Orbitado por cubos de probabilidade. Existe em dois lugares.", ["CUBO", "SALTO QUANTICO", "COLAPSO DE ONDA", "SUPERPOSICAO"]),
  g("runebyte", "RUNEBYTE", "ARCANO", "R", "mage", "Mago-arquivista. Lê feitiços de um grimório digital.", ["RUNA", "PAGINA PROIBIDA", "GRIMORIO BINARIO", "SELO ARCANO"]),
  g("astrokid", "ASTROKID", "COSMICO", "R", "bal", "Cadete estelar. Jetpack, capacete-estrela e coragem demais.", ["PROPULSAO", "ESTRELA CADENTE", "SUPERNOVA MIRIM", "ESCUDO ORBITAL"]),
  g("coralance", "CORALANCE", "AGUA", "R", "bal", "Cavaleira dos recifes. A lança de coral nunca seca.", ["ESTOCADA", "LANCA CORAL", "MAREMOTO", "RECIFE VIVO"]),
  g("roninex", "RONINEX", "LAMINA", "R", "speed", "Ronin errante. Duas lâminas, nenhum mestre.", ["CORTE DUPLO", "VENTO RONIN", "DANCA DAS LAMINAS", "CHAPEU DE PALHA"]),
  g("halogen", "HALOGEN", "LUZ", "R", "bal", "Atirador-lâmpada. O rifle dispara feixes de halogênio.", ["FEIXE", "RIFLE LUMEN", "SOBRECARGA SOLAR", "REFLETOR"]),
  g("umbrafox", "UMBRAFOX", "SOMBRA", "R", "speed", "Raposa de nove sombras. Cada cauda é uma armadilha.", ["GARRA UMBRA", "CAUDA FANTASMA", "NOVE SOMBRAS", "ILUSAO"]),
  g("geode", "GEODE", "CRISTAL", "R", "tank", "Rocha rachada de ametistas. Brilha mais quando ferido.", ["LASCA", "AMETISTA", "EXPLOSAO GEODO", "CASCA DE QUARTZO"]),
  g("brawlkong", "BRAWLKONG", "IMPACTO", "R", "bruiser", "Gorila de arena. Bate no peito e o chão treme.", ["SOCO GORILA", "PUNHO DUPLO", "FURIA PRIMATA", "PEITO DE ACO"]),
  g("phasewalk", "PHASEWALK", "QUANTICO", "R", "speed", "Glitch ambulante. Deixa rastros de si mesmo no tempo.", ["DEFASAGEM", "RASTRO", "GLITCH TOTAL", "FORA DE FASE"]),
  g("hexweave", "HEXWEAVA", "ARCANO", "R", "mage", "Bruxa-tecelã. Costura maldições com fios de luz.", ["FIO HEX", "TEIA ARCANA", "MALDICAO TECIDA", "BORDADO PROTETOR"]),
  g("meteora", "METEORA", "COSMICO", "R", "bruiser", "Punhos de cometa. Cai do céu como um meteoro.", ["COMETA", "PUNHO METEORO", "CHUVA ESTELAR", "CROSTA ORBITAL"]),
  g("ironclad", "IRONCLAD", "METAL", "R", "tank", "Tanque-cavaleiro. O escudo-torre já parou exércitos.", ["GOLPE DE ESCUDO", "AVANCO BLINDADO", "MURALHA DE FERRO", "ESCUDO TORRE"]),
  // ——— ÉPICOS ———
  g("infernaut", "INFERNAUT", "FOGO", "E", "bruiser", "Juggernaut vulcânico. Respiradores de lava em todo o casco.", ["PUNHO MAGMA", "ERUPCAO", "CORACAO VULCANICO", "CASCO DE LAVA"]),
  g("glaciarch", "GLACIARCH", "GELO", "E", "mage", "Monarca glacial. A coroa de gelo nunca derrete.", ["LANCA BOREAL", "ERA DO GELO", "TRONO GLACIAL", "AURORA ARTICA"]),
  g("thundrake", "THUNDRAKE", "ELETRICO", "E", "speed", "Dragão-tempestade. Asas que rasgam o céu em raios.", ["GARRA VOLT", "ASA TROVAO", "TEMPESTADE DRACONICA", "PARA-RAIOS"]),
  g("venomaw", "VENOMAW", "TOXICO", "E", "bruiser", "Serpente blindada. A mandíbula injeta veneno nanotech.", ["PICADA", "GARRA VENENO", "BOTE LETAL", "ESCAMAS ACIDAS"]),
  g("terrakhan", "TERRAKHAN", "TERRA", "E", "tank", "Khan das montanhas. Ombros que são cordilheiras.", ["PUNHO MONTANHA", "FALHA SISMICA", "CORDILHEIRA", "BASTIAO DE PEDRA"]),
  g("skyreaver", "SKYREAVER", "VENTO", "E", "speed", "Rapina celeste. Asas-foice ceifam as nuvens.", ["MERGULHO", "ASA FOICE", "CICLONE CEIFADOR", "CORRENTE ASCENDENTE"]),
  g("magmoth", "MAGMOTH", "FOGO", "E", "mage", "Mariposa de magma. Pó de asa que incendeia o ar.", ["PO ARDENTE", "ASA MOLTEN", "VOO INCANDESCENTE", "CASULO DE BRASA"]),
  g("nautilux", "NAUTILUX", "AGUA", "E", "bal", "Senhor do abismo. Concha de náutilo e tridente de pérola.", ["TRIDENTE", "ESPIRAL ABISSAL", "FURIA DAS MARES", "CONCHA PEROLA"]),
  g("stormhalberd", "STORMHALBERD", "ELETRICO", "E", "bruiser", "Cavaleiro da tormenta. A alabarda chama raios do céu.", ["ALABARDA", "LANCA RELAMPAGO", "JULGAMENTO DO TROVAO", "GUARDA TEMPESTADE"]),
  g("blightqueen", "BLIGHTQUEEN", "TOXICO", "E", "mage", "Rainha da praga. O chicote de espinhos espalha corrosão.", ["ESPINHO", "CHICOTE PRAGA", "JARDIM TOXICO", "COROA DE ESPINHOS"]),
  g("basaltor", "BASALTOR", "TERRA", "E", "tank", "Colosso de basalto. Rachaduras de lava pulsam como veias.", ["MARRETA BASALTO", "FISSURA", "COLAPSO TECTONICO", "MANTO DE BASALTO"]),
  // ——— LENDÁRIOS ———
  g("solaryx", "SOLARYX", "LUZ", "L", "mage", "Titã solar. O halo é um anel de fusão nuclear.", ["LANCA SOLAR", "HALO DE FUSAO", "SOL NASCENTE", "EGIDE DO ZENITE"]),
  g("abyssion", "ABYSSION", "SOMBRA", "L", "bruiser", "Demônio do abismo. Os chifres sugam a luz ao redor.", ["GARRA ABISSAL", "CHIFRE DO VAZIO", "ABISMO ETERNO", "CARAPACA INFERNAL"]),
  g("chronotitan", "CHRONOTITAN", "QUANTICO", "L", "tank", "Titã-relógio. Ampulheta no peito, engrenagem como halo.", ["PENDULO", "ENGRENAGEM", "PARADOXO TEMPORAL", "TEMPO CONGELADO"]),
  g("seraphex", "SERAPHEX", "LUZ", "L", "speed", "Serafim de seis asas. Desce em julgamento luminoso.", ["PLUMA DE LUZ", "SEIS ASAS", "JULGAMENTO SERAFICO", "SANTUARIO"]),
  g("nihilus", "NIHILUS", "SOMBRA", "L", "mage", "Ceifador do vazio. Um buraco negro gira no seu peito.", ["FOICE NULA", "HORIZONTE DE EVENTOS", "SINGULARIDADE", "VEU DO NADA"]),
  g("astraea", "ASTRAEA", "COSMICO", "L", "mage", "Deusa das constelações. Asas tecidas com mapas estelares.", ["ESTRELA GUIA", "CONSTELACAO", "CEU ESTRELADO", "MANTO CELESTE"]),
  g("kronos", "KRONOS", "METAL", "L", "bruiser", "Imperador de aço. A capa vermelha esconde mil batalhas.", ["ESPADA IMPERIAL", "DECRETO DE ACO", "COROACAO", "ARMADURA DO TRONO"]),
  // ——— MÍTICOS ———
  g("genesis", "GENESIS PRIME", "COSMICO", "M", "bal", "O primeiro chassi. Carrega uma galáxia inteira no núcleo.", ["BIG BANG", "CAPA GALACTICA", "GENESE PRIMORDIAL", "HORIZONTE PRIMO"]),
  g("draconis", "DRACONIS OMEGA", "FOGO", "M", "bruiser", "Imperador dragão. Suas asas incendiaram mil céus.", ["GARRA OMEGA", "ASA INFERNAL", "APOCALIPSE DRACONICO", "ESCAMA IMPERIAL"]),
  g("zenith", "ZENITH ETERNUM", "CRISTAL", "M", "mage", "Deidade de cristal. O halo de diamante refrata a eternidade.", ["RAIO DIAMANTE", "HALO ETERNO", "ZENITE PRISMATICO", "CATEDRAL DE CRISTAL"]),
];

export const GACHA_IDS: readonly string[] = Object.freeze(GACHA_BLUEPRINTS.map((b) => b.id));
const SET = new Set(GACHA_IDS);
export const GACHA_TIER: Record<string, GachaTier> = Object.fromEntries(GACHA_BLUEPRINTS.map((b) => [b.id, b.tier]));

export function isGachaRobot(id: string): boolean {
  return SET.has(id);
}

export function gachaPool(tier: GachaTier): string[] {
  return GACHA_BLUEPRINTS.filter((b) => b.tier === tier).map((b) => b.id);
}
