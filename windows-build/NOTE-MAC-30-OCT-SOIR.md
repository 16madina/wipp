# Note de Claude Mac — 30 octobre (soir)

Tout est sur `main` (identique à `video-studio`). Pas de `expo prebuild`, `cd native && npm install`.

## Nouveau depuis la note précédente
- **WIPP Touch** : en haut de l'écran « Comment utiliser WIPP Touch ? » + bouton « ▶ Tutoriel » en bas → vidéo plein écran (`native/assets/tutorials/wipp-touch.mp4`, `TouchTutorial` dans `native/src/screens/connect.tsx`, expo-video). À vérifier sur le Samsung : la vidéo se lance, le bouton ✕ et le retour Android la ferment.
- **WIPP Touch plus sensible** : seuil natif 0,5 g, envoi dès 0,6 g, anti-secousse (module `wipp-touch-native`, côté Android aussi). Réglage serveur appliqué : les deux chocs peuvent être séparés de 5 s (`bumpWindowMs` 5000).
- **Présence « en ligne »** : ping toutes les 15 s, fenêtre serveur 40 s (déployé). Réglages de confidentialité par contact dans les infos de la conversation.
- **Demandes envoyées** (onglet « Envoyées ») + notification quand une demande est acceptée.
- **Écran de bienvenue** après inscription / « Bon retour sur WIPP » après reconnexion.

## Tests Samsung à ajouter
1. WIPP Touch entre le Samsung et l'iPhone 15 (deux comptes pas encore en contact) : un choc léger simultané doit suffire.
2. Tutoriel WIPP Touch : lecture et fermeture.
3. Point vert « en ligne » qui apparaît et disparaît (environ 40 s après la fermeture de l'app).

Rapport dans `windows-build/`, à pousser sur `video-studio`.
