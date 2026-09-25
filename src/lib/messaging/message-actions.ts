/**
 * Server mutations for synced DM messages.
 * Authorization is always the session profile. No plaintext is logged.
 */
import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { listPushTokens } from "@/lib/messaging/calls";
import { sendExpoPush } from "@/lib/push/expo";
import { EDIT_WINDOW_MS } from "@/lib/messaging/plain";
import { ensureMessagingReady, WippHttpError } from "@/lib/messaging/server";
import type { WippMessage } from "@/lib/messaging/types";
import {
  isPresent,
  nextEventId,
  notePresence,
  noteTyping,
  publishLive,
} from "@/lib/messaging/message-live";

const TOMBSTONE = '{"tombstone":true}';

type Row = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  client_id: string | null;
  created_at: string;
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  delivered_at: string | null;
  read_at: string | null;
};

function editWindowMs() {
  const raw = Number(process.env.WIPP_EDIT_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : EDIT_WINDOW_MS;
}

async function assertMember(meId: string, chatId: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_chat_members where chat_id = ${chatId} and profile_id = ${meId} limit 1
  `;
  if (!rows.length) throw new WippHttpError(403, "forbidden", "Tu n'es pas membre de ce chat.");
}

async function realtimeKey(chatId: string) {
  const sql = await getSql();
  const rows = await sql<{ realtime_key: string | null }>`
    select realtime_key from wipp_chats where id = ${chatId} limit 1
  `;
  return rows[0]?.realtime_key ?? null;
}

function mapRow(r: Row, reactions: { profileId: string; emoji: string; createdAt: number }[]): WippMessage {
  const tombstone = Boolean(r.deleted_at);
  return {
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    body: tombstone ? TOMBSTONE : r.body,
    clientId: r.client_id,
    createdAt: Date.parse(r.created_at),
    replyTo: r.reply_to,
    editedAt: r.edited_at ? Date.parse(r.edited_at) : null,
    deletedAt: r.deleted_at ? Date.parse(r.deleted_at) : null,
    pinnedAt: r.pinned_at ? Date.parse(r.pinned_at) : null,
    pinnedBy: r.pinned_by,
    deliveredAt: r.delivered_at ? Date.parse(r.delivered_at) : null,
    readAt: r.read_at ? Date.parse(r.read_at) : null,
    reactions,
  };
}

export async function listThread(meId: string, chatId: string, after?: number): Promise<WippMessage[]> {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  const rows = await sql<Row>`
    select m.id, m.chat_id, m.sender_id, m.body, m.client_id, m.created_at::text,
           m.reply_to, m.edited_at::text, m.deleted_at::text, m.pinned_at::text, m.pinned_by,
           rc.delivered_at::text, rc.read_at::text
    from wipp_messages m
    left join wipp_message_hides h
      on h.message_id = m.id and h.profile_id = ${meId}
    left join lateral (
      select r.delivered_at, r.read_at
      from wipp_receipts r
      where r.message_id = m.id and r.profile_id <> ${meId}
      order by r.read_at desc nulls last, r.delivered_at desc nulls last
      limit 1
    ) rc on true
    where m.chat_id = ${chatId}
      and h.message_id is null
      and (${after ?? null}::float8 is null or m.created_at > to_timestamp(${(after ?? 0) / 1000}))
    order by m.created_at asc
    limit 200
  `;
  const reacts = await sql<{ message_id: string; profile_id: string; emoji: string; created_at: string }>`
    select r.message_id, r.profile_id, r.emoji, r.created_at::text
    from wipp_reactions r
    join wipp_messages m on m.id = r.message_id
    where m.chat_id = ${chatId}
  `;
  const byMsg = new Map<string, { profileId: string; emoji: string; createdAt: number }[]>();
  for (const react of reacts) {
    const list = byMsg.get(react.message_id) ?? [];
    list.push({
      profileId: react.profile_id,
      emoji: react.emoji,
      createdAt: Date.parse(react.created_at),
    });
    byMsg.set(react.message_id, list);
  }
  return rows.map((r) => mapRow(r, byMsg.get(r.id) ?? []));
}

async function loadOne(meId: string, chatId: string, messageId: string) {
  const all = await listThread(meId, chatId);
  const hit = all.find((m) => m.id === messageId);
  if (!hit) throw new WippHttpError(404, "not_found", "Message introuvable.");
  return hit;
}

async function emit(chatId: string, kind: LiveEventKind, payload: Record<string, unknown>) {
  await publishLive(
    { id: nextEventId(), chatId, kind, at: Date.now(), payload },
    await realtimeKey(chatId),
  );
}

type LiveEventKind = "message" | "edit" | "delete" | "reaction" | "pin" | "receipt" | "typing";

export async function afterMessageStored(
  meId: string,
  message: WippMessage,
  opts?: { vault?: boolean },
) {
  await emit(message.chatId, "message", { message });
  await notifyPeers(meId, message.chatId, Boolean(opts?.vault));
}

export async function editMessage(meId: string, chatId: string, messageId: string, body: string) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const text = body.trim();
  if (!text) throw new WippHttpError(400, "empty", "Message vide.");
  const sql = await getSql();
  const rows = await sql<{ sender_id: string; created_at: string; deleted_at: string | null }>`
    select sender_id, created_at::text, deleted_at::text
    from wipp_messages where id = ${messageId} and chat_id = ${chatId} limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Message introuvable.");
  if (row.sender_id !== meId) throw new WippHttpError(403, "forbidden", "Tu ne peux modifier que tes messages.");
  if (row.deleted_at) throw new WippHttpError(409, "deleted", "Message supprimé.");
  if (Date.now() - Date.parse(row.created_at) > editWindowMs()) {
    throw new WippHttpError(409, "edit_window", "Délai de modification dépassé.");
  }
  await sql`
    update wipp_messages set body = ${text}, edited_at = now()
    where id = ${messageId}
  `;
  const message = await loadOne(meId, chatId, messageId);
  await emit(chatId, "edit", { message });
  return message;
}

export async function hideMessage(meId: string, chatId: string, messageId: string) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  const id = `h_${createHash("sha256").update(`${meId}:${messageId}`).digest("hex").slice(0, 16)}`;
  await sql`
    insert into wipp_message_hides (message_id, profile_id)
    select ${messageId}, ${meId}
    where exists (
      select 1 from wipp_messages where id = ${messageId} and chat_id = ${chatId}
    )
    on conflict (message_id, profile_id) do nothing
  `;
  void id;
  await emit(chatId, "delete", { messageId, scope: "me", profileId: meId });
  return { ok: true as const, messageId, scope: "me" as const };
}

