# WIPP 1.1 — Étape D : partage d'écran sur Android (pour Claude Windows)

> **Mise à jour du 10 octobre 2026** — remplace la version précédente. Le partage d'écran iPhone est terminé
> et **validé par l'utilisatrice**. L'objectif Android : obtenir exactement le même résultat.

## 0. Règles (à respecter strictement)

- Branche Git : **`wipp-1.1`**. Ne PAS fusionner sur `main`.
- Ne RIEN publier sur Google Play (ni test interne, ni production) sans l'accord explicite de l'utilisatrice.
- Ne pas toucher au build 4 de WIPP 1.0 ni à l'iOS (`native/ios/`, `native/plugins/broadcast/`,
  `native/plugins/withWippBroadcast.js`).
- **Ne pas modifier la disposition du partage** (tailles, plein écran, vignettes, commentaires) : elle est
  validée. Si quelque chose s'affiche mal sur Android, le signaler à l'utilisatrice avant de changer quoi que ce soit.
- Aucun secret dans l'application. Aucun changement serveur n'est nécessaire (le serveur est déjà déployé).
- S'arrêter et demander en cas de doute ou de différence imprévue.

## 1. Ce qui existe déjà (commun iPhone / Android, ne pas réécrire)

Tout le JavaScript est partagé et déjà fait :

- `native/src/screens/event-live-room.tsx` — la salle du direct.
- `native/src/components/LiveScreenShare.tsx` — `ScreenPicker` (iOS seulement), `ScreenStage`,
  `ScreenFullscreen`, `SharingBanner`, `useFrameSize`.
- `native/src/lib/event-live.ts` — appels serveur (`setSharingState`, etc.).

Aujourd'hui, sur Android, `startScreenShare()` (dans `event-live-room.tsx`) s'arrête sur
`Platform.OS !== "ios"` avec le message « Le partage d'écran arrive bientôt sur Android ».
**Un Android peut déjà REGARDER un partage** (la partie spectateur est commune) : il reste à permettre
à un host Android de PARTAGER.

### Comportement validé sur iPhone (le résultat attendu sur Android)

