import { tr } from "../tr";
import * as Device from "expo-device";
import { AppState, Platform, Settings } from "react-native";

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


let keep: Keep | null = null;
const uuidToCall = new Map<string, string>();
const answeredBySystem = new Set<string>();
/** CallKit UUIDs answered before the VoIP payload linked them to a WIPP call. */
const pendingAnswers = new Set<string>();
/** CallKit UUIDs ended (declined, or closed by iOS) before they were linked to a WIPP call. */
const pendingEnds = new Set<string>();
/** Every CallKit UUID seen for a WIPP call (kept after the system screen closes), to clear its « Appel manqué » notice. */
const uuidsByCall = new Map<string, Set<string>>();
function rememberUuid(callId: string, uuid: string) {
  const set = uuidsByCall.get(callId) ?? new Set<string>();
  set.add(uuid.toLowerCase());
  uuidsByCall.set(callId, set);
}

/**
 * The call was really answered (in the app or on the iPhone screen): remove the « Appel manqué » notice that iOS
 * schedules for every ringing call (shown when the system screen closes without a CallKit answer).
 */
export function clearMissedNotice(_callId?: string) {
  // Every « Appel manqué » notice of the last 2 minutes, shown or still scheduled: the call was answered.
  // (Looking it up by the iPhone call id missed it when the app had not linked that id yet.)
  const clear = () =>
    void import("expo-notifications")
      .then(async (N) => {
        const shown = await N.getPresentedNotificationsAsync().catch(() => []);
        const recent = Date.now() - 120_000;
        for (const n of shown) {
          const id = n.request.identifier;
          if (id.startsWith("missed-") && n.date >= recent) await N.dismissNotificationAsync(id).catch(() => undefined);
        }
        const scheduled = await N.getAllScheduledNotificationsAsync().catch(() => []);
        for (const r of scheduled) if (r.identifier.startsWith("missed-")) await N.cancelScheduledNotificationAsync(r.identifier).catch(() => undefined);
      })
      .catch(() => undefined);
  clear();
  // iOS may post it a moment after the answer (when its call screen closes): clear again.
  setTimeout(clear, 1500);
  setTimeout(clear, 4000);
}
let endHandler: ((callId: string) => void) | null = null;

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
  endHandler = onEnd;
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
        alertTitle: tr("Appels WIPP"),
        alertDescription: tr("WIPP a besoin d’accéder aux appels pour les afficher sur l’écran verrouillé."),
        cancelButton: tr("Annuler"),
        okButton: "OK",
        selfManaged: true,
        additionalPermissions: [],
        foregroundService: {
          channelId: "incoming_calls",
          channelName: tr("Appels WIPP"),
          notificationTitle: tr("Appel WIPP"),
        },
      },
    });
    type StartData = { handle?: string; video?: boolean; callUUID?: string };
    let lastStart = "";
    const start = (data: StartData) => {
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
            start(e.data as StartData);
            continue;
          }
          if (e.name === "RNCallKeepPerformEndCallAction" && e.data?.callUUID) {
            const ended = uuidToCall.get(e.data.callUUID);
            if (ended) onEnd(ended);
            else pendingEnds.add(e.data.callUUID.toLowerCase());
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
    (keep.addEventListener as unknown as (e: string, cb: (data: StartData) => void) => void)("didReceiveStartCallAction", (data) => start(data));
    // WIPP fully closed, opened by a tap in Recents: the native side kept the request (the call library is
    // not ready that early). React Native reads the phone's settings once at launch, so it is in there.
    try {
      const kept = Settings.get("wippRecentsCallback") as { handle?: string; video?: boolean; at?: number } | undefined;
      if (kept?.handle && kept.at && Date.now() - kept.at * 1000 < 60_000) {
        Settings.set({ wippRecentsCallback: { handle: "", video: false, at: 0 } });
        start({ handle: kept.handle, video: Boolean(kept.video) });
      }
    } catch {
      /* no stored request */
    }
    // WIPP fully closed, opened by a tap in Recents: the request was stored before any listener existed.
    void keep.getInitialEvents?.().then((events) => {
      for (const e of events ?? []) if (e.name === "RNCallKeepDidReceiveStartCallAction") start(e.data as StartData);
    }).catch(() => undefined);
    keep.addEventListener("endCall", ({ callUUID }) => {
      const id = callUUID ? uuidToCall.get(callUUID) : undefined;
      if (id) onEnd(id);
      // WIPP was still starting (opened by the call): end it on the server as soon as we know which call it is,
      // or the caller keeps ringing for a minute.
      else if (callUUID) pendingEnds.add(callUUID.toLowerCase());
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
  rememberUuid(callId, uuid);
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
  rememberUuid(callId, uuid);
  if (pendingAnswers.delete(uuid.toLowerCase())) answeredBySystem.add(callId);
  // Ended on the iPhone screen while WIPP was starting (and not answered): tell the server now.
  if (pendingEnds.delete(uuid.toLowerCase()) && !answeredBySystem.has(callId)) endHandler?.(callId);
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
