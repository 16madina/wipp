# Rapport Windows — version 13 (30 octobre 2026)

## Résultat

- **Version 13 (1.0.0) envoyée en production** par la propriétaire le 30 oct. (fichier signé à 7 h 13, arrivé dans la Play Console à 7 h 24). Statut : *en cours d'examen*.
- Construite depuis `main` (ba73e65) **plus** une correction Windows : `ad137da` (« en ligne / vu… » sous le nom). Ce commit est maintenant aussi sur `main`.
- Compte bancaire du profil de paiement : **vérifié** (plus de « Vérification en attente »).
- Pas de `expo prebuild`. Le module natif `wipp-video-trim` (Media3) **a compilé sans aucune modification**.

## Corrections faites sur Windows (toutes Android seulement, iPhone inchangé sauf mention)

| Commit | Ce qui a changé |
|---|---|
| `e5a1a0f` | Clavier : `KeyboardAvoidingView` actif sur Android (`behavior="padding"` partout ; c'était `undefined` sur Android, et l'affichage bord à bord d'Expo 54 ne redimensionne plus l'écran). Conversations, Publier, Story, direct, questions, fiche entreprise, studio vidéo. |
| `ee9412a` | **Stories depuis la galerie** : sur Android, `materializeLibraryVideo` n'existait pas (message « Cette vidéo n'est pas encore disponible sur l'iPhone » à chaque fois). La vidéo est maintenant copiée dans le cache (`androidLibraryVideo` dans `story-composer.tsx`). La coupe d'un passage (`trimVideoSegment`) passe sur Android par `exportProject` (un segment, 720×1280). Conversation : plus d'espace de barre de navigation sous le champ quand le clavier est ouvert, et faire défiler range le clavier (`keyboardDismissMode="on-drag"`). |
| `c47b7ec` | Accueil : plus de bouton « Toucher pour le son » (**aussi sur iPhone**, à la demande de la propriétaire). La vidéo se relance avec le son dès `readyToPlay`. Story : « Modifier » sur une ligne (`width: 72`, `numberOfLines={1}`). |
| `ad137da` | En-tête de conversation : le bloc nom + état avait `flex: 1` dans une colonne. Sur Android sa hauteur tombait à presque rien, et « en ligne / vu… » n'apparaissait que sous forme de deux points. |

## Vérifié sur le Samsung A50 (Android 10), version de test signée avec la clé de test

- Mise à jour sans désinstaller : données et connexion conservées.
- Clavier dans une conversation : le champ reste au-dessus du clavier, collé à lui.
- Story depuis la galerie : la vidéo s'ouvre, le choix du passage marche, la coupe Android (Media3) fonctionne.
- **Son des Stories** : avec une vidéo de test qui a du son, le son joue à l'étape du passage **et** après la coupe Android, dans l'éditeur (piste audio active vue avec `dumpsys media.audio_flinger`). L'envoi ne retouche pas la vidéo et le lecteur des Stories ne coupe pas le son.
  - Plusieurs vidéos de la galerie du Samsung (`wipp-partage.mp4`, `wipp-appel.mp4`, `wipp-v1/v2.mp4`) sont des enregistrements `adb screenrecord` : **elles n'ont pas de piste audio**. C'est sans doute la cause de l'impression « pas de son ».
- Accueil : plus de bouton, le son de la vidéo d'accueil joue au lancement.
- Wippmoji Studio : avant l'ouverture côté serveur, « Bientôt disponible » (accès refusé par `assertAllowed`, pas un bogue Android). Ouvert depuis le commit `fb2269b`.

## Pas testé sur Android (à faire après la publication)

- **Achat réel** d'un pack (impossible avec une version installée depuis le PC). La liste de test de licence « WIPP achats test » (missdeemindset@gmail.com, 16madina@gmail.com) est active dans la Play Console : les achats de ces comptes seront des achats tests.
- **Appels** avec les nouveautés (réactions animées, modérateurs, appels à plusieurs, main levée).
- Bouton « Modifier » (studio vidéo) jusqu'à la publication : scinder, vitesse, texte, filtres (tests de l'étape H).
- La création de compte (écran du numéro de téléphone) avec le clavier : non modifiée, non testée (il aurait fallu déconnecter la propriétaire).

## À signaler

- RevenueCat (logcat) : *« there are no Play Store products registered in the RevenueCat dashboard for your offerings »*. Sans effet, puisque l'app utilise `getProducts`, mais on peut rattacher les produits Android à un offering pour supprimer l'erreur.
- Android Studio sur Windows : s'il est coupé brutalement (veille, arrêt), il laisse un fichier `.port` impossible à supprimer et ne redémarre plus. Contournement : renommer `%LOCALAPPDATA%\Google\AndroidStudio2026.2.1` (fait 3 fois : dossiers `…verrou-bloque*`).
