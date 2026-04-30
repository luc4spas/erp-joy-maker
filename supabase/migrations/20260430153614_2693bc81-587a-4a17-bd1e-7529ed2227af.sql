
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS nota_fiscal_url text,
  ADD COLUMN IF NOT EXISTS boleto_url text;

-- Políticas no bucket "anexos" para arquivos de contas a pagar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated read anexos contas-pagar'
  ) THEN
    CREATE POLICY "Authenticated read anexos contas-pagar"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = 'contas-pagar');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload anexos contas-pagar'
  ) THEN
    CREATE POLICY "Authenticated upload anexos contas-pagar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'anexos' AND (storage.foldername(name))[1] = 'contas-pagar');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update anexos contas-pagar'
  ) THEN
    CREATE POLICY "Authenticated update anexos contas-pagar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = 'contas-pagar');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete anexos contas-pagar'
  ) THEN
    CREATE POLICY "Authenticated delete anexos contas-pagar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = 'contas-pagar');
  END IF;
END $$;
