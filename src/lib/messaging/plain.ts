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

export type PlainPayload = {
  text: string;
  reply?: ReplyCite;
  forwarded?: boolean;
};

const MARK = "wipp-plain-v2";

export function encodePlain(input: PlainPayload): string {
  if (!input.reply && !input.forwarded) return input.text;
  return JSON.stringify({
    k: MARK,
    type: "text",
    text: input.text,
    reply: input.reply,
    forwarded: input.forwarded || undefined,
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
      };
      if (parsed.k === MARK && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          reply: parsed.reply?.id ? parsed.reply : undefined,
          forwarded: Boolean(parsed.forwarded),
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
