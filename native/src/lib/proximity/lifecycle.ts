import { AppState, type AppStateStatus } from "react-native";
import { useWippStore } from "../store";
import { startPassiveTouch, stopPassiveTouch } from "./touch-passive";
import { pauseNearbyAdvertise, resumeNearbyAdvertise } from "./nearby-visibility";
import { stopNearbyScan } from "./nearby-scan";

let appSub: { remove: () => void } | null = null;
let lastScreen = "";

export async function syncProximityLifecycle(screenName: string, appState: AppStateStatus = AppState.currentState) {
  lastScreen = screenName;
  const onboarded = useWippStore.getState().onboarded;
  if (!onboarded || appState !== "active") {
    // Sensors never run in the background.
    stopPassiveTouch();
    await stopNearbyScan();
    return;
  }
  if (screenName === "wgo-touch") {
    // The WIPP Touch screen runs its own detection.
    stopPassiveTouch();
    await stopNearbyScan();
    await pauseNearbyAdvertise();
    return;
  }
  await resumeNearbyAdvertise();
  if (screenName !== "nearby") await stopNearbyScan();
  // WIPP open on any other screen: a bump from a phone that has WIPP Touch open still connects.
  await startPassiveTouch();
}

export function bindProximityLifecycle() {
  if (appSub) return () => undefined;
  appSub = AppState.addEventListener("change", (st) => {
    void syncProximityLifecycle(lastScreen, st);
  });
  return () => {
    appSub?.remove();
    appSub = null;
    stopPassiveTouch();
    void stopNearbyScan();
  };
}
