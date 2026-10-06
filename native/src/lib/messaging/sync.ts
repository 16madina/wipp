/**
 * Bridge local Zustand UI store ↔ WIPP messaging API.
 * Server chats use ids prefixed with `srv:` in the client store.
 * DM bodies may be E2E envelopes (ciphertext); plaintext is legacy.
 */
import {
  decryptText,
  deriveChatKey,
  encryptText,
  makeE2eEnvelope,
  parseMessageBody,
  previewFromBody,
  type KeyBundle,
} from "@/lib/crypto";
import { decodePlain, encodePlain, type ReplyCite, type ShopPlain, type StoryCite, type SurprisePlain } from "@/lib/messaging/plain";
import {
  editServerMessage,
  ensureServerSession,
  fetchServerChats,
  fetchServerMessages,
  getStoredProfile,
  openServerChat,
  postServerMessage,
  publishMyE2eKey,
} from "./client";
import type { WippChatSummary, WippMessage } from "./types";
import { isPrivateChat } from "@/lib/private-vault";
import { isSeedDemoChat } from "@/lib/seed";
import type { Chat, Message, User } from "@/lib/types";
import { STICKER_LABELS } from "@/lib/stickers";

function isStickerLabel(text: string) {
  return text === "Sticker" || STICKER_LABELS.has(text);
}

const SRV = "srv:";

export function isServerChatId(id: string) {
  return id.startsWith(SRV);
}

export function toLocalChatId(serverId: string) {
  return `${SRV}${serverId}`;
}

export function toServerChatId(localId: string) {
  return localId.startsWith(SRV) ? localId.slice(SRV.length) : localId;
}

function peerToUser(peer: WippChatSummary["peer"]): User {
  return {
    id: `srvuser:${peer.id}`,
    username: peer.username,
    firstName: peer.displayName.split(" ")[0] ?? peer.displayName,
    lastName: peer.displayName.split(" ").slice(1).join(" ") || "",
    displayName: peer.displayName,
    avatar: peer.avatarUrl || "",
    bio: peer.bio || "",
    online: true,
    // Being in a chat does NOT make someone a contact: the server's connection list decides.
    connected: false,
    city: "",
  };
}

export function peerPublicFromServerPeer(peer: WippChatSummary["peer"]): JsonWebKey | null {
  return peer.e2ePublicJwk ?? null;
}

