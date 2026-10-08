-- Clé « reçu » : permet au module de notification de l'iPhone (app fermée) de dire « ce message est
-- arrivé » (deux points gris). Elle ne sert QU'À ça : ni lire, ni envoyer, ni modifier autre chose.
-- Seul le hachage est stocké. NON DESTRUCTIF.
CREATE TABLE IF NOT EXISTS public.wipp_delivery_keys (
  key_hash text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS wipp_delivery_keys_profile_idx ON public.wipp_delivery_keys (profile_id);
ALTER TABLE public.wipp_delivery_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_delivery_keys FROM anon, authenticated;
