// Web build only: expo-secure-store has no browser implementation, so the
// web preview keeps these values in localStorage (never used on iOS/Android).
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 0;
export const WHEN_UNLOCKED = 1;
export const AFTER_FIRST_UNLOCK = 2;

function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  return store()?.getItem(`securestore:${key}`) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store()?.setItem(`securestore:${key}`, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store()?.removeItem(`securestore:${key}`);
}

export async function isAvailableAsync(): Promise<boolean> {
  return store() != null;
}
