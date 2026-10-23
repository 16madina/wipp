-- Wippmoji files (reference image, sticker clips) kept in the database: the server has no storage key.
-- Served publicly by unguessable path at /wm/<path>.
CREATE TABLE IF NOT EXISTS public.wippmoji_media (
  path TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wippmoji_media ENABLE ROW LEVEL SECURITY;
