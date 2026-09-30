/** Shared BLE constants — must match server Touch + Nearby. */

export const WIPP_TOUCH_SERVICE_UUID = "6eeff345-1111-4a2b-9c3d-aabbccddeeff";
export const WIPP_TOUCH_CODE_CHAR_UUID = "6eeff345-2222-4a2b-9c3d-aabbccddeeff";
export const WIPP_NEARBY_SERVICE_UUID = "6eeff345-3333-4a2b-9c3d-aabbccddeeff";

export const WIPP_TOUCH_CODE_LENGTH = 8;
export const WIPP_TOUCH_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const TOUCH_SEARCH_MS = 12_000;
export const NEARBY_SCAN_BURST_MS = 2_500;
export const NEARBY_SCAN_IDLE_MS = 8_000;
export const CANDIDATE_LOST_MS = 4_000;
export const RSSI_SAMPLE_MAX = 12;
