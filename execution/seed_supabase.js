/**
 * execution/seed_supabase.js
 * Lê o histórico do checklist_data.csv e carrega no Supabase via REST API.
 */

const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            value = value.trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('\n❌ [ERRO] SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configuradas no seu arquivo .env');
    console.error('Exemplo no .env:');
    console.error('SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co');
    console.error('SUPABASE_ANON_KEY=eyJhbGciOi...\n');
    process.exit(1);
}

const CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'checklist_data.csv');
if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ [ERRO] Arquivo não encontrado: ${CSV_PATH}`);
    process.exit(1);
}

function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentField.trim());
            if (currentRow.some(col => col.length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(col => col.length > 0)) rows.push(currentRow);
    }
    return rows;
}

const ITEM_COLUMNS = [
    'sistema_freio',
    'freio_mao',
    'nivel_oleo_hidraulico',
    'nivel_oleo_motor',
    'nivel_agua_radiador',
    'luz_freio_re_setas',
    'farois_lanternas',
    'setas_alerta',
    'buzina',
    'cinto_seguranca',
    'pneus',
    'estepe',
    'macaco_triangulo_chave',
    'extintor',
    'cnh_compativel',
    'crlv_atualizado',
    'parabrisa',
    'limpador_palhetas',
    'retrovisores',
    'vidros_laterais',
    'luzes_painel',
    'pedais',
    'fechaduras_portas',
    'tampas_tanques',
    'bateria',
    'estrutura_bau',
    'portas_bau',
    'thermo_king',
    'carrinho_carga'
];

async function seed() {
    console.log(`\n🚀 [SUPABASE SEED] Conectando a: ${SUPABASE_URL}...`);
    const csvRaw = fs.readFileSync(CSV_PATH, 'utf-8');
    const table = parseCSV(csvRaw);
    if (table.length <= 1) {
        console.error('❌ CSV sem linhas de dados.');
        return;
    }

    const records = [];
    const driversSet = new Set();

    for (let i = 1; i < table.length; i++) {
        const row = table[i];
        if (row.length < 35) continue;

        const timestampStr = row[0];
        const modelo = row[1];
        const placa = (row[2] || '').trim().toUpperCase();
        const kmStr = (row[3] || '0').replace(/\D/g, '');
        const km = parseInt(kmStr, 10) || 0;
        const motorista = (row[4] || '').trim();
        const ajudante = (row[5] || '').trim();
        const rawDate = (row[6] || '').trim();
        const empresa = (row[7] || 'ALPHA CANDIES').trim();

        if (motorista) driversSet.add(motorista);

        // Ajuste de data YYYY-MM-DD
        const dateParts = rawDate.split('/');
        if (dateParts.length !== 3) continue;
        let [dd, mm, yyyy] = dateParts;
        if (yyyy.length === 4 && parseInt(yyyy, 10) < 100) yyyy = '2026';
        if (yyyy === '2025') yyyy = '2026';
        const dateFormatted = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

        // Parse Carimbo de data/hora (DD/MM/YYYY HH:MM:SS)
        let isoTimestamp = new Date().toISOString();
        if (timestampStr.includes('/')) {
            const [tDate, tTime] = timestampStr.split(' ');
            const [tdd, tmm, tyy] = (tDate || '').split('/');
            let fixedYear = tyy;
            if (fixedYear && parseInt(fixedYear, 10) < 100) fixedYear = '2026';
            if (fixedYear === '2025') fixedYear = '2026';
            if (tdd && tmm && fixedYear) {
                isoTimestamp = `${fixedYear}-${tmm.padStart(2, '0')}-${tdd.padStart(2, '0')}T${tTime || '12:00:00'}Z`;
            }
        }

        // 29 Itens (colunas 8 a 36)
        let totalNok = 0;
        const itemValues = {};
        ITEM_COLUMNS.forEach((colName, idx) => {
            const val = (row[8 + idx] || 'OK').trim().toUpperCase();
            const status = (val === 'NOK') ? 'NOK' : 'OK';
            itemValues[colName] = status;
            if (status === 'NOK') totalNok++;
        });

        const celular = row[37] || 'Sim';
        const limpo = row[38] || 'Sim';
        const observacoes = row[39] || null;
        const lider = row[40] || null;
        const declCorreta = row[41] || 'Sim';
        const declCiencia = row[42] || 'Sim';

        const conformidade = Number((( (29 - totalNok) / 29 ) * 100).toFixed(2));

        records.push({
            carimbo_data_hora: isoTimestamp,
            data_checklist: dateFormatted,
            veiculo_placa: placa,
            modelo_veiculo: modelo,
            km_atual: km,
            motorista: motorista,
            ajudante: ajudante || null,
            empresa: empresa,
            ...itemValues,
            celular_empresa: celular,
            veiculo_limpo: limpo,
            observacoes: observacoes,
            lider_responsavel: lider,
            declaracao_correta: declCorreta,
            declaracao_ciencia: declCiencia,
            total_nok: totalNok,
            conformidade_percentual: conformidade
        });
    }

    console.log(`📦 Total de registros processados do CSV: ${records.length}`);

    // Inserir motoristas descobertos que não estejam na lista inicial
    const driversList = Array.from(driversSet).map(name => ({ nome: name, ativo: true }));
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/motoristas`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=ignore-duplicates'
            },
            body: JSON.stringify(driversList)
        });
        console.log(`👤 Motoristas sincronizados (${driversList.length} encontrados).`);
    } catch (e) {
        console.warn('Aviso ao sincronizar motoristas:', e.message);
    }

    // Inserir em lotes de 50
    const CHUNK_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/checklists`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(chunk)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`❌ Erro no lote ${i} - ${i + chunk.length}: HTTP ${resp.status} - ${errText}`);
            return;
        }

        inserted += chunk.length;
        process.stdout.write(`\r💾 Progresso: ${inserted}/${records.length} checklists enviados...`);
    }

    console.log(`\n\n✅ [SUCESSO] Todos os ${inserted} checklists foram migrados com sucesso para o Supabase!`);
}

seed().catch(err => {
    console.error('❌ Falha na execução da migração:', err);
});
