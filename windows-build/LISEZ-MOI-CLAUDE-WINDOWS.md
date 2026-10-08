# WIPP — Build Android sur Windows (instructions pour Claude sur Windows)

Tu es Claude sur le PC Windows de l'utilisatrice. Ton rôle : **récupérer le dernier `main`,
préparer le projet et produire l'AAB Android signé** avec Android Studio, puis faire un rapport.
Ne change pas l'architecture du projet. Suis ces étapes dans l'ordre.

---

## Règles absolues

1. **Ne jamais toucher à la clé de signature** de l'utilisatrice (« wipp keysotre ») :
   ne pas la déplacer, la supprimer, la renommer, ni l'ajouter à git. Ne jamais afficher
   ses mots de passe. C'est l'utilisatrice qui signe dans Android Studio.
2. **Ne pas lancer `npx expo prebuild`** : le dossier `native/android` est suivi par git
   et déjà à jour (un prebuild recrée des filtres de partage en double dans le manifeste).
3. **Ne pas créer** de nouveau projet Expo, de nouvelle clé, ni de compte.
4. **Ne pas ajouter de permission Bluetooth** (`BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`,
   `BLUETOOTH_ADMIN`) ni `NFC`. WIPP Touch n'utilise ni Bluetooth ni NFC.
   (`BLUETOOTH` et `BLUETOOTH_CONNECT` restent : ils servent uniquement à l'audio des appels.)
5. Ne pas modifier le serveur, Supabase ni Vercel : tout est déjà déployé depuis le Mac.
6. Ne jamais marquer « PHYSICAL PASS » : c'est l'utilisatrice qui teste sur les vrais téléphones.

---

## Étape 1 — Récupérer le code

Dans le dossier du projet WIPP (celui qui contient `native/`, `src/`, `migrations/`) :

```bash
git fetch origin
git checkout main
git pull origin main
```

Vérifie que le dernier commit contient le travail WIPP Touch (au moins ces commits) :

```bash
git log --oneline -12
```

Tu dois voir notamment (le plus récent en haut) :
- `feat: thème clair, WIPP Touch avec WIPP simplement ouvert, capteur Android brut … (versionCode 6)`
- `fix(stickers): un sticker ne redevient plus du texte à la synchronisation …`

S'il y a des modifications locales qui bloquent le `pull`, **ne les écrase pas** :
montre-les à l'utilisatrice (`git status`) et demande-lui quoi faire.

## Étape 2 — Installer les dépendances

```bash
cd native
npm install
```

(`expo-quick-actions` a été ajouté récemment : il doit apparaître dans `native/node_modules`.)

## Étape 3 — Ouvrir dans Android Studio

- Ouvrir **le dossier `native/android`** (pas `native/`) dans Android Studio.
- Laisser la synchronisation Gradle se terminer. Elle télécharge notamment
  `androidx.core.uwb:uwb:1.0.0-alpha08` (UWB Android) : c'est normal.

## Étape 4 — Construire l'AAB signé

- Menu **Build → Generate Signed App Bundle / APK… → Android App Bundle**.
- L'utilisatrice choisit **sa** clé (« wipp keysotre ») et saisit elle-même les mots de passe.
- Variante : **release**.
- Version attendue : **versionCode 6**, versionName 1.0.0
  (déjà réglé dans `native/android/app/build.gradle` et `native/app.json`).

## Étape 5 — Vérifications après le build

1. **Le build doit réussir.** Le module natif `wipp-touch-native` a déjà été compilé avec
   succès sur le Mac (`compileReleaseKotlin` → BUILD SUCCESSFUL), ainsi que la fusion du manifeste.
2. **Permissions du manifeste fusionné** : ouvre
   `native/android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`
   et vérifie :
   - présent : `android.permission.UWB_RANGING` et `<uses-feature android:name="android.hardware.uwb" android:required="false"/>`
   - **absents** : `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_ADMIN`, `NFC`
3. Le fichier `.aab` se trouve en général dans `native/android/app/release/` ou
   `native/android/app/build/outputs/bundle/release/`.

## Si le build échoue

- Copie **l'erreur exacte** (les lignes `e:` ou `What went wrong`) dans ton rapport
  pour que l'utilisatrice la transmette à Claude sur le Mac.
- Erreurs connues et correctifs possibles :
  - *Manifest merger failed … minSdkVersion … androidx.core.uwb* : vérifier que
    `native/android/app/src/main/AndroidManifest.xml` contient bien
    `<uses-sdk tools:overrideLibrary="androidx.core.uwb"/>` (déjà présent dans git).
  - *Could not resolve androidx.core.uwb* : vérifier la connexion Internet / le dépôt `google()`.
  - Problème de mémoire Gradle : fermer les autres applications et relancer.
- Ne « répare » pas en supprimant WIPP Touch ou des permissions : rapporte l'erreur.

## Étape 6 — Installer sur le Samsung pour le test

Installe le build sur le Samsung (Run ▶ dans Android Studio en variante release/debug,
ou via le test fermé Play Console avec l'AAB versionCode 6).

---

## Ce qui a changé dans cette version (pour info)

**Nouveau dans le versionCode 6 :**
- **Thème clair** (blanc et bleu) : Moi → bouton ☀️/🌙, ou Réglages → Apparence (Sombre par défaut, Clair, Automatique).
  `styles.xml` est déjà en `Theme.AppCompat.DayNight` : rien à changer côté Android.
- **WIPP Touch avec un seul WIPP Touch ouvert** : l'autre téléphone a seulement WIPP ouvert (n'importe quel écran).
  Jamais en arrière-plan, jamais Bluetooth.
- **Capteur Android** : accéléromètre brut (au lieu de l'accéléromètre « linéaire » lissé par Samsung) pour sentir
  une tape légère dès le premier contact. Fichier : `modules/wipp-touch-native/android/.../WippTouchNativeModule.kt`.
- **Stickers** : ils ne se transforment plus en texte (« Bisou », « Sticker ») après synchronisation.

**Versions précédentes :**

- **WIPP Touch sans Bluetooth** : capteurs de mouvement → serveur WIPP → (UWB si possible) → carte → double acceptation.
- **Android** : détection du choc (accéléromètre linéaire), UWB Android ↔ Android (Jetpack UWB)
  quand les deux téléphones l'ont, autorisation « Appareils à proximité » (`UWB_RANGING`).
- **iPhone ↔ Android** : contact + serveur + carte + double acceptation (pas d'UWB commun, aucune fausse distance).
- **Raccourcis** : appui long sur le bouton central WIPP → WIPP Touch ; appui long sur l'icône
  WIPP (raccourci Android ajouté au premier lancement de l'app).
- **Notifications Android avec aperçu chiffré** : le serveur envoie le message chiffré, WIPP le
  déchiffre sur le téléphone et affiche « Nom — début du message » (ou « 📷 Photo », « 🎤 Message vocal »…).
  Taper la notification ouvre directement la conversation.
- Logo WIPP officiel, appels (CallKit / écran WIPP), statuts de messages WIPP Smile, etc.

---

## Test physique iPhone ↔ Samsung (fait par l'utilisatrice)

1. Deux comptes **pas encore connectés entre eux** (un sur l'iPhone, un sur le Samsung).
2. Ouvrir WIPP Touch sur les deux (appui long sur le bouton central WIPP).
   Sur le Samsung avec UWB : accepter « Appareils à proximité » si demandé.
3. A garde son téléphone immobile ; B le touche **une seule fois**.
   Variante à tester aussi : **seul A ouvre WIPP Touch**, B a juste WIPP ouvert sur ses discussions
   (téléphone déverrouillé). Après le contact, l'écran WIPP Touch doit s'ouvrir tout seul chez B avec la carte de A.
4. Attendu : petite vibration → double vibration → carte de l'autre (photo, nom, @pseudo),
   « WIPP Touch détecté », **sans** « Proximité confirmée ».
5. A « Se connecter » → « En attente de l'autre personne… » ; B « Se connecter » → « WIPP connecté ✓ ».
6. Refaire avec « Annuler » → « Connexion annulée » des deux côtés, puis retour à « Prêt ».

---

## Test des notifications Android (fait par l'utilisatrice)

1. Ouvrir WIPP une fois sur le Samsung après installation (il s'enregistre pour les nouvelles notifications).
2. Fermer WIPP, verrouiller le Samsung.
3. Recevoir un message privé : la notification doit montrer le **début du message**, pas « Nouveau message ».
4. Taper la notification : WIPP doit ouvrir **directement la conversation**.

---

## À reprendre au prochain build Android (versionCode 7) — seulement quand l'utilisatrice le demande

Fait côté iPhone le 2026-10-06, tout est sur `main`. Pour Android :

- **Refaire le prebuild Android** (`npx expo prebuild -p android`) : `app.json` a changé
  (écran de lancement sans logo, couleur `#020a22` ; sons dans le plugin `expo-notifications`).
- **Sons officiels WIPP** : `native/assets/sounds/`
  - `wipp_ring.caf` (sonnerie d'appel) et `wipp_message.caf` (messages / notifications) sont au format **iPhone**.
    Android ne lit pas le `.caf` : créer `wipp_ring.mp3` / `wipp_message.mp3` à partir de
    `wipp-ring.mp3` et `wipp-sms-original.mp3` (même dossier), les ajouter à la liste `sounds` du plugin,
    puis donner ce son au canal de notification `messages` et au canal `incoming_calls`.
  - Côté serveur, le son des notifications Android (`src/lib/push/native.ts`, FCM) est encore `default`.
- **Groupes** : création en 4 étapes, autorisations, éphémères, grille, Signaler et quitter, « Lu par »,
  sondages, événements avec photo — code commun, rien de spécifique à Android à faire.
- **Conversations verrouillées par code** : utilise `expo-secure-store` et `expo-local-authentication`
  (déjà installés) ; vérifier que l'empreinte / le code du téléphone s'ouvrent bien sur le Samsung.
- **Messages vocaux (pause → écouter → reprendre)** : sur iPhone, chaque pause ferme un morceau et les morceaux
  sont assemblés par `modules/wipp-video-trim` (`concatAudio`, Swift). Sur Android ce module n'existe pas encore :
  la pause est une pause simple, sans écoute avant l'envoi. À ajouter côté Android (MediaMuxer) si besoin.
- **Appel manqué** : sur iPhone, c'est le code natif (`withWippVoip`) qui affiche « Appel manqué ».
  Sur Android, il faudra l'ajouter (notification quand l'appel plein écran s'arrête sans réponse).

---

## Fait côté iPhone le 2026-10-07 (code commun, à vérifier sur Android au prochain build)

Tout est sur `main`. Le code ci-dessous est commun ; rien de spécifique à Android sauf mention.

- **Stickers** : panneau en images fixes + aperçu animé un par un (sinon l'app est tuée) ; barre du bas
  Récents · Wippmoji · Wippie · EMO · Moments · Surprises ; recherche par mots-clés (`src/lib/sticker-keywords.ts`).
  Les animations lourdes sont servies par le site (`public/wipp-media`, `?v=2`).
- **Bonhomme WIPP** dans le champ de message (jaune thème sombre / bleu thème clair) → ouvre les stickers.
- **Messages vocaux façon WhatsApp** (`VoiceComposer.tsx`, `voice-recorder.ts`) : maintenir / glisser / cadenas,
  panneau verrouillé, éphémère « 1 », forme de la voix envoyée chiffrée.
  ⚠️ Android : pas d'assemblage des morceaux (module Swift `concatAudio` seulement) → pause simple, pas d'écoute avant l'envoi.
  Vérifier l'autorisation RECORD_AUDIO et la lecture des .m4a sur le Samsung.
- **Appels de groupe + liens d'appel** (`wippapp.com/c/<code>`) : sur Android, ajouter `/c/*` aux App Links
  (`assetlinks.json` existe déjà ; vérifier l'intent-filter `pathPrefix="/c/"` après prebuild).
- **Stories** : éditeur de calques (textes polices/couleurs/fonds, stickers Wippmoji et Wippie, gestes),
  cercle découpé par élément, découpe vidéo 10/15/30/45/60 s. Polices « Manuscrit / Machine / Élégant » :
  sur Android elles tombent sur `casual` / `monospace` / `serif` (normal).
- **Boutiques** : nouvelle page (bannière, étiquettes, Ouvert maintenant, Instagram/TikTok/Facebook, abonnés,
  Enregistrer, Nos services, QR en bas).
- **Chats** : filtre « Non lus » (remplace « Personnel »).
- **Plus de données de démo** dès qu'un vrai compte est connu (au lancement), boutiques des conversations gardées
  dans la mémoire chiffrée de la messagerie.
- Serveur (déjà en production) : migrations 0022, 0044–0048.

---

## Avertissements Google Play sur la version 6 (vus le 2026-10-07) — à traiter au versionCode 7

1. **« Types de services de premier plan restreints » (BOOT_COMPLETED) — CORRIGÉ dans le code (Mac).**
   Nouveau plugin `native/plugins/withWippAndroidBootFix.js` (déjà dans `app.json`) + manifeste `native/android` régénéré :
   - plus de `RECEIVE_BOOT_COMPLETED` (dans `android.blockedPermissions`) ;
   - récepteurs `expo.modules.taskManager.TaskBroadcastReceiver` et `expo.modules.notifications.service.NotificationsService` remplacés **sans** BOOT_COMPLETED / REBOOT / QUICKBOOT (le reste gardé) ;
   - services inutilisés retirés : `expo.modules.location.services.LocationTaskService` (pas de localisation en arrière-plan) et `com.oney.WebRTCModule.MediaProjectionService` (pas de partage d'écran).
   WIPP n'a rien à relancer au démarrage du téléphone (aucune notification programmée pour plus tard).
   ⚠️ Si tu refais `npx expo prebuild -p android`, **dédoublonne** les intent-filters SEND / SEND_MULTIPLE (expo-share-intent les ajoute deux fois) et ne laisse pas prebuild écraser l'écran de démarrage / les couleurs (remets `res/` et `gradle.properties` avec `git checkout`).
   À vérifier au build : appels entrants (CallKeep), notifications, partage vers WIPP — tout doit marcher comme avant.

2. **« Optimisation du code DEX inférieure au seuil » (brouillage 1 %) — à faire avant février 2027, PAS urgent.**
   Cause : `android.enableMinifyInReleaseBuilds` est à false (R8 désactivé). Solution : l'activer (`expo-build-properties` → `android.enableMinifyInReleaseBuilds: true` + `enableShrinkResourcesInReleaseBuilds: true`), puis **tester à fond** une version de release (appels LiveKit, CallKeep, Firebase, notifications, chiffrement, partage), en ajoutant des règles `-keep` dans `proguard-rules.pro` si une bibliothèque casse. Ne pas l'activer sans ces tests.

## « Reçu » (deux points gris) et notifications — fait côté iPhone le 2026-10-08

- La conversation n'envoie plus « je regarde cette conversation » (focus) quand l'app n'est pas au premier plan : avant, téléphone verrouillé = serveur croyait la conversation lue = **pas de notification**. (`screens/conversation.tsx`, AppState.)
- « Lu » seulement si l'app est active (`store.ts` applyLiveEvent) ; sinon « reçu ».
- Nouveau : **clé « reçu »** (`POST /api/wipp/me/delivery-key`, puis `POST /api/wipp/receipts/delivered {key, chatId, messageId}`), table `wipp_delivery_keys` (migration 0052). La clé ne peut QUE marquer « reçu ». Sur iPhone, l'extension de notification l'appelle à chaque notification de message, app fermée.
- **À faire sur Android** : dans la tâche de fond qui reçoit les notifications de message (`lib/push/android-message.ts`), appeler `receipts/delivered` avec la même clé (la récupérer comme `ensureDeliveryKeyForNotifications`, sans la partie trousseau iOS), pour avoir les deux points gris app fermée.

## Rapport à donner à l'utilisatrice

1. Commit récupéré (`git log --oneline -1`)
2. `npm install` : OK / erreur
3. Build AAB : OK / erreur exacte
4. Permissions vérifiées (UWB_RANGING présent ; pas de BLUETOOTH_SCAN/ADVERTISE/ADMIN ni NFC)
5. Chemin du fichier `.aab` et versionCode
6. Installation sur le Samsung : OK / non
