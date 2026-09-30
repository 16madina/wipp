import { PermissionsAndroid, Platform } from "react-native";
import {
  canNativeAdvertise,
  isWippTouchNativeAvailable,
  nativeGetBluetoothState,
  nativeStartAdvertise,
  nativeStartNfcShare,
  nativeStartScan,
  nativeStopAdvertise,
  nativeStopNfcShare,
  nativeStopScan,
  subscribeBluetoothState,
  subscribeScanResults,
  type BluetoothState,
} from "wipp-touch-native";
import {
  CANDIDATE_LOST_MS,
  NEARBY_SCAN_BURST_MS,
  NEARBY_SCAN_IDLE_MS,
  RSSI_SAMPLE_MAX,
  TOUCH_SEARCH_MS,
  WIPP_NEARBY_SERVICE_UUID,
  WIPP_TOUCH_CODE_CHAR_UUID,
  WIPP_TOUCH_SERVICE_UUID,
} from "./constants";
import {
  calibLog,
  distinguishCandidates,
  extractTokenFromAdv,
  type CandidateSample,
  type TouchBumpConfig,
  TOUCH_BUMP_DEFAULTS,
} from "./logic";

export type { BluetoothState };

export type ProximityMode = "touch" | "nearby";
export type PermissionState = "unknown" | "granted" | "denied" | "blocked";

export type DeviceCandidate = {
  token: string;
  rssi: number;
  rssiSamples: number[];
  lastSeen: number;
};

export type ProximityEvent =
  | { type: "permission"; state: PermissionState }
  | { type: "bluetooth"; state: BluetoothState }
  | { type: "candidate"; candidate: DeviceCandidate }
  | { type: "candidate_lost"; token: string }
  | { type: "multiple"; candidates: DeviceCandidate[] }
  | { type: "timeout" }
  | { type: "failure"; reason: string }
  | { type: "shock"; at: number; magnitude: number };

type Listener = (ev: ProximityEvent) => void;

export async function ensureBlePermissions(): Promise<{ ok: boolean; reason?: string; permission: PermissionState }> {
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
    if (denied.length) return { ok: false, reason: "bluetooth_permission", permission: "denied" };
  }
  const state = await nativeGetBluetoothState();
  if (state === "off") return { ok: false, reason: "bluetooth_off", permission: "granted" };
  if (state === "unauthorized") return { ok: false, reason: "bluetooth_permission", permission: "denied" };
  if (!isWippTouchNativeAvailable()) return { ok: false, reason: "ble_native_missing", permission: "granted" };
  return { ok: true, permission: "granted" };
}

export class NativeProximityProvider {
  private listeners = new Set<Listener>();
  private cfg: TouchBumpConfig = { ...TOUCH_BUMP_DEFAULTS };
  private mode: ProximityMode | null = null;
  private candidates = new Map<string, CandidateSample>();
  private scanSub: { remove: () => void } | null = null;
  private btSub: { remove: () => void } | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lostId: ReturnType<typeof setInterval> | null = null;
  private nearbyBurstId: ReturnType<typeof setTimeout> | null = null;
  private nearbyIdle = false;
  private running = false;
  permission: PermissionState = "unknown";
  bluetooth: BluetoothState = "unknown";

