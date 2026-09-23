# Publier Wipp (comme Lovable)

Tu n’as **pas** besoin d’apprendre Vercel. Tu me dis **« publie »**, je lance le script.

## Domaine

**https://wippapp.com** — DNS : voir **[DNS.md](./DNS.md)**

URLs stores :
- https://wippapp.com/privacy
- https://wippapp.com/terms
- https://wippapp.com/support
- https://wippapp.com/site

## Une seule fois — 2 tokens gratuits

1. **Vercel** (héberge le site + API)  
   → https://vercel.com/account/tokens → `VERCEL_TOKEN`

2. **Expo** (OTA sans rebuild store)  
   → https://expo.dev/settings/access-tokens → `EXPO_TOKEN`

`DATABASE_URL` (Supabase) est déjà dans l’environnement local.

Chez GoDaddy, DNS :
| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

## Ensuite — chaque modification

1. Tu me dis la modif  
2. Tu dis **« publie »**  
3. Je lance :

```bash
node scripts/publish-wipp.mjs -m "description courte"
```

Ça fait :
- build + mise en ligne sur **wippapp.com**
- **OTA** vers les téléphones (`com.wipp.app`) — sans Apple/Google

## Fichiers utiles

| Fichier | Rôle |
|---------|------|
| `.grok/deploy.json` | domaine, apiUrl, projectId Expo |
| `DNS.md` | branchement GoDaddy → Vercel |
| `scripts/publish-wipp.mjs` | commande unique de publish |
| `mobile/app.config.js` | bundle `com.wipp.app` + EAS Update |

## Quand un rebuild store est nécessaire

Seulement si on change du **natif** (caméra, permissions, Firebase SMS, nouvelle version Expo majeure).  
Sinon → OTA suffit.
