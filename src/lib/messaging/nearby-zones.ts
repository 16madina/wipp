/**
 * À proximité (no Bluetooth): discovery by APPROXIMATE ZONE.
 * - The phone turns its position into a geohash cell and sends only that cell. No coordinates ever
 *   reach the server, and no cell is ever returned to anyone.
 * - One presence row per person, overwritten (no movement history), deleted when Invisible,
 *   at expiry and at sign-out.
 * - Invisible = "others do not see me"; searching stays allowed.
 * - Anti-crawl: server-fixed zone, result cap, rate limits, and a speed limit between searches.
 */
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";
import { cellCenterKm, cellsWithin, isGeohash } from "@/lib/geohash";
import { blockedEither, insertConnectionRequest } from "@/lib/messaging/social";
import { isConnected } from "@/lib/messaging/connection";

export type NearbyConfig = {
  precision: number;
  radiusM: number;
  freshMin: number;
  refreshMin: number;
  maxResults: number;
  perMinute: number;
  perDay: number;
  maxSpeedKmh: number;
  jumpFreeKm: number;
};

const DEFAULTS: NearbyConfig = {
  precision: 7,
  radiusM: 400,
  freshMin: 15,
  refreshMin: 5,
  maxResults: 20,
  perMinute: 6,
  perDay: 120,
  maxSpeedKmh: 150,
  jumpFreeKm: 1.5,
};

let cached: { at: number; value: NearbyConfig } | null = null;

export async function getNearbyConfig(): Promise<NearbyConfig> {
  if (cached && Date.now() - cached.at < 10_000) return cached.value;
  try {
    const sql = await getSql();
    const rows = await sql<{ value: Partial<NearbyConfig> }>`select value from wipp_touch_config where key = ${"nearby"} limit 1`;
    const value = { ...DEFAULTS, ...(rows[0]?.value || {}) };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULTS;
  }
}

type Mode = "15" | "60" | "until_off" | "off";

function parseMode(raw: unknown): Mode {
  const v = String(raw ?? "");
  if (v === "15" || v === "60" || v === "until_off" || v === "off") return v;
  // Older app values: 15 / 60 / -1 / 0.
  if (v === "-1") return "until_off";
  if (v === "0") return "off";
  throw new WippHttpError(400, "bad_mode", "Mode de visibilité invalide.");
}

function cleanCell(cell: unknown, cfg: NearbyConfig): string | null {
  if (cell == null || cell === "") return null;
  const c = String(cell).toLowerCase();
  if (!isGeohash(c, cfg.precision)) throw new WippHttpError(400, "bad_zone", "Zone invalide.");
  return c;
}

async function purgeExpired() {
  const sql = await getSql();
  await sql`delete from wipp_nearby_presence where visible_until is not null and visible_until < now()`;
  // Abandoned "until off" zones are wiped (the visibility choice stays, the old zone does not).
  await sql`update wipp_nearby_presence set cell = null, cell_at = null where cell_at < now() - interval '1 day'`;
}

async function stateOf(meId: string, cfg: NearbyConfig) {
  const sql = await getSql();
  const rows = await sql<{ mode: string; visible_until: string | null; cell_at: string | null }>`
    select mode, visible_until::text, cell_at::text from wipp_nearby_presence where profile_id = ${meId} limit 1
  `;
  const r = rows[0];
  if (!r || (r.visible_until && Date.parse(r.visible_until) <= Date.now())) {
    return { mode: "off" as const, visibleUntil: null, refreshMin: cfg.refreshMin, precision: cfg.precision };
  }
  // Only what the owner needs: the mode and its end. Never the zone.
  return { mode: r.mode as Mode, visibleUntil: r.visible_until ? Date.parse(r.visible_until) : null, refreshMin: cfg.refreshMin, precision: cfg.precision };
}

export async function getNearbyState(meId: string) {
  const cfg = await getNearbyConfig();
  await purgeExpired();
  return stateOf(meId, cfg);
}

/** Ma visibilité. A zone is required to become visible (location given "while using"). */
export async function setNearbyMode(meId: string, input: { mode?: unknown; cell?: unknown }) {
  const cfg = await getNearbyConfig();
  const mode = parseMode(input.mode);
  const sql = await getSql();
  if (mode === "off") {
    await sql`delete from wipp_nearby_presence where profile_id = ${meId}`;
    return stateOf(meId, cfg);
  }
  const cell = cleanCell(input.cell, cfg);
  if (!cell) throw new WippHttpError(400, "zone_required", "Position nécessaire pour être visible.");
  const until = mode === "until_off" ? null : new Date(Date.now() + Number(mode) * 60_000).toISOString();
  await sql`
    insert into wipp_nearby_presence (profile_id, mode, visible_until, cell, cell_at, updated_at)
    values (${meId}, ${mode}, ${until}, ${cell}, now(), now())
    on conflict (profile_id) do update set
      mode = excluded.mode, visible_until = excluded.visible_until,
      cell = excluded.cell, cell_at = now(), updated_at = now()
  `;
  return stateOf(meId, cfg);
}

