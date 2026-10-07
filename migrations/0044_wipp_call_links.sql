-- Liens d'appel (wippapp.com/c/<code>). NON DESTRUCTIVE.
-- Seule l'empreinte SHA-256 du code est stockée. L'appel lui-même réutilise les tables d'appel de groupe
-- (wipp_group_calls.chat_id = 'link_<id>'), sans conversation associée.

CREATE TABLE IF NOT EXISTS public.wipp_call_links (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_call_links_owner ON public.wipp_call_links (owner_id, created_at DESC);

-- Server-only table (the API uses the service connection); no direct client access.
ALTER TABLE public.wipp_call_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_call_links FROM PUBLIC, anon, authenticated;
