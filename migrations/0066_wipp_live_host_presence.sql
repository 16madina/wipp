-- WIPP 1.1 — présence de l'hôte dans son direct.
-- Le téléphone de l'hôte confirme sa présence toutes les 30 s (host_seen_at). Supabase pg_cron appelle le
-- serveur chaque minute, UNIQUEMENT s'il y a un direct en cours : notification à l'hôte parti
-- (1 min après, puis 1 min avant la fin), arrêt automatique après 5 minutes — même sans aucun spectateur.
-- Le secret 'live' existant (gardé en base, jamais dans l'app) est réutilisé. Les rappels ne changent pas.
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS host_seen_at TIMESTAMPTZ;
ALTER TABLE public.wipp_event_lives ADD COLUMN IF NOT EXISTS host_warned SMALLINT NOT NULL DEFAULT 0;
SELECT cron.unschedule('wipp-live-presence') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wipp-live-presence');
SELECT cron.schedule('wipp-live-presence', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://wippapp.com/api/wipp/cron/live-presence',
    headers := jsonb_build_object('content-type', 'application/json', 'x-wipp-cron', (SELECT secret FROM public.wipp_cron_secrets WHERE name = 'live')),
    body := '{}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.wipp_event_lives WHERE state = 'live');
$job$);
