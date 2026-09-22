# WIPP

Application de messagerie sociale (style WhatsApp) — connexion par `@username` et QR, jamais un numéro de téléphone.

Base récupérée depuis [github.com/16madina/wipp](https://github.com/16madina/wipp), avec une couche « feeling natif » web et un **socle messagerie serveur**.

## Lancer en local

```bash
npm install
npm run dev
```

Par défaut le script écoute sur le port `8080`. Pour un autre port :

```bash
node scripts/with-app-env.mjs ./node_modules/.bin/vite dev --host 0.0.0.0 --port 3847
```

Ouvre ensuite `http://127.0.0.1:3847`.

## Socle messagerie (`/api/wipp`)

Postgres via PGLite en local (ou `DATABASE_URL` en prod). Comptes `@username`, sessions, chats 1:1, messages.

Utilisateurs démo seedés (mot de passe `wipp-demo`) : `@deena`, `@lea`, `@samira`.

| Méthode | Route | Auth |
|--------|--------|------|
| GET | `/api/wipp/health` | non |
| POST | `/api/wipp/register` | non — `{ username, password, displayName }` |
| POST | `/api/wipp/login` | non — `{ username, password }` |
| GET | `/api/wipp/me` | Bearer |
| GET | `/api/wipp/users/search?q=` | Bearer |
| GET/POST | `/api/wipp/chats` | Bearer — POST `{ peerUsername }` |
| GET/POST | `/api/wipp/chats/:id/messages` | Bearer — POST `{ body, clientId? }` |

Dans l’app : onglet **Moi** → carte « Serveur messagerie » → Connecter / Écrire `@lea`.

## Stack

- React 19 + Vite 8 + TanStack Router / Start
- Tailwind CSS 4
- Zustand (UI) + API messagerie serveur
- Better Auth / PGlite (auth Grok optionnelle, désactivée)

## Suite prévue

1. Pairing multi-appareil (site web ↔ app)
2. Médias + push
3. Appels LiveKit
4. Expo (React Native) Android + iOS
