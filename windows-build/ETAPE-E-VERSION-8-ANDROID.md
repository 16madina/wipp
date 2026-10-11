# WIPP — Build Android versionCode 8 (pour Claude Windows)

> **11 octobre 2026.** Tout le travail fait sur le Mac est maintenant sur **`main`**.
> Ce fichier dit quoi récupérer, quoi construire et quoi faire tester à l'utilisatrice.
> Les règles absolues de `LISEZ-MOI-CLAUDE-WINDOWS.md` restent valables (clé de signature, pas de
> prebuild, pas de Bluetooth/NFC, ne rien changer au serveur, ne jamais marquer « PHYSICAL PASS »).

## 1. Récupérer et construire

```bash
git fetch origin
git checkout main
git pull origin main
cd native
npm install
```

- **Pas de `npx expo prebuild`** : aucun plugin ni réglage natif Android n'a changé. `native/android` est à jour.
- Aucune nouvelle dépendance native. Un seul fichier d'entrée nouveau : `native/app/+native-intent.ts` (JavaScript).
- Version attendue : **versionCode 8**, versionName 1.0.0 (déjà réglé dans `native/app.json` et
  `native/android/app/build.gradle`).
- Ouvrir `native/android` dans Android Studio, puis **Build → Generate Signed App Bundle** (variante release).
  L'utilisatrice choisit sa clé et tape elle-même ses mots de passe.
- **Ne rien envoyer sur Google Play sans son accord explicite.**

## 2. Point bloquant possible : le partage d'écran

Ce `main` contient WIPP 1.1 (directs, partage d'écran). Le manifeste déclare
`FOREGROUND_SERVICE_MEDIA_PROJECTION`. Conséquences :

- La partie « host Android qui partage son écran » **n'a jamais tourné sur un vrai Android** :
  suivre `ETAPE-D-PARTAGE-ECRAN-ANDROID.md` avant de dire que ça marche.
- À l'envoi de l'AAB, la Play Console demandera une **déclaration pour le service de premier plan
  mediaProjection** (texte + courte vidéo). C'est l'utilisatrice qui la remplit ; la prévenir **avant** l'envoi.
- Si le partage d'écran échoue sur Android, **ne pas le « réparer » en retirant la permission ou du code** :
  rapporter l'erreur exacte à l'utilisatrice, qui décidera avec Claude sur le Mac.

## 3. Ce qui est nouveau depuis le versionCode 7 (code commun, à vérifier sur le Samsung)

**WIPP Surprise** (bouton « + » d'une conversation → « WIPP Surprise »)
- Une seule surprise qui combine tout : **carte à gratter** (toujours), **compte à rebours** (option),
  **confettis** (option). « Message cadeau » a été retiré du choix.
- Compte à rebours : le paquet arrive avec un **cadenas** et « S'ouvre dans… » ; il suit l'heure réelle,
  même application fermée. À la fin : « Touche pour ouvrir » → carte à gratter → message.
  Choix : 1 minute, 1 heure, 24 heures, ce soir à minuit, ou jour + heure (14 jours).
- Confettis : pluie dessinée par l'application (`ConfettiBurst.tsx`, `Animated` natif, aucun fichier).
- Plus aucune mention « Bientôt » : les vignettes `timer.jpg`, `confetti.jpg`, `cadeau.jpg`,
  `hero-scratch.jpg` ont été recadrées.
- Fichiers : `ShareSurpriseSheet.tsx`, `SurpriseReveal.tsx`, `GiftParcel.tsx`, `CountdownPicker.tsx`,
  `lib/surprise.ts` (`surpriseKindWire`, `parseSurpriseKind`).

**Animations « Surprise »**
- 116 nouvelles animations (Beauté, Amour, Anniversaire, Bon rétablissement, Amitié, Voyage, Bonne nuit,
  Événements par fête). Elles sont **servies par le site** (`wippapp.com/wipp-media/...`), pas dans l'AAB.
- Elles s'affichent sur toute la largeur de l'écran, sans être rognées (`contentFit="contain"`).
  ⚠️ À vérifier sur Android : WebP animé transparent + son `.m4a`, sans saccade ni fond noir.
- « Surprise » (papier doré, Anniversaire) démarre agrandie puis revient à sa taille.

**Partage depuis une autre application** (Galerie, Chrome, Facebook → Partager → WIPP)
- Nouvel écran « Partager sur WIPP » : bouton **Ma story**, contacts récents en rangée, envoi à
  5 conversations au plus, bouton d'envoi fixe en bas (`screens/share-inbox.tsx`).
- `app/+native-intent.ts` renvoie le lien de partage vers l'écran principal (sinon page vide sur iPhone).
  ⚠️ À vérifier sur Android : texte/lien, 1 photo, plusieurs photos, 1 vidéo. Les filtres
  `SEND` / `SEND_MULTIPLE` du manifeste ne doivent exister **qu'une seule fois**.

**Divers**
- Correction d'un plantage (« Un problème est survenu ») quand un message reçu devenait une surprise
  pendant que la conversation était ouverte (`SwipeableBubble.tsx`).
- Événements : bouton **Maintenant** à côté de « Date et heure » (`screens/publish.tsx`).
- Réglages : **Noter WIPP** (ouvre `play.google.com/store/apps/details?id=com.wipp.app` sur Android).
- Petit personnage du champ de message : plus petit et un peu transparent.
- Le journal d'erreurs du téléphone (`Documents/wipp-errors.json`) indique maintenant le composant fautif.

## 4. Tests à faire faire à l'utilisatrice sur le Samsung

1. WIPP Surprise : carte + compte à rebours 1 minute + confettis, envoyée d'un compte à l'autre, la
   conversation ouverte chez celui qui reçoit. Cadenas → « Touche pour ouvrir » → carte → confettis. Aucun message d'erreur.
2. Fermer WIPP pendant le décompte, rouvrir : le temps a continué.
3. Trois ou quatre animations de catégories différentes : affichage complet, son, pas de fond noir.
4. Partager une photo depuis la Galerie vers WIPP : écran « Partager sur WIPP », envoi à une conversation,
   puis vers « Ma story ».
5. Créer un événement en ligne sur WIPP avec « Maintenant ».
6. Moi → Paramètres → Noter WIPP : la page Google Play s'ouvre.
7. Le partage d'écran en direct : voir `ETAPE-D-PARTAGE-ECRAN-ANDROID.md`.

## 5. Rapport à donner à l'utilisatrice

- Le build a réussi ou non (erreur exacte si non), et où se trouve le fichier `.aab`.
- Le versionCode lu dans l'AAB (doit être 8).
- Pour chaque test de la section 4 : fait / pas fait / problème vu (avec ce qui s'affiche).
- Rien n'a été envoyé sur Google Play sans son accord.

## 6. Fiche Google Play

Une nouvelle description en français est prête dans `store/play-store-description-fr.md`
(description courte + complète). C'est l'utilisatrice qui la colle dans la Play Console.
