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
- **Bundle ID (iOS + Android)** : `com.wipp.app`

## Publier (comme Lovable)

Voir **[PUBLISH.md](./PUBLISH.md)** — tu dis « publie », l’agent déploie API + OTA.

```bash
npm run publish -- -m "ma modification"
```

## Site public (stores)

**Domaine :** [wippapp.com](https://wippapp.com) — voir **[DNS.md](./DNS.md)** pour le branchement.

| URL | Usage store |
|-----|-------------|
| https://wippapp.com/site | Présentation produit |
| https://wippapp.com/privacy | Politique de confidentialité |
| https://wippapp.com/terms | Conditions d’utilisation |
| https://wippapp.com/support | Support |
| https://wippapp.com/connect | Liaison web ↔ app |

Email : `support@wippapp.com`

## Supabase

Projet `sdaulxbcksusojcbsucr` — schéma messagerie + pairing appliqué.  
`DATABASE_URL` dans `.env` (non versionné).

Comptes démo : `@deena` / `@lea` / `@samira` — mdp `wipp-demo`.

## Suite

1. **DNS + VERCEL_TOKEN** → mettre `wippapp.com` en ligne (voir DNS.md)
2. **EXPO_TOKEN** pour OTA
3. **Admin panel** sur wippapp.com
4. Firebase Phone Auth (SMS OTP)
5. Médias + push + LiveKit
