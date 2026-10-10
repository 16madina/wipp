/**
 * Événements en ligne WIPP (conférences / masterclass) — tout est vérifié ici, côté serveur.
 * - Le direct est rattaché à un wipp_events (organisateur = owner_id) : pas de second système d'événements.
 * - Rôles LiveKit : organisateur et intervenants publient ; les spectateurs regardent seulement.
 * - Commentaires et réactions passent par les messages de données LiveKit (rien n'est enregistré, pas de replay).
 * - Exclure / couper les commentaires agit aussi dans LiveKit (permissions, retrait de la salle).
 */
import { createHash, randomBytes } from "node:crypto";
import { AccessToken, DataPacket_Kind, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { getSql } from "@/lib/db";
import { liveKitEnv } from "@/lib/livekit/config";
import { WippHttpError } from "@/lib/messaging/server";

type LiveRow = {
  event_id: string;
  owner_id: string;
  title: string;
  starts_at: string | null;
  status: string;
  visibility: "public" | "private";
  mode: "conference" | "interactive";
  state: "scheduled" | "live" | "ended" | "cancelled";
  duration_min: number;
  max_viewers: number;
  max_speakers: number;
  comments_on: boolean;
  reactions_on: boolean;
  questions_on: boolean;
  started_at: string | null;
  ended_at: string | null;
  qa_mode: boolean;
  spotlight_id: string | null;
  featured_identity: string | null;
  stage_layout: "shared" | "dominant" | "inset";
  host_seen_at: string | null;
  host_absent_since: string | null;
  host_warned: number;
  share_notify: boolean;
};

const ROOM_PREFIX = "wipp-live-";
/** A started live ends by itself after its planned duration + 2 h (forgotten « Terminer »). */
const OVERRUN_MS = 2 * 3600_000;

function roomOf(eventId: string) {
  return `${ROOM_PREFIX}${eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}`;
}
function identityOf(profileId: string) {
  return `p_${profileId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
}
function hashInvite(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function roomService() {
  const env = liveKitEnv();
  if (!env.configured || !env.url || !env.apiKey || !env.apiSecret) return null;
  return new RoomServiceClient(env.url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), env.apiKey, env.apiSecret);
}

async function loadLive(eventId: string): Promise<LiveRow> {
  const sql = await getSql();
  const rows = await sql<LiveRow>`
    select l.event_id, e.owner_id, e.title, e.starts_at::text, e.status, l.visibility, l.mode, l.state,
           l.duration_min, l.max_viewers, l.max_speakers, l.comments_on, l.reactions_on, l.questions_on,
           l.started_at::text, l.ended_at::text, l.qa_mode, l.spotlight_id, l.featured_identity, l.stage_layout, l.share_notify,
           l.host_seen_at::text, l.host_absent_since::text, l.host_warned
    from wipp_event_lives l join wipp_events e on e.id = l.event_id
    where l.event_id = ${eventId} limit 1
  `;
  const row = rows[0];
  if (!row || row.status !== "active") throw new WippHttpError(404, "not_found", "Événement introuvable.");
  // A live left open far past its time is closed automatically.
  if (row.state === "live" && row.started_at && Date.now() - Date.parse(row.started_at) > row.duration_min * 60_000 + OVERRUN_MS) {
    await sql`update wipp_event_lives set state = 'ended', ended_at = now(), updated_at = now() where event_id = ${eventId} and state = 'live'`;
    row.state = "ended";
  }
  return row;
}

async function memberOf(eventId: string, profileId: string) {
  const sql = await getSql();
  const rows = await sql<{ status: string; role: string; mic_revoked: boolean; cam_revoked: boolean }>`
    select status, role, mic_revoked, cam_revoked from wipp_event_live_members where event_id = ${eventId} and profile_id = ${profileId} limit 1
  `;
  return rows[0] ?? null;
}

function assertOwner(live: LiveRow, meId: string) {
  if (live.owner_id !== meId) throw new WippHttpError(403, "forbidden", "Réservé à l’organisateur.");
}

/** Can this person see / join this live at all (private lives, exclusions, blocks)? */
async function assertCanSee(live: LiveRow, meId: string) {
  if (live.owner_id === meId) return;
  const m = await memberOf(live.event_id, meId);
  if (m?.status === "banned") throw new WippHttpError(403, "banned", "L’organisateur t’a retiré(e) de cet événement.");
  const { isBlocked } = await import("@/lib/messaging/server");
  if (await isBlocked(live.owner_id, meId)) throw new WippHttpError(403, "blocked", "Événement indisponible.");
  if (live.visibility === "private" && !m) throw new WippHttpError(403, "private", "Cet événement est sur invitation.");
}

/** Called right after the event itself is saved (wipp_events): attaches / updates its WIPP live. */
export async function saveEventLive(
  meId: string,
  eventId: string,
  input: { visibility?: string; mode?: string; durationMin?: number; maxViewers?: number; showRegistered?: boolean },
) {
  const sql = await getSql();
  const ev = await sql<{ owner_id: string }>`select owner_id from wipp_events where id = ${eventId} limit 1`;
  if (!ev[0]) throw new WippHttpError(404, "not_found", "Événement introuvable.");
  if (ev[0].owner_id !== meId) throw new WippHttpError(403, "forbidden", "Réservé à l’organisateur.");
  const visibility = input.visibility === "private" ? "private" : "public";
  const mode = input.mode === "interactive" ? "interactive" : "conference";
  const duration = Math.min(480, Math.max(10, Math.round(Number(input.durationMin) || 60)));
  // Safe first limit until real load tests: 100 viewers.
  const maxViewers = Math.min(100, Math.max(2, Math.round(Number(input.maxViewers) || 100)));
  const showRegistered = input.showRegistered !== false;
  await sql`
    insert into wipp_event_lives (event_id, visibility, mode, duration_min, max_viewers, show_registered)
    values (${eventId}, ${visibility}, ${mode}, ${duration}, ${maxViewers}, ${showRegistered})
    on conflict (event_id) do update set visibility = excluded.visibility, mode = excluded.mode,
      duration_min = excluded.duration_min, max_viewers = excluded.max_viewers,
      show_registered = excluded.show_registered, updated_at = now()
  `;
  // The event is « online » (no address) and free in this first version.
  await sql`update wipp_events set is_online = true, is_free = true, online_url = null, updated_at = now() where id = ${eventId}`;
  return getEventLive(meId, eventId);
}

export async function getEventLive(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const hostAbsentSince = live.owner_id === meId ? null : await checkHostPresence(live).catch(() => null);
  const sql = await getSql();
  const counts = await sql<{ registered: number }>`
    select count(*)::int as registered from wipp_event_live_members where event_id = ${eventId} and status = 'registered'
  `;
  const m = await memberOf(eventId, meId);
  const isOwner = live.owner_id === meId;
  return {
    eventId,
    title: live.title,
    startsAt: live.starts_at,
    visibility: live.visibility,
    mode: live.mode,
    state: live.state,
    durationMin: live.duration_min,
    maxViewers: live.max_viewers,
    commentsOn: live.comments_on,
    reactionsOn: live.reactions_on,
    questionsOn: live.questions_on,
    registered: Number(counts[0]?.registered ?? 0),
    myStatus: isOwner ? "organizer" : (m?.status ?? null),
    isOwner,
    // Organizer missing from the room since… (null = present). The live ends 5 min later.
    hostAbsentSince,
    hostGraceMs: HOST_GRACE_MS,
  };
}

export async function registerEventLive(meId: string, eventId: string, on: boolean) {
  const live = await loadLive(eventId);
  if (live.owner_id === meId) return getEventLive(meId, eventId);
  await assertCanSee(live, meId);
  const sql = await getSql();
  if (on) {
    if (live.state === "ended" || live.state === "cancelled") throw new WippHttpError(409, "closed", "Cet événement est terminé.");
    await sql`
      insert into wipp_event_live_members (event_id, profile_id, status) values (${eventId}, ${meId}, 'registered')
      on conflict (event_id, profile_id) do update set status = 'registered', updated_at = now()
      where wipp_event_live_members.status <> 'banned'
    `;
  } else if (live.visibility === "private") {
    // Private: unregistering keeps the invitation, so the person can come back.
    await sql`update wipp_event_live_members set status = 'invited', updated_at = now() where event_id = ${eventId} and profile_id = ${meId} and status = 'registered'`;
  } else {
    await sql`delete from wipp_event_live_members where event_id = ${eventId} and profile_id = ${meId} and status = 'registered'`;
  }
  return getEventLive(meId, eventId);
}

/** Invite WIPP contacts by @pseudo (private or public). */
export async function inviteToEventLive(meId: string, eventId: string, usernames: string[]) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const names = [...new Set(usernames.map((u) => String(u).trim().replace(/^@/, "").toLowerCase()).filter(Boolean))].slice(0, 50);
  let invited = 0;
  for (const name of names) {
    const rows = await sql<{ id: string }>`select id from wipp_profiles where lower(username) = ${name} and suspended_at is null limit 1`;
    const id = rows[0]?.id;
    if (!id || id === meId) continue;
    const res = await sql<{ profile_id: string }>`
      insert into wipp_event_live_members (event_id, profile_id, status, invited_by) values (${eventId}, ${id}, 'invited', ${meId})
      on conflict (event_id, profile_id) do nothing returning profile_id
    `;
    if (res[0]) {
      invited += 1;
      void notifyLive(id, eventId, live.title, "Tu es invité(e) à un événement en ligne WIPP");
    }
  }
  return { invited };
}

/** New invitation link (the previous one stops working). Shown to the organizer only. */
export async function newInviteLink(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const token = randomBytes(18).toString("base64url");
  const sql = await getSql();
  await sql`update wipp_event_lives set invite_hash = ${hashInvite(token)}, updated_at = now() where event_id = ${eventId}`;
  return { url: `https://wippapp.com/e/${encodeURIComponent(eventId)}?k=${token}` };
}

export async function revokeInviteLink(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  await sql`update wipp_event_lives set invite_hash = null, updated_at = now() where event_id = ${eventId}`;
  return { ok: true };
}

export async function acceptInviteLink(meId: string, eventId: string, token: string) {
  const live = await loadLive(eventId);
  const sql = await getSql();
  const rows = await sql<{ invite_hash: string | null }>`select invite_hash from wipp_event_lives where event_id = ${eventId} limit 1`;
  if (!rows[0]?.invite_hash || rows[0].invite_hash !== hashInvite(String(token))) {
    throw new WippHttpError(403, "invalid_link", "Ce lien d’invitation n’est plus valide.");
  }
  if (live.state === "ended" || live.state === "cancelled") throw new WippHttpError(409, "closed", "Cet événement est terminé.");
  if (live.owner_id !== meId) {
    await sql`
      insert into wipp_event_live_members (event_id, profile_id, status) values (${eventId}, ${meId}, 'invited')
      on conflict (event_id, profile_id) do nothing
    `;
  }
  return getEventLive(meId, eventId);
}

export async function startEventLive(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  if (live.state === "ended" || live.state === "cancelled") throw new WippHttpError(409, "closed", "Cet événement est terminé.");
  const sql = await getSql();
  if (live.state !== "live") {
    await sql`update wipp_event_lives set state = 'live', started_at = now(), ended_at = null, host_seen_at = null, host_absent_since = null, host_warned = 0, updated_at = now() where event_id = ${eventId}`;
    // Limited keeping: questions of lives ended more than 30 days ago are removed.
    await sql`
      delete from wipp_event_live_questions q using wipp_event_lives l
      where q.event_id = l.event_id and l.state in ('ended', 'cancelled') and l.ended_at < now() - interval '30 days'
    `.catch(() => undefined);
    // Registered people get ONE notification when it starts (no notification spam).
    const people = await sql<{ profile_id: string }>`
      select profile_id from wipp_event_live_members where event_id = ${eventId} and status = 'registered' limit 500
    `;
    for (const p of people) void notifyLive(p.profile_id, eventId, live.title, "C’est en direct ! Rejoins l’événement.");
  }
  return getEventLive(meId, eventId);
}

export async function endEventLive(meId: string, eventId: string, cancel = false) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  await closeLive(live, cancel);
  return getEventLive(meId, eventId);
}

