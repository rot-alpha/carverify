/* ============================================
   PPTX Export Module — Painel Checklist Frota
   Generates executive widescreen 16:9 PowerPoint
   presentations using PptxGenJS.
   ============================================ */

const PPTX_THEMES = {
    dark: {
        id: 'dark',
        name: 'Modo Escuro',
        bg: '0B0F19',
        cardBg: '151D2A',
        cardBorder: '263345',
        headerBg: '101724',
        textPrimary: 'F1F5F9',
        textSecondary: '94A3B8',
        textMuted: '64748B',
        gold: 'F59E0B',
        goldLight: '292014',
        green: '34D399',
        greenLight: '132A22',
        amber: 'FBBF24',
        amberLight: '2D2412',
        red: 'F87171',
        redLight: '2E191B',
        barBg: '1E293B',
        divider: '1E293B'
    },
    light: {
        id: 'light',
        name: 'Modo Claro',
        bg: 'F4F6FA',
        cardBg: 'FFFFFF',
        cardBorder: 'E5E7EB',
        headerBg: 'FFFFFF',
        textPrimary: '111827',
        textSecondary: '4B5563',
        textMuted: '9CA3AF',
        gold: 'D97706',
        goldLight: 'FEF3C7',
        green: '10B981',
        greenLight: 'ECFDF5',
        amber: 'F59E0B',
        amberLight: 'FFFBEB',
        red: 'EF4444',
        redLight: 'FEF2F2',
        barBg: 'E5E7EB',
        divider: 'E5E7EB'
    }
};

const PPTX_MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Filter state data for a set of months or a date range
 * @param {Object} data - state.data
 * @param {string[]} monthsList - list of 'YYYY-MM' strings
 * @returns {Object} filtered aggregated statistics
 */
function aggregateDataForMonths(data, monthsList) {
    const monthsSet = new Set(monthsList);
    const vehicleStats = {}; // plate -> { days: {}, ok, nok, km, model }
    const dailyStats = {};   // date -> { ok, nok }
    const driverStats = {};  // driver -> count of days
    const operationalDates = new Set();
    const nokQuestionsCount = {}; // question -> count

    VEHICLES.forEach(v => {
        vehicleStats[v.plate] = {
            plate: v.plate,
            model: v.model,
            days: {},
            ok: 0,
            nok: 0,
            latestKm: 0,
            conformityPct: null
        };
    });

    Object.entries(data).forEach(([plate, vehicleData]) => {
        if (!vehicleStats[plate]) return;

        Object.entries(vehicleData.days || {}).forEach(([date, dayData]) => {
            const ym = date.substring(0, 7);
            if (!monthsSet.has(ym)) return;

            operationalDates.add(date);
            vehicleStats[plate].days[date] = dayData;

            if (!dailyStats[date]) dailyStats[date] = { ok: 0, nok: 0 };

            Object.entries(dayData.questions || {}).forEach(([q, val]) => {
                if (val === 'OK') {
                    vehicleStats[plate].ok++;
                    dailyStats[date].ok++;
                } else {
                    vehicleStats[plate].nok++;
                    dailyStats[date].nok++;
                    nokQuestionsCount[q] = (nokQuestionsCount[q] || 0) + 1;
                }
            });

            // Driver count (ignora ajudantes: Alan, Cristian, Wesley, Jailton, Luis Gustavo)
            if (dayData.driver) {
                const drv = dayData.driver.trim();
                const HELPERS = ['alan', 'cristian', 'wesley', 'jailton', 'luis gustavo'];
                const isH = HELPERS.some(h => drv.toLowerCase().startsWith(h));
                if (!isH && drv && drv.toLowerCase() !== 'não informado' && drv !== '—') {
                    driverStats[drv] = (driverStats[drv] || 0) + 1;
                }
            }
        });
    });

    // Compute vehicle conformity and latest km
    Object.values(vehicleStats).forEach(v => {
        const total = v.ok + v.nok;
        if (total > 0) {
            v.conformityPct = Math.round((v.ok / total) * 100);
        } else {
            v.conformityPct = null;
        }
        v.latestKm = computeLatestKm(v.days);
    });

    // Compute driver percentages relative to total operational days
    const totalOpDays = operationalDates.size || 1;
    const driverList = Object.entries(driverStats).map(([name, count]) => {
        const pct = Math.min(100, Math.round((count / totalOpDays) * 100));
        return { name, count, pct };
    }).sort((a, b) => b.count - a.count);

    // Total fleet conformity
    let totalOk = 0, totalNok = 0;
    Object.values(vehicleStats).forEach(v => {
        totalOk += v.ok;
        totalNok += v.nok;
    });
    const fleetTotal = totalOk + totalNok;
    const fleetConformity = fleetTotal > 0 ? Math.round((totalOk / fleetTotal) * 100) : 0;

    return {
        vehicleStats,
        dailyStats,
        driverList,
        totalOpDays,
        fleetConformity,
        fleetTotal,
        totalOk,
        totalNok,
        nokQuestionsCount
    };
}

