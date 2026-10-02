-- Visual text placed on a Story photo or video.
-- body stays the caption. overlay is a separate normalized placement.
-- Does not edit 0018, 0019, 0020, or 0021.
-- Apply after 0021 so the story feed keeps the own-story seen read path.
-- Do not execute until reviewed.

BEGIN;

ALTER TABLE public.wipp_stories
  ADD COLUMN IF NOT EXISTS overlay jsonb;

COMMENT ON COLUMN public.wipp_stories.overlay IS
  'Visual text on the media: {text, x, y, scale}. Not the caption in body.';

CREATE OR REPLACE FUNCTION public.wipp_lot7_publish_story(
  p_kind text,
  p_body text,
  p_media text,
  p_audience text,
  p_overlay jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  sid text;
  clean_overlay jsonb := NULL;
  raw_text text;
  raw_x double precision;
  raw_y double precision;
  raw_scale double precision;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_audience NOT IN ('contacts', 'only_me', 'close') THEN RAISE EXCEPTION 'audience'; END IF;
  IF p_kind NOT IN ('text', 'image', 'video') THEN RAISE EXCEPTION 'kind'; END IF;
  IF p_kind = 'text' AND btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'empty_story';
  END IF;
  IF p_kind IN ('image', 'video') THEN
    IF p_media IS NULL OR btrim(p_media) = '' THEN
      RAISE EXCEPTION 'media_required';
    END IF;
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN
      RAISE EXCEPTION 'media_path';
    END IF;
    p_media := btrim(p_media);
  ELSIF p_media IS NOT NULL AND btrim(p_media) <> '' THEN
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN
      RAISE EXCEPTION 'media_path';
    END IF;
    p_media := btrim(p_media);
  END IF;
  IF p_overlay IS NOT NULL THEN
    IF jsonb_typeof(p_overlay) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'overlay';
    END IF;
    raw_text := left(btrim(coalesce(p_overlay->>'text', '')), 80);
    IF raw_text <> '' THEN
      BEGIN
        raw_x := least(0.88, greatest(0.12, coalesce((p_overlay->>'x')::double precision, 0.5)));
        raw_y := least(0.72, greatest(0.16, coalesce((p_overlay->>'y')::double precision, 0.22)));
        raw_scale := least(2.4, greatest(0.7, coalesce((p_overlay->>'scale')::double precision, 1)));
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'overlay';
      END;
      clean_overlay := jsonb_build_object('text', raw_text, 'x', raw_x, 'y', raw_y, 'scale', raw_scale);
    END IF;
  END IF;
  sid := 'sty_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_stories (id, author_id, kind, body, media_url, audience, expires_at, overlay)
  VALUES (sid, me, p_kind, left(coalesce(p_body, ''), 2000), p_media, p_audience, now() + interval '24 hours', clean_overlay);
  RETURN sid;
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text, jsonb) TO authenticated;

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
  ), '[]'::jsonb);
END $$;

COMMIT;
