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
/** 0 = invisible ; -1 = jusqu'à désactivation ; sinon durée en minutes. */
export type NearbyMode = 0 | 15 | 60 | -1;
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
  | "welcome"
  | "phone-entry"
  | "sms-reference"
  | "profile-reference"
  | "signup-celebration"
  | "signup"
  | "login"
  | "otp"
  | "setup"
  | "chats"
  | "conversation"
  | "share-inbox"
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
  | "business-card"
  | "business-card-editor"
  | "business-card-view"
  | "admin"
  | "devices"
  | "language"
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
  | "qr-profile"
  | "qr-group"
  | "wgo-touch"
  | "pharmacy"
  | "pharmacies"
  | "shop"
  | "create-shop"
  | "lifestyle"
  | "create-lifestyle"
  | "create-listing"
  | "e2e-info"
  | "archives"
  | "chat-info"
  | "my-activity"
  | "wipp-private";

export type Screen =
  | { name: "splash" }
  | { name: "onboarding" }
  | { name: "welcome" }
  | { name: "phone-entry" }
  | { name: "sms-reference" }
  | { name: "profile-reference" }
  | { name: "signup-celebration"; username: string }
  | { name: "signup" }
  | { name: "login" }
  | { name: "otp" }
  | { name: "setup" }
  | { name: "chats" }
  | { name: "conversation"; chatId: string }
  | { name: "share-inbox" }
  | { name: "new-chat" }
  | { name: "requests" }
  | { name: "calls" }
  | { name: "active-call"; userId: string; kind: "audio" | "video"; dir?: "in" | "out"; callId?: string; chatId?: string; group?: boolean }
  | { name: "call-link" }
  | { name: "connect" }
  | { name: "my-qr" }
  | { name: "scanner"; error?: string }
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
  | { name: "business-card" }
  | { name: "business-card-editor" }
  | { name: "business-card-view"; publicId: string }
  | { name: "admin" }
  | { name: "devices" }
  | { name: "language" }
  | { name: "accessibility" }
  | { name: "help" }
  | { name: "blocked" }
  | { name: "delete-account" }
  | { name: "legal"; doc: "privacy" | "terms" | "age" }
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
  | { name: "qr-profile"; key: string }
  | { name: "qr-group"; key: string }
  | { name: "wgo-touch" }
  | { name: "touch-incoming"; demo?: TouchIncomingCase; requestId?: string; touchId?: string }
  | { name: "pharmacy"; pharmacyId: string }
  | { name: "pharmacies" }
  | { name: "shop"; shopId: string }
  | { name: "create-shop" }
  | { name: "lifestyle"; itemId: string }
  | { name: "create-lifestyle"; eventId?: string }
  | { name: "create-listing"; listingId?: string }
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
  /** Groupes : description, rôles, permissions, départ, notifications. */
  description?: string;
  adminIds?: string[];
  groupPerms?: GroupPerms;
  left?: boolean;
  notifMode?: "all" | "mentions" | "none";
};

export type GroupAudience = "all" | "admins";
export type GroupPerms = { editInfo: GroupAudience; send: GroupAudience; addMembers: GroupAudience; everyone: boolean };
export const defaultGroupPerms: GroupPerms = { editInfo: "admins", send: "all", addMembers: "all", everyone: true };

export type MediaItem = {
  type: "image" | "video";
  url: string;
  duration?: number;
  attachmentId?: string;
  mediaKey?: string;
  mediaChunks?: { i: number; iv: string; sha256: string }[];
  mime?: string;
};

