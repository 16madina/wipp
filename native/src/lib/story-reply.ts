import { stickersInPack, stickerById } from "./stickers";
import { useWippStore } from "./store";
import type { StoryItem } from "./types";

/** Representative Wippmojis. Not Wippies, not WIPP Moments. */
export const QUICK_WIPPMOJI_IDS = ["moji-06", "moji-01", "moji-08", "moji-13", "moji-07", "moji-24"];

export function storyWippmojis() {
  return stickersInPack("moji").filter((sticker) => sticker.pack === "moji" && !sticker.moment && !sticker.playMs);
}

export function isStoryWippmoji(id: string) {
  const sticker = stickerById(id);
  return Boolean(sticker && sticker.pack === "moji" && !sticker.moment && !sticker.playMs);
}

export function storyCite(story: StoryItem, mode: "reply" | "reaction" | "like") {
  const preview =
    story.type === "text"
      ? (story.text ?? "").replace(/\s+/g, " ").trim().slice(0, 80)
      : story.type === "video"
        ? "Vidéo"
        : "Photo";
  return {
    id: story.id,
    kind: story.type,
    mode,
    preview: preview || (story.type === "text" ? "Texte" : preview),
    bg: story.type === "text" ? story.bg : undefined,
  };
}

/** Reuse the existing 1:1 chat, or the existing create-or-open path. Does not navigate. */
export async function ensureStoryChat(userId: string) {
  const state = useWippStore.getState();
  if (state.blockedIds.includes(userId)) throw new Error("Tu ne peux pas écrire à ce profil.");
  const existing = state.chats.find(
    (chat) =>
      chat.type === "dm" &&
      !chat.ephemeral &&
      !chat.shopId &&
      chat.id.startsWith("srv:") &&
      chat.participantIds.includes("me") &&
      chat.participantIds.includes(userId),
  );
  if (existing) return existing.id;
  const username = state.users[userId]?.username;
  if (!username || !state.serverConnected) throw new Error("Conversation indisponible.");
  await state.ensureCrypto();
  const {
    decryptMergedMessages,
    mergeServerChatsIntoState,
    mergeServerMessagesIntoState,
    startChatWithUsername,
    syncChatMessages,
    toLocalChatId,
  } = await import("./messaging/sync");
  const chat = await startChatWithUsername(username);
  const profileId = useWippStore.getState().serverProfileId ?? undefined;
  useWippStore.setState((current) => mergeServerChatsIntoState(current, [chat], profileId));
  const localId = toLocalChatId(chat.id);
  const synced = await syncChatMessages(localId);
  if (synced && "messages" in synced) {
    useWippStore.setState((current) => mergeServerMessagesIntoState(current, chat.id, synced.messages, synced.meServerId));
    const decrypted = await decryptMergedMessages(useWippStore.getState(), localId, useWippStore.getState().identity);
    if (Object.keys(decrypted).length) useWippStore.setState(() => decrypted);
  }
  return localId;
}
