/**
 * iPhone with a Dynamic Island: during a video call, a Live Activity (island + lock screen) carries a real
 * « Me montrer / Pause caméra » button. Phones without the island keep the notification (long press).
 */
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";

type Native = {
  isSupported: () => Promise<boolean>;
  start: (name: string, shown: boolean) => Promise<boolean>;
  update: (shown: boolean) => Promise<boolean>;
  end: () => Promise<boolean>;
};

const native = (Platform.OS === "ios" ? (NativeModules.WippLiveActivity as Native | undefined) : undefined) ?? null;
let running = false;

/** Dynamic Island phones have a taller top safe area (59 pt) than notch phones (44–50 pt). */
export function hasDynamicIsland() {
  return Platform.OS === "ios" && (initialWindowMetrics?.insets.top ?? 0) >= 51;
}

export function callActivityRunning() {
  return running;
}

export async function startCallActivity(name: string) {
  if (!native || !hasDynamicIsland() || running) return false;
  try {
    if (!(await native.isSupported())) return false;
    running = await native.start(name || "WIPP", false);
    return running;
  } catch {
    running = false;
    return false;
  }
}

export function updateCallActivity(shown: boolean) {
  if (!native || !running) return;
  void native.update(shown).catch(() => undefined);
}

export function endCallActivity() {
  if (!native || !running) return;
  running = false;
  void native.end().catch(() => undefined);
}

/** The island / lock-screen button was pressed. */
export function onCallActivityToggle(cb: () => void) {
  if (!native) return () => undefined;
  const sub = new NativeEventEmitter(NativeModules.WippLiveActivity).addListener("onToggleCamera", cb);
  return () => sub.remove();
}
