import { Appearance, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { applyTheme, type ThemeName } from "../theme";

/** Choix de l'utilisateur. Par défaut : sombre (le thème WIPP actuel). */
export type AppearanceMode = "dark" | "light" | "system";

const KEY = "wipp.appearance";

type State = {
  mode: AppearanceMode;
  theme: ThemeName;
  ready: boolean;
  setMode: (mode: AppearanceMode) => void;
};

function resolve(mode: AppearanceMode): ThemeName {
  if (mode !== "system") return mode;
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

/** Clavier, alertes et sélecteurs natifs suivent le thème choisi. */
function syncNative(mode: AppearanceMode) {
  try {
    Appearance.setColorScheme?.(mode === "system" ? ("unspecified" as never) : mode);
  } catch {
    /* web / anciennes versions */
  }
}

async function readMode(): Promise<AppearanceMode | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw === "dark" || raw === "light" || raw === "system" ? raw : null;
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

export const useAppearance = create<State>((set, get) => ({
  mode: "dark",
  theme: "dark",
  ready: false,
  setMode: (mode) => {
    syncNative(mode);
    const theme = resolve(mode);
    applyTheme(theme);
    set({ mode, theme });
    void writeMode(mode);
  },
}));

let started = false;

/** À appeler une fois au démarrage, avant le premier rendu de l'app. */
export async function loadAppearance() {
  if (started) return;
  started = true;
  const mode = (await readMode()) ?? "dark";
  syncNative(mode);
  const theme = resolve(mode);
  applyTheme(theme);
  useAppearance.setState({ mode, theme, ready: true });
  // Mode « Système » : suivre le téléphone en direct.
  Appearance.addChangeListener(({ colorScheme }) => {
    const st = useAppearance.getState();
    if (st.mode !== "system") return;
    const next: ThemeName = colorScheme === "light" ? "light" : "dark";
    if (next === st.theme) return;
    applyTheme(next);
    useAppearance.setState({ theme: next });
  });
}
