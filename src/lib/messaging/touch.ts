/**
 * WIPP Touch invites — one ephemeral token for BLE + QR + code.
 * No phone, email, or permanent id in the broadcast payload.
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError, ensureMessagingReady } from "@/lib/messaging/server";

/** Fixed BLE service UUID (hex only). Same on iOS + Android. */
export const WIPP_TOUCH_SERVICE_UUID = "6eeff345-1111-4a2b-9c3d-aabbccddeeff";

/**
 * Ephemeral invite code format (BLE + QR + typed share the same token):
 * - Length: 8
 * - Alphabet: 32 chars (no I/O/0/1) → 5 bits/char
 * - Entropy: 40 bits
 * Brute-force resistance also depends on TTL (90s) + rate limits — not length alone.
 */
export const WIPP_TOUCH_CODE_LENGTH = 8;
export const WIPP_TOUCH_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WIPP_TOUCH_CODE_ENTROPY_BITS =
  Math.log2(WIPP_TOUCH_CODE_ALPHABET.length) * WIPP_TOUCH_CODE_LENGTH; // 40

const CODE_ALPHABET = WIPP_TOUCH_CODE_ALPHABET;
const TTL_MS = 90_000;

function uid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function mintCode(len = WIPP_TOUCH_CODE_LENGTH) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

export type TouchInviteDto = {
  id: string;
  code: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  serviceUuid: string;
  /** Deep link / QR payload — same invite as BLE code */
  qrPayload: string;
  arbitration?: string;
  shockAt?: number | null;
  matchedProfileId?: string | null;
  message?: string | null;
  sender: {
    id: string;
    username: string;
    displayName: string;
    firstName: string;
    avatarUrl?: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    displayName: string;
    firstName: string;
    avatarUrl?: string | null;
  } | null;
};

async function profileBrief(id: string) {
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
  const r = rows[0];
  if (!r) return null;
  const firstName = r.display_name.trim().split(/\s+/)[0] || r.username;
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    firstName,
    avatarUrl: r.avatar_url,
  };
}

async function expireStale(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    update wipp_touch_invites
    set status = 'expired', resolved_at = coalesce(resolved_at, now())
    where status = 'active' and expires_at < now()
  `;
}

function qrFor(code: string) {
  return `https://wippapp.com/t/${code}`;
}

