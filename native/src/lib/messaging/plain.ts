/**
 * Plaintext INSIDE the AES-GCM envelope. The server never parses this.
 *
 * Server-visible (needed to sync, no message text):
 *   ids, sender, client_id, reply_to id, edited_at, deleted_at, pin, emoji, receipts.
 * Encrypted:
 *   text, reply preview, forwarded flag.
 *
 * A message without reply/forward stays a raw string so older clients still decrypt.
 */

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type ReplyCite = {
  id: string;
  preview: string;
  senderId?: string;
};

export type SurprisePlain = {
  surpriseType: "scratch" | "countdown" | "gift" | "confetti";
  designId?: string;
  animationId?: string | null;
  countdown?: number;
};

export type ShopPlain = {
  publicId: string;
  name: string;
  category: string;
  city?: string;
  address?: string;
  image?: string;
};

/** Story reply/reaction cite. No storage URL: the chat keeps a label, the story feed stays private. */
export type StoryCite = {
  id: string;
  kind: "text" | "image" | "video";
  mode: "reply" | "reaction";
  preview: string;
  bg?: string;
};

export type PlainPayload = {
  text: string;
  reply?: ReplyCite;
  forwarded?: boolean;
  surprise?: SurprisePlain;
  shop?: ShopPlain;
  story?: StoryCite;
};

const MARK = "wipp-plain-v2";

export function encodePlain(input: PlainPayload): string {
  if (!input.reply && !input.forwarded && !input.surprise && !input.shop && !input.story) return input.text;
  return JSON.stringify({
    k: MARK,
    type: input.shop ? "shop" : "text",
    text: input.text,
    reply: input.reply,
    forwarded: input.forwarded || undefined,
    surprise: input.surprise,
    shop: input.shop,
    story: input.story,
  });
}

export function decodePlain(value: string): PlainPayload {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        k?: string;
        text?: string;
        reply?: ReplyCite;
        forwarded?: boolean;
        surprise?: SurprisePlain;
        shop?: ShopPlain;
        story?: StoryCite;
      };
      if (parsed.k === MARK && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          reply: parsed.reply?.id ? parsed.reply : undefined,
          forwarded: Boolean(parsed.forwarded),
          surprise: parsed.surprise,
          shop: parsed.shop?.publicId ? parsed.shop : undefined,
          story: parsed.story?.id && parsed.story.kind && parsed.story.mode ? parsed.story : undefined,
        };
      }
    } catch {
      /* legacy string */
    }
  }
  return { text: value };
}

export function citePreview(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}
