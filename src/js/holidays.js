/**
 * Módulo Oficial de Feriados: Nacionais, Estaduais (SP) e Municipais (Sorocaba - SP)
 * Mapeamento estrito de feriados reais e legais (pontos facultativos expressamente excluídos).
 */
const Holidays = (function () {
    'use strict';

    // Algoritmo de Butcher (Meeus/Jones) para data da Páscoa
    function getEaster(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }

    function addDays(date, days) {
        const res = new Date(date);
        res.setDate(res.getDate() + days);
        return res;
    }

    function formatIso(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Gera o mapa de feriados para um determinado ano
    function getHolidaysForYear(year) {
        const map = {};

        // --- 1. FERIADOS NACIONAIS FIXOS (Leis Federais 10.607/2002, 6.802/1980 e 14.759/2023) ---
        map[`${year}-01-01`] = { name: 'Confraternização Universal (Ano Novo)', type: 'Nacional', short: 'Ano Novo' };
        map[`${year}-04-21`] = { name: 'Tiradentes', type: 'Nacional', short: 'Tiradentes' };
        map[`${year}-05-01`] = { name: 'Dia Mundial do Trabalho', type: 'Nacional', short: 'Dia do Trabalho' };
        map[`${year}-09-07`] = { name: 'Independência do Brasil', type: 'Nacional', short: 'Independência' };
        map[`${year}-10-12`] = { name: 'Nossa Senhora Aparecida (Padroeira do Brasil)', type: 'Nacional', short: 'N. Sra. Aparecida' };
        map[`${year}-11-02`] = { name: 'Finados', type: 'Nacional', short: 'Finados' };
        map[`${year}-11-15`] = { name: 'Proclamação da República', type: 'Nacional', short: 'Proclamação Rep.' };
        map[`${year}-11-20`] = { name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'Nacional', short: 'Consciência Negra' };
        map[`${year}-12-25`] = { name: 'Natal', type: 'Nacional', short: 'Natal' };

        // --- 2. FERIADO ESTADUAL DE SÃO PAULO FIXO (Lei Estadual 9.497/1997) ---
        map[`${year}-07-09`] = { name: 'Revolução Constitucionalista de 1932', type: 'Estadual (SP)', short: 'Rev. 1932' };

        // --- 3. FERIADOS MUNICIPAIS DE SOROCABA FIXOS (Lei Municipal 1.453/1967) ---
        map[`${year}-08-15`] = { name: 'Aniversário de Sorocaba / N. Sra. da Ponte', type: 'Municipal (Sorocaba)', short: 'Aniv. Sorocaba' };

        // --- 4. FERIADOS MÓVEIS OFICIAIS (Baseados na Páscoa) ---
        const easter = getEaster(year);

        // Sexta-feira Santa (Paixão de Cristo): Páscoa - 2 dias (Lei Federal 9.093/1995 e Lei Municipal 1.453/1967)
        const goodFriday = addDays(easter, -2);
        map[formatIso(goodFriday)] = { name: 'Sexta-feira Santa (Paixão de Cristo)', type: 'Nacional/Municipal', short: 'Paixão de Cristo' };

        // Corpus Christi: Páscoa + 60 dias (Feriado Municipal Religioso em Sorocaba pela Lei Municipal 1.453/1967)
        const corpusChristi = addDays(easter, 60);
        map[formatIso(corpusChristi)] = { name: 'Corpus Christi', type: 'Municipal (Sorocaba)', short: 'Corpus Christi' };

        return map;
    }

    // Cache por ano para máxima performance
    const cache = {};

    function getHoliday(dateStr) {
        if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return null;
        const year = parseInt(dateStr.substring(0, 4), 10);
        if (isNaN(year)) return null;

        if (!cache[year]) {
            cache[year] = getHolidaysForYear(year);
        }
        return cache[year][dateStr] || null;
    }

    function isHoliday(dateStr) {
        return !!getHoliday(dateStr);
    }

    return {
        getEaster,
        getHolidaysForYear,
        getHoliday,
        isHoliday
    };
})();

// Exporta para escopos globais (navegador e Node para testes)
if (typeof window !== 'undefined') {
    window.Holidays = Holidays;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Holidays;
}
