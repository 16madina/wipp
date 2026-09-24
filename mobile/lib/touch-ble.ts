/**
 * WIPP Touch BLE — A advertises ephemeral code, B scans (no Touch UI required).
 *
 * Advertise path: local Expo module `wipp-touch-native`
 *   - iOS: CBPeripheralManager (service UUID + local name = code)
 *   - Android: AdvertiseData.addServiceUuid + manufacturer data in scan response
 * Scan path: react-native-ble-plx (service UUID filter).
 */
import { PermissionsAndroid, Platform } from "react-native";
import {
  canNativeAdvertise,
  isWippTouchNativeAvailable,
  nativeStartAdvertise,
  nativeStopAdvertise,
} from "wipp-touch-native";
import {
  WIPP_TOUCH_CODE_CHAR_UUID,
  WIPP_TOUCH_SERVICE_UUID,
} from "./touch-constants";
import { observeTouchRssi } from "./touch-proximity";

export { WIPP_TOUCH_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID };

export type ScanHit = { code: string; rssi: number; ema?: number };

type BleMgr = {
  startDeviceScan: (
    uuids: string[] | null,
    options: object | null,
    listener: (
      error: Error | null,
      device: {
        id?: string;
        name?: string | null;
        localName?: string | null;
        serviceUUIDs?: string[] | null;
        serviceData?: Record<string, string> | null;
        manufacturerData?: string | null;
        rssi: number | null;
      } | null,
    ) => void,
  ) => void;
  stopDeviceScan: () => void;
  state: () => Promise<string>;
};

function getBleManager(): BleMgr | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BleManager } = require("react-native-ble-plx");
    if (!BleManager) return null;
    const g = globalThis as { __wippBle?: BleMgr };
    if (!g.__wippBle) g.__wippBle = new BleManager();
    return g.__wippBle;
  } catch {
    return null;
  }
}

export function isBleNativeAvailable() {
  return isWippTouchNativeAvailable() || Boolean(getBleManager());
}

export function canAdvertiseBle() {
  if (isWippTouchNativeAvailable()) return canNativeAdvertise();
  return false;
}

export async function ensureBlePermissions(): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === "android") {
    const api = Number(Platform.Version);
    const wanted =
      api >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [
            // Pre-31 BLE scan historically required location
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
    const result = await PermissionsAndroid.requestMultiple(wanted.filter(Boolean) as never[]);
    const denied = Object.entries(result).filter(([, v]) => v !== PermissionsAndroid.RESULTS.GRANTED);
    if (denied.length) return { ok: false, reason: "bluetooth_permission" };
  }
  const mgr = getBleManager();
  if (mgr) {
    try {
      const state = await mgr.state();
      if (state !== "PoweredOn") return { ok: false, reason: "bluetooth_off" };
    } catch {
      return { ok: false, reason: "bluetooth_unavailable" };
    }
  } else if (!canAdvertiseBle()) {
    return { ok: false, reason: "ble_native_missing" };
  }
  return { ok: true };
}

function base64ToBytes(b64: string): number[] | null {
  try {
    const bin =
      typeof atob === "function"
        ? atob(b64)
        : typeof globalThis.Buffer !== "undefined"
          ? globalThis.Buffer.from(b64, "base64").toString("binary")
          : "";
    if (!bin) return null;
    return [...bin].map((ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToCode(raw: number[] | string, opts?: { skipCompanyId?: boolean }): string | null {
  try {
    let arr: number[] = typeof raw === "string" ? base64ToBytes(raw) ?? [] : raw;
    if (!arr.length) return null;
    if (opts?.skipCompanyId && arr.length > 2) arr = arr.slice(2);
    const str = String.fromCharCode(...arr).replace(/[^A-Z0-9]/gi, "");
    if (str.length >= 6 && str.length <= 12) return str.toUpperCase();
    return null;
  } catch {
    return null;
  }
}

function extractCode(device: {
  name?: string | null;
  localName?: string | null;
  serviceData?: Record<string, string> | null;
  manufacturerData?: string | null;
}): string | null {
  for (const candidate of [device.localName, device.name]) {
    if (!candidate) continue;
    const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length >= 6 && cleaned.length <= 12) return cleaned;
  }
  const sd = device.serviceData;
  if (sd) {
    const target = WIPP_TOUCH_SERVICE_UUID.toLowerCase().replace(/-/g, "");
    for (const [key, val] of Object.entries(sd)) {
      if (key.toLowerCase().replace(/-/g, "") === target) {
        const code = bytesToCode(val);
        if (code) return code;
      }
    }
    for (const val of Object.values(sd)) {
      const code = bytesToCode(val);
      if (code) return code;
    }
  }
  if (device.manufacturerData) {
    return bytesToCode(device.manufacturerData, { skipCompanyId: true });
  }
  return null;
}

/** A: broadcast Touch code — native module ensures Service UUID is in the ADV packet. */
export async function startTouchAdvertise(code: string): Promise<{
  ok: boolean;
  reason?: string;
  includesServiceUuid?: boolean;
}> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  if (!canAdvertiseBle()) {
    return { ok: false, reason: "ble_native_missing" };
  }
  try {
    const res = await nativeStartAdvertise(WIPP_TOUCH_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID, code);
    if (!res.ok) return { ok: false, reason: res.reason };
    if (res.includesServiceUuid === false) {
      return { ok: false, reason: "service_uuid_missing_in_adv" };
    }
    return { ok: true, includesServiceUuid: true };
  } catch (err) {
    console.warn("[wipp-touch] advertise failed", err);
    return { ok: false, reason: "advertise_failed" };
  }
}

export async function stopTouchAdvertise() {
  await nativeStopAdvertise();
}

let scanning = false;

/**
 * B: scan for WIPP Touch (service UUID filter).
 * Hits are gated by proximity (RSSI smoothing) before callback.
 */
export async function startTouchScan(
  onHit: (hit: ScanHit) => void,
): Promise<{ ok: boolean; reason?: string }> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  const mgr = getBleManager();
  if (!mgr) return { ok: false, reason: "ble_native_missing" };
  if (scanning) return { ok: true };
  scanning = true;

  try {
    mgr.startDeviceScan(
      [WIPP_TOUCH_SERVICE_UUID],
      { allowDuplicates: true },
      (error, device) => {
        if (error || !device) return;
        const code = extractCode(device);
        if (!code) return;
        const rssi = device.rssi ?? -100;
        const prox = observeTouchRssi(code, rssi);
        if (!prox) return;
        onHit({ code: prox.code, rssi: prox.rssi, ema: prox.ema });
      },
    );
    return { ok: true };
  } catch (err) {
    scanning = false;
    console.warn("[wipp-touch] scan failed", err);
    return { ok: false, reason: "scan_failed" };
  }
}

export function stopTouchScan() {
  try {
    getBleManager()?.stopDeviceScan();
  } catch {
    /* ignore */
  }
  scanning = false;
}
