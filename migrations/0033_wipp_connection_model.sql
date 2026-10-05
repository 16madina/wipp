-- One WIPP connection model for every way of meeting someone (search, QR, temporary QR, WIPP Touch):
-- permanent or ephemeral, with a server-computed expiry, a real status, and a consent-based upgrade.
-- NON-DESTRUCTIVE: existing rows become permanent / active / no expiry (column defaults).
-- Check constraints are only RELAXED (more allowed values); no row is deleted or rewritten.

BEGIN;

-- 1. wipp_connections ---------------------------------------------------------------
ALTER TABLE public.wipp_connections
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS upgrade_requested_by TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upgrade_requested_at TIMESTAMPTZ;

ALTER TABLE public.wipp_connections DROP CONSTRAINT IF EXISTS wipp_connections_connection_type_check;
ALTER TABLE public.wipp_connections ADD CONSTRAINT wipp_connections_connection_type_check
  CHECK (connection_type IN ('permanent', 'ephemeral'));

-- status was CHECK (status = 'active'): now active | expired | ended.
ALTER TABLE public.wipp_connections DROP CONSTRAINT IF EXISTS wipp_connections_status_check;
ALTER TABLE public.wipp_connections ADD CONSTRAINT wipp_connections_status_check
  CHECK (status IN ('active', 'expired', 'ended'));

-- via was request | qr | touch: add temp_qr.
ALTER TABLE public.wipp_connections DROP CONSTRAINT IF EXISTS wipp_connections_via_check;
ALTER TABLE public.wipp_connections ADD CONSTRAINT wipp_connections_via_check
  CHECK (via IN ('request', 'qr', 'temp_qr', 'touch'));

-- An ephemeral connection always has an expiry; a permanent one never does.
ALTER TABLE public.wipp_connections DROP CONSTRAINT IF EXISTS wipp_connections_expiry_matches_type;
ALTER TABLE public.wipp_connections ADD CONSTRAINT wipp_connections_expiry_matches_type
  CHECK ((connection_type = 'permanent' AND expires_at IS NULL) OR (connection_type = 'ephemeral' AND expires_at IS NOT NULL));

CREATE INDEX IF NOT EXISTS wipp_connections_active_expiry
  ON public.wipp_connections (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

-- 2. "Is a contact" everywhere in the database = active AND not expired ------------------
CREATE OR REPLACE FUNCTION wipp_private.wipp_viewer_is_contact(p_other text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me text := public.wipp_my_profile_id();
BEGIN
  IF me IS NULL OR p_other IS NULL OR me = p_other THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.wipp_connections c
    WHERE c.user_a = least(me, p_other)
      AND c.user_b = greatest(me, p_other)
      AND c.status = 'active'
      AND (c.expires_at IS NULL OR c.expires_at > now())
  );
EXCEPTION WHEN undefined_column OR undefined_table THEN
  RETURN false;
END
$function$;

-- 3. Temporary QR: the connection duration offered by the issuer (separate from the QR's own 75 s) -----
ALTER TABLE public.wipp_qr_tokens
  ADD COLUMN IF NOT EXISTS connection_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS offer_resolved_at TIMESTAMPTZ;

ALTER TABLE public.wipp_qr_tokens DROP CONSTRAINT IF EXISTS wipp_qr_tokens_connection_minutes_check;
ALTER TABLE public.wipp_qr_tokens ADD CONSTRAINT wipp_qr_tokens_connection_minutes_check
  CHECK (connection_minutes IS NULL OR connection_minutes BETWEEN 15 AND 43200);

-- 4. WIPP Touch: one side proposes the connection type, the other confirms -------------------------
ALTER TABLE public.wipp_touch_sessions
  ADD COLUMN IF NOT EXISTS proposal_type TEXT,
  ADD COLUMN IF NOT EXISTS proposal_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS proposed_by_session TEXT;

ALTER TABLE public.wipp_touch_sessions DROP CONSTRAINT IF EXISTS wipp_touch_sessions_state_check;
ALTER TABLE public.wipp_touch_sessions ADD CONSTRAINT wipp_touch_sessions_state_check CHECK (state IN (
  'waiting', 'bumped', 'candidate', 'agreed', 'ambiguous', 'unavailable',
  'connected', 'already_connected', 'declined', 'expired', 'cancelled', 'failed'
));

COMMIT;
