-- Wippmoji Studio: personal animated stickers made from the user's own photo (Grok Imagine).
-- Only the server writes these tables (it runs as the database owner); RLS is on with no policy, so the
-- app cannot read or change them directly. The source photo is never stored.

CREATE TABLE IF NOT EXISTS public.wippmoji_avatars (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  style TEXT NOT NULL CHECK (style IN ('cartoon', 'realistic')),
  reference_path TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wippmoji_avatars_profile ON public.wippmoji_avatars (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wippmoji_packs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  avatar_id TEXT NOT NULL REFERENCES public.wippmoji_avatars(id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL DEFAULT 'expressions',
  language TEXT CHECK (language IN ('fr', 'en')),
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'partial', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS wippmoji_packs_profile ON public.wippmoji_packs (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wippmoji_assets (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES public.wippmoji_packs(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  expression_id TEXT NOT NULL,
  label TEXT,
  provider_request_id TEXT,
  media_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed', 'deleted')),
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_id, expression_id)
);
CREATE INDEX IF NOT EXISTS wippmoji_assets_pack ON public.wippmoji_assets (pack_id);

-- What each generation cost (estimated from the published per-second / per-image prices).
CREATE TABLE IF NOT EXISTS public.wippmoji_usage (
  id BIGSERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('reference', 'video')),
  provider TEXT NOT NULL,
  seconds NUMERIC,
  est_cost_usd NUMERIC(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wippmoji_usage_profile_day ON public.wippmoji_usage (profile_id, created_at DESC);

ALTER TABLE public.wippmoji_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wippmoji_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wippmoji_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wippmoji_usage ENABLE ROW LEVEL SECURITY;

-- Finished stickers are shared in conversations: public read by unguessable path, written only by the server.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wippmoji', 'wippmoji', true, 15728640, ARRAY['video/mp4', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
