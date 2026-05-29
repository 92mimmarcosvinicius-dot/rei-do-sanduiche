-- ============================================
-- REI DO SANDUICHE — Schema Supabase
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Tabela unica para todos os dados (espelho do localStorage)
CREATE TABLE IF NOT EXISTS rei_data (
    collection TEXT NOT NULL,
    item_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (collection, item_id)
);

-- Index para buscas por collection
CREATE INDEX IF NOT EXISTS idx_rei_data_collection ON rei_data (collection);

-- RLS: permitir todas operacoes (app interno, auth pelo proprio app)
ALTER TABLE rei_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura" ON rei_data FOR SELECT USING (true);
CREATE POLICY "Permitir insercao" ON rei_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao" ON rei_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao" ON rei_data FOR DELETE USING (true);
