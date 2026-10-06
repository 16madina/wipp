/**
 * WIPP Privé — coffre local à cet appareil.
 * Ids + vérificateur dans Keystore / Keychain (expo-secure-store).
 * Jamais de code en clair, jamais de flag hidden côté serveur.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { noticeForChat, type IncomingNotice } from "./notify-redact";
import {
  createVerifier,
  lockRemaining,
  nextLock,
  verifierMatches,
  type LockState,
  type PinVerifier,
} from "./private-crypto";

const IDS_KEY = "wipp-prive-ids-v1";
const VERIFIER_KEY = "wipp-prive-verifier-v1";
const ENABLED_KEY = "wipp-prive-enabled-v1";
const LOCK_KEY = "wipp-prive-lock-v1";
const BIO_KEY = "wipp-prive-bio-v1";

const STORE = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const listeners = new Set<() => void>();
let cachedEnabled = false;
let cachedIds: string[] = [];
let cachedBio = false;
let sessionUnlocked = false;
let lastWaitMs = 0;
let hydrated = false;

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribePrivateVault(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function lastPinWaitMs() {
  return lastWaitMs;
}

export function isPrivateEnabled() {
  return cachedEnabled;
}

export function privateChatIds() {
  return cachedEnabled ? cachedIds : [];
}

export function isPrivateChat(id: string) {
  return cachedEnabled && cachedIds.includes(id);
}

export function isPrivateSessionUnlocked() {
  return sessionUnlocked;
}

export function lockPrivateSession() {
  if (!sessionUnlocked) return;
  sessionUnlocked = false;
  emit();
}

export function markPrivateUnlocked() {
  sessionUnlocked = true;
  emit();
}

export function isBiometricPreferred() {
  return cachedBio;
}

async function put(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, STORE);
}

async function read(key: string) {
  try {
    return await SecureStore.getItemAsync(key, STORE);
  } catch {
    return null;
  }
}

async function drop(key: string) {
  try {
    await SecureStore.deleteItemAsync(key, STORE);
  } catch {
    /* missing */
  }
}

async function persistCache() {
  await put(ENABLED_KEY, cachedEnabled ? "1" : "0");
  await put(IDS_KEY, JSON.stringify(cachedIds));
  await put(BIO_KEY, cachedBio ? "1" : "0");
}

export async function hydratePrivateVault() {
  const enabled = (await read(ENABLED_KEY)) === "1";
  let ids: string[] = [];
  try {
    const raw = await read(IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    ids = [];
  }
  cachedEnabled = enabled;
  cachedIds = ids;
  cachedBio = (await read(BIO_KEY)) === "1";
  hydrated = true;
  emit();
}

export function isVaultHydrated() {
  return hydrated;
}

async function readLock(): Promise<LockState> {
  try {
    const raw = await read(LOCK_KEY);
    if (!raw) return { fails: 0, until: 0 };
    const parsed = JSON.parse(raw) as LockState;
    return { fails: parsed.fails || 0, until: parsed.until || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

export type BiometricHardware = {
  hasHardware: boolean;
  enrolled: boolean;
  types: string[];
};

export async function inspectBiometricHardware(): Promise<BiometricHardware> {
  if (Platform.OS === "web") return { hasHardware: false, enrolled: false, types: [] };
  try {
    const LocalAuthentication = await import("expo-local-authentication");
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const types = hasHardware
      ? (await LocalAuthentication.supportedAuthenticationTypesAsync()).map(String)
      : [];
    return { hasHardware, enrolled, types };
  } catch {
    return { hasHardware: false, enrolled: false, types: [] };
  }
}

export async function biometricAvailable() {
  const hw = await inspectBiometricHardware();
  return hw.hasHardware && hw.enrolled;
}

export type BiometricOutcome = "success" | "cancel" | "unavailable" | "failed";

/**
 * Face ID / empreinte first, then the iPhone's own passcode if Face ID fails or is not set up
 * (used for « Code oublié ? »: whoever knows how to unlock this phone may set a new code).
 */
export async function authenticateDeviceOwner(promptMessage: string): Promise<BiometricOutcome> {
  if (Platform.OS === "web") return "unavailable";
  try {
    const LocalAuthentication = await import("expo-local-authentication");
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return "unavailable";
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Annuler",
      fallbackLabel: "Utiliser le code de l’iPhone",
      disableDeviceFallback: false,
    });
    if (result.success) return "success";
    const err = result.error ?? "";
    if (err === "user_cancel" || err === "system_cancel" || err === "app_cancel") return "cancel";
    if (err === "not_enrolled" || err === "not_available" || err === "passcode_not_set") return "unavailable";
    return "failed";
  } catch {
    return "unavailable";
  }
}

export async function authenticateBiometric(promptMessage = "WIPP Privé", fallbackLabel?: string): Promise<BiometricOutcome> {
  if (Platform.OS === "web") return "unavailable";
  const hw = await inspectBiometricHardware();
  if (!hw.hasHardware || !hw.enrolled) return "unavailable";
  try {
    const LocalAuthentication = await import("expo-local-authentication");
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Annuler",
      // iOS shows this button after a failed Face ID try; the app then asks for its own code.
      ...(fallbackLabel ? { fallbackLabel } : {}),
      disableDeviceFallback: true,
    });
    if (result.success) return "success";
    const err = result.error ?? "";
    if (err === "user_cancel" || err === "system_cancel" || err === "app_cancel") return "cancel";
    if (err === "not_enrolled" || err === "not_available" || err === "passcode_not_set") return "unavailable";
    return "failed";
  } catch {
    return "unavailable";
  }
}

