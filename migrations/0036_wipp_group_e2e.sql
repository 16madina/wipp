-- Chiffrement de bout en bout des groupes : une clé de groupe par « époque », distribuée à chaque
-- membre chiffrée avec SA clé (ECDH, comme les messages privés). Le serveur ne voit jamais la clé
-- en clair. Nouvelle époque à chaque changement de membres (arrivée, départ, retrait).
-- NON DESTRUCTIVE : nouvelles tables + une fonction. Les anciens messages restent tels quels.

CREATE TABLE IF NOT EXISTS public.wipp_group_key_epochs (
  chat_id TEXT NOT NULL REFERENCES public.wipp_chats(id) ON DELETE CASCADE,
  epoch INTEGER NOT NULL CHECK (epoch > 0),
  created_by TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  member_ids TEXT[] NOT NULL,          -- membres qui ont reçu cette clé
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, epoch)
);

CREATE TABLE IF NOT EXISTS public.wipp_group_keys (
  chat_id TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  member_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  sealed JSONB NOT NULL,               -- { iv, ct, spk } : clé de groupe chiffrée pour ce membre
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, epoch, member_id),
  FOREIGN KEY (chat_id, epoch) REFERENCES public.wipp_group_key_epochs(chat_id, epoch) ON DELETE CASCADE
);

ALTER TABLE public.wipp_group_key_epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_group_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_group_key_epochs, public.wipp_group_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wipp_group_key_epochs, public.wipp_group_keys TO authenticated;

-- Les membres du groupe voient la liste des époques ; chacun ne voit QUE sa propre clé scellée.
DROP POLICY IF EXISTS group_key_epochs_read ON public.wipp_group_key_epochs;
CREATE POLICY group_key_epochs_read ON public.wipp_group_key_epochs
  FOR SELECT USING (wipp_private.wipp_is_member(chat_id));
DROP POLICY IF EXISTS group_keys_read_own ON public.wipp_group_keys;
CREATE POLICY group_keys_read_own ON public.wipp_group_keys
  FOR SELECT USING (member_id = wipp_private.wipp_me() AND wipp_private.wipp_is_member(chat_id));

-- Publier une nouvelle époque (création du groupe ou changement de membres).
-- Contrôles : l'appelant est membre ; l'époque suit la dernière (sinon conflit, le téléphone réessaie) ;
-- une clé scellée pour CHAQUE membre listé, et chaque membre listé est bien membre du groupe.
CREATE OR REPLACE FUNCTION public.wipp_group_key_rotate(p_chat TEXT, p_epoch INTEGER, p_keys JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  me TEXT := wipp_private.wipp_me();
  current_epoch INTEGER;
  ids TEXT[];
  k JSONB;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_groups WHERE chat_id = p_chat) THEN RAISE EXCEPTION 'not_group'; END IF;
  IF NOT EXISTS (SELECT 1 FROM wipp_chat_members WHERE chat_id = p_chat AND profile_id = me) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_typeof(p_keys) <> 'array' OR jsonb_array_length(p_keys) = 0 OR jsonb_array_length(p_keys) > 1024 THEN
    RAISE EXCEPTION 'invalid_keys';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('wipp_group_key:' || p_chat));
  SELECT coalesce(max(epoch), 0) INTO current_epoch FROM wipp_group_key_epochs WHERE chat_id = p_chat;
  IF p_epoch <> current_epoch + 1 THEN RAISE EXCEPTION 'epoch_conflict'; END IF;
  SELECT array_agg(DISTINCT e->>'member') INTO ids FROM jsonb_array_elements(p_keys) e;
  IF array_length(ids, 1) <> jsonb_array_length(p_keys) THEN RAISE EXCEPTION 'invalid_keys'; END IF;
  IF NOT (me = ANY(ids)) THEN RAISE EXCEPTION 'invalid_keys'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ids) AS m(id)
    WHERE NOT EXISTS (SELECT 1 FROM wipp_chat_members cm WHERE cm.chat_id = p_chat AND cm.profile_id = m.id)
  ) THEN RAISE EXCEPTION 'not_member'; END IF;
  INSERT INTO wipp_group_key_epochs (chat_id, epoch, created_by, member_ids) VALUES (p_chat, p_epoch, me, ids);
  FOR k IN SELECT * FROM jsonb_array_elements(p_keys) LOOP
    IF (k->'sealed'->>'iv') IS NULL OR (k->'sealed'->>'ct') IS NULL OR (k->'sealed'->'spk') IS NULL THEN
      RAISE EXCEPTION 'invalid_keys';
    END IF;
    INSERT INTO wipp_group_keys (chat_id, epoch, member_id, sealed) VALUES (p_chat, p_epoch, k->>'member', k->'sealed');
  END LOOP;
  RETURN p_epoch;
END;
$function$;

REVOKE ALL ON FUNCTION public.wipp_group_key_rotate(TEXT, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_group_key_rotate(TEXT, INTEGER, JSONB) TO authenticated;
