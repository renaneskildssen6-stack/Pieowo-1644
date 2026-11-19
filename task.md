# Task
- Fonte clonada, catálogo de 291 personagens fixos: 256 comuns, 27 míticos, 8 NPCs.
- Aprovação: gerar todos de uma vez; galeria escura simples sem template, PNG individual/folhas/ZIP.
- FLUX Turbo Edit falhou em identidade e grade, descartado; 6 novas folhas geradas via GPT Image Flare 2k.
- Final: extrair retratos quadrados somente das ilustrações novas, nunca dos sprites-fonte; montar folhas 10×5 e última 41.
- Implementar galeria estática React, iniciar servidor; compilação obrigatória, sem suíte de testes.
- Não prometer fidelidade perfeita: variações de IA são esperadas.
- Revisão 2 aprovada: só rostos em close, mantendo pixel art, todas as folhas de uma vez.
- 6 folhas redesenhadas via Sunburst; novos PNGs/folhas/ZIPs substituídos, manifesto versão 2 e URL de retratos com cache bust.
- Nova coleção aprovada: 291 bustos anime pixel art da barriga para cima, 20 por folha, todas de uma vez; preservar rostos.
- 15 gerações concluídas via Sunburst 2k. Folha 02 inicialmente bloqueada por créditos, concluída após Continue.
- 291 PNGs 200×250 e 15 folhas 1000×1000; última com 11, distribuição esparsa normalizada. ZIP próprio e ZIPs por lote.
- Site atualizado com alternância Bustos/Rostos, folha e downloads por coleção, bustos sem recorte CSS.
- Drones aprovados: um por robô, 291, todas as 6 folhas em pixel art anime, nomes e efeitos sugeridos sem implementação.
- Primeiro lote rejeitado por parecer miniaturas; segunda versão gerada com referências SOMENTE de paleta, fuselagens/rotores/sensores, sem anatomia humanoide.
- 291 PNGs 160×160, 6 folhas 1600×800, JSON nomes/donos/papéis/efeitos e ZIP próprio. 10 arquétipos de suporte, números conceituais, não balanceados.
- Terceira aba Drones integrada; nomes/donos nos cards, efeitos e referência do dono no modal. Rostos e bustos preservados.
- Integração local no app gerenciado: jogo em `/`, galeria em `/galeria`, arquivo de 600 sprites em `/assets`; save anterior e PvP mantidos. O usuário dispensou GitHub.
- Drones 241–291 regenerados em folhas menores e reenquadrados. 873 PNGs antigos receberam alfa por segmentação automática; 600 sprites novos em PNG RGBA e folhas sólidas/translúcidas. Revisão visual mostra possíveis imperfeições em alguns bustos/recortes gerados por IA.
- Drones com construção, vínculo, melhoria e suporte limitado no combate offline/mineração; conceitos antigos da galeria não correspondem integralmente às mecânicas atuais. ZIP conjunto 1.473 PNGs em `/downloads/todos-transparentes.zip`.
- Casa-laboratório panorâmica construída e conectada à entrada do jogo, com caminhada, câmera, estações e saída/retorno à cidade. Forja real é principal interação, respeita desbloqueio existente. Verificar preview final e build antes da entrega.

