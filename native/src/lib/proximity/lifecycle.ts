import { AppState, type AppStateStatus } from "react-native";
import { useWippStore } from "../store";
import { startPassiveTouch, stopPassiveTouch } from "./touch-passive";
import { pauseNearby, syncNearby } from "./nearby-visibility";

let appSub: { remove: () => void } | null = null;
let lastScreen = "";
let wasActive = false;

export async function syncProximityLifecycle(screenName: string, appState: AppStateStatus = AppState.currentState) {
  lastScreen = screenName;
  const onboarded = useWippStore.getState().onboarded;
  if (!onboarded || appState !== "active") {
    // Sensors and position are never used in the background.
    stopPassiveTouch();
    pauseNearby();
    wasActive = false;
    return;
  }
  if (!wasActive) {
    // Back in the foreground: am I still visible? If so, refresh my zone (never in the background).
    wasActive = true;
    void syncNearby(true);
  }
  if (screenName === "wgo-touch") {
    // The WIPP Touch screen runs its own detection.
    stopPassiveTouch();
    return;
  }
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
    pauseNearby();
    wasActive = false;
  };
}
