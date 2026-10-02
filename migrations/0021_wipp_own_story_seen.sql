-- Own-story seen state.
-- Records that the author opened their own story, without counting them as a viewer.
-- Does not edit 0018, 0019, or 0020. Does not create a table.
-- Reuses public.wipp_story_views. The profile id is public.wipp_lot7_me(), never a client id.
-- Do not execute until reviewed.

BEGIN;

CREATE OR REPLACE FUNCTION public.wipp_lot7_view_story(p_id text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  s public.wipp_stories%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  SELECT * INTO s FROM public.wipp_stories WHERE id = p_id AND deleted_at IS NULL AND expires_at > now();
  IF s.id IS NULL THEN RETURN 'missing'; END IF;
  IF s.author_id = me THEN
    INSERT INTO public.wipp_story_views (story_id, viewer_id) VALUES (s.id, me) ON CONFLICT DO NOTHING;
    RETURN 'ok';
  END IF;
  IF s.audience = 'only_me' THEN RETURN 'forbidden'; END IF;
  IF s.audience = 'contacts' AND NOT public.wipp_lot7_is_contact(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  IF s.audience = 'close' AND NOT public.wipp_lot15_is_close(s.author_id, me) THEN
    RETURN 'forbidden';
  END IF;
  INSERT INTO public.wipp_story_views (story_id, viewer_id) VALUES (s.id, me) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_story_viewers(p_id text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wipp_stories WHERE id = p_id AND author_id = me) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'viewer_id', v.viewer_id,
      'username', p.username,
      'display_name', p.display_name,
      'viewed_at', v.viewed_at
    ) ORDER BY v.viewed_at DESC)
    FROM public.wipp_story_views v
    JOIN public.wipp_profiles p ON p.id = v.viewer_id
    WHERE v.story_id = p_id
      AND v.viewer_id <> me
  ), '[]'::jsonb);
END $$;

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
  ), '[]'::jsonb);
END $$;

COMMIT;
