# WIPP — Plan de réconciliation backend

DATE — 2026-10-01
MIGRATION — `migrations/0018_wipp_production_reconciliation.sql`
ANCIENS FICHIERS — `0012` à `0017` non modifiés
SQL EXÉCUTÉ — NON
PRODUCTION MODIFIÉE — NON

0018 est le fichier à relire. Il n’a pas été envoyé à Supabase. Le script `scripts/migrate.mjs` ne doit pas être lancé : il appliquerait d’abord 0012–0017, puis 0018. Sur cette base, seul 0018 doit être joué, et seulement après relecture humaine.

## Correctif avant seconde relecture

0018 a été corrigée dans le même fichier. 0012–0017 n’ont pas été modifiées. Rien n’a été exécuté, ni sur la production ni sur une base locale.

`wipp_group_bans` reste sans `SELECT` pour `authenticated`. `wipp_group_calls_member_read` et `wipp_group_call_members_read` appellent `wipp_private.wipp_current_user_is_banned(p_chat)`. Cette fonction dérive l’appelant et ne prend pas de `profile_id`. Les policies ne lisent pas une table server-only. Les fonctions `SECURITY DEFINER` qui doivent savoir si un autre membre est banni lisent la table en tant que propriétaire, pas en tant que client.

Chaque fonction créée par 0018 est révoquée de `PUBLIC`, `anon` et `authenticated`, puis réaccordée. `wipp_lot7_sys`, `wipp_lot7_is_admin`, `wipp_lot7_me`, `wipp_lot7_is_contact`, `wipp_lot15_is_close` et `wipp_lot15_claim_push` ne sont pas exécutables par `authenticated`. Les helpers RLS le sont, parce qu’une policy s’exécute sous ce rôle, et ils ne répondent que pour l’appelant. `wipp_lot7_is_contact(a, b)` et `wipp_lot15_is_close(owner, friend)` retournent false si les deux arguments sont d’autres personnes. Les policies stories et storage appellent `wipp_private.wipp_viewer_is_contact` et `wipp_private.wipp_viewer_is_close_of`.

Un preflight en tête du fichier, avant tout `ALTER`, `CREATE`, `REVOKE` ou `GRANT`, vérifie les objets et les types dont 0018 dépend. `auth_user_id` doit être `uuid`. Un écart lève une exception, sans conversion.

Les tables nouvelles perdent les grants par défaut de `anon` et `authenticated`, puis ne reçoivent que l’opération utile. `wipp_saves` reçoit lecture, insert, update et delete. Nearby, dédoublonnage et bans n’ont aucun droit `authenticated`. Les grants de `wipp_chats`, `wipp_chat_members` et `wipp_group_invites` ne sont pas réécrits.

Une story image ou vidéo doit stocker `stories/<id courant>/<objet>`, le format de `storyObjectPath` et de `wipp_lot16_can_read_private`. Une URL publique est refusée. Une story texte vide est refusée. L’expiration reste 24 h. L’auteur est l’appelant.

Contrôle statique du fichier, sans base : 38 fonctions, preflight avant toute mutation, aucun grant client sur les fonctions internes, aucune policy ne lit `wipp_group_bans`. Tests RLS sur Postgres : non exécutés. Pas de copie locale du schéma production, et 0018 ne doit pas être appliquée pour les simuler.

## Identité conservée

La production résout déjà :

`auth.uid()` → `wipp_profiles.auth_user_id` → `wipp_profiles.id`

par `wipp_private.wipp_me()`, et `public.wipp_my_profile_id()` appelle cette fonction.

0018 ne remplace aucun de ces deux corps. Le stub `SELECT NULL` de 0014 n’est pas repris. 0018 retire l’exécution à `PUBLIC` et à `anon`, et la laisse à `authenticated` et `service_role`.

`wipp_lot7_me()` est une fonction nouvelle. Elle ne fait que `SELECT public.wipp_my_profile_id()`.

## Groupes existants conservés

`wipp_groups` n’est pas recréée. Clé `chat_id` inchangée. Lien conservé avec `wipp_chats` et `wipp_chat_members`.

Seule colonne ajoutée : `avatar_url text`, nullable.

