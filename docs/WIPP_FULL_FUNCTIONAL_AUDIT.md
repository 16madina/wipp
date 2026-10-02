# WIPP — Audit fonctionnel

COMMIT AUDITED — `bd2ebbbf080d64f2d5f404a9ac7645d049a1e070` (`feat(native): polish auth UI stickers and surprises`, 2026-10-01 13:37 -0400), branche `main`

DEVICE AUDITED — aucun. `adb` est absent de ce Mac, aucun SDK Android n'est installé, aucun appareil Android n'est branché. Un iPhone et un iPad sont visibles par Xcode, mais cet audit ne les a pas utilisés. Aucun parcours n'a été exécuté sur un téléphone.

ANDROID VERSION — non applicable (pas d'appareil)

BACKEND AUDITED — Supabase `https://sdaulxbcksusojcbsucr.supabase.co` (clé anon, lecture seule, aucune migration appliquée) et `https://wippapp.com` (sondes HTTP sans session)

DATE — 2026-10-01

Changements locaux non commités au moment de l'audit (hors sujet fonctionnel, faits plus tôt dans la session) : `native/src/screens/auth.tsx`, `native/src/screens/conversation.tsx`, `native/src/lib/assets.ts`, `native/package-lock.json`, `native/assets/composer/`, `native/scripts/key-composer-icons.mjs`. Ils ne font pas partie du commit audité. L'audit porte sur le code présent dans l'arbre de travail, qui est ce commit plus ces fichiers.

## Règle de statut

Aucun statut n'est un DEVICE PASS ni un DEVICE FAIL : rien n'a été exécuté sur un appareil. « Le fichier existe » et « TypeScript compile » ne comptent pas comme un succès. Les symptômes que vous avez vus sur votre Android (story, vidéo, animations) sont notés comme signalés ; la cause ci-dessous est celle établie par le code et par le backend hébergé.

## EXECUTIVE SUMMARY

TOTAL DEVICE PASS — 0

TOTAL DEVICE FAIL — 0

TOTAL PARTIAL — 12

TOTAL CODE READY / DEVICE TEST REQUIRED — 12

TOTAL BACKEND BLOCKED — 22

TOTAL EXTERNAL CONFIG REQUIRED — 3

TOTAL MOCK/SIMULATED — 4

TOTAL NOT IMPLEMENTED — 14

Ces totaux comptent les 67 lignes du tableau ci-dessous, une ligne = une sous-fonction. Une ligne peut signaler un second blocage dans sa cause (appels et push : déploiement ET clé externe) ; elle n'est comptée qu'une fois, sous le statut qui bloque en premier.

Le blocage dominant n'est pas un écran manquant. Deux choses empêchent la plupart des fonctions « déjà codées » :

1. Le site `https://wippapp.com` répond, mais **toutes** les routes sondées sous `/api/wipp/` renvoient **404** (HTML). Santé, appels, Touch, Nearby, appareils, profil : rien n'est servi. `/.well-known/assetlinks.json` et `apple-app-site-association` sont aussi en 404.
2. Sur Supabase `sdaulxbcksusojcbsucr`, les migrations **0012, 0013, 0014, 0015, 0016 et 0017 ne sont pas appliquées**. Les tables `wipp_stories`, `wipp_listings`, `wipp_events`, `wipp_saves`, `wipp_nearby_sessions`, `wipp_group_calls` n'existent pas. Les RPC `wipp_lot7_*`, `wipp_lot15_*`, `wipp_lot16_*` n'existent pas. Les buckets `wipp-public-media` et `wipp-private-media` n'existent pas (`NoSuchBucket` sur une requête d'objet). Les colonnes `wipp_messages.mentions`, `wipp_messages.system_event`, `wipp_chat_members.generic_notify` et `wipp_push_tokens.installation_id` n'existent pas.

Conséquence directe pour votre story : publier une photo ou une vidéo appelle un bucket absent puis une fonction SQL absente. La vidéo a en plus un trou côté lecteur : l'écran de lecture n'affiche que l'image.

Les animations qui « marchent dans le navigateur et pas sur le téléphone » ont une cause dans le code, indépendante du backend. Elle est détaillée en section 2. Elle n'a pas été rejouée sur un Android pendant cet audit.

## CRITICAL FAILURES

### Story photo — BACKEND BLOCKED — CRITICAL

Parcours réel du code (`native/src/screens/extra.tsx`, `NewStoryScreen`) : galerie → `fetch(uri)` → octets → `uploadPrivateMedia` vers le bucket `wipp-private-media`, chemin `stories/<profil>/<id>` (`native/src/lib/calls/rules.ts`) → `wipp_lot7_publish_story`.

Ce qui est vrai sur le backend hébergé, mesuré par des requêtes en lecture :

- le bucket `wipp-private-media` n'existe pas ;
- la fonction `wipp_lot7_publish_story` n'existe pas ;
- la table `wipp_stories` n'existe pas.

L'upload échoue donc avant toute question de permission Android, de MIME ou de lecteur. La migration qui crée le bucket et les policies est `migrations/0016_wipp_private_storage_calls.sql`. Celle qui crée la publication est `migrations/0014_wipp_groups_stories_explore.sql`, réécrite par `0015`. Aucune des deux n'est sur le projet hébergé. Présence du SQL dans le dépôt ≠ migration appliquée.

Défauts client, secondaires tant que le backend est absent :

- la photo est lue par `fetch(asset.uri)` (`extra.tsx`, vers la ligne 119), pas par le lecteur de fichiers qui gère `file://`. Un `content://` Android peut échouer ici même après déploiement du bucket ;
- aucune prise caméra sur cet écran (galerie seulement) ;
- pas de limite de taille.

