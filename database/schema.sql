-- ==============================================================================
-- CAR . VERIFY — SCHEMA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Versão: 1.0.0
-- Descrição: Tabelas de frota, motoristas, histórico de checklists e atividades.
-- ==============================================================================

-- 1. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa VARCHAR(10) UNIQUE NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    tipo VARCHAR(30) DEFAULT 'Frota',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE MOTORISTAS
CREATE TABLE IF NOT EXISTS public.motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE CHECKLISTS DIÁRIOS
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carimbo_data_hora TIMESTAMPTZ NOT NULL,
    data_checklist DATE NOT NULL,
    veiculo_placa VARCHAR(10) NOT NULL REFERENCES public.veiculos(placa) ON UPDATE CASCADE,
    modelo_veiculo VARCHAR(50),
    km_atual BIGINT NOT NULL,
    motorista VARCHAR(120) NOT NULL,
    ajudante VARCHAR(120),
    empresa VARCHAR(100) DEFAULT 'ALPHA CANDIES',
    
    -- 29 Itens Inspecionados (OK / NOK / NA)
    sistema_freio VARCHAR(10) DEFAULT 'OK',
    freio_mao VARCHAR(10) DEFAULT 'OK',
    nivel_oleo_hidraulico VARCHAR(10) DEFAULT 'OK',
    nivel_oleo_motor VARCHAR(10) DEFAULT 'OK',
    nivel_agua_radiador VARCHAR(10) DEFAULT 'OK',
    luz_freio_re_setas VARCHAR(10) DEFAULT 'OK',
    farois_lanternas VARCHAR(10) DEFAULT 'OK',
    setas_alerta VARCHAR(10) DEFAULT 'OK',
    buzina VARCHAR(10) DEFAULT 'OK',
    cinto_seguranca VARCHAR(10) DEFAULT 'OK',
    pneus VARCHAR(10) DEFAULT 'OK',
    estepe VARCHAR(10) DEFAULT 'OK',
    macaco_triangulo_chave VARCHAR(10) DEFAULT 'OK',
    extintor VARCHAR(10) DEFAULT 'OK',
    cnh_compativel VARCHAR(10) DEFAULT 'OK',
    crlv_atualizado VARCHAR(10) DEFAULT 'OK',
    parabrisa VARCHAR(10) DEFAULT 'OK',
    limpador_palhetas VARCHAR(10) DEFAULT 'OK',
    retrovisores VARCHAR(10) DEFAULT 'OK',
    vidros_laterais VARCHAR(10) DEFAULT 'OK',
    luzes_painel VARCHAR(10) DEFAULT 'OK',
    pedais VARCHAR(10) DEFAULT 'OK',
    fechaduras_portas VARCHAR(10) DEFAULT 'OK',
    tampas_tanques VARCHAR(10) DEFAULT 'OK',
    bateria VARCHAR(10) DEFAULT 'OK',
    estrutura_bau VARCHAR(10) DEFAULT 'OK',
    portas_bau VARCHAR(10) DEFAULT 'OK',
    thermo_king VARCHAR(10) DEFAULT 'OK',
    carrinho_carga VARCHAR(10) DEFAULT 'OK',

    -- Metadados e Conformidade
    celular_empresa VARCHAR(20) DEFAULT 'Sim',
    veiculo_limpo VARCHAR(20) DEFAULT 'Sim',
    observacoes TEXT,
    lider_responsavel VARCHAR(100),
    declaracao_correta VARCHAR(20) DEFAULT 'Sim',
    declaracao_ciencia VARCHAR(20) DEFAULT 'Sim',
    
    total_nok INT DEFAULT 0,
    conformidade_percentual NUMERIC(5,2) DEFAULT 100.00,
    
    -- Armazenamento flexível complementar
    itens_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE ATIVIDADES E AUSÊNCIAS DOS MOTORISTAS
