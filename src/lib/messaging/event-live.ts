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
           l.started_at::text, l.ended_at::text
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
  const rows = await sql<{ status: string; role: string }>`
    select status, role from wipp_event_live_members where event_id = ${eventId} and profile_id = ${profileId} limit 1
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
    await sql`update wipp_event_lives set state = 'live', started_at = now(), ended_at = null, updated_at = now() where event_id = ${eventId}`;
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
  const sql = await getSql();
  await sql`
    update wipp_event_lives set state = ${cancel && live.state === "scheduled" ? "cancelled" : "ended"}, ended_at = now(), updated_at = now()
    where event_id = ${eventId}
  `;
  const rs = roomService();
  if (rs) await rs.deleteRoom(roomOf(eventId)).catch(() => undefined);
  return getEventLive(meId, eventId);
}

/** Short-lived token for the live room. The role decides what LiveKit lets the person do. */
export async function eventLiveToken(meId: string, eventId: string, displayName: string, avatar?: string | null) {
  const live = await loadLive(eventId);
  await assertCanSee(live, meId);
  const isOwner = live.owner_id === meId;
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
    canPublish: speaker,
    canPublishSources: speaker ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] : [],
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
    settings: { commentsOn: live.comments_on, reactionsOn: live.reactions_on, questionsOn: live.questions_on, mode: live.mode },
  };
}

/** Organizer settings (comments / reactions / questions on-off), applied live to everyone. */
export async function setEventLiveSettings(
  meId: string,
  eventId: string,
  input: { commentsOn?: boolean; reactionsOn?: boolean; questionsOn?: boolean },
) {
  const live = await loadLive(eventId);
  assertOwner(live, meId);
  const sql = await getSql();
  const commentsOn = typeof input.commentsOn === "boolean" ? input.commentsOn : live.comments_on;
  const reactionsOn = typeof input.reactionsOn === "boolean" ? input.reactionsOn : live.reactions_on;
  const questionsOn = typeof input.questionsOn === "boolean" ? input.questionsOn : live.questions_on;
  await sql`
    update wipp_event_lives set comments_on = ${commentsOn}, reactions_on = ${reactionsOn}, questions_on = ${questionsOn}, updated_at = now()
    where event_id = ${eventId}
  `;
  await broadcast(eventId, { t: "settings", commentsOn, reactionsOn, questionsOn });
  return { commentsOn, reactionsOn, questionsOn };
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

async function notifyLive(profileId: string, eventId: string, title: string, body: string) {
  try {
    const { sendProfilePush } = await import("@/lib/push/notify");
    await sendProfilePush({
      profileId,
      title: title.slice(0, 64) || "WIPP",
      body,
      channelId: "messages",
      data: { type: "live", eventId: `live:${eventId}:${Date.now().toString(36)}`, publicId: eventId },
    });
  } catch {
    /* A failed notification never blocks the live. */
  }
}
