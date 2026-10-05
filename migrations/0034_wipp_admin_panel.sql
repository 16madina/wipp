-- Admin panel: moderator role, account suspension, push templates, push log, audit trail.
-- NON-DESTRUCTIVE: new columns / tables only; wipp_me() gains "not suspended".

-- 1. Roles: user | moderator | admin (role is TEXT; no check existed). Suspension of an account.
ALTER TABLE public.wipp_profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by TEXT;

ALTER TABLE public.wipp_profiles DROP CONSTRAINT IF EXISTS wipp_profiles_role_check;
ALTER TABLE public.wipp_profiles ADD CONSTRAINT wipp_profiles_role_check
  CHECK (role IS NULL OR role IN ('user', 'moderator', 'admin'));

-- A suspended account has NO identity for row-level security: every direct read/write stops.
CREATE OR REPLACE FUNCTION wipp_private.wipp_me()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT p.id
  FROM public.wipp_profiles p
  WHERE p.firebase_uid = NULLIF(pg_catalog.btrim(auth.jwt()->>'sub'), '')
    AND p.suspended_at IS NULL
  LIMIT 1
$function$;

-- 2. Editable push templates (welcome, warning, promotion, new emojis…).
CREATE TABLE IF NOT EXISTS public.wipp_admin_push_templates (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 240),
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

INSERT INTO public.wipp_admin_push_templates (id, label, title, body, sort) VALUES
  ('welcome', 'Bienvenue', 'Bienvenue sur WIPP 👋', 'Ton compte est prêt. Connecte-toi avec tes proches sans partager ton numéro.', 1),
  ('warning_photo', 'Avertissement photo', 'Avertissement de la modération', 'Une photo que tu as publiée ne respecte pas les règles de WIPP. Merci de la retirer.', 2),
  ('promotion', 'Promotion', 'Une surprise t’attend 🎁', 'Découvre les nouveautés WIPP cette semaine dans l’application.', 3),
  ('new_emojis', 'Nouveaux émojis', 'Nouveaux émojis disponibles ✨', 'De nouveaux émojis et stickers sont arrivés. Essaie-les dans tes conversations !', 4)
ON CONFLICT (id) DO NOTHING;

-- 3. What was sent, by whom, to whom.
CREATE TABLE IF NOT EXISTS public.wipp_admin_push_log (
  id TEXT PRIMARY KEY,
  sender_id TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  target TEXT NOT NULL CHECK (target IN ('all', 'user')),
  target_profile_id TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Audit trail of staff actions.
CREATE TABLE IF NOT EXISTS public.wipp_admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wipp_admin_audit_created ON public.wipp_admin_audit (created_at DESC);

-- Server-only tables.
ALTER TABLE public.wipp_admin_push_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_admin_push_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_admin_push_templates, public.wipp_admin_push_log, public.wipp_admin_audit FROM anon, authenticated;