  setConfig(cfg: TouchBumpConfig) {
    this.cfg = cfg;
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(ev: ProximityEvent) {
    for (const fn of this.listeners) fn(ev);
  }

  async startDiscovery(mode: ProximityMode): Promise<{ ok: boolean; reason?: string }> {
    await this.stopScanOnly();
    this.mode = mode;
    this.candidates.clear();
    const perms = await ensureBlePermissions();
    this.permission = perms.permission;
    this.emit({ type: "permission", state: perms.permission });
    this.bluetooth = await nativeGetBluetoothState();
    this.emit({ type: "bluetooth", state: this.bluetooth });
    if (!perms.ok) {
      this.emit({ type: "failure", reason: perms.reason || "permission" });
      return perms;
    }
    const uuid = mode === "touch" ? WIPP_TOUCH_SERVICE_UUID : WIPP_NEARBY_SERVICE_UUID;
    this.btSub = subscribeBluetoothState((state) => {
      this.bluetooth = state;
      this.emit({ type: "bluetooth", state });
      if (state === "off") this.emit({ type: "failure", reason: "bluetooth_off" });
    });
    this.scanSub = subscribeScanResults((hit) => this.onScanHit(hit));
    const scan = await nativeStartScan(uuid);
    if (!scan.ok) {
      this.emit({ type: "failure", reason: scan.reason || "scan_failed" });
      return { ok: false, reason: scan.reason };
    }
    this.running = true;
    this.lostId = setInterval(() => this.pruneLost(), 800);
    if (mode === "touch") {
      this.timeoutId = setTimeout(() => this.emit({ type: "timeout" }), TOUCH_SEARCH_MS);
    } else {
      this.scheduleNearbyDuty();
    }
    return { ok: true };
  }

  async startAdvertise(
    token: string,
    opts?: { nfc?: boolean; serviceUuid?: string },
  ): Promise<{ ok: boolean; reason?: string; nfc?: { ok: boolean; reason?: string } }> {
    if (!canNativeAdvertise()) return { ok: false, reason: "ble_native_missing" };
    const uuid = opts?.serviceUuid ?? (this.mode === "nearby" ? WIPP_NEARBY_SERVICE_UUID : WIPP_TOUCH_SERVICE_UUID);
    const res = await nativeStartAdvertise(uuid, WIPP_TOUCH_CODE_CHAR_UUID, token);
    if (!res.ok) return { ok: false, reason: res.reason };
    let nfc: { ok: boolean; reason?: string } | undefined;
    if (opts?.nfc !== false && this.mode !== "nearby" && Platform.OS === "android") {
      nfc = await nativeStartNfcShare(`https://wippapp.com/t/${token}`);
    }
    return { ok: true, nfc };
  }

  async stopAdvertise() {
    await nativeStopAdvertise();
    await nativeStopNfcShare();
  }

  async stopScanOnly() {
    this.running = false;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.lostId) clearInterval(this.lostId);
    if (this.nearbyBurstId) clearTimeout(this.nearbyBurstId);
    this.timeoutId = null;
    this.lostId = null;
    this.nearbyBurstId = null;
    this.scanSub?.remove();
    this.btSub?.remove();
    this.scanSub = null;
    this.btSub = null;
    this.mode = null;
    this.candidates.clear();
    await nativeStopScan();
  }

  async stopDiscovery() {
    await this.stopScanOnly();
  }

  noteShock(at: number, magnitude: number) {
    this.emit({ type: "shock", at, magnitude });
  }

  snapshot(): DeviceCandidate[] {
    return [...this.candidates.values()].map((c) => ({ ...c, rssiSamples: [...c.rssiSamples] }));
  }

  private scheduleNearbyDuty() {
    if (!this.running || this.mode !== "nearby") return;
    this.nearbyBurstId = setTimeout(() => {
      if (!this.running) return;
      this.nearbyIdle = true;
      void nativeStopScan();
      this.nearbyBurstId = setTimeout(() => {
        if (!this.running || this.mode !== "nearby") return;
        this.nearbyIdle = false;
        void nativeStartScan(WIPP_NEARBY_SERVICE_UUID);
        this.scheduleNearbyDuty();
      }, NEARBY_SCAN_IDLE_MS);
    }, NEARBY_SCAN_BURST_MS);
  }

  private onScanHit(hit: { id: string; rssi: number; localName?: string | null; serviceDataBase64?: string | null; manufacturerDataBase64?: string | null }) {
    if (!this.running || this.nearbyIdle) return;
    const token = extractTokenFromAdv(hit);
    if (!token) return;
    const rssi = hit.rssi ?? -100;
    const prev = this.candidates.get(token);
    const samples = [...(prev?.rssiSamples || []), rssi].slice(-RSSI_SAMPLE_MAX);
    const next: CandidateSample = { token, rssi, rssiSamples: samples, lastSeen: Date.now() };
    this.candidates.set(token, next);
    calibLog(this.cfg, "rssi", { rssi, samples: samples.length, count: this.candidates.size });
    const { distinction, winner, close } = distinguishCandidates([...this.candidates.values()], this.cfg);
    if (distinction === "multiple") {
      this.emit({ type: "multiple", candidates: close });
      return;
    }
    if (winner) this.emit({ type: "candidate", candidate: winner });
  }

  private pruneLost() {
    const now = Date.now();
    for (const [token, c] of this.candidates) {
      if (now - c.lastSeen > CANDIDATE_LOST_MS) {
        this.candidates.delete(token);
        this.emit({ type: "candidate_lost", token });
      }
    }
  }
}

export const proximityProvider = new NativeProximityProvider();
