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
         * Carrega todos os checklists do Supabase (com limite alto de 50.000)
         */
        async fetchChecklists() {
            if (!client) return null;
            try {
                const { data, error } = await client
                    .from('checklists')
                    .select('*')
                    .order('data_checklist', { ascending: true })
                    .limit(50000);

                if (error) {
                    console.error('[SUPABASE] Erro ao buscar checklists:', error);
                    return null;
                }
                return data;
            } catch (err) {
                console.error('[SUPABASE] Exceção ao consultar checklists:', err);
                return null;
            }
        },

        /**
         * Busca todas as atividades cadastradas dos motoristas
         */
        async fetchDriverActivities() {
            if (!client) return null;
            try {
                const { data, error } = await client
                    .from('atividades_motoristas')
                    .select('*');

                if (error) {
                    console.error('[SUPABASE] Erro ao buscar atividades de motoristas:', error);
                    return null;
                }
                return data;
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
        }
    };
})();
