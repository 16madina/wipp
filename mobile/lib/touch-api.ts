import { apiBase } from "./api";
import { getStoredToken } from "./session";

export type TouchInvite = {
  id: string;
  code: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  serviceUuid: string;
  qrPayload: string;
  arbitration?: string;
  shockAt?: number | null;
  matchedProfileId?: string | null;
  message?: string | null;
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
  } | null;
};

export type DetectResult = {
  state: "queued" | "waiting_shock" | "winner" | "rejected" | "ambiguous" | "bypassed";
  invite?: TouchInvite;
  message?: string;
  arbitration?: string;
};

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${apiBase()}/api/wipp/${path.replace(/^\//, "")}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

export async function createTouchShare() {
  return authFetch<{ invite: TouchInvite }>("/touch/share", { method: "POST", body: "{}" });
}

export async function getTouchShareStatus(id: string) {
  return authFetch<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}`);
}

export async function cancelTouchShare(id: string) {
  return authFetch<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: "{}",
  });
}

export async function reportTouchShock(inviteId: string, shockedAt = Date.now()) {
  return authFetch<{
    invite?: TouchInvite;
    arbitration?: string;
    message?: string;
  }>(`/touch/share/${encodeURIComponent(inviteId)}/shock`, {
    method: "POST",
    body: JSON.stringify({ shockedAt }),
  });
}

export async function reportTouchDetect(input: {
  code: string;
  rssiSamples: number[];
  detectedAt: number;
  shockAt?: number | null;
  platform?: string;
  foreground?: boolean;
  channel?: "ble" | "nfc" | "manual" | "qr";
}) {
  return authFetch<DetectResult>("/touch/detect", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getTouchDetectStatus(code: string) {
  return authFetch<DetectResult>(`/touch/detect/${encodeURIComponent(code)}/status`);
}

export async function resolveTouchCode(
  code: string,
  opts?: { manual?: boolean; source?: string },
) {
  const source = opts?.source || (opts?.manual ? "manual" : "ble");
  const q = `?source=${encodeURIComponent(source)}`;
  return authFetch<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}${q}`);
}

export async function acceptTouchCode(code: string) {
  return authFetch<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export async function rejectTouchCode(code: string) {
  return authFetch<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}/reject`, {
    method: "POST",
    body: "{}",
  });
}
