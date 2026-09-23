/**
 * WIPP messaging server — profiles (@username), sessions, 1:1 chats & messages.
 * Uses getSql() (PGLite locally, Postgres when DATABASE_URL is set).
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ensureDbReady, getSql } from "@/lib/db";
import type {
  WippAdminStats,
  WippAdminUser,
  WippChatSummary,
  WippMessage,
  WippProfile,
  WippSessionPayload,
} from "./types";

const SESSION_DAYS = 365;
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
  e2e_public_jwk?: JsonWebKey | null;
  role?: string;
  phone_e164?: string | null;
};

function mapProfile(row: ProfileRow): WippProfile {
  const role = row.role === "admin" ? "admin" : "user";
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    e2ePublicJwk: row.e2e_public_jwk ?? null,
    role,
    phoneE164: row.phone_e164 ?? null,
    isAdmin: role === "admin",
  };
}

function normalizePhone(raw: string) {
  const cleaned = raw.trim().replace(/[\s().-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

function isPublicJwk(value: unknown): value is JsonWebKey {
  if (!value || typeof value !== "object") return false;
  const j = value as JsonWebKey;
  return j.kty === "EC" && j.crv === "P-256" && typeof j.x === "string" && typeof j.y === "string" && !j.d;
}

export async function publishE2ePublicKey(meId: string, publicJwk: unknown): Promise<WippProfile> {
  await ensureMessagingReady();
  if (!isPublicJwk(publicJwk)) {
    throw new WippHttpError(400, "bad_e2e_key", "Clé publique E2E invalide (EC P-256 sans d).");
  }
  const sql = await getSql();
  await sql`
    update wipp_profiles
    set e2e_public_jwk = ${JSON.stringify(publicJwk)}::jsonb
    where id = ${meId}
  `;
  const profile = await getProfileById(meId);
  if (!profile) throw new WippHttpError(500, "profile_missing", "Profil introuvable.");
  return profile;
}

function messagePreview(body: string) {
  const t = body.trim();
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { e2e?: boolean };
      if (o?.e2e === true) return "🔒 Message chiffré";
    } catch {
      /* plain */
    }
  }
  return body.slice(0, 140);
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
  await ensureAdminAccount();
}

async function ensureAdminAccount() {
  const sql = await getSql();
  // Promote @admin if present
  await sql`update wipp_profiles set role = 'admin' where lower(username) = 'admin'`;
  const rows = await sql<{ id: string }>`
    select id from wipp_profiles where lower(username) = 'admin' limit 1
  `;
  if (rows[0]) return;
  // Create admin shell if missing (password must be set via register or link)
  await sql`
    insert into wipp_profiles (id, username, display_name, password_hash, bio, role)
    values (
      ${uid("u")},
      'admin',
      'Admin Wipp',
      ${hashPassword(process.env.WIPP_ADMIN_PASSWORD || "WippAdmin!change-me")},
      'Compte administrateur',
      'admin'
    )
  `;
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
  username?: string;
  phone?: string;
  password: string;
}): Promise<WippSessionPayload> {
  await ensureMessagingReady();
  const sql = await getSql();
  const password = input.password ?? "";
  if (!password) throw new WippHttpError(400, "bad_credentials", "Mot de passe requis.");

  const phone = input.phone ? normalizePhone(input.phone) : "";
  let row: ProfileRow | undefined;

  if (phone && /^\+[1-9]\d{7,14}$/.test(phone)) {
    const rows = await sql<ProfileRow>`
      select id, username, display_name, avatar_url, bio, created_at::text, password_hash,
             e2e_public_jwk, role, phone_e164
      from wipp_profiles where phone_e164 = ${phone} limit 1
    `;
    row = rows[0];
  } else {
    const username = normalizeUsername(input.username ?? "");
    if (!username) throw new WippHttpError(400, "bad_credentials", "Téléphone ou @username requis.");
    const rows = await sql<ProfileRow>`
      select id, username, display_name, avatar_url, bio, created_at::text, password_hash,
             e2e_public_jwk, role, phone_e164
      from wipp_profiles where lower(username) = ${username} limit 1
    `;
    row = rows[0];
  }

  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    throw new WippHttpError(401, "bad_credentials", "Identifiants incorrects.");
  }
  return createSession(row.id);
}

