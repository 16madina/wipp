import { supabase } from "../supabase";
import * as S from "./supa";
import type { WippChatSummary, WippMessage, WippProfile } from "./types";

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
  const { wippApi } = await import("../proximity/wipp-session");
  const data = await wippApi<{ chat: { id: string } }>("chats", {
    method: "POST",
    body: JSON.stringify({ peerUsername }),
  });
  const chat = (await S.listChats()).find((c) => c.id === data.chat.id);
  if (!chat) throw new Error("Conversation introuvable");
  return chat;
}

export async function openBusinessChat(publicId: string) {
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ chatId: string }>("chats/business", {
    method: "POST",
    body: JSON.stringify({ publicId }),
  });
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
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<BusinessChatContext[]>("chats/business");
}

export async function fetchServerChats() {
  return S.listChats();
}

export async function fetchServerMessages(chatId: string, before?: number) {
  return S.listMessages(chatId, before);
}

export async function postServerMessage(chatId: string, body: string, clientId: string, opts?: { replyTo?: string | null }) {
  const message = await S.insertMessage(chatId, body, clientId, opts?.replyTo);
  try {
    const { isPrivateChat } = await import("../private-vault");
    const { wippApi } = await import("../proximity/wipp-session");
    await wippApi(`chats/${chatId}/notify`, {
      method: "POST",
      body: JSON.stringify({ messageId: message.id, vault: isPrivateChat(`srv:${chatId}`) }),
    });
  } catch {
    /* REST notify is best-effort; Realtime still updates the thread */
  }
  return message;
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
    genericNotify?: boolean;
  },
) {
  return S.updatePrefs(chatId, patch).then(async (result) => {
    try {
      const { wippApi } = await import("../proximity/wipp-session");
      await wippApi(`chats/${chatId}/prefs`, {
        method: "POST",
        body: JSON.stringify(patch),
      });
    } catch {
      /* REST prefs optional when the session is Supabase-only */
    }
    return result;
  });
}

export async function postFocus(chatId: string, active: boolean) {
  S.setFocus(chatId, active);
  try {
    const { wippApi } = await import("../proximity/wipp-session");
    await wippApi(`chats/${chatId}/focus`, {
      method: "POST",
      body: JSON.stringify({ active }),
    });
  } catch {
    /* in-process presence on the API host is best-effort */
  }
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
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ id: string; state: string }>(`chats/${chatId}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function putServerChunk(attachmentId: string, index: number, ciphertext: string, sha256: string) {
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ ok: boolean }>(`attachments/${attachmentId}/chunks/${index}`, {
    method: "PUT",
    body: JSON.stringify({ ciphertext, sha256 }),
  });
}

export async function completeServerAttachment(attachmentId: string, messageId?: string) {
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ ok: boolean; state: string }>(`attachments/${attachmentId}/complete`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  });
}

export async function fetchServerChunk(attachmentId: string, index: number) {
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ ciphertext: string; sha256: string; index: number }>(
    `attachments/${attachmentId}/chunks/${index}`,
  );
}

export async function consumeServerAttachment(attachmentId: string) {
  const { wippApi } = await import("../proximity/wipp-session");
  return wippApi<{ ok: boolean; state: string }>(`attachments/${attachmentId}/consume`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type { WippChatSummary, WippMessage, WippProfile };
