
-- ENUM types
CREATE TYPE public.conta_status AS ENUM ('pendente', 'pago', 'atrasado');

-- ACL: Access Groups
CREATE TABLE public.access_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.access_groups ENABLE ROW LEVEL SECURITY;

-- ACL: Group Permissions (granular per module)
CREATE TABLE public.group_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(group_id, module)
);
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

-- ACL: User <-> Group mapping
CREATE TABLE public.user_access_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);
ALTER TABLE public.user_access_groups ENABLE ROW LEVEL SECURITY;

-- Security definer function to check permissions without RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_groups uag
    JOIN public.group_permissions gp ON gp.group_id = uag.group_id
    WHERE uag.user_id = _user_id
      AND gp.module = _module
      AND (
        (_action = 'read' AND gp.can_read = true) OR
        (_action = 'create' AND gp.can_create = true) OR
        (_action = 'edit' AND gp.can_edit = true) OR
        (_action = 'delete' AND gp.can_delete = true)
      )
  )
$$;

-- Helper: check if user is admin (has admin group)
CREATE OR REPLACE FUNCTION public.user_is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access_groups uag
    JOIN public.access_groups ag ON ag.id = uag.group_id
    WHERE uag.user_id = _user_id
      AND ag.name = 'Admin'
  )
$$;

-- RLS for access_groups: admins can do everything, others can read
CREATE POLICY "Admins manage access_groups" ON public.access_groups FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));
CREATE POLICY "Authenticated users can read access_groups" ON public.access_groups FOR SELECT TO authenticated
  USING (true);

-- RLS for group_permissions: admins manage, others read
CREATE POLICY "Admins manage group_permissions" ON public.group_permissions FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));
CREATE POLICY "Authenticated users can read group_permissions" ON public.group_permissions FOR SELECT TO authenticated
  USING (true);

-- RLS for user_access_groups: admins manage, users can read own
CREATE POLICY "Admins manage user_access_groups" ON public.user_access_groups FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));
CREATE POLICY "Users can read own groups" ON public.user_access_groups FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Empresas (Companies)
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  tipo TEXT NOT NULL DEFAULT 'filial',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own empresas" ON public.empresas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fornecedores (Suppliers)
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fornecedores" ON public.fornecedores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contas a Pagar (Parent)
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  numero_documento TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  num_parcelas INTEGER NOT NULL DEFAULT 1,
  dia_vencimento INTEGER,
  categoria TEXT,
  centro_custo TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contas_pagar" ON public.contas_pagar FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parcelas (Installments - Children)
CREATE TABLE public.parcelas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_original NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status public.conta_status NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  anexo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own parcelas_pagar" ON public.parcelas_pagar FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos', 'anexos', false);
CREATE POLICY "Users can upload own anexos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own anexos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own anexos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Seed default Admin group
INSERT INTO public.access_groups (name, description) VALUES ('Admin', 'Acesso total ao sistema');
INSERT INTO public.group_permissions (group_id, module, can_read, can_create, can_edit, can_delete)
SELECT ag.id, m.module, true, true, true, true
FROM public.access_groups ag
CROSS JOIN (VALUES ('financeiro'), ('colaboradores'), ('administracao'), ('upload'), ('contas_pagar')) AS m(module)
WHERE ag.name = 'Admin';
