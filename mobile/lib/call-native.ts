import { Platform } from "react-native";

export type IncomingCallPayload = {
  callId: string;
  roomName: string;
  kind: "audio" | "video";
  fromUsername: string;
  fromDisplayName: string;
  fromId?: string;
};

type Handlers = {
  onAnswer?: (callUUID: string) => void;
  onEnd?: (callUUID: string) => void;
};

let ready = false;
let handlers: Handlers = {};

function getCallKeep(): typeof import("react-native-callkeep") | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-callkeep");
  } catch {
    return null;
  }
}

/** Setup CallKit (iOS) / ConnectionService (Android). Safe no-op in Expo Go. */
export async function setupCallNative(next: Handlers = {}) {
  handlers = { ...handlers, ...next };
  const CK = getCallKeep();
  if (!CK?.default) return false;
  try {
    await CK.default.setup({
      ios: {
        appName: "WIPP",
        supportsVideo: true,
        maximumCallGroups: "1",
        maximumCallsPerCallGroup: "1",
      },
      android: {
        alertTitle: "Autoriser WIPP à gérer les appels",
        alertDescription:
          "WIPP a besoin d’accéder au compte téléphone pour afficher les appels entrants.",
        cancelButton: "Annuler",
        okButton: "OK",
        additionalPermissions: [],
        foregroundService: {
          channelId: "incoming_calls",
          channelName: "Appels WIPP",
          notificationTitle: "Appel WIPP en cours",
        },
      },
    });
    CK.default.addEventListener("answerCall", ({ callUUID }: { callUUID: string }) => {
      handlers.onAnswer?.(callUUID);
    });
    CK.default.addEventListener("endCall", ({ callUUID }: { callUUID: string }) => {
      handlers.onEnd?.(callUUID);
    });
    ready = true;
    return true;
  } catch (err) {
    console.warn("[wipp-callkeep] setup failed (rebuild native requis)", err);
    return false;
  }
}

export function displayIncomingCallNative(payload: IncomingCallPayload) {
  const CK = getCallKeep();
  if (!ready || !CK?.default) return false;
  try {
    CK.default.displayIncomingCall(
      payload.callId,
      payload.fromUsername,
      payload.fromDisplayName,
      "generic",
      payload.kind === "video",
    );
    return true;
  } catch (err) {
    console.warn("[wipp-callkeep] displayIncomingCall", err);
    return false;
  }
}

export function endIncomingCallNative(callUUID: string) {
  const CK = getCallKeep();
  if (!CK?.default) return;
  try {
    CK.default.endCall(callUUID);
  } catch {
    /* ignore */
  }
}

export function startOutgoingCallNative(payload: IncomingCallPayload) {
  const CK = getCallKeep();
  if (!ready || !CK?.default) return false;
  try {
    CK.default.startCall(
      payload.callId,
      payload.fromUsername,
      payload.fromDisplayName,
      "generic",
      payload.kind === "video",
    );
    if (Platform.OS === "ios") {
      CK.default.reportConnectedOutgoingCallWithUUID(payload.callId);
    }
    return true;
  } catch {
    return false;
  }
}

export function isCallNativeReady() {
  return ready;
}
