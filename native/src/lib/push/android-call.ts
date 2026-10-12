import { tr } from "../tr";
import { ensureTrLanguage } from "../language-pref";
/**
 * Android incoming calls with WIPP closed: a high-priority FCM data message wakes a
 * background task, which shows a full-screen call notification (over the lock screen)
 * with Refuser / Accepter, like a phone call.
 */
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const CALL_TASK = "WIPP_ANDROID_CALL";
// A new id: Android never changes the sound of an existing channel (the old one only had a short beep).
const CHANNEL = "wipp_calls_ring";

let ringPushAt = 0;
/** WIPP was just started by an incoming call: go straight to the call screen, no intro. */
export function launchedForCall() {
  return Platform.OS === "android" && Date.now() - ringPushAt < 60_000;
}

/** Opens the call in the app from the push itself, without waiting for the server connection and the next poll. */
async function openFromPush(data: CallData) {
  try {
    (await import("./index")).handleCallData(data);
  } catch {
    /* the app finds the call by itself a few seconds later */
  }
}

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
  ringPushAt = Date.now();
  void openFromPush(data);
  await ensureTrLanguage();
  // WIPP is on screen: its own call screen rings, a second ringing notification would overlap it.
  if (AppState.currentState === "active") return;
  const n = await notifee();
  const { AndroidCategory, AndroidImportance, AndroidVisibility } = await import("@notifee/react-native");
  const callId = String(data.inviteId || data.eventId);
  await n.createChannel({
    id: CHANNEL,
    name: tr("Appels entrants"),
    importance: AndroidImportance.HIGH,
    // The WIPP ringtone (res/raw/wipp_ring.mp3), looped: the phone rings as soon as the push arrives,
    // while WIPP is still starting.
    sound: "wipp_ring",
    vibration: true,
    vibrationPattern: [500, 1000, 500, 1000],
    visibility: AndroidVisibility.PUBLIC,
  });
  const video = data.kind === "video";
  await n.displayNotification({
    id: callId,
    title: tr("{0} vous appelle", data.callerName || tr("Quelqu’un")),
    body: video ? tr("Appel vidéo WIPP") : tr("Appel audio WIPP"),
    data,
    android: {
      channelId: CHANNEL,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      timeoutAfter: 45_000,
      sound: "wipp_ring",
      loopSound: true,
      fullScreenAction: { id: "default" },
      pressAction: { id: "default", launchActivity: "default" },
      actions: [
        { title: tr("Refuser"), pressAction: { id: "decline" } },
        { title: tr("Accepter"), pressAction: { id: "accept", launchActivity: "default" } },
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
  if (data.action === "ring") {
    await showIncomingCall(data);
    return;
  }
  await clearIncomingCall(callId);
  // The caller hung up (or it was answered elsewhere) while WIPP was not on screen: Android pauses the
  // app there, so nothing else stops the system call screen — it kept ringing for a call that no longer exists.
  try {
    const { endSystemCall } = await import("../calls/callkeep");
    endSystemCall(callId);
    const { useCallSession } = await import("../calls/session");
    const live = useCallSession.getState().session;
    if (live?.callId === callId && live.phase === "ringing") {
      useCallSession.getState().patch({ phase: data.action === "cancel" ? "missed" : "ended" });
    }
  } catch {
    /* call modules unavailable */
  }
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
    // Same background task for every FCM data push: calls, and E2E message previews.
    await onCallPush(data);
    try {
      const { onMessagePush } = await import("./android-message");
      await onMessagePush(data);
    } catch {
      /* preview module unavailable */
    }
  });
  // Registered at once (not after an asynchronous import): when a push starts WIPP without its screens,
  // notifee looks for this handler immediately and found none (« No task registered »).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: n, EventType } = require("@notifee/react-native") as typeof import("@notifee/react-native");
    {
      n.onBackgroundEvent(async ({ type, detail }) => {
        // « Raccrocher » / « Arrêter le partage » on the ongoing notification, WIPP not on screen.
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "wipp-ongoing-stop") {
          (await import("../calls/android-ongoing")).ongoingStopPressed();
          return;
        }
        const callId = String(detail.notification?.id || "");
        // « Accepter » pressed while WIPP is running but not on screen: the press arrives here, not in the
        // foreground listener — it opened WIPP without answering.
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "accept" && callId) {
          await n.cancelNotification(callId);
          const { markAnsweredBySystem } = await import("../calls/callkeep");
          markAnsweredBySystem(callId);
          const { useCallSession, acceptCurrentCall } = await import("../calls/session");
          const live = useCallSession.getState().session;
          if (live?.callId === callId && live.phase === "ringing") await acceptCurrentCall();
          else {
            const call = findCall(detail.notification?.data);
            if (call) (await import("./index")).handleCallData(call);
          }
          return;
        }
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "decline" && callId) {
          await n.cancelNotification(callId);
          await declineInBackground(callId);
        }
      });
    }
  } catch {
    /* notifee missing in an older build */
  }
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
      const { openMessageFromNotification } = await import("./android-message");
      if (await openMessageFromNotification(data)) return;
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
