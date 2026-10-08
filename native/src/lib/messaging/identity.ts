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

export async function saveIdentity(bundle: KeyBundle, profileId?: string | null) {
  try {
    // KEY = identity of the account currently open on this phone (read by the push previews).
    await SecureStore.setItemAsync(KEY, JSON.stringify(bundle));
    if (profileId) await SecureStore.setItemAsync(accountKey(profileId), JSON.stringify(bundle));
  } catch {
    /* web / unavailable */
  }
}

/**
 * One E2E identity PER ACCOUNT on this phone. Before, a single key was shared by every account
 * signed in on the device: opening another account published that key for it and replaced the
 * account's own key, so its earlier messages could no longer be read (« Message chiffré »).
 */
function accountKey(profileId: string) {
  return `${KEY}.${profileId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

export async function loadAccountIdentity(profileId: string): Promise<KeyBundle | null> {
  try {
    const raw = await SecureStore.getItemAsync(accountKey(profileId));
    return raw ? (JSON.parse(raw) as KeyBundle) : null;
  } catch {
    return null;
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

const NSE_DELIVERY = "wipp-nse-delivery";

/**
 * Lets the iOS notification extension say « reçu » (two grey dots) while the app is closed.
 * The key can only mark messages as delivered for this account. One key per account on this phone.
 */
export async function ensureDeliveryKeyForNotifications(profileId: string) {
  if (Platform.OS !== "ios" || !profileId) return;
  const localKey = `wipp-delivery-key.${profileId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  try {
    let key = await SecureStore.getItemAsync(localKey);
    if (!key) {
      const { wippApi } = await import("../proximity/wipp-session");
      const r = await wippApi<{ key: string }>("me/delivery-key", { method: "POST", body: "{}" });
      key = r.key;
      if (!key) return;
      await SecureStore.setItemAsync(localKey, key);
    }
    await SecureStore.setItemAsync(NSE_DELIVERY, key, NSE_OPTS);
  } catch {
    /* without it, « reçu » simply waits until the app opens */
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

/** "Aperçu des messages": on by default (iOS extension + Android background task). */
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
