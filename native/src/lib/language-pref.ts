import { Platform, Settings } from "react-native";
import * as SecureStore from "expo-secure-store";
import { setTrLanguage } from "./tr";

/** The language chosen in WIPP, remembered on the phone (it used to go back to French at every launch). */
const KEY = "wipp.language";
export type SavedLang = "fr" | "en";

export async function readLanguage(): Promise<SavedLang | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw === "fr" || raw === "en" ? raw : null;
  } catch {
    return null;
  }
}

/**
 * iPhone: the parts that run outside the screens (missed-call notice, message preview in a notification)
 * read the language from here.
 */
export function shareLanguageWithNative(lang: SavedLang) {
  if (Platform.OS !== "ios") return;
  try {
    Settings.set({ wippLang: lang });
    void SecureStore.setItemAsync("wipp-nse-lang", lang, {
      accessGroup: "group.com.wipp.app",
      keychainService: "wipp-nse",
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }).catch(() => undefined);
  } catch {
    /* those notices stay in French */
  }
}

export function saveLanguage(lang: SavedLang) {
  setTrLanguage(lang);
  shareLanguageWithNative(lang);
  // The server keeps the language next to the phone's notification address.
  if (Platform.OS !== "web") void import("./push").then((m) => m.registerDeviceToken()).catch(() => undefined);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, lang);
    else void SecureStore.setItemAsync(KEY, lang).catch(() => undefined);
  } catch {
    /* the choice still applies until the app is closed */
  }
}

let loaded: Promise<void> | null = null;
/** A push handled while WIPP is closed runs without the screens: read the saved language once, so its text follows it. */
export function ensureTrLanguage() {
  return (loaded ??= readLanguage().then((lang) => {
    if (lang) setTrLanguage(lang);
  }));
}
