import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Screen } from "../types";

const KEY = "wipp-pending-nav-v1";

export type PendingNav =
  | { kind: "screen"; screen: Screen; eventId?: string }
  | { kind: "url"; url: string };

let mem: PendingNav | null = null;

export function setPendingNav(pending: PendingNav) {
  mem = pending;
  if (Platform.OS === "web") return;
  try {
    void SecureStore.setItemAsync(KEY, JSON.stringify(pending)).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export async function peekPendingNav(): Promise<PendingNav | null> {
  if (mem) return mem;
  if (Platform.OS === "web") return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    mem = JSON.parse(raw) as PendingNav;
    return mem;
  } catch {
    return null;
  }
}

export async function consumePendingNav(): Promise<PendingNav | null> {
  const cur = await peekPendingNav();
  mem = null;
  if (Platform.OS === "web") return cur;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
  return cur;
}
