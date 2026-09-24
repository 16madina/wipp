/** Shared BLE constants for WIPP Touch (must match server). */

/** Advertised service UUID — used as scan filter on B. */
export const WIPP_TOUCH_SERVICE_UUID = "6eeff345-1111-4a2b-9c3d-aabbccddeeff";

/** GATT characteristic holding the ephemeral code (iOS backup when local name stripped). */
export const WIPP_TOUCH_CODE_CHAR_UUID = "6eeff345-2222-4a2b-9c3d-aabbccddeeff";

/**
 * Code format (manual + BLE + QR share the same token):
 * - Length: 8
 * - Alphabet: 32 chars (Crockford-like, no I/O/0/1) → 5 bits/char
 * - Entropy: 8 × 5 = 40 bits (~1.1e12 possibilities)
 * Security also relies on TTL (90s) + rate limiting, not length alone.
 */
export const WIPP_TOUCH_CODE_LENGTH = 8;
export const WIPP_TOUCH_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WIPP_TOUCH_CODE_ENTROPY_BITS = 40;

/**
 * Default RSSI gate for "phones nearly touching".
 * Configurable — calibrate with WIPP_TOUCH_CALIBRATION=1 / enableTouchCalibration().
 * Typical starting points (to validate on devices):
 *   glued ≈ -35…-45, 5cm ≈ -45…-55, 10cm ≈ -55…-65, 30cm ≈ -65…-75, 1m ≈ -75…-90
 */
export const WIPP_TOUCH_RSSI_DEFAULT = -52;

/** How many strong samples (after EMA) before we fire a detection. */
export const WIPP_TOUCH_RSSI_SAMPLES_REQUIRED = 3;

/** EMA alpha for RSSI smoothing (0–1). Higher = more reactive. */
export const WIPP_TOUCH_RSSI_EMA_ALPHA = 0.45;

/** Window (ms) to pick the durable closest peer before notifying. */
export const WIPP_TOUCH_PROXIMITY_WINDOW_MS = 900;
