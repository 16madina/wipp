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
import { FIREBASE_WEB_CONFIG } from "./firebase-config";

let verifier: (ApplicationVerifier & { _reset?: () => void }) | null = null;
let verificationId: string | null = null;

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
  if (code.includes("captcha")) return "Vérification anti-robot impossible. Réessaie.";
  return "Envoi du SMS impossible. Réessaie dans un instant.";
}

export async function sendSmsCode(phone: string): Promise<void> {
  if (!verifier) throw new Error("La vérification SMS n'est pas encore prête. Réessaie.");
  const auth = firebaseAuth();
  const provider = new PhoneAuthProvider(auth);
  verificationId = await provider.verifyPhoneNumber(phone, verifier);
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
