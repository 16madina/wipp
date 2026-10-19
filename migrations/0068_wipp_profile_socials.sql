-- Links to the person's social networks, shown as icons on the profile (TikTok, Instagram, Snapchat, Facebook).
-- Only handles the owner typed themselves: { "tiktok": "name", "instagram": "name", ... }. Public, like the bio.

ALTER TABLE public.wipp_profiles
  ADD COLUMN IF NOT EXISTS socials JSONB;

ALTER TABLE public.wipp_profiles
  DROP CONSTRAINT IF EXISTS wipp_profiles_socials_size;
ALTER TABLE public.wipp_profiles
  ADD CONSTRAINT wipp_profiles_socials_size CHECK (socials IS NULL OR (jsonb_typeof(socials) = 'object' AND pg_column_size(socials) <= 600));

CREATE OR REPLACE VIEW public.wipp_public_profiles WITH (security_invoker = true) AS
  SELECT id, username, display_name, avatar_url, bio, e2e_public_jwk, role, motto, socials
  FROM public.wipp_profiles;

-- Column-level privileges (wipp_profiles grants are per column): the owner can read/update it.
GRANT SELECT (socials), UPDATE (socials) ON public.wipp_profiles TO authenticated;
