/**
 * Optional bridge so the web shell can call into React Native BLE when embedded.
 * In pure browser: no-op (QR/code fallback).
 */
export async function startShareAdvertise(
  _code: string,
): Promise<{ ok: boolean; reason?: string } | null> {
  return null;
}

export async function stopShareAdvertise(): Promise<void> {
  /* no-op on web */
}
