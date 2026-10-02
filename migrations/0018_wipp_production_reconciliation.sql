-- WIPP production reconciliation.
-- Replaces the effect of 0012–0017 on the hosted schema. Do not also apply 0012–0017.
-- Does not replace wipp_private.wipp_me() or the body of public.wipp_my_profile_id().
-- Does not recreate wipp_groups, wipp_group_bans, wipp_group_invites, wipp_chats, or wipp_chat_members.
-- No DROP TABLE, no TRUNCATE, and no DELETE/UPDATE of existing rows at migration time.
-- DELETE statements below live only inside functions. They run later, when an authenticated
-- user calls that function. They are not executed while this file is applied.
--
-- Identity preserved:
--   auth.uid() -> wipp_profiles.auth_user_id -> wipp_profiles.id
--   via wipp_private.wipp_me(), already wrapped by public.wipp_my_profile_id().
--
-- Nearby, push dedupe, and group-call writes are server-only.
-- RLS is enabled and no client write policy is created. The table owner / service_role
-- bypasses RLS (same posture as migrations/0009). FORCE ROW LEVEL SECURITY is not used:
-- it would block those server writes and the SECURITY DEFINER group functions.
--
-- Default privileges on a hosted Supabase project can GRANT EXECUTE / table rights
-- directly to authenticated. Every object this file creates is revoked from
-- PUBLIC, anon and authenticated, then granted again only where the class requires it.
-- Function classes: A client RPC, B RLS helper, C server only, D internal only.
--
-- Run this file alone. The wrapper is one transaction: a later error rolls back
-- the preflight's transaction, including every change after it.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight. Read-only. First statement inside the transaction.
--    auth_user_id must be uuid because wipp_private.wipp_me() compares it to auth.uid().
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  rel text;
  col text;
  want text;
  actual text;
BEGIN
  IF to_regnamespace('wipp_private') IS NULL THEN
    RAISE EXCEPTION 'preflight: schema wipp_private is missing';
  END IF;
  IF to_regprocedure('wipp_private.wipp_me()') IS NULL THEN
    RAISE EXCEPTION 'preflight: wipp_private.wipp_me() is missing';
  END IF;
  IF to_regprocedure('public.wipp_my_profile_id()') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.wipp_my_profile_id() is missing';
  END IF;
  IF to_regclass('public.wipp_call_invites') IS NULL THEN
    RAISE EXCEPTION 'preflight: table public.wipp_call_invites is missing';
  END IF;

  FOR rel, col, want IN
    SELECT v.rel, v.col, v.want
    FROM (VALUES
      ('wipp_profiles', 'id', 'text'),
      ('wipp_profiles', 'auth_user_id', 'uuid'),
      ('wipp_chats', 'id', 'text'),
      ('wipp_chat_members', 'chat_id', 'text'),
      ('wipp_chat_members', 'profile_id', 'text'),
      ('wipp_chat_members', 'joined_at', 'timestamp with time zone'),
      ('wipp_groups', 'chat_id', 'text'),
      ('wipp_groups', 'owner_id', 'text'),
      ('wipp_groups', 'name', 'text'),
      ('wipp_groups', 'invites_enabled', 'boolean'),
      ('wipp_group_bans', 'chat_id', 'text'),
      ('wipp_group_bans', 'profile_id', 'text'),
      ('wipp_group_invites', 'id', 'uuid'),
      ('wipp_group_invites', 'chat_id', 'text'),
      ('wipp_group_invites', 'token_hash', 'text'),
      ('wipp_group_invites', 'created_by', 'text'),
      ('wipp_group_invites', 'expires_at', 'timestamp with time zone'),
      ('wipp_group_invites', 'max_uses', 'integer'),
      ('wipp_group_invites', 'uses', 'integer'),
      ('wipp_group_invites', 'revoked_at', 'timestamp with time zone'),
      ('wipp_connections', 'user_a', 'text'),
      ('wipp_connections', 'user_b', 'text'),
      ('wipp_messages', 'id', 'text'),
      ('wipp_messages', 'chat_id', 'text'),
      ('wipp_messages', 'sender_id', 'text'),
      ('wipp_messages', 'body', 'text'),
      ('wipp_messages', 'client_id', 'text'),
      ('wipp_messages', 'reply_to', 'text'),
      ('wipp_push_tokens', 'profile_id', 'text'),
      ('wipp_push_tokens', 'token', 'text')
    ) AS v(rel, col, want)
  LOOP
    SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
      INTO actual
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = rel
      AND a.attname = col
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF actual IS NULL THEN
      RAISE EXCEPTION 'preflight: public.%.% is missing', rel, col;
    END IF;
    IF actual IS DISTINCT FROM want THEN
      RAISE EXCEPTION 'preflight: public.%.% type is %, expected % — no automatic cast', rel, col, actual, want;
    END IF;
  END LOOP;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Identity grants. Function bodies are not replaced.
--    Revoke authenticated as well: a direct default grant survives REVOKE FROM PUBLIC.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.wipp_my_profile_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_my_profile_id() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Columns missing on objects that already exist. Text keys stay text.
-- ---------------------------------------------------------------------------

