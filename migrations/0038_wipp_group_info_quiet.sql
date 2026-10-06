-- Création de groupe avec photo + description : les infos de départ sont enregistrées sans messages
-- système (« La photo du groupe a été modifiée » n'a pas de sens à la création). Fonction remplacée
-- par la même avec un 5e paramètre facultatif ; aucune donnée touchée.

DROP FUNCTION IF EXISTS public.wipp_lot7_update_info(TEXT, TEXT, TEXT, TEXT);

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
  IF NOT public.wipp_lot7_is_admin(p_chat, me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT name, description, avatar_url, created_at INTO g FROM public.wipp_groups WHERE chat_id = p_chat;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_group'; END IF;
  -- "quiet" only for the setup right after creation (a few minutes), never to hide later changes.
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

REVOKE ALL ON FUNCTION public.wipp_lot7_update_info(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_update_info(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
