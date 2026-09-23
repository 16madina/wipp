import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { I18nKey } from "./i18n";
import { t } from "./i18n";
import { LEGAL_VERSION } from "./legal";
import { metersBetween } from "./format";
import {
  REPLIES,
  SHOP_CLIENT_REPLIES,
  SHOP_OWNER_REPLIES,
  TRANSLATIONS,
  defaultNotifs,
  defaultPrivacy,
  demoMe,
  HOME_GEO,
  seedCalls,
  seedChats,
  seedCodes,
  seedIntros,
  seedListings,
  seedLifestyle,
  seedMessages,
  seedOneTimeQrs,
  seedRequests,
  seedShops,
  seedStories,
  seedUsers,
  withGroupMeta,
} from "./seed";
import type {
  A11yPrefs,
  Chat,
  FoundVia,
  GeoFix,
  Introduction,
  Lang,
  Listing,
  LiveCall,
  LifestyleItem,
  LifestyleKind,
  LiveCode,
  MeProfile,
  Message,
  NearbyMode,
  NotifSettings,
  OneTimeQr,
  PrivacyAudience,
  PrivacyAudienceKey,
  PrivacySettings,
  QrKind,
  RedeemResult,
  ReportKind,
  ReportReason,
  SafetyReport,
  Screen,
  Shop,
  ShopCategory,
  ShopPlan,
  ThemeMode,
  User,
} from "./types";
import { DISAPPEAR_7D, STORY_TTL_24H, defaultA11y, isStoryLive } from "./types";
import {
  clearKeyCache,
  decryptText,
  deriveChatKey,
  deriveGroupKey,
  encryptText,
  fingerprintOf,
  generateBundle,
  groupSafety,
  isEncryptable,
  safetyNumber,
  type KeyBundle,
} from "./crypto";
import { qrToken, sixDigit, uid } from "./utils";
import { findChatByInvite, inviteSlug, parseGroupInviteToken } from "./invite";
import { stickerLabel } from "./stickers";

const TAB: Screen["name"][] = ["chats", "calls", "connect", "explore", "me"];
const CODE_TTL = 60_000;

export function isChatSealed(chat: Chat, now = Date.now()) {
  if (!chat.ephemeral) return false;
  if (chat.sealed) return true;
  return Boolean(chat.expiresAt && chat.expiresAt <= now);
}

function previewOf(message: Message, lang: Lang = "fr") {
  if (message.viewOnce) return lang === "fr" ? "Vue unique" : "View once";
  if (message.encFailed) return lang === "fr" ? "Message chiffré" : "Encrypted message";
  if (message.type === "scratch") return lang === "fr" ? "Surprise ✨" : "Surprise ✨";
  if (message.type === "voice") return `Vocal · ${formatDur(message.duration ?? 0)}`;
  if (message.type === "image") return "Photo";
  if (message.type === "video") return lang === "fr" ? "Vidéo" : "Video";
  if (message.type === "sticker") return stickerLabel(message.stickerId, lang);
  if (message.type === "listing") return message.text ?? "Annonce";
  if (message.type === "shop") return message.text ?? "Boutique";
  return message.text ?? "";
}

function persistMessages(messages: Record<string, Message[]>) {
  return Object.fromEntries(
    Object.entries(messages).map(([id, list]) => [
      id,
      list.map((m) => (m.enc ? { ...m, text: undefined, translated: undefined } : m)),
    ]),
  );
}

