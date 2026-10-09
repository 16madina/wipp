-- Rappels des directs WIPP : 3 jours avant, le jour même, 30 min avant (inscrits + organisateur).
-- Supabase pg_cron appelle le serveur toutes les 5 minutes (pg_net) avec un secret gardé en base.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.wipp_event_live_reminders (
  event_id TEXT NOT NULL REFERENCES public.wipp_event_lives(event_id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES public.wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('d3', 'day', 'm30')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id, kind)
);
CREATE TABLE IF NOT EXISTS public.wipp_cron_secrets (name TEXT PRIMARY KEY, secret TEXT NOT NULL);
ALTER TABLE public.wipp_event_live_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wipp_cron_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wipp_event_live_reminders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wipp_cron_secrets FROM PUBLIC, anon, authenticated;
INSERT INTO public.wipp_cron_secrets (name, secret) VALUES ('live', encode(gen_random_bytes(24), 'hex')) ON CONFLICT (name) DO NOTHING;
SELECT cron.unschedule('wipp-live-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wipp-live-reminders');
SELECT cron.schedule('wipp-live-reminders', '*/5 * * * *', $job$
  SELECT net.http_post(
    url := 'https://wippapp.com/api/wipp/cron/live-reminders',
    headers := jsonb_build_object('content-type', 'application/json', 'x-wipp-cron', (SELECT secret FROM public.wipp_cron_secrets WHERE name = 'live')),
    body := '{}'::jsonb
  );
$job$);
