/**
 * Modo História — “Crônicas da Primeira Luz”.
 * Dados tipados (cenas, falas, escolhas, batalhas) + transações de recompensa à prova de repetição.
 */
import { fightReward, grantXP } from "./engine";
import { ROBOT_MAP } from "./robots";
import { addGold, addPlayerXP, applyPetRewards, getState, incBattlesWon, setState, updateRobots } from "./save";

import { CAST } from "./story-cast";
import { L, art, intro, type BaseSpeakerId, type SpeakerId, type Speaker, type StoryBattle, type StoryChapter } from "./story-kit";
import { SAGA2 } from "./story-saga2";
import { SAGA3 } from "./story-saga3";
import { CONTOS } from "./story-contos";
export * from "./story-kit";

const BASE_SPEAKERS: Record<BaseSpeakerId, Speaker> = {
  lyra: { name: "COMANDANTE LYRA", portrait: "/story/lyra.png", side: "left", tone: "#35e2f0" },
  nara: { name: "ENGENHEIRA NARA", portrait: "/story/nara.png", side: "left", tone: "#ffb21a" },
  aurorion: { name: "AURORION", portrait: "/busts/aurorion_bust.png", side: "right", tone: "#ffe08a" },
  narrador: { name: "", side: "left", tone: "#9fc3d6" },
  sistema: { name: "SISTEMA · LINHA AURORA", side: "left", tone: "#7dff8a" },
  scavenger: { name: "CATADOR ÓPTICO", portrait: "/busts/npc_mirrorduelist_bust.png", side: "right", tone: "#7dff8a" },
  scrapking: { name: "REI DA SUCATA", portrait: "/busts/npc_chronoguard_bust.png", side: "right", tone: "#ff8a3d" },
  siegetank: { name: "BASTIÃO DE CERCO", portrait: "/busts/npc_siegetank_bust.png", side: "right", tone: "#ff5b4d" },
  mirrorduelist: { name: "DUELISTA PRISMÁTICO", portrait: "/busts/npc_mirrorduelist_bust.png", side: "right", tone: "#c9a7ff" },
  chronoguard: { name: "GUARDIÃO CRONAL", portrait: "/busts/npc_chronoguard_bust.png", side: "right", tone: "#8fd8ff" },
  voidarchon: { name: "ARCONTE DO VAZIO", portrait: "/busts/npc_voidarchon_bust.png", side: "right", tone: "#b46bff" },
  lyra_orbit: { name: "LYRA · TRAJE ORBITAL", portrait: "/story/lyra-s2.webp", side: "left", tone: "#63f2ff" },
  voidnavigator: { name: "NAVEGANTE DO VAZIO", portrait: "/story/npc-s2-voidnavigator.webp", side: "right", tone: "#d28cff" },
  eventhorizon: { name: "HORIZONTE DE EVENTOS", portrait: "/busts/eventhorizon_bust.png", side: "right", tone: "#ff4fd8" },
  valkyrune: { name: "VALKYRUNE · ASGARD", portrait: "/busts/valkyrune_bust.png", side: "right", tone: "#9fe8ff" },
  aurumtitan: { name: "AURUMTITAN · OLIMPO", portrait: "/busts/aurumtitan_bust.png", side: "right", tone: "#ffd36a" },
  scarabking: { name: "REI-ESCARAVELHO · DUAT", portrait: "/busts/scarabking_bust.png", side: "right", tone: "#5fffc0" },
};


/** Arcos da campanha, para agrupar capítulos no mapa e na lista. */
export function storyArc(num: number): string {
  if (num > 100) return "CONTOS DE AURORA";
  if (num > 42) return "ARCO VIII · O GRANDE CONCERTO";
  if (num > 36) return "ARCO VII · OS MOVIMENTOS";
  if (num > 30) return "ARCO VI · O PALÁCIO PARTIDO";
  if (num > 24) return "ARCO V · O CONVITE DE CRISTAL";
  return num <= 6 ? "ARCO I · AURORA" : num <= 12 ? "ARCO II · ROTA HELIX" : num <= 18 ? "ARCO III · O HORIZONTE" : "ARCO IV · O PANTEÃO";
}
export const chapterArc = (c: StoryChapter) => c.arc ?? storyArc(c.num);
export const chapterTag = (c: StoryChapter) => c.tag ?? String(c.num).padStart(2, "0");
export const chapterSaga = (c: StoryChapter) => c.saga ?? 1;

export const SPEAKERS: Record<SpeakerId, Speaker> = { ...BASE_SPEAKERS, ...CAST };