/** Ends a live for everyone (organizer, or the server when the organizer has been gone too long). */
async function closeLive(live: LiveRow, cancel = false) {
  const eventId = live.event_id;
  const sql = await getSql();
  await sql`
    update wipp_event_lives set state = ${cancel && live.state === "scheduled" ? "cancelled" : "ended"}, ended_at = now(),
      spotlight_id = null, qa_mode = false, featured_identity = null, sharing_since = null, updated_at = now()
    where event_id = ${eventId}
  `;
  await sql`
    update wipp_event_live_members set role = case when role = 'speaker' then 'viewer' else role end,
      hand_raised_at = null, stage_invited_at = null, stage_since = null
    where event_id = ${eventId}
  `;
  // Everyone switches to the end screen at once, then the LiveKit room is closed.
  await broadcast(eventId, { t: "ended" });
  const rs = roomService();
  if (rs) await rs.deleteRoom(roomOf(eventId)).catch(() => undefined);
}

/** Organizer gone (battery, network, app closed): the live ends by itself after this long. */
export const HOST_GRACE_MS = 5 * 60_000;

/** A host on a recent app says « I am here » every 30 s; older than this = he left his live. */
const HOST_BEAT_STALE_MS = 75_000;

/**
 * Is the organizer really in his live? Notes since when he is missing, clears it when he is back, warns HIM
 * by push (1 min after he left, then 1 min before the end) and ends the live after HOST_GRACE_MS.
 * - recent app: the host's phone confirms every 30 s (WIPP open on the live, or screen sharing);
 * - older app (never confirmed): present = still connected to the LiveKit room.
 * Called every minute by Supabase pg_cron, by the viewers' heartbeat and before any join.
 */
