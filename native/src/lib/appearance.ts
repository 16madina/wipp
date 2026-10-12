import { Appearance, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { applyTheme, skinBase, type SkinName, type ThemeName } from "../theme";

/** Choix de l'utilisateur. Par défaut : sombre (le thème WIPP actuel). */
export type AppearanceMode = SkinName | "system";

const KEY = "wipp.appearance";
const LAST_KEY = "wipp.appearance.color";

type State = {
  mode: AppearanceMode;
  /** Light or dark: logo, status bar, keyboard. */
  theme: ThemeName;
  /** The colour set on screen. */
  skin: SkinName;
  /** Last colour chosen other than the default dark one: the ☀️/🌙 button goes back to it. */
  lastColor: SkinName;
  ready: boolean;
  setMode: (mode: AppearanceMode) => void;
};

function resolve(mode: AppearanceMode): SkinName {
  if (mode !== "system") return mode;
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

/** Clavier, alertes et sélecteurs natifs suivent le thème choisi. */
function syncNative(mode: AppearanceMode) {
  try {
    Appearance.setColorScheme?.(mode === "system" ? ("unspecified" as never) : skinBase[mode]);
  } catch {
    /* web / anciennes versions */
  }
}

async function readMode(): Promise<AppearanceMode | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw === "system" || (raw != null && raw in skinBase) ? (raw as AppearanceMode) : null;
  } catch {
    return null;
  }
}

async function writeMode(mode: AppearanceMode) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, mode);
    else await SecureStore.setItemAsync(KEY, mode);
  } catch {
    /* le choix reste valable pour la session */
  }
}

async function readLast(): Promise<SkinName | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(LAST_KEY) : await SecureStore.getItemAsync(LAST_KEY);
    return raw != null && raw in skinBase && raw !== "dark" ? (raw as SkinName) : null;
  } catch {
    return null;
  }
}

async function writeLast(skin: SkinName) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(LAST_KEY, skin);
    else await SecureStore.setItemAsync(LAST_KEY, skin);
  } catch {
    /* the ☀️/🌙 button falls back to the light blue set */
  }
}

export const useAppearance = create<State>((set, get) => ({
  mode: "dark",
  theme: "dark",
  skin: "dark",
  lastColor: "light",
  ready: false,
  setMode: (mode) => {
    syncNative(mode);
    const skin = resolve(mode);
    applyTheme(skin);
    const lastColor = mode !== "dark" && mode !== "system" ? mode : get().lastColor;
    set({ mode, skin, theme: skinBase[skin], lastColor });
    void writeMode(mode);
    if (lastColor !== get().lastColor || mode === lastColor) void writeLast(lastColor);
  },
}));

let started = false;

/** À appeler une fois au démarrage, avant le premier rendu de l'app. */
export async function loadAppearance() {
  if (started) return;
  started = true;
  const mode = (await readMode()) ?? "dark";
  syncNative(mode);
  const skin = resolve(mode);
  applyTheme(skin);
  const lastColor = (await readLast()) ?? (mode !== "dark" && mode !== "system" ? mode : "light");
  useAppearance.setState({ mode, skin, theme: skinBase[skin], lastColor, ready: true });
  // Mode « Système » : suivre le téléphone en direct.
  Appearance.addChangeListener(({ colorScheme }) => {
    const st = useAppearance.getState();
    if (st.mode !== "system") return;
    const next: ThemeName = colorScheme === "light" ? "light" : "dark";
    if (next === st.skin) return;
    applyTheme(next);
    useAppearance.setState({ theme: next, skin: next });
  });
}