**Spectateur — scène immersive (source verticale)**
- L'écran partagé remplit tout le téléphone, d'un bord à l'autre, sans être coupé ni étiré
  (`objectFit="contain"`, taille calculée d'après la taille réelle des images reçues, `useFrameSize`).
- Le titre, la barre du haut, le champ de saisie et les boutons sont posés par-dessus l'image ; ils se
  masquent seuls après 4 s et reviennent d'un toucher. Ils restent affichés pendant la saisie ou quand un
  panneau est ouvert.
- Zoom à deux doigts directement dans la scène (jusqu'à ×4).

**Spectateur — source horizontale (présentation)**
- L'image est en haut sur toute la largeur, les intervenants en ligne juste dessous, les commentaires en
  liste dans l'espace restant, commandes fixes.
- Bouton doré dans la barre du haut → « Plein écran paysage » : l'image est tournée de 90° pour remplir le
  téléphone tenu à l'horizontale, barre d'état masquée, zoom, « Revenir à la conférence ».

**Intervenants**
- Vignettes flottantes par-dessus l'image, en haut à droite, sans colonne ni bande réservée.
- Déplaçables au doigt ; elles se rangent dans le coin le plus proche (sans passer sous la barre du haut
  ni sous les commandes). Elles rétrécissent à partir de 3 personnes ; 5 personnes sur scène au maximum.

**Commentaires**
- Pendant un partage vertical : les 3 derniers en bulles temporaires en bas à gauche (7 s), fond
  semi-transparent, visibles même quand les commandes sont masquées.
- Nom en doré et en gras, texte en blanc.
- Toucher un commentaire = répondre (« @Nom » pré-rempli, affiché en bleu) ; appui long = menu.

**Host**
- Il ne voit pas son propre écran (miroir infini) : sa caméra reste en grand, avec l'encadré
  « Les spectateurs voient ton écran » et le bandeau rouge « Partage d'écran en cours / Arrêter ».

**Arrêt du partage — jamais d'écran noir**
- La salle écoute `TrackPublished`, `TrackUnpublished`, `TrackSubscribed`, `TrackUnsubscribed`,
  `LocalTrackUnpublished`, etc.
- Une piste d'écran dont `mediaStreamTrack.readyState === "ended"` est ignorée.
- Le host détecte l'arrêt fait par le système et dépublie lui-même la piste.
- Le serveur diffuse `{ t: "sharing", on }` à tous les spectateurs (via `setSharingState`).
- Vérification toutes les 2 s en filet de secours.
- Résultat : la caméra du host redevient l'image principale en moins de 2 s, les invités retrouvent leur
  disposition, sans reconnexion.

**Notifications**
- **Aucune notification push pendant le partage** (décision de l'utilisatrice : les spectateurs pourraient
  la voir). Les questions et mains levées sont enregistrées et visibles dans WIPP au retour du host.
- La tâche planifiée Supabase et le réglage « Me prévenir pendant le partage » ont été supprimés. Ne pas les recréer.
- Les notifications ordinaires de WIPP et les rappels d'événements ne changent pas.

**Autre**
- Quand l'organisateur retire quelqu'un de la scène, la personne voit « Tu n'es plus sur scène ».

### Qualité vidéo (réglages LiveKit déjà en place côté JavaScript)

Dans `startScreenShare()` :

```ts
await room.localParticipant.setScreenShareEnabled(true, undefined, {
  simulcast: false,                                   // une seule version nette, pas de copie à moitié taille
  screenShareEncoding: { maxBitrate: 1_800_000, maxFramerate: 15 },
  degradationPreference: "maintain-resolution",       // la netteté avant la fluidité
});
void keepShareSharp(room);                            // force scaleResolutionDownBy = 1 sur l'encodeur
```

Côté spectateur, la meilleure qualité est demandée pour la piste d'écran (`setVideoQuality(VideoQuality.HIGH)`).
Sur iPhone, le host envoie **664 × 1440** et le spectateur reçoit **664 × 1440** (mesuré).
**Objectif Android : côté long ≈ 1440 px, 15 images/s, texte lisible.**

## 2. Travail à faire sur Android

### 2.1 Remettre le service de capture (MediaProjection)

Le service a été retiré pour l'avertissement Google Play (BOOT_COMPLETED / services de premier plan).

- Dans `native/plugins/withWippAndroidBootFix.js`, la liste `removed` contient
  `"com.oney.WebRTCModule.MediaProjectionService"` → **l'enlever de cette liste** (garder la suppression de
  `expo.modules.location.services.LocationTaskService`).
- Vérifier dans le manifeste final (`native/android/app/src/main/AndroidManifest.xml` après prebuild) :
  ```xml
  <service android:name="com.oney.WebRTCModule.MediaProjectionService"
           android:foregroundServiceType="mediaProjection" android:exported="false" />
  ```
  (le type `mediaProjection` est obligatoire depuis Android 14 / API 34).
- Rappel : `native/android/` est suivi par Git ; un **prebuild Android est requis après toute modification
  de configuration** (plugins, `app.json`).

### 2.2 Permissions (`app.json` → `android.permissions`, puis manifeste)

- `android.permission.FOREGROUND_SERVICE` (déjà présent)
- `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION` (**nouveau**, requis Android 14+)
- `android.permission.POST_NOTIFICATIONS` (déjà demandé : la notification système de capture est obligatoire)
- NE PAS remettre `RECEIVE_BOOT_COMPLETED`.

### 2.3 Activer le bouton sur Android

Dans `startScreenShare()` (`event-live-room.tsx`), remplacer seulement le refus Android :

1. Garder la même alerte d'explication (« Tout ce qui s'affiche sur ton écran sera visible… »).
2. Sur Android, ne pas appeler `pickerRef.current?.open()` (iOS seulement) : appeler directement
   `setScreenShareEnabled(true, undefined, { …mêmes options que ci-dessus… })` puis `keepShareSharp(room)`.
   C'est `getDisplayMedia` qui affiche la fenêtre système Android.
3. Refus de l'utilisateur → `catch` déjà en place : « Le partage d'écran n'a pas pu démarrer… le direct continue ».
4. Ne rien changer d'autre dans ce fichier : l'arrêt, le bandeau, `setSharingState`, la scène spectateur
   sont communs.

### 2.4 Qualité : vérifier, ne pas supposer

