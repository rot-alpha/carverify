-- ==============================================================================
-- CAR . VERIFY — SCRIPT DE LIMPEZA DE REGISTROS ANÔMALOS
-- Arquivo: database/cleanup_anomalies.sql
-- Objetivo: Remover do Supabase os 2 registros anômalos identificados em OUT 2026:
--           1. Teste técnico de webhook com motorista "Alan Henrique"
--           2. Registro com colunas deslocadas ("Sem Ajudante" no campo motorista)
-- Como executar: Acesse o painel Supabase > SQL Editor > Cole este script > Run
-- ==============================================================================

-- 1. Remoção do registro de teste de webhook injetado em 14/10/2026
DELETE FROM public.checklists 
WHERE id = '5f9c8efc-6738-4a18-a7d3-1557afbb964d'
   OR observacoes ILIKE '%Teste de webhook seguro%';

-- 2. Remoção da linha corrompida com colunas deslocadas em 06/10/2026
DELETE FROM public.checklists 
WHERE id = '408e4b25-512a-4744-adf3-548ff4fc8da2'
   OR (motorista = 'Sem Ajudante' AND ajudante LIKE '%GMT%');

-- 3. Verificação: confirmação do total de checklists válidos em Outubro de 2026
SELECT 
    motorista, 
    count(DISTINCT data_checklist) AS dias_com_checklist
FROM public.checklists 
WHERE data_checklist >= '2026-10-01' AND data_checklist <= '2026-10-31'
GROUP BY motorista
ORDER BY dias_com_checklist DESC;

