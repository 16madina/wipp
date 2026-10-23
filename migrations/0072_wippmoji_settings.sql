-- WIPP Studio settings editable without a new app version (prices shown, characters included per purchase).
CREATE TABLE IF NOT EXISTS public.wippmoji_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wippmoji_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.wippmoji_settings (key, value) VALUES
  ('prices', '{"moji": {"5": "4,99 $ CAD", "10": "7,99 $ CAD"}, "pop": {"3": "4,99 $ CAD", "7": "9,99 $ CAD"}}'),
  ('character_limit', '2')
ON CONFLICT (key) DO NOTHING;
