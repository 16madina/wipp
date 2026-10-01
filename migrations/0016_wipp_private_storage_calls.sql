-- Additive. Requires 0014 (groups/stories) and 0015 (close friends, ended_at).
-- Private objects stay unread by URL knowledge: signed URLs succeed only when these policies allow SELECT.
-- No service role is granted to the client.

CREATE OR REPLACE FUNCTION public.wipp_lot16_can_read_private(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR public.wipp_my_profile_id() IS NULL THEN false
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND split_part(p_name, '/', 2) = public.wipp_my_profile_id()
      THEN true
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND EXISTS (
        SELECT 1
        FROM wipp_stories s
        WHERE s.deleted_at IS NULL
          AND s.expires_at > now()
          AND s.author_id = split_part(p_name, '/', 2)
          AND (
            s.media_url = p_name
            OR s.media_url LIKE p_name || '%'
          )
          AND (
            (s.audience = 'contacts' AND public.wipp_lot7_is_contact(s.author_id, public.wipp_my_profile_id()))
            OR (s.audience = 'close' AND public.wipp_lot15_is_close(s.author_id, public.wipp_my_profile_id()))
          )
      )
      THEN true
    WHEN split_part(p_name, '/', 1) = 'groups'
      AND EXISTS (
        SELECT 1 FROM wipp_chat_members m
        WHERE m.chat_id = split_part(p_name, '/', 2)
          AND m.profile_id = public.wipp_my_profile_id()
      )
      AND NOT EXISTS (
        SELECT 1 FROM wipp_group_bans b
        WHERE b.chat_id = split_part(p_name, '/', 2)
          AND b.profile_id = public.wipp_my_profile_id()
      )
      THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot16_can_write_private(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR public.wipp_my_profile_id() IS NULL THEN false
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND split_part(p_name, '/', 2) = public.wipp_my_profile_id()
      THEN true
    WHEN split_part(p_name, '/', 1) = 'groups'
      AND EXISTS (
        SELECT 1 FROM wipp_chat_members m
        WHERE m.chat_id = split_part(p_name, '/', 2)
          AND m.profile_id = public.wipp_my_profile_id()
      )
      AND NOT EXISTS (
        SELECT 1 FROM wipp_group_bans b
        WHERE b.chat_id = split_part(p_name, '/', 2)
          AND b.profile_id = public.wipp_my_profile_id()
      )
      THEN true
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.wipp_lot16_can_read_private(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot16_can_write_private(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipp_lot16_can_read_private(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot16_can_write_private(text) TO authenticated;

CREATE TABLE IF NOT EXISTS wipp_group_calls (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wipp_group_call_members (
  call_id TEXT NOT NULL REFERENCES wipp_group_calls(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'invited', 'ringing', 'joining', 'joined', 'declined', 'left', 'disconnected', 'reconnecting'
  )),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (call_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_group_calls_chat ON wipp_group_calls (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wipp_group_call_members_profile ON wipp_group_call_members (profile_id, state);

ALTER TABLE wipp_group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_group_call_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wipp_group_calls_member_read ON wipp_group_calls;
CREATE POLICY wipp_group_calls_member_read ON wipp_group_calls
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wipp_chat_members m
      WHERE m.chat_id = wipp_group_calls.chat_id
        AND m.profile_id = public.wipp_my_profile_id()
    )
    AND NOT EXISTS (
      SELECT 1 FROM wipp_group_bans b
      WHERE b.chat_id = wipp_group_calls.chat_id
        AND b.profile_id = public.wipp_my_profile_id()
    )
  );

DROP POLICY IF EXISTS wipp_group_call_members_read ON wipp_group_call_members;
CREATE POLICY wipp_group_call_members_read ON wipp_group_call_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wipp_group_calls c
      JOIN wipp_chat_members m ON m.chat_id = c.chat_id
      WHERE c.id = wipp_group_call_members.call_id
        AND m.profile_id = public.wipp_my_profile_id()
    )
  );

-- No INSERT/UPDATE/DELETE policies: only the server role (not the Expo bundle) writes call rows.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage schema absent — object policies skipped';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('wipp-public-media', 'wipp-public-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('wipp-private-media', 'wipp-private-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

  EXECUTE 'DROP POLICY IF EXISTS wipp_private_read ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_private_insert ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_private_update ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_private_delete ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_public_read ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_public_insert ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_public_update ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS wipp_public_delete ON storage.objects';

  EXECUTE $pol$
    CREATE POLICY wipp_private_read ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'wipp-private-media'
      AND public.wipp_lot16_can_read_private(name)
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_private_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'wipp-private-media'
      AND public.wipp_lot16_can_write_private(name)
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_private_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'wipp-private-media'
      AND owner = auth.uid()
      AND public.wipp_lot16_can_write_private(name)
    )
    WITH CHECK (
      bucket_id = 'wipp-private-media'
      AND public.wipp_lot16_can_write_private(name)
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_private_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'wipp-private-media'
      AND owner = auth.uid()
      AND public.wipp_lot16_can_write_private(name)
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_public_read ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'wipp-public-media'
      AND split_part(name, '/', 1) IN ('listings', 'events', 'business', 'shops')
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_public_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'wipp-public-media'
      AND split_part(name, '/', 1) IN ('listings', 'events', 'business', 'shops')
      AND split_part(name, '/', 2) = public.wipp_my_profile_id()
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_public_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'wipp-public-media'
      AND owner = auth.uid()
      AND split_part(name, '/', 2) = public.wipp_my_profile_id()
    )
    WITH CHECK (
      bucket_id = 'wipp-public-media'
      AND split_part(name, '/', 2) = public.wipp_my_profile_id()
    )
  $pol$;

  EXECUTE $pol$
    CREATE POLICY wipp_public_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'wipp-public-media'
      AND owner = auth.uid()
      AND split_part(name, '/', 2) = public.wipp_my_profile_id()
    )
  $pol$;
END $$;
