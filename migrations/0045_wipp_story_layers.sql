-- Story texts (font, colour, background, rotation) and Wippie / Wippmoji stickers, as "layers" in overlay.
-- NON DESTRUCTIVE: same function signature as 0022; old flat fields {text, x, y, scale} are kept for older apps.

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
  layer jsonb;
  clean_layers jsonb := '[]'::jsonb;
  l_text text;
  n_layers int := 0;
  n_stickers int := 0;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_audience NOT IN ('contacts', 'only_me', 'close') THEN RAISE EXCEPTION 'audience'; END IF;
  IF p_kind NOT IN ('text', 'image', 'video') THEN RAISE EXCEPTION 'kind'; END IF;
  IF p_kind = 'text' AND btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'empty_story';
  END IF;
  IF p_kind IN ('image', 'video') THEN
    IF p_media IS NULL OR btrim(p_media) = '' THEN RAISE EXCEPTION 'media_required'; END IF;
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN RAISE EXCEPTION 'media_path'; END IF;
    p_media := btrim(p_media);
  ELSIF p_media IS NOT NULL AND btrim(p_media) <> '' THEN
    IF NOT wipp_private.wipp_own_story_media_path(btrim(p_media)) THEN RAISE EXCEPTION 'media_path'; END IF;
    p_media := btrim(p_media);
  END IF;

  IF p_overlay IS NOT NULL THEN
    IF jsonb_typeof(p_overlay) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'overlay'; END IF;
    BEGIN
      -- Layers: max 12, max 6 stickers, every value clamped / whitelisted.
      IF jsonb_typeof(p_overlay->'layers') = 'array' THEN
        FOR layer IN SELECT value FROM jsonb_array_elements(p_overlay->'layers') LOOP
          EXIT WHEN n_layers >= 12;
          CONTINUE WHEN jsonb_typeof(layer) IS DISTINCT FROM 'object';
          IF layer->>'t' = 'sticker' THEN
            CONTINUE WHEN coalesce(layer->>'id', '') !~ '^[a-z0-9-]{2,40}$' OR n_stickers >= 6;
            clean_layers := clean_layers || jsonb_build_array(jsonb_build_object(
              't', 'sticker',
              'id', layer->>'id',
              'x', least(0.98, greatest(0.02, coalesce((layer->>'x')::double precision, 0.5))),
              'y', least(0.96, greatest(0.04, coalesce((layer->>'y')::double precision, 0.45))),
              'scale', least(4, greatest(0.3, coalesce((layer->>'scale')::double precision, 1))),
              'rot', least(180, greatest(-180, coalesce((layer->>'rot')::double precision, 0)))
            ));
            n_stickers := n_stickers + 1;
            n_layers := n_layers + 1;
          ELSIF layer->>'t' = 'text' THEN
            l_text := left(btrim(coalesce(layer->>'text', '')), 120);
            CONTINUE WHEN l_text = '';
            clean_layers := clean_layers || jsonb_build_array(jsonb_build_object(
              't', 'text',
              'text', l_text,
              'x', least(0.98, greatest(0.02, coalesce((layer->>'x')::double precision, 0.5))),
              'y', least(0.96, greatest(0.04, coalesce((layer->>'y')::double precision, 0.4))),
              'scale', least(4, greatest(0.3, coalesce((layer->>'scale')::double precision, 1))),
              'rot', least(180, greatest(-180, coalesce((layer->>'rot')::double precision, 0))),
              'font', CASE WHEN layer->>'font' IN ('classic', 'strong', 'hand', 'typewriter', 'elegant', 'neon') THEN layer->>'font' ELSE 'classic' END,
              'color', CASE WHEN coalesce(layer->>'color', '') ~ '^#[0-9a-fA-F]{6}$' THEN lower(layer->>'color') ELSE '#ffffff' END,
              'bg', CASE WHEN layer->>'bg' IN ('none', 'solid', 'soft') THEN layer->>'bg' ELSE 'none' END
            ));
            n_layers := n_layers + 1;
          END IF;
        END LOOP;
      END IF;

      -- Flat first text, read by older app versions.
      raw_text := left(btrim(regexp_replace(coalesce(p_overlay->>'text', ''), '\s+', ' ', 'g')), 80);
      raw_x := least(0.88, greatest(0.12, coalesce((p_overlay->>'x')::double precision, 0.5)));
      raw_y := least(0.72, greatest(0.16, coalesce((p_overlay->>'y')::double precision, 0.22)));
      raw_scale := least(2.4, greatest(0.7, coalesce((p_overlay->>'scale')::double precision, 1)));
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'overlay';
    END;
    IF raw_text <> '' OR jsonb_array_length(clean_layers) > 0 THEN
      clean_overlay := jsonb_build_object('text', raw_text, 'x', raw_x, 'y', raw_y, 'scale', raw_scale);
      IF jsonb_array_length(clean_layers) > 0 THEN
        clean_overlay := clean_overlay || jsonb_build_object('layers', clean_layers);
      END IF;
    END IF;
  END IF;

  sid := 'sty_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wipp_stories (id, author_id, kind, body, media_url, audience, expires_at, overlay)
  VALUES (sid, me, p_kind, left(coalesce(p_body, ''), 2000), p_media, p_audience, now() + interval '24 hours', clean_overlay);
  RETURN sid;
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_publish_story(text, text, text, text, jsonb) TO authenticated;
