import type { EncBlob } from "./crypto";
import type { StoryMusic } from "./story-music";

export type { StoryMusic };

export type Lang = "fr" | "en";
export type ThemeMode = "light" | "dark" | "system";
export type A11yPrefs = {
  haptics: boolean;
  largeTouch: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  /** Short sticker sounds. Off also when reduce-motion is on. */
  stickerSound: boolean;
};
export const defaultA11y: A11yPrefs = {
  haptics: true,
  largeTouch: false,
  largeText: false,
  reduceMotion: false,
  stickerSound: true,
};
export type NearbyMode = 0 | 5 | 15;
export type Discoverability = "everyone" | "contacts" | "nobody";
export type PrivacyAudience = "everyone" | "contacts" | "nobody";
export type PrivacyAudienceKey =
  | "photo"
  | "bio"
  | "lastSeen"
  | "online"
  | "calls"
  | "requests"
  | "groups"
  | "stories"
  | "findByPhone"
  | "findByUsername";

export type PrivacySettings = Record<PrivacyAudienceKey, PrivacyAudience> & {
  readReceipts: boolean;
  /** When on, finished calls are not written to the call log. */
  ephemeralCalls?: boolean;
};

export type NotifSettings = {
  messages: boolean;
  requests: boolean;
  calls: boolean;
  stories: boolean;
  groups: boolean;
  mentions: boolean;
  reactions: boolean;
  security: boolean;
};

export type ReportKind = "user" | "message" | "listing" | "shop" | "event" | "story" | "group";
export type ReportReason =
  | "spam"
  | "harass"
  | "hate"
  | "fake"
  | "scam"
  | "sexual"
  | "underage"
  | "other";

export type SafetyReport = {
  id: string;
  kind: ReportKind;
  targetId: string;
  reason: ReportReason;
  note?: string;
  at: number;
};

export type FoundVia = "code" | "qr" | "username" | "intro" | "nearby" | "touch";
export type QrKind = "once" | "event";
export type ShopCategory =
  | "nails"
  | "hair"
  | "beauty"
  | "restaurant"
  | "plumbing"
  | "realty"
  | "bakery"
  | "cafe"
  | "jewelry"
  | "home"
  | "services";
export type ShopPlan = "vitrine" | "plus" | "starter";
export type LifestyleKind = "spot" | "promo" | "event" | "party" | "concert";

export type GeoFix = {
  lat: number;
  lng: number;
  label: string;
  source: "city" | "gps";
};

export type ScreenName =
  | "splash"
  | "onboarding"
  | "signup"
  | "login"
  | "otp"
  | "setup"
  | "chats"
  | "conversation"
  | "new-chat"
  | "requests"
  | "calls"
  | "active-call"
  | "call-link"
  | "connect"
  | "my-qr"
  | "scanner"
  | "search-user"
  | "nearby"
  | "found-profile"
  | "explore"
  | "listing"
  | "me"
  | "privacy"
  | "account"
  | "security"
  | "notifications"
  | "appearance"
  | "accessibility"
  | "help"
  | "blocked"
  | "delete-account"
  | "legal"
  | "stories"
  | "global-search"
  | "new-group"
  | "my-groups"
  | "new-story"
  | "live-code"
  | "one-time-qr"
  | "introduce"
  | "intro-detail"
  | "group-qr"
  | "group-info"
  | "group-invite"
  | "wgo-touch"
  | "pharmacy"
  | "shop"
  | "create-shop"
  | "lifestyle"
  | "create-lifestyle"
  | "e2e-info"
  | "archives"
  | "chat-info"
  | "my-activity"
  | "wipp-private";

export type Screen =
  | { name: "splash" }
  | { name: "onboarding" }
  | { name: "signup" }
  | { name: "login" }
  | { name: "otp" }
  | { name: "setup" }
  | { name: "chats" }
  | { name: "conversation"; chatId: string }
  | { name: "new-chat" }
  | { name: "requests" }
  | { name: "calls" }
  | { name: "active-call"; userId: string; kind: "audio" | "video"; dir?: "in" | "out" }
  | { name: "call-link" }
  | { name: "connect" }
  | { name: "my-qr" }
  | { name: "scanner" }
  | { name: "search-user" }
  | { name: "nearby" }
  | { name: "found-profile"; userId: string; via?: FoundVia }
  | { name: "explore" }
  | { name: "listing"; listingId: string }
  | { name: "me" }
  | { name: "privacy" }
  | { name: "account" }
  | { name: "security" }
  | { name: "notifications" }
  | { name: "appearance" }
  | { name: "accessibility" }
  | { name: "help" }
  | { name: "blocked" }
  | { name: "delete-account" }
  | { name: "legal"; doc: "privacy" | "terms" }
  | { name: "stories"; userId: string }
  | { name: "global-search" }
  | { name: "new-group" }
  | { name: "my-groups" }
  | { name: "new-story" }
  | { name: "live-code" }
  | { name: "one-time-qr" }
  | { name: "introduce"; toUserId: string }
  | { name: "intro-detail"; introId: string }
  | { name: "group-qr"; chatId: string }
  | { name: "group-info"; chatId: string }
  | { name: "group-invite"; token: string }
  | { name: "wgo-touch" }
  | { name: "pharmacy"; pharmacyId: string }
  | { name: "shop"; shopId: string }
  | { name: "create-shop" }
  | { name: "lifestyle"; itemId: string }
  | { name: "create-lifestyle" }
  | { name: "e2e-info"; chatId: string }
  | { name: "archives" }
  | { name: "chat-info"; chatId: string }
  | { name: "wipp-private" }
  | { name: "my-activity"; kind: "listings" | "events" | "saved" };

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  online: boolean;
  lastSeen?: number;
  connected: boolean;
  city: string;
};

