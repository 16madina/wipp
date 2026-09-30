import { WIPP_TOUCH_CODE_ALPHABET, WIPP_TOUCH_CODE_LENGTH } from "./constants";

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
  calibrationLog: false,
};

export type CandidateSample = {
  token: string;
  rssi: number;
  rssiSamples: number[];
  lastSeen: number;
};

export function isOpaqueToken(raw: string): boolean {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length === WIPP_TOUCH_CODE_LENGTH && [...cleaned].every((ch) => WIPP_TOUCH_CODE_ALPHABET.includes(ch));
}

export function normalizeToken(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!isOpaqueToken(cleaned)) return null;
  return cleaned;
}

export function median(nums: number[]): number | null {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function passesRssiMin(samples: number[], rssiMinDbm: number): boolean {
  const med = median(samples);
  return med != null && med >= rssiMinDbm;
}

export type Distinction = "single" | "multiple" | "none";

/** Strongest vs rest using rssiGapDb. Safety: no arbitrary pick. */
export function distinguishCandidates(
  candidates: CandidateSample[],
  cfg: Pick<TouchBumpConfig, "rssiMinDbm" | "rssiGapDb">,
  now = Date.now(),
  maxAgeMs = 4_000,
): { distinction: Distinction; winner: CandidateSample | null; close: CandidateSample[] } {
  const live = candidates.filter((c) => now - c.lastSeen <= maxAgeMs && passesRssiMin(c.rssiSamples, cfg.rssiMinDbm));
  if (!live.length) return { distinction: "none", winner: null, close: [] };
  const ranked = [...live].sort((a, b) => (median(b.rssiSamples) ?? -200) - (median(a.rssiSamples) ?? -200));
  const best = ranked[0]!;
  const bestMed = median(best.rssiSamples) ?? -200;
  const close = ranked.filter((c) => {
    const m = median(c.rssiSamples) ?? -200;
    return bestMed - m < cfg.rssiGapDb;
  });
  if (close.length > 1) return { distinction: "multiple", winner: null, close };
  return { distinction: "single", winner: best, close: [best] };
}

export function bytesToToken(raw: number[] | string, opts?: { skipCompanyId?: boolean }): string | null {
  try {
    let arr: number[] = typeof raw === "string" ? base64ToBytes(raw) ?? [] : raw;
    if (!arr.length) return null;
    if (opts?.skipCompanyId && arr.length > 2) arr = arr.slice(2);
    const str = String.fromCharCode(...arr);
    return normalizeToken(str);
  } catch {
    return null;
  }
}

export function extractTokenFromAdv(input: {
  localName?: string | null;
  name?: string | null;
  serviceDataBase64?: string | null;
  manufacturerDataBase64?: string | null;
}): string | null {
  for (const candidate of [input.localName, input.name]) {
    if (!candidate) continue;
    const token = normalizeToken(candidate);
    if (token) return token;
  }
  if (input.serviceDataBase64) {
    const token = bytesToToken(input.serviceDataBase64);
    if (token) return token;
  }
  if (input.manufacturerDataBase64) {
    return bytesToToken(input.manufacturerDataBase64, { skipCompanyId: true });
  }
  return null;
}

function base64ToBytes(b64: string): number[] | null {
  try {
    const bin =
      typeof atob === "function"
        ? atob(b64)
        : typeof Buffer !== "undefined"
          ? Buffer.from(b64, "base64").toString("binary")
          : "";
    if (!bin) return null;
    return [...bin].map((ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

export function calibEnabled(cfg: TouchBumpConfig): boolean {
  return Boolean(typeof __DEV__ !== "undefined" && __DEV__ && cfg.calibrationLog);
}

export function calibLog(cfg: TouchBumpConfig, msg: string, data?: Record<string, unknown>) {
  if (!calibEnabled(cfg)) return;
  const safe = data ? { ...data } : {};
  delete safe.token;
  delete safe.code;
  delete safe.auth;
  delete safe.userId;
  delete safe.profileId;
  console.log(`[wipp-calib] ${msg}`, safe);
}
