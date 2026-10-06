-- À proximité, sans Bluetooth : découverte par ZONE approximative (geohash calculé sur le téléphone).
-- NON DESTRUCTIVE : nouvelles tables / colonnes seulement. L'ancienne table Bluetooth
-- wipp_nearby_sessions est laissée telle quelle (inutilisée), nettoyage séparé plus tard.
-- Aucune coordonnée GPS n'est stockée ; une seule ligne par personne, écrasée (pas d'historique).

-- 1. Présence visible : choix de l'utilisateur + zone fraîche.
CREATE TABLE IF NOT EXISTS public.wipp_nearby_presence (
  profile_id TEXT PRIMARY KEY REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('15', '60', 'until_off')),
  visible_until TIMESTAMPTZ,           -- NULL = jusqu'à désactivation
  cell TEXT,                           -- geohash (approximatif), NULL tant qu'aucune zone fraîche
  cell_at TIMESTAMPTZ,                 -- dernière actualisation de la zone (règle de fraîcheur)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((mode = 'until_off') = (visible_until IS NULL))
);
CREATE INDEX IF NOT EXISTS wipp_nearby_presence_cell ON public.wipp_nearby_presence (cell) WHERE cell IS NOT NULL;

-- 2. Garde anti-abus de la recherche : dernière zone + compteurs (une ligne écrasée, pas d'historique).
CREATE TABLE IF NOT EXISTS public.wipp_nearby_search_guard (
  profile_id TEXT PRIMARY KEY REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  last_cell TEXT,
  last_at TIMESTAMPTZ,
  minute_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  minute_count INTEGER NOT NULL DEFAULT 0,
  day_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  day_count INTEGER NOT NULL DEFAULT 0
);

-- 3. Connexions créées depuis À proximité.
ALTER TABLE public.wipp_connection_requests DROP CONSTRAINT IF EXISTS wipp_connection_requests_via_check;
ALTER TABLE public.wipp_connection_requests ADD CONSTRAINT wipp_connection_requests_via_check
  CHECK (via IN ('request', 'qr', 'touch', 'nearby'));
ALTER TABLE public.wipp_connections DROP CONSTRAINT IF EXISTS wipp_connections_via_check;
ALTER TABLE public.wipp_connections ADD CONSTRAINT wipp_connections_via_check
  CHECK (via IN ('request', 'qr', 'temp_qr', 'touch', 'nearby'));

-- 4. Demande envoyée en mode Invisible : photo masquée DANS la demande, anneau selon le genre.
ALTER TABLE public.wipp_connection_requests
  ADD COLUMN IF NOT EXISTS sender_invisible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_ring TEXT CHECK (sender_ring IS NULL OR sender_ring IN ('man', 'woman', 'other'));
GRANT SELECT (via, sender_invisible, sender_ring) ON public.wipp_connection_requests TO authenticated;

-- 5. Genre (facultatif), lu par le serveur seulement : couleur de l'anneau Invisible.
ALTER TABLE public.wipp_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IS NULL OR gender IN ('man', 'woman', 'nb', 'unspecified'));

-- 6. Réglages modifiables à distance (taille de zone, fraîcheur, limites).
INSERT INTO public.wipp_touch_config (key, value) VALUES (
  'nearby',
  '{"precision": 7, "radiusM": 400, "freshMin": 15, "refreshMin": 5, "maxResults": 20,
    "perMinute": 6, "perDay": 120, "maxSpeedKmh": 150, "jumpFreeKm": 1.5}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Tables réservées au serveur.
ALTER TABLE public.wipp_nearby_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_nearby_search_guard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_nearby_presence, public.wipp_nearby_search_guard FROM PUBLIC, anon, authenticated;
