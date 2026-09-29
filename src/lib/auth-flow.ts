import { confirmSmsCode, explainSmsError, hasPendingSms, sendSmsCode, toE164 } from "./firebase-phone";

export type AuthMode = "signup" | "signin";

type Pending = {
  phone: string;
  mode: AuthMode;
};

let pending: Pending | null = null;
let verifiedSignup: { idToken: string; phone: string } | null = null;

export function setVerifiedSignup(value: { idToken: string; phone: string }) {
  verifiedSignup = value;
}
export function getVerifiedSignup() {
  return verifiedSignup;
}

export async function startPhoneCode(rawPhone: string, mode: AuthMode): Promise<string | null> {
  const phone = toE164(rawPhone);
  if (!phone) return "Numéro invalide. Vérifie l'indicatif et le numéro.";
  // Connexion test : le serveur vérifie le code admin, sans attendre Firebase.
  if (mode === "signin") {
    pending = { phone, mode };
    return null;
  }
  try {
    await sendSmsCode(phone);
    pending = { phone, mode };
    return null;
  } catch (err) {
    console.warn("[wipp] sms send failed", err);
    return explainSmsError(err);
  }
}

export function pendingPhone(): string | null {
  return pending?.phone ?? null;
}

export function pendingHasSms(): boolean {
  return hasPendingSms();
}

export function pendingMode(): AuthMode | null {
  return pending?.mode ?? null;
}

export async function verifyPhoneCode(code: string): Promise<{ idToken: string; phone: string } | { error: string }> {
  if (!pending) return { error: "Code expiré. Renvoie un nouveau code." };
  if (!hasPendingSms()) return { error: "Code incorrect ou expiré." };
  try {
    const idToken = await confirmSmsCode(code);
    return { idToken, phone: pending.phone };
  } catch {
    return { error: "Code incorrect ou expiré." };
  }
}

export function clearPending() {
  pending = null;
  verifiedSignup = null;
}
