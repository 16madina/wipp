/** Pure call and storage-path rules. No secrets, no native modules. */

function safeId(raw: string) {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  if (cleaned.length < 4) throw new Error("storage_path");
  return cleaned;
}

export function storyObjectPath(authorId: string, objectId: string) {
  return `stories/${safeId(authorId)}/${safeId(objectId)}`;
}

export function groupObjectPath(chatId: string, objectId: string) {
  return `groups/${safeId(chatId.replace(/^srv:/, ""))}/${safeId(objectId)}`;
}

export function isPrivateStoragePath(value: string | undefined | null) {
  return Boolean(value && (value.startsWith("stories/") || value.startsWith("groups/")));
}

/** A LiveKit token is minted only for a live, accepted participation. */
export function directTokenAllowed(status: string, ended: boolean) {
  return status === "accepted" && !ended;
}

export function groupTokenAllowed(status: string, state: string, ended: boolean) {
  if (ended || status === "ended" || status === "cancelled") return false;
  if (state === "declined" || state === "left" || state === "invited") return false;
  if (state === "ringing") return false;
  return state === "joining" || state === "joined" || state === "reconnecting" || state === "disconnected";
}

export function callPushData(callId: string, group = false, chatId?: string) {
  const data: { type: "call"; eventId: string; inviteId: string; group?: boolean; chatId?: string } = {
    type: "call",
    eventId: callId,
    inviteId: callId,
  };
  if (group) {
    data.group = true;
    if (chatId) data.chatId = chatId;
  }
  return data;
}

export function historyOutcome(status: string): "missed" | "declined" | "busy" | "failed" | undefined {
  if (status === "missed" || status === "expired") return "missed";
  if (status === "rejected" || status === "declined") return "declined";
  if (status === "busy") return "busy";
  if (status === "failed" || status === "cancelled") return "failed";
  return undefined;
}
