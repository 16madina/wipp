# Étape J — Version 14 Android (remplace la 13 en examen)

**Décision de la propriétaire :** la version 13 est encore en examen chez Google (ils ne regarderont pas avant la semaine prochaine). On la remplace par une **version 14** qui contient tout le travail du 30 octobre. Tu peux envoyer la 14 en production **après** les tests de base ci-dessous et la confirmation écrite de la propriétaire. Dans la Play Console, la nouvelle version remplace celle en cours d'examen dans la même piste (la 13 est retirée automatiquement, sinon « Retirer » / créer une nouvelle version).

## Récupérer
1. `git fetch && git checkout main && git pull`
2. **Pas de `expo prebuild`.** `cd native && npm install`
3. `versionCode` est déjà **14** (`android/app/build.gradle` et `app.json`).

## Nouveautés depuis la 13 (faites sur Mac, testées sur iPhone)
- **Appels** :
  - Écran « Je reviens… » avec le logo WIPP animé (`native/assets/call-reactions/logo-pause.webp`) quand l'autre quitte l'app pendant un appel vidéo ; la caméra est mise en pause volontairement en arrière-plan (`CallOverlay.tsx`, listener `AppState` → `track.mute()`), puis rallumée au retour.
  - Réactions : Bravo et Amour = animations WebP, les autres = Wippmojis ; main levée animée.
  - Décrocher avec WIPP fermé : réessai le temps que la session revienne (`withStartupRetry` dans `session.ts`) ; appel fermé sur l'écran système avant le chargement → refusé côté serveur.
  - Trousseau iPhone lisible téléphone verrouillé (`keychain-access.ts`) : iPhone seulement.
  - « Appel manqué » effacé quand l'appel a été décroché (iPhone ; vérifier qu'Android n'affiche pas de fausse notification d'appel manqué).
- **Explorer** : cases, catégories, entreprises, événements, pharmacies plus visibles (contour doré).
- **Glisser depuis le bord gauche pour revenir** : `EdgeSwipeBack.tsx`, **activé seulement sur iOS** (`Platform.OS === "ios"`). Sur Android, garder le bouton / geste retour du système : vérifie seulement que le bouton retour Android ferme bien les sections d'Explorer et les pages.

## À FAIRE sur Android
1. **Mini lecteur (image dans l'image) pendant un appel vidéo** quand on quitte l'app. Sur iPhone c'est `iosPIP` sur le `RTCView` de l'autre personne (`CALL_PIP` dans `CallScreen.tsx`). Sur Android : mode Picture-in-Picture de l'activité (`android:supportsPictureInPicture="true"` dans le manifeste, `enterPictureInPictureMode()` sur `onUserLeaveHint` quand un appel vidéo est connecté), et en PiP n'afficher que la vidéo de l'autre (cacher les boutons). Ne pas casser le partage d'écran existant.
2. **Caméra en arrière-plan** : vérifier que l'écran « Je reviens… » s'affiche chez l'autre quand le Samsung quitte l'app (si Android garde la caméra active en PiP, c'est OK de ne PAS la couper pendant le PiP : dans ce cas adapter le listener pour ne muter que si on n'est pas en PiP).
3. **Bouton retour Android** dans Explorer : depuis Petites annonces / Événements / Entreprises / Services, le retour système doit revenir à l'accueil d'Explorer (aujourd'hui l'état `hub` est interne à `ExploreScreen`; brancher `BackHandler` quand `hub !== "home"`).
4. **Notification « Appel manqué » à tort** : appeler le Samsung, décrocher (app ouverte et app fermée) et vérifier qu'aucune notification « appel manqué » ne reste.

## Tests sur le Samsung (compte de test)
1. Appel audio et vidéo Samsung ↔ iPhone 15 : son, image, raccrocher des deux côtés ; l'appelant arrête de sonner dès qu'on décroche.
2. Appel vidéo : quitter l'app sur le Samsung → mini lecteur sur le Samsung, « Je reviens… » sur l'iPhone ; revenir → vidéo de retour.
3. Réaction 😊 Bravo / Amour des deux côtés, main levée (appel à 3 si possible).
4. Explorer : nouvelles cases visibles, bouton retour Android.
5. Studio vidéo des Stories : scinder, texte, filtre, Terminé, publier.
6. Achat test Wippmoji (compte testeur de licence) si la version est installée depuis la Play Console (test interne).

## Rapport
`windows-build/RAPPORT-WINDOWS-VERSION-14.md`, puis **pousser sur la branche `video-studio`** (Claude Mac l'intègre dans `main`) : `git checkout video-studio && git pull`, ajouter le rapport et les corrections, `git push origin video-studio` (si refusé : `git pull --rebase` puis repousser). Tu as l'autorisation de pousser ce rapport et ces corrections.
