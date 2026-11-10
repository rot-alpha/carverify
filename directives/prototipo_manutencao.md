# Diretiva: Protótipo de Controle Operacional e Manutenção da Frota (`/prototipomanut`)

## Objetivo
Manter, evoluir e testar de forma isolada o protótipo interativo do módulo **Manutenção & Frota** (`src/prototipo_manutencao.html`), garantindo zero impacto no ambiente de produção (`src/index.html`) até aprovação final do usuário.

## Atalho de Retomada
- Comando / Skill: `/prototipomanut` ou `prototipomanut` (`.agents/skills/prototipomanut/SKILL.md`)
- Arquivo do Protótipo: `src/prototipo_manutencao.html`

## Especificações Consolidadas (v3.6)
1. **Arquitetura Multi-Aba Completa (`Veículos (Checklists)` ↔ `Manutenção & Frota`):**
   - **Aba `Veículos (Checklists)` integrada no protótipo**: permite visualizar e analisar o projeto como um todo. Inclui toolbar de placas com badges de NOK pendente, mini calendário com marcação de dias com falhas, indicadores de conformidade e KM, observações reais do Google Forms, alertas de reincidência e tabela completa de checklist com os botões interativos de **`❌ NOK`**.
   - Ao interagir com qualquer NOK na aba `Veículos`, o botão **`Manutenção`** direciona automaticamente para a aba `Manutenção & Frota`, com o veículo selecionado, o formulário aberto e o Sistema Mecânico pré-configurado.
2. **Eliminação do Vazio Central — 3 Gráficos com Disposição Responsiva:**
   - **Na Visão Geral da Frota**: Os 3 gráficos ficam dispostos em **linha horizontal lado a lado (3 colunas em grid)**:
     1. *Incidência por Tipo de Manutenção (Sistemas Mecânicos)*
     2. *Investimento em Manutenção (R$ por Veículo no Mês)*
     3. *Dias Parados por Veículo (Comparativo da Frota)*
     Aproveitando 100% da largura da tela sem barras espremidas e sem áreas pretas/vazias.
   - **Com Veículo Selecionado**: Ao clicar em uma placa, o formulário de sinalização se abre na esquerda e os 3 gráficos se empilham verticalmente na coluna direita abaixo dos KPIs do veículo.
3. **Limpeza Visual da Tela de Manutenção:**
   - O card redundante de NOKs do topo de `Manutenção & Frota` foi removido (a triagem de NOKs agora é centralizada com excelência na aba `Veículos (Checklists)`).
3. **Padrão Sênior *Extract-and-Discard* & Histórico em 2 Estágios:**
   - Extração efêmera em memória RAM (`0 bytes` no Supabase Storage e `~0,8 KB JSONB` no PostgreSQL).
   - Botão **`Inserir NF (IA / Manual)`** no histórico para consolidação posterior.