async function checkHostPresence(live: LiveRow): Promise<string | null> {
  if (live.state !== "live") return null;
  const sql = await getSql();
  let present = false;
  if (live.host_seen_at) {
    present = Date.now() - Date.parse(live.host_seen_at) < HOST_BEAT_STALE_MS;
  } else {
    const rs = roomService();
    if (!rs) return null;
    let empty = true;
    try {
      const people = await rs.listParticipants(roomOf(live.event_id));
      present = people.some((p) => p.identity === identityOf(live.owner_id));
      empty = people.length === 0;
    } catch {
      present = false; // no room at all = nobody there
    }
    // Nobody at all in the room and started more than 2 min ago: close it now.
    if (empty && live.started_at && Date.now() - Date.parse(live.started_at) > 2 * 60_000) {
      await closeLive(live);
      live.state = "ended";
      return null;
    }
  }
  if (present) {
    await sql`update wipp_event_lives set host_absent_since = null, host_warned = 0 where event_id = ${live.event_id} and (host_absent_since is not null or host_warned <> 0)`;
    return null;
  }
  const rows = await sql<{ since: string }>`
    update wipp_event_lives set host_absent_since = coalesce(host_absent_since, now())
    where event_id = ${live.event_id} and state = 'live' returning host_absent_since::text as since
  `;
  const since = rows[0]?.since ?? null;
  if (!since) return null;
  const gone = Date.now() - Date.parse(since);
  if (gone > HOST_GRACE_MS) {
    await closeLive(live);
    live.state = "ended";
    await notifyLive(live.owner_id, live.event_id, "Ton direct est terminé", `« ${live.title} » a été arrêté automatiquement après 5 minutes sans toi.`);
    return null;
  }
  // One warning of each kind per absence (atomic: two runs at the same moment send one push).
  const step = gone >= HOST_GRACE_MS - 75_000 ? 2 : gone >= 45_000 ? 1 : 0;
  if (step) {
    const won = await sql<{ ok: number }>`
      update wipp_event_lives set host_warned = ${step}
      where event_id = ${live.event_id} and state = 'live' and host_absent_since is not null and host_warned < ${step}
      returning 1 as ok
    `;
    if (won.length) {
      const left = Math.max(1, Math.round((HOST_GRACE_MS - gone) / 60_000));
      await notifyLive(
        live.owner_id,
        live.event_id,
        step === 2 ? "Ton direct va s’arrêter" : "Tu as laissé un direct en cours",
        step === 2
          ? `Reviens dans « ${live.title} » : il s’arrête automatiquement dans ${left} minute${left > 1 ? "s" : ""}.`
          : `Touche pour reprendre « ${live.title} ». Sinon il s’arrêtera automatiquement dans ${left} minutes.`,
      );
    }
  }
  return since;
}

/** Host's phone, every 30 s while WIPP shows his live (or shares his screen): « I am here ». */
export async function hostBeat(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  if (live.state !== "live") return { ok: false, state: live.state };
  const sql = await getSql();
  await sql`update wipp_event_lives set host_seen_at = now(), host_absent_since = null, host_warned = 0 where event_id = ${eventId} and state = 'live'`;
  return { ok: true, state: live.state };
}

/** « Reprendre le live »: the live I am hosting right now, if any. */
export async function myActiveLive(meId: string) {
  const sql = await getSql();
  const rows = await sql<{ event_id: string; title: string; since: string | null }>`
    select l.event_id, e.title, l.host_absent_since::text as since
    from wipp_event_lives l join wipp_events e on e.id = l.event_id
    where e.owner_id = ${meId} and l.state = 'live' order by l.started_at desc limit 1
  `;
  const r = rows[0];
  if (!r) return { live: null };
  return { live: { eventId: r.event_id, title: r.title, endsAt: r.since ? new Date(Date.parse(r.since) + HOST_GRACE_MS).toISOString() : null } };
}

/** Called every minute by Supabase pg_cron (secret checked here): every running live, even with no viewer. */
export async function runLivePresence(secret: string) {
  const sql = await getSql();
  const ok = await sql<{ ok: boolean }>`select exists (select 1 from wipp_cron_secrets where name = 'live' and secret = ${secret}) as ok`;
  if (!ok[0]?.ok) throw new WippHttpError(403, "forbidden", "Accès refusé.");
  const ids = await sql<{ event_id: string }>`select event_id from wipp_event_lives where state = 'live' limit 200`;
  let ended = 0;
  for (const { event_id } of ids) {
    try {
      const live = await loadLive(event_id);
      await checkHostPresence(live);
      if (live.state === "ended") ended += 1;
    } catch {
      /* one live never blocks the others */
    }
  }
  return { lives: ids.length, ended };
}