/**
 * Generates an automated synthesized 3-line executive AI analysis
 * Formatted cleanly to fit on a single line each without wrapping or repeating.
 */
function generateExecutiveAnalysis(stats, periodTitle) {
    const { vehicleStats, fleetConformity, fleetTotal, driverList, nokQuestionsCount } = stats;

    if (fleetTotal === 0) {
        return [
            `• Conformidade Geral: Sem checklists registrados no período de ${periodTitle}.`,
            `• Pontos de Atenção: Nenhum apontamento mecânico identificado no ciclo.`,
            `• Engajamento e Ações: Incentivar condutores na regularidade dos checklists diários.`
        ];
    }

    const vehicles = Object.values(vehicleStats);
    const withData = vehicles.filter(v => v.conformityPct !== null);
    
    // Sort by conformity
    const criticalVehicles = [...withData].filter(v => v.conformityPct < 90).sort((a, b) => a.conformityPct - b.conformityPct);
    const attentionVehicles = [...withData].filter(v => v.conformityPct >= 90 && v.conformityPct < 95);
    const topVehicles = [...withData].filter(v => v.conformityPct >= 95).sort((a, b) => b.conformityPct - a.conformityPct);

    // Top NOK questions
    const topNokList = Object.entries(nokQuestionsCount).sort((a, b) => b[1] - a[1]);
    const topNokIssues = topNokList.slice(0, 2).map(([q]) => q.toLowerCase()).join(', ');

    // 1. Linha 1: Conformidade Geral & Destaques Positivos (Curta e direta)
    let line1 = '';
    const topNames = topVehicles.slice(0, 2).map(v => `${v.plate} (${v.conformityPct}%)`).join(', ');
    if (fleetConformity >= 95) {
        line1 = `• Conformidade Geral: Nível de excelência de ${fleetConformity}% em ${periodTitle}${topNames ? `; destaques: ${topNames}` : ''}.`;
    } else if (fleetConformity >= 90) {
        line1 = `• Conformidade Geral: Nível estável de ${fleetConformity}% em ${periodTitle}${topNames ? `; destaques: ${topNames}` : ''}.`;
    } else {
        line1 = `• Conformidade Geral: Índice de ${fleetConformity}% abaixo da meta (95%) em ${periodTitle}; requer alinhamento corretivo.`;
    }

    // 2. Linha 2: Pontos de Atenção & Manutenção Mecânica (Sem duplicidade)
    let line2 = '';
    if (criticalVehicles.length > 0) {
        const critNames = criticalVehicles.slice(0, 2).map(v => `${v.plate} (${v.conformityPct}%)`).join(', ');
        line2 = `• Pontos Críticos: Atenção em ${critNames}${topNokIssues ? ` (itens: ${topNokIssues})` : ''}.`;
    } else if (attentionVehicles.length > 0) {
        const attNames = attentionVehicles.slice(0, 2).map(v => `${v.plate} (${v.conformityPct}%)`).join(', ');
        line2 = `• Pontos de Atenção: Frotas ${attNames} em 90%-94%${topNokIssues ? ` (itens: ${topNokIssues})` : ''}.`;
    } else {
        line2 = `• Segurança Mecânica: 100% da frota operando com conformidade exemplar (acima de 95%).`;
    }

    // 3. Linha 3: Engajamento dos Condutores & Recomendações (Sintética)
    let line3 = '';
    const topDriver = driverList.length > 0 ? `${driverList[0].name} (${driverList[0].pct}%)` : '—';
    const avgEngage = driverList.length > 0
        ? Math.round(driverList.reduce((acc, d) => acc + d.pct, 0) / driverList.length)
        : 0;

    if (criticalVehicles.length > 0 || fleetConformity < 93) {
        line3 = `• Engajamento e Diretrizes: Média de ${avgEngage}% (líder: ${topDriver}); agendar revisões imediatas.`;
    } else if (fleetConformity >= 96 && avgEngage >= 60) {
        line3 = `• Engajamento e Diretrizes: Média de ${avgEngage}% (líder: ${topDriver}); manter rotinas preventivas da frota.`;
    } else {
        line3 = `• Engajamento e Diretrizes: Média de ${avgEngage}% (líder: ${topDriver}); reforçar preenchimento diário do checklist.`;
    }

    return [line1, line2, line3];
}

