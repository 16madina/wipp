# WIPP — Diagnostic backend avant déploiement

COMMIT AUDITED — `bd2ebbb` (2026-10-01 13:37 -0400, `feat(native): polish auth UI stickers and surprises`)
BRANCH — `main`
SUPABASE PROJECT — `https://sdaulxbcksusojcbsucr.supabase.co`
WIPPAPP HOST — `https://wippapp.com`
DATE — 2026-10-01
DISK FREE — 24 Gi sur le volume Data au moment du diagnostic

Lecture seule. Aucune migration appliquée, aucun déploiement, aucun POST d’écriture, aucune ligne utilisateur lue. Les sondes Supabase utilisent la clé anon déjà embarquée dans le client, avec `limit=0`. Un 401 `42501` signifie « la relation existe, ce rôle n’a pas le GRANT ». Un 404 `PGRST205` signifie « la relation est absente du cache PostgREST ». Un 400 `42703` signifie « la table existe, la colonne n’existe pas ».

## Résumé

| Signal | Statut |
| --- | --- |
| 0012 Nearby | HOSTED NO — LOCAL ONLY |
| 0013 push / generic_notify | HOSTED NO — LOCAL ONLY |
| 0014 groupes, stories, Explorer | HOSTED NO (schéma plus ancien déjà présent) |
| 0015 close, services, buckets | HOSTED NO |
| 0016 appels de groupe, policies storage | HOSTED NO |
| 0017 GRANT profil | NON PROUVÉ — la fonction existe, `wipp_lot7_me` non |
| STORY DATABASE | NO |
| STORY RPC | NO |
| STORY STORAGE | NO |
| STORY RLS | NO (objets absents) |
| STORY PHOTO | NO |
| STORY VIDEO | NO |
| API `/api/wipp` | 404 sur l’hôte public |
| SESSION | BACKEND BLOCKED |
| READY TO START BACKEND DEPLOYMENT | **NO** |

Présence d’un fichier SQL dans `migrations/` ne veut pas dire qu’il a tourné sur le projet hébergé. Il n’y a pas de `DATABASE_URL` en local, donc `_migrations` n’a pas été consulté. Le verdict HOSTED vient uniquement des réponses PostgREST et Storage.

## Tableau des composants

| Composant | Local (repo) | Hébergé | Action |
| --- | --- | --- | --- |
| 0012 `wipp_nearby_sessions` | Fichier prêt, 15 lignes, pas de RLS | Table absente | Ne pas appliquer tant que le RLS manquant n’est pas décidé |
| 0013 colonnes push | `ADD COLUMN IF NOT EXISTS` | Colonnes absentes, tables mères présentes | Applicable seule, après sauvegarde |
| 0014 stories / groupes / lot7 | 757 lignes, RPC + RLS | Tables lot7 absentes ; `wipp_groups` / bans / invites déjà là | Bloqué par le conflit de forme |
| 0015 close + buckets | Remplace `publish_story`, crée 2 buckets privés | Tables, colonnes, buckets, RPC absents | Après 0014 seulement |
| 0016 appels de groupe + policies | Réécrit les policies storage | Tables et RPC absentes, buckets absents | Après 0015 |
| 0017 permissions | `GRANT` conditionnel, 14 lignes | `wipp_my_profile_id` répond 401 ; `wipp_lot7_me` 404 | Inutile avant 0014 ; ré-exécution sûre |
| Buckets stories | `wipp-public-media`, `wipp-private-media` | Bucket not found | Créés par 0015/0016, pas avant |
| Bucket cartes | Aucune migration | `wipp-business-cards` Bucket not found | Migration à écrire plus tard, pas maintenant |
| `/api/wipp/*` | `src/lib/messaging/handler.ts` | GET/POST/OPTIONS 404 HTML | Déployer le web actuel, plus tard |
| Session Supabase | serverFn + `setSession`, non persistée | Hash connu en 500 ; route firebase 404 | Externe + code absent du repo |
| Nearby | REST + table 0012 | Table absente, routes 404 | Web + 0012 + radio native |
| Appels | Handler token/invite/answer | Routes 404, tables de groupe absentes | Web + LiveKit + 0016 pour le groupe |
| Push | Expo → `/devices/push` | Route 404, colonnes 0013 absentes | Web + 0013 + identifiants EAS/FCM |
| Appareils liés | Écran « PENDING », pas d’appel client | `wipp_devices` existe ; GET `/devices` 404 | Pas prêt |

