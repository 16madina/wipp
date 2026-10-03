import { confirmSmsCode, currentFirebaseUser, explainSmsError, hasPendingSms, sendSmsCode, signOutFirebase, toE164 } from "./firebase-phone";
import { clearLinkedSession } from "./firebase-linked-session";
import { demoMe } from "./seed";
import { useWippStore } from "./store";

export type AuthMode = "signup" | "signin";

export { toE164 };

type Pending = {
  phone: string;
  mode: AuthMode;
};

let pending: Pending | null = null;
let verifiedSignup: { phone: string } | null = null;

export function setVerifiedSignup(value: { phone: string }) {
  verifiedSignup = value;
}
export function getVerifiedSignup() {
  return verifiedSignup;
}

export async function startPhoneCode(rawPhone: string, mode: AuthMode): Promise<string | null> {
  const phone = toE164(rawPhone);
  if (!phone) return "Numéro invalide. Vérifie l'indicatif et le numéro.";
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

export async function verifyPhoneCode(code: string): Promise<{ phone: string } | { error: string }> {
  if (!pending) return { error: "Code expiré. Renvoie un nouveau code." };
  if (!hasPendingSms()) {
    return {
      error:
        "Aucun SMS n’a été envoyé. Ce n’est pas ton code WIPP (QR / 6 chiffres pour te connecter à quelqu’un). Demande un texto, puis entre le code reçu.",
    };
  }
  try {
    await confirmSmsCode(code);
    if (!currentFirebaseUser()) {
      return { error: "Code SMS incorrect ou expiré. Utilise le dernier texto reçu — pas ton code WIPP." };
    }
    return { phone: pending.phone };
  } catch {
    return { error: "Code SMS incorrect ou expiré. Utilise le dernier texto reçu — pas ton code WIPP." };
  }
}

export function clearPending() {
  pending = null;
  verifiedSignup = null;
}

/** Leave the current phone session so a new account can collect its own name, username and photo. */
export async function startFreshSignup() {
  pending = { phone: "", mode: "signup" };
  verifiedSignup = null;
  try {
    await signOutFirebase();
  } catch {
    /* no firebase user yet */
  }
  try {
    await clearLinkedSession();
  } catch {
    /* nothing cached */
  }
  const blank = demoMe();
  useWippStore.setState({
    onboarded: false,
    serverUsername: null,
    serverProfileId: null,
    pendingSignup: { mode: "signup", country: useWippStore.getState().pendingSignup.country ?? "CI" },
    me: {
      ...blank,
      firstName: "",
      lastName: "",
      displayName: "",
      username: "",
      avatar: "",
      phone: "",
      email: "",
      bio: "",
    },
  });
}
