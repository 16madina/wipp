import { wippApi } from "./wipp-session";

export type NearbyPublic = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
};

export async function setNearbyVisibility(durationMin: number) {
  return wippApi<{
    visible: boolean;
    token?: string;
    expiresAt?: number | null;
    serviceUuid: string;
  }>("/nearby/visibility", {
    method: "POST",
    body: JSON.stringify({ durationMin }),
  });
}

export async function getNearbyVisibility() {
  return wippApi<{ visible: boolean; expiresAt?: number | null; serviceUuid: string }>("/nearby/visibility");
}

export async function resolveNearbyToken(token: string) {
  return wippApi<{ profile: NearbyPublic | null }>("/nearby/resolve", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
