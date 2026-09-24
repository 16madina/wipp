/**
 * Server-side WIPP Touch bump config (shock + RSSI arbitration).
 * Overridable via wipp_touch_config without client rebuild.
 */
import { getSql } from "@/lib/db";

export type TouchBumpConfig = {
  shockGThreshold: number;
  shockMaxDurationMs: number;
  windowBeforeMs: number;
  windowAfterMs: number;
  windowAfterIosBgMs: number;
  rssiMinDbm: number;
  rssiGapDb: number;
  calibrationLog: boolean;
};

export const TOUCH_BUMP_DEFAULTS: TouchBumpConfig = {
  shockGThreshold: 2.2,
  shockMaxDurationMs: 120,
  windowBeforeMs: 1500,
  windowAfterMs: 1500,
  windowAfterIosBgMs: 5000,
  rssiMinDbm: -55,
  rssiGapDb: 8,
  calibrationLog: true,
};

let cached: { at: number; value: TouchBumpConfig } | null = null;

export async function getTouchBumpConfig(): Promise<TouchBumpConfig> {
  if (cached && Date.now() - cached.at < 5_000) return cached.value;
  try {
    const sql = await getSql();
    const rows = await sql<{ value: TouchBumpConfig }>`
      select value from wipp_touch_config where key = ${"bump"} limit 1
    `;
    const raw = rows[0]?.value;
    const merged = { ...TOUCH_BUMP_DEFAULTS, ...(raw || {}) };
    cached = { at: Date.now(), value: merged };
    return merged;
  } catch {
    return TOUCH_BUMP_DEFAULTS;
  }
}

export function touchCalibLog(cfg: TouchBumpConfig, msg: string, data?: unknown) {
  if (!cfg.calibrationLog) return;
  console.log(`[wipp-touch-calib] ${msg}`, data ?? "");
}
