/* ============================================
   Vehicle Report Module — Painel Checklist Frota
   Gera relatório executivo de 1 página A4 com
   destaque para não conformidades, gráfico vetorial
   e opções de impressão e download em PDF.
   ============================================ */

const VehicleReportModule = (function () {
    'use strict';

    let currentMeta = {
        plate: '',
        model: '',
        periodTitle: '',
        periodSlug: ''
    };

    const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    /**
     * Formata data ISO (YYYY-MM-DD) para DD/MM/AAAA
     */
    function formatDisplayDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    /**
     * Cria SVG Donut Chart vetorial de alta definição para impressão/PDF
     */
    function createVectorDonutSVG(pct, okCount, nokCount) {
        const radius = 34;
        const circumference = 2 * Math.PI * radius; // ~213.6
        const total = okCount + nokCount;
        const safePct = total > 0 ? Math.round((okCount / total) * 100) : 100;
        
        const okDash = total > 0 ? (safePct / 100) * circumference : circumference;
        const nokDash = circumference - okDash;
        const strokeColor = safePct >= 90 ? '#10b981' : (safePct >= 75 ? '#f59e0b' : '#ef4444');

        return `
            <svg class="report-donut-svg" viewBox="0 0 90 90" width="82" height="82" aria-hidden="true">
                <!-- Track de fundo -->
                <circle cx="45" cy="45" r="${radius}" 
                    fill="none" stroke="#e2e8f0" stroke-width="9" />
                <!-- Segmento NOK (vermelho de fundo se houver falhas) -->
                ${nokCount > 0 ? `
                    <circle cx="45" cy="45" r="${radius}" 
                        fill="none" stroke="#ef4444" stroke-width="9"
                        stroke-dasharray="${circumference}" 
                        stroke-dashoffset="0"
                        transform="rotate(-90 45 45)" />
                ` : ''}
                <!-- Segmento OK (verde principal) -->
                <circle cx="45" cy="45" r="${radius}" 
                    fill="none" stroke="${strokeColor}" stroke-width="9"
                    stroke-dasharray="${okDash} ${circumference}" 
                    stroke-dashoffset="0"
                    stroke-linecap="round"
                    transform="rotate(-90 45 45)" />
                <!-- Texto Central -->
                <text x="45" y="42" text-anchor="middle" font-family="'Montserrat', sans-serif" font-weight="800" font-size="16" fill="#0f172a">
                    ${safePct}%
                </text>
                <text x="45" y="55" text-anchor="middle" font-family="'Montserrat', sans-serif" font-weight="600" font-size="8" fill="#64748b" letter-spacing="0.5">
                    CONFORME
                </text>
            </svg>
        `;
    }

    /**
     * Coleta os dados do estado atual da aplicação
     */
    function gatherReportData() {
        const vehicle = VEHICLES[state.activeVehicle] || { plate: '—', model: '—' };
        const plate = vehicle.plate;
        const vehicleData = state.data[plate] || { days: {} };

        // Mês ativo do calendário
        const calMonth = calendar ? calendar.getMonth() : { year: new Date().getFullYear(), month: new Date().getMonth() };
        const monthKey = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}`;
        const monthLabel = `${MONTH_NAMES[calMonth.month]} ${calMonth.year}`;

        // Dias filtrados do mês
        const monthDays = {};
        Object.entries(vehicleData.days || {}).forEach(([d, dData]) => {
            if (d.startsWith(monthKey)) {
                monthDays[d] = dData;
            }
        });

        const selectedDate = state.selectedDate;
        const isSingleDay = Boolean(selectedDate && monthDays[selectedDate]);

        return {
            vehicle,
            plate,
            calMonth,
            monthKey,
            monthLabel,
            monthDays,
            selectedDate,
            isSingleDay,
            dayData: isSingleDay ? monthDays[selectedDate] : null
        };
    }

    /**
     * Gera o HTML completo do relatório de 1 página
     */
    function buildReportHTML(ctx) {
        const { vehicle, plate, monthLabel, monthDays, selectedDate, isSingleDay, dayData } = ctx;
        const now = new Date();
        const emissionTimestamp = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        let okCount = 0;
        let nokCount = 0;
        let periodHeader = '';
        let operatorsHeader = '';
        let kmDisplay = '—';
        let nokItems = [];
        let questionsStats = {};
        let observations = [];

        // Inicializa estatísticas das 29 perguntas
        QUESTIONS.forEach(q => {
            questionsStats[q] = { ok: 0, nok: 0, total: 0, datesNok: [], comments: [] };
        });

        if (isSingleDay) {
            // === MODO DIA ESPECÍFICO ===
            const formattedDate = formatDisplayDate(selectedDate);
            periodHeader = `Dia: <strong>${formattedDate}</strong>`;
            currentMeta.periodTitle = `Dia ${formattedDate}`;
            currentMeta.periodSlug = `${selectedDate}`;

            // Responsável
            const driver = (dayData.driver || 'Não informado').trim();
            const helper = (dayData.helper && dayData.helper !== 'Sem Ajudante' && dayData.helper !== '-') ? dayData.helper.trim() : null;
            operatorsHeader = helper ? `<strong>${driver}</strong> (Ajudante: ${helper})` : `<strong>${driver}</strong>`;

            // Quilometragem
            kmDisplay = `${(dayData.km || 0).toLocaleString('pt-BR')} km`;

            // Avaliação das perguntas no dia
            Object.entries(dayData.questions || {}).forEach(([q, val]) => {
                if (val === 'OK') {
                    okCount++;
                    if (questionsStats[q]) questionsStats[q].ok++;
                } else if (val === 'NOK') {
                    nokCount++;
                    if (questionsStats[q]) {
                        questionsStats[q].nok++;
                        questionsStats[q].datesNok.push(formattedDate);
                    }
                    nokItems.push({
                        question: q,
                        frequency: 1,
                        date: formattedDate,
                        comment: dayData.comment || 'Não especificado'
                    });
                }
            });

            if (dayData.comment && dayData.comment.trim().length > 1) {
                observations.push({
                    date: formattedDate,
                    driver: driver,
                    text: dayData.comment
                });
            }

        } else {
            // === MODO COMPILADO DO MÊS ===
            const sortedDates = Object.keys(monthDays).sort();
            const totalInspections = sortedDates.length;
            periodHeader = `Mês: <strong>${monthLabel}</strong> (Compilado · ${totalInspections} ${totalInspections === 1 ? 'vistoria' : 'vistorias'})`;
            currentMeta.periodTitle = `${monthLabel} (Compilado)`;
            currentMeta.periodSlug = `${ctx.monthKey}_compilado`;

            // Contagem de preenchimento por motorista no mês
            const driverCounts = {};
            sortedDates.forEach(d => {
                const drv = monthDays[d].driver;
                if (drv && drv.toLowerCase() !== 'não informado' && drv !== '—') {
                    const trimmed = drv.trim();
                    driverCounts[trimmed] = (driverCounts[trimmed] || 0) + 1;
                }
            });

            const driversList = Object.entries(driverCounts)
                .sort((a, b) => b[1] - a[1]); // Mais frequentes primeiro

            if (driversList.length === 0) {
                operatorsHeader = 'Não informado';
            } else {
                operatorsHeader = driversList
                    .map(([drv, count]) => `<strong>${drv}</strong> ${count}x`)
                    .join(', ');
            }

            // KM acumulado no mês
            if (sortedDates.length > 0) {
                const kmValues = sortedDates.map(d => monthDays[d].km).filter(k => k > 0);
                if (kmValues.length > 1) {
                    const diff = kmValues[kmValues.length - 1] - kmValues[0];
                    kmDisplay = `${diff.toLocaleString('pt-BR')} km no mês (Final: ${kmValues[kmValues.length - 1].toLocaleString('pt-BR')} km)`;
                } else if (kmValues.length === 1) {
                    kmDisplay = `${kmValues[0].toLocaleString('pt-BR')} km (1 leitura)`;
                }
            }

            // Agregação das perguntas
            sortedDates.forEach(d => {
                const dData = monthDays[d];
                const dFormatted = formatDisplayDate(d);

                Object.entries(dData.questions || {}).forEach(([q, val]) => {
                    if (val === 'OK') {
                        okCount++;
                        if (questionsStats[q]) questionsStats[q].ok++;
                    } else if (val === 'NOK') {
                        nokCount++;
                        if (questionsStats[q]) {
                            questionsStats[q].nok++;
                            questionsStats[q].datesNok.push(dFormatted);
                            if (dData.comment && !questionsStats[q].comments.includes(dData.comment)) {
                                questionsStats[q].comments.push(dData.comment);
                            }
                        }
                    }
                });

                if (dData.comment && dData.comment.trim().length > 1) {
                    observations.push({
                        date: dFormatted,
                        driver: dData.driver || 'Motorista',
                        text: dData.comment
                    });
                }
            });

            // Constrói lista consolidada de NOKs
            QUESTIONS.forEach(q => {
                if (questionsStats[q].nok > 0) {
                    nokItems.push({
                        question: q,
                        frequency: questionsStats[q].nok,
                        date: questionsStats[q].datesNok.join(', '),
                        comment: questionsStats[q].comments.length > 0 
                            ? questionsStats[q].comments.join(' | ') 
                            : 'Registrado sem observação textual'
                    });
                }
            });

            // Ordena NOKs por frequência decrescente
            nokItems.sort((a, b) => b.frequency - a.frequency);
        }

        const totalItemsChecked = okCount + nokCount;
        const conformityPct = totalItemsChecked > 0 ? Math.round((okCount / totalItemsChecked) * 100) : 100;
        const donutSvg = createVectorDonutSVG(conformityPct, okCount, nokCount);

        currentMeta.plate = plate;
        currentMeta.model = vehicle.model;

        // Renderização da Matriz dos 29 Itens (3 Colunas compactas)
        const colSize = Math.ceil(QUESTIONS.length / 3);
        const col1 = QUESTIONS.slice(0, colSize);
        const col2 = QUESTIONS.slice(colSize, colSize * 2);
        const col3 = QUESTIONS.slice(colSize * 2);

        function renderQuestionColumn(qList) {
            return qList.map(q => {
                const s = questionsStats[q];
                const isNok = s.nok > 0;
                let statusBadge = '';

                if (isSingleDay) {
                    statusBadge = isNok 
                        ? `<span class="report-badge-nok">NOK</span>` 
                        : `<span class="report-badge-ok">OK</span>`;
                } else {
                    if (s.nok === 0) {
                        statusBadge = `<span class="report-badge-ok">${s.ok} OK</span>`;
                    } else if (s.ok === 0) {
                        statusBadge = `<span class="report-badge-nok">${s.nok} NOK</span>`;
                    } else {
                        statusBadge = `<span class="report-badge-mixed"><span class="txt-ok">${s.ok}</span>/<span class="txt-nok">${s.nok}</span></span>`;
                    }
                }

                return `
                    <div class="report-matrix-row ${isNok ? 'row-has-nok' : ''}">
                        <span class="report-matrix-qname" title="${q}">${q}</span>
                        ${statusBadge}
                    </div>
                `;
            }).join('');
        }

        // Alertas de Reincidência do veículo (se houver no state)
        let recurrenceBadge = '';
        if (typeof computeRecurrences === 'function') {
            const vehicleDays = (state.data[plate] && state.data[plate].days) || {};
            const recurrences = computeRecurrences(vehicleDays);
            if (recurrences && recurrences.length > 0) {
                const topRec = recurrences[0];
                recurrenceBadge = `
                    <div class="report-recurrence-pill">
                        <span class="material-icons-round">warning</span>
                        <span>Reincidência detectada: <strong>${topRec.count}x relatos similares</strong> (${topRec.dates.length} vistorias)</span>
                    </div>
                `;
            }
        }

        return `
            <div class="report-sheet">
                <!-- 1. CABEÇALHO EXECUTIVO -->
                <header class="report-header">
                    <div class="report-brand">
                        <div class="report-logo-text">CAR . VERIFY</div>
                        <div class="report-brand-sub">Sistema de Gestão & Conformidade de Frota</div>
                    </div>
                    <div class="report-header-center">
                        <h1 class="report-main-title">RELATÓRIO DE CONFORMIDADE VEICULAR</h1>
                        <div class="report-emission-tag">Emitido em: ${emissionTimestamp}</div>
                    </div>
                    <div class="report-client-logo">
                        <img src="assets/logo-grupo-efx.png" alt="Grupo EFX" class="report-efx-img">
                    </div>
                </header>

                <!-- 2. QUADRO DE IDENTIFICAÇÃO E PARÂMETROS -->
                <section class="report-meta-grid">
                    <div class="report-meta-item">
                        <span class="report-meta-label">VEÍCULO / MODELO</span>
                        <span class="report-meta-val"><strong class="highlight-plate">${plate}</strong> — ${vehicle.model}</span>
                    </div>
                    <div class="report-meta-item">
                        <span class="report-meta-label">PERÍODO / FILTRO</span>
                        <span class="report-meta-val">${periodHeader}</span>
                    </div>
                    <div class="report-meta-item">
                        <span class="report-meta-label">RESPONSÁVEL(IS) PELO PREENCHIMENTO</span>
                        <span class="report-meta-val">${operatorsHeader}</span>
                    </div>
                    <div class="report-meta-item">
                        <span class="report-meta-label">QUILOMETRAGEM (ODÔMETRO)</span>
                        <span class="report-meta-val">${kmDisplay}</span>
                    </div>
                </section>

                <!-- 3. RESUMO EXECUTIVO E GRÁFICO DONUT -->
                <section class="report-summary-bar">
                    <div class="report-donut-container">
                        ${donutSvg}
                    </div>
                    <div class="report-kpi-blocks">
                        <div class="report-kpi-block kpi-conformity">
                            <span class="kpi-num">${conformityPct}%</span>
                            <span class="kpi-desc">Conformidade Geral</span>
                        </div>
                        <div class="report-kpi-block kpi-ok">
                            <span class="kpi-num">${okCount}</span>
                            <span class="kpi-desc">Itens Conformes</span>
                        </div>
                        <div class="report-kpi-block kpi-nok ${nokCount > 0 ? 'alert' : ''}">
                            <span class="kpi-num">${nokCount}</span>
                            <span class="kpi-desc">Não Conformidades</span>
                        </div>
                        <div class="report-kpi-block kpi-total">
                            <span class="kpi-num">${totalItemsChecked}</span>
                            <span class="kpi-desc">Total de Verificações</span>
                        </div>
                    </div>
                    <div class="report-status-seal ${nokCount > 0 ? 'seal-warning' : 'seal-success'}">
                        <span class="material-icons-round seal-icon">${nokCount > 0 ? 'notification_important' : 'verified'}</span>
                        <div class="seal-text">
                            <strong>${nokCount > 0 ? 'REQUER ATENÇÃO' : 'APROVADO'}</strong>
                            <span>${nokCount > 0 ? `${nokCount} item(ns) reprovado(s)` : '100% dos itens conformes'}</span>
                        </div>
                    </div>
                </section>

                <!-- 4. DESTAQUE PRINCIPAL: NÃO CONFORMIDADES REGISTRADAS -->
                <section class="report-section report-nok-section">
                    <div class="report-section-header ${nokCount > 0 ? 'header-nok-alert' : 'header-nok-ok'}">
                        <div class="report-section-title">
                            <span class="material-icons-round">${nokCount > 0 ? 'error_outline' : 'check_circle'}</span>
                            <span>NÃO CONFORMIDADES REGISTRADAS (${nokCount})</span>
                        </div>
                        <span class="report-section-badge">${nokCount > 0 ? 'Prioridade de Manutenção' : 'Tudo Conforme'}</span>
                    </div>

                    ${nokCount > 0 ? `
                        <div class="report-nok-table-wrapper">
                            <table class="report-nok-table">
                                <thead>
                                    <tr>
                                        <th style="width: 32%;">Item Reprovado</th>
                                        <th style="width: 14%;">Status</th>
                                        <th style="width: 18%;">Ocorrência(s)</th>
                                        <th style="width: 36%;">Observações Apontadas em Vistoria</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${nokItems.map(item => `
                                        <tr>
                                            <td class="col-nok-name"><strong>${item.question}</strong></td>
                                            <td><span class="report-badge-nok">REPROVADO</span></td>
                                            <td class="col-nok-dates">${isSingleDay ? item.date : `<strong>${item.frequency}x</strong> (${item.date})`}</td>
                                            <td class="col-nok-comment">${item.comment}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="report-clean-state">
                            <span class="material-icons-round">verified</span>
                            <span>Excelente! Nenhuma não conformidade detectada para este veículo no período selecionado. Todos os 29 itens do checklist foram aprovados.</span>
                        </div>
                    `}
                </section>

                <!-- 5. MATRIZ COMPLETA DOS 29 ITENS INSPECIONADOS (3 COLUNAS) -->
                <section class="report-section report-matrix-section">
                    <div class="report-section-header">
                        <div class="report-section-title">
                            <span class="material-icons-round">fact_check</span>
                            <span>INSPEÇÃO GERAL DOS 29 ITENS DO CHECKLIST</span>
                        </div>
                        <span class="report-matrix-summary">29 perguntas normativas inspecionadas</span>
                    </div>
                    <div class="report-matrix-columns">
                        <div class="report-matrix-col">${renderQuestionColumn(col1)}</div>
                        <div class="report-matrix-col">${renderQuestionColumn(col2)}</div>
                        <div class="report-matrix-col">${renderQuestionColumn(col3)}</div>
                    </div>
                </section>

                <!-- 6. OBSERVAÇÕES E NOTAS DOS OPERADORES -->
                ${observations.length > 0 || recurrenceBadge ? `
                    <section class="report-section report-comments-section">
                        <div class="report-section-header">
                            <div class="report-section-title">
                                <span class="material-icons-round">speaker_notes</span>
                                <span>NOTAS DE CAMPO & OBSERVAÇÕES</span>
                            </div>
                            ${recurrenceBadge}
                        </div>
                        <div class="report-comments-box">
                            ${observations.slice(0, 3).map(c => `
                                <div class="report-comment-entry">
                                    <span class="comment-author-badge">${c.date} · ${c.driver}:</span>
                                    <span class="comment-content">"${c.text}"</span>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                ` : ''}

                <!-- 7. RODAPÉ E TERMO DE CIÊNCIA / ASSINATURAS -->
                <footer class="report-footer">
                    <div class="report-signatures">
                        <div class="report-sig-field">
                            <div class="sig-line"></div>
                            <span class="sig-label">Condutor / Responsável pela Vistoria</span>
                        </div>
                        <div class="report-sig-field">
                            <div class="sig-line"></div>
                            <span class="sig-label">Gestão de Frotas / Manutenção EFX</span>
                        </div>
                    </div>
                    <div class="report-footer-sub">
                        <span>Car Verify v1.0 · Grupo EFX · Documento operacional com validade para auditoria interna de frota.</span>
                        <span class="report-page-count">Página 1 de 1</span>
                    </div>
                </footer>
            </div>
        `;
    }

    /**
     * Abre o modal com o relatório gerado
     */
    function openModal() {
        const backdrop = document.getElementById('vehicleReportModalBackdrop');
        const container = document.getElementById('printableVehicleReport');
        const subtitle = document.getElementById('vehicleReportSubtitle');
        const titleEl = document.getElementById('vehicleReportModalTitle');
        if (!backdrop || !container) return;

        const ctx = gatherReportData();
        const html = buildReportHTML(ctx);
        container.innerHTML = html;

        if (titleEl) {
            titleEl.textContent = `Relatório de Conformidade — ${ctx.plate}`;
        }
        if (subtitle) {
            subtitle.textContent = `Documento executivo de 1 página · ${currentMeta.periodTitle}`;
        }

        backdrop.style.display = 'flex';
        document.body.classList.add('report-modal-open');
    }

    /**
     * Fecha o modal
     */
    function closeModal() {
        const backdrop = document.getElementById('vehicleReportModalBackdrop');
        if (backdrop) backdrop.style.display = 'none';
        document.body.classList.remove('report-modal-open');
    }

    /**
     * Dispara a impressão otimizada de 1 página A4
     */
    function printReport() {
        window.print();
    }

    /**
     * Baixa o relatório em PDF (via html2pdf com fallback para window.print)
     */
    function downloadPDF() {
        const element = document.getElementById('printableVehicleReport');
        if (!element) return;

        const filename = `Relatorio_${currentMeta.plate || 'Veiculo'}_${currentMeta.periodSlug || 'Frota'}.pdf`;

        if (window.html2pdf) {
            const btnDownload = document.getElementById('btnReportDownload');
            const originalHtml = btnDownload ? btnDownload.innerHTML : '';
            if (btnDownload) {
                btnDownload.innerHTML = `<span class="material-icons-round" style="animation: spin 1s infinite linear;">sync</span> <span>Gerando PDF...</span>`;
                btnDownload.disabled = true;
            }

            const opt = {
                margin:       [6, 6, 6, 6],
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            window.html2pdf().set(opt).from(element).save()
                .then(() => {
                    if (btnDownload) {
                        btnDownload.innerHTML = originalHtml;
                        btnDownload.disabled = false;
                    }
                })
                .catch((err) => {
                    console.warn('html2pdf falhou, recorrendo à impressão nativa:', err);
                    if (btnDownload) {
                        btnDownload.innerHTML = originalHtml;
                        btnDownload.disabled = false;
                    }
                    window.print();
                });
        } else {
            window.print();
        }
    }

    /**
     * Inicializa os listeners de eventos do modal
     */
    function init() {
        const btnOpen = document.getElementById('btnOpenVehicleReportModal');
        const btnClose = document.getElementById('btnCloseVehicleReportModal');
        const backdrop = document.getElementById('vehicleReportModalBackdrop');
        const btnPrint = document.getElementById('btnReportPrint');
        const btnDownload = document.getElementById('btnReportDownload');

        if (btnOpen) {
            btnOpen.addEventListener('click', openModal);
        }

        if (btnClose) {
            btnClose.addEventListener('click', closeModal);
        }

        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeModal();
            });
        }

        if (btnPrint) {
            btnPrint.addEventListener('click', printReport);
        }

        if (btnDownload) {
            btnDownload.addEventListener('click', downloadPDF);
        }

        // Tecla Esc fecha modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && backdrop && backdrop.style.display !== 'none') {
                closeModal();
            }
        });
    }

    return {
        init,
        openModal,
        closeModal,
        printReport,
        downloadPDF
    };
})();

// Exporta globalmente
window.VehicleReportModule = VehicleReportModule;
