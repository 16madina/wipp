import { confirmSmsCode, explainSmsError, hasPendingSms, sendSmsCode, toE164 } from "./firebase-phone";

export type AuthMode = "signup" | "signin";

/** Dev-only bypass. Production always requires the SMS code. */
export const TEST_SIGNIN_PASSWORD = "160184";

export function isTestPhone(phone: string) {
  if (typeof __DEV__ === "undefined" || !__DEV__) return false;
  return toE164(phone) === "+18195803940";
}

export function isTestSigninPassword(code: string, phone: string) {
  if (!isTestPhone(phone)) return false;
  return code.replace(/\s/g, "") === TEST_SIGNIN_PASSWORD;
}

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
  // Local preview only: never request an SMS or create a server session.
  if (isTestPhone(phone)) {
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
  if (!hasPendingSms()) {
    return {
      error:
        "Aucun SMS n’a été envoyé. Ce n’est pas ton code WIPP (QR / 6 chiffres pour te connecter à quelqu’un). Demande un texto, puis entre le code reçu.",
    };
  }
  try {
    const idToken = await confirmSmsCode(code);
    return { idToken, phone: pending.phone };
  } catch {
    return { error: "Code SMS incorrect ou expiré. Utilise le dernier texto reçu — pas ton code WIPP." };
  }
}

export function clearPending() {
  pending = null;
  verifiedSignup = null;
}