/** While WIPP is open and I am visible: keep my zone fresh (overwritten, never appended). */
export async function refreshNearbyCell(meId: string, rawCell: unknown) {
  const cfg = await getNearbyConfig();
  const cell = cleanCell(rawCell, cfg);
  if (!cell) throw new WippHttpError(400, "bad_zone", "Zone invalide.");
  const sql = await getSql();
  await sql`
    update wipp_nearby_presence set cell = ${cell}, cell_at = now(), updated_at = now()
    where profile_id = ${meId} and (visible_until is null or visible_until > now())
  `;
  return stateOf(meId, cfg);
}

/** Anti-crawl: per-minute / per-day caps and no "teleporting" between far zones. */
async function guardSearch(meId: string, cell: string, cfg: NearbyConfig) {
  const sql = await getSql();
  const rows = await sql<{ last_cell: string | null; last_at: string | null; minute_start: string; minute_count: number; day_start: string; day_count: number }>`
    select last_cell, last_at::text, minute_start::text, minute_count, day_start::text, day_count
    from wipp_nearby_search_guard where profile_id = ${meId} limit 1
  `;
  const g = rows[0];
  const now = Date.now();
  let minuteStart = now;
  let minuteCount = 0;
  let dayStart = now;
  let dayCount = 0;
  if (g) {
    if (now - Date.parse(g.minute_start) < 60_000) {
      minuteStart = Date.parse(g.minute_start);
      minuteCount = g.minute_count;
    }
    if (now - Date.parse(g.day_start) < 86_400_000) {
      dayStart = Date.parse(g.day_start);
      dayCount = g.day_count;
    }
    if (minuteCount >= cfg.perMinute) throw new WippHttpError(429, "rate_limited", "Trop de recherches. Réessaie dans une minute.");
    if (dayCount >= cfg.perDay) throw new WippHttpError(429, "rate_limited", "Limite de recherches atteinte pour aujourd’hui.");
    if (g.last_cell && g.last_at) {
      const km = cellCenterKm(g.last_cell, cell);
      const hours = Math.max(1 / 3600, (now - Date.parse(g.last_at)) / 3_600_000);
      if (km > cfg.jumpFreeKm && km / hours > cfg.maxSpeedKmh) {
        console.info("[wipp-nearby] search refused (jump)");
        throw new WippHttpError(429, "too_far_too_fast", "Ta position a changé trop vite. Réessaie dans quelques minutes.");
      }
    }
  }
  await sql`
    insert into wipp_nearby_search_guard (profile_id, last_cell, last_at, minute_start, minute_count, day_start, day_count)
    values (${meId}, ${cell}, now(), ${new Date(minuteStart).toISOString()}, ${minuteCount + 1}, ${new Date(dayStart).toISOString()}, ${dayCount + 1})
    on conflict (profile_id) do update set
      last_cell = excluded.last_cell, last_at = excluded.last_at,
      minute_start = excluded.minute_start, minute_count = excluded.minute_count,
      day_start = excluded.day_start, day_count = excluded.day_count
  `;
}

function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

/**
 * Rechercher autour de moi — allowed while Invisible. Returns public cards only:
 * no zone, no distance, no order by distance (shuffled), never me, never a block either way.
 */
export async function searchNearby(meId: string, rawCell: unknown) {
  const cfg = await getNearbyConfig();
  const cell = cleanCell(rawCell, cfg);
  if (!cell) throw new WippHttpError(400, "bad_zone", "Zone invalide.");
  await guardSearch(meId, cell, cfg);
  await purgeExpired();
  const cells = cellsWithin(cell, cfg.radiusM);
  const sql = await getSql();
  const rows = await sql<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null }>`
    select p.id, p.username, p.display_name, p.avatar_url, p.bio
    from wipp_nearby_presence n
    join wipp_profiles p on p.id = n.profile_id
    where n.cell = any(${cells})
      and n.profile_id <> ${meId}
      and (n.visible_until is null or n.visible_until > now())
      and n.cell_at > now() - (${cfg.freshMin} || ' minutes')::interval
      and p.suspended_at is null
      and not exists (
        select 1 from wipp_blocks b
        where (b.blocker_id = ${meId} and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = ${meId})
      )
    limit ${cfg.maxResults * 3}
  `;
  const picked = shuffle(rows).slice(0, cfg.maxResults);
  const ids = picked.map((r) => r.id);
  const connected = ids.length
    ? await sql<{ peer: string }>`
        select case when user_a = ${meId} then user_b else user_a end as peer
        from wipp_connections
        where status = 'active' and (expires_at is null or expires_at > now())
          and ((user_a = ${meId} and user_b = any(${ids})) or (user_b = ${meId} and user_a = any(${ids})))
      `
    : [];
  const pending = ids.length
    ? await sql<{ peer: string; out: boolean }>`
        select case when sender_id = ${meId} then recipient_id else sender_id end as peer, sender_id = ${meId} as out
        from wipp_connection_requests
        where status = 'pending' and expires_at > now()
          and ((sender_id = ${meId} and recipient_id = any(${ids})) or (recipient_id = ${meId} and sender_id = any(${ids})))
      `
    : [];
  const conn = new Set(connected.map((r) => r.peer));
  const pend = new Map(pending.map((r) => [r.peer, r.out]));
  return {
    people: picked.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio ?? "",
      relation: conn.has(r.id) ? "connected" : pend.has(r.id) ? (pend.get(r.id) ? "pending_out" : "pending_in") : "none",
    })),
  };
}

