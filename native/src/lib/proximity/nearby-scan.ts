import { upsertRemoteProfile } from "../public-profiles";
import { useWippStore } from "../store";
import { NativeProximityProvider } from "./provider";
import { resolveNearbyToken } from "./nearby-api";
import { fetchTouchBumpConfig } from "./touch-api";
import { TOUCH_BUMP_DEFAULTS } from "./logic";

let unsub: (() => void) | null = null;
let scanProvider: NativeProximityProvider | null = null;
const seen = new Map<string, { userId: string; last: number }>();

export async function startNearbyScan(onProfiles: (ids: string[]) => void): Promise<{ ok: boolean; reason?: string }> {
  await stopNearbyScan();
  const cfg = await fetchTouchBumpConfig().catch(() => TOUCH_BUMP_DEFAULTS);
  const p = new NativeProximityProvider();
  p.setConfig({ ...cfg, rssiMinDbm: Math.min(cfg.rssiMinDbm, -75) });
  scanProvider = p;
  const start = await p.startDiscovery("nearby");
  if (!start.ok) return start;
  unsub = p.on((ev) => {
    if (ev.type !== "candidate") return;
    void (async () => {
      try {
        const res = await resolveNearbyToken(ev.candidate.token);
        const profile = res.profile;
        if (!profile) return;
        const blocked = useWippStore.getState().blockedIds;
        const userId = upsertRemoteProfile(
          {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl ?? null,
            bio: profile.bio ?? "",
          },
          false,
        );
        if (blocked.includes(userId) || blocked.includes(`srvuser:${profile.id}`)) return;
        seen.set(profile.id, { userId, last: Date.now() });
        const ids = [...seen.values()].filter((s) => Date.now() - s.last < 20_000).map((s) => s.userId);
        onProfiles(ids);
      } catch {
        /* blocked / expired / private — skip silently */
      }
    })();
  });
  return { ok: true };
}

export async function stopNearbyScan() {
  unsub?.();
  unsub = null;
  await scanProvider?.stopDiscovery();
  scanProvider = null;
  seen.clear();
}
