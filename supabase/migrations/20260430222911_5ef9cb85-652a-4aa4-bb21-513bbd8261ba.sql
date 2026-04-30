-- Categorias de Contas a Pagar (combobox in-line)
CREATE TABLE public.categorias_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read categorias_pagar" ON public.categorias_pagar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage categorias_pagar" ON public.categorias_pagar FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Categorias de Suprimentos
CREATE TABLE public.suprimentos_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_categorias" ON public.suprimentos_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_categorias" ON public.suprimentos_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vinculo Insumo x Fornecedor (N:N)
CREATE TABLE public.suprimentos_insumo_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  insumo_id UUID NOT NULL REFERENCES public.suprimentos_insumos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.suprimentos_fornecedores(id) ON DELETE CASCADE,
  preferencial BOOLEAN NOT NULL DEFAULT false,
  ultimo_preco NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (insumo_id, fornecedor_id)
);
ALTER TABLE public.suprimentos_insumo_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sup_insumo_forn" ON public.suprimentos_insumo_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage sup_insumo_forn" ON public.suprimentos_insumo_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cotações (mapa de preços por solicitação)
CREATE TABLE public.suprimentos_cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  solicitacao_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_cotacoes" ON public.suprimentos_cotacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_cotacoes" ON public.suprimentos_cotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sup_cotacoes_upd BEFORE UPDATE ON public.suprimentos_cotacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.suprimentos_cotacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cotacao_id UUID NOT NULL REFERENCES public.suprimentos_cotacoes(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL,
  fornecedor_id UUID NOT NULL,
  ultimo_preco NUMERIC,
  preco_atual NUMERIC,
  selecionado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sup_cot_itens" ON public.suprimentos_cotacao_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage sup_cot_itens" ON public.suprimentos_cotacao_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- categoria_id em insumos
ALTER TABLE public.suprimentos_insumos ADD COLUMN IF NOT EXISTS categoria_id UUID;