function ringOf(gender: string | null): "man" | "woman" | "other" {
  return gender === "man" || gender === "woman" ? gender : "other";
}

/**
 * Se connecter depuis À proximité: the EXISTING request system with via = 'nearby'.
 * If I am Invisible, the request is marked so my photo is not shown in it (first name + @pseudo stay).
 */
export async function requestFromNearby(meId: string, peerId: string) {
  const id = String(peerId ?? "").replace(/^srvuser:/, "");
  if (!id || id === meId) throw new WippHttpError(400, "invalid", "Profil invalide.");
  const sql = await getSql();
  const peer = await sql<{ id: string; username: string }>`
    select p.id, p.username from wipp_profiles p
    join wipp_nearby_presence n on n.profile_id = p.id
    where p.id = ${id} and p.suspended_at is null and (n.visible_until is null or n.visible_until > now())
    limit 1
  `;
  // No longer visible, unknown, or blocked: one neutral answer (never reveal a block).
  if (!peer[0] || (await blockedEither(meId, id))) return { status: "unavailable" as const };
  if (await isConnected(meId, id)) return { status: "already_connected" as const };
  const pending = await sql<{ sender_id: string }>`
    select sender_id from wipp_connection_requests
    where status = 'pending' and expires_at > now()
      and ((sender_id = ${meId} and recipient_id = ${id}) or (sender_id = ${id} and recipient_id = ${meId}))
    limit 1
  `;
  if (pending[0]) return { status: pending[0].sender_id === meId ? ("already_pending" as const) : ("pending_in" as const) };
  const meRows = await sql<{ display_name: string; username: string; gender: string | null; visible: boolean }>`
    select p.display_name, p.username, p.gender,
           exists (select 1 from wipp_nearby_presence n where n.profile_id = p.id and (n.visible_until is null or n.visible_until > now())) as visible
    from wipp_profiles p where p.id = ${meId} limit 1
  `;
  const me = meRows[0];
  const invisible = !me?.visible;
  const requestId = await insertConnectionRequest(meId, id, "nearby", { senderInvisible: invisible, senderRing: invisible ? ringOf(me?.gender ?? null) : null });
  try {
    const { sendProfilePush } = await import("@/lib/push/notify");
    const first = (me?.display_name ?? "").split(" ")[0] || "WIPP";
    await sendProfilePush({
      profileId: id,
      title: `${first} · @${me?.username ?? ""}`.slice(0, 64),
      body: invisible ? "Demande depuis À proximité · mode Invisible" : "Demande depuis À proximité",
      channelId: "requests",
      data: { type: "request", eventId: requestId, requestId },
    });
  } catch {
    /* the request exists even if the push fails */
  }
  return { status: "sent" as const, id: requestId };
}

/**
 * Declared gender (optional, editable) — read only by the server to pick the Invisible ring colour.
 * Never inferred from a name or a photo, never shown to anyone.
 */
export async function getMyGender(meId: string) {
  const sql = await getSql();
  const rows = await sql<{ gender: string | null }>`select gender from wipp_profiles where id = ${meId} limit 1`;
  const g = rows[0]?.gender;
  return { gender: g === "man" || g === "woman" ? g : null };
}

export async function setMyGender(meId: string, raw: unknown) {
  const g = raw === "man" || raw === "woman" ? raw : null; // anything else = Non renseigné
  const sql = await getSql();
  await sql`update wipp_profiles set gender = ${g} where id = ${meId}`;
  return { gender: g };
}

/** Sign-out / account switch: my presence and search guard disappear at once. */
export async function clearNearby(meId: string) {
  const sql = await getSql();
  await sql`delete from wipp_nearby_presence where profile_id = ${meId}`;
  await sql`delete from wipp_nearby_search_guard where profile_id = ${meId}`;
  return { ok: true };
}
