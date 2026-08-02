CREATE TABLE public.slip_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  last_slip_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.slip_ups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slip_ups TO authenticated;
GRANT ALL ON public.slip_ups TO service_role;

ALTER TABLE public.slip_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slip ups" ON public.slip_ups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update slip ups" ON public.slip_ups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_slip_ups_updated_at BEFORE UPDATE ON public.slip_ups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.slip_ups (name, last_slip_timestamp) VALUES ('David', now()), ('Arden', now());

ALTER PUBLICATION supabase_realtime ADD TABLE public.slip_ups;