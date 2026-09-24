/**
 * Passive WIPP Touch receiver — BLE scan without opening Touch UI.
 * Sends detect (RSSI samples) to server; only the bump-arbitration winner gets a notif.
 */
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import {
  acceptTouchCode,
  getTouchDetectStatus,
  rejectTouchCode,
  reportTouchDetect,
} from "./touch-api";
import { startTouchScan, stopTouchScan, type ScanHit } from "./touch-ble";
import { startTouchShockListen, stopTouchShockListen } from "./touch-shock";
import { getStoredToken } from "./session";

const pending = new Map<string, { samples: number[]; detectedAt: number; notified?: boolean }>();
const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

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

async function pollWinner(code: string) {
  if (pollTimers.has(code)) return;
  const t = setInterval(() => {
    void (async () => {
      try {
        const st = await getTouchDetectStatus(code);
        if (st.state === "winner" && st.invite && !pending.get(code)?.notified) {
          const p = pending.get(code) || { samples: [], detectedAt: Date.now() };
          p.notified = true;
          pending.set(code, p);
          clearInterval(t);
          pollTimers.delete(code);
          await presentTouchInviteNotification({
            code: st.invite.code,
            fromName: st.invite.sender.firstName || st.invite.sender.displayName,
          });
        } else if (st.state === "rejected" || st.state === "ambiguous") {
          clearInterval(t);
          pollTimers.delete(code);
        }
      } catch {
        /* keep polling briefly */
      }
    })();
  }, 1200);
  pollTimers.set(code, t);
  // stop after 90s
  setTimeout(() => {
    clearInterval(t);
    pollTimers.delete(code);
  }, 90_000);
}

async function onScanHit(hit: ScanHit, shockAt?: number) {
  const token = await getStoredToken();
  if (!token) return;
  const prev = pending.get(hit.code);
  const samples = [...(prev?.samples || []), ...hit.rssiSamples].slice(-16);
  pending.set(hit.code, { samples, detectedAt: hit.detectedAt, notified: prev?.notified });
  if (prev?.notified) return;

  try {
    const res = await reportTouchDetect({
      code: hit.code,
      rssiSamples: samples,
      detectedAt: hit.detectedAt,
      shockAt: shockAt ?? null,
      platform: hit.platform,
      foreground: hit.foreground,
      channel: "ble",
    });
    if (res.state === "winner" && res.invite) {
      const p = pending.get(hit.code)!;
      p.notified = true;
      await presentTouchInviteNotification({
        code: res.invite.code,
        fromName: res.invite.sender.firstName || res.invite.sender.displayName,
      });
    } else if (res.state === "waiting_shock" || res.state === "queued") {
      void pollWinner(hit.code);
    }
  } catch (err) {
    console.warn("[wipp-touch] detect", err);
  }
}

/** Start passive BLE listen (call after login). No Touch screen required on B. */
export async function startTouchReceiver(): Promise<{ ok: boolean; reason?: string }> {
  const token = await getStoredToken();
  if (!token) return { ok: false, reason: "not_logged_in" };
  await registerTouchNotificationCategories();

  // Bonus: if B is foreground, also listen for own shock to strengthen match
  if (AppState.currentState === "active") {
    void startTouchShockListen((at) => {
      for (const [code, p] of pending) {
        if (p.notified) continue;
        void reportTouchDetect({
          code,
          rssiSamples: p.samples,
          detectedAt: p.detectedAt,
          shockAt: at,
          platform: Platform.OS,
          foreground: true,
          channel: "ble",
        }).catch(() => undefined);
      }
    });
  }

  return startTouchScan((hit) => {
    void onScanHit(hit);
  });
}

export function stopTouchReceiver() {
  stopTouchScan();
  stopTouchShockListen();
  for (const t of pollTimers.values()) clearInterval(t);
  pollTimers.clear();
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

void Constants;
