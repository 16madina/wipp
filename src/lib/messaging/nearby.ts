/**
 * Nearby visibility — opaque expiring token, hashed at rest.
 * Separate from WIPP Touch. Never auto-connects.
 */
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { isBlocked, WippHttpError, ensureMessagingReady } from "@/lib/messaging/server";

export const WIPP_NEARBY_SERVICE_UUID = "6eeff345-3333-4a2b-9c3d-aabbccddeeff";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LEN = 8;

function uid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function mintToken() {
  const bytes = randomBytes(TOKEN_LEN);
  let out = "";
  for (let i = 0; i < TOKEN_LEN; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

function hashToken(token: string) {
  return createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

function durationMs(durationMin: number): number | null {
  if (durationMin === 0) return 0;
  if (durationMin === -1) return 365 * 86400_000;
  if (durationMin === 15 || durationMin === 60) return durationMin * 60_000;
  throw new WippHttpError(400, "bad_duration", "Durée invalide.");
}

export async function expireNearby() {
  const sql = await getSql();
  await sql`delete from wipp_nearby_sessions where expires_at < now()`;
}

export async function setNearbyVisibility(profileId: string, durationMin: number) {
  await ensureMessagingReady();
  await expireNearby();
  const sql = await getSql();
  await sql`delete from wipp_nearby_sessions where profile_id = ${profileId}`;
  const ms = durationMs(durationMin);
  if (!ms) {
    return { visible: false as const, serviceUuid: WIPP_NEARBY_SERVICE_UUID, token: undefined, expiresAt: null };
  }
  const token = mintToken();
  const expiresAt = Date.now() + ms;
  await sql`
    insert into wipp_nearby_sessions (id, profile_id, token_hash, expires_at)
    values (${uid("nb")}, ${profileId}, ${hashToken(token)}, ${new Date(expiresAt).toISOString()}::timestamptz)
  `;
  return {
    visible: true as const,
    token,
    expiresAt,
    serviceUuid: WIPP_NEARBY_SERVICE_UUID,
  };
}

export async function getNearbyVisibility(profileId: string) {
  await ensureMessagingReady();
  await expireNearby();
  const sql = await getSql();
  const rows = await sql<{ expires_at: string }>`
    select expires_at::text from wipp_nearby_sessions
    where profile_id = ${profileId} and expires_at > now()
    limit 1
  `;
  const row = rows[0];
  return {
    visible: Boolean(row),
    expiresAt: row ? Date.parse(row.expires_at) : null,
    serviceUuid: WIPP_NEARBY_SERVICE_UUID,
  };
}

export async function resolveNearbyToken(viewerId: string, token: string) {
  await ensureMessagingReady();
  await expireNearby();
  const sql = await getSql();
  const rows = await sql<{ profile_id: string }>`
    select profile_id from wipp_nearby_sessions
    where token_hash = ${hashToken(token)} and expires_at > now()
    limit 1
  `;
  const peerId = rows[0]?.profile_id;
  if (!peerId || peerId === viewerId) return { profile: null };
  if (await isBlocked(viewerId, peerId)) return { profile: null };
  const profs = await sql<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
  }>`
    select id, username, display_name, avatar_url, bio
    from wipp_profiles where id = ${peerId} limit 1
  `;
  const p = profs[0];
  if (!p) return { profile: null };
  return {
    profile: {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
    },
  };
}
