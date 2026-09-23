# Firebase Phone Auth — Wipp

Projet Firebase : **wipp-61124**  
Apps : `com.wipp.app` (Android + iOS)

## Fichiers (déjà dans `/mobile`)
- `google-services.json`
- `GoogleService-Info.plist`

## Ce que tu dois encore vérifier dans Firebase Console

1. **Authentication → Sign-in method → Phone** : **Enabled**
2. Plan **Blaze** (requis pour SMS réels)
3. **Android** : ajouter empreintes **SHA-1** + **SHA-256** (après premier EAS build)
4. **iOS** : uploader une clé **APNs** (Apple Developer → Keys) dans  
   Project settings → Cloud Messaging  
   (sinon SMS iOS peut échouer / reCAPTCHA)
5. **Authorized domains** (si OTP web un jour) : `wippapp.com`

## Comment ça marche chez nous
1. L’app envoie le SMS via **Firebase Auth**
2. L’utilisateur entre le code
3. L’app envoie le **ID token** Firebase à `POST /api/wipp/auth/firebase`
4. Le serveur vérifie le jeton, crée/lie le profil **Supabase**, ouvre une session Wipp

→ Firebase = SMS seulement · Supabase = base de données

## Build requis
Phone Auth **ne marche pas dans Expo Go**. Il faut un **development build** ou un build store :

```bash
cd mobile
npx eas build --profile development --platform android
# ou
npx eas build --profile production --platform all
```

## Écran
`mobile/app/login.tsx` — onglets SMS + Compte (ex. `@lazone` pour la revue Play).
