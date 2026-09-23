/**
 * WIPP messaging server — profiles (@username), sessions, 1:1 chats & messages.
 * Uses getSql() (PGLite locally, Postgres when DATABASE_URL is set).
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ensureDbReady, getSql } from "@/lib/db";
import type { WippChatSummary, WippMessage, WippProfile, WippSessionPayload } from "./types";

const SESSION_DAYS = 30;
const DEMO_PASSWORD = "wipp-demo";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

function assertUsername(username: string) {
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new WippHttpError(400, "invalid_username", "Le @username doit faire 3–24 caractères (a-z, 0-9, _).");
  }
}

export class WippHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  password_hash?: string;
};

function mapProfile(row: ProfileRow): WippProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

async function seedDemoUsers() {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`select count(*)::int as c from wipp_profiles`;
  if ((existing[0]?.c ?? 0) > 0) return;

  const demos = [
    { username: "deena", displayName: "Deena Diallo", bio: "Fondatrice WIPP" },
    { username: "lea", displayName: "Léa Martin", bio: "Boutique démo" },
    { username: "samira", displayName: "Samira K.", bio: "Montréal" },
  ];
  for (const d of demos) {
    await sql`
      insert into wipp_profiles (id, username, display_name, password_hash, bio)
      values (${uid("u")}, ${d.username}, ${d.displayName}, ${hashPassword(DEMO_PASSWORD)}, ${d.bio})
    `;
  }
}

export async function ensureMessagingReady() {
  await ensureDbReady();
  await seedDemoUsers();
}

export async function registerProfile(input: {
  username: string;
  password: string;
  displayName: string;
}): Promise<WippSessionPayload> {
  await ensureMessagingReady();
  const username = normalizeUsername(input.username);
  assertUsername(username);
  if (!input.password || input.password.length < 6) {
    throw new WippHttpError(400, "weak_password", "Mot de passe trop court (6+).");
  }
  const displayName = input.displayName.trim() || username;
  const sql = await getSql();
  const clash = await sql`select id from wipp_profiles where lower(username) = ${username} limit 1`;
  if (clash.length) {
    throw new WippHttpError(409, "username_taken", `@${username} est déjà pris.`);
  }
  const id = uid("u");
  await sql`
    insert into wipp_profiles (id, username, display_name, password_hash)
    values (${id}, ${username}, ${displayName}, ${hashPassword(input.password)})
  `;
  return createSession(id);
}

export async function loginProfile(input: {
  username: string;
  password: string;
}): Promise<WippSessionPayload> {
  await ensureMessagingReady();
  const username = normalizeUsername(input.username);
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text, password_hash
    from wipp_profiles where lower(username) = ${username} limit 1
  `;
  const row = rows[0];
  if (!row?.password_hash || !verifyPassword(input.password, row.password_hash)) {
    throw new WippHttpError(401, "bad_credentials", "Identifiants incorrects.");
  }
  return createSession(row.id);
}

async function createSession(profileId: string): Promise<WippSessionPayload> {
  const sql = await getSql();
  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await sql`
    insert into wipp_sessions (token, profile_id, expires_at)
    values (${token}, ${profileId}, ${expires}::timestamptz)
  `;
  const profile = await getProfileById(profileId);
  if (!profile) throw new WippHttpError(500, "profile_missing", "Profil introuvable.");
  return { token, profile };
}

export async function resolveSession(token: string | null | undefined): Promise<WippProfile> {
  await ensureMessagingReady();
  if (!token) throw new WippHttpError(401, "unauthorized", "Session requise.");
  const sql = await getSql();
  const rows = await sql<{ profile_id: string }>`
    select profile_id from wipp_sessions
    where token = ${token} and expires_at > now()
    limit 1
  `;
  const profileId = rows[0]?.profile_id;
  if (!profileId) throw new WippHttpError(401, "unauthorized", "Session expirée.");
  const profile = await getProfileById(profileId);
  if (!profile) throw new WippHttpError(401, "unauthorized", "Session invalide.");
  return profile;
}

export async function logoutSession(token: string | null | undefined) {
  if (!token) return;
  await ensureMessagingReady();
  const sql = await getSql();
  await sql`delete from wipp_sessions where token = ${token}`;
}

/**
 * Permanent account deletion (Play / App Store data-deletion requirement).
 * Cascades sessions, devices, link codes, memberships and messages via FK.
 */
