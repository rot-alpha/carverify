# Diretiva: Protótipo da Tela de Login e Controle de Acesso (CAR . VERIFY)

## 1. Objetivo
Desenvolver, iterar e validar em ambiente isolado (`src/prototipo_login.html`) o sistema de login e solicitação/recuperação de credenciais do **CAR . VERIFY**, garantindo design sênior, animações fluidas em GSAP e aderência total às regras de contas com permissões delimitadas pelo administrador antes da promoção para produção.

## 2. Arquivos Envolvidos
- **Protótipo Isolado:** `src/prototipo_login.html`
- **Skill de Ativação Rápida:** `.agents/skills/prototipologin/SKILL.md` (acionada via `/prototipologin` ou `prototipologin`)
- **Arquivos Protegidos (Não alterar durante fase de protótipo):** `src/index.html`, `src/js/app.js`

## 3. Regras de Negócio e UX Implementadas (v3)
1. **Painel Esquerdo (Identidade & Valor):**
   - Logo **CAR . VERIFY** refinada em SVG vetorial no canto superior esquerdo.
   - Saudação enxuta: **`Bem-vindo.`**
   - 4 tópicos das funcionalidades do sistema (*Checklist Digital Diário*, *Quilometragem & Calendário*, *Alertas de Reincidência*, *Manutenção & Custos*) com ícones animados continuamente em GSAP e aceleração interativa no hover.
2. **Autenticação por Conta Fornecida (`#viewLogin`):**
   - O acesso utiliza exclusivamente **contas vigentes** fornecidas pela administração (sem links redundantes na aba `Entrar`, concentrando toda a navegação na barra superior de abas).
   - Contas base configuradas:
     - `adm.sandro` (senha: `manutsandro`) — Administração · Manutenção
     - `adm.julio` (senha: `frotajulio`) — Administração · Frota
     - `dev.g` (senha: `CVAEgl30!`) — Desenvolvedor Master (única conta que habilita a aba de Gestão de Contas)
     - `rot.alpha` (senha: `rotalpha1`) — Operação · Roteirização
3. **Aba Exclusiva `🔒 Contas` (`#viewDevAccounts` — Visível apenas para `dev.g`):**
   - Oculta por padrão (`hidden`) e inacessível para todas as demais contas.
   - Ao autenticar com `dev.g` (`CVAEgl30!`), a 4ª aba **`🔒 Contas`** é liberada automaticamente, listando todas as contas vigentes (com opções para revelar/ocultar senha, copiar credenciais e remover contas adicionais) e oferecendo o formulário **"Criar Nova Conta de Acesso"** (única forma de criar novas contas na plataforma).
4. **Fluxos Institucionais "Solicitar Conta" (`#viewRequestAccount`) e "Esqueci a Senha" (`#viewForgotPassword`):**
   - Textos 100% institucionais (**Central de Gestão de Acessos**, **Recuperação de Credenciais** e **Administração da Frota**), ocultando o nome e o e-mail pessoal do administrador na interface e mantendo o roteamento interno no script.

