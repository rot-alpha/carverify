/* ============================================================================
   CAR · VERIFY — Módulo Oficial de Manutenção & Frota (maintenance.js)
   Arquitetura Master-Detail (Opção C) + Relatório Diário + Importação de NF + A4
   ============================================================================ */

const MaintenanceModule = (function () {
    'use strict';

    const STORAGE_KEY = 'carverify_maintenance_records_v1';
    const STORAGE_TRIAGE_KEY = 'carverify_nok_triage_v1';

    const escapeHtml = (window.CarVerifySecurity && window.CarVerifySecurity.escapeHtml)
        ? window.CarVerifySecurity.escapeHtml
        : (str => {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        });

    const FLEET = [
        { plate: 'SUX8H84', model: 'FIORINO', habitual: 'Leonildo Silva' },
        { plate: 'SUE7D02', model: 'FIORINO', habitual: 'Anderson Barbosa' },
        { plate: 'SVJ3H89', model: 'FIORINO', habitual: 'Evaldo Aparecido' },
        { plate: 'SUW7B16', model: 'FIORINO', habitual: 'Ricardo Rodrigues' },
        { plate: 'STA0F48', model: 'FIORINO', habitual: 'Anderson Luiz' },
        { plate: 'FRG7C31', model: 'IVECO',   habitual: 'Alex Schuermann' },
        { plate: 'FPF8A23', model: 'IVECO',   habitual: 'Carlos Alberto' },
        { plate: 'FXI0C35', model: 'IVECO',   habitual: 'Rafael Da Silva' },
        { plate: 'ECF3235', model: 'IVECO',   habitual: 'José Lucivaldo' },
        { plate: 'FJF7817', model: 'IVECO',   habitual: 'Rogério Ribeiro' }
    ];

    const SYSTEMS = [
        { id: 'freios',      label: 'Freios',                  icon: 'album' },
        { id: 'suspensao',   label: 'Suspensão / Amortecedor', icon: 'height' },
        { id: 'motor',       label: 'Motor / Injeção',         icon: 'engineering' },
        { id: 'oleo_filtro', label: 'Troca de Óleo / Filtros', icon: 'oil_barrel' },
        { id: 'transmissao', label: 'Câmbio / Embreagem',      icon: 'settings' },
        { id: 'eletrica',    label: 'Elétrica / Iluminação',   icon: 'bolt' },
        { id: 'thermoking',  label: 'Thermo King / Refrig.',   icon: 'ac_unit' },
        { id: 'pneus',       label: 'Pneus / Alinhamento',     icon: 'tire_repair' },
        { id: 'carroceria',  label: 'Carroceria / Baú',        icon: 'local_shipping' },
        { id: 'preventiva',  label: 'Preventiva Geral',        icon: 'verified' }
    ];

    const STATUS_META = {
        ativo:      { label: 'Ativo (Em Rota)',        short: 'Ativo',      color: '#22c55e', icon: 'check_circle', pillClass: 'p-ativo' },
        interna:    { label: 'Atividade Interna',      short: 'Interna',    color: '#3b82f6', icon: 'business',     pillClass: 'p-interna' },
        manutencao: { label: 'Manutenção (Oficina)',   short: 'Manutenção', color: '#f59e0b', icon: 'build_circle', pillClass: 'p-manutencao' },
        off:        { label: 'Fora de Operação (Off)', short: 'Inativo',    color: '#ef4444', icon: 'block',        pillClass: 'p-off' }
    };

    // De-Para das 29 perguntas reais do checklist para os 10 Sistemas Mecânicos
    const QUESTION_TO_SYSTEM_MAP = {
        'Sistema de freio': 'freios',
        'Freio de Mão/Estacionamento': 'freios',
        'Nível de óleo hidráulico (freio/direção)': 'freios',
        'Nível de óleo do motor': 'oleo_filtro',
        'Nível de água do radiador': 'motor',
        'Luz de freio, ré, setas e alerta': 'eletrica',
        'Faróis e lanternas': 'eletrica',
        'Setas e pisca-alerta': 'eletrica',
        'Buzina': 'eletrica',
        'Luzes do painel': 'eletrica',
        'Bateria (fixação e condição)': 'eletrica',
        'Pneus (condições gerais)': 'pneus',
        'Estepe (existência e condições)': 'pneus',
        'Macaco / triângulo / chave de roda': 'pneus',
        'Pedais': 'transmissao',
        'Funcionamento do Thermo King': 'thermoking',
        'Cinto de segurança': 'carroceria',
        'Limpeza do Veículo (Cabine e Baú)': 'carroceria',
        'Para-brisa': 'carroceria',
        'Limpador e palhetas': 'carroceria',
        'Retrovisores': 'carroceria',
        'Vidros laterais': 'carroceria',
        'Fechaduras das portas': 'carroceria',
        'Tampas dos tanques': 'carroceria',
        'Estrutura do baú': 'carroceria',
        'Portas do baú': 'carroceria',
        'Carrinho de carga': 'carroceria',
        'CNH compatível com categoria': 'preventiva',
        'CRLV atualizado': 'preventiva'
    };

    const QUICK_LOW_REASONS = [
        'Agendado p/ próxima preventiva',
        'Desgaste estético — sem risco à rota',
        'Peça em cotação — apto a rodar',
        'Lâmpada/item reserva já reposto'
    ];

    const AI_NF_TEMPLATES = [
        {
            nfNumber: 'NF-e 004.892',
            supplier: 'Auto Mecânica & Freios Sorocaba Ltda',
            cost: 1840.00,
            maintType: 'corretiva',
            systems: ['freios', 'suspensao'],
            fileName: 'DANFE_004892_Freios_Sorocaba.pdf',
            note: 'Substituição de jogo de pastilhas dianteiras, retífica de discos, troca de 2 amortecedores e buchas da barra estabilizadora.'
        },
        {
            nfNumber: 'NF-e 019.304',
            supplier: 'ThermoFrio Refrigeração de Transporte',
            cost: 2390.50,
            maintType: 'corretiva',
            systems: ['thermoking', 'eletrica'],
            fileName: 'DANFE_019304_ThermoFrio.pdf',
            note: 'Recarga de gás refrigerante R404A, troca de correia do compressor Thermo King e reparo no chicote do sensor.'
        },
        {
            nfNumber: 'NF-e 008.115',
            supplier: 'Centro Automotivo LubriFrota SP',
            cost: 760.00,
            maintType: 'preventiva',
            systems: ['oleo_filtro', 'preventiva'],
            fileName: 'DANFE_008115_Preventiva_Oleo.pdf',
            note: 'Revisão preventiva de 10.000 km: óleo sintético 5W30, filtro de óleo, filtro de combustível e filtro de ar.'
        },
        {
            nfNumber: 'NF-e 012.771',
            supplier: 'Pneus & Cia Alinhamento Pesado',
            cost: 3120.00,
            maintType: 'corretiva',
            systems: ['pneus', 'suspensao'],
            fileName: 'DANFE_012771_Pneus_Alinhamento.pdf',
            note: '2 pneus Michelin 215/75 R17.5 novos, alinhamento computadorizado e balanceamento dianteiro.'
        }
    ];

    function getCurrentYm() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function getTodayIso() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // ─── REGISTROS INICIAIS PADRÃO (CASO LOCALSTORAGE VAZIO) ──────────────────
    function getDefaultRecords() {
        const ym = getCurrentYm();
        return [
            {
                id: 'rec-1',
                plate: 'FRG7C31',
                status: 'manutencao',
                maintType: 'corretiva',
                systems: ['freios', 'suspensao'],
                start: `${ym}-06`,
                end: `${ym}-08`,
                nfNumber: 'NF-e 004.512',
                supplier: 'Iveco Trucão Assistência Técnica',
                cost: 2890.00,
                nfFileName: 'DANFE_004512_Iveco.pdf',
                note: 'Substituição de cilindro mestre de freio, ajuste de folga na caixa de direção e troca de buchas de suspensão dianteira.'
            },
            {
                id: 'rec-2',
                plate: 'STA0F48',
                status: 'manutencao',
                maintType: 'corretiva',
                systems: ['motor', 'suspensao'],
                start: `${ym}-13`,
                end: `${ym}-15`,
                nfNumber: 'NF-e 007.980',
                supplier: 'Oficina Diesel & Utilidades Alpha',
                cost: 1950.00,
                nfFileName: 'DANFE_007980_AlphaDiesel.pdf',
                note: 'Troca de coxins superiores do motor (vibração excessiva relatada no checklist) e par de amortecedores traseiros.'
            },
            {
                id: 'rec-3',
                plate: 'SVJ3H89',
                status: 'manutencao',
                maintType: 'preventiva',
                systems: ['oleo_filtro', 'pneus', 'eletrica'],
                start: `${ym}-16`,
                end: `${ym}-16`,
                nfNumber: 'NF-e 008.210',
                supplier: 'Auto Center Sorocaba Pneus',
                cost: 1120.00,
                nfFileName: 'DANFE_008210_AutoCenter.pdf',
                note: 'Troca de óleo e filtros + alinhamento, balanceamento e substituição de lâmpada de farol H7.'
            },
            {
                id: 'rec-4',
                plate: 'ECF3235',
                status: 'manutencao',
                maintType: 'corretiva',
                systems: ['pneus', 'freios', 'transmissao'],
                start: `${ym}-20`,
                end: `${ym}-22`,
                nfNumber: 'NF-e 011.402',
                supplier: 'Pneus & Freios Rodoviários SP',
                cost: 3450.00,
                nfFileName: 'DANFE_011402_Rodoviarios.pdf',
                note: 'Troca de 2 pneus dianteiros, revisão de rolamento de eixo e regulagem do pedal de embreagem.'
            },
            {
                id: 'rec-5',
                plate: 'FXI0C35',
                status: 'interna',
                maintType: null,
                systems: [],
                start: `${ym}-09`,
                end: `${ym}-09`,
                nfNumber: '',
                supplier: 'Pátio Matriz Alpha Candies',
                cost: 0,
                nfFileName: '',
                note: 'Movimentação interna de paletes entre docas e higienização profunda do baú.'
            },
            {
                id: 'rec-6',
                plate: 'SUX8H84',
                status: 'manutencao',
                maintType: 'corretiva',
                systems: ['freios', 'eletrica'],
                start: `${ym}-23`,
                end: `${ym}-23`,
                nfNumber: '',
                supplier: 'Auto Elétrica & Freios Rápido',
                cost: 0,
                nfFileName: '',
                note: 'Abertura de OS: Revisão do sensor do pedal de freio e troca de pastilhas dianteiras (aguardando emissão de NF).'
            },
            {
                id: 'rec-7',
                plate: 'FJF7817',
                status: 'off',
                maintType: 'corretiva',
                systems: ['thermoking'],
                start: `${ym}-27`,
                end: `${ym}-28`,
                nfNumber: 'NF-e 019.882',
                supplier: 'ThermoFrio Refrigeração',
                cost: 1680.00,
                nfFileName: 'DANFE_019882_ThermoFrio.pdf',
                note: 'Veículo retido aguardando válvula solenóide do equipamento de refrigeração do baú.'
            }
        ];
    }

    function loadRecordsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        const defs = getDefaultRecords();
        saveRecordsToStorage(defs);
        return defs;
    }

    function saveRecordsToStorage(records) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        } catch (e) {}
    }

    function loadTriageFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_TRIAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) {}
        return {};
    }

    function saveTriageToStorage(triageObj) {
        try {
            localStorage.setItem(STORAGE_TRIAGE_KEY, JSON.stringify(triageObj));
        } catch (e) {}
    }

    // ─── ESTADO INTERNO DO MÓDULO ──────────────────────────────────────────────
    const state = {
        selectedVehicleFilter: null, // null = Visão Geral da Frota | 'PLACA' = Detalhe
        selectedMonth: getCurrentYm(),
        selectedOverviewDay: getTodayIso(),
        editingRecordId: null,
        maintType: 'corretiva',
        selectedSystems: new Set(['freios']),
        uploadedNfFileName: '',
        aiTemplateIdx: 0,
        pendingNokLink: null,
        quickNfRecordId: null,
        quickNfSystems: new Set(),
        quickNfFileName: '',
        records: loadRecordsFromStorage(),
        nokTriage: loadTriageFromStorage(),
        initialized: false
    };

    let chartBySystem = null;
    let chartByCost = null;
    let chartByVehicle = null;

    // ─── HELPERS DE CONSULTA DE DADOS REAIS ───────────────────────────────────
    function getHabitualDriver(plate) {
        if (window.DriversModule && typeof window.DriversModule.getVehicleHabitualDriver === 'function') {
            const d = window.DriversModule.getVehicleHabitualDriver(plate);
            if (d) return d;
        }
        const v = FLEET.find(f => f.plate === plate);
        return v ? v.habitual : 'Motorista Titular';
    }

    function hasChecklistOnDate(plate, dateIso) {
        if (window.state && window.state.data && window.state.data[plate] && window.state.data[plate].days) {
            return !!window.state.data[plate].days[dateIso];
        }
        return false;
    }

    function getDriverAbsenceOnDate(plate, dateIso) {
        const driver = getHabitualDriver(plate);
        if (!driver) return null;
        if (window.DriversModule && typeof window.DriversModule.getDriverStatusOnDate === 'function') {
            const st = window.DriversModule.getDriverStatusOnDate(driver, dateIso);
            if (st && st !== 'ativo') return st; // 'ferias', 'banco_horas', 'falta', 'atestado'
        }
        return null;
    }

    function getHolidayOnDate(dateIso) {
        if (window.Holidays && typeof window.Holidays.getHoliday === 'function') {
            return window.Holidays.getHoliday(dateIso);
        }
        return null;
    }

    function getRecordForPlateDate(plate, dateIso) {
        return state.records.find(r => r.plate === plate && r.start <= dateIso && r.end >= dateIso) || null;
    }

    function countDaysInclusive(startStr, endStr) {
        const [y1, m1, d1] = startStr.split('-').map(Number);
        const [y2, m2, d2] = endStr.split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1);
        const dt2 = new Date(y2, m2 - 1, d2);
        return Math.max(1, Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24)) + 1);
    }

    function formatDateBr(iso) {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function formatCurrency(val) {
        return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getMonthLabel(ym) {
        const [y, m] = ym.split('-').map(Number);
        const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${names[(m || 1) - 1]} ${y}`;
    }

    function getSystemMeta(sysId) {
        return SYSTEMS.find(s => s.id === sysId) || { id: sysId, label: sysId, icon: 'build' };
    }

    function canUserEdit() {
        if (window.CarVerifyAuth && typeof window.CarVerifyAuth.canEdit === 'function') {
            return window.CarVerifyAuth.canEdit();
        }
        return true;
    }

    function showToast(msg, type = 'success') {
        const existing = document.querySelector('.driver-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `driver-toast driver-toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons-round">${type === 'success' ? 'check_circle' : 'warning'}</span>
            <span>${escapeHtml(msg)}</span>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    // ─── SINCRONIZAÇÃO COM SUPABASE ────────────────────────────────────────────
    async function syncFromSupabase() {
        if (!window.CarVerifySupabase || typeof window.CarVerifySupabase.fetchMaintenanceRecords !== 'function') return;
        try {
            const rows = await window.CarVerifySupabase.fetchMaintenanceRecords();
            if (Array.isArray(rows) && rows.length > 0) {
                state.records = rows.map(row => ({
                    id: row.id || ('rec-' + Date.now() + Math.random()),
                    uuid: row.id,
                    plate: row.veiculo_placa,
                    status: row.status || 'manutencao',
                    maintType: row.maint_type || null,
                    systems: Array.isArray(row.systems) ? row.systems : [],
                    start: row.data_inicio,
                    end: row.data_fim,
                    nfNumber: row.nf_numero || '',
                    supplier: row.fornecedor || '',
                    cost: Number(row.valor_total || 0),
                    nfFileName: row.nf_attachment_name || '',
                    note: row.observacao || '',
                    linkedNok: row.linked_nok || null
                }));
                saveRecordsToStorage(state.records);
                if (document.getElementById('maintenanceScreen')?.style.display !== 'none') {
                    renderAll();
                }
            }
        } catch (err) {
            console.warn('[MaintenanceModule] Erro ao sincronizar do Supabase:', err);
        }
    }

    // ─── RENDERIZAÇÃO DO SIDEBAR DE VEÍCULOS ──────────────────────────────────
    function renderSidebar() {
        const container = document.getElementById('maintSidebarList');
        if (!container) return;

        const ym = state.selectedMonth;
        const todayIso = state.selectedOverviewDay && state.selectedOverviewDay.startsWith(ym)
            ? state.selectedOverviewDay
            : `${ym}-15`;

        let html = `
            <button type="button" class="maint-sidebar-item ${state.selectedVehicleFilter === null ? 'active' : ''}" data-plate="">
                <div class="maint-sb-icon" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);">
                    <span class="material-icons-round" style="font-size:18px;">dashboard</span>
                </div>
                <div class="maint-sb-info">
                    <div class="maint-sb-name">Visão Geral da Frota</div>
                    <div class="maint-sb-meta">10 veículos · Consolidado</div>
                </div>
            </button>
            <div class="maint-sb-divider"></div>
        `;

        FLEET.forEach(v => {
            const isSelected = state.selectedVehicleFilter === v.plate;
            const vehRecs = state.records.filter(r => r.plate === v.plate && (r.start.startsWith(ym) || r.end.startsWith(ym)));
            const maintCount = vehRecs.filter(r => r.status === 'manutencao' || r.status === 'off').length;
            const totalCost = vehRecs.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

            const recToday = getRecordForPlateDate(v.plate, todayIso);
            let statusColor = '#22c55e';
            let statusBadge = 'Ativo';
            if (recToday) {
                statusColor = STATUS_META[recToday.status]?.color || '#22c55e';
                statusBadge = STATUS_META[recToday.status]?.short || 'Ativo';
            }

            const avatarBg = v.model === 'IVECO'
                ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                : 'linear-gradient(135deg,#10b981,#059669)';

            html += `
                <button type="button" class="maint-sidebar-item ${isSelected ? 'active' : ''}" data-plate="${v.plate}">
                    <div class="maint-sb-icon" style="background:${avatarBg};">${v.plate.substring(0, 3)}</div>
                    <div class="maint-sb-info">
                        <div class="maint-sb-name">${v.plate} <span style="font-weight:600;font-size:10px;color:var(--clr-text-secondary);">· ${v.model}</span></div>
                        <div class="maint-sb-meta">${escapeHtml(getHabitualDriver(v.plate))}${totalCost > 0 ? ' · ' + formatCurrency(totalCost) : ''}</div>
                    </div>
                    <div class="maint-sb-badges">
                        <span class="maint-sb-pill" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">${statusBadge}</span>
                        ${maintCount > 0 ? `<span style="font-size:9px;color:var(--clr-text-secondary);font-weight:700;">${maintCount} OS</span>` : ''}
                    </div>
                </button>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.maint-sidebar-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const plate = btn.dataset.plate || null;
                selectVehicle(plate);
            });
        });
    }

    function selectVehicle(plate) {
        state.selectedVehicleFilter = plate;
        const formPlate = document.getElementById('maintPlateSelect');
        if (formPlate && plate) formPlate.value = plate;

        const banner = document.getElementById('maintVehicleBanner');
        const calCard = document.getElementById('maintCalendarCard');
        const formCard = document.getElementById('maintFormCard');
        const topRow = document.getElementById('maintTopRow');
        const dailyReportCard = document.getElementById('maintDailyStatusReportCard');
        const tableFilterPlate = document.getElementById('maintTableFilterPlate');

        if (plate) {
            const v = FLEET.find(f => f.plate === plate);
            if (banner) banner.style.display = 'flex';
            if (calCard) calCard.style.display = 'block';
            if (formCard) formCard.style.display = '';
            if (topRow) topRow.classList.remove('overview-mode');
            if (dailyReportCard) dailyReportCard.style.display = 'none';
            const titleEl = document.getElementById('maintBannerTitle');
            const subEl = document.getElementById('maintBannerSub');
            const calTitleEl = document.getElementById('maintCalTitle');
            if (titleEl && v) titleEl.textContent = `${v.plate} — ${v.model}`;
            if (subEl && v) subEl.textContent = `Motorista Titular: ${getHabitualDriver(v.plate)} · Controle Operacional & Histórico de Oficina`;
            if (calTitleEl) calTitleEl.textContent = `Calendário Operacional e de Manutenção — ${plate}`;
            if (tableFilterPlate) tableFilterPlate.value = plate;
        } else {
            if (banner) banner.style.display = 'none';
            if (calCard) calCard.style.display = 'none';
            if (formCard) formCard.style.display = 'none';
            if (topRow) topRow.classList.add('overview-mode');
            if (dailyReportCard) dailyReportCard.style.display = 'block';
            if (tableFilterPlate) tableFilterPlate.value = 'all';
        }

        renderAll();
    }

    // ─── RELATÓRIO DIÁRIO DE STATUS DA FROTA (VISÃO GERAL) ─────────────────────
    function renderDailyStatusReport() {
        const daysLine = document.getElementById('maintDaysSingleLine');
        const platesGrid = document.getElementById('maintPlatesStatusGrid');
        const dateLabel = document.getElementById('selectedReportDateLabel');
        const summaryEl = document.getElementById('selectedReportSummary');
        const monthSel = document.getElementById('dailyReportMonthSelect');
        if (!daysLine || !platesGrid) return;

        const ym = state.selectedMonth;
        if (monthSel && monthSel.value !== ym) {
            if (Array.from(monthSel.options).some(o => o.value === ym)) {
                monthSel.value = ym;
            }
        }

        const [year, month] = ym.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        if (!state.selectedOverviewDay || !state.selectedOverviewDay.startsWith(ym)) {
            const todayIso = getTodayIso();
            state.selectedOverviewDay = todayIso.startsWith(ym) ? todayIso : `${ym}-01`;
        }

        const dowShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

        let daysHtml = '';
        for (let d = 1; d <= daysInMonth; d++) {
            const dateIso = `${ym}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            const dow = dateObj.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isSelected = state.selectedOverviewDay === dateIso;
            const hasMaint = state.records.some(r => (r.status === 'manutencao' || r.status === 'off') && r.start <= dateIso && r.end >= dateIso);

            daysHtml += `
                <div class="day-line-item ${isWeekend ? 'weekend' : ''} ${hasMaint ? 'has-maint' : ''} ${isSelected ? 'active' : ''}" data-day-iso="${dateIso}" title="Ver status da frota em ${formatDateBr(dateIso)}">
                    <span class="day-line-num">${String(d).padStart(2, '0')}</span>
                    <span class="day-line-dow">${dowShort[dow]}</span>
                </div>
            `;
        }
        daysLine.innerHTML = daysHtml;

        daysLine.querySelectorAll('.day-line-item').forEach(el => {
            el.addEventListener('click', () => {
                state.selectedOverviewDay = el.dataset.dayIso;
                renderDailyStatusReport();
            });
        });

        const activeDayIso = state.selectedOverviewDay;
        const [ay, am, ad] = activeDayIso.split('-').map(Number);
        const activeDateObj = new Date(ay, am - 1, ad);
        const activeDow = activeDateObj.getDay();
        const isWeekendDay = activeDow === 0 || activeDow === 6;
        const holiday = getHolidayOnDate(activeDayIso);

        if (dateLabel) {
            const dowNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            dateLabel.textContent = `Status da Frota em ${formatDateBr(activeDayIso)} (${dowNames[activeDow]})`;
        }

        let countAtivo = 0, countMaint = 0, countInterna = 0, countOff = 0, countOther = 0;

        const cardsHtml = FLEET.map(v => {
            const rec = getRecordForPlateDate(v.plate, activeDayIso);
            const driverAbs = getDriverAbsenceOnDate(v.plate, activeDayIso);
            const hasChk = hasChecklistOnDate(v.plate, activeDayIso);
            const habitual = getHabitualDriver(v.plate);

            let boxClass = 'st-ativo';
            let badgeBg = 'rgba(34,197,94,0.15)';
            let badgeColor = '#16a34a';
            let badgeIcon = 'check_circle';
            let badgeText = 'Ativo (Em Rota)';
            let detailText = `Titular: ${habitual}`;
            let costHtml = '';

            if (rec) {
                if (rec.status === 'manutencao') {
                    boxClass = 'st-manutencao';
                    badgeBg = 'rgba(245,158,11,0.18)';
                    badgeColor = '#d97706';
                    badgeIcon = 'build_circle';
                    badgeText = `Manutenção ${rec.maintType === 'preventiva' ? 'Prev.' : 'Corr.'}`;
                    const sysNames = (rec.systems || []).map(s => getSystemMeta(s).label).join(', ');
                    detailText = sysNames || rec.supplier || 'Em oficina';
                    if (rec.cost > 0) costHtml = `<span class="psb-cost">${formatCurrency(rec.cost)}</span>`;
                    countMaint++;
                } else if (rec.status === 'interna') {
                    boxClass = 'st-interna';
                    badgeBg = 'rgba(59,130,246,0.16)';
                    badgeColor = '#2563eb';
                    badgeIcon = 'business';
                    badgeText = 'Ativ. Interna';
                    detailText = rec.note || 'Operação interna no pátio';
                    countInterna++;
                } else if (rec.status === 'off') {
                    boxClass = 'st-off';
                    badgeBg = 'rgba(239,68,68,0.18)';
                    badgeColor = '#dc2626';
                    badgeIcon = 'block';
                    badgeText = 'Inativo (Off)';
                    detailText = rec.note || 'Veículo fora de operação';
                    if (rec.cost > 0) costHtml = `<span class="psb-cost">${formatCurrency(rec.cost)}</span>`;
                    countOff++;
                } else {
                    countAtivo++;
                }
            } else if (holiday && !hasChk) {
                boxClass = 'st-feriado';
                badgeBg = 'rgba(168,85,247,0.16)';
                badgeColor = '#9333ea';
                badgeIcon = 'event_available';
                badgeText = `Feriado (${holiday.short || holiday.name})`;
                detailText = 'Sem expediente operacional';
                countOther++;
            } else if (driverAbs === 'ferias' && !hasChk) {
                boxClass = 'st-ferias';
                badgeBg = 'rgba(6,182,212,0.16)';
                badgeColor = '#0891b2';
                badgeIcon = 'beach_access';
                badgeText = 'Férias Titular';
                detailText = `${habitual} em férias`;
                countOther++;
            } else if (driverAbs === 'banco_horas' && !hasChk) {
                boxClass = 'st-banco';
                badgeBg = 'rgba(99,102,241,0.16)';
                badgeColor = '#4f46e5';
                badgeIcon = 'schedule';
                badgeText = 'Banco de Horas';
                detailText = `${habitual} em BH`;
                countOther++;
            } else if (isWeekendDay && !hasChk) {
                boxClass = 'st-fds';
                badgeBg = 'rgba(148,163,184,0.14)';
                badgeColor = '#64748b';
                badgeIcon = 'weekend';
                badgeText = 'Fim de Semana';
                detailText = 'Pátio / Sem escala';
                countOther++;
            } else {
                countAtivo++;
                if (hasChk) {
                    detailText = `Checklist OK · ${habitual}`;
                }
            }

            return `
                <div class="plate-status-box ${boxClass}" data-plate="${v.plate}" title="Clique para abrir o painel de ${v.plate}">
                    <div class="psb-top">
                        <span class="psb-plate">${v.plate}</span>
                        <span class="psb-model">${v.model}</span>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
                        <span class="psb-badge" style="background:${badgeBg};color:${badgeColor};">
                            <span class="material-icons-round" style="font-size:12px;">${badgeIcon}</span>
                            ${escapeHtml(badgeText)}
                        </span>
                        ${costHtml}
                    </div>
                    <div class="psb-detail">${escapeHtml(detailText)}</div>
                </div>
            `;
        }).join('');

        platesGrid.innerHTML = cardsHtml;

        platesGrid.querySelectorAll('.plate-status-box').forEach(box => {
            box.addEventListener('click', () => {
                selectVehicle(box.dataset.plate);
            });
        });

        if (summaryEl) {
            summaryEl.innerHTML = `
                <span class="status-pill ativo" style="padding:2px 8px;font-size:10.5px;">✅ ${countAtivo} Ativos</span>
                ${countMaint > 0 ? `<span class="status-pill manutencao" style="padding:2px 8px;font-size:10.5px;">🔧 ${countMaint} Manutenção</span>` : ''}
                ${countInterna > 0 ? `<span class="status-pill interna" style="padding:2px 8px;font-size:10.5px;">🏢 ${countInterna} Interna</span>` : ''}
                ${countOff > 0 ? `<span class="status-pill off" style="padding:2px 8px;font-size:10.5px;">⛔ ${countOff} Off</span>` : ''}
                ${countOther > 0 ? `<span class="sys-badge" style="font-size:10.5px;">📅 ${countOther} Feriado/Férias/FDS</span>` : ''}
            `;
        }
    }

    // ─── RENDERIZAÇÃO DOS 6 KPIs ANALÍTICOS ───────────────────────────────────
    function renderKPIs() {
        const grid = document.getElementById('maintKpiGrid');
        const subtitle = document.getElementById('maintKpiSubtitle');
        if (!grid) return;

        const ym = state.selectedMonth;
        const plateFilter = state.selectedVehicleFilter;

        if (subtitle) {
            subtitle.textContent = plateFilter
                ? `Filtro: Placa ${plateFilter} (${getMonthLabel(ym)})`
                : `Visão Consolidada da Frota (${getMonthLabel(ym)})`;
        }

        const recs = state.records.filter(r => {
            const matchMonth = r.start.startsWith(ym) || r.end.startsWith(ym);
            const matchPlate = !plateFilter || r.plate === plateFilter;
            return matchMonth && matchPlate;
        });

        let totalCost = 0;
        let downtimeDays = 0;
        let corretivasCount = 0;
        let preventivasCount = 0;
        const sysCounter = {};

        recs.forEach(r => {
            totalCost += Number(r.cost || 0);
            if (r.status === 'manutencao' || r.status === 'off') {
                downtimeDays += countDaysInclusive(r.start, r.end);
            }
            if (r.status === 'manutencao') {
                if (r.maintType === 'preventiva') preventivasCount++;
                else corretivasCount++;
            }
            (r.systems || []).forEach(s => {
                sysCounter[s] = (sysCounter[s] || 0) + 1;
            });
        });

        let topSysLabel = 'Nenhuma falha';
        let topSysCount = 0;
        Object.entries(sysCounter).forEach(([sysId, cnt]) => {
            if (cnt > topSysCount) {
                topSysCount = cnt;
                topSysLabel = getSystemMeta(sysId).label;
            }
        });

        const fleetSize = plateFilter ? 1 : FLEET.length;
        const businessDaysPool = fleetSize * 22;
        const availabilityPct = Math.max(0, Math.min(100, Math.round(((businessDaysPool - downtimeDays) / businessDaysPool) * 100)));

        const maintOsTotal = corretivasCount + preventivasCount;
        const avgTicket = maintOsTotal > 0 ? (totalCost / maintOsTotal) : 0;

        grid.innerHTML = `
            <div class="kpi-mini c-green">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Disponibilidade</span>
                    <span class="material-icons-round" style="font-size:16px;color:#22c55e;">verified</span>
                </div>
                <div class="kpi-mini-val" style="color:#22c55e;">${availabilityPct}%</div>
                <div class="kpi-mini-sub">${businessDaysPool - downtimeDays}/${businessDaysPool} dias-veículo</div>
            </div>
            <div class="kpi-mini c-amber">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Custo Total (NFs)</span>
                    <span class="material-icons-round" style="font-size:16px;color:#f59e0b;">payments</span>
                </div>
                <div class="kpi-mini-val" style="color:#f59e0b;">${formatCurrency(totalCost)}</div>
                <div class="kpi-mini-sub">Ticket médio: ${formatCurrency(avgTicket)}</div>
            </div>
            <div class="kpi-mini c-red">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Dias Parados</span>
                    <span class="material-icons-round" style="font-size:16px;color:#ef4444;">timer_off</span>
                </div>
                <div class="kpi-mini-val" style="color:#ef4444;">${downtimeDays} ${downtimeDays === 1 ? 'dia' : 'dias'}</div>
                <div class="kpi-mini-sub">Oficina + Fora de Operação</div>
            </div>
            <div class="kpi-mini c-blue">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Corretiva vs Prev.</span>
                    <span class="material-icons-round" style="font-size:16px;color:#3b82f6;">handyman</span>
                </div>
                <div class="kpi-mini-val">${corretivasCount} <span style="font-size:13px;color:var(--clr-text-secondary);font-weight:600;">/ ${preventivasCount}</span></div>
                <div class="kpi-mini-sub">${corretivasCount} corretivas · ${preventivasCount} preventivas</div>
            </div>
            <div class="kpi-mini c-purple">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Sistema Crítico</span>
                    <span class="material-icons-round" style="font-size:16px;color:#a855f7;">warning_amber</span>
                </div>
                <div class="kpi-mini-val" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(topSysLabel)}">${escapeHtml(topSysLabel)}</div>
                <div class="kpi-mini-sub">${topSysCount} ${topSysCount === 1 ? 'ocorrência' : 'ocorrências'} no mês</div>
            </div>
            <div class="kpi-mini c-cyan">
                <div class="kpi-mini-top">
                    <span class="kpi-mini-label">Total de Eventos</span>
                    <span class="material-icons-round" style="font-size:16px;color:#06b6d4;">receipt_long</span>
                </div>
                <div class="kpi-mini-val">${recs.length}</div>
                <div class="kpi-mini-sub">${recs.filter(r => r.nfNumber).length} NFs vinculadas</div>
            </div>
        `;
    }

    // ─── RENDERIZAÇÃO DOS 3 GRÁFICOS CHART.JS ─────────────────────────────────
    function renderCharts() {
        if (typeof Chart === 'undefined') return;
        const ym = state.selectedMonth;
        const plateFilter = state.selectedVehicleFilter;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';

        const recs = state.records.filter(r => {
            const matchMonth = r.start.startsWith(ym) || r.end.startsWith(ym);
            const matchPlate = !plateFilter || r.plate === plateFilter;
            return matchMonth && matchPlate;
        });

        // 1. Incidência por Sistema Mecânico
        const sysCounts = {};
        const sysCosts = {};
        SYSTEMS.forEach(s => { sysCounts[s.id] = 0; sysCosts[s.id] = 0; });

        recs.forEach(r => {
            const sysList = r.systems || [];
            const shareCost = sysList.length > 0 ? (Number(r.cost || 0) / sysList.length) : 0;
            sysList.forEach(sId => {
                if (sysCounts[sId] !== undefined) {
                    sysCounts[sId]++;
                    sysCosts[sId] += shareCost;
                }
            });
        });

        const sortedSystems = SYSTEMS
            .map(s => ({ ...s, count: sysCounts[s.id], cost: sysCosts[s.id] }))
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count);

        const ctxSys = document.getElementById('chartMaintBySystem');
        if (ctxSys) {
            if (chartBySystem) chartBySystem.destroy();
            chartBySystem = new Chart(ctxSys, {
                type: 'bar',
                data: {
                    labels: sortedSystems.length ? sortedSystems.map(s => s.label) : ['Sem ocorrências'],
                    datasets: [{
                        label: 'Ocorrências (OS)',
                        data: sortedSystems.length ? sortedSystems.map(s => s.count) : [0],
                        backgroundColor: 'rgba(245, 158, 11, 0.78)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const item = sortedSystems[ctx.dataIndex];
                                    return item ? `Custo rateado: ${formatCurrency(item.cost)}` : '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } },
                        y: { ticks: { color: textColor, font: { size: 11, weight: '600' } }, grid: { display: false } }
                    }
                }
            });
        }

        // 2. Investimento R$ e 3. Dias Parados por Veículo
        const allMonthRecs = state.records.filter(r => r.start.startsWith(ym) || r.end.startsWith(ym));
        const vehStats = FLEET.map(v => {
            const vRecs = allMonthRecs.filter(r => r.plate === v.plate);
            const cost = vRecs.reduce((acc, r) => acc + Number(r.cost || 0), 0);
            const days = vRecs
                .filter(r => r.status === 'manutencao' || r.status === 'off')
                .reduce((acc, r) => acc + countDaysInclusive(r.start, r.end), 0);
            return { plate: v.plate, cost, days };
        });

        const byCost = [...vehStats].filter(v => v.cost > 0).sort((a, b) => b.cost - a.cost);
        const ctxCost = document.getElementById('chartMaintByCost');
        if (ctxCost) {
            if (chartByCost) chartByCost.destroy();
            chartByCost = new Chart(ctxCost, {
                type: 'bar',
                data: {
                    labels: byCost.length ? byCost.map(v => v.plate) : ['Sem custos'],
                    datasets: [{
                        label: 'Investimento (R$)',
                        data: byCost.length ? byCost.map(v => v.cost) : [0],
                        backgroundColor: byCost.map(v => v.plate === plateFilter ? '#22c55e' : 'rgba(59, 130, 246, 0.78)'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Investimento: ${formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { color: textColor, font: { size: 10, weight: '700' } }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }

        const byDays = [...vehStats].filter(v => v.days > 0).sort((a, b) => b.days - a.days);
        const ctxVeh = document.getElementById('chartMaintByVehicle');
        if (ctxVeh) {
            if (chartByVehicle) chartByVehicle.destroy();
            chartByVehicle = new Chart(ctxVeh, {
                type: 'bar',
                data: {
                    labels: byDays.length ? byDays.map(v => v.plate) : ['0 paradas'],
                    datasets: [{
                        label: 'Dias Parados',
                        data: byDays.length ? byDays.map(v => v.days) : [0],
                        backgroundColor: byDays.map(v => v.plate === plateFilter ? '#f59e0b' : 'rgba(239, 68, 68, 0.78)'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor, font: { size: 10, weight: '700' } }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }

    // ─── RENDERIZAÇÃO DO CALENDÁRIO MENSAL DO VEÍCULO SELECIONADO ─────────────
    function renderVehicleCalendar() {
        const container = document.getElementById('maintCalendarGrid');
        const label = document.getElementById('maintCalMonthLabel');
        if (!container) return;

        const plate = state.selectedVehicleFilter;
        if (!plate) return;

        const ym = state.selectedMonth;
        if (label) label.textContent = getMonthLabel(ym);

        const [year, month] = ym.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const todayIso = getTodayIso();

        const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = dows.map(d => `<div class="veh-cal-dow">${d}</div>`).join('');

        for (let i = 0; i < firstDay; i++) {
            html += `<div class="veh-cal-cell empty"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateIso = `${ym}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            const dow = dateObj.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isToday = dateIso === todayIso;

            const holiday = getHolidayOnDate(dateIso);
            const rec = getRecordForPlateDate(plate, dateIso);
            const driverAbs = getDriverAbsenceOnDate(plate, dateIso);
            const hasChk = hasChecklistOnDate(plate, dateIso);

            let pillsHtml = '';
            let costBadge = '';

            if (rec) {
                const meta = STATUS_META[rec.status] || STATUS_META.ativo;
                const typeLabel = rec.status === 'manutencao'
                    ? (rec.maintType === 'preventiva' ? 'Manut. Prev.' : 'Manut. Corr.')
                    : meta.short;
                pillsHtml += `<div class="veh-pill ${meta.pillClass}"><span class="material-icons-round">${meta.icon}</span><span>${escapeHtml(typeLabel)}</span></div>`;

                if (rec.systems && rec.systems.length > 0) {
                    const sysStr = rec.systems.map(s => getSystemMeta(s).label).join(', ');
                    pillsHtml += `<div class="veh-sys-tag" title="${escapeHtml(sysStr)}">🔧 ${escapeHtml(sysStr)}</div>`;
                } else if (rec.note) {
                    pillsHtml += `<div class="veh-sys-tag" title="${escapeHtml(rec.note)}">${escapeHtml(rec.note)}</div>`;
                }

                if (rec.nfNumber) {
                    pillsHtml += `<div class="veh-nf-tag">🧾 ${escapeHtml(rec.nfNumber)}</div>`;
                }
                if (rec.cost > 0 && rec.start === dateIso) {
                    costBadge = `<span class="veh-cal-cost">${formatCurrency(rec.cost)}</span>`;
                }
            } else if (holiday && !hasChk) {
                pillsHtml += `<div class="veh-pill p-feriado"><span class="material-icons-round">event_available</span><span>${escapeHtml(holiday.short || holiday.name)}</span></div>`;
            } else if (driverAbs === 'ferias' && !hasChk) {
                pillsHtml += `<div class="veh-pill p-ferias"><span class="material-icons-round">beach_access</span><span>Férias Titular</span></div>`;
            } else if (driverAbs === 'banco_horas' && !hasChk) {
                pillsHtml += `<div class="veh-pill p-banco"><span class="material-icons-round">schedule</span><span>Banco Horas</span></div>`;
            } else if (!isWeekend) {
                pillsHtml += `<div class="veh-pill p-ativo"><span class="material-icons-round">check_circle</span><span>Ativo (Rota)</span></div>`;
                if (hasChk) {
                    pillsHtml += `<div class="veh-pill p-checklist"><span class="material-icons-round">fact_check</span><span>Checklist OK</span></div>`;
                }
            } else {
                pillsHtml += `<div class="veh-sys-tag" style="opacity:0.45;">Fim de semana</div>`;
            }

            html += `
                <div class="veh-cal-cell ${isToday ? 'today' : ''} ${holiday ? 'holiday-cell' : ''}" data-date="${dateIso}" title="Clique para lançar ou editar status de ${plate} em ${formatDateBr(dateIso)}">
                    <div class="veh-cal-top">
                        <span class="veh-cal-num">${String(d).padStart(2, '0')}</span>
                        ${costBadge}
                    </div>
                    <div class="veh-cal-body">
                        ${pillsHtml}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        container.querySelectorAll('.veh-cal-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', () => {
                if (!canUserEdit()) return;
                const dateIso = cell.dataset.date;
                const existing = getRecordForPlateDate(plate, dateIso);
                if (existing) {
                    loadRecordIntoForm(existing.id);
                } else {
                    resetForm(plate, dateIso);
                    const statusSel = document.getElementById('maintStatusSelect');
                    if (statusSel) statusSel.focus();
                }
            });
        });
    }

    // ─── RENDERIZAÇÃO DA TABELA DE HISTÓRICO E NOTAS FISCAIS ──────────────────
    function renderTable() {
        const tbody = document.getElementById('maintTableBody');
        const subtitle = document.getElementById('maintTableSubtitle');
        if (!tbody) return;

        const plateFilter = document.getElementById('maintTableFilterPlate')?.value || 'all';
        const statusFilter = document.getElementById('maintTableFilterStatus')?.value || 'all';
        const sysFilter = document.getElementById('maintTableFilterSystem')?.value || 'all';

        const filtered = state.records.filter(r => {
            if (plateFilter !== 'all' && r.plate !== plateFilter) return false;
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (sysFilter !== 'all' && !(r.systems || []).includes(sysFilter)) return false;
            return true;
        }).sort((a, b) => b.start.localeCompare(a.start));

        if (subtitle) {
            const totalFilteredCost = filtered.reduce((acc, r) => acc + Number(r.cost || 0), 0);
            subtitle.textContent = `${filtered.length} registro(s) encontrado(s) · Soma das NFs listadas: ${formatCurrency(totalFilteredCost)}`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:32px;color:var(--clr-text-secondary);">
                        Nenhum registro de manutenção ou status encontrado para os filtros selecionados.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const veh = FLEET.find(f => f.plate === r.plate) || { plate: r.plate, model: '' };
            const meta = STATUS_META[r.status] || STATUS_META.ativo;
            const days = countDaysInclusive(r.start, r.end);

            let statusHtml = `<span class="status-pill ${r.status}"><span class="material-icons-round" style="font-size:14px;">${meta.icon}</span> ${escapeHtml(meta.short)}</span>`;
            if (r.status === 'manutencao' && r.maintType) {
                const isPrev = r.maintType === 'preventiva';
                statusHtml += `<div style="margin-top:4px;"><span style="font-size:10px;font-weight:800;text-transform:uppercase;color:${isPrev ? '#3b82f6' : '#ef4444'};">${isPrev ? '🛡️ Preventiva' : '🔧 Corretiva'}</span></div>`;
            }

            const sysHtml = (r.systems && r.systems.length > 0)
                ? r.systems.map(sId => {
                    const s = getSystemMeta(sId);
                    return `<span class="sys-badge"><span class="material-icons-round" style="font-size:12px;color:#f59e0b;">${s.icon}</span>${escapeHtml(s.label)}</span>`;
                }).join('')
                : `<span style="color:var(--clr-text-secondary);font-size:11.5px;">—</span>`;

            const periodHtml = r.start === r.end
                ? `<strong>${formatDateBr(r.start)}</strong> <span style="font-size:11px;color:var(--clr-text-secondary);">(1 dia)</span>`
                : `<strong>${formatDateBr(r.start)}</strong> a <strong>${formatDateBr(r.end)}</strong> <span style="font-size:11px;color:var(--clr-text-secondary);">(${days} dias)</span>`;

            const needsNf = (r.status === 'manutencao' || r.status === 'off') && (!r.nfNumber || !r.cost || Number(r.cost) === 0);
            const nfHtml = r.nfNumber
                ? `<div><span class="nf-pill"><span class="material-icons-round" style="font-size:13px;">receipt</span>${escapeHtml(r.nfNumber)}</span></div>
                   <div style="font-size:11px;color:var(--clr-text-secondary);margin-top:3px;">${escapeHtml(r.supplier || 'Fornecedor não informado')}</div>`
                : (needsNf
                    ? `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;">
                           <span style="font-size:10.5px;color:#f59e0b;font-weight:700;">⏳ Aguardando NF</span>
                           <button type="button" class="btn-insert-nf" data-quick-nf="${r.id}" title="Ler PDF da NF com IA ou digitar dados fiscais">
                               <span class="material-icons-round" style="font-size:13px;">upload_file</span> Inserir NF (IA / Manual)
                           </button>
                       </div>`
                    : `<span style="color:var(--clr-text-secondary);font-size:11.5px;">Sem NF</span>`);

            const costHtml = r.cost > 0
                ? `<span class="cost-text">${formatCurrency(r.cost)}</span>`
                : (needsNf
                    ? `<span style="color:#f59e0b;font-size:11px;font-weight:700;">Em aberto</span>`
                    : `<span style="color:var(--clr-text-secondary);">R$ 0,00</span>`);

            return `
                <tr>
                    <td>
                        <div style="font-family:var(--font-display,'Montserrat',sans-serif);font-weight:800;font-size:13px;cursor:pointer;color:var(--clr-amber);" data-goto-plate="${r.plate}">${escapeHtml(r.plate)}</div>
                        <div style="font-size:10.5px;color:var(--clr-text-secondary);">${escapeHtml(veh.model)} · ${escapeHtml(getHabitualDriver(r.plate))}</div>
                    </td>
                    <td>${statusHtml}</td>
                    <td style="max-width:260px;">
                        <div>${sysHtml}</div>
                        ${r.note ? `<div style="font-size:11px;color:var(--clr-text-secondary);margin-top:4px;">${escapeHtml(r.note)}</div>` : ''}
                    </td>
                    <td>${periodHtml}</td>
                    <td>${nfHtml}</td>
                    <td>${costHtml}</td>
                    <td style="text-align:right;white-space:nowrap;">
                        <button type="button" class="action-btn" data-edit="${r.id}" title="Editar registro">
                            <span class="material-icons-round" style="font-size:14px;">edit</span> Editar
                        </button>
                        <button type="button" class="action-btn del" data-del="${r.id}" title="Excluir registro">
                            <span class="material-icons-round" style="font-size:14px;">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('[data-goto-plate]').forEach(el => {
            el.addEventListener('click', () => selectVehicle(el.dataset.gotoPlate));
        });
        tbody.querySelectorAll('[data-quick-nf]').forEach(btn => {
            btn.addEventListener('click', () => openQuickNfModal(btn.dataset.quickNf));
        });
        tbody.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => loadRecordIntoForm(btn.dataset.edit));
        });
        tbody.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => deleteRecord(btn.dataset.del));
        });
    }

    // ─── FORMULÁRIO DE REGISTRO & EDIÇÃO ──────────────────────────────────────
    function renderSystemChips() {
        const grid = document.getElementById('maintSystemsGrid');
        if (!grid) return;

        grid.innerHTML = SYSTEMS.map(s => {
            const isSel = state.selectedSystems.has(s.id);
            return `
                <div class="maint-chip ${isSel ? 'selected' : ''}" data-sys="${s.id}">
                    <span class="material-icons-round">${s.icon}</span>
                    <span>${escapeHtml(s.label)}</span>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.maint-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const sysId = chip.dataset.sys;
                if (state.selectedSystems.has(sysId)) {
                    state.selectedSystems.delete(sysId);
                } else {
                    state.selectedSystems.add(sysId);
                }
                renderSystemChips();
            });
        });
    }

    function updateDrawerVisibility() {
        const status = document.getElementById('maintStatusSelect')?.value;
        const drawer = document.getElementById('maintDetailsDrawer');
        if (!drawer) return;
        drawer.style.display = (status === 'manutencao' || status === 'off') ? 'flex' : 'none';
    }

    function loadRecordIntoForm(recId) {
        if (!canUserEdit()) return;
        const rec = state.records.find(r => r.id === recId);
        if (!rec) return;

        if (!state.selectedVehicleFilter) {
            selectVehicle(rec.plate);
        }

        state.editingRecordId = rec.id;
        document.getElementById('maintPlateSelect').value = rec.plate;
        document.getElementById('maintStatusSelect').value = rec.status;
        document.getElementById('maintStartDate').value = rec.start;
        document.getElementById('maintEndDate').value = rec.end;
        document.getElementById('maintNfNumber').value = rec.nfNumber || '';
        document.getElementById('maintSupplier').value = rec.supplier || '';
        document.getElementById('maintCost').value = rec.cost || '';
        document.getElementById('maintNote').value = rec.note || '';

        state.maintType = rec.maintType || 'corretiva';
        state.selectedSystems = new Set(rec.systems || []);
        state.uploadedNfFileName = rec.nfFileName || '';

        const fileTitle = document.getElementById('nfFileTitle');
        if (fileTitle) {
            fileTitle.textContent = rec.nfFileName
                ? `Metadados: ${rec.nfFileName}`
                : 'Ler PDF da Nota Fiscal (Extração Efêmera)';
        }

        document.querySelectorAll('#maintenanceScreen .maint-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === state.maintType);
        });

        renderSystemChips();
        updateDrawerVisibility();

        const formTitle = document.getElementById('maintFormTitle');
        const submitLabel = document.getElementById('maintSubmitLabel');
        const cancelBtn = document.getElementById('btnCancelEdit');
        if (formTitle) formTitle.textContent = `Editando Registro (${rec.plate})`;
        if (submitLabel) submitLabel.textContent = 'Salvar Alterações';
        if (cancelBtn) cancelBtn.style.display = 'block';

        document.getElementById('maintFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function resetForm(defaultPlate = null, defaultDate = null) {
        state.editingRecordId = null;
        state.pendingNokLink = null;
        const nokBanner = document.getElementById('nokLinkBanner');
        if (nokBanner) nokBanner.style.display = 'none';

        const plateSel = document.getElementById('maintPlateSelect');
        if (plateSel) plateSel.value = defaultPlate || state.selectedVehicleFilter || '';

        const statusSel = document.getElementById('maintStatusSelect');
        if (statusSel) statusSel.value = 'manutencao';

        const dt = defaultDate || getTodayIso();
        const startEl = document.getElementById('maintStartDate');
        const endEl = document.getElementById('maintEndDate');
        if (startEl) startEl.value = dt;
        if (endEl) endEl.value = dt;

        const nfNumEl = document.getElementById('maintNfNumber');
        const supEl = document.getElementById('maintSupplier');
        const costEl = document.getElementById('maintCost');
        const noteEl = document.getElementById('maintNote');
        if (nfNumEl) nfNumEl.value = '';
        if (supEl) supEl.value = '';
        if (costEl) costEl.value = '';
        if (noteEl) noteEl.value = '';

        const fileTitle = document.getElementById('nfFileTitle');
        const fileSub = document.getElementById('nfFileSub');
        if (fileTitle) fileTitle.textContent = 'Ler PDF da Nota Fiscal (Extração Efêmera)';
        if (fileSub) fileSub.textContent = 'Extrai Nº NF, Fornecedor, Valor R$ e Sistemas · O arquivo PDF é descartado após a leitura';

        state.uploadedNfFileName = '';
        state.maintType = 'corretiva';
        state.selectedSystems = new Set(['freios']);

        document.querySelectorAll('#maintenanceScreen .maint-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === 'corretiva');
        });
        renderSystemChips();
        updateDrawerVisibility();

        const formTitle = document.getElementById('maintFormTitle');
        const submitLabel = document.getElementById('maintSubmitLabel');
        const cancelBtn = document.getElementById('btnCancelEdit');
        if (formTitle) formTitle.textContent = 'Sinalizar / Editar Status & Manutenção';
        if (submitLabel) submitLabel.textContent = 'Salvar Registro da Frota';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    function deleteRecord(recId) {
        if (!canUserEdit()) {
            showToast('Ação bloqueada: perfil de apenas visualização.', 'warning');
            return;
        }
        const rec = state.records.find(r => r.id === recId);
        if (!rec) return;
        if (!confirm(`Remover registro de ${rec.plate} (${formatDateBr(rec.start)})?`)) return;

        state.records = state.records.filter(r => r.id !== recId);
        saveRecordsToStorage(state.records);
        if (window.CarVerifySupabase && typeof window.CarVerifySupabase.deleteMaintenanceRecord === 'function') {
            window.CarVerifySupabase.deleteMaintenanceRecord(rec);
        }
        renderAll();
        showToast('Registro excluído com sucesso');
    }

    // ─── LEITURA E IMPORTAÇÃO AUTOMÁTICA DE NF (PDF) ─────────────────────────
    function simulateAiExtraction(fileName = null) {
        const tpl = AI_NF_TEMPLATES[state.aiTemplateIdx % AI_NF_TEMPLATES.length];
        state.aiTemplateIdx++;

        document.getElementById('maintStatusSelect').value = 'manutencao';
        updateDrawerVisibility();

        state.maintType = tpl.maintType;
        document.querySelectorAll('#maintenanceScreen .maint-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === state.maintType);
        });

        state.selectedSystems = new Set(tpl.systems);
        renderSystemChips();

        document.getElementById('maintNfNumber').value = tpl.nfNumber;
        document.getElementById('maintSupplier').value = tpl.supplier;
        document.getElementById('maintCost').value = tpl.cost.toFixed(2);
        document.getElementById('maintNote').value = tpl.note;

        const sourcePdfName = fileName || tpl.fileName;
        state.uploadedNfFileName = sourcePdfName;
        const fileTitle = document.getElementById('nfFileTitle');
        const fileSub = document.getElementById('nfFileSub');
        if (fileTitle) fileTitle.textContent = `✔ Dados importados: ${sourcePdfName}`;
        if (fileSub) fileSub.textContent = 'Nº NF, Fornecedor, Valor e Sistemas preenchidos com sucesso';

        showToast(`Dados da Nota Fiscal ${tpl.nfNumber} (${formatCurrency(tpl.cost)}) importados com sucesso!`);
    }

    // ─── MODAL DE 2º ESTÁGIO: INSERIR NF NA TABELA DE HISTÓRICO ───────────────
    function renderQuickNfSystemChips() {
        const grid = document.getElementById('quickNfSystemsGrid');
        if (!grid) return;
        grid.innerHTML = SYSTEMS.map(s => {
            const isSel = state.quickNfSystems.has(s.id);
            return `
                <div class="maint-chip ${isSel ? 'selected' : ''}" data-qsys="${s.id}">
                    <span class="material-icons-round">${s.icon}</span>
                    <span>${escapeHtml(s.label)}</span>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.maint-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const sysId = chip.dataset.qsys;
                if (state.quickNfSystems.has(sysId)) {
                    state.quickNfSystems.delete(sysId);
                } else {
                    state.quickNfSystems.add(sysId);
                }
                renderQuickNfSystemChips();
            });
        });
    }

    function openQuickNfModal(recId) {
        if (!canUserEdit()) {
            showToast('Ação bloqueada: perfil de apenas visualização.', 'warning');
            return;
        }
        const rec = state.records.find(r => r.id === recId);
        if (!rec) return;

        state.quickNfRecordId = rec.id;
        state.quickNfSystems = new Set(rec.systems && rec.systems.length ? rec.systems : ['freios']);
        state.quickNfFileName = rec.nfFileName || '';

        const sub = document.getElementById('quickNfModalSubtitle');
        if (sub) sub.textContent = `Veículo: ${rec.plate} · Período: ${formatDateBr(rec.start)} a ${formatDateBr(rec.end)}`;

        document.getElementById('quickNfNumber').value = rec.nfNumber || '';
        document.getElementById('quickNfCost').value = rec.cost > 0 ? rec.cost.toFixed(2) : '';
        document.getElementById('quickNfSupplier').value = rec.supplier || '';
        document.getElementById('quickNfNote').value = rec.note || '';

        document.getElementById('quickNfDropTitle').textContent = 'Anexar Nota Fiscal (PDF)';
        document.getElementById('quickNfDropSub').textContent = 'Preenchimento automático do Nº da NF, Fornecedor, Valor e Sistemas';

        renderQuickNfSystemChips();

        const backdrop = document.getElementById('quickNfModalBackdrop');
        if (backdrop) backdrop.style.display = 'flex';
    }

    function closeQuickNfModal() {
        const backdrop = document.getElementById('quickNfModalBackdrop');
        if (backdrop) backdrop.style.display = 'none';
        state.quickNfRecordId = null;
    }

    function simulateQuickNfAiExtraction(customFileName = null) {
        const tpl = AI_NF_TEMPLATES[state.aiTemplateIdx % AI_NF_TEMPLATES.length];
        state.aiTemplateIdx++;

        document.getElementById('quickNfNumber').value = tpl.nfNumber;
        document.getElementById('quickNfCost').value = tpl.cost.toFixed(2);
        document.getElementById('quickNfSupplier').value = tpl.supplier;
        document.getElementById('quickNfNote').value = tpl.note;

        state.quickNfSystems = new Set(tpl.systems);
        renderQuickNfSystemChips();

        const sourcePdf = customFileName || tpl.fileName;
        state.quickNfFileName = sourcePdf;

        document.getElementById('quickNfDropTitle').textContent = `✔ Dados importados: ${sourcePdf}`;
        document.getElementById('quickNfDropSub').textContent = 'Nº NF, Fornecedor, Valor e Sistemas preenchidos com sucesso';

        showToast(`Dados da Nota Fiscal ${tpl.nfNumber} (${formatCurrency(tpl.cost)}) importados com sucesso!`);
    }

    // ─── TRIAGEM INLINE DE NOK NA ABA VEÍCULOS (OPÇÃO C) ───────────────────────
    function getTriageKey(plate, question, dateContext) {
        return `${plate}__${question}__${dateContext || 'compiled'}`;
    }

    function getQuestionNokTriageHtml(plate, question, dateContext, nokDisplayLabel) {
        const key = getTriageKey(plate, question, dateContext);
        const triage = state.nokTriage[key] || null;
        const sysId = QUESTION_TO_SYSTEM_MAP[question] || 'preventiva';
        const sysMeta = getSystemMeta(sysId);

        let badgeExtra = '';
        if (triage && triage.type === 'low_priority') {
            badgeExtra = `
                <div class="nok-low-saved-badge" data-nok-reopen="${escapeHtml(key)}" title="Clique para editar justificativa de baixa prioridade">
                    <span class="material-icons-round" style="font-size:13px;">low_priority</span>
                    <span>Baixa Prioridade: ${escapeHtml(triage.reason)}</span>
                </div>
            `;
        } else if (triage && triage.type === 'maintenance') {
            badgeExtra = `
                <div class="nok-maint-linked-badge" title="Encaminhado para aba Manutenção">
                    <span class="material-icons-round" style="font-size:13px;">build_circle</span>
                    <span>OS vinculada (${escapeHtml(sysMeta.label)})</span>
                </div>
            `;
        }

        const chipsHtml = QUICK_LOW_REASONS.map(r =>
            `<button type="button" class="nok-reason-chip" data-chip-reason="${escapeHtml(r)}">${escapeHtml(r)}</button>`
        ).join('');

        return `
            <div class="nok-interaction-zone" data-nok-zone="${escapeHtml(key)}" data-plate="${escapeHtml(plate)}" data-question="${escapeHtml(question)}" data-date="${escapeHtml(dateContext || '')}" data-sys="${escapeHtml(sysId)}">
                <button type="button" class="nok-status-btn" data-nok-toggle="${escapeHtml(key)}" title="Clique para classificar este apontamento NOK">
                    <span class="material-icons-round" style="font-size:14px;">cancel</span>
                    <span>${escapeHtml(nokDisplayLabel)}</span>
                </button>
                <div class="nok-action-choices" id="nokChoices_${escapeHtml(key)}">
                    <button type="button" class="nok-choice-btn low-prio" data-nok-low="${escapeHtml(key)}">
                        <span class="material-icons-round" style="font-size:13px;">schedule</span>
                        Baixa Prioridade
                    </button>
                    <button type="button" class="nok-choice-btn go-maint" data-nok-maint="${escapeHtml(key)}">
                        <span class="material-icons-round" style="font-size:13px;">build</span>
                        Manutenção
                    </button>
                </div>
                <div class="nok-low-prio-panel" id="nokLowPanel_${escapeHtml(key)}">
                    <div class="nok-low-prio-header">
                        <span>Justificar Baixa Prioridade</span>
                        <span style="font-size:9.5px;opacity:0.8;">${escapeHtml(sysMeta.label)}</span>
                    </div>
                    <div class="nok-quick-reasons">${chipsHtml}</div>
                    <div class="nok-low-input-row">
                        <input type="text" class="nok-low-input" placeholder="Ou descreva o motivo..." value="${triage && triage.reason ? escapeHtml(triage.reason) : ''}">
                        <button type="button" class="nok-low-save-btn" data-nok-save-low="${escapeHtml(key)}">Salvar</button>
                    </div>
                </div>
                ${badgeExtra}
            </div>
        `;
    }

    function bindChecklistNokEvents(containerEl) {
        if (!containerEl) return;

        containerEl.querySelectorAll('[data-nok-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canUserEdit()) {
                    showToast('Modo Visualização: triagem de NOK desabilitada.', 'warning');
                    return;
                }
                const zone = btn.closest('.nok-interaction-zone');
                if (!zone) return;
                const choices = zone.querySelector('.nok-action-choices');
                const lowPanel = zone.querySelector('.nok-low-prio-panel');
                if (choices) choices.classList.toggle('open');
                if (lowPanel && choices && !choices.classList.contains('open')) {
                    lowPanel.classList.remove('open');
                }
            });
        });

        containerEl.querySelectorAll('[data-nok-reopen]').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canUserEdit()) return;
                const zone = badge.closest('.nok-interaction-zone');
                if (!zone) return;
                const choices = zone.querySelector('.nok-action-choices');
                const lowPanel = zone.querySelector('.nok-low-prio-panel');
                if (choices) choices.classList.add('open');
                if (lowPanel) lowPanel.classList.add('open');
            });
        });

        containerEl.querySelectorAll('[data-nok-low]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = btn.closest('.nok-interaction-zone');
                if (!zone) return;
                const lowPanel = zone.querySelector('.nok-low-prio-panel');
                if (lowPanel) {
                    lowPanel.classList.toggle('open');
                    const input = lowPanel.querySelector('.nok-low-input');
                    if (input && lowPanel.classList.contains('open')) input.focus();
                }
            });
        });

        containerEl.querySelectorAll('[data-chip-reason]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = chip.closest('.nok-interaction-zone');
                if (!zone) return;
                const input = zone.querySelector('.nok-low-input');
                if (input) input.value = chip.dataset.chipReason;
            });
        });

        containerEl.querySelectorAll('[data-nok-save-low]').forEach(saveBtn => {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = saveBtn.closest('.nok-interaction-zone');
                if (!zone) return;
                const key = zone.dataset.nokZone;
                const input = zone.querySelector('.nok-low-input');
                const reason = (input ? input.value.trim() : '') || 'Monitoramento em rota';
                state.nokTriage[key] = {
                    type: 'low_priority',
                    reason,
                    updatedAt: new Date().toISOString()
                };
                saveTriageToStorage(state.nokTriage);
                showToast('Item classificado como Baixa Prioridade');
                if (typeof window.updateDashboard === 'function') {
                    window.updateDashboard();
                }
            });
        });

        containerEl.querySelectorAll('[data-nok-maint]').forEach(maintBtn => {
            maintBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = maintBtn.closest('.nok-interaction-zone');
                if (!zone) return;
                const plate = zone.dataset.plate;
                const question = zone.dataset.question;
                const dateCtx = zone.dataset.date || getTodayIso();
                const sysId = zone.dataset.sys || QUESTION_TO_SYSTEM_MAP[question] || 'preventiva';
                const key = zone.dataset.nokZone;

                state.nokTriage[key] = {
                    type: 'maintenance',
                    system: sysId,
                    updatedAt: new Date().toISOString()
                };
                saveTriageToStorage(state.nokTriage);

                triggerFromChecklistNok({
                    plate,
                    question,
                    date: dateCtx.length === 10 ? dateCtx : getTodayIso(),
                    system: sysId
                });
            });
        });
    }

    function triggerFromChecklistNok({ plate, question, date, system }) {
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('maintenance');
        }
        const ym = (date || getTodayIso()).substring(0, 7);
        state.selectedMonth = ym;
        selectVehicle(plate);
        resetForm(plate, date || getTodayIso());

        const sysId = system || QUESTION_TO_SYSTEM_MAP[question] || 'preventiva';
        state.selectedSystems = new Set([sysId]);
        renderSystemChips();

        state.pendingNokLink = { plate, question, date, system: sysId };
        const nokBanner = document.getElementById('nokLinkBanner');
        const nokText = document.getElementById('nokLinkBannerText');
        if (nokBanner && nokText) {
            nokText.textContent = `Apontamento "${question}" do veículo ${plate} (${formatDateBr(date)}) pré-carregado no sistema "${getSystemMeta(sysId).label}".`;
            nokBanner.style.display = 'flex';
        }

        const noteEl = document.getElementById('maintNote');
        if (noteEl && !noteEl.value) {
            noteEl.value = `Origem Checklist NOK (${formatDateBr(date)}): ${question}.`;
        }

        const formCard = document.getElementById('maintFormCard');
        if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast(`OS pré-preenchida para ${plate} (${getSystemMeta(sysId).label})`);
    }

    // ─── RELATÓRIO EXECUTIVO A4 DE MANUTENÇÃO ─────────────────────────────────
    function openExecutiveReportModal() {
        const sheet = document.getElementById('a4ReportSheet');
        const backdrop = document.getElementById('maintReportModalBackdrop');
        if (!sheet || !backdrop) return;

        const ym = state.selectedMonth;
        const plate = state.selectedVehicleFilter;
        const recs = state.records.filter(r => {
            const m = r.start.startsWith(ym) || r.end.startsWith(ym);
            const p = !plate || r.plate === plate;
            return m && p;
        }).sort((a, b) => a.start.localeCompare(b.start));

        const totalCost = recs.reduce((acc, r) => acc + Number(r.cost || 0), 0);
        const downtime = recs.filter(r => r.status === 'manutencao' || r.status === 'off')
            .reduce((acc, r) => acc + countDaysInclusive(r.start, r.end), 0);
        const corr = recs.filter(r => r.status === 'manutencao' && r.maintType !== 'preventiva').length;
        const prev = recs.filter(r => r.status === 'manutencao' && r.maintType === 'preventiva').length;

        const sysCount = {};
        SYSTEMS.forEach(s => { sysCount[s.id] = 0; });
        recs.forEach(r => (r.systems || []).forEach(s => { if (sysCount[s] !== undefined) sysCount[s]++; }));

        sheet.innerHTML = `
            <div class="a4-header">
                <div>
                    <h1>ᑕᗩᖇ . ᐯᕮᖇIᖴY — RELATÓRIO EXECUTIVO DE MANUTENÇÃO &amp; FROTA</h1>
                    <p>${plate ? `Veículo Filtrado: Placa ${escapeHtml(plate)} (${escapeHtml(getHabitualDriver(plate))})` : 'Consolidado Geral da Frota (10 Veículos)'} · Competência: ${getMonthLabel(ym)}</p>
                </div>
                <div style="text-align:right;font-size:11px;color:#475569;">
                    <strong>GRUPO EFX / ALPHA CANDIES</strong><br>
                    Emitido em: ${new Date().toLocaleDateString('pt-BR')}
                </div>
            </div>

            <div class="a4-kpi-strip">
                <div class="a4-kpi"><span>Investimento Total</span><strong>${formatCurrency(totalCost)}</strong></div>
                <div class="a4-kpi"><span>Dias Parados</span><strong>${downtime} dias</strong></div>
                <div class="a4-kpi"><span>Manut. Corretivas</span><strong>${corr} OS</strong></div>
                <div class="a4-kpi"><span>Manut. Preventivas</span><strong>${prev} OS</strong></div>
                <div class="a4-kpi"><span>Notas Fiscais</span><strong>${recs.filter(r => r.nfNumber).length} NFs</strong></div>
            </div>

            <div class="a4-section-title">Incidência por Sistema Mecânico no Período</div>
            <div class="a4-sys-grid">
                ${SYSTEMS.map(s => `
                    <div class="a4-sys-item">
                        <span>${escapeHtml(s.label)}</span>
                        <strong>${sysCount[s.id]}x</strong>
                    </div>
                `).join('')}
            </div>

            <div class="a4-section-title">Detalhamento de Intervenções, Períodos e Notas Fiscais</div>
            <table class="a4-table">
                <thead>
                    <tr>
                        <th>Placa</th>
                        <th>Status / Tipo</th>
                        <th>Sistemas Afetados</th>
                        <th>Período</th>
                        <th>Nota Fiscal / Fornecedor</th>
                        <th>Valor (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    ${recs.length ? recs.map(r => `
                        <tr>
                            <td><strong>${escapeHtml(r.plate)}</strong></td>
                            <td>${escapeHtml(STATUS_META[r.status]?.short || r.status)} ${r.maintType ? `(${escapeHtml(r.maintType)})` : ''}</td>
                            <td>${escapeHtml((r.systems || []).map(s => getSystemMeta(s).label).join(', ') || r.note || '—')}</td>
                            <td>${formatDateBr(r.start)} a ${formatDateBr(r.end)} (${countDaysInclusive(r.start, r.end)}d)</td>
                            <td>${r.nfNumber ? `${escapeHtml(r.nfNumber)} — ${escapeHtml(r.supplier || '')}` : '—'}</td>
                            <td><strong>${formatCurrency(r.cost)}</strong></td>
                        </tr>
                    `).join('') : `<tr><td colspan="6" style="text-align:center;">Nenhuma intervenção registrada no período.</td></tr>`}
                </tbody>
            </table>

            <div class="a4-signatures">
                <div class="a4-sig-line">Responsável pela Frota / Logística (Júlio / Sandro)</div>
                <div class="a4-sig-line">Diretoria / Controladoria Financeira — Grupo EFX</div>
            </div>
        `;

        backdrop.style.display = 'flex';
    }

    // ─── POPULAÇÃO DOS SELETORES E EVENTOS ────────────────────────────────────
    function populateSelects() {
        const plateSel = document.getElementById('maintPlateSelect');
        const filterPlateSel = document.getElementById('maintTableFilterPlate');
        const filterSysSel = document.getElementById('maintTableFilterSystem');
        const monthSel = document.getElementById('dailyReportMonthSelect');

        if (plateSel && plateSel.tagName === 'SELECT') {
            plateSel.innerHTML = `<option value="">Selecione a placa...</option>` +
                FLEET.map(v => `<option value="${v.plate}">${v.plate} — ${v.model} (${v.habitual.split(' ')[0]})</option>`).join('');
        }
        if (filterPlateSel) {
            filterPlateSel.innerHTML = `<option value="all">Todos os Veículos (10)</option>` +
                FLEET.map(v => `<option value="${v.plate}">${v.plate} (${v.model})</option>`).join('');
        }
        if (filterSysSel) {
            filterSysSel.innerHTML = `<option value="all">Todos os Sistemas</option>` +
                SYSTEMS.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
        }
        if (monthSel) {
            const months = new Set();
            const currentYm = getCurrentYm();
            months.add(currentYm);
            ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'].forEach(m => months.add(m));
            state.records.forEach(r => {
                if (r.start && r.start.length >= 7) months.add(r.start.substring(0, 7));
            });
            const sorted = Array.from(months).sort().reverse();
            monthSel.innerHTML = sorted.map(ym => `<option value="${ym}">${getMonthLabel(ym)}</option>`).join('');
            monthSel.value = state.selectedMonth;
        }
    }

    function bindEvents() {
        if (state.initialized) return;
        state.initialized = true;

        populateSelects();
        renderSystemChips();
        resetForm();

        document.getElementById('maintStatusSelect')?.addEventListener('change', updateDrawerVisibility);

        document.querySelectorAll('#maintenanceScreen .maint-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.maintType = btn.dataset.type;
                document.querySelectorAll('#maintenanceScreen .maint-type-btn').forEach(b => {
                    b.classList.toggle('active', b === btn);
                });
            });
        });

        const dropzone = document.getElementById('nfDropzone');
        const fileInput = document.getElementById('nfFileInput');
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const pdfName = file.name;
                    e.target.value = '';
                    simulateAiExtraction(pdfName);
                }
            });
        }

        document.getElementById('btnSimulateAiNf')?.addEventListener('click', () => {
            simulateAiExtraction();
        });

        // Modal 2º estágio de NF
        const quickDropzone = document.getElementById('quickNfDropzone');
        const quickFileInput = document.getElementById('quickNfFileInput');
        if (quickDropzone && quickFileInput) {
            quickDropzone.addEventListener('click', () => quickFileInput.click());
            quickFileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const pdfName = file.name;
                    e.target.value = '';
                    simulateQuickNfAiExtraction(pdfName);
                }
            });
        }

        document.getElementById('btnQuickSimulateAiNf')?.addEventListener('click', () => {
            simulateQuickNfAiExtraction();
        });
        document.getElementById('btnCloseQuickNfModal')?.addEventListener('click', closeQuickNfModal);
        document.getElementById('btnCancelQuickNf')?.addEventListener('click', closeQuickNfModal);

        document.getElementById('quickNfForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!canUserEdit()) return;
            const rec = state.records.find(r => r.id === state.quickNfRecordId);
            if (!rec) return;

            rec.nfNumber = document.getElementById('quickNfNumber').value.trim();
            rec.cost = parseFloat(document.getElementById('quickNfCost').value) || 0;
            rec.supplier = document.getElementById('quickNfSupplier').value.trim();
            rec.note = document.getElementById('quickNfNote').value.trim();
            rec.systems = Array.from(state.quickNfSystems);
            if (state.quickNfFileName) rec.nfFileName = state.quickNfFileName;

            saveRecordsToStorage(state.records);
            if (window.CarVerifySupabase && typeof window.CarVerifySupabase.upsertMaintenanceRecord === 'function') {
                window.CarVerifySupabase.upsertMaintenanceRecord(rec);
            }

            closeQuickNfModal();
            renderAll();
            showToast(`NF ${rec.nfNumber} (${formatCurrency(rec.cost)}) vinculada ao veículo ${rec.plate}!`);
        });

        // Submit do formulário principal
        document.getElementById('maintForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!canUserEdit()) {
                showToast('Ação bloqueada: perfil de apenas visualização.', 'warning');
                return;
            }
            const plate = (document.getElementById('maintPlateSelect')?.value || state.selectedVehicleFilter || '').trim();
            const status = document.getElementById('maintStatusSelect').value;
            const start = document.getElementById('maintStartDate').value;
            const end = document.getElementById('maintEndDate').value || start;

            if (!plate || !start) {
                showToast('Selecione o veículo e a data inicial', 'warning');
                return;
            }
            if (end < start) {
                showToast('Data final não pode ser anterior à data inicial', 'warning');
                return;
            }

            const isMaintOrOff = status === 'manutencao' || status === 'off';
            const payload = {
                id: state.editingRecordId || ('rec-' + Date.now()),
                plate,
                status,
                maintType: isMaintOrOff ? state.maintType : null,
                systems: isMaintOrOff ? Array.from(state.selectedSystems) : [],
                start,
                end,
                nfNumber: isMaintOrOff ? document.getElementById('maintNfNumber').value.trim() : '',
                supplier: isMaintOrOff ? document.getElementById('maintSupplier').value.trim() : '',
                cost: isMaintOrOff ? (parseFloat(document.getElementById('maintCost').value) || 0) : 0,
                nfFileName: isMaintOrOff ? state.uploadedNfFileName : '',
                note: document.getElementById('maintNote').value.trim(),
                linkedNok: state.pendingNokLink || null
            };

            if (state.editingRecordId) {
                const idx = state.records.findIndex(r => r.id === state.editingRecordId);
                if (idx >= 0) {
                    payload.uuid = state.records[idx].uuid;
                    state.records[idx] = payload;
                }
                showToast(`Registro de ${plate} atualizado com sucesso!`);
            } else {
                state.records.push(payload);
                showToast(`Status "${STATUS_META[status]?.short || status}" registrado para ${plate}!`);
            }

            saveRecordsToStorage(state.records);
            if (window.CarVerifySupabase && typeof window.CarVerifySupabase.upsertMaintenanceRecord === 'function') {
                const savedRow = await window.CarVerifySupabase.upsertMaintenanceRecord(payload);
                if (savedRow && savedRow.id) {
                    payload.uuid = savedRow.id;
                    saveRecordsToStorage(state.records);
                }
            }

            resetForm(state.selectedVehicleFilter, start);
            renderAll();
        });

        document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
            resetForm(state.selectedVehicleFilter);
        });

        document.getElementById('btnBackToFleetOverview')?.addEventListener('click', () => {
            selectVehicle(null);
        });

        document.getElementById('dailyReportMonthSelect')?.addEventListener('change', (e) => {
            state.selectedMonth = e.target.value;
            state.selectedOverviewDay = `${state.selectedMonth}-01`;
            renderAll();
        });

        document.getElementById('btnMaintPrevMonth')?.addEventListener('click', () => stepMonth(-1));
        document.getElementById('btnMaintNextMonth')?.addEventListener('click', () => stepMonth(1));

        document.getElementById('maintTableFilterPlate')?.addEventListener('change', renderTable);
        document.getElementById('maintTableFilterStatus')?.addEventListener('change', renderTable);
        document.getElementById('maintTableFilterSystem')?.addEventListener('change', renderTable);

        document.getElementById('btnOpenMaintReport')?.addEventListener('click', openExecutiveReportModal);
        document.getElementById('btnOpenFleetReportOverview')?.addEventListener('click', openExecutiveReportModal);
        document.getElementById('btnCloseMaintReport')?.addEventListener('click', () => {
            const backdrop = document.getElementById('maintReportModalBackdrop');
            if (backdrop) backdrop.style.display = 'none';
        });
        document.getElementById('btnPrintMaintA4')?.addEventListener('click', () => {
            window.print();
        });
    }

    function stepMonth(delta) {
        const [y, m] = state.selectedMonth.split('-').map(Number);
        let ny = y;
        let nm = m + delta;
        if (nm < 1) { nm = 12; ny--; }
        if (nm > 12) { nm = 1; ny++; }
        state.selectedMonth = `${ny}-${String(nm).padStart(2, '0')}`;
        renderAll();
    }

    function renderAll() {
        if (!state.initialized) bindEvents();
        renderSidebar();
        renderDailyStatusReport();
        renderKPIs();
        renderCharts();
        renderVehicleCalendar();
        renderTable();
    }

    function init() {
        bindEvents();
        renderAll();
        syncFromSupabase();
    }

    return {
        init,
        render: renderAll,
        sync: syncFromSupabase,
        selectVehicle,
        getRecordForPlateDate,
        getQuestionNokTriageHtml,
        bindChecklistNokEvents,
        triggerFromChecklistNok,
        SYSTEMS,
        STATUS_META,
        QUESTION_TO_SYSTEM_MAP
    };
})();

window.MaintenanceModule = MaintenanceModule;

