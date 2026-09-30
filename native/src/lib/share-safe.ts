const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
const SECRET_WORDS =
  /firebase_uid|auth_user_id|wipp-server-token|Bearer |-----BEGIN|touch.?token|private.?key/i;

/** Liens WIPP destinés au partage (profil, QR, carte, groupe). */
const PUBLIC_WIPP = /^https:\/\/(www\.)?wippapp\.com\/(@[A-Za-z0-9._]+|[tgb]\/[A-Za-z0-9_-]+)/i;

export function isShareSafe(text: string) {
  if (!text.trim()) return false;
  if (JWT.test(text) || SECRET_WORDS.test(text)) return false;
  return true;
}

export function isPublicWippUrl(url: string) {
  return PUBLIC_WIPP.test(url.trim());
}
