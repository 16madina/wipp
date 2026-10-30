# Instructions pour Claude Mac — version 14 (30 octobre 2026, de Claude Windows)

La propriétaire m'a demandé de mettre ces instructions sur `main`. **Tout le code est sur la branche `video-studio`** (testé sur le Samsung A50). Ce fichier est seulement la marche à suivre.

## 1. Intégrer `video-studio` dans `main` (avant tout AAB 14)

```
git fetch
git checkout main && git pull
git merge origin/video-studio
```

**Sans ce merge, la version 14 ne démarre pas sur Android.** Le `main` actuel (2417b22 + 3b6e36d) redémarre en boucle sur Android : 62 rechargements en 2 minutes, écran bleu. La cause est la relance automatique de `AppShell.tsx` (7b3ec91). Le correctif `81601ff` la limite à iOS. Détails dans `windows-build/RAPPORT-WINDOWS-VERSION-14.md`.

Contenu de `video-studio` par rapport à `main` :

| Commit | Quoi | Plateforme |
|---|---|---|
| `d3efe53` | Démarrage sans petit logo (fond bleu seul) | Android |
| `ba00cc4` | Mini lecteur (PiP) pendant un appel vidéo : `CallPip.kt` + `src/lib/calls/android-pip.ts`, et retour dans Explorer | Android |
| `81601ff` | **Boucle de redémarrage corrigée** | Android |
| `d82f36f` | Bouton retour Android = page précédente (mêmes règles que le glissement iPhone) | Android |
| `01382e3` | Bouton caméra dans le mini lecteur (« Me montrer » / « Pause caméra ») | Android |
| `86a5d12` | **Notification « Me montrer / Garder en pause » en quittant un appel vidéo** | **iPhone, à tester** |

## 2. iPhone : caméra visible hors de l'app, au choix de l'utilisateur (`86a5d12`)

**Demande de la propriétaire.** Quand on quitte WIPP pendant un appel vidéo, la caméra reste **en pause au départ** : l'autre voit « Je reviens… », comme aujourd'hui. Une **notification** propose alors **« Me montrer »** ou **« Garder en pause »** ; une fois la caméra visible, elle propose **« Pause caméra »**. Pas de bouton en plus dans l'écran d'appel : elle n'en veut pas, il y en a assez.

Pourquoi une notification : le mini lecteur iPhone est le PiP « appel vidéo » d'Apple (`AVPictureInPictureVideoCallViewController`, dans `PIPController.m` de `@livekit/react-native-webrtc`), et **Apple ne permet pas d'y ajouter un bouton**.

Ce qui est codé (je n'ai pas pu compiler pour iOS depuis Windows) :

1. **`native/plugins/withWippCallCamera.js`**, ajouté dans `app.json` juste après `withWippVoip`. Il insère dans l'`AppDelegate.swift` `import livekit_react_native_webrtc` et `WebRTCModuleOptions.sharedInstance().enableMultitaskingCameraAccess = true`, avant le `return super.application(...didFinishLaunchingWithOptions...)`. Il cherche les mêmes lignes que `withWippVoip`, dans n'importe quel ordre. → **Régénère le projet iOS comme d'habitude** pour que le plugin s'applique, puis vérifie que les 2 lignes `// WIPP-CALL-CAMERA` sont dans l'AppDelegate.
   - Conditions Apple : app compilée avec le **SDK iOS 18+** et `voip` dans `UIBackgroundModes` (déjà présent). La bibliothèque active alors `AVCaptureSession.isMultitaskingCameraAccessEnabled` (`VideoCaptureController.m`, l. 67-76).
2. **`native/src/lib/calls/away-camera.ts`** : catégories de notification `wipp-call-camera-paused` (`show`, `keep`) et `wipp-call-camera-shown` (`pause`), avec `opensAppToForeground: false`, et `data.type = "call-camera"`. Actif **seulement sur iOS 18+** (`awayCameraSupported`).
3. **`CallOverlay.tsx`** :
   - en arrière-plan, le `track.mute()` existant reste, puis `showAwayCameraNotice(false)` ;
   - `onAwayCameraAction` : `show` → `track.unmute()` puis notification « visible » ; `pause` → `track.mute()` ; `keep` → retire la notification ;
   - au retour dans l'app ou à la fin de l'appel, la notification est retirée.
4. **`push/index.ts`** : `setNotificationHandler` affiche toujours `type === "call-camera"`, sans son. `screenFromPushData` renvoie `null` pour ce type, donc aucune navigation.

### Tests sur l'iPhone 15 (appel vidéo avec le Samsung)

1. **Quitter WIPP** : le mini lecteur s'affiche, la notification « Appel vidéo en cours — Ta caméra est en pause » apparaît, et le Samsung voit « Je reviens… ».
2. **Appui long ou glissement sur la notification, puis « Me montrer »** : le Samsung revoit l'image sans qu'on revienne dans WIPP, et la notification devient « Ta caméra est visible » avec « Pause caméra ».
3. **« Pause caméra »** : le Samsung revoit « Je reviens… ».
4. **Retour dans WIPP** : la notification disparaît et la caméra marche normalement.

**Points à surveiller :**
- Le bouton d'une notification avec `opensAppToForeground: false` réveille l'app en arrière-plan. Pendant un appel, l'app tourne (audio/voip), donc le listener JS devrait recevoir l'action ; à confirmer.
- `track.unmute()` relance la capture (`getUserMedia`) **pendant que l'app est en arrière-plan**. Si iOS refuse, le code remet la notification en « pause ». Dans ce cas, une piste est de ne plus arrêter la capture en arrière-plan (`multitaskingCameraAccessEnabled` la garde vivante) et de couper seulement l'envoi : par exemple `pauseUpstream()`, plus un signal « caméra en pause » pour l'autre côté, puisque `pauseUpstream` ne déclenche pas `TrackMuted`.
- Si `isMultitaskingCameraAccessSupported` est `false` (SDK < 18 ou `voip` absent du plist final), « Me montrer » ne peut pas marcher.

## 3. À savoir côté iPhone

- **Relance automatique (7b3ec91)** : sur iPhone aussi, elle peut boucler si Firebase est lent au démarrage, parce que `AppState` passe à `active` après chaque rechargement. Il vaudrait mieux ne relancer qu'au retour d'arrière-plan (état précédent `background`), et une seule fois.
- **`android:showWhenLocked="true"` (Android)** : WIPP s'affiche par-dessus l'écran verrouillé dès qu'il passe devant, avec accès aux discussions. Et **Android refuse le mini lecteur tant que le téléphone est verrouillé** (vérifié : `enterPictureInPictureMode` → `false`). Windows s'occupe de la partie Android : demande de déverrouillage puis mini lecteur.

## 4. Ensuite

- Après le merge, `versionCode` reste **14** : la propriétaire génère l'AAB dans Android Studio sur Windows.
- La propriétaire veut tester le mini lecteur iPhone avec la notification avant la publication.