export type MeProfile = User & {
  email?: string;
  phone?: string;
  country?: string;
  birthday?: string;
  gender?: "unspecified" | "woman" | "man" | "nb";
  discoverability: Discoverability;
};

export type Chat = {
  id: string;
  type: "dm" | "group";
  name?: string;
  avatar?: string;
  inviteToken?: string;
  participantIds: string[];
  unread: number;
  muted: boolean;
  mutedUntil?: number | null;
  muteAlways?: boolean;
  manuallyUnreadAt?: number | null;
  pinned: boolean;
  archived: boolean;
  isRequest: boolean;
  preview: string;
  lastAt: number;
  joinBy?: "qr";
  ephemeral?: boolean;
  expiresAt?: number;
  sealed?: boolean;
  shopId?: string;
  disappearAfterMs?: number;
};

export type Message = {
  id: string;
  chatId: string;
  fromId: string;
  type: "text" | "voice" | "image" | "video" | "listing" | "shop" | "system" | "sticker" | "scratch";
  text?: string;
  createdAt: number;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  reactions: { userId: string; emoji: string }[];
  duration?: number;
  /** Local or remote audio blob URL for voice notes. */
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  viewOnce?: boolean;
  viewed?: boolean;
  stickerId?: string;
  /** Foil design for a scratch surprise. The secret itself stays in `text`. */
  scratchDesign?: "gold" | "love" | "birthday" | "fun" | "secret" | "heart" | "spark" | "crown" | "duo";
  /** Official card catalog id (e.g. wipp_gold). When set, asset + scratch_zone are used. */
  scratchCardId?: string;
  revealedAt?: number;
  effectId?: string;
  listingId?: string;
  shopId?: string;
  replyTo?: string;
  replyPreview?: string;
  editedAt?: number;
  deletedForAll?: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  expiresAt?: number;
  attachmentId?: string;
  mediaKey?: string;
  mediaChunks?: { i: number; iv: string; sha256: string }[];
  contactCard?: { userId: string; username: string; displayName: string; fingerprint?: string };
  geo?: { lat: number; lon: number };
  linkCard?: { url: string; title?: string; description?: string };
  enc?: EncBlob;
  encFailed?: boolean;
  translated?: string;
};

export type StoryViewer = { userId: string; at: number };

export type StoryItem = {
  id: string;
  userId: string;
  type: "text" | "image" | "video";
  text?: string;
  bg?: string;
  imageUrl?: string;
  videoUrl?: string;
  durationMs?: number;
  createdAt: number;
  viewers: StoryViewer[];
  kind?: "status" | "profile";
  ttlMs?: number;
  music?: StoryMusic;
};

export type CallLog = {
  id: string;
  userId: string;
  kind: "audio" | "video";
  direction: "in" | "out";
  missed: boolean;
  at: number;
  duration?: number;
};

export type LiveCall = {
  userId: string;
  kind: "audio" | "video";
  dir: "in" | "out";
  pip: boolean;
  startedAt: number;
  /** Not written to the call log when the call ends. */
  ephemeral?: boolean;
  /** Server invite id when signaling is available. */
  callId?: string;
  roomName?: string;
  peerUsername?: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  city: string;
  distance: string;
  sellerId: string;
  category: "auto" | "home" | "goods" | "jobs" | "services";
  image: string;
  description: string;
};

export type ConnectRequest = {
  id: string;
  fromId: string;
  preview: string;
  createdAt: number;
  status: "pending" | "accepted" | "ignored";
};

export type LiveCode = {
  code: string;
  expiresAt: number;
  ownerId: string;
  chatTtlMs: number;
};

export type OneTimeQr = {
  id: string;
  token: string;
  kind: QrKind;
  label: string;
  expiresAt: number;
  used: boolean;
  ownerId: string;
  target: { type: "profile"; userId: string } | { type: "group"; chatId: string };
};

export type Introduction = {
  id: string;
  introducerId: string;
  recipientId: string;
  subjectId: string;
  note: string;
  createdAt: number;
  status: "pending" | "accepted" | "declined";
};

export type Pharmacy = {
  id: string;
  name: string;
  chain: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  onDuty: boolean;
  until: string;
};

export type Shop = {
  id: string;
  name: string;
  category: ShopCategory;
  ownerId: string;
  handle: string;
  bio: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  lat: number;
  lng: number;
  hours: string;
  plan: ShopPlan;
  image: string;
  logo?: string;
  photos: string[];
  code: string;
  qrToken: string;
  tags?: string[];
  quote?: string;
};

export type LifestyleItem = {
  id: string;
  kind: LifestyleKind;
  title: string;
  when: string;
  place: string;
  city: string;
  lat: number;
  lng: number;
  hostId?: string;
  image: string;
  note: string;
  paid: boolean;
  price?: string;
  deal?: string;
};

export type RedeemResult =
  | { ok: false; reason: "missing" | "expired" | "own" | "used" }
  | { ok: true; kind: "profile"; userId: string; via: FoundVia }
  | { ok: true; kind: "shop"; shopId: string }
  | { ok: true; kind: "group"; chatId: string };

export const STORY_TTL_24H = 86_400_000;
export const STORY_TTL_48H = 172_800_000;
export const STORY_VIDEO_MAX_MS = 60_000;
export const DISAPPEAR_24H = 86_400_000;
export const DISAPPEAR_7D = 7 * 86_400_000;

export function storyTtlMs(story: Pick<StoryItem, "ttlMs">) {
  return story.ttlMs ?? STORY_TTL_24H;
}

export function isStoryLive(story: Pick<StoryItem, "createdAt" | "ttlMs">, now = Date.now()) {
  return now - story.createdAt < storyTtlMs(story);
}
