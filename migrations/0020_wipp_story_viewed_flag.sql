-- Expose whether the current profile has already viewed each active story.
-- Does not create a table. Reuses public.wipp_story_views (story_id, viewer_id, viewed_at).
-- Does not edit 0018 or 0019. Does not change wipp_lot7_view_story.
-- The viewer id is public.wipp_lot7_me() inside the function. The client does not send it.
-- Do not execute until reviewed.

BEGIN;

CREATE OR REPLACE FUNCTION public.wipp_lot7_stories() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
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
      'viewed', EXISTS (
        SELECT 1
        FROM public.wipp_story_views v
        WHERE v.story_id = s.id
          AND v.viewer_id = me
      ),
      'views', CASE
        WHEN s.author_id = me THEN (
          SELECT count(*) FROM public.wipp_story_views v WHERE v.story_id = s.id
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
  ), '[]'::jsonb);
END $$;

COMMIT;
