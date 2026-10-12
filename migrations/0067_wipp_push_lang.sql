-- Language chosen in the app, kept next to each phone's notification address:
-- the server writes the notification text in it ('fr' when unknown).
alter table public.wipp_push_tokens add column if not exists lang text;
