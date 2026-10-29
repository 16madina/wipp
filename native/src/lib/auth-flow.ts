import { tr } from "./tr";
import { confirmSmsCode, currentFirebaseUser, explainSmsError, hasPendingSms, sendSmsCode, signInWithServerToken, signOutFirebase, toE164 } from "./firebase-phone";
import { WIPP_WEB_ORIGIN } from "./firebase-config";
import { clearLinkedSession } from "./firebase-linked-session";
import { demoMe } from "./seed";
import { useWippStore } from "./store";

export type AuthMode = "signup" | "signin";

export { toE164 };

type Pending = {
  phone: string;
  mode: AuthMode;
  /** "termii": code sent by the WIPP server (Africa), checked by the server. */
  via?: "firebase" | "termii";
};

export type CodeChannel = "sms" | "whatsapp" | "voice";
type OtpConfig = { enabled: boolean; prefixes: string[]; whatsapp: boolean; voice: boolean };
let otpConfigCache: { at: number; value: OtpConfig } | null = null;

/** Which countries get their code from the WIPP server (Termii) instead of Firebase SMS. */
export async function otpConfig(): Promise<OtpConfig> {
  if (otpConfigCache && Date.now() - otpConfigCache.at < 5 * 60_000) return otpConfigCache.value;
  try {
    const res = await fetch(`${WIPP_WEB_ORIGIN}/api/wipp/auth/otp/config`);
    const value = (await res.json()) as OtpConfig;
    otpConfigCache = { at: Date.now(), value };
    return value;
  } catch {
    return { enabled: false, prefixes: [], whatsapp: false, voice: false };
  }
}

/** Ways to receive the code for this number (empty = the usual Firebase SMS only). */
export async function codeChannelsFor(rawPhone: string): Promise<CodeChannel[]> {
  const phone = toE164(rawPhone);
  const cfg = await otpConfig();
  if (!phone || !cfg.enabled || !cfg.prefixes.some((p) => phone.startsWith(p))) return [];
  // SMS first; WhatsApp and a voice call as other choices.
  return ["sms", ...(cfg.whatsapp ? (["whatsapp"] as const) : []), ...(cfg.voice ? (["voice"] as const) : [])];
}

async function otpCall<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${WIPP_WEB_ORIGIN}/api/wipp/auth/otp/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(json.message || tr("Le code n’a pas pu être envoyé. Réessaie."));
  return json;
}

let lastChannel: CodeChannel | null = null;
/** How the last code was sent (to tell the person where to look). */
export function lastCodeChannel(): CodeChannel | null {
  return pending?.via === "termii" ? lastChannel : null;
}

export function pendingVia(): "firebase" | "termii" | null {
  return pending?.via ?? null;
}

let pending: Pending | null = null;
let verifiedSignup: { phone: string } | null = null;

export function setVerifiedSignup(value: { phone: string }) {
  verifiedSignup = value;
}
export function getVerifiedSignup() {
  return verifiedSignup;
}

export async function startPhoneCode(rawPhone: string, mode: AuthMode, channel?: CodeChannel): Promise<string | null> {
  const phone = toE164(rawPhone);
  if (!phone) return tr("Numéro invalide. Vérifie l'indicatif et le numéro.");
  // Africa: the code comes from the WIPP server (SMS first, else WhatsApp or a voice call).
  const channels = await codeChannelsFor(phone);
  if (channels.length) {
    try {
      const sent = await otpCall<{ channel?: CodeChannel }>("send", { phone, channel: channel ?? channels[0] });
      // The server may switch WhatsApp to SMS when WhatsApp fails.
      lastChannel = sent.channel ?? channel ?? channels[0];
      pending = { phone, mode, via: "termii" };
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : tr("Le code n’a pas pu être envoyé. Réessaie.");
    }
  }
  try {
    await sendSmsCode(phone);
    pending = { phone, mode, via: "firebase" };
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
  if (!pending) return { error: tr("Code expiré. Renvoie un nouveau code.") };
  if (pending.via === "termii") {
    try {
      const { token } = await otpCall<{ token: string }>("verify", { phone: pending.phone, code });
      await signInWithServerToken(token);
      if (!currentFirebaseUser()) return { error: tr("Code incorrect ou expiré.") };
      return { phone: pending.phone };
    } catch (err) {
      return { error: err instanceof Error ? err.message : tr("Code incorrect ou expiré.") };
    }
  }
  if (!hasPendingSms()) {
    return {
      error:
        tr("Aucun SMS n’a été envoyé. Ce n’est pas ton code WIPP (QR / 6 chiffres pour te connecter à quelqu’un). Demande un texto, puis entre le code reçu."),
    };
  }
  try {
    await confirmSmsCode(code);
    if (!currentFirebaseUser()) {
      return { error: tr("Code SMS incorrect ou expiré. Utilise le dernier texto reçu — pas ton code WIPP.") };
    }
    return { phone: pending.phone };
  } catch {
    return { error: tr("Code SMS incorrect ou expiré. Utilise le dernier texto reçu — pas ton code WIPP.") };
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
