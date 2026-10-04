/**
 * Call invite signaling + push token registration.
 * Works with LiveKit room names minted at invite time.
 */
import { createHash } from "node:crypto";
import { sendFcmCall, sendVoipCall } from "@/lib/push/native";
import { getSql } from "@/lib/db";
import { sendExpoPush } from "@/lib/push/expo";
import { WippHttpError, assertNotBlocked, ensureMessagingReady } from "@/lib/messaging/server";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export type CallInviteDto = {
  id: string;
  kind: "audio" | "video";
  roomName: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  caller: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  callee: { id: string; username: string; displayName: string; avatarUrl?: string | null };
};

async function profileRow(id: string) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>`
    select id, username, display_name, avatar_url
    from wipp_profiles where id = ${id} limit 1
  `;
  return rows[0] ?? null;
}

async function resolvePeerId(peerUsername?: string, peerId?: string) {
  const sql = await getSql();
  if (peerId?.trim()) {
    const byId = await sql<{ id: string }>`
      select id from wipp_profiles where id = ${peerId.trim()} limit 1
    `;
    if (byId[0]) return byId[0].id;
  }
  const username = normalizeUsername(peerUsername ?? "");
  if (!username) {
    throw new WippHttpError(400, "peer_required", "Indique le @username à appeler.");
  }
  const rows = await sql<{ id: string }>`
    select id from wipp_profiles where lower(username) = ${username} limit 1
  `;
  if (!rows[0]) {
    throw new WippHttpError(404, "peer_not_found", `@${username} introuvable sur le serveur.`);
  }
  return rows[0].id;
}

function epoch(value: unknown) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return Date.now();
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;
  const iso = raw.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

async function expireRinging(scope?: { callId?: string; profileId?: string }) {
  const sql = await getSql();
  if (scope?.callId) {
    await sql`
      update wipp_call_invites
      set status = 'missed'
      where id = ${scope.callId} and status = 'ringing' and expires_at < now()
    `;
    return;
  }
  if (scope?.profileId) {
    await sql`
      update wipp_call_invites
      set status = 'missed'
      where status = 'ringing' and expires_at < now()
        and (caller_id = ${scope.profileId} or callee_id = ${scope.profileId})
    `;
  }
}

async function pushCall(profileId: string, body: string, data: Record<string, unknown>) {
  const tokens = await listPushTokens(profileId);
  const expoTokens = tokens
    .filter((t) => t.kind === "expo" || t.token.startsWith("ExponentPushToken"))
    .map((t) => t.token);
  const fcm = tokens.filter((t) => t.kind === "fcm").map((t) => t.token);
  const voip = tokens.filter((t) => t.kind === "voip").map((t) => t.token);
  const ring = data.action === "ring";
  const flat = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")]));
  const jobs: Promise<unknown>[] = [];
  // iPhone with VoIP: the CallKit screen replaces the visible "ring" notification.
  const expoTargets = ring && voip.length ? [] : expoTokens;
  if (expoTargets.length) {
    jobs.push(
      sendExpoPush(expoTargets, {
        title: "WIPP",
        body,
        priority: "high",
        channelId: "incoming_calls",
        categoryId: "incoming_call",
        collapseId: String(data.eventId || data.inviteId || "call"),
        data,
      }).then((r) => (r.invalidTokens.length ? disablePushTokens(r.invalidTokens) : undefined)),
    );
  }
  if (fcm.length) {
    jobs.push(sendFcmCall(fcm, { ...flat, body }).then((r) => (r.invalid.length ? disablePushTokens(r.invalid) : undefined)));
  }
  // Apple requires every VoIP push to report a call, so only "ring" goes over VoIP.
  if (ring && voip.length) {
    jobs.push(sendVoipCall(voip, { ...flat, body, uuid: callUuid(String(data.inviteId || data.eventId || "")) }).then((r) => (r.invalid.length ? disablePushTokens(r.invalid) : undefined)));
  }
  await Promise.allSettled(jobs);
}

