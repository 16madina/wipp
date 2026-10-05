import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { wippApi } from "../proximity/wipp-session";
import { isPrivateChat } from "../private-vault";
import { redactNotification } from "../notify-redact";
import { useWippStore } from "../store";
import type { Screen } from "../types";
import { getInstallationId } from "./install-id";
import { consumePendingNav, peekPendingNav, setPendingNav } from "./nav-intent";
import { screenFromPushData } from "./router";

const TOKEN_STORE = "wipp-push-token";
const seen = new Set<string>();
let lastResponseId = "";
let started = false;

function remember(id: string) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 250) {
    const first = seen.values().next().value;
    if (typeof first === "string") seen.delete(first);
  }
  return false;
}

function currentChatId() {
  const top = useWippStore.getState().stack.at(-1);
  return top?.name === "conversation" ? top.chatId : null;
}

let handlerReady = false;
function ensureHandler() {
  if (handlerReady || Platform.OS === "web") return;
  handlerReady = true;
  Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      const data = (notification.request.content.data ?? {}) as Record<string, unknown>;
      const eventId = String(data.eventId || notification.request.identifier || "");
      if (remember(`show:${eventId}`)) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      const st = useWippStore.getState();
      const type = String(data.type || "message");
      if (!st.pushMaster) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      if (type === "message" && st.notifs.messages === false) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      if ((type === "request" || type === "touch") && st.notifs.requests === false) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      const rawChat = typeof data.chatId === "string" ? data.chatId : "";
      const chatId = rawChat ? (rawChat.startsWith("srv:") ? rawChat : `srv:${rawChat}`) : "";
      const top = st.stack.at(-1)?.name;
      const viewingChat = Boolean(chatId && currentChatId() === chatId);
      const viewingTouch = type === "touch" && (top === "touch-incoming" || top === "wgo-touch");
      if (viewingChat || viewingTouch) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      const priv = Boolean(data.private) || (chatId ? isPrivateChat(chatId) : false);
      if (priv) {
        const red = redactNotification(
          {
            title: notification.request.content.title ?? "",
            body: notification.request.content.body ?? "",
            chatId,
          },
          true,
        );
        notification.request.content.title = red.title ?? "WIPP";
        notification.request.content.body = red.body ?? "Nouveau message";
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    } catch {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
  },
  });
}

