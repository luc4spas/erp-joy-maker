ALTER TABLE public.fechamentos
  ADD COLUMN IF NOT EXISTS hippocampus_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hippocampus_taxa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hippocampus_valor_itens numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_hippocampus numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamentos_hippocampus jsonb DEFAULT NULL;