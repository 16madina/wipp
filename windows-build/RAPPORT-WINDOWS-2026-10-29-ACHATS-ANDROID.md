# Rapport Windows — 29 octobre 2026 : version 11 et achats WIPP Studio sur Android

## Ce qui est fait (côté Google Play)

- **Version 11 (1.0.0)** construite depuis la branche `wippmoji-studio` (commit 0983dc9), signée avec la clé d'envoi, et **envoyée en production** (100 %, tous les pays). Elle est en examen chez Google.
  - Le manifeste contient bien `com.android.vending.BILLING`.
  - Le changement des informations de connexion pour l'examen part dans le même envoi.
- **Les 4 produits à achat unique sont créés et actifs** dans la Play Console, avec les identifiants de `native/src/lib/purchases.ts` et de `src/lib/wippmoji/purchases.ts` :

| Produit | Identifiant Google Play | Option d'achat | Prix de base |
|---|---|---|---|
| 5 Wippmoji | `com.wipp.studio.moji5` | `standard` | 4,99 $ CAD |
| 10 Wippmoji | `com.wipp.studio.moji10` | `standard` | 7,99 $ CAD |
| 3 WippPop | `com.wipp.studio.pop3` | `standard` | 4,99 $ CAD |
| 7 WippPop | `com.wipp.studio.wipppop7` | `standard` | 9,99 $ CAD |

  Prix convertis automatiquement par Google dans tous les pays. Catégorie de taxe : « Ventes d'applis numériques ». Pas encore d'icône produit.
- **Compte bancaire** ajouté au profil de paiement, mais **vérification en attente** (petit dépôt de test). La propriétaire le valide elle-même. Ça ne bloque que le versement de l'argent, pas les achats.

## Ce qui manque : les achats ne marchent pas encore sur Android

Dans `native/src/lib/purchases.ts`, la clé Android est vide :

```ts
const KEYS = { ios: "appl_...", android: "" };
```

Donc sur Android, `purchasesAvailable()` est faux. Si `require_purchase` est activé sur le serveur, l'écran Studio affiche « Le paiement n'est pas encore disponible sur cet appareil ». Sinon, les packs restent offerts. L'app ne plante pas.

## À faire sur Mac

1. **RevenueCat → ajouter l'app Android** `com.wipp.app` (Google Play).
2. **Relier Google Play à RevenueCat** : compte de service Google Cloud avec accès à la Play Console (autorisations financières et gestion des commandes), puis importer son fichier JSON dans RevenueCat. Google peut mettre jusqu'à 36 h à valider ces identifiants.
3. **Importer les 4 produits** ci-dessus dans RevenueCat (côté Android), avec les mêmes entitlements ou offerings que sur iPhone, si l'app en utilise.
4. **Mettre la clé publique Android** (`goog_...`) dans `KEYS.android` de `native/src/lib/purchases.ts`.
5. Vérifier que le serveur reconnaît les achats Google. `findInRevenueCat` (`src/lib/wippmoji/purchases.ts`) ne filtre pas par magasin, c'est bien. Il cherche cependant `non_subscriptions[productId]` et compare `store_transaction_id` au `transactionIdentifier` renvoyé par le SDK. Sur Android, il faut confirmer pendant le premier achat test que la clé est bien `com.wipp.studio.moji5` (et pas `com.wipp.studio.moji5:standard`) et que les deux identifiants de transaction correspondent (numéro de commande `GPA.…`).
6. Optionnel : notifications en temps réel Google (Pub/Sub) vers RevenueCat, pour les remboursements.
7. **Augmenter `versionCode` à 12** et me laisser une étape dans `windows-build/`. Je construis, je teste un achat sur le Samsung avec un compte testeur de licence, puis j'envoie en production.

## Rappel

- La clé de licence RSA (Configuration de la monétisation) n'est pas nécessaire avec RevenueCat.
- Ne pas utiliser `expo prebuild` : `native/android` est suivi dans Git.
