# Wipp Mobile (Expo)

App native Android / iOS — premier socle branché sur l’API messagerie WIPP + Supabase.

## Identifiants stores

| Plateforme | Champ | Valeur |
|---|---|---|
| **iOS** | Bundle ID | `com.wipp.app` |
| **Android** | Application ID / package | `com.wipp.app` |
| Deep link | URL scheme | `wipp://` |

À saisir tel quel dans App Store Connect et Google Play Console.

## Prérequis

Le backend web doit tourner (API `/api/wipp`) :

```bash
# à la racine du repo
node scripts/with-app-env.mjs ./node_modules/.bin/vite dev --host 0.0.0.0 --port 3847
```

## Lancer

```bash
cd mobile
npm install
npx expo start --web --port 3848   # aperçu navigateur
npx expo start                     # QR pour Expo Go (téléphone)
```

Variable optionnelle : `EXPO_PUBLIC_WIPP_API_URL` (défaut `http://127.0.0.1:3847`).

## Publier (OTA sans rebuild store)

À la racine du repo (après tokens one-shot — voir `../PUBLISH.md`) :

```bash
npm run publish -- -m "description"
```

## Inclus dans cette passe

- Onglets : Chats, Appels, WIPP (connect), Explorer, Moi
- Session démo `@deena` / `wipp-demo`
- Liste de chats serveur + conversation + envoi de messages
- Thème WIPP (navy / or)
- Bundle ID `com.wipp.app` (iOS + Android)
- EAS Update prêt (canal `production`)

## Suite

- Firebase Phone Auth (SMS OTP)
- Médias / push
- Appels LiveKit
- Remplacer les écrans placeholder
- Premier build store EAS (`eas build --platform ios|android`)
