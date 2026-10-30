# Étape I — Mise à jour Play Store (version 13) depuis `main`

La propriétaire veut cette mise à jour sur le Play Store. **Avant la production : construire, tester sur le Samsung, écrire le rapport.**
Envoie en production seulement si les tests de base passent (liste plus bas) et que la propriétaire l'a confirmé par écrit.

## Récupérer
1. `git fetch && git checkout main && git pull` (tout est sur `main`, la branche `video-studio` est identique).
2. **Pas de `expo prebuild`.** `cd native && npm install`.
3. `versionCode` est déjà **13** (`android/app/build.gradle` et `app.json`). La 11 est en production (en examen), la 12 était prévue pour le test des achats. Si la 12 n'a jamais été envoyée, 13 convient quand même.
4. Construire l'AAB signé (clé d'envoi habituelle).

## Ce que contient cette version (depuis la 11)
- **Achats Wippmoji Studio sur Android** (clé RevenueCat `goog_…` déjà dans `native/src/lib/purchases.ts`). **Le Studio est ouvert à tout le monde** côté serveur (déjà en ligne).
- **Connexion** : code par Twilio pour tous les pays (SMS d'abord, appel vocal en secours). Les numéros de test fictifs `+1 XXX 555-01XX` passent par Firebase (code fixe).
- **Un seul téléphone par compte** : si le compte est déjà utilisé ailleurs, message « Continuer ici / Me déconnecter » ; l'ancien téléphone ne reçoit plus les appels ni les notifications.
- **Studio vidéo des Stories** (étape H) : module natif Media3 `native/modules/wipp-video-trim/android/`, **jamais compilé** jusqu'ici → c'est le point le plus risqué (voir étape H pour les détails et les corrections autorisées).
- **Éditeur de Story** : bouton sticker « chut », poubelle sous « Modifier », stickers rejoués pendant la Story.
- **Appels** :
  - jusqu'à 10 personnes (appel normal), 50 (appel de groupe), mosaïque qui défile au-delà de 8 ;
  - mêmes noms et photos pour tous ;
  - organisateur + **modérateurs** (couper le micro, demander la caméra, donner la parole) ;
  - **réactions animées** (bouton 😊) : Bravo et Amour = animations WebP (`native/assets/call-reactions/`), les autres = Wippmojis ; réactions collectives, WIPP Moment (menu Plus), file des mains levées, micro vedette (anneau autour de celui qui parle) ; **main levée** = animation WIPP.
- Accueil : « Passer » en bas au centre ; plus de bouton « Toucher pour le son ».

## Tests minimum sur le Samsung (avec un compte de test)
1. L'app s'ouvre, connexion OK, conversations OK.
2. Wippmoji Studio : l'écran s'ouvre (plus de « Bientôt disponible »), un achat test avec un compte testeur de licence.
3. Story vidéo publiée **sans** « Modifier ». Puis « Modifier » → couper un passage → Terminé → publier.
4. Appel audio et vidéo avec l'iPhone 15 : son, image, raccrocher. Envoyer une réaction 😊 Bravo des deux côtés : l'animation apparaît sur la photo de celui qui l'envoie.
5. Appel à 3 si possible : main levée (animation), bouton « Couper » de l'organisateur, nommer un modérateur.
6. Poubelle des stickers dans l'éditeur de Story.

## Si quelque chose casse
- **Gradle / Media3** (`WippVideoTrimModule.kt`) : corrige le minimum sans changer le comportement, note chaque changement. Si impossible rapidement : ne bloque pas toute la version, dis-le dans le rapport et attends.
- Ne pas envoyer en production une version qui plante à l'ouverture ou pendant un appel.

## Rapport
`windows-build/RAPPORT-WINDOWS-VERSION-13.md` (ce qui marche, ce qui casse, captures, logcat `adb logcat | grep -i -E "wipp|media3|transformer|livekit"`), puis pousser sur `main`.
