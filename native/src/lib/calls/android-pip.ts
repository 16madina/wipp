import { useEffect, useState } from "react";
import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

/** Android mini player (Picture-in-Picture) for video calls — module in android/app (CallPip.kt). */
type Native = {
  setEnabled: (on: boolean) => void;
  setCamera?: (available: boolean, shown: boolean) => void;
  isInPip: () => Promise<boolean>;
};
const mod: Native | null = Platform.OS === "android" ? (NativeModules.WippCallPip as Native | undefined) ?? null : null;

/** Android: WIPP goes into a mini player when the user leaves the app while this is on. */
export function setAndroidCallPip(on: boolean) {
  try {
    mod?.setEnabled(on);
  } catch {
    /* older app build without the module */
  }
}

/** Camera button of the mini player: hidden when not available, else « Me montrer » / « Pause caméra ». */
export function setAndroidPipCamera(available: boolean, shown: boolean) {
  try {
    mod?.setCamera?.(available, shown);
  } catch {
    /* older app build */
  }
}

/** The camera button of the mini player was pressed. */
export function onAndroidPipCameraButton(cb: () => void) {
  if (!mod) return () => undefined;
  const sub = DeviceEventEmitter.addListener("wippCallPipCamera", cb);
  return () => sub.remove();
}

/**
 * Real size of the mini player (dp). Samsung keeps the full-size layout until the mini player is touched,
 * so only the top-left corner shows: the mini player content is drawn at this size, in that corner.
 */
export function useAndroidPipSize() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!mod) return;
    const sub = DeviceEventEmitter.addListener("wippCallPipSize", (v: { width?: number; height?: number }) => {
      if (v?.width && v?.height) setSize({ width: v.width, height: v.height });
    });
    return () => sub.remove();
  }, []);
  return size;
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
