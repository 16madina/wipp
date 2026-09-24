/**
 * In-memory rate limiter for WIPP Touch endpoints.
 * Keyed by profile id (and optionally route). Process-local — fine for single-node;
 * for multi-instance deploy, move to Redis/DB later.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

/** Limits (per authenticated profile). Tight on resolve/accept/manual; moderate on share create. */
export const TOUCH_RL = {
  create: { limit: 8, windowMs: 60_000 },
  resolve: { limit: 20, windowMs: 60_000 },
  accept: { limit: 10, windowMs: 60_000 },
  reject: { limit: 10, windowMs: 60_000 },
  /** Manual code typing is the brute-force surface — strict. */
  manual: { limit: 8, windowMs: 60_000 },
} as const;
