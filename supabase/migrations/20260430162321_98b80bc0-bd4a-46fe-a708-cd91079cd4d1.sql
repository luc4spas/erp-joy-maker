-- Fornecedores de suprimentos
CREATE TABLE public.suprimentos_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  contato TEXT,
  categoria TEXT,
  prazo_entrega INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_fornecedores" ON public.suprimentos_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_fornecedores" ON public.suprimentos_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insumos
CREATE TABLE public.suprimentos_insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  fornecedor_id UUID,
  estoque_sistemico NUMERIC NOT NULL DEFAULT 0,
  critico BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_insumos" ON public.suprimentos_insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_insumos" ON public.suprimentos_insumos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Solicitações internas
CREATE TABLE public.suprimentos_solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  colaborador TEXT NOT NULL,
  setor TEXT NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_solicitacoes" ON public.suprimentos_solicitacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_solicitacoes" ON public.suprimentos_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pedidos de Compra
CREATE TABLE public.suprimentos_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fornecedor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  observacao TEXT,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento DATE,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_pedidos" ON public.suprimentos_pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_pedidos" ON public.suprimentos_pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Itens dos pedidos
CREATE TABLE public.suprimentos_pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pedido_id UUID NOT NULL REFERENCES public.suprimentos_pedidos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_pedido_itens" ON public.suprimentos_pedido_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_pedido_itens" ON public.suprimentos_pedido_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contagens de estoque
CREATE TABLE public.suprimentos_contagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'diaria',
  estoque_sistemico NUMERIC NOT NULL DEFAULT 0,
  contagem_real NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suprimentos_contagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suprimentos_contagens" ON public.suprimentos_contagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suprimentos_contagens" ON public.suprimentos_contagens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers de updated_at
CREATE TRIGGER trg_suprimentos_fornecedores_upd BEFORE UPDATE ON public.suprimentos_fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suprimentos_insumos_upd BEFORE UPDATE ON public.suprimentos_insumos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suprimentos_solicitacoes_upd BEFORE UPDATE ON public.suprimentos_solicitacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suprimentos_pedidos_upd BEFORE UPDATE ON public.suprimentos_pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();