/**
 * Android: a visible, permanent notification while a call or a screen share is running.
 *
 * It is a foreground service, for two reasons:
 *  - the user sees that the call / the share goes on outside WIPP, with a button to stop it;
 *  - Android pauses the app's JavaScript when WIPP leaves the screen, and the LiveKit connection then
 *    drops after a few seconds. The service task keeps it running.
 * iPhone does not need it (CallKit and the broadcast extension do this job).
 */
import { PermissionsAndroid, Platform } from "react-native";

const CHANNEL = "wipp_ongoing";
const ID = "wipp-ongoing";
export const ONGOING_STOP = "wipp-ongoing-stop";

export type Ongoing = {
  title: string;
  body: string;
  /** Label of the button; pressing it calls `onStop`. */
  stopLabel: string;
  onStop: () => void;
  phoneCall?: boolean;
  camera?: boolean;
  screen?: boolean;
  /** Start of the call, for the running timer. */
  since?: number;
};

let registered = false;
let release: (() => void) | null = null;
let onStop: (() => void) | null = null;
let shown = "";
let wanted = false;

/** The stop button was pressed (from the notification, WIPP on screen or not). */
export function ongoingStopPressed() {
  onStop?.();
}

export async function showOngoing(o: Ongoing) {
  if (Platform.OS !== "android") return;
  onStop = o.onStop;
  wanted = true;
  const key = JSON.stringify([o.title, o.body, o.stopLabel, o.phoneCall, o.camera, o.screen, o.since]);
  if (key === shown) return;
  try {
    const { default: n, AndroidCategory, AndroidForegroundServiceType: T, AndroidImportance, AndroidVisibility, EventType } = await import("@notifee/react-native");
    if (!registered) {
      registered = true;
      // The task lasts as long as the service: this is what keeps the JavaScript alive in the background.
      n.registerForegroundService(() => new Promise<void>((done) => (release = done)));
      n.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ONGOING_STOP) ongoingStopPressed();
      });
    }
    // Android 14+ refuses a service type whose permission is not granted: only declare what is really allowed.
    const types: number[] = [];
    if (o.phoneCall) types.push(T.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
    if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)) types.push(T.FOREGROUND_SERVICE_TYPE_MICROPHONE);
    if (o.camera && (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA))) types.push(T.FOREGROUND_SERVICE_TYPE_CAMERA);
    if (o.screen) types.push(T.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
    if (!types.length) return;
    await n.createChannel({ id: CHANNEL, name: "Appel ou partage en cours", importance: AndroidImportance.DEFAULT, vibration: false, visibility: AndroidVisibility.PUBLIC });
    await n.displayNotification({
      id: ID,
      title: o.title,
      body: o.body,
      android: {
        channelId: CHANNEL,
        asForegroundService: true,
        foregroundServiceTypes: types,
        category: AndroidCategory.CALL,
        smallIcon: "notification_icon",
        color: "#E0362C",
        colorized: true,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        visibility: AndroidVisibility.PUBLIC,
        showChronometer: Boolean(o.since),
        timestamp: o.since,
        pressAction: { id: "default", launchActivity: "default" },
        actions: [{ title: o.stopLabel, pressAction: { id: ONGOING_STOP } }],
      },
    });
    shown = key;
    // Ended while the notification was being built.
    if (!wanted) await hideOngoing();
  } catch {
    /* refused by the system (started from the background, missing module): the call goes on without it */
  }
}

export async function hideOngoing() {
  wanted = false;
  if (Platform.OS !== "android" || !shown) return;
  shown = "";
  onStop = null;
  try {
    const { default: n } = await import("@notifee/react-native");
    await n.stopForegroundService();
    await n.cancelNotification(ID);
  } catch {
    /* already gone */
  }
  release?.();
  release = null;
}
