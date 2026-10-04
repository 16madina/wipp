-- Events: "Intéressé" (count + who), coordinates, capacity and 18+ as real columns.
-- Business cards: coordinates for distance. Additive only.

ALTER TABLE public.wipp_events
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0),
  ADD COLUMN IF NOT EXISTS adult_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.wipp_business_cards
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE TABLE IF NOT EXISTS public.wipp_event_interests (
  event_id text NOT NULL REFERENCES public.wipp_events(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);
ALTER TABLE public.wipp_event_interests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.wipp_lot7_toggle_interest(p_id text, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  IF p_on THEN
    INSERT INTO public.wipp_event_interests (event_id, profile_id)
    SELECT e.id, me FROM public.wipp_events e WHERE e.id = p_id AND e.status = 'active'
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.wipp_event_interests WHERE event_id = p_id AND profile_id = me;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_event_extras(p_id text, p_lat double precision, p_lng double precision, p_capacity integer, p_adult boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE public.wipp_events SET lat = p_lat, lng = p_lng,
    capacity = CASE WHEN p_capacity > 0 THEN p_capacity ELSE NULL END,
    adult_only = coalesce(p_adult, false)
  WHERE id = p_id AND owner_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_card_position(p_lat double precision, p_lng double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $$
DECLARE me text := public.wipp_lot7_me();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'no_session'; END IF;
  UPDATE public.wipp_business_cards SET lat = p_lat, lng = p_lng WHERE owner_profile_id = me;
END $$;

CREATE OR REPLACE FUNCTION public.wipp_lot7_events(p_q text)
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
      'id', e.id, 'owner_id', e.owner_id, 'title', e.title, 'description', e.description,
      'city', e.city, 'place', e.place, 'starts_at', e.starts_at, 'photo_url', e.photo_url,
      'contact', e.contact, 'status', e.status, 'username', p.username, 'display_name', p.display_name,
      'ends_at', e.ends_at, 'category', e.category, 'country', e.country, 'address', e.address,
      'is_online', e.is_online, 'online_url', e.online_url, 'is_free', e.is_free,
      'price', e.price, 'currency', e.currency,
      'lat', e.lat, 'lng', e.lng, 'capacity', e.capacity, 'adult_only', e.adult_only,
      'interested_count', (SELECT count(*) FROM public.wipp_event_interests i WHERE i.event_id = e.id),
      'interested_me', EXISTS (SELECT 1 FROM public.wipp_event_interests i WHERE i.event_id = e.id AND i.profile_id = me),
      'interested_avatars', coalesce((
        SELECT jsonb_agg(x.avatar_url) FROM (
          SELECT ip.avatar_url FROM public.wipp_event_interests i
          JOIN public.wipp_profiles ip ON ip.id = i.profile_id
          WHERE i.event_id = e.id AND ip.avatar_url IS NOT NULL
          ORDER BY i.created_at DESC LIMIT 3
        ) x
      ), '[]'::jsonb)
    ) ORDER BY e.starts_at NULLS LAST, e.created_at DESC)
    FROM public.wipp_events e
    JOIN public.wipp_profiles p ON p.id = e.owner_id
    WHERE (e.status = 'active' OR e.owner_id = me)
      AND (q IS NULL OR e.title ILIKE '%' || q || '%' OR e.description ILIKE '%' || q || '%'
           OR e.city ILIKE '%' || q || '%' OR e.place ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $function$;

REVOKE ALL ON FUNCTION public.wipp_lot7_toggle_interest(text, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_event_extras(text, double precision, double precision, integer, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.wipp_lot7_card_position(double precision, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_toggle_interest(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_event_extras(text, double precision, double precision, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipp_lot7_card_position(double precision, double precision) TO authenticated;
