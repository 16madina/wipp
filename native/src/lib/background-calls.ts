import { Alert, NativeModules, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { tr } from "./tr";

/**
 * Android: calls received even when WIPP has not been opened for a long time. Some phones (Samsung
 * « deep sleep ») hold back the notifications of apps under battery optimisation; WIPP asks to run in
 * the background (module WippPower in android/app). iPhone: nothing to do (VoIP pushes).
 */
type Native = {
  isIgnoringBatteryOptimizations: () => Promise<boolean>;
  requestIgnoreBatteryOptimizations: () => Promise<boolean>;
};
const mod: Native | null = Platform.OS === "android" ? (NativeModules.WippPower as Native | undefined) ?? null : null;
const ASKED_KEY = "wipp.backgroundCallsAskedAt";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function backgroundCallsSupported() {
  return mod != null;
}

/** True when WIPP may run in the background (always true on iPhone and older app builds). */
export async function backgroundCallsAllowed() {
  if (!mod) return true;
  try {
    return await mod.isIgnoringBatteryOptimizations();
  } catch {
    return true;
  }
}

/** Opens Android's « Allow in background » dialog. */
export async function requestBackgroundCalls() {
  try {
    await mod?.requestIgnoreBatteryOptimizations();
  } catch {
    /* settings screen not available */
  }
}

/** After sign-in: ask once, then at most once a week while the answer is « Plus tard ». */
export async function maybeAskBackgroundCalls() {
  if (!mod || (await backgroundCallsAllowed())) return;
  let last = 0;
  try {
    last = Number(await SecureStore.getItemAsync(ASKED_KEY)) || 0;
  } catch {
    last = 0;
  }
  if (Date.now() - last < WEEK_MS) return;
  try {
    await SecureStore.setItemAsync(ASKED_KEY, String(Date.now()));
  } catch {
    /* ask again next time */
  }
  Alert.alert(
    tr("Recevoir tes appels"),
    tr("Pour recevoir tes appels même quand WIPP est fermé, autorise WIPP à fonctionner en arrière-plan."),
    [
      { text: tr("Plus tard"), style: "cancel" },
      { text: tr("Autoriser"), onPress: () => void requestBackgroundCalls() },
    ],
  );
}
