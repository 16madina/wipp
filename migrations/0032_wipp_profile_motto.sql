-- Personal phrase shown on the profile card (formerly the fixed "Good Vibes Only").
-- Max 40 characters, editable by the owner (profiles_update_own), visible publicly.

ALTER TABLE public.wipp_profiles
  ADD COLUMN IF NOT EXISTS motto TEXT;

ALTER TABLE public.wipp_profiles
  DROP CONSTRAINT IF EXISTS wipp_profiles_motto_len;
ALTER TABLE public.wipp_profiles
  ADD CONSTRAINT wipp_profiles_motto_len CHECK (motto IS NULL OR char_length(motto) <= 40);

CREATE OR REPLACE VIEW public.wipp_public_profiles AS
  SELECT id, username, display_name, avatar_url, bio, e2e_public_jwk, role, motto
  FROM public.wipp_profiles;

-- Column-level privileges (wipp_profiles grants are per column): the owner can read/update it.
GRANT SELECT (motto), UPDATE (motto) ON public.wipp_profiles TO authenticated;
