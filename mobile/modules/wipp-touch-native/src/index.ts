export type AdvertiseResult = {
  ok: boolean;
  reason?: string;
  includesServiceUuid?: boolean;
  includesLocalName?: boolean;
  includesManufacturerData?: boolean;
  serviceUuid?: string;
  message?: string;
  errorCode?: number;
};

export type PlatformCapabilities = {
  bleAdvertise: boolean;
  bleAdvertiseServiceUuid?: boolean;
  bleAdvertiseLocalName?: boolean;
  bleAdvertiseManufacturerData?: boolean;
  nfcHce: boolean;
  nfcNote?: string;
};

type NativeShape = {
  startAdvertise: (serviceUuid: string, codeUuid: string, code: string) => Promise<AdvertiseResult>;
  stopAdvertise: () => Promise<void>;
  canAdvertise: () => boolean;
  platformCapabilities: () => PlatformCapabilities;
};

function getNative(): NativeShape | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core");
    return requireNativeModule("WippTouchNative") as NativeShape;
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
