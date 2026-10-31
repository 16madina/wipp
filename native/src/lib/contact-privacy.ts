/**
 * Per-contact privacy (on top of the general settings in Confidentialité):
 * - « en ligne »: kept on the server (the other phone must not receive it);
 * - read receipts: decided on this phone when it sends « lu », so kept here.
 */
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEY = "wipp-contact-privacy";
type Saved = { noReadReceipts: string[] };

export const useContactPrivacy = create<{ noReadReceipts: string[]; hiddenFrom: string[]; loaded: boolean }>(() => ({ noReadReceipts: [], hiddenFrom: [], loaded: false }));

export async function loadContactPrivacy() {
  if (useContactPrivacy.getState().loaded) return;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const saved = raw ? (JSON.parse(raw) as Saved) : { noReadReceipts: [] };
    useContactPrivacy.setState({ noReadReceipts: saved.noReadReceipts ?? [], loaded: true });
  } catch {
    useContactPrivacy.setState({ loaded: true });
  }
  try {
    const { wippApi } = await import("./proximity/wipp-session");
    const r = await wippApi<{ ids: string[] }>("presence/hidden-from");
    useContactPrivacy.setState({ hiddenFrom: r.ids.map((id) => `srvuser:${id}`) });
  } catch {
    /* offline */
  }
}

/** May this person see that I read their messages? (general setting AND this contact) */
export function readReceiptsAllowedFor(userId: string | undefined, general: boolean) {
  if (!general) return false;
  return !userId || !useContactPrivacy.getState().noReadReceipts.includes(userId);
}

export async function setReadReceiptsFor(userId: string, allowed: boolean) {
  const cur = useContactPrivacy.getState().noReadReceipts.filter((x) => x !== userId);
  const next = allowed ? cur : [...cur, userId];
  useContactPrivacy.setState({ noReadReceipts: next });
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify({ noReadReceipts: next }));
  } catch {
    /* not saved */
  }
}

export async function setOnlineVisibleTo(userId: string, visible: boolean) {
  const cur = useContactPrivacy.getState().hiddenFrom.filter((x) => x !== userId);
  useContactPrivacy.setState({ hiddenFrom: visible ? cur : [...cur, userId] });
  const { wippApi } = await import("./proximity/wipp-session");
  await wippApi("presence/hidden-from", { method: "POST", body: JSON.stringify({ viewerId: userId, hidden: !visible }) });
}
