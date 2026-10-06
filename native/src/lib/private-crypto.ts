/**
 * Crypto + rate-limit purs pour WIPP Privé.
 * Le code n'est jamais stocké : seulement salt + hash PBKDF2.
 */
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";

export const PIN_MIN = 4;
/**
 * PBKDF2 runs in JS (Hermes): 120 000 rounds froze the phone for tens of seconds.
 * The real protection is the device Keychain (this-device-only, unlocked) + the growing wait after errors;
 * existing verifiers keep their own `iter`, so old codes still check.
 */
export const PBKDF2_ITER = 8_000;
export const WAIT_MS = [0, 1_000, 2_000, 5_000, 15_000, 30_000, 60_000] as const;

export type PinVerifier = { salt: string; hash: string; iter: number };
export type LockState = { fails: number; until: number };

export function waitForFails(fails: number) {
  return WAIT_MS[Math.min(Math.max(fails, 0), WAIT_MS.length - 1)] ?? 60_000;
}

export function nextLock(prev: LockState, now = Date.now()): LockState {
  const fails = prev.fails + 1;
  return { fails, until: now + waitForFails(fails) };
}

export function lockRemaining(lock: LockState, now = Date.now()) {
  return Math.max(0, lock.until - now);
}

export function derivePinHash(pin: string, saltHex: string, iter = PBKDF2_ITER) {
  const salt = hexToBytes(saltHex);
  const out = pbkdf2(sha256, pin.trim(), salt, { c: iter, dkLen: 32 });
  return bytesToHex(out);
}

export function createVerifier(pin: string): PinVerifier {
  const code = pin.trim();
  if (code.length < PIN_MIN) throw new Error("short");
  const salt = bytesToHex(randomBytes(16));
  return { salt, hash: derivePinHash(code, salt, PBKDF2_ITER), iter: PBKDF2_ITER };
}

export function verifierMatches(pin: string, verifier: PinVerifier) {
  return derivePinHash(pin, verifier.salt, verifier.iter) === verifier.hash;
}
