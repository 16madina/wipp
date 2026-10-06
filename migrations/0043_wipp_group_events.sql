-- Événements de groupe. NON DESTRUCTIVE.
-- Titre, date, lieu et description voyagent dans le corps chiffré du message (clé de groupe) ;
-- le serveur ne garde que les réponses : « tel membre : j'y vais / peut-être / non ».

CREATE TABLE IF NOT EXISTS public.wipp_event_rsvps (
  message_id TEXT NOT NULL REFERENCES public.wipp_messages(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'no')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_event_rsvps_message ON public.wipp_event_rsvps (message_id);

ALTER TABLE public.wipp_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wipp_event_rsvps_read ON public.wipp_event_rsvps;
CREATE POLICY wipp_event_rsvps_read ON public.wipp_event_rsvps
  FOR SELECT TO authenticated
  USING (wipp_private.wipp_is_member(wipp_private.wipp_message_chat(message_id)));

REVOKE ALL ON public.wipp_event_rsvps FROM PUBLIC, anon;
GRANT SELECT ON public.wipp_event_rsvps TO authenticated;

-- Answer (or clear with NULL) through this function only: group member check.
CREATE OR REPLACE FUNCTION public.wipp_lot7_event_rsvp(p_message TEXT, p_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  chat TEXT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT chat_id INTO chat FROM public.wipp_messages WHERE id = p_message AND deleted_at IS NULL;
  IF chat IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_groups WHERE chat_id = chat) THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status IS NULL THEN
    DELETE FROM public.wipp_event_rsvps WHERE message_id = p_message AND profile_id = me;
    RETURN 'removed';
  END IF;
  IF p_status NOT IN ('going', 'maybe', 'no') THEN RAISE EXCEPTION 'status'; END IF;
  INSERT INTO public.wipp_event_rsvps (message_id, profile_id, status, updated_at)
  VALUES (p_message, me, p_status, now())
  ON CONFLICT (message_id, profile_id) DO UPDATE SET status = excluded.status, updated_at = now();
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_event_rsvp(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_event_rsvp(TEXT, TEXT) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wipp_event_rsvps;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
