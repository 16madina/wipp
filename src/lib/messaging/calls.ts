/**
 * Call invite signaling + push token registration.
 * Works with LiveKit room names minted at invite time.
 */
import { getSql } from "@/lib/db";
import { sendExpoPush } from "@/lib/push/expo";
import { WippHttpError, ensureMessagingReady } from "@/lib/messaging/server";

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
  await sql`
    insert into wipp_push_tokens (id, profile_id, token, platform, kind, updated_at)
    values (${id}, ${input.profileId}, ${token}, ${platform}, ${kind}, now())
    on conflict (profile_id, token) do update
      set platform = excluded.platform,
          kind = excluded.kind,
          updated_at = now()
  `;
  return { ok: true as const };
}

export async function listPushTokens(profileId: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  return sql<{ token: string; platform: string; kind: string }>`
    select token, platform, kind from wipp_push_tokens
    where profile_id = ${profileId}
    order by updated_at desc
  `;
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
  const kind = input.kind === "video" ? "video" : "audio";
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
  const tokens = await listPushTokens(calleeId);
  const expoTokens = tokens.filter((t) => t.kind === "expo" || t.token.startsWith("ExponentPushToken")).map((t) => t.token);
  if (expoTokens.length) {
    void sendExpoPush(expoTokens, {
      title: dto.caller.displayName,
      body: kind === "video" ? "Appel vidéo WIPP" : "Appel audio WIPP",
      priority: "high",
      channelId: "incoming_calls",
      categoryId: "incoming_call",
      data: {
        type: "incoming_call",
        callId: dto.id,
        roomName: dto.roomName,
        kind: dto.kind,
        fromUsername: dto.caller.username,
        fromDisplayName: dto.caller.displayName,
        fromId: dto.caller.id,
      },
    }).catch((err) => console.warn("[wipp-call] push", err));
  }

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
  const notifyId = row.caller_id;
  const tokens = await listPushTokens(notifyId);
  const expoTokens = tokens.map((t) => t.token).filter((t) => t.startsWith("ExponentPushToken") || t.length > 20);
  if (expoTokens.length) {
    void sendExpoPush(expoTokens, {
      title: "WIPP",
      body: input.accept ? "Appel accepté" : "Appel refusé",
      data: {
        type: input.accept ? "call_accepted" : "call_rejected",
        callId: input.callId,
        roomName: row.room_name,
        kind: row.kind,
      },
    }).catch(() => undefined);
  }

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
    set status = ${next}, answered_at = coalesce(answered_at, now())
    where id = ${input.callId}
  `;
  const updated = await getCallInvite(input.callId);
  if (!updated) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  return updated;
}

export async function getOutgoingCallStatus(meId: string, callId: string) {
  const invite = await getCallInvite(callId);
  if (!invite) throw new WippHttpError(404, "not_found", "Appel introuvable.");
  if (invite.caller.id !== meId && invite.callee.id !== meId) {
    throw new WippHttpError(403, "forbidden", "Cet appel ne te concerne pas.");
  }
  return invite;
}