## Migrations 0012 à 0017

### 0012 — `migrations/0012_wipp_nearby.sql`

LOCAL. Crée `wipp_nearby_sessions` (`IF NOT EXISTS`) et deux index. Dépend de `wipp_profiles`, qui existe sur l’hôte. Ne dépend pas de 0013–0017. Aucun `ENABLE ROW LEVEL SECURITY`, aucune policy, aucun `GRANT` explicite.

HOSTED. `GET /rest/v1/wipp_nearby_sessions` → 404 `PGRST205`. Non appliquée.

Ré-exécution. Le SQL est idempotent (`IF NOT EXISTS`). Il ne fait pas de `TRUNCATE` ni de `DELETE`. Le trou est le RLS : l’appliquer telle quelle crée une table de jetons de proximité sans policy dans ce fichier. Ce n’est pas une raison de l’appliquer aujourd’hui.

### 0013 — `migrations/0013_wipp_push_devices.sql`

LOCAL. Ajoute `wipp_push_tokens.installation_id`, `wipp_push_tokens.disabled_at`, et `wipp_chat_members.generic_notify`. Indépendante de 0012. Dépend des tables `wipp_push_tokens` et `wipp_chat_members`.

HOSTED. Les deux tables existent (401). Les trois colonnes répondent 400 `42703`. Non appliquée.

Ré-exécution. `ADD COLUMN IF NOT EXISTS` et index partiels. Pas de suppression de lignes. C’est le seul fichier de la série qui peut partir seul, une fois une sauvegarde faite. Le client natif écrit `generic_notify` au mieux : si la colonne manque, l’écriture est ignorée. Ce n’est pas un contournement déployé.

### 0014 — `migrations/0014_wipp_groups_stories_explore.sql`

LOCAL. Crée, seulement si elle manque, `wipp_my_profile_id()` qui retourne `NULL`. Puis `wipp_groups`, `wipp_group_admins`, `wipp_group_bans`, `wipp_group_invites`, colonnes `wipp_messages.mentions` et `system_event`, `wipp_stories` (audience `contacts` ou `only_me` seulement), vues, annonces, événements, saves, les RPC `wipp_lot7_*`, les policies SELECT, et des `DELETE` **à l’intérieur** des RPC (retrait de membre, leave). Ces `DELETE` ne s’exécutent pas au moment du fichier. Pas de `TRUNCATE`.

HOSTED — non appliquée dans son ensemble.

- Présents, sans être la preuve de 0014 : `wipp_groups`, `wipp_group_bans`, `wipp_group_invites` (401). Une session précédente avait vu `chat_id`, `name`, `owner_id`, `invites_enabled` sur `wipp_groups`.
- Absents, alors que 0014 les crée : `wipp_group_admins`, `wipp_stories`, `wipp_story_views`, `wipp_listings`, `wipp_events`, `wipp_saves` (404).
- Colonnes 0014 absentes : `wipp_messages.mentions`, `wipp_messages.system_event` (400 `42703`).
- RPC `wipp_lot7_publish_story`, `wipp_lot7_stories`, `wipp_lot7_me` : 404 `PGRST202`.
- `wipp_create_group` : 404. L’app ne l’appelle pas ; les indices PostgREST sur les noms `wipp_lot7_*` pointent vers des fonctions touch, pas vers un lot7 déployé.
- `wipp_my_profile_id` : **401**, donc la fonction est dans le cache, et l’anon ne peut pas l’exécuter. Le seul `CREATE` du repo est le stub `NULL` de 0014. Comme le reste de 0014 est absent, ce stub n’a pas été posé par une 0014 transactionnelle réussie. Le corps hébergé n’a pas été lu.

Conflit. `CREATE TABLE IF NOT EXISTS wipp_groups` ne modifie pas une table déjà là. Ré-appliquer 0014 ajouterait admins, stories et RPC, et **laisserait** la forme actuelle de `wipp_groups` si elle diffère. C’est le point qui interdit de lancer 0014 à l’aveugle.

`wipp_lot7_publish_story` dans ce fichier refuse l’audience `close`.

### 0015 — `migrations/0015_wipp_close_services_media_push.sql`

