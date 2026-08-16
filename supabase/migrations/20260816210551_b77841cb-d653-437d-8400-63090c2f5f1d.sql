CREATE TABLE public.guide_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id text NOT NULL,
  content text NOT NULL,
  author text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_notes TO authenticated;
GRANT ALL ON public.guide_notes TO service_role;

ALTER TABLE public.guide_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide notes" ON public.guide_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can add guide notes" ON public.guide_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update guide notes" ON public.guide_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete guide notes" ON public.guide_notes FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_guide_notes_updated_at BEFORE UPDATE ON public.guide_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.guide_notes;