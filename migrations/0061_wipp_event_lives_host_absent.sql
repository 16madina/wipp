-- Depuis quand l'organisateur n'est plus dans la salle (null = présent). 5 min d'absence = fin automatique.
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS host_absent_since TIMESTAMPTZ;