/** Stable UUID for CallKit, derived from the WIPP call id. */
function callUuid(id: string) {
  const h = createHash("sha1").update(id).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function roomFor(a: string, b: string) {
  const slug = [a, b]
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24))
    .sort()
    .join("-");
  return `wipp-${slug}`.slice(0, 64);
}

async function toDto(row: {
  id: string;
  kind: string;
  room_name: string;
  status: string;
  created_at: string;
  expires_at: string;
  caller_id: string;
  callee_id: string;
}): Promise<CallInviteDto | null> {
  const caller = await profileRow(row.caller_id);
  const callee = await profileRow(row.callee_id);
  if (!caller || !callee) return null;
  return {
    id: row.id,
    kind: row.kind === "video" ? "video" : "audio",
    roomName: row.room_name,
    status: row.status,
    createdAt: Date.parse(row.created_at),
    expiresAt: Date.parse(row.expires_at),
    caller: {
      id: caller.id,
      username: caller.username,
      displayName: caller.display_name,
      avatarUrl: caller.avatar_url,
    },
    callee: {
      id: callee.id,
      username: callee.username,
      displayName: callee.display_name,
      avatarUrl: callee.avatar_url,
    },
  };
}

export async function registerPushToken(input: {
  profileId: string;
  token: string;
  platform?: string;
  kind?: string;
  installationId?: string;
}) {
  await ensureMessagingReady();
  const token = input.token.trim();
  if (!token || token.length < 8) {
    throw new WippHttpError(400, "bad_token", "Token push invalide.");
  }
  const sql = await getSql();
  const id = uid("pt");
  const platform = (input.platform || "unknown").slice(0, 32);
  const kind = (input.kind || "expo").slice(0, 32);
  const installationId = (input.installationId || "").trim().slice(0, 64) || null;

  try {
    await sql`
      update wipp_push_tokens
      set disabled_at = now()
      where token = ${token} and profile_id <> ${input.profileId} and disabled_at is null
    `;
  } catch {
    /* schema without disabled_at */
  }
  if (installationId) {
    try {
      await sql`
        update wipp_push_tokens
        set disabled_at = now()
        where profile_id = ${input.profileId}
          and installation_id = ${installationId}
          and kind = ${kind}
          and token <> ${token}
          and disabled_at is null
      `;
    } catch {
      /* ignore */
    }
  }

  try {
    await sql`
      insert into wipp_push_tokens (id, profile_id, token, platform, kind, installation_id, disabled_at, updated_at)
      values (${id}, ${input.profileId}, ${token}, ${platform}, ${kind}, ${installationId}, null, now())
      on conflict (profile_id, token) do update
        set platform = excluded.platform,
            kind = excluded.kind,
            installation_id = excluded.installation_id,
            disabled_at = null,
            updated_at = now()
    `;
  } catch {
    await sql`
      insert into wipp_push_tokens (id, profile_id, token, platform, kind, updated_at)
      values (${id}, ${input.profileId}, ${token}, ${platform}, ${kind}, now())
      on conflict (profile_id, token) do update
        set platform = excluded.platform,
            kind = excluded.kind,
            updated_at = now()
    `;
  }
  return { ok: true as const };
}

export async function unregisterPushToken(input: {
  profileId: string;
  token?: string;
  installationId?: string;
}) {
  await ensureMessagingReady();
  const sql = await getSql();
  const token = input.token?.trim() ?? "";
  const installationId = input.installationId?.trim() ?? "";
  try {
    if (token) {
      await sql`
        update wipp_push_tokens
        set disabled_at = now()
        where profile_id = ${input.profileId} and token = ${token} and disabled_at is null
      `;
    } else if (installationId) {
      await sql`
        update wipp_push_tokens
        set disabled_at = now()
        where profile_id = ${input.profileId} and installation_id = ${installationId} and disabled_at is null
      `;
    }
  } catch {
    if (token) {
      await sql`delete from wipp_push_tokens where profile_id = ${input.profileId} and token = ${token}`;
    }
  }
  return { ok: true as const };
}

