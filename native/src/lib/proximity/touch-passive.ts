/**
 * WIPP Touch without opening WIPP Touch: while WIPP is open in the foreground (any screen other than
 * WIPP Touch), the motion sensors listen for a short sharp bump. A felt bump is sent at once; the
 * server can only pair it with a phone that HAS WIPP Touch open. Nothing runs in the background.
 * Never Bluetooth / NFC.
 */
import { AppState, Platform } from "react-native";
import { getTouchCapabilities, startBumpDetection, type BumpEvent } from "wipp-touch-native";
import { wippApi } from "./wipp-session";

/** Detection floor in the native detector, and the minimum peak worth a server call. */
const DETECT_G = 0.7;
const SEND_MIN_G = 0.8;
const MAX_BUMP_MS = 250;
/** One report per gesture: the same tap rings for a few hundred ms. */
const SEND_GAP_MS = 1500;
/** After a report, how long to wait for the WIPP Touch phone's own report to arrive. */
const FOLLOW_MS = 4000;
const FOLLOW_EVERY_MS = 400;
const CLOCK_MAX_AGE_MS = 5 * 60_000;

type SessionLite = { id: string; state: string };

let sub: { remove: () => void } | null = null;
let clock: { offset: number; rtt: number; at: number } | null = null;
let lastSent = 0;
let following = false;
const listeners = new Set<(sessionId: string) => void>();

/** Called with the session id once a passive bump is paired (show the WIPP Touch card). */
export function onPassiveTouchMatch(fn: (sessionId: string) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function measureClock() {
  let best = { offset: 0, rtt: Number.POSITIVE_INFINITY };
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const { serverNow } = await wippApi<{ serverNow: number }>("/touch/time");
    const t1 = Date.now();
    if (t1 - t0 < best.rtt) best = { offset: serverNow - (t0 + t1) / 2, rtt: t1 - t0 };
  }
  clock = { ...best, at: Date.now() };
}

function emit(id: string) {
  for (const fn of listeners) fn(id);
}

async function follow(id: string) {
  following = true;
  const until = Date.now() + FOLLOW_MS;
  try {
    while (Date.now() < until && sub) {
      await new Promise((r) => setTimeout(r, FOLLOW_EVERY_MS));
      const r = await wippApi<{ session: SessionLite }>(`/touch/session/${encodeURIComponent(id)}`).catch(() => null);
      const st = r?.session.state;
      if (st === "candidate") return emit(id);
      if (st && st !== "bumped" && st !== "waiting") return;
    }
    // Nobody with WIPP Touch open felt the same bump: drop the attempt quietly.
    void wippApi(`/touch/session/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ diag: null }) }).catch(() => undefined);
  } finally {
    following = false;
  }
}

async function onBump(e: BumpEvent) {
  if (e.peak < SEND_MIN_G || following || AppState.currentState !== "active") return;
  if (e.at - lastSent < SEND_GAP_MS) return;
  lastSent = e.at;
  if (!clock) return;
  const caps = getTouchCapabilities();
  try {
    const r = await wippApi<{ session: SessionLite | null }>("/touch/passive-bump", {
      method: "POST",
      body: JSON.stringify({
        platform: caps.platform,
        caps,
        at: e.at + clock.offset,
        peak: e.peak,
        durMs: e.durMs,
        energy: e.energy,
        rtt: clock.rtt,
      }),
    });
    const s = r.session;
    if (!s) return;
    if (s.state === "candidate") emit(s.id);
    else if (s.state === "bumped") void follow(s.id);
  } catch {
    /* offline or refused: a passive bump is best effort */
  }
}

export async function startPassiveTouch() {
  if (sub || Platform.OS === "web") return;
  const caps = getTouchCapabilities();
  if (!caps.motion) return;
  sub = startBumpDetection(DETECT_G, MAX_BUMP_MS, (e) => void onBump(e));
  if (!sub) return;
  if (!clock || Date.now() - clock.at > CLOCK_MAX_AGE_MS) await measureClock().catch(() => undefined);
}

export function stopPassiveTouch() {
  sub?.remove();
  sub = null;
}
