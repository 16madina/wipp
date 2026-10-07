-- Suivi des signalements de contenu (stories, profils, annonces, boutiques, groupes, messages) dans l'Admin.
-- NON DESTRUCTIF : trois colonnes en plus, les anciens signalements restent « open ».
ALTER TABLE public.wipp_content_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text;
CREATE INDEX IF NOT EXISTS wipp_content_reports_status_idx ON public.wipp_content_reports (status, created_at DESC);
