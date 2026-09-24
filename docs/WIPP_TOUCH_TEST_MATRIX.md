# WIPP Touch — matrice de tests physiques

Remplir **Résultat réel** / **PASS-FAIL** / **Limitation OS** sur devices réels après rebuild EAS.

Légende attendu : comportement nominal si OS le permet.

## Prérequis
- Build natif EAS avec `wipp-touch-native` + `react-native-ble-plx`
- Comptes A/B distincts, Bluetooth ON, notifications autorisées (sauf tests négatifs)
- Calibration RSSI : `EXPO_PUBLIC_WIPP_TOUCH_CALIBRATION=1` puis collé / 5 cm / 10 cm / 30 cm / 1 m

## Android → Android

| # | Scénario | Attendu | Résultat réel | PASS-FAIL | Limitation OS |
|---|----------|---------|---------------|-----------|---------------|
| 1 | A FG / B FG | B notif Accept/Refuse, une seule | | | |
| 2 | A FG / B BG | B peut scanner (OEM) → notif | | | Scan BG OEM-dépendant |
| 3 | B verrouillé | Souvent pas de scan / notif retardée | | | OEM |
| 4 | BT off (A ou B) | Hint « Active le Bluetooth… » / pas de hit | | | |
| 5 | Notifs refusées | Détection OK mais pas de feuille notif | | | |
| 6 | WIPP force-quit (B) | Pas de scan jusqu’au relancement | | | |
| 7 | Plusieurs WIPP proches | Une notif = plus proche durable | | | |
| 8 | Invitation expirée | peek/resolve 410 / landing | | | |
| 9 | Déjà utilisée | accept 409 | | | |
| 10 | RSS distances | collé OK ; 1 m rejeté (seuil calibré) | | | Calibrer seuil |
| 11 | Fallback QR | même code, accept OK | | | |
| 12 | Saisie code | resolve `source=manual` + accept | | | |
| 13 | `/t/CODE` app installée | App Links → écran invitation | | | assetlinks SHA256 |
| 14 | `/t/CODE` sans app | Page web + Play Store | | | |

## Android → iPhone

| # | Scénario | Attendu | Résultat réel | PASS-FAIL | Limitation OS |
|---|----------|---------|---------------|-----------|---------------|
| 1 | A FG / B FG | iPhone scanne UUID + code (scan resp.) | | | |
| 2 | A FG / B BG | Scan BG iOS limité aux services déclarés | | | iOS BG central |
| 3 | B verrouillé | Généralement aucun hit | | | iOS |
| 4–14 | (mêmes lignes que ci-dessus) | | | | |

## iPhone → Android

| # | Scénario | Attendu | Résultat réel | PASS-FAIL | Limitation OS |
|---|----------|---------|---------------|-----------|---------------|
| 1 | A FG / B FG | CBPeripheralManager + local name code | | | Local name peut être omis en BG |
| 2 | A FG / B BG | Android scan OK si UUID présent | | | |
| 3 | A BG | iOS peut réduire ADV / strip local name | | | iOS peripheral BG |
| 4–14 | (mêmes lignes) | | | | GATT char = secours futur |

## iPhone → iPhone

| # | Scénario | Attendu | Résultat réel | PASS-FAIL | Limitation OS |
|---|----------|---------|---------------|-----------|---------------|
| 1 | A FG / B FG | Service UUID + local name → notif | | | |
| 2 | A/B BG | Fragile ; UUID seul sans code si name strip | | | iOS |
| 3–14 | (mêmes lignes) | | | | NFC non applicable |

## NFC
Non implémenté — voir `docs/WIPP_TOUCH_NFC.md`. Canal complémentaire seulement si un scénario reproductible est prouvé plus tard.
