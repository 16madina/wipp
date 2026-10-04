import { Platform } from "react-native";
import * as Device from "expo-device";
import { wippApi } from "../proximity/wipp-session";
import { getInstallationId } from "./install-id";

type VoipModule = {
  addEventListener: (event: string, cb: (payload: unknown) => void) => void;
  registerVoipToken: () => void;
};

let started = false;
let pendingToken: string | null = null;

/** Sends the VoIP token once a session exists (retried from registerVoipTokenNow). */
async function sendToken(token: string) {
  try {
    await wippApi("devices/push", {
      method: "POST",
      body: JSON.stringify({ token, platform: "ios", kind: "voip", installationId: await getInstallationId() }),
    });
    pendingToken = null;
  } catch {
    pendingToken = token;
  }
}

export function registerVoipTokenNow() {
  if (pendingToken) void sendToken(pendingToken);
}

/**
 * iOS only: PushKit token + incoming VoIP pushes. Native code already showed the CallKit
 * screen; here we link its UUID to the WIPP call and load the call in the app.
 */
export function startVoip() {
  if (started || Platform.OS !== "ios" || !Device.isDevice) return;
  started = true;
  let mod: VoipModule;
  try {
    mod = (require("react-native-voip-push-notification") as { default: VoipModule }).default;
  } catch {
    return; // older build without the native module
  }
  const onPush = (payload: unknown) => {
    const data = (payload ?? {}) as Record<string, unknown>;
    const uuid = String(data.uuid || "");
    const callId = String(data.inviteId || data.eventId || "");
    if (!callId) return;
    void import("../calls/callkeep").then(({ linkSystemCall }) => {
      if (uuid) linkSystemCall(uuid, callId);
      void import("./index").then(({ handleCallData }) => handleCallData(data));
    });
  };
  mod.addEventListener("register", (token) => void sendToken(String(token)));
  mod.addEventListener("notification", onPush);
  mod.addEventListener("didLoadWithEvents", (events) => {
    for (const e of (events as { name: string; data: unknown }[]) ?? []) {
      if (e.name === "RNVoipPushRemoteNotificationsRegisteredEvent") void sendToken(String(e.data));
      else if (e.name === "RNVoipPushRemoteNotificationReceivedEvent") onPush(e.data);
    }
  });
  mod.registerVoipToken();
}