export async function tombstoneMessage(meId: string, chatId: string, messageId: string) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  const rows = await sql<{ sender_id: string }>`
    select sender_id from wipp_messages where id = ${messageId} and chat_id = ${chatId} limit 1
  `;
  if (!rows[0]) throw new WippHttpError(404, "not_found", "Message introuvable.");
  if (rows[0].sender_id !== meId) {
    throw new WippHttpError(403, "forbidden", "Tu ne peux supprimer pour tous que tes messages.");
  }
  await sql`
    update wipp_messages
    set body = ${TOMBSTONE}, deleted_at = now(), pinned_at = null, pinned_by = null
    where id = ${messageId}
  `;
  await sql`delete from wipp_reactions where message_id = ${messageId}`;
  await emit(chatId, "delete", { messageId, scope: "all" });
  return { ok: true as const, messageId, scope: "all" as const };
}

export async function setReaction(meId: string, chatId: string, messageId: string, emoji: string) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const clean = emoji.trim().slice(0, 16);
  if (!clean) throw new WippHttpError(400, "empty", "Réaction vide.");
  const sql = await getSql();
  const exists = await sql`
    select 1 from wipp_messages
    where id = ${messageId} and chat_id = ${chatId} and deleted_at is null limit 1
  `;
  if (!exists.length) throw new WippHttpError(404, "not_found", "Message introuvable.");
  const current = await sql<{ emoji: string }>`
    select emoji from wipp_reactions where message_id = ${messageId} and profile_id = ${meId} limit 1
  `;
  if (current[0]?.emoji === clean) {
    await sql`delete from wipp_reactions where message_id = ${messageId} and profile_id = ${meId}`;
  } else {
    await sql`
      insert into wipp_reactions (message_id, profile_id, emoji)
      values (${messageId}, ${meId}, ${clean})
      on conflict (message_id, profile_id) do update set emoji = excluded.emoji, created_at = now()
    `;
  }
  const message = await loadOne(meId, chatId, messageId);
  await emit(chatId, "reaction", { messageId, reactions: message.reactions ?? [] });
  return message;
}

