CREATE TABLE public.budget_sinks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_week text not null,
  completed_week text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_sinks TO anon, authenticated;
GRANT ALL ON public.budget_sinks TO service_role;
ALTER TABLE public.budget_sinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage budget sinks" ON public.budget_sinks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.budget_weeks (
  week_key text primary key,
  income numeric,
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_weeks TO anon, authenticated;
GRANT ALL ON public.budget_weeks TO service_role;
ALTER TABLE public.budget_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage budget weeks" ON public.budget_weeks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.budget_sink_values (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  sink_id uuid not null references public.budget_sinks(id) on delete cascade,
  amount numeric,
  unique (week_key, sink_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_sink_values TO anon, authenticated;
GRANT ALL ON public.budget_sink_values TO service_role;
ALTER TABLE public.budget_sink_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage budget sink values" ON public.budget_sink_values FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  name text not null,
  amount numeric,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_expenses TO anon, authenticated;
GRANT ALL ON public.budget_expenses TO service_role;
ALTER TABLE public.budget_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage budget expenses" ON public.budget_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_sinks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_weeks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_sink_values;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_expenses;