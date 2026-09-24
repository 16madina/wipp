/**
 * Shock detection for WIPP Touch (Bump-style) using expo-sensors Accelerometer.
 * Only active during an A share session. User acceleration (approx. gravity removed via high-pass).
 */
import { Accelerometer } from "expo-sensors";

export type ShockConfig = {
  /** Peak user-accel magnitude in g */
  gThreshold: number;
  /** Max duration of the peak to count as a tap (ms) */
  maxDurationMs: number;
};

const DEFAULT: ShockConfig = { gThreshold: 2.2, maxDurationMs: 120 };

type Listener = (at: number, magnitude: number) => void;

let sub: { remove: () => void } | null = null;
let cfg = { ...DEFAULT };
let lastMag = 0;
let peakStart = 0;
let firedAt = 0;
let gravity = { x: 0, y: 0, z: 9.8 };
let gravityInited = false;

export function configureTouchShock(partial: Partial<ShockConfig>) {
  cfg = { ...cfg, ...partial };
}

export async function startTouchShockListen(onShock: Listener): Promise<{ ok: boolean; reason?: string }> {
  stopTouchShockListen();
  try {
    const available = await Accelerometer.isAvailableAsync();
    if (!available) return { ok: false, reason: "no_accelerometer" };
    Accelerometer.setUpdateInterval(10); // ~100 Hz
    gravityInited = false;
    lastMag = 0;
    peakStart = 0;
    firedAt = 0;
    sub = Accelerometer.addListener(({ x, y, z }) => {
      // Light low-pass for gravity estimate
      const alpha = 0.9;
      if (!gravityInited) {
        gravity = { x, y, z };
        gravityInited = true;
        return;
      }
      gravity = {
        x: alpha * gravity.x + (1 - alpha) * x,
        y: alpha * gravity.y + (1 - alpha) * y,
        z: alpha * gravity.z + (1 - alpha) * z,
      };
      const ux = x - gravity.x;
      const uy = y - gravity.y;
      const uz = z - gravity.z;
      const mag = Math.sqrt(ux * ux + uy * uy + uz * uz);
      const now = Date.now();

      if (mag >= cfg.gThreshold) {
        if (!peakStart) peakStart = now;
        lastMag = Math.max(lastMag, mag);
      } else if (peakStart) {
        const dur = now - peakStart;
        if (dur > 15 && dur <= cfg.maxDurationMs && now - firedAt > 800) {
          firedAt = now;
          onShock(now, lastMag);
        }
        peakStart = 0;
        lastMag = 0;
      }
    });
    return { ok: true };
  } catch (err) {
    console.warn("[wipp-touch] shock listen", err);
    return { ok: false, reason: "shock_unavailable" };
  }
}

export function stopTouchShockListen() {
  try {
    sub?.remove();
  } catch {
    /* ignore */
  }
  sub = null;
}
