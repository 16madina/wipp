import type { Chat, OneTimeQr } from "./types";
import { APP_HOST } from "./utils";

export function groupInviteHref(token: string) {
  return `https://${APP_HOST}/g/${token}`;
}

export function groupInviteLabel(token: string) {
  return `${APP_HOST}/g/${token}`;
}

export function parseGroupInviteToken(raw: string): string {
  const s = raw.trim();
  const fromPath = (path: string) => {
    const m = path.match(/\/g\/([A-Za-z0-9_-]+)/);
    return m?.[1];
  };
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const tok = fromPath(u.pathname);
    if (tok) return tok;
  } catch {
    /* ignore */
  }
  const m = s.match(/(?:^|\/)g\/([A-Za-z0-9_-]+)/);
  if (m?.[1]) return m[1];
  return s.replace(/^\/+/, "");
}

export function findChatByInvite(
  chats: Chat[],
  qrs: OneTimeQr[],
  raw: string,
): Chat | undefined {
  const token = parseGroupInviteToken(raw);
  const byInvite = chats.find((c) => c.type === "group" && c.inviteToken === token);
  if (byInvite) return byInvite;
  const qr = qrs.find((q) => q.token === token && q.target.type === "group");
  if (qr && qr.target.type === "group") {
    const chatId = qr.target.chatId;
    return chats.find((c) => c.id === chatId);
  }
  return undefined;
}

export function inviteSlug(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${slug || "groupe"}-${Math.random().toString(36).slice(2, 6)}`;
}
