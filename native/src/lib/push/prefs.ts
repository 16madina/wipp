import * as SecureStore from "expo-secure-store";
import { defaultNotifs } from "../seed";
import type { NotifSettings } from "../types";

const KEY = "wipp-notif-prefs-v1";

export type StoredNotifPrefs = {
  notifs: NotifSettings;
  pushMaster: boolean;
};

export async function loadNotifPrefs(): Promise<StoredNotifPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { notifs: { ...defaultNotifs }, pushMaster: false };
    const parsed = JSON.parse(raw) as Partial<StoredNotifPrefs>;
    return {
      notifs: { ...defaultNotifs, ...(parsed.notifs ?? {}) },
      pushMaster: Boolean(parsed.pushMaster),
    };
  } catch {
    return { notifs: { ...defaultNotifs }, pushMaster: false };
  }
}

export async function saveNotifPrefs(prefs: StoredNotifPrefs) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