/** Decrypt a server message body for a known chat id. */
export async function mapServerMessageAsync(
  m: WippMessage,
  meServerId: string | undefined,
  identity: KeyBundle | null | undefined,
  serverChatId: string,
): Promise<Message> {
  const fromMe = meServerId && m.senderId === meServerId;
  const base: Message = {
    id: m.id,
    chatId: toLocalChatId(m.chatId),
    fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
    type: "text",
    createdAt: m.createdAt,
    status: "read",
    reactions: [],
  };
  const parsed = parseMessageBody(m.body);
  const meta = messageMeta(m, meServerId);
  if (parsed.kind === "plain") {
    const plain = decodePlain(parsed.text);
    return applySurprise(
      applyShop(
        {
          ...base,
          ...meta,
          text: m.deletedAt ? "Message supprimé" : plain.text,
          replyTo: plain.reply?.id ?? m.replyTo ?? undefined,
          replyPreview: plain.reply?.preview,
          forwarded: plain.forwarded,
          storyRef: plain.story,
        },
        plain.shop,
      ),
      plain.surprise,
    );
  }
  if (!identity) {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
  try {
    const key = await deriveChatKey(identity, parsed.envelope.spk, serverChatId);
    const text = await decryptText(key, parsed.envelope);
    const plain = decodePlain(text);
    return applySurprise(
      applyShop(
        {
          ...base,
          ...meta,
          text: m.deletedAt ? "Message supprimé" : plain.text,
          replyTo: plain.reply?.id ?? m.replyTo ?? undefined,
          replyPreview: plain.reply?.preview,
          forwarded: plain.forwarded,
          storyRef: plain.story,
          enc: parsed.envelope,
          encFailed: false,
        },
        plain.shop,
      ),
      plain.surprise,
    );
  } catch {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
}

const MEDIA_FIELDS = [
  "type",
  "imageUrl",
  "videoUrl",
  "audioUrl",
  "gifUrl",
  "file",
  "album",
  "duration",
  "viewOnce",
  "viewed",
  "mediaState",
  "progress",
  "attachmentId",
  "mediaKey",
  "mediaChunks",
  "mediaMime",
  "text",
  // Sans ces champs, un sticker / une carte / une surprise redevenait un simple texte à la synchro suivante.
  "stickerId",
  "poll",
  "shopId",
  "scratchCardId",
  "scratchDesign",
  "effectId",
  "contactCard",
  "geo",
  "linkCard",
] as const;

/** Keeps the sender's local preview (blob URLs, progress) when the server copy lands. */
function keepLocalMedia(local: Message | undefined, next: Message): Message {
  if (!local || local.type === "text" || local.type === "system") return next;
  const out = { ...next } as Record<string, unknown>;
  for (const k of MEDIA_FIELDS) {
    const v = (local as Record<string, unknown>)[k];
    if (v !== undefined && (out[k] === undefined || k === "type" || k === "text")) out[k] = v;
  }
  out.encFailed = false;
  if (local.storyRef && !out.storyRef) out.storyRef = local.storyRef;
  return out as Message;
}

type ParsedMedia = NonNullable<ReturnType<typeof import("./media-crypto").parseMedia>>;

/** Maps a decoded media envelope onto a chat message (receiver side). */
export function applyMediaEnvelope(m: Message, media: ParsedMedia, label: string): Message {
  const kind = media.kind;
  const type: Message["type"] =
    kind === "voice" || kind === "image" || kind === "video" || kind === "file" || kind === "gif"
      ? kind
      : kind === "sticker"
        ? "sticker"
        : m.type;
  const withBlob = kind === "voice" || kind === "image" || kind === "video" || kind === "file" || kind === "gif";
  const album = media.album?.length
    ? media.album.map((p) => ({
        type: p.kind === "video" ? ("video" as const) : ("image" as const),
        url: "",
        duration: p.durationMs ? Math.round(p.durationMs / 1000) : undefined,
        attachmentId: p.id,
        mediaKey: p.fileKey,
        mediaChunks: p.chunks,
        mime: p.mime,
      }))
    : m.album;
  return {
    ...m,
    type,
    text: withBlob ? (media.caption ?? "") : media.album?.length ? `${media.album.length} médias` : label,
    stickerId: media.stickerId ?? m.stickerId,
    viewOnce: media.viewOnce ?? m.viewOnce,
    attachmentId: media.id ?? m.attachmentId,
    mediaKey: media.fileKey ?? m.mediaKey,
    mediaChunks: media.chunks ?? m.mediaChunks,
    mediaMime: media.mime ?? m.mediaMime,
    album,
    file: kind === "file" ? (m.file ?? { name: media.name ?? "Document", size: media.size ?? 0, mime: media.mime ?? "", url: "" }) : m.file,
    contactCard: media.contact ?? m.contactCard,
    geo: media.location ?? m.geo,
    linkCard: media.link ?? m.linkCard,
    duration: media.durationMs ? Math.round(media.durationMs / 1000) : m.duration,
  };
}

function mapGroupMedia(m: WippMessage, meServerId: string | undefined): Message | null {
  const trimmed = m.body.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as {
      k?: string;
      type?: Message["type"];
      text?: string;
      path?: string;
      imageUrl?: string;
      videoUrl?: string;
      audioUrl?: string;
      stickerId?: string;
      name?: string;
      mime?: string;
      size?: number;
    };
    if (parsed.k !== "wipp-group-media" || !parsed.type) return null;
    const stored = parsed.path || parsed.imageUrl || parsed.videoUrl || parsed.audioUrl;
    const fromMe = meServerId && m.senderId === meServerId;
    return {
      id: m.id,
      chatId: toLocalChatId(m.chatId),
      fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
      type: parsed.type,
      text: parsed.text,
      imageUrl: parsed.type === "image" || parsed.type === "file" ? stored : parsed.imageUrl,
      videoUrl: parsed.type === "video" ? stored : parsed.videoUrl,
      audioUrl: parsed.type === "voice" ? stored : parsed.audioUrl,
      stickerId: parsed.stickerId,
      file:
        parsed.type === "file"
          ? { name: parsed.name ?? "Document", size: parsed.size ?? 0, mime: parsed.mime ?? "", url: stored ?? "" }
          : undefined,
      createdAt: m.createdAt,
      status: receiptStatus(m, Boolean(fromMe)),
      seen: seenOf(m, Boolean(fromMe)),
      pollVotes: votesOf(m, meServerId ?? undefined),
      reactions: (m.reactions ?? []).map((r) => ({
        userId: meServerId && r.profileId === meServerId ? "me" : `srvuser:${r.profileId}`,
        emoji: r.emoji,
      })),
      replyTo: m.replyTo ?? undefined,
      mentions: m.mentions,
      editedAt: m.editedAt ?? undefined,
      deletedForAll: Boolean(m.deletedAt),
      pinned: Boolean(m.pinnedAt),
    };
  } catch {
    return null;
  }
}

function mapServerMessageSync(m: WippMessage, meServerId: string | undefined): Message {
  const fromMe = meServerId && m.senderId === meServerId;
  if (m.systemEvent) {
    return {
      id: m.id,
      chatId: toLocalChatId(m.chatId),
      fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
      type: "system",
      text: m.body,
      createdAt: m.createdAt,
      status: "read",
      reactions: [],
    };
  }
  const groupMedia = mapGroupMedia(m, meServerId);
  if (groupMedia) return groupMedia;
  const parsed = parseMessageBody(m.body);
  const plain = parsed.kind === "plain" ? decodePlain(parsed.text) : undefined;
  return {
    id: m.id,
    chatId: toLocalChatId(m.chatId),
    fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
    type: m.deletedAt ? "system" : "text",
    text: m.deletedAt ? "Message supprimé" : plain?.text,
    enc: parsed.kind === "e2e" && !m.deletedAt ? parsed.envelope : undefined,
    encFailed: parsed.kind === "e2e" && !m.deletedAt,
    createdAt: m.createdAt,
    status: receiptStatus(m, Boolean(fromMe)),
      seen: seenOf(m, Boolean(fromMe)),
      pollVotes: votesOf(m, meServerId ?? undefined),
    reactions: (m.reactions ?? []).map((r) => ({
      userId: meServerId && r.profileId === meServerId ? "me" : `srvuser:${r.profileId}`,
      emoji: r.emoji,
    })),
    mentions: m.mentions,
    replyTo: plain?.reply?.id ?? m.replyTo ?? undefined,
    replyPreview: plain?.reply?.preview,
    storyRef: plain?.story,
    editedAt: m.editedAt ?? undefined,
    deletedForAll: Boolean(m.deletedAt),
    pinned: Boolean(m.pinnedAt),
    forwarded: plain?.forwarded,
    ...(plain?.surprise
      ? {
          type: "scratch" as const,
          scratchCardId: plain.surprise.surpriseType,
          scratchDesign: plain.surprise.designId ?? "heart",
          effectId: plain.surprise.animationId ?? undefined,
          duration: plain.surprise.countdown,
        }
      : {}),
  };
}

function messageMeta(m: WippMessage, meServerId: string | undefined) {
  const fromMe = Boolean(meServerId && m.senderId === meServerId);
  return {
    status: receiptStatus(m, fromMe),
    seen: seenOf(m, fromMe),
    pollVotes: votesOf(m, meServerId),
    reactions: (m.reactions ?? []).map((r) => ({
      userId: meServerId && r.profileId === meServerId ? "me" : `srvuser:${r.profileId}`,
      emoji: r.emoji,
    })),
    editedAt: m.editedAt ?? undefined,
    deletedForAll: Boolean(m.deletedAt),
    pinned: Boolean(m.pinnedAt),
    type: m.deletedAt ? ("system" as const) : ("text" as const),
  };
}

function votesOf(m: WippMessage, meServerId: string | undefined): Message["pollVotes"] {
  if (!m.pollVotes) return undefined;
  return m.pollVotes.map((v) => ({ userId: meServerId && v.profileId === meServerId ? "me" : `srvuser:${v.profileId}`, options: v.options }));
}

function seenOf(m: WippMessage, fromMe: boolean): Message["seen"] {
  if (!fromMe || !m.receipts) return undefined;
  return m.receipts.map((r) => ({ userId: `srvuser:${r.profileId}`, deliveredAt: r.deliveredAt ?? undefined, readAt: r.readAt ?? undefined }));
}

function receiptStatus(m: WippMessage, fromMe: boolean): Message["status"] {
  if (!fromMe) return "sent";
  if (m.readAt) return "read";
  if (m.deliveredAt) return "delivered";
  return "sent";
}

type StoreSlice = {
  users: Record<string, User>;
  chats: Chat[];
  messages: Record<string, Message[]>;
  peerPublicKeys?: Record<string, JsonWebKey>;
  identity?: KeyBundle | null;
};

export function mergeServerChatsIntoState(
  state: StoreSlice,
  serverChats: WippChatSummary[],
  meServerId?: string,
): Partial<StoreSlice> {
  const users = { ...state.users };
  const peerPublicKeys = { ...(state.peerPublicKeys ?? {}) };
  const byId = new Map(state.chats.map((c) => [c.id, c]));
  for (const sc of serverChats) {
    const localId = toLocalChatId(sc.id);
    const user = peerToUser(sc.peer);
    const known = users[user.id];
    const dmConnected = sc.kind !== "group" && sc.connection ? sc.connection.status === "active" : undefined;
    users[user.id] = { ...known, ...user, connected: dmConnected ?? known?.connected ?? false };
    if (sc.peer.e2ePublicJwk) {
      peerPublicKeys[user.id] = sc.peer.e2ePublicJwk;
      peerPublicKeys[sc.peer.id] = sc.peer.e2ePublicJwk;
    }
    const prev = byId.get(localId);
    if (sc.kind === "group") {
      const memberIds = (sc.memberIds ?? []).map((id) => (meServerId && id === meServerId ? "me" : `srvuser:${id}`));
      if (!memberIds.includes("me")) memberIds.unshift("me");
      for (const member of sc.members ?? []) {
        const user = peerToUser(member);
        if (meServerId && member.id === meServerId) continue;
        users[user.id] = { ...users[user.id], ...user, connected: users[user.id]?.connected ?? false };
      }
      const muted =
        sc.mutedUntil === "always" || (typeof sc.mutedUntil === "number" && sc.mutedUntil > Date.now());
      byId.set(localId, {
        id: localId,
        type: "group",
        name: sc.groupName || sc.peer.displayName,
        avatar: sc.groupAvatar ?? undefined,
        description: sc.groupDescription ?? undefined,
        groupSettings: sc.groupSettings ?? prev?.groupSettings,
        participantIds: memberIds,
        adminIds: (sc.adminIds ?? []).map((id) => (meServerId && id === meServerId ? "me" : `srvuser:${id}`)),
        preview: sc.preview || prev?.preview || "",
        lastAt: sc.lastAt || prev?.lastAt || Date.now(),
        unread: sc.manuallyUnreadAt ? Math.max(1, sc.unread ?? 0) : (sc.unread ?? prev?.unread ?? 0),
        pinned: Boolean(sc.pinnedAt),
        muted,
        mutedUntil: sc.mutedUntil === "always" ? null : (sc.mutedUntil ?? null),
        muteAlways: sc.mutedUntil === "always",
        manuallyUnreadAt: sc.manuallyUnreadAt ?? null,
        archived: Boolean(sc.archivedAt),
        isRequest: false,
        inviteToken: prev?.inviteToken,
        disappearAfterMs: sc.disappearAfterMs ?? prev?.disappearAfterMs,
      });
      continue;
    }
    const vault = isPrivateChat(localId);
    const muted =
      sc.mutedUntil === "always" || (typeof sc.mutedUntil === "number" && sc.mutedUntil > Date.now());
    byId.set(localId, {
      id: localId,
      type: "dm",
      participantIds: ["me", user.id],
      preview: sc.preview || prev?.preview || "",
      lastAt: sc.lastAt || prev?.lastAt || Date.now(),
      unread: sc.manuallyUnreadAt ? Math.max(1, sc.unread ?? 0) : (sc.unread ?? prev?.unread ?? 0),
      pinned: vault ? Boolean(prev?.pinned) : Boolean(sc.pinnedAt),
      muted,
      mutedUntil: sc.mutedUntil === "always" ? null : (sc.mutedUntil ?? null),
      muteAlways: sc.mutedUntil === "always",
      manuallyUnreadAt: sc.manuallyUnreadAt ?? null,
      archived: vault ? Boolean(prev?.archived) : Boolean(sc.archivedAt),
      isRequest: false,
      connection: sc.connection !== undefined ? sc.connection : (prev?.connection ?? null),
      shopId: prev?.shopId,
      disappearAfterMs: sc.disappearAfterMs ?? prev?.disappearAfterMs,
    });
  }
  const chats = [
    ...Array.from(byId.values()).filter((c) => isServerChatId(c.id)),
    ...state.chats.filter((c) => !isServerChatId(c.id) && !isSeedDemoChat(c.id)),
  ].sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  const messages = { ...state.messages };
  for (const id of Object.keys(messages)) {
    if (isSeedDemoChat(id)) delete messages[id];
  }
  void meServerId;
  return { users, chats, messages, peerPublicKeys };
}

export function mergeServerMessagesIntoState(
  state: StoreSlice,
  serverChatId: string,
  serverMessages: WippMessage[],
  meServerId?: string,
): Partial<StoreSlice> {
  const localId = toLocalChatId(serverChatId);
  const existing = state.messages[localId] ?? [];
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const sm of serverMessages) {
    const mapped = mapServerMessageSync(sm, meServerId);
    if (sm.clientId && sm.clientId !== sm.id) {
      const optimistic = byId.get(sm.clientId);
      if (optimistic) {
        byId.delete(sm.clientId);
        if (optimistic.type !== "text" && optimistic.type !== "system") {
          byId.set(sm.id, keepLocalMedia(optimistic, mapped));
          continue;
        }
        if (optimistic.text && mapped.enc && !mapped.text) {
          mapped.text = optimistic.text;
          mapped.replyPreview = mapped.replyPreview ?? optimistic.replyPreview;
          mapped.forwarded = mapped.forwarded ?? optimistic.forwarded;
          mapped.storyRef = mapped.storyRef ?? optimistic.storyRef;
          mapped.encFailed = false;
        }
      }
    }
    const prev = byId.get(sm.id);
    const ctChanged = Boolean(prev?.enc?.ct && mapped.enc?.ct && prev.enc.ct !== mapped.enc.ct);
    if (prev?.text && mapped.enc && !mapped.text && !ctChanged && !mapped.deletedForAll && prev.type !== "text" && prev.type !== "system" && prev.type !== "scratch") {
      // Déjà déchiffré en sticker / photo / carte… : la copie serveur ne dit que « texte chiffré », on garde le type local.
      byId.set(sm.id, keepLocalMedia(prev, { ...mapped, replyPreview: mapped.replyPreview ?? prev.replyPreview, forwarded: mapped.forwarded ?? prev.forwarded, storyRef: mapped.storyRef ?? prev.storyRef }));
    } else if (prev?.text && mapped.enc && !mapped.text && !ctChanged && !mapped.deletedForAll) {
      byId.set(sm.id, {
        ...mapped,
        text: prev.text,
        // A decrypted surprise must stay a surprise (the server copy only says "text").
        ...(prev.type === "scratch"
          ? { type: "scratch" as const, scratchCardId: prev.scratchCardId, scratchDesign: prev.scratchDesign, effectId: prev.effectId, duration: prev.duration }
          : {}),
        replyPreview: mapped.replyPreview ?? prev.replyPreview,
        forwarded: mapped.forwarded ?? prev.forwarded,
        storyRef: mapped.storyRef ?? prev.storyRef,
        encFailed: false,
      });
    } else if (ctChanged) {
      byId.set(sm.id, { ...mapped, text: undefined, encFailed: true });
    } else {
      byId.set(sm.id, prev && prev.type !== "text" && !mapped.deletedForAll ? keepLocalMedia(prev, mapped) : mapped);
    }
  }
  const merged = Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
  const last = merged.at(-1);
  const preview = last?.text
    ? last.text
    : last?.enc
      ? "Message chiffré"
      : last
        ? ""
        : undefined;
  return {
    messages: { ...state.messages, [localId]: merged },
    chats: state.chats.map((c) =>
      c.id === localId && last
        ? { ...c, preview: preview ?? c.preview, lastAt: last.createdAt, unread: 0 }
        : c,
    ),
  };
}