export async function deleteAccount(input: {
  username: string;
  password: string;
}): Promise<{ ok: true; username: string }> {
  await ensureMessagingReady();
  const username = normalizeUsername(input.username);
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text, password_hash
    from wipp_profiles where lower(username) = ${username} limit 1
  `;
  const row = rows[0];
  if (!row?.password_hash || !verifyPassword(input.password, row.password_hash)) {
    throw new WippHttpError(401, "bad_credentials", "Identifiants incorrects.");
  }
  // Null-out message senders that would block if FKs were RESTRICT (ours are CASCADE).
  await sql`delete from wipp_devices where profile_id = ${row.id}`;
  await sql`delete from wipp_sessions where profile_id = ${row.id}`;
  await sql`delete from wipp_profiles where id = ${row.id}`;
  return { ok: true, username: row.username };
}

async function getProfileById(id: string): Promise<WippProfile | null> {
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text
    from wipp_profiles where id = ${id} limit 1
  `;
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function searchProfiles(q: string, meId: string): Promise<WippProfile[]> {
  await ensureMessagingReady();
  const needle = normalizeUsername(q);
  if (needle.length < 1) return [];
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text
    from wipp_profiles
    where id <> ${meId}
      and (lower(username) like ${`%${needle}%`} or lower(display_name) like ${`%${needle}%`})
    order by username
    limit 20
  `;
  return rows.map(mapProfile);
}

export async function getOrCreateDm(meId: string, peerUsername: string): Promise<WippChatSummary> {
  await ensureMessagingReady();
  const username = normalizeUsername(peerUsername);
  const sql = await getSql();
  const peers = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text
    from wipp_profiles where lower(username) = ${username} limit 1
  `;
  const peer = peers[0];
  if (!peer) throw new WippHttpError(404, "user_not_found", `@${username} introuvable.`);
  if (peer.id === meId) throw new WippHttpError(400, "self_chat", "Impossible de discuter avec soi-même.");

  const existing = await sql<{ chat_id: string }>`
    select m1.chat_id
    from wipp_chat_members m1
    join wipp_chat_members m2 on m1.chat_id = m2.chat_id
    where m1.profile_id = ${meId} and m2.profile_id = ${peer.id}
    limit 1
  `;
  let chatId = existing[0]?.chat_id;
  if (!chatId) {
    chatId = uid("c");
    await sql`insert into wipp_chats (id) values (${chatId})`;
    await sql`insert into wipp_chat_members (chat_id, profile_id) values (${chatId}, ${meId})`;
    await sql`insert into wipp_chat_members (chat_id, profile_id) values (${chatId}, ${peer.id})`;
  }
  const chats = await listChats(meId);
  const hit = chats.find((c) => c.id === chatId);
  if (hit) return hit;
  return {
    id: chatId,
    peer: mapProfile(peer),
    preview: "",
    lastAt: Date.now(),
    unread: 0,
  };
}

export async function listChats(meId: string): Promise<WippChatSummary[]> {
  await ensureMessagingReady();
  const sql = await getSql();
  const memberships = await sql<{ chat_id: string }>`
    select chat_id from wipp_chat_members where profile_id = ${meId}
  `;
  const out: WippChatSummary[] = [];
  for (const m of memberships) {
    const peers = await sql<ProfileRow>`
      select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.created_at::text
      from wipp_chat_members cm
      join wipp_profiles p on p.id = cm.profile_id
      where cm.chat_id = ${m.chat_id} and cm.profile_id <> ${meId}
      limit 1
    `;
    const peer = peers[0];
    if (!peer) continue;
    const last = await sql<{ body: string; created_at: string }>`
      select body, created_at::text from wipp_messages
      where chat_id = ${m.chat_id}
      order by created_at desc limit 1
    `;
    out.push({
      id: m.chat_id,
      peer: mapProfile(peer),
      preview: last[0]?.body ?? "",
      lastAt: last[0] ? Date.parse(last[0].created_at) : Date.now(),
      unread: 0,
    });
  }
  out.sort((a, b) => b.lastAt - a.lastAt);
  return out;
}

export async function listMessages(meId: string, chatId: string, after?: number): Promise<WippMessage[]> {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  const rows = after
    ? await sql<{
        id: string;
        chat_id: string;
        sender_id: string;
        body: string;
        client_id: string | null;
        created_at: string;
      }>`
        select id, chat_id, sender_id, body, client_id, created_at::text
        from wipp_messages
        where chat_id = ${chatId} and created_at > to_timestamp(${after / 1000.0})
        order by created_at asc
        limit 200
      `
    : await sql<{
        id: string;
        chat_id: string;
        sender_id: string;
        body: string;
        client_id: string | null;
        created_at: string;
      }>`
        select id, chat_id, sender_id, body, client_id, created_at::text
        from wipp_messages
        where chat_id = ${chatId}
        order by created_at asc
        limit 200
      `;
  return rows.map((r) => ({
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    body: r.body,
    clientId: r.client_id,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function sendMessage(
  meId: string,
  chatId: string,
  body: string,
  clientId?: string,
): Promise<WippMessage> {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const text = body.trim();
  if (!text) throw new WippHttpError(400, "empty", "Message vide.");
  const sql = await getSql();
  if (clientId) {
    const dup = await sql<{
      id: string;
      chat_id: string;
      sender_id: string;
      body: string;
      client_id: string | null;
      created_at: string;
    }>`
      select id, chat_id, sender_id, body, client_id, created_at::text
      from wipp_messages where chat_id = ${chatId} and client_id = ${clientId} limit 1
    `;
    if (dup[0]) {
      return {
        id: dup[0].id,
        chatId: dup[0].chat_id,
        senderId: dup[0].sender_id,
        body: dup[0].body,
        clientId: dup[0].client_id,
        createdAt: Date.parse(dup[0].created_at),
      };
    }
  }
  const id = uid("m");
  // Deterministic-ish id from clientId when present (debug-friendly)
  const msgId = clientId ? `m_${createHash("sha256").update(`${chatId}:${clientId}`).digest("hex").slice(0, 24)}` : id;
  await sql`
    insert into wipp_messages (id, chat_id, sender_id, body, client_id)
    values (${msgId}, ${chatId}, ${meId}, ${text}, ${clientId ?? null})
  `;
  return {
    id: msgId,
    chatId,
    senderId: meId,
    body: text,
    clientId: clientId ?? null,
    createdAt: Date.now(),
  };
}

async function assertMember(meId: string, chatId: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_chat_members where chat_id = ${chatId} and profile_id = ${meId} limit 1
  `;
  if (!rows.length) throw new WippHttpError(403, "forbidden", "Tu n'es pas membre de ce chat.");
}

function randomLinkCode() {
  // 8 chars, readable (no 0/O/1/I)
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

export type LinkCodePayload = {
  code: string;
  token: string;
  expiresAt: number;
  status: string;
  qrUrl: string;
};

/** Web creates a pending link code; phone claims it while logged in. */
export async function createLinkCode(input: {
  userAgent?: string;
  origin: string;
}): Promise<LinkCodePayload> {
  await ensureMessagingReady();
  const sql = await getSql();
  const code = randomLinkCode();
  const token = randomBytes(18).toString("hex");
  const expiresAt = Date.now() + 10 * 60_000;
  await sql`
    insert into wipp_link_codes (code, token, status, user_agent, expires_at)
    values (${code}, ${token}, 'pending', ${input.userAgent ?? null}, ${new Date(expiresAt).toISOString()}::timestamptz)
  `;
  return {
    code,
    token,
    expiresAt,
    status: "pending",
    qrUrl: `${input.origin.replace(/\/$/, "")}/connect?code=${code}`,
  };
}

export async function getLinkStatus(token: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  const rows = await sql<{
    status: string;
    profile_id: string | null;
    expires_at: string;
  }>`
    select status, profile_id, expires_at::text
    from wipp_link_codes
    where token = ${token}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Code introuvable.");
  if (Date.parse(row.expires_at) < Date.now() && row.status === "pending") {
    await sql`update wipp_link_codes set status = 'expired' where token = ${token}`;
    return { status: "expired" as const };
  }
  if (row.status === "claimed" && row.profile_id) {
    const profile = await getProfileById(row.profile_id);
    const devices = await sql<{ session_token: string | null }>`
      select session_token from wipp_devices
      where profile_id = ${row.profile_id} and kind = 'web'
      order by created_at desc limit 1
    `;
    let sessionToken = devices[0]?.session_token ?? null;
    let session: WippSessionPayload | null = null;
    if (sessionToken) {
      try {
        const p = await resolveSession(sessionToken);
        session = { token: sessionToken, profile: p };
      } catch {
        sessionToken = null;
      }
    }
    if (!session) {
      session = await createSession(row.profile_id);
      await sql`
        update wipp_devices
        set session_token = ${session.token}, last_seen_at = now()
        where profile_id = ${row.profile_id} and kind = 'web'
          and id = (
            select id from wipp_devices
            where profile_id = ${row.profile_id} and kind = 'web'
            order by created_at desc limit 1
          )
      `;
    }
    return { status: "claimed" as const, profile, session };
  }
  return { status: row.status as "pending" | "expired" | "claimed" };
}

/** Phone (logged-in) claims a code shown on the web. */
export async function claimLinkCode(meId: string, codeRaw: string) {
  await ensureMessagingReady();
  const code = codeRaw.trim().toUpperCase().replace(/\s+/g, "");
  const sql = await getSql();
  const rows = await sql<{ token: string; status: string; expires_at: string }>`
    select token, status, expires_at::text from wipp_link_codes
    where code = ${code} limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Code invalide.");
  if (row.status !== "pending") {
    throw new WippHttpError(409, "already_used", "Ce code a déjà été utilisé.");
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    await sql`update wipp_link_codes set status = 'expired' where code = ${code}`;
    throw new WippHttpError(410, "expired", "Code expiré — régénère-le sur le web.");
  }
  const session = await createSession(meId);
  const deviceId = uid("d");
  await sql`
    update wipp_link_codes
    set status = 'claimed', profile_id = ${meId}, claimed_at = now()
    where code = ${code}
  `;
  await sql`
    insert into wipp_devices (id, profile_id, label, kind, session_token)
    values (${deviceId}, ${meId}, ${"Navigateur web"}, ${"web"}, ${session.token})
  `;
  const profile = await getProfileById(meId);
  return { ok: true as const, profile, code };
}

export async function listDevices(meId: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    label: string;
    kind: string;
    last_seen_at: string;
    created_at: string;
  }>`
    select id, label, kind, last_seen_at::text, created_at::text
    from wipp_devices where profile_id = ${meId}
    order by created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    kind: r.kind,
    lastSeenAt: Date.parse(r.last_seen_at),
    createdAt: Date.parse(r.created_at),
  }));
}

export { DEMO_PASSWORD, normalizeUsername };
