-- Groupes, étape 1 : description, modification des infos (nom / description / photo) et
-- réinitialisation du lien d'invitation. NON DESTRUCTIVE.

ALTER TABLE public.wipp_groups
  ADD COLUMN IF NOT EXISTS description TEXT CHECK (description IS NULL OR char_length(description) <= 500);

-- Modifier les infos du groupe (admins). NULL = ne pas changer ce champ. Un message système par changement.
CREATE OR REPLACE FUNCTION public.wipp_lot7_update_info(p_chat TEXT, p_name TEXT, p_description TEXT, p_avatar TEXT)
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
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT name, description, avatar_url INTO g FROM public.wipp_groups WHERE chat_id = p_chat;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_group'; END IF;
  IF p_name IS NOT NULL THEN
    clean_name := left(trim(p_name), 80);
    IF char_length(clean_name) = 0 THEN RAISE EXCEPTION 'empty_name'; END IF;
    IF clean_name IS DISTINCT FROM g.name THEN
      UPDATE public.wipp_groups SET name = clean_name WHERE chat_id = p_chat;
      PERFORM public.wipp_lot7_sys(p_chat, me, 'renamed', 'Le nom du groupe est maintenant « ' || clean_name || ' »');
    END IF;
  END IF;
  IF p_description IS NOT NULL THEN
    clean_desc := nullif(left(trim(p_description), 500), '');
    IF clean_desc IS DISTINCT FROM g.description THEN
      UPDATE public.wipp_groups SET description = clean_desc WHERE chat_id = p_chat;
      PERFORM public.wipp_lot7_sys(p_chat, me, 'description', 'La description du groupe a été modifiée');
    END IF;
  END IF;
  IF p_avatar IS NOT NULL THEN
    -- Only an object of THIS group's private folder (or '' to remove the photo).
    IF p_avatar <> '' AND p_avatar NOT LIKE 'groups/' || p_chat || '/%' THEN RAISE EXCEPTION 'invalid_avatar'; END IF;
    UPDATE public.wipp_groups SET avatar_url = nullif(p_avatar, '') WHERE chat_id = p_chat;
    PERFORM public.wipp_lot7_sys(p_chat, me, 'photo', CASE WHEN p_avatar = '' THEN 'La photo du groupe a été supprimée' ELSE 'La photo du groupe a été modifiée' END);
  END IF;
  RETURN 'ok';
END;
$function$;

-- Réinitialiser le lien d'invitation (admins) : tous les anciens liens / QR cessent de fonctionner.
CREATE OR REPLACE FUNCTION public.wipp_lot7_reset_invites(p_chat TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.wipp_group_invites SET revoked_at = now() WHERE chat_id = p_chat AND revoked_at IS NULL;
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_update_info(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_reset_invites(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_update_info(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_reset_invites(TEXT) TO authenticated;