/** Short-lived token for the live room. The role decides what LiveKit lets the person do. */
export async function eventLiveToken(meId: string, eventId: string, displayName: string, avatar?: string | null) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const isOwner = live.owner_id === meId;
  if (!isOwner) await checkHostPresence(live).catch(() => null);
  if (live.state !== "live" && !(isOwner && live.state === "scheduled")) {
    throw new WippHttpError(409, "not_live", live.state === "scheduled" ? "Le direct n’a pas encore commencé." : "Ce direct est terminé.");
  }
  const m = await memberOf(eventId, meId);
  if (!isOwner && live.visibility === "private" && !m) throw new WippHttpError(403, "private", "Cet événement est sur invitation.");
  const env = liveKitEnv();
  if (!env.configured || !env.url || !env.apiKey || !env.apiSecret) throw new WippHttpError(503, "livekit", "Le direct est indisponible pour le moment.");
  const room = roomOf(eventId);
  // Capacity: viewers are counted in LiveKit (the organizer always gets in).
  if (!isOwner) {
    const rs = roomService();
    const count = rs ? (await rs.listParticipants(room).catch(() => [])).length : 0;
    if (count >= live.max_viewers + live.max_speakers) throw new WippHttpError(409, "full", "Le direct est complet.");
  }
  const speaker = isOwner || m?.role === "speaker";
  // Real presence (the end-of-live review is only open to people who came in).
  if (!isOwner) {
    const sql = await getSql();
    await sql`
      insert into wipp_event_live_attendance (event_id, profile_id) values (${eventId}, ${meId})
      on conflict (event_id, profile_id) do update set last_joined_at = now()
    `.catch(() => undefined);
  }
  const at = new AccessToken(env.apiKey, env.apiSecret, {
    identity: identityOf(meId),
    name: displayName.slice(0, 60) || "WIPP",
    ttl: "15m",
    // pid: lets others report this person (WIPP profile id, never a phone number).
    metadata: JSON.stringify({ role: isOwner ? "organizer" : speaker ? "speaker" : "viewer", pid: meId, av: avatar && avatar.length < 300 ? avatar : undefined }),
  });
  at.addGrant({
    roomJoin: true,
    room,
    canSubscribe: true,
    // Speakers: only the sources the organizer has not taken back (a reconnection keeps the same limits).
    canPublish: speaker,
    canPublishSources: isOwner
      ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : speaker
        ? [...(m?.cam_revoked ? [] : [TrackSource.CAMERA]), ...(m?.mic_revoked ? [] : [TrackSource.MICROPHONE])]
        : [],
    // Reactions only (comments go through the server: filter, anti-spam, on/off).
    canPublishData: isOwner || live.reactions_on,
    canUpdateOwnMetadata: false,
  });
  return {
    url: env.url,
    token: await at.toJwt(),
    room,
    identity: identityOf(meId),
    role: isOwner ? "organizer" : speaker ? "speaker" : "viewer",
    ownerIdentity: identityOf(live.owner_id),
    settings: { commentsOn: live.comments_on, reactionsOn: live.reactions_on, questionsOn: live.questions_on, qaMode: live.qa_mode, mode: live.mode },
    pid: meId,
  };
}

/** Organizer settings (comments / reactions / questions on-off), applied live to everyone. */
export async function setEventLiveSettings(
  meId: string,
  eventId: string,
  input: { commentsOn?: boolean; reactionsOn?: boolean; questionsOn?: boolean; qaMode?: boolean },
) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const commentsOn = typeof input.commentsOn === "boolean" ? input.commentsOn : live.comments_on;
  const reactionsOn = typeof input.reactionsOn === "boolean" ? input.reactionsOn : live.reactions_on;
  const questionsOn = typeof input.questionsOn === "boolean" ? input.questionsOn : live.questions_on;
  const qaMode = typeof input.qaMode === "boolean" ? input.qaMode : live.qa_mode;
  await sql`
    update wipp_event_lives set comments_on = ${commentsOn}, reactions_on = ${reactionsOn}, questions_on = ${questionsOn},
      qa_mode = ${qaMode}, updated_at = now()
    where event_id = ${eventId}
  `;
  await broadcast(eventId, { t: "settings", commentsOn, reactionsOn, questionsOn, qaMode });
  return { commentsOn, reactionsOn, questionsOn, qaMode };
}

// ——— Étape C : scène (mains levées, invitations, intervenants) ———

const INVITE_TTL_MS = 60_000;
const handToggles = new Map<string, number>();

type StageRow = {
  profile_id: string;
  role: string;
  hand_raised_at: string | null;
  stage_invited_at: string | null;
  stage_since: string | null;
  mic_revoked: boolean;
  cam_revoked: boolean;
  display_name: string;
  username: string;
  avatar_url: string | null;
};

function inviteLive(at: string | null) {
  return Boolean(at && Date.now() - Date.parse(at) < INVITE_TTL_MS);
}

/** Atomic LiveKit permissions for a participant (viewer = read-only, reactions only). */
async function applyPermissions(live: LiveRow, profileId: string, speaker: boolean, micRevoked: boolean, camRevoked: boolean) {
  const rs = roomService();
  if (!rs) return;
  const sources = speaker ? [...(camRevoked ? [] : [TrackSource.CAMERA]), ...(micRevoked ? [] : [TrackSource.MICROPHONE])] : [];
  await rs
    .updateParticipant(roomOf(live.event_id), identityOf(profileId), {
      metadata: JSON.stringify({ role: speaker ? "speaker" : "viewer", pid: profileId }),
      permission: {
        canSubscribe: true,
        canPublish: speaker && sources.length > 0,
        canPublishSources: sources,
        canPublishData: live.reactions_on,
        canUpdateMetadata: false,
        hidden: false,
      },
    })
    .catch(() => undefined); // not in the room right now: the next token carries the same rights
}

async function stageRows(eventId: string) {
  const sql = await getSql();
  return sql<StageRow>`
    select m.profile_id, m.role, m.hand_raised_at::text, m.stage_invited_at::text, m.stage_since::text, m.mic_revoked, m.cam_revoked,
           p.display_name, p.username, p.avatar_url
    from wipp_event_live_members m join wipp_profiles p on p.id = m.profile_id
    where m.event_id = ${eventId} and m.status <> 'banned'
      and (m.role = 'speaker' or m.hand_raised_at is not null or m.stage_invited_at is not null)
  `;
}

async function freeSeats(live: LiveRow) {
  const rows = await stageRows(live.event_id);
  const taken = rows.filter((r) => r.role === "speaker" || inviteLive(r.stage_invited_at)).length;
  return live.max_speakers - 1 - taken; // the organizer always has a seat
}

/** Who is on stage, raised hands and invitations (organizer); my own state (everyone). */
export async function liveStage(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const isOwner = live.owner_id === meId;
  const rows = await stageRows(eventId);
  const person = (r: StageRow) => ({
    pid: r.profile_id,
    identity: identityOf(r.profile_id),
    name: r.display_name,
    username: r.username,
    avatar: r.avatar_url,
    micRevoked: r.mic_revoked,
    camRevoked: r.cam_revoked,
  });
  const me = rows.find((r) => r.profile_id === meId);
  return {
    mode: live.mode,
    maxSpeakers: live.max_speakers,
    featured: live.featured_identity,
    layout: live.stage_layout ?? "shared",
    ownerIdentity: identityOf(live.owner_id),
    speakers: rows.filter((r) => r.role === "speaker").sort((a, b) => Date.parse(a.stage_since ?? "") - Date.parse(b.stage_since ?? "")).map(person),
    hands: isOwner
      ? rows
          .filter((r) => r.role !== "speaker" && r.hand_raised_at && !inviteLive(r.stage_invited_at))
          .sort((a, b) => Date.parse(a.hand_raised_at!) - Date.parse(b.hand_raised_at!))
          .map((r) => ({ ...person(r), at: Date.parse(r.hand_raised_at!) }))
      : [],
    invites: isOwner ? rows.filter((r) => r.role !== "speaker" && inviteLive(r.stage_invited_at)).map((r) => ({ ...person(r), at: Date.parse(r.stage_invited_at!) })) : [],
    me: {
      onStage: isOwner || me?.role === "speaker",
      handRaised: Boolean(me?.hand_raised_at),
      invitedAt: me && me.role !== "speaker" && inviteLive(me.stage_invited_at) ? Date.parse(me.stage_invited_at!) : null,
      micRevoked: Boolean(me?.mic_revoked),
      camRevoked: Boolean(me?.cam_revoked),
    },
    freeSeats: await freeSeats(live),
  };
}

