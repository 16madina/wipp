import { AppState, Platform } from "react-native";
import { fetchTouchBumpConfig, getTouchDetectStatus, reportTouchDetect, type DetectResult } from "./touch-api";
import { proximityProvider, type DeviceCandidate } from "./provider";
import { calibLog, TOUCH_BUMP_DEFAULTS, type TouchBumpConfig } from "./logic";
import { startTouchShockListen, stopTouchShockListen, configureTouchShock } from "./touch-shock";
import { ensureWippApiToken } from "./wipp-session";

const pending = new Map<string, { samples: number[]; detectedAt: number; notified?: boolean }>();
const polls = new Map<string, ReturnType<typeof setInterval>>();
let running = false;
let unsub: (() => void) | null = null;
let cfg: TouchBumpConfig = { ...TOUCH_BUMP_DEFAULTS };

export type ReceiverMatch = {
  code: string;
  senderName: string;
  senderUsername: string;
  senderId: string;
};

type MatchListener = (match: ReceiverMatch) => void;
const matchListeners = new Set<MatchListener>();

export function onTouchReceiverMatch(fn: MatchListener) {
  matchListeners.add(fn);
  return () => matchListeners.delete(fn);
}

async function onCandidate(c: DeviceCandidate, shockAt?: number) {
  const token = await ensureWippApiToken();
  if (!token) return;
  const prev = pending.get(c.token);
  const samples = [...(prev?.samples || []), ...c.rssiSamples].slice(-16);
  pending.set(c.token, { samples, detectedAt: c.lastSeen, notified: prev?.notified });
  if (prev?.notified) return;
  try {
    const res = await reportTouchDetect({
      code: c.token,
      rssiSamples: samples,
      detectedAt: c.lastSeen,
      shockAt: shockAt ?? null,
      platform: Platform.OS,
      foreground: AppState.currentState === "active",
      channel: "ble",
    });
    await handleDetect(c.token, res);
  } catch (err) {
    calibLog(cfg, "detect_err", { status: (err as { status?: number }).status });
  }
}

async function handleDetect(code: string, res: DetectResult) {
  if (res.state === "winner" && res.invite?.sender) {
    const p = pending.get(code);
    if (p) p.notified = true;
    const match: ReceiverMatch = {
      code: res.invite.code,
      senderName: res.invite.sender.firstName || res.invite.sender.displayName,
      senderUsername: res.invite.sender.username,
      senderId: res.invite.sender.id,
    };
    for (const fn of matchListeners) fn(match);
    const { setLastTouchMatch } = await import("./match-bus");
    setLastTouchMatch(match);
  } else if (res.state === "waiting_shock" || res.state === "queued") {
    pollWinner(code);
  }
}

function pollWinner(code: string) {
  if (polls.has(code)) return;
  const t = setInterval(() => {
    void (async () => {
      try {
        const st = await getTouchDetectStatus(code);
        if (st.state === "winner" && st.invite) {
          clearInterval(t);
          polls.delete(code);
          await handleDetect(code, st);
        } else if (st.state === "rejected" || st.state === "ambiguous") {
          clearInterval(t);
          polls.delete(code);
        }
      } catch {
        /* keep */
      }
    })();
  }, 1200);
  polls.set(code, t);
  setTimeout(() => {
    clearInterval(t);
    polls.delete(code);
  }, 90_000);
}

/** Foreground-only: B need not open WIPP Touch, but the app must be active. No Android FGS. */
export async function startTouchReceiver(): Promise<{ ok: boolean; reason?: string }> {
  if (running) return { ok: true };
  const token = await ensureWippApiToken();
  if (!token) return { ok: false, reason: "not_logged_in" };
  if (AppState.currentState !== "active") return { ok: false, reason: "background" };
  cfg = await fetchTouchBumpConfig();
  proximityProvider.setConfig(cfg);
  configureTouchShock(cfg);
  const start = await proximityProvider.startDiscovery("touch");
  if (!start.ok) return start;
  running = true;
  unsub = proximityProvider.on((ev) => {
    if (ev.type === "candidate") void onCandidate(ev.candidate);
    if (ev.type === "shock") {
      for (const [code, p] of pending) {
        if (p.notified) continue;
        void reportTouchDetect({
          code,
          rssiSamples: p.samples,
          detectedAt: p.detectedAt,
          shockAt: ev.at,
          platform: Platform.OS,
          foreground: true,
          channel: "ble",
        }).then((res) => handleDetect(code, res)).catch(() => undefined);
      }
    }
  });
  void startTouchShockListen((at, mag) => {
    calibLog(cfg, "shock", { mag, at });
    proximityProvider.noteShock(at, mag);
  });
  return { ok: true };
}

export async function stopTouchReceiver() {
  running = false;
  unsub?.();
  unsub = null;
  stopTouchShockListen();
  await proximityProvider.stopDiscovery();
  for (const t of polls.values()) clearInterval(t);
  polls.clear();
  pending.clear();
}
