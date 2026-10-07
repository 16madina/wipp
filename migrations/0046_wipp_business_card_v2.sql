-- Business card v2: social links (Instagram, TikTok, Facebook), 3 tags, opening hours per day, verified badge.
-- NON DESTRUCTIVE: new nullable / defaulted columns only. is_verified is set by WIPP (admin), never by the owner.

ALTER TABLE public.wipp_business_cards
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS week_hours jsonb,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wipp_business_cards.week_hours IS
  'Opening hours per day: {"mon":{"o":"09:00","c":"18:00"},"sun":null,...}. Null = not given (free text in hours).';
COMMENT ON COLUMN public.wipp_business_cards.is_verified IS 'Blue badge, granted by WIPP after checking the business.';
