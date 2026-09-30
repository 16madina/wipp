-- Lot 7. Groups reuse wipp_chats / wipp_chat_members / wipp_messages.
-- New tables only where nothing existed: stories, listings, events, saves, group admins/invites/bans.
-- Close-friends has no table: audience "close" is rejected. Story push is not emitted.
-- GROUP E2EE is not implemented. Group message bodies are plaintext for members (RLS / definer).

DO $$
BEGIN
  IF to_regprocedure('public.wipp_my_profile_id()') IS NULL THEN
    CREATE FUNCTION public.wipp_my_profile_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
      SELECT NULL::text
    $fn$;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS wipp_groups (
  chat_id TEXT PRIMARY KEY REFERENCES wipp_chats(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  owner_id TEXT NOT NULL REFERENCES wipp_profiles(id),
  invites_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wipp_group_admins (
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

CREATE TABLE IF NOT EXISTS wipp_group_bans (
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

CREATE TABLE IF NOT EXISTS wipp_group_invites (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES wipp_profiles(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS mentions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS system_event TEXT;

CREATE TABLE IF NOT EXISTS wipp_stories (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image', 'video')),
  body TEXT,
  media_url TEXT,
  audience TEXT NOT NULL CHECK (audience IN ('contacts', 'only_me')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_stories_feed ON wipp_stories (expires_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS wipp_story_views (
  story_id TEXT NOT NULL REFERENCES wipp_stories(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS wipp_listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS wipp_listings_active ON wipp_listings (status, created_at DESC);

CREATE TABLE IF NOT EXISTS wipp_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS wipp_saves (
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('listing', 'event', 'business')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, kind, target_id)
);

CREATE OR REPLACE FUNCTION public.wipp_lot7_me() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.wipp_my_profile_id()
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_is_contact(a text, b text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF a IS NULL OR b IS NULL OR a = b THEN RETURN false; END IF;
  IF to_regclass('public.wipp_connections') IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM wipp_connections c
    WHERE c.user_a = least(a, b) AND c.user_b = greatest(a, b)
  );
EXCEPTION WHEN undefined_column OR undefined_table THEN
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_is_admin(chat text, pid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM wipp_groups g WHERE g.chat_id = chat AND g.owner_id = pid)
      OR EXISTS (SELECT 1 FROM wipp_group_admins a WHERE a.chat_id = chat AND a.profile_id = pid)
$$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_sys(chat text, actor text, event text, label text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('wipp.lot7_sys', '1', true);
  INSERT INTO wipp_messages (id, chat_id, sender_id, body, system_event, mentions)
  VALUES ('m_' || replace(gen_random_uuid()::text, '-', ''), chat, actor, left(label, 280), event, '{}');
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_guard_system() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.system_event IS NOT NULL AND current_setting('wipp.lot7_sys', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'system_event_forbidden';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wipp_lot7_guard_system ON wipp_messages;
CREATE TRIGGER wipp_lot7_guard_system
  BEFORE INSERT OR UPDATE OF system_event ON wipp_messages
  FOR EACH ROW EXECUTE FUNCTION public.wipp_lot7_guard_system();

CREATE OR REPLACE FUNCTION public.wipp_lot7_create_group(p_name text, p_members text[]) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  cid text;
  m text;
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name'; END IF;
  cid := 'g_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO wipp_chats (id) VALUES (cid);
  INSERT INTO wipp_groups (chat_id, name, owner_id) VALUES (cid, left(trim(p_name), 80), me);
  INSERT INTO wipp_chat_members (chat_id, profile_id) VALUES (cid, me);
  INSERT INTO wipp_group_admins (chat_id, profile_id) VALUES (cid, me);
  SELECT display_name INTO dn FROM wipp_profiles WHERE id = me;
  PERFORM public.wipp_lot7_sys(cid, me, 'created', coalesce(dn, 'Quelqu’un') || ' a créé le groupe');
  IF p_members IS NOT NULL THEN
    FOREACH m IN ARRAY p_members LOOP
      IF m IS NULL OR m = me THEN CONTINUE; END IF;
      IF NOT public.wipp_lot7_is_contact(me, m) THEN CONTINUE; END IF;
      INSERT INTO wipp_chat_members (chat_id, profile_id) VALUES (cid, m) ON CONFLICT DO NOTHING;
      SELECT display_name INTO dn FROM wipp_profiles WHERE id = m;
      PERFORM public.wipp_lot7_sys(cid, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
    END LOOP;
  END IF;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_add_member(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM wipp_group_bans WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'banned';
  END IF;
  IF NOT public.wipp_lot7_is_contact(me, p_member) THEN RETURN 'not_contact'; END IF;
  IF EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'already_member';
  END IF;
  INSERT INTO wipp_chat_members (chat_id, profile_id) VALUES (p_chat, p_member);
  SELECT display_name INTO dn FROM wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_remove_member(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
  owner text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT owner_id INTO owner FROM wipp_groups WHERE chat_id = p_chat;
  IF p_member = owner THEN RETURN 'is_owner'; END IF;
  DELETE FROM wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
  DELETE FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member;
  SELECT display_name INTO dn FROM wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'removed', coalesce(dn, 'Un membre') || ' a été retiré');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_set_admin(p_chat text, p_member text, p_on boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'not_member';
  END IF;
  IF p_on THEN
    INSERT INTO wipp_group_admins (chat_id, profile_id) VALUES (p_chat, p_member) ON CONFLICT DO NOTHING;
    SELECT display_name INTO dn FROM wipp_profiles WHERE id = p_member;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'admin', coalesce(dn, 'Un membre') || ' est maintenant admin');
  ELSE
    IF p_member = (SELECT owner_id FROM wipp_groups WHERE chat_id = p_chat) THEN RETURN 'is_owner'; END IF;
    DELETE FROM wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
    SELECT display_name INTO dn FROM wipp_profiles WHERE id = p_member;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'admin_off', coalesce(dn, 'Un membre') || ' n’est plus admin');
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_ban(p_chat text, p_member text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_member = (SELECT owner_id FROM wipp_groups WHERE chat_id = p_chat) THEN RETURN 'is_owner'; END IF;
  INSERT INTO wipp_group_bans (chat_id, profile_id) VALUES (p_chat, p_member) ON CONFLICT DO NOTHING;
  DELETE FROM wipp_group_admins WHERE chat_id = p_chat AND profile_id = p_member;
  DELETE FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_leave(p_chat text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  owner text;
  nxt text;
  dn text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN
    RETURN 'not_member';
  END IF;
  SELECT owner_id INTO owner FROM wipp_groups WHERE chat_id = p_chat;
  SELECT display_name INTO dn FROM wipp_profiles WHERE id = me;
  IF owner = me THEN
    SELECT profile_id INTO nxt FROM wipp_chat_members
      WHERE chat_id = p_chat AND profile_id <> me
      ORDER BY joined_at ASC LIMIT 1;
    IF nxt IS NULL THEN
      DELETE FROM wipp_chats WHERE id = p_chat;
      RETURN 'deleted';
    END IF;
    UPDATE wipp_groups SET owner_id = nxt WHERE chat_id = p_chat;
    INSERT INTO wipp_group_admins (chat_id, profile_id) VALUES (p_chat, nxt) ON CONFLICT DO NOTHING;
  END IF;
  DELETE FROM wipp_group_admins WHERE chat_id = p_chat AND profile_id = me;
  DELETE FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = me;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'left', coalesce(dn, 'Un membre') || ' a quitté le groupe');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_rename(p_chat text, p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE wipp_groups SET name = left(trim(p_name), 80) WHERE chat_id = p_chat;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'renamed', 'Le nom du groupe a été modifié');
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_post(p_chat text, p_body text, p_client text, p_reply text, p_mentions text[]) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  mid text;
  mention text;
  clean text[] := '{}';
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_groups WHERE chat_id = p_chat) THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_body IS NULL OR char_length(p_body) = 0 THEN RAISE EXCEPTION 'empty'; END IF;
  IF p_mentions IS NOT NULL THEN
    FOREACH mention IN ARRAY p_mentions LOOP
      IF EXISTS (
        SELECT 1 FROM wipp_chat_members mb
        WHERE mb.chat_id = p_chat AND mb.profile_id = mention
      ) THEN
        clean := array_append(clean, mention);
      END IF;
    END LOOP;
  END IF;
  SELECT id INTO mid FROM wipp_messages WHERE chat_id = p_chat AND client_id = p_client LIMIT 1;
  IF mid IS NOT NULL THEN RETURN mid; END IF;
  mid := 'm_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO wipp_messages (id, chat_id, sender_id, body, client_id, reply_to, mentions, system_event)
  VALUES (mid, p_chat, me, left(p_body, 8000), p_client, p_reply, clean, NULL);
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_invite(p_chat text, p_token text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_groups WHERE chat_id = p_chat AND invites_enabled) THEN
    RETURN 'closed';
  END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  INSERT INTO wipp_group_invites (id, chat_id, token_hash, created_by, expires_at, max_uses)
  VALUES ('gi_' || replace(gen_random_uuid()::text, '-', ''), p_chat, hash, me, now() + interval '7 days', 50);
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_join(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
  inv wipp_group_invites%ROWTYPE;
  g wipp_groups%ROWTYPE;
  n int;
  dn text;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('status', 'no_session'); END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO inv FROM wipp_group_invites WHERE token_hash = hash;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN RETURN jsonb_build_object('status', 'full'); END IF;
  SELECT * INTO g FROM wipp_groups WHERE chat_id = inv.chat_id;
  IF g.chat_id IS NULL OR NOT g.invites_enabled THEN RETURN jsonb_build_object('status', 'closed'); END IF;
  IF EXISTS (SELECT 1 FROM wipp_group_bans b WHERE b.chat_id = g.chat_id AND b.profile_id = me) THEN
    RETURN jsonb_build_object('status', 'refused');
  END IF;
  IF EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = g.chat_id AND profile_id = me) THEN
    SELECT count(*) INTO n FROM wipp_chat_members WHERE chat_id = g.chat_id;
    RETURN jsonb_build_object('status', 'already_member', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
  END IF;
  INSERT INTO wipp_chat_members (chat_id, profile_id) VALUES (g.chat_id, me);
  UPDATE wipp_group_invites SET uses = uses + 1 WHERE id = inv.id;
  SELECT display_name INTO dn FROM wipp_profiles WHERE id = me;
  PERFORM public.wipp_lot7_sys(g.chat_id, me, 'joined', coalesce(dn, 'Un membre') || ' a rejoint');
  SELECT count(*) INTO n FROM wipp_chat_members WHERE chat_id = g.chat_id;
  RETURN jsonb_build_object('status', 'joined', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_publish_story(p_kind text, p_body text, p_media text, p_audience text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  sid text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_audience = 'close' THEN RAISE EXCEPTION 'close_pending'; END IF;
  IF p_audience NOT IN ('contacts', 'only_me') THEN RAISE EXCEPTION 'audience'; END IF;
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
  INSERT INTO wipp_story_views (story_id, viewer_id) VALUES (s.id, me) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_story_viewers(p_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_stories WHERE id = p_id AND author_id = me) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'viewer_id', v.viewer_id,
      'username', p.username,
      'display_name', p.display_name,
      'viewed_at', v.viewed_at
    ) ORDER BY v.viewed_at DESC)
    FROM wipp_story_views v
    JOIN wipp_profiles p ON p.id = v.viewer_id
    WHERE v.story_id = p_id
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_delete_story(p_id text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE wipp_stories SET deleted_at = now() WHERE id = p_id AND author_id = me AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_save_listing(p_title text, p_desc text, p_cat text, p_price text, p_city text, p_photo text, p_id text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  lid text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_id IS NULL OR p_id = '' THEN
    lid := 'lst_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO wipp_listings (id, owner_id, title, description, category, price_label, city, photo_url)
    VALUES (lid, me, left(trim(p_title), 120), left(coalesce(p_desc, ''), 4000), left(coalesce(p_cat, 'goods'), 40), nullif(left(coalesce(p_price, ''), 40), ''), left(coalesce(p_city, ''), 80), p_photo);
    RETURN lid;
  END IF;
  UPDATE wipp_listings SET
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE wipp_listings SET status = 'removed', updated_at = now() WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_listings(p_q text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    FROM wipp_listings l
    JOIN wipp_profiles p ON p.id = l.owner_id
    WHERE (l.status = 'active' OR l.owner_id = me)
      AND (q IS NULL OR l.title ILIKE '%' || q || '%' OR l.description ILIKE '%' || q || '%'
           OR l.category ILIKE '%' || q || '%' OR l.city ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_save_event(p_title text, p_desc text, p_city text, p_place text, p_starts text, p_photo text, p_contact text, p_id text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    INSERT INTO wipp_events (id, owner_id, title, description, city, place, starts_at, photo_url, contact)
    VALUES (eid, me, left(trim(p_title), 120), left(coalesce(p_desc, ''), 4000), left(coalesce(p_city, ''), 80), left(coalesce(p_place, ''), 160), starts, p_photo, nullif(left(coalesce(p_contact, ''), 120), ''));
    RETURN eid;
  END IF;
  UPDATE wipp_events SET
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE wipp_events SET status = 'removed', updated_at = now() WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RETURN 'forbidden'; END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_events(p_q text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    FROM wipp_events e
    JOIN wipp_profiles p ON p.id = e.owner_id
    WHERE (e.status = 'active' OR e.owner_id = me)
      AND (q IS NULL OR e.title ILIKE '%' || q || '%' OR e.description ILIKE '%' || q || '%'
           OR e.city ILIKE '%' || q || '%' OR e.place ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot7_me() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_is_contact(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_is_admin(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_sys(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_create_group(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_add_member(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_member(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_set_admin(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_ban(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_leave(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_rename(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_post(text, text, text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_invite(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_join(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_stories() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_view_story(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_story_viewers(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_delete_story(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_listing(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_listings(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_remove_event(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wipp_lot7_events(text) FROM PUBLIC;

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
GRANT EXECUTE ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_stories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_view_story(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_story_viewers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_delete_story(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_remove_listing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_listings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_remove_event(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_events(text) TO authenticated;

ALTER TABLE wipp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_group_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_group_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wipp_groups_read ON wipp_groups;
CREATE POLICY wipp_groups_read ON wipp_groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wipp_chat_members m
    WHERE m.chat_id = wipp_groups.chat_id AND m.profile_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_admins_read ON wipp_group_admins;
CREATE POLICY wipp_admins_read ON wipp_group_admins FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wipp_chat_members m
    WHERE m.chat_id = wipp_group_admins.chat_id AND m.profile_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_stories_read ON wipp_stories;
CREATE POLICY wipp_stories_read ON wipp_stories FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND expires_at > now() AND (
      author_id = public.wipp_my_profile_id()
      OR (audience = 'contacts' AND public.wipp_lot7_is_contact(author_id, public.wipp_my_profile_id()))
    )
  );

DROP POLICY IF EXISTS wipp_story_views_owner ON wipp_story_views;
CREATE POLICY wipp_story_views_owner ON wipp_story_views FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wipp_stories s
    WHERE s.id = wipp_story_views.story_id AND s.author_id = public.wipp_my_profile_id()
  ));

DROP POLICY IF EXISTS wipp_listings_read ON wipp_listings;
CREATE POLICY wipp_listings_read ON wipp_listings FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_events_read ON wipp_events;
CREATE POLICY wipp_events_read ON wipp_events FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = public.wipp_my_profile_id());

DROP POLICY IF EXISTS wipp_saves_own ON wipp_saves;
CREATE POLICY wipp_saves_own ON wipp_saves FOR ALL TO authenticated
  USING (profile_id = public.wipp_my_profile_id())
  WITH CHECK (profile_id = public.wipp_my_profile_id());

CREATE OR REPLACE FUNCTION public.wipp_lot7_peek(p_token text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
  inv wipp_group_invites%ROWTYPE;
  g wipp_groups%ROWTYPE;
  n int;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('status', 'no_session'); END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO inv FROM wipp_group_invites WHERE token_hash = hash;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN RETURN jsonb_build_object('status', 'full'); END IF;
  SELECT * INTO g FROM wipp_groups WHERE chat_id = inv.chat_id;
  IF g.chat_id IS NULL OR NOT g.invites_enabled THEN RETURN jsonb_build_object('status', 'closed'); END IF;
  IF EXISTS (SELECT 1 FROM wipp_group_bans b WHERE b.chat_id = g.chat_id AND b.profile_id = me) THEN
    RETURN jsonb_build_object('status', 'refused');
  END IF;
  SELECT count(*) INTO n FROM wipp_chat_members WHERE chat_id = g.chat_id;
  IF EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = g.chat_id AND profile_id = me) THEN
    RETURN jsonb_build_object('status', 'already_member', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot7_peek(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_peek(text) TO authenticated;

-- No INSERT/UPDATE policies on groups, admins, bans, stories, listings, events.
-- Writes go through security-definer functions that ignore client-supplied actor ids.
-- Authenticated clients cannot stamp system_event (owner/definer bypasses RLS).
DROP POLICY IF EXISTS wipp_messages_no_client_system ON wipp_messages;
CREATE POLICY wipp_messages_no_client_system ON wipp_messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (system_event IS NULL);
DROP POLICY IF EXISTS wipp_messages_no_client_system_upd ON wipp_messages;
CREATE POLICY wipp_messages_no_client_system_upd ON wipp_messages
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (system_event IS NULL);
