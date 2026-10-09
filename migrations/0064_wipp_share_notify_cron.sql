-- WIPP 1.1 — alertes du host pendant son partage d'écran : Supabase pg_cron toutes les 30 s.
-- N'appelle le serveur QUE si un partage d'écran est en cours (sinon : aucune requête).
-- Le serveur vérifie le secret 'share' (gardé en base, jamais dans l'app).
INSERT INTO public.wipp_cron_secrets (name, secret) VALUES ('share', encode(gen_random_bytes(24), 'hex')) ON CONFLICT (name) DO NOTHING;
SELECT cron.unschedule('wipp-share-notify') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wipp-share-notify');
SELECT cron.schedule('wipp-share-notify', '30 seconds', $job$
  SELECT net.http_post(
    url := 'https://wippapp.com/api/wipp/cron/share-notify',
    headers := jsonb_build_object('content-type', 'application/json', 'x-wipp-cron', (SELECT secret FROM public.wipp_cron_secrets WHERE name = 'share')),
    body := '{}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.wipp_event_lives WHERE state = 'live' AND sharing_since IS NOT NULL AND share_notify);
$job$);
