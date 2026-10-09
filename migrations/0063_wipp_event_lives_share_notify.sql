-- WIPP 1.1 — prévenir le host pendant son partage d'écran (mains levées, nouvelles questions), regroupé.
-- sharing_since : partage en cours depuis (null = pas de partage) ; share_notify : réglage du host (oui par défaut) ;
-- share_notified_at : dernière alerte (une toutes les 30 s au plus).
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS sharing_since TIMESTAMPTZ;
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS share_notify BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS share_notified_at TIMESTAMPTZ;
