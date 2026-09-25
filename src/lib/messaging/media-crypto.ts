/**
 * wipp-media-v1. Separate from encryptText / the chat text envelope.
 * Each chunk: unique 96-bit nonce, AES-256-GCM, AAD binds attachment id + index.
 * SHA-256 is an early corruption check. The GCM tag is the authentication.
 */
import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

export const MEDIA_VERSION = "wipp-media-v1";
export const CHUNK_PLAIN_MAX = 4 * 1024 * 1024;
export const LIMITS = {
  image: 16 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  file: 32 * 1024 * 1024,
  voice: 8 * 1024 * 1024,
  gif: 8 * 1024 * 1024,
  thumb: 64 * 1024,
} as const;

const te = new TextEncoder();

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const raw = typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64(value: string) {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const b64s = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const bin = atob(b64s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64s, "base64"));
}

export function mediaAad(attachmentId: string, index: number) {
  return te.encode(`${MEDIA_VERSION}\0${attachmentId}\0${index}`);
}

export function newFileKey() {
  return randomBytes(32);
}

export type CipherChunk = {
  index: number;
  iv: string;
  ciphertext: Uint8Array;
  sha256: string;
};

/** Always a fresh nonce. Resume must re-upload these bytes, not re-encrypt. */
export function encryptChunk(
  fileKey: Uint8Array,
  attachmentId: string,
  index: number,
  plaintext: Uint8Array,
): CipherChunk {
  if (plaintext.byteLength > CHUNK_PLAIN_MAX) {
    throw new Error("chunk too large");
  }
  const iv = randomBytes(12);
  const aes = gcm(fileKey, iv, mediaAad(attachmentId, index));
  const ciphertext = aes.encrypt(plaintext);
  return { index, iv: b64(iv), ciphertext, sha256: bytesToHex(sha256(ciphertext)) };
}

export function decryptChunk(
  fileKey: Uint8Array,
  attachmentId: string,
  chunk: CipherChunk,
): Uint8Array {
  const digest = bytesToHex(sha256(chunk.ciphertext));
  if (digest !== chunk.sha256) throw new Error("ciphertext hash mismatch");
  const aes = gcm(fileKey, unb64(chunk.iv), mediaAad(attachmentId, chunk.index));
  return aes.decrypt(chunk.ciphertext);
}

export type MediaEnvelope = {
  k: typeof MEDIA_VERSION;
  kind: "image" | "video" | "file" | "voice" | "gif" | "sticker" | "contact" | "location" | "link";
  id?: string;
  fileKey?: string;
  name?: string;
  mime?: string;
  viewOnce?: boolean;
  durationMs?: number;
  chunks?: { i: number; iv: string; sha256: string }[];
  contact?: { userId: string; username: string; displayName: string; fingerprint?: string };
  location?: { lat: number; lon: number };
  link?: { url: string; title?: string; description?: string };
  stickerId?: string;
};

export function describeMedia(input: Omit<MediaEnvelope, "k">): string {
  return JSON.stringify({ k: MEDIA_VERSION, ...input });
}

export function parseMedia(value: string): MediaEnvelope | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as MediaEnvelope;
    if (parsed.k !== MEDIA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

const MEDIA_LABEL: Record<MediaEnvelope["kind"], string> = {
  image: "Photo",
  video: "Vidéo",
  file: "Document",
  voice: "Message vocal",
  gif: "GIF",
  sticker: "Sticker",
  contact: "Contact",
  location: "Position",
  link: "Lien",
};

export function mediaLabel(kind: MediaEnvelope["kind"]) {
  return MEDIA_LABEL[kind];
}
