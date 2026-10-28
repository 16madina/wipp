-- In-app purchases (Apple / Google, checked through RevenueCat). One row per store transaction,
-- so a single payment can never unlock two packs.
CREATE TABLE IF NOT EXISTS public.wippmoji_purchases (
  transaction_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  pack_id TEXT,
  store TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wippmoji_purchases_profile ON public.wippmoji_purchases (profile_id, created_at DESC);
ALTER TABLE public.wippmoji_purchases ENABLE ROW LEVEL SECURITY;

-- Off until payments are tested: when true, every pack needs a verified purchase.
INSERT INTO public.wippmoji_settings (key, value) VALUES ('require_purchase', 'false')
ON CONFLICT (key) DO NOTHING;
