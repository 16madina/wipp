# Étape H — Studio vidéo des Stories sur Android (branche `video-studio`)

**Ne pas envoyer en production. Ne pas fusionner dans `main`.** C'est un test sur le Samsung.

## Ce qui a changé
- Nouveau module natif Android dans `native/modules/wipp-video-trim/android/` (Kotlin, **Media3 Transformer 1.4.1**).
  Il exporte un montage : segments raccordés, volume par segment, textes temporisés, format 720×1280.
- `expo-module.config.json` du module déclare maintenant Android (`expo.modules.wippvideotrim.WippVideoTrimModule`).
- Écran `native/src/screens/video-studio/VideoStudio.tsx` + bouton « Modifier » dans l'aperçu d'une Story vidéo.
- La vitesse est désactivée sur Android pour l'instant (le bouton n'apparaît pas).

## À faire
1. `git fetch && git checkout video-studio && git pull`
2. **Pas de `expo prebuild`.** `cd native && npm install` puis construire un APK/AAB de test (versionCode à ne pas toucher pour ce test : build debug ou release locale installée sur le Samsung).
3. Si Gradle échoue dans `WippVideoTrimModule.kt` : corrige le minimum (API Media3) et note précisément ce que tu as changé dans ton rapport. Ne change pas le comportement.
4. Tester sur le Samsung :
   1. Story vidéo publiée **sans** passer par « Modifier » (doit marcher comme avant).
   2. « Modifier » → Scinder à 5 s et à 10 s → sélectionner le segment du milieu → Supprimer → Terminé. La vidéo doit durer 5 s de moins, sans écran noir.
   3. « Vidéo + » : ajouter une 2ᵉ vidéo, Terminé : les deux s'enchaînent.
   4. Son : couper le son d'un segment, mettre un autre à 40 %. Vérifier dans la vidéo exportée.
   5. Texte : ajouter un texte de 2 s à 3 s. Il doit apparaître seulement à ce moment dans la vidéo exportée, au même endroit que dans l'éditeur.
   6. Annuler / Rétablir une découpe.
   7. Annuler le studio sans modification : la vidéo d'origine reste.
   8. Publier la vidéo montée et la regarder depuis un autre compte.
5. Rapport : `windows-build/RAPPORT-WINDOWS-STUDIO-VIDEO.md` (ce qui marche, ce qui casse, captures si possible, erreurs Gradle/logcat `adb logcat | grep -i -E "wipp|media3|transformer"`), puis pousser sur `video-studio`.
