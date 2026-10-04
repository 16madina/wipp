import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

/** "Son des animations" on/off, remembered on the phone (on by default). */
let on = true;
const listeners = new Set<() => void>();
const FILE = `${documentDirectory ?? ""}wipp-anim-sound.txt`;

void (async () => {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem("wipp-anim-sound") : await readAsStringAsync(FILE);
    if (raw === "off") {
      on = false;
      listeners.forEach((l) => l());
    }
  } catch {
    /* default: on */
  }
})();

export function animSoundOn() {
  return on;
}

export function setAnimSound(next: boolean) {
  on = next;
  listeners.forEach((l) => l());
  const v = next ? "on" : "off";
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem("wipp-anim-sound", v);
    else void writeAsStringAsync(FILE, v).catch(() => undefined);
  } catch {
    /* preference only */
  }
}

export function useAnimSound() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => on,
  );
}
