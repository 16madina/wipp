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
  getCapabilities: () => TouchCapabilities;
  startBumpDetection: (thresholdG: number, maxDurMs: number) => boolean;
  stopBumpDetection: () => void;
  uwbPrepare: () => string | null;
  uwbStart: (peerTokenB64: string) => boolean;
  uwbStop: () => void;
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
  return false; // Bluetooth path removed
}

export function canNativeAdvertise(): boolean {
  try {
    return false;
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
    const raw: string = "unsupported";
    if (raw === "on" || raw === "off" || raw === "unauthorized" || raw === "unsupported") return raw;
    return "unknown";
  } catch {
    return "unknown";
  }
}

// WIPP no longer uses Bluetooth: the old BLE / NFC entry points stay as inert stubs so legacy
// callers (Nearby) degrade cleanly instead of crashing.
export async function nativeStartAdvertise(_serviceUuid: string, _codeCharacteristicUuid: string, _code: string): Promise<AdvertiseResult> {
  return { ok: false, reason: "ble_removed" };
}

export async function nativeStopAdvertise(): Promise<void> {}

export async function nativeStartScan(_serviceUuid: string): Promise<{ ok: boolean; reason?: string }> {
  return { ok: false, reason: "ble_removed" };
}

export async function nativeStopScan(): Promise<void> {}

export async function nativeStartNfcShare(_uri: string): Promise<{ ok: boolean; reason?: string }> {
  return { ok: false, reason: "nfc_unavailable" };
}

export async function nativeStopNfcShare(): Promise<void> {}

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

// ---------- WIPP Touch (no Bluetooth): motion bump + UWB ----------

export type TouchCapabilities = {
  platform: "ios" | "android" | "web";
  motion: boolean;
  uwb: boolean;
  uwbKind: string | null;
  uwbHardware?: boolean;
};

export type BumpEvent = { at: number; peak: number; durMs: number; energy: number };

export function getTouchCapabilities(): TouchCapabilities {
  try {
    const c = getNative()?.getCapabilities?.();
    if (c) return { ...c, uwbKind: c.uwbKind ?? null };
  } catch {
    /* fall through */
  }
  return { platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web", motion: false, uwb: false, uwbKind: null };
}

// Expo native modules ARE event emitters: listen on the module itself
// (`new EventEmitter(module)` creates an unrelated emitter that never receives native events).
function emitter(): { addListener: (name: string, fn: (e: never) => void) => { remove: () => void } } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require("expo-modules-core");
  return requireNativeModule("WippTouchNative");
}

export function startBumpDetection(thresholdG: number, maxDurMs: number, onBump: (e: BumpEvent) => void): Unsub | null {
  const n = getNative();
  if (!n?.startBumpDetection) return null;
  let sub: { remove: () => void } | null = null;
  try {
    sub = emitter().addListener("onBump", (e: BumpEvent) => onBump(e));
    if (!n.startBumpDetection(thresholdG, maxDurMs)) {
      sub?.remove();
      return null;
    }
  } catch {
    sub?.remove();
    return null;
  }
  return {
    remove: () => {
      sub?.remove();
      try {
        n.stopBumpDetection();
      } catch {
        /* ignore */
      }
    },
  };
}

export function uwbPrepare(): string | null {
  try {
    return getNative()?.uwbPrepare?.() ?? null;
  } catch {
    return null;
  }
}

export function uwbStart(peerTokenB64: string, onDistance: (cm: number) => void, onState: (s: string) => void): Unsub | null {
  const n = getNative();
  if (!n?.uwbStart) return null;
  try {
    const em = emitter();
    const a = em.addListener("onUwbDistance", (e: { distanceCm: number }) => onDistance(e.distanceCm));
    const b = em.addListener("onUwbState", (e: { state: string }) => onState(e.state));
    if (!n.uwbStart(peerTokenB64)) {
      a.remove();
      b.remove();
      return null;
    }
    return { remove: () => { a.remove(); b.remove(); } };
  } catch {
    return null;
  }
}

export function uwbStop() {
  try {
    getNative()?.uwbStop?.();
  } catch {
    /* ignore */
  }
}
