/**
 * WIPP Touch (no Bluetooth): ephemeral symmetric sessions.
 * Each phone reports a minimal bump signature in server time; the server pairs two sessions
 * whose bumps line up, refuses ambiguous rooms, optionally checks a UWB distance, and creates
 * the connection only after BOTH people accept. Clients never pick who they touched.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError, isBlocked } from "@/lib/messaging/server";

export type TouchSessionConfig = {
  sessionTtlMs: number;
  confirmTtlMs: number;
  bumpWindowMs: number;
  minPeakG: number;
  peakRatioMax: number;
  durDiffMaxMs: number;
  maxRttMs: number;
  uwbMaxCm: number;
  uwbTimeoutMs: number;
  maxBumps: number;
  purgeAfterMs: number;
  detectG: number;
  maxBumpMs: number;
};

export const TOUCH_SESSION_DEFAULTS: TouchSessionConfig = {
  sessionTtlMs: 25_000,
  confirmTtlMs: 45_000,
  bumpWindowMs: 600,
  minPeakG: 1.6,
  peakRatioMax: 3.5,
  durDiffMaxMs: 220,
  maxRttMs: 2_500,
  uwbMaxCm: 30,
  uwbTimeoutMs: 6_000,
  maxBumps: 12,
  purgeAfterMs: 600_000,
  detectG: 0.8,
  maxBumpMs: 250,
};

let cached: { at: number; value: TouchSessionConfig } | null = null;

export async function getTouchSessionConfig(): Promise<TouchSessionConfig> {
  if (cached && Date.now() - cached.at < 5_000) return cached.value;
  try {
    const sql = await getSql();
    const rows = await sql<{ value: Partial<TouchSessionConfig> }>`
      select value from wipp_touch_config where key = ${"session"} limit 1
    `;
    const value = { ...TOUCH_SESSION_DEFAULTS, ...(rows[0]?.value || {}) };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return TOUCH_SESSION_DEFAULTS;
  }
}

type Row = {
  id: string;
  profile_id: string;
  platform: string;
  caps: { motion?: boolean; uwb?: boolean; uwbKind?: string } | null;
  state: string;
  expires_at: string;
  bump_at: string | null;
  bump_peak: number | null;
  bump_dur_ms: number | null;
  bump_count: number;
  peer_session_id: string | null;
  accepted_at: string | null;
  uwb_token: string | null;
  uwb_distance_cm: number | null;
  uwb_status: string | null;
};

const LIVE = ["waiting", "bumped", "candidate"];
const TERMINAL = ["ambiguous", "unavailable", "connected", "already_connected", "declined", "expired", "cancelled", "failed"];

function token(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

function pair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function load(id: string): Promise<Row | null> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select id, profile_id, platform, caps, state, expires_at::text, bump_at::text, bump_peak, bump_dur_ms,
           bump_count, peer_session_id, accepted_at::text, uwb_token, uwb_distance_cm, uwb_status
    from wipp_touch_sessions where id = ${id} limit 1
  `;
  return rows[0] ?? null;
}

/** Load a session the caller owns; anything else looks like "not found" (no enumeration). */
async function own(meId: string, id: string): Promise<Row> {
  const row = await load(id);
  if (!row || row.profile_id !== meId) throw new WippHttpError(404, "not_found", "Session WIPP Touch introuvable.");
  if (LIVE.includes(row.state) && Date.parse(row.expires_at) <= Date.now()) {
    await finish([row.id], "expired");
    return (await load(id))!;
  }
  return row;
}

/** End sessions and wipe their technical data (bump signature, UWB token / distance). */
async function finish(ids: string[], state: string, onlyLive = true) {
  if (!ids.length) return;
  const sql = await getSql();
  if (onlyLive) {
    await sql`
      update wipp_touch_sessions
      set state = ${state}, updated_at = now(), bump_at = null, bump_peak = null, bump_dur_ms = null,
          bump_energy = null, uwb_token = null
      where id = any(${ids}) and state = any(${LIVE})
    `;
  } else {
    await sql`
      update wipp_touch_sessions
      set state = ${state}, updated_at = now(), bump_at = null, bump_peak = null, bump_dur_ms = null,
          bump_energy = null, uwb_token = null
      where id = any(${ids})
    `;
  }
}

async function purge(cfg: TouchSessionConfig) {
  const sql = await getSql();
  await sql`
    update wipp_touch_sessions
    set state = 'expired', updated_at = now(), bump_at = null, bump_peak = null, bump_dur_ms = null,
        bump_energy = null, uwb_token = null
    where state = any(${LIVE}) and expires_at < now()
  `;
  await sql`
    delete from wipp_touch_sessions
    where created_at < now() - (${cfg.purgeAfterMs} || ' milliseconds')::interval
  `;
}