const SAGA1: StoryChapter[] = [
  {
    id: "ferrugem", num: 1, title: "FERRUGEM NA LINHA", subtitle: "Plataforma Aurora · 23:40",
    synopsis: "Os trens pararam. Algo está devorando os cabos do metrô.",
    art: art("ch1"), thumb: art("ch1-thumb"), recommended: 1,
    reward: { gold: 250, xp: 50, item: "repair_kit", qty: 2 }, map: { x: 24, y: 92, region: "LINHA AURORA" },
    beats: [
      L("narrador", "Três noites depois da Primeira Luz, a cidade voltou a dormir tranquila. Quase."),
      L("sistema", "ALERTA: LINHA AURORA SEM ENERGIA. SETE COMPOSIÇÕES PARADAS.", "alarm"),
      L("lyra", "Piloto, preciso de você no subsolo. As câmeras da plataforma mostram movimento… pequeno, rápido e em grupo."),
      L("aurorion", "Sinto cheiro de cobre queimado. Alguém está arrancando os cabos de força com as garras."),
      L("scavenger", "Krrr… peças. Peças boas. O REI quer todas.", "glitch"),
      L("lyra", "‘O Rei’? Ótimo. Um enxame com hierarquia. Tire esses catadores da linha antes que derrubem a ponte de energia."),
      { kind: "battle", id: "ferrugem-1", label: "PLATAFORMA AURORA · ENXAME", arena: "undercity", enemies: [{ id: "npc_mirrorduelist", level: 2, trained: 1, statScale: 0.75 }] },
      L("aurorion", "O enxame recuou pelo túnel norte. Levaram um núcleo de reator inteiro.", "shake"),
      L("nara", "Um núcleo inteiro?! Aquilo pesa duas toneladas. Ninguém carrega isso a pé — eles têm um guindaste lá fora."),
      L("lyra", "O túnel norte sai no ferro-velho do distrito industrial. Descanse, piloto. Amanhã vamos conhecer esse rei."),
    ],
  },
  {
    id: "trono", num: 2, title: "O TRONO DE SUCATA", subtitle: "Ferro-velho Industrial · Pôr do sol",
    synopsis: "Um soberano feito de refugo reivindica a cidade.",
    art: art("ch2"), thumb: art("ch2-thumb"), recommended: 3,
    reward: { gold: 500, xp: 100, item: "energy_cell", qty: 2 }, map: { x: 68, y: 82, region: "FERRO-VELHO" },
    beats: [
      L("nara", "Olha esse lugar. Cada pilha de sucata aqui já foi um robô de alguém."),
      L("scrapking", "BEM-VINDOS AO MEU REINO! Tudo que a cidade joga fora, eu coroo.", "quake"),
      L("aurorion", "Você roubou o núcleo do metrô. Milhares de pessoas dependem daquela linha."),
      L("scrapking", "Roubei? Eu RESGATEI. Alguém lá em cima me ofereceu um preço… e prometeu que o céu vai escurecer.", "glitch"),
      L("lyra", "Quem te contratou? Responda e a gente conversa."),
      L("scrapking", "Só respondo a quem derruba a coroa. GUARDA, ÀS GARRAS!", "shake"),
      { kind: "battle", id: "trono-1", label: "FERRO-VELHO · GUARDA REAL", arena: "foundry", enemies: [{ id: "npc_mirrorduelist", level: 3, trained: 2, statScale: 0.8 }, { id: "npc_chronoguard", level: 3, trained: 2, statScale: 0.75 }] },
      L("scrapking", "Hngh… a fornalha… está apagando…", "flash"),
      L("nara", "O núcleo do metrô está na caldeira dele. Se eu tirar agora, a fornalha dele morre junto."),
      {
        kind: "choice", flag: "rei", prompt: "O que fazer com o Rei da Sucata?",
        options: [
          { value: "poupou", label: "Poupar — trocar uma bateria pelo núcleo", reply: [L("nara", "Fechado. Uma célula reserva no lugar do núcleo. Ele vive, a linha volta."), L("scrapking", "…Ninguém nunca me devolveu nada. Eu não esqueço dívidas, piloto.")] },
          { value: "desmontou", label: "Desligar — recuperar o núcleo agora", reply: [L("nara", "Núcleo recuperado. A fornalha apagou, mas ele ainda pisca."), L("scrapking", "Frio… tão frio… ELE vai fazer a cidade inteira sentir isso.", "glitch")] },
        ],
      },
      L("lyra", "Ele falou do céu escurecendo. Nara, cruze isso com os registros da usina."),
      L("nara", "Já cruzei. A usina está recebendo pedidos de carga de um endereço que não existe."),
    ],
  },
  {
    id: "cerco", num: 3, title: "CERCO À USINA", subtitle: "Usina Central · Tempestade",
    synopsis: "Uma máquina de invasão marcha contra o coração elétrico da cidade.",
    art: art("ch3"), thumb: art("ch3-thumb"), recommended: 6,
    reward: { gold: 900, xp: 180, item: "shield_chip", qty: 2 }, map: { x: 28, y: 70, region: "USINA CENTRAL" },
    beats: [
      L("sistema", "MURALHA EXTERNA DA USINA ROMPIDA. INTEGRIDADE 41%.", "alarm"),
      L("lyra", "Aquilo é um Bastião de Cerco. Máquina de guerra autônoma. Ninguém fabrica isso há quarenta anos."),
      L("siegetank", "ORDEM RECEBIDA: DRENAR O NÚCLEO. OBSTÁCULOS SERÃO CONVERTIDOS EM ENTULHO.", "quake"),
      L("aurorion", "Ele não pensa. Só obedece. Então vamos quebrar a ordem junto com a blindagem."),
      L("scrapking", "Ei, latão! Meus catadores abriram uma brecha no flanco esquerdo dele. Estamos quites.", undefined, ["rei", "poupou"]),
      L("nara", "Sem ajuda dessa vez. Acerte as juntas das esteiras — é onde a couraça é mais fina.", undefined, ["rei", "desmontou"]),
      { kind: "battle", id: "cerco-1", label: "USINA CENTRAL · BASTIÃO", arena: "reactor", enemies: [{ id: "npc_mirrorduelist", level: 5, trained: 3, statScale: 0.85 }, { id: "npc_siegetank", level: 6, trained: 4, statScale: 0.85 }] },
      L("siegetank", "ORDEM… INTERROMPIDA… ORIGEM DA ORDEM: SALÃO… DOS… ESPELHOS…", "glitch"),
      L("lyra", "Salão dos Espelhos? Isso fica embaixo do museu. Interditado desde a fundação da cidade."),
      L("aurorion", "Então alguém tem a chave de um lugar que não deveria ter porta."),
    ],
  },
  {
    id: "espelhos", num: 4, title: "SALÃO DOS ESPELHOS", subtitle: "Cofre sob o Museu · Silêncio",
    synopsis: "Um duelista de vidro mostra ao piloto o que ele poderia se tornar.",
    art: art("ch4"), thumb: art("ch4-thumb"), recommended: 9,
    reward: { gold: 1500, xp: 300, item: "mega_repair", qty: 1 }, map: { x: 66, y: 58, region: "MUSEU SUBTERRÂNEO" },
    beats: [
      L("narrador", "Cada espelho devolve um Aurorion diferente. Uns coroados. Uns quebrados. Uns que nunca saíram do hangar."),
      L("mirrorduelist", "Bem-vindo, campeão. Aqui guardamos os futuros que a cidade descartou.", "flash"),
      L("mirrorduelist", "Meu mestre me mostrou o seu: você cai no dia do eclipse. A menos que lute ao lado dele."),
      {
        kind: "choice", flag: "espelho", prompt: "Como responder ao Duelista?",
        options: [
          { value: "confiar", label: "Ouvir — perguntar quem é o mestre", reply: [L("mirrorduelist", "O Arconte do Vazio. Ele não quer destruir a cidade. Quer desligá-la… para sempre ficar em paz."), L("aurorion", "Paz sem ninguém para senti-la é só escuridão.")] },
          { value: "quebrar", label: "Recusar — futuro se escolhe lutando", reply: [L("aurorion", "Eu não aceito futuro emprestado."), L("mirrorduelist", "Então vou te mostrar o reflexo de cada erro seu.", "shake")] },
        ],
      },
      { kind: "battle", id: "espelhos-1", label: "SALÃO DOS ESPELHOS · DUELO", arena: "crystal", enemies: [{ id: "npc_mirrorduelist", level: 9, trained: 6, statScale: 0.9 }] },
      L("mirrorduelist", "Os reflexos… racharam. Talvez o seu futuro não estivesse escrito.", "flash"),
      L("mirrorduelist", "Corra ao Observatório. O Guardião Cronal está segurando a hora do eclipse. Se ele soltar, o portal abre.", undefined, ["espelho", "confiar"]),
      L("lyra", "Os sensores do Observatório pararam às 03:00:00. Faz uma hora que eles marcam o mesmo segundo.", undefined, ["espelho", "quebrar"]),
      L("nara", "Tempo parado. Claro. Por que seria um problema simples?"),
    ],
  },
  {
    id: "segundos", num: 5, title: "ENTRE DOIS SEGUNDOS", subtitle: "Observatório · 03:00:00",
    synopsis: "No alto da cidade, o tempo parou — e alguém guarda a ampulheta.",
    art: art("ch5"), thumb: art("ch5-thumb"), recommended: 12,
    reward: { gold: 2400, xp: 480, item: "energy_cell", qty: 3 }, map: { x: 32, y: 46, region: "OBSERVATÓRIO" },
    beats: [
      L("narrador", "A chuva não cai. O raio não termina. Só os passos de Aurorion fazem barulho."),
      L("chronoguard", "Tique. Você chegou entre um segundo e o próximo. Ninguém deveria caminhar aqui.", "zoom"),
      L("aurorion", "Você está prendendo a cidade nesse instante. Por quê?"),
      L("chronoguard", "Enquanto este segundo durar, o eclipse não chega. Eu protejo vocês do Arconte… do único jeito que sei.", "glitch"),
      L("lyra", "Ninguém vive dentro de um segundo, Guardião. Solte o tempo e nos deixe lutar."),
      L("chronoguard", "Prove que consegue vencer o amanhã. Vença primeiro o agora.", "shake"),
      { kind: "battle", id: "segundos-1", label: "OBSERVATÓRIO · HORA ZERO", arena: "archive", enemies: [{ id: "npc_chronoguard", level: 12, trained: 8, statScale: 0.9 }] },
      L("narrador", "A chuva desaba de uma vez. O trovão completa o rugido que começou uma hora atrás.", "flash"),
      L("chronoguard", "O tempo é seu de novo. Use bem. Ele já está aqui.", "quake"),
      L("sistema", "ANOMALIA SOBRE A PRAÇA DO PORTAL. LUMINOSIDADE DA CIDADE CAINDO.", "alarm"),
    ],
  },
  {
    id: "eclipse", num: 6, title: "ECLIPSE DA PRIMEIRA LUZ", subtitle: "Praça do Portal · O fim da noite",
    synopsis: "O Arconte do Vazio abre o céu. A última luz é a sua.",
    art: art("ch6"), thumb: art("ch6-thumb"), recommended: 15,
    reward: { gold: 3600, xp: 750, item: "revive_core", qty: 2 }, map: { x: 60, y: 36, region: "PRAÇA DO PORTAL" },
    beats: [
      L("narrador", "O sol negro se abre sobre a praça. As janelas da cidade apagam uma a uma.", "quake"),
      L("voidarchon", "Pequena luz. Vim apagar o cansaço deste mundo. Ninguém mais precisará lutar.", "glitch"),
      L("aurorion", "Lutar é o que nos faz levantar de novo. Você não vai tirar isso de ninguém."),
      L("scrapking", "E O REI TAMBÉM VEIO! Meus catadores religaram os postes da praça!", "shake", ["rei", "poupou"]),
      L("mirrorduelist", "Eu vi todos os futuros. Em nenhum deles você recua. Lute — eu desvio os reflexos dele.", undefined, ["espelho", "confiar"]),
      L("lyra", "Todos os canais da cidade estão com você, piloto. Primeira Luz: LANÇAR!"),
      { kind: "battle", id: "eclipse-1", label: "PORTAL · ARAUTOS DO VAZIO", arena: "rift", enemies: [{ id: "npc_chronoguard", level: 14, trained: 9, statScale: 0.85 }, { id: "npc_voidarchon", level: 14, trained: 9, statScale: 0.85 }] },
      L("voidarchon", "Interessante. Então vou mostrar a escuridão inteira.", "quake"),
      L("nara", "A energia dele dobrou! Aurorion, o seu reator aguenta mais um minuto. UM.", "alarm"),
      { kind: "battle", id: "eclipse-2", label: "ECLIPSE · ARCONTE DESPERTO", arena: "genesis", enemies: [{ id: "npc_voidarchon", level: 16, trained: 11, statScale: 0.95 }] },
      L("narrador", "Uma linha dourada corta o sol negro. Depois outra. Depois a manhã inteira.", "flash"),
      L("voidarchon", "Então… a luz… também cansa de perder.", "glitch"),
      L("lyra", "A cidade está acordando. Bom trabalho, piloto. De verdade."),
      L("aurorion", "Não foi só meu reator. Foi cada pessoa que acendeu uma luz esta noite."),
      L("sistema", "CRÔNICAS DA PRIMEIRA LUZ — CONCLUÍDAS. NOVAS AMEAÇAS SERÃO REGISTRADAS."),
    ],
  },
  {
    id: "orbital", num: 7, title: "A CIDADE ACIMA DO CÉU", subtitle: "Porto Aurora · Órbita baixa",
    synopsis: "O sinal que guiou o Arconte veio de uma estação esquecida acima das nuvens.",
    art: art("ch7"), thumb: art("ch7-thumb"), recommended: 18,
    reward: { gold: 4800, xp: 950, item: "mega_repair", qty: 2 }, map: { x: 76, y: 25, region: "PORTO AURORA" },
    beats: [
      L("lyra_orbit", "Vista o traje orbital, piloto. A estação está sem gravidade e sem leis há quinze anos."),
      L("nara", "O pedido de carga que não existia… vinha daqui. Alguém continuou alimentando a estação depois do eclipse."),
      L("voidnavigator", "Vocês chegaram tarde. A cidade abaixo é apenas o primeiro mapa que o Vazio vai apagar.", "glitch"),
      L("lyra_orbit", "Navegante, entregue o núcleo cartográfico e ninguém precisa cair hoje."),
      { kind: "choice", flag: "orbital", prompt: "Como atravessar a estação em colapso?", options: [
        { value: "resgate", label: "Resgatar os trabalhadores presos", reply: [L("lyra_orbit", "Primeiro vidas. O mapa pode esperar."), L("voidnavigator", "Ainda escolhem pessoas. Interessante.")] },
        { value: "atalho", label: "Cortar caminho pelo reator", reply: [L("nara", "Se o reator romper, perdemos a estação inteira."), L("voidnavigator", "Um piloto que escolhe velocidade. Eu conheço esse tipo de coragem.")] },
      ] },
      { kind: "battle", id: "orbital-1", label: "PORTO AURORA · DRONES SEM GRAVIDADE", arena: "orbit", enemies: [{ id: "npc_siegetank", level: 18, trained: 12, statScale: 0.9 }, { id: "npc_mirrorduelist", level: 18, trained: 11, statScale: 0.88 }] },
      L("voidnavigator", "O núcleo não guarda coordenadas. Guarda destinos. E o próximo está no Jardim do Anel.", "zoom"),
      L("lyra_orbit", "Então subimos mais uma vez. Primeira Luz, em formação."),
    ],
  },
  {
    id: "anel", num: 8, title: "O JARDIM DO ANEL", subtitle: "Estação Helix · Noite artificial",
    synopsis: "Uma floresta orbital conserva mapas de mundos que ainda não nasceram.",
    art: art("ch8"), thumb: art("ch8-thumb"), recommended: 21,
    reward: { gold: 6200, xp: 1250, item: "revive_core", qty: 2 }, map: { x: 38, y: 14, region: "JARDIM HELIX" },
    beats: [
      L("narrador", "O jardim gira sem vento. Cada folha mostra um lugar diferente quando a luz passa por ela."),
      L("voidnavigator", "Este anel desenhou a primeira cidade. Também desenhou o fim dela."),
      L("aurorion", "Você fala como se tivesse visto tudo."),
      L("voidnavigator", "Eu naveguei entre os segundos que vocês chamam de futuro. Em alguns, vocês vencem."),
      { kind: "choice", flag: "anel", prompt: "Qual mapa levar para a cidade?", options: [
        { value: "origem", label: "O mapa da origem — entender a Primeira Luz", reply: [L("nara", "Se descobrirmos quem ligou o primeiro reator, talvez desliguemos o Vazio sem destruí-lo.")] },
        { value: "futuro", label: "O mapa do futuro — encontrar a próxima ameaça", reply: [L("lyra_orbit", "Informação primeiro. A cidade precisa sobreviver à próxima onda.")] },
      ] },
      { kind: "battle", id: "anel-1", label: "JARDIM HELIX · RAÍZES DE CRISTAL", arena: "jungle", enemies: [{ id: "npc_chronoguard", level: 21, trained: 14, statScale: 0.92 }, { id: "npc_voidarchon", level: 21, trained: 13, statScale: 0.9 }] },
      L("narrador", "A raiz central abre uma janela para a lua quebrada. O mapa aponta para o outro lado da órbita.", "flash"),
      L("voidnavigator", "O último ponto não é um lugar. É uma decisão."),
    ],
  },
  {
    id: "fronteira", num: 9, title: "A ÚLTIMA COORDENADA", subtitle: "Lua partida · Depois do eclipse",
    synopsis: "No limite do mapa, o piloto encontra o lugar onde a luz foi inventada.",
    art: art("ch9"), thumb: art("ch9-thumb"), recommended: 25,
    reward: { gold: 9000, xp: 1900, item: "energy_cell", qty: 5 }, map: { x: 78, y: 4, region: "LUA PARTIDA" },
    beats: [
      L("sistema", "COORDENADA FORA DO CATÁLOGO. ORIGEM: ANTES DA PRIMEIRA LUZ.", "alarm"),
      L("lyra_orbit", "A cidade inteira está olhando para nós. Não importa o que exista do outro lado: voltamos juntos."),
      L("voidnavigator", "Eu fui criado para mapear o silêncio. Vocês me deram uma rota de volta.", "glitch"),
      L("aurorion", "Então escolha: ser o caminho ou ser o fim dele."),
      { kind: "battle", id: "fronteira-1", label: "LUA PARTIDA · O MAPA VIVO", arena: "rift", enemies: [{ id: "npc_voidarchon", level: 25, trained: 16, statScale: 0.95 }, { id: "npc_chronoguard", level: 25, trained: 15, statScale: 0.92 }] },
      L("voidnavigator", "O mapa está aberto. Não para o Vazio — para todos os lugares que ainda podemos construir.", "flash"),
      L("lyra_orbit", "Crônicas da Primeira Luz: segunda rota concluída. A próxima história começa onde a nossa termina."),
      L("sistema", "NOVA ROTA REGISTRADA. O HORIZONTE NÃO É MAIS UM LIMITE."),
    ],
  },
  {
    id: "arquivo", num: 10, title: "O ARQUIVO QUE RESPIRA", subtitle: "Subsolo Aurora · Memória profunda",
    synopsis: "A origem da Primeira Luz está viva sob a cidade — e não quer ser encontrada.",
    art: art("ch10"), thumb: art("ch10-thumb"), recommended: 28,
    reward: { gold: 11000, xp: 2400, item: "mega_repair", qty: 3 }, map: { x: 26, y: 6, region: "ARQUIVO AURORA" },
    beats: [
      L("narrador", "As portas abaixo da cidade não guardam armas. Guardam versões dela que nunca chegaram a existir."),
      L("voidnavigator", "Cada registro é uma rota descartada. O arquivo aprendeu a sonhar com elas.", "glitch"),
      L("lyra_orbit", "Se a memória tem medo, é porque alguém tentou apagá-la. Vamos ouvir antes de atirar."),
      { kind: "choice", flag: "arquivo", prompt: "O que salvar do Arquivo Aurora?", options: [
        { value: "pessoas", label: "Resgatar as consciências presas", reply: [L("aurorion", "Uma cidade é feita de quem lembra dela. Não deixamos ninguém para trás.")] },
        { value: "mapas", label: "Copiar os mapas de todas as rotas", reply: [L("voidnavigator", "Mil futuros em um só núcleo. Perigoso. Exatamente o que precisamos.")] },
      ] },
      { kind: "battle", id: "arquivo-1", label: "ARQUIVO AURORA · GUARDAS DE MEMÓRIA", arena: "archive", enemies: [{ id: "npc_mirrorduelist", level: 28, trained: 18, statScale: 0.94 }, { id: "npc_chronoguard", level: 28, trained: 18, statScale: 0.92 }] },
      L("nara", "Achei o primeiro registro. A Primeira Luz não foi construída para iluminar a cidade — foi construída para acordá-la."),
      L("sistema", "MEMÓRIA RESTAURADA: O NÚCLEO ESCOLHE QUEM PODE CONTINUAR."),
      L("lyra_orbit", "Então levamos a escolha conosco. O deserto de vidro está chamando."),
    ],
  },
  {
    id: "vidro", num: 11, title: "O DESERTO DE VIDRO", subtitle: "Fronteira oeste · Duas luas",
    synopsis: "Uma tempestade de areia cristalina esconde a máquina que escreveu o primeiro mapa.",
    art: art("ch11"), thumb: art("ch11-thumb"), recommended: 32,
    reward: { gold: 14000, xp: 3100, item: "revive_core", qty: 3 }, map: { x: 72, y: 3, region: "DESERTO DE VIDRO" },
    beats: [
      L("narrador", "O deserto reflete duas luas. Em cada fragmento, o piloto vê uma estrada diferente."),
      L("voidnavigator", "A tempestade não é clima. É o sistema de defesa de uma máquina que nunca recebeu um nome."),
      L("lyra_orbit", "Toda máquina pode receber uma ordem nova. A nossa é atravessar."),
      L("aurorion", "E se a ordem original ainda estiver funcionando?"),
      { kind: "battle", id: "vidro-1", label: "DESERTO · COLOSSOS DE CRISTAL", arena: "foundry", enemies: [{ id: "npc_siegetank", level: 32, trained: 20, statScale: 0.96 }, { id: "npc_voidarchon", level: 32, trained: 20, statScale: 0.94 }] },
      L("voidnavigator", "A máquina viu nossa luta. Agora ela conhece nossos nomes."),
      L("nara", "E abriu uma ponte direto para o núcleo. Isso é convite ou armadilha?"),
      L("lyra_orbit", "As duas coisas. Vamos escolher o que fazer com ela."),
    ],
  },
  {
    id: "primeira", num: 12, title: "A PRIMEIRA LUZ", subtitle: "Núcleo fundador · Além do horizonte",
    synopsis: "A última porta revela quem acordou a cidade — e por que ela escolheu você.",
    art: art("ch12"), thumb: art("ch12-thumb"), recommended: 36,
    reward: { gold: 20000, xp: 5000, item: "energy_cell", qty: 8 }, map: { x: 48, y: 1, region: "NÚCLEO FUNDADOR" },
    beats: [
      L("sistema", "ACESSO CONCEDIDO. PILOTO RECONHECIDO COMO VARIÁVEL DE FUTURO.", "alarm"),
      L("narrador", "No centro do anel, um planeta pequeno gira dentro de uma máquina maior que a noite."),
      L("voidnavigator", "Eu fui enviado para apagar este núcleo. Mas cada rota que percorri terminou em vocês."),
      L("lyra_orbit", "Não somos um destino. Somos uma escolha que se repete toda vez que alguém acende uma luz."),
      { kind: "choice", flag: "primeira", prompt: "Qual ordem dar ao Núcleo Fundador?", options: [
        { value: "acordar", label: "Acordar todas as cidades possíveis", reply: [L("aurorion", "Que o universo saiba que ainda estamos aqui."), L("voidnavigator", "Milhões de rotas. Pela primeira vez, nenhuma precisa terminar em silêncio.")] },
        { value: "guardar", label: "Guardar a luz para a próxima geração", reply: [L("lyra_orbit", "Não precisamos controlar o futuro. Só não vamos entregá-lo ao medo."), L("nara", "Vou construir uma chave que qualquer criança possa usar.")] },
      ] },
      { kind: "battle", id: "primeira-1", label: "NÚCLEO FUNDADOR · A ÚLTIMA SENTINELA", arena: "genesis", enemies: [{ id: "npc_voidarchon", level: 36, trained: 24, statScale: 0.98 }, { id: "npc_chronoguard", level: 36, trained: 23, statScale: 0.96 }] },
      L("voidnavigator", "A primeira luz não era um lugar. Era a coragem de continuar procurando."),
      L("lyra_orbit", "Piloto, a rota está aberta. Desta vez, nós escolhemos para onde ela vai."),
      L("sistema", "CRÔNICAS DA PRIMEIRA LUZ — TRILOGIA CONCLUÍDA. NOVOS HORIZONTES DISPONÍVEIS."),
    ],
  },
  {
    id: "retorno", num: 13, title: "A CIDADE DEPOIS", subtitle: "Aurora · Primeiro amanhecer",
    synopsis: "Voltar para casa é mais difícil quando a cidade inteira mudou enquanto você estava fora.",
    art: intro(3), thumb: intro(3), recommended: 38, reward: { gold: 22000, xp: 5600, item: "mega_repair", qty: 3 }, map: { x: 20, y: 55, region: "AURORA RENOVADA" },
    beats: [
      L("narrador", "A cidade acende três sóis artificiais. Pessoas que nunca se conheceram apontam para o mesmo céu."),
      L("sistema", "LINHA AURORA: 100% OPERACIONAL. PELA PRIMEIRA VEZ EM QUARENTA ANOS.", "flash"),
      L("nara", "Olha isso, piloto. Os trens chegam no horário. Eu nem sei mais o que reclamar."),
      L("lyra", "Aproveite enquanto dura. Os distritos de fora querem saber por que a luz chegou primeiro aqui."),
      L("scrapking", "Ei! Eu disse que não esquecia dívidas. Os catadores agora consertam trilhos. De graça. Quase.", undefined, ["rei", "poupou"]),
      L("nara", "O ferro-velho está escuro desde que a fornalha do Rei apagou. Alguns catadores culpam a gente.", undefined, ["rei", "desmontou"]),
      L("lyra", "Tem um grupo chamado ‘Os Sem-Luz’. Eles ocuparam a estação velha e cortaram o reator do distrito sul."),
      { kind: "choice", flag: "retorno", prompt: "Como abordar Os Sem-Luz?", options: [
        { value: "ouvir", label: "Ir desarmado e ouvir as exigências", reply: [L("aurorion", "Quem foi deixado no escuro merece ser ouvido antes de ser vencido."), L("lyra", "Certo. Mas eu fico na escuta com o esquadrão inteiro.")] },
        { value: "cercar", label: "Cercar a estação e retomar o reator", reply: [L("lyra", "Rápido e limpo. Ninguém se machuca se o reator voltar em dez minutos."), L("nara", "Dez minutos é o que eu levo pra trocar um fusível. Vai, piloto.")] },
      ] },
      { kind: "bg", art: intro(7) },
      L("narrador", "A estação velha cheira a óleo frio. Nas paredes, alguém pintou um sol riscado com um X."),
      L("scavenger", "Vocês acenderam o centro e esqueceram a borda. A luz tem favoritos, piloto?", undefined, ["retorno", "ouvir"]),
      L("scavenger", "Chegaram com armas. Claro. A luz sempre chega armada.", "shake", ["retorno", "cercar"]),
      { kind: "battle", id: "retorno-1", label: "ESTAÇÃO VELHA · OS SEM-LUZ", arena: "undercity", enemies: [{ id: "scrapjaw", level: 38, trained: 25, statScale: 0.96 }, { id: "grimsprocket", level: 38, trained: 25, statScale: 0.95 }] },
      L("nara", "O reator do sul estava sabotado por dentro. Não foram eles. Alguém usou a raiva deles como escudo."),
      L("aurorion", "Não vencemos o medo destruindo-o. Vencemos ensinando-o a caminhar."),
      L("sistema", "CIDADE ESTÁVEL. ASSINATURA DESCONHECIDA DETECTADA NO DISTRITO ZERO.", "alarm"),
    ],
  },
  {
    id: "embaixada", num: 14, title: "EMBAIXADA DO VAZIO", subtitle: "Distrito zero · Sem fronteiras",
    synopsis: "Visitantes de uma rota impossível chegam pedindo abrigo — e trazendo uma guerra atrás deles.",
    art: intro(7), thumb: intro(7), recommended: 41, reward: { gold: 25000, xp: 6200, item: "revive_core", qty: 4 }, map: { x: 75, y: 48, region: "DISTRITO ZERO" },
    beats: [
      L("narrador", "No Distrito Zero, as ruas não têm sombra. Naves feitas de silêncio pousam sem fazer barulho."),
      L("voidnavigator", "Eles chamam o silêncio de lar. Não vieram conquistar. Vieram fugir."),
      L("lyra_orbit", "Fugir do quê? O Arconte caiu. O eclipse acabou."),
      L("voidnavigator", "O Arconte era só a primeira voz. Atrás dele existe algo que nem o Vazio ousa nomear."),
      L("nara", "Se abrirmos os portões, a cidade muda para sempre."),
      { kind: "choice", flag: "embaixada", prompt: "Como receber os visitantes?", options: [
        { value: "abrigo", label: "Abrir os portões", reply: [L("lyra_orbit", "Uma cidade viva não mede valor pela origem."), L("voidnavigator", "Obrigado. Vou lembrar que vocês escolheram primeiro, sem garantias.")] },
        { value: "prova", label: "Exigir uma prova de paz", reply: [L("aurorion", "Confiança também pode ser construída peça por peça."), L("voidnavigator", "Justo. Aqui está: a coordenada de quem nos persegue.")] },
      ] },
      L("sistema", "ALERTA: FENDA ABERTA SOBRE OS PORTÕES. ASSINATURA DE CERCO.", "quake"),
      L("siegetank", "ORDEM RECEBIDA: ‘NENHUMA LUZ ALÉM DO HORIZONTE’. EXECUTANDO.", "shake"),
      { kind: "battle", id: "embaixada-1", label: "PORTÕES · A GUERRA QUE SEGUIU", arena: "rift", enemies: [{ id: "npc_mirrorduelist", level: 41, trained: 27, statScale: 0.98 }, { id: "dreadnought", level: 41, trained: 27, statScale: 0.98 }] },
      L("voidnavigator", "Pela primeira vez, o Vazio tem endereço. E uma porta aberta.", undefined, ["embaixada", "abrigo"]),
      L("voidnavigator", "Vocês exigiram prova e lutaram por nós mesmo assim. Isso é paz suficiente.", undefined, ["embaixada", "prova"]),
      L("lyra_orbit", "Quem deu a ordem? ‘Nenhuma luz além do horizonte’… isso parece uma lei, não um grito."),
      L("voidnavigator", "É a lei do Horizonte de Eventos. Ele não odeia a luz. Ele só acha que ela é um erro de cálculo."),
    ],
  },
  {
    id: "tempestade", num: 15, title: "A TEMPESTADE DE NOMES", subtitle: "Órbita Helix · Todas as rotas",
    synopsis: "Uma tempestade apaga identidades; até os robôs esquecem por que lutam.",
    art: intro(9), thumb: intro(9), recommended: 44, reward: { gold: 28000, xp: 7000, item: "energy_cell", qty: 10 }, map: { x: 35, y: 42, region: "ÓRBITA HELIX" },
    beats: [
      L("sistema", "ALERTA: NOMES DE CHASSIS AUSENTES. MEMÓRIA DE COMBATE INSTÁVEL.", "glitch"),
      L("nara", "Piloto, o hangar inteiro esqueceu os próprios nomes. Os robôs respondem só a números de série."),
      L("lyra_orbit", "A tempestade vem da Órbita Helix. É uma onda que apaga o que torna cada coisa única."),
      L("aurorion", "Eu… lembro do seu rosto. Não lembro do meu nome. Isso deveria me assustar?", "glitch"),
      L("narrador", "No Arquivo, as páginas se apagam uma por uma. Restam só as que alguém lê em voz alta."),
      L("nara", "O Arquivo guardou as pessoas, não os mapas. Por isso ainda lembramos uns dos outros.", undefined, ["arquivo", "pessoas"]),
      L("nara", "O Arquivo guardou os mapas. Sabemos onde estamos… só não sabemos mais quem somos.", undefined, ["arquivo", "mapas"]),
      { kind: "choice", flag: "tempestade", prompt: "O que proteger primeiro?", options: [
        { value: "nomes", label: "Gravar os nomes do esquadrão no reator", reply: [L("aurorion", "Aurorion. Eu sou Aurorion. Diga de novo, piloto — mais alto.")] },
        { value: "rotas", label: "Proteger as rotas para os distritos", reply: [L("lyra_orbit", "Se as rotas caírem, ninguém chega para lembrar ninguém. Boa escolha.")] },
      ] },
      { kind: "battle", id: "tempestade-1", label: "HELIX · SOMBRAS SEM NOME", arena: "storm", enemies: [{ id: "chronowraith", level: 44, trained: 29, statScale: 1 }, { id: "npc_chronoguard", level: 44, trained: 29, statScale: 0.98 }] },
      L("lyra_orbit", "O arquivo voltou. Desta vez, ele escreveu nossos nomes por vontade própria."),
      L("narrador", "Quando a tempestade passou, cada piloto chamou seu robô pelo nome certo."),
      L("sistema", "ORIGEM DA TEMPESTADE: SINAL ALÉM DA ÚLTIMA COORDENADA. FREQUÊNCIA: PRIMEIRA LUZ.", "alarm"),
    ],
  },
  {
    id: "farol", num: 16, title: "O FAROL IMPOSSÍVEL", subtitle: "Borda do mapa · Sinal fraco",
    synopsis: "Uma luz distante pede socorro usando a assinatura da Primeira Luz.",
    art: intro(6), thumb: intro(6), recommended: 47, reward: { gold: 32000, xp: 7800, item: "mega_repair", qty: 4 }, map: { x: 68, y: 35, region: "BORDA DO MAPA" },
    beats: [
      L("nara", "O sinal veio de além da última coordenada. Não devia existir nada lá."),
      L("voidnavigator", "Toda rota começa como uma impossibilidade."),
      L("narrador", "Na borda do mapa, o chão termina em pixels soltos. Um farol pisca sobre o nada."),
      L("voidarchon", "…Piloto. Você de novo. Eu não sou mais o Arconte. Sou só o que restou da voz dele.", "glitch"),
      L("lyra_orbit", "Por que usar a frequência da Primeira Luz para pedir socorro?"),
      L("voidarchon", "Porque o Horizonte está engolindo o Vazio também. Ele não quer silêncio. Quer o fim das escolhas."),
      { kind: "choice", flag: "farol", prompt: "O que fazer com o que restou do Arconte?", options: [
        { value: "aliado", label: "Aceitar a ajuda dele", reply: [L("aurorion", "Quem já foi sombra sabe onde a próxima vai cair."), L("voidarchon", "Eu não peço perdão. Peço só um lugar na linha de frente.")] },
        { value: "selar", label: "Selar o fragmento no farol", reply: [L("nara", "Vou trancar ele num núcleo frio. Se mentir, fica lá pra sempre."), L("voidarchon", "Prudente. É por isso que vocês venceram.")] },
      ] },
      L("sistema", "SENTINELA DO HORIZONTE ATIVADA. ORDEM: APAGAR O FAROL.", "alarm"),
      { kind: "battle", id: "farol-1", label: "BORDA · SENTINELA DO FAROL", arena: "skyfall", enemies: [{ id: "eventhorizon", level: 47, trained: 31, statScale: 0.94 }, { id: "npc_siegetank", level: 47, trained: 31, statScale: 1 }] },
      L("lyra_orbit", "A luz não está chamando a gente para lutar. Está chamando para testemunhar."),
      L("voidarchon", "Lá embaixo, no Coliseu, ele já plantou um campeão. Vocês vão reconhecê-lo pelo aplauso.", undefined, ["farol", "aliado"]),
      L("nara", "O núcleo frio está transmitindo algo… uma palavra: ‘Coliseu’.", undefined, ["farol", "selar"]),
      L("sistema", "FAROL ALINHADO. DESTINO: CASA.", "flash"),
    ],
  },
  {
    id: "herdeiros", num: 17, title: "OS HERDEIROS", subtitle: "Coliseu de Aurora · Noite de final",
    synopsis: "A próxima geração assume os mechas — e o campeão invicto do Coliseu não é quem parece.",
    art: intro(11), thumb: intro(11), recommended: 50, reward: { gold: 36000, xp: 8800, item: "revive_core", qty: 5 }, map: { x: 28, y: 28, region: "COLISEU" },
    beats: [
      L("narrador", "Cinquenta mil pessoas gritam um único nome: Ironmonarch, campeão invicto há setenta lutas."),
      L("lyra", "Os novos pilotos idolatram ele. E cada vitória dele drena um pouco do reator da cidade."),
      L("nara", "Medi a arena. Os duelos alimentam o reator — mas os dele puxam energia para fora. Para cima."),
      L("lyra_orbit", "Não entreguem nosso caminho pronto. Construam outro."),
      { kind: "choice", flag: "herdeiros", prompt: "O que ensinar aos novos pilotos?", options: [
        { value: "coragem", label: "Ensinar a coragem de falhar", reply: [L("aurorion", "É assim que todo primeiro salto começa.")] },
        { value: "cuidado", label: "Ensinar a responsabilidade da força", reply: [L("nara", "Um reator forte precisa de mãos cuidadosas.")] },
      ] },
      { kind: "battle", id: "herdeiros-1", label: "COLISEU · SEMIFINAL", arena: "crown", enemies: [{ id: "valkyrune", level: 49, trained: 33, statScale: 0.96 }, { id: "brasslion", level: 49, trained: 33, statScale: 0.96 }] },
      L("narrador", "O telão apaga. Ironmonarch tira o elmo — e dentro não há piloto. Só um horizonte negro girando."),
      L("eventhorizon", "Setenta vitórias. Setenta pedaços de luz enviados para além do mapa. Vocês aplaudiram cada um.", "glitch"),
      L("lyra", "Final cancelada. Piloto, é com você.", "alarm"),
      { kind: "battle", id: "herdeiros-2", label: "COLISEU · O CAMPEÃO VAZIO", arena: "crown", enemies: [{ id: "ironmonarch", level: 51, trained: 35, statScale: 1 }] },
      L("aurorion", "Os herdeiros viram. Ninguém precisa ser invicto. Precisa ser verdadeiro.", undefined, ["herdeiros", "coragem"]),
      L("nara", "Os novatos ajudaram a evacuar a arena sem ninguém mandar. Acho que aprenderam.", undefined, ["herdeiros", "cuidado"]),
      L("sistema", "HERDEIROS APROVADOS. A LUZ CONTINUA.")],
  },
  {
    id: "horizonte", num: 18, title: "HORIZONTE DE EVENTOS", subtitle: "Acima do céu · Onde a luz não volta",
    synopsis: "O inimigo por trás do Vazio mostra o rosto. Ele não quer destruir Aurora — quer encerrá-la.",
    art: intro(15), thumb: intro(15), recommended: 54, reward: { gold: 50000, xp: 12000, item: "energy_cell", qty: 15 }, map: { x: 50, y: 20, region: "HORIZONTE DE EVENTOS" },
    beats: [
      L("narrador", "Sobre Aurora abre-se um círculo perfeito. Nada entra. Nada sai. Nem a luz das estrelas."),
      L("eventhorizon", "Eu sou o fim de toda rota. A Primeira Luz escreveu mapas demais. Vim fechar o livro."),
      L("voidnavigator", "Eu mapeei o silêncio inteiro. Agora quero mapear o que vocês fazem com a liberdade."),
      L("voidarchon", "Eu seguro a borda do lado de lá. Vá, piloto. Desta vez, a sombra protege a luz.", undefined, ["farol", "aliado"]),
      L("nara", "O núcleo frio onde selamos o Arconte está estável. Pelo menos uma porta está trancada.", undefined, ["farol", "selar"]),
      L("lyra_orbit", "Então não termine a rota. Deixe uma coordenada em branco."),
      { kind: "battle", id: "horizonte-1", label: "HORIZONTE · GUARDA DO FIM", arena: "orbit", enemies: [{ id: "voidsingularity", level: 53, trained: 37, statScale: 0.98 }, { id: "npc_voidarchon", level: 53, trained: 37, statScale: 0.96 }] },
      L("eventhorizon", "Vocês vencem lutas. Eu sou a regra que as encerra. Até os deuses do Panteão se curvaram a mim.", "quake"),
      { kind: "battle", id: "horizonte-2", label: "HORIZONTE · O FIM DE TODA ROTA", arena: "genesis", enemies: [{ id: "eventhorizon", level: 55, trained: 39, statScale: 1 }] },
      L("narrador", "O círculo se parte em mil estilhaços. Mas o Horizonte não morre: recua, ferido, para dentro do Panteão."),
      L("aurorion", "A primeira luz nos acordou. As próximas serão nossas."),
      L("lyra", "Os deuses ‘se curvaram’? Piloto, precisamos acordar o Panteão antes que ele acorde por nós."),
      L("sistema", "ARCO III CONCLUÍDO. NOVA REGIÃO: O PANTEÃO — ASGARD, OLIMPO, DUAT.", "flash"),
    ],
  },
  {
    id: "asgard", num: 19, title: "O SALÃO DE ASGARD", subtitle: "Panteão · Ponte de arco-íris congelada",
    synopsis: "A primeira guardiã divina dorme sob o gelo. Acordá-la exige provar que você merece cair lutando.",
    art: intro(8), thumb: intro(8), recommended: 57, reward: { gold: 56000, xp: 13500, item: "mega_repair", qty: 5 }, map: { x: 50, y: 64, region: "ASGARD" },
    beats: [
      L("narrador", "A ponte é feita de luz sólida e congelada. Cada passo toca uma nota que ninguém ouve há mil anos."),
      L("lyra", "Valkyrune. A guardiã de Asgard. Os registros dizem que ela escolhe quem morre com honra."),
      L("nara", "O gelo dela está rachado por dentro. Alguém tentou acordá-la à força. Recentemente."),
      L("valkyrune", "O Horizonte veio antes de vocês. Ofereceu-me um fim sem dor. Eu recusei — e ele congelou meu salão."),
      L("valkyrune", "Mostre que sua luz vale a guerra que traz. Lute comigo até o último reator."),
      { kind: "choice", flag: "asgard", prompt: "Como honrar o desafio de Valkyrune?", options: [
        { value: "duelo", label: "Aceitar o duelo sem itens nem truques", reply: [L("valkyrune", "Um piloto que luta de mãos limpas. Os runas cantam o seu nome.")] },
        { value: "juntos", label: "Lutar com todo o esquadrão ao lado", reply: [L("valkyrune", "Ninguém chega a Asgard sozinho. Sábio. Venham todos.")] },
      ] },
      { kind: "battle", id: "asgard-1", label: "ASGARD · EINHERJAR DE AÇO", arena: "frozen", enemies: [{ id: "frostmonarch", level: 56, trained: 38, statScale: 0.96 }, { id: "fenrisbyte", level: 56, trained: 38, statScale: 0.96 }] },
      { kind: "battle", id: "asgard-2", label: "ASGARD · A ESCOLHEDORA", arena: "frozen", enemies: [{ id: "valkyrune", level: 58, trained: 40, statScale: 1.02 }] },
      L("valkyrune", "Desperto. O Panteão tem três portas; eu sou só a primeira. O Olimpo não será tão gentil."),
      L("aurorion", "Ela ainda tem gelo nas asas. E um sorriso que eu não esperava."),
      L("sistema", "GUARDIÃ 1/3 DESPERTA. ROTA PARA O OLIMPO DESBLOQUEADA."),
    ],
  },
  {
    id: "olimpo", num: 20, title: "AS ESCADAS DO OLIMPO", subtitle: "Panteão · Mil degraus de mármore",
    synopsis: "Aurumtitan julga cada piloto pelo que fez com o poder. E ele assistiu a tudo.",
    art: intro(14), thumb: intro(14), recommended: 60, reward: { gold: 62000, xp: 15000, item: "revive_core", qty: 6 }, map: { x: 86, y: 70, region: "OLIMPO" },
    beats: [
      L("narrador", "No topo dos mil degraus, um titã dourado está sentado num trono que é também uma balança."),
      L("aurumtitan", "Eu vi o Rei da Sucata. Eu vi o Salão dos Espelhos. Eu vi cada escolha sua, piloto."),
      L("aurumtitan", "Você poupou quem o roubou. A misericórdia é um metal raro.", undefined, ["rei", "poupou"]),
      L("aurumtitan", "Você desligou um rei para salvar uma cidade. A eficiência também tem um preço.", undefined, ["rei", "desmontou"]),
      L("aurumtitan", "E quebrou um espelho em vez de confiar nele. Diga-me: ainda tem medo do próprio reflexo?", undefined, ["espelho", "quebrar"]),
      L("aurumtitan", "E confiou no próprio reflexo. Ousado. Quase divino.", undefined, ["espelho", "confiar"]),
      L("lyra", "Ele não está nos testando. Está nos pesando."),
      { kind: "choice", flag: "olimpo", prompt: "O que colocar na balança de Aurumtitan?", options: [
        { value: "erros", label: "Os próprios erros", reply: [L("aurumtitan", "Quem pesa os erros pesa a verdade. A balança se inclina para você.")] },
        { value: "cidade", label: "A vida da cidade inteira", reply: [L("aurumtitan", "Coragem ou arrogância? Só a luta vai dizer.")] },
      ] },
      { kind: "battle", id: "olimpo-1", label: "OLIMPO · OS JUÍZES DE MÁRMORE", arena: "spire", enemies: [{ id: "marblesaint", level: 59, trained: 41, statScale: 0.97 }, { id: "tempestcrown", level: 59, trained: 41, statScale: 0.97 }] },
      { kind: "battle", id: "olimpo-2", label: "OLIMPO · O TITÃ DOURADO", arena: "spire", enemies: [{ id: "aurumtitan", level: 61, trained: 43, statScale: 1.02 }] },
      L("aurumtitan", "A balança está equilibrada. Eu desperto — mas aviso: em Duat, quem pesa os corações é o Horizonte."),
      L("nara", "Ótimo. Um deus que fala por enigmas. Eu só queria um manual."),
      L("sistema", "GUARDIÃO 2/3 DESPERTO. ROTA PARA DUAT DESBLOQUEADA."),
    ],
  },
  {
    id: "duat", num: 21, title: "AS AREIAS DE DUAT", subtitle: "Panteão · O rio de areia negra",
    synopsis: "O Horizonte tomou o terceiro templo. O Rei-Escaravelho já não sabe se serve à luz ou ao fim.",
    art: intro(10), thumb: intro(10), recommended: 63, reward: { gold: 70000, xp: 17000, item: "energy_cell", qty: 18 }, map: { x: 10, y: 38, region: "DUAT" },
    beats: [
      L("narrador", "Um rio de areia negra corre para cima. No fundo dele, corações de reator brilham como peixes."),
      L("scarabking", "Bem-vindos ao último julgamento. O Horizonte me deu uma balança nova. Ela só pesa para baixo."),
      L("voidnavigator", "É ele. O Rei-Escaravelho está carregando a assinatura do Horizonte inteira dentro do peito."),
      L("valkyrune", "Eu seguro o rio. Lutem.", undefined, ["asgard", "duelo"]),
      L("valkyrune", "O esquadrão inteiro está aqui. Asgard também. Lutem juntos.", undefined, ["asgard", "juntos"]),
      { kind: "battle", id: "duat-1", label: "DUAT · ESCARAVELHOS DO FIM", arena: "sunken", enemies: [{ id: "scarabyss", level: 62, trained: 44, statScale: 0.97 }, { id: "sandvizier", level: 62, trained: 44, statScale: 0.97 }] },
      L("scarabking", "Piloto… o Horizonte promete que, no fim, ninguém mais perde. Não é isso que vocês querem?", "glitch"),
      { kind: "choice", flag: "duat", prompt: "O que responder ao Rei-Escaravelho?", options: [
        { value: "perder", label: "“Perder faz parte de escolher.”", reply: [L("scarabking", "…Então eu escolho lutar contra ele. Pela primeira vez em mil anos, eu escolho.")] },
        { value: "libertar", label: "Arrancar o núcleo do Horizonte do peito dele", reply: [L("nara", "Segura ele, piloto! Eu tiro o núcleo na força — vai doer nos dois.")] },
      ] },
      { kind: "battle", id: "duat-2", label: "DUAT · O REI-ESCARAVELHO", arena: "sunken", enemies: [{ id: "scarabking", level: 64, trained: 46, statScale: 1.02 }] },
      L("narrador", "O rio de areia para. Pela primeira vez, ele corre para baixo, para o mar."),
      L("scarabking", "Três portas abertas. Agora o Horizonte não tem onde se esconder — só a Forja Fundadora."),
      L("sistema", "PANTEÃO DESPERTO 3/3. ALERTA: O HORIZONTE INVADIU A FORJA FUNDADORA.", "alarm"),
    ],
  },
  {
    id: "forja", num: 22, title: "A FORJA FUNDADORA", subtitle: "Coração de Aurora · Onde os Campeões nasceram",
    synopsis: "O Horizonte quer derreter cada chassi de volta a metal sem nome. Nara não vai deixar.",
    art: intro(4), thumb: intro(4), recommended: 66, reward: { gold: 78000, xp: 19000, item: "mega_repair", qty: 6 }, map: { x: 88, y: 22, region: "FORJA FUNDADORA" },
    beats: [
      L("nara", "Esta é a forja onde os fundadores fizeram o primeiro Campeão. Meu avô varria esse chão."),
      L("eventhorizon", "Todo chassi começou como metal sem nome. Eu só vou devolvê-los ao começo.", "quake"),
      L("nara", "Nem pensar. Piloto, segura ele longe dos cadinhos. Eu preciso de três minutos e uma chave grande."),
      L("aurorion", "Esta forja me fez. Se ela cair, quero cair aqui também.", "zoom"),
      { kind: "battle", id: "forja-1", label: "FORJA · METAL SEM NOME", arena: "foundry", enemies: [{ id: "blastfurnace", level: 65, trained: 47, statScale: 0.98 }, { id: "titanforge", level: 65, trained: 47, statScale: 0.98 }] },
      L("nara", "Pronto! Reverti os cadinhos. Agora a forja não derrete — ela RECONSTRÓI.", "flash"),
      { kind: "choice", flag: "forja", prompt: "O que forjar com o último lingote da Primeira Luz?", options: [
        { value: "lamina", label: "Uma lâmina para Aurorion", reply: [L("aurorion", "Uma lâmina que corta destino. Vou usá-la só uma vez.")] },
        { value: "chave", label: "A chave que qualquer criança possa usar", reply: [L("nara", "Como eu prometi no Núcleo. A luz não vai ter dono.", undefined, ["primeira", "guardar"]), L("nara", "Uma chave. Se a gente cair, alguém abre a porta de novo.")] },
      ] },
      { kind: "battle", id: "forja-2", label: "FORJA · O AVATAR DO FIM", arena: "volcano", enemies: [{ id: "eventhorizon", level: 67, trained: 49, statScale: 1 }, { id: "voidmantis", level: 66, trained: 48, statScale: 0.96 }] },
      L("eventhorizon", "Vocês insistem em recomeçar. Então vou esperar onde tudo começou: na Primeira Luz.", "glitch"),
      L("lyra", "Ele está fugindo para o núcleo da faísca original. Não existe lugar mais perigoso — nem mais importante."),
      L("sistema", "ROTA FINAL: A FAÍSCA ANTES DO TEMPO.", "flash"),
    ],
  },
  {
    id: "faisca", num: 23, title: "ANTES DO TEMPO", subtitle: "A faísca original · Silêncio absoluto",
    synopsis: "Dentro do primeiro instante, Lyra encontra a gravação que mudou a história da Guerra Fundadora.",
    art: intro(2), thumb: intro(2), recommended: 70, reward: { gold: 88000, xp: 22000, item: "revive_core", qty: 8 }, map: { x: 12, y: 14, region: "A FAÍSCA" },
    beats: [
      L("narrador", "Aqui não existe chão nem céu. Só a Primeira Luz, pequena como no começo, tremendo no escuro."),
      L("sistema", "GRAVAÇÃO DA GUERRA FUNDADORA ENCONTRADA. REPRODUZIR?", "alarm"),
      L("lyra", "…É a minha voz. Quarenta anos atrás. Eu tinha ordens de apagar a faísca para encerrar a guerra."),
      L("lyra", "Eu desobedeci. Por isso o Horizonte nasceu: ele é a ordem que eu não cumpri."),
      L("nara", "Comandante… você carregou isso sozinha esse tempo todo?"),
      L("lyra", "Por isso o Aurorion recusou todos os pilotos. Ele esperava alguém que não tivesse medo de corrigir meu erro."),
      { kind: "choice", flag: "faisca", prompt: "O que dizer para Lyra?", options: [
        { value: "erro", label: "“Não foi um erro. Foi uma escolha.”", reply: [L("lyra", "…Então vamos fazê-la valer. Juntos, piloto.")] },
        { value: "carregar", label: "“Agora nós carregamos isso com você.”", reply: [L("lyra", "Esquadrão Primeira Luz. Eu nunca disse isso em voz alta. Obrigada.")] },
      ] },
      { kind: "battle", id: "faisca-1", label: "FAÍSCA · ECOS DA GUERRA FUNDADORA", arena: "genesis", enemies: [{ id: "chronofracture", level: 69, trained: 50, statScale: 0.98 }, { id: "seraphimvoid", level: 69, trained: 50, statScale: 0.98 }] },
      { kind: "battle", id: "faisca-2", label: "FAÍSCA · A ORDEM NÃO CUMPRIDA", arena: "genesis", enemies: [{ id: "eventhorizon", level: 71, trained: 52, statScale: 1.02 }, { id: "npc_chronoguard", level: 70, trained: 51, statScale: 0.98 }] },
      L("eventhorizon", "Mesmo ferido, eu sou inevitável. Toda história termina.", "glitch"),
      L("aurorion", "Toda história termina. Mas nenhuma termina do jeito que o fim quer."),
      L("sistema", "O HORIZONTE RECUOU PARA O SILÊNCIO FINAL. CONFRONTO DEFINITIVO DISPONÍVEL.", "flash"),
    ],
  },
  {
    id: "silencio", num: 24, title: "O ÚLTIMO SILÊNCIO", subtitle: "Fim de toda rota · Primeira Luz",
    synopsis: "Todo o Panteão, toda Aurora e até o Vazio lutam lado a lado. Uma escolha final decide o que vem depois.",
    art: intro(1), thumb: intro(1), recommended: 75, reward: { gold: 120000, xp: 30000, item: "energy_cell", qty: 25 }, map: { x: 62, y: 10, region: "O ÚLTIMO SILÊNCIO" },
    beats: [
      L("narrador", "O universo prende a respiração. Do outro lado do escuro, o Horizonte abre um olho do tamanho de um sol."),
      L("valkyrune", "Asgard está com você."),
      L("aurumtitan", "O Olimpo também. A balança, hoje, pesa a seu favor."),
      L("scarabking", "E Duat lembra quem a libertou.", undefined, ["duat", "perder"]),
      L("scarabking", "Duat dói, mas está livre. E luta.", undefined, ["duat", "libertar"]),
      L("voidarchon", "A sombra fica ao lado da luz. Até o fim.", undefined, ["farol", "aliado"]),
      L("voidnavigator", "Todas as rotas que mapeei convergem para este segundo. Faça ele valer."),
      L("lyra", "Esquadrão Primeira Luz — este é o último lançamento. LANÇAR!", "flash"),
      { kind: "battle", id: "silencio-1", label: "SILÊNCIO · A MARÉ DO FIM", arena: "rift", enemies: [{ id: "voidsingularity", level: 73, trained: 54, statScale: 1 }, { id: "voidcaller", level: 73, trained: 54, statScale: 1 }] },
      L("eventhorizon", "VOCÊS NÃO ENTENDEM. SEM FIM, NADA TEM SENTIDO.", "quake"),
      L("aurorion", "Sentido não vem do fim. Vem de quem escolhe continuar.", "zoom"),
      { kind: "battle", id: "silencio-2", label: "SILÊNCIO · HORIZONTE DE EVENTOS", arena: "genesis", enemies: [{ id: "eventhorizon", level: 76, trained: 56, statScale: 1.06 }] },
      { kind: "choice", flag: "silencio", prompt: "O Horizonte está caído. O que fazer com ele?", options: [
        { value: "apagar", label: "Apagá-lo para sempre", reply: [L("narrador", "O círculo negro se fecha em um ponto. E o ponto, finalmente, some."), L("lyra", "Acabou. Desta vez eu cumpri a ordem — do meu jeito.")] },
        { value: "fronteira", label: "Transformá-lo na borda do mapa", reply: [L("eventhorizon", "…Uma borda. Não um fim. Algo que se pode atravessar."), L("voidnavigator", "Um horizonte que se move conforme a gente anda. É assim que deveria ser.")] },
      ] },
      L("narrador", "Em Aurora, três sóis se acendem. Depois quatro. Depois milhares, em cidades que ninguém conhecia."),
      L("nara", "Piloto… a Forja está chamando. Tem um chassi novo esperando um nome."),
      L("aurorion", "A primeira luz nos acordou. Todas as próximas serão nossas."),
      L("sistema", "CRÔNICAS DA PRIMEIRA LUZ — SAGA CONCLUÍDA. OBRIGADO, PILOTO.", "flash"),
    ],
    final: "A cidade amanheceu. Mas, no céu, um cristal violeta acaba de rachar… A SAGA II — A COROA FRATURADA — foi liberada.",
  },
];

