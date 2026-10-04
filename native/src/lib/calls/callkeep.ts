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
/** CallKit UUIDs answered before the VoIP payload linked them to a WIPP call. */
const pendingAnswers = new Set<string>();

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
        imageName: "CallKitLogo",
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
      } else if (callUUID) pendingAnswers.add(callUUID.toLowerCase());
      if (callUUID) keep?.backToForeground?.();
    });
    // App launched by answering on the lock screen: CallKit events from before JS was ready.
    (keep.addEventListener as unknown as (e: string, cb: (events: { name: string; data: { callUUID?: string } }[]) => void) => void)(
      "didLoadWithEvents",
      (events) => {
        for (const e of events ?? []) {
          if (e.name !== "RNCallKeepPerformAnswerCallAction" || !e.data?.callUUID) continue;
          const id = uuidToCall.get(e.data.callUUID);
          if (id) {
            answeredBySystem.add(id);
            onAnswer(id);
          } else pendingAnswers.add(e.data.callUUID.toLowerCase());
        }
      },
    );
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
  // Already on screen: a VoIP push opened CallKit natively for this call.
  if ([...uuidToCall.values()].includes(callId)) return;
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = (Math.random() * 16) | 0;
    return (c === "x" ? n : (n & 0x3) | 0x8).toString(16);
  });
  uuidToCall.set(uuid, callId);
  keep.displayIncomingCall(uuid, "wipp", callerName || "WIPP", "generic", video);
}

/** The CallKit screen was opened natively by a VoIP push: remember which WIPP call it is. */
/** Accepted from the Android call notification before the call was loaded. */
export function markAnsweredBySystem(callId: string) {
  answeredBySystem.add(callId);
}

/** Answered on the lock screen before the call was loaded in the app. */
export function wasAnsweredBySystem(callId: string) {
  return answeredBySystem.has(callId);
}

export function linkSystemCall(uuid: string, callId: string) {
  uuidToCall.set(uuid.toLowerCase(), callId);
  uuidToCall.set(uuid.toUpperCase(), callId);
  if (pendingAnswers.delete(uuid.toLowerCase())) answeredBySystem.add(callId);
}

/** Tells CallKit the call is really connected (system call timer, audio route). */
export function markSystemCallConnected(callId: string) {
  if (!keep?.setCurrentCallActive) return;
  for (const [uuid, id] of uuidToCall) if (id === callId) keep.setCurrentCallActive(uuid);
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
