-- Words drawn by WIPP over each clip (not in the video), per-clip start offset, model used.
ALTER TABLE public.wippmoji_assets ADD COLUMN IF NOT EXISTS overlay_text TEXT;
ALTER TABLE public.wippmoji_assets ADD COLUMN IF NOT EXISTS start_offset REAL NOT NULL DEFAULT 0;
ALTER TABLE public.wippmoji_assets ADD COLUMN IF NOT EXISTS model TEXT;
INSERT INTO public.wippmoji_settings (key, value) VALUES
  ('models', '{"moji": "grok-imagine-video-1.5", "pop": "grok-imagine-video-1.5"}'),
  ('start_offset', '{"moji": 0, "pop": 0}')
ON CONFLICT (key) DO NOTHING;
