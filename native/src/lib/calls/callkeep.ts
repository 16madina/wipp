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
  getInitialEvents?: () => Promise<{ name: string; data: Record<string, unknown> }[]>;
};

/** Short notes about the « call back from Recents » path, kept in the phone's journal while it is being tuned. */
function note(text: string) {
  void import("../crash-log").then(({ logAppError }) => logAppError(new Error(`rappel: ${text}`), false, "récents"));
}

let keep: Keep | null = null;
const uuidToCall = new Map<string, string>();
const answeredBySystem = new Set<string>();
/** CallKit UUIDs answered before the VoIP payload linked them to a WIPP call. */
const pendingAnswers = new Set<string>();

export function callKeepAvailable() {
  return keep != null && Platform.OS !== "web";
}

/** `onStart`: a WIPP call was touched in the iPhone's Recents — call that person back (`handle` is « @username »). */
export async function setupCallKeep(
  onAnswer: (callId: string) => void,
  onEnd: (callId: string) => void,
  onStart?: (handle: string, video: boolean) => void,
) {
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
        // Official WIPP ringtone (bundled CAF, < 30 s), also used when a VoIP push wakes the app.
        ringtoneSound: "wipp_ring.caf",
        supportsVideo: true,
        // WIPP calls carry a name, not a phone number: say so, and list them in the iPhone Recents.
        handleType: "generic",
        includesCallsInRecents: true,
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
    type StartData = { handle?: string; video?: boolean; callUUID?: string };
    let lastStart = "";
    const start = (data: StartData, via: string) => {
      note(`reçu (${via}) handle=${data?.handle ?? "?"} video=${String(data?.video)} uuid=${data?.callUUID ?? "-"}`);
      // Only a tap in Recents (no callUUID): an outgoing call WIPP started itself is not ours to restart.
      if (!data?.handle || data.callUUID) return;
      // The same tap can arrive by two roads (live event and « events from before launch »).
      const key = `${data.handle}|${Math.floor(Date.now() / 15_000)}`;
      if (key === lastStart) return;
      lastStart = key;
      onStart?.(data.handle, Boolean(data.video));
    };
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
          // WIPP was closed and opened by a tap in Recents.
          if (e.name === "RNCallKeepDidReceiveStartCallAction") {
            start(e.data as StartData, "démarrage");
            continue;
          }
          if (e.name !== "RNCallKeepPerformAnswerCallAction" || !e.data?.callUUID) continue;
          const id = uuidToCall.get(e.data.callUUID);
          if (id) {
            answeredBySystem.add(id);
            onAnswer(id);
          } else pendingAnswers.add(e.data.callUUID.toLowerCase());
        }
      },
    );
    // Registered after « didLoadWithEvents », so a tap made while WIPP was closed is not lost.
    (keep.addEventListener as unknown as (e: string, cb: (data: StartData) => void) => void)("didReceiveStartCallAction", (data) => start(data, "direct"));
    // WIPP fully closed, opened by a tap in Recents: the request was stored before any listener existed.
    void keep.getInitialEvents?.().then((events) => {
      note(`événements initiaux: ${(events ?? []).map((e) => e.name.replace("RNCallKeep", "")).join(",") || "aucun"}`);
      for (const e of events ?? []) if (e.name === "RNCallKeepDidReceiveStartCallAction") start(e.data as StartData, "initial");
    }).catch(() => undefined);
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
  // The name of the caller is the handle, so each person gets a separate line in Recents.
  keep.displayIncomingCall(uuid, callerName || "WIPP", callerName || "WIPP", "generic", video);
}

/** True when the iPhone call screen (CallKit) is already showing this call — it plays the ringtone itself. */
export function isSystemRinging(callId: string) {
  return [...uuidToCall.values()].includes(callId);
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
