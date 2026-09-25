# Synchro messages (lot 1)

Le serveur ne déchiffre pas. L’enveloppe reste ECDH P-256, HKDF-SHA-256, AES-256-GCM.

## Visible par le serveur

Identifiants, `client_id`, `reply_to` (id seulement), `edited_at`, `deleted_at`, épingle, emoji, accusés. Aucun texte de message.

## Chiffré dans l’enveloppe

Texte, aperçu de citation, drapeau « transféré ». Un message simple reste une chaîne brute pour que les anciens clients déchiffrent encore. Une réponse ou un transfert utilise `wipp-plain-v2` à l’intérieur du ciphertext.

## Actions

- Répondre : `reply_to` en base + citation chiffrée. Toucher la citation fait défiler vers l’id.
- Réaction : une ligne par utilisateur et message. Le même emoji retire la réaction.
- Modifier : seulement l’auteur, fenêtre `WIPP_EDIT_WINDOW_MS` (15 min par défaut), nouveau ciphertext, `edited_at`.
- Supprimer pour moi : `wipp_message_hides`, invisible pour ce profil.
- Supprimer pour tous : `deleted_at`, corps remplacé par `{"tombstone":true}`, réactions retirées.
- Transférer : nouvel envoi, rechiffré pour la conversation cible. Le ciphertext n’est jamais copié.
- Copier : presse-papiers local du texte déjà déchiffré. Rien n’est synchronisé.
- Épingle : `pinned_at` / `pinned_by`.
- Accusés : `delivered` quand l’appareil a synchronisé, `read` seulement si les accusés de lecture sont activés chez le lecteur. Plus de timer de démo sur les chats `srv:`.
- Frappe : événement éphémère, pas de ligne en base. Le serveur oublie l’état après 4 s. Le client efface « écrit… » après 4,5 s sans nouvel événement, même si l’autre appareil disparaît.
- Push : « Nouveau message » sans contenu. WIPP Privé (`vault: true` à l’envoi) : titre WIPP, corps « Nouveau message », `data.private`. Pas de push si le destinataire a le chat ouvert (présence 20 s).
- Hors ligne : file `wipp-outbox-v1`, `client_id` idempotent. Un renvoi avec le même `client_id` rend le message déjà stocké, même s’il est masqué pour l’expéditeur, et n’envoie pas un second push.

## Temps réel

Les sessions WIPP ne sont pas des JWT Supabase Auth. Le flux authentifié est un SSE `GET /api/wipp/stream`. Le même événement est publié en Broadcast Supabase Realtime sur `wipp:{realtime_key}` quand `SUPABASE_SERVICE_ROLE_KEY` est défini. RLS activée sans politique : l’API (propriétaire des tables) est le seul accès.

Les coches visuelles WIPP (`receipt` / `is-sending|sent|delivered|read`) ne changent pas.

Web et natif partagent `encodePlain` / `decodePlain` et le parseur SSE. La file hors ligne web est `localStorage`, la file native est AsyncStorage, avec le même `clientId`. Un transfert est un nouvel envoi chiffré pour la conversation cible.