/** After merge, decrypt E2E envelopes that still lack plaintext. */
/** List preview for a message without text, like WhatsApp. */
function mediaPreview(type: Message["type"]) {
  switch (type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Vidéo";
    case "voice":
      return "🎤 Message vocal";
    case "file":
      return "📄 Document";
    case "gif":
      return "GIF";
    case "sticker":
      return "Sticker";
    default:
      return "";
  }
}

/** Group messages: decrypt with the group key of their epoch (see group-e2e.ts). */
async function decryptGroupMerged(state: StoreSlice, localChatId: string, identity: KeyBundle): Promise<Partial<StoreSlice>> {
  const meId = (state as { serverProfileId?: string | null }).serverProfileId;
  if (!meId) return {};
  const list = state.messages[localChatId] ?? [];
  if (!list.some((m) => !m.text && m.enc && (m.enc as { g?: unknown }).g != null)) return {};
  const { decryptGroupBody, isGroupEnvelope } = await import("./group-e2e");
  const { parseMedia, mediaLabel } = await import("./media-crypto");
  let changed = false;
  const next: Message[] = [];
  for (const m of list) {
    if (m.text || !m.enc || !isGroupEnvelope(m.enc)) {
      next.push(m);
      continue;
    }
    const inner = m.deletedForAll ? null : await decryptGroupBody(localChatId, m.enc, identity, meId);
    if (inner == null) {
      next.push(m);
      continue;
    }
    changed = true;
    const media = parseMedia(inner);
    if (media) {
      next.push({ ...applyMediaEnvelope(m, media, mediaLabel(media.kind)), encFailed: false });
      continue;
    }
    const legacy = groupMediaFields(inner);
    next.push(legacy ? { ...m, ...legacy, encFailed: false } : { ...m, type: "text", text: inner, encFailed: false });
  }
  if (!changed) return {};
  const last = next.at(-1);
  return {
    messages: { ...state.messages, [localChatId]: next },
    chats: state.chats.map((c) => (c.id === localChatId && last?.text ? { ...c, preview: last.text } : c)),
  };
}

