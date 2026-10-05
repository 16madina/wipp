/**
 * THE WIPP connection model — one place for every way of meeting someone (search, QR,
 * temporary QR, WIPP Touch). Permanent or ephemeral; the server alone computes expires_at.
 * "Connected" everywhere = status 'active' AND (no expiry OR expiry in the future).
 */
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

export type ConnectionType = "permanent" | "ephemeral";
export type ConnectionVia = "request" | "qr" | "temp_qr" | "touch";

/** 15 min, 1 h, 24 h, 7 days presets — or a custom duration between 15 min and 30 days. */
export const PRESET_MINUTES = [15, 60, 1440, 10080] as const;
export const MIN_MINUTES = 15;
export const MAX_MINUTES = 30 * 24 * 60;

export type ConnectionChoice = { type?: string; minutes?: number | string | null };

/** Validates the client's choice. Returns the minutes for an ephemeral connection, null for permanent. */
export function parseChoice(choice: ConnectionChoice | undefined | null): { type: ConnectionType; minutes: number | null } {
  const type = choice?.type === "ephemeral" ? "ephemeral" : choice?.type === "permanent" || !choice?.type ? "permanent" : null;
  if (!type) throw new WippHttpError(400, "invalid", "Type de connexion invalide.");
  if (type === "permanent") return { type, minutes: null };
  const minutes = Math.round(Number(choice?.minutes));
  if (!Number.isFinite(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
    throw new WippHttpError(400, "invalid", "La durée doit être comprise entre 15 minutes et 30 jours.");
  }
  return { type, minutes };
}

export function pairOf(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export type ConnectionRow = {
  id: string;
  user_a: string;
  user_b: string;
  via: string;
  status: string;
  connection_type: ConnectionType;
  expires_at: string | null;
  created_at: string;
  upgrade_requested_by: string | null;
};

export function isActive(row: Pick<ConnectionRow, "status" | "expires_at"> | null | undefined) {
  if (!row || row.status !== "active") return false;
  return !row.expires_at || Date.parse(row.expires_at) > Date.now();
}

/** Marks overdue ephemeral connections as expired (display / notifications; checks never rely on it). */
export async function expireDue() {
  const sql = await getSql();
  await sql`
    update wipp_connections set status = 'expired', updated_at = now(), upgrade_requested_by = null, upgrade_requested_at = null
    where status = 'active' and expires_at is not null and expires_at <= now()
  `;
}

export async function getConnection(a: string, b: string): Promise<ConnectionRow | null> {
  const [userA, userB] = pairOf(a, b);
  const sql = await getSql();
  const rows = await sql<ConnectionRow>`
    select id::text, user_a, user_b, via, status, connection_type, expires_at::text, created_at::text, upgrade_requested_by
    from wipp_connections where user_a = ${userA} and user_b = ${userB} limit 1
  `;
  const row = rows[0] ?? null;
  if (row && row.status === "active" && row.expires_at && Date.parse(row.expires_at) <= Date.now()) {
    await expireDue();
    return { ...row, status: "expired" };
  }
  return row;
}

export async function isConnected(a: string, b: string) {
  return isActive(await getConnection(a, b));
}

/**
 * Creates (or re-activates — one row per pair) the connection after BOTH people consented.
 * - already active & permanent → stays permanent ("already_connected");
 * - active ephemeral + new permanent → becomes permanent;
 * - active ephemeral + new ephemeral → keeps the later expiry;
 * - expired / ended → re-activated with the new type, expiry and method.
 */
export async function establishConnection(
  a: string,
  b: string,
  input: { type: ConnectionType; minutes: number | null; via: ConnectionVia },
): Promise<{ status: "connected" | "already_connected"; connection: ConnectionRow }> {
  const [userA, userB] = pairOf(a, b);
  const sql = await getSql();
  const current = await getConnection(a, b);
  if (current && isActive(current) && current.connection_type === "permanent") {
    return { status: "already_connected", connection: current };
  }
  const expires =
    input.type === "ephemeral" ? new Date(Date.now() + (input.minutes ?? MIN_MINUTES) * 60_000) : null;
  let expiresIso = expires?.toISOString() ?? null;
  if (current && isActive(current) && current.connection_type === "ephemeral" && input.type === "ephemeral" && current.expires_at) {
    if (Date.parse(current.expires_at) > (expires?.getTime() ?? 0)) expiresIso = current.expires_at;
  }
  const rows = await sql<ConnectionRow>`
    insert into wipp_connections (id, user_a, user_b, via, status, connection_type, expires_at, updated_at)
    values (${randomUUID()}, ${userA}, ${userB}, ${input.via}, 'active', ${input.type}, ${expiresIso}, now())
    on conflict (user_a, user_b) do update set
      status = 'active',
      connection_type = excluded.connection_type,
      expires_at = excluded.expires_at,
      via = excluded.via,
      ended_at = null,
      upgrade_requested_by = null,
      upgrade_requested_at = null,
      updated_at = now()
    returning id::text, user_a, user_b, via, status, connection_type, expires_at::text, created_at::text, upgrade_requested_by
  `;
  // Any pending request between them is settled by this connection.
  await sql`
    update wipp_connection_requests set status = 'accepted', responded_at = now()
    where status = 'pending'
      and ((sender_id = ${a} and recipient_id = ${b}) or (sender_id = ${b} and recipient_id = ${a}))
  `.catch(() => undefined);
  return { status: current && isActive(current) && current.connection_type === "permanent" ? "already_connected" : "connected", connection: rows[0]! };
}

/** "Garder ce contact": asks the other person to turn an active ephemeral connection into a permanent one. */
export async function requestUpgrade(meId: string, peerId: string) {
  const row = await getConnection(meId, peerId);
  if (!row || !isActive(row)) throw new WippHttpError(409, "not_connected", "Cette connexion n’est plus active.");
  if (row.connection_type === "permanent") return { status: "already_permanent" as const };
  const sql = await getSql();
  await sql`
    update wipp_connections set upgrade_requested_by = ${meId}, upgrade_requested_at = now(), updated_at = now()
    where id = ${row.id}::uuid and status = 'active' and connection_type = 'ephemeral'
  `;
  return { status: "requested" as const };
}

/** Only the OTHER person can accept: never a silent conversion. */
export async function respondUpgrade(meId: string, peerId: string, accept: boolean) {
  const row = await getConnection(meId, peerId);
  if (!row || !isActive(row)) throw new WippHttpError(409, "not_connected", "Cette connexion n’est plus active.");
  if (!row.upgrade_requested_by || row.upgrade_requested_by === meId) {
    throw new WippHttpError(409, "no_request", "Aucune demande à confirmer.");
  }
  const sql = await getSql();
  if (accept) {
    await sql`
      update wipp_connections
      set connection_type = 'permanent', expires_at = null, upgrade_requested_by = null, upgrade_requested_at = null, updated_at = now()
      where id = ${row.id}::uuid and status = 'active'
    `;
    return { status: "permanent" as const };
  }
  await sql`
    update wipp_connections set upgrade_requested_by = null, upgrade_requested_at = null, updated_at = now()
    where id = ${row.id}::uuid
  `;
  return { status: "declined" as const };
}

/** Public view of a connection for the app (per peer). */
export function connectionInfo(row: ConnectionRow | null, meId: string) {
  if (!row) return null;
  const active = isActive(row);
  return {
    status: active ? "active" : row.status === "active" ? "expired" : row.status,
    type: row.connection_type,
    expiresAt: row.expires_at ? Date.parse(row.expires_at) : null,
    via: row.via,
    upgradeRequestedByMe: row.upgrade_requested_by === meId,
    upgradeRequestedByPeer: Boolean(row.upgrade_requested_by && row.upgrade_requested_by !== meId),
  };
}

export async function connectionsFor(meId: string, peerIds: string[]) {
  if (!peerIds.length) return new Map<string, ReturnType<typeof connectionInfo>>();
  const sql = await getSql();
  const rows = await sql<ConnectionRow>`
    select id::text, user_a, user_b, via, status, connection_type, expires_at::text, created_at::text, upgrade_requested_by
    from wipp_connections
    where (user_a = ${meId} and user_b = any(${peerIds})) or (user_b = ${meId} and user_a = any(${peerIds}))
  `;
  const map = new Map<string, ReturnType<typeof connectionInfo>>();
  for (const r of rows) map.set(r.user_a === meId ? r.user_b : r.user_a, connectionInfo(r, meId));
  return map;
}
