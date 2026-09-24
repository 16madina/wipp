/**
 * Proximity gate for WIPP Touch — RSSI smoothing + calibration logs.
 * Threshold is configurable; not a final product absolute.
 */
import {
  WIPP_TOUCH_PROXIMITY_WINDOW_MS,
  WIPP_TOUCH_RSSI_DEFAULT,
  WIPP_TOUCH_RSSI_EMA_ALPHA,
  WIPP_TOUCH_RSSI_SAMPLES_REQUIRED,
} from "./touch-constants";

export type ProximityHit = {
  code: string;
  rssi: number;
  ema: number;
  samples: number;
};

type Track = {
  ema: number;
  strongSamples: number;
  lastRssi: number;
  lastAt: number;
  bestEma: number;
};

let threshold = WIPP_TOUCH_RSSI_DEFAULT;
let calibration = false;
const tracks = new Map<string, Track>();
const notified = new Set<string>();
const calibLog: Array<{
  at: number;
  code: string;
  rssi: number;
  ema: number;
  threshold: number;
  pass: boolean;
}> = [];

export function setTouchRssiThreshold(dbm: number) {
  threshold = dbm;
}

export function getTouchRssiThreshold() {
  return threshold;
}

export function enableTouchCalibration(on: boolean) {
  calibration = on;
  if (on) calibLog.length = 0;
}

export function isTouchCalibrationEnabled() {
  return calibration;
}

export function getTouchCalibrationLog() {
  return [...calibLog];
}

export function clearTouchProximityState() {
  tracks.clear();
  notified.clear();
}

/**
 * Feed a raw RSSI observation. Returns a hit only when:
 * - smoothed RSSI stays above threshold for enough samples
 * - this invite has not already notified
 * - after a short window, this code is still the closest durable candidate
 */
export function observeTouchRssi(
  code: string,
  rssi: number,
  now = Date.now(),
): ProximityHit | null {
  if (notified.has(code)) return null;

  let t = tracks.get(code);
  if (!t) {
    t = { ema: rssi, strongSamples: 0, lastRssi: rssi, lastAt: now, bestEma: rssi };
    tracks.set(code, t);
  } else {
    t.ema = WIPP_TOUCH_RSSI_EMA_ALPHA * rssi + (1 - WIPP_TOUCH_RSSI_EMA_ALPHA) * t.ema;
    t.lastRssi = rssi;
    t.lastAt = now;
    if (t.ema > t.bestEma) t.bestEma = t.ema;
  }

  const pass = t.ema >= threshold;
  if (pass) t.strongSamples += 1;
  else t.strongSamples = Math.max(0, t.strongSamples - 1);

  if (calibration) {
    calibLog.push({
      at: now,
      code: code.slice(0, 2) + "••••",
      rssi,
      ema: Math.round(t.ema * 10) / 10,
      threshold,
      pass,
    });
    if (calibLog.length > 500) calibLog.shift();
    // eslint-disable-next-line no-console
    console.log(
      `[wipp-touch-calib] rssi=${rssi} ema=${t.ema.toFixed(1)} thr=${threshold} pass=${pass} code=${code.slice(0, 2)}••`,
    );
  }

  if (t.strongSamples < WIPP_TOUCH_RSSI_SAMPLES_REQUIRED) return null;

  // Prefer durable closest: among codes with enough strong samples, pick best EMA.
  let bestCode = code;
  let bestEma = t.ema;
  for (const [c, tr] of tracks) {
    if (notified.has(c)) continue;
    if (now - tr.lastAt > WIPP_TOUCH_PROXIMITY_WINDOW_MS * 2) continue;
    if (tr.strongSamples < WIPP_TOUCH_RSSI_SAMPLES_REQUIRED) continue;
    if (tr.ema > bestEma) {
      bestEma = tr.ema;
      bestCode = c;
    }
  }

  // Wait a short window so a momentarily louder far device doesn't win.
  const age = now - (tracks.get(bestCode)?.lastAt ?? now);
  if (age < 0) return null;
  // Fire immediately once samples satisfied and this is the closest.
  if (bestCode !== code) return null;

  notified.add(code);
  return {
    code,
    rssi: t.lastRssi,
    ema: t.ema,
    samples: t.strongSamples,
  };
}

export function markTouchNotified(code: string) {
  notified.add(code);
}
