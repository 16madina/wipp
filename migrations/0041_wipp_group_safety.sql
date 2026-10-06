-- Groupes, étape 2 : « Signaler et quitter » + signaler un groupe. NON DESTRUCTIVE.
-- * wipp_chat_members.added_by : qui m'a ajouté (NULL = j'ai créé le groupe ou rejoint moi-même par lien).
-- * wipp_content_reports accepte content_type = 'group' (seuls l'id du groupe et la raison sont envoyés,
--   jamais les messages : les groupes sont chiffrés de bout en bout).

ALTER TABLE public.wipp_chat_members ADD COLUMN IF NOT EXISTS added_by TEXT;

ALTER TABLE public.wipp_content_reports DROP CONSTRAINT IF EXISTS wipp_content_reports_content_type_check;
ALTER TABLE public.wipp_content_reports ADD CONSTRAINT wipp_content_reports_content_type_check
  CHECK (content_type IN ('story', 'listing', 'profile', 'message', 'business_card', 'group'));

-- Création : les membres choisis sont « ajoutés par » le créateur.
CREATE OR REPLACE FUNCTION public.wipp_lot7_create_group(p_name text, p_members text[])
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
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
      INSERT INTO public.wipp_chat_members (chat_id, profile_id, added_by) VALUES (cid, m, me) ON CONFLICT DO NOTHING;
      SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = m;
      PERFORM public.wipp_lot7_sys(cid, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
    END LOOP;
  END IF;
  RETURN cid;
END $function$;

-- Ajout d'un membre : « ajouté par » la personne qui ajoute (règles de 0039 inchangées).
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
  INSERT INTO public.wipp_chat_members (chat_id, profile_id, added_by) VALUES (p_chat, p_member, me);
  SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_member;
  PERFORM public.wipp_lot7_sys(p_chat, me, 'added', coalesce(dn, 'Un membre') || ' a été ajouté');
  RETURN 'ok';
END $function$;

-- Approbation : un membre proposé par quelqu'un est « ajouté par » cette personne ; une demande par lien reste NULL.
CREATE OR REPLACE FUNCTION public.wipp_lot7_decide_join(p_chat text, p_profile text, p_approve boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  dn TEXT;
  req public.wipp_group_join_requests%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wipp_group_join_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END, decided_at = now(), decided_by = me
  WHERE chat_id = p_chat AND profile_id = p_profile AND status = 'pending'
  RETURNING * INTO req;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM public.wipp_group_bans WHERE chat_id = p_chat AND profile_id = p_profile) THEN RETURN 'banned'; END IF;
    INSERT INTO public.wipp_chat_members (chat_id, profile_id, added_by)
    VALUES (p_chat, p_profile, CASE WHEN req.via = 'member' THEN req.invited_by END)
    ON CONFLICT DO NOTHING;
    SELECT display_name INTO dn FROM public.wipp_profiles WHERE id = p_profile;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'joined', coalesce(dn, 'Un membre') || ' a rejoint');
  END IF;
  RETURN 'ok';
END;
$function$;

-- Pour le bandeau « Signaler et quitter » : qui m'a ajouté, et est-ce un de mes contacts ?
CREATE OR REPLACE FUNCTION public.wipp_lot7_group_safety(p_chat TEXT)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  adder TEXT;
  p RECORD;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT added_by INTO adder FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me;
  IF NOT FOUND OR adder IS NULL OR adder = me THEN RETURN NULL; END IF;
  SELECT id, username, display_name INTO p FROM public.wipp_profiles WHERE id = adder;
  RETURN jsonb_build_object(
    'addedBy', adder,
    'username', p.username,
    'displayName', p.display_name,
    'isContact', public.wipp_lot7_is_contact(me, adder)
  );
END;
$function$;

-- Signaler un groupe (membre), et le quitter si demandé.
CREATE OR REPLACE FUNCTION public.wipp_lot7_report_group(p_chat TEXT, p_reason TEXT, p_leave BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  owner TEXT;
  adder TEXT;
  reason TEXT := left(trim(coalesce(p_reason, '')), 80);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF char_length(reason) < 2 THEN RAISE EXCEPTION 'reason'; END IF;
  SELECT added_by INTO adder FROM public.wipp_chat_members WHERE chat_id = p_chat AND profile_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT owner_id INTO owner FROM public.wipp_groups WHERE chat_id = p_chat;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_group'; END IF;
  -- One open report per person and group per day (no flooding).
  IF NOT EXISTS (
    SELECT 1 FROM public.wipp_content_reports
    WHERE reporter_id = me AND content_type = 'group' AND content_id = p_chat AND created_at > now() - interval '1 day'
  ) THEN
    INSERT INTO public.wipp_content_reports (id, reporter_id, target_profile_id, content_type, content_id, reason)
    VALUES ('rpt_' || left(replace(gen_random_uuid()::text, '-', ''), 20), me, coalesce(adder, owner), 'group', p_chat, reason);
  END IF;
  IF coalesce(p_leave, false) THEN
    PERFORM public.wipp_lot7_leave(p_chat);
    RETURN 'left';
  END IF;
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_group_safety(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_report_group(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_group_safety(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_report_group(TEXT, TEXT, BOOLEAN) TO authenticated;