LOCAL. Commentaire : « Does not delete rows ». Au niveau fichier : `ALTER` `avatar_url` et `ended_at`, assouplit le check d’audience vers `contacts | only_me | close` **seulement si `wipp_stories` existe déjà**, crée `wipp_close_friends`, `wipp_local_services`, `wipp_push_dedupe`, remplace `wipp_lot7_publish_story` / `stories` / `view_story`, ajoute les RPC `wipp_lot15_*`. Un `DELETE FROM wipp_close_friends` vit dans `wipp_lot15_set_close`, pas dans le passage de migration. Puis insère les buckets `wipp-public-media` et `wipp-private-media` avec `public = false`, et pose les policies storage. Dépend de 0014 pour que le remplacement de `publish_story` ait une table. L’`ALTER` de `wipp_groups` suppose que cette table existe (elle existe).

HOSTED. `wipp_close_friends`, `wipp_local_services`, `wipp_push_dedupe` : 404. `wipp_groups.avatar_url` et `wipp_call_invites.ended_at` : 400 `42703`. `wipp_lot15_services` : 404. Les deux buckets : `Bucket not found`. Non appliquée.

Ré-exécution. Policies storage : `DROP POLICY IF EXISTS` puis recréation. Buckets : `ON CONFLICT DO UPDATE SET public = false`. Pas de vidage de lignes. Lancer 0015 avant 0014 crée des fonctions qui insèrent dans `wipp_stories` alors que la table n’existe pas : elles compilent en plpgsql, elles cassent à l’appel.

### 0016 — `migrations/0016_wipp_private_storage_calls.sql`

LOCAL. L’en-tête exige 0014 et 0015. Recrée `wipp_lot16_can_read_private` / `can_write_private`, crée `wipp_group_calls` et `wipp_group_call_members` avec RLS, **sans** policy INSERT/UPDATE/DELETE (écriture réservée au rôle serveur). Réécrit les mêmes buckets et les mêmes policies que 0015. Pas de `TRUNCATE`. Pas de `DELETE` de migration.

HOSTED. `wipp_group_calls`, `wipp_group_call_members` : 404. `wipp_lot16_can_read_private` : 404. Buckets absents. Non appliquée.

### 0017 — `migrations/0017_wipp_profile_function_permissions.sql`

LOCAL. Si `wipp_my_profile_id()` existe, la passe en `SECURITY DEFINER` et `GRANT EXECUTE` à `authenticated`. Même traitement pour `wipp_lot7_me()`. Sinon, no-op. Ne crée aucune des deux fonctions. Ne dépend pas de 0012/0013. Inutile tant que 0014 n’a pas créé `wipp_lot7_me`.

HOSTED. `wipp_my_profile_id` existe (401 anon, ce qui est compatible avec un GRANT limité à `authenticated`, et aussi avec un revoke manuel). `wipp_lot7_me` n’existe pas, donc la seconde branche n’a aucun effet possible. On ne peut pas dire que 0017 a tourné. La ré-exécution est sûre. Elle ne débloque pas les stories tant que le corps de `wipp_my_profile_id` reste un stub `NULL` ou une fonction dont on n’a pas lu le source.

## Écarts de schéma

Déjà sur l’hôte, en dehors de 0012–0017 : profils, profils publics, chats, membres, messages, pièces jointes, groupes (forme antérieure), bans, invites, jetons push, appareils, invites et candidats touch, invites d’appel, blocages, accusés, réactions.

`wipp_connections` et `wipp_connection_requests` répondent **200** avec `limit=0`, alors que les tables ci-dessus répondent 401. Le rôle anon a donc un GRANT que les autres tables n’ont pas. Aucune ligne n’a été lue. À contrôler (RLS oui/non) avant d’ouvrir davantage le projet. Ce n’est pas un effet de 0012–0017.

Absents alors que le repo les crée : nearby, admins de groupe, stories, vues, annonces, événements, saves, amis proches, services, dédoublonnage push, appels de groupe et leurs membres.

Indices PostgREST (fonctions proches, pas des lot7) : `wipp_touch_report`, `wipp_touch_request`, `wipp_touch_cancel`, `wipp_touch_create`. L’appel sans arguments à `wipp_touch_create` est lui-même en 404 : la signature n’a pas été vérifiée. L’app native n’appelle pas ces RPC ; elle appelle `/api/wipp/touch/*`, qui est en 404 sur wippapp.com.

