CREATE TABLE public.budget_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), msg text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.budget_history TO anon, authenticated;
GRANT ALL ON public.budget_history TO service_role;
ALTER TABLE public.budget_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage budget history" ON public.budget_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_history;