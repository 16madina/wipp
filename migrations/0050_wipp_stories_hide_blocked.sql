-- Stories : ne plus jamais montrer celles d'une personne bloquée (dans les deux sens)
-- ni celles d'un compte suspendu par la modération. Même fonction qu'avant, deux conditions en plus.
-- NON DESTRUCTIF.

CREATE OR REPLACE FUNCTION public.wipp_lot7_stories()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
      'overlay', s.overlay,
      'media_url', s.media_url,
      'audience', s.audience,
      'created_at', s.created_at,
      'expires_at', s.expires_at,
      'viewed', EXISTS (
        SELECT 1
        FROM public.wipp_story_views v
        WHERE v.story_id = s.id
          AND v.viewer_id = me
      ),
      'views', CASE
        WHEN s.author_id = me THEN (
          SELECT count(*)
          FROM public.wipp_story_views v
          WHERE v.story_id = s.id
            AND v.viewer_id <> s.author_id
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
      AND (s.author_id = me OR p.suspended_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.wipp_blocks b
        WHERE (b.blocker_id = me AND b.blocked_id = s.author_id)
           OR (b.blocker_id = s.author_id AND b.blocked_id = me)
      )
  ), '[]'::jsonb);
END $function$;
