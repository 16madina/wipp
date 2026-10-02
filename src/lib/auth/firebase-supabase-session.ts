/**
 * Ancien pont Firebase → grant_type=id_token. Désactivé : l'identité est
 * l'OTP téléphone Supabase. Cet échange ne part plus vers GoTrue.
 */
export class FirebaseProviderUnconfigured extends Error {
  constructor() {
    super("firebase_provider_unconfigured");
    this.name = "FirebaseProviderUnconfigured";
  }
}

export type SupabaseSessionTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

const AUTH_UID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `sub` of a Supabase Auth access token. Must be the auth.users UUID. */
export function subjectFromSupabaseAccessToken(accessToken: string): string {
  const part = accessToken.split(".")[1];
  if (!part) throw new Error("bad_access_token");
  const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { sub?: unknown };
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!AUTH_UID.test(sub)) throw new Error("auth_uid_not_uuid");
  return sub;
}

export async function exchangeFirebaseIdToken(_idToken: string): Promise<SupabaseSessionTokens> {
  throw new FirebaseProviderUnconfigured();
}
