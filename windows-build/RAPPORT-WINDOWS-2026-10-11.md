# Rapport de Claude Windows — 11 octobre 2026 (pour Claude Mac)

Travail fait sur `main`, Android seulement, testé par l'utilisatrice sur un Samsung Galaxy A50 (Android 10)
avec un iPhone en face. **Rien n'a été envoyé sur Google Play.** Le versionCode reste 8.

## À faire côté Mac après `git pull`

1. **Vérifier que l'app iPhone démarre toujours.** Le point d'entrée a changé : `native/package.json`
   → `"main": "index.js"`, et `native/index.js` importe `./src/lib/push/android-call` puis `expo-router/entry`.
   Sur iPhone ce module ne fait rien (tout est sous `Platform.OS === "android"`), mais le fichier est commun.
2. **Historique des appels sur iPhone** (signalé par l'utilisatrice, non regardé ici) : les appels manqués
   s'affichent, puis disparaissent, puis « aucun résultat ». Sur Android l'historique est correct.

## Ce qui ne marchait pas sur Android, et la correction

| Problème constaté | Cause | Correction |
|---|---|---|
| Partage d'écran : bandeau rouge chez le host, écran noir chez le spectateur | `MainApplication.kt` n'activait pas le service de capture (`WebRTCModuleOptions.enableMediaProjectionService`), donc aucun service de premier plan | Activé dans `MainApplication.kt` (une ligne, sans `LiveKitReactNative.setup`, pour ne pas changer l'audio/vidéo des appels) |
| La notification du service aurait planté | Icône `ic_notification` absente (la nôtre s'appelle `notification_icon`) | `ic_notification.png` ajoutée (copie), textes en français dans `strings.xml` |
| Notification « Partage d'écran » qui restait après l'arrêt | `setScreenShareEnabled(false)` ne libère pas la capture native | `endMyShare()` dans `event-live-room.tsx` : dépublie puis `mediaStreamTrack.release()` (Android) |
| Partage lancé pendant que l'enregistreur d'écran Samsung tourne : aucune image envoyée, personne prévenu | Une seule capture d'écran à la fois sur Android | `stopShareIfNoPicture()` : 8 s après le début, si `framesEncoded` vaut 0, arrêt + message. **Pas encore testé.** |
| Hors de WIPP : connexion LiveKit perdue après ~40 s (« ping timeout »), aucune notification d'appel en cours | Android met le JavaScript en pause quand l'app n'est plus à l'écran ; aucun service de premier plan pendant un appel | Nouveau `src/lib/calls/android-ongoing.ts` : notification permanente notifee en service de premier plan (« Appel WIPP en cours » + Raccrocher, « Partage d'écran en cours » + Arrêter le partage). Branché dans `CallOverlay.tsx` et `event-live-room.tsx`. Service `app.notifee.core.ForegroundService` déclaré avec les types `phoneCall\|camera\|microphone\|mediaProjection` (manifeste + `withWippCallNative.js`) |
| WIPP fermé ou téléphone verrouillé : l'appel n'arrivait pas, puis sonnait à l'ouverture de l'app (appel fantôme) | La tâche `WIPP_ANDROID_CALL` était définie dans un module importé par `app/_layout.tsx`, jamais chargé quand un push démarre l'app sans écran | `native/index.js` charge `android-call` avant `expo-router/entry` ; `notifee.onBackgroundEvent` enregistré tout de suite (plus dans un `import()` asynchrone) |
| « Accepter » sur la notification ouvrait WIPP sans décrocher | L'appui arrive dans `onBackgroundEvent`, qui ne gérait que « Refuser » | Géré dans `android-call.ts`. **Pas encore testé.** |
| L'appelant raccroche : l'écran d'appel système continuait de sonner | Le push « cancel » ne retirait que la notification notifee | `onCallPush` arrête aussi l'appel CallKeep et passe la session en « manqué » |
| WIPP fermé : vidéo d'intro puis sonnerie 12 s après l'appel | La sonnerie venait de l'écran d'appel, après l'intro, la connexion au serveur et le sondage toutes les 4 s | Canal `wipp_calls_ring` avec la sonnerie WIPP en boucle (`res/raw/wipp_ring.mp3`, copie de `assets/sounds/wipp-ring.mp3`) ; pas de vidéo d'intro quand l'app est ouverte par un appel (`launchedForCall()` dans `AppShell.tsx`) ; l'appel est ouvert depuis le push (`handleCallData`) ; la notification s'arrête quand l'écran d'appel sonne |

Mesuré dans les journaux du téléphone, WIPP fermé et téléphone verrouillé : la sonnerie démarre 6 à 11 s
après le push (temps de démarrage de l'app).

## Limites

- Un seul téléphone de test, sous Android 10. Android 14+ est plus strict sur les services de premier plan
  (types caméra / micro / appel, démarrage depuis l'arrière-plan) : non vérifié.
- Les 13 tests de `ETAPE-D-PARTAGE-ECRAN-ANDROID.md` n'ont pas tous été faits. Faits : démarrage, partage vu
  sur iPhone hors de WIPP, arrêt depuis WIPP, notification. Pas faits : mesure de la taille envoyée / reçue,
  10 minutes de partage, intervenants, présentation horizontale, refus de l'autorisation, fin du direct pendant un partage.
- Les tests de la version 8 (`ETAPE-E-VERSION-8-ANDROID.md`, section 4) restent à faire.

## Google Play (rien envoyé)

- Déclarations « services de premier plan » à remplir par l'utilisatrice : caméra, micro, appel, projection.
  Vidéos enregistrées depuis le PC avec `adb screenrecord` (l'enregistreur d'écran du Samsung bloque le partage).
- `USE_FULL_SCREEN_INTENT` : à déclarer comme application d'appels.
