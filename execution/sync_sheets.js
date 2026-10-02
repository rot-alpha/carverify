/**
 * execution/sync_sheets.js
 * Baixa o CSV mais recente do Google Sheets e salva em src/data/checklist_data.csv
 * e src/data/data.json para uso no painel.
 */

const fs = require('fs');
const path = require('path');

const SHEET_ID = '1OXapsWbWJj_TuNgYw9PUo1ydlzHMSJ7HCAaa_m1YIok';
const GID = '667476341';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const CSV_PATH = path.join(DATA_DIR, 'checklist_data.csv');

async function sync() {
    console.log(`[SYNC] Baixando dados atualizados do Google Sheets...`);
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const csvText = await response.text();
        fs.writeFileSync(CSV_PATH, csvText, 'utf-8');
        console.log(`[SYNC] Sucesso! Arquivo salvo em: ${CSV_PATH} (${csvText.length} bytes)`);

        // Sincronização incremental com o Supabase
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            try {
                const { seed } = require('./seed_supabase.js');
                console.log(`[SYNC] Sincronizando novos checklists com a nuvem (Supabase)...`);
                await seed();
            } catch (errSupabase) {
                console.warn(`[SYNC] Aviso ao sincronizar com Supabase:`, errSupabase.message);
            }
        }
    } catch (err) {
        console.error(`[SYNC ERROR] Falha ao sincronizar:`, err.message);
    }
}

sync();
