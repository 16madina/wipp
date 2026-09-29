import { dropOutbox, enqueueOutbox, listOutbox, type OutboxItem } from "@/lib/messaging/outbox";
import { isPrivateChat } from "@/lib/private-vault";
import {
  decryptMergedMessages,
  isServerChatId,
  mergeServerMessagesIntoState,
  sendViaServer,
  syncChatMessages,
} from "@/lib/messaging/sync";
import type { KeyBundle } from "@/lib/crypto";

type Get = () => {
  identity: KeyBundle | null;
  peerPublicKeys: Record<string, JsonWebKey>;
  chats: { id: string; participantIds: string[] }[];
  messages: Record<string, { id: string; text?: string; fromId: string }[]>;
};

export async function flushOutboxItem(
  get: Get,
  set: (fn: (st: Get extends () => infer S ? S : never) => object) => void,
  item: OutboxItem,
) {
  if (!isServerChatId(item.localChatId)) return;
  const st = get();
  const peerId = st.chats.find((c) => c.id === item.localChatId)?.participantIds.find((id) => id !== "me");
  const peerPub = peerId
    ? st.peerPublicKeys[peerId] ||
      (peerId.startsWith("srvuser:") ? st.peerPublicKeys[peerId.slice("srvuser:".length)] : undefined)
    : undefined;
  await sendViaServer(item.localChatId, item.text, item.clientId, {
    identity: st.identity,
    peerPublicJwk: peerPub ?? null,
    reply: item.replyId
      ? { id: item.replyId, preview: item.replyPreview ?? "", senderId: item.replySenderId }
      : undefined,
    forwarded: item.forwarded,
    vault: item.vault ?? isPrivateChat(item.localChatId),
  });
  dropOutbox(item.clientId);
  const synced = await syncChatMessages(item.localChatId);
  if (synced && "messages" in synced) {
    set((s) =>
      mergeServerMessagesIntoState(
        s as never,
        item.localChatId.replace(/^srv:/, ""),
        synced.messages,
        synced.meServerId,
      ) as never,
    );
    const dec = await decryptMergedMessages(get() as never, item.localChatId, get().identity);
    if (Object.keys(dec).length) set(() => dec as never);
  }
}

export async function flushAllOutbox(get: Get, set: (fn: (st: never) => object) => void) {
  for (const item of listOutbox()) {
    try {
      await flushOutboxItem(get, set as never, item);
    } catch {
      enqueueOutbox(item);
    }
  }
}
