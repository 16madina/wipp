/**
 * Active Touch invite for the current session (BLE + QR + code share one token).
 * Kept outside Zustand so Touch UI design stays untouched while My QR / scanner
 * can reuse the same ephemeral invite.
 */
import type { TouchInvite } from "./touch-client";

let active: TouchInvite | null = null;

export function setActiveTouchInvite(invite: TouchInvite | null) {
  active = invite;
}

export function getActiveTouchInvite() {
  return active;
}

export function clearActiveTouchInvite() {
  active = null;
}
