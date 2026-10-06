/**
 * Conversations verrouillées — distinct de WIPP Privé.
 * La conversation reste visible dans Chats (nom + photo), mais son contenu demande le code
 * de verrouillage (ou la biométrie). Code propre à cet appareil : vérificateur PBKDF2 dans
 * Keychain / Keystore, jamais de code en clair, rien côté serveur à part « notification générique ».
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { authenticateBiometric } from "./private-vault";
import { createVerifier, lockRemaining, nextLock, verifierMatches, type LockState, type PinVerifier } from "./private-crypto";

const VERIFIER_KEY = "wipp-chatlock-verifier-v1";
const IDS_KEY = "wipp-chatlock-ids-v1";
const LOCK_KEY = "wipp-chatlock-wait-v1";
const BIO_KEY = "wipp-chatlock-bio-v1";

const STORE = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const listeners = new Set<() => void>();
let hasCode = false;
let ids: string[] = [];
let bio = false;
/** Chats opened with the code, until they are left or the app goes to the background. */
const unlocked = new Set<string>();
let lastWait = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeChatLock(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Web preview only (no Keychain in a browser): sessionStorage so the flow can be tried on the Mac.
const web = Platform.OS === "web";
const webStore = () => (globalThis as { sessionStorage?: Storage }).sessionStorage;

async function put(key: string, value: string) {
  if (web) return void webStore()?.setItem(key, value);
  await SecureStore.setItemAsync(key, value, STORE);
}
async function read(key: string) {
  try {
    if (web) return webStore()?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key, STORE);
  } catch {
    return null;
  }
}
async function drop(key: string) {
  try {
    if (web) return void webStore()?.removeItem(key);
    await SecureStore.deleteItemAsync(key, STORE);
  } catch {
    /* missing */
  }
}

export async function hydrateChatLock() {
  hasCode = Boolean(await read(VERIFIER_KEY));
  try {
    const raw = await read(IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    ids = [];
  }
  bio = (await read(BIO_KEY)) === "1";
  emit();
}

export const hasLockCode = () => hasCode;
export const isChatLocked = (chatId: string) => hasCode && ids.includes(chatId);
export const isChatUnlocked = (chatId: string) => unlocked.has(chatId);
export const lockBiometricOn = () => bio;
export const lastLockWaitMs = () => lastWait;

/** Create or replace the lock code. */
export async function setLockCode(pin: string) {
  await put(VERIFIER_KEY, JSON.stringify(createVerifier(pin)));
  await drop(LOCK_KEY);
  hasCode = true;
  lastWait = 0;
  emit();
}

export async function setLockBiometric(on: boolean) {
  bio = on;
  await put(BIO_KEY, on ? "1" : "0");
  emit();
}

async function readWait(): Promise<LockState> {
  try {
    const raw = await read(LOCK_KEY);
    if (!raw) return { fails: 0, until: 0 };
    const p = JSON.parse(raw) as LockState;
    return { fails: p.fails || 0, until: p.until || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

export async function verifyLockCode(pin: string): Promise<{ ok: true } | { ok: false; waitMs: number }> {
  const wait = await readWait();
  const remaining = lockRemaining(wait);
  if (remaining > 0) {
    lastWait = remaining;
    return { ok: false, waitMs: remaining };
  }
  const raw = await read(VERIFIER_KEY);
  if (!raw) return { ok: false, waitMs: 0 };
  if (verifierMatches(pin, JSON.parse(raw) as PinVerifier)) {
    lastWait = 0;
    await drop(LOCK_KEY);
    return { ok: true };
  }
  const next = nextLock(wait);
  lastWait = Math.max(0, next.until - Date.now());
  await put(LOCK_KEY, JSON.stringify(next));
  return { ok: false, waitMs: lastWait };
}

/** Biometrics first when turned on, then the code. */
export async function authenticateLock(askPin: () => Promise<string | null>) {
  if (!hasCode) return false;
  lastWait = 0;
  if (bio) {
    const r = await authenticateBiometric("Ouvrir la conversation verrouillée");
    if (r === "success") return true;
    if (r === "cancel") return false;
  }
  const pin = await askPin();
  if (!pin) return false;
  return (await verifyLockCode(pin)).ok;
}

function genericNotify(chatId: string, on: boolean) {
  if (!chatId.startsWith("srv:")) return;
  void import("./messaging/client").then(({ postChatPrefs }) => postChatPrefs(chatId.slice(4), { genericNotify: on }));
}

/** Lock a chat (asks the code first so nobody else can lock / unlock your chats). */
export async function lockChat(chatId: string, askPin: () => Promise<string | null>) {
  if (!hasCode || !(await authenticateLock(askPin))) return false;
  ids = [...new Set([...ids, chatId])];
  await put(IDS_KEY, JSON.stringify(ids));
  unlocked.delete(chatId);
  genericNotify(chatId, true);
  emit();
  return true;
}

export async function unlockChatForGood(chatId: string, askPin: () => Promise<string | null>) {
  if (!unlocked.has(chatId) && !(await authenticateLock(askPin))) return false;
  ids = ids.filter((id) => id !== chatId);
  await put(IDS_KEY, JSON.stringify(ids));
  genericNotify(chatId, false);
  emit();
  return true;
}

/** Open a locked chat for this visit. */
export function markChatUnlocked(chatId: string) {
  unlocked.add(chatId);
  emit();
}

/** Leaving the conversation (or the app going to the background) locks it again. */
export function relockChat(chatId: string) {
  if (unlocked.delete(chatId)) emit();
}

export function relockAllChats() {
  if (!unlocked.size) return;
  unlocked.clear();
  emit();
}
