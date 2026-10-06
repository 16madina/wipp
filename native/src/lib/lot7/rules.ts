/** Product rules mirrored by migrations/0014. The server is the authority. */

export const STORY_SERVER_TTL_MS = 86_400_000;

export type StoryAudienceServer = "contacts" | "only_me" | "close";

export function storyReadable(input: {
  audience: StoryAudienceServer;
  author: boolean;
  contact: boolean;
  closeFriend?: boolean;
  deleted: boolean;
  expiresAt: number;
  now: number;
}) {
  if (input.deleted || input.now >= input.expiresAt) return false;
  if (input.author) return true;
  if (input.audience === "only_me") return false;
  if (input.audience === "close") return Boolean(input.closeFriend);
  return input.audience === "contacts" && input.contact;
}

/** A normal member cannot grant admin. The actor id is the session, never a client field. */
export function actorMayChangeRoles(actorIsAdmin: boolean) {
  return actorIsAdmin;
}

export function groupInFilter(filter: "all" | "people" | "shops" | "groups", type: "dm" | "group", shop: boolean) {
  if (type === "group") return filter === "all" || filter === "groups";
  if (filter === "groups") return false;
  if (filter === "shops") return shop;
  if (filter === "people") return !shop;
  return true;
}

export function groupPreview(body: string) {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { k?: string; type?: string; text?: string; name?: string; e2e?: boolean };
      // End-to-end encrypted (group key): the phone shows the real text once decrypted.
      if (parsed.e2e === true) return "Message chiffré";
      if (parsed.k === "wipp-group-media") {
        if (parsed.text) return parsed.text.slice(0, 140);
        if (parsed.type === "image") return "Photo";
        if (parsed.type === "video") return "Vidéo";
        if (parsed.type === "voice") return "Message vocal";
        if (parsed.type === "file") return parsed.name || "Document";
        if (parsed.type === "sticker") return "Sticker";
        if (parsed.type === "poll") return "Sondage";
        if (parsed.type === "event") return "Événement";
      }
    } catch {
      /* plain */
    }
  }
  return trimmed.slice(0, 140);
}
