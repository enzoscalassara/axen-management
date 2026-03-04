-- ============================================================
-- AXEN HUB — Schema do Banco de Dados (Supabase / PostgreSQL)
-- Execute este script no SQL Editor do Supabase Dashboard.
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- EMPRESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS (perfil estendido além do auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    empresas_permitidas UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20),
    contato VARCHAR(255),
    segmento VARCHAR(100),
    status VARCHAR(20) DEFAULT 'lead' CHECK (status IN ('lead', 'ativo', 'inativo')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);

-- ============================================================
-- MOVIMENTAÇÕES FINANCEIRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor DECIMAL(15, 2) NOT NULL,
    data DATE NOT NULL,
    categoria VARCHAR(100),
    status VARCHAR(20) DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'previsto')),
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_empresa ON movimentacoes(empresa_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);
CREATE INDEX idx_movimentacoes_status ON movimentacoes(status);

-- ============================================================
-- REEMBOLSOS
-- ============================================================
CREATE TABLE IF NOT EXISTS reembolsos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    valor DECIMAL(15, 2) NOT NULL,
    responsavel VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reembolsos_empresa ON reembolsos(empresa_id);

-- ============================================================
-- METAS
-- ============================================================
CREATE TABLE IF NOT EXISTS metas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor_alvo DECIMAL(15, 2) DEFAULT 0,
    prazo DATE,
    responsavel VARCHAR(255),
    status VARCHAR(20) DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida', 'cancelada')),
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    cliente_vinculado_id UUID REFERENCES clientes(id),
    acompanhamento_tipo TEXT,
    calculo_automatico BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metas_empresa ON metas(empresa_id);

-- ============================================================
-- COLUNAS KANBAN
-- ============================================================
CREATE TABLE IF NOT EXISTS colunas_kanban (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_colunas_empresa ON colunas_kanban(empresa_id);

-- ============================================================
-- ATIVIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    responsavel VARCHAR(255),
    prazo DATE,
    prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    coluna_id UUID REFERENCES colunas_kanban(id) ON DELETE SET NULL,
    status VARCHAR(50),
    pessoal BOOLEAN DEFAULT false,
    criador_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_atividades_empresa ON atividades(empresa_id);
CREATE INDEX idx_atividades_coluna ON atividades(coluna_id);

-- ============================================================
-- DOCUMENTOS (metadados — arquivos no Supabase Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    url_storage TEXT NOT NULL,
    tipo VARCHAR(50),
    data_upload TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);

-- ============================================================
-- HISTÓRICO DO CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_cliente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    data TIMESTAMPTZ DEFAULT NOW(),
    tipo VARCHAR(50)
);

CREATE INDEX idx_historico_cliente ON historico_cliente(cliente_id);
