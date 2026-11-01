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

## 3. Les appels ne sonnent pas sur les nouveaux comptes Android — CORRIGÉ sur Mac, URGENT à vérifier
Constat (base de données) : 3 des 4 téléphones Android connectés ces 14 derniers jours n'ont aucun jeton dans `wipp_push_tokens` (dont un testeur créé le 1er nov.). Les iPhone en ont tous. Sans jeton, le serveur ne peut pas faire sonner le téléphone : l'appelant entend sonner, le Android ne reçoit rien.
Cause : `bootstrapPush()` envoie le jeton FCM (`kind: "fcm-e2e"`) au démarrage, avant que la session existe (nouveau compte, reconnexion) → `devices/push` échoue en silence et n'était jamais renvoyé.
Correction : `native/src/lib/push/index.ts` → `registerFcmAfterSession()` appelé dans `onSessionReady()`.
À vérifier sur le Samsung : réinstaller, créer ou reconnecter un compte, vérifier qu'une ligne `platform=android, kind=fcm-e2e` apparaît dans `wipp_push_tokens`, et qu'un appel depuis l'iPhone fait sonner le Samsung (app ouverte, en arrière-plan, fermée). À inclure dans la prochaine version Android dès que possible.

## 4. « Je reviens… » reste affiché alors que la personne est revenue (caméra coupée exprès) — CORRIGÉ sur Mac (code commun), à vérifier
Scénario signalé (Android, même bug sur iPhone) : appel vidéo, caméra allumée → il quitte l'app (« Je reviens… » chez l'autre, normal) → il revient → il coupe sa caméra exprès → l'autre voit toujours le logo WIPP « Je reviens… » alors qu'il est là.
Cause : `CallScreen.tsx` affichait `BeRightBack` dès que la vidéo distante était en pause (`remoteMuted`), sans distinguer « il a quitté l'app » de « il a coupé sa caméra ».
Correction :
- nouveau message d'appel `{ t: "away", on }` (`native/src/lib/calls/room-controls.ts`, état `away`, `setAway`) ;
- `CallOverlay.tsx` l'envoie quand l'app passe en arrière-plan (`on: true`) et au retour (`on: false`), et le reçoit (`rc.setAway`) ; remis à zéro quand la personne quitte l'appel ;
- `CallScreen.tsx` n'affiche « Je reviens… » que si `remoteMuted && peerAway`. Caméra coupée exprès → photo de profil comme en audio.
À vérifier sur Android : l'envoi `away: true` doit partir au moment où l'app passe en arrière-plan (listener `AppState` → `background`). Si Android coupe le JS trop vite (ou en mode PiP), envoyer aussi sur `inactive`/`onUserLeaveHint`. Tester : Samsung ↔ iPhone 15, les deux sens, les quatre étapes du scénario.

## 5. Appels reçus même si l'app n'est pas ouverte depuis longtemps — optimisation de la batterie
But : comme WhatsApp, un utilisateur qui n'ouvre pas WIPP pendant des jours ou des mois doit quand même recevoir appels et messages. Le serveur ne coupe rien avec le temps (vérifié), mais certains Android (surtout Samsung : « applications en veille profonde ») bloquent les notifications des apps peu ouvertes.
À faire :
- Après l'inscription (et une fois dans Moi → Notifications), si `PowerManager.isIgnoringBatteryOptimizations()` est faux, afficher un écran court : « Pour recevoir tes appels même quand WIPP est fermé, autorise WIPP à fonctionner en arrière-plan », bouton « Autoriser » → `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (permission `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` au manifeste ; usage accepté par Google Play pour une app d'appels VoIP), bouton « Plus tard ». Ne pas redemander à chaque ouverture (au plus une fois par semaine si refusé).
- Vérifier que les messages FCM d'appel partent en priorité haute (`android.priority = "high"`, côté serveur `src/lib/messaging/calls.ts`) : c'est ce qui réveille le téléphone en veille.
- Tester : Samsung sans ouvrir WIPP pendant plusieurs heures, écran éteint → appel depuis l'iPhone → le Samsung doit sonner.
