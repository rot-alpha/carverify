# Guia do Tutor (guide_tutor.md)

## Status Atual
- [x] Criação da arquitetura em 3 camadas (`directives/`, `execution/`, `src/`).
- [x] Design System e UI do Dashboard (HTML/CSS/JS puro, design premium e responsivo).
- [x] Mapeamento dos 10 veículos da frota e 29 perguntas do checklist real.
- [x] Integração de dados reais da planilha do Google Sheets (Abril a Agosto de 2026).
- [x] Calendário com seleção de mês/dia e visualização compilada ou detalhada por dia.
- [x] Cálculo e gráfico dinâmico de KM acumulado e no dia.
- [x] Algoritmo de NLP para detecção de reincidência de relatos com similaridade de Jaccard.
- [x] Ferramenta determinística de sincronização (`execution/sync_sheets.js`) e diretiva (`directives/sync_sheets.md`).
- [x] Botão de sincronização ao vivo no header do dashboard.
- [x] Configuração para deploy no Vercel (`vercel.json`) e Netlify (`netlify.toml`).
- [x] Diretiva de publicação ([deploy_vercel_netlify.md](file:///c:/Users/ggsantos/Desktop/PROJETOS/Painel%20Checklist%20Frota/directives/deploy_vercel_netlify.md)).
- [x] Automação de sincronização horária via GitHub Actions (`.github/workflows/sync.yml`).
- [x] Suporte a Tema Claro e Escuro (Dark/Light mode) com alternador no topo e persistência local.
- [x] Exibição contextual do motorista ao selecionar o dia no checklist (e ocultação automática na visão compilada).
- [x] Seletor dinâmico de mês no card "Conformidade Geral da Frota" com cálculo consolidado de toda a frota (mês a mês e visão geral).
- [x] Filtro mensal posicionado acima dos cartões da frota com sincronização e recálculo dinâmico da conformidade, KM e motoristas por veículo.
- [x] Gerador de Apresentação PowerPoint (.pptx) com seleção de tema (Dark/Light), período, slide compilado e/ou páginas mensais, engajamento em porcentagem e análise executiva de 5 linhas com IA.
- [x] Correção da persistência do histórico de motoristas recentes nos cartões da frota independente da alteração/virada de mês.
- [x] Nova identidade visual automobilística **CAR . VERIFY**: tipografia Google Fonts `Montserrat Black (900)` com kerning esportivo, roda hiper-realista com friso âmbar e estrela central, rastro de borracha/pneu na passagem de ida, revelação do nome ao voltar com GSAP e módulo Three.js procedimental 3D (/img2threejs).
- [x] Releitura esportiva da roda inspirada na foto de referência: pneu de alto desempenho largo com 4 canais longitudinais e ranhuras direcionais, garganta profunda (deep-dish) escalonada em cromo espelhado, 5 lâminas curvas aerodinâmicas (turbine blades) em prata líquida, cubo cônico rebaixado com 5 parafusos usinados e válvula de calibragem; eliminação total do corte/clipping inferior com alinhamento preciso na linha de rodagem e alternador de ângulo 3D (frontal vs isométrica 3/4).