## Expansão — 25/10/2026
- Casa: aceleração, corrida, pulo duplo, plataformas, controles de exploração, troca de robô e animações de heroSheet. Núcleo privado só na casa: escanear chassis, analisar amostras, fabricar scanner/projetor por 60s e selecionar iluminação. Biometria, análise, reserva de projeto e coleta de projeto terminado verificadas em navegador.
- Cidade: segundo eixo contínuo de chão, atalhos de faixa, comércio frontal e praça traseira. S/↓ vai à frente, I vai atrás; W/↑ mantém pulo. NPCs Lyra/Nara, supermercado com preço real antes da compra e museu mineral com doação única. Construção continua sendo acesso aos sistemas reais, não simulação de construção.
- Metrô: entradas com escadaria desenhada; plataforma subterrânea caminhável, corrida, pulo duplo, controles touch, trem e sete saídas gratuitas. Movimento/pulo, embarque para Mina e visitas persistidas verificados. É uma plataforma lateral pequena, não uma rede inteira de túneis exploráveis.
- Loja arcade: mercador robótico, abas, busca, filtro de saldo, quantidades e confirmação. Compra de cinco reparos debitou 600 ouro e acrescentou cinco itens. Verificada após reload.
- Mina: golpe mantido, telemetria ligada ao scanner da casa, contratos únicos, venda seletiva de brutos, elevador gratuito entre níveis abertos, três lotes em fila depois do atual, confirmação de venda total. Hold quebrou um veio; elevador sem cobrança, reserva de dois lotes, coleta única de ambos, cancelamento de venda e preservação de lingotes na venda seletiva verificados.
- Produção fracionária persiste entre ticks; cálculo puro verificou 12 unidades em 10 minutos com ticks de 5s e preenchimento da última vaga do silo. Corrigido uso errado da capacidade no painel.
- BRIEFING/PANTEÃO/retorno à casa ocultos enquanto painéis locais estiverem abertos, sem sobreposição. Sem erros de página nos dois walkthroughs.
- Arquivos de verificação em `/home/user/robot-work`: `expansion-browser-report.json`, `collection-browser-report.json` e screenshots correspondentes. Cenário de coleta simula jobs já expirados; não executa espera real de seis minutos.
- Build final com tsc e Vite passou após proteções de estado e ajustes mobile; avisos não bloqueantes de tamanho de bundle e depreciação de Node. Preview permanece na porta gerenciada 4200. Viewport de 390px verificado, troca de robô e briefing sem sobreposição.
- Galeria e downloads preservados. Recortes alpha de IA ainda podem ter imperfeições; poderes conceituais dos drones não são todos mecânicas implementadas. GitHub dispensado.
## Cidade e metrô premium (IA + assets antigos) — 2026-10-28
Feito e verificado no navegador (480×900, 390×844 com reduced-motion, 1366×768):
- Arte IA nova em `public/city-premium/` (Sunburst: skylines central/industrial + parede do metrô; Flare: atlas de 8 props + 4 texturas). Alpha dos props extraído de fundo magenta e limpo de franja; não é perfeito em todo pixel.
- Integrado em `connected-city-renderer.ts`: skylines com parallax/espelhamento e mistura por distrito, tráfego aéreo e carros do atlas antigo, texturas no plano do mundo (transform afim), laje em corte, parede IA em coordenadas de mundo, escadaria contínua calçada→plataforma, trem do atlas antigo, luz aditiva, garoa/poeira (desligadas em reduced-motion). 16 fachadas originais intactas.
- `game/connected-city.ts`: 97 props deterministas no meio-fio com colisão (portas, bocas de metrô e travessias checadas livres), estação do Portal movida para leste do prédio, distritos com mistura.
- `game/city-traffic.ts`: 16 carros flutuantes que freiam diante do robô e mantêm distância.
- `components/city-art.ts`: manifesto, pré-carga, progresso, fallback de erro, cache de padrões/brilhos.
- `connected-city.tsx`: passo físico fixo 120 Hz, pausa com aba oculta, reduced-motion em cache, véu de carregamento, banner de distrito, dicas de controle recolhem após 9 s.
- `verify-connected-city.py` passa (andar, descer, trem até Mina, subir, sem cobrança, sem erros).
Não feito: gamepad, áudio, novos NPCs andando. Hub antigo e metrô modal antigos seguem no repositório, dormentes.

## Sessão: vertical + cinematográfico (concluído)
- Batalha portrait (battle-portrait.css, battle-world portrait sizing)
- Round card, establishing shot, danger pulse, grain/vignette, cortes de tela, câmera na história, busts no hangar
- Clima dinâmico + neon na cidade
- storyArc() exibido na lista de capítulos

