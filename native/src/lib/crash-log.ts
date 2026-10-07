/**
 * Small on-device log of app errors (last 20), so crashes can be diagnosed from the Mac over the cable
 * (Documents/wipp-errors.json). Message + stack + screen only — never message contents or keys.
 */
import { Platform } from "react-native";

type Entry = { at: string; screen: string; fatal: boolean; message: string; stack?: string };

let currentScreen = "?";
export function noteScreen(name: string) {
  currentScreen = name;
}

function file() {
  try {
    // New expo-file-system API: synchronous write, so it lands even if the app dies right after.
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    return new File(Paths.document, "wipp-errors.json");
  } catch {
    return null;
  }
}

export function logAppError(error: unknown, fatal: boolean, where?: string) {
  if (Platform.OS === "web") return;
  try {
    const f = file();
    if (!f) return;
    let list: Entry[] = [];
    try {
      if (f.exists) list = JSON.parse(f.textSync()) as Entry[];
    } catch {
      list = [];
    }
    const e = error as { message?: string; stack?: string } | undefined;
    list.push({
      at: new Date().toISOString(),
      screen: where ? `${currentScreen} › ${where}` : currentScreen,
      fatal,
      message: String(e?.message ?? error).slice(0, 500),
      stack: e?.stack ? String(e.stack).slice(0, 1500) : undefined,
    });
    if (!f.exists) f.create();
    f.write(JSON.stringify(list.slice(-20)));
  } catch {
    /* never let logging crash the app */
  }
}

/** Wrap React Native's global JS error handler: log first, then let RN do its usual thing. */
export function installCrashLog() {
  const g = globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const previous = eu.getGlobalHandler();
  eu.setGlobalHandler((error, fatal) => {
    logAppError(error, Boolean(fatal));
    previous(error, fatal);
  });
}
