import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** SecureStore values must stay under the platform limit. Sessions are chunked. */
const CHUNK = 1800;

function chunkCountKey(key: string) {
  return `${key}.n`;
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

async function readChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(chunkCountKey(key));
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function deleteChunks(key: string) {
  const n = await readChunkCount(key);
  for (let i = 0; i < n; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  if (n > 0) await SecureStore.deleteItemAsync(chunkCountKey(key));
  await SecureStore.deleteItemAsync(key);
}

/** Auth storage for the native Supabase client. Web uses localStorage. */
export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    try {
      const n = await readChunkCount(key);
      if (n === 0) return await SecureStore.getItemAsync(key);
      let out = "";
      for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(chunkKey(key, i))) ?? "";
      return out || null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* private mode */
      }
      return;
    }
    await deleteChunks(key);
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const n = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(chunkCountKey(key), String(n));
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      await deleteChunks(key);
    } catch {
      /* ignore */
    }
  },
};
