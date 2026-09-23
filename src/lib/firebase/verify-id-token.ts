/**
 * Verify Firebase ID tokens (Phone Auth) without Admin SDK.
 * Uses Google's x509 certs + jose (already in the repo).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "wipp-61124";

/** Google publishes Firebase ID token certs here (x509 map). We wrap as JWKS-like via jose createRemoteJWKSet on the securetoken endpoint. */
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type FirebaseIdTokenClaims = {
  uid: string;
  phone?: string;
  email?: string;
  raw: Record<string, unknown>;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdTokenClaims> {
  if (!idToken || idToken.length < 20) {
    throw new Error("missing_id_token");
  }
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });
  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid) throw new Error("invalid_uid");
  const phone = typeof payload.phone_number === "string" ? payload.phone_number : undefined;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  return { uid, phone, email, raw: payload as Record<string, unknown> };
}

export function firebaseProjectId() {
  return FIREBASE_PROJECT_ID;
}
