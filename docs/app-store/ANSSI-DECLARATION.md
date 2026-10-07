# Déclaration ANSSI — réponses prêtes à copier

Site : https://demarche.numerique.gouv.fr/commencer/declaration-relative-a-un-moyen-de-cryptologie
(depuis le 31 mars 2026, tout se fait en ligne ; c'est gratuit)

## Page 1 — Qualité
« Pour vous » (tu déclares pour toi ou pour ta société).

## 1. Bénéficiaire
- Personne morale (si WIPP est une société : Kbis + une page de présentation de la société à joindre, obligatoire la première fois)
- ou Particulier (si tu publies l'app en ton nom propre sur l'App Store)

## 2.1 Informations générales
| Champ | Réponse |
|---|---|
| Marque de distribution | WIPP |
| Dénomination | WIPP |
| Version | 1.0.0 |
| Référence commerciale | WIPP — application iOS et Android (App Store / Google Play) |
| Date de mise sur le marché | date de sortie prévue (ex. 2026-11-01) |
| Fabricant | le bénéficiaire lui-même (ne rien cocher) |

## 2.2 Description fonctionnelle
- Type : **Logiciel**
- Description générale :
  > WIPP est une application de messagerie grand public pour smartphone (iOS et Android) : conversations privées et de groupe, messages vocaux, photos et vidéos, appels audio et vidéo, stories, annuaire de commerces locaux. Le chiffrement sert uniquement à protéger la confidentialité des messages et des appels des utilisateurs (chiffrement de bout en bout). Le produit est distribué gratuitement au grand public via l'App Store d'Apple et Google Play.
- Fonction principale : **Réseau / communication** (sinon « Entrer une autre option » : « Messagerie et communication grand public »)

## 2.3 Services de cryptologie
- Description :
  > Chiffrement de bout en bout des messages, des médias (photos, vidéos, vocaux) et des clés de groupe : chaque appareil génère une paire de clés ECDH P-256 ; une clé partagée est dérivée par ECDH puis HKDF-SHA-256 ; les contenus sont chiffrés en AES-256-GCM. Le serveur ne stocke que des données chiffrées. Les appels audio/vidéo utilisent WebRTC (DTLS-SRTP). Les échanges avec le serveur passent par HTTPS (TLS 1.2 ou 1.3).
- Catégories : **Confidentialité**, **Intégrité**, **Authentification**
- Protocoles sécurisés : **TLS 1.2 / 1.3 (HTTPS)**, **DTLS-SRTP (WebRTC)**

## 2.4 Algorithmes (un élément par ligne, bouton « Ajouter un élément »)
| Algorithme | Mode | Taille de clé | Utilisation |
|---|---|---|---|
| AES | GCM | 256 | Chiffrement des messages, médias et clés de groupe |
| ECDH (courbe P-256) | — | 256 | Échange de clés entre appareils |
| HKDF (SHA-256) | — | 256 | Dérivation des clés |
| SHA-256 | — | — | Intégrité / dérivation |
| AES (SRTP, WebRTC) | CTR / GCM | 128 / 256 | Chiffrement des appels audio et vidéo |
| TLS 1.2 / 1.3 (ECDHE, AES-GCM) | GCM | 128 / 256 | Chiffrement des échanges avec le serveur |

## 3. Pièces à joindre (obligatoires)
1. **Brochure commerciale** : 1 page PDF qui présente WIPP (à quoi sert l'app, captures d'écran, lien App Store / site wippapp.com).
2. **Brochure technique** : 1–2 pages PDF qui reprennent les sections 2.3 et 2.4 ci-dessus.
3. **Attestation** : modèle à télécharger **dans le formulaire** (section « Pièces à joindre »), à remplir, signer, scanner ou photographier, puis déposer.
4. Si société et première déclaration : **Kbis** + **présentation de la société**.

## Après l'envoi
- 1er e-mail : accusé de réception + attestation de dépôt.
- 2e e-mail : déclaration acceptée + lien vers **l'attestation de déclaration ANSSI** (avec un numéro de dossier).
- Les questions de l'ANSSI arrivent sur la plateforme ou par e-mail.
- Ensuite : App Store Connect → ton app → **Chiffrement (Encryption)** → ajouter un document → déposer l'attestation ANSSI → choisir la France.

Notice officielle : https://cyber.gouv.fr/reglementation/reglementation-identite-confiance-numerique/controles-reglementaires-cryptographie/controle-moyen-de-cryptologie/
