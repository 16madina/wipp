import { supabase } from "./supabase";
import { useWippStore } from "./store";
import type { User } from "./types";
import type { RemoteProfile } from "./qr-remote";

export const PUBLIC_PROFILE_COLS = "id,username,display_name,avatar_url,bio,motto";

export function rawProfileId(id: string) {
  return id.startsWith("srvuser:") ? id.slice("srvuser:".length) : id;
}

export function srvUserId(profileId: string) {
  return profileId.startsWith("srvuser:") ? profileId : `srvuser:${profileId}`;
}

export function userFromPublic(
  profile: { id: string; username: string; displayName: string; avatarUrl?: string | null; bio?: string | null; motto?: string | null },
  connected = false,
): User {
  const id = srvUserId(profile.id);
  const displayName = profile.displayName || profile.username;
  return {
    id,
    username: profile.username,
    firstName: displayName.split(" ")[0] ?? displayName,
    lastName: displayName.split(" ").slice(1).join(" ") || "",
    displayName,
    avatar: profile.avatarUrl || "",
    bio: profile.bio || "",
    motto: profile.motto || "",
    online: true,
    connected,
    city: "",
  };
}

export function upsertRemoteProfile(profile: RemoteProfile, connected?: boolean): string {
  const user = userFromPublic(profile, connected);
  useWippStore.setState((s) => ({
    users: {
      ...s.users,
      [user.id]: {
        ...user,
        connected: connected ?? s.users[user.id]?.connected ?? false,
      },
    },
  }));
  return user.id;
}

function mapRow(p: {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  motto?: string | null;
}): RemoteProfile {
  return {
    id: p.id,
    username: p.username,
    displayName: p.display_name || p.username,
    avatarUrl: p.avatar_url,
    bio: p.bio ?? "",
    motto: p.motto ?? null,
  };
}

export async function searchPublicProfiles(q: string): Promise<RemoteProfile[]> {
  const clean = q.replace(/^@/, "").replace(/[%_(),]/g, "").trim();
  if (clean.length < 2) return [];
  const { data: exact } = await supabase
    .from("wipp_public_profiles")
    .select(PUBLIC_PROFILE_COLS)
    .ilike("username", clean)
    .maybeSingle();
  const { data: rest } = await supabase
    .from("wipp_public_profiles")
    .select(PUBLIC_PROFILE_COLS)
    .or(`username.ilike.${clean}%,display_name.ilike.%${clean}%`)
    .limit(20);
  const rows = new Map<string, RemoteProfile>();
  if (exact?.id && exact.username) rows.set(exact.id, mapRow(exact as never));
  for (const p of rest ?? []) {
    if (p?.id && p.username && !rows.has(p.id)) rows.set(p.id, mapRow(p as never));
  }
  return [...rows.values()];
}

export async function findPublicByUsername(username: string): Promise<RemoteProfile | null> {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) return null;
  try {
    const { data, error } = await supabase
      .from("wipp_public_profiles")
      .select(PUBLIC_PROFILE_COLS)
      .ilike("username", clean)
      .maybeSingle();
    if (!error && data?.id && data.username) return mapRow(data as never);
  } catch {
    /* the public view can be unreadable; the API lookup below is the source of truth */
  }
  try {
    const { wippApi } = await import("./proximity/wipp-session");
    const data = await wippApi<{
      users?: Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string | null;
        bio?: string;
      }>;
    }>(`users/search?q=${encodeURIComponent(clean)}`);
    const hit = (data.users ?? []).find((u) => u.username.toLowerCase() === clean.toLowerCase());
    if (!hit?.id || !hit.username) return null;
    return {
      id: hit.id,
      username: hit.username,
      displayName: hit.displayName || hit.username,
      avatarUrl: hit.avatarUrl ?? null,
      bio: hit.bio ?? "",
    };
  } catch {
    return null;
  }
}
