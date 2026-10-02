import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  type ApplicationVerifier,
  type Auth,
  type Persistence,
} from "firebase/auth";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { FIREBASE_WEB_CONFIG } from "./firebase-config";

const CHUNK = 1800;

/** SecureStore n'accepte que [A-Za-z0-9._-]. Les clés Firebase contiennent « : ». */
function secureKey(key: string) {
  const safe = key.replace(/[^A-Za-z0-9._-]/g, (ch) => `_${ch.charCodeAt(0).toString(16)}_`);
  return safe.length > 0 ? safe : "firebase_auth";
}

function chunkCountKey(key: string) {
  return `${secureKey(key)}.n`;
}
function chunkKey(key: string, index: number) {
  return `${secureKey(key)}.${index}`;
}

const firebaseStateStore = {
  async getItem(key: string): Promise<string | null> {
    const raw = await SecureStore.getItemAsync(chunkCountKey(key));
    const n = raw ? Number(raw) : 0;
    if (!Number.isFinite(n) || n <= 0) return SecureStore.getItemAsync(secureKey(key));
    let out = "";
    for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(chunkKey(key, i))) ?? "";
    return out || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await this.removeItem(key);
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(secureKey(key), value);
      return;
    }
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(chunkCountKey(key), String(n));
  },
  async removeItem(key: string): Promise<void> {
    const raw = await SecureStore.getItemAsync(chunkCountKey(key));
    const n = raw ? Number(raw) : 0;
    if (Number.isFinite(n) && n > 0) {
      for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
      await SecureStore.deleteItemAsync(chunkCountKey(key));
    }
    await SecureStore.deleteItemAsync(secureKey(key));
  },
};

/** Firebase writes its own user record here. The ID token is not stored as the session. */
function nativeFirebasePersistence(): Persistence {
  const storage = firebaseStateStore;
  class NativeFirebasePersistence {
    static type = "LOCAL" as const;
    type = "LOCAL" as const;
    async _isAvailable() {
      try {
        await storage.setItem("firebase-auth-available", "1");
        await storage.removeItem("firebase-auth-available");
        return true;
      } catch {
        return false;
      }
    }
    _set(key: string, value: unknown) {
      return storage.setItem(key, JSON.stringify(value));
    }
    async _get<T>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? (JSON.parse(json) as T) : null;
    }
    _remove(key: string) {
      return storage.removeItem(key);
    }
    _addListener() {}
    _removeListener() {}
  }
  return NativeFirebasePersistence as unknown as Persistence;
}

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
    initializeAuth(app, {
      persistence: Platform.OS === "web" ? browserLocalPersistence : nativeFirebasePersistence(),
    });
  } catch {
    // Auth déjà initialisé.
  }
  const auth = getAuth(app);
  auth.languageCode = "fr";
  return auth;
}

export function currentFirebaseUser() {
  return firebaseAuth().currentUser;
}

export function watchFirebaseUser(onUser: (user: ReturnType<typeof currentFirebaseUser>) => void) {
  return onAuthStateChanged(firebaseAuth(), onUser);
}

/** Resolves only after Firebase has finished restoring its persisted user. */
export async function waitForFirebaseUser() {
  const auth = firebaseAuth();
  await auth.authStateReady();
  return auth.currentUser;
}

function tokenRole(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof json.role === "string" ? json.role : undefined;
  } catch {
    return undefined;
  }
}

let forcedRoleRefresh = false;

/**
 * Firebase refreshes an expired ID token from the persisted user.
 * A forced refresh runs at most once per launch, and only when the
 * role claim is still missing. It does not send an SMS.
 */
export async function firebaseIdToken(): Promise<string | null> {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  let token = await user.getIdToken();
  if (token && tokenRole(token) !== "authenticated" && !forcedRoleRefresh) {
    forcedRoleRefresh = true;
    token = await user.getIdToken(true);
  }
  if (token) console.log("[wipp] firebase role", tokenRole(token) ?? "absent");
  return token;
}

export async function signOutFirebase() {
  const auth = firebaseAuth();
  if (auth.currentUser) await signOut(auth);
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

export async function confirmSmsCode(code: string): Promise<void> {
  if (!verificationId) throw new Error("Code expiré. Renvoie un nouveau code.");
  const auth = firebaseAuth();
  const credential = PhoneAuthProvider.credential(verificationId, code.trim());
  const cred = await signInWithCredential(auth, credential);
  if (!cred.user) throw new Error("Code SMS incorrect ou expiré.");
  // Force one refresh so a role claim already written by Firebase is visible.
  // The claim itself is never set on the device.
  await cred.user.getIdToken(true);
  verificationId = null;
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
