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
