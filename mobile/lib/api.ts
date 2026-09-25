import Constants from 'expo-constants';
import {
  clearSession,
  getStoredProfile as readProfile,
  getStoredToken,
  persistSession,
} from './session';

export type WippProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  e2ePublicJwk?: JsonWebKey | null;
  role?: 'user' | 'admin';
  phoneE164?: string | null;
  isAdmin?: boolean;
};

export type WippChat = {
  id: string;
  peer: WippProfile;
  preview: string;
  lastAt: number;
  unread: number;
  pinnedAt?: number | null;
  archivedAt?: number | null;
  mutedUntil?: number | 'always' | null;
  manuallyUnreadAt?: number | null;
};

export type WippMessage = {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  text?: string | null;
  encrypted?: boolean;
  encFailed?: boolean;
  clientId?: string | null;
  createdAt: number;
  replyTo?: string | null;
  editedAt?: number | null;
  deletedAt?: number | null;
  pinnedAt?: number | null;
  deliveredAt?: number | null;
  readAt?: number | null;
  reactions?: { profileId: string; emoji: string; createdAt: number }[];
};

function defaultApiBase() {
  const extra = Constants.expoConfig?.extra as { wippApiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_WIPP_API_URL ||
    extra?.wippApiUrl ||
    'http://127.0.0.1:3847'
  );
}

export function apiBase() {
  return defaultApiBase().replace(/\/$/, '');
}

async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  if (init.auth !== false) {
    const token = await getStoredToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${apiBase()}/api/wipp/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    if (res.status === 401 && init.auth !== false) {
      await clearSession();
    }
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function getStoredProfile(): Promise<WippProfile | null> {
  return readProfile();
}

export async function persistSessionFromServer(session: {
  token: string;
  profile: WippProfile;
}) {
  await persistSession(session);
}

async function afterAuth(session: { token: string; profile: WippProfile }) {
  await persistSession(session);
  try {
    const { ensureE2eReady } = await import('./e2e');
    await ensureE2eReady();
  } catch {
    /* crypto optional until chat opens */
  }
  return session.profile;
}

export async function register(input: {
  username: string;
  password: string;
  displayName: string;
}) {
  const session = await api<{ token: string; profile: WippProfile }>('/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  });
  return afterAuth(session);
}

export async function login(username: string, password: string) {
  const session = await api<{ token: string; profile: WippProfile }>('/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ username, password }),
  });
  return afterAuth(session);
}

/** Connexion admin : numéro E.164 + mot de passe. */
export async function loginWithPhone(phone: string, password: string) {
  const session = await api<{ token: string; profile: WippProfile }>('/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ phone, password }),
  });
  return afterAuth(session);
}

export async function linkAdminPhone(phone: string) {
  const data = await api<{ profile: WippProfile }>('/me/admin-phone', {
    method: 'PUT',
    body: JSON.stringify({ phone }),
  });
  const token = await getStoredToken();
  if (token) await persistSession({ token, profile: data.profile });
  return data.profile;
}

export async function fetchAdminStats() {
  const data = await api<{
    stats: {
      users: number;
      chats: number;
      messages: number;
      blocks: number;
      openFlags: number;
      admins: number;
    };
  }>('/admin/stats');
  return data.stats;
}

export async function fetchAdminUsers() {
  const data = await api<{
    users: Array<{
      id: string;
      username: string;
      displayName: string;
      phoneE164?: string | null;
      role: string;
      createdAt: string;
      blockedByAdmin: boolean;
    }>;
  }>('/admin/users');
  return data.users;
}

export async function fetchAdminMessages() {
  const data = await api<{
    messages: Array<{
      id: string;
      chatId: string;
      senderId: string;
      username: string;
      preview: string;
      createdAt: number;
    }>;
  }>('/admin/messages');
  return data.messages;
}

export async function fetchAdminFlags() {
  const data = await api<{
    flags: Array<{
      id: string;
      targetType: string;
      targetId: string;
      reason: string;
      status: string;
      createdAt: number;
    }>;
  }>('/admin/flags');
  return data.flags;
}