CREATE TABLE IF NOT EXISTS public.atividades_motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motorista_nome VARCHAR(120) NOT NULL REFERENCES public.motoristas(nome) ON UPDATE CASCADE ON DELETE CASCADE,
    data DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('ativo', 'banco_horas', 'falta', 'atestado', 'ferias')),
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (motorista_nome, data)
);

-- 5. TABELA DE PERÍODOS DE FÉRIAS
CREATE TABLE IF NOT EXISTS public.ferias_motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motorista_nome VARCHAR(120) NOT NULL REFERENCES public.motoristas(nome) ON UPDATE CASCADE ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE (Queries Analíticas em <10ms)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_checklists_placa_data ON public.checklists (veiculo_placa, data_checklist DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_data ON public.checklists (data_checklist DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_motorista ON public.checklists (motorista);
CREATE INDEX IF NOT EXISTS idx_atividades_motorista_data ON public.atividades_motoristas (motorista_nome, data);
CREATE INDEX IF NOT EXISTS idx_ferias_motorista_periodo ON public.ferias_motoristas (motorista_nome, data_inicio, data_fim);

-- ==============================================================================
-- SEGURANÇA (Row Level Security - RLS)
-- Permite leitura e escrita pelo dashboard usando a chave anon pública
-- ==============================================================================
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_motoristas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública veículos" ON public.veiculos;
CREATE POLICY "Leitura pública veículos" ON public.veiculos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Edição pública veículos" ON public.veiculos;
CREATE POLICY "Edição pública veículos" ON public.veiculos FOR ALL USING (true);

DROP POLICY IF EXISTS "Leitura pública motoristas" ON public.motoristas;
CREATE POLICY "Leitura pública motoristas" ON public.motoristas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Edição pública motoristas" ON public.motoristas;
CREATE POLICY "Edição pública motoristas" ON public.motoristas FOR ALL USING (true);

DROP POLICY IF EXISTS "Leitura pública checklists" ON public.checklists;
CREATE POLICY "Leitura pública checklists" ON public.checklists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Inserção pública checklists" ON public.checklists;
CREATE POLICY "Inserção pública checklists" ON public.checklists FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público atividades motoristas" ON public.atividades_motoristas;
CREATE POLICY "Acesso público atividades motoristas" ON public.atividades_motoristas FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso público férias motoristas" ON public.ferias_motoristas;
CREATE POLICY "Acesso público férias motoristas" ON public.ferias_motoristas FOR ALL USING (true);

-- ==============================================================================
-- CARGA INICIAL (SEEDS)
-- 10 Veículos Reais da Frota e 16 Motoristas Ativos
-- ==============================================================================
INSERT INTO public.veiculos (placa, modelo) VALUES
    ('SUX8H84', 'FIORINO'),
    ('SUE7D02', 'FIORINO'),
    ('SVJ3H89', 'FIORINO'),
    ('SUW7B16', 'FIORINO'),
    ('STA0F48', 'FIORINO'),
    ('FRG7C31', 'IVECO'),
    ('FPF8A23', 'IVECO'),
    ('FXI0C35', 'IVECO'),
    ('ECF3235', 'IVECO'),
    ('FJF7817', 'IVECO')
ON CONFLICT (placa) DO NOTHING;

INSERT INTO public.motoristas (nome) VALUES
    ('Alan Henrique'),
    ('Alex Schuermann'),
    ('Anderson Barbosa'),
    ('Anderson Luiz'),
    ('Carlos Alberto'),
    ('Cristian Ricardo'),
    ('Evaldo Aparecido'),
    ('Jailton Ferreira'),
    ('José Lucivaldo'),
    ('Leonildo Silva'),
    ('Luis Gustavo'),
    ('Murilo Gonzaga'),
    ('Rafael Da Silva'),
    ('Ricardo Rodrigues'),
    ('Rogério Ribeiro'),
    ('Wesley Cristian')
ON CONFLICT (nome) DO NOTHING;
