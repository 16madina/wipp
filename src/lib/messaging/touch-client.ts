/** Client API for WIPP Touch invites (BLE / QR / code). */

import { getStoredToken } from "./client";

export type TouchInvite = {
  id: string;
  code: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  serviceUuid: string;
  qrPayload: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    firstName: string;
    avatarUrl?: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    displayName: string;
    firstName: string;
    avatarUrl?: string | null;
  } | null;
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  const token = getStoredToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`/api/wipp/${path.replace(/^\//, "")}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function createTouchShare() {
  return api<{ invite: TouchInvite }>("/touch/share", { method: "POST", body: "{}" });
}

export async function getTouchShareStatus(id: string) {
  return api<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}`);
}

export async function cancelTouchShare(id: string) {
  return api<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: "{}",
  });
}

export async function resolveTouchCode(code: string, opts?: { manual?: boolean }) {
  const q = opts?.manual ? "?source=manual" : "";
  return api<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}${q}`);
}

export async function acceptTouchCode(code: string) {
  return api<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export async function rejectTouchCode(code: string) {
  return api<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}/reject`, {
    method: "POST",
    body: "{}",
  });
}
