import { apiBase } from "./api";
import { getStoredToken } from "./session";

export type CallInvite = {
  id: string;
  kind: "audio" | "video";
  roomName: string;
  status: string;
  caller: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  callee: { id: string; username: string; displayName: string; avatarUrl?: string | null };
};

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${apiBase()}/api/wipp/${path.replace(/^\//, "")}`, {
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function inviteCall(peerUsername: string, kind: "audio" | "video") {
  return authFetch<{ invite: CallInvite }>("/calls/invite", {
    method: "POST",
    body: JSON.stringify({ peerUsername, kind }),
  });
}

export async function listIncomingCalls() {
  return authFetch<{ invites: CallInvite[] }>("/calls/incoming");
}

export async function answerCall(callId: string, accept: boolean) {
  return authFetch<{ invite: CallInvite }>(`/calls/${encodeURIComponent(callId)}/answer`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

export async function hangupCall(callId: string) {
  return authFetch<{ invite: CallInvite }>(`/calls/${encodeURIComponent(callId)}/hangup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
