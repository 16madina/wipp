/** Durable local outbox. clientId makes the server insert idempotent. */

const KEY = "wipp-outbox-v1";

export type OutboxItem = {
  localChatId: string;
  clientId: string;
  text: string;
  replyId?: string;
  replyPreview?: string;
  replySenderId?: string;
  forwarded?: boolean;
  vault?: boolean;
};

function read(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueOutbox(item: OutboxItem) {
  const items = read().filter((x) => x.clientId !== item.clientId);
  items.push(item);
  write(items);
}

export function dropOutbox(clientId: string) {
  write(read().filter((x) => x.clientId !== clientId));
}

export function listOutbox() {
  return read();
}
