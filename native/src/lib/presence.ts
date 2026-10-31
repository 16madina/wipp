/** Real online status: ping while WIPP is open, read the people I am talking with, hide mine if I want. */
import { AppState } from "react-native";
import { wippApi } from "./proximity/wipp-session";
import { useWippStore } from "./store";

let timer: ReturnType<typeof setInterval> | null = null;

function ping() {
  if (!useWippStore.getState().serverProfileId) return;
  void wippApi("presence/ping", { method: "POST" }).catch(() => undefined);
}

/** Starts the online signal (called once the session is ready). */
export function startPresence() {
  if (timer) return;
  ping();
  timer = setInterval(() => AppState.currentState === "active" && ping(), 15_000);
  AppState.addEventListener("change", (st) => {
    if (st === "active") ping();
    else if (st === "background") void wippApi("presence/leave", { method: "POST" }).catch(() => undefined);
  });
}

/** Fills users[id].online / lastSeen for these WIPP users ("srvuser:…" ids). */
export async function refreshPresence(userIds: string[]) {
  const ids = userIds.filter((x) => x.startsWith("srvuser:")).map((x) => x.slice("srvuser:".length));
  if (!ids.length) return;
  try {
    const r = await wippApi<{ presence: Record<string, { online: boolean; lastSeen: number | null; hidden: boolean }> }>("presence/of", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    useWippStore.setState((s) => {
      const users = { ...s.users };
      for (const [id, p] of Object.entries(r.presence)) {
        const key = `srvuser:${id}`;
        if (users[key]) users[key] = { ...users[key]!, online: p.online, lastSeen: p.lastSeen ?? undefined, presenceHidden: p.hidden };
      }
      return { users };
    });
  } catch {
    /* offline: keep what we had */
  }
}

export async function getPresenceHidden() {
  return (await wippApi<{ hidden: boolean }>("presence/settings")).hidden;
}

export async function setPresenceHidden(hidden: boolean) {
  await wippApi("presence/settings", { method: "POST", body: JSON.stringify({ hidden }) });
}
