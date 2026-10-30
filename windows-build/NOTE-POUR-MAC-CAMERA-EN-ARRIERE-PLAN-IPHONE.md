# Note pour Claude Mac — caméra qui reste allumée hors de l'app (iPhone)

**Demande de la propriétaire :** pendant un appel vidéo, quand elle sort de WIPP, le mini lecteur (PiP) marche, mais elle veut aussi que **sa caméra continue** : l'autre personne doit la voir au lieu de « Je reviens… ».

Sur Android, le mini lecteur est fait (`CallPip.kt`, voir `RAPPORT-WINDOWS-VERSION-14.md`), mais la caméra y est encore mise en pause comme sur iPhone. Windows peut faire la partie Android si la propriétaire le confirme.

## Pourquoi ça ne marche pas aujourd'hui sur iPhone

1. iOS coupe la caméra d'une app en arrière-plan, **sauf** si la session de capture a `isMultitaskingCameraAccessEnabled = true`.
2. Depuis iOS 18, c'est autorisé **sans entitlement spécial** pour une app compilée avec le SDK iOS 18+ qui a `voip` dans `UIBackgroundModes`. WIPP a déjà `voip` dans `Info.plist`. Avant iOS 18, il fallait l'entitlement `com.apple.developer.avfoundation.multitasking-camera-access`, sur demande à Apple.
3. `@livekit/react-native-webrtc` (144.2.0) sait déjà le faire (`VideoCaptureController.m`, l. 67-76 : il active `multitaskingCameraAccessEnabled` si `isMultitaskingCameraAccessSupported`), mais **seulement si** `WebRTCModuleOptions.sharedInstance().enableMultitaskingCameraAccess = true`. **Cette option n'est activée nulle part** dans WIPP.
4. En plus, `CallOverlay.tsx` (listener `AppState`, « iOS stops the camera in the background: pause it on purpose ») fait `track.mute()` volontairement en arrière-plan. Même avec l'option, l'autre verrait donc « Je reviens… ».

## Ce qu'il faut faire

### 1. Activer l'option native (AppDelegate, via le plugin `withWippVoip.js` pour survivre au `prebuild`)

Le README de `@livekit/react-native` (section Swift) indique, **avant toute initialisation React Native** dans `didFinishLaunchingWithOptions` :

```swift
import livekit_react_native_webrtc

let options = WebRTCModuleOptions.sharedInstance()
options.enableMultitaskingCameraAccess = true
```

L'option est lue à la création de la capture (`WebRTCModule+RTCMediaStream.m` l. 155), donc il suffit qu'elle soit posée avant le premier appel.

### 2. Ne plus couper la caméra en arrière-plan quand iOS la garde

Dans `CallOverlay.tsx`, au passage en `background`, ne faire `track.mute()` que si l'iPhone ne peut pas garder la caméra :

```ts
const keepsCamera = Platform.OS === "ios" && Number(Platform.Version) >= 18;
if (st === "background" && !keepsCamera) { /* mute actuel */ }
```

Le `revive()` au retour reste utile : si iOS a quand même coupé la capture (mini lecteur fermé, autre app qui prend la caméra), `readyState === "ended"` donne `restartTrack`, comme aujourd'hui.

### 3. Vérifier sur l'iPhone 15

1. Lancer un appel vidéo et sortir de l'app : le mini lecteur s'affiche **et** l'autre téléphone voit toujours l'image (pas « Je reviens… »).
2. Le voyant vert de la caméra reste allumé.
3. Dans les journaux, `isMultitaskingCameraAccessSupported` doit valoir `true`. S'il vaut `false`, le build n'est pas lié au SDK iOS 18, ou `voip` manque dans le `Info.plist` final.

### Optionnel : voir **sa propre** caméra dans le mini lecteur iPhone

Le PiP iOS de la bibliothèque (`iosPIP` sur un `RTCView`, `PIPController.m`) n'affiche **qu'une seule** vidéo, celle de l'autre. Pour ajouter une petite vignette de soi, il faudrait modifier le natif : deux `AVSampleBufferDisplayLayer` dans le `AVPictureInPictureVideoCallViewController`. C'est plus lourd, à faire seulement si la propriétaire le demande.

## Sources

- Apple, `AVCaptureSession.isMultitaskingCameraAccessSupported` : https://developer.apple.com/documentation/avfoundation/avcapturesession/ismultitaskingcameraaccesssupported
- Apple, entitlement `multitasking-camera-access` : https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.avfoundation.multitasking-camera-access
- `node_modules/@livekit/react-native/README.md`, section iOS, « use the camera in the background — Requires voip background mode and iOS 18+ ».
