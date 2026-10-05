/**
 * WIPP admin panel (server side). Roles:
 *  - admin: everything (stats, all users, moderators, push notifications, audit);
 *  - moderator: reports, suspended accounts, reported messages, suspend / restore an account.
 * Every staff action is written to wipp_admin_audit.
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

export type StaffRole = "admin" | "moderator";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("hex")}`;
}

export async function staffRole(meId: string): Promise<StaffRole | null> {
  const sql = await getSql();
  const rows = await sql<{ role: string | null; suspended_at: string | null }>`
    select role, suspended_at::text from wipp_profiles where id = ${meId} limit 1
  `;
  const r = rows[0];
  if (!r || r.suspended_at) return null;
  return r.role === "admin" ? "admin" : r.role === "moderator" ? "moderator" : null;
}

export async function assertStaff(meId: string, adminOnly = false): Promise<StaffRole> {
  const role = await staffRole(meId);
  if (!role || (adminOnly && role !== "admin")) throw new WippHttpError(403, "forbidden", "Réservé à l’administration.");
  return role;
}

async function audit(actorId: string, action: string, targetId: string | null, details: Record<string, unknown> = {}) {
  const sql = await getSql();
  await sql`
    insert into wipp_admin_audit (id, actor_id, action, target_id, details)
    values (${uid("aud")}, ${actorId}, ${action}, ${targetId}, ${JSON.stringify(details)}::jsonb)
  `.catch(() => undefined);
}

/** Who am I for the panel (drives which tabs the app shows). */
export async function adminMe(meId: string) {
  return { role: await staffRole(meId) };
}

export async function adminOverview(meId: string) {
  await assertStaff(meId, true);
  const sql = await getSql();
  const [row] = await sql<Record<string, number>>`
    select
      (select count(*)::int from wipp_profiles) as users,
      (select count(*)::int from wipp_profiles where created_at > now() - interval '7 days') as new_users_7d,
      (select count(*)::int from wipp_profiles where created_at > now() - interval '24 hours') as new_users_24h,
      (select count(*)::int from wipp_profiles where suspended_at is not null) as suspended,
      (select count(*)::int from wipp_profiles where role = 'moderator') as moderators,
      (select count(*)::int from wipp_profiles where role = 'admin') as admins,
      (select count(*)::int from wipp_messages where created_at > now() - interval '24 hours') as messages_24h,
      (select count(*)::int from wipp_messages) as messages,
      (select count(*)::int from wipp_chats) as chats,
      (select count(*)::int from wipp_connections where status = 'active' and (expires_at is null or expires_at > now())) as connections,
      (select count(*)::int from wipp_connections where status = 'active' and connection_type = 'ephemeral' and expires_at > now()) as ephemeral_connections,
      (select count(*)::int from wipp_moderation_flags where status = 'open') as open_reports,
      (select count(distinct profile_id)::int from wipp_push_tokens where disabled_at is null) as push_reachable
  `;
  return row ?? {};
}

export async function adminUsers(meId: string, q = "", limit = 100) {
  const role = await assertStaff(meId);
  const sql = await getSql();
  const needle = q.replace(/^@/, "").trim().toLowerCase().slice(0, 40);
  // Escape LIKE wildcards (usernames contain "_").
  const like = `%${needle.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const rows = await sql<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    phone_e164: string | null;
    role: string | null;
    created_at: string;
    suspended_at: string | null;
    suspended_reason: string | null;
  }>`
    select id, username, display_name, avatar_url, phone_e164, role, created_at::text, suspended_at::text, suspended_reason
    from wipp_profiles
    where ${needle} = '' or lower(username) like ${like} or lower(display_name) like ${like}
    order by created_at desc
    limit ${Math.min(Math.max(limit, 1), 200)}
  `;
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    // Phone numbers stay admin-only.
    phone: role === "admin" ? r.phone_e164 : null,
    role: r.role === "admin" ? "admin" : r.role === "moderator" ? "moderator" : "user",
    createdAt: Date.parse(r.created_at),
    suspendedAt: r.suspended_at ? Date.parse(r.suspended_at) : null,
    suspendedReason: r.suspended_reason,
  }));
}

/** Admin only: make an existing user a moderator, or back to a normal user. Admins are never changed here. */
export async function adminSetRole(meId: string, targetId: string, role: string) {
  await assertStaff(meId, true);
  if (role !== "moderator" && role !== "user") throw new WippHttpError(400, "invalid", "Rôle invalide.");
  if (targetId === meId) throw new WippHttpError(400, "invalid", "Impossible de changer ton propre rôle.");
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update wipp_profiles set role = ${role}
    where id = ${targetId} and coalesce(role, 'user') <> 'admin'
    returning id
  `;
  if (!rows.length) throw new WippHttpError(404, "not_found", "Utilisateur introuvable (ou administrateur).");
  await audit(meId, role === "moderator" ? "moderator_added" : "moderator_removed", targetId);
  return { status: "ok" as const, role };
}