Sur Android, la capture donne en général l'écran en pleine définition (par ex. 1080 × 2400), plus que sur
iPhone. À vérifier **par mesure** (statistiques de l'encodeur : `track.getSenderStats()` →
`frameWidth` / `frameHeight`, et taille reçue côté spectateur via `onDimensionsChange`) :

- Si le côté long envoyé dépasse nettement 1440 px, le limiter à ≈ 1440 (par exemple avec
  `scaleResolutionDownBy` calculé dans `keepShareSharp` pour Android uniquement), pour garder la fluidité
  à 1,8 Mb/s. Ne pas modifier le comportement iOS.
- Si le spectateur reçoit moins que ce qui est envoyé, chercher la cause avant de corriger
  (sur iPhone, c'était la copie « simulcast » à moitié taille).
- Les chiffres de test ont été retirés de l'interface iPhone : pour mesurer, les afficher temporairement
  puis **les retirer avant de rendre le travail**.

### 2.5 Arrêt depuis Android

L'utilisateur peut arrêter depuis la notification système ou la barre d'état. Vérifier que la piste passe
bien à `ended` et que le host la dépublie (code commun : `readyState === "ended"` →
`setScreenShareEnabled(false)`), puis que le service de premier plan et sa notification disparaissent.
Quitter ou terminer le direct pendant un partage doit aussi tout arrêter.

## 3. Tests (Samsung + un iPhone)

Faire chaque test dans les deux sens quand c'est possible (Android host → iPhone spectateur, et
iPhone host → Android spectateur).

1. **Démarrage** : Plus → Partager l'écran → fenêtre système → autoriser → bandeau rouge chez le host.
2. **Scène immersive** : chez le spectateur, l'image verticale remplit tout l'écran, sans bande ni
   déformation ; les commandes se masquent après 4 s et reviennent d'un toucher.
3. **Netteté** : relever la taille envoyée et la taille reçue (objectif ≈ 1440 px sur le côté long) ; un
   texte de page web doit être lisible.
4. **Fluidité et stabilité** : 10 minutes de partage en changeant d'app et en faisant défiler des pages,
   sans arrêt spontané.
5. **Vignettes** : flottantes en haut à droite, déplaçables, jusqu'à 5 personnes sur scène.
6. **Commentaires** : bulles temporaires, nom doré, réponse par toucher (« @Nom » en bleu).
7. **Présentation horizontale** : image en haut, plein écran paysage tourné, zoom.
8. **Questions et mains levées pendant le partage** : enregistrées, **aucune notification push** chez le host.
9. **Arrêt** depuis WIPP, puis depuis la notification Android : caméra du host en grand en moins de 2 s,
   pas d'écran noir, disposition d'avant retrouvée, toast « Partage d'écran arrêté ».
10. **Avec intervenants** : refaire le test 9 avec un invité sur scène.
11. **Refus de l'autorisation** : message clair, le direct continue.
12. **Fin du direct pendant un partage** : tout s'arrête proprement, plus de notification.
13. **Non-régression** : appels WIPP ordinaires, messagerie et notifications ordinaires inchangés.

## 4. Google Play (à préparer, NE PAS envoyer sans accord)

- Play Console → Contenu de l'application → **Services de premier plan** : déclarer `mediaProjection`
  avec la justification : « Partage d'écran volontaire de l'organisateur pendant une conférence en direct
  WIPP (présentation, démonstration). Démarré uniquement par l'utilisateur, notification visible pendant
  toute la durée, aucun enregistrement. »
- Joindre une **courte vidéo** (30–60 s) : bouton Partager l'écran → fenêtre système → notification → arrêt.
- Mettre à jour la politique de confidentialité si nécessaire (aucun enregistrement, flux en temps réel).

## 5. Rapport à donner à l'utilisatrice

1. Commit récupéré sur `wipp-1.1` et commits ajoutés.
2. Build : OK ou erreur exacte.
3. Manifeste : service MediaProjection avec `foregroundServiceType="mediaProjection"`, permission
   `FOREGROUND_SERVICE_MEDIA_PROJECTION`, pas de `BOOT_COMPLETED`.
4. Taille envoyée et taille reçue mesurées (Android host), et réglage retenu.
5. Résultat des tests 1 à 13, un par un, avec ce qui n'a pas pu être testé.
6. Toute différence d'affichage constatée sur Android, **sans l'avoir corrigée dans la disposition**.