/** Raise / lower my hand. One active request; toggling is slowed down. */
export async function setHand(meId: string, eventId: string, up: boolean) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  if (live.owner_id === meId) throw new WippHttpError(400, "owner", "Tu es déjà sur scène.");
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  const key = `${eventId}:${meId}`;
  const now = Date.now();
  if (up && now - (handToggles.get(key) ?? 0) < 10_000) throw new WippHttpError(429, "slow_down", "Attends quelques secondes avant de relever la main.");
  handToggles.set(key, now);
  if (handToggles.size > 5000) handToggles.clear();
  const sql = await getSql();
  if (up) {
    await sql`
      insert into wipp_event_live_members (event_id, profile_id, status, hand_raised_at) values (${eventId}, ${meId}, 'registered', now())
      on conflict (event_id, profile_id) do update set hand_raised_at = coalesce(wipp_event_live_members.hand_raised_at, now()), updated_at = now()
      where wipp_event_live_members.status <> 'banned' and wipp_event_live_members.role <> 'speaker'
    `;
  } else {
    await sql`update wipp_event_live_members set hand_raised_at = null, updated_at = now() where event_id = ${eventId} and profile_id = ${meId}`;
  }
  await broadcast(eventId, { t: "stage", hand: up ? identityOf(meId) : undefined });
  return liveStage(meId, eventId);
}

/** Organizer invites someone up (a raised hand or anyone in the room). Needs a free seat; switches to interactive. */
export async function inviteToStage(meId: string, eventId: string, profileId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  if (profileId === meId) throw new WippHttpError(400, "owner", "Tu es déjà sur scène.");
  const m = await memberOf(eventId, profileId);
  if (m?.status === "banned") throw new WippHttpError(403, "banned", "Cette personne a été exclue.");
  if (m?.role === "speaker") return liveStage(meId, eventId);
  if ((await freeSeats(live)) <= 0) throw new WippHttpError(409, "full", `La scène est complète (${live.max_speakers} personnes maximum).`);
  const sql = await getSql();
  if (live.mode !== "interactive") await sql`update wipp_event_lives set mode = 'interactive', updated_at = now() where event_id = ${eventId}`;
  await sql`
    insert into wipp_event_live_members (event_id, profile_id, status, stage_invited_at) values (${eventId}, ${profileId}, 'registered', now())
    on conflict (event_id, profile_id) do update set stage_invited_at = now(), hand_raised_at = null, updated_at = now()
    where wipp_event_live_members.status <> 'banned'
  `;
  await broadcast(eventId, { t: "stage", invite: identityOf(profileId) });
  return liveStage(meId, eventId);
}

