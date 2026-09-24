/**
 * WIPP Touch BLE — asymmetric iOS / Android.
 *
 * A advertise (native module):
 *   iOS: service UUID + local name + GATT char (token)
 *   Android: service UUID + service data (token) in scan response
 *
 * B scan: filter service UUID; extract code from serviceData / localName / GATT read.
 * Proximity RSSI samples collected for server arbitration (Bump).
 */
import { AppState, PermissionsAndroid, Platform } from "react-native";
import {
  canNativeAdvertise,
  isWippTouchNativeAvailable,
  nativeStartAdvertise,
  nativeStartNfcShare,
  nativeStopAdvertise,
  nativeStopNfcShare,
} from "wipp-touch-native";
import {
  WIPP_TOUCH_CODE_CHAR_UUID,
  WIPP_TOUCH_SERVICE_UUID,
} from "./touch-constants";

export { WIPP_TOUCH_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID };

export type ScanHit = {
  code: string;
  rssi: number;
  rssiSamples: number[];
  detectedAt: number;
  foreground: boolean;
  platform: string;
};

type BleDevice = {
  id: string;
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
  serviceData?: Record<string, string> | null;
  manufacturerData?: string | null;
  rssi: number | null;
  connect?: () => Promise<BleDevice>;
  discoverAllServicesAndCharacteristics?: () => Promise<BleDevice>;
  readCharacteristicForService?: (s: string, c: string) => Promise<{ value?: string | null }>;
  cancelConnection?: () => Promise<void>;
  isConnected?: () => Promise<boolean>;
};

type BleMgr = {
  startDeviceScan: (
    uuids: string[] | null,
    options: object | null,
    listener: (error: Error | null, device: BleDevice | null) => void,
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

function extractCodeFromAdv(device: BleDevice): string | null {
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

async function readCodeViaGatt(device: BleDevice): Promise<string | null> {
  if (!device.connect || !device.discoverAllServicesAndCharacteristics || !device.readCharacteristicForService) {
    return null;
  }
  try {
    const connected = await device.connect();
    await connected.discoverAllServicesAndCharacteristics?.();
    const ch = await connected.readCharacteristicForService?.(
      WIPP_TOUCH_SERVICE_UUID,
      WIPP_TOUCH_CODE_CHAR_UUID,
    );
    await connected.cancelConnection?.().catch(() => undefined);
    if (!ch?.value) return null;
    return bytesToCode(ch.value);
  } catch (err) {
    try {
      await device.cancelConnection?.();
    } catch {
      /* ignore */
    }
    console.warn("[wipp-touch] gatt read", err);
    return null;
  }
}

/** A: BLE advertise + optional Android NFC HCE for same token URI. */
export async function startTouchAdvertise(code: string): Promise<{
  ok: boolean;
  reason?: string;
  includesServiceUuid?: boolean;
  nfc?: { ok: boolean; reason?: string };
}> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  if (!canAdvertiseBle()) return { ok: false, reason: "ble_native_missing" };
  try {
    const res = await nativeStartAdvertise(WIPP_TOUCH_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID, code);
    if (!res.ok) return { ok: false, reason: res.reason };
    let nfc: { ok: boolean; reason?: string } | undefined;
    if (Platform.OS === "android") {
      nfc = await nativeStartNfcShare(`https://wippapp.com/t/${code}`);
    }
    return { ok: true, includesServiceUuid: true, nfc };
  } catch (err) {
    console.warn("[wipp-touch] advertise failed", err);
    return { ok: false, reason: "advertise_failed" };
  }
}

export async function stopTouchAdvertise() {
  await nativeStopAdvertise();
  await nativeStopNfcShare();
}

let scanning = false;
const rssiBuf = new Map<string, number[]>();
const gattTried = new Set<string>();

export async function startTouchScan(
  onHit: (hit: ScanHit) => void,
): Promise<{ ok: boolean; reason?: string }> {
  const perms = await ensureBlePermissions();
  if (!perms.ok) return perms;
  const mgr = getBleManager();
  if (!mgr) return { ok: false, reason: "ble_native_missing" };
  if (scanning) return { ok: true };
  scanning = true;
  rssiBuf.clear();
  gattTried.clear();

  try {
    mgr.startDeviceScan([WIPP_TOUCH_SERVICE_UUID], { allowDuplicates: true }, (error, device) => {
      if (error || !device) return;
      void (async () => {
        let code = extractCodeFromAdv(device);
        if (!code && device.id && !gattTried.has(device.id)) {
          gattTried.add(device.id);
          code = (await readCodeViaGatt(device)) || null;
        }
        if (!code) return;
        const rssi = device.rssi ?? -100;
        const buf = rssiBuf.get(code) || [];
        buf.push(rssi);
        if (buf.length > 12) buf.shift();
        rssiBuf.set(code, buf);
        onHit({
          code,
          rssi,
          rssiSamples: [...buf],
          detectedAt: Date.now(),
          foreground: AppState.currentState === "active",
          platform: Platform.OS,
        });
      })();
    });
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
