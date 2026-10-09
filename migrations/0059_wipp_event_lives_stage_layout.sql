-- Disposition de la scène choisie par le host (3 ou 4 intervenants) : partagée, host dominant, invités intégrés.
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS stage_layout TEXT NOT NULL DEFAULT 'shared';
DO $$ BEGIN
  ALTER TABLE public.wipp_event_lives ADD CONSTRAINT wipp_event_lives_stage_layout_check CHECK (stage_layout IN ('shared', 'dominant', 'inset'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