export async function startTouchSession(
  meId: string,
  input: { platform?: string; caps?: { motion?: boolean; uwb?: boolean; uwbKind?: string } },
) {
  const cfg = await getTouchSessionConfig();
  await purge(cfg).catch(() => undefined);
  const sql = await getSql();
  // One live attempt per account: a new screen / account switch invalidates the old one.
  const old = await sql<{ id: string }>`
    select id from wipp_touch_sessions where profile_id = ${meId} and state = any(${LIVE})
  `;
  await finish(old.map((r) => r.id), "cancelled");
  const platform = input.platform === "ios" || input.platform === "android" ? input.platform : "web";
  const caps = {
    motion: Boolean(input.caps?.motion),
    uwb: Boolean(input.caps?.uwb),
    uwbKind: typeof input.caps?.uwbKind === "string" ? input.caps.uwbKind.slice(0, 24) : null,
  };
  const id = `ts_${token(18)}`;
  const nonce = token(24);
  const expires = new Date(Date.now() + cfg.sessionTtlMs);
  await sql`
    insert into wipp_touch_sessions (id, profile_id, nonce, platform, caps, state, expires_at)
    values (${id}, ${meId}, ${nonce}, ${platform}, ${JSON.stringify(caps)}::jsonb, 'waiting', ${expires.toISOString()})
  `;
  return {
    session: { id, state: "waiting", expiresAt: expires.getTime() },
    serverNow: Date.now(),
    config: { bumpWindowMs: cfg.bumpWindowMs, minPeakG: cfg.minPeakG, uwbMaxCm: cfg.uwbMaxCm, uwbTimeoutMs: cfg.uwbTimeoutMs, detectG: cfg.detectG, maxBumpMs: cfg.maxBumpMs },
  };
}

function compatible(cfg: TouchSessionConfig, a: { peak: number; dur: number }, b: { peak: number; dur: number }) {
  if (a.peak < cfg.minPeakG || b.peak < cfg.minPeakG) return false;
  const ratio = Math.max(a.peak, b.peak) / Math.max(0.01, Math.min(a.peak, b.peak));
  if (ratio > cfg.peakRatioMax) return false;
  return Math.abs(a.dur - b.dur) <= cfg.durDiffMaxMs;
}

/**
 * A bump from one phone. `at` is the phone's estimate of SERVER time (offset measured by the app);
 * `rtt` is the round trip used for that estimate, so a bad estimate can be refused.
 */
export async function reportTouchBump(
  meId: string,
  id: string,
  input: { at?: number; peak?: number; durMs?: number; energy?: number; rtt?: number },
) {
  const cfg = await getTouchSessionConfig();
  const me = await own(meId, id);
  if (me.state !== "waiting" && me.state !== "bumped") return view(meId, me.id);
  if (me.bump_count >= cfg.maxBumps) throw new WippHttpError(429, "rate_limited", "Trop de tentatives.");
  const at = Number(input.at);
  const peak = Number(input.peak);
  const dur = Math.round(Number(input.durMs));
  const rtt = Number(input.rtt ?? 0);
  const now = Date.now();
  // Reject stale / future events (replay or broken clock) and estimates with a huge round trip.
  if (!Number.isFinite(at) || Math.abs(now - at) > 5_000) throw new WippHttpError(400, "invalid", "Événement invalide.");
  if (!Number.isFinite(peak) || peak <= 0 || peak > 40 || !Number.isFinite(dur) || dur < 0 || dur > 2_000) {
    throw new WippHttpError(400, "invalid", "Événement invalide.");
  }
  if (!Number.isFinite(rtt) || rtt > cfg.maxRttMs) throw new WippHttpError(409, "slow_network", "Réseau trop lent pour WIPP Touch.");
  const energy = Number.isFinite(Number(input.energy)) ? Number(input.energy) : null;

  const sql = await getSql();
  await sql`
    update wipp_touch_sessions
    set state = 'bumped', bump_at = ${Math.round(at)}, bump_peak = ${peak}, bump_dur_ms = ${dur},
        bump_energy = ${energy}, bump_count = bump_count + 1, updated_at = now()
    where id = ${me.id} and state in ('waiting', 'bumped')
  `;
  if (peak < cfg.minPeakG) return view(meId, me.id);

  const win = cfg.bumpWindowMs;
  // Every other live session that bumped inside the window (any state that could still pair).
  const near = await sql<{ id: string; profile_id: string; state: string; bump_peak: number; bump_dur_ms: number; peer_session_id: string | null }>`
    select id, profile_id, state, bump_peak, bump_dur_ms, peer_session_id
    from wipp_touch_sessions
    where id <> ${me.id}
      and profile_id <> ${meId}
      and state in ('bumped', 'candidate')
      and expires_at > now()
      and bump_at between ${Math.round(at) - win} and ${Math.round(at) + win}
  `;
  const fits = near.filter((s) => compatible(cfg, { peak, dur }, { peak: s.bump_peak, dur: s.bump_dur_ms }));
  if (!fits.length) return view(meId, me.id);

  // More than one phone bumped at the same instant (or a pair already formed in that instant):
  // we cannot tell who touched whom → nobody is paired, everyone gets the QR.
  if (fits.length > 1 || fits[0]!.state === "candidate") {
    const ids = new Set<string>([me.id]);
    for (const s of fits) {
      ids.add(s.id);
      if (s.peer_session_id) ids.add(s.peer_session_id);
    }
    await sql`
      update wipp_touch_sessions
      set state = 'ambiguous', updated_at = now(), bump_at = null, bump_peak = null, bump_dur_ms = null,
          bump_energy = null, uwb_token = null
      where id = any(${[...ids]}) and state in ('bumped', 'candidate') and accepted_at is null
    `;
    return view(meId, me.id);
  }

  const other = fits[0]!;
  const confirmUntil = new Date(Date.now() + cfg.confirmTtlMs).toISOString();
  // Pair both rows in one statement; each row re-checks it is still free under its row lock.
  const updated = await sql<{ id: string }>`
    update wipp_touch_sessions
    set state = 'candidate',
        peer_session_id = case when id = ${me.id} then ${other.id} else ${me.id} end,
        expires_at = ${confirmUntil}, updated_at = now()
    where id in (${me.id}, ${other.id}) and state = 'bumped' and peer_session_id is null
    returning id
  `;
  let paired = updated.length === 2;
  if (!paired && updated.length === 1) {
    // Lost a race with another pairing: undo the half pair.
    await sql`update wipp_touch_sessions set state = 'bumped', peer_session_id = null where id = ${updated[0]!.id} and accepted_at is null`;
    paired = false;
  }
  if (paired && (await isBlocked(meId, other.profile_id))) {
    // Neutral for both sides: never reveal a block.
    await finish([me.id, other.id], "unavailable");
  }
  return view(meId, me.id);
}

