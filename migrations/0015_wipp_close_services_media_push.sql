-- Additive Lot final. Does not delete rows.
-- Close friends, verified local services (empty), private media gate, durable push dedupe.

ALTER TABLE wipp_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE wipp_call_invites ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

DO $$
DECLARE r record;
BEGIN
  IF to_regclass('public.wipp_stories') IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.wipp_stories'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%audience%'
  LOOP
    EXECUTE format('ALTER TABLE wipp_stories DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE wipp_stories
    ADD CONSTRAINT wipp_stories_audience_check
    CHECK (audience IN ('contacts', 'only_me', 'close'));
END $$;

CREATE TABLE IF NOT EXISTS wipp_close_friends (
  owner_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id),
  CHECK (owner_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS wipp_local_services (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_local_services_search
  ON wipp_local_services (active, category, city);

CREATE TABLE IF NOT EXISTS wipp_push_dedupe (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.wipp_lot15_is_close(owner text, friend text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM wipp_close_friends f
    WHERE f.owner_id = owner AND f.friend_id = friend
  )
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_publish_story(p_kind text, p_body text, p_media text, p_audience text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  sid text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_audience NOT IN ('contacts', 'only_me', 'close') THEN RAISE EXCEPTION 'audience'; END IF;
  IF p_kind NOT IN ('text', 'image', 'video') THEN RAISE EXCEPTION 'kind'; END IF;
  sid := 'sty_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO wipp_stories (id, author_id, kind, body, media_url, audience, expires_at)
  VALUES (sid, me, p_kind, left(coalesce(p_body, ''), 2000), p_media, p_audience, now() + interval '24 hours');
  RETURN sid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_stories() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id,
      'author_id', s.author_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'kind', s.kind,
      'body', s.body,
      'media_url', s.media_url,
      'audience', s.audience,
      'created_at', s.created_at,
      'expires_at', s.expires_at,
      'views', (SELECT count(*) FROM wipp_story_views v WHERE v.story_id = s.id)
    ) ORDER BY s.created_at DESC)
    FROM wipp_stories s
    JOIN wipp_profiles p ON p.id = s.author_id
    WHERE s.deleted_at IS NULL
      AND s.expires_at > now()
      AND (
        s.author_id = me
        OR (s.audience = 'contacts' AND public.wipp_lot7_is_contact(s.author_id, me))
        OR (s.audience = 'close' AND public.wipp_lot15_is_close(s.author_id, me))
      )
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_view_story(p_id text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  s wipp_stories%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT * INTO s FROM wipp_stories WHERE id = p_id AND deleted_at IS NULL AND expires_at > now();
  IF s.id IS NULL THEN RETURN 'missing'; END IF;
  IF s.author_id = me THEN RETURN 'owner'; END IF;
  IF s.audience = 'only_me' THEN RETURN 'forbidden'; END IF;
  IF s.audience = 'contacts' AND NOT public.wipp_lot7_is_contact(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  IF s.audience = 'close' AND NOT public.wipp_lot15_is_close(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  INSERT INTO wipp_story_views (story_id, viewer_id) VALUES (s.id, me) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_set_close(p_friend text, p_on boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_friend IS NULL OR p_friend = me THEN RETURN 'forbidden'; END IF;
  IF NOT public.wipp_lot7_is_contact(me, p_friend) THEN RETURN 'not_contact'; END IF;
  IF p_on THEN
    INSERT INTO wipp_close_friends (owner_id, friend_id) VALUES (me, p_friend) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM wipp_close_friends WHERE owner_id = me AND friend_id = p_friend;
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_close_friends() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) ORDER BY p.display_name)
    FROM wipp_close_friends f
    JOIN wipp_profiles p ON p.id = f.friend_id
    WHERE f.owner_id = me
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_services(p_q text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'category', s.category,
    'name', s.name,
    'country', s.country,
    'city', s.city,
    'address', s.address,
    'phone', s.phone,
    'hours', s.hours,
    'source', s.source
  ) ORDER BY s.city, s.name), '[]'::jsonb)
  FROM wipp_local_services s
  WHERE s.active
    AND s.verified_at IS NOT NULL
    AND (
      nullif(trim(coalesce(p_q, '')), '') IS NULL
      OR s.name ILIKE '%' || trim(p_q) || '%'
      OR s.city ILIKE '%' || trim(p_q) || '%'
      OR s.category ILIKE '%' || trim(p_q) || '%'
    )
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_claim_push(p_event text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inserted text;
BEGIN
  IF p_event IS NULL OR char_length(p_event) < 2 THEN RETURN false; END IF;
  INSERT INTO wipp_push_dedupe (event_id) VALUES (left(p_event, 160))
  ON CONFLICT DO NOTHING
  RETURNING event_id INTO inserted;
  RETURN inserted IS NOT NULL;
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot15_is_close(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot15_set_close(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot15_close_friends() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot15_services(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot15_claim_push(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_set_close(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_close_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_services(text) TO authenticated;

ALTER TABLE wipp_close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_local_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_push_dedupe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wipp_close_own ON wipp_close_friends;
CREATE POLICY wipp_close_own ON wipp_close_friends FOR SELECT TO authenticated
  USING (owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_services_verified ON wipp_local_services;
CREATE POLICY wipp_services_verified ON wipp_local_services FOR SELECT TO authenticated
  USING (active AND verified_at IS NOT NULL);

DROP POLICY IF EXISTS wipp_stories_read ON wipp_stories;
CREATE POLICY wipp_stories_read ON wipp_stories FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND expires_at > now() AND (
      author_id = public.wipp_my_profile_id()
      OR (audience = 'contacts' AND public.wipp_lot7_is_contact(author_id, public.wipp_my_profile_id()))
      OR (audience = 'close' AND public.wipp_lot15_is_close(author_id, public.wipp_my_profile_id()))
    )
  );

-- Knowing the object path is not access. Stories: contacts / close / only_me.
-- Groups: current members only. Former members cannot SELECT, so they cannot mint a signed URL.
-- Writes stay in the author's folder or the caller's current group. Update/delete also require storage.owner.

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
          AND (s.media_url = p_name OR s.media_url LIKE p_name || '%')
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
