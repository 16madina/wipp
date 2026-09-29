import { create } from "zustand";
import type {
  CallLog,
  Chat,
  ConnectRequest,
  FoundVia,
  Introduction,
  Lang,
  LifestyleItem,
  Listing,
  LiveCode,
  MeProfile,
  Message,
  NearbyMode,
  Pharmacy,
  RedeemResult,
  Screen,
  Shop,
  ShopCategory,
  StoryItem,
  User,
} from "./types";
import { DISAPPEAR_7D, DISAPPEAR_24H } from "./types";
import { t as translate, type I18nKey } from "./i18n";
import {
  demoMe,
  seedCalls,
  seedChats,
  seedCodes,
  seedIntros,
  seedLifestyle,
  seedListings,
  seedMessages,
  seedPharmacies,
  seedRequests,
  seedShops,
  seedStories,
  seedUsers,
  withGroupMeta,
} from "./seed";
import { sixDigit, uid } from "./utils";
import { fingerprintOf, generateBundle, type KeyBundle } from "./crypto";
import { loadIdentity, saveIdentity } from "./messaging/identity";
import { isPrivateChat as isVaultChat } from "./private-vault";
import type { LiveEvent } from "./messaging/message-live";
import { stickerById } from "./stickers";
import type { SurprisePlain } from "./messaging/plain";

const TAB: Screen["name"][] = ["chats", "calls", "connect", "explore", "me"];
const CODE_TTL = 60_000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function isTabScreen(name: Screen["name"]) {
  return TAB.includes(name);
}

export function isPrivateChat(id: string) {
  return id.startsWith("priv-") || isVaultChat(id);
}

export function isChatSealed(chat: Chat, now = Date.now()) {
  if (!chat.ephemeral) return false;
  if (chat.sealed) return true;
  return Boolean(chat.expiresAt && chat.expiresAt <= now);
}

function previewOf(message: Message, lang: Lang = "fr") {
  if (message.viewOnce) return lang === "fr" ? "Vue unique" : "View once";
  if (message.encFailed) return lang === "fr" ? "Message chiffré" : "Encrypted message";
  if (message.type === "scratch") return lang === "fr" ? "Surprise ✨" : "Surprise ✨";
  if (message.type === "voice") return `Vocal · ${message.duration ?? 0}s`;
  if (message.album && message.album.length > 1) return lang === "fr" ? `${message.album.length} médias` : `${message.album.length} media`;
  if (message.type === "image") return "Photo";
  if (message.type === "file") return `📄 ${message.file?.name ?? "Document"}`;
  if (message.type === "gif") return "GIF";
  if (message.type === "video") return lang === "fr" ? "Vidéo" : "Video";
  if (message.type === "sticker") return stickerById(message.stickerId ?? "")?.labelFr ?? "Sticker";
  return message.text ?? "";
}

function peerPubOf(st: { chats: Chat[]; peerPublicKeys: Record<string, JsonWebKey> }, chatId: string) {
  const peerId = st.chats.find((c) => c.id === chatId)?.participantIds.find((id) => id !== "me");
  if (!peerId) return null;
  return st.peerPublicKeys[peerId] || (peerId.startsWith("srvuser:") ? st.peerPublicKeys[peerId.slice(8)] : undefined) || null;
}

const BIZ_CAT: [RegExp, ShopCategory][] = [
  [/ongle|nail/i, "nails"],
  [/coiff|hair/i, "hair"],
  [/beauté|beauty/i, "beauty"],
  [/restau|food|traiteur/i, "restaurant"],
  [/plomb/i, "plumbing"],
  [/immo/i, "realty"],
  [/boulang|pâtiss|patiss/i, "bakery"],
  [/caf/i, "cafe"],
  [/bijou|jewel/i, "jewelry"],
  [/maison|déco|deco/i, "home"],
];

function businessShop(
  c: { name: string; category: string; city: string; logoUrl: string | null; publicId: string },
  id: string,
  ownerId: string,
): Shop {
  return {
    id,
    name: c.name,
    ownerId,
    handle: c.publicId,
    bio: "",
    address: "",
    city: c.city,
    country: "",
    phone: "",
    lat: 0,
    lng: 0,
    hours: "",
    plan: "vitrine",
    image: c.logoUrl ?? "",
    logo: c.logoUrl ?? undefined,
    photos: [],
    code: "",
    qrToken: "",
    tags: [c.category],
    category: BIZ_CAT.find(([r]) => r.test(c.category))?.[1] ?? "services",
  };
}