/** Ordem importa: o requisito implícito de cada capítulo é o anterior desta lista. Contos usam `requires`. */
export const STORY_CHAPTERS: StoryChapter[] = [...SAGA1, ...SAGA2, ...SAGA3, ...CONTOS];

export const STORY_MAP = Object.fromEntries(STORY_CHAPTERS.map((c) => [c.id, c])) as Record<string, StoryChapter>;

export function chapterRequirement(index: number): StoryChapter | null {
  const c = STORY_CHAPTERS[index];
  if (!c) return null;
  if (c.requires) return STORY_MAP[c.requires] ?? null;
  return index > 0 ? STORY_CHAPTERS[index - 1] : null;
}
export function chapterUnlocked(cleared: string[], index: number): boolean {
  const req = chapterRequirement(index);
  return !req || cleared.includes(req.id);
}
/** Próximo capítulo da mesma saga (para o botão “PRÓXIMO”). */
export function nextChapter(c: StoryChapter): StoryChapter | null {
  if (c.final) return null;
  const i = STORY_CHAPTERS.findIndex((x) => x.id === c.id);
  const n = STORY_CHAPTERS[i + 1];
  return n && chapterSaga(n) === chapterSaga(c) ? n : null;
}

export function storyEnemies(b: StoryBattle) {
  return b.enemies.map((e) => ({ id: e.id, level: e.level, xp: 0, trained: { str: e.trained, def: e.trained, agl: e.trained }, statScale: e.statScale }));
}