export async function disablePushTokens(tokens: string[]) {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return;
  await ensureMessagingReady();
  const sql = await getSql();
  for (const token of unique) {
    try {
      await sql`
        update wipp_push_tokens
        set disabled_at = now()
        where token = ${token} and disabled_at is null
      `;
    } catch {
      await sql`delete from wipp_push_tokens where token = ${token}`;
    }
  }
}

export async function listPushTokens(profileId: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  try {
    return await sql<{ token: string; platform: string; kind: string }>`
      select token, platform, kind from wipp_push_tokens
      where profile_id = ${profileId} and disabled_at is null
      order by updated_at desc
    `;
  } catch {
    return sql<{ token: string; platform: string; kind: string }>`
      select token, platform, kind from wipp_push_tokens
      where profile_id = ${profileId}
      order by updated_at desc
    `;
  }
}

export async function createCallInvite(input: {
  callerId: string;
  peerUsername?: string;
  peerId?: string;
  kind?: "audio" | "video";
}): Promise<CallInviteDto> {
  await ensureMessagingReady();
  const calleeId = await resolvePeerId(input.peerUsername, input.peerId);
  if (calleeId === input.callerId) {
    throw new WippHttpError(400, "self_call", "Tu ne peux pas t’appeler toi-même.");
  }
  await assertNotBlocked(input.callerId, calleeId);
  const kind = input.kind === "video" ? "video" : "audio";
  const sqlBusy = await getSql();
  try {
    const busy = await sqlBusy<{ id: string }>`
      select id from wipp_call_invites
      where status = 'accepted' and ended_at is null
        and (caller_id = ${calleeId} or callee_id = ${calleeId})
      limit 1
    `;
    if (busy[0]) {
      const id = uid("call");
      const expiresAt = new Date(Date.now() + 60_000);
      await sqlBusy`
        insert into wipp_call_invites (id, caller_id, callee_id, kind, room_name, status, expires_at, ended_at)
        values (${id}, ${input.callerId}, ${calleeId}, ${kind}, ${roomFor(input.callerId, calleeId)}, ${"busy"}, ${expiresAt.toISOString()}, now())
      `;
      const created = await getCallInvite(id);
      if (!created) throw new WippHttpError(409, "busy", "Correspondant occupé.");
      return created;
    }
  } catch (err) {
    if (err instanceof WippHttpError) throw err;
  }
  const roomName = roomFor(input.callerId, calleeId);
  const id = uid("call");
  const expiresAt = new Date(Date.now() + 60_000);
  const sql = await getSql();

  // Cancel previous ringing invites between the same pair
  await sql`
    update wipp_call_invites
    set status = 'cancelled'
    where status = 'ringing'
      and (
        (caller_id = ${input.callerId} and callee_id = ${calleeId})
        or (caller_id = ${calleeId} and callee_id = ${input.callerId})
      )
  `;

  await sql`
    insert into wipp_call_invites (id, caller_id, callee_id, kind, room_name, status, expires_at)
    values (${id}, ${input.callerId}, ${calleeId}, ${kind}, ${roomName}, ${"ringing"}, ${expiresAt.toISOString()})
  `;

  const rows = await sql<{
    id: string;
    kind: string;
    room_name: string;
    status: string;
    created_at: string;
    expires_at: string;
    caller_id: string;
    callee_id: string;
  }>`
    select id, kind, room_name, status, created_at::text, expires_at::text, caller_id, callee_id
    from wipp_call_invites where id = ${id} limit 1
  `;
  const dto = await toDto(rows[0]!);
  if (!dto) throw new WippHttpError(500, "invite_failed", "Impossible de créer l’appel.");

  // Fire Expo push to callee devices (best-effort)
  const label = kind === "video" ? "Appel vidéo" : "Appel audio";
  await pushCall(calleeId, `${dto.caller.displayName} · ${label}`, {
    type: "call",
    eventId: dto.id,
    inviteId: dto.id,
    kind,
    callerName: dto.caller.displayName,
    action: "ring",
  }).catch((err) => console.warn("[wipp-call] push", err));

  return dto;
}

