/**
 * Bridge local Zustand UI store ↔ WIPP messaging API.
 * Server chats use ids prefixed with `srv:` in the client store.
 */
import {
  ensureServerSession,
  fetchServerChats,
  fetchServerMessages,
  getStoredProfile,
  openServerChat,
  postServerMessage,
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

function mapServerMessage(m: WippMessage, meServerId: string | undefined): Message {
  const fromMe = meServerId && m.senderId === meServerId;
  return {
    id: m.id,
    chatId: toLocalChatId(m.chatId),
    fromId: fromMe ? "me" : `srvuser:${m.senderId}`,
    type: "text",
    text: m.body,
    createdAt: m.createdAt,
    status: "read",
    reactions: [],
  };
}

type StoreSlice = {
  users: Record<string, User>;
  chats: Chat[];
  messages: Record<string, Message[]>;
};

export function mergeServerChatsIntoState(
  state: StoreSlice,
  serverChats: WippChatSummary[],
  meServerId?: string,
): Partial<StoreSlice> {
  const users = { ...state.users };
  const byId = new Map(state.chats.map((c) => [c.id, c]));
  for (const sc of serverChats) {
    const localId = toLocalChatId(sc.id);
    const user = peerToUser(sc.peer);
    users[user.id] = { ...users[user.id], ...user };
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
  return { users, chats };
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
    byId.set(sm.id, mapServerMessage(sm, meServerId));
  }
  const merged = Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
  const last = merged.at(-1);
  return {
    messages: { ...state.messages, [localId]: merged },
    chats: state.chats.map((c) =>
      c.id === localId && last
        ? { ...c, preview: last.text ?? c.preview, lastAt: last.createdAt, unread: 0 }
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

export async function sendViaServer(localChatId: string, text: string, clientId: string) {
  if (!isServerChatId(localChatId)) return null;
  return postServerMessage(toServerChatId(localChatId), text, clientId);
}

export async function startChatWithUsername(username: string) {
  const chat = await openServerChat(username);
  return chat;
}
