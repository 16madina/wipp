import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiBase } from "./api";
import { getStoredToken } from "./session";
import {
  displayIncomingCallNative,
  type IncomingCallPayload,
  setupCallNative,
} from "./call-native";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string };
    const isCall = data?.type === "incoming_call";
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: isCall
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export async function ensureCallChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("incoming_calls", {
      name: "Appels entrants",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 400, 200, 400],
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureCallChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  const auth = await getStoredToken();
  if (auth && token) {
    try {
      await fetch(`${apiBase()}/api/wipp/devices/push`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          kind: "expo",
        }),
      });
    } catch (err) {
      console.warn("[wipp-push] register failed", err);
    }
  }
  return token;
}

export function parseIncomingCall(
  data: Record<string, unknown> | undefined,
): IncomingCallPayload | null {
  if (!data || data.type !== "incoming_call") return null;
  if (typeof data.callId !== "string" || typeof data.roomName !== "string") return null;
  return {
    callId: data.callId,
    roomName: data.roomName,
    kind: data.kind === "video" ? "video" : "audio",
    fromUsername: String(data.fromUsername || "wipp"),
    fromDisplayName: String(data.fromDisplayName || data.fromUsername || "WIPP"),
    fromId: typeof data.fromId === "string" ? data.fromId : undefined,
  };
}

export async function bootstrapCallAlerts(
  onIncoming: (payload: IncomingCallPayload) => void,
) {
  await setupCallNative({
    onAnswer: (callUUID) => {
      onIncoming({
        callId: callUUID,
        roomName: "",
        kind: "audio",
        fromUsername: "",
        fromDisplayName: "WIPP",
      });
    },
  });
  await registerForPushAsync();

  const sub = Notifications.addNotificationReceivedListener((n) => {
    const payload = parseIncomingCall(n.request.content.data as Record<string, unknown>);
    if (!payload) return;
    const shown = displayIncomingCallNative(payload);
    if (!shown) onIncoming(payload);
  });

  const subResp = Notifications.addNotificationResponseReceivedListener((r) => {
    const payload = parseIncomingCall(r.notification.request.content.data as Record<string, unknown>);
    if (payload) onIncoming(payload);
  });

  return () => {
    sub.remove();
    subResp.remove();
  };
}
