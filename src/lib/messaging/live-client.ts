import type { LiveEvent } from "./message-live";
import { joinRoom, leaveRoom, subscribeChanges } from "./supa";

type Handler = (event: LiveEvent) => void;

/**
 * Supabase Realtime: row changes (RLS-filtered) + an ephemeral room for typing/presence
 * when a chat id is given. Returns a cleanup.
 */
export function startMessageStream(onEvent: Handler, chatId?: string) {
  const stopChanges = subscribeChanges(onEvent as never);
  if (chatId) joinRoom(chatId, onEvent as never);
  return () => {
    stopChanges();
    if (chatId) leaveRoom(chatId);
  };
}
