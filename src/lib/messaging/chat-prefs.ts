/**
 * Member preferences for a DM. No message plaintext.
 * muted_until NULL = off. PostgreSQL infinity = always.
 */
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";

export type MuteChoice = "off" | "1h" | "8h" | "1w" | "always";

const MUTE_MS: Record<Exclude<MuteChoice, "off" | "always">, number> = {
  "1h": 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

export function muteIsActive(until: string | null | undefined, now = Date.now()) {
  if (!until) return false;
  if (until === "infinity") return true;
  const at = Date.parse(until);
  return Number.isFinite(at) && at > now;
}

async function assertMember(meId: string, chatId: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_chat_members where chat_id = ${chatId} and profile_id = ${meId} limit 1
  `;
  if (!rows.length) throw new WippHttpError(403, "forbidden", "Tu n'es pas membre de ce chat.");
}

export async function setChatPrefs(
  meId: string,
  chatId: string,
  patch: {
    pinned?: boolean;
    archived?: boolean;
    mute?: MuteChoice;
    manuallyUnread?: boolean;
  },
) {
  await assertMember(meId, chatId);
  const sql = await getSql();
  if (patch.pinned !== undefined) {
    await sql`
      update wipp_chat_members
      set pinned_at = ${patch.pinned ? new Date().toISOString() : null}
      where chat_id = ${chatId} and profile_id = ${meId}
    `;
  }
  if (patch.archived !== undefined) {
    await sql`
      update wipp_chat_members
      set archived_at = ${patch.archived ? new Date().toISOString() : null}
      where chat_id = ${chatId} and profile_id = ${meId}
    `;
  }
  if (patch.mute === "always") {
    await sql`
      update wipp_chat_members
      set muted_until = 'infinity'
      where chat_id = ${chatId} and profile_id = ${meId}
    `;
  } else if (patch.mute) {
    const until = patch.mute === "off" ? null : new Date(Date.now() + MUTE_MS[patch.mute]).toISOString();
    await sql`
      update wipp_chat_members
      set muted_until = ${until}
      where chat_id = ${chatId} and profile_id = ${meId}
    `;
  }
  if (patch.manuallyUnread !== undefined) {
    await sql`
      update wipp_chat_members
      set manually_unread_at = ${patch.manuallyUnread ? new Date().toISOString() : null}
      where chat_id = ${chatId} and profile_id = ${meId}
    `;
  }
  return readChatPrefs(meId, chatId);
}

export async function clearManualUnread(meId: string, chatId: string) {
  const sql = await getSql();
  await sql`
    update wipp_chat_members
    set manually_unread_at = null
    where chat_id = ${chatId} and profile_id = ${meId}
  `;
}

export async function readChatPrefs(meId: string, chatId: string) {
  const sql = await getSql();
  const rows = await sql<{
    pinned_at: string | null;
    archived_at: string | null;
    muted_until: string | null;
    manually_unread_at: string | null;
  }>`
    select pinned_at::text, archived_at::text, muted_until::text, manually_unread_at::text
    from wipp_chat_members
    where chat_id = ${chatId} and profile_id = ${meId}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Conversation introuvable.");
  return {
    pinnedAt: row.pinned_at ? Date.parse(row.pinned_at) : null,
    archivedAt: row.archived_at ? Date.parse(row.archived_at) : null,
    mutedUntil: row.muted_until === "infinity" ? ("always" as const) : row.muted_until ? Date.parse(row.muted_until) : null,
    manuallyUnreadAt: row.manually_unread_at ? Date.parse(row.manually_unread_at) : null,
  };
}

export async function peerIsMuted(chatId: string, profileId: string) {
  const sql = await getSql();
  const rows = await sql<{ muted_until: string | null }>`
    select muted_until::text
    from wipp_chat_members
    where chat_id = ${chatId} and profile_id = ${profileId}
    limit 1
  `;
  return muteIsActive(rows[0]?.muted_until);
}