type Store = {
  language: Lang;
  onboarded: boolean;
  stack: Screen[];
  me: MeProfile;
  users: Record<string, User>;
  chats: Chat[];
  messages: Record<string, Message[]>;
  stories: StoryItem[];
  viewedStories: Record<string, number>;
  calls: CallLog[];
  callsSeenAt: number;
  listings: Listing[];
  shops: Shop[];
  lifestyle: LifestyleItem[];
  pharmacies: Pharmacy[];
  requests: ConnectRequest[];
  intros: Introduction[];
  blockedIds: string[];
  verifiedIds: string[];
  sentRequestIds: string[];
  nearby: NearbyMode;
  setNearby: (nearby: NearbyMode) => void;
  codes: LiveCode[];
  codeChatTtl: number;
  pendingSignup: { phone?: string; country?: string; mode?: "signup" | "signin" };
  draft: string;
  composerChatId: string | null;
  drafts: Record<string, string>;
  typing: Record<string, boolean>;
  identity: KeyBundle | null;
  peerPublicKeys: Record<string, JsonWebKey>;
  serverProfileId: string | null;
  serverUsername: string | null;
  serverConnected: boolean;
  cryptoReady: boolean;
  privacy: { readReceipts: boolean };
  setLanguage: (language: Lang) => void;
  push: (screen: Screen) => void;
  pop: () => void;
  replace: (screen: Screen) => void;
  goTab: (name: Screen["name"]) => void;
  openDemo: () => void;
  resetDemo: () => void;
  completeSetup: (data: Partial<MeProfile>, freshAccount?: boolean) => void;
  updateMe: (data: Partial<MeProfile>) => void;
  changeAvatar: (avatar: string) => void;
  signOut: () => void;
  pinChat: (chatId: string, pinned: boolean) => void;
  archiveChat: (chatId: string, archived: boolean) => void;
  setMute: (chatId: string, mode: "off" | "always" | "1h" | "8h" | "1w") => void;
  toggleUnread: (chatId: string) => void;
  markRead: (chatId: string) => void;
  markCallsSeen: () => void;
  sendText: (chatId: string, text: string, extra?: Partial<Message>) => void;
  sendMessage: (chatId: string, data: Partial<Message> & { text?: string }) => string;
  retryMessage: (chatId: string, messageId: string) => void;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  tombstoneMessage: (chatId: string, messageId: string) => void;
  pinMessage: (chatId: string, messageId: string, pinned: boolean) => void;
  editMessage: (chatId: string, messageId: string, text: string) => void;
  markScratch: (chatId: string, messageId: string) => void;
  setDisappear: (chatId: string, ms: number) => void;
  burnViewOnce: (chatId: string, messageId: string) => void;
  setDraftFor: (chatId: string, text: string) => void;
  ensureCrypto: () => Promise<void>;
  syncServerInbox: () => Promise<void>;
  openServerDm: (username: string) => Promise<void>;
  openBusinessChat: (publicId: string) => Promise<void>;
  syncBusinessContexts: () => Promise<void>;
  applyLiveEvent: (event: LiveEvent) => Promise<void>;
  loadOlderMessages: (chatId: string) => Promise<boolean>;
  openOrCreateDm: (userId: string, asRequest?: boolean) => string;
  connectWith: (userId: string) => void;
  acceptRequest: (id: string) => void;
  ignoreRequest: (id: string) => void;
  viewStory: (userId: string) => void;
  createGroup: (name: string, participantIds: string[]) => void;
  ensureMyCode: () => LiveCode;
  regenerateMyCode: () => LiveCode;
  ensurePeerCode: (userId: string) => LiveCode;
  redeemCode: (code: string) => RedeemResult;
  simulateCodeEntered: (fromUserId?: string) => void;
  setCodeChatTtl: (ms: number) => void;
  openEphemeralChat: (userId: string, ttlMs?: number, via?: FoundVia) => string;
  sealChat: (chatId: string) => void;
  sealExpired: () => void;
};

function fresh(): Omit<
  Store,
  | "language"
  | "setLanguage"
  | "push"
  | "pop"
  | "replace"
  | "goTab"
  | "setNearby"
  | "openDemo"
  | "resetDemo"
  | "completeSetup"
  | "updateMe"
  | "changeAvatar"
  | "signOut"
  | "pinChat"
  | "archiveChat"
  | "setMute"
  | "toggleUnread"
  | "markRead"
  | "markCallsSeen"
  | "sendText"
  | "sendMessage"
  | "retryMessage"
  | "addReaction"
  | "deleteMessage"
  | "tombstoneMessage"
  | "pinMessage"
  | "editMessage"
  | "markScratch"
  | "setDisappear"
  | "burnViewOnce"
  | "setDraftFor"
  | "ensureCrypto"
  | "syncServerInbox"
  | "openServerDm"
  | "openBusinessChat"
  | "syncBusinessContexts"
  | "applyLiveEvent"
  | "loadOlderMessages"
  | "openOrCreateDm"
  | "connectWith"
  | "acceptRequest"
  | "ignoreRequest"
  | "viewStory"
  | "createGroup"
  | "ensureMyCode"
  | "regenerateMyCode"
  | "ensurePeerCode"
  | "redeemCode"
  | "simulateCodeEntered"
  | "setCodeChatTtl"
  | "openEphemeralChat"
  | "sealChat"
  | "sealExpired"
> {
  return {
    onboarded: false,
    stack: [{ name: "splash" }],
    me: demoMe(),
    users: seedUsers(),
    chats: withGroupMeta(seedChats()),
    messages: seedMessages(),
    stories: seedStories(),
    viewedStories: {},
    calls: seedCalls(),
    callsSeenAt: 0,
    listings: seedListings(),
    shops: seedShops(),
    lifestyle: seedLifestyle(),
    pharmacies: seedPharmacies(),
    requests: seedRequests(),
    intros: seedIntros(),
    blockedIds: [],
    verifiedIds: ["maya", "alex"],
    sentRequestIds: [],
    nearby: 0,
    codes: seedCodes(),
    codeChatTtl: 60 * 60_000,
    pendingSignup: { country: "CA" },
    draft: "",
    composerChatId: null,
    drafts: {},
    typing: {},
    identity: null,
    peerPublicKeys: {},
    serverProfileId: null,
    serverUsername: null,
    serverConnected: false,
    cryptoReady: false,
    privacy: { readReceipts: true },
  };
}

