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
           l.started_at::text, l.ended_at::text, l.qa_mode, l.spotlight_id
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
  const sql = await getSql();
  await sql`
    update wipp_event_lives set state = ${cancel && live.state === "scheduled" ? "cancelled" : "ended"}, ended_at = now(),
      spotlight_id = null, qa_mode = false, updated_at = now()
    where event_id = ${eventId}
  `;
  // Everyone switches to the end screen at once, then the LiveKit room is closed.
  await broadcast(eventId, { t: "ended" });
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
    settings: { commentsOn: live.comments_on, reactionsOn: live.reactions_on, questionsOn: live.questions_on, qaMode: live.qa_mode, mode: live.mode },
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
