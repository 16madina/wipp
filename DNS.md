# DNS — wippapp.com → Vercel

Registrar détecté : **GoDaddy** (`ns57` / `ns58.domaincontrol.com`).

## URLs stores (à coller dans Apple / Google)

| Champ | URL |
|--------|-----|
| Site marketing | https://wippapp.com/site |
| Confidentialité | https://wippapp.com/privacy |
| Conditions | https://wippapp.com/terms |
| Support | https://wippapp.com/support |
| Connexion web | https://wippapp.com/connect |

Email support : `support@wippapp.com`

## Étapes (ordre)

### 1. Token Vercel (one-shot)
https://vercel.com/account/tokens → crée un token → envoie-le-moi (`VERCEL_TOKEN`).

Avec ça je peux :
- publier le site
- ajouter le domaine `wippapp.com` + `www.wippapp.com` au projet

### 2. DNS chez GoDaddy
Dans **DNS Management** pour `wippapp.com`, mets :

| Type | Nom | Valeur |
|------|-----|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

Supprime les anciens enregistrements A/CNAME parking (souvent `15.197…` / `3.33…`) s’ils conflictent.

Propagation : souvent quelques minutes, parfois jusqu’à ~1 h.

### 3. Publish
Quand le token est là : je lance `npm run publish` → le site répond sur **https://wippapp.com**.

### 4. (Optionnel) Expo token
Pour les updates OTA de l’app : `EXPO_TOKEN` → https://expo.dev/settings/access-tokens

## Vérifier

```bash
dig +short wippapp.com A
# attendu après bascule : 76.76.21.21

curl -I https://wippapp.com/privacy
```