function validPoll(p: unknown): Message["poll"] | null {
  const q = p as { question?: unknown; options?: unknown; multi?: unknown } | undefined;
  if (!q || typeof q.question !== "string" || !Array.isArray(q.options)) return null;
  const options = q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0).slice(0, 12).map((o) => o.slice(0, 100));
  if (options.length < 2) return null;
  return { question: q.question.slice(0, 300), options, multi: q.multi === true };
}

/** Sticker / media sent in the group JSON format (now inside the encrypted body). */
function groupMediaFields(inner: string): Partial<Message> | null {
  const t = inner.trim();
  if (!t.startsWith("{")) return null;
  try {
    const p = JSON.parse(t) as { k?: string; type?: Message["type"]; text?: string; stickerId?: string; poll?: Message["poll"] };
    if (p.k !== "wipp-group-media" || !p.type) return null;
    if (p.type === "poll") return validPoll(p.poll) ? { type: "poll", poll: validPoll(p.poll)!, text: undefined } : null;
    return { type: p.type, text: p.text, stickerId: p.stickerId };
  } catch {
    return null;
  }
}

export async function decryptMergedMessages(
  state: StoreSlice,
  localChatId: string,
  identity: KeyBundle | null | undefined,
): Promise<Partial<StoreSlice>> {
  if (!identity || !isServerChatId(localChatId)) return {};
  if (toServerChatId(localChatId).startsWith("g_") || state.chats.find((c) => c.id === localChatId)?.type === "group") {
    return decryptGroupMerged(state, localChatId, identity);
  }
  const serverChatId = toServerChatId(localChatId);
  const list = state.messages[localChatId] ?? [];
  // ECDH needs the other party's public key. For an incoming message that is the
  // sender key (spk); for my own message spk is my key, so use the peer's instead.
  const peerId = state.chats.find((c) => c.id === localChatId)?.participantIds.find((id) => id !== "me");
  const keys = state.peerPublicKeys ?? {};
  const peerJwk = peerId ? keys[peerId] ?? (peerId.startsWith("srvuser:") ? keys[peerId.slice("srvuser:".length)] : undefined) : undefined;
  let changed = false;
  const next = [];
  for (const m of list) {
    // Réparation : un sticker abîmé par l'ancienne synchro est devenu un texte égal à son nom (« Bisou », « Sticker »…).
    const suspect = m.type === "text" && Boolean(m.text) && !(m as { healed?: boolean }).healed && isStickerLabel(m.text ?? "");
    if ((m.text && !suspect) || !m.enc) {
      next.push(m);
      continue;
    }
    const env = m.enc as { spk?: JsonWebKey; iv?: string; ct?: string; e2e?: boolean; v?: number; alg?: string };
    if (!env?.spk || !env.iv || !env.ct) {
      next.push(m);
      continue;
    }
    const otherJwk = m.fromId === "me" ? peerJwk : env.spk;
    if (!otherJwk) {
      next.push(m);
      continue;
    }
    try {
      const key = await deriveChatKey(identity, otherJwk, serverChatId);
      const text = await decryptText(key, {
        v: 1,
        alg: "AES-GCM",
        iv: env.iv,
        ct: env.ct,
      });
      const plain = decodePlain(text);
      const { parseMedia, mediaLabel } = await import("./media-crypto");
      const media = m.deletedForAll ? null : parseMedia(plain.text);
      const base: Message = media
        ? applyMediaEnvelope(m, media, mediaLabel(media.kind))
        : ({ ...m, text: m.deletedForAll ? "Message supprimé" : plain.text, ...(suspect ? { healed: true } : {}) } as Message);
      next.push(
        applySurprise(
          {
            ...base,
            replyTo: plain.reply?.id ?? m.replyTo,
            replyPreview: plain.reply?.preview ?? m.replyPreview,
            storyRef: plain.story ?? m.storyRef,
            forwarded: plain.forwarded,
            encFailed: false,
          },
          plain.surprise,
        ),
      );
      changed = true;
    } catch {
      next.push({ ...m, encFailed: true });
    }
  }
  if (!changed) return {};
  const last = next.at(-1);
  return {
    messages: { ...state.messages, [localChatId]: next },
    chats: state.chats.map((c) =>
      c.id === localChatId && last
        ? {
            ...c,
            preview: last.text || mediaPreview(last.type) || (last.enc ? "Message chiffré" : c.preview),
            lastAt: last.createdAt,
          }
        : c,
    ),
  };
}

