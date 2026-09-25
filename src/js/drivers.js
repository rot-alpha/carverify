/* ============================================
   Drivers — Controle de Atividades de Motoristas
   Status diário, férias automáticas, KPIs.
   ============================================ */

const DriversModule = (function() {
    'use strict';

    // ─── STATUS ENUM ───────────────────────────
    const STATUS_MAP = {
        ativo:       { label: 'Ativo',          icon: 'check_circle',    color: '#22c55e', colorRgb: '34,197,94' },
        banco_horas: { label: 'Banco de Horas', icon: 'schedule',        color: '#3b82f6', colorRgb: '59,130,246' },
        falta:       { label: 'Falta',          icon: 'cancel',          color: '#ef4444', colorRgb: '239,68,68' },
        atestado:    { label: 'Atestado',       icon: 'medical_services',color: '#a855f7', colorRgb: '168,85,247' },
        ferias:      { label: 'Férias',         icon: 'beach_access',    color: '#f59e0b', colorRgb: '245,158,11' }
    };

    const STORAGE_KEY = 'carverify_driver_activities';
    const STORAGE_VACATIONS = 'carverify_driver_vacations';
    const DELETED_DRIVERS = ['Pablo Henrique'];

    // ─── DRIVERS LIST (quadro ativo de colaboradores) ──
    const KNOWN_DRIVERS = [
        'Alan Henrique',
        'Alex Schuermann',
        'Anderson Barbosa',
        'Anderson Luiz',
        'Carlos Alberto',
        'Cristian Ricardo',
        'Evaldo Aparecido',
        'Jailton Ferreira',
        'José Lucivaldo',
        'Leonildo Silva',
        'Luis Gustavo',
        'Murilo Gonzaga',
        'Rafael Da Silva',
        'Ricardo Rodrigues',
        'Rogério Ribeiro',
        'Wesley Cristian'
    ];

    // ─── PERSISTENCE & AUTO-VACATION SYNC ──────
    function loadVacations() {
        try {
            const raw = localStorage.getItem(STORAGE_VACATIONS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('DriversModule: falha ao ler férias', e);
            return {};
        }
    }

    function saveVacations(vacs) {
        try {
            localStorage.setItem(STORAGE_VACATIONS, JSON.stringify(vacs));
        } catch (e) {
            console.warn('DriversModule: falha ao salvar férias', e);
        }
    }

    function cleanDeletedDrivers(data, vacs) {
        let actChanged = false;
        let vacChanged = false;

        DELETED_DRIVERS.forEach(name => {
            if (data && data[name]) {
                delete data[name];
                actChanged = true;
            }
            if (vacs && vacs[name]) {
                delete vacs[name];
                vacChanged = true;
            }
        });

        if (actChanged) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {}
        }
        if (vacChanged) {
            try {
                localStorage.setItem(STORAGE_VACATIONS, JSON.stringify(vacs));
            } catch (e) {}
        }
    }

    // Immediate cleanup of deleted staff records upon script load
    try {
        const _rawAct = localStorage.getItem(STORAGE_KEY);
        const _act = _rawAct ? JSON.parse(_rawAct) : {};
        const _vacs = loadVacations();
        cleanDeletedDrivers(_act, _vacs);
    } catch (e) {}

    function syncVacationsToActivities(activitiesData, vacs) {
        let changed = false;
        Object.entries(vacs).forEach(([driver, periods]) => {
            if (!Array.isArray(periods)) return;
            if (DELETED_DRIVERS.includes(driver)) return;
            if (!activitiesData[driver]) activitiesData[driver] = {};

            periods.forEach(p => {
                if (!p.start || !p.end) return;
                const start = parseDate(p.start);
                const end = parseDate(p.end);
                const cursor = new Date(start);
                while (cursor <= end) {
                    const key = formatDateKey(cursor);
                    if (activitiesData[driver][key] !== 'ferias') {
                        activitiesData[driver][key] = 'ferias';
                        changed = true;
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
            });
        });

        if (changed) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(activitiesData));
            } catch (e) {}
        }
        return activitiesData;
    }

    function loadActivities() {
        let data = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            data = raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('DriversModule: falha ao ler localStorage', e);
            data = {};
        }

        const vacs = loadVacations();
        cleanDeletedDrivers(data, vacs);
        syncVacationsToActivities(data, vacs);
        return data;
    }

    function saveActivities(data) {
        try {
            cleanDeletedDrivers(data, loadVacations());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('DriversModule: falha ao gravar localStorage', e);
        }
    }

    function getActiveVacationForDate(driver, dateStr) {
        const vacs = loadVacations();
        const periods = vacs[driver] || [];
        return periods.find(p => p.start <= dateStr && p.end >= dateStr) || null;
    }

    // ─── DATE HELPERS ──────────────────────────
    function formatDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function parseDate(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function formatDateDisplay(dateStr) {
        const d = parseDate(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getMonthLabel(dateStr) {
        const d = parseDate(dateStr);
        const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function todayKey() {
        return formatDateKey(new Date());
    }

    // ─── REGISTER ACTIVITY ─────────────────────
    function registerActivity(driverName, status, dateStr) {
        if (DELETED_DRIVERS.includes(driverName)) return;
        const data = loadActivities();
        if (!data[driverName]) data[driverName] = {};
        data[driverName][dateStr] = status;
        saveActivities(data);
    }

    function registerVacation(driverName, startStr, endStr) {
        if (DELETED_DRIVERS.includes(driverName)) return;

        // 1. Guardar período de férias permanente
        const vacs = loadVacations();
        if (!vacs[driverName]) vacs[driverName] = [];
        // Filtra períodos idênticos
        vacs[driverName] = vacs[driverName].filter(p => !(p.start === startStr && p.end === endStr));
        vacs[driverName].push({
            start: startStr,
            end: endStr,
            createdAt: todayKey()
        });
        saveVacations(vacs);

        // 2. Preencher automaticamente todos os dias do período no histórico de atividades
        const data = loadActivities();
        if (!data[driverName]) data[driverName] = {};

        const start = parseDate(startStr);
        const end = parseDate(endStr);
        const cursor = new Date(start);

        while (cursor <= end) {
            const key = formatDateKey(cursor);
            data[driverName][key] = 'ferias';
            cursor.setDate(cursor.getDate() + 1);
        }

        saveActivities(data);
    }

    function deleteActivity(driverName, dateStr) {
        const data = loadActivities();
        if (data[driverName] && data[driverName][dateStr]) {
            delete data[driverName][dateStr];
            if (Object.keys(data[driverName]).length === 0) {
                delete data[driverName];
            }
            saveActivities(data);
        }
        // Se a data apagada fazia parte de férias cadastradas, ajusta/remove o período de férias
        const vacs = loadVacations();
        if (vacs[driverName]) {
            vacs[driverName] = vacs[driverName].filter(p => !(p.start <= dateStr && p.end >= dateStr));
            saveVacations(vacs);
        }
    }

    // ─── KPI COMPUTATIONS ──────────────────────
    function computeKPIs(filterMonth) {
        const data = loadActivities();
        const counts = { ativo: 0, banco_horas: 0, falta: 0, atestado: 0, ferias: 0 };
        let total = 0;

        Object.entries(data).forEach(([driver, days]) => {
            Object.entries(days).forEach(([dateStr, status]) => {
                if (filterMonth && !dateStr.startsWith(filterMonth)) return;
                if (counts.hasOwnProperty(status)) {
                    counts[status]++;
                    total++;
                }
            });
        });

        const percentages = {};
        Object.keys(counts).forEach(k => {
            percentages[k] = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
        });

        return { counts, total, percentages };
    }

    function computeTop3Absent(filterMonth) {
        const data = loadActivities();
        const absences = {}; // driver -> count of non-ativo days

        Object.entries(data).forEach(([driver, days]) => {
            let count = 0;
            Object.entries(days).forEach(([dateStr, status]) => {
                if (filterMonth && !dateStr.startsWith(filterMonth)) return;
                if (status !== 'ativo') count++;
            });
            if (count > 0) absences[driver] = count;
        });

        return Object.entries(absences)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));
    }

    // ─── GET DAILY STATUS RECORDS (Gradual replacement) ──
    function getDailyStatusRecords() {
        const data = loadActivities();
        const today = todayKey();
        const records = [];

        KNOWN_DRIVERS.forEach(driver => {
            const driverDays = data[driver] || {};
            const activeVacation = getActiveVacationForDate(driver, today);

            // 1. Checa se o colaborador está em período de férias automático ou já tem férias lançadas hoje
            if (activeVacation || driverDays[today] === 'ferias') {
                const vacEnd = activeVacation ? activeVacation.end : null;
                const endLabel = vacEnd ? formatDateDisplay(vacEnd).substring(0, 5) : '';
                records.push({
                    driver,
                    status: 'ferias',
                    date: today,
                    isToday: true,
                    isVacation: true,
                    vacationInfo: activeVacation,
                    origin: activeVacation ? `Férias (até ${endLabel})` : 'Férias (Hoje)'
                });
            } else if (driverDays[today]) {
                // 2. Checa se já tem registro manual do dia atual
                records.push({
                    driver,
                    status: driverDays[today],
                    date: today,
                    isToday: true,
                    isVacation: false,
                    origin: 'Hoje'
                });
            } else {
                // 3. Busca o registro mais recente anterior a hoje
                const pastDates = Object.keys(driverDays)
                    .filter(d => d < today)
                    .sort()
                    .reverse();

                if (pastDates.length > 0) {
                    const latestPastDate = pastDates[0];
                    records.push({
                        driver,
                        status: driverDays[latestPastDate],
                        date: latestPastDate,
                        isToday: false,
                        isVacation: false,
                        origin: 'Anterior (' + formatDateDisplay(latestPastDate).substring(0, 5) + ')'
                    });
                } else {
                    records.push({
                        driver,
                        status: null,
                        date: null,
                        isToday: false,
                        isVacation: false,
                        origin: 'Pendente'
                    });
                }
            }
        });

        records.sort((a, b) => a.driver.localeCompare(b.driver));
        return records;
    }

    // ─── GET ALL RECORDS (historic) ────────────
    function getAllRecords(filterMonth) {
        const data = loadActivities();
        const records = [];

        Object.entries(data).forEach(([driver, days]) => {
            Object.entries(days).forEach(([dateStr, status]) => {
                if (filterMonth && !dateStr.startsWith(filterMonth)) return;
                records.push({ driver, date: dateStr, status });
            });
        });

        records.sort((a, b) => b.date.localeCompare(a.date) || a.driver.localeCompare(b.driver));
        return records;
    }

    // ─── AVAILABLE MONTHS ──────────────────────
    function getAvailableMonths() {
        const data = loadActivities();
        const months = new Set();
        Object.values(data).forEach(days => {
            Object.keys(days).forEach(d => {
                months.add(d.substring(0, 7)); // yyyy-MM
            });
        });
        months.add(todayKey().substring(0, 7));
        return Array.from(months).sort().reverse();
    }

    // ─── COLLABORATOR STATS & CALENDAR HELPERS ──
    function getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    const AVATAR_COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
        '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
    ];

    function getAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    function getCollaboratorStats(driverName, monthKey) {
        const data = loadActivities();
        const days = data[driverName] || {};
        const counts = { ativo: 0, banco_horas: 0, falta: 0, atestado: 0, ferias: 0 };
        let total = 0;

        Object.entries(days).forEach(([dateStr, status]) => {
            if (monthKey && !dateStr.startsWith(monthKey)) return;
            if (counts.hasOwnProperty(status)) {
                counts[status]++;
                total++;
            }
        });

        const pctPresenca = total > 0 ? Math.round(((counts.ativo + counts.banco_horas) / total) * 100) : 0;
        return { counts, total, pctPresenca };
    }

    // ─── STATE MANAGEMENT ──────────────────────
    let selectedDriver = null; // null = overview, string = collaborator name
    let selectedCalendarMonth = todayKey().substring(0, 7); // 'yyyy-MM'
    let currentFilter = todayKey().substring(0, 7); // month filter for overview
    let driverSearchTerm = '';
    let isInitialized = false;

    function init() {
        loadActivities();
        currentFilter = todayKey().substring(0, 7);
        selectedCalendarMonth = todayKey().substring(0, 7);
        render();
        if (!isInitialized) {
            bindEvents();
            isInitialized = true;
        }
    }

    function render() {
        renderSidebarList();
        renderMonthFilter();

        if (selectedDriver) {
            // Show individual profile & calendar
            const overviewEl = document.getElementById('driversOverviewView');
            const profileEl = document.getElementById('driverProfileView');
            if (overviewEl) overviewEl.style.display = 'none';
            if (profileEl) profileEl.style.display = 'flex';
            renderDriverProfile();
        } else {
            // Show overview & daily table
            const overviewEl = document.getElementById('driversOverviewView');
            const profileEl = document.getElementById('driverProfileView');
            if (overviewEl) overviewEl.style.display = 'flex';
            if (profileEl) profileEl.style.display = 'none';
            renderKPIs();
            renderTop3();
            renderDailyTable();
        }
    }

    // ─── SIDEBAR RENDERING ─────────────────────
    function renderSidebarList() {
        const container = document.getElementById('driversNavList');
        if (!container) return;

        const data = loadActivities();
        const today = todayKey();
        const dailyRecords = getDailyStatusRecords();
        const todayCount = dailyRecords.filter(r => r.isToday).length;
        const vacCount = dailyRecords.filter(r => r.isVacation).length;

        // Sync text in table
        const syncText = document.getElementById('dailySyncText');
        if (syncText) {
            syncText.textContent = vacCount > 0 
                ? `${todayCount}/${KNOWN_DRIVERS.length} hoje (${vacCount} em férias)`
                : `${todayCount}/${KNOWN_DRIVERS.length} hoje`;
        }

        const filteredDrivers = KNOWN_DRIVERS.filter(name => 
            !driverSearchTerm || name.toLowerCase().includes(driverSearchTerm.toLowerCase())
        );

        let html = `
            <div class="driver-nav-item overview-nav-item ${selectedDriver === null ? 'active' : ''}" data-driver="">
                <div class="driver-nav-avatar" style="background: var(--clr-primary);">
                    <span class="material-icons-round">dashboard</span>
                </div>
                <div class="driver-nav-info">
                    <span class="driver-nav-name">Visão Geral Diária</span>
                    <span class="driver-nav-sub">${todayCount}/${KNOWN_DRIVERS.length} registrados hoje</span>
                </div>
                <span class="driver-nav-count-badge">${todayCount}</span>
            </div>
            <div class="driver-nav-divider"><span>COLABORADORES (${filteredDrivers.length})</span></div>
        `;

        filteredDrivers.forEach(name => {
            const activeVac = getActiveVacationForDate(name, today);
            const isVac = !!activeVac || (data[name] && data[name][today] === 'ferias');
            const hasToday = isVac || !!(data[name] && data[name][today]);
            const statusKey = isVac ? 'ferias' : (data[name] && data[name][today] ? data[name][today] : null);
            const statusMeta = statusKey ? STATUS_MAP[statusKey] : null;
            const isSelected = selectedDriver === name;

            html += `
                <div class="driver-nav-item ${isSelected ? 'active' : ''}" data-driver="${name}">
                    <div class="driver-nav-avatar" style="background: ${getAvatarColor(name)};">
                        ${getInitials(name)}
                    </div>
                    <div class="driver-nav-info">
                        <span class="driver-nav-name">${name}</span>
                        <span class="driver-nav-status-sub">
                            ${isVac 
                                ? '<span class="dot-online" style="background:#f59e0b;"></span> Em Férias'
                                : hasToday 
                                ? `<span class="dot-online" style="background:${statusMeta.color};"></span> ${statusMeta.label}` 
                                : '<span class="dot-offline"></span> Aguardando hoje'}
                        </span>
                    </div>
                    <span class="material-icons-round driver-nav-arrow">chevron_right</span>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ─── MONTH FILTER ──────────────────────────
    function renderMonthFilter() {
        const select = document.getElementById('driversMonthSelect');
        if (!select) return;

        const months = getAvailableMonths();
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

        select.innerHTML = '<option value="">Todos os meses</option>';
        months.forEach(m => {
            const [y, mo] = m.split('-');
            const label = `${monthNames[parseInt(mo, 10) - 1]} ${y}`;
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = label;
            if (m === currentFilter) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // ─── OVERVIEW KPIS & TOP 3 ─────────────────
    function renderKPIs() {
        const container = document.getElementById('driversKpiGrid');
        if (!container) return;

        const { counts, total, percentages } = computeKPIs(currentFilter);

        container.innerHTML = Object.entries(STATUS_MAP).map(([key, meta]) => `
            <div class="driver-kpi-card" data-status="${key}">
                <div class="driver-kpi-icon" style="background: rgba(${meta.colorRgb}, 0.12); color: ${meta.color};">
                    <span class="material-icons-round">${meta.icon}</span>
                </div>
                <div class="driver-kpi-info">
                    <span class="driver-kpi-value">${counts[key]}</span>
                    <span class="driver-kpi-label">${meta.label}</span>
                </div>
                <div class="driver-kpi-pct" style="color: ${meta.color};">${percentages[key]}%</div>
            </div>
        `).join('');
    }

    function renderTop3() {
        const container = document.getElementById('driversTop3List');
        if (!container) return;

        const top3 = computeTop3Absent(currentFilter);

        if (top3.length === 0) {
            container.innerHTML = `
                <div class="drivers-empty-state">
                    <span class="material-icons-round">emoji_events</span>
                    <p>Todos os colaboradores estão ativos!</p>
                </div>`;
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        container.innerHTML = top3.map((item, i) => `
            <div class="driver-top3-item">
                <span class="driver-top3-medal">${medals[i]}</span>
                <div class="driver-top3-info">
                    <span class="driver-top3-name">${item.name}</span>
                    <span class="driver-top3-count">${item.count} dia${item.count > 1 ? 's' : ''} ausente</span>
                </div>
            </div>
        `).join('');
    }

    // ─── DAILY TABLE WITH GRADUAL REPLACEMENT ──
    function renderDailyTable() {
        const tbody = document.getElementById('driversTableBody');
        if (!tbody) return;

        const dailyRecords = getDailyStatusRecords();
        const todayCount = dailyRecords.filter(r => r.isToday).length;

        // Subtitle status message
        const subtitle = document.getElementById('dailyTableSubtitle');
        if (subtitle) {
            if (todayCount === KNOWN_DRIVERS.length) {
                subtitle.textContent = `Todos os ${KNOWN_DRIVERS.length} colaboradores foram registrados para o dia de hoje!`;
            } else {
                subtitle.textContent = `${todayCount} de ${KNOWN_DRIVERS.length} registrados hoje. Os demais exibem a última referência com substituição gradativa.`;
            }
        }

        tbody.innerHTML = dailyRecords.map(r => {
            const meta = r.status ? (STATUS_MAP[r.status] || STATUS_MAP.ativo) : null;
            const isToday = r.isToday;
            const isVacation = !!r.isVacation;
            const dateStr = r.date ? formatDateDisplay(r.date) : 'Sem registro';

            return `
                <tr class="${isVacation ? 'row-vacation' : (isToday ? 'row-today' : 'row-past')}">
                    <td>
                        <div class="driver-table-user" data-open-driver="${r.driver}" title="Ver calendário de ${r.driver}">
                            <div class="driver-table-avatar" style="background:${getAvatarColor(r.driver)};">
                                ${getInitials(r.driver)}
                            </div>
                            <span class="driver-table-name">${r.driver}</span>
                        </div>
                    </td>
                    <td>
                        ${meta ? `
                            <span class="driver-status-badge" style="background: rgba(${meta.colorRgb}, 0.12); color: ${meta.color}; border: 1px solid rgba(${meta.colorRgb}, 0.25);">
                                <span class="material-icons-round" style="font-size:14px;">${meta.icon}</span>
                                ${meta.label}
                            </span>
                        ` : `
                            <span class="driver-status-badge status-empty">
                                <span class="material-icons-round" style="font-size:14px;">hourglass_empty</span>
                                Não registrado
                            </span>
                        `}
                    </td>
                    <td>
                        <span class="driver-table-date ${isToday ? 'date-today' : 'date-past'}">
                            ${dateStr}
                        </span>
                    </td>
                    <td>
                        ${isVacation ? `
                            <span class="origin-badge origin-vacation" title="${r.origin}">
                                <span class="material-icons-round">beach_access</span>
                                ${r.origin}
                            </span>
                        ` : isToday ? `
                            <span class="origin-badge origin-today">
                                <span class="material-icons-round">check_circle</span>
                                Hoje
                            </span>
                        ` : r.date ? `
                            <span class="origin-badge origin-past" title="Último registro em ${dateStr}">
                                <span class="material-icons-round">history</span>
                                ${r.origin}
                            </span>
                        ` : `
                            <span class="origin-badge origin-pending">
                                <span class="material-icons-round">pending</span>
                                Pendente
                            </span>
                        `}
                    </td>
                    <td>
                        <div class="driver-table-actions">
                            ${isVacation ? `
                                <span class="badge-vacation-auto" title="Férias programadas com preenchimento diário automático">
                                    <span class="material-icons-round" style="font-size:14px;">auto_awesome</span>
                                    <span>Férias Ativas</span>
                                </span>
                                <button class="driver-quick-action-btn btn-edit-today" data-driver="${r.driver}" title="Ajustar ou cadastrar novo período">
                                    <span class="material-icons-round">edit_calendar</span>
                                    <span>Alterar</span>
                                </button>
                                <button class="driver-delete-btn" data-driver="${r.driver}" data-date="${r.date}" title="Encerrar / remover período de férias">
                                    <span class="material-icons-round">delete_outline</span>
                                </button>
                            ` : `
                                <button class="driver-quick-action-btn ${isToday ? 'btn-edit-today' : 'btn-register-today'}" data-driver="${r.driver}" title="${isToday ? 'Alterar registro de hoje' : 'Registrar para hoje'}">
                                    <span class="material-icons-round">${isToday ? 'edit' : 'add_task'}</span>
                                    <span>${isToday ? 'Editar' : 'Registrar Hoje'}</span>
                                </button>
                                ${isToday ? `
                                    <button class="driver-delete-btn" data-driver="${r.driver}" data-date="${r.date}" title="Remover registro de hoje">
                                        <span class="material-icons-round">delete_outline</span>
                                    </button>
                                ` : ''}
                            `}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    // ─── INDIVIDUAL COLLABORATOR PROFILE & CALENDAR ──
    function renderDriverProfile() {
        if (!selectedDriver) return;

        // Header info
        const nameEl = document.getElementById('driverBannerName');
        const avatarEl = document.getElementById('driverBannerAvatar');
        const monthLabel = document.getElementById('calCurrentMonthLabel');

        if (nameEl) nameEl.textContent = selectedDriver;
        if (avatarEl) {
            avatarEl.textContent = getInitials(selectedDriver);
            avatarEl.style.background = getAvatarColor(selectedDriver);
        }

        const [yStr, mStr] = selectedCalendarMonth.split('-');
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        if (monthLabel) {
            monthLabel.textContent = `${monthNames[parseInt(mStr, 10) - 1]} ${yStr}`;
        }

        // Individual KPIs
        const kpiContainer = document.getElementById('driverIndividualKpis');
        if (kpiContainer) {
            const stats = getCollaboratorStats(selectedDriver, selectedCalendarMonth);
            kpiContainer.innerHTML = `
                <div class="individual-kpi-card card-presence">
                    <div class="ind-kpi-icon"><span class="material-icons-round">speed</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.pctPresenca}%</span>
                        <span class="ind-kpi-label">Índice de Presença</span>
                    </div>
                </div>
                <div class="individual-kpi-card card-ativo">
                    <div class="ind-kpi-icon"><span class="material-icons-round">check_circle</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.counts.ativo}</span>
                        <span class="ind-kpi-label">Dias Ativo</span>
                    </div>
                </div>
                <div class="individual-kpi-card card-banco">
                    <div class="ind-kpi-icon"><span class="material-icons-round">schedule</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.counts.banco_horas}</span>
                        <span class="ind-kpi-label">Banco de Horas</span>
                    </div>
                </div>
                <div class="individual-kpi-card card-falta">
                    <div class="ind-kpi-icon"><span class="material-icons-round">cancel</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.counts.falta}</span>
                        <span class="ind-kpi-label">Faltas</span>
                    </div>
                </div>
                <div class="individual-kpi-card card-atestado">
                    <div class="ind-kpi-icon"><span class="material-icons-round">medical_services</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.counts.atestado}</span>
                        <span class="ind-kpi-label">Atestados</span>
                    </div>
                </div>
                <div class="individual-kpi-card card-ferias">
                    <div class="ind-kpi-icon"><span class="material-icons-round">beach_access</span></div>
                    <div class="ind-kpi-content">
                        <span class="ind-kpi-value">${stats.counts.ferias}</span>
                        <span class="ind-kpi-label">Férias</span>
                    </div>
                </div>
            `;
        }

        // Calendar Grid
        renderCalendar(selectedDriver, selectedCalendarMonth);
    }

    function renderCalendar(driverName, monthKey) {
        const container = document.getElementById('driverCalendarContainer');
        if (!container) return;

        const data = loadActivities();
        const driverDays = data[driverName] || {};

        const [yStr, mStr] = monthKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10); // 1-12

        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const totalDays = lastDay.getDate();
        const startWeekday = firstDay.getDay(); // 0 = Dom, 1 = Seg ...
        const today = todayKey();

        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = '<div class="cal-grid">';

        // Weekday header
        weekdays.forEach(wd => {
            html += `<div class="cal-header-cell">${wd}</div>`;
        });

        // Blank days before month start
        for (let i = 0; i < startWeekday; i++) {
            html += '<div class="cal-day-cell cal-empty-cell"></div>';
        }

        // Days of month
        for (let day = 1; day <= totalDays; day++) {
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const statusKey = driverDays[dayKey];
            const isToday = dayKey === today;
            const statusMeta = statusKey ? STATUS_MAP[statusKey] : null;

            html += `
                <div class="cal-day-cell ${isToday ? 'cal-today' : ''} ${statusKey ? 'has-status' : ''}" data-date="${dayKey}" data-driver="${driverName}" title="${dayKey}: ${statusMeta ? statusMeta.label : 'Sem registro'}">
                    <div class="cal-day-header">
                        <span class="cal-day-number">${day}</span>
                        ${isToday ? '<span class="cal-today-tag">Hoje</span>' : ''}
                    </div>
                    <div class="cal-day-body">
                        ${statusMeta ? `
                            <div class="cal-status-pill status-${statusKey}" style="background: rgba(${statusMeta.colorRgb}, 0.14); color: ${statusMeta.color}; border: 1px solid rgba(${statusMeta.colorRgb}, 0.35);">
                                <span class="material-icons-round">${statusMeta.icon}</span>
                                <span class="cal-status-text">${statusMeta.label}</span>
                            </div>
                        ` : `
                            <span class="cal-no-record">-</span>
                        `}
                    </div>
                </div>
            `;
        }

        // Blank days after month end to complete last row of 7 days
        const totalRendered = startWeekday + totalDays;
        const remainder = totalRendered % 7;
        if (remainder !== 0) {
            const blankDaysAfter = 7 - remainder;
            for (let i = 0; i < blankDaysAfter; i++) {
                html += '<div class="cal-day-cell cal-empty-cell"></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // ─── EVENT LISTENERS ───────────────────────
    function bindEvents() {
        // Search in sidebar
        const searchInput = document.getElementById('driverSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                driverSearchTerm = e.target.value.trim();
                renderSidebarList();
            });
        }

        // Sidebar click delegation
        const navList = document.getElementById('driversNavList');
        if (navList) {
            navList.addEventListener('click', (e) => {
                const item = e.target.closest('.driver-nav-item');
                if (!item) return;
                const driver = item.dataset.driver;
                selectedDriver = driver || null;
                render();
            });
        }

        // Back button from profile to overview
        const backBtn = document.getElementById('btnBackToOverview');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                selectedDriver = null;
                render();
            });
        }

        // Calendar month stepper
        const prevMonthBtn = document.getElementById('btnCalPrevMonth');
        const nextMonthBtn = document.getElementById('btnCalNextMonth');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                stepCalendarMonth(-1);
            });
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                stepCalendarMonth(1);
            });
        }

        // Month filter in header
        const select = document.getElementById('driversMonthSelect');
        if (select) {
            select.addEventListener('change', (e) => {
                currentFilter = e.target.value || null;
                render();
            });
        }

        // Status select -> show/hide vacation fields
        const statusSelect = document.getElementById('driverStatusSelect');
        const vacationFields = document.getElementById('driverVacationFields');
        const singleDateField = document.getElementById('driverSingleDateField');
        const dateInput = document.getElementById('driverDateInput');
        const vacStartInput = document.getElementById('driverVacStartInput');
        const vacEndInput = document.getElementById('driverVacEndInput');

        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                const isVacation = statusSelect.value === 'ferias';
                if (vacationFields) vacationFields.style.display = isVacation ? 'flex' : 'none';
                if (singleDateField) singleDateField.style.display = isVacation ? 'none' : 'block';

                // Toggling required avoids HTML5 invalid form control validation error on hidden input
                if (dateInput) dateInput.required = !isVacation;
                if (vacStartInput) {
                    vacStartInput.required = isVacation;
                    if (isVacation && !vacStartInput.value) vacStartInput.value = todayKey();
                }
                if (vacEndInput) {
                    vacEndInput.required = isVacation;
                    if (isVacation && !vacEndInput.value && vacStartInput?.value) {
                        const d = parseDate(vacStartInput.value);
                        d.setDate(d.getDate() + 15);
                        vacEndInput.value = formatDateKey(d);
                    }
                }
            });
        }

        // Form submit
        const form = document.getElementById('driverActivityForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleFormSubmit();
            });
        }

        // Table clicks: Quick action, View driver, Delete
        const tbody = document.getElementById('driversTableBody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                // Click on user name/avatar to open profile
                const userCell = e.target.closest('[data-open-driver]');
                if (userCell) {
                    selectedDriver = userCell.dataset.openDriver;
                    render();
                    return;
                }

                // Quick register / edit today / adjust vacation button
                const quickBtn = e.target.closest('.driver-quick-action-btn');
                if (quickBtn) {
                    const driver = quickBtn.dataset.driver;
                    const driverSelect = document.getElementById('driverNameSelect');
                    const dateInput = document.getElementById('driverDateInput');
                    const statusSelect = document.getElementById('driverStatusSelect');
                    const vacationFields = document.getElementById('driverVacationFields');
                    const singleDateField = document.getElementById('driverSingleDateField');
                    const vacStartInput = document.getElementById('driverVacStartInput');
                    const vacEndInput = document.getElementById('driverVacEndInput');

                    if (driverSelect) driverSelect.value = driver;

                    const activeVac = getActiveVacationForDate(driver, todayKey());
                    if (activeVac && statusSelect) {
                        statusSelect.value = 'ferias';
                        if (vacationFields) vacationFields.style.display = 'flex';
                        if (singleDateField) singleDateField.style.display = 'none';
                        if (dateInput) dateInput.required = false;
                        if (vacStartInput) {
                            vacStartInput.required = true;
                            vacStartInput.value = activeVac.start;
                        }
                        if (vacEndInput) {
                            vacEndInput.required = true;
                            vacEndInput.value = activeVac.end;
                        }
                    } else {
                        if (dateInput) {
                            dateInput.value = todayKey();
                            dateInput.required = true;
                        }
                        if (vacationFields) vacationFields.style.display = 'none';
                        if (singleDateField) singleDateField.style.display = 'block';
                        if (vacStartInput) {
                            vacStartInput.required = false;
                            vacStartInput.value = '';
                        }
                        if (vacEndInput) {
                            vacEndInput.required = false;
                            vacEndInput.value = '';
                        }
                    }

                    if (statusSelect) {
                        statusSelect.focus();
                        statusSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }

                // Delete button
                const delBtn = e.target.closest('.driver-delete-btn');
                if (delBtn) {
                    const driver = delBtn.dataset.driver;
                    const date = delBtn.dataset.date;
                    const activeVac = getActiveVacationForDate(driver, date || todayKey());
                    const msg = activeVac 
                        ? `Encerrar / remover férias de ${driver} (período de ${formatDateDisplay(activeVac.start)} a ${formatDateDisplay(activeVac.end)})?`
                        : `Remover registro de ${driver} em ${formatDateDisplay(date)}?`;

                    if (confirm(msg)) {
                        deleteActivity(driver, date);
                        render();
                        showToast(activeVac ? 'Férias encerradas/removidas' : 'Registro removido');
                    }
                }
            });
        }

        // Calendar cell click: quick prompt to edit status of that day
        const calContainer = document.getElementById('driverCalendarContainer');
        if (calContainer) {
            calContainer.addEventListener('click', (e) => {
                const cell = e.target.closest('.cal-day-cell:not(.cal-empty-cell)');
                if (!cell) return;
                const date = cell.dataset.date;
                const driver = cell.dataset.driver;
                if (!date || !driver) return;

                const data = loadActivities();
                const currentStatus = data[driver]?.[date];
                const currentLabel = currentStatus ? STATUS_MAP[currentStatus]?.label : 'Nenhum';

                const promptMsg = `Alterar status de ${driver} em ${formatDateDisplay(date)} (atual: ${currentLabel}):\n` +
                                  `Digite o número correspondente:\n` +
                                  `1 - Ativo\n2 - Banco de Horas\n3 - Falta\n4 - Atestado\n5 - Férias (Período Automático)\n0 - Remover registro`;

                const choice = prompt(promptMsg);
                if (choice === null) return;

                const mapChoice = {
                    '1': 'ativo',
                    '2': 'banco_horas',
                    '3': 'falta',
                    '4': 'atestado',
                    '5': 'ferias'
                };

                if (choice === '0') {
                    deleteActivity(driver, date);
                    render();
                    showToast('Registro removido do dia');
                } else if (choice === '5') {
                    const endPrompt = prompt(`Início das férias: ${formatDateDisplay(date)}\nInforme a data final no formato AAAA-MM-DD ou DD/MM/AAAA (ex: ${date}):`, date);
                    if (endPrompt === null) return;
                    let endIso = endPrompt.trim() || date;
                    if (endIso.includes('/')) {
                        const parts = endIso.split('/');
                        if (parts.length === 3) {
                            endIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    }
                    if (endIso < date) {
                        showToast('Data final não pode ser anterior à data inicial', 'warning');
                        return;
                    }
                    registerVacation(driver, date, endIso);
                    render();
                    const startD = parseDate(date);
                    const endD = parseDate(endIso);
                    const diffDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
                    showToast(`Férias de ${diffDays} dia(s) salvas para ${driver} até ${formatDateDisplay(endIso)}`);
                } else if (mapChoice[choice]) {
                    registerActivity(driver, mapChoice[choice], date);
                    render();
                    showToast(`Status "${STATUS_MAP[mapChoice[choice]].label}" salvo para ${formatDateDisplay(date)}`);
                } else if (choice.trim() !== '') {
                    showToast('Opção inválida', 'warning');
                }
            });
        }
    }

    function stepCalendarMonth(delta) {
        const [yStr, mStr] = selectedCalendarMonth.split('-');
        let year = parseInt(yStr, 10);
        let month = parseInt(mStr, 10) + delta;

        if (month < 1) {
            month = 12;
            year--;
        } else if (month > 12) {
            month = 1;
            year++;
        }

        selectedCalendarMonth = `${year}-${String(month).padStart(2, '0')}`;
        renderDriverProfile();
    }

    function handleFormSubmit() {
        const driverSelect = document.getElementById('driverNameSelect');
        const statusSelect = document.getElementById('driverStatusSelect');
        const dateInput = document.getElementById('driverDateInput');
        const vacStartInput = document.getElementById('driverVacStartInput');
        const vacEndInput = document.getElementById('driverVacEndInput');

        const driver = driverSelect?.value;
        const status = statusSelect?.value;

        if (!driver || !status) {
            showToast('Preencha colaborador e status', 'warning');
            return;
        }

        if (status === 'ferias') {
            const start = vacStartInput?.value;
            const end = vacEndInput?.value;
            if (!start || !end) {
                showToast('Informe data início e fim das férias', 'warning');
                return;
            }
            if (start > end) {
                showToast('Data início deve ser anterior à data fim', 'warning');
                return;
            }
            registerVacation(driver, start, end);

            const startD = parseDate(start);
            const endD = parseDate(end);
            const diffDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
            showToast(`Férias de ${diffDays} dias registradas e preenchidas automaticamente para ${driver}`);
        } else {
            const dateVal = dateInput?.value;
            if (!dateVal) {
                showToast('Informe a data', 'warning');
                return;
            }
            registerActivity(driver, status, dateVal);
            showToast(`Status "${STATUS_MAP[status].label}" registrado para ${driver}`);
        }

        // Reset form
        if (statusSelect) statusSelect.value = 'ativo';
        if (dateInput) {
            dateInput.value = todayKey();
            dateInput.required = true;
        }
        if (vacStartInput) {
            vacStartInput.value = '';
            vacStartInput.required = false;
        }
        if (vacEndInput) {
            vacEndInput.value = '';
            vacEndInput.required = false;
        }
        const vacationFields = document.getElementById('driverVacationFields');
        const singleDateField = document.getElementById('driverSingleDateField');
        if (vacationFields) vacationFields.style.display = 'none';
        if (singleDateField) singleDateField.style.display = 'block';

        render();
    }

    function showToast(message, type = 'success') {
        const existing = document.querySelector('.driver-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `driver-toast driver-toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons-round">${type === 'success' ? 'check_circle' : 'warning'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ─── PUBLIC API ────────────────────────────
    return {
        init,
        render,
        KNOWN_DRIVERS,
        STATUS_MAP
    };

})();