function formatDur(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fresh() {
  return {
    onboarded: false,
    theme: "dark" as ThemeMode,
    language: "fr" as Lang,
    a11y: { ...defaultA11y },
    stack: [{ name: "splash" } as Screen],
    me: demoMe(),
    users: seedUsers(),
    chats: withGroupMeta(seedChats()),
    messages: seedMessages(),
    stories: seedStories(),
    viewedStories: {} as Record<string, number>,
    calls: seedCalls(),
    listings: seedListings(),
    requests: seedRequests(),
    blockedIds: [] as string[],
    sentRequestIds: [] as string[],
    privacy: { ...defaultPrivacy },
    notifs: { ...defaultNotifs },
    nearby: 0 as NearbyMode,
    nearbyUntil: 0,
    pendingSignup: {} as Partial<MeProfile>,
    serverConnected: false,
    serverProfileId: undefined as string | undefined,
    serverUsername: undefined as string | undefined,
    typing: {} as Record<string, boolean>,
    codes: seedCodes() as LiveCode[],
    oneTimeQrs: seedOneTimeQrs() as OneTimeQr[],
    intros: seedIntros() as Introduction[],
    codeChatTtl: 60 * 60_000,
    shops: seedShops() as Shop[],
    lifestyle: seedLifestyle() as LifestyleItem[],
    geo: {
      lat: HOME_GEO.lat,
      lng: HOME_GEO.lng,
      label: HOME_GEO.label,
      source: "city",
    } as GeoFix,
    locateStatus: "idle" as "idle" | "locating" | "done" | "denied",
    identity: null as KeyBundle | null,
    deviceKeys: {} as Record<string, KeyBundle>,
    /** Real peer public JWKs for srv: DMs (keyed by srvuser:<id> and raw profile id). */
    peerPublicKeys: {} as Record<string, JsonWebKey>,
    myFingerprint: "",
    verifiedIds: [] as string[],
    showCiphertext: false,
    cryptoReady: false,
    keyRotatedAt: 0,
    savedListingIds: ["l-civic", "l-apt"] as string[],
    savedEventIds: ["ls-slow", "ls-soccer"] as string[],
    touchAllowed: false,
    recentStickerIds: [] as string[],
    liveCall: null as LiveCall | null,
    callsSeenAt: 0,
    legalAcceptedAt: 0,
    legalVersion: "",
    reports: [] as SafetyReport[],
    biometricsOn: false,
    appLocked: false,
    pushMaster: false,
    pushGranted: false,
  };
}

type WgoState = ReturnType<typeof fresh> & {
  screen: () => Screen;
  push: (s: Screen) => void;
  pop: () => void;
  goTab: (name: Screen["name"]) => void;
  replace: (s: Screen) => void;
  openDemo: () => void;
  acceptLegal: () => void;
  saveSignup: (data: Partial<MeProfile>) => void;
  completeSetup: (data: Partial<MeProfile>) => void;
  syncServerInbox: () => Promise<void>;
  openServerDm: (username: string) => Promise<void>;
  updateMe: (data: Partial<MeProfile>) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Lang) => void;
  setA11y: (patch: Partial<A11yPrefs>) => void;
  setPrivacy: (key: PrivacyAudienceKey, value: PrivacyAudience) => void;
  setReadReceipts: (on: boolean) => void;
  setEphemeralCalls: (on: boolean) => void;
  setNotif: (key: keyof NotifSettings, value: boolean) => void;
  setNearby: (mode: NearbyMode) => void;
  sendMessage: (chatId: string, data: Partial<Message> & { text?: string }) => void;
  retryMessage: (chatId: string, messageId: string) => void;
  markScratch: (chatId: string, messageId: string) => void;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  translateMessage: (chatId: string, messageId: string) => void;
  markRead: (chatId: string) => void;
  toggleMute: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  toggleUnread: (chatId: string) => void;
  openOrCreateDm: (userId: string, asRequest?: boolean) => string;
  connectWith: (userId: string) => void;
  acceptRequest: (id: string) => void;
  ignoreRequest: (id: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  reportTarget: (data: { kind: ReportKind; targetId: string; reason: ReportReason }) => void;
  signOut: () => void;
  deleteAccount: () => void;
  setBiometrics: (on: boolean) => void;
  lockApp: () => void;
  unlockApp: () => void;
  setPushMaster: (on: boolean) => void;
  setPushGranted: (on: boolean) => void;
  startCall: (userId: string, kind: "audio" | "video", dir?: "in" | "out") => void;
  minimizeCall: () => void;
  expandCall: () => void;
  endCall: (duration: number) => void;
  setCallEphemeral: (on: boolean) => void;
  deleteCalls: (ids: string[]) => void;
  markCallsSeen: () => void;
  viewStory: (userId: string) => void;
  addStory: (item: {
    type: "text" | "image" | "video";
    text?: string;
    bg?: string;
    imageUrl?: string;
    videoUrl?: string;
    durationMs?: number;
    kind?: "status" | "profile";
    ttlMs?: number;
    music?: import("./story-music").StoryMusic;
  }) => void;
  changeAvatar: (url: string) => void;
  setGroupAvatar: (chatId: string, url: string) => void;
  setDisappear: (chatId: string, ms: number) => void;
  burnViewOnce: (chatId: string, messageId: string) => void;
  createGroup: (name: string, participantIds: string[], avatar?: string) => string;
  ensureGroupInvite: (chatId: string) => string;
  openGroupInvite: (token: string) => void;
  startListingChat: (listing: Listing) => string;
  resetDemo: () => void;
  ensureMyCode: () => LiveCode;
  regenerateMyCode: () => LiveCode;
  ensurePeerCode: (userId: string) => LiveCode;
  redeemCode: (code: string) => RedeemResult;
  simulateCodeEntered: (fromUserId?: string) => void;
  createOneTimeQr: (opts: {
    kind: QrKind;
    label: string;
    hours: number;
    target?: OneTimeQr["target"];
  }) => OneTimeQr;
  redeemQr: (token: string) => RedeemResult;
  sendIntro: (toUserId: string, subjectId: string, note: string) => string;
  acceptIntro: (id: string) => void;
  declineIntro: (id: string) => void;
  joinGroup: (chatId: string) => void;
  setCodeChatTtl: (ms: number) => void;
  openEphemeralChat: (userId: string, ttlMs?: number, via?: FoundVia) => string;
  completeTouch: (userId: string) => void;
  setTouchAllowed: (on: boolean) => void;
  sealChat: (chatId: string) => void;
  keepContact: (chatId: string) => void;
  sealExpired: () => void;
  locateMe: () => void;
  createShop: (data: {
    name: string;
    category: ShopCategory;
    bio: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    handle: string;
    hours: string;
    image: string;
    photos: string[];
  }) => string;
  openShopChat: (shopId: string) => string;
  createLifestyle: (data: {
    kind: LifestyleKind;
    title: string;
    when: string;
    place: string;
    note: string;
    paid: boolean;
    price?: string;
    image: string;
    deal?: string;
  }) => string;
  ensureCrypto: () => Promise<void>;
  sealMessage: (chatId: string, messageId: string) => Promise<void>;
  unlockAll: () => Promise<void>;
  rotateIdentity: () => Promise<void>;
  toggleVerified: (userId: string) => void;
  setShowCiphertext: (value: boolean) => void;
  safetyNumberFor: (chatId: string) => Promise<string>;
  toggleSavedListing: (id: string) => void;
  toggleSavedEvent: (id: string) => void;
};

async function aesFor(get: () => WgoState, chatId: string) {
  const st = get();
  if (!st.identity) return null;
  const chat = st.chats.find((c) => c.id === chatId);
  if (!chat) return null;
  if (chat.type === "group") return deriveGroupKey(st.identity, chatId);
  const peerId = chat.participantIds.find((id) => id !== "me");
  if (!peerId) return null;

  // Real DM E2E for server chats: use published peer public key only.
  if (chatId.startsWith("srv:")) {
    const peerPub =
      st.peerPublicKeys[peerId] ||
      (peerId.startsWith("srvuser:") ? st.peerPublicKeys[peerId.slice("srvuser:".length)] : undefined);
    if (!peerPub) return null;
    return deriveChatKey(st.identity, peerPub, chatId.replace(/^srv:/, ""));
  }

  // Local demo chats: deviceKeys is at-rest seal only (not true multi-device E2E).
  let peer = st.deviceKeys[peerId];
  if (!peer) {
    peer = await generateBundle();
    useWgoStore.setState({
      deviceKeys: { ...useWgoStore.getState().deviceKeys, [peerId]: peer },
    });
  }
  return deriveChatKey(st.identity, peer.publicJwk, chatId);
}

function pumpReceipt(
  set: (fn: (st: WgoState) => Partial<WgoState>) => void,
  get: () => WgoState,
  chatId: string,
  messageId: string,
) {
  window.setTimeout(() => {
    const current = get().chats.find((c) => c.id === chatId);
    if (!current || isChatSealed(current)) return;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    set((st) => ({
      messages: {
        ...st.messages,
        [chatId]: (st.messages[chatId] ?? []).map((x) =>
          x.id === messageId && x.status === "sending"
            ? { ...x, status: offline ? "failed" : "sent" }
            : x,
        ),
      },
    }));
    if (offline) return;
    window.setTimeout(() => {
      const chat = get().chats.find((c) => c.id === chatId);
      if (!chat || isChatSealed(chat)) return;
      set((st) => ({
        messages: {
          ...st.messages,
          [chatId]: (st.messages[chatId] ?? []).map((x) =>
            x.id === messageId && x.status === "sent" ? { ...x, status: "delivered" } : x,
          ),
        },
      }));
      window.setTimeout(() => {
        const list = get().messages[chatId] ?? [];
        const mine = list.find((x) => x.id === messageId);
        if (!mine || mine.status !== "delivered" || get().privacy.readReceipts === false) return;
        const seen = list.some((m) => m.fromId !== "me" && m.fromId !== "wgo" && m.createdAt >= mine.createdAt);
        if (!seen) return;
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).map((x) =>
              x.id === messageId && x.status === "delivered" ? { ...x, status: "read" } : x,
            ),
          },
        }));
      }, 560);
    }, 680);
  }, 420);
}

