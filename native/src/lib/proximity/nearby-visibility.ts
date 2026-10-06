/**
 * À proximité — visibility and search by approximate ZONE (no Bluetooth).
 * The position is read only while WIPP is in use and turned into a geohash cell ON THE PHONE:
 * only the cell is sent. The server is the truth for the mode and its expiry.
 */
import { Platform } from "react-native";
import { encodeGeohash } from "../geohash";
import { useWippStore } from "../store";
import type { NearbyMode } from "../types";
import {
  clearNearby,
  getNearbyState,
  refreshNearbyCell,
  requestNearby,
  searchNearbyPeople,
  setNearbyMode,
  type NearbyPerson,
  type NearbyServerMode,
  type NearbyState,
} from "./nearby-api";

export type LocFailure = "denied" | "unavailable";

let precision = 7;
let refreshMin = 5;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

const toStore = (m: NearbyServerMode): NearbyMode => (m === "15" ? 15 : m === "60" ? 60 : m === "until_off" ? -1 : 0);
const toServer = (m: NearbyMode): NearbyServerMode => (m === 15 ? "15" : m === 60 ? "60" : m === -1 ? "until_off" : "off");

/** My current zone, or why it cannot be read. Approximate accuracy is enough. */
export async function myNearbyCell(): Promise<{ ok: true; cell: string } | { ok: false; reason: LocFailure }> {
  try {
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) return { ok: false, reason: "unavailable" };
      return await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ ok: true, cell: encodeGeohash(p.coords.latitude, p.coords.longitude, precision) }),
          (e) => resolve({ ok: false, reason: e.code === 1 ? "denied" : "unavailable" }),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
        ),
      );
    }
    const Location = await import("expo-location");
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return { ok: false, reason: "denied" };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    // The exact coordinates stay here: only the cell leaves the phone.
    return { ok: true, cell: encodeGeohash(pos.coords.latitude, pos.coords.longitude, precision) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function stopTimers() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (expiryTimer) clearTimeout(expiryTimer);
  refreshTimer = null;
  expiryTimer = null;
}

function apply(st: NearbyState) {
  precision = st.precision || precision;
  refreshMin = st.refreshMin || refreshMin;
  stopTimers();
  const mode = toStore(st.mode);
  useWippStore.getState().setNearby(mode);
  useWippStore.setState({ nearbyUntil: st.visibleUntil });
  if (mode === 0) return;
  if (st.visibleUntil) {
    // 15 / 60 min: back to Invisible exactly at the end (the server already treats it so).
    expiryTimer = setTimeout(() => {
      stopTimers();
      useWippStore.getState().setNearby(0);
      useWippStore.setState({ nearbyUntil: null });
    }, Math.max(0, st.visibleUntil - Date.now()) + 500);
  }
  // Keep my zone fresh while WIPP is open (a stale zone never shows to others).
  refreshTimer = setInterval(() => void refreshNearbyNow(), refreshMin * 60_000);
}

/** App start / back to foreground / screen open: the server says if I am still visible. */
export async function syncNearby(refreshZone = true) {
  try {
    const st = await getNearbyState();
    apply(st);
    if (refreshZone && st.mode !== "off") void refreshNearbyNow();
  } catch {
    /* offline: keep what is shown */
  }
}

/** Ma visibilité. Becoming visible needs the zone; Invisible needs nothing. */
export async function chooseNearbyMode(mode: NearbyMode): Promise<{ ok: true } | { ok: false; reason: LocFailure | "server"; message?: string }> {
  try {
    if (mode === 0) {
      apply(await setNearbyMode("off", null));
      return { ok: true };
    }
    const loc = await myNearbyCell();
    if (!loc.ok) return loc;
    apply(await setNearbyMode(toServer(mode), loc.cell));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "server", message: (err as Error)?.message };
  }
}

export async function refreshNearbyNow() {
  if (useWippStore.getState().nearby === 0) return;
  const loc = await myNearbyCell();
  if (!loc.ok) return;
  await refreshNearbyCell(loc.cell).then(apply).catch(() => undefined);
}

/** Background: no position is read, the refresh loop stops (the zone simply goes stale). */
export function pauseNearby() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

/** Rechercher autour de moi — works while Invisible. */
export async function searchAround(): Promise<{ ok: true; people: NearbyPerson[] } | { ok: false; reason: LocFailure | "server"; message?: string }> {
  const loc = await myNearbyCell();
  if (!loc.ok) return loc;
  try {
    return { ok: true, people: (await searchNearbyPeople(loc.cell)).people };
  } catch (err) {
    return { ok: false, reason: "server", message: (err as Error)?.message };
  }
}

export { requestNearby };

/** Sign-out / account switch: my presence disappears from the server first. */
export async function clearNearbyPresence() {
  stopTimers();
  try {
    await clearNearby();
  } finally {
    useWippStore.getState().setNearby(0);
    useWippStore.setState({ nearbyUntil: null });
  }
}