`wipp_group_admins` est une table nouvelle, parce que `owner_id` ne suffit pas : l’application promeut d’autres membres. Clés `chat_id text` et `profile_id text`, étrangères vers `wipp_chats(id)` et `wipp_profiles(id)`. Pas d’uuid.

`wipp_group_bans` et `wipp_group_invites` ne sont pas recréées. La policy `group_invites_read_owner` n’est pas supprimée.

### Bans — choix explicite

Aucune migration locale ne crée de policy sur `wipp_group_bans`. 0014 active le RLS et s’arrête là. Les lectures et écritures passent par des fonctions `SECURITY DEFINER` (`wipp_lot7_ban`, join, peek, storage). L’absence de policy est donc le modèle server-only du dépôt, pas un oubli d’une policy de lecture.

L’inspection production n’a retourné aucune policy, ce qui colle à ce modèle. On ne sait pas si le RLS est déjà actif. 0018 l’active, retire les droits `anon` et `authenticated`, et n’ajoute pas de policy. Pas de `USING (true)`. Le rôle serveur continue de passer par le contournement RLS du propriétaire de table, comme le dit déjà `migrations/0009`. `FORCE ROW LEVEL SECURITY` n’est pas posé : il bloquerait ces fonctions.

## Ce que deviennent 0012–0017

| Fichier | REUSED | REPLACED | SKIPPED | WHY |
| --- | --- | --- | --- | --- |
| 0012 Nearby | Colonnes et index de `wipp_nearby_sessions` | RLS et droits | Le fichier entier, et l’absence de RLS | 0012 crée la table sans RLS. 0018 la crée avec RLS, sans policy client. |
| 0013 Push | `installation_id`, `disabled_at`, `generic_notify`, les deux index | — | Rien d’autre : le fichier ne fait que ça | Les tables mères existent. `ADD COLUMN IF NOT EXISTS`. |
| 0014 Groupes / stories / Explorer | RPC groupes, messages, annonces, événements, saves, admins | Stories et leur check d’audience | `CREATE TABLE wipp_groups`, bans, invites ; stub `wipp_my_profile_id` qui retourne NULL ; check `contacts\|only_me` seul | La table groupes existe. L’identité existe. L’audience finale inclut `close` dès la création. |
| 0015 Close / services / buckets | Amis proches, services, dédoublonnage push, `avatar_url`, `ended_at`, version finale des RPC stories | Policies storage, réécrites une seule fois avec 0016 | Bascule « drop constraint 0014 puis recrée » ; `DELETE` de migration (il n’y en a pas ; le `DELETE` d’ami proche reste dans la fonction) | Pas de table stories à migrer. Pas de seed. |
| 0016 Appels + storage | Tables d’appels de groupe, fonctions de lecture/écriture privée, policies storage finales | — | Seconde copie des policies 0015 ; commentaire « requires 0014 and 0015 » | Une seule génération de policies. FK `text` ajoutées vers chats et profils. |
| 0017 GRANT | Idée de `GRANT EXECUTE` à `authenticated` | — | `ALTER FUNCTION` sur `wipp_my_profile_id` et sur `wipp_lot7_me` | Le corps production ne doit pas être réécrit. Le GRANT est fait sans `ALTER`. |

Après 0018, ne pas appliquer 0014–0017 par-dessus : 0014 remplacerait `wipp_lot7_publish_story` par la version qui refuse `close`.

## Ce que 0018 ferait

### EXISTING OBJECT PRESERVED

- `wipp_private.wipp_me()`
- `public.wipp_my_profile_id()` (corps intact, droits resserrés)
- `wipp_groups` (`chat_id`, `name`, `owner_id`, `invites_enabled`, `created_at`)
- `wipp_group_bans`, `wipp_group_invites`, policy `group_invites_read_owner`
- `wipp_chats`, `wipp_chat_members`, policies `chats_read_member`, `chats_update_member`, `members_read`, `members_update_own`
- `wipp_messages` (corps des messages non réécrits)
- `wipp_call_invites`, `wipp_push_tokens`
- Cartes business déjà en base (`business_owner_id`, `business_card_id` sur les chats). Aucune de ces colonnes n’est touchée.

### NEW OBJECT