/** Staff: suspend an account (platform-wide) or restore it. Never an admin; a moderator never suspends staff. */
export async function adminSuspend(meId: string, targetId: string, suspend: boolean, reason = "") {
  const actorRole = await assertStaff(meId);
  if (targetId === meId) throw new WippHttpError(400, "invalid", "Impossible de te suspendre.");
  const sql = await getSql();
  const target = await sql<{ role: string | null }>`select role from wipp_profiles where id = ${targetId} limit 1`;
  if (!target[0]) throw new WippHttpError(404, "not_found", "Utilisateur introuvable.");
  const targetRole = target[0].role ?? "user";
  if (targetRole === "admin" || (actorRole === "moderator" && targetRole === "moderator")) {
    throw new WippHttpError(403, "forbidden", "Action non autorisée sur ce compte.");
  }
  if (suspend) {
    await sql`
      update wipp_profiles set suspended_at = now(), suspended_reason = ${reason.slice(0, 300) || null}, suspended_by = ${meId}
      where id = ${targetId}
    `;
    // Close its sessions right away (legacy session tokens).
    await sql`delete from wipp_sessions where profile_id = ${targetId}`.catch(() => undefined);
  } else {
    await sql`update wipp_profiles set suspended_at = null, suspended_reason = null, suspended_by = null where id = ${targetId}`;
  }
  await audit(meId, suspend ? "account_suspended" : "account_restored", targetId, { reason });
  return { status: suspend ? ("suspended" as const) : ("restored" as const) };
}

export async function adminSuspended(meId: string) {
  await assertStaff(meId);
  const sql = await getSql();
  const rows = await sql<{ id: string; username: string; display_name: string; suspended_at: string; suspended_reason: string | null; by: string | null }>`
    select p.id, p.username, p.display_name, p.suspended_at::text, p.suspended_reason, s.username as by
    from wipp_profiles p left join wipp_profiles s on s.id = p.suspended_by
    where p.suspended_at is not null
    order by p.suspended_at desc limit 200
  `;
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    suspendedAt: Date.parse(r.suspended_at),
    reason: r.suspended_reason,
    by: r.by,
  }));
}