export async function setPin(meId: string, chatId: string, messageId: string, pinned: boolean) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  await sql`
    update wipp_messages
    set pinned_at = ${pinned ? new Date().toISOString() : null},
        pinned_by = ${pinned ? meId : null}
    where id = ${messageId} and chat_id = ${chatId} and deleted_at is null
  `;
  const message = await loadOne(meId, chatId, messageId);
  await emit(chatId, "pin", { messageId, pinnedAt: message.pinnedAt ?? null, pinnedBy: message.pinnedBy ?? null });
  return message;
}

export async function markReceipt(
  meId: string,
  chatId: string,
  messageIds: string[],
  kind: "delivered" | "read",
) {
  await ensureMessagingReady();
  await assertMember(meId, chatId);
  const sql = await getSql();
  const ids = messageIds.slice(0, 100);
  for (const messageId of ids) {
    const rows = await sql<{ sender_id: string }>`
      select sender_id from wipp_messages
      where id = ${messageId} and chat_id = ${chatId} and deleted_at is null limit 1
    `;
    if (!rows[0] || rows[0].sender_id === meId) continue;
    if (kind === "delivered") {
      await sql`
        insert into wipp_receipts (message_id, profile_id, delivered_at)
        values (${messageId}, ${meId}, now())
        on conflict (message_id, profile_id) do update
          set delivered_at = coalesce(wipp_receipts.delivered_at, excluded.delivered_at)
      `;
    } else {
      await sql`
        insert into wipp_receipts (message_id, profile_id, delivered_at, read_at)
        values (${messageId}, ${meId}, now(), now())
        on conflict (message_id, profile_id) do update
          set delivered_at = coalesce(wipp_receipts.delivered_at, now()),
              read_at = coalesce(wipp_receipts.read_at, now())
      `;
    }
  }
  await emit(chatId, "receipt", { profileId: meId, messageIds: ids, kind });
  return { ok: true as const };
}

export async function setFocus(meId: string, chatId: string, active: boolean) {
  await assertMember(meId, chatId);
  notePresence(chatId, meId, active);
  return { ok: true as const };
}

export async function setTyping(meId: string, chatId: string, active: boolean) {
  await assertMember(meId, chatId);
  const sql = await getSql();
  const rows = await sql<{ username: string }>`
    select username from wipp_profiles where id = ${meId} limit 1
  `;
  noteTyping(chatId, meId, rows[0]?.username ?? "", active);
  return { ok: true as const };
}

export async function validateReply(chatId: string, replyTo: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_messages
    where id = ${replyTo} and chat_id = ${chatId} and deleted_at is null limit 1
  `;
  if (!rows.length) throw new WippHttpError(400, "bad_reply", "Le message cité n'est pas dans cette conversation.");
}

async function notifyPeers(meId: string, chatId: string, vault: boolean) {
  const sql = await getSql();
  const peers = await sql<{ profile_id: string }>`
    select profile_id from wipp_chat_members where chat_id = ${chatId} and profile_id <> ${meId}
  `;
  const me = await sql<{ display_name: string }>`
    select display_name from wipp_profiles where id = ${meId} limit 1
  `;
  for (const peer of peers) {
    if (isPresent(chatId, peer.profile_id)) continue;
    const tokens = await listPushTokens(peer.profile_id);
    const expo = tokens.filter((t) => t.kind === "expo" || t.token.startsWith("ExponentPushToken")).map((t) => t.token);
    if (!expo.length) continue;
    await sendExpoPush(expo, vault
      ? {
          title: "WIPP",
          body: "Nouveau message",
          data: { type: "message", private: true, chatId },
        }
      : {
          title: me[0]?.display_name || "WIPP",
          body: "Nouveau message",
          data: { type: "message", chatId },
        });
  }
}
