export type EncBlob = {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  ct: string;
};

export type KeyBundle = {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
};

const te = new TextEncoder();
const td = new TextDecoder();

function asBuf(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

const ECDH = { name: "ECDH" as const, namedCurve: "P-256" as const };
const aesCache = new Map<string, CryptoKey>();

export function clearKeyCache() {
  aesCache.clear();
}

export function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function unb64(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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

export async function generateBundle(): Promise<KeyBundle> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  return {
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}

async function importPriv(jwk: JsonWebKey) {
  return crypto.subtle.importKey("jwk", jwk, ECDH, false, ["deriveBits"]);
}

async function importPub(jwk: JsonWebKey) {
  return crypto.subtle.importKey("jwk", jwk, ECDH, false, []);
}

async function digitsFrom(bytes: Uint8Array, n = 60) {
  let acc = "";
  let h = bytes;
  while (acc.length < n) {
    for (const b of h) acc += (b % 10).toString();
    h = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(h)));
  }
  return acc.slice(0, n);
}

export async function fingerprintOf(jwk: JsonWebKey) {
  const raw = te.encode(`${jwk.crv ?? ""}|${jwk.x ?? ""}|${jwk.y ?? ""}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(raw)));
  return digitsFrom(hash, 60);
}

export async function safetyNumber(a: JsonWebKey, b: JsonWebKey) {
  const [fa, fb] = await Promise.all([fingerprintOf(a), fingerprintOf(b)]);
  const [x, y] = fa < fb ? [fa, fb] : [fb, fa];
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuf(te.encode(x + y))));
  return digitsFrom(hash, 60);
}

export async function groupSafety(jwk: JsonWebKey, chatId: string) {
  const fp = await fingerprintOf(jwk);
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", asBuf(te.encode(`${fp}|${chatId}`))),
  );
  return digitsFrom(hash, 60);
}

export async function deriveChatKey(my: KeyBundle, peer: KeyBundle, chatId: string) {
  const hit = aesCache.get(chatId);
  if (hit) return hit;
  const priv = await importPriv(my.privateJwk);
  const pub = await importPub(peer.publicJwk);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asBuf(te.encode(chatId)),
      info: asBuf(te.encode("wgo-e2e-v1")),
    },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  aesCache.set(chatId, key);
  return key;
}

export async function deriveGroupKey(my: KeyBundle, chatId: string) {
  const hit = aesCache.get(chatId);
  if (hit) return hit;
  const raw = te.encode(`${my.privateJwk.d ?? ""}|${chatId}|wgo-group-v1`);
  const hash = await crypto.subtle.digest("SHA-256", asBuf(raw));
  const key = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  aesCache.set(chatId, key);
  return key;
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<EncBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuf(iv) },
    key,
    asBuf(te.encode(plaintext)),
  );
  return { v: 1, alg: "AES-GCM", iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function decryptText(key: CryptoKey, blob: EncBlob) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuf(unb64(blob.iv)) },
    key,
    asBuf(unb64(blob.ct)),
  );
  return td.decode(pt);
}

export function isEncryptable(type: string) {
  return type === "text" || type === "voice" || type === "image";
}
