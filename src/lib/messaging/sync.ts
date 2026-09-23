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
import {
  ensureServerSession,
  fetchServerChats,
  fetchServerMessages,
  getStoredProfile,
  openServerChat,
  postServerMessage,
  publishMyE2eKey,
} from "./client";
import type { WippChatSummary, WippMessage } from "./types";
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
  if (parsed.kind === "plain") {
    return { ...base, text: parsed.text };
  }
  if (!identity) {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
  try {
    const key = await deriveChatKey(identity, parsed.envelope.spk, serverChatId);
    const text = await decryptText(key, parsed.envelope);
    return { ...base, text, enc: parsed.envelope, encFailed: false };
  } catch {
    return { ...base, enc: parsed.envelope, encFailed: true };
  }
}

function mapServerMessageSync(m: WippMessage, meServerId: string | undefined): Message {
  const fromMe = meServerId && m.senderId === meServerId;
  const parsed = parseMessageBody(m.body);
  return {
    id: m.id,
    chatId: toLocalChatId(m.chatId),
    fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
    type: "text",
    text: parsed.kind === "plain" ? parsed.text : undefined,
    enc: parsed.kind === "e2e" ? parsed.envelope : undefined,
    encFailed: parsed.kind === "e2e",
    createdAt: m.createdAt,
    status: "read",
    reactions: [],
  };
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
    byId.set(localId, {
      id: localId,
      type: "dm",
      participantIds: ["me", user.id],
      preview: sc.preview || prev?.preview || "",
      lastAt: sc.lastAt || prev?.lastAt || Date.now(),
      unread: sc.unread ?? 0,
      pinned: prev?.pinned ?? false,
      muted: prev?.muted ?? false,
      archived: prev?.archived ?? false,
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
    const prev = byId.get(sm.id);
    // Keep already-decrypted plaintext if we have it
    if (prev?.text && mapped.enc && !mapped.text) {
      byId.set(sm.id, { ...mapped, text: prev.text, encFailed: false });
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
      next.push({ ...m, text, encFailed: false });
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
  },
) {
  if (!isServerChatId(localChatId)) return null;
  const serverChatId = toServerChatId(localChatId);
  let body = text;
  if (opts?.identity && opts.peerPublicJwk) {
    const key = await deriveChatKey(opts.identity, opts.peerPublicJwk, serverChatId);
    const blob = await encryptText(key, text);
    body = JSON.stringify(makeE2eEnvelope(blob, opts.identity.publicJwk));
  }
  return postServerMessage(serverChatId, body, clientId);
}

export async function startChatWithUsername(username: string) {
  const chat = await openServerChat(username);
  return chat;
}

export async function publishIdentityPublicKey(identity: KeyBundle) {
  return publishMyE2eKey(identity.publicJwk);
}

export { previewFromBody };
