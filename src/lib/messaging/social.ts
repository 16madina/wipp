/**
 * Connections, business cards, and short-lived profile QR.
 * Uses tables already present on the hosted project. No new SQL.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

const REQUEST_TTL_MS = 7 * 86_400_000;
const QR_TTL_MS = 75_000;

function usernameOf(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

function pair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function opaqueToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = randomBytes(43);
  let out = "";
  for (let i = 0; i < 43; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

async function blockedEither(a: string, b: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_blocks
    where (blocker_id = ${a} and blocked_id = ${b})
       or (blocker_id = ${b} and blocked_id = ${a})
    limit 1
  `;
  return rows.length > 0;
}

export async function sendConnectionRequest(meId: string, rawUsername: string, viaRaw: string) {
  const username = usernameOf(rawUsername);
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new WippHttpError(400, "invalid", "Pseudo invalide.");
  }
  const via = viaRaw === "qr" || viaRaw === "touch" ? viaRaw : "request";
  const sql = await getSql();
  const peers = await sql<{ id: string }>`
    select id from wipp_profiles where lower(username) = ${username} limit 1
  `;
  const peer = peers[0];
  if (!peer) return { status: "not_found" as const };
  if (peer.id === meId) return { status: "invalid" as const };
  if (await blockedEither(meId, peer.id)) return { status: "blocked" as const };
  const [userA, userB] = pair(meId, peer.id);
  const existing = await sql`
    select id from wipp_connections where user_a = ${userA} and user_b = ${userB} limit 1
  `;
  if (existing.length) return { status: "already_connected" as const };
  const pending = await sql<{ id: string; sender_id: string }>`
    select id, sender_id from wipp_connection_requests
    where status = 'pending' and expires_at > now()
      and (
        (sender_id = ${meId} and recipient_id = ${peer.id})
        or (sender_id = ${peer.id} and recipient_id = ${meId})
      )
    limit 1
  `;
  if (pending[0]) {
    return { status: pending[0].sender_id === meId ? ("already_pending" as const) : ("pending_in" as const) };
  }
  const id = await insertConnectionRequest(meId, peer.id, via);
  return { status: "sent" as const, id };
}

function invalidPayload(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && String((err as { code?: unknown }).code) === "22P02";
}

/** Live rows use uuid ids. A rq_ text id is rejected (22P02) and the request never arrives. */
async function insertConnectionRequest(senderId: string, recipientId: string, via: string) {
  const sql = await getSql();
  const id = randomUUID();
  const expires = new Date(Date.now() + REQUEST_TTL_MS).toISOString();
  const viaTries = [...new Set([via, "request"])];
  let last: unknown;
  for (const viaValue of viaTries) {
    try {
      const rows = await sql<{ id: string }>`
        insert into wipp_connection_requests (id, sender_id, recipient_id, status, via, expires_at)
        values (${id}, ${senderId}, ${recipientId}, 'pending', ${viaValue}, ${expires}::timestamptz)
        returning id::text
      `;
      return rows[0]?.id ?? id;
    } catch (err) {
      last = err;
      if (!invalidPayload(err)) throw err;
    }
  }
  try {
    const rows = await sql<{ id: string }>`
      insert into wipp_connection_requests (id, sender_id, recipient_id, status, expires_at)
      values (${id}, ${senderId}, ${recipientId}, 'pending', ${expires}::timestamptz)
      returning id::text
    `;
    return rows[0]?.id ?? id;
  } catch (err) {
    if (!invalidPayload(err)) throw err;
    throw last ?? err;
  }
}

export async function listIncomingConnectionRequests(meId: string) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    created_at: string;
    expires_at: string;
    sender_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>`
    select r.id::text as id, r.created_at::text as created_at, r.expires_at::text as expires_at,
           p.id as sender_id, p.username, p.display_name, p.avatar_url
    from wipp_connection_requests r
    join wipp_profiles p on p.id = r.sender_id
    where r.recipient_id = ${meId}
      and r.status = 'pending'
      and r.expires_at > now()
    order by r.created_at desc
    limit 50
  `;
  return rows.map((row) => ({
    id: row.id,
    status: "pending",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    sender: {
      id: row.sender_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
  }));
}

