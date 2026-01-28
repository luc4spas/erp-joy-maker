-- Create fechamentos table
CREATE TABLE public.fechamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  japa_total NUMERIC NOT NULL DEFAULT 0,
  japa_taxa NUMERIC NOT NULL DEFAULT 0,
  japa_valor_itens NUMERIC NOT NULL DEFAULT 0,
  trattoria_total NUMERIC NOT NULL DEFAULT 0,
  trattoria_taxa NUMERIC NOT NULL DEFAULT 0,
  trattoria_valor_itens NUMERIC NOT NULL DEFAULT 0,
  total_geral NUMERIC NOT NULL DEFAULT 0,
  comissao_japa NUMERIC NOT NULL DEFAULT 0,
  comissao_trattoria NUMERIC NOT NULL DEFAULT 0,
  pagamentos_japa JSONB,
  pagamentos_trattoria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for fechamentos
ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;

-- RLS policies for fechamentos
CREATE POLICY "Users can view their own fechamentos" 
ON public.fechamentos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fechamentos" 
ON public.fechamentos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fechamentos" 
ON public.fechamentos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fechamentos" 
ON public.fechamentos FOR DELETE 
USING (auth.uid() = user_id);

-- Create despesas table
CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for despesas
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- RLS policies for despesas
CREATE POLICY "Users can view their own despesas" 
ON public.despesas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas" 
ON public.despesas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas" 
ON public.despesas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas" 
ON public.despesas FOR DELETE 
USING (auth.uid() = user_id);

-- Create setor enum type
CREATE TYPE public.setor_tipo AS ENUM ('Garçom', 'Cozinha', 'Administrativo');

-- Create frente enum type  
CREATE TYPE public.frente_tipo AS ENUM ('Japa', 'Trattoria', 'Ambas');

-- Create funcionarios table
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  setor setor_tipo NOT NULL,
  frente frente_tipo NOT NULL DEFAULT 'Ambas',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for funcionarios
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for funcionarios
CREATE POLICY "Users can view their own funcionarios" 
ON public.funcionarios FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own funcionarios" 
ON public.funcionarios FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funcionarios" 
ON public.funcionarios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funcionarios" 
ON public.funcionarios FOR DELETE 
USING (auth.uid() = user_id);

-- Create pagamentos_funcionarios table (records daily payments to employees)
CREATE TABLE public.pagamentos_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  fechamento_id UUID REFERENCES public.fechamentos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  pago BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for pagamentos_funcionarios
ALTER TABLE public.pagamentos_funcionarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for pagamentos_funcionarios
CREATE POLICY "Users can view their own pagamentos_funcionarios" 
ON public.pagamentos_funcionarios FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pagamentos_funcionarios" 
ON public.pagamentos_funcionarios FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pagamentos_funcionarios" 
ON public.pagamentos_funcionarios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pagamentos_funcionarios" 
ON public.pagamentos_funcionarios FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for funcionarios updated_at
CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_fechamentos_user_data ON public.fechamentos(user_id, data);
CREATE INDEX idx_despesas_user_data ON public.despesas(user_id, data);
CREATE INDEX idx_funcionarios_user_id ON public.funcionarios(user_id);
CREATE INDEX idx_pagamentos_funcionarios_user_data ON public.pagamentos_funcionarios(user_id, data);