/** Organizer: refuse a raised hand or cancel an invitation. */
export async function dismissStageRequest(meId: string, eventId: string, profileId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  await sql`
    update wipp_event_live_members set hand_raised_at = null, stage_invited_at = null, updated_at = now()
    where event_id = ${eventId} and profile_id = ${profileId} and role <> 'speaker'
  `;
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** The invited person answers. Only a « yes » within 60 s, with a free seat, makes them a speaker. */
export async function answerStageInvite(meId: string, eventId: string, accept: boolean) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const sql = await getSql();
  const rows = await sql<{ stage_invited_at: string | null; role: string }>`
    select stage_invited_at::text, role from wipp_event_live_members where event_id = ${eventId} and profile_id = ${meId} limit 1
  `;
  const row = rows[0];
  if (!accept) {
    await sql`update wipp_event_live_members set stage_invited_at = null, updated_at = now() where event_id = ${eventId} and profile_id = ${meId}`;
    await broadcast(eventId, { t: "stage" });
    return liveStage(meId, eventId);
  }
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  if (!row || !inviteLive(row.stage_invited_at)) {
    await sql`update wipp_event_live_members set stage_invited_at = null where event_id = ${eventId} and profile_id = ${meId}`;
    throw new WippHttpError(410, "expired", "L’invitation a expiré.");
  }
  // My own pending invitation already holds a seat: count the others only.
  const others = (await stageRows(eventId)).filter((r) => r.profile_id !== meId && (r.role === "speaker" || inviteLive(r.stage_invited_at))).length;
  if (others >= live.max_speakers - 1) throw new WippHttpError(409, "full", "La scène est complète.");
  await sql`
    update wipp_event_live_members set role = 'speaker', stage_invited_at = null, hand_raised_at = null, stage_since = now(),
      mic_revoked = false, cam_revoked = false, updated_at = now()
    where event_id = ${eventId} and profile_id = ${meId}
  `;
  await applyPermissions(live, meId, true, false, false);
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** Back to the audience: by myself, or the organizer takes someone down. Rights are taken back at once. */
export async function leaveStage(meId: string, eventId: string, profileId?: string) {
  const live = await loadLive(eventId);
  const target = profileId && profileId !== meId ? profileId : meId;
  if (target !== meId) assertOwner(live, meId);
  else await assertCanSee(live, meId);
  const sql = await getSql();
  await sql`
    update wipp_event_live_members set role = 'viewer', stage_invited_at = null, hand_raised_at = null, stage_since = null, updated_at = now()
    where event_id = ${eventId} and profile_id = ${target} and role = 'speaker'
  `;
  if (live.featured_identity === identityOf(target)) await sql`update wipp_event_lives set featured_identity = null where event_id = ${eventId}`;
  await applyPermissions(live, target, false, false, false);
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** Organizer takes back (or gives back) a speaker's microphone or camera. Never turns them ON remotely. */
export async function setSpeakerMedia(meId: string, eventId: string, profileId: string, input: { micRevoked?: boolean; camRevoked?: boolean }) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const m = await memberOf(eventId, profileId);
  if (m?.role !== "speaker") throw new WippHttpError(404, "not_speaker", "Cette personne n’est pas sur scène.");
  const micRevoked = typeof input.micRevoked === "boolean" ? input.micRevoked : m.mic_revoked;
  const camRevoked = typeof input.camRevoked === "boolean" ? input.camRevoked : m.cam_revoked;
  const sql = await getSql();
  await sql`
    update wipp_event_live_members set mic_revoked = ${micRevoked}, cam_revoked = ${camRevoked}, updated_at = now()
    where event_id = ${eventId} and profile_id = ${profileId}
  `;
  await applyPermissions(live, profileId, true, micRevoked, camRevoked);
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** Organizer puts one speaker in big (null = back to the grid). Same view for everyone. */
export async function setFeatured(meId: string, eventId: string, identity: string | null) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const value = identity ? String(identity).slice(0, 64) : null;
  await sql`update wipp_event_lives set featured_identity = ${value}, updated_at = now() where event_id = ${eventId}`;
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** Host: how 3–4 people are laid out (same view for everyone). Display only. */
export async function setStageLayout(meId: string, eventId: string, layout: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const next = layout === "dominant" || layout === "inset" ? layout : "shared";
  const sql = await getSql();
  await sql`update wipp_event_lives set stage_layout = ${next}, updated_at = now() where event_id = ${eventId}`;
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

/** Conference ⇄ interactive. Back to « conference »: every speaker goes back to the audience. */
export async function setLiveMode(meId: string, eventId: string, mode: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const next = mode === "interactive" ? "interactive" : "conference";
  const sql = await getSql();
  await sql`update wipp_event_lives set mode = ${next}, featured_identity = case when ${next} = 'conference' then null else featured_identity end, updated_at = now() where event_id = ${eventId}`;
  if (next === "conference") {
    const down = await sql<{ profile_id: string }>`
      update wipp_event_live_members set role = 'viewer', stage_invited_at = null, stage_since = null, updated_at = now()
      where event_id = ${eventId} and (role = 'speaker' or stage_invited_at is not null) returning profile_id
    `;
    for (const d of down) await applyPermissions({ ...live, mode: next }, d.profile_id, false, false, false);
  }
  await broadcast(eventId, { t: "stage" });
  return liveStage(meId, eventId);
}

// ——— Fin de conférence : résumé et avis ———

const REVIEW_WINDOW_MS = 14 * 24 * 3600_000;

/** End screen: title, organizer, my review (participants) or the numbers (organizer). */
export async function liveSummary(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const sql = await getSql();
  const owner = await sql<{ display_name: string; username: string; avatar_url: string | null }>`
    select display_name, username, avatar_url from wipp_profiles where id = ${live.owner_id} limit 1
  `;
  const isOwner = live.owner_id === meId;
  const attended = isOwner
    ? true
    : Boolean((await sql<{ ok: boolean }>`select exists (select 1 from wipp_event_live_attendance where event_id = ${eventId} and profile_id = ${meId}) as ok`)[0]?.ok);
  const mine = await sql<{ rating: number | null; body: string }>`
    select rating, body from wipp_event_live_reviews where event_id = ${eventId} and profile_id = ${meId} limit 1
  `;
  const open = live.state === "live" || (live.state === "ended" && (!live.ended_at || Date.now() - Date.parse(live.ended_at) < REVIEW_WINDOW_MS));
  let stats: { attendees: number; questions: number; reviews: number; average: number | null } | null = null;
  if (isOwner) {
    const n = await sql<{ attendees: number; questions: number; reviews: number; average: number | null }>`
      select
        (select count(*)::int from wipp_event_live_attendance where event_id = ${eventId}) as attendees,
        (select count(*)::int from wipp_event_live_questions where event_id = ${eventId} and status <> 'deleted') as questions,
        (select count(*)::int from wipp_event_live_reviews where event_id = ${eventId} and status = 'visible') as reviews,
        (select round(avg(rating)::numeric, 1)::float from wipp_event_live_reviews where event_id = ${eventId} and status = 'visible' and rating is not null) as average
    `;
    stats = n[0] ?? null;
  }
  return {
    eventId,
    title: live.title,
    state: live.state,
    isOwner,
    organizer: { name: owner[0]?.display_name || owner[0]?.username || "WIPP", username: owner[0]?.username ?? "", avatar: owner[0]?.avatar_url ?? null },
    canReview: !isOwner && attended && open,
    myReview: mine[0] ? { rating: mine[0].rating, text: mine[0].body } : null,
    stats,
  };
}

/** One review per participant (rewriting replaces it). Only people who really joined, never the organizer. */
export async function saveLiveReview(meId: string, eventId: string, input: { rating?: number | null; text?: string }) {
  const summary = await liveSummary(meId, eventId);
  if (summary.isOwner) throw new WippHttpError(403, "own_event", "Tu ne peux pas évaluer ta propre conférence.");
  if (!summary.canReview) throw new WippHttpError(403, "not_attended", "Seules les personnes qui ont participé au direct peuvent laisser un avis.");
  const rating = input.rating == null ? null : Math.round(Number(input.rating));
  if (rating != null && (rating < 1 || rating > 5)) throw new WippHttpError(400, "invalid", "Note de 1 à 5.");
  const text = String(input.text ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (rating == null && !text) throw new WippHttpError(400, "empty", "Choisis une note ou écris un commentaire.");
  const sql = await getSql();
  if (text) {
    const bad = await sql<{ bad: boolean }>`select public.wipp_text_is_offensive(${text}) as bad`;
    if (bad[0]?.bad) throw new WippHttpError(400, "offensive_text", "Ton commentaire contient un mot interdit.");
  }
  await sql`
    insert into wipp_event_live_reviews (event_id, profile_id, rating, body) values (${eventId}, ${meId}, ${rating}, ${text})
    on conflict (event_id, profile_id) do update set rating = excluded.rating, body = excluded.body, updated_at = now()
  `;
  return { ok: true };
}

// ——— Étape B : questions-réponses ———

type QuestionRow = {
  id: string;
  author_id: string;
  body: string;
  status: string;
  votes: number;
  created_at: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  my_vote: boolean;
};

const QUESTION_MAX = 300;
const QUESTION_GAP_MS = 15_000;
const QUESTION_PENDING_MAX = 5;
const lastQuestion = new Map<string, number>();

function mapQuestion(q: QuestionRow) {
  return {
    id: q.id,
    authorId: q.author_id,
    text: q.body,
    status: q.status as "pending" | "shown" | "done" | "ignored",
    votes: Number(q.votes) || 0,
    createdAt: Date.parse(q.created_at),
    name: q.display_name,
    username: q.username,
    avatar: q.avatar_url,
    myVote: Boolean(q.my_vote),
  };
}

/** Questions of a live. Viewers never see deleted or hidden ones; the organizer sees hidden ones too. */
export async function listLiveQuestions(meId: string, eventId: string) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const isOwner = live.owner_id === meId;
  const sql = await getSql();
  const rows = await sql<QuestionRow>`
    select q.id, q.author_id, q.body, q.status, q.votes, q.created_at::text,
           p.display_name, p.username, p.avatar_url,
           exists (select 1 from wipp_event_live_votes v where v.question_id = q.id and v.profile_id = ${meId}) as my_vote
    from wipp_event_live_questions q join wipp_profiles p on p.id = q.author_id
    where q.event_id = ${eventId} and q.status <> 'deleted' and (${isOwner} or q.status <> 'ignored')
    order by q.created_at desc
    limit 300
  `;
  const questions = rows.map(mapQuestion);
  const spot = live.spotlight_id ? questions.find((q) => q.id === live.spotlight_id && q.status === "shown") ?? null : null;
  return {
    questions,
    spotlight: spot,
    questionsOn: live.questions_on,
    qaMode: live.qa_mode,
    state: live.state,
    isOwner,
  };
}

/** A viewer asks a question: access, open, anti-spam, length and offensive words are checked here. */
export async function askLiveQuestion(meId: string, eventId: string, raw: string) {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 3) throw new WippHttpError(400, "too_short", "Ta question est trop courte.");
  if (text.length > QUESTION_MAX) throw new WippHttpError(400, "too_long", `${QUESTION_MAX} caractères maximum.`);
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  if (!live.questions_on && live.owner_id !== meId) throw new WippHttpError(403, "questions_off", "Les questions sont fermées pour le moment.");
  const key = `${eventId}:${meId}`;
  const now = Date.now();
  if (now - (lastQuestion.get(key) ?? 0) < QUESTION_GAP_MS) throw new WippHttpError(429, "slow_down", "Attends quelques secondes avant de poser une autre question.");
  const sql = await getSql();
  const pending = await sql<{ c: number }>`
    select count(*)::int as c from wipp_event_live_questions where event_id = ${eventId} and author_id = ${meId} and status = 'pending'
  `;
  if (Number(pending[0]?.c ?? 0) >= QUESTION_PENDING_MAX) throw new WippHttpError(429, "too_many", "Tu as déjà 5 questions en attente.");
  const bad = await sql<{ bad: boolean }>`select public.wipp_text_is_offensive(${text}) as bad`;
  if (bad[0]?.bad) throw new WippHttpError(400, "offensive_text", "Ta question contient un mot interdit.");
  lastQuestion.set(key, now);
  if (lastQuestion.size > 5000) lastQuestion.clear();
  const id = `q_${randomBytes(9).toString("hex")}`;
  await sql`insert into wipp_event_live_questions (id, event_id, author_id, body) values (${id}, ${eventId}, ${meId}, ${text})`;
  await broadcast(eventId, { t: "q" });
  return { id };
}

/** One vote per person per question (primary key); voting again removes nothing twice. */
export async function voteLiveQuestion(meId: string, eventId: string, questionId: string, on: boolean) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  const sql = await getSql();
  const q = await sql<{ status: string }>`
    select status from wipp_event_live_questions where id = ${questionId} and event_id = ${eventId} limit 1
  `;
  if (!q[0] || q[0].status === "deleted" || q[0].status === "ignored") throw new WippHttpError(404, "not_found", "Question introuvable.");
  if (on) {
    await sql`insert into wipp_event_live_votes (question_id, profile_id) values (${questionId}, ${meId}) on conflict do nothing`;
  } else {
    await sql`delete from wipp_event_live_votes where question_id = ${questionId} and profile_id = ${meId}`;
  }
  const n = await sql<{ votes: number }>`
    update wipp_event_live_questions
    set votes = (select count(*) from wipp_event_live_votes v where v.question_id = ${questionId}), updated_at = now()
    where id = ${questionId} returning votes
  `;
  await broadcast(eventId, { t: "q" });
  return { votes: Number(n[0]?.votes ?? 0), myVote: on };
}

/**
 * Organizer: show on screen (only one at a time), hide from screen, done, ignored, deleted.
 * The spotlight is kept by the server so everyone, even after a reconnection, sees the same card.
 */
export async function moderateLiveQuestion(meId: string, eventId: string, questionId: string, action: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const q = await sql<QuestionRow>`
    select q.id, q.author_id, q.body, q.status, q.votes, q.created_at::text, p.display_name, p.username, p.avatar_url, false as my_vote
    from wipp_event_live_questions q join wipp_profiles p on p.id = q.author_id
    where q.id = ${questionId} and q.event_id = ${eventId} limit 1
  `;
  const row = q[0];
  if (!row || row.status === "deleted") throw new WippHttpError(404, "not_found", "Question introuvable.");
  const next = action === "show" ? "shown" : action === "unshow" ? "pending" : action === "done" ? "done" : action === "ignore" ? "ignored" : action === "delete" ? "deleted" : action === "restore" ? "pending" : null;
  if (!next) throw new WippHttpError(400, "invalid", "Action inconnue.");
  if (next === "shown") {
    // The previous card goes back to « en attente » (unless already treated).
    await sql`update wipp_event_live_questions set status = 'pending', updated_at = now() where event_id = ${eventId} and status = 'shown' and id <> ${questionId}`;
    await sql`update wipp_event_lives set spotlight_id = ${questionId}, updated_at = now() where event_id = ${eventId}`;
  } else if (live.spotlight_id === questionId) {
    await sql`update wipp_event_lives set spotlight_id = null, updated_at = now() where event_id = ${eventId}`;
  }
  await sql`update wipp_event_live_questions set status = ${next}, updated_at = now() where id = ${questionId}`;
  const spot = next === "shown" ? { ...mapQuestion({ ...row, status: "shown" }) } : live.spotlight_id === questionId ? null : undefined;
  if (spot !== undefined) await broadcast(eventId, { t: "spot", q: spot });
  await broadcast(eventId, { t: "q" });
  return { ok: true, status: next };
}

/** Exclude someone: out of the room now, and no new token for this event. */
export async function banFromEventLive(meId: string, eventId: string, targetIdentity: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const id = String(targetIdentity).replace(/^p_/, "");
  const rows = await sql<{ id: string }>`
    select id from wipp_profiles where regexp_replace(id, '[^a-zA-Z0-9]', '', 'g') = ${id} limit 1
  `;
  const profileId = rows[0]?.id;
  if (!profileId || profileId === meId) throw new WippHttpError(404, "not_found", "Participant introuvable.");
  await sql`
    insert into wipp_event_live_members (event_id, profile_id, status) values (${eventId}, ${profileId}, 'banned')
    on conflict (event_id, profile_id) do update set status = 'banned', role = 'viewer', updated_at = now()
  `;
  const rs = roomService();
  if (rs) await rs.removeParticipant(roomOf(eventId), identityOf(profileId)).catch(() => undefined);
  return { ok: true };
}

const lastComment = new Map<string, number>();

/** A comment: checked here (member, comments on, anti-spam, offensive words), then sent to the room. */
export async function postLiveComment(meId: string, displayName: string, eventId: string, raw: string) {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!text) throw new WippHttpError(400, "empty", "Commentaire vide.");
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  if (live.state !== "live") throw new WippHttpError(409, "not_live", "Le direct n’est pas en cours.");
  const isOwner = live.owner_id === meId;
  if (!live.comments_on && !isOwner) throw new WippHttpError(403, "comments_off", "L’organisateur a désactivé les commentaires.");
  const key = `${eventId}:${meId}`;
  const now = Date.now();
  if (!isOwner && now - (lastComment.get(key) ?? 0) < 2000) throw new WippHttpError(429, "slow_down", "Doucement : un commentaire toutes les 2 secondes.");
  lastComment.set(key, now);
  if (lastComment.size > 5000) lastComment.clear();
  const sql = await getSql();
  const bad = await sql<{ bad: boolean }>`select public.wipp_text_is_offensive(${text}) as bad`;
  if (bad[0]?.bad) throw new WippHttpError(400, "offensive_text", "Ce commentaire contient un mot interdit.");
  const id = `${now.toString(36)}${randomBytes(3).toString("hex")}`;
  await broadcast(eventId, { t: "c", id, text, name: displayName.slice(0, 60) || "WIPP", identity: identityOf(meId), pid: meId });
  return { id };
}