export async function setBiometricPreferred(on: boolean) {
  cachedBio = on;
  await persistCache();
  emit();
}

export async function enablePrivateVault(pin: string, preferBio = false) {
  const verifier = createVerifier(pin);
  await put(VERIFIER_KEY, JSON.stringify(verifier));
  cachedEnabled = true;
  cachedBio = preferBio;
  if (!cachedIds.length) cachedIds = [];
  await persistCache();
  await drop(LOCK_KEY);
  lastWaitMs = 0;
  emit();
}

export async function replacePrivateCode(pin: string) {
  const verifier = createVerifier(pin);
  await put(VERIFIER_KEY, JSON.stringify(verifier));
  await drop(LOCK_KEY);
  lastWaitMs = 0;
  emit();
}

export async function verifyPin(pin: string): Promise<{ ok: true } | { ok: false; waitMs: number }> {
  const lock = await readLock();
  const remaining = lockRemaining(lock);
  if (remaining > 0) {
    lastWaitMs = remaining;
    return { ok: false, waitMs: remaining };
  }
  const raw = await read(VERIFIER_KEY);
  if (!raw) return { ok: false, waitMs: 0 };
  const verifier = JSON.parse(raw) as PinVerifier;
  if (verifierMatches(pin, verifier)) {
    lastWaitMs = 0;
    await drop(LOCK_KEY);
    return { ok: true };
  }
  const next = nextLock(lock);
  lastWaitMs = next.until - Date.now();
  await put(LOCK_KEY, JSON.stringify(next));
  return { ok: false, waitMs: lastWaitMs };
}

export async function authenticatePrivate(askPin: () => Promise<string | null>) {
  if (!cachedEnabled) return false;
  lastWaitMs = 0;
  if (cachedBio) {
    const bio = await authenticateBiometric();
    if (bio === "success") {
      markPrivateUnlocked();
      return true;
    }
    if (bio === "cancel") return false;
  }
  const pin = await askPin();
  if (!pin) return false;
  const checked = await verifyPin(pin);
  if (checked.ok) {
    markPrivateUnlocked();
    return true;
  }
  return false;
}

function serverChatId(chatId: string) {
  return chatId.startsWith("srv:") ? chatId.slice(4) : chatId;
}

function syncGenericNotify(chatId: string, on: boolean) {
  if (!chatId.startsWith("srv:")) return;
  void import("./messaging/client").then(({ postChatPrefs }) =>
    postChatPrefs(serverChatId(chatId), { genericNotify: on }),
  );
}

export async function lockChatPrivate(chatId: string, askPin: () => Promise<string | null>) {
  if (!cachedEnabled) return false;
  if (!sessionUnlocked && !(await authenticatePrivate(askPin))) return false;
  cachedIds = [...new Set([...cachedIds, chatId])];
  await persistCache();
  emit();
  syncGenericNotify(chatId, true);
  return true;
}

export async function unlockChatFromPrivate(chatId: string, askPin: () => Promise<string | null>) {
  if (!sessionUnlocked && !(await authenticatePrivate(askPin))) return false;
  cachedIds = cachedIds.filter((id) => id !== chatId);
  await persistCache();
  emit();
  syncGenericNotify(chatId, false);
  return true;
}

export function privateNotice(chatId: string, incoming: Omit<IncomingNotice, "chatId"> = {}) {
  return noticeForChat(chatId, incoming, isPrivateChat(chatId));
}

void hydratePrivateVault();
