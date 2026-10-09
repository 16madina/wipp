# WIPP 1.1 — Étape D : partage d'écran sur Android (pour Claude Windows)

> Branche Git : **wipp-1.1** (ne PAS fusionner sur main, ne PAS publier sur Google Play sans l'accord de l'utilisatrice).
> L'iPhone est fait (extension ReplayKit `WippBroadcast`). Côté JavaScript, tout est déjà prêt et commun :
> `native/src/components/LiveScreenShare.tsx` + `native/src/screens/event-live-room.tsx`
> (`room.localParticipant.setScreenShareEnabled(true)`). Aujourd'hui, sur Android, le bouton affiche
> « Le partage d'écran arrive bientôt sur Android » (voir `startScreenShare()` : `Platform.OS !== "ios"`).
> Le serveur autorise déjà la piste « écran » pour l'organisateur seulement (rien à changer côté serveur).

## 1. Remettre le service de capture (MediaProjection)
Le service a été retiré pour l'avertissement Google Play (BOOT_COMPLETED / services de premier plan).
- Dans `native/plugins/withWippAndroidBootFix.js`, la liste `removed` contient
  `"com.oney.WebRTCModule.MediaProjectionService"` → **l'enlever de cette liste** (garder la suppression de
  `expo.modules.location.services.LocationTaskService`).
- Vérifier dans le manifeste final (`android/app/src/main/AndroidManifest.xml` après build) :
  ```xml
  <service android:name="com.oney.WebRTCModule.MediaProjectionService"
           android:foregroundServiceType="mediaProjection" android:exported="false" />
  ```
  (le type `mediaProjection` est obligatoire depuis Android 14 / API 34).

## 2. Permissions à ajouter (app.json → android.permissions, puis manifeste)
- `android.permission.FOREGROUND_SERVICE` (déjà présent)
- `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION` (**nouveau**, requis Android 14+)
- `android.permission.POST_NOTIFICATIONS` (déjà demandé : la notification « Partage d'écran en cours » est obligatoire)
- NE PAS remettre RECEIVE_BOOT_COMPLETED.

## 3. Activer le bouton sur Android
Dans `startScreenShare()` (`event-live-room.tsx`), remplacer le refus Android par :
1. le même message d'explication (les notifications et tout l'écran seront visibles) ;
2. `await room.localParticipant.setScreenShareEnabled(true)` directement (sur Android, c'est
   `getDisplayMedia` qui affiche la fenêtre système « Commencer l'enregistrement / la diffusion »).
3. Refus de l'utilisateur → `catch` : message « Le partage d'écran n'a pas pu démarrer… le direct continue ».
Le composant `ScreenPicker` ne fait rien sur Android (normal : iOS seulement).

## 4. Tests sur le Samsung (+ un iPhone en spectateur)
1. Host Android : Plus → Partager l'écran → fenêtre système → autoriser → bandeau rouge « Partage d'écran en cours ».
2. Spectateur iPhone : l'écran du Samsung devient la zone principale, la caméra du host en vignette.
3. Le host ouvre une autre app (Chrome, Google Slides) : le partage continue (notification présente).
4. Arrêter depuis WIPP, puis depuis la notification Android : retour à la disposition d'avant, toast « Partage d'écran arrêté ».
5. Refuser l'autorisation : message clair, le direct continue.
6. Terminer le direct pendant un partage : tout s'arrête proprement (plus de notification).
7. Vérifier que les appels WIPP ordinaires et les notifications marchent toujours.

## 5. Google Play (à préparer, NE PAS envoyer sans accord)
- Play Console → Contenu de l'application → **Services de premier plan** : déclarer `mediaProjection`
  avec une justification : « Partage d'écran volontaire de l'organisateur pendant une conférence en direct
  WIPP (présentation, démonstration). Démarré uniquement par l'utilisateur, notification visible pendant
  toute la durée, aucun enregistrement. »
- Joindre une **courte vidéo** (30–60 s) montrant : bouton Partager l'écran → fenêtre système → notification → arrêt.
- Mettre à jour la politique de confidentialité si nécessaire (aucun enregistrement, flux temps réel seulement).

## Rapport à donner à l'utilisatrice
1. Commit récupéré sur `wipp-1.1`
2. Build AAB : OK / erreur exacte
3. Manifeste : service MediaProjection avec `foregroundServiceType="mediaProjection"`, permission FOREGROUND_SERVICE_MEDIA_PROJECTION, pas de BOOT_COMPLETED
4. Résultat des tests 1 à 7