## Écarts storage

| Bucket | Migration | Hébergé | Usage code |
| --- | --- | --- | --- |
| `wipp-public-media` | 0015 et 0016, `public=false` | Absent | Pas le chemin story principal |
| `wipp-private-media` | 0015 et 0016, `public=false` | Absent | Stories `stories/<authorId>/<id>`, URL signée 10 min |
| `wipp-business-cards` | Aucune | Absent | `native/src/lib/business-card.ts`, URL signée 3600 s |

Les policies `wipp_private_*` et `wipp_public_*` ne peuvent pas être actives : les buckets n’existent pas. 0016 les réécrit ; les appliquer deux fois est prévu (`DROP POLICY IF EXISTS`).

## Écarts API — pourquoi `/api/wipp` est en 404

Sondé le 2026-10-01, sans cookie et sans corps métier :

| Requête | Code |
| --- | --- |
| `GET https://wippapp.com/` | 200 |
| `GET/POST/OPTIONS /api/wipp/health` | 404 |
| `GET /api/wipp/calls/config` | 404 |
| `GET /api/wipp/touch/config` | 404 |
| `GET /api/wipp/nearby/visibility` | 404 |
| `GET /api/wipp/me` | 404 |
| `GET /api/wipp/devices` | 404 |
| `GET /.well-known/assetlinks.json` | 404 |

Le 404 est du HTML (hôte Cloudflare / déploiement statique ou build ancien), pas un 401 du handler. Dans ce repo, `src/lib/messaging/handler.ts` implémente health, appels, touch, nearby, auth firebase, me, devices, messages. L’arbre `.vercel/output` commité (commit `8b3a31e`, 2026-09-22) ne contient pas ce handler. L’hôte public n’est donc pas le build actuel de `main`.

Un routeur serverFn répond encore sur le même hôte : un hash connu (`usernameAvailable`) avait renvoyé 500 JSON, un hash inventé 403. Ça prouve qu’un ancien serveur de fonctions est en ligne. Ça ne prouve pas que `/api/wipp` y est branché. Les fichiers `src/lib/*.functions.ts` cités par les hash du client natif ne sont pas dans ce dépôt.

Déployer le web actuel est une étape séparée des migrations SQL. Elle n’a pas été faite.

## Ce qui reste bloqué

### Stories

STORY DATABASE — NO (`wipp_stories` 404).
STORY RPC — NO (`wipp_lot7_publish_story` 404).
STORY STORAGE — NO (bucket privé absent).
STORY RLS — NO (table et policies absentes ; le fichier 0014 les prévoit pour `authenticated` seulement).
STORY PHOTO — NO. L’écran sait choisir une image et appeler l’upload, le backend qui reçoit n’est pas là.
STORY VIDEO — NO. Même backend, et le viewer natif n’a pas de lecteur vidéo.

L’audience `close` n’existe qu’après 0015. 0014 la rejette.

### Session

Le chemin prévu est : OTP Firebase (SDK web + WebView) → jeton → serverFn `signupPhone` / `signinOtp` → `supabase.auth.setSession`. Ces serverFn ne sont pas dans le repo ; le hash sondé plus tôt répond 500. `POST /api/wipp/auth/firebase` est en 404, et le client coupe la session Firebase juste après le code SMS. Le client Supabase est en `persistSession: false`. Sans session, les tables qui existent (messages, chats) restent inatteignables pour l’app. BACKEND BLOCKED. Ce n’est pas réparé par 0012–0017 seules.

### Nearby

`wipp_nearby_sessions` absente. `GET /api/wipp/nearby/visibility` en 404. Le module radio natif n’est qu’un stub TypeScript. Un déploiement web sans 0012, ou 0012 sans le web, ne suffit pas.

### Appels

Le handler local couvre config, token, invite, answer, hangup, status, history, groupe. Tout `/api/wipp/calls/*` sondé est en 404. Les tables `wipp_group_calls` arrivent avec 0016. `src/lib/livekit/token.ts` renvoie `mode: local` / `missing_credentials` si `LIVEKIT_URL`, `LIVEKIT_API_KEY` ou `LIVEKIT_API_SECRET` manquent. Ces secrets ne sont pas dans le repo. Le chiffrement d’appel de bout en bout est encore marqué en attente. CallKeep est branché dans le code et n’a pas été testé sur appareil.

