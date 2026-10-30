import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { BACKGROUND_READABLE, upgradeKeychainItem } from "../keychain-access";

const KEY = "wipp-install-id";
let mem: string | null = null;

export async function getInstallationId(): Promise<string> {
  if (mem) return mem;
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) {
      mem = existing;
      void upgradeKeychainItem(KEY, existing);
      return existing;
    }
  } catch {
    // Keychain locked (phone locked, woken for a call): never invent a new id, that would look like another phone.
    if (Platform.OS !== "web") throw new Error("installation_id_unavailable");
  }
  const id = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  mem = id;
  try {
    await SecureStore.setItemAsync(KEY, id, BACKGROUND_READABLE);
  } catch {
    /* ignore */
  }
  return id;
}
