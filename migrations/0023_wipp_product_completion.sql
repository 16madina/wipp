-- WIPP product completion: content reports + block enforcement on direct messages.
-- Apply AFTER 0022_wipp_story_overlay.sql. Do not execute until reviewed.
-- Does not modify 0018, 0019, 0020, 0021, or 0022.
-- Does not change Firebase auth, wipp_me(), or wipp_my_profile_id().
-- Groups reuse wipp_chats. A row in wipp_groups marks that chat as a group.
-- Block enforcement applies only when that row is absent (direct 1:1).

BEGIN;

CREATE TABLE IF NOT EXISTS public.wipp_content_reports (
  id text PRIMARY KEY,
  reporter_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  target_profile_id text,
  content_type text NOT NULL CHECK (content_type IN ('story', 'listing', 'profile', 'message', 'business_card')),
  content_id text NOT NULL CHECK (char_length(content_id) BETWEEN 1 AND 120),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 2 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_content_reports_created
  ON public.wipp_content_reports (created_at DESC);

ALTER TABLE public.wipp_content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wipp_content_reports_insert ON public.wipp_content_reports;
CREATE POLICY wipp_content_reports_insert ON public.wipp_content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = public.wipp_my_profile_id());

REVOKE ALL ON public.wipp_content_reports FROM PUBLIC, anon;
GRANT INSERT ON public.wipp_content_reports TO authenticated;

-- Ordinary users cannot read reports. No SELECT policy.
-- Reports store ids and a reason only. No message body.

CREATE OR REPLACE FUNCTION public.wipp_reject_blocked_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Group chats, including their system events, stay usable when two members
  -- have blocked each other. Direct 1:1 chats have no wipp_groups row.
  IF EXISTS (
    SELECT 1
    FROM public.wipp_groups g
    WHERE g.chat_id = NEW.chat_id
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.wipp_chat_members m
    JOIN public.wipp_blocks b
      ON (
        (b.blocker_id = NEW.sender_id AND b.blocked_id = m.profile_id)
        OR (b.blocker_id = m.profile_id AND b.blocked_id = NEW.sender_id)
      )
    WHERE m.chat_id = NEW.chat_id
      AND m.profile_id <> NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'blocked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.wipp_reject_blocked_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wipp_messages_reject_blocked ON public.wipp_messages;
CREATE TRIGGER wipp_messages_reject_blocked
  BEFORE INSERT ON public.wipp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.wipp_reject_blocked_message();

COMMIT;
