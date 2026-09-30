import { nativeStartAdvertise, nativeStopAdvertise } from "wipp-touch-native";
import { WIPP_NEARBY_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID } from "./constants";
import { getNearbyVisibility, setNearbyVisibility } from "./nearby-api";
import { useWippStore } from "../store";

let visTimer: ReturnType<typeof setTimeout> | null = null;
let advertising = false;
let paused = false;
let lastToken: string | null = null;

function clearVisTimer() {
  if (visTimer) clearTimeout(visTimer);
  visTimer = null;
}

export function scheduleNearbyExpiry(expiresAt: number | null | undefined) {
  clearVisTimer();
  if (!expiresAt) return;
  visTimer = setTimeout(() => {
    void disableNearbyVisibility();
  }, Math.max(0, expiresAt - Date.now()));
}

export async function applyNearbyMode(mode: number) {
  if (mode === 0) {
    await disableNearbyVisibility();
    return;
  }
  const res = await setNearbyVisibility(mode);
  if (!res.visible || !res.token) {
    lastToken = null;
    advertising = false;
    await nativeStopAdvertise();
    return;
  }
  lastToken = res.token;
  scheduleNearbyExpiry(res.expiresAt ?? null);
  if (!paused) await startNearbyAdvertise();
}

async function startNearbyAdvertise() {
  if (!lastToken) return;
  const res = await nativeStartAdvertise(WIPP_NEARBY_SERVICE_UUID, WIPP_TOUCH_CODE_CHAR_UUID, lastToken);
  advertising = Boolean(res.ok);
}

export async function pauseNearbyAdvertise() {
  paused = true;
  if (advertising) {
    await nativeStopAdvertise();
    advertising = false;
  }
}

export async function resumeNearbyAdvertise() {
  paused = false;
  if (lastToken) await startNearbyAdvertise();
}

export async function disableNearbyVisibility() {
  clearVisTimer();
  lastToken = null;
  advertising = false;
  paused = false;
  try {
    await setNearbyVisibility(0);
  } catch {
    /* ignore */
  }
  await nativeStopAdvertise();
  useWippStore.getState().setNearby(0);
}

export async function syncNearbyFromServer() {
  try {
    const v = await getNearbyVisibility();
    if (!v.visible) {
      lastToken = null;
      useWippStore.getState().setNearby(0);
      await nativeStopAdvertise();
    } else {
      scheduleNearbyExpiry(v.expiresAt ?? null);
    }
  } catch {
    /* offline */
  }
}
