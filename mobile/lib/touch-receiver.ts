/**
 * Passive WIPP Touch receiver — BLE scan without opening Touch UI.
 * One notification per invite, only after proximity gate.
 */
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { acceptTouchCode, rejectTouchCode, resolveTouchCode } from "./touch-api";
import { startTouchScan, stopTouchScan } from "./touch-ble";
import {
  clearTouchProximityState,
  enableTouchCalibration,
  markTouchNotified,
  setTouchRssiThreshold,
} from "./touch-proximity";
import { getStoredToken } from "./session";

const handled = new Set<string>();

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("wipp_touch", {
      name: "WIPP Touch",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      sound: "default",
    });
  }
}

export async function presentTouchInviteNotification(input: {
  code: string;
  fromName: string;
}) {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "WIPP",
      body: `${input.fromName} souhaite partager son WIPP avec toi`,
      data: { type: "wipp_touch", code: input.code },
      categoryIdentifier: "wipp_touch",
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "wipp_touch" } : {}),
    },
    trigger: null,
  });
}

export async function registerTouchNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("wipp_touch", [
    {
      identifier: "accept",
      buttonTitle: "Accepter",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "reject",
      buttonTitle: "Refuser",
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}

async function onProximityHit(code: string) {
  if (handled.has(code)) return;
  const token = await getStoredToken();
  if (!token) return;
  // Mark early to guarantee at most one notif even if resolve is slow.
  handled.add(code);
  markTouchNotified(code);
  try {
    const { invite } = await resolveTouchCode(code);
    await presentTouchInviteNotification({
      code: invite.code,
      fromName: invite.sender.firstName || invite.sender.displayName,
    });
  } catch {
    // expired / self / rate-limited — allow a later different code
    handled.delete(code);
  }
}

/** Start passive BLE listen (call after login). No Touch screen. */
export async function startTouchReceiver(): Promise<{ ok: boolean; reason?: string }> {
  const token = await getStoredToken();
  if (!token) return { ok: false, reason: "not_logged_in" };
  const extra = Constants.expoConfig?.extra as
    | { wippTouchRssiThreshold?: number; wippTouchCalibration?: boolean }
    | undefined;
  if (typeof extra?.wippTouchRssiThreshold === "number") {
    setTouchRssiThreshold(extra.wippTouchRssiThreshold);
  }
  if (extra?.wippTouchCalibration || process.env.EXPO_PUBLIC_WIPP_TOUCH_CALIBRATION === "1") {
    enableTouchCalibration(true);
  }
  await registerTouchNotificationCategories();
  clearTouchProximityState();
  return startTouchScan((hit) => {
    void onProximityHit(hit.code);
  });
}

export function stopTouchReceiver() {
  stopTouchScan();
}

export function bindTouchNotificationResponses() {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      type?: string;
      code?: string;
    };
    if (data?.type !== "wipp_touch" || !data.code) return;
    const action = response.actionIdentifier;
    void (async () => {
      try {
        if (action === "accept" || action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          await acceptTouchCode(data.code!);
        } else if (action === "reject") {
          await rejectTouchCode(data.code!);
        }
      } catch (err) {
        console.warn("[wipp-touch] notif action", err);
      }
    })();
  });
}
