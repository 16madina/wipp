# WIPP

Messagerie sociale par `@username` / QR — app web + site de connexion + **Expo natif**.

## Lancer (web)

```bash
npm install
node scripts/with-app-env.mjs ./node_modules/.bin/vite dev --host 0.0.0.0 --port 3847
```

- App web : [http://127.0.0.1:3847](http://127.0.0.1:3847)
- Site de connexion : [http://127.0.0.1:3847/connect](http://127.0.0.1:3847/connect)

## Lancer (Expo natif)

```bash
cd mobile
npm install
npx expo start --web --port 3848
```

- Aperçu : [http://127.0.0.1:3848](http://127.0.0.1:3848)
- API utilisée : `http://127.0.0.1:3847` (`EXPO_PUBLIC_WIPP_API_URL` pour override)

## Supabase

Projet `sdaulxbcksusojcbsucr` — schéma messagerie + pairing appliqué.  
`DATABASE_URL` dans `.env` (non versionné).

Comptes démo : `@deena` / `@lea` / `@samira` — mdp `wipp-demo`.

## Suite

1. **Firebase Phone Auth** (SMS OTP) — décidé, à brancher
2. Médias + push
3. Appels LiveKit
4. Remplir les écrans Expo restants + stores
