import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { KeyBundle } from "../crypto";

const KEY = "wipp-e2e-identity-v1";
const PROFILE = "wipp-server-profile-v1";

export async function loadIdentity(): Promise<KeyBundle | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as KeyBundle) : null;
  } catch {
    return null;
  }
}

export async function saveIdentity(bundle: KeyBundle) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(bundle));
  } catch {
    /* web / unavailable */
  }
}

export async function clearIdentity() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}

export async function loadCachedProfileJson(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PROFILE);
  } catch {
    return null;
  }
}

export async function saveCachedProfileJson(raw: string | null) {
  try {
    if (!raw) await SecureStore.deleteItemAsync(PROFILE);
    else await SecureStore.setItemAsync(PROFILE, raw);
  } catch {
    /* ignore */
  }
}

// ---- iOS lock-screen previews (Notification Service Extension) ----
// The extension decrypts the push ciphertext with a copy of the identity kept in the App Group
// keychain. "After first unlock" so a locked phone can still show the preview; this device only.
const NSE_OPTS = {
  accessGroup: "group.com.wipp.app",
  keychainService: "wipp-nse",
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
} as const;
const NSE_IDENTITY = "wipp-e2e-identity-nse";
const NSE_PREVIEW = "wipp-nse-preview";

export async function shareIdentityWithNotifications(bundle: KeyBundle) {
  if (Platform.OS !== "ios") return;
  try {
    await SecureStore.setItemAsync(NSE_IDENTITY, JSON.stringify(bundle), NSE_OPTS);
  } catch {
    /* extension previews stay generic */
  }
}

export async function clearNotificationIdentity() {
  if (Platform.OS !== "ios") return;
  try {
    await SecureStore.deleteItemAsync(NSE_IDENTITY, NSE_OPTS);
  } catch {
    /* ignore */
  }
}

/** "Aperçu des messages": on by default. */
export async function getMessagePreviewEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(NSE_PREVIEW, NSE_OPTS);
    return v !== "off";
  } catch {
    return true;
  }
}

export async function setMessagePreviewEnabled(on: boolean) {
  try {
    await SecureStore.setItemAsync(NSE_PREVIEW, on ? "on" : "off", NSE_OPTS);
  } catch {
    /* ignore */
  }
}
