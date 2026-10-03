/**
 * Turns a technical (often English) error into a short French sentence for the screen.
 * French messages written by WIPP pass through unchanged.
 */
const RULES: [RegExp, string][] = [
  [/not available on web|native dependencies|is not a function/i, "Cette action n’est pas disponible dans le navigateur. Essaie depuis l’app sur ton téléphone."],
  [/network request failed|failed to fetch|networkerror|load failed|timeout|timed out|offline/i, "Pas de connexion. Vérifie ton réseau et réessaie."],
  [/jwt|token.*(expired|invalid)|not authenticated|unauthori[sz]ed|\b401\b|no_session|session/i, "Ta session a expiré. Reconnecte-toi."],
  [/permission|forbidden|\b403\b|row-level security|rls/i, "Tu n’as pas l’autorisation de faire ça."],
  [/payload too large|entity too large|\b413\b|too big|file size/i, "Fichier trop lourd. Choisis une image plus légère."],
  [/not found|\b404\b/i, "Élément introuvable. Il a peut-être été supprimé."],
  [/duplicate|already exists|unique constraint|\b409\b/i, "Ça existe déjà."],
  [/rate limit|too many requests|\b429\b/i, "Trop d’essais. Patiente un instant et réessaie."],
  [/\b5\d\d\b|internal server error|bad gateway|service unavailable/i, "Le serveur ne répond pas. Réessaie dans un instant."],
  [/cancel+ed|aborted/i, "Action annulée."],
];

// Rough French check: accents or common French words.
const looksFrench = (s: string) => /[éèêàçùâîôû’]|\b(le|la|les|de|du|des|une?|est|pas|impossible|requis|choisis|indique)\b/i.test(s);

export function frError(message: string | undefined | null, fallback = "Une erreur est survenue. Réessaie."): string {
  const m = (message ?? "").trim();
  if (!m) return fallback;
  for (const [re, fr] of RULES) if (re.test(m)) return fr;
  return looksFrench(m) ? m : fallback;
}

/** `catch (err)` helper: French message for any thrown value. */
export function errorText(err: unknown, fallback?: string) {
  return frError(err instanceof Error ? err.message : typeof err === "string" ? err : "", fallback);
}