/** Recompensa normal de uma luta da história (como qualquer batalha). Paga ouro/XP à equipe. */
export function payStoryFight(b: StoryBattle, won: boolean): { gold: number; xp: number; levelUps: { name: string; level: number }[] } {
  const raw = b.enemies.reduce((acc, e) => {
    const r = fightReward(ROBOT_MAP[e.id].ratios, e.level);
    return { gold: acc.gold + r.gold, xp: acc.xp + r.xp };
  }, { gold: 0, xp: 0 });
  const earned = applyPetRewards(won ? raw : { gold: Math.round(raw.gold / 4), xp: Math.round(raw.xp / 4) });
  const levelUps = distribute(earned.gold, earned.xp);
  if (won) incBattlesWon();
  return { ...earned, levelUps };
}

function distribute(gold: number, xp: number) {
  const g = getState();
  addGold(gold);
  addPlayerXP(xp);
  const levelUps: { name: string; level: number }[] = [];
  const team = new Set(g.team);
  updateRobots(g.robots.map((r) => {
    if (!team.has(r.id)) return r;
    const res = grantXP(r, xp);
    if (res.levelsGained > 0) levelUps.push({ name: ROBOT_MAP[r.id]?.name ?? r.id, level: res.save.level });
    return res.save;
  }));
  return levelUps;
}

