-- Sondages de groupe. NON DESTRUCTIVE.
-- La question et les choix voyagent dans le corps chiffré du message (clé de groupe) :
-- le serveur ne voit que « tel membre a choisi les choix n° 0 et 2 », jamais le texte.

CREATE TABLE IF NOT EXISTS public.wipp_poll_votes (
  message_id TEXT NOT NULL REFERENCES public.wipp_messages(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  options SMALLINT[] NOT NULL CHECK (cardinality(options) BETWEEN 1 AND 12),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_poll_votes_message ON public.wipp_poll_votes (message_id);

ALTER TABLE public.wipp_poll_votes ENABLE ROW LEVEL SECURITY;

-- Members of the chat see everyone's votes (like WhatsApp: votes are not anonymous).
DROP POLICY IF EXISTS wipp_poll_votes_read ON public.wipp_poll_votes;
CREATE POLICY wipp_poll_votes_read ON public.wipp_poll_votes
  FOR SELECT TO authenticated
  USING (wipp_private.wipp_is_member(wipp_private.wipp_message_chat(message_id)));

REVOKE ALL ON public.wipp_poll_votes FROM PUBLIC, anon;
GRANT SELECT ON public.wipp_poll_votes TO authenticated;

-- Writes only through this function: member check, valid option indexes, empty array = remove my vote.
CREATE OR REPLACE FUNCTION public.wipp_lot7_poll_vote(p_message TEXT, p_options SMALLINT[])
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  me TEXT := public.wipp_lot7_me();
  chat TEXT;
  clean SMALLINT[];
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT chat_id INTO chat FROM public.wipp_messages WHERE id = p_message AND deleted_at IS NULL;
  IF chat IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_groups WHERE chat_id = chat) THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_chat_members WHERE chat_id = chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT coalesce(array_agg(DISTINCT o ORDER BY o), '{}') INTO clean FROM unnest(coalesce(p_options, '{}')) AS o WHERE o BETWEEN 0 AND 11;
  IF cardinality(clean) = 0 THEN
    DELETE FROM public.wipp_poll_votes WHERE message_id = p_message AND profile_id = me;
    RETURN 'removed';
  END IF;
  INSERT INTO public.wipp_poll_votes (message_id, profile_id, options, updated_at)
  VALUES (p_message, me, clean, now())
  ON CONFLICT (message_id, profile_id) DO UPDATE SET options = excluded.options, updated_at = now();
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_poll_vote(TEXT, SMALLINT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_poll_vote(TEXT, SMALLINT[]) TO authenticated;

-- Live updates for the voters' phones.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wipp_poll_votes;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
