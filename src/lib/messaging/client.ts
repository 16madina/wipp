import type { WippChatSummary, WippMessage, WippProfile, WippSessionPayload } from "./types";

const TOKEN_KEY = "wipp-server-token";
const PROFILE_KEY = "wipp-server-profile";

export function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredProfile(): WippProfile | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WippProfile;
  } catch {
    return null;
  }
}

function persistSession(session: WippSessionPayload | null) {
  if (typeof localStorage === "undefined") return;
  if (!session) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(session.profile));
}

async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (init.auth !== false) {
    const token = getStoredToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  const res = await fetch(`/api/wipp/${path.replace(/^\//, "")}`, {
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

export async function healthCheck() {
  return api<{ ok: boolean; service: string }>("/health", { auth: false });
}

export async function registerAccount(input: {
  username: string;
  password: string;
  displayName: string;
}) {
  const session = await api<WippSessionPayload>("/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
  persistSession(session);
  return session;
}

export async function loginAccount(input: { username: string; password: string }) {
  const session = await api<WippSessionPayload>("/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
  persistSession(session);
  return session;
}

export async function logoutAccount() {
  try {
    await api("/logout", { method: "POST" });
  } finally {
    persistSession(null);
  }
}

export async function fetchMe() {
  const data = await api<{ profile: WippProfile }>("/me");
  persistSession({ token: getStoredToken()!, profile: data.profile });
  return data.profile;
}

export async function publishMyE2eKey(publicJwk: JsonWebKey) {
  const data = await api<{ profile: WippProfile }>("/me/e2e-key", {
    method: "PUT",
    body: JSON.stringify({ publicJwk }),
  });
  persistSession({ token: getStoredToken()!, profile: data.profile });
  return data.profile;
}

export async function searchUsers(q: string) {
  const data = await api<{ users: WippProfile[] }>(`/users/search?q=${encodeURIComponent(q)}`);
  return data.users;
}

export async function openServerChat(peerUsername: string) {
  const data = await api<{ chat: WippChatSummary }>("/chats", {
    method: "POST",
    body: JSON.stringify({ peerUsername }),
  });
  return data.chat;
}

export async function fetchServerChats() {
  const data = await api<{ chats: WippChatSummary[] }>("/chats");
  return data.chats;
}

export async function fetchServerMessages(chatId: string, after?: number) {
  const q = after ? `?after=${after}` : "";
  const data = await api<{ messages: WippMessage[] }>(`/chats/${chatId}/messages${q}`);
  return data.messages;
}

export async function postServerMessage(chatId: string, body: string, clientId: string) {
  const data = await api<{ message: WippMessage }>(`/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, clientId }),
  });
  return data.message;
}

export async function createWebLinkCode(origin?: string) {
  return api<{
    code: string;
    token: string;
    expiresAt: number;
    status: string;
    qrUrl: string;
  }>("/link/create", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ origin: origin ?? window.location.origin }),
  });
}

export async function pollWebLinkStatus(token: string) {
  return api<{
    status: "pending" | "claimed" | "expired";
    profile?: WippProfile;
    session?: WippSessionPayload;
  }>(`/link/status?token=${encodeURIComponent(token)}`, { auth: false });
}

export async function claimWebLinkCode(code: string) {
  return api<{ ok: boolean; code: string; profile: WippProfile }>("/link/claim", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/** Ensure a server session exists for the current local profile (demo password). */
export async function ensureServerSession(opts: {
  username: string;
  displayName: string;
  password?: string;
}) {
  const existing = getStoredToken();
  if (existing) {
    try {
      return await fetchMe();
    } catch {
      persistSession(null);
    }
  }
  const password = opts.password ?? "wipp-demo";
  try {
    return (await loginAccount({ username: opts.username, password })).profile;
  } catch {
    try {
      return (
        await registerAccount({
          username: opts.username,
          password,
          displayName: opts.displayName,
        })
      ).profile;
    } catch {
      // Username taken with different password — fall back to seeded demo user
      return (await loginAccount({ username: "deena", password: "wipp-demo" })).profile;
    }
  }
}

export type CallInvite = {
  id: string;
  kind: "audio" | "video";
  roomName: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  caller: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  callee: { id: string; username: string; displayName: string; avatarUrl?: string | null };
};

export async function registerDevicePush(input: {
  token: string;
  platform?: string;
  kind?: string;
}) {
  return api<{ ok: boolean }>("/devices/push", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function inviteCall(input: {
  peerUsername?: string;
  peerId?: string;
  kind: "audio" | "video";
}) {
  return api<{ invite: CallInvite }>("/calls/invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchIncomingCalls() {
  return api<{ invites: CallInvite[] }>("/calls/incoming");
}

export async function fetchCallStatus(callId: string) {
  return api<{ invite: CallInvite }>(`/calls/${encodeURIComponent(callId)}/status`);
}

export async function answerCall(callId: string, accept: boolean) {
  return api<{ invite: CallInvite }>(`/calls/${encodeURIComponent(callId)}/answer`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

export async function hangupCall(callId: string) {
  return api<{ invite: CallInvite }>(`/calls/${encodeURIComponent(callId)}/hangup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

