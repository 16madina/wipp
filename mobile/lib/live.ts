import { apiBase } from '@/lib/api';
import { getStoredToken } from '@/lib/session';
import { parseSseChunk } from '../../src/lib/messaging/sse-parse';
import type { LiveEvent } from '../../src/lib/messaging/message-live';

/** Authenticated SSE. XMLHttpRequest so Android and iOS receive chunks without a second protocol. */
export function startNativeStream(onEvent: (event: LiveEvent) => void) {
  let cancelled = false;
  let xhr: XMLHttpRequest | null = null;
  let retry = 0;

  const run = async () => {
    if (cancelled) return;
    const token = await getStoredToken();
    if (!token || cancelled) return;
    xhr = new XMLHttpRequest();
    let seen = 0;
    let buf = '';
    xhr.open('GET', `${apiBase()}/api/wipp/stream`);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.onprogress = () => {
      const next = xhr?.responseText.slice(seen) ?? '';
      seen = xhr?.responseText.length ?? seen;
      buf = parseSseChunk(buf + next, onEvent);
    };
    const again = () => {
      if (cancelled) return;
      retry = Math.min(retry + 1, 6);
      setTimeout(() => void run(), 1000 * retry);
    };
    xhr.onerror = again;
    xhr.onload = again;
    xhr.send();
    retry = 0;
  };

  void run();
  return () => {
    cancelled = true;
    xhr?.abort();
  };
}
