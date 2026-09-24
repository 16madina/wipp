# WIPP Touch — NFC (mise à jour)

## Décision d’implémentation

| Direction | Supporté ? | Implémenté ? | Notes |
|-----------|------------|--------------|-------|
| **Android A → iPhone B** | Oui (Type 4 HCE + Background Tag Reading, iPhone XS+) | **Oui** | `WippNfcHceService`, URI `https://wippapp.com/t/CODE`, actif **uniquement** pendant « Partager mon WIPP » |
| **Android A → Android B** | Instable (conflits HCE/reader OEM) | Test only | Même service HCE ; ne pas promettre |
| **iPhone A → Android B** | Non | Non | iOS n’a pas de HCE |
| **iPhone A → iPhone B** | Non | Non | Pas de peer HCE |

## Comportement
- Même token que BLE / QR.
- Déduplication serveur : un seul invite id ; NFC ouvre `/t/CODE` avec `source=nfc` (bypass arbitrage choc, collage physique déjà intentionnel).
- Si BLE + NFC sur le même collage : une seule invitation (même code).

## Prérequis tests Android → iPhone
1. Rebuild EAS Android avec module `wipp-touch-native`.
2. AASA `applinks:wippapp.com` + `/t/*` (TEAMID à renseigner).
3. iPhone déverrouillé, NFC ON, WIPP installée ou page store.

## Statut validation physique
**Expérimental** jusqu’à ce qu’un iPhone affiche de façon reproductible `https://wippapp.com/t/CODE` (voir `WIPP_TOUCH_VALIDATION_PROTOCOL.md`). Pas de simulation CI.