Cause confirmée : oui, pour l'absence de bucket et de RPC. Les défauts URI Android restent probables, non rejoués sur appareil.

### Story vidéo — BACKEND BLOCKED, et le lecteur est absent — CRITICAL

Même pipeline que la photo (`kind: "video"`, MIME `video/mp4` par défaut). Même bucket absent, même RPC absente.

En plus, `StoriesScreen` (`extra.tsx`, vers les lignes 35-38) n'affiche une story que si `imageUrl` fournit une source à `expo-image`. Une story `type === "video"` n'a pas de lecteur (`expo-video` n'est pas utilisé ici). Même avec un backend en place, la vidéo publiée ne serait pas lue sur cet écran. Cause du lecteur : confirmée dans le code. Lecture sur appareil : non faite.

### Animations / Wippmojis — PARTIAL, cause dans le code — CRITICAL

Cinq écarts web → natif, lus dans le code et les fichiers (pas rejoués sur Android) :

1. **Wippmoji (52) et WippEMO (10)** sont des WebP animés (chunk `ANMF` présent). `WippSticker` les affiche avec `autoplay={Boolean(loop)}` et aucun appelant ne passe `loop`. Sur Android, `autoplay={false}` fige la première image. Dans le navigateur, `<img>` anime le WebP quand même. Fichiers : `native/src/components/WippSticker.tsx`, `native/src/screens/conversation.tsx`, `native/src/components/StickerTray.tsx`.
2. **Wippie (69)** : l'animation est un MP4 sur fond vert. Le script d'assets n'embarque pas les MP4. Le natif n'a aucun lecteur sticker (pas d'`expo-video` sur ce composant). Le web joue la vidéo et retire le vert au canvas. Sur téléphone, seule l'affiche statique peut s'afficher. Android ne décode pas non plus une vidéo avec canal alpha : il faudrait des WebP déjà détourés (`native/scripts/key-green-anim.mjs` existe et n'a servi que pour 3 surprises).
3. **Surprise Fusion et Bisous** : `native/src/generated/raster.ts` fait pointer les clés `.webp` animées vers les PNG statiques, parce que `native/scripts/gen-assets.mjs` préfère `.png` au `.webp` de même nom. « Pluie d'amour » pointe encore vers le vrai WebP. Relancer le générateur tel quel casserait aussi celle-là.
4. **SIG et SCENE (60)** : le web anime (`motion`, `fx`, son). Le natif ne lit pas ces champs. PNG inertes.
5. **WIPP Moments (42)** : les WebP animés (~3 Mo chacun) ne sont pas dans l'app, ils sont sur `wippapp.com`. L'overlay se ferme sur une minuterie fixe, que le fichier soit arrivé ou non.

`lottie-react-native` n'est pas installé. Aucun APNG dans les assets.

## TABLE

| FEATURE | SUBFEATURE | CODE | BACKEND | DEVICE | RESULT | ROOT CAUSE | PRIORITY | FILES | FIX |
|---|---|---|---|---|---|---|---|---|---|
| Stories | Publier une photo | client écrit | bucket + RPC absents | non testé | BACKEND BLOCKED | 0014/0016 non appliquées | CRITICAL | `extra.tsx`, `lot7/api.ts` | Appliquer 0014–0017, puis retester l'URI Android |
| Stories | Publier une vidéo | client écrit | idem | non testé | BACKEND BLOCKED | idem | CRITICAL | idem | idem |
| Stories | Lire une vidéo | pas de lecteur | — | non testé | NOT IMPLEMENTED | `StoriesScreen` ne rend que `expo-image` | CRITICAL | `extra.tsx` | Lecteur `expo-video` si `type === "video"` |
| Stories | Caméra | bouton absent | — | non testé | NOT IMPLEMENTED | `launchImageLibraryAsync` seulement | HIGH | `extra.tsx` | `launchCameraAsync` |
| Stories | Story texte | client écrit | RPC absent | non testé | BACKEND BLOCKED | `wipp_lot7_publish_story` absente | HIGH | `lot7/api.ts` | Appliquer 0014/0015 |
| Stories | URL signée, autre compte, expiration | client écrit | table absente | non testé | BACKEND BLOCKED | `wipp_stories` absente | HIGH | `lot7/api.ts`, `0016` | Appliquer les migrations |
| Wippmoji / EMO | WebP animé dans le chat | figé | aucun | non testé | PARTIAL | `autoplay={false}` | CRITICAL | `WippSticker.tsx` | Passer `loop` / `autoplay` |
| Wippie | MP4 | affiche seule | aucun | non testé | PARTIAL | MP4 non embarqué, pas de lecteur natif | CRITICAL | `stickers.ts`, `gen-assets.mjs` | WebP détouré, ou lecteur natif |
| SIG / SCENE | Mouvement et son | web seulement | aucun | non testé | NOT IMPLEMENTED | champs `motion`/`fx` non lus | HIGH | `stickers.ts` | Porter les presets |
| WIPP Moments | Plein écran | timer fixe | CDN joignable | non testé | PARTIAL | 3 Mo distants, fermeture avant chargement | HIGH | `WippMomentOverlay.tsx` | Embarquer ou attendre `onLoad` |
| Surprise | Fusion, Bisous | PNG à la place du WebP | aucun | non testé | PARTIAL | `raster.ts` remap | HIGH | `gen-assets.mjs`, `raster.ts` | Préférer le WebP animé |
| Surprise | Pluie d'amour | WebP local | aucun | non testé | CODE READY — DEVICE TEST REQUIRED | — | MEDIUM | `SurpriseAnimOverlay.tsx` | Tester sur appareil |
| Surprise | Cartes à gratter | tuiles locales | aucun | non testé | CODE READY — DEVICE TEST REQUIRED | — | LOW | `ScratchFoil.tsx` | Tester sur appareil |
| GIF | Tenor | code présent | clé absente du binaire | non testé | EXTERNAL CONFIG REQUIRED | `EXPO_PUBLIC_GIF_API_KEY` | LOW | `gifs.ts` | Clé, et persister les récents |
| Emoji | Unicode | texte | aucun | non testé | CODE READY — DEVICE TEST REQUIRED | — | LOW | `conversation.tsx` | — |
| Messagerie | Créer une discussion | server function | `/_serverFn` sondé en 500, `/api/wipp` en 404 | non testé | BACKEND BLOCKED | site web pas à jour | CRITICAL | `messaging/client.ts`, `server-fn.ts` | Déployer l'app web du dépôt |
| Messagerie | Envoyer / recevoir du texte | Supabase direct, tables présentes | session impossible | non testé | BACKEND BLOCKED | pas de session (voir Auth) | CRITICAL | `supa.ts`, `store.ts` | Session, puis test appareil |
| Messagerie | Temps réel | code Realtime | publication non prouvée | non testé | EXTERNAL CONFIG REQUIRED | aucune migration n'ajoute les tables à `supabase_realtime` | HIGH | `supa.ts` | `alter publication` |
| Messagerie | File hors ligne / retry | mémoire seulement | — | non testé | PARTIAL | perdu au kill de l'app | HIGH | `outbox.ts` | Persister |
| Messagerie | Accusés, réponse, réaction, édition, suppression, épingle, copie, frappe | code + tables 0009 | session impossible | non testé | BACKEND BLOCKED | même porte d'auth | HIGH | `supa.ts` | Après la session |
| Messagerie | Lieu | bouton sans handler | — | non testé | NOT IMPLEMENTED | `Localisation` n'a pas de branche | MEDIUM | `ShareSurpriseSheet.tsx`, `conversation.tsx` | Brancher |
| Messagerie | Contact | libellé qui ne matche pas | — | non testé | NOT IMPLEMENTED | le choix émet un nom, pas l'action | MEDIUM | idem | Brancher |
| Médias | Photo, album, vidéo, document, vocal, vue unique | chiffrement par morceaux | server functions | non testé | BACKEND BLOCKED | le site ne sert pas ces fonctions de façon vérifiable | CRITICAL | `send-media.ts`, `media-upload.ts` | Déployer le web |
| Médias | Expiration | locale à l'envoi | colonne `disappear_after_ms` présente | non testé | PARTIAL | les messages reçus n'expirent pas | MEDIUM | `store.ts` | Calculer à la réception |
| Médias | Taille max | constante jamais lue | — | non testé | NOT IMPLEMENTED | `LIMITS` sans appelant | MEDIUM | `media-crypto.ts` | Vérifier avant envoi |
| Vocal | Maintenir / annuler / verrou | geste écrit | — | non testé | PARTIAL | le détecteur de geste est démonté quand l'enregistrement démarre | HIGH | `VoiceHoldButton.tsx` | Garder le geste monté, puis tester |
| Vocal | Forme d'onde | décor | — | non testé | MOCK/SIMULATED | barres calculées avec le temps, pas le micro | LOW | `VoiceHoldButton.tsx` | Mesure réelle |
| Vocal | Lecture, vitesse | `expo-av` | — | non testé | PARTIAL | au-delà de 20 s la barre saute à 100 % | MEDIUM | `conversation.tsx` | Unité unique en ms |
| Vocal | Route audio (oreille / haut-parleur) | absent | — | non testé | NOT IMPLEMENTED | — | LOW | — | `expo-audio` |
| Groupes | Créer, poster, admin, quitter, invitation | RPC `wipp_lot7_*` | fonctions absentes | non testé | BACKEND BLOCKED | 0014 non appliquée | CRITICAL | `lot7/api.ts` | Appliquer 0014–0017 |
| Groupes | Ouvrir un fil `g_` | sélectionne `mentions`, `system_event` | colonnes absentes | non testé | BACKEND BLOCKED | PostgREST rejette la requête | CRITICAL | `supa.ts` `listMessages` | Migrations, ou select tolérant |
| Groupes | Ajouter un membre (UI) | fonction sans écran | RPC absente | non testé | NOT IMPLEMENTED | aucun appelant | HIGH | `lot7/api.ts` | Écran + migration |
| Groupes | Dernier admin | rien | — | non testé | NOT IMPLEMENTED | — | MEDIUM | — | Règle dans le RPC |
| Groupes | Chiffrement de bout en bout | libellé « non chiffré », « GROUP E2EE — PENDING » | — | non testé | NOT IMPLEMENTED | assumé, et l'UI ne prétend pas le contraire | — | `conversation.tsx` | Ne pas le déclarer fait |
| Auth | OTP sur l'app native | SDK web Firebase | — | non testé | NOT IMPLEMENTED | hors web, `ensureVerifier` lance « vérification SMS pas prête » | CRITICAL | `firebase-phone.ts` | SDK natif, pas reCAPTCHA web |
| Auth | OTP dans le navigateur | reCAPTCHA invisible | Firebase configuré dans l'app | non testé | CODE READY — DEVICE TEST REQUIRED | — | HIGH | `firebase-phone.ts` | Tester un vrai SMS |
| Auth | Échange jeton → session | server function | hash sondé : HTTP 500 | non testé | BACKEND BLOCKED | déploiement web | CRITICAL | `auth-api.ts` | Déployer et lire le corps d'erreur |
| Auth | Session après redémarrage | `persistSession: false`, auth Firebase en mémoire | — | non testé | PARTIAL | rien ne réinjecte la session au lancement | CRITICAL | `supabase.ts`, `firebase-phone.ts` | Persister le refresh token |
| Auth | Nom d'utilisateur unique | server function | même canal | non testé | BACKEND BLOCKED | idem | HIGH | `auth-api.ts` | Déployer |
| Auth | Contournement démo | `__DEV__` + un seul numéro | absent des builds release | non testé | CODE READY — DEVICE TEST REQUIRED | le garde `__DEV__` est présent | LOW | `auth-flow.ts` | Vérifier qu'un build release le compile à false |
| Connect | Recherche, demande, accepter, refuser, bloquer | server functions + tables | site 404 / fonctions 500 | non testé | BACKEND BLOCKED | déploiement | HIGH | `connections.ts` | Déployer |
| QR | Mon QR | rendu local | — | non testé | CODE READY — DEVICE TEST REQUIRED | — | MEDIUM | `connect.tsx` | Tester le scan |
| QR | QR temporaire, résolution | serveur | routes absentes du site en ligne | non testé | BACKEND BLOCKED | déploiement | HIGH | `qr-remote.ts` | Déployer |
| Touch | Radio BLE / NFC | pont TS + plugin `withWippTouchNative.js` | — | non testé | PARTIAL | aucun `.kt` / `.swift` versionné dans le module ; le natif n'existe qu'après prebuild, non vérifié | HIGH | `modules/wipp-touch-native` | Lire le natif généré, tester deux appareils |
| Touch | Jeton, acceptation, expiration | routes `/api/wipp/touch/*` | 404 | non testé | BACKEND BLOCKED | site pas à jour. Des RPC `wipp_touch_*` plus anciennes existent, le client actuel ne s'en sert pas comme chemin principal | HIGH | `handler.ts` | Déployer |
| Nearby | Visibilité, résolution | routes + table `wipp_nearby_sessions` | 404 et table absente (0012) | non testé | BACKEND BLOCKED | migration + déploiement | HIGH | `0012`, `handler.ts` | Appliquer 0012 et déployer |
| WIPP Privé | Coffre, code, biométrie | SecureStore + `expo-local-authentication` | local, pas le bucket | non testé | CODE READY — DEVICE TEST REQUIRED | la biométrie dépend de l'appareil | HIGH | `private-vault.ts`, `me.tsx` | Tester avec et sans biométrie |
| WIPP Privé | Capture d'écran / multitâche | `expo-screen-capture` `preventScreenCaptureAsync` | — | non testé | CODE READY — DEVICE TEST REQUIRED | — | MEDIUM | `screen-protection.ts` | Tester Android |
| Appels | Audio / vidéo 1:1 | LiveKit côté serveur dans le dépôt | `/api/wipp/calls/*` en 404 | non testé | BACKEND BLOCKED | déploiement. Les variables `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` ne sont pas dans le dépôt : EXTERNAL CONFIG REQUIRED en plus | CRITICAL | `src/lib/livekit/*`, `handler.ts` | Déployer, puis clés LiveKit |
| Appels | Groupe | table `wipp_group_calls` | absente (0016) | non testé | BACKEND BLOCKED | migration | HIGH | `0016` | Appliquer 0016 |
| Appels | CallKeep Android | dépendance et branchement présents | inutile sans jeton | non testé | CODE READY — DEVICE TEST REQUIRED | `react-native-callkeep` est dans `package.json` et appelé depuis `CallOverlay` | MEDIUM | `calls/callkeep.ts` | Tester après les appels |
| Appels | E2EE | non revendiqué | — | — | NOT IMPLEMENTED | assumé | — | — | Ne pas le déclarer fait |
| Push | Jeton, DM, appel, Touch | `expo-notifications` | `POST /api/wipp/devices/push` en 404 | non testé | BACKEND BLOCKED | déploiement. FCM réel : EXTERNAL CONFIG REQUIRED (`google-services.json` est présent, le compte de service d'envoi ne l'est pas) | HIGH | `push/index.ts` | Déployer, puis FCM |
| Push | WIPP Privé générique | colonne `generic_notify` | absente (0013) | non testé | BACKEND BLOCKED | migration | HIGH | `0013` | Appliquer 0013 |
| Explorer | Annonces, événements, enregistrés | RPC `wipp_lot7_*` | absents, tables absentes | non testé | BACKEND BLOCKED | 0014 | HIGH | `lot7/api.ts`, `explore.tsx` | Appliquer 0014 |
| Explorer | Services | RPC `wipp_lot15_services` | absente | non testé | BACKEND BLOCKED | 0015. Aucune source externe branchée | HIGH | `lot7/api.ts` | Source vérifiée, pas un jeu de démo |
| Explorer | Pharmacies de repli | données écrites en dur | — | non testé | MOCK/SIMULATED | affichées quand le serveur ne répond pas | HIGH | `seed.ts`, `store.ts` | Ne pas les montrer hors développement |
| Compte | Discussions fictives à l'inscription | `seedFictionalInbox` (`fict-camille`, `fict-theo`) | — | non testé | MOCK/SIMULATED | `completeSetup(..., freshAccount)` copie ces fils dans un vrai compte | HIGH | `store.ts`, `seed.ts` | Réserver au développement |
| Profil | Enregistrer nom, pseudo, bio | `updateMe` local seulement | rien n'est écrit au serveur | non testé | PARTIAL | `me.tsx` ligne du bouton Enregistrer | HIGH | `me.tsx`, `store.ts` | Écrire le profil côté serveur |
| Profil | Avatar du compte | pas de sélecteur sur l'écran compte | — | non testé | NOT IMPLEMENTED | `ImagePicker` sert à la carte commerce, pas au profil | MEDIUM | `me.tsx` | Upload profil |
| Profil | Supprimer le compte | le bouton fait `pop()` | route `account/delete` existe dans le dépôt, 404 en ligne | non testé | MOCK/SIMULATED | `DeleteAccountScreen` n'appelle aucune API | CRITICAL | `me.tsx` | Appeler la suppression réelle |
| Profil | Écrans réglages (liste) | navigation présente | — | non testé | CODE READY — DEVICE TEST REQUIRED | Confidentialité, Sécurité, Notifications, Apparence, Langue, Aide, Bloqués, Légal existent comme écrans | LOW | `me.tsx` | Passer chaque ligne sur appareil |
| Appareils liés | Liste, révocation | écran `DevicesScreen` | `GET /api/wipp/devices` en 404 ; table `wipp_devices` présente | non testé | BACKEND BLOCKED | déploiement | MEDIUM | `handler.ts` | Déployer |
| Liens | App Links Android | `autoVerify` et empreinte dans le dépôt | `assetlinks.json` en 404 | non testé | EXTERNAL CONFIG REQUIRED | l'empreinte du dépôt est celle du keystore debug React Native | HIGH | `app.json`, `public/.well-known` | Empreinte du vrai certificat + fichier en ligne |
| Liens | Universal Links iOS | `associatedDomains` | AASA du dépôt vide (`apps` et `details` vides), URL en 404 | non testé | NOT IMPLEMENTED | pas de Team ID | HIGH | `public/.well-known` | AASA réel, test iPhone |
| Permissions | Déclarées | CAMERA, MICRO, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE, BT, NFC, POST_NOTIFICATIONS, services d'appel | — | non testé | CODE READY — DEVICE TEST REQUIRED | inventaire `app.json` | MEDIUM | `app.json` | Tester refus et refus définitif |
| Permissions | Refus définitif | aucune ouverture des réglages | — | non testé | PARTIAL | aucun `openSettings` dans `native/src` | MEDIUM | `conversation.tsx`, `push/index.ts` | Bouton vers les réglages |

## 1. STORIES

Voir CRITICAL FAILURES. Détail du pipeline attendu par le code, et de ce qui manque :

| Étape | Photo | Vidéo |
|---|---|---|
| Sélecteur | `launchImageLibraryAsync`, images et vidéos | idem |
| Permission Android 13+ | `READ_MEDIA_IMAGES` et `READ_MEDIA_VIDEO` sont dans `app.json` | idem |
| URI | `fetch(uri)` — fragile pour `content://` | idem |
| MIME | celui du sélecteur, sinon `image/jpeg` | sinon `video/mp4` |
| Taille, durée, compression | non vérifiées | `quality: 0.7` seulement |
| Upload | bucket privé, chemin `stories/<auteur>/<id>` | idem |
| Policy d'écriture (dans 0016, non appliquée) | `wipp_lot16_can_write_private` : le 2e segment doit être l'id du profil | idem |
| Base | `wipp_lot7_publish_story` | idem |
| Lecture | `expo-image` si `imageUrl` http | pas de lecteur |
| URL signée | 10 minutes, bucket privé | idem |
| Expiration | côté RPC,  non déployé | idem |
| Autre compte | impossible : table absente | idem |
| Caméra | absente | absente |

Classement de la cause : **A. migration non appliquée**, et **B. bucket inexistant**. Les causes D (URI Android), E (permission), H (lecteur vidéo) sont réelles dans le code mais n'ont pas pu être la cause observée tant que A et B échouent en premier. Pas de logcat : pas d'appareil.

## 2. ANIMATIONS / WIPPMOJI / WIPPIES / WIPPPOP / WIPP MOMENTS

Voir CRITICAL FAILURES. Inventaire :

| Système | Format vérifié | Rendu natif | Web | Téléphone attendu |
|---|---|---|---|---|
| Emoji | texte | `Text` | oui | oui |
| Wippmoji 52, EMO 10 | WebP animé local | `expo-image`, `autoplay` false | animé | figé |
| Wippie 69 | affiche WebP + MP4 vert non embarqué | image seule | vidéo détourée | affiche |
| SIG 30, SCENE 30 | PNG | image | CSS + son | statique |
| Moments 42 | WebP distant ~3 Mo | `expo-image` + timer | animé si le réseau suit | souvent l'affiche, puis fermeture |
| Surprise Pluie | WebP animé local, 126 images, ~4 Mo | `expo-image` autoplay | animé | à tester |
| Surprise Fusion / Bisous | WebP sur disque, PNG servi | image statique | animé | statique |
| Cartes à gratter | JPEG | tuiles | oui | à tester |
| GIF Tenor | GIF distant | `expo-image` | si clé | si clé |
| Vidéo d'intro | MP4 | `expo-video` | oui | à tester |

Mémoire : Moments ≈ 42 × 3 Mo si tout est décodé ; `amour-fusion.webp` 5,2 Mo / 97 images ; `emo-01.webp` 3,9 Mo. Les 72 MP4 (≈ 15 Mo) ne sont pas `require()`, ils ne partent pas dans l'APK, ils pèsent seulement le dépôt.

## 3. MESSAGERIE

Le texte, les accusés, les réactions, l'édition, la suppression et l'épingle sont écrits contre des tables Supabase qui existent (0001, 0009, 0010). Ils sont injoignables tant qu'aucune session ne peut être ouverte. Le temps réel dépend d'une publication Supabase qu'aucune migration ne crée. La file « durable » est un tableau en mémoire.

## 4. MÉDIAS

Les pièces jointes de discussion directe sont chiffrées en morceaux d'1 Mio et envoyées par server functions vers `wipp_attachments` (table présente). Le site en ligne ne permet pas de confirmer que ces fonctions répondent : le seul hash sondé (`usernameAvailable`) renvoie HTTP 500, un hash inventé renvoie 403. Donc le routeur server function est là, la fonction sondée ne réussit pas. Les boutons Lieu et Contact ne font rien. Les plafonds de taille ne sont pas appliqués.

## 5. VOCAL

Permission, maintien, glisser pour annuler, glisser pour verrouiller : écrits. Le détecteur de geste est retiré de l'arbre au moment où l'enregistrement passe à l'état actif (`VoiceHoldButton.tsx`) : à confirmer sur appareil, probable coupure immédiate. L'onde est décorative. La lecture utilise `expo-av` (déprécié en SDK 54, retiré en 55). Pas de choix oreille / haut-parleur.

## 6. GROUPES

Toutes les mutations passent par `wipp_lot7_*`, absentes. Une ancienne RPC `wipp_create_group` existe sur le serveur et n'a aucun appelant dans l'app native. Ouvrir un fil de groupe sélectionne deux colonnes absentes : la requête échoue même pour un groupe déjà en base. L'UI dit explicitement que le groupe n'est pas chiffré de bout en bout. Ne pas écrire le contraire.

## 7. AUTH

Firebase est le SDK **web** (`firebase/auth`), persistance mémoire, reCAPTCHA seulement si `Platform.OS === "web"`. Sur Android et iOS natifs, l'envoi du SMS lance une erreur avant tout réseau. L'échange du jeton Firebase contre une session Supabase est une server function ; l'endpoint répond, le cas sondé renvoie 500. `persistSession: false` : un redémarrage perd la session même si l'échange marchait. Le mot de passe de test `160184` est limité à `__DEV__` et au numéro `+18195803940`. Ce n'est pas un contournement de production dans le source ; un binaire release reste à vérifier.

## 8. CONNECT

Recherche, demande, acceptation, refus et blocage dépendent des server functions et de `wippapp.com`. Non vérifiable de bout en bout. Les tables de messagerie de base existent ; ça ne suffit pas.

## 9. QR

L'écran Mon QR est local. Le QR temporaire et la résolution passent par le site, aujourd'hui en 404 sur les routes API. Le scan caméra (`expo-camera`) est du code prêt, pas un scan réussi.

## 10. TOUCH

Le module versionné est du TypeScript qui charge `WippTouchNative` et retourne null s'il est absent. Un plugin Expo (`native/plugins/withWippTouchNative.js`) est branché dans `app.json` : le natif est peut-être généré au prebuild. Aucun source Kotlin ou Swift n'est dans `native/modules/wipp-touch-native`. Le serveur Touch du dépôt (`/api/wipp/touch/...`) répond 404 en ligne. Deux téléphones n'ont pas été testés. Statut radio : PARTIAL. Statut protocole : BACKEND BLOCKED.

## 11. NEARBY

Table `wipp_nearby_sessions` absente (0012 non appliquée). `GET /api/wipp/nearby/visibility` renvoie 404. Ne pas marquer Nearby comme disponible.

## 12. WIPP PRIVÉ

Coffre local : SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, code, biométrie via `expo-local-authentication`. Ce coffre ne dépend pas du bucket `wipp-private-media` (ce bucket est celui des stories et des groupes). Capture d'écran : `preventScreenCaptureAsync`. Rien de tout ça n'a été fait sur un appareil. Changement de compte : non rejoué ; le coffre est local à l'appareil, un contrôle d'isolation reste à faire sur appareil.

## 13. APPELS

Le dépôt contient la fabrication de jeton LiveKit (`src/lib/livekit/token.ts`) et les routes dans `handler.ts`. En ligne, `/api/wipp/calls/config` renvoie 404. Les variables `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` ne sont pas dans le dépôt. Un écran d'appel n'est pas un appel. CallKeep est une dépendance branchée, non testée. Les appels de groupe exigent `wipp_group_calls` (0016, absente). E2EE des appels : non implémenté, non revendiqué.

## 14. PUSH

`getExpoPushTokenAsync` puis `POST /api/wipp/devices/push`, qui renvoie 404. La colonne `installation_id` (0013) est absente, donc un enregistrement multi-install échouerait même après déploiement si la migration reste en attente. `google-services.json` est dans `native/`. Le compte de service qui envoie les notifications n'est pas dans le dépôt. Notification tap, deep link, notification expirée : non testés.

## 15. EXPLORER

Annonces, événements, enregistrés : RPC et tables absentes. Services : RPC `wipp_lot15_services` absente. Aucune source de données vérifiée n'est branchée. Les écrans (`explore.tsx`) existent.

## 16. BUSINESS

Carte commerce : écran et sélecteur d'image présents (`uploadBusinessImage`). Le succès dépend des server functions, non confirmées en ligne. « Écrire sur WIPP » et la boîte commerce : non rejoués, même canal serveur.

## 17. PROFIL / RÉGLAGES

Confirmé par lecture :

- Enregistrer le profil écrit uniquement dans le store local (`updateMe`), pas sur le serveur.
- Supprimer le compte ferme l'écran (`pop`) et n'appelle rien.
- Le sélecteur d'image de `me.tsx` sert à la carte commerce.

Les autres lignes (confidentialité, sécurité, notifications, apparence, langue, aide, bloqués, légal) sont des écrans qui existent. Chaque bouton n'a pas été pressé : CODE READY — DEVICE TEST REQUIRED pour la navigation, pas un succès fonctionnel.

## 18. APPAREILS LIÉS

Écran présent. `GET /api/wipp/devices` en ligne : 404. La table `wipp_devices` existe (0002). Liaison web par QR : route du dépôt, 404 en ligne.

## 19. DEEP LINKS

`app.json` déclare `autoVerify` pour `https://wippapp.com` sur `/@`, `/t/`, `/g/`, `/b/`, et le scheme `wipp`. Le fichier Android en ligne est en 404. Celui du dépôt porte l'empreinte du keystore **debug**. L'AASA du dépôt a `details: []`. iOS : pas de Team ID, pas de test iPhone. EXTERNAL CONFIG REQUIRED (Android) et NOT IMPLEMENTED (iOS).

## 20. PERMISSIONS

Déclarées dans `native/app.json` : caméra, micro, photos, vidéos, stockage legacy, Bluetooth (y compris scan, advertise, connect), NFC, notifications, boot, audio, wake lock, services de premier plan (micro, caméra, appel), full screen intent, vibreur, gestion des appels.

Demandes au runtime trouvées : caméra (`conversation.tsx`, `CallOverlay.tsx`), micro (`VoiceHoldButton.tsx`, `CallOverlay.tsx`), notifications (`push/index.ts`), photos (`me.tsx` pour la carte). Aucun chemin vers les réglages système en cas de refus définitif.

Localisation : pas dans la liste `android.permissions` de l'extrait lu. Nearby et Touch ne doivent pas être décrits comme utilisant le GPS tant que ce n'est pas relu dans le manifeste généré.

## 21. BACKEND / MIGRATIONS

| Élément | Dans le dépôt | Sur `sdaulxbcksusojcbsucr` ou `wippapp.com` | Configuré | Testé appareil |
|---|---|---|---|---|
| 0001–0011 (messages, accusés, réactions, pièces, appels, Touch SQL, push tokens) | oui | tables et colonnes de base présentes | partiel | non |
| 0012 Nearby | oui | table absente | non | non |
| 0013 installation push, `generic_notify` | oui | colonnes absentes | non | non |
| 0014 groupes/stories/annonces/événements + RPC lot7 | oui | RPC absentes, `wipp_stories` absente. `wipp_groups` / `wipp_group_invites` existent par un autre chemin, plus ancien | non | non |
| 0015 proches, services, republication story | oui | RPC absentes | non | non |
| 0016 buckets, policies, appels de groupe | oui | buckets absents (`NoSuchBucket`), `wipp_group_calls` absente | non | non |
| 0017 droits de fonctions profil | oui | non distinguable : les fonctions lot7 n'existent pas | non | non |
| `/api/wipp/*` | oui, `src/lib/messaging/handler.ts` | 404 sur health, calls, touch, nearby, me, devices | non | non |
| `/_serverFn/<hash>` | les hash sont dans le client ; les fichiers `*.functions.ts` ne sont pas dans le dépôt | un hash réel répond 500, un hash faux répond 403 | non | non |
| `.vercel/output` commité | daté du commit `8b3a31e` (2026-09-22) | ne contient ni `createServerFn` ni `api/wipp` | obsolète | — |
| LiveKit | code serveur | variables absentes du dépôt, route 404 | non | non |
| Firebase Phone | config web dans l'app | OTP natif non écrit | web seulement | non |
| FCM | `google-services.json` présent | envoi serveur non vérifié | non | non |
| assetlinks | debug fingerprint | 404 | non | non |
| AASA | vide | 404 | non | non |
| Publication Realtime | absente des SQL | non vérifiée dans le dashboard | inconnu | non |

Le projet Supabase visible par l'outil connecté ici est `kidi+` (`djwuvxpmvrwfjwjamjno`), pas WIPP. Les mesures WIPP ont été faites avec la clé anon déjà présente dans `native/src/lib/firebase-config.ts`. Aucune écriture.

## 22. PERFORMANCE

Pas de logcat, pas d'ANR mesuré, pas de session Android. Risques lus dans les assets : WebP animés de plusieurs mégaoctets décodés dans une liste de messages ; 42 Moments de 3 Mo ; `expo-av` encore utilisé pour l'audio alors que le SDK 54 le déprécie. Aucun crash constaté par cet audit.

## 23. MOCKS / PLACEHOLDERS

| Lieu | Classe | Pourquoi |
|---|---|---|
| `seedFictionalInbox` injecté dans `completeSetup` quand `freshAccount` | PRODUCTION BUG | deux fils inventés entrent dans un compte réel |
| Pharmacies de `seed.ts` montrées si le serveur échoue | PRODUCTION BUG | horaires et lieux non vérifiés |
| Onde vocale calculée avec l'horloge | MOCK/SIMULATED | pas le niveau du micro |
| `DeleteAccountScreen` → `pop()` | PRODUCTION BUG | aucune suppression |
| `updateMe` sans appel serveur | PRODUCTION BUG | le profil « enregistré » ne quitte pas le téléphone, et le store n'est pas persisté |
| `TEST_SIGNIN_PASSWORD` sous `__DEV__` | DEV LEGITIME | un seul numéro, compilé dehors des builds release si `__DEV__` est faux |
| `GROUP E2EE — PENDING`, `callLivekitLocal` | FUTURE | le texte dit que ce n'est pas fait |
| Boutons Lieu et Contact sans action | PRODUCTION BUG | l'écran propose une action morte |
| GIF : récents non persistés (`gifs.ts`) | DEAD CODE / incomplet | la clé de stockage n'est pas utilisée |

Recherche de motifs (TODO, FIXME, MOCK, DEMO, bientôt, wipp_test) : les occurrences ci-dessus sont celles qui changent le comportement d'un compte réel. Le reste des commentaires de lot n'a pas été reclassé ligne à ligne après la saturation du disque en fin de session.

## 24. EXTERNAL BLOCKERS

- Déploiement de l'application web de **ce** dépôt sur `wippapp.com` (les routes du 22 septembre commitées ne sont pas celles du code actuel).
- Application des migrations 0012 à 0017 sur `sdaulxbcksusojcbsucr`, plus la publication Realtime.
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- Compte de service d'envoi FCM / projet EAS pour `getExpoPushTokenAsync`.
- `EXPO_PUBLIC_GIF_API_KEY` si les GIF Tenor sont voulus.
- `assetlinks.json` avec l'empreinte du certificat de publication, et un AASA avec le Team ID Apple.
- Un deuxième appareil pour Touch, Nearby, appels, accusés de lecture et stories vues par quelqu'un d'autre.

## TOP PRIORITY FIXES

Dans l'ordre des dépendances, pas de la facilité.

1. Déployer le serveur web du dépôt (`/api/wipp/*` et les server functions). Sans ça, pas de session, pas de discussion, pas de média, pas d'appel, pas de push, pas de Touch.
2. Persister la session Supabase. Sans ça, le redémarrage déconnecte même un serveur sain.
3. Appliquer 0014, 0015, 0016, 0017. Sans ça, pas de story, pas de groupe, pas de bucket, pas d'annonce. Ne pas réécrire l'écran Story avant ça.
4. Appliquer 0012 (Nearby) et 0013 (push multi-install et copie générique Privé).
5. Ajouter les tables de messages à la publication Realtime.
6. Ensuite seulement, les trous client qui resteraient visibles : lecteur vidéo de story, `fetch` sur `content://`, `autoplay` des WebP, remap PNG/WebP, MP4 Wippie, geste du vocal, suppression de compte, profil écrit au serveur, retirer les fils fictifs et les pharmacies de démo des comptes réels.
7. Puis clés LiveKit, FCM, assetlinks, AASA.
8. Puis validation sur un Android branché (ADB n'est pas installé sur ce Mac).

## WHAT ACTUALLY WORKS ON DEVICE

Rien de mesuré. Zéro DEVICE PASS.

## WHAT ACTUALLY FAILS ON DEVICE

Rien de mesuré par cet audit. Zéro DEVICE FAIL. Vos constats (story, vidéo, animations) sont expliqués par le backend et par le code ci-dessus ; ils ne sont pas reclassés en DEVICE FAIL parce que l'audit n'a pas tenu le téléphone.

## WHAT HAS NEVER BEEN DEVICE TESTED

Tout le tableau. En particulier le coffre WIPP Privé, la biométrie, CallKeep, les permissions refusées, le scan QR, la lecture des WebP qui sont correctement branchés (Pluie d'amour, cartes à gratter, emoji).

## WHAT IS CODED BUT BLOCKED BY BACKEND

Stories, groupes, annonces, événements, services, Nearby, push, appels (route 404), création de discussion, médias chiffrés, Connect, QR temporaire, Touch côté serveur, enregistrement d'appareils.

## WHAT REQUIRES EXTERNAL CONFIGURATION

LiveKit, envoi FCM, clé GIF, assetlinks de production, AASA Apple, publication Realtime dans le dashboard si elle n'est pas faite en SQL.

## WHAT IS STILL MOCK / SIMULATED

Fils `fict-camille` et `fict-theo` à la création de compte, pharmacies de repli, onde vocale, bouton supprimer le compte.

## WHAT IS ACTUALLY NOT IMPLEMENTED

OTP SMS dans l'app native (le web seulement a reCAPTCHA), lecture vidéo d'une story, caméra pour une story, lieu, contact, ajout de membre (écran), protection du dernier admin, route audio du vocal, plafonds de taille, avatar du profil, Universal Links iOS, chiffrement de bout en bout des groupes et des appels.

## IS WIPP READY FOR GLOBAL DEVICE VALIDATION — NO

Il n'y a pas de session réelle tant que le site déployé et la persistance ne sont pas alignés sur le dépôt. Une campagne sur des téléphones mesurerait surtout des 404.

## IS WIPP READY FOR CLOSED PLAY TESTING — NO

Même raison, plus : migrations 0012–0017 non appliquées, buckets absents, OTP natif non écrit, suppression de compte factice, fils fictifs injectés dans un compte neuf, empreinte debug pour les App Links. Un test fermé peut commencer après les points 1 à 5 des priorités, pas avant.

## VÉRIFICATIONS DE FIN

Faites après l'audit, sans AAB, sans keystore, sans push, sans déploiement.

- `native` `tsc --noEmit` : succès.
- Racine `tsc --noEmit` : échec, 5 erreurs déjà dans le dépôt (`src/lib/private-vault.ts` BufferSource, `src/routes/site.tsx` et `support.tsx` paramètre `search`, `src/screens/chats.tsx` et `private-chats.tsx` destructeur de `useEffect`).
- `npm test` à la racine : 195 tests, 185 réussites, 10 échecs. Les échecs lus sont des gardes du gabarit (balises Open Graph, auth du gabarit, variables `VITE_SUPABASE_*`), pas des scénarios WIPP.
- `native` : proximité 8/8, lot5 7/7, lot6 9/9, règles lot7 + appels 9/9.

Limite matérielle : le disque de ce Mac est passé à moins de 200 Mo pendant l'audit (les symboles d'appareils iOS se sont re-téléchargés). Les fichiers de compilation Xcode ont été effacés (environ 5 Go) pour pouvoir finir les tests. Ça ne change pas le dépôt.
