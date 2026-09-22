import { useWgoStore } from "./store";

export const HAPTIC = {
  tap: [10],
  select: [14],
  send: [12, 28],
  success: [12, 40, 22],
  error: [40, 50, 40],
  connect: [16, 36, 16, 36, 28],
  hold: [8, 18, 8],
  incoming: [240, 140, 240, 140, 240],
} as const;

export type HapticKind = keyof typeof HAPTIC;

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function hapticsOn() {
  return useWgoStore.getState().a11y?.haptics !== false;
}

export function haptic(kind: HapticKind = "tap") {
  if (!hapticsOn()) return false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wipp-haptic", { detail: kind }));
  }
  if (!canVibrate()) return false;
  try {
    navigator.vibrate([...HAPTIC[kind]]);
    return true;
  } catch {
    return false;
  }
}

export function hapticStop() {
  try {
    navigator.vibrate?.(0);
  } catch {
    /* web demo */
  }
}

export function reducedMotion() {
  if (typeof window === "undefined") return false;
  if (useWgoStore.getState().a11y?.reduceMotion) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function announce(text: string) {
  if (typeof document === "undefined" || !text) return;
  const live = document.getElementById("wipp-live");
  if (!live) return;
  live.textContent = "";
  window.requestAnimationFrame(() => {
    live.textContent = text;
  });
}
