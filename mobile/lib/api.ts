import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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
  /** Decrypted plaintext when E2E succeeds (client-only). */
  text?: string | null;
  encrypted?: boolean;
  encFailed?: boolean;
  clientId?: string | null;
  createdAt: number;
};

const TOKEN_KEY = 'wipp-server-token';
const PROFILE_KEY = 'wipp-server-profile';

function defaultApiBase() {
  // Same machine as the Vite API during cloud/dev. Override with EXPO_PUBLIC_WIPP_API_URL.
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
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
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function getStoredProfile(): Promise<WippProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WippProfile;
  } catch {
    return null;
  }
}

async function persistSession(session: { token: string; profile: WippProfile } | null) {
  if (!session) {
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(session.profile));
}

export async function persistSessionFromServer(session: {
  token: string;
  profile: WippProfile;
}) {
  await persistSession(session);
}

export async function login(username: string, password: string) {
  const session = await api<{ token: string; profile: WippProfile }>('/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ username, password }),
  });
  await persistSession(session);
  try {
    const { ensureE2eReady } = await import('./e2e');
    await ensureE2eReady();
  } catch {
    /* crypto optional until chat opens */
  }
  return session.profile;
}

export async function ensureSession() {
  const existing = await getStoredProfile();
  if (!existing) return null;
  try {
    const me = await api<{ profile: WippProfile }>('/me');
    await persistSession({
      token: (await AsyncStorage.getItem(TOKEN_KEY))!,
      profile: me.profile,
    });
    return me.profile;
  } catch {
    await persistSession(null);
    return null;
  }
}

export async function ensureDemoSession() {
  const existing = await getStoredProfile();
  if (existing) {
    try {
      const me = await api<{ profile: WippProfile }>('/me');
      await persistSession({
        token: (await AsyncStorage.getItem(TOKEN_KEY))!,
        profile: me.profile,
      });
      return me.profile;
    } catch {
      await persistSession(null);
    }
  }
  try {
    return await login('deena', 'wipp-demo');
  } catch {
    return login('deena', 'wipp-demo');
  }
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
