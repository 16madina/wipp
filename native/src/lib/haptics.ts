import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

/** Réglages → Accessibilité → Retours haptiques (on by default, kept on this phone). */
const FILE = `${documentDirectory ?? ""}wipp-haptics.txt`;
let enabled = true;
void (async () => {
  try {
    if (Platform.OS !== "web" && documentDirectory) enabled = (await readAsStringAsync(FILE)).trim() !== "off";
  } catch {
    /* no file yet: on */
  }
})();

export function hapticsEnabled() {
  return enabled;
}

export function setHapticsEnabled(on: boolean) {
  enabled = on;
  if (Platform.OS !== "web" && documentDirectory) void writeAsStringAsync(FILE, on ? "on" : "off").catch(() => undefined);
}

export function haptic(kind: "tap" | "select" | "success" | "connect" | "warn" | "error" = "tap") {
  if (!enabled) return;
  if (kind === "success" || kind === "connect") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  if (kind === "warn") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  if (kind === "error") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }
  void Haptics.impactAsync(
    kind === "select" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
  );
}