export async function loadInviteRow(idOrCode: string): Promise<TouchInviteDto | null> {
  const sql = await getSql();
  await expireStale(sql);
  const key = idOrCode.trim().toUpperCase();
  const rows = await sql<{
    id: string;
    code: string;
    status: string;
    created_at: string;
    expires_at: string;
    sender_id: string;
    receiver_id: string | null;
    shock_at: string | null;
    arbitration: string | null;
    matched_profile_id: string | null;
  }>`
    select id, code, status, created_at::text, expires_at::text, sender_id, receiver_id,
           shock_at::text, arbitration, matched_profile_id
    from wipp_touch_invites
    where id = ${idOrCode} or upper(code) = ${key}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const sender = await profileBrief(row.sender_id);
  if (!sender) return null;
  const receiver = row.receiver_id ? await profileBrief(row.receiver_id) : null;
  const arbitration = row.arbitration || "waiting_shock";
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    createdAt: Date.parse(row.created_at),
    expiresAt: Date.parse(row.expires_at),
    serviceUuid: WIPP_TOUCH_SERVICE_UUID,
    qrPayload: qrFor(row.code),
    arbitration,
    shockAt: row.shock_at ? Date.parse(row.shock_at) : null,
    matchedProfileId: row.matched_profile_id,
    message: arbitration === "ambiguous" ? "Recollez les téléphones." : null,
    sender,
    receiver,
  };
}

async function loadInvite(idOrCode: string): Promise<TouchInviteDto | null> {
  return loadInviteRow(idOrCode);
}

/** Sender starts sharing — cancels prior active invites from same sender. */
export async function createTouchShare(senderId: string): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  await expireStale(sql);
  await sql`
    update wipp_touch_invites
    set status = 'cancelled', resolved_at = now()
    where sender_id = ${senderId} and status = 'active'
  `;

  let code = mintCode();
  for (let i = 0; i < 5; i++) {
    const clash = await sql`select id from wipp_touch_invites where code = ${code} limit 1`;
    if (!clash[0]) break;
    code = mintCode();
  }

  const id = uid("touch");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await sql`
    insert into wipp_touch_invites (id, code, sender_id, status, expires_at)
    values (${id}, ${code}, ${senderId}, ${"active"}, ${expiresAt.toISOString()})
  `;
  const dto = await loadInvite(id);
  if (!dto) throw new WippHttpError(500, "touch_create_failed", "Impossible de créer le partage.");
  return dto;
}

export async function getTouchShare(senderId: string, inviteId: string): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const dto = await loadInvite(inviteId);
  if (!dto) throw new WippHttpError(404, "not_found", "Invitation introuvable.");
  if (dto.sender.id !== senderId) {
    throw new WippHttpError(403, "forbidden", "Cette invitation ne t’appartient pas.");
  }
  return dto;
}

export async function cancelTouchShare(senderId: string, inviteId: string): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  const dto = await loadInvite(inviteId);
  if (!dto) throw new WippHttpError(404, "not_found", "Invitation introuvable.");
  if (dto.sender.id !== senderId) {
    throw new WippHttpError(403, "forbidden", "Cette invitation ne t’appartient pas.");
  }
  if (dto.status === "active") {
    await sql`
      update wipp_touch_invites
      set status = 'cancelled', resolved_at = now()
      where id = ${inviteId}
    `;
  }
  return (await loadInvite(inviteId))!;
}

/** Public peek — no PII. Used by /t/CODE landing (install / open app). */
export async function peekTouchCodePublic(code: string): Promise<{
  valid: boolean;
  status: string;
  expiresAt: number | null;
}> {
  await ensureMessagingReady();
  const dto = await loadInvite(code);
  if (!dto) return { valid: false, status: "not_found", expiresAt: null };
  if (dto.status === "expired" || Date.now() > dto.expiresAt) {
    return { valid: false, status: "expired", expiresAt: dto.expiresAt };
  }
  if (dto.status !== "active") {
    return { valid: false, status: dto.status, expiresAt: dto.expiresAt };
  }
  return { valid: true, status: "active", expiresAt: dto.expiresAt };
}

/** Peek invite by short code (for BLE / QR / typed code). Auth required.
 * BLE automatic path should use reportTouchDetect + arbitration instead.
 * source=manual|qr|nfc bypasses bump and returns invite immediately.
 */
export async function resolveTouchCode(
  meId: string,
  code: string,
  opts?: { source?: string },
): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const dto = await loadInvite(code);
  if (!dto) throw new WippHttpError(404, "not_found", "Code WIPP introuvable ou expiré.");
  if (dto.status === "expired" || Date.now() > dto.expiresAt) {
    throw new WippHttpError(410, "expired", "Ce partage a expiré.");
  }
  if (dto.sender.id === meId) {
    throw new WippHttpError(400, "self", "C’est ton propre partage.");
  }
  if (dto.status !== "active") {
    throw new WippHttpError(409, "not_active", `Invitation ${dto.status}.`);
  }
  const source = opts?.source || "ble";
  const bypass = source === "manual" || source === "qr" || source === "nfc";
  if (!bypass) {
    // BLE resolve without going through detect/arbitration: only winner after match
    if (dto.arbitration === "matched" && dto.matchedProfileId === meId) {
      return dto;
    }
    if (dto.arbitration === "matched") {
      throw new WippHttpError(409, "not_selected", "Un autre appareil a été sélectionné.");
    }
    if (dto.arbitration === "ambiguous") {
      throw new WippHttpError(409, "ambiguous", "Recollez les téléphones.");
    }
    throw new WippHttpError(
      409,
      "waiting_arbitration",
      "En attente du collage (choc) et de l’arbitrage.",
    );
  }
  return dto;
}

export async function acceptTouchCode(meId: string, code: string): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  const dto = await loadInvite(code);
  if (!dto) throw new WippHttpError(404, "not_found", "Code WIPP introuvable ou expiré.");
  if (dto.status === "expired" || Date.now() > dto.expiresAt) {
    throw new WippHttpError(410, "expired", "Ce partage a expiré.");
  }
  if (dto.sender.id === meId) {
    throw new WippHttpError(400, "self", "C’est ton propre partage.");
  }
  if (dto.status !== "active") {
    throw new WippHttpError(409, "not_active", `Invitation ${dto.status}.`);
  }
  // If bump matched someone else, block
  if (dto.arbitration === "matched" && dto.matchedProfileId && dto.matchedProfileId !== meId) {
    throw new WippHttpError(409, "not_selected", "Un autre appareil a été sélectionné.");
  }
  const updated = await sql`
    update wipp_touch_invites
    set status = 'accepted', receiver_id = ${meId}, resolved_at = now()
    where id = ${dto.id} and status = 'active' and expires_at >= now()
    returning id
  `;
  if (!updated[0]) {
    throw new WippHttpError(409, "taken", "Invitation déjà utilisée ou expirée.");
  }
  try {
    const { getOrCreateDm } = await import("@/lib/messaging/server");
    const sender = await profileBrief(dto.sender.id);
    if (sender) await getOrCreateDm(meId, sender.username);
  } catch (err) {
    console.warn("[wipp-touch] dm after accept", err);
  }
  return (await loadInvite(dto.id))!;
}

export async function rejectTouchCode(meId: string, code: string): Promise<TouchInviteDto> {
  await ensureMessagingReady();
  const sql = await getSql();
  const dto = await loadInvite(code);
  if (!dto) throw new WippHttpError(404, "not_found", "Code WIPP introuvable ou expiré.");
  if (dto.sender.id === meId) {
    throw new WippHttpError(400, "self", "C’est ton propre partage.");
  }
  if (dto.status !== "active") {
    throw new WippHttpError(409, "not_active", `Invitation ${dto.status}.`);
  }
  await sql`
    update wipp_touch_invites
    set status = 'rejected', receiver_id = ${meId}, resolved_at = now()
    where id = ${dto.id} and status = 'active'
  `;
  return (await loadInvite(dto.id))!;
}
