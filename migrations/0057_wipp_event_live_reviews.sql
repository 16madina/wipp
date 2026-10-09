-- Fin de conférence : présence réelle (rejoint la salle) et avis (1 par participant, modifiable).
CREATE TABLE IF NOT EXISTS public.wipp_event_live_attendance (
  event_id TEXT NOT NULL REFERENCES public.wipp_event_lives(event_id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  first_joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.wipp_event_live_reviews (
  event_id TEXT NOT NULL REFERENCES public.wipp_event_lives(event_id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 500),
  -- visible ; hidden = masqué par la modération WIPP
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id),
  CHECK (rating IS NOT NULL OR char_length(body) > 0)
);

ALTER TABLE public.wipp_event_live_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_event_live_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_event_live_attendance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wipp_event_live_reviews FROM PUBLIC, anon, authenticated;
