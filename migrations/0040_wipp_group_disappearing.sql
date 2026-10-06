-- Messages éphémères dans les groupes : l'heure d'expiration est calculée à l'envoi
-- (les messages expirés sont déjà masqués par la règle de lecture). Fonction remplacée, aucune donnée touchée.
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
  ttl bigint;
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
  SELECT disappear_after_ms INTO ttl FROM public.wipp_chats WHERE id = p_chat;
  mid := 'm_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_messages (id, chat_id, sender_id, body, client_id, reply_to, mentions, system_event, expires_at)
  VALUES (mid, p_chat, me, p_body, p_client, p_reply, clean, NULL,
          CASE WHEN coalesce(ttl, 0) > 0 THEN now() + (ttl || ' milliseconds')::interval ELSE NULL END);
  RETURN mid;
END $function$;
