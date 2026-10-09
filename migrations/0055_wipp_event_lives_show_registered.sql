-- Afficher le nombre d'inscrits d'un direct (oui par défaut) + jusqu'à 10 photos d'inscrits / d'intéressés.
-- Le corps complet de wipp_lot7_events appliqué est celui de la migration 0055 dans Supabase
-- (0054 + 'show_registered', 'registered_avatars' LIMIT 10, interested_avatars LIMIT 10).
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS show_registered BOOLEAN NOT NULL DEFAULT true;