export async function listIncomingCalls(meId: string): Promise<CallInviteDto[]> {
  await ensureMessagingReady();
  const sql = await getSql();
  await sql`
    update wipp_call_invites
    set status = 'missed'
    where callee_id = ${meId} and status = 'ringing' and expires_at < now()
  `;
  const rows = await sql<{
    id: string;
    kind: string;
    room_name: string;
    status: string;
    created_at: string;
    expires_at: string;
    caller_id: string;
    callee_id: string;
  }>`
    select id, kind, room_name, status, created_at::text, expires_at::text, caller_id, callee_id
    from wipp_call_invites
    where callee_id = ${meId} and status = 'ringing' and expires_at >= now()
    order by created_at desc
    limit 5
  `;
  const out: CallInviteDto[] = [];
  for (const row of rows) {
    const dto = await toDto(row);
    if (dto) out.push(dto);
  }
  return out;
}

export async function getCallInvite(callId: string): Promise<CallInviteDto | null> {
  await ensureMessagingReady();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    kind: string;
    room_name: string;
    status: string;
    created_at: string;
    expires_at: string;
    caller_id: string;
    callee_id: string;
  }>`
    select id, kind, room_name, status, created_at::text, expires_at::text, caller_id, callee_id
    from wipp_call_invites where id = ${callId} limit 1
  `;
  if (!rows[0]) return null;
  return toDto(rows[0]);
}

