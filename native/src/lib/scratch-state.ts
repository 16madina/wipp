import { useSyncExternalStore } from "react";

/** True while a finger is scratching a card: the chat list stops scrolling meanwhile. */
let scratching = false;
const listeners = new Set<() => void>();

export function setScratching(v: boolean) {
  if (scratching === v) return;
  scratching = v;
  listeners.forEach((l) => l());
}

export function useScratching() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => scratching,
  );
}
