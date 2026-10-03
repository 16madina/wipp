-- Listing and event details used by the publication forms.
-- Apply only after review. Do not run automatically.
-- Does not modify 0018–0023.
-- Existing rows stay valid: new columns are nullable or have defaults.
-- Replaces the lot7 save/read functions so the app writes and reloads these fields.
-- Old calls that omit the new arguments still work: those arguments have defaults.

BEGIN;

ALTER TABLE public.wipp_listings
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.wipp_listings
  DROP CONSTRAINT IF EXISTS wipp_listings_condition_check;

ALTER TABLE public.wipp_listings
  ADD CONSTRAINT wipp_listings_condition_check
  CHECK (condition IS NULL OR condition IN ('new', 'like_new', 'good', 'used'));

ALTER TABLE public.wipp_events
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_url text,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT '';

ALTER TABLE public.wipp_events
  DROP CONSTRAINT IF EXISTS wipp_events_ends_after_start;

ALTER TABLE public.wipp_events
  ADD CONSTRAINT wipp_events_ends_after_start
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at);

ALTER TABLE public.wipp_events
  DROP CONSTRAINT IF EXISTS wipp_events_paid_price_check;

ALTER TABLE public.wipp_events
  ADD CONSTRAINT wipp_events_paid_price_check
  CHECK (is_free OR nullif(btrim(coalesce(price, '')), '') IS NOT NULL);

DROP FUNCTION IF EXISTS public.wipp_lot7_save_listing(text, text, text, text, text, text, text);

