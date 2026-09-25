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
import { decodePlain, encodePlain, type ReplyCite } from "@/lib/messaging/plain";
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
import type { Chat, Message, User } from "@/lib/types";

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
    connected: true,
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
    return {
      ...base,
      ...meta,
      text: m.deletedAt ? "Message supprimé" : plain.text,
      replyTo: plain.reply?.id ?? m.replyTo ?? undefined,
      replyPreview: plain.reply?.preview,
      forwarded: plain.forwarded,
    };
  }
  if (!identity) {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
  try {
    const key = await deriveChatKey(identity, parsed.envelope.spk, serverChatId);
    const text = await decryptText(key, parsed.envelope);
    const plain = decodePlain(text);
    return {
      ...base,
      ...meta,
      text: m.deletedAt ? "Message supprimé" : plain.text,
      replyTo: plain.reply?.id ?? m.replyTo ?? undefined,
      replyPreview: plain.reply?.preview,
      forwarded: plain.forwarded,
      enc: parsed.envelope,
      encFailed: false,
    };
  } catch {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
}

function mapServerMessageSync(m: WippMessage, meServerId: string | undefined): Message {
  const fromMe = meServerId && m.senderId === meServerId;
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
    reactions: (m.reactions ?? []).map((r) => ({
      userId: meServerId && r.profileId === meServerId ? "me" : `srvuser:${r.profileId}`,
      emoji: r.emoji,
    })),
    replyTo: plain?.reply?.id ?? m.replyTo ?? undefined,
    replyPreview: plain?.reply?.preview,
    editedAt: m.editedAt ?? undefined,
    deletedForAll: Boolean(m.deletedAt),
    pinned: Boolean(m.pinnedAt),
    forwarded: plain?.forwarded,
  };
}

function messageMeta(m: WippMessage, meServerId: string | undefined) {
  const fromMe = Boolean(meServerId && m.senderId === meServerId);
  return {
    status: receiptStatus(m, fromMe),
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
    users[user.id] = { ...users[user.id], ...user };
    if (sc.peer.e2ePublicJwk) {
      peerPublicKeys[user.id] = sc.peer.e2ePublicJwk;
      peerPublicKeys[sc.peer.id] = sc.peer.e2ePublicJwk;
    }
    const prev = byId.get(localId);
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
    });
  }
  const chats = [
    ...Array.from(byId.values()).filter((c) => isServerChatId(c.id)),
    ...state.chats.filter((c) => !isServerChatId(c.id)),
  ].sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  void meServerId;
  return { users, chats, peerPublicKeys };
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
        if (optimistic.text && mapped.enc && !mapped.text) {
          mapped.text = optimistic.text;
          mapped.replyPreview = mapped.replyPreview ?? optimistic.replyPreview;
          mapped.forwarded = mapped.forwarded ?? optimistic.forwarded;
          mapped.encFailed = false;
        }
      }
    }
    const prev = byId.get(sm.id);
    const ctChanged = Boolean(prev?.enc?.ct && mapped.enc?.ct && prev.enc.ct !== mapped.enc.ct);
    if (prev?.text && mapped.enc && !mapped.text && !ctChanged && !mapped.deletedForAll) {
      byId.set(sm.id, {
        ...mapped,
        text: prev.text,
        replyPreview: mapped.replyPreview ?? prev.replyPreview,
        forwarded: mapped.forwarded ?? prev.forwarded,
        encFailed: false,
      });
    } else if (ctChanged) {
      byId.set(sm.id, { ...mapped, text: undefined, encFailed: true });
    } else {
      byId.set(sm.id, mapped);
    }
  }
  const merged = Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
  const last = merged.at(-1);
  const preview = last?.text
    ? last.text
    : last?.enc
      ? "🔒 Message chiffré"
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
export async function decryptMergedMessages(
  state: StoreSlice,
  localChatId: string,
  identity: KeyBundle | null | undefined,
): Promise<Partial<StoreSlice>> {
  if (!identity || !isServerChatId(localChatId)) return {};
  const serverChatId = toServerChatId(localChatId);
  const list = state.messages[localChatId] ?? [];
  let changed = false;
  const next = [];
  for (const m of list) {
    if (m.text || !m.enc) {
      next.push(m);
      continue;
    }
    const env = m.enc as { spk?: JsonWebKey; iv?: string; ct?: string; e2e?: boolean; v?: number; alg?: string };
    if (!env?.spk || !env.iv || !env.ct) {
      next.push(m);
      continue;
    }
    try {
      const key = await deriveChatKey(identity, env.spk, serverChatId);
      const text = await decryptText(key, {
        v: 1,
        alg: "AES-GCM",
        iv: env.iv,
        ct: env.ct,
      });
      const plain = decodePlain(text);
      const { parseMedia, mediaLabel } = await import("./media-crypto");
      const media = parseMedia(plain.text);
      next.push({
        ...m,
        type: media ? (media.kind === "voice" || media.kind === "image" || media.kind === "video" ? media.kind : media.kind === "sticker" ? "sticker" : m.type) : m.type,
        text: m.deletedForAll ? "Message supprimé" : media ? mediaLabel(media.kind) : plain.text,
        stickerId: media?.stickerId ?? m.stickerId,
        viewOnce: media?.viewOnce ?? m.viewOnce,
        attachmentId: media?.id ?? m.attachmentId,
        mediaKey: media?.fileKey ?? m.mediaKey,
        mediaChunks: media?.chunks ?? m.mediaChunks,
        contactCard: media?.contact ?? m.contactCard,
        geo: media?.location ?? m.geo,
        linkCard: media?.link ?? m.linkCard,
        duration: media?.durationMs ? Math.round(media.durationMs / 1000) : m.duration,
        replyTo: plain.reply?.id ?? m.replyTo,
        replyPreview: plain.reply?.preview ?? m.replyPreview,
        forwarded: plain.forwarded,
        encFailed: false,
      });
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
            preview: last.text ?? (last.enc ? "🔒 Message chiffré" : c.preview),
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

export async function syncChatMessages(localChatId: string) {
  if (!isServerChatId(localChatId)) return [];
  const profile = getStoredProfile();
  const messages = await fetchServerMessages(toServerChatId(localChatId));
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
  return postServerMessage(serverChatId, body, clientId, {
    replyTo: opts?.reply?.id,
    vault: opts?.vault,
  });
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