- `wipp_group_admins`
- `wipp_stories`, `wipp_story_views` — audience `contacts`, `close`, `only_me` ; kinds `text`, `image`, `video` ; expiration 24 h à l’insertion
- `wipp_close_friends`
- `wipp_listings`, `wipp_events`, `wipp_saves`
- `wipp_local_services` — vide, `active` défaut false, aucune ligne de démo
- `wipp_push_dedupe`
- `wipp_nearby_sessions`
- `wipp_group_calls`, `wipp_group_call_members`
- RPC `wipp_lot7_*` et `wipp_lot15_*` appelées par `native/src/lib/lot7/api.ts`
- `wipp_lot16_can_read_private`, `wipp_lot16_can_write_private`
- Buckets `wipp-private-media`, `wipp-public-media`, `wipp-business-cards`

### ALTERED OBJECT

- `wipp_groups.avatar_url`
- `wipp_call_invites.ended_at`
- `wipp_messages.mentions` (défaut `'{}'`), `wipp_messages.system_event` (null)
- `wipp_push_tokens.installation_id`, `disabled_at`
- `wipp_chat_members.generic_notify` (défaut false)
- Trigger `wipp_lot7_guard_system` : un client ne peut pas poser `system_event` ; les inserts actuelles, qui laissent la colonne nulle, passent
- Deux policies RESTRICTIVE sur `wipp_messages`. Elles n’ouvrent aucun accès. Elles exigent `system_event IS NULL` pour un insert ou un update fait par `authenticated`. Pas de `USING (true)`.

### RLS

| Table | Décision |
| --- | --- |
| stories, story views, close friends, listings, events, services vérifiés, groups, admins, appels de groupe | CLIENT READ |
| saves | CLIENT READ + CLIENT WRITE, uniquement `profile_id = wipp_my_profile_id()` |
| nearby, push dedupe, group bans | SERVER ONLY — RLS oui, aucune policy client |
| écritures stories, annonces, événements, amis proches, membres de groupe | SERVER / SECURITY DEFINER — pas de policy d’écriture client |
| appels de groupe | CLIENT READ membre ; aucune policy INSERT/UPDATE/DELETE |

`anon` n’a pas de `GRANT` sur les tables nouvelles. `wipp_push_dedupe`, `wipp_nearby_sessions` et `wipp_group_bans` n’ont pas non plus de `GRANT` pour `authenticated`.

### STORAGE

Les trois buckets sont insérés avec `public = false`. Un conflit remet `public` à false. Le nom `wipp-public-media` ne rend pas le bucket public.

Policies finales, une seule fois :

- Privé : SELECT seulement si `wipp_lot16_can_read_private`. Une story `only_me` n’est lisible que par l’auteur. `contacts` et `close` exigent le lien réel. Connaître le chemin ne suffit pas. UPDATE/DELETE exigent en plus `owner = auth.uid()`.
- Média « public » : SELECT `authenticated` limité aux préfixes `listings`, `events`, `business`, `shops`. Écriture seulement dans le dossier du profil WIPP. Pas d’`anon`.
- Cartes : chemin `native/src/lib/business-card.ts`, `{profileId}/{role}-{uuid}.ext`. Lecture, écriture et URL signée 3600 s limitées au dossier du profil appelant. 8 Mo, jpeg/png/webp. La vitrine d’un autre commerçant reste une URL signée par le serveur (`service_role`), pas une lecture client du bucket.

### FUNCTION

Les fonctions lot7/lot15 prennent l’acteur via `wipp_lot7_me()` → `wipp_my_profile_id()` → `wipp_private.wipp_me()`. Elles ignorent un id envoyé par le client.

`wipp_lot15_claim_push` n’est pas accordée à `authenticated`. Le serveur l’appelle dans `src/lib/push/notify.ts`.

Les policies n’appellent plus `wipp_lot7_is_contact(a, b)` ni `wipp_lot15_is_close(owner, friend)`. Elles appellent les helpers auto-limités de `wipp_private`. Ces deux fonctions publiques sont internes : `service_role` seulement.

## Risques à relire avant toute exécution

