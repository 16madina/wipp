/**
 * WIPP Touch BLE — A advertises ephemeral code, B scans (no Touch UI required).
 * Uses react-native-ble-advertiser + react-native-ble-plx when native modules exist.
 *
 * Payload = ASCII invite code only (no phone / email / permanent id).
 * Same code is used for QR and typed entry.
 */
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import { WIPP_TOUCH_SERVICE_UUID } from "./touch-constants";

export { WIPP_TOUCH_SERVICE_UUID };

type ScanHit = { code: string; rssi: number };

function getAdvertiser(): {
  broadcast: (uuid: string, payload: number[], options: object) => Promise<void>;
  stopBroadcast: () => Promise<void>;
  setCompanyId: (id: number) => void;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-ble-advertiser");
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

type BleMgr = {
  startDeviceScan: (
    uuids: string[] | null,
    options: object | null,
    listener: (
      error: Error | null,
      device: {
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
  return Boolean(
    getAdvertiser() || getBleManager() || NativeModules.BLEAdvertiser || NativeModules.BleClientManager,
  );
}

/** Android advertiser is available; iOS CoreBluetooth peripheral advertise is not in this stack. */
export function canAdvertiseBle() {
  if (Platform.OS === "android") return Boolean(getAdvertiser() || NativeModules.BLEAdvertiser);
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
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
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
  } else if (!getAdvertiser()) {
    return { ok: false, reason: "ble_native_missing" };
  }
  return { ok: true };
}

function codeToBytes(code: string): number[] {
  return [...code.toUpperCase()].map((ch) => ch.charCodeAt(0));
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

/** Decode ASCII invite code from BLE serviceData or manufacturerData. */
function bytesToCode(raw: number[] | Uint8Array | string, opts?: { skipCompanyId?: boolean }): string | null {
  try {
    let arr: number[];
    if (typeof raw === "string") {
      const decoded = base64ToBytes(raw);
      if (!decoded) return null;
      arr = decoded;
    } else {
      arr = [...raw];
    }
    // Manufacturer data = 2-byte company id (LE) + payload
    if (opts?.skipCompanyId && arr.length > 2) arr = arr.slice(2);
    const str = String.fromCharCode(...arr).replace(/[^A-Z0-9]/gi, "");
    if (str.length >= 6 && str.length <= 12) return str.toUpperCase();
    return null;
  } catch {
    return null;
  }
}

function extractCode(device: {
  serviceData?: Record<string, string> | null;
  manufacturerData?: string | null;
}): string | null {
  const sd = device.serviceData;
  if (sd) {
    const keys = Object.keys(sd);
    for (const key of keys) {
      if (key.toLowerCase().replace(/-/g, "") === WIPP_TOUCH_SERVICE_UUID.toLowerCase().replace(/-/g, "")) {
        const code = bytesToCode(sd[key]!);
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

/** A: broadcast Touch code over BLE (company id + payload = ASCII code). */
export async function startTouchAdvertise(code: string): Promise<{ ok: boolean; reason?: string }> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  if (!canAdvertiseBle()) {
    return { ok: false, reason: Platform.OS === "ios" ? "ios_advertise_unsupported" : "ble_native_missing" };
  }
  const adv = getAdvertiser();
  if (!adv) return { ok: false, reason: "ble_native_missing" };
  try {
    adv.setCompanyId(0xffff);
    await adv.broadcast(WIPP_TOUCH_SERVICE_UUID, codeToBytes(code), {
      connectable: false,
      includeDeviceName: false,
    });
    return { ok: true };
  } catch (err) {
    console.warn("[wipp-touch] advertise failed", err);
    return { ok: false, reason: "advertise_failed" };
  }
}

export async function stopTouchAdvertise() {
  try {
    await getAdvertiser()?.stopBroadcast();
  } catch {
    /* ignore */
  }
}

let scanning = false;

/**
 * B: scan for WIPP Touch advertisements (no Touch screen required).
 * Uses service UUID filter first; also accepts manufacturer payload matches.
 */
export async function startTouchScan(onHit: (hit: ScanHit) => void): Promise<{ ok: boolean; reason?: string }> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  const mgr = getBleManager();
  if (!mgr) return { ok: false, reason: "ble_native_missing" };
  if (scanning) return { ok: true };
  scanning = true;
  const seen = new Set<string>();

  const handle = (error: Error | null, device: Parameters<Parameters<BleMgr["startDeviceScan"]>[2]>[1]) => {
    if (error || !device) return;
    const code = extractCode(device);
    if (!code || seen.has(code)) return;
    seen.add(code);
    onHit({ code, rssi: device.rssi ?? -100 });
  };

  try {
    // Prefer filtered scan (cheaper / background-friendly on iOS when service is declared).
    mgr.startDeviceScan([WIPP_TOUCH_SERVICE_UUID], { allowDuplicates: false }, handle);
    return { ok: true };
  } catch (err) {
    try {
      // Fallback: unfiltered scan (some Android stacks omit service UUID on non-connectable ads).
      mgr.startDeviceScan(null, { allowDuplicates: false }, handle);
      return { ok: true };
    } catch (err2) {
      scanning = false;
      console.warn("[wipp-touch] scan failed", err, err2);
      return { ok: false, reason: "scan_failed" };
    }
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
