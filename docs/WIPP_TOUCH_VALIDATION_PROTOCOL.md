# Protocole de validation WIPP Touch (appareils physiques)

**Ne pas modifier** `rssiMinDbm`, `rssiGapDb`, fenêtres temporelles pendant la collecte.  
Config figée actuelle (`wipp_touch_config.bump`) :

```json
{
  "shockGThreshold": 2.2,
  "shockMaxDurationMs": 120,
  "windowBeforeMs": 1500,
  "windowAfterMs": 1500,
  "windowAfterIosBgMs": 5000,
  "rssiMinDbm": -55,
  "rssiGapDb": 8,
  "calibrationLog": true
}
```

Build preview : `EXPO_PUBLIC_WIPP_TOUCH_CALIBRATION=1` → logs client `[wipp-touch-calib]`.  
Logs serveur : Vercel / runtime `[wipp-touch-calib]`.

---

## Builds à installer

| Plateforme | Profil EAS | Usage |
|------------|------------|--------|
| Android APK | `preview` | A et B Android (BLE + NFC HCE) |
| iOS device | `preview` | A et B iPhone (BLE ; NFC récepteur) |

Comptes démo : `@deena` / `@lea` / `@samira` — mdp `wipp-demo`.  
API : `https://wippapp.com`.

---

## Ordre des directions

1. **Android A → iPhone B** — BLE d’abord, puis NFC **séparément** (BT off ou sans choc)
2. **iPhone A → Android B**
3. **iPhone A → iPhone B**
4. **Android A → Android B**

---

## Phase 0 — Calibration RSSI (par direction)

Téléphones **collés / 5 cm / 10 cm / 30 cm / 1 m**.  
A en « Partager mon WIPP » (FG, keep-awake). B avec WIPP FG. **Pas de choc** d’abord : juste noter les logs RSSI, **ou** un choc contrôlé et lire `arbitration_log`.

| Direction | Distance | RSSI médian (log) | Notes |
|-----------|----------|-------------------|-------|
| | collés | | |
| | 5 cm | | |
| | 10 cm | | |
| | 30 cm | | |
| | 1 m | | |

Répéter pour chaque direction 1–4.

---

## Scénario produit principal (obligatoire)

> A ouvre « Partager mon WIPP » → **B n’ouvre PAS Touch** → coller → B reçoit demande → Accepter → connexion.

Pour chaque direction, tester B dans l’état :

| État B | Attendu (théorie) |
|--------|-------------------|
| WIPP premier plan | Notif / invite si matched |
| WIPP arrière-plan | Possible (iOS ralenti) |
| Écran verrouillé | Souvent échec OS |
| WIPP force-quit | Pas de scan jusqu’au relaunch |

---

## Fiche d’essai (une ligne = un essai)

| Champ | Valeur |
|-------|--------|
| Date / heure | |
| Modèle A + OS | |
| Modèle B + OS | |
| Direction A→B | |
| Canal | BLE / NFC |
| État B | FG / BG / locked / force-quit |
| RSSI médian gagnant | |
| 2e meilleur RSSI | |
| Écart (dB) | |
| Choc A détecté | oui / non |
| Choc B (si FG) | oui / non / n/a |
| Arbitrage | matched / ambiguous / no_match |
| Notif reçue | oui / non |
| Délai notif (ms) | |
| Accept → DM OK | oui / non |
| Logs calib joints | oui / non |

### Multi-appareils
| N WIPP proches | Direction | Résultat arbitrage | Notifs (combien) |
|----------------|-----------|--------------------|------------------|
| 2 | | | |
| 3 | | | |
| 4+ | | | |

### Anti-faux-positifs
| Scénario | Résultat attendu | Résultat réel |
|----------|------------------|---------------|
| Choc A sur table, aucun B collé | no_match, 0 notif | |
| 2 B collés RSSI proches | ambiguous, « Recollez… » | |

---

## NFC Android A → iPhone B (séparé)

1. A Android : Partager mon WIPP (NFC HCE actif).
2. BLE optionnellement désactivé pour isoler NFC.
3. iPhone B déverrouillé, NFC ON, **pas** dans Touch.
4. Approcher la zone NFC.
5. **Succès** = iPhone affiche réellement `https://wippapp.com/t/CODE` (notif système / feuille).
6. Si non reproductible → marquer **NFC expérimental**, ne pas forcer.

| Essai | iPhone modèle | Affiche /t/CODE ? | Ouvre WIPP / store ? | Reproductible ? |
|-------|---------------|-------------------|----------------------|-----------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Après collecte — réglages recommandés

Ne toucher `wipp_touch_config` **qu’après** les tableaux Phase 0 :

- Si collés ~ −40 et 30 cm déjà < −55 → garder `rssiMinDbm: -55` ou remonter (ex. −50).
- Si 2 appareils légitimes à 5 cm ont écart < 8 dB → baisser `rssiGapDb` (ex. 5) **ou** exiger choc B.
- Si iOS BG rate la fenêtre 1,5 s → confirmer que `windowAfterIosBgMs: 5000` suffit (logs `detectDelayMs`).

Documenter la reco finale dans ce fichier sous « Réglages retenus ».