export async function respondConnectionRequest(meId: string, requestId: string, action: string) {
  if (action !== "accept" && action !== "decline" && action !== "ignore") {
    throw new WippHttpError(400, "invalid", "Action invalide.");
  }
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    sender_id: string;
    recipient_id: string;
    status: string;
    expires_at: string;
  }>`
    select id, sender_id, recipient_id, status, expires_at::text
    from wipp_connection_requests where id = ${requestId} limit 1
  `;
  const row = rows[0];
  if (!row || row.recipient_id !== meId) return { status: "not_found" as const };
  if (row.status !== "pending") return { status: "already_handled" as const };
  if (Date.parse(row.expires_at) <= Date.now()) {
    await sql`update wipp_connection_requests set status = 'expired', responded_at = now() where id = ${row.id} and recipient_id = ${meId}`;
    return { status: "expired" as const };
  }
  if (action === "decline" || action === "ignore") {
    const status = action === "decline" ? "declined" : "ignored";
    await sql`
      update wipp_connection_requests
      set status = ${status}, responded_at = now()
      where id = ${row.id} and recipient_id = ${meId} and status = 'pending'
    `;
    return { status: action === "decline" ? ("declined" as const) : ("ignored" as const) };
  }
  if (await blockedEither(meId, row.sender_id)) return { status: "blocked" as const };
  const [userA, userB] = pair(meId, row.sender_id);
  const conn = await sql`select id from wipp_connections where user_a = ${userA} and user_b = ${userB} limit 1`;
  if (!conn.length) {
    await sql`
      insert into wipp_connections (id, user_a, user_b, via)
      values (${randomUUID()}, ${userA}, ${userB}, 'request')
    `;
  }
  const updated = await sql`
    update wipp_connection_requests
    set status = 'accepted', responded_at = now()
    where id = ${row.id} and recipient_id = ${meId} and status = 'pending'
    returning id
  `;
  if (!updated.length) return { status: "already_handled" as const };
  return { status: conn.length ? ("accepted_existing" as const) : ("accepted" as const) };
}

type CardRow = {
  id: string;
  public_id: string;
  owner_profile_id: string;
  name: string;
  category: string;
  description: string;
  country: string;
  city: string;
  address: string | null;
  show_address: boolean;
  hours: string | null;
  business_phone: string | null;
  website: string | null;
  cover_url: string | null;
  logo_url: string | null;
  photo_urls: string[] | null;
  is_published: boolean;
};

function likeQuery(raw: string) {
  return raw.trim().toLowerCase().replace(/[\\%_]/g, "").slice(0, 80);
}

