-- Étape B : questions-réponses des directs WIPP (rattachées à wipp_event_lives, aucun système parallèle).
-- Statuts : pending (en attente), shown (affichée à l'écran), done (traitée), ignored (masquée), deleted (supprimée).
CREATE TABLE IF NOT EXISTS public.wipp_event_live_questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.wipp_event_lives(event_id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 300),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shown', 'done', 'ignored', 'deleted')),
  votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wipp_event_live_questions_event ON public.wipp_event_live_questions (event_id, status);

-- Un vote par personne et par question (clé primaire) : impossible de voter deux fois.
CREATE TABLE IF NOT EXISTS public.wipp_event_live_votes (
  question_id TEXT NOT NULL REFERENCES public.wipp_event_live_questions(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, profile_id)
);

-- Mode questions-réponses et question mise en avant (une seule à la fois, gardée par le serveur).
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS qa_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS spotlight_id TEXT;

ALTER TABLE public.wipp_event_live_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_event_live_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_event_live_questions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wipp_event_live_votes FROM PUBLIC, anon, authenticated;
