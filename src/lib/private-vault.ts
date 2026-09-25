/**
 * WIPP Privé — coffre local à l'appareil (web).
 * Les ids de conversations sont locaux. Le code n'est jamais stocké en clair :
 * seulement un vérificateur PBKDF2. Rien n'est envoyé à Supabase.
 */

const IDS_KEY = "wipp-prive-ids-v1";
const VERIFIER_KEY = "wipp-prive-verifier-v1";
const ENABLED_KEY = "wipp-prive-enabled-v1";

type Verifier = { salt: string; hash: string; iter: number };

const listeners = new Set<() => void>();

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

export async function enablePrivateVault(pin: string) {
  if (pin.trim().length < 4) throw new Error("short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iter = 120_000;
  const hash = await pbkdf2(pin.trim(), salt, iter);
  const verifier: Verifier = { salt: b64(salt), hash, iter };
  localStorage.setItem(VERIFIER_KEY, JSON.stringify(verifier));
  localStorage.setItem(ENABLED_KEY, "1");
  if (!localStorage.getItem(IDS_KEY)) localStorage.setItem(IDS_KEY, "[]");
  emit();
}

export function disablePrivateVault() {
  localStorage.removeItem(ENABLED_KEY);
  emit();
}

async function verifyPin(pin: string) {
  const raw = localStorage.getItem(VERIFIER_KEY);
  if (!raw) return false;
  const verifier = JSON.parse(raw) as Verifier;
  const hash = await pbkdf2(pin.trim(), fromB64(verifier.salt), verifier.iter);
  return hash === verifier.hash;
}

/** Déverrouille. Aucun indice visuel n'est produit par cette fonction. */
export async function unlockPrivateVault(promptPin: () => Promise<string | null>) {
  if (!isPrivateEnabled()) return false;
  const pin = await promptPin();
  if (!pin) return false;
  return verifyPin(pin);
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
