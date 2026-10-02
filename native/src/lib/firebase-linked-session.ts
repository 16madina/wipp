import * as SecureStore from "expo-secure-store";
import type { LinkedProfile } from "./auth-api";

const KEY = "wipp.firebase.linked";

export type LinkedFirebaseSession = {
  uid: string;
  profile: LinkedProfile;
};

export async function readLinkedSession(uid: string): Promise<LinkedProfile | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LinkedFirebaseSession;
    if (parsed.uid !== uid || !parsed.profile?.id) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

export async function writeLinkedSession(uid: string, profile: LinkedProfile): Promise<void> {
  const value: LinkedFirebaseSession = { uid, profile };
  await SecureStore.setItemAsync(KEY, JSON.stringify(value));
}

export async function clearLinkedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