/** Admin lie son numéro pour se connecter ensuite avec téléphone + mot de passe. */
export async function linkAdminPhone(meId: string, phoneRaw: string): Promise<WippProfile> {
  await ensureMessagingReady();
  const me = await getProfileById(meId);
  if (!me?.isAdmin) throw new WippHttpError(403, "forbidden", "Réservé à l’admin.");
  const phone = normalizePhone(phoneRaw);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new WippHttpError(400, "invalid_phone", "Numéro invalide (ex. +225…).");
  }
  const sql = await getSql();
  const clash = await sql<{ id: string }>`
    select id from wipp_profiles where phone_e164 = ${phone} and id <> ${meId} limit 1
  `;
  if (clash[0]) throw new WippHttpError(409, "phone_taken", "Ce numéro est déjà lié à un autre compte.");
  await sql`update wipp_profiles set phone_e164 = ${phone} where id = ${meId}`;
  const profile = await getProfileById(meId);
  if (!profile) throw new WippHttpError(500, "profile_missing", "Profil introuvable.");
  return profile;
}

async function assertAdmin(meId: string) {
  const me = await getProfileById(meId);
  if (!me?.isAdmin) throw new WippHttpError(403, "forbidden", "Réservé à l’admin.");
  return me;
}

export async function adminStats(meId: string): Promise<WippAdminStats> {
  await assertAdmin(meId);
  const sql = await getSql();
  const [users] = await sql<{ c: number }>`select count(*)::int as c from wipp_profiles`;
  const [chats] = await sql<{ c: number }>`select count(*)::int as c from wipp_chats`;
  const [messages] = await sql<{ c: number }>`select count(*)::int as c from wipp_messages`;
  const [blocks] = await sql<{ c: number }>`select count(*)::int as c from wipp_blocks`;
  const [flags] = await sql<{ c: number }>`
    select count(*)::int as c from wipp_moderation_flags where status = 'open'
  `;
  const [admins] = await sql<{ c: number }>`
    select count(*)::int as c from wipp_profiles where role = 'admin'
  `;
  return {
    users: users?.c ?? 0,
    chats: chats?.c ?? 0,
    messages: messages?.c ?? 0,
    blocks: blocks?.c ?? 0,
    openFlags: flags?.c ?? 0,
    admins: admins?.c ?? 0,
  };
}

export async function adminListUsers(meId: string): Promise<WippAdminUser[]> {
  await assertAdmin(meId);
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    username: string;
    display_name: string;
    phone_e164: string | null;
    role: string;
    created_at: string;
    blocked: boolean;
  }>`
    select p.id, p.username, p.display_name, p.phone_e164, p.role, p.created_at::text,
      exists(
        select 1 from wipp_blocks b
        where b.blocker_id = ${meId} and b.blocked_id = p.id
      ) as blocked
    from wipp_profiles p
    order by p.created_at desc
    limit 100
  `;
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    phoneE164: r.phone_e164,
    role: r.role || "user",
    createdAt: r.created_at,
    blockedByAdmin: Boolean(r.blocked),
  }));
}

export async function adminListRecentMessages(meId: string) {
  await assertAdmin(meId);
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    chat_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    username: string;
  }>`
    select m.id, m.chat_id, m.sender_id, m.body, m.created_at::text, p.username
    from wipp_messages m
    join wipp_profiles p on p.id = m.sender_id
    order by m.created_at desc
    limit 50
  `;
  return rows.map((r) => ({
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    username: r.username,
    preview: messagePreview(r.body),
    createdAt: Date.parse(r.created_at),
  }));
}

