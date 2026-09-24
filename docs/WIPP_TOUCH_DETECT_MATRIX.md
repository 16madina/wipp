# WIPP Touch — qui détecte qui (BLE asymétrique)

Remplir **Résultat réel** après rebuild EAS sur appareils physiques.
Ordre de test recommandé : Android→iPhone (BLE puis NFC) → iPhone→Android → iPhone→iPhone → Android→Android.

Légende attendu (théorie OS) :
- ✅ attendu OK au premier plan
- ⚠️ fragile / limité OS
- ❌ non supporté en pratique

## Matrice BLE

| A → B | B premier plan | B arrière-plan | B verrouillé |
|-------|----------------|----------------|--------------|
| **Android → Android** | ✅ UUID + service data | ⚠️ OEM scan BG / PendingIntent | ⚠️ rare |
| **Android → iPhone** | ✅ UUID + service data | ⚠️ central BG lent / regroupé | ❌ / très rare |
| **iPhone → Android** | ✅ UUID (+ local name FG) ; sinon GATT read | ⚠️ iPhone A doit rester FG (overflow) | ❌ A locked |
| **iPhone → iPhone** | ✅ UUID + local name / GATT | ⚠️ overflow area iOS | ❌ |

## Règles produit appliquées
1. Pendant « Partager mon WIPP », **A reste au premier plan** + keep-awake.
2. iPhone A : token via **GATT caractéristique** (+ local name FG).
3. Android A : token en **service data** (scan response) + UUID en ADV.
4. Invitation auto BLE seulement après **choc A** + arbitrage RSSI serveur.
5. Sans choc : QR / code uniquement.
6. NFC Android→iPhone : complémentaire, même token.

## Journal de test (par run)
Noter : `shockAt`, `rssiSamples[]` par candidat, `detectDelayMs`, `arbitration`, `winner`, `notif Oui/Non`.

### Scénarios anti-faux-positifs
| Scénario | Attendu |
|----------|---------|
| ≥3 WIPP dans la pièce, un seul collé | Une notif = collé (écart ≥ rssiGapDb) |
| A tape son téléphone sur la table (pas de B collé) | `no_match` / pas de notif |
| Deux B collés simultanément (RSSI proches) | `ambiguous` → « Recollez les téléphones. » |

## Feuille de résultats (à remplir)

### 1. Android A → iPhone B
| # | Cas | Attendu | Résultat | PASS-FAIL | Limitation |
|---|-----|---------|----------|-----------|------------|
| BLE FG/FG | | | | | |
| BLE FG/BG | | | | | |
| BLE B locked | | | | | |
| NFC FG + iPhone unlocked | notif système /t/CODE | | | | |
| multi WIPP | | | | | |
| choc table seul | aucune invite | | | | |

### 2. iPhone A → Android B
| # | Cas | Attendu | Résultat | PASS-FAIL | Limitation |
|---|-----|---------|----------|-----------|------------|
| BLE FG/FG | | | | | |
| BLE FG/BG | | | | | |
| A BG | Android ne voit souvent pas UUID | | | | overflow iOS |

### 3. iPhone → iPhone
| # | Cas | Attendu | Résultat | PASS-FAIL | Limitation |
|---|-----|---------|----------|-----------|------------|

### 4. Android → Android
| # | Cas | Attendu | Résultat | PASS-FAIL | Limitation |
|---|-----|---------|----------|-----------|------------|
| NFC A→B | flaky OEM | | | | ne pas promettre |
