# Soumission App Store — WIPP

Audit du 2026-10-07. À relire avant chaque soumission.

## 1. Notes pour l'équipe d'Apple (à copier dans App Store Connect → App Review Information → Notes)

> Texte en anglais : les équipes de review lisent l'anglais. Remplacer les `<…>` avant d'envoyer.

```
Thank you for reviewing WIPP.

WIPP is a private messenger (1:1 and group chats, voice notes, audio/video calls, stories) with a business directory for local shops.

SIGN-IN
WIPP signs in with a phone number (SMS code). Please use these test numbers (no real SMS is sent):
- Account A: <+225 XX XX XX XX XX>  code <123456>
- Account B: <+225 XX XX XX XX XX>  code <123456>
Account A and Account B already have a conversation together, so you can test messages, voice notes and calls between two devices.

END-TO-END ENCRYPTION
Messages and media are end-to-end encrypted with standard algorithms (AES-GCM, ECDH P-256). Calls use WebRTC (DTLS-SRTP). No proprietary cryptography.

WIPP PRIVÉ (private space)
WIPP Privé is a private space protected by Face ID / passcode. To open it: long-press the WIPP logo at the top of the Chats screen for about 2.5 seconds. It only contains the user's own private conversations; it is not used to hide any feature from review.

CALLS
Incoming calls use CallKit (VoIP push). Every VoIP push reports a call to CallKit.

WIPP TOUCH / NEARBY
- WIPP Touch: two people hold their phones together to exchange contacts. It uses motion sensors and, when available, Nearby Interaction (UWB), only while the WIPP Touch screen is open. Both people must accept.
- Nearby (À proximité): optional, off by default. The app sends only an approximate zone (geohash), never the exact GPS position. Users can turn on "Invisible" at any time.

SAFETY (user-generated content)
- Report: every conversation, group, story, profile and business page has "Signaler".
- Block: any user can be blocked from the conversation or profile.
- Public text (names, bios, business pages, group names) is filtered for offensive words.
- Reports are reviewed by the WIPP team within 24 hours; abusive accounts are suspended.
- Account deletion: Moi → Paramètres → Supprimer mon compte.

Contact: <email de support> — <téléphone>
```

## 2. Compte démo (à faire avant de soumettre)

1. Firebase Console → Authentication → Sign-in method → Téléphone → « Numéros de téléphone pour les tests ».
2. Ajouter 2 numéros avec un code fixe (ex. `123456`).
3. Se connecter une fois avec chacun dans l'app, leur donner un nom propre (ex. « Apple Review A / B »), et ouvrir une conversation entre les deux.
4. Mettre les numéros dans les notes ci-dessus.

## 3. Chiffrement (export compliance)

- L'app déclare maintenant `ITSAppUsesNonExemptEncryption = true` (app.json + Info.plist).
- Dans App Store Connect, à chaque build, Apple pose les questions. Réponses :
  1. Algorithmes propriétaires ou non standard ? → **Non**
  2. Algorithmes standard en plus du chiffrement d'Apple ? → **Oui**
  3. Disponible en France ? → **Oui** (alors il faut la déclaration ANSSI) / **Non** (on retire la France des pays de vente au début)

### Déclaration en France (ANSSI)

- WIPP fait du chiffrement de bout en bout « grand public » : c'est une **déclaration de fourniture d'un moyen de cryptologie** (pas une autorisation).
- Formulaire sur le site de l'ANSSI : rubrique « Contrôle réglementaire de la cryptographie » → déclaration de fourniture (formulaire Cerfa + dossier technique : algorithmes, tailles de clé, description de l'app).
- C'est gratuit. L'ANSSI a **1 mois** pour répondre. Sans réponse, la déclaration est acceptée.
- Le récépissé est ensuite envoyé à Apple (App Store Connect → Chiffrement → Ajouter un document).
- Infos techniques pour le dossier : AES-256-GCM (messages et médias), ECDH P-256 (échange de clés), HTTPS/TLS 1.2+ (transport), WebRTC DTLS-SRTP (appels, LiveKit).

**Conseil** : soumettre d'abord **sans la France**, faire la déclaration en parallèle, puis ajouter la France quand le récépissé arrive.

## 4. Questionnaire d'âge (nouveau, obligatoire depuis janvier 2026)

Répondre honnêtement :
- Contenu généré par les utilisateurs, discussions, partage de photos et vidéos : **Oui**
- Messagerie avec des inconnus / localisation par zone (À proximité) : **Oui**
- Grossièretés / humour cru : **Rare / léger** (stickers « Majeur », « Roast »)
- Résultat attendu : **13+**, peut-être **16+**. Sur le site, la politique et les conditions doivent dire 13 ans minimum.

## 5. Liste à cocher avant « Soumettre »

- [ ] Comptes `wipp_test_a` / `wipp_test_b` (« REMOVE BEFORE PRODUCTION ») masqués ou supprimés sur le serveur
- [ ] Compte démo créé (section 2) et notes remplies (section 1)
- [ ] France : déclaration ANSSI faite **ou** France retirée des pays
- [ ] Politique de confidentialité en ligne et à jour : chiffrement de bout en bout, vocaux, stories, zone approximative (À proximité), abonnés des boutiques, suppression du compte
- [ ] Étiquettes de confidentialité d'App Store Connect qui correspondent (téléphone, contacts si utilisés, localisation approximative, photos/vidéos, identifiants)
- [ ] Lien Support qui marche (page avec un e-mail de contact)
- [ ] Captures d'écran de la vraie app, sans données de démo
- [ ] Testé sans plantage sur un iPhone propre (nouvelle installation, premier lancement, refus des autorisations)
- [ ] Questionnaire d'âge rempli
- [ ] Filtre de mots injurieux actif sur les textes publics

## Sources

- Règles officielles : https://developer.apple.com/app-store/review/guidelines/
- Chiffrement : https://developer.apple.com/help/app-store-connect/reference/export-compliance-documentation-for-encryption/
- Classification par âge 2026 : https://developer.apple.com/forums/thread/810473
- Motifs de refus fréquents : https://appfollow.io/blog/app-store-review-guidelines · https://applander.io/blog/app-store-rejection-reasons-2026
