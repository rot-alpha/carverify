/**
 * src/js/portfolio-mode.js
 * Modo Portfólio / Vitrine para Exibições Públicas (LinkedIn, Portfólio, Vídeos)
 * Anonimiza placas, nomes de motoristas, fornecedores e observações sensíveis
 * em tempo real sem alterar banco de dados ou regras de negócio.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'carverify_portfolio_mode';

    // Mapeamento de Placas Reais -> Placas Conceituais Executivas
    const PLATE_MAP = {
        'SUX8H84': 'LOG-1A01',
        'SUE7D02': 'LOG-1A02',
        'SVJ3H89': 'LOG-1A03',
        'SUW7B16': 'LOG-1A04',
        'STA0F48': 'LOG-1A05',
        'FRG7C31': 'TRK-2B01',
        'FPF8A23': 'TRK-2B02',
        'FXI0C35': 'TRK-2B03',
        'ECF3235': 'TRK-2B04',
        'FJF7817': 'TRK-2B05'
    };

    // Mapeamento de Motoristas Reais -> Nomes Fictícios
    const DRIVER_MAP = {
        'Leonildo Silva': 'Lucas Silveira',
        'Anderson Barbosa': 'André Barreto',
        'Evaldo Aparecido': 'Eduardo Alves',
        'Ricardo Rodrigues': 'Rodrigo Ramos',
        'Anderson Luiz': 'Arthur Lima',
        'Alex Schuermann': 'Alexandre Schmidt',
        'Carlos Alberto': 'Carlos Andrade',
        'Rafael Da Silva': 'Rafael Santos',
        'Rafael da Silva': 'Rafael Santos',
        'José Lucivaldo': 'José Roberto',
        'Rogério Ribeiro': 'Renato Ribeiro',
        // Ajudantes operacionais
        'Alan Henrique': 'Ailton Henrique',
        'Cristian Ricardo': 'Cristiano Ricardo',
        'Wesley Cristian': 'Wesley Costa',
        'Jailton Ferreira': 'Jair Ferreira',
        'Luis Gustavo': 'Luiz Gustavo',
        'Luiz Gustavo': 'Luiz Gustavo'
    };

    // Mapeamento de Fornecedores / Entidades
    const ENTITY_MAP = {
        'Auto Mecânica & Freios Sorocaba Ltda': 'Centro Automotivo Especializado',
        'Auto Mecânica & Freios Sorocaba': 'Centro Automotivo Especializado',
        'Auto Mecânica Sorocaba': 'Centro Automotivo Especializado',
        'Auto Center Sorocaba Pneus': 'Centro de Pneus & Alinhamento',
        'Iveco Trucão Assistência Técnica': 'Concessionária Pesados Autorizada',
        'Iveco Trucão': 'Concessionária Autorizada',
        'Sorocaba': 'Unidade Central',
        'Grupo EFX': 'Enterprise Fleet',
        'Alpha Candies': 'Logística Integrada'
    };

    // Primeiro nome isolado para menções rápidas
    const FIRST_NAME_MAP = {
        'Leonildo': 'Lucas',
        'Evaldo': 'Eduardo',
        'Schuermann': 'Schmidt',
        'Lucivaldo': 'Roberto',
        'Rogério': 'Renato'
    };

    let isEnabled = false;
    let observer = null;
    let isApplyingMask = false;

    function checkInitialState() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('portfolio') === 'true' || urlParams.get('portfolio') === '1' ||
                urlParams.get('demo') === 'true' || urlParams.get('demo') === '1') {
                return true;
            }
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved === 'true';
        } catch (e) {
            return false;
        }
    }

    function maskPlate(plate) {
        if (!plate) return plate;
        if (!isEnabled) return plate;
        return PLATE_MAP[plate] || plate;
    }

    function maskDriver(driver) {
        if (!driver) return driver;
        if (!isEnabled) return driver;
        return DRIVER_MAP[driver] || driver;
    }

    function maskText(str) {
        if (!str || typeof str !== 'string') return str;
        if (!isEnabled) return str;

        let out = str;

        // 1. Placas
        Object.entries(PLATE_MAP).forEach(([real, fake]) => {
            if (out.includes(real)) {
                out = out.split(real).join(fake);
            }
        });

        // 2. Motoristas completos
        Object.entries(DRIVER_MAP).forEach(([real, fake]) => {
            if (out.includes(real)) {
                out = out.split(real).join(fake);
            }
        });

        // 3. Entidades / Oficinas / Empresas
        Object.entries(ENTITY_MAP).forEach(([real, fake]) => {
            if (out.includes(real)) {
                out = out.split(real).join(fake);
            }
        });

        // 4. Primeiros nomes isolados
        Object.entries(FIRST_NAME_MAP).forEach(([real, fake]) => {
            const regex = new RegExp(`\\b${real}\\b`, 'g');
            out = out.replace(regex, fake);
        });

        return out;
    }

    function maskDOMNode(node) {
        if (!isEnabled || isApplyingMask) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue;
            if (val && val.trim().length > 1) {
                const masked = maskText(val);
                if (masked !== val) {
                    node.nodeValue = masked;
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Ignora scripts, styles e o próprio banner
            const tag = node.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || node.id === 'portfolioBanner') return;

            // Mascara atributos de título/placeholder
            if (node.hasAttribute('title')) {
                const t = node.getAttribute('title');
                const mt = maskText(t);
                if (mt !== t) node.setAttribute('title', mt);
            }
            if (node.hasAttribute('placeholder')) {
                const p = node.getAttribute('placeholder');
                const mp = maskText(p);
                if (mp !== p) node.setAttribute('placeholder', mp);
            }

            for (let i = 0; i < node.childNodes.length; i++) {
                maskDOMNode(node.childNodes[i]);
            }
        }
    }

    function applyMaskToDocument() {
        if (!isEnabled) return;
        isApplyingMask = true;
        try {
            if (observer) observer.disconnect();
            maskDOMNode(document.body);
        } finally {
            isApplyingMask = false;
            startObserver();
        }
    }

    function startObserver() {
        if (!isEnabled || observer) return;
        observer = new MutationObserver((mutations) => {
            if (isApplyingMask) return;
            isApplyingMask = true;
            try {
                mutations.forEach(m => {
                    if (m.type === 'characterData') {
                        const val = m.target.nodeValue;
                        if (val) {
                            const masked = maskText(val);
                            if (masked !== val) m.target.nodeValue = masked;
                        }
                    } else if (m.type === 'childList') {
                        m.addedNodes.forEach(node => maskDOMNode(node));
                    }
                });
            } finally {
                isApplyingMask = false;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function updateUIElements() {
        const toggleBtn = document.getElementById('btnPortfolioToggle');
        const banner = document.getElementById('portfolioBanner');

        if (toggleBtn) {
            toggleBtn.classList.toggle('active', isEnabled);
            toggleBtn.setAttribute('title', isEnabled
                ? 'Modo Portfólio Ativo: Placas e nomes anonimizados (Clique ou Ctrl+Shift+P para desativar)'
                : 'Ativar Modo Portfólio / Vitrine (Ctrl+Shift+P)'
            );
            const icon = toggleBtn.querySelector('.material-icons-round');
            if (icon) {
                icon.textContent = isEnabled ? 'shield' : 'shield_outlined';
            }
        }

        if (banner) {
            banner.style.display = isEnabled ? 'flex' : 'none';
        }

        document.documentElement.classList.toggle('portfolio-mode-active', isEnabled);
    }

    function triggerAppReRender() {
        // Dispara recálculo/renderização dos componentes do app para alternância instantânea
        if (typeof window.renderTabs === 'function') window.renderTabs();
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
        if (window.DriversModule && typeof window.DriversModule.render === 'function') {
            window.DriversModule.render();
        }
        if (window.MaintenanceModule && typeof window.MaintenanceModule.render === 'function') {
            window.MaintenanceModule.render();
        }
        if (typeof window.renderHome === 'function' && window.state && window.state.screen === 'home') {
            window.renderHome();
        }
    }

    function setPortfolioMode(active, showFeedback = true) {
        isEnabled = Boolean(active);
        try {
            localStorage.setItem(STORAGE_KEY, String(isEnabled));
        } catch (e) {}

        updateUIElements();

        if (isEnabled) {
            applyMaskToDocument();
            startObserver();
            triggerAppReRender();
            applyMaskToDocument();
            if (showFeedback && typeof window.showToast === 'function') {
                window.showToast('🛡️ Modo Portfólio Ativado: Placas, motoristas e empresas foram anonimizados!');
            }
        } else {
            stopObserver();
            triggerAppReRender();
            if (showFeedback && typeof window.showToast === 'function') {
                window.showToast('🔄 Modo Portfólio Desativado: Dados reais restaurados.');
            }
        }
    }

    function togglePortfolioMode() {
        setPortfolioMode(!isEnabled, true);
    }

    // Inicialização ao carregar o DOM
    function init() {
        isEnabled = checkInitialState();
        updateUIElements();

        if (isEnabled) {
            applyMaskToDocument();
            startObserver();
        }

        // Event listener no botão de alternância
        const toggleBtn = document.getElementById('btnPortfolioToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => togglePortfolioMode());
        }

        // Botão de fechar/desativar no banner
        const disableBtn = document.getElementById('btnDisablePortfolio');
        if (disableBtn) {
            disableBtn.addEventListener('click', () => setPortfolioMode(false, true));
        }
        const dismissBannerBtn = document.getElementById('btnDismissPortfolioBanner');
        if (dismissBannerBtn) {
            dismissBannerBtn.addEventListener('click', () => {
                const banner = document.getElementById('portfolioBanner');
                if (banner) banner.style.display = 'none';
            });
        }

        // Atalho de teclado: Ctrl + Shift + P ou Cmd + Shift + P
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault();
                togglePortfolioMode();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportação da API global
    window.CarVerifyPortfolio = {
        isEnabled: () => isEnabled,
        enable: () => setPortfolioMode(true, true),
        disable: () => setPortfolioMode(false, true),
        toggle: togglePortfolioMode,
        maskPlate,
        maskDriver,
        maskText
    };
})();
