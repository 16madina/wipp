/**
 * Keychain items WIPP needs when iOS wakes it in the background for a call while the phone is locked
 * (sign-in, installation id, server token). The default « readable only while unlocked » made WIPP start
 * signed out from a locked phone: the call could not be answered, the caller kept ringing, « appel manqué ».
 * AFTER_FIRST_UNLOCK = readable once the phone was unlocked one time after it was switched on (like call apps).
 */
import * as SecureStore from "expo-secure-store";

export const BACKGROUND_READABLE: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

const migrated = new Set<string>();

/** Items saved before with the old setting: rewritten once (delete + add, an update keeps the old setting). */
export async function upgradeKeychainItem(key: string, value: string | null) {
  if (!value || migrated.has(key)) return;
  migrated.add(key);
  try {
    await SecureStore.deleteItemAsync(key);
    await SecureStore.setItemAsync(key, value, BACKGROUND_READABLE);
  } catch {
    migrated.delete(key);
  }
}