/**
 * Creates an ultra-clean, high-DPI offscreen Canvas image of the conformity line chart for PPTX
 */
function renderChartToDataUrl(dailyStats, theme) {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    const isDark = theme.id === 'dark';
    const bgFill = isDark ? '#151D2A' : '#FFFFFF';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const baselineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    const textColor = isDark ? '#94A3B8' : '#6B7280';
    const lineColor = isDark ? '#34D399' : '#10B981';

    // Background
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedDates = Object.keys(dailyStats).sort();
    if (sortedDates.length === 0) {
        ctx.fillStyle = textColor;
        ctx.font = 'bold 24px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados diários no período', canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    }

    // Generous bottom padding (80px) so X labels and 0% mark are never clipped
    const padding = { top: 25, right: 35, bottom: 80, left: 65 };
    const chartW = canvas.width - padding.left - padding.right;
    const chartH = canvas.height - padding.top - padding.bottom;

    // Y Axis Grid lines (0%, 25%, 50%, 75%, 100%)
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '500 16px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';

    [0, 25, 50, 75, 100].forEach(val => {
        const y = padding.top + chartH - (val / 100) * chartH;
        
        ctx.beginPath();
        if (val === 0) {
            // Solid baseline
            ctx.setLineDash([]);
            ctx.strokeStyle = baselineColor;
            ctx.lineWidth = 1.5;
        } else {
            // Subtle dashed grid
            ctx.setLineDash([4, 6]);
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
        }
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();

        // Label
        ctx.fillText(`${val}%`, padding.left - 14, y + 5);
    });

    ctx.setLineDash([]); // Reset line dash

    // Points calculation
    const points = sortedDates.map((date, idx) => {
        const s = dailyStats[date];
        const total = s.ok + s.nok;
        const pct = total > 0 ? (s.ok / total) * 100 : 0;
        const x = padding.left + (idx / Math.max(1, sortedDates.length - 1)) * chartW;
        const y = padding.top + chartH - (pct / 100) * chartH;
        return { x, y, pct, date, idx };
    });

    // Gradient fill under the curve
    if (points.length > 1) {
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, isDark ? 'rgba(52, 211, 153, 0.28)' : 'rgba(16, 185, 129, 0.20)');
        grad.addColorStop(0.7, isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(16, 185, 129, 0.05)');
        grad.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartH);
        points.forEach((p, idx) => {
            if (idx === 0) ctx.lineTo(p.x, p.y);
            else {
                const prev = points[idx - 1];
                const cx = (prev.x + p.x) / 2;
                ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
            }
        });
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Line drawing (smooth, crisp curve)
    ctx.beginPath();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = lineColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else {
            const prev = points[idx - 1];
            const cx = (prev.x + p.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
        }
    });
    ctx.stroke();

    // Find Min and Max points for clean milestone dots
    // Render signal dots for ALL days/points
    const dotRadius = points.length > 45 ? 3 : 4.5;
    const dotLineWidth = points.length > 45 ? 1.5 : 2.5;

    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#0B0F19' : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = dotLineWidth;
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    });

    // X Labels (6 to 8 well-spaced clean dates)
    const targetLabelCount = Math.min(7, points.length);
    const labelIndices = [];
    if (points.length <= targetLabelCount) {
        points.forEach((_, i) => labelIndices.push(i));
    } else {
        const step = (points.length - 1) / (targetLabelCount - 1);
        for (let k = 0; k < targetLabelCount; k++) {
            labelIndices.push(Math.round(k * step));
        }
    }

    ctx.textAlign = 'center';
    ctx.font = '500 15px Inter, Arial, sans-serif';
    ctx.fillStyle = textColor;

    labelIndices.forEach(idx => {
        const p = points[idx];
        if (!p) return;
        const [, m, day] = p.date.split('-');
        const label = `${parseInt(day)}/${parseInt(m)}`;
        ctx.fillText(label, p.x, padding.top + chartH + 30);
    });

    return canvas.toDataURL('image/png');
}

