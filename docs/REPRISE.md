# Reprise du travail (état au 3 octobre 2026)

Fiche pour reprendre WIPP sur une autre machine ou dans une nouvelle session Claude.

## Où on en est

- Audit complet et résultats de tests : `docs/AUDIT-2026-10-02.md`.
- Testé et corrigé sur deux vrais iPhones :
  - comptes, demandes, messages chiffrés, groupes, carte pro, annonces, Stories, panneau Wippmoji ;
  - appels audio et vidéo : plein écran, miniature, double-tap pour inverser, caméra on/off, mini-lecteur déplaçable.
- Les notifications sont demandées dès la première connexion.

## Prochaine étape : Android, test fermé sur le Play Store

1. `cd native && npm install`
2. Build du AAB : `eas build -p android --profile production`. Expo garde la clé de signature.
3. Il faut `google-services.json` (Firebase) et la clé FCM dans Expo, sinon pas de notifications ni d'appels app fermée.
4. Augmenter `versionCode` à chaque envoi sur le Play Store.
5. Test fermé : au moins 12 testeurs pendant 14 jours avant la production.

## Reste à faire

- Appels VoIP : sonnerie quand l'app est fermée ou le téléphone verrouillé (PushKit sur iOS, FCM haute priorité sur Android).
- Mini-lecteur vidéo hors de l'app (Picture-in-Picture natif).
- Note vocale à tester.
- SMS vers la Côte d'Ivoire, Google Maps, chiffrement des groupes.
- Déployer l'API (`src/lib/messaging/handler.ts`) sur Vercel et publier une mise à jour iOS.
- Images : Wippmojis trop petits, Moments mal détourés (à refaire, ne pas recadrer automatiquement).

## Comptes de test

Numéros fictifs autorisés dans Firebase : `514 555 0101` (A) et `514 555 0102` (B), code `123456`.
