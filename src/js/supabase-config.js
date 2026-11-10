/**
 * src/js/supabase-config.js
 * Configuração do cliente Supabase para o CAR . VERIFY.
 * Fornece sincronização de checklists e atividades dos motoristas na nuvem.
 */

(function () {
    'use strict';

    const SUPABASE_URL = 'https://dbximfvbmdpwsgafbvrr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGltZnZibWRwd3NnYWZidnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzgwNzgsImV4cCI6MjEwNjQ1NDA3OH0.5buJ6yXjaWNCWnjhnildrxrDk35-CPpNJYMkJAfliw4';

    let client = null;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[SUPABASE] Cliente inicializado com sucesso.');
        } catch (e) {
            console.warn('[SUPABASE] Falha ao inicializar cliente:', e);
        }
    } else {
        console.warn('[SUPABASE] SDK do Supabase não encontrado na página.');
    }

    window.CarVerifySupabase = {
        client: client,
        url: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY,

        /**
         * Carrega todos os checklists do Supabase com paginação (superando o teto de 1.000 linhas do PostgREST)
         */
        async fetchChecklists() {
            if (!client) return null;
            try {
                const PAGE_SIZE = 1000;
                let from = 0;
                let allRows = [];
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await client
                        .from('checklists')
                        .select('*')
                        .order('data_checklist', { ascending: true })
                        .range(from, from + PAGE_SIZE - 1);

                    if (error) {
                        console.error('[SUPABASE] Erro ao buscar lote de checklists:', error);
                        break;
                    }

                    if (data && data.length > 0) {
                        allRows = allRows.concat(data);
                        if (data.length < PAGE_SIZE) {
                            hasMore = false;
                        } else {
                            from += PAGE_SIZE;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                return allRows;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao consultar checklists:', err);
                return null;
            }
        },

        /**
         * Inscreve para receber novos checklists inseridos em tempo real via WebSocket
         */
        subscribeToChecklists(onInsertCallback) {
            if (!client) return null;
            
            console.log('[SUPABASE] Ativando escuta Realtime para tabela checklists...');
            const channel = client
                .channel('checklists-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checklists' }, payload => {
                    console.log('[SUPABASE] NOVO CHECKLIST RECEBIDO EM TEMPO REAL!', payload.new);
                    if (onInsertCallback) onInsertCallback(payload.new);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[SUPABASE] Realtime conectado com sucesso!');
                    }
                });
                
            return channel;
        },

        /**
         * Busca todas as atividades cadastradas dos motoristas com paginação
         */
        async fetchDriverActivities() {
            if (!client) return null;
            try {
                const PAGE_SIZE = 1000;
                let from = 0;
                let allRows = [];
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await client
                        .from('atividades_motoristas')
                        .select('*')
                        .range(from, from + PAGE_SIZE - 1);

                    if (error) {
                        console.error('[SUPABASE] Erro ao buscar lote de atividades de motoristas:', error);
                        break;
                    }

                    if (data && data.length > 0) {
                        allRows = allRows.concat(data);
                        if (data.length < PAGE_SIZE) {
                            hasMore = false;
                        } else {
                            from += PAGE_SIZE;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                return allRows;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao buscar atividades:', err);
                return null;
            }
        },

        /**
         * Salva ou atualiza a atividade diária de um motorista no Supabase
         */
        async upsertDriverActivity(motoristaNome, dataStr, status, observacao = null) {
            if (!client) return false;
            try {
                const { error } = await client
                    .from('atividades_motoristas')
                    .upsert({
                        motorista_nome: motoristaNome,
                        data: dataStr,
                        status: status,
                        observacao: observacao,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'motorista_nome,data' });

                if (error) {
                    console.error('[SUPABASE] Erro ao salvar atividade:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao salvar atividade:', err);
                return false;
            }
        },

        /**
         * Remove a atividade diária de um motorista (ex: quando volta ao padrão ativo)
         */
        async deleteDriverActivity(motoristaNome, dataStr) {
            if (!client) return false;
            try {
                const { error } = await client
                    .from('atividades_motoristas')
                    .delete()
                    .eq('motorista_nome', motoristaNome)
                    .eq('data', dataStr);

                if (error) {
                    console.error('[SUPABASE] Erro ao excluir atividade:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao excluir atividade:', err);
                return false;
            }
        },

        /**
         * Busca os períodos de férias cadastrados
         */
        async fetchDriverVacations() {
            if (!client) return null;
            try {
                const { data, error } = await client
                    .from('ferias_motoristas')
                    .select('*');

                if (error) {
                    console.error('[SUPABASE] Erro ao buscar férias:', error);
                    return null;
                }
                return data;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao buscar férias:', err);
                return null;
            }
        },

        /**
         * Salva um período de férias no Supabase
         */
        async saveDriverVacation(motoristaNome, dataInicio, dataFim, observacao = null) {
            if (!client) return false;
            try {
                const { error } = await client
                    .from('ferias_motoristas')
                    .insert({
                        motorista_nome: motoristaNome,
                        data_inicio: dataInicio,
                        data_fim: dataFim,
                        observacao: observacao
                    });

                if (error) {
                    console.error('[SUPABASE] Erro ao salvar férias:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao salvar férias:', err);
                return false;
            }
        },

        /**
         * Envia múltiplas atividades de uma vez (usado na migração/sincronização de dados locais para a nuvem)
         */
        async bulkUpsertActivities(records) {
            if (!client || !records || records.length === 0) return true;
            try {
                const { error } = await client
                    .from('atividades_motoristas')
                    .upsert(records, { onConflict: 'motorista_nome,data' });

                if (error) {
                    console.error('[SUPABASE] Erro no bulkUpsertActivities:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção no bulkUpsertActivities:', err);
                return false;
            }
        },

        /**
         * Envia múltiplos períodos de férias de uma vez
         */
        async bulkInsertVacations(records) {
            if (!client || !records || records.length === 0) return true;
            try {
                const { error } = await client
                    .from('ferias_motoristas')
                    .insert(records);

                if (error) {
                    console.error('[SUPABASE] Erro no bulkInsertVacations:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção no bulkInsertVacations:', err);
                return false;
            }
        },

        /**
         * Exclui um período de férias no Supabase
         */
        async deleteDriverVacations(motoristaNome, dataInicio, dataFim) {
            if (!client) return false;
            try {
                const { error } = await client
                    .from('ferias_motoristas')
                    .delete()
                    .eq('motorista_nome', motoristaNome)
                    .eq('data_inicio', dataInicio)
                    .eq('data_fim', dataFim);

                if (error) {
                    console.error('[SUPABASE] Erro ao deletar férias:', error);
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao deletar férias:', err);
                return false;
            }
        },

        /**
         * Busca todos os registros de manutenção e status operacional de veículos
         */
        async fetchMaintenanceRecords() {
            if (!client) return null;
            try {
                const { data, error } = await client
                    .from('vehicle_maintenance')
                    .select('*')
                    .order('data_inicio', { ascending: false });

                if (error) {
                    console.warn('[SUPABASE] Tabela vehicle_maintenance indisponível ou sem registros (fallback local ativo):', error.message || error);
                    return null;
                }
                return data;
            } catch (err) {
                console.warn('[SUPABASE] Exceção ao consultar vehicle_maintenance:', err);
                return null;
            }
        },

        /**
         * Salva ou atualiza um registro de manutenção no Supabase
         */
        async upsertMaintenanceRecord(record) {
            if (!client || !record) return false;
            try {
                const payload = {
                    veiculo_placa: record.plate,
                    status: record.status,
                    maint_type: record.maintType || null,
                    systems: Array.isArray(record.systems) ? record.systems : [],
                    data_inicio: record.start,
                    data_fim: record.end,
                    nf_numero: record.nfNumber || null,
                    fornecedor: record.supplier || null,
                    valor_total: Number(record.cost || 0),
                    nf_attachment_name: record.nfFileName || null,
                    observacao: record.note || null,
                    linked_nok: record.linkedNok || null,
                    updated_at: new Date().toISOString()
                };
                if (record.uuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.uuid)) {
                    payload.id = record.uuid;
                }
                const { data, error } = await client
                    .from('vehicle_maintenance')
                    .upsert(payload)
                    .select()
                    .single();

                if (error) {
                    console.warn('[SUPABASE] Aviso ao salvar manutenção na nuvem (salvo localmente):', error.message || error);
                    return false;
                }
                return data || true;
            } catch (err) {
                console.warn('[SUPABASE] Exceção ao salvar manutenção na nuvem:', err);
                return false;
            }
        },

        /**
         * Remove um registro de manutenção do Supabase
         */
        async deleteMaintenanceRecord(record) {
            if (!client || !record) return false;
            try {
                let query = client.from('vehicle_maintenance').delete();
                if (record.uuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.uuid)) {
                    query = query.eq('id', record.uuid);
                } else {
                    query = query
                        .eq('veiculo_placa', record.plate)
                        .eq('data_inicio', record.start)
                        .eq('data_fim', record.end);
                }
                const { error } = await query;
                if (error) {
                    console.warn('[SUPABASE] Aviso ao remover manutenção na nuvem:', error.message || error);
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('[SUPABASE] Exceção ao remover manutenção na nuvem:', err);
                return false;
            }
        }
    };
})();
