import { wippApi } from "./wipp-session";
import { TOUCH_BUMP_DEFAULTS, type TouchBumpConfig } from "./logic";

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
    avatarUrl?: string | null;
  } | null;
};

export type DetectResult = {
  state: "queued" | "waiting_shock" | "winner" | "rejected" | "ambiguous" | "bypassed";
  invite?: TouchInvite;
  message?: string;
  arbitration?: string;
};

export async function fetchTouchBumpConfig(): Promise<TouchBumpConfig> {
  try {
    const data = await wippApi<{ bump?: Partial<TouchBumpConfig> }>("/touch/config", { method: "GET" });
    return { ...TOUCH_BUMP_DEFAULTS, ...(data.bump || {}) };
  } catch {
    return { ...TOUCH_BUMP_DEFAULTS };
  }
}

export async function createTouchShare() {
  return wippApi<{ invite: TouchInvite }>("/touch/share", { method: "POST", body: "{}" });
}

export async function getTouchShareStatus(id: string) {
  return wippApi<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}`);
}

export async function cancelTouchShare(id: string) {
  return wippApi<{ invite: TouchInvite }>(`/touch/share/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: "{}",
  });
}

export async function reportTouchShock(inviteId: string, shockedAt = Date.now()) {
  return wippApi<{ invite?: TouchInvite; arbitration?: string; message?: string }>(
    `/touch/share/${encodeURIComponent(inviteId)}/shock`,
    { method: "POST", body: JSON.stringify({ shockedAt }) },
  );
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
  return wippApi<DetectResult>("/touch/detect", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getTouchDetectStatus(code: string) {
  return wippApi<DetectResult>(`/touch/detect/${encodeURIComponent(code)}/status`);
}

export async function resolveTouchCode(code: string, opts?: { source?: string }) {
  const source = opts?.source || "ble";
  const q = `?source=${encodeURIComponent(source)}`;
  return wippApi<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}${q}`);
}

export async function rejectTouchCode(code: string) {
  return wippApi<{ invite: TouchInvite }>(`/touch/code/${encodeURIComponent(code)}/reject`, {
    method: "POST",
    body: "{}",
  });
}
