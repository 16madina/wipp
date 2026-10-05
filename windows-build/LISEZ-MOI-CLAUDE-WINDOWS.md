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

Tu dois voir notamment :
- `feat(touch): UWB Android ↔ Android (Jetpack UWB, paramètres via le serveur) …`
- `fix(touch/android): disponibilité UWB sans isAvailable … — module compilé`
- `chore(android): versionCode 5 + dossier d'instructions Windows`

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
- Version attendue : **versionCode 5**, versionName 1.0.0
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
ou via le test fermé Play Console avec l'AAB versionCode 5).

---

## Ce qui a changé dans cette version (pour info)

- **WIPP Touch sans Bluetooth** : capteurs de mouvement → serveur WIPP → (UWB si possible) → carte → double acceptation.
- **Android** : détection du choc (accéléromètre linéaire), UWB Android ↔ Android (Jetpack UWB)
  quand les deux téléphones l'ont, autorisation « Appareils à proximité » (`UWB_RANGING`).
- **iPhone ↔ Android** : contact + serveur + carte + double acceptation (pas d'UWB commun, aucune fausse distance).
- **Raccourcis** : appui long sur le bouton central WIPP → WIPP Touch ; appui long sur l'icône
  WIPP (raccourci Android ajouté au premier lancement de l'app).
- Logo WIPP officiel, appels (CallKit / écran WIPP), statuts de messages WIPP Smile, etc.

---

## Test physique iPhone ↔ Samsung (fait par l'utilisatrice)

1. Deux comptes **pas encore connectés entre eux** (un sur l'iPhone, un sur le Samsung).
2. Ouvrir WIPP Touch sur les deux (appui long sur le bouton central WIPP).
   Sur le Samsung avec UWB : accepter « Appareils à proximité » si demandé.
3. A garde son téléphone immobile ; B le touche **une seule fois**.
4. Attendu : petite vibration → double vibration → carte de l'autre (photo, nom, @pseudo),
   « WIPP Touch détecté », **sans** « Proximité confirmée ».
5. A « Se connecter » → « En attente de l'autre personne… » ; B « Se connecter » → « WIPP connecté ✓ ».
6. Refaire avec « Annuler » → « Connexion annulée » des deux côtés, puis retour à « Prêt ».

---

## Rapport à donner à l'utilisatrice

1. Commit récupéré (`git log --oneline -1`)
2. `npm install` : OK / erreur
3. Build AAB : OK / erreur exacte
4. Permissions vérifiées (UWB_RANGING présent ; pas de BLUETOOTH_SCAN/ADVERTISE/ADMIN ni NFC)
5. Chemin du fichier `.aab` et versionCode
6. Installation sur le Samsung : OK / non
