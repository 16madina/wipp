import { useEffect, useState } from "react";
import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

/** Android mini player (Picture-in-Picture) for video calls — module in android/app (CallPip.kt). */
type Native = { setEnabled: (on: boolean) => void; isInPip: () => Promise<boolean> };
const mod: Native | null = Platform.OS === "android" ? (NativeModules.WippCallPip as Native | undefined) ?? null : null;

/** Android: WIPP goes into a mini player when the user leaves the app while this is on. */
export function setAndroidCallPip(on: boolean) {
  try {
    mod?.setEnabled(on);
  } catch {
    /* older app build without the module */
  }
}

/** True while WIPP is shown as the Android mini player. Always false on iPhone. */
export function useAndroidPip() {
  const [inPip, setInPip] = useState(false);
  useEffect(() => {
    if (!mod) return;
    void mod.isInPip().then(setInPip).catch(() => undefined);
    const sub = DeviceEventEmitter.addListener("wippCallPip", (v: boolean) => setInPip(Boolean(v)));
    return () => sub.remove();
  }, []);
  return inPip;
}
