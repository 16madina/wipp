/**
 * Realtime fan-out.
 * - In-process hub feeds the authenticated SSE stream (custom wipp_sessions).
 * - When SUPABASE_SERVICE_ROLE_KEY is set, the same event is Broadcast on
 *   Supabase Realtime topic `wipp:{realtimeKey}` (no plaintext).
 * Typing is not stored.
 */

export type LiveEvent = {
  id: string;
  chatId: string;
  kind: "message" | "edit" | "delete" | "reaction" | "pin" | "receipt" | "typing";
  at: number;
  payload: Record<string, unknown>;
};

type Listener = (event: LiveEvent) => void;

const listeners = new Set<Listener>();
const presence = new Map<string, Map<string, number>>();
const typingUntil = new Map<string, Map<string, number>>();

let seq = 0;

export function subscribeLive(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notePresence(chatId: string, profileId: string, active: boolean) {
  const room = presence.get(chatId) ?? new Map<string, number>();
  if (active) room.set(profileId, Date.now());
  else room.delete(profileId);
  presence.set(chatId, room);
}

export function isPresent(chatId: string, profileId: string) {
  const at = presence.get(chatId)?.get(profileId) ?? 0;
  return Date.now() - at < 20_000;
}

export function noteTyping(chatId: string, profileId: string, username: string, active: boolean) {
  const room = typingUntil.get(chatId) ?? new Map<string, number>();
  if (active) room.set(profileId, Date.now() + 4_000);
  else room.delete(profileId);
  typingUntil.set(chatId, room);
  void publishLive({
    id: `t_${Date.now()}`,
    chatId,
    kind: "typing",
    at: Date.now(),
    payload: { profileId, username, active },
  });
}

export function typingNow(chatId: string) {
  const room = typingUntil.get(chatId);
  if (!room) return [];
  const now = Date.now();
  const active: string[] = [];
  for (const [id, until] of room) {
    if (until < now) room.delete(id);
    else active.push(id);
  }
  return active;
}

export async function publishLive(event: LiveEvent, realtimeKey?: string | null) {
  for (const listener of listeners) listener(event);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!key || !base || !realtimeKey) return;
  const topic = `wipp:${realtimeKey}`;
  try {
    await fetch(`${base.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic, event: event.kind, payload: event }],
      }),
    });
  } catch {
    /* SSE hub already delivered to this process */
  }
}

export function nextEventId() {
  seq += 1;
  return `ev_${Date.now().toString(36)}_${seq}`;
}