export function setStoryFlag(flag: string, value: string) {
  setState((s) => ({ ...s, story: { ...s.story, flags: { ...s.story.flags, [flag]: value } } }));
}
export function markStoryOpened(id: string) {
  setState((s) => (s.story.last === id ? s : { ...s, story: { ...s.story, last: id } }));
}

/**
 * Conclui um capítulo. A recompensa de estreia é paga uma única vez: a checagem e a marcação
 * acontecem na mesma transação de estado, então replays, cliques duplos e recargas não duplicam.
 */
export function completeStoryChapter(id: string): { first: boolean; gold: number; xp: number; item?: string; qty?: number } {
  const ch = STORY_MAP[id];
  if (!ch) return { first: false, gold: 0, xp: 0 };
  let first = false;
  setState((s) => {
    if (s.story.cleared.includes(id)) return s;
    first = true;
    return {
      ...s,
      gold: s.gold + ch.reward.gold,
      items: { ...s.items, [ch.reward.item]: (s.items[ch.reward.item] ?? 0) + ch.reward.qty },
      story: { ...s.story, cleared: [...s.story.cleared, id] },
    };
  });
  if (!first) return { first: false, gold: 0, xp: 0 };
  addPlayerXP(ch.reward.xp);
  return { first: true, gold: ch.reward.gold, xp: ch.reward.xp, item: ch.reward.item, qty: ch.reward.qty };
}