export async function adminListFlags(meId: string) {
  await assertAdmin(meId);
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    created_at: string;
  }>`
    select id, target_type, target_id, reason, status, created_at::text
    from wipp_moderation_flags
    order by created_at desc
    limit 50
  `;
  return rows.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    status: r.status,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function adminBlockUser(meId: string, targetUsername: string, reason = "") {
  await assertAdmin(meId);
  const sql = await getSql();
  const username = normalizeUsername(targetUsername);
  const targets = await sql<{ id: string }>`
    select id from wipp_profiles where lower(username) = ${username} limit 1
  `;
  const target = targets[0];
  if (!target) throw new WippHttpError(404, "user_not_found", `@${username} introuvable.`);
  if (target.id === meId) throw new WippHttpError(400, "self_block", "Impossible de te bloquer.");
  const id = uid("blk");
  await sql`
    insert into wipp_blocks (id, blocker_id, blocked_id, reason)
    values (${id}, ${meId}, ${target.id}, ${reason})
    on conflict (blocker_id, blocked_id) do update set reason = excluded.reason
  `;
  return { ok: true, blockedId: target.id, username };
}

export async function adminUnblockUser(meId: string, targetUsername: string) {
  await assertAdmin(meId);
  const sql = await getSql();
  const username = normalizeUsername(targetUsername);
  await sql`
    delete from wipp_blocks b
    using wipp_profiles p
    where b.blocker_id = ${meId}
      and b.blocked_id = p.id
      and lower(p.username) = ${username}
  `;
  return { ok: true };
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
  // Sliding expiry — rester connecté tant qu’on ouvre l’app (style WhatsApp).
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await sql`
    update wipp_sessions
    set expires_at = ${expires}::timestamptz
    where token = ${token}
  `;
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

function usernameFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const tail = (digits.slice(-10) || digits || randomBytes(4).toString("hex")).toLowerCase();
  return `u${tail}`.slice(0, 24);
}

/**
 * After Firebase Phone Auth succeeds on device, exchange ID token for a Wipp session.
 * Supabase stays the DB; Firebase is SMS-only.
 */
export async function loginWithFirebaseIdToken(idToken: string): Promise<WippSessionPayload> {
  await ensureMessagingReady();
  const { verifyFirebaseIdToken } = await import("@/lib/firebase/verify-id-token");
  let claims;
  try {
    claims = await verifyFirebaseIdToken(idToken);
  } catch {
    throw new WippHttpError(401, "invalid_firebase_token", "Jeton Firebase invalide.");
  }
  if (!claims.phone) {
    throw new WippHttpError(400, "phone_required", "Le jeton Firebase ne contient pas de numéro.");
  }
  const sql = await getSql();
  const byUid = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text
    from wipp_profiles where firebase_uid = ${claims.uid} limit 1
  `;
  if (byUid[0]) {
    return createSession(byUid[0].id);
  }
  const byPhone = await sql<ProfileRow>`
    select id, username, display_name, avatar_url, bio, created_at::text
    from wipp_profiles where phone_e164 = ${claims.phone} limit 1
  `;
  if (byPhone[0]) {
    await sql`
      update wipp_profiles
      set firebase_uid = ${claims.uid}, phone_e164 = ${claims.phone}
      where id = ${byPhone[0].id}
    `;
    return createSession(byPhone[0].id);
  }

  let username = usernameFromPhone(claims.phone);
  for (let i = 0; i < 5; i++) {
    const clash = await sql`select id from wipp_profiles where lower(username) = ${username} limit 1`;
    if (!clash.length) break;
    username = `u${randomBytes(5).toString("hex")}`.slice(0, 24);
  }
  const id = uid("u");
  // Random password placeholder — account is phone-auth only; password login disabled unless set later.
  const placeholder = hashPassword(randomBytes(24).toString("hex"));
  await sql`
    insert into wipp_profiles (id, username, display_name, password_hash, bio, firebase_uid, phone_e164)
    values (
      ${id},
      ${username},
      ${"Wipp"},
      ${placeholder},
      ${""},
      ${claims.uid},
      ${claims.phone}
    )
  `;
  return createSession(id);
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
    select id, username, display_name, avatar_url, bio, created_at::text,
           e2e_public_jwk, role, phone_e164
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
    select id, username, display_name, avatar_url, bio, created_at::text, e2e_public_jwk
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
    select id, username, display_name, avatar_url, bio, created_at::text, e2e_public_jwk
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
      select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.created_at::text, p.e2e_public_jwk
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
      preview: last[0] ? messagePreview(last[0].body) : "",
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