export async function answerCallInvite(input: {
  meId: string;
  callId: string;
  accept: boolean;
}): Promise<CallInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    kind: string;
    room_name: string;
    status: string;
    created_at: string;
    expires_at: string;
    caller_id: string;
    callee_id: string;
  }>`
    select id, kind, room_name, status, created_at::text, expires_at::text, caller_id, callee_id
    from wipp_call_invites where id = ${input.callId} limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  if (row.callee_id !== input.meId && row.caller_id !== input.meId) {
    throw new WippHttpError(403, "forbidden", "Cet appel ne te concerne pas.");
  }
  if (row.status !== "ringing") {
    const dto = await toDto(row);
    if (!dto) throw new WippHttpError(404, "not_found", "Appel introuvable.");
    return dto;
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    await sql`update wipp_call_invites set status = 'missed' where id = ${input.callId}`;
    throw new WippHttpError(410, "expired", "Appel expiré.");
  }

  if (input.accept) await assertNotBlocked(row.caller_id, row.callee_id);
  const next = input.accept ? "accepted" : "rejected";
  // Only callee accepts/rejects; caller cancel uses hangup
  if (row.callee_id !== input.meId && input.accept) {
    throw new WippHttpError(403, "forbidden", "Seul le destinataire peut accepter.");
  }
  await sql`
    update wipp_call_invites
    set status = ${next}, answered_at = now()
    where id = ${input.callId}
  `;
  const updated = await getCallInvite(input.callId);
  if (!updated) throw new WippHttpError(404, "not_found", "Appel introuvable.");

  // Notify caller that call was answered/rejected
  await pushCall(row.caller_id, input.accept ? "Appel accepté" : "Appel refusé", {
    type: "call",
    eventId: input.callId,
    inviteId: input.callId,
    kind: row.kind === "video" ? "video" : "audio",
    action: input.accept ? "accept" : "reject",
  }).catch(() => undefined);

  return updated;
}

export async function hangupCallInvite(input: { meId: string; callId: string }): Promise<CallInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  const invite = await getCallInvite(input.callId);
  if (!invite) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  if (invite.caller.id !== input.meId && invite.callee.id !== input.meId) {
    throw new WippHttpError(403, "forbidden", "Cet appel ne te concerne pas.");
  }
  const next =
    invite.status === "ringing"
      ? invite.caller.id === input.meId
        ? "cancelled"
        : "rejected"
      : "ended";
  await sql`
    update wipp_call_invites
    set status = ${next}, answered_at = coalesce(answered_at, now()), ended_at = now()
    where id = ${input.callId}
  `;
  const updated = await getCallInvite(input.callId);
  if (!updated) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  const otherId = invite.caller.id === input.meId ? invite.callee.id : invite.caller.id;
  const action = next === "cancelled" ? "cancel" : next === "rejected" ? "reject" : "end";
  await pushCall(otherId, next === "cancelled" ? "Appel annulé" : next === "rejected" ? "Appel refusé" : "Appel terminé", {
    type: "call",
    eventId: input.callId,
    inviteId: input.callId,
    kind: invite.kind,
    action,
  }).catch(() => undefined);
  return updated;
}

export async function listCallHistory(meId: string) {
  await ensureMessagingReady();
  await expireRinging({ profileId: meId });
  const sql = await getSql();
  let rows: {
    id: string;
    caller_id: string;
    callee_id: string;
    kind: string;
    status: string;
    created_at: string;
    duration_sec: number | null;
  }[] = [];
  try {
    rows = await sql`
      select id, caller_id, callee_id, kind, status, created_at::text,
        case
          when answered_at is not null and ended_at is not null
          then extract(epoch from (ended_at - answered_at))::int
          else null
        end as duration_sec
      from wipp_call_invites
      where caller_id = ${meId} or callee_id = ${meId}
      order by created_at desc
      limit 40
    `;
  } catch {
    const plain = await sql<{
      id: string;
      caller_id: string;
      callee_id: string;
      kind: string;
      status: string;
      created_at: string;
    }>`
      select id, caller_id, callee_id, kind, status, created_at::text
      from wipp_call_invites
      where caller_id = ${meId} or callee_id = ${meId}
      order by created_at desc
      limit 40
    `;
    rows = plain.map((row) => ({ ...row, duration_sec: null }));
  }
  const direct = rows.map((row) => ({
    id: row.id,
    peerId: row.caller_id === meId ? row.callee_id : row.caller_id,
    direction: (row.caller_id === meId ? "out" : "in") as "in" | "out",
    kind: row.kind === "video" ? ("video" as const) : ("audio" as const),
    missed: row.status === "missed" || row.status === "expired",
    declined: row.status === "rejected" || row.status === "declined",
    status: row.status,
    at: new Date(epoch(row.created_at)).toISOString(),
    duration: row.duration_sec,
    group: false,
    chatId: null as string | null,
  }));
  try {
    const groups = await sql<{
      id: string;
      chat_id: string;
      kind: string;
      status: string;
      created_at: string;
      created_by: string;
      duration_sec: number | null;
      state: string;
    }>`
      select c.id, c.chat_id, c.kind, c.status, c.created_at::text, c.created_by,
        case
          when c.answered_at is not null and c.ended_at is not null
          then extract(epoch from (c.ended_at - c.answered_at))::int
          else null
        end as duration_sec,
        p.state
      from wipp_group_calls c
      join wipp_group_call_members p on p.call_id = c.id and p.profile_id = ${meId}
      order by c.created_at desc
      limit 40
    `;
    for (const row of groups) {
      direct.push({
        id: row.id,
        peerId: row.chat_id,
        direction: row.created_by === meId ? "out" : "in",
        kind: row.kind === "video" ? "video" : "audio",
        missed: row.state === "ringing" && row.status === "ended",
        declined: row.state === "declined",
        status: row.state === "declined" ? "declined" : row.status,
        at: new Date(epoch(row.created_at)).toISOString(),
        duration: row.duration_sec,
        group: true,
        chatId: row.chat_id,
      });
    }
  } catch {
    /* group call table not deployed yet */
  }
  return direct.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
}

const LIVE_GROUP_STATES = ["joining", "joined", "reconnecting", "disconnected"];

export async function authorizeLiveKitJoin(meId: string, callId: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  const direct = await sql<{
    room_name: string;
    status: string;
    kind: string;
    ended_at: string | null;
  }>`
    select room_name, status, kind, ended_at::text
    from wipp_call_invites
    where id = ${callId}
      and (caller_id = ${meId} or callee_id = ${meId})
    limit 1
  `;
  const row = direct[0];
  if (row) {
    if (row.ended_at || row.status !== "accepted") {
      throw new WippHttpError(410, "call_closed", "Cet appel n’est plus joignable.");
    }
    return { roomName: row.room_name, kind: row.kind === "video" ? "video" as const : "audio" as const };
  }
  const group = await sql<{
    room_name: string;
    status: string;
    kind: string;
    ended_at: string | null;
    state: string;
    chat_id: string;
  }>`
    select c.room_name, c.status, c.kind, c.ended_at::text, p.state, c.chat_id
    from wipp_group_calls c
    join wipp_group_call_members p on p.call_id = c.id and p.profile_id = ${meId}
    where c.id = ${callId}
    limit 1
  `;
  const g = group[0];
  if (!g || g.ended_at || !LIVE_GROUP_STATES.includes(g.state) || g.status === "ended" || g.status === "cancelled") {
    throw new WippHttpError(403, "forbidden", "Appel non autorisé");
  }
  const member = await sql<{ ok: number }>`
    select 1 as ok from wipp_chat_members
    where chat_id = ${g.chat_id} and profile_id = ${meId}
    limit 1
  `;
  const banned = await sql<{ ok: number }>`
    select 1 as ok from wipp_group_bans
    where chat_id = ${g.chat_id} and profile_id = ${meId}
    limit 1
  `;
  if (!member[0] || banned[0]) throw new WippHttpError(403, "forbidden", "Tu n’es plus membre de ce groupe.");
  return { roomName: g.room_name, kind: g.kind === "video" ? "video" as const : "audio" as const };
}

export async function createGroupCall(input: { callerId: string; chatId: string; kind?: "audio" | "video" }) {
  await ensureMessagingReady();
  const sql = await getSql();
  const chatId = input.chatId.replace(/^srv:/, "");
  const members = await sql<{ profile_id: string }>`
    select profile_id from wipp_chat_members where chat_id = ${chatId}
  `;
  if (!members.some((m) => m.profile_id === input.callerId)) {
    throw new WippHttpError(403, "forbidden", "Tu n’es pas membre de ce groupe.");
  }
  const banned = await sql`
    select 1 from wipp_group_bans where chat_id = ${chatId} and profile_id = ${input.callerId} limit 1
  `;
  if (banned.length) throw new WippHttpError(403, "forbidden", "Tu es banni de ce groupe.");
  const kind = input.kind === "video" ? "video" : "audio";
  const id = uid("gcall");
  const roomName = `wippg${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;
  await sql`
    insert into wipp_group_calls (id, chat_id, kind, room_name, status, created_by)
    values (${id}, ${chatId}, ${kind}, ${roomName}, ${"ringing"}, ${input.callerId})
  `;
  for (const member of members) {
    const state = member.profile_id === input.callerId ? "joining" : "ringing";
    await sql`
      insert into wipp_group_call_members (call_id, profile_id, state)
      values (${id}, ${member.profile_id}, ${state})
    `;
    if (state !== "ringing") continue;
    const tokens = await listPushTokens(member.profile_id);
    const expoTokens = tokens.filter((t) => t.kind === "expo" || t.token.startsWith("ExponentPushToken")).map((t) => t.token);
    if (!expoTokens.length) continue;
    void sendExpoPush(expoTokens, {
      title: "WIPP",
      body: kind === "video" ? "Appel vidéo de groupe" : "Appel audio de groupe",
      priority: "high",
      channelId: "incoming_calls",
      categoryId: "incoming_call",
      data: { type: "call", eventId: id, inviteId: id, group: true, chatId },
    }).catch(() => undefined);
  }
  return { id, kind, status: "ringing", group: true as const, chatId };
}