let cachedLogoDataUrl = null;

/**
 * Loads the Grupo EFX logo as a Base64 data URL
 */
async function getLogoDataUrl() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;

    const imgEl = document.querySelector('.header-logo-efx') || document.querySelector('img[src*="logo-grupo-efx"]');
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0);
            cachedLogoDataUrl = canvas.toDataURL('image/png');
            return cachedLogoDataUrl;
        } catch (e) {
            console.warn('Canvas conversion of logo image failed:', e);
        }
    }

    try {
        const response = await fetch('assets/logo-grupo-efx.png');
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                cachedLogoDataUrl = reader.result;
                resolve(cachedLogoDataUrl);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Could not fetch logo image:', e);
        return null;
    }
}

/**
 * Builds a single slide in PowerPoint (Widescreen 16:9)
 */
function addDashboardSlide(pres, theme, title, subtitleDate, stats, logoImgData) {
    const slide = pres.addSlide();
    slide.background = { color: theme.bg };

    // ─── 1. HEADER (x: 0.4, y: 0.18, w: 9.2, h: 0.46) ───
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: 0.18, w: 9.2, h: 0.46,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 },
        radius: 0.06
    });

    // Grupo EFX Logo Image (Transparent PNG, preserved 2.18:1 aspect ratio)
    const logoH = 0.36;
    const logoW = 0.78; // 0.36 * (488 / 224) ≈ 0.784 in
    const logoX = 0.55;
    const logoY = 0.23;

    if (logoImgData) {
        slide.addImage({
            data: logoImgData,
            x: logoX,
            y: logoY,
            w: logoW,
            h: logoH
        });
    } else {
        slide.addText("GRUPO EFX", {
            x: 0.55, y: 0.24, w: 1.5, h: 0.32,
            fontSize: 13, fontFace: 'Inter',
            color: theme.gold, bold: true
        });
    }

    // Title
    slide.addText(title, {
        x: logoX + logoW + 0.15, y: 0.22, w: 5.80, h: 0.36,
        fontSize: 13.5, fontFace: 'Inter',
        color: theme.textPrimary, bold: true
    });

    // Period / Date Badge
    slide.addShape(pres.ShapeType.roundRect, {
        x: 7.40, y: 0.24, w: 2.05, h: 0.32,
        fill: { color: theme.goldLight },
        line: { color: theme.gold, width: 1 },
        radius: 0.06
    });

    slide.addText(subtitleDate, {
        x: 7.40, y: 0.24, w: 2.05, h: 0.32,
        fontSize: 9.5, fontFace: 'Inter',
        color: theme.gold, bold: true, align: 'center', valign: 'middle'
    });

    // ─── 2. VEHICLE CARDS (x: 0.4, y: 0.70, w: 9.2, h: 1.50) ───
    const cardsPerRow = 5;
    const cardW = 1.76;
    const cardH = 0.70;
    const gapX = 0.10;
    const gapY = 0.08;

    VEHICLES.forEach((v, idx) => {
        const row = Math.floor(idx / cardsPerRow);
        const col = idx % cardsPerRow;
        const cx = 0.4 + col * (cardW + gapX);
        const cy = 0.70 + row * (cardH + gapY);

        const vStat = stats.vehicleStats[v.plate] || { conformityPct: null, latestKm: 0 };
        const pct = vStat.conformityPct;

        // Color based on user rules: >= 95% Green, 90-94% Amber, < 90% Red
        let pctColor = theme.textMuted;
        let pctText = '—';
        let statusText = 'sem dados';
        if (pct !== null) {
            pctText = `${pct}%`;
            statusText = 'conforme';
            if (pct >= 95) pctColor = theme.green;
            else if (pct >= 90) pctColor = theme.amber;
            else pctColor = theme.red;
        }

        const kmText = vStat.latestKm > 0 ? `${vStat.latestKm.toLocaleString('pt-BR')} km` : 'Sem reg.';

        // Card Container
        slide.addShape(pres.ShapeType.roundRect, {
            x: cx, y: cy, w: cardW, h: cardH,
            fill: { color: theme.cardBg },
            line: { color: theme.cardBorder, width: 1 },
            radius: 0.06
        });

        // Plate
        slide.addText(v.plate, {
            x: cx + 0.08, y: cy + 0.05, w: 1.0, h: 0.20,
            fontSize: 10, fontFace: 'Inter',
            color: theme.textPrimary, bold: true
        });

        // Model Tag
        slide.addText(v.model, {
            x: cx + 1.05, y: cy + 0.05, w: 0.62, h: 0.18,
            fontSize: 7.5, fontFace: 'Inter',
            color: theme.textMuted, align: 'right'
        });

        // Conformity Percentage
        slide.addText(pctText, {
            x: cx + 0.08, y: cy + 0.24, w: 0.85, h: 0.25,
            fontSize: 14, fontFace: 'Inter',
            color: pctColor, bold: true
        });

        // Conformity Label
        slide.addText(statusText, {
            x: cx + 0.90, y: cy + 0.28, w: 0.78, h: 0.18,
            fontSize: 7.5, fontFace: 'Inter',
            color: theme.textMuted, align: 'left'
        });

        // Conformity Progress Bar Background
        slide.addShape(pres.ShapeType.rect, {
            x: cx + 0.08, y: cy + 0.49, w: cardW - 0.16, h: 0.03,
            fill: { color: theme.barBg },
            line: { color: theme.barBg, width: 0 }
        });

        // Filled Progress Bar
        if (pct !== null && pct > 0) {
            slide.addShape(pres.ShapeType.rect, {
                x: cx + 0.08, y: cy + 0.49, w: (cardW - 0.16) * (pct / 100), h: 0.03,
                fill: { color: pctColor },
                line: { color: pctColor, width: 0 }
            });
        }

        // KM Footer
        slide.addText(`KM: ${kmText}`, {
            x: cx + 0.08, y: cy + 0.53, w: cardW - 0.16, h: 0.15,
            fontSize: 7, fontFace: 'Inter',
            color: theme.textSecondary, align: 'center'
        });
    });

    // ─── 3. MIDDLE ROW: CHART (Expanded) + DRIVER ENGAGEMENT (Compact) ───
    const chartW = 6.60;
    const engageW = 2.50;
    const midY = 2.26;
    const midH = 1.88;

    // --- Chart Box (Left - 6.60 width) ---
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: midY, w: chartW, h: midH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 },
        radius: 0.06
    });

    slide.addText("Evolução da Conformidade Diária (%)", {
        x: 0.55, y: midY + 0.08, w: 5.5, h: 0.20,
        fontSize: 10.5, fontFace: 'Inter',
        color: theme.textPrimary, bold: true
    });

    // Render Canvas chart image (clean margin inside card container)
    const chartImgData = renderChartToDataUrl(stats.dailyStats, theme);
    slide.addImage({
        data: chartImgData,
        x: 0.48, y: midY + 0.28, w: chartW - 0.16, h: midH - 0.38
    });

    // --- Driver Engagement Box (Right - 2.50 width) ---
    const engageX = 0.4 + chartW + 0.10;
    slide.addShape(pres.ShapeType.roundRect, {
        x: engageX, y: midY, w: engageW, h: midH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 },
        radius: 0.06
    });

    slide.addText("Vistorias (Motoristas)", {
        x: engageX + 0.12, y: midY + 0.08, w: 2.26, h: 0.20,
        fontSize: 10, fontFace: 'Inter',
        color: theme.textPrimary, bold: true
    });

    // Driver table list
    const driversToShow = stats.driverList.slice(0, 10);
    if (driversToShow.length === 0) {
        slide.addText("Sem registros de condutores", {
            x: engageX + 0.10, y: midY + 0.75, w: engageW - 0.20, h: 0.30,
            fontSize: 9.5, fontFace: 'Inter',
            color: theme.textMuted, align: 'center'
        });
    } else {
        driversToShow.forEach((drv, i) => {
            const dy = midY + 0.26 + i * 0.15;
            
            // Driver Name (aligned left)
            slide.addText(`${i + 1}. ${drv.name}`, {
                x: engageX + 0.10, y: dy, w: 1.42, h: 0.14,
                fontSize: 7.5, fontFace: 'Inter',
                color: theme.textPrimary, bold: false
            });

            // Engagement Badge % (User Rule: 96%-100% verde, 90%-95% amarelo, <90% vermelho)
            let badgeColor = theme.red;
            if (drv.pct >= 96) {
                badgeColor = theme.green;
            } else if (drv.pct >= 90) {
                badgeColor = theme.amber;
            }

            slide.addShape(pres.ShapeType.roundRect, {
                x: engageX + 1.55, y: dy, w: 0.85, h: 0.14,
                fill: { color: theme.id === 'dark' ? '1E293B' : 'F3F4F6' },
                line: { color: badgeColor, width: 1 },
                radius: 0.03
            });

            slide.addText(`${drv.pct}% (${drv.count}d)`, {
                x: engageX + 1.55, y: dy, w: 0.85, h: 0.14,
                fontSize: 7, fontFace: 'Inter',
                color: badgeColor, bold: true, align: 'center', valign: 'middle'
            });
        });
    }

    // ─── 4. BOTTOM ROW: 3-LINE SYNTHESIZED AI ANALYSIS (x: 0.4, y: 4.22, w: 9.2, h: 0.98) ───
    const botY = 4.22;
    const botH = 0.98;

    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: botY, w: 9.2, h: botH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 },
        radius: 0.06
    });

    slide.addText("Análise Executiva — Diagnóstico de Operação e Engajamento", {
        x: 0.55, y: botY + 0.06, w: 8.9, h: 0.18,
        fontSize: 9.5, fontFace: 'Inter',
        color: theme.gold, bold: true
    });

    // 3 Lines of AI Analysis formatted cleanly
    const analysisLines = generateExecutiveAnalysis(stats, subtitleDate);
    const analysisTextObjects = analysisLines.map((line, idx) => ({
        text: line + (idx < analysisLines.length - 1 ? '\n' : ''),
        options: {
            fontSize: 8.0,
            fontFace: 'Inter',
            color: theme.textPrimary,
            paraSpaceAfter: 4
        }
    }));

    slide.addText(analysisTextObjects, {
        x: 0.55, y: botY + 0.24, w: 8.9, h: 0.68,
        align: 'left',
        valign: 'top',
        lineSpacing: 10
    });
}

