import * as SecureStore from "expo-secure-store";

const KEY = "wipp-install-id";
let mem: string | null = null;

export async function getInstallationId(): Promise<string> {
  if (mem) return mem;
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) {
      mem = existing;
      return existing;
    }
  } catch {
    /* web / unavailable */
  }
  const id = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  mem = id;
  try {
    await SecureStore.setItemAsync(KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}
