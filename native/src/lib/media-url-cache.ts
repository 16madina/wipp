import { Platform } from "react-native";
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";

/**
 * Signed storage URLs, kept across app launches until shortly before they expire.
 * Reusing the same URL lets the image cache show photos instantly instead of
 * re-signing and re-downloading them at every start.
 */
type Entry = { url: string; exp: number };
const FILE = `${documentDirectory ?? ""}wipp-media-urls.json`;
const KEY = "wipp-media-urls";
let map: Record<string, Entry> = {};
let loaded: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (!loaded) {
    loaded = (async () => {
      try {
        const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await readAsStringAsync(FILE);
        if (raw) map = JSON.parse(raw) as Record<string, Entry>;
      } catch {
        map = {};
      }
    })();
  }
  return loaded;
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const now = Date.now();
    for (const k of Object.keys(map)) if (map[k].exp < now) delete map[k];
    const raw = JSON.stringify(map);
    try {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, raw);
      else void writeAsStringAsync(FILE, raw).catch(() => undefined);
    } catch {
      /* cache only */
    }
  }, 1500);
}

export async function cachedMediaUrl(key: string) {
  await load();
  const e = map[key];
  return e && e.exp > Date.now() ? e.url : null;
}

/** Remember a URL valid for `ttlMs` (kept 10 min less, to never hand out an expired one). */
export function rememberMediaUrl(key: string, url: string, ttlMs: number) {
  map[key] = { url, exp: Date.now() + ttlMs - 10 * 60_000 };
  save();
}

export function preloadMediaUrls() {
  return load();
}

/** My own photo path, so the next launch shows it at once instead of the initial. */
export function rememberMyAvatar(profileId: string, avatar: string) {
  map[`me:${profileId}`] = { url: avatar, exp: Date.now() + 365 * 86_400_000 };
  save();
}

export async function myCachedAvatar(profileId: string) {
  await load();
  return map[`me:${profileId}`]?.url ?? "";
}
