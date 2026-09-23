/**
 * Wipp DM E2E crypto — ECDH P-256 + HKDF-SHA-256 + AES-256-GCM.
 * Uses @noble so web and React Native share the same wire format.
 * Groups / media: phase 2 (not claimed as E2E yet).
 */
import { p256 } from "@noble/curves/nist.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";

export type EncBlob = {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  ct: string;
};

/** Wire envelope stored in wipp_messages.body for DM E2E. */
export type E2eEnvelope = EncBlob & {
  e2e: true;
  /** Sender public JWK snapshot so the peer can derive without an extra round-trip. */
  spk: JsonWebKey;
};

export type KeyBundle = {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
};

const te = new TextEncoder();
const td = new TextDecoder();
const INFO = te.encode("wgo-e2e-v1");
const aesCache = new Map<string, Uint8Array>();

function b64urlFromBytes(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(value: string) {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function clearKeyCache() {
  aesCache.clear();
}

export function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
}

export function unb64(value: string) {
  if (typeof atob === "function") {
    const bin = atob(value);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function shortCipher(blob: EncBlob) {
  return `${blob.alg} · ${blob.ct.slice(0, 18)}…`;
}

export function formatSafety(digits: string) {
  return digits.match(/.{1,5}/g)?.join(" ") ?? digits;
}

export function shortFp(digits: string) {
  if (digits.length < 12) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

function privFromJwk(jwk: JsonWebKey): Uint8Array {
  if (!jwk.d) throw new Error("private JWK missing d");
  return bytesFromB64url(jwk.d);
}

function pubFromJwk(jwk: JsonWebKey): Uint8Array {
  if (!jwk.x || !jwk.y) throw new Error("public JWK missing x/y");
  const x = bytesFromB64url(jwk.x);
  const y = bytesFromB64url(jwk.y);
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(x, 1);
  out.set(y, 33);
  return out;
}

function jwkFromPriv(priv: Uint8Array): KeyBundle {
  const pub = p256.getPublicKey(priv, false);
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const publicJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: b64urlFromBytes(x),
    y: b64urlFromBytes(y),
    ext: true,
    key_ops: [],
  };
  const privateJwk: JsonWebKey = {
    ...publicJwk,
    d: b64urlFromBytes(priv),
    key_ops: ["deriveBits"],
  };
  return { publicJwk, privateJwk };
}

export async function generateBundle(): Promise<KeyBundle> {
  const priv = p256.utils.randomSecretKey();
  return jwkFromPriv(priv);
}

async function digitsFrom(bytes: Uint8Array, n = 60) {
  let acc = "";
  let h = bytes;
  while (acc.length < n) {
    for (const b of h) acc += (b % 10).toString();
    h = sha256(h);
  }
  return acc.slice(0, n);
}

export async function fingerprintOf(jwk: JsonWebKey) {
  const raw = te.encode(`${jwk.crv ?? ""}|${jwk.x ?? ""}|${jwk.y ?? ""}`);
  return digitsFrom(sha256(raw), 60);
}

export async function safetyNumber(a: JsonWebKey, b: JsonWebKey) {
  const [fa, fb] = await Promise.all([fingerprintOf(a), fingerprintOf(b)]);
  const [x, y] = fa < fb ? [fa, fb] : [fb, fa];
  return digitsFrom(sha256(te.encode(x + y)), 60);
}

export async function groupSafety(jwk: JsonWebKey, chatId: string) {
  const fp = await fingerprintOf(jwk);
  return digitsFrom(sha256(te.encode(`${fp}|${chatId}`)), 60);
}

/** ECDH shared X (32 bytes) — same convention as Web Crypto deriveBits(256) for P-256. */
function ecdhSharedX(myPriv: Uint8Array, peerPub: Uint8Array): Uint8Array {
  const shared = p256.getSharedSecret(myPriv, peerPub, false); // 0x04 || x || y
  if (shared.length === 65 && shared[0] === 0x04) return shared.slice(1, 33);
  if (shared.length === 33) return shared.slice(1);
  if (shared.length === 32) return shared;
  return sha256(shared).slice(0, 32);
}

export async function deriveChatKey(
  my: KeyBundle,
  peerPublicJwk: JsonWebKey,
  chatId: string,
): Promise<Uint8Array> {
  const cacheKey = `${chatId}|${peerPublicJwk.x ?? ""}|${peerPublicJwk.y ?? ""}`;
  const hit = aesCache.get(cacheKey);
  if (hit) return hit;
  const bits = ecdhSharedX(privFromJwk(my.privateJwk), pubFromJwk(peerPublicJwk));
  const key = hkdf(sha256, bits, te.encode(chatId), INFO, 32);
  aesCache.set(cacheKey, key);
  return key;
}

/** Local-only group seal (NOT multi-party E2E — phase 2). */
export async function deriveGroupKey(my: KeyBundle, chatId: string): Promise<Uint8Array> {
  const hit = aesCache.get(`g:${chatId}`);
  if (hit) return hit;
  const raw = te.encode(`${my.privateJwk.d ?? ""}|${chatId}|wgo-group-v1`);
  const key = sha256(raw);
  aesCache.set(`g:${chatId}`, key);
  return key;
}

export async function encryptText(key: Uint8Array, plaintext: string): Promise<EncBlob> {
  const iv = randomBytes(12);
  const aes = gcm(key, iv);
  const ct = aes.encrypt(te.encode(plaintext));
  return { v: 1, alg: "AES-GCM", iv: b64(iv), ct: b64(ct) };
}

export async function decryptText(key: Uint8Array, blob: EncBlob) {
  const aes = gcm(key, unb64(blob.iv));
  const pt = aes.decrypt(unb64(blob.ct));
  return td.decode(pt);
}

export function isEncryptable(type: string) {
  return type === "text" || type === "voice" || type === "image";
}

export function isE2eEnvelope(value: unknown): value is E2eEnvelope {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.e2e === true &&
    o.v === 1 &&
    o.alg === "AES-GCM" &&
    typeof o.iv === "string" &&
    typeof o.ct === "string" &&
    !!o.spk &&
    typeof o.spk === "object"
  );
}

export function parseMessageBody(body: string): { kind: "e2e"; envelope: E2eEnvelope } | { kind: "plain"; text: string } {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isE2eEnvelope(parsed)) return { kind: "e2e", envelope: parsed };
    } catch {
      /* plain */
    }
  }
  return { kind: "plain", text: body };
}

export function previewFromBody(body: string, lockedLabel = "🔒 Message chiffré") {
  const parsed = parseMessageBody(body);
  return parsed.kind === "e2e" ? lockedLabel : parsed.text.slice(0, 140);
}

export function makeE2eEnvelope(blob: EncBlob, senderPublicJwk: JsonWebKey): E2eEnvelope {
  return { ...blob, e2e: true, spk: senderPublicJwk };
}

/** Dev helper — not used in prod paths. */
export function _debugHex(bytes: Uint8Array) {
  return bytesToHex(bytes);
}

export function _debugUnhex(hex: string) {
  return hexToBytes(hex);
}