export type Message = {
  id: string;
  chatId: string;
  fromId: string;
  type: "text" | "voice" | "image" | "video" | "listing" | "shop" | "system" | "sticker" | "scratch" | "file" | "gif";
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
  /** Several photos/videos sent together (mosaic). */
  album?: MediaItem[];
  /** Document attachment (local blob URL until encrypted upload lands). */
  file?: { name: string; size: number; mime: string; url: string };
  gifUrl?: string;
  mediaMime?: string;
  /** États d’un média : preparing → uploading → sent / downloading → ready, ou failed. */
  mediaState?: "preparing" | "uploading" | "sent" | "downloading" | "ready" | "failed";
  /** 0..1 pendant l’envoi ou le téléchargement. */
  progress?: number;
  stickerId?: string;
  /** Événement d'appel inscrit dans la conversation (lot 5). */
  call?: { media: "audio" | "video"; missed: boolean; duration?: number; dir: "in" | "out"; group?: boolean };
  /** Foil design for a scratch surprise. The secret itself stays in `text`. */
  scratchDesign?: string;
  /** Official card catalog id (e.g. wipp_gold). When set, asset + scratch_zone are used. */
  scratchCardId?: string;
  revealedAt?: number;
  effectId?: string;
  listingId?: string;
  shopId?: string;
  replyTo?: string;
  replyPreview?: string;
  /** Encrypted story cite. The message stays after the story expires. */
  storyRef?: {
    id: string;
    kind: "text" | "image" | "video";
    mode: "reply" | "reaction";
    preview: string;
    bg?: string;
  };
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
  linkCard?: { url: string; title?: string; description?: string; image?: string };
  geoLive?: boolean;
  enc?: EncBlob;
  encFailed?: boolean;
  translated?: string;
  /** Ids mentionnés (@) ; "all" = @toutlemonde. Sert plus tard à la notification dédiée. */
  mentions?: string[];
};

export type StoryViewer = { userId: string; at: number };

export type StoryItem = {
  id: string;
  userId: string;
  type: "text" | "image" | "video";
  text?: string;
  /** Visual text on the media. Not the caption in `text`. */
  overlay?: { text: string; x: number; y: number; scale: number };
  bg?: string;
  imageUrl?: string;
  videoUrl?: string;
  /** Private storage path. Signed URLs are regenerated from this; they are not the saved story. */
  mediaPath?: string;
  mediaSignedAt?: number;
  durationMs?: number;
  createdAt: number;
  /** Server expiry (stories). The feed query also filters expires_at > now(). */
  expiresAt?: number;
  viewers: StoryViewer[];
  /** Unique viewers of this item, from wipp_lot7_stories views count. Owner only. */
  viewCount?: number;
  /** True when the signed-in profile has a row in wipp_story_views for this item. */
  viewed?: boolean;
  kind?: "status" | "profile";
  ttlMs?: number;
  music?: StoryMusic;
  /** Qui peut voir : contacts WIPP, proches choisis, ou moi seul. Local tant que le serveur n'existe pas (BACKEND). */
  audience?: StoryAudience;
  audienceIds?: string[];
};

export type CallLog = {
  id: string;
  userId: string;
  kind: "audio" | "video";
  direction: "in" | "out";
  missed: boolean;
  at: number;
  duration?: number;
  /** Appel de groupe (lot 5) : conversation et participants. */
  group?: boolean;
  chatId?: string;
  participantIds?: string[];
  /** Issue d'un appel sortant non abouti. */
  outcome?: "declined" | "busy" | "noAnswer" | "failed";
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
  /** See LISTING_CATEGORIES (auto, realty, electronics, fashion, home, jobs, leisure, goods); "services" is legacy. */
  category: string;
  image: string;
  description: string;
  condition?: "new" | "like_new" | "good" | "used";
  photos?: string[];
  photoPaths?: string[];
  country?: string;
  area?: string;
  contactPhone?: string;
  negotiable?: boolean;
  currency?: string;
  createdAt?: number;
  lat?: number;
  lng?: number;
  /** "Mettre en avant": shown first for 7 days. */
  boosted?: boolean;
  /** Scheduled publication time (only the owner sees it before). */
  publishAt?: number;
  views?: number;
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
  details?: string;
  contact?: string;
  startsAt?: string;
  endsAt?: string;
  coverPath?: string;
  paid: boolean;
  price?: string;
  deal?: string;
  category?: string;
  country?: string;
  address?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  isFree?: boolean;
  currency?: string;
  hostName?: string;
  capacity?: number;
  adultOnly?: boolean;
  interestedCount?: number;
  interestedMe?: boolean;
  /** Up to 3 avatar paths of people interested. */
  interestedAvatars?: string[];
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
export const DISAPPEAR_30D = 30 * 86_400_000;

export function storyTtlMs(story: Pick<StoryItem, "ttlMs">) {
  return story.ttlMs ?? STORY_TTL_24H;
}

export function isStoryLive(story: Pick<StoryItem, "createdAt" | "ttlMs" | "expiresAt">, now = Date.now()) {
  if (typeof story.expiresAt === "number") return now < story.expiresAt;
  return now - story.createdAt < storyTtlMs(story);
}

export type StoryAudience = "contacts" | "close" | "me";
export type TouchIncomingCase = "pending" | "expired" | "handled" | "blocked" | "error";
