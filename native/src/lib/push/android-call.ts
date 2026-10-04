/**
 * Android incoming calls with WIPP closed: a high-priority FCM data message wakes a
 * background task, which shows a full-screen call notification (over the lock screen)
 * with Refuser / Accepter, like a phone call.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const CALL_TASK = "WIPP_ANDROID_CALL";
const CHANNEL = "wipp_calls_fullscreen";

type CallData = Record<string, string>;

/** Finds the WIPP call payload wherever Expo put the FCM data. */
function findCall(raw: unknown, depth = 0): CallData | null {
  if (!raw || depth > 4) return null;
  if (typeof raw === "string") {
    try {
      return findCall(JSON.parse(raw), depth + 1);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.type === "call" && (o.inviteId || o.eventId)) return o as CallData;
  for (const v of Object.values(o)) {
    const hit = findCall(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

async function notifee() {
  return (await import("@notifee/react-native")).default;
}

export async function showIncomingCall(data: CallData) {
  const n = await notifee();
  const { AndroidCategory, AndroidImportance, AndroidVisibility } = await import("@notifee/react-native");
  const callId = String(data.inviteId || data.eventId);
  await n.createChannel({
    id: CHANNEL,
    name: "Appels entrants",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    visibility: AndroidVisibility.PUBLIC,
  });
  const video = data.kind === "video";
  await n.displayNotification({
    id: callId,
    title: `${data.callerName || "Quelqu’un"} vous appelle`,
    body: video ? "Appel vidéo WIPP" : "Appel audio WIPP",
    data,
    android: {
      channelId: CHANNEL,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      timeoutAfter: 45_000,
      loopSound: true,
      fullScreenAction: { id: "default" },
      pressAction: { id: "default", launchActivity: "default" },
      actions: [
        { title: "Refuser", pressAction: { id: "decline" } },
        { title: "Accepter", pressAction: { id: "accept", launchActivity: "default" } },
      ],
    },
  });
}

export async function clearIncomingCall(callId: string) {
  if (Platform.OS !== "android") return;
  try {
    await (await notifee()).cancelNotification(callId);
  } catch {
    /* module missing in older builds */
  }
}

async function onCallPush(raw: unknown) {
  const data = findCall(raw);
  if (!data) return;
  const callId = String(data.inviteId || data.eventId);
  if (data.action === "ring") await showIncomingCall(data);
  else await clearIncomingCall(callId);
}

/** Refuser pressed without opening the app. */
async function declineInBackground(callId: string) {
  try {
    const { answerCall } = await import("../calls/livekit-client");
    await answerCall(callId, false);
  } catch {
    /* the call expires by itself */
  }
}

// Must be defined at startup (module scope) so it also runs with WIPP closed.
if (Platform.OS === "android") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require("expo-task-manager") as typeof import("expo-task-manager");
  TaskManager.defineTask<unknown>(CALL_TASK, async ({ data }) => {
    await onCallPush(data);
  });
  void import("@notifee/react-native")
    .then(({ default: n, EventType }) => {
      n.onBackgroundEvent(async ({ type, detail }) => {
        const callId = String(detail.notification?.id || "");
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "decline" && callId) {
          await n.cancelNotification(callId);
          await declineInBackground(callId);
        }
      });
    })
    .catch(() => undefined);
}

/** Registers the FCM token + background task, and handles a call tapped from the notification. */
export async function startAndroidCalls(register: (token: string) => Promise<void>) {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.registerTaskAsync(CALL_TASK);
  } catch {
    /* expo-task-manager missing in an older build */
  }
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    if (t?.data) await register(String(t.data));
  } catch {
    /* no Google Play services */
  }
  try {
    const { default: n, EventType } = await import("@notifee/react-native");
    const open = async (pressId: string | undefined, data: unknown, id?: string) => {
      const call = findCall(data);
      if (!call) return;
      const callId = String(call.inviteId || call.eventId);
      if (id) await n.cancelNotification(id);
      if (pressId === "decline") {
        await declineInBackground(callId);
        return;
      }
      if (pressId === "accept") {
        const { markAnsweredBySystem } = await import("../calls/callkeep");
        markAnsweredBySystem(callId);
      }
      const { handleCallData } = await import("./index");
      handleCallData(call);
    };
    const initial = await n.getInitialNotification();
    if (initial) await open(initial.pressAction?.id, initial.notification.data, initial.notification.id);
    n.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
        void open(detail.pressAction?.id, detail.notification?.data, detail.notification?.id);
      }
    });
  } catch {
    /* notifee missing in an older build */
  }
}
