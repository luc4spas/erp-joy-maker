
-- Add birth_date and base_salary to funcionarios
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS base_salary numeric NOT NULL DEFAULT 0;

-- Create enum for transaction types
CREATE TYPE public.payroll_transaction_type AS ENUM ('vale', 'bonus', 'desconto');

-- Create payroll_transactions table
CREATE TABLE public.payroll_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  transaction_type public.payroll_transaction_type NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference_month date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.payroll_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read payroll_transactions"
  ON public.payroll_transactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payroll_transactions"
  ON public.payroll_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update payroll_transactions"
  ON public.payroll_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete payroll_transactions"
  ON public.payroll_transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
