import type { Screen } from "../types";

export function localChatId(chatId: string) {
  return chatId.startsWith("srv:") ? chatId : `srv:${chatId}`;
}

export function screenFromPushData(data: Record<string, unknown>): Screen | null {
  const type = String(data.type || "");
  if (type === "group" || type === "story") return null;
  if (type === "request") return { name: "requests" };
  // WIPP online event (invitation, « c'est en direct ») → the event sheet.
  if (type === "live" && typeof data.publicId === "string" && data.publicId) return { name: "lifestyle", itemId: data.publicId };
  if (type === "touch") return { name: "touch-incoming" };
  if (type === "missed-call") return { name: "calls" };
  if (type === "call" || type === "incoming_call") {
    const callId = String(data.eventId || data.inviteId || "");
    if (!callId) return { name: "calls" };
    return {
      name: "active-call",
      userId: "call",
      kind: data.kind === "video" ? "video" : "audio",
      dir: "in",
      callId,
      group: data.group === true,
      chatId: typeof data.chatId === "string" ? data.chatId : undefined,
    };
  }
  if (type === "message") {
    if (typeof data.chatId !== "string" || !data.chatId.trim()) return { name: "chats" };
    return { name: "conversation", chatId: localChatId(data.chatId) };
  }
  return null;
}

/** wipp://requests | wipp://touch | wipp://c/{chatId} — does not replace QR routes. */
export function screenFromWippScheme(raw: string): Screen | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "wipp:") return null;
  const path = `${u.host}${u.pathname}`.replace(/^\/+/, "").replace(/\/+$/, "");
  if (path === "requests") return { name: "requests" };
  if (path === "touch") return { name: "touch-incoming" };
  const chat = /^c\/(.+)$/.exec(path);
  if (chat?.[1]) return { name: "conversation", chatId: localChatId(chat[1]) };
  return null;
}