async function profileCard(profileId: string) {
  const sql = await getSql();
  const rows = await sql<{ username: string; display_name: string; avatar_url: string | null }>`
    select username, display_name, avatar_url from wipp_profiles where id = ${profileId} limit 1
  `;
  const p = rows[0];
  // Public identity only: no phone, e-mail, firebase uid or internal id.
  return p ? { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url } : null;
}

export async function view(meId: string, id: string) {
  const cfg = await getTouchSessionConfig();
  const me = await own(meId, id);
  const peer = me.peer_session_id ? await load(me.peer_session_id) : null;
  const bothUwb = Boolean(me.caps?.uwb && peer?.caps?.uwb && me.caps?.uwbKind && me.caps.uwbKind === peer?.caps?.uwbKind);
  const inPair = me.state === "candidate" || me.state === "connected" || me.state === "already_connected";
  return {
    serverNow: Date.now(),
    session: {
      id: me.id,
      state: me.state,
      expiresAt: Date.parse(me.expires_at),
      acceptedByMe: Boolean(me.accepted_at),
      acceptedByPeer: Boolean(peer?.accepted_at),
      peer: inPair && peer ? await profileCard(peer.profile_id) : null,
      uwb: inPair && bothUwb
        ? {
            peerToken: me.state === "candidate" ? peer?.uwb_token ?? null : null,
            myStatus: me.uwb_status,
            peerStatus: peer?.uwb_status ?? null,
            maxCm: cfg.uwbMaxCm,
            timeoutMs: cfg.uwbTimeoutMs,
          }
        : null,
    },
  };
}

/** Exchange the ephemeral Nearby Interaction discovery token through WIPP (out-of-band, no Bluetooth). */
export async function postTouchUwbToken(meId: string, id: string, tokenB64: string) {
  const me = await own(meId, id);
  if (me.state !== "candidate") return view(meId, id);
  if (typeof tokenB64 !== "string" || tokenB64.length < 16 || tokenB64.length > 4_096 || !/^[A-Za-z0-9+/=_-]+$/.test(tokenB64)) {
    throw new WippHttpError(400, "invalid", "Jeton invalide.");
  }
  const sql = await getSql();
  await sql`update wipp_touch_sessions set uwb_token = ${tokenB64}, uwb_status = coalesce(uwb_status, 'pending'), updated_at = now() where id = ${me.id} and state = 'candidate'`;
  return view(meId, id);
}