export async function setGroupCallState(input: { meId: string; callId: string; state: string }) {
  await ensureMessagingReady();
  const allowed = ["joining", "joined", "declined", "left", "disconnected", "reconnecting"];
  if (!allowed.includes(input.state)) throw new WippHttpError(400, "bad_state", "État d’appel inconnu.");
  const sql = await getSql();
  const rows = await sql<{ chat_id: string; status: string; ended_at: string | null }>`
    select chat_id, status, ended_at::text from wipp_group_calls where id = ${input.callId} limit 1
  `;
  const call = rows[0];
  if (!call || call.ended_at) throw new WippHttpError(410, "call_closed", "Cet appel est terminé.");
  const member = await sql`
    select 1 from wipp_chat_members where chat_id = ${call.chat_id} and profile_id = ${input.meId} limit 1
  `;
  if (!member.length) throw new WippHttpError(403, "forbidden", "Tu n’es pas membre de ce groupe.");
  await sql`
    update wipp_group_call_members
    set state = ${input.state}, updated_at = now()
    where call_id = ${input.callId} and profile_id = ${input.meId}
  `;
  if (input.state === "joining" || input.state === "joined") {
    await sql`
      update wipp_group_calls
      set status = 'accepted', answered_at = coalesce(answered_at, now())
      where id = ${input.callId}
    `;
  }
  if (input.state === "left" || input.state === "declined") {
    const still = await sql<{ n: number }>`
      select count(*)::int as n from wipp_group_call_members
      where call_id = ${input.callId} and state in ('joining', 'joined', 'reconnecting')
    `;
    if ((still[0]?.n ?? 0) === 0) {
      await sql`
        update wipp_group_calls set status = 'ended', ended_at = now() where id = ${input.callId}
      `;
    }
  }
  return { ok: true as const, state: input.state };
}

