# Étape G — Version 12 : achats WIPP Studio actifs sur Android

## Ce qui a changé (Mac, 29 oct.)

- `native/src/lib/purchases.ts` : clé RevenueCat Android ajoutée (`goog_…`).
- `versionCode` passé à **12** (`native/android/app/build.gradle` et `native/app.json`).
- RevenueCat : les 4 produits Android sont créés (moji5, moji10, pop3, wipppop7, tous « Consumable »).
- Serveur : reconnaît aussi les produits Google notés `id:option` (ex. `com.wipp.studio.moji5:standard`).

## À faire sur Windows

1. `git pull` de la branche `wippmoji-studio`.
2. Pas de `expo prebuild` (`native/android` est suivi dans Git).
3. Construire l'AAB signé (versionCode 12).
4. L'envoyer en **test interne** d'abord (pas en production), puis tester un achat sur le Samsung :
   - le compte Google du Samsung doit être dans **Play Console → Paramètres → Test de licence** ;
   - la fenêtre Google Play doit indiquer que c'est un achat test (pas de débit).
5. Écrire le résultat dans un rapport `windows-build/RAPPORT-WINDOWS-…md` : achat réussi ou message d'erreur exact.

## Attention

- Les achats Android ne seront validés par RevenueCat qu'une fois le **fichier JSON du compte de service Google** importé dans RevenueCat (côté Mac / propriétaire). Google peut mettre jusqu'à 36 h à l'accepter. Avant ça, l'achat peut passer chez Google mais le serveur WIPP refusera de créer le pack.
- La production ne se fait qu'avec l'accord écrit de la propriétaire.
