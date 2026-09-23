import AsyncStorage from '@react-native-async-storage/async-storage';
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
};

export type WippChat = {
  id: string;
  peer: WippProfile;
  preview: string;
  lastAt: number;
  unread: number;
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

export async function sendMessage(chatId: string, body: string, clientId: string) {
  const data = await api<{ message: WippMessage }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, clientId }),
  });
  return data.message;
}

export async function health() {
  return api<{ ok: boolean; service: string }>('/health', { auth: false });
}
