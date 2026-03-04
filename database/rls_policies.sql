-- ============================================================
-- AXEN HUB — Row Level Security Policies
-- Isolamento de dados por empresa.
-- Execute APÓS schema.sql no SQL Editor do Supabase.
-- ============================================================

-- Ativar RLS em todas as tabelas com dados por empresa
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE colunas_kanban ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_cliente ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função helper: verifica se o user tem acesso à empresa
-- ============================================================
CREATE OR REPLACE FUNCTION user_has_access_to_empresa(emp_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid()
        AND emp_id = ANY(empresas_permitidas)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Policies para CLIENTES
-- ============================================================
CREATE POLICY "clientes_select" ON clientes FOR SELECT
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "clientes_insert" ON clientes FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "clientes_update" ON clientes FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "clientes_delete" ON clientes FOR DELETE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para MOVIMENTAÇÕES
-- ============================================================
CREATE POLICY "movimentacoes_select" ON movimentacoes FOR SELECT
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "movimentacoes_insert" ON movimentacoes FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "movimentacoes_update" ON movimentacoes FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "movimentacoes_delete" ON movimentacoes FOR DELETE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para REEMBOLSOS
-- ============================================================
CREATE POLICY "reembolsos_select" ON reembolsos FOR SELECT
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "reembolsos_insert" ON reembolsos FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "reembolsos_update" ON reembolsos FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para METAS
-- ============================================================
CREATE POLICY "metas_select" ON metas FOR SELECT
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "metas_insert" ON metas FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "metas_update" ON metas FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "metas_delete" ON metas FOR DELETE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para COLUNAS KANBAN
-- ============================================================
CREATE POLICY "colunas_kanban_select" ON colunas_kanban FOR SELECT
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "colunas_kanban_insert" ON colunas_kanban FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "colunas_kanban_update" ON colunas_kanban FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "colunas_kanban_delete" ON colunas_kanban FOR DELETE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para ATIVIDADES
-- ============================================================
CREATE POLICY "atividades_select" ON atividades FOR SELECT
    USING (
        (pessoal = false AND user_has_access_to_empresa(empresa_id))
        OR
        (pessoal = true AND criador_id = auth.uid())
    );

CREATE POLICY "atividades_insert" ON atividades FOR INSERT
    WITH CHECK (user_has_access_to_empresa(empresa_id));

CREATE POLICY "atividades_update" ON atividades FOR UPDATE
    USING (user_has_access_to_empresa(empresa_id));

CREATE POLICY "atividades_delete" ON atividades FOR DELETE
    USING (user_has_access_to_empresa(empresa_id));

-- ============================================================
-- Policies para DOCUMENTOS (via cliente -> empresa)
-- ============================================================
CREATE POLICY "documentos_select" ON documentos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM clientes c
            WHERE c.id = documentos.cliente_id
            AND user_has_access_to_empresa(c.empresa_id)
        )
    );

CREATE POLICY "documentos_insert" ON documentos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clientes c
            WHERE c.id = documentos.cliente_id
            AND user_has_access_to_empresa(c.empresa_id)
        )
    );

-- ============================================================
-- Policies para HISTÓRICO CLIENTE (via cliente -> empresa)
-- ============================================================
CREATE POLICY "historico_select" ON historico_cliente FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM clientes c
            WHERE c.id = historico_cliente.cliente_id
            AND user_has_access_to_empresa(c.empresa_id)
        )
    );

CREATE POLICY "historico_insert" ON historico_cliente FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clientes c
            WHERE c.id = historico_cliente.cliente_id
            AND user_has_access_to_empresa(c.empresa_id)
        )
    );
