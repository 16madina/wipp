import { Accelerometer } from "expo-sensors";
import type { TouchBumpConfig } from "./logic";

type Listener = (at: number, magnitude: number) => void;

let sub: { remove: () => void } | null = null;
let gThreshold = 2.2;
let maxDurationMs = 120;
let lastMag = 0;
let peakStart = 0;
let firedAt = 0;
let gravity = { x: 0, y: 0, z: 9.8 };
let gravityInited = false;

export function configureTouchShock(cfg: Pick<TouchBumpConfig, "shockGThreshold" | "shockMaxDurationMs">) {
  gThreshold = cfg.shockGThreshold;
  maxDurationMs = cfg.shockMaxDurationMs;
}

export async function startTouchShockListen(onShock: Listener): Promise<{ ok: boolean; reason?: string }> {
  stopTouchShockListen();
  try {
    const available = await Accelerometer.isAvailableAsync();
    if (!available) return { ok: false, reason: "no_accelerometer" };
    Accelerometer.setUpdateInterval(10);
    gravityInited = false;
    lastMag = 0;
    peakStart = 0;
    firedAt = 0;
    sub = Accelerometer.addListener(({ x, y, z }) => {
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
      if (mag >= gThreshold) {
        if (!peakStart) peakStart = now;
        lastMag = Math.max(lastMag, mag);
      } else if (peakStart) {
        const dur = now - peakStart;
        if (dur > 15 && dur <= maxDurationMs && now - firedAt > 800) {
          firedAt = now;
          onShock(now, lastMag);
        }
        peakStart = 0;
        lastMag = 0;
      }
    });
    return { ok: true };
  } catch {
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
