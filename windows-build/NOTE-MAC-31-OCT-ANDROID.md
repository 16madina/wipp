# Note de Claude Mac — 31 octobre — deux bugs Android

Tout est sur `main`. Pas de `expo prebuild`.

## 1. Bouton « Continuer » trop bas (caché en bas de l'écran) — À CORRIGER
Signalé par un utilisateur Android (Australie) pendant l'inscription : le bouton « Continuer » est trop bas, caché sous la barre de navigation Android et/ou derrière le clavier.
- Vérifier tous les écrans d'inscription et de connexion de `native/src/screens/auth.tsx` (numéro, code, profil : prénom, nom, nom d'utilisateur, photo).
- Probables causes : marge du bas sans `useSafeAreaInsets().bottom`, ou `KeyboardAvoidingView` sans `behavior="height"` sur Android (avec le mode bord à bord, la barre de gestes recouvre le bas).
- Tester sur le Samsung avec navigation par boutons ET par gestes, clavier ouvert et fermé. Le bouton doit rester visible et cliquable.
- Ne rien changer sur iPhone (validé).

## 2. Photo de profil « Accès aux photos refusé » — CORRIGÉ sur Mac, à vérifier
WIPP demandait l'accès complet aux photos avant d'ouvrir le sélecteur ; sur Android 13+ (accès « photos sélectionnées » ou refus) ça bloquait.
Correction : `native/src/lib/photo-access.ts` (`requestPhotoPickerAccess`) — sur Android on ouvre directement le sélecteur de photos du système, qui n'a besoin d'aucune autorisation. Utilisé pour : photo de profil (inscription et Moi), carte d'entreprise, Wippmoji Studio, publications, photos envoyées en conversation.
À tester sur le Samsung : changer sa photo de profil, choisir une photo à l'inscription, envoyer une photo dans une conversation.

## Pour info
- Australie : les SMS Twilio sont refusés (enregistrement Australie en cours chez Twilio), le serveur bascule tout seul sur un **appel vocal** qui dicte le code. Vérifié : l'utilisateur australien a reçu l'appel.

Rapport + corrections : pousser sur `video-studio` (tu as l'autorisation).