/**
 * Main Export Function
 * Orchestrates PowerPoint generation based on user preferences.
 */
async function generatePowerPointPresentation({ themeId, startMonth, endMonth, includeCompiled, includeMonthly, onProgress }) {
    if (!window.PptxGenJS) {
        throw new Error('A biblioteca PptxGenJS não foi carregada no navegador.');
    }

    const theme = PPTX_THEMES[themeId] || PPTX_THEMES.dark;
    const pres = new window.PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'Painel Checklist Frota — Grupo EFX';
    pres.title = 'Relatório Executivo de Conformidade da Frota';

    if (onProgress) onProgress('Coletando e estruturando dados...');

    // Load Grupo EFX Logo
    const logoImgData = await getLogoDataUrl();

    // Extract all unique months available in state.data
    const allMonths = new Set();
    Object.values(state.data).forEach(vehicleData => {
        Object.keys(vehicleData.days || {}).forEach(date => {
            if (date.length >= 7) allMonths.add(date.substring(0, 7));
        });
    });

    const sortedAllMonths = Array.from(allMonths).sort(); // chronological order

    // Filter months within selected range [startMonth, endMonth]
    const validMonths = sortedAllMonths.filter(m => m >= startMonth && m <= endMonth);

    if (validMonths.length === 0) {
        throw new Error('Nenhum dado encontrado para o período selecionado.');
    }

    // Determine period label
    const formatMonthLabel = (ym) => {
        const [y, m] = ym.split('-');
        return `${PPTX_MONTH_NAMES[parseInt(m) - 1]} ${y}`;
    };

    const periodRangeLabel = validMonths.length > 1
        ? `${formatMonthLabel(validMonths[0])} a ${formatMonthLabel(validMonths[validMonths.length - 1])}`
        : formatMonthLabel(validMonths[0]);

    // 1. First Slide: Compiled (if selected)
    if (includeCompiled) {
        if (onProgress) onProgress('Construindo slide compilado do período...');
        const compiledStats = aggregateDataForMonths(state.data, validMonths);
        const compiledTitle = `Visão Compilada da Frota — ${periodRangeLabel}`;
        addDashboardSlide(pres, theme, compiledTitle, periodRangeLabel, compiledStats, logoImgData);
    }

    // 2. Subsequent Slides: Monthly in chronological order (if selected)
    if (includeMonthly) {
        for (let i = 0; i < validMonths.length; i++) {
            const monthYm = validMonths[i];
            const monthTitle = `Visão Mensal da Frota — ${formatMonthLabel(monthYm)}`;
            if (onProgress) onProgress(`Construindo slide de ${formatMonthLabel(monthYm)}...`);
            const monthStats = aggregateDataForMonths(state.data, [monthYm]);
            addDashboardSlide(pres, theme, monthTitle, formatMonthLabel(monthYm), monthStats, logoImgData);
        }
    }

    if (onProgress) onProgress('Finalizando arquivo .pptx...');

    const filename = `Relatorio_Frota_EFX_${startMonth}_a_${endMonth}_${themeId}.pptx`;
    await pres.writeFile({ fileName: filename });

    if (onProgress) onProgress('Download concluído!');
}

window.generatePowerPointPresentation = generatePowerPointPresentation;
window.PPTX_MONTH_NAMES = PPTX_MONTH_NAMES;
