-- Followers of a business card ("S'abonner"). NON DESTRUCTIVE: new table only.
-- Read and written through the WIPP API (service connection); no direct client access.

CREATE TABLE IF NOT EXISTS public.wipp_business_follows (
  card_id uuid NOT NULL REFERENCES public.wipp_business_cards(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_business_follows_profile ON public.wipp_business_follows (profile_id, created_at DESC);

ALTER TABLE public.wipp_business_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_business_follows FROM PUBLIC, anon, authenticated;