ALTER TABLE public.wipp_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.wipp_call_invites ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE public.wipp_messages ADD COLUMN IF NOT EXISTS mentions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.wipp_messages ADD COLUMN IF NOT EXISTS system_event TEXT;

ALTER TABLE public.wipp_push_tokens ADD COLUMN IF NOT EXISTS installation_id TEXT;
ALTER TABLE public.wipp_push_tokens ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
ALTER TABLE public.wipp_chat_members ADD COLUMN IF NOT EXISTS generic_notify BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS wipp_push_tokens_install
  ON public.wipp_push_tokens (profile_id, installation_id)
  WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS wipp_push_tokens_token
  ON public.wipp_push_tokens (token)
  WHERE disabled_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. New tables. wipp_groups / bans / invites are intentionally not created.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wipp_group_admins (
  chat_id TEXT NOT NULL REFERENCES public.wipp_chats(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.wipp_stories (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image', 'video')),
  body TEXT,
  media_url TEXT,
  audience TEXT NOT NULL CHECK (audience IN ('contacts', 'close', 'only_me')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_stories_feed
  ON public.wipp_stories (expires_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.wipp_story_views (
  story_id TEXT NOT NULL REFERENCES public.wipp_stories(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.wipp_close_friends (
  owner_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id),
  CHECK (owner_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS public.wipp_listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'goods',
  price_label TEXT,
  city TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_listings_active
  ON public.wipp_listings (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wipp_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  photo_url TEXT,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wipp_saves (
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('listing', 'event', 'business')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, kind, target_id)
);

CREATE TABLE IF NOT EXISTS public.wipp_local_services (
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
  ON public.wipp_local_services (active, category, city);

CREATE TABLE IF NOT EXISTS public.wipp_push_dedupe (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only. No client policy: the token hash must not be readable by the Expo client.
-- src/lib/messaging/nearby.ts writes through the database owner connection.
CREATE TABLE IF NOT EXISTS public.wipp_nearby_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_nearby_sessions_profile
  ON public.wipp_nearby_sessions (profile_id, expires_at);

CREATE INDEX IF NOT EXISTS wipp_nearby_sessions_expires
  ON public.wipp_nearby_sessions (expires_at);

-- Server-write. Clients may only read a call they still belong to.
CREATE TABLE IF NOT EXISTS public.wipp_group_calls (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES public.wipp_chats(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_by TEXT NOT NULL REFERENCES public.wipp_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.wipp_group_call_members (
  call_id TEXT NOT NULL REFERENCES public.wipp_group_calls(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id),
  state TEXT NOT NULL CHECK (state IN (
    'invited', 'ringing', 'joining', 'joined', 'declined', 'left', 'disconnected', 'reconnecting'
  )),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (call_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_group_calls_chat
  ON public.wipp_group_calls (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wipp_group_call_members_profile
  ON public.wipp_group_call_members (profile_id, state);

-- ---------------------------------------------------------------------------
-- 4. RLS decisions
--    CLIENT READ            stories, views, close friends, listings, events,
--                           services (verified only), saves, groups, admins,
--                           group calls
--    CLIENT WRITE           saves (own rows only)
--    SERVER ONLY            nearby, push dedupe, group bans, call writes
-- ---------------------------------------------------------------------------

ALTER TABLE public.wipp_group_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_local_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_push_dedupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_nearby_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_group_call_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_group_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_group_invites ENABLE ROW LEVEL SECURITY;

-- New tables: drop default client grants, then grant only the operations the app uses.
-- wipp_groups is an existing table. The client already selects it (native supa.ts).
-- This file only adds SELECT if missing. It does not REVOKE that table's current grants.
-- wipp_chats, wipp_chat_members and wipp_group_invites grants are left as they are.
REVOKE ALL ON TABLE public.wipp_group_admins FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_stories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_story_views FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_close_friends FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_listings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_saves FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_local_services FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_push_dedupe FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_nearby_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_group_calls FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_group_call_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.wipp_group_bans FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.wipp_group_admins TO authenticated;
GRANT SELECT ON TABLE public.wipp_stories TO authenticated;
GRANT SELECT ON TABLE public.wipp_story_views TO authenticated;
GRANT SELECT ON TABLE public.wipp_close_friends TO authenticated;
GRANT SELECT ON TABLE public.wipp_listings TO authenticated;
GRANT SELECT ON TABLE public.wipp_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wipp_saves TO authenticated;
GRANT SELECT ON TABLE public.wipp_local_services TO authenticated;
GRANT SELECT ON TABLE public.wipp_group_calls TO authenticated;
GRANT SELECT ON TABLE public.wipp_group_call_members TO authenticated;
GRANT SELECT ON TABLE public.wipp_groups TO authenticated;

GRANT ALL ON TABLE public.wipp_push_dedupe TO service_role;
GRANT ALL ON TABLE public.wipp_nearby_sessions TO service_role;
GRANT ALL ON TABLE public.wipp_group_calls TO service_role;
GRANT ALL ON TABLE public.wipp_group_call_members TO service_role;
GRANT ALL ON TABLE public.wipp_group_bans TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Self-bound helpers in wipp_private.
--    Policies call these. They derive the caller from wipp_my_profile_id().
--    None of them accepts a second profile id, so they cannot answer "are C and D related?".
--    wipp_private.wipp_me() is not modified.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wipp_private.wipp_current_user_is_banned(p_chat text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT public.wipp_my_profile_id() IS NOT NULL
    AND p_chat IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.wipp_group_bans b
      WHERE b.chat_id = p_chat
        AND b.profile_id = public.wipp_my_profile_id()
    )
$$;

CREATE OR REPLACE FUNCTION wipp_private.wipp_viewer_is_contact(p_other text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
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
  );
EXCEPTION WHEN undefined_column OR undefined_table THEN
  RETURN false;
END
$$;

-- True only when p_owner has added the current user. Not "did X add Y?".
CREATE OR REPLACE FUNCTION wipp_private.wipp_viewer_is_close_of(p_owner text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT public.wipp_my_profile_id() IS NOT NULL
    AND p_owner IS NOT NULL
    AND p_owner IS DISTINCT FROM public.wipp_my_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.wipp_close_friends f
      WHERE f.owner_id = p_owner
        AND f.friend_id = public.wipp_my_profile_id()
    )
$$;

-- Exact client path from storyObjectPath: stories/<current profile id>/<object id>.
-- Rejects http(s) URLs, extra segments, and a folder that is not the caller.
CREATE OR REPLACE FUNCTION wipp_private.wipp_own_story_media_path(p_media text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_my_profile_id();
  token text;
BEGIN
  IF me IS NULL OR p_media IS NULL THEN
    RETURN false;
  END IF;
  IF position('/' IN me) > 0 OR char_length(me) < 4 OR char_length(me) > 80 THEN
    RETURN false;
  END IF;
  IF position('://' IN p_media) > 0 OR position('..' IN p_media) > 0 OR left(p_media, 1) = '/' THEN
    RETURN false;
  END IF;
  token := split_part(p_media, '/', 3);
  RETURN p_media = 'stories/' || me || '/' || token
    AND token ~ '^[A-Za-z0-9_-]{4,80}$';
END
$$;

-- ---------------------------------------------------------------------------
-- 6. Functions. Final story audience is contacts | close | only_me.
--    wipp_lot7_me() only forwards to the existing profile resolver.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.wipp_lot7_me() RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT public.wipp_my_profile_id()
$$;

-- D internal. One argument must be the current user. A pair of other people returns false.
-- Policies do not call this. They call wipp_private.wipp_viewer_is_contact.
CREATE OR REPLACE FUNCTION public.wipp_lot7_is_contact(a text, b text) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_my_profile_id();
  other text;
BEGIN
  IF me IS NULL OR a IS NULL OR b IS NULL OR a = b THEN RETURN false; END IF;
  IF a IS DISTINCT FROM me AND b IS DISTINCT FROM me THEN RETURN false; END IF;
  other := CASE WHEN a = me THEN b ELSE a END;
  RETURN wipp_private.wipp_viewer_is_contact(other);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_is_admin(chat text, pid text) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wipp_groups g WHERE g.chat_id = chat AND g.owner_id = pid
  ) OR EXISTS (
    SELECT 1 FROM public.wipp_group_admins a WHERE a.chat_id = chat AND a.profile_id = pid
  )
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_sys(chat text, actor text, event text, label text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM set_config('wipp.lot7_sys', '1', true);
  INSERT INTO public.wipp_messages (id, chat_id, sender_id, body, system_event, mentions)
  VALUES ('m_' || replace(gen_random_uuid()::text, '-', ''), chat, actor, left(label, 280), event, '{}');
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_guard_system() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.system_event IS NOT NULL AND current_setting('wipp.lot7_sys', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'system_event_forbidden';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wipp_lot7_guard_system ON public.wipp_messages;
CREATE TRIGGER wipp_lot7_guard_system
  BEFORE INSERT OR UPDATE OF system_event ON public.wipp_messages
  FOR EACH ROW EXECUTE FUNCTION public.wipp_lot7_guard_system();

CREATE OR REPLACE FUNCTION public.wipp_lot7_create_group(p_name text, p_members text[]) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  cid text;
  m text;
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name'; END IF;
  cid := 'g_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_chats (id) VALUES (cid);
  INSERT INTO public.wipp_groups (chat_id, name, owner_id) VALUES (cid, left(trim(p_name), 80), me);
  INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (cid, me);
  INSERT INTO public.wipp_group_admins (chat_id, profile_id) VALUES (cid, me);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = me;
  PERFORM public.wipp_lot7_sys(cid, me, 'created', coalesce(dn, 'Quelqu’un') || ' a créé le groupe');
  IF p_members IS NOT NULL THEN
    FOREACH m IN ARRAY p_members LOOP
      IF m IS NULL OR m = me THEN CONTINUE; END IF;
      IF NOT public.wipp_lot7_is_contact(me, m) THEN CONTINUE; END IF;
      INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (cid, m) ON CONFLICT DO NOTHING;
      SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = m;
      PERFORM public.wipp_lot7_sys(cid, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
    END LOOP;
  END IF;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_add_member(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_group_bans WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'banned';
  END IF;
  IF NOT public.wipp_lot7_is_contact(me, p_member) THEN RETURN 'not_contact'; END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'already_member';
  END IF;
  INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (p_chat, p_member);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_remove_member(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
  owner text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT owner_id INTO owner FROM public.wipp_groups WHERE chat_id = p_chat;
  IF p_member = owner THEN RETURN 'is_owner'; END IF;
  DELETE FROM public.wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
  DELETE FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member;
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'removed', coalesce(dn, 'Un membre') || ' a été retiré');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_set_admin(p_chat text, p_member text, p_on boolean) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'not_member';
  END IF;
  IF p_on THEN
    INSERT INTO public.wipp_group_admins (chat_id, profile_id) VALUES (p_chat, p_member) ON CONFLICT DO NOTHING;
    SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'admin', coalesce(dn, 'Un membre') || ' est maintenant admin');
  ELSE
    IF p_member = (SELECT owner_id FROM public.wipp_groups WHERE chat_id = p_chat) THEN RETURN 'is_owner'; END IF;
    DELETE FROM public.wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
    SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'admin_off', coalesce(dn, 'Un membre') || ' n’est plus admin');
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_ban(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_member = (SELECT owner_id FROM public.wipp_groups WHERE chat_id = p_chat) THEN RETURN 'is_owner'; END IF;
  INSERT INTO public.wipp_group_bans (chat_id, profile_id) VALUES (p_chat, p_member) ON CONFLICT DO NOTHING;
  DELETE FROM public.wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
  DELETE FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_leave(p_chat text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  owner text;
  nxt text;
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN
    RETURN 'not_member';
  END IF;
  SELECT owner_id INTO owner FROM public.wipp_groups WHERE chat_id = p_chat;
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = me;
  IF owner = me THEN
    SELECT profile_id INTO nxt FROM public.wipp_chat_members
      WHERE chat_id = p_chat AND profile_id <> me
      ORDER BY joined_at ASC LIMIT 1;
    IF nxt IS NULL THEN
      DELETE FROM public.wipp_chats WHERE id = p_chat;
      RETURN 'deleted';
    END IF;
    UPDATE public.wipp_groups SET owner_id = nxt WHERE chat_id = p_chat;
    INSERT INTO public.wipp_group_admins (chat_id, profile_id) VALUES (p_chat, nxt) ON CONFLICT DO NOTHING;
  END IF;
  DELETE FROM public.wipp_group_admins WHERE chat_id = p_chat AND profile_id = me;
  DELETE FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'left', coalesce(dn, 'Un membre') || ' a quitté le groupe');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_rename(p_chat text, p_name text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wipp_groups SET name = left(trim(p_name), 80) WHERE chat_id = p_chat;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'renamed', 'Le nom du groupe a été modifié');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_post(p_chat text, p_body text, p_client text, p_reply text, p_mentions text[]) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  mid text;
  mention text;
  clean text[] := '{}';
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_groups WHERE chat_id = p_chat) THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_body IS NULL OR char_length(p_body) = 0 THEN RAISE EXCEPTION 'empty'; END IF;
  IF p_mentions IS NOT NULL THEN
    FOREACH mention IN ARRAY p_mentions LOOP
      IF EXISTS (
        SELECT 1 FROM public.wipp_chat_members mb
        WHERE mb.chat_id = p_chat AND mb.profile_id = mention
      ) THEN
        clean := array_append(clean, mention);
      END IF;
    END LOOP;
  END IF;
  SELECT id INTO mid FROM public.wipp_messages WHERE chat_id = p_chat AND client_id = p_client LIMIT 1;
  IF mid IS NOT NULL THEN RETURN mid; END IF;
  mid := 'm_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_messages (id, chat_id, sender_id, body, client_id, reply_to, mentions, system_event)
  VALUES (mid, p_chat, me, left(p_body, 8000), p_client, p_reply, clean, NULL);
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_invite(p_chat text, p_token text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_groups WHERE chat_id = p_chat AND invites_enabled) THEN
    RETURN 'closed';
  END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  -- id stays on the production default gen_random_uuid(). Do not write a text key.
  INSERT INTO public.wipp_group_invites (chat_id, token_hash, created_by, expires_at, max_uses)
  VALUES (p_chat, hash, me, now() + interval '7 days', 50);
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_join(p_token text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
  inv public.wipp_group_invites%ROWTYPE;
  g public.wipp_groups%ROWTYPE;
  n int;
  dn text;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('status', 'no_session'); END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO inv FROM public.wipp_group_invites WHERE token_hash = hash FOR UPDATE;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN RETURN jsonb_build_object('status', 'full'); END IF;
  SELECT * INTO g FROM public.wipp_groups WHERE chat_id = inv.chat_id;
  IF g.chat_id IS NULL OR NOT g.invites_enabled THEN RETURN jsonb_build_object('status', 'closed'); END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_group_bans b WHERE b.chat_id = g.chat_id AND b.profile_id = me) THEN
    RETURN jsonb_build_object('status', 'refused');
  END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = g.chat_id AND profile_id = me) THEN
    SELECT count(*) INTO n FROM public.wipp_chat_members WHERE chat_id = g.chat_id;
    RETURN jsonb_build_object('status', 'already_member', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
  END IF;
  UPDATE public.wipp_group_invites
  SET uses = uses + 1
  WHERE id = inv.id
    AND (max_uses IS NULL OR uses < max_uses);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'full');
  END IF;
  INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (g.chat_id, me);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = me;
  PERFORM public.wipp_lot7_sys(g.chat_id, me, 'joined', coalesce(dn, 'Un membre') || ' a rejoint');
  SELECT count(*) INTO n FROM public.wipp_chat_members WHERE chat_id = g.chat_id;
  RETURN jsonb_build_object('status', 'joined', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_peek(p_token text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
  inv public.wipp_group_invites%ROWTYPE;
  g public.wipp_groups%ROWTYPE;
  n int;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('status', 'no_session'); END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO inv FROM public.wipp_group_invites WHERE token_hash = hash;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN RETURN jsonb_build_object('status', 'full'); END IF;
  SELECT * INTO g FROM public.wipp_groups WHERE chat_id = inv.chat_id;
  IF g.chat_id IS NULL OR NOT g.invites_enabled THEN RETURN jsonb_build_object('status', 'closed'); END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_group_bans b WHERE b.chat_id = g.chat_id AND b.profile_id = me) THEN
    RETURN jsonb_build_object('status', 'refused');
  END IF;
  SELECT count(*) INTO n FROM public.wipp_chat_members WHERE chat_id = g.chat_id;
  IF EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = g.chat_id AND profile_id = me) THEN
    RETURN jsonb_build_object('status', 'already_member', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
END $$;

-- D internal. Refuses a question about two other people.
-- "Did this owner add me?" goes through the private helper.
-- "Did I add this friend?" stays on the caller's own rows.
CREATE OR REPLACE FUNCTION public.wipp_lot15_is_close(owner text, friend text) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_my_profile_id();
BEGIN
  IF me IS NULL OR owner IS NULL OR friend IS NULL OR owner = friend THEN
    RETURN false;
  END IF;
  IF owner IS DISTINCT FROM me AND friend IS DISTINCT FROM me THEN
    RETURN false;
  END IF;
  IF friend = me THEN
    RETURN wipp_private.wipp_viewer_is_close_of(owner);
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.wipp_close_friends f
    WHERE f.owner_id = me
      AND f.friend_id = friend
  );
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_publish_story(p_kind text, p_body text, p_media text, p_audience text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  sid text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_audience NOT IN ('contacts', 'only_me', 'close') THEN RAISE EXCEPTION 'audience'; END IF;
  IF p_kind NOT IN ('text', 'image', 'video') THEN RAISE EXCEPTION 'kind'; END IF;
  IF p_kind = 'text' AND btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'empty_story';
  END IF;
  IF p_kind IN ('image', 'video') THEN
    IF p_media IS NULL OR btrim(p_media) = '' THEN
      RAISE EXCEPTION 'media_required';
    END IF;
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN
      RAISE EXCEPTION 'media_path';
    END IF;
    p_media := btrim(p_media);
  ELSIF p_media IS NOT NULL AND btrim(p_media) <> '' THEN
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN
      RAISE EXCEPTION 'media_path';
    END IF;
    p_media := btrim(p_media);
  END IF;
  sid := 'sty_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_stories (id, author_id, kind, body, media_url, audience, expires_at)
  VALUES (sid, me, p_kind, left(coalesce(p_body, ''), 2000), p_media, p_audience, now() + interval '24 hours');
  RETURN sid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_stories() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
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
      'views', CASE
        WHEN s.author_id = me THEN (
          SELECT count(*) FROM public.wipp_story_views v WHERE v.story_id = s.id
        )
        ELSE NULL
      END
    ) ORDER BY s.created_at DESC)
    FROM public.wipp_stories s
    JOIN public.wipp_profiles p ON p.id = s.author_id
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  s public.wipp_stories%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT * INTO s FROM public.wipp_stories WHERE id = p_id AND deleted_at IS NULL AND expires_at > now();
  IF s.id IS NULL THEN RETURN 'missing'; END IF;
  IF s.author_id = me THEN RETURN 'owner'; END IF;
  IF s.audience = 'only_me' THEN RETURN 'forbidden'; END IF;
  IF s.audience = 'contacts' AND NOT public.wipp_lot7_is_contact(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  IF s.audience = 'close' AND NOT public.wipp_lot15_is_close(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  INSERT INTO public.wipp_story_views (story_id, viewer_id) VALUES (s.id, me) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_story_viewers(p_id text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_stories WHERE id = p_id AND author_id = me) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'viewer_id', v.viewer_id,
      'username', p.username,
      'display_name', p.display_name,
      'viewed_at', v.viewed_at
    ) ORDER BY v.viewed_at DESC)
    FROM public.wipp_story_views v
    JOIN public.wipp_profiles p ON p.id = v.viewer_id
    WHERE v.story_id = p_id
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_delete_story(p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE public.wipp_stories SET deleted_at = now() WHERE id = p_id AND author_id = me AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_set_close(p_friend text, p_on boolean) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_friend IS NULL OR p_friend = me THEN RETURN 'forbidden'; END IF;
  IF NOT public.wipp_lot7_is_contact(me, p_friend) THEN RETURN 'not_contact'; END IF;
  IF p_on THEN
    INSERT INTO public.wipp_close_friends (owner_id, friend_id) VALUES (me, p_friend) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.wipp_close_friends WHERE owner_id = me AND friend_id = p_friend;
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_close_friends() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
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
    FROM public.wipp_close_friends f
    JOIN public.wipp_profiles p ON p.id = f.friend_id
    WHERE f.owner_id = me
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_save_listing(p_title text, p_desc text, p_cat text, p_price text, p_city text, p_photo text, p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  lid text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_id IS NULL OR p_id = '' THEN
    lid := 'lst_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.wipp_listings (id, owner_id, title, description, category, price_label, city, photo_url)
    VALUES (lid, me, left(trim(p_title), 120), left(coalesce(p_desc, ''), 4000), left(coalesce(p_cat, 'goods'), 40), nullif(left(coalesce(p_price, ''), 40), ''), left(coalesce(p_city, ''), 80), p_photo);
    RETURN lid;
  END IF;
  UPDATE public.wipp_listings SET
    title = left(trim(p_title), 120),
    description = left(coalesce(p_desc, ''), 4000),
    category = left(coalesce(p_cat, 'goods'), 40),
    price_label = nullif(left(coalesce(p_price, ''), 40), ''),
    city = left(coalesce(p_city, ''), 80),
    photo_url = coalesce(p_photo, photo_url),
    updated_at = now()
  WHERE id = p_id AND owner_id = me AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_remove_listing(p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE public.wipp_listings SET status = 'removed', updated_at = now() WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_listings(p_q text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  q text := nullif(trim(coalesce(p_q, '')), '');
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', l.id, 'owner_id', l.owner_id, 'title', l.title, 'description', l.description,
      'category', l.category, 'price_label', l.price_label, 'city', l.city,
      'photo_url', l.photo_url, 'created_at', l.created_at, 'status', l.status,
      'username', p.username, 'display_name', p.display_name
    ) ORDER BY l.created_at DESC)
    FROM public.wipp_listings l
    JOIN public.wipp_profiles p ON p.id = l.owner_id
    WHERE (l.status = 'active' OR l.owner_id = me)
      AND (q IS NULL OR l.title ILIKE '%' || q || '%' OR l.description ILIKE '%' || q || '%'
           OR l.category ILIKE '%' || q || '%' OR l.city ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_save_event(p_title text, p_desc text, p_city text, p_place text, p_starts text, p_photo text, p_contact text, p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  eid text;
  starts timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  BEGIN
    starts := nullif(p_starts, '')::timestamptz;
  EXCEPTION WHEN others THEN
    starts := NULL;
  END;
  IF p_id IS NULL OR p_id = '' THEN
    eid := 'evt_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.wipp_events (id, owner_id, title, description, city, place, starts_at, photo_url, contact)
    VALUES (eid, me, left(trim(p_title), 120), left(coalesce(p_desc, ''), 4000), left(coalesce(p_city, ''), 80), left(coalesce(p_place, ''), 160), starts, p_photo, nullif(left(coalesce(p_contact, ''), 120), ''));
    RETURN eid;
  END IF;
  UPDATE public.wipp_events SET
    title = left(trim(p_title), 120),
    description = left(coalesce(p_desc, ''), 4000),
    city = left(coalesce(p_city, ''), 80),
    place = left(coalesce(p_place, ''), 160),
    starts_at = starts,
    photo_url = coalesce(p_photo, photo_url),
    contact = nullif(left(coalesce(p_contact, ''), 120), ''),
    updated_at = now()
  WHERE id = p_id AND owner_id = me AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_remove_event(p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE public.wipp_events SET status = 'removed', updated_at = now() WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_events(p_q text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  q text := nullif(trim(coalesce(p_q, '')), '');
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', e.id, 'owner_id', e.owner_id, 'title', e.title, 'description', e.description,
      'city', e.city, 'place', e.place, 'starts_at', e.starts_at, 'photo_url', e.photo_url,
      'contact', e.contact, 'status', e.status, 'username', p.username, 'display_name', p.display_name
    ) ORDER BY e.starts_at NULLS LAST, e.created_at DESC)
    FROM public.wipp_events e
    JOIN public.wipp_profiles p ON p.id = e.owner_id
    WHERE (e.status = 'active' OR e.owner_id = me)
      AND (q IS NULL OR e.title ILIKE '%' || q || '%' OR e.description ILIKE '%' || q || '%'
           OR e.city ILIKE '%' || q || '%' OR e.place ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot15_services(p_q text) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
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
  FROM public.wipp_local_services s
  WHERE s.active
    AND s.verified_at IS NOT NULL
    AND (
      nullif(trim(coalesce(p_q, '')), '') IS NULL
      OR s.name ILIKE '%' || trim(p_q) || '%'
      OR s.city ILIKE '%' || trim(p_q) || '%'
      OR s.category ILIKE '%' || trim(p_q) || '%'
    )
$$;

-- Server-only. Not granted to authenticated.
CREATE OR REPLACE FUNCTION public.wipp_lot15_claim_push(p_event text) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  inserted text;
BEGIN
  IF p_event IS NULL OR char_length(p_event) < 2 THEN RETURN false; END IF;
  INSERT INTO public.wipp_push_dedupe (event_id) VALUES (left(p_event, 160))
  ON CONFLICT DO NOTHING
  RETURNING event_id INTO inserted;
  RETURN inserted IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot16_can_read_private(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR public.wipp_my_profile_id() IS NULL THEN false
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND split_part(p_name, '/', 2) = public.wipp_my_profile_id()
      THEN true
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND EXISTS (
        SELECT 1
        FROM public.wipp_stories s
        WHERE s.deleted_at IS NULL
          AND s.expires_at > now()
          AND s.author_id = split_part(p_name, '/', 2)
          AND s.media_url = p_name
          AND (
            (s.audience = 'contacts' AND wipp_private.wipp_viewer_is_contact(s.author_id))
            OR (s.audience = 'close' AND wipp_private.wipp_viewer_is_close_of(s.author_id))
          )
      )
      THEN true
    WHEN split_part(p_name, '/', 1) = 'groups'
      AND EXISTS (
        SELECT 1 FROM public.wipp_chat_members m
        WHERE m.chat_id = split_part(p_name, '/', 2)
          AND m.profile_id = public.wipp_my_profile_id()
      )
      AND NOT wipp_private.wipp_current_user_is_banned(split_part(p_name, '/', 2))
      THEN true
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot16_can_write_private(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR public.wipp_my_profile_id() IS NULL THEN false
    WHEN split_part(p_name, '/', 1) = 'stories'
      AND split_part(p_name, '/', 2) = public.wipp_my_profile_id()
      THEN true
    WHEN split_part(p_name, '/', 1) = 'groups'
      AND EXISTS (
        SELECT 1 FROM public.wipp_chat_members m
        WHERE m.chat_id = split_part(p_name, '/', 2)
          AND m.profile_id = public.wipp_my_profile_id()
      )
      AND NOT wipp_private.wipp_current_user_is_banned(split_part(p_name, '/', 2))
      THEN true
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.wipp_lot7_me() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_is_contact(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_is_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_sys(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_guard_system() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_create_group(text, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_add_member(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_member(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_set_admin(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_ban(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_leave(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_rename(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_post(text, text, text, text, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_invite(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_join(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_peek(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_stories() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_view_story(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_story_viewers(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_delete_story(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot15_is_close(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot15_set_close(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot15_close_friends() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot15_services(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot15_claim_push(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot16_can_read_private(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot16_can_write_private(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_listing(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_listings(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_event(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipp_lot7_events(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION wipp_private.wipp_current_user_is_banned(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION wipp_private.wipp_viewer_is_contact(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION wipp_private.wipp_viewer_is_close_of(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION wipp_private.wipp_own_story_media_path(text) FROM PUBLIC, anon, authenticated;

-- Policies resolve wipp_private helpers as authenticated. This does not add the schema
-- to the Data API. wipp_private.wipp_me() grants are not changed.
GRANT USAGE ON SCHEMA wipp_private TO authenticated;

-- B. RLS helpers. Self-bound. Executable by authenticated because policies run as that role.
GRANT EXECUTE ON FUNCTION wipp_private.wipp_current_user_is_banned(text) TO authenticated;
GRANT EXECUTE ON FUNCTION wipp_private.wipp_viewer_is_contact(text) TO authenticated;
GRANT EXECUTE ON FUNCTION wipp_private.wipp_viewer_is_close_of(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot16_can_read_private(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot16_can_write_private(text) TO authenticated;

-- Trigger runs as the inserting role. It is not a client RPC (returns trigger).
GRANT EXECUTE ON FUNCTION public.wipp_lot7_guard_system() TO authenticated, service_role;

-- A. Client RPCs.
GRANT EXECUTE ON FUNCTION public.wipp_lot7_create_group(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_add_member(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_remove_member(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_set_admin(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_ban(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_leave(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_rename(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_post(text, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_invite(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_join(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_peek(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_stories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_view_story(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_story_viewers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_delete_story(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_set_close(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_close_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_services(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_remove_listing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_listings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_remove_event(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_events(text) TO authenticated;

-- C. Server only. D. Internal only. service_role, never authenticated.
GRANT EXECUTE ON FUNCTION public.wipp_lot15_claim_push(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_me() TO service_role;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_is_contact(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_is_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_sys(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wipp_lot15_is_close(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION wipp_private.wipp_own_story_media_path(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Policies owned by this file. Existing chat / member / invite policies stay.
--    wipp_group_bans, wipp_nearby_sessions, wipp_push_dedupe: no client policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS wipp_groups_read ON public.wipp_groups;
CREATE POLICY wipp_groups_read ON public.wipp_groups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wipp_chat_members m
    WHERE m.chat_id = wipp_groups.chat_id
      AND m.profile_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_admins_read ON public.wipp_group_admins;
CREATE POLICY wipp_admins_read ON public.wipp_group_admins
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wipp_chat_members m
    WHERE m.chat_id = wipp_group_admins.chat_id
      AND m.profile_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_stories_read ON public.wipp_stories;
CREATE POLICY wipp_stories_read ON public.wipp_stories
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND expires_at > now()
    AND (
      author_id = public.wipp_my_profile_id()
      OR (audience = 'contacts' AND wipp_private.wipp_viewer_is_contact(author_id))
      OR (audience = 'close' AND wipp_private.wipp_viewer_is_close_of(author_id))
    )
  );

DROP POLICY IF EXISTS wipp_story_views_owner ON public.wipp_story_views;
CREATE POLICY wipp_story_views_owner ON public.wipp_story_views
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.wipp_stories s
    WHERE s.id = wipp_story_views.story_id
      AND s.author_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_close_own ON public.wipp_close_friends;
CREATE POLICY wipp_close_own ON public.wipp_close_friends
  FOR SELECT TO authenticated
  USING (owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_listings_read ON public.wipp_listings;
CREATE POLICY wipp_listings_read ON public.wipp_listings
  FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_events_read ON public.wipp_events;
CREATE POLICY wipp_events_read ON public.wipp_events
  FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_saves_own ON public.wipp_saves;
CREATE POLICY wipp_saves_own ON public.wipp_saves
  FOR ALL TO authenticated
  USING (profile_id = public.wipp_my_profile_id())
  WITH CHECK (profile_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_services_verified ON public.wipp_local_services;
CREATE POLICY wipp_services_verified ON public.wipp_local_services
  FOR SELECT TO authenticated
  USING (active AND verified_at IS NOT NULL);

DROP POLICY IF EXISTS wipp_group_calls_member_read ON public.wipp_group_calls;
CREATE POLICY wipp_group_calls_member_read ON public.wipp_group_calls
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wipp_chat_members m
      WHERE m.chat_id = wipp_group_calls.chat_id
        AND m.profile_id = public.wipp_my_profile_id()
    )
    AND NOT wipp_private.wipp_current_user_is_banned(wipp_group_calls.chat_id)
  );

DROP POLICY IF EXISTS wipp_group_call_members_read ON public.wipp_group_call_members;
CREATE POLICY wipp_group_call_members_read ON public.wipp_group_call_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wipp_group_calls c
      JOIN public.wipp_chat_members m ON m.chat_id = c.chat_id
      WHERE c.id = wipp_group_call_members.call_id
        AND m.profile_id = public.wipp_my_profile_id()
        AND NOT wipp_private.wipp_current_user_is_banned(c.chat_id)
    )
  );

-- Extra restriction on top of the existing message policies. Does not grant access.
DROP POLICY IF EXISTS wipp_messages_no_client_system ON public.wipp_messages;
CREATE POLICY wipp_messages_no_client_system ON public.wipp_messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (system_event IS NULL);

DROP POLICY IF EXISTS wipp_messages_no_client_system_upd ON public.wipp_messages;
CREATE POLICY wipp_messages_no_client_system_upd ON public.wipp_messages
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (system_event IS NULL)
  WITH CHECK (system_event IS NULL);

-- ---------------------------------------------------------------------------
-- 8. Storage. Bucket flag public stays false. One final policy generation.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('wipp-private-media', 'wipp-private-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('wipp-public-media', 'wipp-public-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wipp-business-cards',
  'wipp-business-cards',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS wipp_private_read ON storage.objects;
DROP POLICY IF EXISTS wipp_private_insert ON storage.objects;
DROP POLICY IF EXISTS wipp_private_update ON storage.objects;
DROP POLICY IF EXISTS wipp_private_delete ON storage.objects;
DROP POLICY IF EXISTS wipp_public_read ON storage.objects;
DROP POLICY IF EXISTS wipp_public_insert ON storage.objects;
DROP POLICY IF EXISTS wipp_public_update ON storage.objects;
DROP POLICY IF EXISTS wipp_public_delete ON storage.objects;
DROP POLICY IF EXISTS wipp_cards_read ON storage.objects;
DROP POLICY IF EXISTS wipp_cards_insert ON storage.objects;
DROP POLICY IF EXISTS wipp_cards_update ON storage.objects;
DROP POLICY IF EXISTS wipp_cards_delete ON storage.objects;

-- Private: signed URL requires SELECT. Path knowledge is not enough.
CREATE POLICY wipp_private_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wipp-private-media'
    AND public.wipp_lot16_can_read_private(name)
  );

CREATE POLICY wipp_private_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wipp-private-media'
    AND public.wipp_lot16_can_write_private(name)
  );

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
  );

CREATE POLICY wipp_private_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-private-media'
    AND owner = auth.uid()
    AND public.wipp_lot16_can_write_private(name)
  );

-- Name is historical. The bucket flag remains false. No anon, no public URL.
CREATE POLICY wipp_public_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wipp-public-media'
    AND split_part(name, '/', 1) IN ('listings', 'events', 'business', 'shops')
  );

CREATE POLICY wipp_public_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wipp-public-media'
    AND split_part(name, '/', 1) IN ('listings', 'events', 'business', 'shops')
    AND split_part(name, '/', 2) = public.wipp_my_profile_id()
  );

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
  );

CREATE POLICY wipp_public_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-public-media'
    AND owner = auth.uid()
    AND split_part(name, '/', 2) = public.wipp_my_profile_id()
  );

-- business-card.ts uploads {profileId}/{role}-{uuid}.ext and signs for 3600s.
-- Only the owner's folder. Other viewers are expected to receive a server-signed URL.
CREATE POLICY wipp_cards_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

CREATE POLICY wipp_cards_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

CREATE POLICY wipp_cards_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  )
  WITH CHECK (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

CREATE POLICY wipp_cards_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

COMMIT;