/** Removes a comment for everyone (organizer moderation). */
export async function deleteLiveComment(meId: string, eventId: string, commentId: string) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  await broadcast(eventId, { t: "delete", id: String(commentId).slice(0, 64) });
  return { ok: true };
}

async function broadcast(eventId: string, payload: Record<string, unknown>) {
  const rs = roomService();
  if (!rs) return;
  const data = new TextEncoder().encode(JSON.stringify({ ...payload, from: "server" }));
  await rs.sendData(roomOf(eventId), data, DataPacket_Kind.RELIABLE, { topic: "wipp-live" }).catch(() => undefined);
}

// ——— WIPP 1.1 : partage d'écran ———
// No push while the host shares his screen (viewers could see the banner in the shared screen): hands and
// questions are only recorded, and the host finds them in WIPP when he comes back.

/**
 * Host: sharing started / stopped. Every viewer is told at once, so a share track that LiveKit did not
 * remove cleanly (stopped from iOS, bad network) never leaves a black screen behind.
 */
export async function setSharing(meId: string, eventId: string, on: boolean) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  await sql`
    update wipp_event_lives set sharing_since = ${on ? new Date().toISOString() : null}, updated_at = now()
    where event_id = ${eventId}
  `;
  await broadcast(eventId, { t: "sharing", on });
  return { ok: true };
}

