/**
 * Envoi réel des médias dans les conversations entre vrais comptes.
 * Le fichier est chiffré sur le téléphone (clé unique par fichier).
 */
import { useWippStore } from "../store";
import type { Message } from "../types";
import { isPrivateChat } from "../private-vault";
import { readLocalBytes, uploadCipherFile } from "./media-upload";

export type MediaJob = {
  chatId: string;
  messageId: string;
  blobUrl: string;
  kind: "image" | "video" | "voice" | "file" | "gif";
  name?: string;
  mime?: string;
  viewOnce?: boolean;
  durationMs?: number;
  caption?: string;
  /** Voice: 32 levels 0–9 drawn as bars in the bubble. */
  wave?: string;
};

const jobs = new Map<string, MediaJob>();
export const localBlobs = new Map<string, string>();

function patch(chatId: string, id: string, p: Partial<Message>) {
  useWippStore.setState((st) => ({
    messages: {
      ...st.messages,
      // localKey: the server may already have replaced the id this upload started with.
      [chatId]: (st.messages[chatId] ?? []).map((m) => (m.id === id || m.localKey === id ? { ...m, ...p } : m)),
    },
  }));
}

function peerKey(chatId: string) {
  const st = useWippStore.getState();
  const peerId = st.chats.find((c) => c.id === chatId)?.participantIds.find((id) => id !== "me");
  if (!peerId) return null;
  return st.peerPublicKeys[peerId] || (peerId.startsWith("srvuser:") ? st.peerPublicKeys[peerId.slice(8)] : undefined) || null;
}

/** Posts a group message whose body is the media description sealed with the group key. */
function groupSender(chatId: string, clientId: string) {
  return async (inner: string) => {
    const st = useWippStore.getState();
    if (!st.identity || !st.serverProfileId) throw new Error("no-e2e");
    const { encryptGroupBody } = await import("./group-e2e");
    const body = await encryptGroupBody(chatId, inner, st.identity, st.serverProfileId);
    if (!body) throw new Error("group_e2e_unavailable");
    const { postGroupMessage } = await import("../lot7/api");
    const id = await postGroupMessage({ chatId: chatId.slice(4), clientId, body });
    return { id };
  };
}

export function isMediaJob(messageId: string) {
  return jobs.has(messageId);
}

export async function uploadMedia(job: MediaJob) {
  jobs.set(job.messageId, job);
  patch(job.chatId, job.messageId, { status: "sending", mediaState: "preparing", progress: 0 });
  try {
    const st = useWippStore.getState();
    const chat = st.chats.find((c) => c.id === job.chatId);
    const group = chat?.type === "group" && job.chatId.startsWith("srv:");
    const peer = group ? null : peerKey(job.chatId);
    if (!st.identity || (!group && !peer)) throw new Error("no-e2e");
    const bytes = await readLocalBytes(job.blobUrl);
    patch(job.chatId, job.messageId, { mediaState: "uploading", progress: 0.02 });
    const res = await uploadCipherFile({
      chatId: job.chatId,
      bytes,
      kind: job.kind,
      viewOnce: job.viewOnce,
      name: job.name,
      mime: job.mime,
      durationMs: job.durationMs,
      caption: job.caption,
      wave: job.wave,
      size: bytes.byteLength,
      identity: st.identity,
      peerPublicJwk: peer,
      clientId: job.messageId,
      vault: isPrivateChat(job.chatId),
      onProgress: (f) => patch(job.chatId, job.messageId, { progress: f }),
      // Group: the encrypted file + its description sealed with the group key (end-to-end).
      sendInner: group ? groupSender(job.chatId, job.messageId) : undefined,
    });
    localBlobs.set(res.attachmentId, job.blobUrl);
    jobs.delete(job.messageId);
    patch(job.chatId, job.messageId, {
      status: "sent",
      mediaState: "sent",
      progress: 1,
      attachmentId: res.attachmentId,
    });
  } catch (err) {
    console.warn("[wipp] media upload failed", err);
    patch(job.chatId, job.messageId, { status: "failed", mediaState: "failed" });
  }
}

export function retryMedia(messageId: string) {
  const job = jobs.get(messageId);
  if (!job) return false;
  void uploadMedia(job);
  return true;
}

export function startUpload(job: MediaJob) {
  void uploadMedia(job);
}

export type AlbumJob = {
  chatId: string;
  messageId: string;
  items: { blobUrl: string; kind: "image" | "video"; mime?: string; durationMs?: number }[];
  viewOnce?: boolean;
  caption?: string;
};

export async function uploadAlbum(job: AlbumJob) {
  patch(job.chatId, job.messageId, { status: "sending", mediaState: "preparing", progress: 0 });
  if (!job.chatId.startsWith("srv:")) {
    patch(job.chatId, job.messageId, { status: "sent", mediaState: "sent", progress: 1 });
    return;
  }
  try {
    const st = useWippStore.getState();
    const group = st.chats.find((c) => c.id === job.chatId)?.type === "group";
    const peer = group ? null : peerKey(job.chatId);
    if (!st.identity || (!group && !peer)) throw new Error("no-e2e");
    const { uploadCipherAlbum } = await import("./media-upload");
    const files = [];
    for (const item of job.items) {
      const bytes = await readLocalBytes(item.blobUrl);
      files.push({
        bytes,
        kind: item.kind,
        mime: item.mime,
        durationMs: item.durationMs,
        size: bytes.byteLength,
      });
    }
    const res = await uploadCipherAlbum({
      chatId: job.chatId,
      files,
      viewOnce: job.viewOnce,
      caption: job.caption,
      identity: st.identity,
      peerPublicJwk: peer,
      clientId: job.messageId,
      vault: isPrivateChat(job.chatId),
      onProgress: (f) => patch(job.chatId, job.messageId, { mediaState: "uploading", progress: f }),
      sendInner: group ? groupSender(job.chatId, job.messageId) : undefined,
    });
    job.items.forEach((item, i) => {
      const part = res.parts[i];
      if (part) localBlobs.set(part.id, item.blobUrl);
    });
    patch(job.chatId, job.messageId, {
      status: "sent",
      mediaState: "sent",
      progress: 1,
      attachmentId: res.attachmentId,
    });
  } catch (err) {
    console.warn("[wipp] album upload failed", err);
    patch(job.chatId, job.messageId, { status: "failed", mediaState: "failed" });
  }
}

export function startAlbumUpload(job: AlbumJob) {
  void uploadAlbum(job);
}
