-- « Nos services » on a business card: [{"name": "Coupes", "photo": "<owner>/…jpg"}, …] (max 12).
-- NON DESTRUCTIVE: one new column with an empty default.

ALTER TABLE public.wipp_business_cards
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;
