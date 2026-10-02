/** Durable in-memory outbox. clientId makes the server insert idempotent. */

export type OutboxItem = {
  localChatId: string;
  clientId: string;
  text: string;
  replyId?: string;
  replyPreview?: string;
  replySenderId?: string;
  forwarded?: boolean;
  vault?: boolean;
  story?: import("./plain").StoryCite;
};

let items: OutboxItem[] = [];

export function enqueueOutbox(item: OutboxItem) {
  items = items.filter((x) => x.clientId !== item.clientId);
  items.push(item);
}

export function dropOutbox(clientId: string) {
  items = items.filter((x) => x.clientId !== clientId);
}

export function listOutbox() {
  return [...items];
}
