/* ============================================================================
   CAR · VERIFY — Auth & Account Management Module (Production)
   Contas oficiais vigentes + Aba exclusiva de Gestão de Contas para dev.g
   ============================================================================ */
(function () {
    'use strict';

    var ADMIN_EMAIL = 'gabriel.santos@alphacandies.com.br';
    var ACCOUNTS_STORAGE_KEY = 'car_verify_accounts_v1';
    var SESSION_STORAGE_KEY = 'car_verify_prod_auth_v2';
    try {
        sessionStorage.removeItem('car_verify_active_session_v1');
        localStorage.removeItem('car_verify_active_session_v1');
    } catch (e) {}

    var DEFAULT_ACCOUNTS = [
        { login: 'adm.sandro', password: 'manutsandro', role: 'Administração · Manutenção', isDev: false, isCore: true },
        { login: 'adm.julio',  password: 'frotajulio',  role: 'Administração · Frota',      isDev: false, isCore: true },
        { login: 'dev.g',      password: 'CVAEgl30!',   role: 'Desenvolvedor Master',       isDev: true,  isCore: true },
        { login: 'rot.alpha',  password: 'rotalpha1',   role: 'Operação · Roteirização',    isDev: false, isCore: true }
    ];

    var revealedPasswords = {};
    var activeSession = null;

    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function loadAccounts() {
        try {
            var raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    var map = {};
                    parsed.forEach(function (a) {
                        if (a && a.login) map[a.login.toLowerCase()] = a;
                    });
                    DEFAULT_ACCOUNTS.forEach(function (def) {
                        map[def.login.toLowerCase()] = Object.assign({}, map[def.login.toLowerCase()] || {}, def);
                    });
                    return Object.keys(map).map(function (k) { return map[k]; });
                }
            }
        } catch (e) {}
        return DEFAULT_ACCOUNTS.slice();
    }

    function saveAccounts(list) {
        try { localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
    }

    var accounts = loadAccounts();
    saveAccounts(accounts);

    function getSavedSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || !data.login) return null;
            return accounts.find(function (a) { return a.login.toLowerCase() === data.login.toLowerCase(); }) || null;
        } catch (e) {
            return null;
        }
    }

    function renderAccountsScreen() {
        var tbody = document.getElementById('platformAccountsTableBody');
        var kpiTotal = document.getElementById('accKpiTotal');
        var kpiAdmins = document.getElementById('accKpiAdmins');
        var kpiOps = document.getElementById('accKpiOps');
        if (!tbody) return;

        accounts = loadAccounts();
        var adminCount = accounts.filter(function (a) { return a.isDev || a.role.indexOf('Administra') !== -1; }).length;
        var opsCount = accounts.length - adminCount;

        if (kpiTotal) kpiTotal.textContent = String(accounts.length);
        if (kpiAdmins) kpiAdmins.textContent = String(adminCount);
        if (kpiOps) kpiOps.textContent = String(opsCount);

        tbody.innerHTML = accounts.map(function (acc) {
            var key = acc.login.toLowerCase();
            var isShown = !!revealedPasswords[key];
            var pwdDisplay = isShown ? escapeHtml(acc.password) : '••••••••';
            var badgeClass = acc.isDev ? 'acc-badge is-dev' : 'acc-badge';
            var badgeText = acc.isDev ? 'DEV MASTER' : (acc.isCore ? 'VIGENTE PADRÃO' : 'CONTA CRIADA');

            return ''
                + '<tr>'
                + '  <td>'
                + '    <div class="acc-login-cell">'
                + '      <span>' + escapeHtml(acc.login) + '</span>'
                + '      <span class="' + badgeClass + '">' + badgeText + '</span>'
                + '    </div>'
                + '  </td>'
                + '  <td>' + escapeHtml(acc.role) + '</td>'
                + '  <td><code class="acc-pwd-code">' + pwdDisplay + '</code></td>'
                + '  <td>'
                + '    <div class="acc-actions-cell">'
                + '      <button type="button" class="btn-acc-tbl" data-acc-action="toggle" data-login="' + escapeHtml(acc.login) + '">'
                +          (isShown ? 'Ocultar senha' : 'Ver senha')
                + '      </button>'
                + '      <button type="button" class="btn-acc-tbl" data-acc-action="copy" data-login="' + escapeHtml(acc.login) + '">Copiar</button>'
                +        (!acc.isCore ? '<button type="button" class="btn-acc-tbl is-danger" data-acc-action="delete" data-login="' + escapeHtml(acc.login) + '">Remover</button>' : '')
                + '    </div>'
                + '  </td>'
                + '</tr>';
        }).join('');
    }

    function applyPlatformSession(acc, rememberMe) {
        activeSession = acc;
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ login: acc.login }));
            if (rememberMe) {
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ login: acc.login }));
            }
        } catch (e) {}

        var overlay = document.getElementById('authGateOverlay');
        var navAccounts = document.getElementById('navAccounts');
        var userChip = document.getElementById('headerUserChip');
        var userNameEl = document.getElementById('headerUserName');

        document.body.classList.remove('auth-locked');
        if (overlay) overlay.hidden = true;

        if (userChip && userNameEl) {
            userNameEl.textContent = acc.login;
            userChip.hidden = false;
        }

        if (navAccounts) {
            navAccounts.style.display = acc.isDev ? '' : 'none';
        }

        renderAccountsScreen();

        if (typeof window.playCarVerifyLogoAnimation === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setTimeout(window.playCarVerifyLogoAnimation, 120);
        }
    }

    function logoutPlatformSession() {
        activeSession = null;
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {}

        var overlay = document.getElementById('authGateOverlay');
        var navAccounts = document.getElementById('navAccounts');
        var userChip = document.getElementById('headerUserChip');
        var accountInput = document.getElementById('accountUser');
        var pwdInput = document.getElementById('current-password');
        var btnSubmit = document.getElementById('btnSubmit');
        var btnLabel = document.getElementById('btnLabel');

        if (navAccounts) navAccounts.style.display = 'none';
        if (userChip) userChip.hidden = true;

        if (typeof window.navigateTo === 'function' && window.location.hash === '#contas') {
            window.navigateTo('home');
        }

        if (accountInput) accountInput.value = '';
        if (pwdInput) pwdInput.value = '';
        if (btnSubmit) btnSubmit.classList.remove('is-success');
        if (btnLabel) btnLabel.textContent = 'Entrar';

        document.body.classList.add('auth-locked');
        if (overlay) {
            overlay.hidden = false;
            if (accountInput) setTimeout(function () { accountInput.focus(); }, 80);
        }
    }

    function initAuthModule() {
        var overlay = document.getElementById('authGateOverlay');
        if (!overlay) return;

        /* Tema sincronizado no botão do overlay */
        var authThemeBtn = document.getElementById('authThemeToggle');
        if (authThemeBtn) {
            authThemeBtn.addEventListener('click', function () {
                var mainToggle = document.getElementById('btnThemeToggle');
                if (mainToggle) mainToggle.click();
            });
        }

        /* Abas do Login Gate (Entrar | Solicitar Conta | Esqueci a Senha) */
        var tabButtons = overlay.querySelectorAll('.auth-tab');
        var views = overlay.querySelectorAll('.auth-view');

        function switchGateTab(targetId) {
            tabButtons.forEach(function (btn) {
                btn.setAttribute('aria-selected', String(btn.dataset.target === targetId));
            });
            views.forEach(function (view) {
                var isTarget = view.id === targetId;
                view.hidden = !isTarget;
                if (isTarget && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    gsap.fromTo(view, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' });
                }
            });
        }

        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () { switchGateTab(btn.dataset.target); });
        });

        overlay.querySelectorAll('[data-switch-tab]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                switchGateTab(link.dataset.switchTab);
            });
        });

        /* Mostrar/Ocultar senha + Caps Lock */
        var pwd = document.getElementById('current-password');
        var pwdToggle = document.getElementById('pwdToggle');
        var capsHint = document.getElementById('capsHint');

        if (pwd && pwdToggle) {
            pwdToggle.addEventListener('click', function () {
                var show = pwd.type === 'password';
                pwd.type = show ? 'text' : 'password';
                pwdToggle.setAttribute('aria-pressed', String(show));
                pwdToggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
                pwd.focus({ preventScroll: true });
            });
        }

        if (pwd && capsHint) {
            function updateCaps(e) {
                if (typeof e.getModifierState === 'function') {
                    capsHint.hidden = !e.getModifierState('CapsLock');
                }
            }
            pwd.addEventListener('keydown', updateCaps);
            pwd.addEventListener('keyup', updateCaps);
            pwd.addEventListener('blur', function () { capsHint.hidden = true; });
        }

        /* Submit de Login */
        var loginForm = document.getElementById('loginForm');
        var accountInput = document.getElementById('accountUser');
        var rememberInput = document.getElementById('remember');
        var btnSubmit = document.getElementById('btnSubmit');
        var btnLabel = document.getElementById('btnLabel');
        var alertBox = document.getElementById('authAlert');
        var alertText = document.getElementById('authAlertText');
        var busy = false;

        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                if (busy) return;
                alertBox.hidden = true;
                busy = true;
                btnSubmit.setAttribute('aria-busy', 'true');
                btnLabel.textContent = 'Verificando…';

                var enteredLogin = accountInput.value.trim().toLowerCase();
                var enteredPassword = pwd.value;

                setTimeout(function () {
                    accounts = loadAccounts();
                    var matched = accounts.find(function (a) {
                        return a.login.toLowerCase() === enteredLogin && a.password === enteredPassword;
                    });

                    if (matched) {
                        busy = false;
                        btnSubmit.setAttribute('aria-busy', 'false');
                        btnSubmit.classList.add('is-success');
                        btnLabel.textContent = 'Acesso liberado';
                        setTimeout(function () {
                            applyPlatformSession(matched, rememberInput && rememberInput.checked);
                        }, 380);
                    } else {
                        busy = false;
                        btnSubmit.setAttribute('aria-busy', 'false');
                        btnLabel.textContent = 'Entrar';
                        alertText.textContent = 'Conta de acesso ou senha incorretas. Verifique suas credenciais.';
                        alertBox.hidden = false;
                        if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                            gsap.fromTo('#authGateOverlay .form-card', { x: 0 }, { keyframes: { x: [0, -10, 9, -6, 4, 0] }, duration: 0.45, ease: 'none' });
                        }
                        pwd.focus();
                        pwd.select();
                    }
                }, 650);
            });
        }

        /* Envios de Solicitação de Conta e Esqueci a Senha */
        function setupAdminRequestForm(opts) {
            var formEl = document.getElementById(opts.formId);
            if (!formEl) return;
            var emailEl = document.getElementById(opts.emailId);
            var msgEl = document.getElementById(opts.msgId);
            var btnEl = document.getElementById(opts.btnId);
            var labelEl = document.getElementById(opts.labelId);
            var confirmEl = document.getElementById(opts.confirmId);
            var sending = false;

            formEl.addEventListener('submit', function (e) {
                e.preventDefault();
                if (sending) return;
                var corpEmail = emailEl.value.trim();
                var userMsg = msgEl.value.trim();
                if (!corpEmail || !userMsg) return;

                sending = true;
                confirmEl.hidden = true;
                btnEl.setAttribute('aria-busy', 'true');
                labelEl.textContent = 'Enviando solicitação…';

                fetch('https://formsubmit.co/ajax/' + ADMIN_EMAIL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        _subject: opts.subjectPrefix + ' — ' + corpEmail,
                        tipo_solicitacao: opts.tipoLabel,
                        email_corporativo: corpEmail,
                        mensagem: userMsg,
                        sistema: 'CAR VERIFY - Gestão de Frota'
                    })
                }).catch(function () { return null; }).finally(function () {
                    setTimeout(function () {
                        sending = false;
                        btnEl.setAttribute('aria-busy', 'false');
                        btnEl.classList.add('is-success');
                        labelEl.textContent = opts.successBtnText;
                        confirmEl.innerHTML = '<strong>✔ Solicitação enviada à Administração da Frota</strong><br>'
                            + 'Recebemos sua mensagem. Os dados de acesso serão encaminhados para o e-mail corporativo informado (<b>' + escapeHtml(corpEmail) + '</b>).';
                        confirmEl.hidden = false;
                        setTimeout(function () {
                            btnEl.classList.remove('is-success');
                            labelEl.textContent = opts.defaultBtnText;
                        }, 4000);
                    }, 600);
                });
            });
        }

        setupAdminRequestForm({
            formId: 'requestAccountForm',
            emailId: 'reqEmail',
            msgId: 'reqMessage',
            btnId: 'btnRequestSubmit',
            labelId: 'btnRequestLabel',
            confirmId: 'reqConfirmBox',
            subjectPrefix: '[CAR VERIFY] Solicitação de Nova Conta',
            tipoLabel: 'Solicitação de Nova Conta e Permissões',
            defaultBtnText: 'Enviar solicitação de conta',
            successBtnText: 'Solicitação registrada'
        });

        setupAdminRequestForm({
            formId: 'forgotPasswordForm',
            emailId: 'forgotEmail',
            msgId: 'forgotMessage',
            btnId: 'btnForgotSubmit',
            labelId: 'btnForgotLabel',
            confirmId: 'forgotConfirmBox',
            subjectPrefix: '[CAR VERIFY] Relembrar Senha de Acesso',
            tipoLabel: 'Lembrete / Recuperação de Senha',
            defaultBtnText: 'Solicitar lembrete de senha',
            successBtnText: 'Pedido de senha registrado'
        });

        /* Botão Sair no Header */
        var btnHeaderLogout = document.getElementById('btnHeaderLogout');
        if (btnHeaderLogout) {
            btnHeaderLogout.addEventListener('click', logoutPlatformSession);
        }

        /* Aba Exclusiva de Gestão de Contas (dev.g) na Plataforma */
        var createAccForm = document.getElementById('platformCreateAccountForm');
        var accTableBody = document.getElementById('platformAccountsTableBody');

        if (accTableBody) {
            accTableBody.addEventListener('click', function (e) {
                var btnAct = e.target.closest('button[data-acc-action]');
                if (!btnAct) return;
                var action = btnAct.dataset.accAction;
                var loginKey = (btnAct.dataset.login || '').toLowerCase();
                var target = accounts.find(function (a) { return a.login.toLowerCase() === loginKey; });
                if (!target) return;

                if (action === 'toggle') {
                    revealedPasswords[loginKey] = !revealedPasswords[loginKey];
                    renderAccountsScreen();
                } else if (action === 'copy') {
                    var text = 'Login: ' + target.login + ' | Senha: ' + target.password;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text);
                    }
                    btnAct.textContent = 'Copiado!';
                    setTimeout(function () { btnAct.textContent = 'Copiar'; }, 1500);
                } else if (action === 'delete' && !target.isCore) {
                    accounts = accounts.filter(function (a) { return a.login.toLowerCase() !== loginKey; });
                    saveAccounts(accounts);
                    renderAccountsScreen();
                }
            });
        }

        if (createAccForm) {
            createAccForm.addEventListener('submit', function (e) {
                e.preventDefault();
                if (!activeSession || !activeSession.isDev) return;
                var loginEl = document.getElementById('platNewAccLogin');
                var pwdEl = document.getElementById('platNewAccPassword');
                var roleEl = document.getElementById('platNewAccRole');
                var feedbackEl = document.getElementById('platCreateAccFeedback');

                var newLogin = loginEl.value.trim().toLowerCase();
                var newPassword = pwdEl.value.trim();
                var newRole = roleEl.value;
                if (!newLogin || !newPassword) return;

                var exists = accounts.some(function (a) { return a.login.toLowerCase() === newLogin; });
                if (exists) {
                    if (feedbackEl) {
                        feedbackEl.textContent = '⚠️ Já existe uma conta vigente com o login "' + newLogin + '".';
                        feedbackEl.style.color = '#ef4444';
                        feedbackEl.hidden = false;
                    }
                    return;
                }

                accounts.push({
                    login: newLogin,
                    password: newPassword,
                    role: newRole,
                    isDev: false,
                    isCore: false
                });
                saveAccounts(accounts);
                revealedPasswords[newLogin] = true;
                renderAccountsScreen();

                loginEl.value = '';
                pwdEl.value = '';
                if (feedbackEl) {
                    feedbackEl.textContent = '✅ Conta "' + newLogin + '" criada com sucesso e já vigente!';
                    feedbackEl.style.color = '#32d583';
                    feedbackEl.hidden = false;
                    setTimeout(function () { feedbackEl.hidden = true; }, 4000);
                }
            });
        }

        /* Animações GSAP dos ícones do Login Gate */
        if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.to('#authGateOverlay .wm-wheel', { rotation: 360, duration: 90, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
            gsap.set('#authGateOverlay .mark-blades', { svgOrigin: '24 24' });
            gsap.to('#authGateOverlay .mark-blades', { rotation: '+=360', duration: 2.2, ease: 'power3.inOut', repeat: -1, repeatDelay: 7, delay: 2 });

            var check = overlay.querySelector('.ic-check');
            if (check && typeof check.getTotalLength === 'function') {
                var len = check.getTotalLength();
                gsap.set(check, { strokeDasharray: len, strokeDashoffset: len });
                gsap.timeline({ repeat: -1, repeatDelay: 1.6 })
                    .to(check, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' })
                    .to(check, { strokeDashoffset: -len, duration: 0.5, ease: 'power2.in' }, '+=1.8')
                    .set(check, { strokeDashoffset: len });
            }

            gsap.set('#authGateOverlay .ic-needle', { svgOrigin: '12 14', rotation: -70 });
            gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
                .to('#authGateOverlay .ic-needle', { rotation: 58, duration: 1.3, ease: 'power2.inOut' })
                .to('#authGateOverlay .ic-needle', { rotation: 34, duration: 0.6, ease: 'back.out(3)' })
                .to('#authGateOverlay .ic-needle', { rotation: -70, duration: 1.1, ease: 'power2.inOut' }, '+=0.8');

            gsap.set('#authGateOverlay .ic-bell', { svgOrigin: '12 4.5' });
            gsap.timeline({ repeat: -1, repeatDelay: 1.9 })
                .to('#authGateOverlay .ic-bell', { keyframes: { rotation: [0, 18, -15, 11, -7, 3, 0] }, duration: 1.1, ease: 'none' });

            gsap.set('#authGateOverlay .ic-gear-lg', { svgOrigin: '10 10' });
            gsap.set('#authGateOverlay .ic-gear-sm', { svgOrigin: '17.4 17.2' });
            gsap.timeline({ repeat: -1 })
                .to('#authGateOverlay .ic-gear-lg', { rotation: 360, duration: 8, ease: 'none' }, 0)
                .to('#authGateOverlay .ic-gear-sm', { rotation: -514.3, duration: 8, ease: 'none' }, 0);
        }

        /* Restaura sessão ativa se já autenticado */
        var existing = getSavedSession();
        if (existing) {
            applyPlatformSession(existing, false);
        } else {
            document.body.classList.add('auth-locked');
            overlay.hidden = false;
        }
    }

    window.CarVerifyAuth = {
        isDev: function () { return !!(activeSession && activeSession.isDev); },
        getSession: function () { return activeSession; },
        renderAccounts: renderAccountsScreen,
        logout: logoutPlatformSession
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthModule);
    } else {
        initAuthModule();
    }
})();

