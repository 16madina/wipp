# Étape H — Studio vidéo des Stories sur Android (branche `video-studio`)

**Validé sur iPhone par la propriétaire.** À construire et tester sur le Samsung.
**Ne pas envoyer en production. Ne pas fusionner dans `main`.** Production seulement avec son accord écrit.

## Récupérer
1. `git fetch && git checkout video-studio && git pull`
2. **Pas de `expo prebuild`.** `cd native && npm install`
3. Construire une version de test (debug ou release locale) et l'installer sur le Samsung. Si tu fais un AAB pour le test interne Play, utilise un versionCode supérieur au dernier envoyé (12) et note-le.

## Ce qui a changé (côté Android)
- Module natif `native/modules/wipp-video-trim/android/` (Kotlin, **Media3 Transformer 1.4.1**), déclaré dans `expo-module.config.json`.
  - `exportProject` : segments raccordés (jusqu'à 2 vidéos), volume par segment, **vitesse par segment** (`SpeedChangeEffect` + `SonicAudioProcessor`), **filtre couleur** (`Brightness`, `Contrast`, `HslAdjustment`, `RgbAdjustment`), textes temporisés dessinés dans l'image (police, fond, contour, ombre, alignement, rotation, animations Apparition / Fondu / Pop / Glissement), format 720×1280.
  - `filterPreview` : une image filtrée pour l'aperçu Avant / Après.
  - `studioCapabilities` renvoie `speed: true`.
- Écrans : `native/src/screens/video-studio/` (studio, texte, filtres) + bouton « Modifier » dans l'aperçu d'une Story vidéo.
- Éditeur de Story (`StoryLayerEditor.tsx`) : bouton sticker = Wippmoji « chut » (moji-37), boutons abaissés, poubelle sous « Modifier » qui apparaît dès qu'on touche un sticker ou un texte (glisser dessus, ou appui long puis toucher la poubelle), stickers rejoués toutes les ~4,5 s pendant la Story.
- Connexion : les numéros de test fictifs `+1 XXX 555-01XX` passent par Firebase (code fixe), les autres par Twilio.
- Accueil : « Passer » en bas au centre.

## Si Gradle échoue dans `WippVideoTrimModule.kt`
Corrige le minimum (noms d'API Media3, imports) **sans changer le comportement**, et note précisément chaque changement dans ton rapport. Points les plus incertains (jamais compilés) :
- `SpeedChangeEffect` dans une séquence de plusieurs segments (vérifier que les morceaux s'enchaînent sans trou ni chevauchement, et que le son reste synchrone) ;
- `OverlayEffect` / `BitmapOverlay` (textes) : le texte doit apparaître au bon moment même après une vitesse ×2 ;
- `HslAdjustment.Builder().adjustSaturation(...)`, `RgbAdjustment.Builder()`.

## Tests sur le Samsung (avec un compte de test, pas un vrai compte)
1. Story vidéo publiée **sans** « Modifier » : comme avant.
2. « Modifier » → Scinder à 5 s et 10 s → sélectionner le morceau du milieu → Supprimer → Terminé : 5 s de moins, sans écran noir.
3. « Vidéo » : ajouter une 2ᵉ vidéo, Terminé : les deux s'enchaînent.
4. Son : couper un segment, un autre à 40 %.
5. **Vitesse** : un segment à 2× et un à 0,5× ; vérifier la durée finale et la synchro du son.
6. **Texte** : écrire sur la vidéo, valider ✓, déplacer, agrandir/tourner à deux doigts, animation Pop, durée 2 s → 5 s dans la timeline. Dans la vidéo exportée : même place, même taille, seulement entre 2 et 5 s.
7. **Filtres** : Chaleur 80 % puis Noir et blanc ; l'aperçu Avant / Après doit ressembler à la vidéo exportée ; les textes ne sont pas filtrés.
8. Annuler / Rétablir.
9. Story : ajouter un sticker et un texte, les supprimer avec la poubelle sous « Modifier ».
10. Publier une vidéo montée et la regarder depuis un autre compte.

## Rapport
`windows-build/RAPPORT-WINDOWS-STUDIO-VIDEO.md` : ce qui marche, ce qui casse, captures, erreurs Gradle, et logcat (`adb logcat | grep -i -E "wipp|media3|transformer"`). Puis pousser sur `video-studio`.
