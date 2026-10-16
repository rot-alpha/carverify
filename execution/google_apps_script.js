/**
 * execution/google_apps_script.js
 * Script para ser colado no Google Sheets (Extensões > Apps Script)
 * CAR . VERIFY — Sincronização em Tempo Real e Blindagem da Planilha (SEC-05)
 *
 * NOTA DE SEGURANÇA E APPS SCRIPT:
 * A função é nomeada 'enviarChecklistSupabase' (e NÃO 'onFormSubmit'),
 * pois 'onFormSubmit' é um gatilho simples reservado que o Google bloqueia
 * quando tenta executar chamadas externas (UrlFetchApp).
 */

const CONFIG = {
  SUPABASE_URL: "https://dbximfvbmdpwsgafbvrr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGltZnZibWRwd3NnYWZidnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzgwNzgsImV4cCI6MjEwNjQ1NDA3OH0.5buJ6yXjaWNCWnjhnildrxrDk35-CPpNJYMkJAfliw4"
};

const ITEM_COLUMNS = [
  'sistema_freio',          // Col 8
  'freio_mao',              // Col 9
  'nivel_oleo_hidraulico',  // Col 10
  'nivel_oleo_motor',       // Col 11
  'nivel_agua_radiador',    // Col 12
  'luz_freio_re_setas',     // Col 13
  'farois_lanternas',       // Col 14
  'setas_alerta',           // Col 15
  'buzina',                 // Col 16
  'cinto_seguranca',        // Col 17
  'pneus',                  // Col 18
  'estepe',                 // Col 19
  'macaco_triangulo_chave', // Col 20
  'extintor',               // Col 21 (Limpeza do Veículo / Cabine e Baú)
  'cnh_compativel',         // Col 22
  'crlv_atualizado',        // Col 23
  'parabrisa',              // Col 24
  'limpador_palhetas',      // Col 25
  'retrovisores',           // Col 26
  'vidros_laterais',        // Col 27
  'luzes_painel',           // Col 28
  'pedais',                 // Col 29
  'fechaduras_portas',      // Col 30
  'tampas_tanques',         // Col 31
  'bateria',                // Col 32
  'estrutura_bau',          // Col 33
  'portas_bau',             // Col 34
  'thermo_king',            // Col 35
  'carrinho_carga'          // Col 36
];

/**
 * Converte data para formato YYYY-MM-DD
 */
function formatISODate(rawDate, rawTimestamp) {
  if (rawDate instanceof Date) {
    return Utilities.formatDate(rawDate, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const parts = rawDate.trim().split('/');
    if (parts.length === 3) {
      let yyyy = parts[2].trim();
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      if (parseInt(yyyy, 10) >= 2024 && parseInt(yyyy, 10) <= 2030) {
        return `${yyyy}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
      }
    }
  }
  if (rawTimestamp instanceof Date) {
    return Utilities.formatDate(rawTimestamp, "America/Sao_Paulo", "yyyy-MM-dd");
  }
  if (typeof rawTimestamp === 'string' && rawTimestamp.includes('/')) {
    const parts = rawTimestamp.trim().split(' ')[0].split('/');
    if (parts.length === 3) {
      let yyyy = parts[2].trim();
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      if (parseInt(yyyy, 10) >= 2024 && parseInt(yyyy, 10) <= 2030) {
        return `${yyyy}-${parts[1].trim().padStart(2, '0')}-${parts[0].trim().padStart(2, '0')}`;
      }
    }
  }
  return Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
}

/**
 * Converte carimbo de data/hora para ISO 8601
 */
function formatISOTimestamp(rawTimestamp) {
  if (rawTimestamp instanceof Date) {
    return rawTimestamp.toISOString();
  }
  if (typeof rawTimestamp === 'string' && rawTimestamp.includes('/')) {
    const [tDate, tTime] = rawTimestamp.trim().split(' ');
    const parts = (tDate || '').split('/');
    if (parts.length === 3) {
      let yyyy = parts[2].trim();
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      return `${yyyy}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T${tTime || '12:00:00'}Z`;
    }
  }
  return new Date().toISOString();
}

/**
 * Função acionada pelo envio do Google Forms (Installable Trigger)
 */
function enviarChecklistSupabase(e) {
  try {
    let rowValues = [];
    if (e && e.values) {
      rowValues = e.values;
    } else {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Respostas ao formulário 1") || ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow < 2) {
        Logger.log("Aviso: Planilha vazia ou sem respostas.");
        return;
      }
      rowValues = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
    }

    if (!rowValues || rowValues.length < 35) {
      Logger.log("Linha com colunas insuficientes (encontradas: " + (rowValues ? rowValues.length : 0) + ").");
      return;
    }

    const timestamp = rowValues[0];
    const modelo = String(rowValues[1] || '').trim();
    const placa = String(rowValues[2] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const kmStr = String(rowValues[3] || '0').replace(/\D/g, '');
    const km = parseInt(kmStr, 10) || 0;
    const motorista = String(rowValues[4] || '').trim();
    const ajudante = String(rowValues[5] || '').trim();
    const rawDate = rowValues[6];
    const empresa = String(rowValues[7] || 'ALPHA CANDIES').trim();

    if (!placa || placa.length < 7) {
      Logger.log("Aviso: Placa inválida ou não informada: " + placa);
      return;
    }

    const dateFormatted = formatISODate(rawDate, timestamp);
    const timestampISO = formatISOTimestamp(timestamp);

    // Mapeamento dos 29 Itens (Colunas 8 a 36)
    let totalNok = 0;
    const payload = {
      carimbo_data_hora: timestampISO,
      data_checklist: dateFormatted,
      veiculo_placa: placa,
      modelo_veiculo: modelo,
      km_atual: km,
      motorista: motorista,
      ajudante: ajudante,
      empresa: empresa
    };

    ITEM_COLUMNS.forEach((colName, idx) => {
      const rawVal = String(rowValues[8 + idx] || 'OK').trim().toUpperCase();
      const status = (rawVal === 'NOK') ? 'NOK' : 'OK';
      payload[colName] = status;
      if (status === 'NOK') totalNok++;
    });

    payload['celular_empresa'] = String(rowValues[37] || 'Sim').trim();
    payload['veiculo_limpo'] = String(rowValues[38] || 'Sim').trim();
    payload['observacoes'] = rowValues[39] ? String(rowValues[39]).trim() : null;
    payload['lider_responsavel'] = rowValues[40] ? String(rowValues[40]).trim() : null;
    payload['declaracao_correta'] = String(rowValues[41] || 'Sim').trim();
    payload['declaracao_ciencia'] = String(rowValues[42] || 'Sim').trim();
    payload['total_nok'] = totalNok;
    payload['conformidade_percentual'] = Number((( (29 - totalNok) / 29 ) * 100).toFixed(2));

    // Envio direto via REST API do Supabase
    const url = CONFIG.SUPABASE_URL + "/rest/v1/checklists";
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    Logger.log("Resposta Supabase: HTTP " + statusCode + " - " + response.getContentText());

    if (statusCode >= 200 && statusCode < 300) {
      Logger.log("Checklist sincronizado com sucesso no Supabase para a placa " + placa);
    } else {
      Logger.log("Falha ao sincronizar: " + response.getContentText());
    }

  } catch (err) {
    Logger.log("Exceção em enviarChecklistSupabase: " + err.toString());
  }
}

/**
 * Função de Teste: executa o envio da última linha da planilha
 */
function testarEnvio() {
  Logger.log("Executando teste com a última linha da planilha...");
  enviarChecklistSupabase(null);
}