export async function adminBlock(username: string, reason = '') {
  return api<{ ok: boolean }>('/admin/block', {
    method: 'POST',
    body: JSON.stringify({ username, reason }),
  });
}

export async function adminUnblock(username: string) {
  return api<{ ok: boolean }>('/admin/unblock', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

/** Restaure la session au boot — comme WhatsApp. Retourne null si absente/expirée. */
export async function restoreSession(): Promise<WippProfile | null> {
  const token = await getStoredToken();
  if (!token) return null;
  try {
    const me = await api<{ profile: WippProfile }>('/me');
    await persistSession({ token, profile: me.profile });
    try {
      const { ensureE2eReady } = await import('./e2e');
      await ensureE2eReady();
    } catch {
      /* ok */
    }
    return me.profile;
  } catch {
    await clearSession();
    return null;
  }
}

export async function ensureSession() {
  return restoreSession();
}

export async function logout() {
  try {
    await api('/logout', { method: 'POST' });
  } catch {
    /* still clear local */
  }
  await clearSession();
}

/** @deprecated Ne plus auto-connecter en démo — garde pour outils de test explicites. */
export async function ensureDemoSession() {
  const existing = await restoreSession();
  if (existing) return existing;
  return login('deena', 'wipp-demo');
}

export async function fetchChats() {
  const data = await api<{ chats: WippChat[] }>('/chats');
  return data.chats;
}

export async function openDm(peerUsername: string) {
  const data = await api<{ chat: WippChat }>('/chats', {
    method: 'POST',
    body: JSON.stringify({ peerUsername }),
  });
  return data.chat;
}

export async function fetchMessages(chatId: string) {
  const data = await api<{ messages: WippMessage[] }>(`/chats/${chatId}/messages`);
  return data.messages;
}

export async function sendMessage(
  chatId: string,
  body: string,
  clientId: string,
  opts?: { replyTo?: string; vault?: boolean },
) {
  const data = await api<{ message: WippMessage }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, clientId, replyTo: opts?.replyTo, vault: opts?.vault }),
  });
  return data.message;
}

export async function editMessage(chatId: string, messageId: string, body: string) {
  const data = await api<{ message: WippMessage }>(`/chats/${chatId}/messages/${messageId}/edit`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return data.message;
}

export async function hideMessage(chatId: string, messageId: string) {
  return api(`/chats/${chatId}/messages/${messageId}/hide`, { method: 'POST', body: '{}' });
}

export async function tombstoneMessage(chatId: string, messageId: string) {
  return api(`/chats/${chatId}/messages/${messageId}/tombstone`, { method: 'POST', body: '{}' });
}

export async function reactMessage(chatId: string, messageId: string, emoji: string) {
  return api(`/chats/${chatId}/messages/${messageId}/reaction`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function pinMessage(chatId: string, messageId: string, pinned: boolean) {
  return api(`/chats/${chatId}/messages/${messageId}/pin`, {
    method: 'POST',
    body: JSON.stringify({ pinned }),
  });
}

export async function postReceipts(chatId: string, messageIds: string[], kind: 'delivered' | 'read') {
  return api(`/chats/${chatId}/receipts`, {
    method: 'POST',
    body: JSON.stringify({ messageIds, kind }),
  });
}

export async function postTyping(chatId: string, active: boolean) {
  return api(`/chats/${chatId}/typing`, { method: 'POST', body: JSON.stringify({ active }) });
}

export async function postChatPrefs(
  chatId: string,
  patch: {
    pinned?: boolean;
    archived?: boolean;
    mute?: 'off' | '1h' | '8h' | '1w' | 'always';
    manuallyUnread?: boolean;
  },
) {
  return api(`/chats/${chatId}/prefs`, { method: 'POST', body: JSON.stringify(patch) });
}

export async function postFocus(chatId: string, active: boolean) {
  return api(`/chats/${chatId}/focus`, { method: 'POST', body: JSON.stringify({ active }) });
}

export async function health() {
  return api<{ ok: boolean; service: string }>('/health', { auth: false });
}
