/**
 * src/js/portfolio-mode.js
 * Modo Portfólio / Vitrine para Exibições Públicas (LinkedIn, Portfólio, Vídeos)
 * Anonimiza placas, nomes de motoristas, fornecedores e observações sensíveis
 * em tempo real através do atalho [Ctrl + Shift + P] ou parâmetro [?portfolio=true].
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
    let isObserverWorking = false;

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
        if (!node || !isEnabled) return;

        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue;
            if (val && val.trim().length > 1) {
                const masked = maskText(val);
                if (masked !== val) {
                    node.nodeValue = masked;
                }
            }
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || node.id === 'portfolioBanner') return;

            // Mascara atributos de title e placeholder
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

            // Percorre filhos recursivamente
            const children = node.childNodes;
            for (let i = 0; i < children.length; i++) {
                maskDOMNode(children[i]);
            }
        }
    }

    function applyMaskToDocument() {
        if (!isEnabled || !document.body) return;
        stopObserver();
        try {
            maskDOMNode(document.body);
        } finally {
            startObserver();
        }
    }

    function startObserver() {
        if (!isEnabled || observer) return;
        observer = new MutationObserver((mutations) => {
            if (isObserverWorking) return;
            isObserverWorking = true;
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
                isObserverWorking = false;
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

    function showFeedbackToast(msg, type = 'success') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
            return;
        }
        const existing = document.querySelector('.driver-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `driver-toast driver-toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons-round">${type === 'success' ? 'shield' : 'visibility'}</span>
            <span>${msg}</span>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function updateBanner() {
        const banner = document.getElementById('portfolioBanner');
        if (banner) {
            banner.style.display = isEnabled ? 'flex' : 'none';
        }
        document.documentElement.classList.toggle('portfolio-mode-active', isEnabled);
    }

    function triggerAppReRender() {
        try {
            if (typeof window.renderTabs === 'function') window.renderTabs();
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
            if (window.DriversModule && typeof window.DriversModule.render === 'function') {
                window.DriversModule.render();
            }
            if (window.MaintenanceModule && typeof window.MaintenanceModule.render === 'function') {
                window.MaintenanceModule.render();
            }
        } catch (e) {
            console.warn('[PortfolioMode] Re-render aviso:', e);
        }
    }

    function setPortfolioMode(active, showFeedback = true) {
        isEnabled = Boolean(active);
        try {
            localStorage.setItem(STORAGE_KEY, String(isEnabled));
        } catch (e) {}

        updateBanner();

        if (isEnabled) {
            applyMaskToDocument();
            startObserver();
            triggerAppReRender();
            applyMaskToDocument();
            if (showFeedback) {
                showFeedbackToast('🛡️ Modo Portfólio Ativado (Ctrl+Shift+P): Dados anonimizados para prints!');
            }
        } else {
            stopObserver();
            // Ao desativar, recarrega a página para garantir restauração 100% perfeita dos dados reais
            if (showFeedback) {
                showFeedbackToast('🔄 Modo Portfólio Desativado: Restaurando dados originais...');
            }
            setTimeout(() => {
                window.location.reload();
            }, 300);
        }
    }

    function togglePortfolioMode() {
        setPortfolioMode(!isEnabled, true);
    }

    // Inicialização
    function init() {
        isEnabled = checkInitialState();
        updateBanner();

        if (isEnabled) {
            applyMaskToDocument();
            startObserver();
        }

        // Botão de desativar no banner flutuante
        const disableBtn = document.getElementById('btnDisablePortfolio');
        if (disableBtn) {
            disableBtn.addEventListener('click', () => setPortfolioMode(false, true));
        }

        // Botão "x" para fechar apenas o banner na hora do print mantendo o mascaramento ativo
        const dismissBannerBtn = document.getElementById('btnDismissPortfolioBanner');
        if (dismissBannerBtn) {
            dismissBannerBtn.addEventListener('click', () => {
                const banner = document.getElementById('portfolioBanner');
                if (banner) banner.style.display = 'none';
            });
        }
    }

    // Listener global de atalho no teclado (Ctrl + Shift + P ou Cmd + Shift + P)
    // Registrado em fase de captura (true) para não ser interceptado por outros listeners
    window.addEventListener('keydown', (e) => {
        const isKeyP = (e.key === 'P' || e.key === 'p' || e.code === 'KeyP' || e.keyCode === 80);
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && isKeyP) {
            e.preventDefault();
            e.stopPropagation();
            togglePortfolioMode();
        }
    }, true);

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
