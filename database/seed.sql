-- ============================================================
-- AXEN HUB — Dados iniciais (Seed)
-- Execute APÓS schema.sql no SQL Editor do Supabase.
-- ============================================================

-- Empresas
INSERT INTO empresas (id, nome, slug) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Axen Energia', 'axen-energia'),
    ('a0000000-0000-0000-0000-000000000002', 'Axen Data', 'axen-data');

-- Colunas Kanban — Axen Energia
INSERT INTO colunas_kanban (empresa_id, nome, ordem) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'A Fazer', 0),
    ('a0000000-0000-0000-0000-000000000001', 'Em Progresso', 1),
    ('a0000000-0000-0000-0000-000000000001', 'Revisão', 2),
    ('a0000000-0000-0000-0000-000000000001', 'Concluído', 3);

-- Colunas Kanban — Axen Data
INSERT INTO colunas_kanban (empresa_id, nome, ordem) VALUES
    ('a0000000-0000-0000-0000-000000000002', 'Backlog', 0),
    ('a0000000-0000-0000-0000-000000000002', 'Em Andamento', 1),
    ('a0000000-0000-0000-0000-000000000002', 'Entrega', 2),
    ('a0000000-0000-0000-0000-000000000002', 'Finalizado', 3);
