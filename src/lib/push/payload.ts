/** Push data must stay routing-only. Never put secrets or E2EE material here. */

export const PUSH_TYPES = ["message", "request", "touch", "call"] as const;
export type PushType = (typeof PUSH_TYPES)[number];

export const ALLOWED_DATA_KEYS = [
  "type",
  "eventId",
  "chatId",
  "private",
  "business",
  "publicId",
  "requestId",
  "inviteId",
  "group",
] as const;

const FORBIDDEN = [
  "jwt",
  "accessToken",
  "refreshToken",
  "refresh_token",
  "idToken",
  "authorization",
  "e2e",
  "privateKey",
  "private_key",
  "ciphertext",
  "body",
  "preview",
  "text",
  "phone",
  "auth_user_id",
  "firebase_uid",
  "firebaseUid",
  "qrToken",
  "touchCode",
  "code",
  "avatar",
  "avatarUrl",
  "displayName",
  "username",
  "senderName",
];

export type PushData = {
  type: PushType | "group" | "story";
  eventId: string;
  chatId?: string;
  private?: boolean;
  business?: boolean;
  publicId?: string;
  requestId?: string;
  inviteId?: string;
  group?: boolean;
};

export function sanitizePushData(raw: Record<string, unknown>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const key of ALLOWED_DATA_KEYS) {
    const v = raw[key];
    if (typeof v === "boolean") out[key] = v;
    else if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 128);
  }
  for (const key of FORBIDDEN) delete out[key];
  if (!out.type || !out.eventId) {
    throw new Error("push payload missing type/eventId");
  }
  return out;
}

export function assertNoSensitivePush(data: Record<string, unknown>, title: string, body: string) {
  const blob = `${title}\n${body}\n${JSON.stringify(data)}`.toLowerCase();
  for (const key of FORBIDDEN) {
    if (key === "body" || key === "text" || key === "preview" || key === "code") continue;
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      throw new Error(`forbidden push key: ${key}`);
    }
  }
  if (blob.includes("eyj") && blob.includes("bearer")) {
    throw new Error("jwt-like material in push");
  }
}
