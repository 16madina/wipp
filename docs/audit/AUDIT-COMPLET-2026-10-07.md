# Audit complet de WIPP — 7 octobre 2026

Audit fait en lisant le code de l'app (iPhone + Android), le serveur et la base de données.
Les points marqués « à confirmer » doivent encore être essayés sur un téléphone.

Légende : 🔴 risque de refus Apple ou bug grave · 🟠 à corriger avant la sortie · 🟡 finition

---

## 1. Signaler et bloquer (ta question)

| Situation | Ce qui se passe aujourd'hui | Problème |
|---|---|---|
| Je **signale une story** | Le signalement est envoyé. **La story reste affichée.** | 🔴 Elle devrait disparaître tout de suite pour la personne qui signale. |
| Je **masque une story** | Elle disparaît… **jusqu'à la fermeture de l'app**, puis revient. | 🟠 Le masquage n'est pas gardé. |
| Je **bloque la personne** (depuis une story, un profil, une conversation, une demande) | Sur le moment : sa conversation et ses stories disparaissent, elle ne peut plus m'écrire (bloqué aussi par le serveur ✅). | 🔴 **Après fermeture et réouverture de l'app**, la liste des personnes bloquées n'est pas rechargée : ses stories et la conversation **réapparaissent** (à confirmer sur téléphone). Le serveur ne retire pas non plus les stories des personnes bloquées. |
| **Qui voit les signalements ?** | Les messages signalés arrivent dans Admin → 🚩 Signalements. | 🔴 Les signalements de **stories, profils, annonces et boutiques** vont dans une autre table que l'écran Admin **ne lit jamais**. Personne ne les voit. Apple exige qu'on agisse sur les signalements (sous 24 h). |

**À faire :**
1. Signaler une story → la masquer aussitôt pour moi + proposer « Bloquer aussi cette personne ? ».
2. Garder les stories masquées en mémoire (après redémarrage aussi).
3. Recharger la liste des personnes bloquées à chaque ouverture de l'app.
4. Côté serveur : ne plus jamais envoyer les stories ni les conversations des personnes bloquées (dans les deux sens).
5. Admin → Signalements : afficher **tous** les signalements (stories, profils, annonces, boutiques, messages), avec « Traité » / « Classé », et un bouton pour masquer le contenu ou suspendre le compte.

---

## 2. Boutons et écrans qui ne marchent pas ou affichent « bientôt »

| Endroit | Ce que voit l'utilisateur | Gravité |
|---|---|---|
| Conversation → ➕ → **GIF** | « Recherche de GIF bientôt disponible » **et un message technique en anglais pour développeur** (« Ajoute EXPO_PUBLIC_GIF_API_KEY pour Tenor… ») | 🔴 Apple refuse les fonctions inachevées et les textes de test visibles. → Retirer le bouton GIF, ou brancher un vrai service de GIF. |
| Moi → **Appareils liés** | Bandeau « **LINKED DEVICES BACKEND — PENDING** » + « Liste multi-appareils sécurisée non encore branchée » | 🔴 Texte de développeur visible. → Retirer cet écran pour l'instant. |
| Moi → Réglages → **Texte plus grand** | Interrupteur qui ne fait rien | 🟠 Retirer ou faire marcher. |
| Moi → Réglages → **Réduire les animations** | Interrupteur qui ne fait rien | 🟠 Retirer ou faire marcher. |
| Moi → **Inviter — « Gagne des récompenses »** | Partage le profil, mais **aucune récompense n'existe** | 🔴 Promesse trompeuse (Apple 2.3). → Enlever « Gagne des récompenses ». |
| Moi → Réglages → **Verrouillage WIPP Privé** | Ligne qui ne mène nulle part (juste « Activé/Désactivé ») | 🟡 Rendre cliquable ou retirer (le doublon existe déjà plus haut). |
| Explorer → Services → **Pharmacies** | « Bientôt disponible » (en attente de l'accord UNPPCI) | 🟠 Cacher la tuile tant que ce n'est pas branché. |
| Explorer → Services | « D'autres services utiles arrivent bientôt. » | 🟡 Retirer la phrase. |
| Surprise → choix du style | « Les styles arrivent bientôt. » (rare, seulement si un type n'a pas de styles) | 🟡 À vérifier. |
| Avis des boutiques | « Pas encore noté » | 🟡 Normal tant que les avis (étape 4) ne sont pas faits. |

Les mots « Bientôt » restants dans les traductions ne sont plus affichés nulle part ✅.

---

## 3. Textes légaux et réglages Apple

| Point | Problème | Gravité |
|---|---|---|
| **Politique de confidentialité** (app + site) | Elle se **contredit** : un paragraphe dit que les groupes et les médias sont chiffrés, le suivant dit « Le E2EE ne couvre pas encore : groupes, médias… ». | 🔴 Apple vérifie que la politique correspond à l'app. → Corriger la phrase. |
| **Âge** | L'app dit « 18 ans et plus » (À propos, page légale). Mes notes Apple parlaient de 13+/16+. | 🟠 Choisir **18+** partout : questionnaire d'âge Apple = 18+, et les notes doivent le dire. |
| Pages du site | wippapp.com/privacy, /terms et /support répondent ✅ | — |
| Chiffrement (France) | Déclaration ANSSI envoyée ✅, ligne dans l'app ✅ | — |
| Comptes de test | Masqués ✅ | — |
| Filtre de mots injurieux | Actif ✅ | — |

---

## 4. Chargement de l'app

| Point | État |
|---|---|
| Données de démonstration au démarrage | Corrigé ✅ (plus de démo dès qu'un vrai compte est connu) |
| Demande « fantôme » qui apparaît puis disparaît | Corrigé ✅ |
| Boutiques dans les conversations « Professionnel » | Corrigé ✅ (gardées en mémoire) |
| Photos de profil lentes au démarrage | 🟠 Encore lent : les photos sont redemandées au serveur à chaque ouverture. → Les garder en mémoire sur le téléphone. |
| Première synchronisation | Petit chargement au lieu de « Aucune conversation » ✅ |

---

## 5. Déjà en règle ✅

- Demandes d'autorisation (caméra, micro, photos, contacts, localisation, Face ID, mouvement) expliquées.
- Suppression du compte dans l'app.
- Signaler + bloquer présents sur les stories, profils, conversations, groupes, annonces et boutiques (mais voir section 1).
- Appels : écran d'appel iPhone (CallKit) à chaque appel.
- Pas de paiement, pas de publicité.

---

## Ordre conseillé pour corriger

**Avant d'envoyer à Apple (🔴) :**
1. Signalement de story → la story disparaît + proposer de bloquer.
2. Blocages et stories masquées gardés après redémarrage + filtrés par le serveur.
3. Admin : tous les signalements visibles et traitables.
4. Retirer le bouton GIF et l'écran « Appareils liés ».
5. Enlever « Gagne des récompenses ».
6. Corriger la politique de confidentialité (chiffrement) + âge 18+ partout.

**Ensuite (🟠🟡) :** interrupteurs inutiles, tuile Pharmacies, phrases « bientôt », photos de profil en mémoire.
