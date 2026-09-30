/**
 * Protection d'écran native. Remplace le ScreenProtectionProvider web.
 *
 * Android : FLAG_SECURE via expo-screen-capture — masque aussi l'aperçu
 * du sélecteur d'applications quand actif.
 * iOS : empêche l'enregistrement d'écran lorsque l'API le permet ;
 * les captures d'écran restent possibles (limite plateforme).
 */
import { Platform } from "react-native";

export type ProtectMode = "none" | "sensitive" | "view_once" | "private_chat" | "story" | "profile_photo";

const RANK: Record<ProtectMode, number> = {
  none: 0,
  sensitive: 1,
  profile_photo: 2,
  story: 3,
  private_chat: 4,
  view_once: 5,
};

let stack: ProtectMode[] = [];
const listeners = new Set<(mode: ProtectMode) => void>();
let applied: ProtectMode = "none";

export function currentProtectMode(): ProtectMode {
  if (!stack.length) return "none";
  return stack.reduce((best, m) => (RANK[m] > RANK[best] ? m : best), "none" as ProtectMode);
}

export function subscribeProtect(fn: (mode: ProtectMode) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  const mode = currentProtectMode();
  listeners.forEach((fn) => fn(mode));
  void applyNative(mode);
}

async function applyNative(mode: ProtectMode) {
  if (mode === applied) return;
  applied = mode;
  if (Platform.OS === "web") return;
  try {
    const ScreenCapture = await import("expo-screen-capture");
    if (mode === "none") {
      await ScreenCapture.allowScreenCaptureAsync("wipp-protect");
    } else {
      await ScreenCapture.preventScreenCaptureAsync("wipp-protect");
    }
  } catch {
    /* module absent / web */
  }
}

export function pushProtect(mode: ProtectMode) {
  stack.push(mode);
  emit();
  return () => popProtect(mode);
}

export function popProtect(mode?: ProtectMode) {
  if (mode) {
    const i = stack.lastIndexOf(mode);
    if (i >= 0) stack.splice(i, 1);
  } else {
    stack.pop();
  }
  emit();
}

export function resetProtect() {
  stack = [];
  emit();
}

/** iOS ne garantit pas l'impossibilité de capture. */
export function screenshotGuarantee(): "android-flag-secure" | "ios-best-effort" | "none" {
  if (Platform.OS === "android") return "android-flag-secure";
  if (Platform.OS === "ios") return "ios-best-effort";
  return "none";
}
