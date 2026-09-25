/**
 * WIPP Privé — coffre propre à cet appareil.
 * Ids + vérificateur de code dans le Keystore / Keychain (expo-secure-store).
 * Jamais de code en clair, jamais de flag hidden dans Supabase.
 */
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const IDS_KEY = "wipp-prive-ids-v1";
const VERIFIER_KEY = "wipp-prive-verifier-v1";
const ENABLED_KEY = "wipp-prive-enabled-v1";
const LOCK_KEY = "wipp-prive-lock-v1";

type Verifier = { salt: string; hash: string };
type LockState = { fails: number; until: number };

const WAIT_MS = [0, 1_000, 2_000, 5_000, 15_000, 30_000, 60_000];

const listeners = new Set<() => void>();
let lastWaitMs = 0;

export function lastPinWaitMs() {
  return lastWaitMs;
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribePrivateVault(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isPrivateEnabled() {
  return (await SecureStore.getItemAsync(ENABLED_KEY)) === "1";
}

export async function privateChatIds(): Promise<string[]> {
  if (!(await isPrivateEnabled())) return [];
  try {
    const raw = await SecureStore.getItemAsync(IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function biometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

async function readLock(): Promise<LockState> {
  try {
    const raw = await SecureStore.getItemAsync(LOCK_KEY);
    if (!raw) return { fails: 0, until: 0 };
    const parsed = JSON.parse(raw) as LockState;
    return { fails: parsed.fails || 0, until: parsed.until || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

function waitForFails(fails: number) {
  return WAIT_MS[Math.min(fails, WAIT_MS.length - 1)] ?? 60_000;
}

async function noteFailure() {
  const cur = await readLock();
  const fails = cur.fails + 1;
  const until = Date.now() + waitForFails(fails);
  await SecureStore.setItemAsync(LOCK_KEY, JSON.stringify({ fails, until }));
  return until - Date.now();
}

async function noteSuccess() {
  await SecureStore.deleteItemAsync(LOCK_KEY);
}

export async function enablePrivateVault(pin: string) {
  await writeVerifier(pin);
  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  if (!(await SecureStore.getItemAsync(IDS_KEY))) {
    await SecureStore.setItemAsync(IDS_KEY, "[]");
  }
  await noteSuccess();
  emit();
}

/** Remplace uniquement le vérificateur. Les conversations masquées restent. */
export async function replacePrivateCode(pin: string) {
  await writeVerifier(pin);
  await noteSuccess();
}

async function writeVerifier(pin: string) {
  const code = pin.trim();
  if (code.length < 4) throw new Error("short");
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = [...saltBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await sha256(`${salt}:${code}`);
  const verifier: Verifier = { salt, hash };
  await SecureStore.setItemAsync(VERIFIER_KEY, JSON.stringify(verifier));
}

export async function verifyPin(pin: string): Promise<{ ok: true } | { ok: false; waitMs: number }> {
  const lock = await readLock();
  const remaining = lock.until - Date.now();
  if (remaining > 0) {
    lastWaitMs = remaining;
    return { ok: false, waitMs: remaining };
  }
  const raw = await SecureStore.getItemAsync(VERIFIER_KEY);
  if (!raw) return { ok: false, waitMs: 0 };
  const verifier = JSON.parse(raw) as Verifier;
  const hash = await sha256(`${verifier.salt}:${pin.trim()}`);
  if (hash === verifier.hash) {
    lastWaitMs = 0;
    await noteSuccess();
    return { ok: true };
  }
  const waitMs = await noteFailure();
  lastWaitMs = waitMs;
  return { ok: false, waitMs };
}

export type BiometricOutcome = "success" | "cancel" | "unavailable";

/** Biométrie de l'appareil seulement — jamais le code de déverrouillage du téléphone. */
export async function authenticateBiometric(): Promise<BiometricOutcome> {
  if (!(await biometricAvailable())) return "unavailable";
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "WIPP Privé",
    cancelLabel: "Annuler",
    disableDeviceFallback: true,
  });
  if (result.success) return "success";
  if (
    result.error === "not_available" ||
    result.error === "not_enrolled" ||
    result.error === "lockout"
  ) {
    return "unavailable";
  }
  return "cancel";
}

export async function authenticatePrivate(askPin: () => Promise<string | null>) {
  if (!(await isPrivateEnabled())) return false;
  lastWaitMs = 0;
  const bio = await authenticateBiometric();
  if (bio === "success") return true;
  if (bio === "cancel") return false;
  const pin = await askPin();
  if (!pin) return false;
  const checked = await verifyPin(pin);
  return checked.ok;
}

export async function lockChatPrivate(chatId: string, askPin: () => Promise<string | null>) {
  if (!(await authenticatePrivate(askPin))) return false;
  const next = [...new Set([...(await privateChatIds()), chatId])];
  await SecureStore.setItemAsync(IDS_KEY, JSON.stringify(next));
  emit();
  return true;
}

export async function unlockChatFromPrivate(chatId: string, askPin: () => Promise<string | null>) {
  if (!(await authenticatePrivate(askPin))) return false;
  const next = (await privateChatIds()).filter((id) => id !== chatId);
  await SecureStore.setItemAsync(IDS_KEY, JSON.stringify(next));
  emit();
  return true;
}