async function signCardPath(path: string | null) {
  if (!path || /^https?:\/\//i.test(path)) return path && /^https?:\/\//i.test(path) ? path : null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/wipp-business-cards/${encoded}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!res.ok) {
      console.warn("[wipp-api] card media sign failed", res.status);
      return null;
    }
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signed = data.signedUrl || data.signedURL || "";
    if (!signed) return null;
    if (signed.startsWith("http")) return signed;
    return `${SUPABASE_URL}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  } catch (err) {
    console.warn("[wipp-api] card media sign failed", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

async function withServerMedia(card: ReturnType<typeof mapCard>) {
  const [coverUrl, logoUrl, ...photos] = await Promise.all([
    card.coverUrl ? Promise.resolve(card.coverUrl) : signCardPath(card.coverPath),
    card.logoUrl ? Promise.resolve(card.logoUrl) : signCardPath(card.logoPath),
    ...card.photoPaths.map((path) => signCardPath(path)),
  ]);
  return { ...card, coverUrl, logoUrl, photoUrls: photos.filter((url): url is string => Boolean(url)) };
}

function mapCard(row: CardRow) {
  const http = (value: string | null) => (value && /^https?:\/\//i.test(value) ? value : null);
  return {
    id: row.id,
    publicId: row.public_id,
    ownerProfileId: row.owner_profile_id,
    name: row.name,
    category: row.category,
    description: row.description,
    country: row.country,
    city: row.city,
    address: row.address,
    showAddress: row.show_address,
    hours: row.hours,
    businessPhone: row.business_phone,
    website: row.website,
    coverPath: row.cover_url && !http(row.cover_url) ? row.cover_url : null,
    logoPath: row.logo_url && !http(row.logo_url) ? row.logo_url : null,
    photoPaths: (row.photo_urls ?? []).filter((path) => path && !http(path)).slice(0, 8),
    isPublished: Boolean(row.is_published),
    coverUrl: http(row.cover_url),
    logoUrl: http(row.logo_url),
    photoUrls: (row.photo_urls ?? []).filter((path) => http(path)).slice(0, 8),
  };
}

/** Public view: the precise address stays private unless the owner chose to publish it. */
function publicCard(row: CardRow) {
  const card = mapCard(row);
  return card.showAddress ? card : { ...card, address: null };
}

function galleryPaths(meId: string, paths: string[] | undefined, previous: string[]) {
  if (!paths) return previous;
  const next = paths.map((path) => path.trim()).filter(Boolean).slice(0, 8);
  for (const path of next) ownMediaPath(meId, path);
  return next;
}

function ownMediaPath(meId: string, path: string | null | undefined) {
  if (!path) return null;
  if (!path.startsWith(`${meId}/`)) {
    throw new WippHttpError(400, "invalid", "Image hors du dossier du compte.");
  }
  return path;
}

export async function getMyBusinessCard(meId: string) {
  const sql = await getSql();
  const rows = await sql<CardRow>`
    select id, public_id, owner_profile_id, name, category, description, country, city,
           address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
    from wipp_business_cards where owner_profile_id = ${meId} limit 1
  `;
  return { profileId: meId, userCountry: null as string | null, card: rows[0] ? await withServerMedia(mapCard(rows[0])) : null };
}

export async function saveMyBusinessCard(
  meId: string,
  input: {
    name?: string;
    category?: string;
    description?: string;
    country?: string;
    city?: string;
    address?: string | null;
    showAddress?: boolean;
    hours?: string | null;
    businessPhone?: string | null;
    website?: string | null;
    coverPath?: string | null;
    logoPath?: string | null;
    photoPaths?: string[];
  },
) {
  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 80) throw new WippHttpError(400, "invalid", "Nom de carte invalide.");
  const cover = ownMediaPath(meId, input.coverPath);
  const logo = ownMediaPath(meId, input.logoPath);
  const sql = await getSql();
  const current = await sql<CardRow>`
    select id, public_id, owner_profile_id, name, category, description, country, city,
           address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
    from wipp_business_cards where owner_profile_id = ${meId} limit 1
  `;
  const fields = {
    name,
    category: (input.category ?? "").slice(0, 80),
    description: (input.description ?? "").slice(0, 2000),
    country: (input.country ?? "").slice(0, 80),
    city: (input.city ?? "").slice(0, 80),
    address: input.address ? input.address.slice(0, 200) : null,
    showAddress: Boolean(input.showAddress),
    hours: input.hours ? input.hours.slice(0, 200) : null,
    businessPhone: input.businessPhone ? input.businessPhone.slice(0, 40) : null,
    website: input.website ? input.website.slice(0, 200) : null,
  };
  const photos = galleryPaths(meId, input.photoPaths, current[0]?.photo_urls ?? []).join("\u001f");
  if (current[0]) {
    await sql`
      update wipp_business_cards set
        name = ${fields.name},
        category = ${fields.category},
        description = ${fields.description},
        country = ${fields.country},
        city = ${fields.city},
        address = ${fields.address},
        show_address = ${fields.showAddress},
        hours = ${fields.hours},
        business_phone = ${fields.businessPhone},
        website = ${fields.website},
        cover_url = ${cover},
        logo_url = ${logo},
        photo_urls = ARRAY(SELECT trim(x) FROM unnest(string_to_array(${photos}, E'\u001f')) AS t(x) WHERE trim(x) <> ''),
        is_published = true,
        updated_at = now()
      where id = ${current[0].id} and owner_profile_id = ${meId}
    `;
    const next = await sql<CardRow>`
      select id, public_id, owner_profile_id, name, category, description, country, city,
             address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
      from wipp_business_cards where id = ${current[0].id} and owner_profile_id = ${meId} limit 1
    `;
    if (!next[0]) throw new WippHttpError(404, "not_found", "Carte introuvable.");
    return withServerMedia(mapCard(next[0]));
  }
  const publicId = randomBytes(5).toString("hex");
  const created = await sql<CardRow>`
    insert into wipp_business_cards (
      public_id, owner_profile_id, name, category, description, country, city,
      address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
    ) values (
      ${publicId}, ${meId}, ${fields.name}, ${fields.category}, ${fields.description},
      ${fields.country}, ${fields.city}, ${fields.address}, ${fields.showAddress}, ${fields.hours},
      ${fields.businessPhone}, ${fields.website}, ${cover}, ${logo},
      ARRAY(SELECT trim(x) FROM unnest(string_to_array(${photos}, E'\u001f')) AS t(x) WHERE trim(x) <> ''),
      true
    )
    returning id, public_id, owner_profile_id, name, category, description, country, city,
      address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
  `;
  if (!created[0]) throw new WippHttpError(500, "profile_missing", "Carte introuvable.");
  return withServerMedia(mapCard(created[0]));
}

export async function listPublicBusinessCards(q = "") {
  const needle = likeQuery(q);
  const sql = await getSql();
  const rows = await sql<CardRow>`
    select id, public_id, owner_profile_id, name, category, description, country, city,
           address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
    from wipp_business_cards
    where is_published = true
      and (
        ${needle} = ''
        or lower(name) like ${"%" + needle + "%"}
        or lower(category) like ${"%" + needle + "%"}
        or lower(city) like ${"%" + needle + "%"}
        or lower(description) like ${"%" + needle + "%"}
      )
    order by updated_at desc
    limit 60
  `;
  return Promise.all(rows.map((row) => withServerMedia(publicCard(row))));
}

export async function getPublicBusinessCard(publicId: string) {
  const id = publicId.trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,40}$/.test(id)) return null;
  const sql = await getSql();
  const rows = await sql<CardRow>`
    select id, public_id, owner_profile_id, name, category, description, country, city,
           address, show_address, hours, business_phone, website, cover_url, logo_url, photo_urls, is_published
    from wipp_business_cards
    where lower(public_id) = ${id} and is_published = true
    limit 1
  `;
  return rows[0] ? withServerMedia(publicCard(rows[0])) : null;
}

export async function issueTempQr(meId: string) {
  const sql = await getSql();
  const token = opaqueToken();
  const expires = new Date(Date.now() + QR_TTL_MS).toISOString();
  await sql`
    insert into wipp_qr_tokens (token_hash, profile_id, expires_at, created_at)
    values (${sha256(token)}, ${meId}, ${expires}::timestamptz, now())
  `;
  return { token, expiresAt: Date.now() + QR_TTL_MS };
}

export async function redeemTempQr(meId: string, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: "invalid" as const };
  const sql = await getSql();
  const hash = sha256(token);
  const rows = await sql<{ profile_id: string; expires_at: string; used_at: string | null }>`
    select profile_id, expires_at::text, used_at::text
    from wipp_qr_tokens where token_hash = ${hash} limit 1
  `;
  const row = rows[0];
  if (!row) return { status: "invalid" as const };
  if (row.used_at) return { status: "used" as const };
  if (Date.parse(row.expires_at) <= Date.now()) return { status: "expired" as const };
  if (row.profile_id === meId) return { status: "self" as const };
  const consumed = await sql<{ profile_id: string }>`
    update wipp_qr_tokens
    set used_at = now()
    where token_hash = ${hash} and used_at is null and expires_at > now()
    returning profile_id
  `;
  if (!consumed[0]) return { status: "used" as const };
  const profiles = await sql<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
  }>`
    select id, username, display_name, avatar_url, bio
    from wipp_profiles where id = ${consumed[0].profile_id} limit 1
  `;
  const profile = profiles[0];
  if (!profile) return { status: "invalid" as const };
  const [userA, userB] = pair(meId, profile.id);
  const conn = await sql`select id from wipp_connections where user_a = ${userA} and user_b = ${userB} limit 1`;
  return {
    status: "ok" as const,
    connected: conn.length > 0,
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio ?? "",
    },
  };
}

function chatId() {
  return `c_${randomBytes(12).toString("hex")}`;
}

/** Conversation boutique : même wipp_chats, marquée par la carte. Le propriétaire vient du serveur. */
export async function openBusinessChat(meId: string, publicId: string) {
  const sql = await getSql();
  const cards = await sql<{ id: string; owner_profile_id: string }>`
    select id, owner_profile_id
    from wipp_business_cards
    where public_id = ${publicId}
    limit 1
  `;
  const card = cards[0];
  if (!card) throw new WippHttpError(404, "not_found", "Carte introuvable.");
  if (!card.owner_profile_id) throw new WippHttpError(404, "not_found", "Carte introuvable.");
  if (card.owner_profile_id === meId) {
    throw new WippHttpError(400, "self_chat", "Tu ne peux pas écrire à ta propre boutique.");
  }
  const existing = await sql<{ id: string }>`
    select c.id
    from wipp_chats c
    join wipp_chat_members mine on mine.chat_id = c.id and mine.profile_id = ${meId}
    join wipp_chat_members owner on owner.chat_id = c.id and owner.profile_id = ${card.owner_profile_id}
    where c.business_card_id = ${card.id}
    limit 1
  `;
  if (existing[0]) return { chatId: existing[0].id };
  const id = chatId();
  try {
    await sql`
      insert into wipp_chats (id, business_card_id, business_owner_id)
      values (${id}, ${card.id}, ${card.owner_profile_id})
    `;
    await sql`insert into wipp_chat_members (chat_id, profile_id) values (${id}, ${meId})`;
    await sql`
      insert into wipp_chat_members (chat_id, profile_id)
      values (${id}, ${card.owner_profile_id})
    `;
  } catch (err) {
    const again = await sql<{ id: string }>`
      select c.id
      from wipp_chats c
      join wipp_chat_members mine on mine.chat_id = c.id and mine.profile_id = ${meId}
      join wipp_chat_members owner on owner.chat_id = c.id and owner.profile_id = ${card.owner_profile_id}
      where c.business_card_id = ${card.id}
      limit 1
    `;
    if (again[0]) return { chatId: again[0].id };
    throw err;
  }
  return { chatId: id };
}

export async function listBusinessChatContexts(meId: string) {
  const sql = await getSql();
  const rows = await sql<{
    chat_id: string;
    public_id: string;
    name: string;
    category: string;
    city: string;
    logo_url: string | null;
    business_owner_id: string | null;
  }>`
    select c.id as chat_id,
           bc.public_id,
           bc.name,
           bc.category,
           bc.city,
           bc.logo_url,
           c.business_owner_id
    from wipp_chats c
    join wipp_chat_members m on m.chat_id = c.id and m.profile_id = ${meId}
    join wipp_business_cards bc on bc.id = c.business_card_id
    where c.business_card_id is not null
  `;
  return rows.map((row) => ({
    chatId: row.chat_id,
    publicId: row.public_id,
    name: row.name,
    category: row.category,
    city: row.city,
    logoUrl: row.logo_url,
    ownerIsMe: row.business_owner_id === meId,
  }));
}