/** The phone's own UWB measurement. "far" on either side ends the pair: it was not this person. */
export async function postTouchUwbResult(meId: string, id: string, input: { distanceCm?: number | null; status?: string }) {
  const cfg = await getTouchSessionConfig();
  const me = await own(meId, id);
  if (me.state !== "candidate") return view(meId, id);
  const d = input.distanceCm == null ? null : Number(input.distanceCm);
  let status: "near" | "far" | "unavailable" = "unavailable";
  if (d != null && Number.isFinite(d) && d >= 0) status = d <= cfg.uwbMaxCm ? "near" : "far";
  else if (input.status === "unavailable") status = "unavailable";
  const sql = await getSql();
  await sql`update wipp_touch_sessions set uwb_status = ${status}, uwb_distance_cm = ${d}, uwb_token = null, updated_at = now() where id = ${me.id} and state = 'candidate'`;
  if (status === "far" && me.peer_session_id) await finish([me.id, me.peer_session_id], "failed");
  return view(meId, id);
}

export async function acceptTouchSession(meId: string, id: string) {
  const me = await own(meId, id);
  if (me.state !== "candidate" || !me.peer_session_id) return view(meId, id);
  const sql = await getSql();
  await sql`
    update wipp_touch_sessions set accepted_at = coalesce(accepted_at, now()), updated_at = now()
    where id = ${me.id} and state = 'candidate' and coalesce(uwb_status, '') <> 'far'
  `;
  // Read AFTER my write: of two simultaneous accepts, the later reader always sees both.
  const rows = await sql<{ id: string; profile_id: string; state: string; accepted_at: string | null }>`
    select id, profile_id, state, accepted_at::text from wipp_touch_sessions
    where id in (${me.id}, ${me.peer_session_id})
  `;
  const mine = rows.find((r) => r.id === me.id);
  const peerRow = rows.find((r) => r.id !== me.id);
  const result =
    !mine || !peerRow || mine.state !== "candidate" || peerRow.state !== "candidate"
      ? ("stale" as const)
      : !mine.accepted_at || !peerRow.accepted_at
        ? ("waiting" as const)
        : { peerProfile: peerRow.profile_id, peerId: peerRow.id };
  if (result === "stale" || result === "waiting") return view(meId, id);
  // Both accepted: create the connection in the existing WIPP Connect tables.
  if (await isBlocked(meId, result.peerProfile)) {
    await finish([me.id, result.peerId], "unavailable");
    return view(meId, id);
  }
  const [userA, userB] = pair(meId, result.peerProfile);
  const inserted = await sql<{ id: string }>`
    insert into wipp_connections (id, user_a, user_b, via)
    values (${randomUUID()}, ${userA}, ${userB}, 'touch')
    on conflict (user_a, user_b) do nothing
    returning id::text
  `;
  const state = inserted[0] ? "connected" : "already_connected";
  // Any pending request between them is now settled.
  await sql`
    update wipp_connection_requests set status = 'accepted', responded_at = now()
    where status = 'pending'
      and ((sender_id = ${meId} and recipient_id = ${result.peerProfile})
        or (sender_id = ${result.peerProfile} and recipient_id = ${meId}))
  `.catch(() => undefined);
  await sql`
    update wipp_touch_sessions
    set state = ${state}, connection_id = ${inserted[0]?.id ?? null}, updated_at = now(),
        bump_at = null, bump_peak = null, bump_dur_ms = null, bump_energy = null, uwb_token = null
    where id in (${me.id}, ${result.peerId}) and state = 'candidate'
  `;
  return view(meId, id);
}

export async function declineTouchSession(meId: string, id: string) {
  const me = await own(meId, id);
  const ids = [me.id, ...(me.peer_session_id ? [me.peer_session_id] : [])];
  await finish(ids, "declined");
  return view(meId, id);
}

export async function cancelTouchSession(meId: string, id: string, diag?: { spikes?: number; maxPeak?: number } | null) {
  const me = await own(meId, id);
  if (diag && Number.isFinite(Number(diag.spikes))) {
    // Calibration only (no raw motion): how many spikes the phone felt and the strongest one.
    const d = { spikes: Math.min(999, Number(diag.spikes) | 0), maxPeak: Math.round(Number(diag.maxPeak) * 100) / 100 };
    const sql = await getSql();
    await sql`update wipp_touch_sessions set caps = caps || ${JSON.stringify({ diag: d })}::jsonb where id = ${me.id}`;
    console.info("[wipp-touch] diag", me.platform, d);
  }
  if (me.state === "candidate" && me.peer_session_id) {
    // Leaving during confirmation = a refusal for the other person.
    await finish([me.id, me.peer_session_id], "declined");
  } else {
    await finish([me.id], "cancelled");
  }
  return { ok: true };
}

export const TOUCH_SESSION_TERMINAL = TERMINAL;
