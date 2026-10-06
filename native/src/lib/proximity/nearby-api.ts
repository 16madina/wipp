import { wippApi } from "./wipp-session";

/** Server modes. The app keeps 15 / 60 / -1 (until off) / 0 (Invisible) in its store. */
export type NearbyServerMode = "15" | "60" | "until_off" | "off";
export type NearbyState = { mode: NearbyServerMode; visibleUntil: number | null; refreshMin: number; precision: number };

export type NearbyPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  relation: "none" | "pending_out" | "pending_in" | "connected";
};

export const getNearbyState = () => wippApi<NearbyState>("/nearby/state");

export const setNearbyMode = (mode: NearbyServerMode, cell: string | null) =>
  wippApi<NearbyState>("/nearby/mode", { method: "POST", body: JSON.stringify({ mode, cell }) });

export const refreshNearbyCell = (cell: string) =>
  wippApi<NearbyState>("/nearby/cell", { method: "POST", body: JSON.stringify({ cell }) });

export const searchNearbyPeople = (cell: string) =>
  wippApi<{ people: NearbyPerson[] }>("/nearby/search", { method: "POST", body: JSON.stringify({ cell }) });

export const requestNearby = (peerId: string) =>
  wippApi<{ status: string; id?: string }>("/nearby/request", { method: "POST", body: JSON.stringify({ peerId }) });

export const clearNearby = () => wippApi<{ ok: boolean }>("/nearby/clear", { method: "POST", body: "{}" });

/** Legacy Bluetooth discovery (isolated: only the unused nearby-scan.ts refers to it). */
export const resolveNearbyToken = (token: string) =>
  wippApi<{ profile: { id: string; username: string; displayName: string; avatarUrl?: string | null; bio?: string | null } | null }>(
    "/nearby/resolve",
    { method: "POST", body: JSON.stringify({ token }) },
  );