### Push

`POST /api/wipp/devices/push` est en 404 sur l’hôte. 0013 (colonnes d’installation) n’est pas appliquée. 0015 (`wipp_push_dedupe`, `wipp_lot15_claim_push`) non plus. L’envoi prévu passe par l’API Expo (`exp.host`), pas par `firebase-admin`. Identifiants EAS / FCM : configuration externe. Le canal serveur `incoming_calls` ne correspond pas aux canaux client.

### Appareils liés

`wipp_devices` existe (401, table plus ancienne). `GET /api/wipp/devices` est implémenté dans le handler et répond 404 en ligne. L’écran natif affiche « LINKED DEVICES BACKEND — PENDING » et n’appelle pas cette route. `installation_id` (0013) est absent. NOT IMPLEMENTED côté client, BACKEND BLOCKED côté hôte public.

### Cartes de visite

Upload vers `wipp-business-cards` / `{profileId}/{role}-{uuid}.ext`. Aucune migration ne crée ce bucket. Hébergé : Bucket not found. EXTERNAL / MISSING. Ne pas l’inventer dans ce diagnostic.

## Ordre sûr — plus tard, pas maintenant

1. Sauvegarde du projet Supabase, et lecture SQL (rôle dashboard, pas l’anon) de la forme réelle de `wipp_groups` face au `CREATE TABLE` de 0014, plus le corps de `wipp_my_profile_id`.
2. Décider du RLS manquant de 0012 avant de créer `wipp_nearby_sessions`. Le fichier, tel quel, n’en a pas.
3. 0013 peut suivre : colonnes additives sur des tables déjà là. Indépendante de 0012.
4. Trancher le conflit `wipp_groups` / bans / invites (table déjà là, `IF NOT EXISTS` ne la réécrit pas). Ensuite seulement 0014, puis 0015, puis 0016, puis 0017.
5. Vérifier que les deux buckets existent, `public=false`, et que les policies 0016 sont celles en vigueur.
6. Une migration future pour `wipp-business-cards`. Elle n’existe pas ; elle ne doit pas être improvisée ici.
7. Déployer le build web qui contient `handler.ts`, pour que `/api/wipp` cesse d’être un 404. Les serverFn dont le source n’est pas dans le repo resteront en échec tant que ce source n’est pas rétabli.
8. Persistance de session Supabase : changement d’app, hors de ce diagnostic.
9. Secrets LiveKit, identifiants push EAS/FCM, `assetlinks.json` et AASA réels. Le fichier du repo pour Android utilise encore l’empreinte du keystore debug ; l’AASA a des listes vides ; les deux sont en 404 sur l’hôte.
10. Tests sur appareil seulement après ça. Aucun DEVICE PASS n’existe.

Aucune de ces étapes n’a été exécutée.

## Identifiants externes encore requis

- LiveKit : `LIVEKIT_URL` (ou `VITE_LIVEKIT_URL`), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Absents du repo. Sans eux le jeton d’appel reste local.
- Push : projet EAS `ea523c90-fa59-41f1-af9e-fde9a68b360e`, Firebase `wipp-61124`, `google-services.json` présent. L’envoi réel dépend du déploiement de `/devices/push` et des identifiants Expo, pas seulement du fichier JSON.
- App Links : `assetlinks.json` et `apple-app-site-association` ne sont pas servis par wippapp.com.
- ServerFn d’auth : le source hashé n’est pas dans git. Le 500 déjà observé reste le dernier fait, sans nouveau spray de hash.

## DO NOT DEPLOY YET

Le code des migrations est dans le repo. L’hôte ne les a pas. `wipp_groups` existe déjà sous une forme qui ne recevra pas le `CREATE TABLE` de 0014. `wipp_my_profile_id` existe déjà et son corps n’est pas celui qu’on peut déduire d’une 0014 complète. `/api/wipp` n’est pas le handler de ce commit. Lancer 0014–0017 ou redéployer wippapp.com maintenant mélangerait un schéma ancien, un stub de profil, et un site qui ne parle pas encore à ces tables.

READY TO START BACKEND DEPLOYMENT — **NO**