/** Reports (user-submitted). The reported message content stays sealed until a staff member opens it. */
export async function adminReports(meId: string, status = "open") {
  await assertStaff(meId);
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    created_at: string;
    reporter: string | null;
    target_username: string | null;
    has_content: boolean;
  }>`
    select f.id, f.target_type, f.target_id, f.reason, f.status, f.created_at::text,
           r.username as reporter,
           t.username as target_username,
           (f.sealed_payload is not null) as has_content
    from wipp_moderation_flags f
    left join wipp_profiles r on r.id = f.reporter_id
    left join wipp_profiles t on t.id = f.target_id
    where ${status} = 'all' or f.status = ${status}
    order by f.created_at desc limit 200
  `;
  return rows.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetUsername: r.target_username,
    reporter: r.reporter,
    reason: r.reason,
    status: r.status,
    hasContent: r.has_content,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function adminResolveReport(meId: string, reportId: string, action: string) {
  await assertStaff(meId);
  if (action !== "dismissed" && action !== "resolved") throw new WippHttpError(400, "invalid", "Action invalide.");
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update wipp_moderation_flags set status = ${action} where id = ${reportId} returning id
  `;
  if (!rows.length) throw new WippHttpError(404, "not_found", "Signalement introuvable.");
  await audit(meId, `report_${action}`, reportId);
  return { status: action };
}

/** Staff opens a reported message (sealed for moderation). Logged. */
export async function adminOpenReport(meId: string, reportId: string) {
  await assertStaff(meId);
  const { openSealedReport } = await import("./report-seal");
  const content = await openSealedReport(meId, reportId);
  await audit(meId, "report_opened", reportId);
  return content;
}

// ---------- Push notifications (admin only) ----------

export async function adminPushTemplates(meId: string) {
  await assertStaff(meId, true);
  const sql = await getSql();
  return sql<{ id: string; label: string; title: string; body: string }>`
    select id, label, title, body from wipp_admin_push_templates order by sort, label
  `;
}

export async function adminSavePushTemplate(meId: string, id: string, input: { label?: string; title?: string; body?: string }) {
  await assertStaff(meId, true);
  const title = (input.title ?? "").trim().slice(0, 80);
  const body = (input.body ?? "").trim().slice(0, 240);
  const label = (input.label ?? "").trim().slice(0, 40) || title;
  if (!title || !body) throw new WippHttpError(400, "invalid", "Titre et message requis.");
  const key = /^[a-z0-9_-]{2,40}$/.test(id) ? id : uid("tpl");
  const sql = await getSql();
  await sql`
    insert into wipp_admin_push_templates (id, label, title, body, sort, updated_by)
    values (${key}, ${label}, ${title}, ${body}, 100, ${meId})
    on conflict (id) do update set label = excluded.label, title = excluded.title, body = excluded.body, updated_at = now(), updated_by = excluded.updated_by
  `;
  await audit(meId, "push_template_saved", key);
  return { id: key, label, title, body };
}

export async function adminSendPush(meId: string, input: { title?: string; body?: string; target?: string; username?: string }) {
  await assertStaff(meId, true);
  const title = (input.title ?? "").trim().slice(0, 80);
  const body = (input.body ?? "").trim().slice(0, 240);
  if (!title || !body) throw new WippHttpError(400, "invalid", "Titre et message requis.");
  const target = input.target === "user" ? "user" : "all";
  const sql = await getSql();
  let recipients: { id: string }[];
  let targetProfile: string | null = null;
  if (target === "user") {
    const u = (input.username ?? "").replace(/^@/, "").trim().toLowerCase();
    const rows = await sql<{ id: string }>`select id from wipp_profiles where lower(username) = ${u} and suspended_at is null limit 1`;
    if (!rows[0]) throw new WippHttpError(404, "not_found", "Utilisateur introuvable.");
    recipients = rows;
    targetProfile = rows[0].id;
  } else {
    // Everyone reachable by push and not suspended.
    recipients = await sql<{ id: string }>`
      select distinct t.profile_id as id
      from wipp_push_tokens t join wipp_profiles p on p.id = t.profile_id
      where t.disabled_at is null and p.suspended_at is null
    `;
  }
  const logId = uid("push");
  const { sendProfilePush } = await import("@/lib/push/notify");
  let delivered = 0;
  for (const r of recipients) {
    try {
      const res = await sendProfilePush({
        profileId: r.id,
        title,
        body,
        channelId: "requests",
        data: { type: "announce", eventId: `${logId}:${r.id}` },
      });
      delivered += res.sent;
    } catch {
      /* one bad token must not stop the campaign */
    }
  }
  await sql`
    insert into wipp_admin_push_log (id, sender_id, target, target_profile_id, title, body, recipients, delivered)
    values (${logId}, ${meId}, ${target}, ${targetProfile}, ${title}, ${body}, ${recipients.length}, ${delivered})
  `;
  await audit(meId, "push_sent", targetProfile, { target, recipients: recipients.length, delivered });
  return { recipients: recipients.length, delivered };
}

export async function adminPushHistory(meId: string) {
  await assertStaff(meId, true);
  const sql = await getSql();
  const rows = await sql<{ id: string; target: string; title: string; body: string; recipients: number; delivered: number; created_at: string; sender: string | null; to_user: string | null }>`
    select l.id, l.target, l.title, l.body, l.recipients, l.delivered, l.created_at::text, s.username as sender, u.username as to_user
    from wipp_admin_push_log l
    left join wipp_profiles s on s.id = l.sender_id
    left join wipp_profiles u on u.id = l.target_profile_id
    order by l.created_at desc limit 50
  `;
  return rows.map((r) => ({ ...r, createdAt: Date.parse(r.created_at) }));
}

export async function adminAudit(meId: string) {
  await assertStaff(meId, true);
  const sql = await getSql();
  const rows = await sql<{ id: string; action: string; target_id: string | null; details: unknown; created_at: string; actor: string | null; target: string | null }>`
    select a.id, a.action, a.target_id, a.details, a.created_at::text, p.username as actor, t.username as target
    from wipp_admin_audit a
    left join wipp_profiles p on p.id = a.actor_id
    left join wipp_profiles t on t.id = a.target_id
    order by a.created_at desc limit 100
  `;
  return rows.map((r) => ({ ...r, createdAt: Date.parse(r.created_at) }));
}
