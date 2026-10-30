# Rapport Windows — version 14 Android (30 octobre 2026)

## Résultat

- Étape J suivie depuis `main` (2417b22), plus le commit Mac `3b6e36d` (boutons compacts des appels à plusieurs), fusionné pendant les tests. Pas de `expo prebuild`. `versionCode` 14.
- **Bloquant trouvé et corrigé** : la version 14 telle que poussée **ne démarrait pas sur Android** (boucle de redémarrage, écran bleu). Voir plus bas.
- Les 4 points « À faire sur Android » sont faits et testés sur le Samsung A50 (Android 10). On a ajouté le bouton retour Android pour toutes les pages (accord de la propriétaire).
- **L'AAB de production n'est pas encore construit.** Il faut d'abord intégrer ces commits dans `main`, puis la propriétaire génère l'AAB 14 dans Android Studio.

## Commits Windows (branche `video-studio`)

| Commit | Ce qui a changé |
|---|---|
| `d3efe53` | **Démarrage sans logo** (demande de la propriétaire) : `windowSplashScreenAnimatedIcon` → `drawable/splashscreen_empty.xml` (transparent). Il ne reste que le fond `#02081e` avant la vidéo d'accueil. Pour un futur `prebuild`, il faudra une image transparente dans la config splash d'`app.json`. |
| `ba00cc4` | **Point 1, mini lecteur Android** : `android/app/.../CallPip.kt` est un module de l'app (`WippCallPip`, enregistré dans `MainApplication`, sans dépendance npm et sans effet sur iOS). Il passe en PiP 9:16 sur `onUserLeaveHint` (Android 8 à 11) ou en entrée automatique (Android 12+, `setAutoEnterEnabled`). Le manifeste a `supportsPictureInPicture` et `smallestScreenSize`. Côté JS, `src/lib/calls/android-pip.ts` : `CallOverlay` l'active seulement quand un appel **vidéo** est **connecté**. En PiP, seule la vidéo de l'autre s'affiche, sans boutons (ou nom + durée si sa caméra est coupée). Le partage d'écran (directs seulement) n'est pas concerné. **Point 3** : `BackHandler` dans `ExploreScreen` (vide la recherche, puis `hub → "home"`). |
| `81601ff` | **Boucle de redémarrage** (voir ci-dessous) : relance automatique de `AppShell` limitée à iOS. |
| `d82f36f` | **Bouton retour Android partout** : il n'y avait **aucun** `BackHandler`. Pour Android, l'app n'a qu'une route expo-router, donc retour depuis une conversation, un profil… mettait WIPP en arrière-plan (déjà le cas en version 13). On utilise maintenant les mêmes règles que le glissement iPhone (`swipeBack`) : retour revient d'une page. Sur les onglets, un appel, la caméra, les Stories, un direct, le comportement Android normal est inchangé. |

## ⚠️ Boucle de redémarrage sur Android (7b3ec91)

L'effet de `AppShell.tsx` « connexion enregistrée mais pas encore lue → `reloadAppAsync` » se déclenchait aussi sur Android. Après chaque rechargement, Android renvoie `AppState = "active"` avant que Firebase ait relu la connexion, ce qui provoque un nouveau rechargement. Le journal montre **62 démarrages de JS en 2 minutes** et un écran bleu permanent. Le correctif `81601ff` ajoute `Platform.OS !== "ios"` → return.

Le risque existe peut-être aussi sur iPhone si Firebase est lent au démarrage : la relance devrait n'arriver qu'au retour d'arrière-plan (état précédent `background`), et une seule fois. Je n'ai pas touché au comportement iPhone.

## Tests sur le Samsung (appels avec l'iPhone de la propriétaire)

| Test | Résultat |
|---|---|
| Démarrage | ✅ Un seul démarrage, fond bleu sans logo, puis la vidéo d'accueil. |
| Appel vidéo, sortie de l'app | ✅ Le Samsung passe en mini lecteur (fenêtre 9:16 avec la vidéo de l'iPhone, sans boutons), par-dessus les autres apps. |
| Retour dans l'app | ✅ Toucher le mini lecteur rouvre WIPP en plein écran sans redémarrer, et la caméra du Samsung se rallume (vignette en direct). |
| « Je reviens… » sur l'iPhone | La caméra est coupée en arrière-plan par le listener existant, ce qui provoque l'écran « Je reviens… ». **Confirmation de la propriétaire à noter.** |
| Réactions | ✅ « Fête » envoyée de l'iPhone : le Wippmoji Youpi animé s'affiche sur le Samsung. |
| Appel de groupe (avant la mise à jour) | Fonctionne avec la main levée. La 3e case passait sous Micro et Caméra ; c'est corrigé par `3b6e36d` (non revérifié à 3). |
| Point 4, « Appel manqué » | ✅ WIPP fermé (retiré des récents), appel de l'iPhone, décroché, raccroché : **aucune notification WIPP ne reste** (vérifié avec `dumpsys notification` et le volet). |
| Point 3, retour Explorer | ✅ Petites annonces, Entreprises et Événements → retour → accueil d'Explorer. Retour à nouveau → WIPP en arrière-plan (normal sur un onglet). |
| Retour conversation | ✅ Retour → liste des discussions (avant : sortie de WIPP). |
| En-tête de conversation | ✅ « en ligne » visible sous le nom. |
| Explorer | ✅ Nouvelles cases à contour doré visibles. |

## Pas testé

- Studio vidéo des Stories (scinder, texte, filtre, Terminé, publier).
- Achat test d'un Wippmoji : il faut une version installée depuis la Play Console.
- Appel à 3 avec les nouveaux boutons compacts.

## À signaler à Mac

- **`android:showWhenLocked="true"` sur `MainActivity`** (pour les appels entrants) : WIPP s'affiche **par-dessus l'écran verrouillé chaque fois qu'il passe devant**. Pendant les tests, le Samsung était verrouillé et WIPP s'est ouvert sans déverrouillage, avec accès aux discussions. Ce serait mieux de n'activer `setShowWhenLocked(true)` que pendant la sonnerie ou l'appel, puis de le remettre à `false`.
- Son de l'appel : `dumpsys audio` reste en mode `NORMAL` pendant l'appel (pas `IN_COMMUNICATION`). Le son passait quand même ; c'est à garder en tête si l'écouteur ou l'écho posent problème.