function pumpReceipt(get: () => Store, set: (fn: (st: Store) => Partial<Store>) => void, chatId: string, messageId: string) {
  setTimeout(() => {
    const current = get().chats.find((c) => c.id === chatId);
    if (!current || isChatSealed(current) || chatId.startsWith("srv:")) return;
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((x) => (x.id === messageId && x.status === "sending" ? { ...x, status: "sent" } : x)),
      },
    }));
  }, 420);
}

export const useWippStore = create<Store>((set, get) => ({
  language: "fr",
  ...fresh(),
  setLanguage: (language) => set({ language }),
  push: (screen) => set((s) => ({ stack: [...s.stack, screen] })),
  pop: () =>
    set((s) => ({
      stack: s.stack.length > 1 ? s.stack.slice(0, -1) : s.stack,
    })),
  replace: (screen) =>
    set((s) => ({
      stack: [...s.stack.slice(0, -1), screen],
    })),
  goTab: (name) => set({ stack: [{ name } as Screen] }),
  setNearby: (nearby) => set({ nearby }),
  openDemo: () => {
    set({ ...fresh(), onboarded: true, stack: [{ name: "chats" }] });
    void get().ensureCrypto();
  },
  resetDemo: () => set({ ...fresh(), language: get().language, stack: [{ name: "onboarding" }] }),
  completeSetup: (data, freshAccount = false) => {
    set((s) => ({
      onboarded: true,
      me: { ...s.me, ...s.pendingSignup, ...data, id: "me", online: true },
      stack: [{ name: "chats" }],
      ...(freshAccount
        ? { chats: [], messages: {}, requests: [], intros: [], stories: [], calls: [], users: { ...s.users } }
        : {}),
    }));
    void get().ensureCrypto();
    void get().syncServerInbox();
  },
  updateMe: (data) => set((s) => ({ me: { ...s.me, ...data } })),
  changeAvatar: (avatar) => set((s) => ({ me: { ...s.me, avatar } })),
  signOut: () => get().resetDemo(),
  pinChat: (chatId, pinned) => {
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, pinned } : c)) }));
    if (chatId.startsWith("srv:") && !isPrivateChat(chatId)) {
      void import("./messaging/client").then(({ postChatPrefs }) => postChatPrefs(chatId.slice(4), { pinned }));
    }
  },
  archiveChat: (chatId, archived) => {
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, archived } : c)) }));
    if (chatId.startsWith("srv:") && !isPrivateChat(chatId)) {
      void import("./messaging/client").then(({ postChatPrefs }) => postChatPrefs(chatId.slice(4), { archived }));
    }
  },
  setMute: (chatId, mode) => {
    const muted = mode !== "off";
    const until =
      mode === "1h" ? Date.now() + 3_600_000 : mode === "8h" ? Date.now() + 8 * 3_600_000 : mode === "1w" ? Date.now() + 7 * 86_400_000 : null;
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, muted, muteAlways: mode === "always", mutedUntil: until } : c,
      ),
    }));
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then(({ postChatPrefs }) => postChatPrefs(chatId.slice(4), { mute: mode }));
    }
  },
  toggleUnread: (chatId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    const markUnread = !chat?.manuallyUnreadAt && !chat?.unread;
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? { ...c, manuallyUnreadAt: markUnread ? Date.now() : null, unread: markUnread ? Math.max(1, c.unread) : 0 }
          : c,
      ),
    }));
    if (!chatId.startsWith("srv:")) return;
    void import("./messaging/client").then(async ({ postChatPrefs, postReceipts }) => {
      await postChatPrefs(chatId.slice(4), { manuallyUnread: markUnread });
      if (!markUnread && get().privacy.readReceipts !== false) {
        const ids = (get().messages[chatId] ?? []).filter((m) => m.fromId !== "me").map((m) => m.id);
        if (ids.length) await postReceipts(chatId.slice(4), ids, "read");
      }
    });
  },
  markCallsSeen: () => set({ callsSeenAt: Date.now() }),
  markRead: (chatId) => {
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0, manuallyUnreadAt: null } : c)),
    }));
    if (!chatId.startsWith("srv:")) return;
    void import("./messaging/client").then(({ postChatPrefs }) =>
      postChatPrefs(chatId.slice(4), { manuallyUnread: false }).catch(() => {}),
    );
    void (async () => {
      try {
        const { syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages, toServerChatId } = await import(
          "./messaging/sync"
        );
        const synced = await syncChatMessages(chatId);
        if (synced && "messages" in synced) {
          set((st) => mergeServerMessagesIntoState(st, toServerChatId(chatId), synced.messages, synced.meServerId));
          const dec = await decryptMergedMessages(get(), chatId, get().identity);
          if (Object.keys(dec).length) set(() => dec);
        }
        const receiptsOn = get().privacy.readReceipts !== false;
        const incoming = (get().messages[chatId] ?? []).filter((m) => m.fromId !== "me" && !m.deletedForAll).map((m) => m.id);
        if (incoming.length) {
          const { postReceipts } = await import("./messaging/client");
          await postReceipts(chatId.slice(4), incoming, receiptsOn ? "read" : "delivered");
        }
      } catch {
        /* offline */
      }
    })();
  },
  setDraftFor: (chatId, text) => set((s) => ({ drafts: { ...s.drafts, [chatId]: text } })),
  sendText: (chatId, text, extra) => {
    get().sendMessage(chatId, { type: "text", text, ...extra });
  },
  sendMessage: (chatId, data) => {
    const existingChat = get().chats.find((c) => c.id === chatId);
    if (existingChat && isChatSealed(existingChat)) return "";
    const cited = data.replyTo ? (get().messages[chatId] ?? []).find((m) => m.id === data.replyTo) : undefined;
    const message: Message = {
      id: data.id ?? uid("m"),
      chatId,
      fromId: "me",
      type: data.type ?? "text",
      text: data.text,
      createdAt: Date.now(),
      status: "sending",
      reactions: [],
      duration: data.duration,
      audioUrl: data.audioUrl,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      viewOnce: data.viewOnce || undefined,
      mediaState: data.mediaState,
      album: data.album,
      file: data.file,
      gifUrl: data.gifUrl,
      stickerId: data.stickerId,
      scratchDesign: data.scratchDesign,
      scratchCardId: data.scratchCardId,
      effectId: data.effectId,
      revealedAt: data.revealedAt,
      listingId: data.listingId,
      shopId: data.shopId ?? existingChat?.shopId,
      replyTo: data.replyTo,
      replyPreview:
        data.replyPreview ??
        (cited?.deletedForAll ? "Message supprimé" : cited?.text?.replace(/\s+/g, " ").trim().slice(0, 80)),
      forwarded: data.forwarded,
      mentions: data.mentions,
      expiresAt: existingChat?.disappearAfterMs ? Date.now() + existingChat.disappearAfterMs : undefined,
      attachmentId: data.attachmentId,
      mediaMime: data.mediaMime,
      progress: data.progress,
    };
    set((st) => ({
      messages: { ...st.messages, [chatId]: [...(st.messages[chatId] ?? []), message] },
      drafts: { ...st.drafts, [chatId]: "" },
      chats: st.chats.map((c) =>
        c.id === chatId ? { ...c, preview: previewOf(message, st.language), lastAt: message.createdAt, unread: 0, isRequest: false } : c,
      ),
    }));
    if (!chatId.startsWith("srv:")) pumpReceipt(get, set, chatId, message.id);

    if (chatId.startsWith("srv:") && data.stickerId && message.type === "sticker") {
      void (async () => {
        const { describeMedia } = await import("./messaging/media-crypto");
        const { sendViaServer } = await import("./messaging/sync");
        const st = get();
        await sendViaServer(chatId, describeMedia({ kind: "sticker", stickerId: data.stickerId }), message.id, {
          identity: st.identity,
          peerPublicJwk: peerPubOf(st, chatId),
          vault: isPrivateChat(chatId),
        });
      })();
    }

    if (message.type === "scratch") {
      void (async () => {
        const { isServerChatId, sendViaServer, syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages } =
          await import("./messaging/sync");
        if (!isServerChatId(chatId)) return;
        const st = get();
        const surprise: SurprisePlain = {
          surpriseType: (message.scratchCardId as SurprisePlain["surpriseType"]) ?? "scratch",
          designId: message.scratchDesign,
          animationId: message.effectId,
          countdown: message.duration,
        };
        await sendViaServer(chatId, message.text ?? "", message.id, {
          identity: st.identity,
          peerPublicJwk: peerPubOf(st, chatId),
          vault: isPrivateChat(chatId),
          surprise,
        });
        const synced = await syncChatMessages(chatId);
        if (synced && "messages" in synced) {
          set((s) => mergeServerMessagesIntoState(s, chatId.replace(/^srv:/, ""), synced.messages, synced.meServerId));
          const dec = await decryptMergedMessages(get(), chatId, get().identity);
          if (Object.keys(dec).length) set(() => dec);
        }
      })();
    }

    if (message.type === "text" && message.text) {
      void (async () => {
        try {
          const {
            isServerChatId,
            sendViaServer,
            syncChatMessages,
            mergeServerMessagesIntoState,
            decryptMergedMessages,
          } = await import("./messaging/sync");
          if (!isServerChatId(chatId)) return;
          const st = get();
          const reply = message.replyTo ? (st.messages[chatId] ?? []).find((m) => m.id === message.replyTo) : undefined;
          const cite = reply?.deletedForAll
            ? "Message supprimé"
            : (reply?.text ?? data.replyPreview ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
          try {
            await sendViaServer(chatId, message.text!, message.id, {
              identity: st.identity,
              peerPublicJwk: peerPubOf(st, chatId),
              reply: message.replyTo ? { id: message.replyTo, preview: cite, senderId: reply?.fromId } : undefined,
              forwarded: data.forwarded,
              vault: isPrivateChat(chatId),
            });
          } catch (err) {
            const { enqueueOutbox } = await import("./messaging/outbox");
            enqueueOutbox({
              localChatId: chatId,
              clientId: message.id,
              text: message.text!,
              replyId: message.replyTo,
              replyPreview: cite,
              replySenderId: reply?.fromId,
              forwarded: data.forwarded,
              vault: isPrivateChat(chatId),
            });
            set((s) => ({
              messages: {
                ...s.messages,
                [chatId]: (s.messages[chatId] ?? []).map((m) => (m.id === message.id ? { ...m, status: "failed" as const } : m)),
              },
            }));
            throw err;
          }
          const synced = await syncChatMessages(chatId);
          if (synced && "messages" in synced) {
            set((s) => mergeServerMessagesIntoState(s, chatId.replace(/^srv:/, ""), synced.messages, synced.meServerId));
            const dec = await decryptMergedMessages(get(), chatId, get().identity);
            if (Object.keys(dec).length) set(() => dec);
          }
        } catch (err) {
          console.warn("[wipp] server send failed", err);
        }
      })();
    }
    return message.id;
  },
  retryMessage: (chatId, messageId) => {
    const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
    if (!msg) return;
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) => (m.id === messageId ? { ...m, status: "sending" as const } : m)),
      },
    }));
    if (chatId.startsWith("srv:") && msg.text) {
      void (async () => {
        const { flushOutboxItem } = await import("./messaging/flush-outbox");
        await flushOutboxItem(get, set, {
          localChatId: chatId,
          clientId: messageId,
          text: msg.text!,
          replyId: msg.replyTo,
          replyPreview: msg.replyPreview,
        });
      })();
      return;
    }
    pumpReceipt(get, set, chatId, messageId);
  },
  addReaction: (chatId, messageId, emoji) => {
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) => {
          if (m.id !== messageId) return m;
          const mine = m.reactions.find((r) => r.userId === "me");
          const rest = m.reactions.filter((r) => r.userId !== "me");
          if (mine?.emoji === emoji) return { ...m, reactions: rest };
          return { ...m, reactions: [...rest, { emoji, userId: "me" }] };
        }),
      },
    }));
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then(({ reactServerMessage }) =>
        reactServerMessage(chatId.replace(/^srv:/, ""), messageId, emoji),
      );
    }
  },
  deleteMessage: (chatId, messageId) => {
    set((st) => ({
      messages: { ...st.messages, [chatId]: (st.messages[chatId] ?? []).filter((m) => m.id !== messageId) },
    }));
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then(({ hideServerMessage }) => hideServerMessage(chatId.replace(/^srv:/, ""), messageId));
    }
  },
  tombstoneMessage: (chatId, messageId) => {
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, deletedForAll: true, text: "Message supprimé", type: "system", pinned: false, reactions: [] } : m,
        ),
      },
    }));
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then(({ tombstoneServerMessage }) =>
        tombstoneServerMessage(chatId.replace(/^srv:/, ""), messageId),
      );
    }
  },
  pinMessage: (chatId, messageId, pinned) => {
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) => (m.id === messageId ? { ...m, pinned } : m)),
      },
    }));
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then(({ pinServerMessage }) => pinServerMessage(chatId.slice(4), messageId, pinned));
    }
  },
  editMessage: (chatId, messageId, text) => {
    const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
    if (!msg || msg.fromId !== "me" || Date.now() - msg.createdAt > EDIT_WINDOW_MS) return;
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) => (m.id === messageId ? { ...m, text, editedAt: Date.now() } : m)),
      },
    }));
    if (!chatId.startsWith("srv:")) return;
    void (async () => {
      const { editViaServer } = await import("./messaging/sync");
      const st = get();
      const reply = msg.replyTo ? (st.messages[chatId] ?? []).find((m) => m.id === msg.replyTo) : undefined;
      await editViaServer(chatId, messageId, text, {
        identity: st.identity,
        peerPublicJwk: peerPubOf(st, chatId),
        reply: msg.replyTo ? { id: msg.replyTo, preview: msg.replyPreview ?? "", senderId: reply?.fromId } : undefined,
        forwarded: msg.forwarded,
      });
    })();
  },
  markScratch: (chatId, messageId) =>
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) => (m.id === messageId && !m.revealedAt ? { ...m, revealedAt: Date.now() } : m)),
      },
    })),
  setDisappear: (chatId, ms) => {
    if (chatId.startsWith("srv:")) {
      void import("./messaging/client").then((c) => c.postDisappear(chatId.slice(4), ms).catch(() => undefined));
    }
    const lang = get().language;
    const label = !ms
      ? "Les nouveaux messages ne disparaîtront plus."
      : ms >= 30 * 86_400_000
        ? "Les nouveaux messages disparaîtront après 30 jours."
        : ms >= DISAPPEAR_7D
          ? "Les nouveaux messages disparaîtront après 7 jours."
          : ms >= DISAPPEAR_24H
            ? "Les nouveaux messages disparaîtront après 24 heures."
            : lang === "fr"
              ? "Messages éphémères activés."
              : "Disappearing messages on.";
    const sys: Message = {
      id: uid("m"),
      chatId,
      fromId: "me",
      type: "system",
      text: label,
      createdAt: Date.now(),
      status: "read",
      reactions: [],
    };
    set((st) => ({
      chats: st.chats.map((c) => (c.id === chatId ? { ...c, disappearAfterMs: ms || undefined } : c)),
      messages: { ...st.messages, [chatId]: [...(st.messages[chatId] ?? []), sys] },
    }));
  },
  burnViewOnce: (chatId, messageId) =>
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, viewed: true, imageUrl: undefined, videoUrl: undefined, text: undefined } : m,
        ),
      },
    })),
  ensureCrypto: async () => {
    let identity = get().identity ?? (await loadIdentity());
    if (!identity) {
      identity = await generateBundle();
      await saveIdentity(identity);
    }
    const myFingerprint = await fingerprintOf(identity.publicJwk);
    set({ identity, cryptoReady: true });
    void myFingerprint;
    try {
      const { publishIdentityPublicKey } = await import("./messaging/sync");
      await publishIdentityPublicKey(identity);
    } catch (err) {
      console.warn("[wipp] e2e key publish skipped", err);
    }
  },
  syncServerInbox: async () => {
    try {
      const me = get().me;
      const { bootstrapMessaging, mergeServerChatsIntoState } = await import("./messaging/sync");
      const { profile, chats } = await bootstrapMessaging({
        username: me.username || "user",
        displayName: me.displayName || `${me.firstName} ${me.lastName}`.trim() || "WIPP",
      });
      set((st) => ({
        ...mergeServerChatsIntoState(st, chats, profile.id),
        serverProfileId: profile.id,
        serverUsername: profile.username,
        serverConnected: true,
      }));
      void get().syncBusinessContexts();
      const { flushAllOutbox } = await import("./messaging/flush-outbox");
      await flushAllOutbox(get as never, set as never);
    } catch (err) {
      console.warn("[wipp] server sync failed", err);
      set({ serverConnected: false });
    }
  },
  openServerDm: async (username) => {
    const {
      startChatWithUsername,
      mergeServerChatsIntoState,
      toLocalChatId,
      syncChatMessages,
      mergeServerMessagesIntoState,
      decryptMergedMessages,
    } = await import("./messaging/sync");
    await get().ensureCrypto();
    const chat = await startChatWithUsername(username);
    const profileId = get().serverProfileId ?? undefined;
    set((st) => mergeServerChatsIntoState(st, [chat], profileId));
    const localId = toLocalChatId(chat.id);
    const synced = await syncChatMessages(localId);
    if (synced && "messages" in synced) {
      set((st) => mergeServerMessagesIntoState(st, chat.id, synced.messages, synced.meServerId));
      const dec = await decryptMergedMessages(get(), localId, get().identity);
      if (Object.keys(dec).length) set(() => dec);
    }
    get().push({ name: "conversation", chatId: localId });
  },
  syncBusinessContexts: async () => {
    try {
      const [{ listBusinessChatContexts }, { toLocalChatId }] = await Promise.all([
        import("./messaging/client"),
        import("./messaging/sync"),
      ]);
      const ctx = await listBusinessChatContexts();
      set((st) => {
        const shops = [...st.shops];
        const byChat = new Map<string, string>();
        for (const c of ctx) {
          const localId = toLocalChatId(c.chatId);
          const chat = st.chats.find((x) => x.id === localId);
          const peerId = chat?.participantIds.find((id) => id !== "me") ?? "";
          const shopId = `business:${c.publicId}`;
          const shop = businessShop(c, shopId, c.ownerIsMe ? "me" : peerId);
          const i = shops.findIndex((x) => x.id === shopId);
          if (i >= 0) shops[i] = { ...shops[i], ...shop };
          else shops.push(shop);
          byChat.set(localId, shopId);
        }
        return {
          shops,
          chats: st.chats.map((c) => (byChat.has(c.id) ? { ...c, shopId: byChat.get(c.id) } : c)),
        };
      });
    } catch (err) {
      console.warn("[wipp] business contexts failed", err);
    }
  },
  openBusinessChat: async (publicId) => {
    const [client, sync] = await Promise.all([import("./messaging/client"), import("./messaging/sync")]);
    await get().ensureCrypto();
    const { chatId } = await client.openBusinessChat(publicId);
    await get().syncServerInbox();
    await get().syncBusinessContexts();
    const localId = sync.toLocalChatId(chatId);
    const synced = await sync.syncChatMessages(localId);
    if (synced && "messages" in synced) {
      set((st) => sync.mergeServerMessagesIntoState(st, chatId, synced.messages, synced.meServerId));
      const dec = await sync.decryptMergedMessages(get(), localId, get().identity);
      if (Object.keys(dec).length) set(() => dec);
    }
    get().push({ name: "conversation", chatId: localId });
  },
  applyLiveEvent: async (event) => {
    if (event.kind === "typing") {
      const payload = event.payload as { active?: boolean; profileId?: string };
      const me = (await import("./messaging/client")).getStoredProfile()?.id;
      if (payload.profileId && payload.profileId === me) return;
      const localId = `srv:${event.chatId}`;
      set((st) => ({ typing: { ...st.typing, [localId]: Boolean(payload.active) } }));
      if (payload.active) {
        setTimeout(() => {
          set((st) => ({ typing: { ...st.typing, [localId]: false } }));
        }, 4500);
      }
      return;
    }
    try {
      const { syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages, mergeServerChatsIntoState } =
        await import("./messaging/sync");
      const localId = `srv:${event.chatId}`;
      if (!get().chats.some((c) => c.id === localId)) {
        await get().syncServerInbox();
      }
      const synced = await syncChatMessages(localId);
      if (synced && "messages" in synced) {
        set((s) => mergeServerMessagesIntoState(s, event.chatId, synced.messages, synced.meServerId));
        const dec = await decryptMergedMessages(get(), localId, get().identity);
        if (Object.keys(dec).length) set(() => dec);
      }
      const top = get().stack.at(-1);
      const open = top?.name === "conversation" && (top as { chatId?: string }).chatId === localId;
      if (open && event.kind === "message") {
        const me = (await import("./messaging/client")).getStoredProfile()?.id;
        const incoming = (synced && "messages" in synced ? synced.messages : [])
          .filter((m) => m.senderId !== me && !m.deletedAt)
          .map((m) => m.id);
        if (incoming.length) {
          const { postReceipts } = await import("./messaging/client");
          const receiptsOn = get().privacy.readReceipts !== false;
          await postReceipts(event.chatId, incoming, receiptsOn ? "read" : "delivered");
        }
      } else if (event.kind === "message" && !open) {
        const { fetchServerChats } = await import("./messaging/client");
        const chats = await fetchServerChats();
        set((st) => mergeServerChatsIntoState(st, chats, get().serverProfileId ?? undefined));
      }
    } catch (err) {
      console.warn("[wipp] live event failed", err);
    }
  },
  loadOlderMessages: async (chatId) => {
    if (!chatId.startsWith("srv:")) return false;
    const list = get().messages[chatId] ?? [];
    const oldest = list[0]?.createdAt;
    if (!oldest) return false;
    const { syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages } = await import("./messaging/sync");
    const synced = await syncChatMessages(chatId, oldest);
    if (!(synced && "messages" in synced) || !synced.messages.length) return false;
    set((st) => mergeServerMessagesIntoState(st, chatId.slice(4), synced.messages, synced.meServerId));
    const dec = await decryptMergedMessages(get(), chatId, get().identity);
    if (Object.keys(dec).length) set(() => dec);
    return synced.messages.length >= 80;
  },
  openOrCreateDm: (userId, asRequest = false) => {
    const existing = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
    if (existing) {
      if (!asRequest && existing.isRequest) {
        set((s) => ({
          chats: s.chats.map((c) => (c.id === existing.id ? { ...c, isRequest: false } : c)),
        }));
      }
      get().markRead(existing.id);
      get().push({ name: "conversation", chatId: existing.id });
      return existing.id;
    }
    const user = get().users[userId];
    if (user?.username && (userId.startsWith("srvuser:") || get().serverConnected)) {
      void get().openServerDm(user.username);
      return "";
    }
    const chat: Chat = {
      id: uid("c"),
      type: "dm",
      participantIds: ["me", userId],
      unread: 0,
      muted: false,
      pinned: false,
      archived: false,
      isRequest: Boolean(asRequest),
      preview: "",
      lastAt: Date.now(),
    };
    set((s) => ({
      chats: [chat, ...s.chats],
      messages: { ...s.messages, [chat.id]: [] },
      users: {
        ...s.users,
        [userId]: s.users[userId] ? { ...s.users[userId], connected: true } : s.users[userId],
      },
    }));
    get().push({ name: "conversation", chatId: chat.id });
    return chat.id;
  },
  connectWith: (userId) => {
    const user = get().users[userId];
    if (!user) return;
    if (user.connected) {
      get().openOrCreateDm(userId);
      return;
    }
    if (user.username && get().serverConnected) {
      void get().openServerDm(user.username);
      return;
    }
    if (get().sentRequestIds.includes(userId)) return;
    set((s) => ({ sentRequestIds: [...s.sentRequestIds, userId] }));
  },
  acceptRequest: (id) => {
    const req = get().requests.find((r) => r.id === id);
    if (!req) return;
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "accepted" } : r)),
      users: {
        ...s.users,
        [req.fromId]: s.users[req.fromId] ? { ...s.users[req.fromId], connected: true } : s.users[req.fromId],
      },
    }));
    get().openOrCreateDm(req.fromId);
  },
  ensureMyCode: () => {
    const existing = get().codes.find((c) => c.ownerId === "me" && c.expiresAt > Date.now());
    if (existing) return existing;
    return get().regenerateMyCode();
  },
  regenerateMyCode: () => {
    const next: LiveCode = {
      code: sixDigit(),
      expiresAt: Date.now() + CODE_TTL,
      ownerId: "me",
      chatTtlMs: get().codeChatTtl,
    };
    set((s) => ({ codes: [next, ...s.codes.filter((c) => c.ownerId !== "me")] }));
    return next;
  },
  ensurePeerCode: (userId) => {
    const existing = get().codes.find((c) => c.ownerId === userId && c.expiresAt > Date.now());
    if (existing) return existing;
    const next: LiveCode = {
      code: sixDigit(),
      expiresAt: Date.now() + CODE_TTL,
      ownerId: userId,
      chatTtlMs: 60 * 60_000,
    };
    set((s) => ({ codes: [next, ...s.codes.filter((c) => c.ownerId !== userId)] }));
    return next;
  },
  redeemCode: (raw) => {
    const code = raw.replace(/\s+/g, "");
    const rows = get().codes.filter((c) => c.code === code);
    if (!rows.length) return { ok: false, reason: "missing" };
    const live = rows.find((c) => c.expiresAt > Date.now());
    if (!live) return { ok: false, reason: "expired" };
    if (live.ownerId === "me") return { ok: false, reason: "own" };
    set((s) => ({ codes: s.codes.filter((c) => c.ownerId !== live.ownerId) }));
    get().openEphemeralChat(live.ownerId, live.chatTtlMs, "code");
    return { ok: true, kind: "profile", userId: live.ownerId, via: "code" };
  },
  simulateCodeEntered: (fromUserId = "ines") => {
    if (!get().users[fromUserId]) return;
    get().openEphemeralChat(fromUserId, get().codeChatTtl);
  },
  setCodeChatTtl: (ms) =>
    set((s) => ({
      codeChatTtl: ms,
      codes: s.codes.map((c) => (c.ownerId === "me" && c.expiresAt > Date.now() ? { ...c, chatTtlMs: ms } : c)),
    })),
  openEphemeralChat: (userId, ttlMs, via) => {
    get().sealExpired();
    const ttl = ttlMs ?? get().codeChatTtl;
    const permanent = get().chats.find((c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral);
    if (permanent) {
      get().replace({ name: "conversation", chatId: permanent.id });
      get().markRead(permanent.id);
      return permanent.id;
    }
    const existing = get().chats.find(
      (c) => c.type === "dm" && c.participantIds.includes(userId) && c.ephemeral && !isChatSealed(c),
    );
    if (existing) {
      get().replace({ name: "conversation", chatId: existing.id });
      get().markRead(existing.id);
      return existing.id;
    }
    const fr = get().language === "fr";
    const opened =
      via === "touch"
        ? fr
          ? "Vous vous êtes croisés. Prénom seulement. Le chat s’efface à l’heure dite."
          : "You crossed paths. First name only. The thread disappears at the set time."
        : fr
          ? "Chat temporaire. Aucun @ n’est visible. Le chat s’efface à l’heure dite."
          : "Temporary chat. No @ is visible. The thread disappears at the set time.";
    const chat: Chat = {
      id: uid("c"),
      type: "dm",
      participantIds: ["me", userId],
      unread: 0,
      muted: false,
      pinned: false,
      archived: false,
      isRequest: false,
      preview: opened,
      lastAt: Date.now(),
      ephemeral: true,
      expiresAt: Date.now() + ttl,
      sealed: false,
    };
    const system: Message = {
      id: uid("m"),
      chatId: chat.id,
      fromId: "me",
      type: "system",
      text: opened,
      createdAt: Date.now(),
      status: "read",
      reactions: [],
    };
    set((s) => ({
      chats: [chat, ...s.chats],
      messages: { ...s.messages, [chat.id]: [system] },
    }));
    const top = get().stack.at(-1)?.name;
    if (top === "live-code" || top === "scanner" || top === "one-time-qr" || top === "wgo-touch") {
      get().replace({ name: "conversation", chatId: chat.id });
    } else {
      get().push({ name: "conversation", chatId: chat.id });
    }
    return chat.id;
  },
  sealChat: (chatId) => {
    const ended = get().language === "fr" ? "Conversation terminée. Plus aucun accès." : "Chat ended. No access left.";
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, sealed: true, preview: ended, unread: 0, lastAt: Date.now() } : c,
      ),
      messages: {
        ...s.messages,
        [chatId]: [
          {
            id: uid("m"),
            chatId,
            fromId: "me",
            type: "system",
            text: ended,
            createdAt: Date.now(),
            status: "read",
            reactions: [],
          },
        ],
      },
    }));
  },
  sealExpired: () => {
    const now = Date.now();
    get()
      .chats.filter((c) => c.ephemeral && !c.sealed && c.expiresAt && c.expiresAt <= now)
      .forEach((c) => get().sealChat(c.id));
  },
  ignoreRequest: (id) =>
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "ignored" } : r)),
    })),
  viewStory: (userId) =>
    set((s) => ({ viewedStories: { ...s.viewedStories, [userId]: Date.now() } })),
  createGroup: (name, participantIds) => {
    const chat: Chat = {
      id: uid("g"),
      type: "group",
      name: name.trim() || "Groupe",
      participantIds: ["me", ...participantIds],
      unread: 0,
      muted: false,
      pinned: false,
      archived: false,
      isRequest: false,
      preview: "",
      lastAt: Date.now(),
    };
    set((s) => ({ chats: [chat, ...s.chats], messages: { ...s.messages, [chat.id]: [] } }));
    get().push({ name: "conversation", chatId: chat.id });
  },
}));

export function useT() {
  const language = useWippStore((s) => s.language);
  return (key: I18nKey) => translate(language, key);
}

export function chatPeer(chat: Chat, users: Record<string, User>) {
  const id = chat.participantIds.find((x) => x !== "me");
  return id ? users[id] : undefined;
}
