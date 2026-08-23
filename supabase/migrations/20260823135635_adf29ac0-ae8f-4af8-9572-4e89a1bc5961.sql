CREATE TABLE public.puppy_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puppy_names TO anon, authenticated;
GRANT ALL ON public.puppy_names TO service_role;
ALTER TABLE public.puppy_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage puppy names" ON public.puppy_names FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.puppy_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puppy_checklist TO anon, authenticated;
GRANT ALL ON public.puppy_checklist TO service_role;
ALTER TABLE public.puppy_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage puppy checklist" ON public.puppy_checklist FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_puppy_names_updated_at BEFORE UPDATE ON public.puppy_names FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_puppy_checklist_updated_at BEFORE UPDATE ON public.puppy_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.puppy_names (name, votes) VALUES ('Princess', 1), ('Penny', 0), ('Waffles', 0);

INSERT INTO public.puppy_checklist (item_key, label, sort_order) VALUES
('core_vaccines', 'Core Vaccines: Rabies (1-year or 3-year), DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza).', 1),
('lifestyle_vaccines', 'Lifestyle Vaccines: Bordetella (Kennel Cough), Leptospirosis, and Lyme Disease (highly recommended for the Northeast).', 2),
('preventatives', 'Preventatives: Monthly heartworm chew and a flea & tick preventative (Simparica Trio or NexGard).', 3),
('spay_consult', 'Spay/Neuter Consult: Discuss timing — medium/large breeds often wait until 12-14 months for growth plates to close.', 4);

ALTER PUBLICATION supabase_realtime ADD TABLE public.puppy_names;
ALTER PUBLICATION supabase_realtime ADD TABLE public.puppy_checklist;