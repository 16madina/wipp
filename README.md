# WIPP

Application de messagerie sociale (style WhatsApp) — connexion par `@username` et QR, jamais un numéro de téléphone.

Base récupérée depuis [github.com/16madina/wipp](https://github.com/16madina/wipp), avec une couche « feeling natif » web (transitions iOS-like, swipe bord pour revenir, chrome téléphone, feedback tactile).

## Lancer en local

```bash
npm install
npm run dev
```

Par défaut le script écoute sur le port `8080`. Pour un autre port :

```bash
node scripts/with-app-env.mjs ./node_modules/.bin/vite dev --host 0.0.0.0 --port 3847
```

Ouvre ensuite `http://127.0.0.1:3847` (ou le port choisi).

## Stack

- React 19 + Vite 8 + TanStack Router / Start
- Tailwind CSS 4
- Zustand (état + navigation stack)
- Better Auth / PGlite (optionnels selon `.grok/app-env.json`)

## Suite prévue

Passer à une app native Android + iOS via **Expo (React Native)**, en gardant la logique métier et en refaisant les écrans en composants natifs.