1. Ne pas lancer le migrateur complet. 0012 recréerait Nearby sans RLS, puis 0014 remplacerait des fonctions si elle passait après coup.
2. Activer le RLS sur `wipp_groups`, `wipp_group_bans` et `wipp_group_invites` ne supprime pas de lignes. Si le RLS était éteint, la policy d’invites déjà là commencerait à s’appliquer (lecture propriétaire seulement), et les bans cesseraient d’être lisibles par le client.
3. La policy `wipp_groups_read` est ajoutée. Les policies inconnues déjà sur cette table ne sont pas retirées. Deux policies permissives se cumulent en OU.
4. Le preflight exige `wipp_connections.user_a` et `user_b` en `text`. S’ils manquent ou diffèrent, 0018 s’arrête avant toute modification. 0018 ne change pas les droits de cette table. Le 200 anon déjà observé sur elle reste un sujet séparé.
5. `wipp_lot7_invite`, `join` et `peek` supposent sur `wipp_group_invites` les colonnes `id`, `token_hash`, `created_by`, `expires_at`, `max_uses`, `uses`, `revoked_at`. L’inspection a confirmé la policy et, plus tôt, `token_hash`, `max_uses`, `revoked_at`. Les autres colonnes ne sont pas reprouvées ici. La création de la fonction ne vérifie pas ces colonnes ; l’appel, oui.
6. `wipp_lot7_leave`, quand le propriétaire est le dernier membre, exécute plus tard `DELETE FROM wipp_chats`. Ce n’est pas joué pendant la migration. C’est le comportement déjà écrit dans 0014.
7. Les `DELETE` dans `remove_member`, `set_admin`, `ban`, `leave` et `set_close` sont aussi des corps de fonctions, pas des ordres de migration.
8. Les buckets supposent les colonnes Storage `file_size_limit` et `allowed_mime_types` pour les cartes. Elles existent sur le Storage Supabase hébergé courant. Si un insert bucket échoue, la transaction du runner annule tout le fichier.

## Validation statique

Relu après écriture. Sur les ordres hors corps de fonction :

- aucun `DROP TABLE`
- aucun `TRUNCATE`
- aucun `DELETE` ni `UPDATE` de lignes existantes
- aucun `RETURNS NULL` / `SELECT NULL`
- aucune FK `uuid` : toutes les clés nouvelles sont `text`
- aucun bucket avec `public = true`
- aucun `USING (true)`
- chaque table nouvelle a `ENABLE ROW LEVEL SECURITY`
- Nearby, dédoublonnage et bans n’ont pas de policy client

Neuf `DELETE FROM` existent, tous dans des fonctions. Quatre tables visées au moment d’un appel : `wipp_group_admins`, `wipp_chat_members`, `wipp_chats` (dernier membre seulement), `wipp_close_friends`.

0012–0017 : diff vide.

## NEXT PHASE — hors de cette migration

0018 ne corrige pas :

- `/api/wipp/*` en 404 sur https://wippapp.com
- le build public plus ancien que `main`
- les serverFn d’auth dont le source n’est pas dans ce dépôt
- `persistSession: false` sur le client Supabase
- LiveKit, FCM / EAS, `assetlinks.json`, AASA
- le module radio Nearby, qui reste un stub natif même une fois la table créée
- la lecture vidéo des stories dans l’écran natif

Sans session authentifiée, les policies `authenticated` ne laissent passer personne. Déployer le SQL avant la session ne rend pas l’application connectée.

## Hypothèses encore ouvertes

- `wipp_profiles.auth_user_id` est `uuid`. Le preflight s’arrête sinon.
- `wipp_group_invites.max_uses` et `uses` sont `integer`, pas `bigint`.
- `GRANT USAGE ON SCHEMA wipp_private TO authenticated` sert aux policies. Ce grant n’ajoute pas le schéma à l’API Data. Il ne modifie pas les droits de `wipp_private.wipp_me()`. Si une autre fonction de ce schéma est déjà exécutable par `authenticated`, le `USAGE` la rend appelable en SQL. L’inventaire de ces fonctions n’a pas été refait.
- Les policies de membership lisent `wipp_chat_members`, table déjà lue par le client. Ce n’est pas une table server-only.
- L’id de profil utilisé comme dossier story ne contient pas `/` et fait entre 4 et 80 caractères, comme `storyObjectPath`.
- Les tests RLS n’ont pas tourné sur Postgres.

SAFE FOR SECOND HUMAN REVIEW — YES
SAFE TO EXECUTE — DO NOT DECIDE YET
