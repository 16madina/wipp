/**
 * Android message previews, end-to-end encrypted.
 * The server sends a high-priority FCM *data* message carrying only the ciphertext ("wenc");
 * this background task decrypts it on the phone with the local identity key and shows the
 * notification itself. Any failure shows "Nouveau message" — a message is never lost silently.
 */
import { Platform } from "react-native";

const CHANNEL = "wipp_messages_preview";

type MessagePush = {
  type: "message";
  eventId: string;
  chatId?: string;
  title?: string;
  fallback?: string;
  wenc?: string;
  [k: string]: unknown;
};

/** Finds the WIPP message payload wherever Expo put the FCM data. */
function findMessage(raw: unknown, depth = 0): MessagePush | null {
  if (!raw || depth > 4) return null;
  if (typeof raw === "string") {
    try {
      return findMessage(JSON.parse(raw), depth + 1);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.type === "message" && typeof o.wenc === "string" && o.eventId) return o as MessagePush;
  for (const v of Object.values(o)) {
    const hit = findMessage(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** Same preview rules as the iOS extension (NotificationService.swift). */
function describe(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const o = JSON.parse(trimmed) as { k?: string; kind?: string; caption?: string; text?: string; surprise?: unknown; shop?: unknown };
      if (o.k === "wipp-media-v1") {
        const labels: Record<string, string> = {
          image: "📷 Photo",
          video: "🎥 Vidéo",
          file: "📄 Document",
          voice: "🎤 Message vocal",
          gif: "GIF",
          sticker: "Sticker",
          contact: "👤 Contact",
          location: "📍 Position",
          link: "🔗 Lien",
        };
        const label = labels[o.kind ?? ""] ?? "Nouveau message";
        const caption = (o.caption ?? "").trim();
        return clip(caption ? `${label.split(" ")[0]} ${caption}` : label);
      }
      if (o.k === "wipp-plain-v2") {
        if (o.surprise) return "🎁 Surprise";
        const body = o.text ?? "";
        if (o.shop) return clip(`🛍️ ${body}`);
        return body ? clip(body) : null;
      }
    } catch {
      /* plain text that happens to start with "{" */
    }
  }
  return trimmed ? clip(trimmed) : null;
}

function clip(s: string) {
  return s.length > 180 ? `${s.slice(0, 179)}…` : s;
}

async function decryptPreview(wencRaw: string): Promise<string | null> {
  try {
    const { getMessagePreviewEnabled, loadIdentity } = await import("../messaging/identity");
    if (!(await getMessagePreviewEnabled())) return null;
    const identity = await loadIdentity();
    if (!identity) return null;
    const wenc = JSON.parse(wencRaw) as { c?: string; iv?: string; ct?: string; spk?: { x?: string; y?: string } };
    if (!wenc.c || !wenc.iv || !wenc.ct || !wenc.spk?.x || !wenc.spk?.y) return null;
    const { deriveChatKey, decryptText } = await import("../crypto");
    const key = await deriveChatKey(identity, { kty: "EC", crv: "P-256", x: wenc.spk.x, y: wenc.spk.y }, wenc.c);
    const text = await decryptText(key, { v: 1, alg: "AES-GCM", iv: wenc.iv, ct: wenc.ct });
    return describe(text);
  } catch {
    return null;
  }
}

export async function onMessagePush(raw: unknown): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const msg = findMessage(raw);
  if (!msg) return false;
  const preview = await decryptPreview(msg.wenc!);
  const { default: n, AndroidImportance, AndroidVisibility } = await import("@notifee/react-native");
  await n.createChannel({
    id: CHANNEL,
    name: "Messages",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    vibrationPattern: [160, 80, 160, 80],
    visibility: AndroidVisibility.PRIVATE,
  });
  const data: Record<string, string> = { type: "message", eventId: String(msg.eventId) };
  if (typeof msg.chatId === "string") data.chatId = msg.chatId;
  await n.displayNotification({
    id: String(msg.eventId),
    title: String(msg.title || "WIPP"),
    body: preview ?? String(msg.fallback || "Nouveau message"),
    data,
    android: {
      channelId: CHANNEL,
      importance: AndroidImportance.HIGH,
      // Locked screen follows the phone setting ("show all content" vs "hide sensitive content").
      visibility: AndroidVisibility.PRIVATE,
      smallIcon: "notification_icon",
      pressAction: { id: "default", launchActivity: "default" },
      autoCancel: true,
    },
  });
  return true;
}

/** Tap on a message notification shown by notifee → open the conversation. */
export async function openMessageFromNotification(data: unknown): Promise<boolean> {
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.type !== "message") return false;
  const { openFromPushData } = await import("./index");
  await openFromPushData(d);
  return true;
}
