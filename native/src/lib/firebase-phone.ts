import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  type ApplicationVerifier,
  type Auth,
} from "firebase/auth";
import { Platform } from "react-native";
import { FIREBASE_WEB_CONFIG } from "./firebase-config";

let verifier: (ApplicationVerifier & { _reset?: () => void }) | null = null;
let verificationId: string | null = null;
let webVerifierReady: Promise<ApplicationVerifier> | null = null;

export function setRecaptchaVerifier(next: (ApplicationVerifier & { _reset?: () => void }) | null) {
  verifier = next;
}

export function toE164(raw: string): string | null {
  let p = raw.replace(/[\s().-]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  return /^\+[1-9]\d{6,14}$/.test(p) ? p : null;
}

function firebaseAuth(): Auth {
  const app = getApps()[0] ?? initializeApp(FIREBASE_WEB_CONFIG);
  try {
    initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    // Auth déjà initialisé.
  }
  const auth = getAuth(app);
  auth.languageCode = "fr";
  return auth;
}

function smsSendError(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  if (code.includes("invalid-phone-number")) return "Numéro invalide. Vérifie l'indicatif et le numéro.";
  if (code.includes("too-many-requests") || code.includes("quota")) return "Trop d'essais. Réessaie dans un instant.";
  if (code.includes("network")) return "Réseau indisponible. Réessaie.";
  if (code.includes("captcha") || code.includes("argument-error")) {
    return "Vérification anti-robot impossible ici. Ouvre WIPP sur ton téléphone pour recevoir le SMS.";
  }
  return "Envoi du SMS impossible. Réessaie dans un instant.";
}

async function ensureVerifier(): Promise<ApplicationVerifier> {
  if (verifier) return verifier;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    webVerifierReady ??= (async () => {
      const auth = firebaseAuth();
      let el = document.getElementById("wipp-recaptcha");
      if (!el) {
        el = document.createElement("div");
        el.id = "wipp-recaptcha";
        Object.assign(el.style, { position: "fixed", left: "0", bottom: "0", zIndex: "20" });
        document.body.appendChild(el);
      }
      const { RecaptchaVerifier } = await import("firebase/auth");
      const v = new RecaptchaVerifier(auth, el, { size: "invisible" });
      await v.render();
      verifier = v as ApplicationVerifier & { _reset?: () => void };
      return v;
    })();
    return webVerifierReady;
  }
  throw new Error("La vérification SMS n'est pas encore prête. Réessaie.");
}

export async function sendSmsCode(phone: string): Promise<void> {
  const auth = firebaseAuth();
  const appVerifier = await ensureVerifier();
  const provider = new PhoneAuthProvider(auth);
  verificationId = await provider.verifyPhoneNumber(phone, appVerifier);
}

export async function confirmSmsCode(code: string): Promise<string> {
  if (!verificationId) throw new Error("Code expiré. Renvoie un nouveau code.");
  const auth = firebaseAuth();
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const cred = await signInWithCredential(auth, credential);
  const token = await cred.user.getIdToken();
  await signOut(auth);
  verificationId = null;
  return token;
}

export function hasPendingSms(): boolean {
  return Boolean(verificationId);
}

export function clearSms(): void {
  verificationId = null;
}

export function explainSmsError(err: unknown): string {
  return smsSendError(err);
}