export async function bootstrapMessaging(local: {
  username: string;
  displayName: string;
}) {
  const profile = await ensureServerSession(local);
  const chats = await fetchServerChats();
  return { profile, chats };
}

export async function syncChatMessages(localChatId: string, before?: number) {
  if (!isServerChatId(localChatId)) return [];
  const profile = getStoredProfile();
  const messages = await fetchServerMessages(toServerChatId(localChatId), before);
  return { messages, meServerId: profile?.id };
}

export async function sendViaServer(
  localChatId: string,
  text: string,
  clientId: string,
  opts?: {
    identity?: KeyBundle | null;
    peerPublicJwk?: JsonWebKey | null;
    reply?: ReplyCite;
    forwarded?: boolean;
    vault?: boolean;
    surprise?: SurprisePlain;
    shop?: ShopPlain;
    story?: StoryCite;
  },
) {
  if (!isServerChatId(localChatId)) return null;
  const serverChatId = toServerChatId(localChatId);
  const plain = encodePlain({ text, reply: opts?.reply, forwarded: opts?.forwarded, surprise: opts?.surprise, shop: opts?.shop, story: opts?.story });
  let body = plain;
  if (opts?.identity && opts.peerPublicJwk) {
    const key = await deriveChatKey(opts.identity, opts.peerPublicJwk, serverChatId);
    const blob = await encryptText(key, plain);
    body = JSON.stringify(makeE2eEnvelope(blob, opts.identity.publicJwk));
  }
  return postServerMessage(serverChatId, body, clientId, {
    replyTo: opts?.reply?.id,
  });
}

