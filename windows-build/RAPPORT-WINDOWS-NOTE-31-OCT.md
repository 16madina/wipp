# Rapport Windows — note Mac du 31 octobre (Android) et bugs d'appel

Tout est sur `video-studio`. Testé sur le Samsung A50 (Android 10). Pas de `expo prebuild`.

## Points de la note `NOTE-MAC-31-OCT-ANDROID.md`

| Point | Résultat |
|---|---|
| 1. « Continuer » trop bas | **Corrigé (`60ba5cb`)**. `auth.tsx`, Android seulement : l'image et le formulaire de `Artwork` s'arrêtent au-dessus de la barre de navigation (`insets.bottom`). Les écrans en % (numéro, code, connexion) mettaient « Continuer » dessous sur les téléphones plus courts. Clavier ouvert : `reveal(champ, continueRef)` remonte le formulaire jusqu'au bouton, le champ reste visible en haut. Profil : marge du bas plus comptée deux fois. Avant ça (`c7a91c0`), `measureInWindow` compte depuis le bas de la barre d'état sur Android et le clavier depuis le haut de l'écran : on ajoute `StatusBar.currentHeight`. Vérifié sur « Ton numéro de téléphone » et « Content de te revoir », avec et sans clavier (écran forcé dans une version de test, sans déconnecter la propriétaire). iPhone inchangé. |
| 2. Photos « Accès refusé » | Correction Mac incluse. **À confirmer par la propriétaire.** |
| 3. Jetons FCM | Base vérifiée (accord de la propriétaire) : 4 appareils Android actifs, dont 2 **sans jeton** (@testa, @teste). Yves (@yvess, 1er nov.) n'a eu le sien que 16 min après l'inscription, au redémarrage suivant. Le Samsung (@samsung) en a un. La correction Mac (`registerFcmAfterSession`) est incluse. |
| 4. « Je reviens… » | La correction Mac marche : plus de « Je reviens… » quand la caméra est coupée exprès. Mais la propriétaire a vu un autre problème (voir plus bas, `69d7674`). |
| 5. Batterie | **Fait (`60ba5cb`)**. Module `WippPower` (`CallPip.kt` / `WippPower.kt`) : `isIgnoringBatteryOptimizations` et `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` ; si WIPP est par-dessus l'écran verrouillé, il demande d'abord le déverrouillage. Question « Recevoir tes appels » 8 s après `onSessionReady`, au plus une fois par semaine si « Plus tard » (`src/lib/background-calls.ts`). Moi → Notifications : « Appels quand WIPP est fermé ». Permission `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` au manifeste. Côté serveur, les appels FCM partent déjà en `priority: HIGH`. Vérifié sur le Samsung : la question s'affiche, le réglage passe à « Autorisé ». |

## Bugs trouvés pendant les tests (code commun : **à compiler pour l'iPhone**)

- **`69d7674` Disposition de l'appel vidéo** : quand l'autre coupe sa caméra, ma propre caméra prenait tout l'écran et l'autre disparaissait. Maintenant l'autre est toujours en grand : sa vidéo, ou sa photo avec « Caméra éteinte » (`peerCamOff`). Moi, toujours dans le petit carré : ma caméra, ou ma photo avec « Ta caméra est éteinte » (`CallScreen.tsx`).
- **`d763fba` Appel fantôme** (iPhone → Samsung : l'iPhone avait raccroché, le Samsung sonnait encore, puis comptait seul après avoir décroché) :
  - `watchInvite`, côté appelant : après 60 s sans réponse, on ne faisait que `phase: missed` localement. Le serveur restait en « ringing » (son expiration est paresseuse) et ne prévenait jamais l'autre téléphone. Maintenant `hangupCall(id)` est appelé.
  - `acceptCurrentCall`, côté appelé : `answerCallInvite` renvoie le statut (`cancelled`, `missed`…) sans erreur si l'appel n'est plus en train de sonner, et on rejoignait quand même la salle. Maintenant on vérifie `invite.status`, on affiche « Appel annulé » et on lance `endSystemCall`.
  - Le journal du Samsung du 2 novembre était déjà effacé : la cause exacte (expiration à 60 s ou annulation non reçue) n'est pas confirmée. **Sur iPhone**, vérifie que le même scénario n'arrive pas dans l'autre sens.

## ⚠️ À faire sur Mac : compiler une nouvelle version iPhone

Test de la propriétaire, Samsung (nouvelle version) ↔ iPhone 15 (build actuel) :
- **Samsung** : correct. Caméra du Samsung coupée → le petit carré montre « Ta caméra est éteinte » ; caméra de l'iPhone coupée → « Caméra éteinte » avec la photo de l'iPhone en grand.
- **iPhone** : quand le Samsung coupe sa caméra, l'iPhone **n'affiche rien**, ni photo ni « Caméra éteinte ». C'est attendu : le build iPhone actuel n'a pas encore `69d7674` (`CallScreen.tsx`, `peerCamOff`). **Compile une nouvelle version iPhone avec `69d7674` et `d763fba`**, puis refais le test dans les deux sens. Si l'iPhone n'affiche toujours rien, vérifie qu'il reçoit bien `remoteMuted` (événement `TrackMuted` de LiveKit) quand le Samsung coupe sa caméra.

## Demandes plus visibles (page Chats)

Demande de la propriétaire : les utilisateurs ne voient pas qu'ils ont reçu une demande. `chats.tsx` → `RequestsBanner` : quand il y a des demandes, un bandeau **jaune plein** (texte foncé, « Voir › », halo doré) qui « respire » doucement (échelle 1 → 1,03) avec l'icône qui fait coucou toutes les 1,5 s. Sans demande, l'ancienne ligne discrète « Demandes ». Code commun : à compiler aussi pour l'iPhone.

## « La demande n'a pas pu être envoyée » alors que l'autre m'a déjà envoyé une demande

Scénario de la propriétaire : A envoie une demande à B ; B cherche A, ouvre son profil, « Se connecter » → « La demande n'a pas pu être envoyée ». Le serveur (`src/lib/messaging/social.ts`) répond pourtant `pending_in`, mais `connectWith` (`store.ts`) ne connaissait pas ce statut. Maintenant : « Demande reçue — {nom} t'a déjà envoyé une demande… » avec les boutons « Plus tard » et « Voir mes demandes » ; `STATUS_FR.pending_in` est ajouté. Code commun.

## Version 14 Android

- `versionCode` 14 (la dernière envoyée est la 13). L'AAB doit être généré **après** ces commits.
- **Encore à tester avec la propriétaire** : Samsung qui sonne WIPP fermé, nouvelle disposition caméra coupée, choix de photo, appel annulé avant de décrocher.
