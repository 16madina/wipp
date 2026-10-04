-- Listings: view counts, seller ratings, coordinates, "mettre en avant" and scheduled publication.
-- Additive only: new columns default to "nothing", existing listings keep working.

ALTER TABLE public.wipp_listings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

-- One row per (listing, viewer): a view is counted once per person, never the owner.
CREATE TABLE IF NOT EXISTS public.wipp_listing_views (
  listing_id text NOT NULL REFERENCES public.wipp_listings(id) ON DELETE CASCADE,
  viewer_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, viewer_id)
);
ALTER TABLE public.wipp_listing_views ENABLE ROW LEVEL SECURITY;

-- One rating per (seller, rater), 1 to 5 stars.
CREATE TABLE IF NOT EXISTS public.wipp_seller_ratings (
  seller_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  rater_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, rater_id),
  CHECK (seller_id <> rater_id)
);
ALTER TABLE public.wipp_seller_ratings ENABLE ROW LEVEL SECURITY;
-- Both tables are only reached through the SECURITY DEFINER functions below.

CREATE OR REPLACE FUNCTION public.wipp_lot7_view_listing(p_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  INSERT INTO public.wipp_listing_views (listing_id, viewer_id)
  SELECT l.id, me FROM public.wipp_listings l WHERE l.id = p_id AND l.owner_id <> me
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_rate_seller(p_seller text, p_stars int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_seller = me THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_stars < 1 OR p_stars > 5 THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.wipp_seller_ratings (seller_id, rater_id, stars) VALUES (p_seller, me, p_stars)
  ON CONFLICT (seller_id, rater_id) DO UPDATE SET stars = excluded.stars, created_at = now();
END $$;

-- Everything the listing page shows about popularity and the seller.
CREATE OR REPLACE FUNCTION public.wipp_lot7_listing_stats(p_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE
  me text := public.wipp_lot7_me();
  owner text;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT owner_id INTO owner FROM public.wipp_listings WHERE id = p_id;
  IF owner IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'views', (SELECT count(*) FROM public.wipp_listing_views WHERE listing_id = p_id),
    'member_since', (SELECT created_at FROM public.wipp_profiles WHERE id = owner),
    'seller_listings', (SELECT count(*) FROM public.wipp_listings WHERE owner_id = owner AND status = 'active'),
    'rating', (SELECT round(avg(stars)::numeric, 1) FROM public.wipp_seller_ratings WHERE seller_id = owner),
    'rating_count', (SELECT count(*) FROM public.wipp_seller_ratings WHERE seller_id = owner),
    'my_rating', (SELECT stars FROM public.wipp_seller_ratings WHERE seller_id = owner AND rater_id = me)
  );
END $$;

-- Boost: one listing per seller at a time, 7 days. Scheduling: hidden from others until publish_at.
CREATE OR REPLACE FUNCTION public.wipp_lot7_listing_extras(p_id text, p_lat double precision, p_lng double precision, p_boost boolean, p_publish_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_boost THEN
    UPDATE public.wipp_listings SET boosted_until = NULL WHERE owner_id = me AND id <> p_id;
  END IF;
  UPDATE public.wipp_listings SET
    lat = p_lat,
    lng = p_lng,
    boosted_until = CASE
      WHEN NOT p_boost THEN NULL
      WHEN boosted_until IS NOT NULL AND boosted_until > now() THEN boosted_until
      ELSE greatest(now(), coalesce(p_publish_at, now())) + interval '7 days'
    END,
    publish_at = CASE WHEN p_publish_at IS NOT NULL AND p_publish_at > now() THEN p_publish_at ELSE NULL END
  WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_listings(p_q text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  me text := public.wipp_lot7_me();
  q text := nullif(trim(coalesce(p_q, '')), '');
BEGIN
  IF me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', l.id, 'owner_id', l.owner_id, 'title', l.title, 'description', l.description,
      'category', l.category, 'price_label', l.price_label, 'city', l.city,
      'photo_url', l.photo_url, 'created_at', coalesce(l.publish_at, l.created_at), 'status', l.status,
      'username', p.username, 'display_name', p.display_name,
      'country', l.country, 'area', l.area, 'contact_phone', l.contact_phone,
      'negotiable', l.negotiable, 'currency', l.currency, 'condition', l.condition,
      'lat', l.lat, 'lng', l.lng,
      'boosted', l.boosted_until IS NOT NULL AND l.boosted_until > now(),
      'publish_at', l.publish_at,
      'views', (SELECT count(*) FROM public.wipp_listing_views v WHERE v.listing_id = l.id),
      'photo_urls', CASE
        WHEN cardinality(l.photo_urls) > 0 THEN to_jsonb(l.photo_urls)
        WHEN l.photo_url IS NOT NULL AND l.photo_url <> '' THEN to_jsonb(ARRAY[l.photo_url])
        ELSE '[]'::jsonb
      END
    ) ORDER BY (l.boosted_until IS NOT NULL AND l.boosted_until > now()) DESC, coalesce(l.publish_at, l.created_at) DESC)
    FROM public.wipp_listings l
    JOIN public.wipp_profiles p ON p.id = l.owner_id
    WHERE (l.status = 'active' OR l.owner_id = me)
      AND (l.publish_at IS NULL OR l.publish_at <= now() OR l.owner_id = me)
      AND (q IS NULL OR l.title ILIKE '%' || q || '%' OR l.description ILIKE '%' || q || '%'
           OR l.category ILIKE '%' || q || '%' OR l.city ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_view_listing(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_rate_seller(text, int) FROM public, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_listing_stats(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_listing_extras(text, double precision, double precision, boolean, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_view_listing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_rate_seller(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_listing_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_listing_extras(text, double precision, double precision, boolean, timestamptz) TO authenticated;
