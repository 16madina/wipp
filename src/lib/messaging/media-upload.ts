/**
 * Client media pipeline (wipp-media-v1).
 * Uploads ciphertext only. The file key, name and MIME travel inside encryptText.
 */
import {
  CHUNK_PLAIN_MAX,
  describeMedia,
  encryptChunk,
  newFileKey,
  type MediaEnvelope,
} from "@/lib/messaging/media-crypto";
import {
  completeServerAttachment,
  createServerAttachment,
  putServerChunk,
} from "@/lib/messaging/client";
import { sendViaServer } from "@/lib/messaging/sync";
import type { KeyBundle } from "@/lib/crypto";

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
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
}) {
  const serverChatId = input.chatId.replace(/^srv:/, "");
  const chunkCount = Math.max(1, Math.ceil(input.bytes.byteLength / CHUNK_PLAIN_MAX));
  const created = await createServerAttachment(serverChatId, {
    chunkCount,
    byteSize: input.bytes.byteLength,
    viewOnce: input.viewOnce,
  });
  const fileKey = newFileKey();
  const metas: { i: number; iv: string; sha256: string }[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const slice = input.bytes.subarray(i * CHUNK_PLAIN_MAX, Math.min(input.bytes.byteLength, (i + 1) * CHUNK_PLAIN_MAX));
    const chunk = encryptChunk(fileKey, created.id, i, slice);
    metas.push({ i, iv: chunk.iv, sha256: chunk.sha256 });
    await putServerChunk(created.id, i, b64(chunk.ciphertext), chunk.sha256);
  }
  const inner = describeMedia({
    id: created.id,
    fileKey: b64(fileKey).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    kind: input.kind,
    name: input.name,
    mime: input.mime,
    viewOnce: input.viewOnce,
    durationMs: input.durationMs,
    chunks: metas,
  });
  const message = await sendViaServer(input.chatId, inner, input.clientId, {
    identity: input.identity,
    peerPublicJwk: input.peerPublicJwk,
    vault: input.vault,
  });
  if (message?.id) await completeServerAttachment(created.id, message.id);
  return { attachmentId: created.id, message };
}
