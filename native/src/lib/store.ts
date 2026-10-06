import { Alert } from "react-native";
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
  NotifSettings,
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
  isSeedDemoChat,
  defaultNotifs,
} from "./seed";
import { sixDigit, uid } from "./utils";
import { fingerprintOf, generateBundle, type KeyBundle } from "./crypto";
import { loadIdentity, saveIdentity } from "./messaging/identity";
import { isPrivateChat as isVaultChat, subscribePrivateVault } from "./private-vault";
import type { LiveEvent } from "./messaging/message-live";
import { stickerById } from "./stickers";
import type { SurprisePlain } from "./messaging/plain";
import { errorText } from "./error-fr";

const TAB: Screen["name"][] = ["chats", "calls", "connect", "explore", "me"];
const CODE_TTL = 60_000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function isTabScreen(name: Screen["name"]) {
  return TAB.includes(name);
}

export function isPrivateChat(id: string) {
  return isVaultChat(id);
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
  if (message.type === "shop") return message.text ? `🏪 ${message.text}` : "Carte professionnelle";
  return message.text ?? "";
}

let inboxSaveTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced encrypted snapshot of the real inbox (shown instantly at the next cold start). */
export function scheduleInboxSave(get: () => Store) {
  if (inboxSaveTimer) clearTimeout(inboxSaveTimer);
  inboxSaveTimer = setTimeout(() => {
    inboxSaveTimer = null;
    const st = get();
    if (!st.serverConnected || !st.serverProfileId) return;
    const chats = st.chats.filter((c) => c.id.startsWith("srv:"));
    void import("./inbox-cache").then(({ saveInboxSnapshot }) =>
      saveInboxSnapshot({ profileId: st.serverProfileId!, chats, messages: st.messages, users: st.users, meAvatar: st.me.avatar || "" }),
    );
  }, 2500);
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
  saves: { kind: "listing" | "event" | "business"; id: string }[];
  shops: Shop[];
  lifestyle: LifestyleItem[];
  pharmacies: Pharmacy[];
  requests: ConnectRequest[];
  intros: Introduction[];
  blockedIds: string[];
  verifiedIds: string[];
  sentRequestIds: string[];
  nearby: NearbyMode;
  /** End of my 15 / 60 min visibility (server time), null = until off or Invisible. */
  nearbyUntil: number | null;
  vaultEpoch: number;
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
  notifs: NotifSettings;
  pushMaster: boolean;
  pushGranted: boolean;
  setNotif: (key: keyof NotifSettings, value: boolean) => void;
  setPushMaster: (on: boolean) => void;
  setPushGranted: (on: boolean) => void;
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
  forwardMessage: (targetChatId: string, source: Message) => void;
  connectWith: (userId: string, via?: FoundVia) => void;
  acceptRequest: (id: string, choice?: import("./types").ConnectionChoice) => void;
  /** Server truth: who is an ACTIVE contact (ephemeral ones disappear when they expire). */
  refreshConnections: () => Promise<void>;
  ignoreRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  blockUser: (userId: string) => void;
  refreshIncomingRequests: () => Promise<void>;
  viewStory: (userId: string) => void;
  createGroup: (name: string, participantIds: string[], extra?: { description?: string; photoUri?: string; photoMime?: string }) => void;
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
  | "forwardMessage"
  | "connectWith"
  | "acceptRequest"
  | "refreshConnections"
  | "ignoreRequest"
  | "declineRequest"
  | "blockUser"
  | "refreshIncomingRequests"
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
  | "setNotif"
  | "setPushMaster"
  | "setPushGranted"
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
    saves: [],
    shops: seedShops(),
    lifestyle: seedLifestyle(),
    pharmacies: seedPharmacies(),
    requests: seedRequests(),
    intros: seedIntros(),
    blockedIds: [],
    verifiedIds: ["maya", "alex"],
    sentRequestIds: [],
    nearby: 0,
    nearbyUntil: null,
    vaultEpoch: 0,
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
    notifs: { ...defaultNotifs },
    pushMaster: false,
    pushGranted: false,
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

let inboxSyncTicket = 0;

export const useWippStore = create<Store>((set, get) => ({
  language: "fr",
  ...fresh(),
  setLanguage: (language) => set({ language }),
  setNotif: (key, value) => {
    set((s) => {
      const notifs = { ...s.notifs, [key]: value };
      void import("./push/prefs").then(({ saveNotifPrefs }) => saveNotifPrefs({ notifs, pushMaster: s.pushMaster }));
      return { notifs };
    });
  },
  setPushMaster: (on) => {
    set((s) => {
      void import("./push/prefs").then(({ saveNotifPrefs }) => saveNotifPrefs({ notifs: s.notifs, pushMaster: on }));
      return { pushMaster: on };
    });
  },
  setPushGranted: (on) => set({ pushGranted: on }),
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
    void import("./push").then(({ onSessionReady }) => onSessionReady());
  },
  resetDemo: () => set({ ...fresh(), language: get().language, stack: [{ name: "onboarding" }] }),
  completeSetup: (data, freshAccount = false) => {
    set((s) => ({
      onboarded: true,
      me: { ...s.me, ...s.pendingSignup, ...data, id: "me", online: true },
      stack: [{ name: "chats" }],
      ...(freshAccount
        ? {
            chats: [],
            messages: {},
            requests: [],
            intros: [],
            calls: [],
            users: { ...s.users },
          }
        : {}),
    }));
    void get().ensureCrypto();
    void get().syncServerInbox();
    void import("./push").then(({ onSessionReady }) => onSessionReady());
  },
  updateMe: (data) => set((s) => ({ me: { ...s.me, ...data } })),
  changeAvatar: (avatar) => {
    set((s) => ({ me: { ...s.me, avatar } }));
    const id = get().serverProfileId;
    if (id) void import("./media-url-cache").then(({ rememberMyAvatar }) => rememberMyAvatar(id, avatar));
  },
  signOut: () => {
    // À proximité: my presence is deleted on the server BEFORE the session ends (needs the token).
    const nearbyCleared = import("./proximity/nearby-visibility")
      .then((m) => m.clearNearbyPresence())
      .catch(() => undefined);
    void Promise.race([nearbyCleared, new Promise((r) => setTimeout(r, 4000))]).finally(() => {
      void import("./firebase-phone").then(({ signOutFirebase }) => signOutFirebase());
      void import("./push").then(({ unregisterThisInstall }) => unregisterThisInstall());
      void import("./proximity/wipp-session").then(({ persistWippToken }) => persistWippToken(null));
    });
    void import("./messaging/identity").then((m) => m.clearNotificationIdentity());
    void import("./messaging/group-e2e").then((m) => m.forgetGroupKeys());
    void import("./inbox-cache").then((m) => m.clearInboxSnapshot());
    void import("./firebase-linked-session").then(({ clearLinkedSession }) => clearLinkedSession());
    void import("./proximity/lifecycle").then(({ syncProximityLifecycle }) => syncProximityLifecycle("splash", "background"));
    get().resetDemo();
  },
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
    void import("./push").then(({ syncAppBadge }) => syncAppBadge());
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
      } catch (err) {
        console.warn("[wipp] read receipts skipped", err);
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
      storyRef: data.storyRef,
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

    const groupServer = existingChat?.type === "group" && chatId.startsWith("srv:");
    if (groupServer && (message.type === "text" || message.type === "sticker")) {
      void (async () => {
        try {
          const { postGroupMessage, mentionIdsInText } = await import("./lot7/api");
          const members = (existingChat?.participantIds ?? [])
            .filter((id) => id !== "me")
            .map((id) => ({ id, username: get().users[id]?.username }));
          const plainBody =
            message.type === "text" || !message.stickerId
              ? message.text ?? ""
              : JSON.stringify({ k: "wipp-group-media", type: "sticker", stickerId: message.stickerId, text: message.text });
          if (!plainBody) return;
          // End-to-end: encrypted with the group key (the server only stores ciphertext).
          // Without an identity key on this phone (very old install), the message cannot be encrypted.
          const st0 = get();
          let body = plainBody;
          if (st0.identity && st0.serverProfileId) {
            const { encryptGroupBody } = await import("./messaging/group-e2e");
            const sealed = await encryptGroupBody(chatId, plainBody, st0.identity, st0.serverProfileId);
            if (!sealed) throw new Error("group_e2e_unavailable");
            body = sealed;
          }
          await postGroupMessage({
            chatId: chatId.slice(4),
            body,
            clientId: message.id,
            replyTo: message.replyTo ?? null,
            mentions: mentionIdsInText(message.text ?? "", members),
          });
          set((s) => ({
            messages: {
              ...s.messages,
              [chatId]: (s.messages[chatId] ?? []).map((m) => (m.id === message.id ? { ...m, status: "sent" as const } : m)),
            },
          }));
          const { syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages } = await import("./messaging/sync");
          const synced = await syncChatMessages(chatId);
          if (synced && "messages" in synced) {
            set((s) => mergeServerMessagesIntoState(s, chatId.slice(4), synced.messages, synced.meServerId));
            const dec = await decryptMergedMessages(get(), chatId, get().identity);
            if (Object.keys(dec).length) set(() => dec);
          }
        } catch (err) {
          console.warn("[wipp] group send failed", err);
          set((s) => ({
            messages: {
              ...s.messages,
              [chatId]: (s.messages[chatId] ?? []).map((m) => (m.id === message.id ? { ...m, status: "failed" as const } : m)),
            },
          }));
        }
      })();
    }

    if (!groupServer && chatId.startsWith("srv:") && data.stickerId && message.type === "sticker") {
      void (async () => {
        const { describeMedia } = await import("./messaging/media-crypto");
        const { sendViaServer } = await import("./messaging/sync");
        const st = get();
        await sendViaServer(chatId, describeMedia({ kind: "sticker", stickerId: data.stickerId }), message.id, {
          identity: st.identity,
          peerPublicJwk: peerPubOf(st, chatId),
          vault: isPrivateChat(chatId),
          story: message.storyRef,
        });
      })();
    }

    if (!groupServer && message.type === "scratch") {
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

    if (!groupServer && message.type === "text" && message.text) {
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
              story: message.storyRef,
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
              story: message.storyRef,
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

    if (!groupServer && message.type === "shop" && message.shopId) {
      void (async () => {
        try {
          const { isServerChatId, sendViaServer } = await import("./messaging/sync");
          if (!isServerChatId(chatId)) return;
          const publicId = message.shopId!.replace(/^business:/, "");
          const shop = get().shops.find((s) => s.id === message.shopId || s.handle === publicId);
          const st = get();
          await sendViaServer(chatId, message.text || shop?.name || "Carte professionnelle", message.id, {
            identity: st.identity,
            peerPublicJwk: peerPubOf(st, chatId),
            vault: isPrivateChat(chatId),
            shop: {
              publicId,
              name: shop?.name || message.text || "Carte professionnelle",
              category: shop?.tags?.[0] || shop?.category || "",
              city: shop?.city,
              address: shop?.address || undefined,
              image: shop?.logo || shop?.image || undefined,
            },
          });
        } catch (err) {
          console.warn("[wipp] shop card send failed", err);
        }
      })();
    }
    return message.id;
  },
  forwardMessage: (targetChatId, source) => {
    void import("./messaging/forward").then(({ forwardMessageToChat }) =>
      forwardMessageToChat(targetChatId, source).catch((err) => console.warn("[wipp] forward failed", err)),
    );
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
      const st = get();
      if (st.chats.find((c) => c.id === chatId)?.type === "group") {
        // Group: the edited text is sealed with the group key too (never sent in clear).
        if (!st.identity || !st.serverProfileId) return;
        const { encryptGroupBody } = await import("./messaging/group-e2e");
        const body = await encryptGroupBody(chatId, text, st.identity, st.serverProfileId);
        if (!body) return;
        const { editServerMessage } = await import("./messaging/client");
        await editServerMessage(chatId.slice(4), messageId, body);
        return;
      }
      const { editViaServer } = await import("./messaging/sync");
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
    void import("./messaging/identity").then((m) => m.shareIdentityWithNotifications(identity));
    void myFingerprint;
    try {
      const { publishIdentityPublicKey } = await import("./messaging/sync");
      await publishIdentityPublicKey(identity);
    } catch (err) {
      console.warn("[wipp] e2e key publish skipped", err);
    }
  },
  syncServerInbox: async () => {
    const ticket = ++inboxSyncTicket;
    try {
      const { waitForFirebaseUser } = await import("./firebase-phone");
      const firebaseUser = await waitForFirebaseUser();
      if (ticket !== inboxSyncTicket) return;
      if (!firebaseUser) return;
      const me = get().me;
      try {
        const { bootstrapMessaging, mergeServerChatsIntoState } = await import("./messaging/sync");
        const { profile, chats } = await bootstrapMessaging({
          username: me.username || "user",
          displayName: me.displayName || `${me.firstName} ${me.lastName}`.trim() || "WIPP",
        });
        const [firstName, ...rest] = (profile.displayName || me.displayName).split(" ");
        if (ticket !== inboxSyncTicket) return;
        set((st) => {
          const merged = mergeServerChatsIntoState(st, chats, profile.id);
          const onSeed = st.stack.some(
            (s) => s.name === "conversation" && "chatId" in s && isSeedDemoChat(s.chatId),
          );
          const users = { ...(merged.users ?? st.users) };
          // Signed in for real: the demo people stay in memory for old references,
          // but they are no longer contacts (new chat, new group, call picker, counts).
          for (const [id, u] of Object.entries(users)) {
            if (u && id !== "me" && !id.startsWith("srvuser:") && u.connected) users[id] = { ...u, connected: false };
          }
          if (profile.avatarUrl) {
            if (users.me) users.me = { ...users.me, avatar: profile.avatarUrl };
            const serverKey = `srvuser:${profile.id}`;
            if (users[serverKey]) users[serverKey] = { ...users[serverKey], avatar: profile.avatarUrl };
          }
          return {
            ...merged,
            serverProfileId: profile.id,
            serverUsername: profile.username,
            serverConnected: true,
            listings: [],
            lifestyle: [],
            pharmacies: [],
            calls: [],
            shops: st.shops.filter((shop) => shop.id.startsWith("business:")),
            saves: [],
            stack: onSeed ? ([{ name: "chats" }] as Screen[]) : st.stack,
            users,
            me: {
              ...st.me,
              username: profile.username || st.me.username,
              displayName: profile.displayName || st.me.displayName,
              firstName: firstName || st.me.firstName,
              lastName: rest.join(" ") || st.me.lastName,
              // Never fall back to the demo profile's photo or bio on a real account.
              avatar: profile.avatarUrl || (st.me.avatar === demoMe().avatar ? "" : st.me.avatar),
              bio: profile.bio || (st.me.bio === demoMe().bio ? "" : st.me.bio),
            },
            requests: [],
            intros: [],
          };
        });
        void import("./media-url-cache").then(({ rememberMyAvatar }) => {
          const st = get();
          if (st.serverProfileId) rememberMyAvatar(st.serverProfileId, st.me.avatar || "");
        });
        scheduleInboxSave(get);
        void import("./profile-motto").then(({ loadMyMotto }) => loadMyMotto());
        void get().syncBusinessContexts();
        void get().refreshConnections();
        void get().refreshIncomingRequests();
        // The chat list only has ciphertext for the last message: decrypt it so the
        // preview shows the real text instead of "Message chiffré".
        void (async () => {
          const { syncChatMessages, mergeServerMessagesIntoState, decryptMergedMessages, toServerChatId } = await import(
            "./messaging/sync"
          );
          const locked = get()
            .chats.filter((c) => c.id.startsWith("srv:") && c.type !== "group" && /chiffré/.test(c.preview ?? ""))
            .slice(0, 15);
          for (const chat of locked) {
            try {
              const synced = await syncChatMessages(chat.id);
              if (!synced || !("messages" in synced)) continue;
              set((st) => mergeServerMessagesIntoState(st, toServerChatId(chat.id), synced.messages, synced.meServerId));
              const dec = await decryptMergedMessages(get(), chat.id, get().identity);
              if (Object.keys(dec).length) set(() => dec);
            } catch {
              /* keep the locked preview */
            }
          }
        })();
        const { flushAllOutbox } = await import("./messaging/flush-outbox");
        await flushAllOutbox(get as never, set as never);
        void import("./push").then(({ syncAppBadge }) => syncAppBadge());
      } catch (err) {
        console.warn("[wipp] server sync failed", err);
        if (ticket !== inboxSyncTicket) return;
        set({ serverConnected: false });
      }
      try {
        const { refreshStoriesInStore, fetchListings, fetchEvents, fetchSaves } = await import("./lot7/api");
        const profileId = get().serverProfileId;
        await refreshStoriesInStore(profileId);
        if (ticket !== inboxSyncTicket) return;
        const [listings, lifestyle, saves] = await Promise.all([
          fetchListings(profileId),
          fetchEvents(profileId),
          fetchSaves(),
        ]);
        if (ticket !== inboxSyncTicket) return;
        set({ listings, lifestyle, saves });
      } catch (err) {
        console.warn("[wipp] lot7 sync", err);
      }
    } catch (err) {
      console.warn("[wipp] server sync failed", err);
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
        // Arrived on this phone but not opened yet: "reçu" (two grey dots), never "lu".
        const me = (await import("./messaging/client")).getStoredProfile()?.id;
        const arrived = (synced && "messages" in synced ? synced.messages : [])
          .filter((m) => m.senderId !== me && !m.deletedAt && !m.deliveredAt)
          .map((m) => m.id);
        if (arrived.length) {
          const { postReceipts } = await import("./messaging/client");
          void postReceipts(event.chatId, arrived, "delivered").catch(() => undefined);
        }
        const { fetchServerChats } = await import("./messaging/client");
        const chats = await fetchServerChats();
        set((st) => mergeServerChatsIntoState(st, chats, get().serverProfileId ?? undefined));
      }
      void import("./push").then(({ syncAppBadge }) => syncAppBadge());
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
        ...(s.users[userId] ? { [userId]: { ...s.users[userId], connected: true } } : {}),
      },
    }));
    get().push({ name: "conversation", chatId: chat.id });
    return chat.id;
  },
  connectWith: (userId, via) => {
    const user = get().users[userId];
    if (!user) return;
    if (user.connected) {
      get().openOrCreateDm(userId);
      return;
    }
    if (get().sentRequestIds.includes(userId)) return;
    if (!user.username) return;
    void (async () => {
      try {
        const { sendRequest, STATUS_FR } = await import("./connections");
        const channel = via === "qr" ? "qr" : via === "touch" ? "touch" : "request";
        // Found in À proximité: the same request system, marked via = nearby by the server
        // (which also knows whether I am Invisible, to hide my photo in that request).
        const status =
          via === "nearby" && userId.startsWith("srvuser:")
            ? (await (await import("./proximity/nearby-visibility")).requestNearby(userId)).status
            : await sendRequest(user.username, channel, userId);
        if (status === "already_connected" || status === "accepted_existing" || status === "accepted") {
          set((s) => ({
            users: { ...s.users, ...(s.users[userId] ? { [userId]: { ...s.users[userId], connected: true } } : {}) },
            sentRequestIds: s.sentRequestIds.filter((id) => id !== userId),
          }));
          return;
        }
        if (status === "sent" || status === "already_pending") {
          set((s) => ({ sentRequestIds: [...s.sentRequestIds, userId] }));
          return;
        }
        Alert.alert("Demande", STATUS_FR[status] ?? "La demande n’a pas pu être envoyée.");
      } catch (err) {
        Alert.alert("Demande", errorText(err, "La demande n’a pas pu être envoyée."));
      }
    })();
  },
  refreshConnections: async () => {
    try {
      const me = get().serverProfileId;
      if (!me) return;
      const { supabase } = await import("./supabase");
      const { fetchActiveConnections } = await import("./connections");
      const { upsertRemoteProfile } = await import("./public-profiles");
      // 1. Every connection row of mine (RLS: read own) → per-peer status for chats (banner, expiry).
      const { data } = await supabase
        .from("wipp_connections")
        .select("user_a,user_b,status,connection_type,expires_at,via,upgrade_requested_by")
        .or(`user_a.eq.${me},user_b.eq.${me}`);
      const byPeer = new Map<string, import("./types").ConnectionInfo>();
      for (const r of (data ?? []) as {
        user_a: string;
        user_b: string;
        status: string;
        connection_type: "permanent" | "ephemeral";
        expires_at: string | null;
        via: string;
        upgrade_requested_by: string | null;
      }[]) {
        const peer = r.user_a === me ? r.user_b : r.user_a;
        const exp = r.expires_at ? Date.parse(r.expires_at) : null;
        const active = r.status === "active" && (exp == null || exp > Date.now());
        byPeer.set(`srvuser:${peer}`, {
          status: active ? "active" : r.status === "active" ? "expired" : r.status,
          type: r.connection_type,
          expiresAt: exp,
          via: r.via,
          upgradeRequestedByMe: r.upgrade_requested_by === me,
          upgradeRequestedByPeer: Boolean(r.upgrade_requested_by && r.upgrade_requested_by !== me),
        });
      }
      // 2. Public profiles of active contacts without a chat yet.
      try {
        const { connections } = await fetchActiveConnections();
        for (const c of connections) upsertRemoteProfile(c.profile, true);
      } catch {
        /* profiles of chat peers are known anyway */
      }
      set((s) => {
        const users = { ...s.users };
        for (const [id, u] of Object.entries(users)) {
          if (!u || !id.startsWith("srvuser:")) continue;
          const on = byPeer.get(id)?.status === "active";
          if (u.connected !== on) users[id] = { ...u, connected: on };
        }
        const chats = s.chats.map((c) => {
          if (c.type !== "dm") return c;
          const peer = c.participantIds.find((p) => p !== "me");
          const info = peer ? (byPeer.get(peer) ?? null) : null;
          return JSON.stringify(c.connection ?? null) === JSON.stringify(info) ? c : { ...c, connection: info };
        });
        return { users, chats };
      });
    } catch {
      /* keep the last known list */
    }
  },
  acceptRequest: (id, choice) => {
    const req = get().requests.find((r) => r.id === id);
    if (!req) return;
    if (get().serverConnected) {
      void (async () => {
        const { respondRequest } = await import("./connections");
        const status = await respondRequest(id, "accept", choice);
        if (status === "accepted" || status === "already_handled") {
          set((s) => ({
            requests: s.requests.filter((r) => r.id !== id),
            users: {
              ...s.users,
              ...(s.users[req.fromId] ? { [req.fromId]: { ...s.users[req.fromId], connected: true } } : {}),
            },
          }));
          await get().refreshIncomingRequests();
          // Same as the local path: accepting opens the conversation with the new contact.
          get().openOrCreateDm(req.fromId);
        }
      })();
      return;
    }
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "accepted" } : r)),
      users: {
        ...s.users,
        ...(s.users[req.fromId] ? { [req.fromId]: { ...s.users[req.fromId], connected: true } } : {}),
      },
    }));
    get().openOrCreateDm(req.fromId);
  },
  ignoreRequest: (id) => {
    if (get().serverConnected) {
      void (async () => {
        const { respondRequest } = await import("./connections");
        await respondRequest(id, "ignore");
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }));
        await get().refreshIncomingRequests();
      })();
      return;
    }
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "ignored" } : r)),
    }));
  },
  declineRequest: (id) => {
    if (!get().serverConnected) {
      get().ignoreRequest(id);
      return;
    }
    void (async () => {
      const { respondRequest } = await import("./connections");
      await respondRequest(id, "decline");
      set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }));
      await get().refreshIncomingRequests();
    })();
  },
  blockUser: (userId) => {
    const profileId = userId.startsWith("srvuser:") ? userId.slice("srvuser:".length) : userId;
    void (async () => {
      const { blockProfile } = await import("./connections");
      await blockProfile(profileId);
    })();
    set((s) => ({
      blockedIds: [...new Set([...s.blockedIds, userId, profileId])],
      chats: s.chats.filter((c) => !(c.type === "dm" && c.participantIds.includes(userId))),
      requests: s.requests.filter((r) => r.fromId !== userId),
    }));
    void get().refreshIncomingRequests();
  },
  refreshIncomingRequests: async () => {
    try {
      const { listIncomingRequests } = await import("./connections");
      const { srvUserId, userFromPublic } = await import("./public-profiles");
      const items = await listIncomingRequests();
      set((s) => {
        const users = { ...s.users };
        const requests = items.map((r) => {
          const id = srvUserId(r.sender.id);
          // Invisible sender: keep any profile already known, never fill a photo from this request.
          if (!r.invisible || !users[id]) {
            users[id] = userFromPublic(
              {
                id: r.sender.id,
                username: r.sender.username,
                displayName: r.sender.displayName,
                avatarUrl: r.sender.avatarUrl,
              },
              false,
            );
          }
          const nearby = r.via === "nearby";
          return {
            id: r.id,
            fromId: id,
            preview: nearby ? "Demande depuis À proximité" : "veut se connecter avec toi",
            nearby,
            invisible: Boolean(r.invisible),
            ring: r.ring ?? null,
            createdAt: Date.parse(r.createdAt) || Date.now(),
            status: "pending" as const,
          };
        });
        return { users, requests, intros: [] };
      });
    } catch (err) {
      console.warn("[wipp] incoming requests failed", err);
    }
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
  viewStory: (userId) =>
    set((s) => ({ viewedStories: { ...s.viewedStories, [userId]: Date.now() } })),
  createGroup: (name, participantIds, extra) => {
    const trimmed = name.trim();
    if (!trimmed || !get().serverConnected) return;
    void (async () => {
      const { createServerGroup, updateGroupInfo, uploadGroupPhoto } = await import("./lot7/api");
      const id = await createServerGroup(trimmed, participantIds);
      // Photo + description chosen on the "Nouveau groupe" screen, saved right after creation.
      const description = extra?.description?.trim();
      if (description || extra?.photoUri) {
        try {
          const avatar = extra?.photoUri ? await uploadGroupPhoto(id, extra.photoUri, extra.photoMime || "image/jpeg") : null;
          await updateGroupInfo(id, { description: description || null, avatar }, { quiet: true });
        } catch (err) {
          console.warn("[wipp] group photo/description failed", err);
          const { Alert } = await import("react-native");
          Alert.alert("Groupe", "Le groupe est créé, mais la photo ou la description n’a pas pu être enregistrée. Tu peux la remettre dans Infos du groupe.");
        }
      }
      await get().syncServerInbox();
      const localId = id.startsWith("srv:") ? id : `srv:${id}`;
      // Back from the new group returns to the chat list, not to "Nouveau groupe".
      set((st) => ({
        stack: [
          ...st.stack.filter((sc) => sc.name !== "new-group" && sc.name !== "new-chat"),
          { name: "conversation", chatId: localId },
        ],
      }));
    })().catch(async (err) => {
      console.warn("[wipp] group create failed", err);
      const { Alert } = await import("react-native");
      Alert.alert("Groupe", errorText(err, "Création impossible"));
    });
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

subscribePrivateVault(() => {
  useWippStore.setState((s) => ({ vaultEpoch: s.vaultEpoch + 1 }));
});
