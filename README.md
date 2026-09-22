# WIPP

Messagerie sociale par `@username` / QR — app + site de connexion, backend prêt pour Supabase.

## Lancer

```bash
npm install
node scripts/with-app-env.mjs ./node_modules/.bin/vite dev --host 0.0.0.0 --port 3847
```

- App : [http://127.0.0.1:3847](http://127.0.0.1:3847)
- Site de connexion : [http://127.0.0.1:3847/connect](http://127.0.0.1:3847/connect)

## Supabase

Projet : `sdaulxbcksusojcbsucr` (`https://sdaulxbcksusojcbsucr.supabase.co`)

Schéma déjà appliqué : `wipp_profiles`, `wipp_sessions`, `wipp_chats`, `wipp_messages`, `wipp_link_codes`, `wipp_devices`.

Pour que l’app utilise **Supabase** (et plus seulement PGLite local), définis :

```bash
export DATABASE_URL="postgresql://postgres.[REF]:[MOT_DE_PASSE]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

(Dashboard Supabase → Project Settings → Database → Connection string URI.)

Comptes démo : `@deena` / `@lea` / `@samira` — mot de passe `wipp-demo`.

## Pairing web ↔ téléphone

1. Ouvre `/connect` sur un ordinateur (code + QR).
2. Dans l’app → **Moi** → Connecter le serveur → entre le code → **Lier**.
3. Le site reçoit la session du même compte.

## API

Préfixe `/api/wipp` — health, register, login, chats, messages, `link/create`, `link/status`, `link/claim`, devices.
