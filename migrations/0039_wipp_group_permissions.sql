-- Groupes : visibilité, catégorie, autorisations des membres, approbation des nouveaux membres.
-- Tout est appliqué CÔTÉ SERVEUR (fonctions + règle RLS), même pour une ancienne version de l'app.
-- NON DESTRUCTIVE : colonnes / table / fonctions ; les groupes existants gardent leur comportement
-- (membres peuvent écrire, liens actifs si invites_enabled).
-- Corrige aussi la coupure des messages de groupe à 8 000 caractères (messages chiffrés plus longs).

ALTER TABLE public.wipp_groups
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IS NULL OR char_length(category) <= 40),
  ADD COLUMN IF NOT EXISTS members_can_edit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS members_can_send BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS members_can_add BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS members_can_invite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approve_new_members BOOLEAN NOT NULL DEFAULT false;
-- Visibilité : Public = le lien d'invitation fonctionne (invites_enabled) ; Privé = ajout direct uniquement.

-- 30 jours = 2 592 000 000 ms : dépasse un INTEGER. Élargissement (aucune valeur modifiée).
ALTER TABLE public.wipp_chats ALTER COLUMN disappear_after_ms TYPE BIGINT;

CREATE TABLE IF NOT EXISTS public.wipp_group_join_requests (
  chat_id TEXT NOT NULL REFERENCES public.wipp_chats(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  via TEXT NOT NULL CHECK (via IN ('link', 'member')),
  invited_by TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (chat_id, profile_id)
);
ALTER TABLE public.wipp_group_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_group_join_requests FROM PUBLIC, anon, authenticated;

-- Qui peut écrire dans une discussion : tout le monde hors groupes ; dans un groupe, les membres si
-- autorisé, sinon seulement les admins.
CREATE OR REPLACE FUNCTION public.wipp_group_can_post(p_chat TEXT, p_pid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT NOT EXISTS (SELECT 1 FROM public.wipp_groups g WHERE g.chat_id = p_chat)
      OR EXISTS (SELECT 1 FROM public.wipp_groups g WHERE g.chat_id = p_chat AND g.members_can_send)
      OR public.wipp_lot7_is_admin(p_chat, p_pid)
$function$;
REVOKE ALL ON FUNCTION public.wipp_group_can_post(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_group_can_post(TEXT, TEXT) TO authenticated;

-- Même règle pour un message inséré directement dans la table (sans passer par la fonction d'envoi).
DROP POLICY IF EXISTS wipp_messages_group_send_permission ON public.wipp_messages;
CREATE POLICY wipp_messages_group_send_permission ON public.wipp_messages
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (public.wipp_group_can_post(chat_id, wipp_private.wipp_me()));

-- Envoi d'un message de groupe : autorisation + limite relevée à 65 000 caractères.
CREATE OR REPLACE FUNCTION public.wipp_lot7_post(p_chat text, p_body text, p_client text, p_reply text, p_mentions text[])
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
  IF NOT public.wipp_group_can_post(p_chat, me) THEN RAISE EXCEPTION 'admins_only'; END IF;
  IF p_body IS NULL OR char_length(p_body) = 0 THEN RAISE EXCEPTION 'empty'; END IF;
  IF char_length(p_body) > 65000 THEN RAISE EXCEPTION 'too_long'; END IF;
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
  VALUES (mid, p_chat, me, p_body, p_client, p_reply, clean, NULL);
  RETURN mid;
END $function$;

-- Ajouter un membre : admins, ou membres si autorisé. Ajout par un membre + approbation activée → demande.
CREATE OR REPLACE FUNCTION public.wipp_lot7_add_member(p_chat text, p_member text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me text := public.wipp_lot7_me();
  dn text;
  g public.wipp_groups%ROWTYPE;
  admin boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT * INTO g FROM public.wipp_groups WHERE chat_id = p_chat;
  IF g.chat_id IS NULL THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  admin := public.wipp_lot7_is_admin(p_chat, me);
  IF NOT admin AND NOT g.members_can_add THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_group_bans WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'banned';
  END IF;
  IF NOT public.wipp_lot7_is_contact(me, p_member) THEN RETURN 'not_contact'; END IF;
  IF EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = p_member) THEN
    RETURN 'already_member';
  END IF;
  IF NOT admin AND g.approve_new_members THEN
    INSERT INTO public.wipp_group_join_requests (chat_id, profile_id, via, invited_by, status, created_at, decided_at, decided_by)
    VALUES (p_chat, p_member, 'member', me, 'pending', now(), NULL, NULL)
    ON CONFLICT (chat_id, profile_id) DO UPDATE SET via = 'member', invited_by = me, status = 'pending', created_at = now(), decided_at = NULL, decided_by = NULL;
    RETURN 'pending';
  END IF;
  INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (p_chat, p_member);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
  RETURN 'ok';
END $function$;

-- Créer un lien d'invitation : groupe Public uniquement ; admins, ou membres si autorisé.
CREATE OR REPLACE FUNCTION public.wipp_lot7_invite(p_chat text, p_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me text := public.wipp_lot7_me();
  hash text;
  g public.wipp_groups%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT * INTO g FROM public.wipp_groups WHERE chat_id = p_chat;
  IF g.chat_id IS NULL THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) AND NOT g.members_can_invite THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT g.invites_enabled THEN RETURN 'closed'; END IF;
  hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  INSERT INTO public.wipp_group_invites (chat_id, token_hash, created_by, expires_at, max_uses)
  VALUES (p_chat, hash, me, now() + interval '7 days', 50);
  RETURN 'ok';
END $function$;

-- Rejoindre par lien : direct, ou demande en attente si l'approbation est activée.
CREATE OR REPLACE FUNCTION public.wipp_lot7_join(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
  IF g.approve_new_members THEN
    INSERT INTO public.wipp_group_join_requests (chat_id, profile_id, via, invited_by, status, created_at, decided_at, decided_by)
    VALUES (g.chat_id, me, 'link', inv.created_by, 'pending', now(), NULL, NULL)
    ON CONFLICT (chat_id, profile_id) DO UPDATE SET via = 'link', invited_by = inv.created_by, status = 'pending', created_at = now(), decided_at = NULL, decided_by = NULL;
    RETURN jsonb_build_object('status', 'pending', 'chat_id', g.chat_id, 'name', g.name);
  END IF;
  INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (g.chat_id, me);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = me;
  PERFORM public.wipp_lot7_sys(g.chat_id, me, 'joined', coalesce(dn, 'Un membre') || ' a rejoint');
  SELECT count(*) INTO n FROM public.wipp_chat_members WHERE chat_id = g.chat_id;
  RETURN jsonb_build_object('status', 'joined', 'chat_id', g.chat_id, 'name', g.name, 'members', n);
END $function$;

-- Modifier les infos : admins, ou membres si autorisé.
CREATE OR REPLACE FUNCTION public.wipp_lot7_update_info(p_chat TEXT, p_name TEXT, p_description TEXT, p_avatar TEXT, p_quiet BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  g RECORD;
  clean_name TEXT;
  clean_desc TEXT;
  quiet BOOLEAN := coalesce(p_quiet, false);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT name, description, avatar_url, created_at, members_can_edit INTO g FROM public.wipp_groups WHERE chat_id = p_chat;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) AND NOT g.members_can_edit THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF quiet AND g.created_at < now() - interval '10 minutes' THEN quiet := false; END IF;
  IF p_name IS NOT NULL THEN
    clean_name := left(trim(p_name), 80);
    IF char_length(clean_name) = 0 THEN RAISE EXCEPTION 'empty_name'; END IF;
    IF clean_name IS DISTINCT FROM g.name THEN
      UPDATE public.wipp_groups SET name = clean_name WHERE chat_id = p_chat;
      IF NOT quiet THEN PERFORM public.wipp_lot7_sys(p_chat, me, 'renamed', 'Le nom du groupe est maintenant « ' || clean_name || ' »'); END IF;
    END IF;
  END IF;
  IF p_description IS NOT NULL THEN
    clean_desc := nullif(left(trim(p_description), 500), '');
    IF clean_desc IS DISTINCT FROM g.description THEN
      UPDATE public.wipp_groups SET description = clean_desc WHERE chat_id = p_chat;
      IF NOT quiet THEN PERFORM public.wipp_lot7_sys(p_chat, me, 'description', 'La description du groupe a été modifiée'); END IF;
    END IF;
  END IF;
  IF p_avatar IS NOT NULL THEN
    IF p_avatar <> '' AND p_avatar NOT LIKE 'groups/' || p_chat || '/%' THEN RAISE EXCEPTION 'invalid_avatar'; END IF;
    UPDATE public.wipp_groups SET avatar_url = nullif(p_avatar, '') WHERE chat_id = p_chat;
    IF NOT quiet THEN
      PERFORM public.wipp_lot7_sys(p_chat, me, 'photo', CASE WHEN p_avatar = '' THEN 'La photo du groupe a été supprimée' ELSE 'La photo du groupe a été modifiée' END);
    END IF;
  END IF;
  RETURN 'ok';
END;
$function$;

-- Réglages du groupe (admins) : visibilité, catégorie, autorisations, messages éphémères.
CREATE OR REPLACE FUNCTION public.wipp_lot7_set_settings(p_chat TEXT, p_settings JSONB, p_quiet BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  created TIMESTAMPTZ;
  ms BIGINT;
  quiet BOOLEAN := coalesce(p_quiet, false);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT created_at INTO created FROM public.wipp_groups WHERE chat_id = p_chat;
  IF created IS NULL THEN RAISE EXCEPTION 'not_group'; END IF;
  IF quiet AND created < now() - interval '10 minutes' THEN quiet := false; END IF;
  UPDATE public.wipp_groups SET
    invites_enabled = CASE WHEN p_settings ? 'visibility' THEN (p_settings->>'visibility') = 'public' ELSE invites_enabled END,
    category = CASE WHEN p_settings ? 'category' THEN nullif(left(trim(p_settings->>'category'), 40), '') ELSE category END,
    members_can_edit = coalesce((p_settings->>'membersCanEdit')::boolean, members_can_edit),
    members_can_send = coalesce((p_settings->>'membersCanSend')::boolean, members_can_send),
    members_can_add = coalesce((p_settings->>'membersCanAdd')::boolean, members_can_add),
    members_can_invite = coalesce((p_settings->>'membersCanInvite')::boolean, members_can_invite),
    approve_new_members = coalesce((p_settings->>'approveNewMembers')::boolean, approve_new_members)
  WHERE chat_id = p_chat;
  IF p_settings ? 'visibility' AND (p_settings->>'visibility') = 'private' THEN
    -- Becoming private: every existing link stops working.
    UPDATE public.wipp_group_invites SET revoked_at = now() WHERE chat_id = p_chat AND revoked_at IS NULL;
  END IF;
  IF p_settings ? 'disappearMs' THEN
    ms := coalesce((p_settings->>'disappearMs')::bigint, 0);
    IF ms NOT IN (0, 86400000, 604800000, 2592000000) THEN RAISE EXCEPTION 'bad_duration'; END IF;
    UPDATE public.wipp_chats SET disappear_after_ms = nullif(ms, 0) WHERE id = p_chat;
  END IF;
  IF NOT quiet THEN PERFORM public.wipp_lot7_sys(p_chat, me, 'settings', 'Les paramètres du groupe ont été modifiés'); END IF;
  RETURN 'ok';
END;
$function$;

-- Demandes d'adhésion en attente (admins).
CREATE OR REPLACE FUNCTION public.wipp_lot7_join_requests(p_chat TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
BEGIN
  IF me IS NULL OR NOT public.wipp_lot7_is_admin(p_chat, me) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'profileId', r.profile_id, 'username', p.username, 'displayName', p.display_name, 'avatarUrl', p.avatar_url,
      'via', r.via, 'invitedBy', ib.display_name, 'createdAt', r.created_at
    ) ORDER BY r.created_at)
    FROM public.wipp_group_join_requests r
    JOIN public.wipp_profiles p ON p.id = r.profile_id
    LEFT JOIN public.wipp_profiles ib ON ib.id = r.invited_by
    WHERE r.chat_id = p_chat AND r.status = 'pending'
  ), '[]'::jsonb);
END;
$function$;

-- Approuver / refuser une demande (admins).
CREATE OR REPLACE FUNCTION public.wipp_lot7_decide_join(p_chat TEXT, p_profile TEXT, p_approve BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  dn TEXT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wipp_group_join_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END, decided_at = now(), decided_by = me
  WHERE chat_id = p_chat AND profile_id = p_profile AND status = 'pending';
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM public.wipp_group_bans WHERE chat_id = p_chat AND profile_id = p_profile) THEN RETURN 'banned'; END IF;
    INSERT INTO public.wipp_chat_members (chat_id, profile_id) VALUES (p_chat, p_profile) ON CONFLICT DO NOTHING;
    SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_profile;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'joined', coalesce(dn, 'Un membre') || ' a rejoint');
  END IF;
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_set_settings(TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_join_requests(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_decide_join(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_set_settings(TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_join_requests(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_decide_join(TEXT, TEXT, BOOLEAN) TO authenticated;
