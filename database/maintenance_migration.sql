-- ==============================================================================
-- CAR . VERIFY — MIGRAÇÃO DO MÓDULO DE MANUTENÇÃO & FROTA (SUPABASE / POSTGRESQL)
-- Versão: 1.0.0
-- Descrição: Tabela de controle operacional de frota, ordens de serviço (OS),
--            sistemas mecânicos e metadados extraídos de Notas Fiscais (Extract-and-Discard).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_placa VARCHAR(10) NOT NULL REFERENCES public.veiculos(placa) ON UPDATE CASCADE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('ativo', 'interna', 'manutencao', 'off')),
    maint_type VARCHAR(20) CHECK (maint_type IN ('corretiva', 'preventiva')),
    systems JSONB DEFAULT '[]'::jsonb,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    nf_numero VARCHAR(60),
    fornecedor VARCHAR(160),
    valor_total NUMERIC(12,2) DEFAULT 0.00,
    nf_attachment_name VARCHAR(200),
    observacao TEXT,
    linked_nok JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_placa_datas
    ON public.vehicle_maintenance (veiculo_placa, data_inicio, data_fim);

ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maint_select_public" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "maint_insert_public" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "maint_update_public" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "maint_delete_public" ON public.vehicle_maintenance;

CREATE POLICY "maint_select_public" ON public.vehicle_maintenance
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "maint_insert_public" ON public.vehicle_maintenance
    FOR INSERT TO anon, authenticated WITH CHECK (
        veiculo_placa IS NOT NULL
        AND length(trim(veiculo_placa)) >= 7
        AND data_inicio IS NOT NULL
        AND data_fim IS NOT NULL
        AND data_inicio <= data_fim
        AND status IN ('ativo', 'interna', 'manutencao', 'off')
    );

CREATE POLICY "maint_update_public" ON public.vehicle_maintenance
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (
        status IN ('ativo', 'interna', 'manutencao', 'off')
    );

CREATE POLICY "maint_delete_public" ON public.vehicle_maintenance
    FOR DELETE TO anon, authenticated USING (
        veiculo_placa IS NOT NULL
    );