export const useWgoStore = create<WgoState>()(
  persist(
    (set, get) => ({
      ...fresh(),

      screen: () => get().stack.at(-1) ?? { name: "splash" },

      push: (s) => set((st) => ({ stack: [...st.stack, s] })),

      pop: () =>
        set((st) => ({
          stack: st.stack.length > 1 ? st.stack.slice(0, -1) : st.stack,
        })),

      goTab: (name) => set({ stack: [{ name } as Screen] }),

      replace: (s) =>
        set((st) => ({
          stack: [...st.stack.slice(0, -1), s],
        })),

      openDemo: () => {
        set({
          onboarded: true,
          me: demoMe(),
          stack: [{ name: "chats" }],
        });
        void get().ensureCrypto();
        void get().syncServerInbox();
      },

      completeSetup: (data) => {
        set((st) => ({
          onboarded: true,
          me: { ...st.me, ...st.pendingSignup, ...data, id: "me", online: true },
          stack: [{ name: "chats" }],
        }));
        void get().ensureCrypto();
        void get().syncServerInbox();
      },

      syncServerInbox: async () => {
        try {
          const me = get().me;
          const { bootstrapMessaging, mergeServerChatsIntoState } = await import(
            "@/lib/messaging/sync"
          );
          const { profile, chats } = await bootstrapMessaging({
            username: me.username || "deena",
            displayName: me.displayName || `${me.firstName} ${me.lastName}`.trim() || "WIPP",
          });
          set((st) => ({
            ...mergeServerChatsIntoState(st, chats, profile.id),
            serverProfileId: profile.id,
            serverUsername: profile.username,
            serverConnected: true,
          }));
        } catch (err) {
          console.warn("[wipp] server sync failed", err);
          set({ serverConnected: false });
        }
      },

      openServerDm: async (username: string) => {
        const {
          startChatWithUsername,
          mergeServerChatsIntoState,
          toLocalChatId,
          syncChatMessages,
          mergeServerMessagesIntoState,
          decryptMergedMessages,
        } = await import("@/lib/messaging/sync");
        await get().ensureCrypto();
        const chat = await startChatWithUsername(username);
        const profileId = get().serverProfileId;
        set((st) => mergeServerChatsIntoState(st, [chat], profileId));
        const localId = toLocalChatId(chat.id);
        const synced = await syncChatMessages(localId);
        if (synced && "messages" in synced) {
          set((st) =>
            mergeServerMessagesIntoState(st, chat.id, synced.messages, synced.meServerId),
          );
          const dec = await decryptMergedMessages(get(), localId, get().identity);
          if (Object.keys(dec).length) set(() => dec);
        }
        get().push({ name: "conversation", chatId: localId });
      },

      acceptLegal: () =>
        set({
          legalAcceptedAt: Date.now(),
          legalVersion: LEGAL_VERSION,
        }),

      saveSignup: (data) =>
        set((st) => ({
          pendingSignup: { ...st.pendingSignup, ...data },
          stack: [...st.stack, { name: "otp" }],
        })),

      updateMe: (data) => set((st) => ({ me: { ...st.me, ...data } })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setA11y: (patch) =>
        set((st) => ({ a11y: { ...defaultA11y, ...st.a11y, ...patch } })),
      setPrivacy: (key, value) =>
        set((st) => ({ privacy: { ...st.privacy, [key]: value } })),
      setReadReceipts: (on) =>
        set((st) => ({ privacy: { ...st.privacy, readReceipts: on } })),
      setEphemeralCalls: (on) =>
        set((st) => ({ privacy: { ...st.privacy, ephemeralCalls: on } })),
      setNotif: (key, value) =>
        set((st) => ({ notifs: { ...st.notifs, [key]: value } })),
      setNearby: (mode) =>
        set({
          nearby: mode,
          nearbyUntil: mode === 0 ? 0 : Date.now() + mode * 60_000,
        }),

      setShowCiphertext: (value) => set({ showCiphertext: value }),

      toggleVerified: (userId) =>
        set((st) => ({
          verifiedIds: st.verifiedIds.includes(userId)
            ? st.verifiedIds.filter((id) => id !== userId)
            : [...st.verifiedIds, userId],
        })),

      safetyNumberFor: async (chatId) => {
        const st = get();
        if (!st.identity) return "";
        const chat = st.chats.find((c) => c.id === chatId);
        if (!chat) return "";
        if (chat.type === "group") return groupSafety(st.identity.publicJwk, chatId);
        const peerId = chat.participantIds.find((id) => id !== "me");
        if (!peerId) return "";
        if (chatId.startsWith("srv:")) {
          const peerPub =
            st.peerPublicKeys[peerId] ||
            (peerId.startsWith("srvuser:")
              ? st.peerPublicKeys[peerId.slice("srvuser:".length)]
              : undefined);
          if (!peerPub) return "";
          return safetyNumber(st.identity.publicJwk, peerPub);
        }
        let peer = st.deviceKeys[peerId];
        if (!peer) {
          peer = await generateBundle();
          set((s) => ({ deviceKeys: { ...s.deviceKeys, [peerId]: peer } }));
        }
        return safetyNumber(st.identity.publicJwk, peer.publicJwk);
      },

      sealMessage: async (chatId, messageId) => {
        const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
        if (!msg?.text || msg.enc || !isEncryptable(msg.type)) return;
        const key = await aesFor(get, chatId);
        if (!key) return;
        try {
          const enc = await encryptText(key, msg.text);
          set((st) => ({
            messages: {
              ...st.messages,
              [chatId]: (st.messages[chatId] ?? []).map((m) =>
                m.id === messageId ? { ...m, enc, encFailed: false } : m,
              ),
            },
          }));
        } catch {
          /* keep plaintext until keys exist */
        }
      },

      unlockAll: async () => {
        const st = get();
        if (!st.identity) return;
        const next: Record<string, Message[]> = {};
        for (const [chatId, list] of Object.entries(st.messages)) {
          const key = await aesFor(get, chatId);
          next[chatId] = [];
          for (const m of list) {
            if (!m.enc) {
              next[chatId].push(m);
              continue;
            }
            if (!key) {
              next[chatId].push({ ...m, text: undefined, encFailed: true });
              continue;
            }
            try {
              const text = await decryptText(key, m.enc);
              next[chatId].push({ ...m, text, encFailed: false });
            } catch {
              next[chatId].push({ ...m, text: undefined, encFailed: true });
            }
          }
        }
        const lang = get().language;
        set({
          messages: next,
          chats: get().chats.map((c) => {
            const last = next[c.id]?.at(-1);
            return last ? { ...c, preview: previewOf(last, lang) } : c;
          }),
        });
      },

      ensureCrypto: async () => {
        let identity = get().identity;
        const deviceKeys = { ...get().deviceKeys };
        let changed = false;
        if (!identity) {
          identity = await generateBundle();
          changed = true;
        }
        // Local demo peers only — never invent keys for srvuser: (real E2E uses peerPublicKeys).
        for (const id of Object.keys(get().users)) {
          if (id.startsWith("srvuser:")) continue;
          if (!deviceKeys[id]) {
            deviceKeys[id] = await generateBundle();
            changed = true;
          }
        }
        const myFingerprint =
          !changed && get().myFingerprint
            ? get().myFingerprint
            : await fingerprintOf(identity.publicJwk);
        set({ identity, deviceKeys, myFingerprint, cryptoReady: true });

        // Publish public key so peers can encrypt DMs to us.
        try {
          const { publishIdentityPublicKey } = await import("@/lib/messaging/sync");
          await publishIdentityPublicKey(identity);
        } catch (err) {
          console.warn("[wipp] e2e key publish skipped", err);
        }

        const st = get();
        for (const [chatId, list] of Object.entries(st.messages)) {
          for (const m of list) {
            if (m.text && !m.enc && isEncryptable(m.type)) {
              await get().sealMessage(chatId, m.id);
            }
          }
        }
        await get().unlockAll();
      },

      rotateIdentity: async () => {
        clearKeyCache();
        const identity = await generateBundle();
        const myFingerprint = await fingerprintOf(identity.publicJwk);
        set({
          identity,
          myFingerprint,
          verifiedIds: [],
          keyRotatedAt: Date.now(),
        });
        try {
          const { publishIdentityPublicKey } = await import("@/lib/messaging/sync");
          await publishIdentityPublicKey(identity);
        } catch (err) {
          console.warn("[wipp] e2e key publish after rotate skipped", err);
        }
        await get().unlockAll();
      },

      sendMessage: (chatId, data) => {
        const existingChat = get().chats.find((c) => c.id === chatId);
        if (existingChat && isChatSealed(existingChat)) return;
        const message: Message = {
          id: uid("m"),
          chatId,
          fromId: "me",
          type: data.type ?? "text",
          text: data.text,
          createdAt: Date.now(),
          status: "sending",
          reactions: [],
          duration: data.duration,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
          viewOnce: data.viewOnce || undefined,
          stickerId: data.stickerId,
          scratchDesign: data.scratchDesign,
          effectId: data.effectId,
          revealedAt: data.revealedAt,
          listingId: data.listingId,
          shopId: data.shopId ?? existingChat?.shopId,
          replyTo: data.replyTo,
          expiresAt: existingChat?.disappearAfterMs
            ? Date.now() + existingChat.disappearAfterMs
            : undefined,
        };
        set((st) => {
          const recent =
            message.type === "sticker" && message.stickerId
              ? [message.stickerId, ...(st.recentStickerIds ?? []).filter((id) => id !== message.stickerId)].slice(0, 32)
              : st.recentStickerIds;
          return {
          messages: {
            ...st.messages,
            [chatId]: [...(st.messages[chatId] ?? []), message],
          },
          recentStickerIds: recent,
          chats: st.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  preview: previewOf(message),
                  lastAt: message.createdAt,
                  unread: 0,
                  isRequest: false,
                }
              : c,
          ),
        };
        });
        void get().sealMessage(chatId, message.id);
        pumpReceipt(set, get, chatId, message.id);

        // Dual-write text messages to the messaging server for srv: chats (E2E when peer key known)
        if (message.type === "text" && message.text) {
          void (async () => {
            try {
              const {
                isServerChatId,
                sendViaServer,
                syncChatMessages,
                mergeServerMessagesIntoState,
                decryptMergedMessages,
              } = await import("@/lib/messaging/sync");
              if (!isServerChatId(chatId)) return;
              const st = get();
              const peerId = st.chats.find((c) => c.id === chatId)?.participantIds.find((id) => id !== "me");
              const peerPub = peerId
                ? st.peerPublicKeys[peerId] ||
                  (peerId.startsWith("srvuser:")
                    ? st.peerPublicKeys[peerId.slice("srvuser:".length)]
                    : undefined)
                : undefined;
              await sendViaServer(chatId, message.text!, message.id, {
                identity: st.identity,
                peerPublicJwk: peerPub ?? null,
              });
              const synced = await syncChatMessages(chatId);
              if (synced && "messages" in synced) {
                set((s) =>
                  mergeServerMessagesIntoState(
                    s,
                    chatId.replace(/^srv:/, ""),
                    synced.messages,
                    synced.meServerId,
                  ),
                );
                const dec = await decryptMergedMessages(get(), chatId, get().identity);
                if (Object.keys(dec).length) set(() => dec);
              }
            } catch (err) {
              console.warn("[wipp] server send failed", err);
            }
          })();
        }

        const chat = get().chats.find((c) => c.id === chatId);
        const other = chat?.participantIds.find((id) => id !== "me");
        if (!chat || chat.type !== "dm" || !other || get().blockedIds.includes(other)) {
          return;
        }
        if (chatId.startsWith("srv:")) return;
        const shop = chat.shopId
          ? get().shops.find((s) => s.id === chat.shopId)
          : undefined;
        const lines = shop
          ? shop.ownerId === "me"
            ? SHOP_CLIENT_REPLIES
            : SHOP_OWNER_REPLIES
          : REPLIES[other];
        if (!lines?.length) return;

        window.setTimeout(() => {
          const current = get().chats.find((c) => c.id === chatId);
          if (!current || isChatSealed(current)) return;
          set((st) => ({ typing: { ...st.typing, [chatId]: true } }));
        }, 700);
        window.setTimeout(() => {
          const current = get().chats.find((c) => c.id === chatId);
          if (!current || isChatSealed(current)) return;
          const reply: Message = {
            id: uid("m"),
            chatId,
            fromId: other,
            type: "text",
            text: lines[Math.floor(Math.random() * lines.length)],
            createdAt: Date.now(),
            status: "delivered",
            reactions: [],
            shopId: chat.shopId,
            expiresAt: current.disappearAfterMs
              ? Date.now() + current.disappearAfterMs
              : undefined,
          };
          set((st) => {
            const onChat =
              (st.stack.at(-1) as Screen | undefined)?.name === "conversation" &&
              (st.stack.at(-1) as { chatId?: string }).chatId === chatId;
            return {
              typing: { ...st.typing, [chatId]: false },
              messages: {
                ...st.messages,
                [chatId]: [
                  ...(st.messages[chatId] ?? []).map((m) =>
                    m.fromId === "me" &&
                    st.privacy.readReceipts !== false &&
                    (m.status === "sent" || m.status === "delivered")
                      ? { ...m, status: "read" as const }
                      : m,
                  ),
                  reply,
                ],
              },
              chats: st.chats.map((c) =>
                c.id === chatId
                  ? {
                      ...c,
                      preview: reply.text ?? "",
                      lastAt: reply.createdAt,
                      unread: onChat ? 0 : c.unread + 1,
                    }
                  : c,
              ),
            };
          });
          void get().sealMessage(chatId, reply.id);
        }, 1600 + Math.random() * 900);
      },

      retryMessage: (chatId, messageId) => {
        const msg = (get().messages[chatId] ?? []).find((m) => m.id === messageId);
        if (!msg || msg.status !== "failed") return;
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).map((m) =>
              m.id === messageId ? { ...m, status: "sending" as const } : m,
            ),
          },
        }));
        pumpReceipt(set, get, chatId, messageId);
      },

      markScratch: (chatId, messageId) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).map((m) =>
              m.id === messageId && !m.revealedAt ? { ...m, revealedAt: Date.now() } : m,
            ),
          },
        })),

      addReaction: (chatId, messageId, emoji) =>
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
        })),

      deleteMessage: (chatId, messageId) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).filter((m) => m.id !== messageId),
          },
        })),

      translateMessage: (chatId, messageId) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).map((m) => {
              if (m.id !== messageId || !m.text) return m;
              if (m.translated) return { ...m, translated: undefined };
              const pair = TRANSLATIONS[m.text];
              const lang = st.language;
              const translated = pair
                ? lang === "fr"
                  ? pair.fr === m.text
                    ? pair.en
                    : pair.fr
                  : pair.en === m.text
                    ? pair.fr
                    : pair.en
                : lang === "fr"
                  ? "Traduction : " + m.text
                  : "Translation: " + m.text;
              return { ...m, translated };
            }),
          },
        })),

      markRead: (chatId) => {
        set((st) => ({
          chats: st.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
          messages: st.privacy.readReceipts !== false
            ? {
                ...st.messages,
                [chatId]: (st.messages[chatId] ?? []).map((m) =>
                  m.fromId !== "me" ? m : { ...m, status: "read" as const },
                ),
              }
            : st.messages,
        }));
        if (chatId.startsWith("srv:")) {
          void (async () => {
            try {
              const { syncChatMessages, mergeServerMessagesIntoState, toServerChatId } =
                await import("@/lib/messaging/sync");
              const synced = await syncChatMessages(chatId);
              if (synced && "messages" in synced) {
                set((st) =>
                  mergeServerMessagesIntoState(
                    st,
                    toServerChatId(chatId),
                    synced.messages,
                    synced.meServerId,
                  ),
                );
              }
            } catch {
              /* offline ok */
            }
          })();
        }
      },

      toggleMute: (chatId) =>
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId ? { ...c, muted: !c.muted } : c,
          ),
        })),

      archiveChat: (chatId) =>
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId ? { ...c, archived: true } : c,
          ),
        })),

      deleteChat: (chatId) =>
        set((st) => ({
          chats: st.chats.filter((c) => c.id !== chatId),
        })),

      toggleUnread: (chatId) =>
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId ? { ...c, unread: c.unread ? 0 : 1 } : c,
          ),
        })),

      openOrCreateDm: (userId, asRequest = false) => {
        const existing = get().chats.find(
          (c) =>
            c.type === "dm" &&
            c.participantIds.includes(userId) &&
            !c.ephemeral,
        );
        if (existing) {
          if (asRequest === false && existing.isRequest) {
            set((st) => ({
              chats: st.chats.map((c) =>
                c.id === existing.id ? { ...c, isRequest: false } : c,
              ),
            }));
          }
          get().push({ name: "conversation", chatId: existing.id });
          get().markRead(existing.id);
          return existing.id;
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
        set((st) => ({
          chats: [chat, ...st.chats],
          messages: { ...st.messages, [chat.id]: [] },
          users: {
            ...st.users,
            [userId]: st.users[userId]
              ? { ...st.users[userId], connected: true }
              : st.users[userId],
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
        if (get().sentRequestIds.includes(userId)) return;
        set((st) => ({
          sentRequestIds: [...st.sentRequestIds, userId],
        }));
      },

      acceptRequest: (id) => {
        const req = get().requests.find((r) => r.id === id);
        if (!req) return;
        set((st) => ({
          requests: st.requests.map((r) =>
            r.id === id ? { ...r, status: "accepted" } : r,
          ),
          users: {
            ...st.users,
            [req.fromId]: st.users[req.fromId]
              ? { ...st.users[req.fromId], connected: true }
              : st.users[req.fromId],
          },
        }));
        const chatId = get().openOrCreateDm(req.fromId);
        get().sendMessage(chatId, {
          text: get().language === "fr" ? "Demande acceptée." : "Request accepted.",
          type: "system",
        });
      },

      ignoreRequest: (id) =>
        set((st) => ({
          requests: st.requests.map((r) =>
            r.id === id ? { ...r, status: "ignored" } : r,
          ),
        })),

      blockUser: (userId) =>
        set((st) => ({
          blockedIds: [...new Set([...st.blockedIds, userId])],
          chats: st.chats.filter(
            (c) => !(c.type === "dm" && c.participantIds.includes(userId)),
          ),
          requests: st.requests.map((r) =>
            r.fromId === userId ? { ...r, status: "ignored" } : r,
          ),
        })),

      unblockUser: (userId) =>
        set((st) => ({
          blockedIds: st.blockedIds.filter((id) => id !== userId),
        })),

      reportTarget: ({ kind, targetId, reason }) =>
        set((st) => ({
          reports: [
            { id: `r-${Date.now()}`, kind, targetId, reason, at: Date.now() },
            ...(st.reports ?? []),
          ],
        })),

      signOut: () =>
        set({
          onboarded: false,
          stack: [{ name: "onboarding" }],
          liveCall: null,
          appLocked: false,
        }),

      deleteAccount: () => {
        set({ ...fresh(), stack: [{ name: "signup" }] });
        void get().ensureCrypto();
      },

      setBiometrics: (on) => set({ biometricsOn: on, appLocked: on }),
      lockApp: () => {
        if (get().biometricsOn) set({ appLocked: true });
      },
      unlockApp: () => set({ appLocked: false }),
      setPushMaster: (on) => set({ pushMaster: on }),
      setPushGranted: (on) => set({ pushGranted: on }),

      startCall: (userId, kind, dir = "out") => {
        const live = get().liveCall;
        if (live) {
          if (live.userId === userId) {
            set({ liveCall: { ...live, kind, dir: live.dir, pip: false } });
          } else {
            set({ liveCall: { ...live, pip: false } });
          }
          return;
        }
        const ephemeral =
          get().privacy.ephemeralCalls === true ||
          get().chats.some(
            (c) =>
              c.ephemeral &&
              !isChatSealed(c) &&
              c.participantIds.includes(userId) &&
              c.participantIds.includes("me"),
          );
        set({
          liveCall: { userId, kind, dir, pip: false, startedAt: Date.now(), ephemeral },
        });
      },

      minimizeCall: () =>
        set((st) => (st.liveCall ? { liveCall: { ...st.liveCall, pip: true } } : st)),

      expandCall: () =>
        set((st) => (st.liveCall ? { liveCall: { ...st.liveCall, pip: false } } : st)),

      endCall: (duration) => {
        const live = get().liveCall;
        if (!live) return;
        const incoming = live.dir === "in";
        const missed = incoming && duration < 1.5;
        const entry = {
          id: uid("call"),
          userId: live.userId,
          kind: live.kind,
          direction: incoming ? ("in" as const) : ("out" as const),
          missed,
          at: Date.now(),
          duration: !missed && duration >= 1.5 ? Math.round(duration) : undefined,
        };
        set((st) => ({
          liveCall: null,
          calls: live.ephemeral ? st.calls : [entry, ...st.calls],
          stack: st.stack[st.stack.length - 1]?.name === "active-call" ? st.stack.slice(0, -1) : st.stack,
        }));
      },

      setCallEphemeral: (on) =>
        set((st) => (st.liveCall ? { liveCall: { ...st.liveCall, ephemeral: on } } : st)),

      deleteCalls: (ids) => {
        const drop = new Set(ids);
        set((st) => ({ calls: st.calls.filter((c) => !drop.has(c.id)) }));
      },

      markCallsSeen: () => set({ callsSeenAt: Date.now() }),

      viewStory: (userId) =>
        set((st) => {
          const now = Date.now();
          const viewedStories = { ...st.viewedStories, [userId]: now };
          if (userId === "me") return { viewedStories };
          const stories = st.stories.map((s) => {
            if (s.userId !== userId || !isStoryLive(s, now)) return s;
            const viewers = s.viewers ?? [];
            if (viewers.some((v) => v.userId === "me")) return s;
            return { ...s, viewers: [...viewers, { userId: "me", at: now }] };
          });
          return { viewedStories, stories };
        }),

      addStory: (item) => {
        const id = uid("s");
        const createdAt = Date.now();
        set((st) => ({
          stories: [
            {
              id,
              userId: "me",
              type: item.type,
              text: item.text,
              bg: item.bg,
              imageUrl: item.imageUrl,
              videoUrl: item.videoUrl,
              durationMs: item.durationMs,
              createdAt,
              viewers: [],
              kind: item.kind ?? "status",
              ttlMs: item.ttlMs ?? STORY_TTL_24H,
              music: item.music,
            },
            ...st.stories,
          ],
        }));
        const peers = Object.values(get().users)
          .filter((u) => u.connected)
          .slice(0, 5);
        peers.forEach((u, i) => {
          window.setTimeout(() => {
            set((st) => ({
              stories: st.stories.map((s) =>
                s.id !== id || (s.viewers ?? []).some((v) => v.userId === u.id)
                  ? s
                  : { ...s, viewers: [...(s.viewers ?? []), { userId: u.id, at: Date.now() }] },
              ),
            }));
          }, 900 + i * 1400);
        });
      },

      changeAvatar: (url) => {
        set((st) => ({ me: { ...st.me, avatar: url } }));
        get().addStory({ type: "image", imageUrl: url, kind: "profile" });
      },

      setDisappear: (chatId, ms) => {
        const lang = get().language;
        const label = !ms
          ? t(lang, "disappearOffSys")
          : ms >= DISAPPEAR_7D
            ? t(lang, "disappear7dSys")
            : t(lang, "disappear24hSys");
        const sys: Message = {
          id: uid("m"),
          chatId,
          fromId: "wgo",
          type: "system",
          text: label,
          createdAt: Date.now(),
          status: "read",
          reactions: [],
        };
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId ? { ...c, disappearAfterMs: ms || undefined } : c,
          ),
          messages: {
            ...st.messages,
            [chatId]: [...(st.messages[chatId] ?? []), sys],
          },
        }));
      },

      burnViewOnce: (chatId, messageId) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [chatId]: (st.messages[chatId] ?? []).map((m) =>
              m.id === messageId
                ? { ...m, viewed: true, imageUrl: undefined, videoUrl: undefined, text: undefined }
                : m,
            ),
          },
        })),

      createGroup: (name, participantIds, avatar) => {
        const created =
          get().language === "fr"
            ? `Vous avez créé le groupe ${name}. Partagez le QR ou le lien — jamais un numéro.`
            : `You created the group ${name}. Share the QR or the link — never a number.`;
        const chat: Chat = {
          id: uid("g"),
          type: "group",
          name,
          avatar,
          inviteToken: inviteSlug(name),
          participantIds: ["me", ...participantIds],
          unread: 0,
          muted: false,
          pinned: false,
          archived: false,
          isRequest: false,
          preview: created,
          lastAt: Date.now(),
          joinBy: "qr",
        };
        set((st) => ({
          chats: [chat, ...st.chats],
          messages: {
            ...st.messages,
            [chat.id]: [
              {
                id: uid("m"),
                chatId: chat.id,
                fromId: "me",
                type: "system",
                text: created,
                createdAt: Date.now(),
                status: "read",
                reactions: [],
              },
            ],
          },
          stack: [
            { name: "chats" },
            { name: "conversation", chatId: chat.id },
            { name: "group-qr", chatId: chat.id },
          ],
        }));
        return chat.id;
      },

      setGroupAvatar: (chatId, url) =>
        set((st) => ({
          chats: st.chats.map((c) => (c.id === chatId ? { ...c, avatar: url } : c)),
        })),

      ensureGroupInvite: (chatId) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat) return "";
        if (chat.inviteToken) return chat.inviteToken;
        const token = inviteSlug(chat.name ?? "groupe");
        set((st) => ({
          chats: st.chats.map((c) => (c.id === chatId ? { ...c, inviteToken: token } : c)),
        }));
        return token;
      },

      openGroupInvite: (raw) => {
        const token = parseGroupInviteToken(raw);
        const chat = findChatByInvite(get().chats, get().oneTimeQrs, token);
        if (chat && !chat.inviteToken) get().ensureGroupInvite(chat.id);
        get().push({ name: "group-invite", token: chat?.inviteToken ?? token });
      },

      startListingChat: (listing) => {
        const chatId = get().openOrCreateDm(listing.sellerId);
        const already = (get().messages[chatId] ?? []).some(
          (m) => m.listingId === listing.id,
        );
        if (!already) {
          const system: Message = {
            id: uid("m"),
            chatId,
            fromId: "me",
            type: "listing",
            text: listing.title,
            listingId: listing.id,
            imageUrl: listing.image,
            createdAt: Date.now(),
            status: "read",
            reactions: [],
          };
          set((st) => ({
            messages: {
              ...st.messages,
              [chatId]: [...(st.messages[chatId] ?? []), system],
            },
            chats: st.chats.map((c) =>
              c.id === chatId
                ? { ...c, preview: listing.title, lastAt: system.createdAt }
                : c,
            ),
          }));
        }
        return chatId;
      },

      resetDemo: () => {
        set({ ...fresh(), stack: [{ name: "splash" }] });
        void get().ensureCrypto();
      },


      ensureMyCode: () => {
        const existing = get().codes.find(
          (c) => c.ownerId === "me" && c.expiresAt > Date.now(),
        );
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
        set((st) => ({
          codes: [next, ...st.codes.filter((c) => c.ownerId !== "me")],
        }));
        return next;
      },

      ensurePeerCode: (userId) => {
        const existing = get().codes.find(
          (c) => c.ownerId === userId && c.expiresAt > Date.now(),
        );
        if (existing) return existing;
        const next: LiveCode = {
          code: sixDigit(),
          expiresAt: Date.now() + CODE_TTL,
          ownerId: userId,
          chatTtlMs: 60 * 60_000,
        };
        set((st) => ({
          codes: [next, ...st.codes.filter((c) => c.ownerId !== userId)],
        }));
        return next;
      },

      redeemCode: (raw) => {
        const code = raw.replace(/\s/g, "");
        const rows = get().codes.filter((c) => c.code === code);
        if (!rows.length) return { ok: false, reason: "missing" };
        const live = rows.find((c) => c.expiresAt > Date.now());
        if (!live) return { ok: false, reason: "expired" };
        if (live.ownerId === "me") return { ok: false, reason: "own" };
        set((st) => ({ codes: st.codes.filter((c) => c.ownerId !== live.ownerId) }));
        get().openEphemeralChat(live.ownerId, live.chatTtlMs);
        return { ok: true, kind: "profile", userId: live.ownerId, via: "code" };
      },

      simulateCodeEntered: (fromUserId = "ines") => {
        if (!get().users[fromUserId]) return;
        get().openEphemeralChat(fromUserId, get().codeChatTtl);
      },

      createOneTimeQr: ({ kind, label, hours, target }) => {
        const qr: OneTimeQr = {
          id: uid("qr"),
          token: qrToken(kind),
          kind,
          label,
          expiresAt: Date.now() + hours * 3_600_000,
          used: false,
          ownerId: "me",
          target: target ?? { type: "profile", userId: "me" },
        };
        set((st) => ({ oneTimeQrs: [qr, ...st.oneTimeQrs] }));
        return qr;
      },

      redeemQr: (token) => {
        const raw = token.replace(/^https?:\/\//, "").replace(/^wgo\.me\/b\//, "");
        const shopHit = get().shops.find(
          (s) => s.qrToken === token || s.qrToken === raw || s.handle === raw.replace(/^@/, ""),
        );
        if (shopHit) {
          get().replace({ name: "shop", shopId: shopHit.id });
          return { ok: true, kind: "shop", shopId: shopHit.id };
        }
        const qr = get().oneTimeQrs.find((q) => q.token === token || q.id === token);
        if (!qr) return { ok: false, reason: "missing" };
        if (qr.expiresAt < Date.now()) return { ok: false, reason: "expired" };
        if (qr.kind === "once" && qr.used) return { ok: false, reason: "used" };
        if (
          qr.ownerId === "me" &&
          qr.target.type === "profile" &&
          qr.target.userId === "me"
        ) {
          return { ok: false, reason: "own" };
        }
        if (qr.kind === "once") {
          set((st) => ({
            oneTimeQrs: st.oneTimeQrs.map((q) =>
              q.id === qr.id ? { ...q, used: true } : q,
            ),
          }));
        }
        if (qr.target.type === "group") {
          get().joinGroup(qr.target.chatId);
          return { ok: true, kind: "group", chatId: qr.target.chatId };
        }
        get().openEphemeralChat(qr.target.userId);
        return { ok: true, kind: "profile", userId: qr.target.userId, via: "qr" };
      },

      sendIntro: (toUserId, subjectId, note) => {
        const intro: Introduction = {
          id: uid("intro"),
          introducerId: "me",
          recipientId: toUserId,
          subjectId,
          note,
          createdAt: Date.now(),
          status: "pending",
        };
        set((st) => ({ intros: [intro, ...st.intros] }));
        const existing = get().chats.find(
          (c) => c.type === "dm" && c.participantIds.includes(toUserId),
        );
        if (existing) {
          const subject = get().users[subjectId];
          const text =
            get().language === "fr"
              ? `Vous avez présenté ${subject?.displayName ?? "quelqu’un"} à ${get().users[toUserId]?.displayName ?? ""}. Le @ reste caché jusqu’à acceptation.`
              : `You introduced ${subject?.displayName ?? "someone"} to ${get().users[toUserId]?.displayName ?? ""}. The @ stays hidden until they accept.`;
          const message: Message = {
            id: uid("m"),
            chatId: existing.id,
            fromId: "me",
            type: "system",
            text,
            createdAt: Date.now(),
            status: "read",
            reactions: [],
          };
          set((st) => ({
            messages: {
              ...st.messages,
              [existing.id]: [...(st.messages[existing.id] ?? []), message],
            },
            chats: st.chats.map((c) =>
              c.id === existing.id
                ? { ...c, preview: text, lastAt: message.createdAt }
                : c,
            ),
          }));
        }
        return intro.id;
      },

      acceptIntro: (id) => {
        const intro = get().intros.find((x) => x.id === id);
        if (!intro || intro.status !== "pending") return;
        const subjectId = intro.subjectId;
        set((st) => ({
          intros: st.intros.map((x) =>
            x.id === id ? { ...x, status: "accepted" } : x,
          ),
          users: {
            ...st.users,
            [subjectId]: st.users[subjectId]
              ? { ...st.users[subjectId], connected: true }
              : st.users[subjectId],
            [intro.introducerId]: st.users[intro.introducerId]
              ? { ...st.users[intro.introducerId], connected: true }
              : st.users[intro.introducerId],
          },
        }));
        const chatId = get().openOrCreateDm(subjectId);
        const introducer = get().users[intro.introducerId];
        get().sendMessage(chatId, {
          type: "system",
          text:
            get().language === "fr"
              ? `${introducer?.displayName ?? "Un contact"} vous a présentés. Aucun numéro n’a été échangé.`
              : `${introducer?.displayName ?? "A contact"} introduced you. No numbers were exchanged.`,
        });
      },

      declineIntro: (id) =>
        set((st) => ({
          intros: st.intros.map((x) =>
            x.id === id ? { ...x, status: "declined" } : x,
          ),
        })),

      joinGroup: (chatId) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat) return;
        const already = chat.participantIds.includes("me");
        if (!already) {
          const text =
            get().language === "fr"
              ? "Vous avez rejoint via un lien Wipp. Aucun numéro n’a été partagé."
              : "You joined via a Wipp link. No number was shared.";
          const message: Message = {
            id: uid("m"),
            chatId,
            fromId: "me",
            type: "system",
            text,
            createdAt: Date.now(),
            status: "read",
            reactions: [],
          };
          set((st) => ({
            chats: st.chats.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    participantIds: [...c.participantIds, "me"],
                    preview: text,
                    lastAt: message.createdAt,
                    unread: 0,
                  }
                : c,
            ),
            messages: {
              ...st.messages,
              [chatId]: [...(st.messages[chatId] ?? []), message],
            },
          }));
        }
        get().replace({ name: "conversation", chatId });
        get().markRead(chatId);
      },

      setCodeChatTtl: (ms) =>
        set((st) => ({
          codeChatTtl: ms,
          codes: st.codes.map((c) =>
            c.ownerId === "me" && c.expiresAt > Date.now() ? { ...c, chatTtlMs: ms } : c,
          ),
        })),

      openEphemeralChat: (userId, ttlMs, via) => {
        get().sealExpired();
        const ttl = ttlMs ?? get().codeChatTtl;
        const permanent = get().chats.find(
          (c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral,
        );
        if (permanent) {
          get().replace({ name: "conversation", chatId: permanent.id });
          get().markRead(permanent.id);
          return permanent.id;
        }
        const existing = get().chats.find(
          (c) =>
            c.type === "dm" &&
            c.participantIds.includes(userId) &&
            c.ephemeral &&
            !isChatSealed(c),
        );
        if (existing) {
          if (via === "touch") {
            const crossed =
              get().language === "fr"
                ? "Vous vous êtes croisés. Prénom seulement."
                : "You crossed paths. First name only.";
            const note: Message = {
              id: uid("m"),
              chatId: existing.id,
              fromId: "me",
              type: "system",
              text: crossed,
              createdAt: Date.now(),
              status: "read",
              reactions: [],
            };
            set((st) => ({
              messages: {
                ...st.messages,
                [existing.id]: [...(st.messages[existing.id] ?? []), note],
              },
              chats: st.chats.map((c) =>
                c.id === existing.id
                  ? { ...c, preview: crossed, lastAt: note.createdAt, unread: 0 }
                  : c,
              ),
            }));
          }
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
        const hello =
          via === "touch"
            ? fr
              ? "Salut. On s’est croisés."
              : "Hey. We just crossed paths."
            : null;
        const chat: Chat = {
          id: uid("c"),
          type: "dm",
          participantIds: ["me", userId],
          unread: hello ? 1 : 0,
          muted: false,
          pinned: false,
          archived: false,
          isRequest: false,
          preview: hello ?? opened,
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
        const peerMsg: Message | null = hello
          ? {
              id: uid("m"),
              chatId: chat.id,
              fromId: userId,
              type: "text",
              text: hello,
              createdAt: Date.now() + 1,
              status: "delivered",
              reactions: [],
            }
          : null;
        set((st) => ({
          chats: [chat, ...st.chats],
          messages: {
            ...st.messages,
            [chat.id]: peerMsg ? [system, peerMsg] : [system],
          },
        }));
        const top = get().stack.at(-1)?.name;
        if (
          top === "live-code" ||
          top === "scanner" ||
          top === "one-time-qr" ||
          top === "wgo-touch"
        ) {
          get().replace({ name: "conversation", chatId: chat.id });
        } else {
          get().push({ name: "conversation", chatId: chat.id });
        }
        return chat.id;
      },

      setTouchAllowed: (on) => set({ touchAllowed: on }),

      completeTouch: (userId) => {
        if (!get().users[userId]) return;
        const now = Date.now();
        const existing = get().chats.find(
          (c) => c.type === "dm" && c.participantIds.includes(userId) && !c.ephemeral,
        );
        const sysText =
          get().language === "fr"
            ? "Connectés sur Wipp. Aucun numéro n’a été échangé."
            : "Connected on Wipp. No number was exchanged.";
        const note = (chatId: string): Message => ({
          id: uid("m"),
          chatId,
          fromId: "wgo",
          type: "system",
          text: sysText,
          createdAt: now,
          status: "read",
          reactions: [],
        });
        set((st) => {
          const users = {
            ...st.users,
            [userId]: st.users[userId]
              ? { ...st.users[userId], connected: true }
              : st.users[userId],
          };
          if (existing) {
            return {
              users,
              messages: {
                ...st.messages,
                [existing.id]: [...(st.messages[existing.id] ?? []), note(existing.id)],
              },
              chats: st.chats.map((c) =>
                c.id === existing.id ? { ...c, preview: sysText, lastAt: now } : c,
              ),
            };
          }
          const chat: Chat = {
            id: uid("c"),
            type: "dm",
            participantIds: ["me", userId],
            unread: 0,
            muted: false,
            pinned: false,
            archived: false,
            isRequest: false,
            preview: sysText,
            lastAt: now,
          };
          return {
            users,
            chats: [chat, ...st.chats],
            messages: { ...st.messages, [chat.id]: [note(chat.id)] },
          };
        });
      },

      sealChat: (chatId) => {
        const ended =
          get().language === "fr"
            ? "Conversation terminée. Plus aucun accès."
            : "Chat ended. No access left.";
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  sealed: true,
                  preview: ended,
                  unread: 0,
                  lastAt: Date.now(),
                }
              : c,
          ),
          messages: {
            ...st.messages,
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

      keepContact: (chatId) => {
        const chat = get().chats.find((c) => c.id === chatId);
        const other = chat?.participantIds.find((id) => id !== "me");
        const text =
          get().language === "fr"
            ? "Vous avez révélé votre Wgo. C’est maintenant un contact."
            : "You revealed your Wgo. They’re a contact now.";
        set((st) => ({
          chats: st.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  ephemeral: false,
                  sealed: false,
                  expiresAt: undefined,
                  preview: text,
                }
              : c,
          ),
          users:
            other && st.users[other]
              ? { ...st.users, [other]: { ...st.users[other], connected: true } }
              : st.users,
        }));
        get().sendMessage(chatId, { type: "system", text });
      },

      sealExpired: () => {
        const now = Date.now();
        get()
          .chats.filter(
            (c) => c.ephemeral && !c.sealed && c.expiresAt && c.expiresAt <= now,
          )
          .forEach((c) => get().sealChat(c.id));
        set((st) => {
          let dirty = false;
          const messages = { ...st.messages };
          const chats = st.chats.map((c) => {
            const list = messages[c.id];
            if (!list) return c;
            const kept = list.filter((m) => !m.expiresAt || m.expiresAt > now);
            if (kept.length === list.length) return c;
            dirty = true;
            messages[c.id] = kept;
            const last = [...kept].reverse().find((m) => m.type !== "system");
            return {
              ...c,
              preview: last ? previewOf(last, st.language) : "",
              lastAt: last?.createdAt ?? c.lastAt,
            };
          });
          const stories = st.stories.filter((s) => isStoryLive(s, now));
          if (stories.length !== st.stories.length) dirty = true;
          if (!dirty) return st;
          return { messages, chats, stories };
        });
      },

      locateMe: () => {
        const cityLabel = get().me.city || HOME_GEO.label;
        const apply = (lat: number, lng: number, source: GeoFix["source"]) => {
          const far = metersBetween({ lat, lng }, HOME_GEO) > 80_000;
          if (source === "gps" && far) {
            set({
              geo: {
                lat: HOME_GEO.lat,
                lng: HOME_GEO.lng,
                label: cityLabel,
                source: "city",
              },
              locateStatus: "done",
            });
            return;
          }
          set({
            geo: {
              lat,
              lng,
              label: source === "city" ? cityLabel : cityLabel,
              source,
            },
            locateStatus: source === "gps" ? "done" : "denied",
          });
        };
        set({ locateStatus: "locating" });
        if (!navigator.geolocation) {
          apply(HOME_GEO.lat, HOME_GEO.lng, "city");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => apply(pos.coords.latitude, pos.coords.longitude, "gps"),
          () => apply(HOME_GEO.lat, HOME_GEO.lng, "city"),
          { enableHighAccuracy: false, timeout: 1600, maximumAge: 120_000 },
        );
      },

      createShop: (data) => {
        const handle = data.handle.replace(/^@/, "").trim().toLowerCase() || "boutique";
        const existing = get().shops.find((s) => s.ownerId === "me");
        if (existing) {
          set((st) => ({
            shops: st.shops.map((s) =>
              s.id === existing.id
                ? {
                    ...s,
                    name: data.name,
                    category: data.category,
                    bio: data.bio,
                    address: data.address,
                    city: data.city,
                    country: data.country,
                    phone: data.phone,
                    handle,
                    hours: data.hours,
                    image: data.image,
                    photos: data.photos,
                  }
                : s,
            ),
          }));
          get().replace({ name: "shop", shopId: existing.id });
          return existing.id;
        }
        let code = sixDigit();
        while (get().shops.some((s) => s.code === code)) code = sixDigit();
        const shop: Shop = {
          id: uid("shop"),
          name: data.name,
          category: data.category,
          ownerId: "me",
          handle,
          bio: data.bio,
          address: data.address,
          city: data.city || get().me.city || HOME_GEO.label,
          country: data.country || "Canada",
          phone: data.phone,
          lat: get().geo.lat,
          lng: get().geo.lng,
          hours: data.hours,
          plan: "vitrine",
          image: data.image,
          photos: data.photos,
          code,
          qrToken: qrToken("shop"),
        };
        set((st) => ({ shops: [shop, ...st.shops] }));
        get().replace({ name: "shop", shopId: shop.id });
        return shop.id;
      },

      openShopChat: (shopId) => {
        const shop = get().shops.find((s) => s.id === shopId);
        if (!shop) return "";
        if (shop.ownerId === "me") {
          get().push({ name: "shop", shopId });
          return "";
        }
        const existing = get().chats.find(
          (c) => c.type === "dm" && c.shopId === shopId && c.participantIds.includes("me"),
        );
        if (existing) {
          get().markRead(existing.id);
          set({ stack: [{ name: "chats" }, { name: "conversation", chatId: existing.id }] });
          return existing.id;
        }
        const chat: Chat = {
          id: uid("c"),
          type: "dm",
          participantIds: ["me", shop.ownerId],
          unread: 0,
          muted: false,
          pinned: false,
          archived: false,
          isRequest: false,
          preview: shop.name,
          lastAt: Date.now(),
          shopId: shop.id,
        };
        const card: Message = {
          id: uid("m"),
          chatId: chat.id,
          fromId: "me",
          type: "shop",
          text: shop.name,
          shopId: shop.id,
          createdAt: Date.now(),
          status: "read",
          reactions: [],
        };
        set((st) => ({
          chats: [chat, ...st.chats],
          messages: { ...st.messages, [chat.id]: [card] },
          users: {
            ...st.users,
            [shop.ownerId]: st.users[shop.ownerId]
              ? { ...st.users[shop.ownerId], connected: true }
              : st.users[shop.ownerId],
          },
          stack: [{ name: "chats" }, { name: "conversation", chatId: chat.id }],
        }));
        return chat.id;
      },

      createLifestyle: (data) => {
        const geo = get().geo;
        const item: LifestyleItem = {
          id: uid("ls"),
          kind: data.kind,
          title: data.title,
          when: data.when,
          place: data.place,
          city: get().me.city || HOME_GEO.label,
          lat: geo.lat,
          lng: geo.lng,
          hostId: "me",
          image: data.image,
          note: data.note,
          deal: data.deal,
          paid: data.paid,
          price: data.price,
        };
        set((st) => ({ lifestyle: [item, ...st.lifestyle] }));
        get().replace({ name: "lifestyle", itemId: item.id });
        return item.id;
      },

      toggleSavedListing: (id) =>
        set((st) => {
          const cur = st.savedListingIds ?? [];
          return {
            savedListingIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
          };
        }),

      toggleSavedEvent: (id) =>
        set((st) => {
          const cur = st.savedEventIds ?? [];
          return {
            savedEventIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
          };
        }),
    }),
    {
      name: "wgo-store-v14",
      skipHydration: true,
      partialize: (s) => ({
        onboarded: s.onboarded,
        theme: s.theme,
        language: s.language,
        a11y: s.a11y ?? defaultA11y,
        me: s.me,
        users: s.users,
        chats: s.chats,
        messages: persistMessages(s.messages),
        stories: s.stories,
        viewedStories: s.viewedStories,
        calls: s.calls,
        callsSeenAt: s.callsSeenAt,
        requests: s.requests,
        blockedIds: s.blockedIds,
        sentRequestIds: s.sentRequestIds,
        privacy: s.privacy,
        notifs: s.notifs,
        nearby: s.nearby,
        nearbyUntil: s.nearbyUntil,
        codes: s.codes,
        oneTimeQrs: s.oneTimeQrs,
        intros: s.intros,
        codeChatTtl: s.codeChatTtl,
        shops: s.shops,
        lifestyle: s.lifestyle,
        identity: s.identity,
        deviceKeys: s.deviceKeys,
        peerPublicKeys: s.peerPublicKeys ?? {},
        myFingerprint: s.myFingerprint,
        verifiedIds: s.verifiedIds,
        showCiphertext: s.showCiphertext,
        keyRotatedAt: s.keyRotatedAt,
        savedListingIds: s.savedListingIds,
        savedEventIds: s.savedEventIds,
        touchAllowed: s.touchAllowed,
        recentStickerIds: s.recentStickerIds ?? [],
        legalAcceptedAt: s.legalAcceptedAt ?? 0,
        legalVersion: s.legalVersion ?? "",
        reports: s.reports ?? [],
        biometricsOn: s.biometricsOn ?? false,
        pushMaster: s.pushMaster ?? false,
        pushGranted: s.pushGranted ?? false,
      }),
    },
  ),
);

export function useT() {
  const language = useWgoStore((s) => s.language);
  return (key: I18nKey) => t(language, key);
}

export function isTabScreen(name: Screen["name"]) {
  return TAB.includes(name);
}

export function useUser(id: string | undefined): User | MeProfile | undefined {
  const me = useWgoStore((s) => s.me);
  const users = useWgoStore((s) => s.users);
  if (!id) return undefined;
  if (id === "me") return me;
  return users[id];
}
