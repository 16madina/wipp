-- Étape C : intervenants et prise de parole (réutilise wipp_event_live_members / wipp_event_lives).
-- role = 'speaker' existe déjà : c'est « sur scène ».
ALTER TABLE public.wipp_event_live_members ADD COLUMN IF NOT EXISTS hand_raised_at TIMESTAMPTZ;   -- main levée
ALTER TABLE public.wipp_event_live_members ADD COLUMN IF NOT EXISTS stage_invited_at TIMESTAMPTZ; -- invitation à monter (expire)
ALTER TABLE public.wipp_event_live_members ADD COLUMN IF NOT EXISTS stage_since TIMESTAMPTZ;      -- ordre d'arrivée sur scène
ALTER TABLE public.wipp_event_live_members ADD COLUMN IF NOT EXISTS mic_revoked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.wipp_event_live_members ADD COLUMN IF NOT EXISTS cam_revoked BOOLEAN NOT NULL DEFAULT false;
-- Intervenant mis en avant (identité LiveKit), null = grille.
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS featured_identity TEXT;
