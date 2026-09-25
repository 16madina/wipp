import type { LiveEvent } from "./message-live";

/** Split an SSE buffer. Returns the incomplete tail. */
export function parseSseChunk(buffer: string, onEvent: (event: LiveEvent) => void) {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    try {
      const event = JSON.parse(line.slice(5).trim()) as LiveEvent;
      if (event?.kind) onEvent(event);
    } catch {
      /* keepalive */
    }
  }
  return rest;
}
