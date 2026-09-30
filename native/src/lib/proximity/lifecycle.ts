import { AppState, type AppStateStatus } from "react-native";
import { useWippStore } from "../store";
import { startTouchReceiver, stopTouchReceiver } from "./touch-receiver";
import { pauseNearbyAdvertise, resumeNearbyAdvertise } from "./nearby-visibility";
import { stopNearbyScan } from "./nearby-scan";

let appSub: { remove: () => void } | null = null;
let lastScreen = "";

export async function syncProximityLifecycle(screenName: string, appState: AppStateStatus = AppState.currentState) {
  lastScreen = screenName;
  const onboarded = useWippStore.getState().onboarded;
  if (!onboarded || appState !== "active") {
    await stopTouchReceiver();
    await stopNearbyScan();
    return;
  }
  if (screenName === "wgo-touch") {
    await stopTouchReceiver();
    await stopNearbyScan();
    await pauseNearbyAdvertise();
    return;
  }
  await resumeNearbyAdvertise();
  if (screenName === "nearby") {
    await stopTouchReceiver();
    return;
  }
  await stopNearbyScan();
  await startTouchReceiver();
}

export function bindProximityLifecycle() {
  if (appSub) return () => undefined;
  appSub = AppState.addEventListener("change", (st) => {
    void syncProximityLifecycle(lastScreen, st);
  });
  return () => {
    appSub?.remove();
    appSub = null;
    void stopTouchReceiver();
    void stopNearbyScan();
  };
}
