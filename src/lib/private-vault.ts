/**
 * WIPP Privé — coffre local à l'appareil (web).
 * Les ids de conversations sont locaux. Le code n'est jamais stocké en clair :
 * seulement un vérificateur PBKDF2. Rien n'est envoyé à Supabase.
 */

const IDS_KEY = "wipp-prive-ids-v1";
const VERIFIER_KEY = "wipp-prive-verifier-v1";
const ENABLED_KEY = "wipp-prive-enabled-v1";
const LOCK_KEY = "wipp-prive-lock-v1";

const WAIT_MS = [0, 1_000, 2_000, 5_000, 15_000, 30_000, 60_000];

type Verifier = { salt: string; hash: string; iter: number };

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

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isPrivateEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function privateChatIds(): string[] {
  return isPrivateEnabled() ? readIds() : [];
}

export function isPrivateChat(id: string) {
  return privateChatIds().includes(id);
}

async function pbkdf2(pin: string, salt: Uint8Array, iter: number) {
  const enc = new TextEncoder().encode(pin);
  const key = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type LockState = { fails: number; until: number };

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
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

export async function enablePrivateVault(pin: string) {
  await writeVerifier(pin);
  localStorage.setItem(ENABLED_KEY, "1");
  if (!localStorage.getItem(IDS_KEY)) localStorage.setItem(IDS_KEY, "[]");
  localStorage.removeItem(LOCK_KEY);
  emit();
}

export async function replacePrivateCode(pin: string) {
  await writeVerifier(pin);
  localStorage.removeItem(LOCK_KEY);
}

async function writeVerifier(pin: string) {
  const code = pin.trim();
  if (code.length < 4) throw new Error("short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iter = 120_000;
  const hash = await pbkdf2(code, salt, iter);
  const verifier: Verifier = { salt: b64(salt), hash, iter };
  localStorage.setItem(VERIFIER_KEY, JSON.stringify(verifier));
}

export function disablePrivateVault() {
  localStorage.removeItem(ENABLED_KEY);
  emit();
}

export async function verifyPin(pin: string): Promise<{ ok: true } | { ok: false; waitMs: number }> {
  const lock = readLock();
  const remaining = lock.until - Date.now();
  if (remaining > 0) {
    lastWaitMs = remaining;
    return { ok: false, waitMs: remaining };
  }
  const raw = localStorage.getItem(VERIFIER_KEY);
  if (!raw) return { ok: false, waitMs: 0 };
  const verifier = JSON.parse(raw) as Verifier;
  const hash = await pbkdf2(pin.trim(), fromB64(verifier.salt), verifier.iter);
  if (hash === verifier.hash) {
    lastWaitMs = 0;
    localStorage.removeItem(LOCK_KEY);
    return { ok: true };
  }
  const fails = lock.fails + 1;
  const waitMs = waitForFails(fails);
  lastWaitMs = waitMs;
  localStorage.setItem(LOCK_KEY, JSON.stringify({ fails, until: Date.now() + waitMs }));
  return { ok: false, waitMs };
}

/** Déverrouille. Aucun indice visuel n'est produit par cette fonction. */
export async function unlockPrivateVault(promptPin: () => Promise<string | null>) {
  if (!isPrivateEnabled()) return false;
  lastWaitMs = 0;
  const pin = await promptPin();
  if (!pin) return false;
  const checked = await verifyPin(pin);
  return checked.ok;
}

export async function lockChatPrivate(chatId: string, promptPin: () => Promise<string | null>) {
  if (!isPrivateEnabled()) return false;
  if (!(await unlockPrivateVault(promptPin))) return false;
  const next = [...new Set([...readIds(), chatId])];
  localStorage.setItem(IDS_KEY, JSON.stringify(next));
  emit();
  return true;
}

export async function unlockChatFromPrivate(chatId: string, promptPin: () => Promise<string | null>) {
  if (!(await unlockPrivateVault(promptPin))) return false;
  const next = readIds().filter((id) => id !== chatId);
  localStorage.setItem(IDS_KEY, JSON.stringify(next));
  emit();
  return true;
}
