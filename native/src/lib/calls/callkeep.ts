import * as Device from "expo-device";
import { AppState, Platform } from "react-native";

type Keep = {
  setup: (options: Record<string, unknown>) => Promise<boolean>;
  displayIncomingCall: (uuid: string, handle: string, localizedCallerName?: string, handleType?: string, hasVideo?: boolean) => void;
  endCall: (uuid: string) => void;
  addEventListener: (event: string, handler: (data: { callUUID?: string }) => void) => void;
  removeEventListener: (event: string) => void;
  setCurrentCallActive?: (uuid: string) => void;
  backToForeground?: () => void;
};

let keep: Keep | null = null;
const uuidToCall = new Map<string, string>();
const answeredBySystem = new Set<string>();

export function callKeepAvailable() {
  return keep != null && Platform.OS !== "web";
}

export async function setupCallKeep(onAnswer: (callId: string) => void, onEnd: (callId: string) => void) {
  // CallKit does not run on the iOS simulator: it reports every call as ended,
  // which the app turned into an automatic "decline". Use the in-app screen there.
  if (Platform.OS === "web" || keep || !Device.isDevice) return;
  try {
    const mod = require("react-native-callkeep") as { default: Keep };
    keep = mod.default;
    await keep.setup({
      ios: {
        appName: "WIPP",
        supportsVideo: true,
        maximumCallGroups: "1",
        maximumCallsPerCallGroup: "1",
      },
      android: {
        alertTitle: "Appels WIPP",
        alertDescription: "WIPP a besoin d’accéder aux appels pour les afficher sur l’écran verrouillé.",
        cancelButton: "Annuler",
        okButton: "OK",
        selfManaged: true,
        additionalPermissions: [],
        foregroundService: {
          channelId: "incoming_calls",
          channelName: "Appels WIPP",
          notificationTitle: "Appel WIPP",
        },
      },
    });
    keep.addEventListener("answerCall", ({ callUUID }) => {
      const id = callUUID ? uuidToCall.get(callUUID) : undefined;
      if (id) {
        answeredBySystem.add(id);
        onAnswer(id);
      }
      if (callUUID) keep?.backToForeground?.();
    });
    keep.addEventListener("endCall", ({ callUUID }) => {
      const id = callUUID ? uuidToCall.get(callUUID) : undefined;
      if (id) onEnd(id);
    });
  } catch {
    keep = null;
  }
}

export function showSystemIncoming(callId: string, video: boolean, callerName?: string) {
  // App open: the in-app screen rings. CallKit only when WIPP is in the background.
  if (!keep || AppState.currentState === "active") return;
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = (Math.random() * 16) | 0;
    return (c === "x" ? n : (n & 0x3) | 0x8).toString(16);
  });
  uuidToCall.set(uuid, callId);
  keep.displayIncomingCall(uuid, "wipp", callerName || "WIPP", "generic", video);
}

export function endSystemCall(callId: string) {
  if (!keep) return;
  for (const [uuid, id] of uuidToCall) {
    if (id === callId) {
      // Forget it first, so the "endCall" event does not hang up our own call.
      uuidToCall.delete(uuid);
      keep.endCall(uuid);
    }
  }
  answeredBySystem.delete(callId);
}

/** Answered with the in-app button: stop the system ringing (not a call CallKit already answered). */
export function dismissSystemRinging(callId: string) {
  if (!keep || answeredBySystem.has(callId)) return;
  endSystemCall(callId);
}
