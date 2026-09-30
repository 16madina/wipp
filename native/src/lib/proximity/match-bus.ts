import type { ReceiverMatch } from "./touch-receiver";

let last: ReceiverMatch | null = null;
const listeners = new Set<(m: ReceiverMatch) => void>();

export function setLastTouchMatch(match: ReceiverMatch) {
  last = match;
  for (const fn of listeners) fn(match);
}

export function getLastTouchMatch() {
  return last;
}

export function onLastTouchMatch(fn: (m: ReceiverMatch) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
