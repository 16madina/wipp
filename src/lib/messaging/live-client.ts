import { getStoredToken } from "@/lib/messaging/client";
import type { LiveEvent } from "@/lib/messaging/message-live";
import { parseSseChunk } from "@/lib/messaging/sse-parse";

type Handler = (event: LiveEvent) => void;

let stop: (() => void) | null = null;

/** One authenticated SSE stream for the signed-in session. */
export function startMessageStream(onEvent: Handler) {
  stop?.();
  let cancelled = false;
  const ac = new AbortController();
  stop = () => {
    cancelled = true;
    ac.abort();
  };
  void (async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await fetch("/api/wipp/stream", {
        headers: { authorization: `Bearer ${token}` },
        signal: ac.signal,
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (!cancelled) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        buf = parseSseChunk(buf, (event) => {
          if (event.chatId && event.kind) onEvent(event);
        });
      }
    } catch {
      /* aborted or offline */
    }
  })();
  return () => stop?.();
}
