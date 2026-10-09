-- 5 personnes sur scène : 1 host + 4 invités (le host ne prend pas une place d'invité).
ALTER TABLE public.wipp_event_lives ALTER COLUMN max_speakers SET DEFAULT 5;
UPDATE public.wipp_event_lives SET max_speakers = 5 WHERE max_speakers = 4;