// ——— Rappels (lancés toutes les 5 min par Supabase pg_cron) ———

/** Reminders: 3 days before, the same day, 30 min before (registered people AND the organizer). */
const REMINDERS = [
  { kind: "d3", from: 72 * 3600_000, until: 48 * 3600_000 },
  { kind: "day", from: 10 * 3600_000, until: 60 * 60_000 },
  { kind: "m30", from: 30 * 60_000, until: 0 },
] as const;

function reminderText(kind: (typeof REMINDERS)[number]["kind"], organizer: boolean) {
  if (organizer) {
    if (kind === "d3") return "Ton direct WIPP a lieu dans 3 jours.";
    if (kind === "day") return "Ton direct WIPP a lieu aujourd’hui. Pense à le démarrer à l’heure !";
    return "Ton direct commence dans 30 minutes : prépare-toi à le démarrer.";
  }
  if (kind === "d3") return "C’est dans 3 jours ! Tu es inscrit(e) à ce direct WIPP.";
  if (kind === "day") return "C’est aujourd’hui ! Rendez-vous sur WIPP pour le direct.";
  return "Le direct commence dans 30 minutes.";
}

export async function runLiveReminders(secret: string) {
  const sql = await getSql();
  const ok = await sql<{ ok: boolean }>`select exists (select 1 from wipp_cron_secrets where name = 'live' and secret = ${secret}) as ok`;
  if (!ok[0]?.ok) throw new WippHttpError(403, "forbidden", "Accès refusé.");
  const lives = await sql<{ event_id: string; owner_id: string; title: string; starts_at: string }>`
    select l.event_id, e.owner_id, e.title, e.starts_at::text
    from wipp_event_lives l join wipp_events e on e.id = l.event_id
    where l.state = 'scheduled' and e.status = 'active' and e.starts_at is not null
      and e.starts_at > now() and e.starts_at < now() + interval '72 hours'
  `;
  let sent = 0;
  for (const live of lives) {
    const left = Date.parse(live.starts_at) - Date.now();
    const due = REMINDERS.find((r) => left <= r.from && left > r.until);
    if (!due) continue;
    const people = await sql<{ profile_id: string }>`
      select profile_id from wipp_event_live_members where event_id = ${live.event_id} and status = 'registered'
      union select ${live.owner_id}
    `;
    for (const p of people) {
      // One reminder of each kind per person (primary key): never twice.
      const fresh = await sql<{ profile_id: string }>`
        insert into wipp_event_live_reminders (event_id, profile_id, kind) values (${live.event_id}, ${p.profile_id}, ${due.kind})
        on conflict do nothing returning profile_id
      `;
      if (!fresh[0]) continue;
      void notifyLive(p.profile_id, live.event_id, live.title, reminderText(due.kind, p.profile_id === live.owner_id));
      sent += 1;
    }
  }
  return { lives: lives.length, sent };
}

async function notifyLive(profileId: string, eventId: string, title: string, body: string) {
  try {
    const { sendProfilePush } = await import("@/lib/push/notify");
    await sendProfilePush({
      profileId,
      title: title.slice(0, 64) || "WIPP",
      body,
      channelId: "messages",
      data: { type: "live", eventId: `live:${eventId}:${profileId.slice(-8)}:${Date.now().toString(36)}`, publicId: eventId },
    });
  } catch {
    /* A failed notification never blocks the live. */
  }
}
