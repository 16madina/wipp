import { supabase } from "../supabase";
import { callServerFn } from "../server-fn";
import * as S from "./supa";
import type { WippChatSummary, WippMessage, WippProfile } from "./types";

const FN = {
  openDm: "128ddda6081c4f75884e12b3c0dc035246eedc86b7cd4d3d6f22c74c0dc51edb",
  openBusinessChat: "3ef82e8d9311db0d7ed71cefabce694b5c30e46c88534c05785d2cc1411fe138",
  listBusinessChatContexts: "0b2051f268a135f5c2ad300e0d83ae013988a1a101a8cedde4a0f81e5a9003d3",
  createAttachment: "b1a19bc8a5450b811b120ab9cfba9080f2dfa9a1edd980082b4aa785e66a223b",
  putAttachmentChunk: "696b8b882e11e2b5701b1f5b504b38c004c394ac5e3db7250dd637ec85e2a104",
  completeAttachment: "ff2bfd0c26b024eddefe549a0753558b101d89dd1e811ac79b23996ad0db938d",
  fetchAttachmentChunk: "10880171fd18bd66ce5321418011d5ed8fc022e4289c7eca7f63b51a1315a0a2",
  consumeAttachment: "358a10b7b6c784e004af9a1f9226b70e7ed7fc09fd1e6dd65fea6ad9a06474d5",
} as const;

export function getStoredProfile(): WippProfile | null {
  return S.cachedProfile();
}

export async function fetchMe() {
  return S.loadMe();
}

export async function publishMyE2eKey(publicJwk: JsonWebKey) {
  return S.publishKey(publicJwk);
}

export async function searchUsers(q: string) {
  return S.searchProfiles(q);
}

export async function openServerChat(peerUsername: string) {
  const { chatId } = await callServerFn<{ chatId: string }>(FN.openDm, { peerUsername });
  const chat = (await S.listChats()).find((c) => c.id === chatId);
  if (!chat) throw new Error("Conversation introuvable");
  return chat;
}

export async function openBusinessChat(publicId: string) {
  return callServerFn<{ chatId: string }>(FN.openBusinessChat, { publicId });
}

export type BusinessChatContext = {
  chatId: string;
  publicId: string;
  name: string;
  category: string;
  city: string;
  logoUrl: string | null;
  ownerIsMe: boolean;
};

export async function listBusinessChatContexts() {
  return callServerFn<BusinessChatContext[]>(FN.listBusinessChatContexts, {});
}

export async function fetchServerChats() {
  return S.listChats();
}

export async function fetchServerMessages(chatId: string, before?: number) {
  return S.listMessages(chatId, before);
}

export async function postServerMessage(chatId: string, body: string, clientId: string, opts?: { replyTo?: string | null }) {
  return S.insertMessage(chatId, body, clientId, opts?.replyTo);
}

export async function editServerMessage(_chatId: string, messageId: string, body: string) {
  return S.updateMessage(messageId, { body, edited_at: new Date().toISOString() });
}

export async function hideServerMessage(_chatId: string, messageId: string) {
  return S.hideMessage(messageId);
}

export async function tombstoneServerMessage(_chatId: string, messageId: string) {
  return S.updateMessage(messageId, { deleted_at: new Date().toISOString(), body: "" });
}

export async function reactServerMessage(_chatId: string, messageId: string, emoji: string) {
  return S.toggleReaction(messageId, emoji);
}

export async function pinServerMessage(_chatId: string, messageId: string, pinned: boolean) {
  return S.updateMessage(messageId, { pinned_at: pinned ? new Date().toISOString() : null });
}

export async function postReceipts(_chatId: string, messageIds: string[], kind: "delivered" | "read") {
  return S.upsertReceipts(messageIds, kind);
}

export async function postChatPrefs(
  chatId: string,
  patch: {
    pinned?: boolean;
    archived?: boolean;
    mute?: "off" | "1h" | "8h" | "1w" | "always";
    manuallyUnread?: boolean;
  },
) {
  return S.updatePrefs(chatId, patch);
}

export async function postFocus(chatId: string, active: boolean) {
  S.setFocus(chatId, active);
}

export async function postTyping(chatId: string, active: boolean) {
  S.sendTyping(chatId, active);
}

export async function ensureServerSession(_opts: { username: string; displayName: string }) {
  return S.loadMe();
}

export async function postDisappear(chatId: string, ms: number) {
  const { error } = await supabase.from("wipp_chats").update({ disappear_after_ms: ms || null } as never).eq("id", chatId);
  if (error) throw error;
  return { ok: true, disappearAfterMs: ms || null };
}

export async function createServerAttachment(
  chatId: string,
  input: { chunkCount: number; byteSize: number; viewOnce?: boolean },
) {
  return callServerFn<{ id: string; state: string }>(FN.createAttachment, { chatId, ...input });
}

export async function putServerChunk(attachmentId: string, index: number, ciphertext: string, sha256: string) {
  return callServerFn<{ ok: boolean }>(FN.putAttachmentChunk, { attachmentId, index, ciphertext, sha256 });
}

export async function completeServerAttachment(attachmentId: string, messageId?: string) {
  return callServerFn<{ ok: boolean; state: string }>(FN.completeAttachment, { attachmentId, messageId });
}

export async function fetchServerChunk(attachmentId: string, index: number) {
  return callServerFn<{ ciphertext: string; sha256: string; index: number }>(FN.fetchAttachmentChunk, {
    attachmentId,
    index,
  });
}

export async function consumeServerAttachment(attachmentId: string) {
  return callServerFn<{ ok: boolean; state: string }>(FN.consumeAttachment, { attachmentId });
}

export type { WippChatSummary, WippMessage, WippProfile };
