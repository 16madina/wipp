import { Platform } from "react-native";
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

export function saveLanguage(lang: SavedLang) {
  setTrLanguage(lang);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, lang);
    else void SecureStore.setItemAsync(KEY, lang).catch(() => undefined);
  } catch {
    /* the choice still applies until the app is closed */
  }
}
