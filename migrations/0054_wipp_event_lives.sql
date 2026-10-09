-- Événements en ligne WIPP (conférences / masterclass) : un « direct » rattaché à un wipp_events.
-- Aucune table supprimée : wipp_events reste le seul système d'événements ; ceci ajoute la salle en direct.

CREATE TABLE IF NOT EXISTS public.wipp_event_lives (
  event_id TEXT PRIMARY KEY REFERENCES public.wipp_events(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  mode TEXT NOT NULL DEFAULT 'conference' CHECK (mode IN ('conference', 'interactive')),
  state TEXT NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled', 'live', 'ended', 'cancelled')),
  duration_min INT NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 10 AND 480),
  max_viewers INT NOT NULL DEFAULT 100 CHECK (max_viewers BETWEEN 2 AND 1000),
  max_speakers INT NOT NULL DEFAULT 4 CHECK (max_speakers BETWEEN 1 AND 9),
  comments_on BOOLEAN NOT NULL DEFAULT true,
  reactions_on BOOLEAN NOT NULL DEFAULT true,
  questions_on BOOLEAN NOT NULL DEFAULT true,
  -- Lien d'invitation (conférences privées) : seule l'empreinte est gardée ; régénérer = révoquer l'ancien.
  invite_hash TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inscrits, invités, intervenants, exclus. L'organisateur = wipp_events.owner_id.
CREATE TABLE IF NOT EXISTS public.wipp_event_live_members (
  event_id TEXT NOT NULL REFERENCES public.wipp_event_lives(event_id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('invited', 'registered', 'banned')),
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'speaker', 'moderator')),
  invited_by TEXT REFERENCES public.wipp_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);
CREATE INDEX IF NOT EXISTS wipp_event_live_members_profile ON public.wipp_event_live_members (profile_id);

-- Tout passe par le serveur WIPP (clé de service) : aucun accès direct depuis l'app.
ALTER TABLE public.wipp_event_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_event_live_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_event_lives FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wipp_event_live_members FROM PUBLIC, anon, authenticated;

-- La liste des événements montre le direct (état, visibilité, inscrits) et cache les directs privés
-- aux personnes qui ne sont ni l'organisateur ni invitées / inscrites.
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
      ), '[]'::jsonb),
      'live', CASE WHEN l.event_id IS NULL THEN NULL ELSE jsonb_build_object(
        'visibility', l.visibility, 'mode', l.mode, 'state', l.state, 'duration_min', l.duration_min,
        'registered', (SELECT count(*) FROM public.wipp_event_live_members m WHERE m.event_id = e.id AND m.status = 'registered'),
        'my_status', (SELECT m.status FROM public.wipp_event_live_members m WHERE m.event_id = e.id AND m.profile_id = me)
      ) END
    ) ORDER BY e.starts_at NULLS LAST, e.created_at DESC)
    FROM public.wipp_events e
    JOIN public.wipp_profiles p ON p.id = e.owner_id
    LEFT JOIN public.wipp_event_lives l ON l.event_id = e.id
    WHERE (e.status = 'active' OR e.owner_id = me)
      AND (
        l.event_id IS NULL OR l.visibility = 'public' OR e.owner_id = me
        OR EXISTS (SELECT 1 FROM public.wipp_event_live_members m WHERE m.event_id = e.id AND m.profile_id = me AND m.status <> 'banned')
      )
      AND (q IS NULL OR e.title ILIKE '%' || q || '%' OR e.description ILIKE '%' || q || '%'
           OR e.city ILIKE '%' || q || '%' OR e.place ILIKE '%' || q || '%')
  ), '[]'::jsonb);
END $function$;

-- 0055 (appliquée séparément) : show_registered (afficher les inscrits, oui par défaut) et jusqu'à 10 photos
-- d'inscrits / d'intéressés dans wipp_lot7_events. Voir migrations/0055_wipp_event_lives_show_registered.sql.
