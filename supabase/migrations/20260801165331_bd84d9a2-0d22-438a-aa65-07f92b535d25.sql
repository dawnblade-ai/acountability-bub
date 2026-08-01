CREATE TABLE public.chores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  assignee TEXT NOT NULL DEFAULT 'Any',
  due_date TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  completed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  assignee TEXT NOT NULL DEFAULT 'Any',
  cost NUMERIC,
  store TEXT,
  due_date TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  completed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chores TO anon, authenticated;
GRANT ALL ON public.chores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO anon, authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chores" ON public.chores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add chores" ON public.chores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update chores" ON public.chores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete chores" ON public.chores FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can view purchases" ON public.purchases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add purchases" ON public.purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update purchases" ON public.purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete purchases" ON public.purchases FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE public.chores REPLICA IDENTITY FULL;
ALTER TABLE public.purchases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;