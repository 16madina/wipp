# Étape F — Version Android pour la production (Play Store)

Date : 19 oct. 2026. Branche à utiliser : `main` (identique à `wipp-1.1`, commit 95c4618 ou plus récent).

## Ce qui est nouveau depuis la version 9

- Traduction anglaise complète (bouton FR / EN sur l'accueil et la connexion, langue mémorisée).
- Notifications dans la langue du téléphone : l'app envoie `lang` avec son adresse de notification ; les notifications Android en arrière-plan lisent la langue enregistrée (`ensureTrLanguage`).
- Stickers : 67 Wippie remplacés par des versions propres, 21 nouveaux, 23 stickers animés « afro » (dossier `assets/wipp/stickers/afro`), 35 stickers retirés du panneau. Le lecteur des clips gère aussi le fond bleu.
- Cinq couleurs d'apparence (Réglages › Apparence) et logo assorti.
- Réseaux sociaux sur le profil (TikTok, Instagram, Snapchat, Facebook, YouTube). La colonne `socials` est déjà en place dans la base.

Aucune nouvelle dépendance native : un `prebuild` n'est pas nécessaire pour ces changements (seulement si la configuration Expo a changé de ton côté).

## À faire

1. `git pull` sur `main`.
2. Numéro de version : `versionCode` doit être **supérieur au plus grand déjà envoyé sur la Play Console**. Le code est à 9 ; si 9 a déjà été envoyé, passe à 10 (dans `native/app.json` → `android.versionCode` et `native/android/app/build.gradle`).
3. `npx tsc --noEmit -p .` dans `native/`, puis le build AAB de release habituel.
4. Tester sur un vrai Android avant l'envoi : connexion, envoi d'un message, d'un sticker animé (un « afro » et un Wippie sur fond bleu, ex. la grenouille « Vraiment ?! »), un appel, le changement de couleur et de langue, une notification reçue app fermée.
5. Envoi sur la Play Console : c'est l'utilisatrice qui valide la publication en production.