## Sessão: imersão + passe + missões + emotes IA
- Animação de andar (hero.ts heroPose/drawHeroPosed/poeira) em cidade, hub, mapa, casa.
- Dano: mk-hurt/flash/faíscas; morte: mk-dying (preto 1s → fade) + mk-death-boom. Verificado via playwright no /battle-test (segurar orb 2s).
- Laboratório: screens/lab-bench.tsx + lab.css (montagem por etapas, preview, stats).
- Passe de temporada (30 tiers, grátis + ELITE 3000 ouro), missões diárias (4/dia + baú), login 7 dias: game/pass.ts (localStorage mecha_pass_v1), components/pass-hub.tsx no system-dock. trackBattle em battle.tsx continueBattle.
- 12 emotes IA em public/emotes/*.png (gpt-image-2.5-flare, sheet → split).
- Página dev /ui-test?v=pass|lab (só DEV).

## Sessão: sistemas 100x + laboratório 20x
- Cidade: HUD reorganizado (system-dock por categorias, connected-city).
- Passe v2 (game/pass.ts, pass-hub, pass-reveal em portal fixo z 9999): diário, passe, missões semanais, cofre, reroll, RESGATAR TUDO.
- Laboratório: famílias/sinergias (lab-synergy.ts, set ORIGINAL +3), lab-tools (nota S-C, ordenação, filtro, nomes, rascunho mecha_lab_draft_v1, presets mecha_lab_presets_v1),
  bancada com aura/encaixe/solda/count-up/radar/diffs, LabFinal (dado de nome, presets, falta), cerimônia de construção, hangar novo. Layout 2 colunas em paisagem.
- Dev: /ui-test?v=labrich dá ouro+lingotes pro teste do lab.
- Verificado por screenshot 390x844 e 844x390: bancada, passos, final, hangar, cerimônia (retrato), reveal do passe.

## Sessão — Modo História expandido + paisagem da batalha
- Story: STORY_CHAPTERS = SAGA1(24) + SAGA2(12, story-saga2.ts) + SAGA3(12, story-saga3.ts) + CONTOS(8, story-contos.ts) = 56.
- Elenco em game/story-cast.ts (CAST/CAST_ALLIES); faixa ELENCO em components/story-cast.tsx.
- Mapa movido para screens/story-map.tsx (abas de saga, tagline, arcos); estilos em screens/story-saga.css (story.css está no limite de 500 linhas).
- Retratos: entrada com easing (sg-in-left/right) substitui steps.
- Batalha paisagem (<=500px altura): console em 2 colunas (mensagem | esferas), câmera/LOG/velocidade sobem para 40% — em battle-pace.css.
- Verificado: mapa 390x844 e 844x390, cena com retrato Capitã Juno, transição VS, turno em paisagem. tsc limpo.
- HOLD_MS=2000 mantido (pedido do usuário).

## Ranqueada online + skins IA (cont. 17)
- Ranqueada online: tabela mecha_online_ratings, api/online/ranked.ts (Elo, janela de rating crescente), aba RANQUEADA no lobby online, botão RANQUEADA ONLINE na tela de ranqueado, delta de rating no fim da partida. Testado via API (2 contas convidadas).
- Skins IA: 256 skins exclusivas (ai_<robô>), 16 temas × 16 robôs. flux-2 turbo edit repintou o quadro 0 em folhas 4x4 (/home/user/skins), transfer.py transfere a cor para os 16 quadros → public/skins/<id>.png (quantizado 96 cores, 11 MB). game/ai-skins.ts, SKIN_MAP inclui, RobotSprite aceita skin.sprite, applySkin bloqueia skin de outro robô. Tile "SKIN IA EXCLUSIVA" (150 diamantes) na tela SKINS. ui-test ?v=skins / ?v=ranked.
- Hangar: components/hangar-skin.tsx (palco com skin, cards da grade e do painel de equipe com skin, faixa SKINS para aplicar/comprar direto). ui-test ?v=hangar.

## Rodada 19
- Ranqueada agora só online (RankedScreen -> OnlineScreen rankedOnly, guest login automático). Bot após 8–20s (api/online/ranked-bot.ts), conta rating, sem rótulo IA.
- Cutscene: public/intro/intro.mp4 (15 clipes minimax h3 480p, 4s cada, 4fps, 320x180 paleta 64 cores, upscale nearest). intro-cutscene.tsx desenha o vídeo no canvas; fallback p/ animação antiga (erro/reduced-motion). Custo mídia: $3.75.

## Rodada 20
- Fix: story-map mapMove lia drag.current! dentro do updater do setState após pointerup (null.ox). Captura local.
- Fix: exploration-controls update() protege stick.current null.
- Novo components/battle-fx.tsx: 2 canvases low-res (SCALE 3), 30/24fps, cap 170/90 partículas, pausa em hidden, reduced-motion = frame estático. Ambiente por arena/clima, feixes, holofotes, lâmpadas, poças de luz, drone, sombra dinâmica com furos, faíscas/anéis/luz de impacto, fumaça de KO.
- Intensidades reduzidas após teste visual (sem estouro de brilho).
- ui-test ?v=story para smoke test (/home/user/st.py).