function applyShop(m: Message, shop: ShopPlain | undefined): Message {
  if (!shop?.publicId) return m;
  return {
    ...m,
    type: "shop",
    shopId: `business:${shop.publicId}`,
    text: shop.name || m.text,
    imageUrl: shop.image || m.imageUrl,
  };
}

function applySurprise(m: Message, surprise: SurprisePlain | undefined): Message {
  if (!surprise) return m;
  return {
    ...m,
    type: "scratch",
    scratchCardId: surprise.surpriseType,
    scratchDesign: surprise.designId ?? "heart",
    effectId: surprise.animationId ?? undefined,
    duration: surprise.countdown,
  };
}

export async function editViaServer(
  localChatId: string,
  messageId: string,
  text: string,
  opts?: {
    identity?: KeyBundle | null;
    peerPublicJwk?: JsonWebKey | null;
    reply?: ReplyCite;
    forwarded?: boolean;
  },
) {
  if (!isServerChatId(localChatId)) return null;
  const serverChatId = toServerChatId(localChatId);
  const plain = encodePlain({ text, reply: opts?.reply, forwarded: opts?.forwarded });
  let body = plain;
  if (opts?.identity && opts.peerPublicJwk) {
    const key = await deriveChatKey(opts.identity, opts.peerPublicJwk, serverChatId);
    const blob = await encryptText(key, plain);
    body = JSON.stringify(makeE2eEnvelope(blob, opts.identity.publicJwk));
  }
  return editServerMessage(serverChatId, messageId, body);
}

export async function startChatWithUsername(username: string) {
  const chat = await openServerChat(username);
  return chat;
}

export async function publishIdentityPublicKey(identity: KeyBundle) {
  return publishMyE2eKey(identity.publicJwk);
}

export { previewFromBody };
