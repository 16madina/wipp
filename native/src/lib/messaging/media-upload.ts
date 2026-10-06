import { File, Paths } from "expo-file-system";
import {
  CHUNK_PLAIN_MAX,
  describeMedia,
  encryptChunk,
  decryptChunk,
  type MediaEnvelope,
} from "./media-crypto";
import {
  completeServerAttachment,
  createServerAttachment,
  fetchServerChunk,
  putServerChunk,
} from "./client";
import { sendViaServer } from "./sync";
import type { KeyBundle } from "../crypto";

function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function unb64(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64s = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type PutFileInput = {
  chatId: string;
  bytes: Uint8Array;
  kind: MediaEnvelope["kind"];
  viewOnce?: boolean;
  name?: string;
  mime?: string;
  durationMs?: number;
  size?: number;
  onProgress?: (fraction: number) => void;
};

export async function putEncryptedBytes(input: PutFileInput) {
  const serverChatId = input.chatId.replace(/^srv:/, "");
  const chunkCount = Math.max(1, Math.ceil(input.bytes.byteLength / CHUNK_PLAIN_MAX));
  const created = await createServerAttachment(serverChatId, {
    chunkCount,
    byteSize: input.bytes.byteLength,
    viewOnce: input.viewOnce,
  });
  const { newFileKey } = await import("./media-crypto");
  const fileKey = newFileKey();
  const metas: { i: number; iv: string; sha256: string }[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const slice = input.bytes.subarray(i * CHUNK_PLAIN_MAX, Math.min(input.bytes.byteLength, (i + 1) * CHUNK_PLAIN_MAX));
    const chunk = encryptChunk(fileKey, created.id, i, slice);
    metas.push({ i, iv: chunk.iv, sha256: chunk.sha256 });
    await putServerChunk(created.id, i, b64(chunk.ciphertext), chunk.sha256);
    input.onProgress?.((i + 1) / (chunkCount + 1));
  }
  return {
    id: created.id,
    fileKey: b64(fileKey).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    kind: input.kind,
    name: input.name,
    mime: input.mime,
    viewOnce: input.viewOnce,
    durationMs: input.durationMs,
    size: input.size,
    chunks: metas,
  };
}

export async function uploadCipherFile(input: {
  chatId: string;
  bytes: Uint8Array;
  kind: MediaEnvelope["kind"];
  viewOnce?: boolean;
  name?: string;
  mime?: string;
  durationMs?: number;
  identity?: KeyBundle | null;
  peerPublicJwk?: JsonWebKey | null;
  clientId: string;
  vault?: boolean;
  onProgress?: (fraction: number) => void;
  caption?: string;
  size?: number;
  /** Groups: send the media description sealed with the group key instead of the private-chat key. */
  sendInner?: (inner: string) => Promise<{ id: string } | null>;
}) {
  const stored = await putEncryptedBytes(input);
  const inner = describeMedia({
    id: stored.id,
    fileKey: stored.fileKey,
    kind: stored.kind,
    name: stored.name,
    mime: stored.mime,
    viewOnce: stored.viewOnce,
    durationMs: stored.durationMs,
    caption: input.caption || undefined,
    size: stored.size,
    chunks: stored.chunks,
  });
  const message = input.sendInner
    ? await input.sendInner(inner)
    : await sendViaServer(input.chatId, inner, input.clientId, {
        identity: input.identity,
        peerPublicJwk: input.peerPublicJwk,
        vault: input.vault,
      });
  if (message?.id) await completeServerAttachment(stored.id, message.id);
  else await completeServerAttachment(stored.id);
  input.onProgress?.(1);
  return { attachmentId: stored.id, message };
}

export async function uploadCipherAlbum(input: {
  chatId: string;
  files: { bytes: Uint8Array; kind: "image" | "video"; mime?: string; durationMs?: number; size?: number }[];
  viewOnce?: boolean;
  identity?: KeyBundle | null;
  peerPublicJwk?: JsonWebKey | null;
  clientId: string;
  vault?: boolean;
  onProgress?: (fraction: number) => void;
  caption?: string;
  sendInner?: (inner: string) => Promise<{ id: string } | null>;
}) {
  const parts = [];
  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i]!;
    const stored = await putEncryptedBytes({
      chatId: input.chatId,
      bytes: file.bytes,
      kind: file.kind,
      viewOnce: input.viewOnce,
      mime: file.mime,
      durationMs: file.durationMs,
      size: file.size,
      onProgress: (f) => input.onProgress?.((i + f) / (input.files.length + 1)),
    });
    parts.push({
      id: stored.id,
      fileKey: stored.fileKey,
      kind: file.kind,
      mime: stored.mime,
      durationMs: stored.durationMs,
      size: stored.size,
      chunks: stored.chunks,
    });
  }
  const first = parts[0];
  if (!first) throw new Error("empty album");
  const inner = describeMedia({
    kind: first.kind,
    id: first.id,
    fileKey: first.fileKey,
    mime: first.mime,
    viewOnce: input.viewOnce,
    durationMs: first.durationMs,
    caption: input.caption || undefined,
    chunks: first.chunks,
    album: parts,
  });
  const message = input.sendInner
    ? await input.sendInner(inner)
    : await sendViaServer(input.chatId, inner, input.clientId, {
        identity: input.identity,
        peerPublicJwk: input.peerPublicJwk,
        vault: input.vault,
      });
  await Promise.all(parts.map((p) => (message?.id ? completeServerAttachment(p.id, message.id) : completeServerAttachment(p.id))));
  input.onProgress?.(1);
  return { attachmentId: first.id, parts, message };
}

export async function downloadCipherFile(input: {
  attachmentId: string;
  fileKey: string;
  chunks: { i: number; iv: string; sha256: string }[];
  mime?: string;
  onProgress?: (fraction: number) => void;
}) {
  const key = unb64(input.fileKey);
  const parts: Uint8Array[] = [];
  const sorted = [...input.chunks].sort((a, b) => a.i - b.i);
  for (let n = 0; n < sorted.length; n++) {
    const meta = sorted[n]!;
    const row = await fetchServerChunk(input.attachmentId, meta.i);
    const plain = decryptChunk(key, input.attachmentId, {
      index: meta.i,
      iv: meta.iv,
      sha256: meta.sha256,
      ciphertext: unb64(row.ciphertext),
    });
    parts.push(plain);
    input.onProgress?.((n + 1) / sorted.length);
  }
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    bytes.set(p, off);
    off += p.byteLength;
  }
  const ext = (input.mime ?? "application/octet-stream").includes("png")
    ? "png"
    : (input.mime ?? "").includes("jpeg") || (input.mime ?? "").includes("jpg")
      ? "jpg"
      : (input.mime ?? "").includes("mp4")
        ? "mp4"
        : (input.mime ?? "").includes("webm")
          ? "webm"
          : (input.mime ?? "").includes("gif")
            ? "gif"
            : (input.mime ?? "").includes("audio")
              ? "m4a"
              : "bin";
  try {
    const file = new File(Paths.cache, `wipp-${input.attachmentId}.${ext}`);
    if (!file.exists) file.create();
    file.write(bytes);
    return file.uri;
  } catch {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
    return `data:${input.mime || "application/octet-stream"};base64,${btoa(s)}`;
  }
}

export async function readLocalBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const file = new File(uri);
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}
