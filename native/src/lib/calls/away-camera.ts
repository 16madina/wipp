import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { tr } from "../tr";

/**
 * Video call, WIPP left (mini player): a notification asks whether the others may see me.
 * The camera starts paused (« Je reviens… » on the other phone); « Me montrer » turns it on
 * without coming back to WIPP, « Pause caméra » turns it off again.
 */
const NOTICE_ID = "wipp-call-camera";
const CAT_PAUSED = "wipp-call-camera-paused";
const CAT_SHOWN = "wipp-call-camera-shown";
const CHANNEL = "call_camera";
export const AWAY_CAMERA_TYPE = "call-camera";

export type AwayCameraAction = "show" | "pause" | "keep";

let ready: Promise<void> | null = null;

function setup() {
  if (!ready) {
    ready = (async () => {
      await Notifications.setNotificationCategoryAsync(CAT_PAUSED, [
        { identifier: "show", buttonTitle: tr("Me montrer"), options: { opensAppToForeground: false } },
        { identifier: "keep", buttonTitle: tr("Garder en pause"), options: { opensAppToForeground: false } },
      ]);
      await Notifications.setNotificationCategoryAsync(CAT_SHOWN, [
        { identifier: "pause", buttonTitle: tr("Pause caméra"), options: { opensAppToForeground: false } },
      ]);
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: tr("Caméra pendant un appel"),
          importance: Notifications.AndroidImportance.HIGH,
          sound: null,
          enableVibrate: false,
          vibrationPattern: [0],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
        });
      }
    })().catch(() => {
      ready = null;
    });
  }
  return ready;
}

/**
 * iPhone only: the camera can run outside the app from iOS 18 (multitasking camera access), and the iOS
 * mini player cannot have our own button. Android has the button in its mini player (CallPip.kt).
 */
export function awayCameraSupported() {
  if (Platform.OS === "ios") return parseFloat(String(Platform.Version)) >= 18;
  return false;
}

/** Shows (or replaces) the notice: camera paused → « Me montrer / Garder en pause »; shown → « Pause caméra ». */
export async function showAwayCameraNotice(shown: boolean) {
  if (!awayCameraSupported()) return;
  try {
    await setup();
    await Notifications.dismissNotificationAsync(NOTICE_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTICE_ID,
      content: {
        title: tr("Appel vidéo en cours"),
        body: shown ? tr("Ta caméra est visible : l'autre personne te voit.") : tr("Ta caméra est en pause : l'autre personne voit « Je reviens… »."),
        categoryIdentifier: shown ? CAT_SHOWN : CAT_PAUSED,
        data: { type: AWAY_CAMERA_TYPE },
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        autoDismiss: false,
      },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
  } catch {
    /* notifications refused: the mini player still works, camera stays paused */
  }
}

export async function clearAwayCameraNotice() {
  try {
    await Notifications.dismissNotificationAsync(NOTICE_ID);
  } catch {
    /* nothing shown */
  }
}

/** A button of the notice was pressed (WIPP stays in the background). */
export function onAwayCameraAction(cb: (action: AwayCameraAction) => void) {
  if (Platform.OS === "web") return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    if (r.notification.request.content.data?.type !== AWAY_CAMERA_TYPE) return;
    const a = r.actionIdentifier;
    if (a === "show" || a === "pause" || a === "keep") cb(a);
  });
  return () => sub.remove();
}
