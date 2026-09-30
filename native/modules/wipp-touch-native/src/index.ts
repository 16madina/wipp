import { NativeModule, Platform } from "react-native";

export type AdvertiseResult = {
  ok: boolean;
  reason?: string;
  includesServiceUuid?: boolean;
  includesLocalName?: boolean;
  includesServiceData?: boolean;
  serviceUuid?: string;
};

export type PlatformCapabilities = {
  bleAdvertise: boolean;
  bleScan: boolean;
  nfcHce: boolean;
  nfcNote?: string;
};

export type ScanResultPayload = {
  id: string;
  rssi: number;
  localName?: string | null;
  serviceDataBase64?: string | null;
  manufacturerDataBase64?: string | null;
};

export type BluetoothState = "unknown" | "off" | "on" | "unauthorized" | "unsupported";

type NativeShape = {
  startAdvertise: (serviceUuid: string, codeUuid: string, code: string) => Promise<AdvertiseResult>;
  stopAdvertise: () => Promise<void>;
  startScan: (serviceUuid: string) => Promise<{ ok: boolean; reason?: string }>;
  stopScan: () => Promise<void>;
  startNfcShare: (uri: string) => Promise<{ ok: boolean; reason?: string }>;
  stopNfcShare: () => Promise<void>;
  canAdvertise: () => boolean;
  platformCapabilities: () => PlatformCapabilities;
  getBluetoothState: () => Promise<string>;
  addListener: (event: string) => void;
  removeListeners: (count: number) => void;
};

function getNative(): (NativeShape & NativeModule) | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core");
    return requireNativeModule("WippTouchNative") as NativeShape & NativeModule;
  } catch {
    return null;
  }
}

export function isWippTouchNativeAvailable(): boolean {
  return getNative() != null;
}

export function canNativeAdvertise(): boolean {
  try {
    return Boolean(getNative()?.canAdvertise?.());
  } catch {
    return false;
  }
}

export function getNativeCapabilities(): PlatformCapabilities | null {
  try {
    return getNative()?.platformCapabilities?.() ?? null;
  } catch {
    return null;
  }
}

export async function nativeGetBluetoothState(): Promise<BluetoothState> {
  try {
    const raw = (await getNative()?.getBluetoothState()) ?? "unknown";
    if (raw === "on" || raw === "off" || raw === "unauthorized" || raw === "unsupported") return raw;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function nativeStartAdvertise(
  serviceUuid: string,
  codeCharacteristicUuid: string,
  code: string,
): Promise<AdvertiseResult> {
  const n = getNative();
  if (!n) return { ok: false, reason: "ble_native_missing" };
  return n.startAdvertise(serviceUuid, codeCharacteristicUuid, code);
}

export async function nativeStopAdvertise(): Promise<void> {
  try {
    await getNative()?.stopAdvertise();
  } catch {
    /* ignore */
  }
}

export async function nativeStartScan(serviceUuid: string): Promise<{ ok: boolean; reason?: string }> {
  const n = getNative();
  if (!n) return { ok: false, reason: "ble_native_missing" };
  return n.startScan(serviceUuid);
}

export async function nativeStopScan(): Promise<void> {
  try {
    await getNative()?.stopScan();
  } catch {
    /* ignore */
  }
}

export async function nativeStartNfcShare(uri: string): Promise<{ ok: boolean; reason?: string }> {
  const n = getNative();
  if (!n?.startNfcShare) return { ok: false, reason: "nfc_unavailable" };
  return n.startNfcShare(uri);
}

export async function nativeStopNfcShare(): Promise<void> {
  try {
    await getNative()?.stopNfcShare?.();
  } catch {
    /* ignore */
  }
}

type Unsub = { remove: () => void };

export function subscribeScanResults(onHit: (hit: ScanResultPayload) => void): Unsub {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventEmitter, requireNativeModule } = require("expo-modules-core");
    const mod = requireNativeModule("WippTouchNative");
    const emitter = new EventEmitter(mod);
    const sub = emitter.addListener("onScanResult", (payload: ScanResultPayload) => onHit(payload));
    return { remove: () => sub.remove() };
  } catch {
    return { remove: () => undefined };
  }
}

export function subscribeBluetoothState(onState: (state: BluetoothState) => void): Unsub {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventEmitter, requireNativeModule } = require("expo-modules-core");
    const mod = requireNativeModule("WippTouchNative");
    const emitter = new EventEmitter(mod);
    const sub = emitter.addListener("onBluetoothState", (payload: { state?: string }) => {
      const raw = payload?.state ?? "unknown";
      if (raw === "on" || raw === "off" || raw === "unauthorized" || raw === "unsupported") onState(raw);
      else onState("unknown");
    });
    return { remove: () => sub.remove() };
  } catch {
    return { remove: () => undefined };
  }
}
