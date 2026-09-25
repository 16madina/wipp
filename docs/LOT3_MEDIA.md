# Lot 3 — médias et confidentialité

Le texte reste `ECDH P-256 → HKDF-SHA-256 → AES-256-GCM` (`encryptText`, inchangé).
Les médias utilisent un pipeline séparé `wipp-media-v1`.

## Chunks

- AES-256-GCM, nonce de 96 bits tiré à chaque `encryptChunk`.
- La reprise renvoie les mêmes octets de ciphertext. Elle ne rechiffre pas.
- Le tag GCM authentifie le morceau. Le SHA-256 sert à la détection précoce, au cache et à la reprise.
- AAD : `wipp-media-v1`, identifiant de pièce jointe, index.

Le serveur ne stocke que `ciphertext_b64` et `sha256`. Pas de nom, MIME, miniature, voix, coordonnées ni payload en clair.

## Voir une fois

États : `uploading → available → claimed → consumed`.
Le passage `available → claimed` est un `UPDATE … WHERE state = 'available'`.
Une fois consommé, plus aucun morceau n’est servi et le ciphertext est supprimé.
Deux appareils déjà en course, une capture d’écran ou une copie hors ligne ne sont pas empêchés. C’est un best effort jusqu’au Lot 6.

## Nettoyage

`sweepMedia` est idempotent : messages expirés (tombe + blobs), envois `uploading` de plus de 24 h, claims voir-une-fois de plus de 10 min, `sealed_payload` après `retain_until`.

## Signalement

Copie volontaire chiffrée vers une clé de modération distincte (`wipp-report-v1`).
Les clients ordinaires ne reçoivent que la clé publique. L’ouverture est réservée au rôle admin et journalisée. Rétention 30 jours. Un signalement ne renvoie pas le reste de la conversation.

## Blocage

Les deux sens sont refusés sur l’envoi, l’édition, la suppression pour tous, les réactions, l’épingle, les accusés, la frappe, la création de conversation, les pièces jointes, la lecture d’un morceau, les appels, le jeton d’appel et le push.

## Liens, position, stickers

Aucun fetch d’URL reçue. Un aperçu, s’il existe, est produit par l’expéditeur et voyage dans l’enveloppe.
La position de ce lot est la position actuelle seulement. La localisation en direct est hors scope.
Un sticker n’envoie que son identifiant dans l’enveloppe.
