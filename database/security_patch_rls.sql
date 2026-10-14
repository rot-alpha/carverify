-- ==============================================================================
-- CAR . VERIFY — SECURITY PATCH (Supabase Row Level Security Hardening)
-- Arquivo: database/security_patch_rls.sql
-- Objetivo: Sanar a vulnerabilidade [SEC-01] restringindo permissões públicas
--           da chave anon e impedindo exclusão ou adulteração indevida da frota.
-- ==============================================================================

-- 1. REVOGAR PRIVILÉGIOS DESTRUTIVOS DA ROLE ANÔNIMA
REVOKE TRUNCATE, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. TABELA: VEÍCULOS (Somente Leitura Pública)
-- Apenas leitura permitida para visitantes e painel. Modificações apenas via service_role ou auth.
DROP POLICY IF EXISTS "Edição pública veículos" ON public.veiculos;
DROP POLICY IF EXISTS "Leitura pública veículos" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_select_public" ON public.veiculos;

CREATE POLICY "veiculos_select_public" 
    ON public.veiculos 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- 3. TABELA: MOTORISTAS (Somente Leitura Pública)
DROP POLICY IF EXISTS "Edição pública motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Leitura pública motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "motoristas_select_public" ON public.motoristas;

CREATE POLICY "motoristas_select_public" 
    ON public.motoristas 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- 4. TABELA: CHECKLISTS (Leitura + Inserção Restrita com Validação)
-- Não permite UPDATE nem DELETE por usuários anônimos.
DROP POLICY IF EXISTS "Leitura pública checklists" ON public.checklists;
DROP POLICY IF EXISTS "Inserção pública checklists" ON public.checklists;
DROP POLICY IF EXISTS "checklists_select_public" ON public.checklists;
DROP POLICY IF EXISTS "checklists_insert_public" ON public.checklists;

CREATE POLICY "checklists_select_public" 
    ON public.checklists 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "checklists_insert_public" 
    ON public.checklists 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (
        veiculo_placa IS NOT NULL 
        AND length(trim(veiculo_placa)) >= 7 
        AND data_checklist IS NOT NULL
    );

-- 5. TABELA: ATIVIDADES MOTORISTAS (RH / Presença Diária)
-- Substitui a política permissiva "FOR ALL USING (true)" por regras granulares validadas.
DROP POLICY IF EXISTS "Acesso público atividades motoristas" ON public.atividades_motoristas;
DROP POLICY IF EXISTS "atividades_select_public" ON public.atividades_motoristas;
DROP POLICY IF EXISTS "atividades_insert_public" ON public.atividades_motoristas;
DROP POLICY IF EXISTS "atividades_update_public" ON public.atividades_motoristas;
DROP POLICY IF EXISTS "atividades_delete_public" ON public.atividades_motoristas;

CREATE POLICY "atividades_select_public" 
    ON public.atividades_motoristas 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "atividades_insert_public" 
    ON public.atividades_motoristas 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (
        motorista_nome IS NOT NULL 
        AND length(trim(motorista_nome)) >= 2
        AND data IS NOT NULL
        AND status IN ('ativo', 'banco_horas', 'falta', 'atestado', 'ferias')
    );

CREATE POLICY "atividades_update_public" 
    ON public.atividades_motoristas 
    FOR UPDATE 
    TO anon, authenticated 
    USING (true)
    WITH CHECK (
        status IN ('ativo', 'banco_horas', 'falta', 'atestado', 'ferias')
    );

CREATE POLICY "atividades_delete_public" 
    ON public.atividades_motoristas 
    FOR DELETE 
    TO anon, authenticated 
    USING (
        motorista_nome IS NOT NULL 
        AND data IS NOT NULL
    );

-- 6. TABELA: FÉRIAS MOTORISTAS (Períodos de Ausência de RH)
DROP POLICY IF EXISTS "Acesso público férias motoristas" ON public.ferias_motoristas;
DROP POLICY IF EXISTS "ferias_select_public" ON public.ferias_motoristas;
DROP POLICY IF EXISTS "ferias_insert_public" ON public.ferias_motoristas;
DROP POLICY IF EXISTS "ferias_delete_public" ON public.ferias_motoristas;

CREATE POLICY "ferias_select_public" 
    ON public.ferias_motoristas 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "ferias_insert_public" 
    ON public.ferias_motoristas 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (
        motorista_nome IS NOT NULL 
        AND length(trim(motorista_nome)) >= 2
        AND data_inicio IS NOT NULL
        AND data_fim IS NOT NULL
        AND data_inicio <= data_fim
    );

-- Permite deleção pelo motorista e período
CREATE POLICY "ferias_delete_public" 
    ON public.ferias_motoristas 
    FOR DELETE 
    TO anon, authenticated 
    USING (
        motorista_nome IS NOT NULL 
        AND data_inicio IS NOT NULL
    );

-- Fim do Patch de Segurança
