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

type Verifier = { salt: string; hash: string };

const listeners = new Set<() => void>();

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

export async function enablePrivateVault(pin: string) {
  if (pin.trim().length < 4) throw new Error("short");
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const hash = await sha256(`${salt}:${pin.trim()}`);
  const verifier: Verifier = { salt, hash };
  await SecureStore.setItemAsync(VERIFIER_KEY, JSON.stringify(verifier));
  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  if (!(await SecureStore.getItemAsync(IDS_KEY))) {
    await SecureStore.setItemAsync(IDS_KEY, "[]");
  }
  emit();
}

async function verifyPin(pin: string) {
  const raw = await SecureStore.getItemAsync(VERIFIER_KEY);
  if (!raw) return false;
  const verifier = JSON.parse(raw) as Verifier;
  const hash = await sha256(`${verifier.salt}:${pin.trim()}`);
  return hash === verifier.hash;
}

export async function authenticatePrivate(askPin: () => Promise<string | null>) {
  if (!(await isPrivateEnabled())) return false;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
  if (enrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "WIPP Privé",
      cancelLabel: "Annuler",
      fallbackLabel: "Code",
      disableDeviceFallback: false,
    });
    if (result.success) return true;
    if (result.error === "user_cancel" || result.error === "system_cancel") return false;
  }
  const pin = await askPin();
  if (!pin) return false;
  return verifyPin(pin);
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