CREATE FUNCTION public.wipp_lot7_save_listing(
  p_title text,
  p_desc text,
  p_cat text,
  p_price text,
  p_city text,
  p_photo text,
  p_id text,
  p_country text DEFAULT '',
  p_area text DEFAULT '',
  p_phone text DEFAULT '',
  p_negotiable boolean DEFAULT false,
  p_currency text DEFAULT '',
  p_condition text DEFAULT '',
  p_photos text[] DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  lid text;
  photos text[] := '{}';
  raw text[];
  item text;
  prior text[];
  old_cover text;
  cond text;
  cover text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  cond := nullif(lower(trim(coalesce(p_condition, ''))), '');
  IF cond = 'like-new' THEN cond := 'like_new'; END IF;
  IF cond IS NOT NULL AND cond NOT IN ('new', 'like_new', 'good', 'used') THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  IF p_id IS NOT NULL AND p_id <> '' THEN
    SELECT l.photo_urls, l.photo_url INTO prior, old_cover
    FROM public.wipp_listings l
    WHERE l.id = p_id AND l.owner_id = me;
  END IF;

  raw := coalesce(
    p_photos,
    CASE WHEN nullif(trim(coalesce(p_photo, '')), '') IS NULL THEN '{}'::text[] ELSE ARRAY[trim(p_photo)] END
  );
  FOREACH item IN ARRAY raw LOOP
    item := nullif(trim(item), '');
    IF item IS NULL THEN CONTINUE; END IF;
    IF left(item, length('listings/' || me || '/')) = 'listings/' || me || '/'
       OR item = ANY(coalesce(prior, '{}'))
       OR item IS NOT DISTINCT FROM old_cover
    THEN
      photos := photos || item;
    ELSE
      RAISE EXCEPTION 'forbidden';
    END IF;
  END LOOP;
  IF cardinality(photos) > 8 THEN RAISE EXCEPTION 'invalid'; END IF;
  cover := nullif(trim(coalesce(p_photo, '')), '');
  IF cover IS NULL AND cardinality(photos) > 0 THEN
    cover := photos[1];
  END IF;
  IF cover IS NOT NULL AND NOT (cover = ANY(photos)) AND cardinality(photos) > 0 THEN
    cover := photos[1];
  END IF;

  IF p_id IS NULL OR p_id = '' THEN
    lid := 'lst_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.wipp_listings (
      id, owner_id, title, description, category, price_label, city, photo_url,
      country, area, contact_phone, negotiable, currency, condition, photo_urls
    ) VALUES (
      lid,
      me,
      left(trim(p_title), 120),
      left(coalesce(p_desc, ''), 4000),
      left(coalesce(p_cat, 'goods'), 40),
      nullif(left(coalesce(p_price, ''), 40), ''),
      left(coalesce(p_city, ''), 80),
      cover,
      left(coalesce(p_country, ''), 80),
      left(coalesce(p_area, ''), 80),
      nullif(left(coalesce(p_phone, ''), 40), ''),
      coalesce(p_negotiable, false),
      left(coalesce(p_currency, ''), 8),
      cond,
      photos
    );
    RETURN lid;
  END IF;

  UPDATE public.wipp_listings SET
    title = left(trim(p_title), 120),
    description = left(coalesce(p_desc, ''), 4000),
    category = left(coalesce(p_cat, 'goods'), 40),
    price_label = nullif(left(coalesce(p_price, ''), 40), ''),
    city = left(coalesce(p_city, ''), 80),
    photo_url = cover,
    country = left(coalesce(p_country, ''), 80),
    area = left(coalesce(p_area, ''), 80),
    contact_phone = nullif(left(coalesce(p_phone, ''), 40), ''),
    negotiable = coalesce(p_negotiable, false),
    currency = left(coalesce(p_currency, ''), 8),
    condition = cond,
    photo_urls = photos,
    updated_at = now()
  WHERE id = p_id AND owner_id = me AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_listings(p_q text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  q text := nullif(trim(coalesce(p_q, '')), '');
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', l.id, 'owner_id', l.owner_id, 'title', l.title, 'description', l.description,
      'category', l.category, 'price_label', l.price_label, 'city', l.city,
      'photo_url', l.photo_url, 'created_at', l.created_at, 'status', l.status,
      'username', p.username, 'display_name', p.display_name,
      'country', l.country, 'area', l.area, 'contact_phone', l.contact_phone,
      'negotiable', l.negotiable, 'currency', l.currency, 'condition', l.condition,
      'photo_urls', CASE
        WHEN cardinality(l.photo_urls) > 0 THEN to_jsonb(l.photo_urls)
        WHEN l.photo_url IS NOT NULL AND l.photo_url <> '' THEN to_jsonb(ARRAY[l.photo_url])
        ELSE '[]'::jsonb
      END
    ) ORDER BY l.created_at DESC)
    FROM public.wipp_listings l
    JOIN public.wipp_profiles p ON p.id = l.owner_id
    WHERE (l.status = 'active' OR l.owner_id = me)
      AND (q IS NULL OR l.title ILIKE '%' || q || '%' OR l.description ILIKE '%' || q || '%'
           OR l.category ILIKE '%' || q || '%' OR l.city ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

DROP FUNCTION IF EXISTS public.wipp_lot7_save_event(text, text, text, text, text, text, text, text);

CREATE FUNCTION public.wipp_lot7_save_event(
  p_title text,
  p_desc text,
  p_city text,
  p_place text,
  p_starts text,
  p_photo text,
  p_contact text,
  p_id text,
  p_ends text DEFAULT '',
  p_category text DEFAULT '',
  p_country text DEFAULT '',
  p_address text DEFAULT '',
  p_online boolean DEFAULT false,
  p_url text DEFAULT '',
  p_free boolean DEFAULT true,
  p_price text DEFAULT '',
  p_currency text DEFAULT ''
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  eid text;
  starts timestamptz;
  ends timestamptz;
  cover text;
  old_cover text;
  free boolean := coalesce(p_free, true);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  BEGIN
    starts := nullif(p_starts, '')::timestamptz;
  EXCEPTION WHEN others THEN
    starts := NULL;
  END;
  BEGIN
    ends := nullif(p_ends, '')::timestamptz;
  EXCEPTION WHEN others THEN
    ends := NULL;
  END;
  IF starts IS NOT NULL AND ends IS NOT NULL AND ends < starts THEN
    RAISE EXCEPTION 'invalid';
  END IF;
  IF NOT free AND nullif(trim(coalesce(p_price, '')), '') IS NULL THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  cover := nullif(trim(coalesce(p_photo, '')), '');
  IF p_id IS NOT NULL AND p_id <> '' THEN
    SELECT e.photo_url INTO old_cover
    FROM public.wipp_events e
    WHERE e.id = p_id AND e.owner_id = me;
  END IF;
  IF cover IS NOT NULL
     AND left(cover, length('events/' || me || '/')) <> 'events/' || me || '/'
     AND cover IS DISTINCT FROM old_cover
  THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_id IS NULL OR p_id = '' THEN
    eid := 'evt_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.wipp_events (
      id, owner_id, title, description, city, place, starts_at, photo_url, contact,
      ends_at, category, country, address, is_online, online_url, is_free, price, currency
    ) VALUES (
      eid,
      me,
      left(trim(p_title), 120),
      left(coalesce(p_desc, ''), 4000),
      left(coalesce(p_city, ''), 80),
      left(coalesce(p_place, ''), 160),
      starts,
      cover,
      nullif(left(coalesce(p_contact, ''), 120), ''),
      ends,
      left(coalesce(p_category, ''), 40),
      left(coalesce(p_country, ''), 80),
      left(coalesce(p_address, ''), 200),
      coalesce(p_online, false),
      nullif(left(coalesce(p_url, ''), 200), ''),
      free,
      CASE WHEN free THEN NULL ELSE nullif(left(trim(p_price), 40), '') END,
      CASE WHEN free THEN '' ELSE left(coalesce(p_currency, ''), 8) END
    );
    RETURN eid;
  END IF;

  UPDATE public.wipp_events SET
    title = left(trim(p_title), 120),
    description = left(coalesce(p_desc, ''), 4000),
    city = left(coalesce(p_city, ''), 80),
    place = left(coalesce(p_place, ''), 160),
    starts_at = starts,
    photo_url = cover,
    contact = nullif(left(coalesce(p_contact, ''), 120), ''),
    ends_at = ends,
    category = left(coalesce(p_category, ''), 40),
    country = left(coalesce(p_country, ''), 80),
    address = left(coalesce(p_address, ''), 200),
    is_online = coalesce(p_online, false),
    online_url = nullif(left(coalesce(p_url, ''), 200), ''),
    is_free = free,
    price = CASE WHEN free THEN NULL ELSE nullif(left(trim(p_price), 40), '') END,
    currency = CASE WHEN free THEN '' ELSE left(coalesce(p_currency, ''), 8) END,
    updated_at = now()
  WHERE id = p_id AND owner_id = me AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_events(p_q text) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  me text := public.wipp_lot7_me();
  q text := nullif(trim(coalesce(p_q, '')), '');
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', e.id, 'owner_id', e.owner_id, 'title', e.title, 'description', e.description,
      'city', e.city, 'place', e.place, 'starts_at', e.starts_at, 'photo_url', e.photo_url,
      'contact', e.contact, 'status', e.status, 'username', p.username, 'display_name', p.display_name,
      'ends_at', e.ends_at, 'category', e.category, 'country', e.country, 'address', e.address,
      'is_online', e.is_online, 'online_url', e.online_url, 'is_free', e.is_free,
      'price', e.price, 'currency', e.currency
    ) ORDER BY e.starts_at NULLS LAST, e.created_at DESC)
    FROM public.wipp_events e
    JOIN public.wipp_profiles p ON p.id = e.owner_id
    WHERE (e.status = 'active' OR e.owner_id = me)
      AND (q IS NULL OR e.title ILIKE '%' || q || '%' OR e.description ILIKE '%' || q || '%'
           OR e.city ILIKE '%' || q || '%' OR e.place ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text, text, text, text, boolean, text, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_listing(text, text, text, text, text, text, text, text, text, text, boolean, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_save_event(text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, boolean, text, text) TO authenticated;

COMMIT;
