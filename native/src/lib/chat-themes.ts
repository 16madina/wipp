import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { colors } from "../theme";

/**
 * Per-conversation theme: the colour of MY bubbles. Stored on this phone only (like a WhatsApp
 * wallpaper); "default" follows the app theme (navy in dark, WIPP blue in light).
 */
export const CHAT_THEMES = [
  { id: "default", label: "Par défaut", color: null },
  { id: "blue", label: "Bleu", color: "#1a6bd9" },
  { id: "violet", label: "Violet", color: "#7c4dff" },
  { id: "pink", label: "Rose", color: "#e0457b" },
  { id: "green", label: "Vert", color: "#1f9d6c" },
  { id: "orange", label: "Orange", color: "#f08a24" },
  { id: "gold", label: "Or", color: "#b8891a" },
  { id: "graphite", label: "Graphite", color: "#3a4256" },
] as const;

export type ChatThemeId = (typeof CHAT_THEMES)[number]["id"];

const KEY = "wipp.chatThemes";

type State = { themes: Record<string, ChatThemeId>; setTheme: (chatId: string, id: ChatThemeId) => void };

async function read(): Promise<Record<string, ChatThemeId>> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ChatThemeId>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(themes: Record<string, ChatThemeId>) {
  const raw = JSON.stringify(themes);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, raw);
    else void SecureStore.setItemAsync(KEY, raw).catch(() => undefined);
  } catch {
    /* kept for this session */
  }
}

export const useChatThemes = create<State>((set, get) => ({
  themes: {},
  setTheme: (chatId, id) => {
    const themes = { ...get().themes };
    if (id === "default") delete themes[chatId];
    else themes[chatId] = id;
    set({ themes });
    write(themes);
  },
}));

let loaded = false;
export function loadChatThemes() {
  if (loaded) return;
  loaded = true;
  void read().then((themes) => useChatThemes.setState({ themes: { ...themes, ...useChatThemes.getState().themes } }));
}

/** Colours of my bubbles in this conversation. */
export function myBubbleColors(themeId: ChatThemeId | undefined) {
  const color = CHAT_THEMES.find((t) => t.id === themeId)?.color;
  if (!color) return { bg: colors.bubbleMe, fg: colors.bubbleMeFg, muted: colors.bubbleMeMuted, accent: colors.bubbleMeAccent };
  return { bg: color, fg: "#ffffff", muted: "rgba(255,255,255,0.78)", accent: "#ffffff" };
}
