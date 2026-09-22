# Publier Wipp (comme Lovable)

Tu n’as **pas** besoin d’apprendre Vercel. Tu me dis **« publie »**, je lance le script.

## Une seule fois — 2 tokens gratuits

1. **Vercel** (héberge le site + API messagerie)  
   → https://vercel.com/account/tokens  
   → crée un token → envoie-le-moi comme `VERCEL_TOKEN`

2. **Expo** (mises à jour de l’app sans rebuild store)  
   → https://expo.dev/settings/access-tokens  
   → crée un token → envoie-le-moi comme `EXPO_TOKEN`

`DATABASE_URL` (Supabase) est déjà dans l’environnement local.

## Ensuite — chaque modification

1. Tu me dis la modif  
2. Tu dis **« publie »**  
3. Je lance :

```bash
node scripts/publish-wipp.mjs -m "description courte"
```

Ça fait :
- build + mise en ligne de l’API/site
- **OTA** vers les téléphones (`com.wipp.app`) — **sans** passer par Apple/Google

## Fichiers utiles

| Fichier | Rôle |
|---------|------|
| `.grok/deploy.json` | URL API + projectId Expo (auto) |
| `scripts/publish-wipp.mjs` | commande unique de publish |
| `mobile/app.config.js` | bundle `com.wipp.app` + EAS Update |
| `mobile/eas.json` | canaux `production` / `preview` |

## Quand un rebuild store est nécessaire

Seulement si on change du **natif** (caméra, permissions, Firebase SMS, nouvelle version Expo majeure).  
Sinon → OTA suffit.
