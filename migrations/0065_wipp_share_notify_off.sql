-- WIPP 1.1 — plus aucune notification push pendant le partage d'écran (les spectateurs pourraient la voir).
-- On retire la tâche planifiée de partage et son secret. Les rappels d'événements (wipp-live-reminders) ne changent pas.
-- Les colonnes share_notify / share_notified_at restent (inutilisées) pour ne rien casser.
SELECT cron.unschedule('wipp-share-notify') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wipp-share-notify');
DELETE FROM public.wipp_cron_secrets WHERE name = 'share';