export async function ensurePushChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 160, 80, 160],
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  await Notifications.setNotificationChannelAsync("requests", {
    name: "Demandes",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("calls", {
    name: "Appels",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
  await Notifications.setNotificationChannelAsync("incoming_calls", {
    name: "Appels entrants",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

function projectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

async function storedToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORE);
  } catch {
    return null;
  }
}

async function persistToken(token: string | null) {
  try {
    if (!token) await SecureStore.deleteItemAsync(TOKEN_STORE);
    else await SecureStore.setItemAsync(TOKEN_STORE, token);
  } catch {
    /* ignore */
  }
}

/** Register the Expo push token with the existing WIPP API. Never logs the token. */
export async function registerDeviceToken(): Promise<boolean> {
  try {
    ensureHandler();
    if (Platform.OS === "web") return false;
    if (!Device.isDevice) return false;
    await ensurePushChannels();
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") return false;
    // Native token first (APNs on iPhone): the server sends straight to Apple, without Expo.
    if (Platform.OS === "ios") {
      try {
        const native = await Notifications.getDevicePushTokenAsync();
        if (native?.data) {
          await wippApi("devices/push", {
            method: "POST",
            body: JSON.stringify({ token: String(native.data), platform: "ios", kind: "apns", installationId: await getInstallationId() }),
          });
        }
      } catch {
        /* keep the Expo path below */
      }
    }
    const pid = projectId();
    const tokenData = await Notifications.getExpoPushTokenAsync(pid ? { projectId: pid } : undefined);
    const token = tokenData.data;
    if (!token) return false;
    await persistToken(token);
    await wippApi("devices/push", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        kind: "expo",
        installationId: await getInstallationId(),
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterThisInstall() {
  try {
    const token = await storedToken();
    const installationId = await getInstallationId();
    await wippApi("devices/push/unregister", {
      method: "POST",
      body: JSON.stringify({ token: token || undefined, installationId }),
    });
  } catch {
    /* offline / already gone */
  } finally {
    await persistToken(null);
  }
}

export async function getPermissionStatus() {
  try {
    return await Notifications.getPermissionsAsync();
  } catch {
    return { status: "undetermined" as const, granted: false };
  }
}

/** Called from Moi → Notifications, not on the first frame. */
export async function enablePushFromSettings(): Promise<{ granted: boolean; status: string }> {
  try {
    await ensurePushChannels();
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") {
      perm = await Notifications.requestPermissionsAsync();
    }
    if (perm.status !== "granted") return { granted: false, status: perm.status };
    await registerDeviceToken();
    return { granted: true, status: perm.status };
  } catch {
    return { granted: false, status: "undetermined" };
  }
}

export async function disablePushFromSettings() {
  await unregisterThisInstall();
}

export function syncAppBadge() {
  try {
    const n = useWippStore.getState().chats.reduce((acc, c) => {
      if (c.archived || isPrivateChat(c.id)) return acc;
      return acc + Math.max(0, c.unread || 0);
    }, 0);
    void Notifications.setBadgeCountAsync(Math.min(99, n)).catch(() => {});
  } catch {
    /* ignore */
  }
}

async function applyScreen(screen: Screen, eventId?: string) {
  if (eventId && seen.has(`tap:${eventId}`)) return;
  const st = useWippStore.getState();
  if (!st.onboarded) {
    setPendingNav({ kind: "screen", screen, eventId });
    return;
  }
  if (screen.name === "conversation") {
    // Cold start from a notification: the session and the inbox are still loading. Keep trying
    // (sync + check) for a few seconds instead of silently staying on the chat list.
    const known = () => useWippStore.getState().chats.some((c) => c.id === screen.chatId);
    for (let attempt = 0; attempt < 8 && !known(); attempt++) {
      try {
        await useWippStore.getState().syncServerInbox();
      } catch {
        /* session not ready yet / offline */
      }
      if (!known()) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!known()) return;
  }
  if (eventId) remember(`tap:${eventId}`);
  const top = useWippStore.getState().stack.at(-1);
  if (screen.name === "conversation" && top?.name === "conversation" && top.chatId === screen.chatId) return;
  useWippStore.getState().push(screen);
}

export async function enqueueUrl(url: string) {
  if (!url || url.startsWith("exp+")) return;
  // Only WIPP links are deep links (on web the page's own address arrives here too).
  if (!/^wipp:\/\//i.test(url) && !/^https:\/\/(www\.)?wippapp\.com\//i.test(url)) return;
  const st = useWippStore.getState();
  if (!st.onboarded) {
    setPendingNav({ kind: "url", url });
    return;
  }
  const { openWippLink } = await import("../deep-links");
  await openWippLink(url);
}

export async function flushPendingNav() {
  if (!useWippStore.getState().onboarded) return;
  const pending = await peekPendingNav();
  if (!pending) return;
  if (pending.kind === "url") {
    await consumePendingNav();
    await enqueueUrl(pending.url);
    return;
  }
  await consumePendingNav();
  await applyScreen(pending.screen, pending.eventId);
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const id = `${response.notification.request.identifier}:${String(response.notification.request.content.data?.eventId || "")}`;
  if (id === lastResponseId) return;
  lastResponseId = id;
  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  const screen = screenFromPushData(data);
  if (screen) await applyScreen(screen, typeof data.eventId === "string" ? data.eventId : undefined);
}

export async function captureLaunchIntents() {
  try {
    const url = await Linking.getInitialURL();
    if (url) await enqueueUrl(url);
  } catch {
    /* ignore */
  }
  try {
    const resp = await Notifications.getLastNotificationResponseAsync();
    if (resp) await handleResponse(resp);
  } catch {
    /* ignore */
  }
}

export async function onSessionReady() {
  await flushPendingNav();
  try {
    let perm = await Notifications.getPermissionsAsync();
    // First session on this phone: ask right away (iOS popup, Android 13+ popup), like any messaging app.
    if (perm.status === "undetermined" && Device.isDevice) {
      await ensurePushChannels();
      perm = await Notifications.requestPermissionsAsync();
      if (perm.status === "granted") useWippStore.getState().setPushMaster(true);
    }
    if (perm.status === "granted") {
      const prefs = useWippStore.getState();
      if (prefs.pushMaster) await registerDeviceToken();
      void import("./voip").then(({ registerVoipTokenNow }) => registerVoipTokenNow());
    }
  } catch {
    /* ignore */
  }
  syncAppBadge();
}

export function bootstrapPush() {
  if (started) return () => {};
  started = true;
  ensureHandler();
  void captureLaunchIntents();
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    void handleResponse(r);
  });
  const received = Notifications.addNotificationReceivedListener((notification) => {
    handleCallData((notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  void import("./voip").then(({ startVoip }) => startVoip());
  void import("./android-call").then(({ startAndroidCalls }) =>
    startAndroidCalls(async (token) => {
      await wippApi("devices/push", {
        method: "POST",
        body: JSON.stringify({ token, platform: "android", kind: "fcm", installationId: await getInstallationId() }),
      });
    }),
  );
  const link = Linking.addEventListener("url", (e) => {
    void enqueueUrl(e.url);
  });
  return () => {
    sub.remove();
    received.remove();
    link.remove();
    started = false;
  };
}

/** Call push (Expo notification or iOS VoIP payload): ring, or stop ringing. */
export function handleCallData(data: Record<string, unknown>) {
  {
    const type = String(data.type || "");
    if (type !== "call" && type !== "incoming_call") return;
    const callId = String(data.eventId || data.inviteId || "");
    if (!callId) return;
    void import("../calls/session").then(({ openCall, useCallSession }) => {
      const action = String(data.action || "");
      const live = useCallSession.getState().session;
      if (action === "cancel" || action === "reject" || action === "end") {
        void import("./android-call").then(({ clearIncomingCall }) => clearIncomingCall(callId));
        if (live?.callId === callId && live.phase !== "connected") {
          useCallSession.getState().patch({
            phase: action === "reject" ? "declined" : "ended",
            note: action === "reject" ? "Appel refusé." : action === "cancel" ? "Appel annulé." : "Appel terminé.",
            url: undefined,
            token: undefined,
          });
        }
        return;
      }
      if (action === "accept") return;
      if (live?.callId === callId) return;
      void openCall({
        userId: "call",
        kind: data.kind === "video" ? "video" : "audio",
        dir: "in",
        callId,
        group: data.group === true || data.group === "true",
        chatId: typeof data.chatId === "string" ? data.chatId : undefined,
      });
    });
  }
}

export function debugPushStatus() {
  if (!__DEV__) return null;
  return {
    projectId: projectId() ?? null,
    platform: Platform.OS,
  };
}
