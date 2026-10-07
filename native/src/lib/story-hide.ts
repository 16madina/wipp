import { Platform } from "react-native";
import { documentDirectory, readAsStringAsync, writeAsStringAsync } from "expo-file-system/legacy";
import { useWippStore } from "./store";

/** Stories I hid or reported, kept on this device across restarts (stories live 24 h, so 300 is plenty). */
const MAX = 300;
const FILE = `${documentDirectory ?? ""}wipp-hidden-stories.json`;
const WEB_KEY = "wipp-hidden-stories";
let hidden: string[] = [];
const set = new Set<string>();

function refresh() {
  useWippStore.setState((state) => ({ stories: [...state.stories] }));
}

async function save() {
  const raw = JSON.stringify(hidden);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(WEB_KEY, raw);
    else if (documentDirectory) await writeAsStringAsync(FILE, raw);
  } catch {
    /* best effort */
  }
}

void (async () => {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(WEB_KEY) : documentDirectory ? await readAsStringAsync(FILE) : null;
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(ids)) return;
    for (const id of ids) if (typeof id === "string" && !set.has(id)) {
      set.add(id);
      hidden.push(id);
    }
    if (hidden.length) refresh();
  } catch {
    /* no file yet */
  }
})();

export function isStoryHidden(id: string) {
  return set.has(id);
}

/** Hides one story on this device, for good (also after a restart). */
export function hideStoryLocal(id: string) {
  if (set.has(id)) return;
  set.add(id);
  hidden.push(id);
  if (hidden.length > MAX) {
    for (const old of hidden.splice(0, hidden.length - MAX)) set.delete(old);
  }
  refresh();
  void save();
}