export async function getOutgoingCallStatus(meId: string, callId: string) {
  await expireRinging({ callId });
  const invite = await getCallInvite(callId);
  if (invite) {
    if (invite.caller.id !== meId && invite.callee.id !== meId) {
      throw new WippHttpError(403, "forbidden", "Cet appel ne te concerne pas.");
    }
    return invite;
  }
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    kind: string;
    status: string;
    chat_id: string;
    created_at: string;
    state: string;
    created_by: string;
  }>`
    select c.id, c.kind, c.status, c.chat_id, c.created_at::text, p.state, c.created_by
    from wipp_group_calls c
    join wipp_group_call_members p on p.call_id = c.id and p.profile_id = ${meId}
    where c.id = ${callId}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  const me = await profileRow(meId);
  const host = await profileRow(row.created_by);
  if (!me || !host) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  return {
    id: row.id,
    kind: row.kind === "video" ? "video" as const : "audio" as const,
    roomName: "",
    status: row.state === "declined" ? "rejected" : row.status === "ended" ? "ended" : row.state === "joining" || row.state === "joined" ? "accepted" : row.status,
    createdAt: Date.parse(row.created_at),
    expiresAt: Date.parse(row.created_at) + 60_000,
    caller: { id: host.id, username: host.username, displayName: host.display_name, avatarUrl: host.avatar_url },
    callee: { id: me.id, username: me.username, displayName: me.display_name, avatarUrl: me.avatar_url },
    group: true,
    chatId: row.chat_id,
  };
}
