/**
 * Ciphertext-only attachment store. No filename, MIME, or plaintext.
 * View-once: available → claimed → consumed, one atomic claim.
 */
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { assertNotBlocked, ensureMessagingReady, WippHttpError } from "@/lib/messaging/server";

const CLAIM_MS = 10 * 60 * 1000;
const UPLOAD_MS = 24 * 60 * 60 * 1000;

async function assertMember(meId: string, chatId: string) {
  const sql = await getSql();
  const rows = await sql`
    select 1 from wipp_chat_members where chat_id = ${chatId} and profile_id = ${meId} limit 1
  `;
  if (!rows.length) throw new WippHttpError(403, "forbidden", "Tu n'es pas membre de ce chat.");
  const peers = await sql<{ profile_id: string }>`
    select profile_id from wipp_chat_members where chat_id = ${chatId} and profile_id <> ${meId}
  `;
  for (const peer of peers) await assertNotBlocked(meId, peer.profile_id);
}

export async function sweepMedia() {
  const sql = await getSql();
  const expired = await sql<{ id: string }>`
    select id from wipp_messages
    where expires_at is not null and expires_at < now() and deleted_at is null
  `;
  for (const row of expired) {
    await sql`
      update wipp_messages
      set body = '{"tombstone":true}', deleted_at = now(), pinned_at = null, pinned_by = null
      where id = ${row.id} and deleted_at is null
    `;
    await purgeMessageMedia(row.id);
  }
  await sql`
    delete from wipp_attachment_chunks
    where attachment_id in (
      select id from wipp_attachments
      where state = 'uploading' and created_at < now() - interval '24 hours'
    )
  `;
  await sql`
    delete from wipp_attachments
    where state = 'uploading' and created_at < now() - interval '24 hours'
  `;
  const stale = await sql<{ id: string }>`
    select id from wipp_attachments
    where state = 'claimed' and view_once = true and claimed_at < now() - interval '10 minutes'
  `;
  for (const row of stale) {
    await sql`
      update wipp_attachments
      set state = 'consumed', consumed_at = now()
      where id = ${row.id} and state = 'claimed'
    `;
    await sql`delete from wipp_attachment_chunks where attachment_id = ${row.id}`;
  }
  await sql`
    update wipp_moderation_flags
    set sealed_payload = null
    where retain_until is not null and retain_until < now() and sealed_payload is not null
  `;
  void CLAIM_MS;
  void UPLOAD_MS;
}

export async function purgeMessageMedia(messageId: string) {
  const sql = await getSql();
  const ids = await sql<{ id: string }>`select id from wipp_attachments where message_id = ${messageId}`;
  for (const row of ids) {
    await sql`delete from wipp_attachment_chunks where attachment_id = ${row.id}`;
    await sql`
      update wipp_attachments set state = 'consumed', consumed_at = now() where id = ${row.id}
    `;
  }
}

export async function createAttachment(
  meId: string,
  chatId: string,
  input: { chunkCount: number; byteSize: number; viewOnce?: boolean },
) {
  await ensureMessagingReady();
  await sweepMedia();
  await assertMember(meId, chatId);
  if (input.chunkCount < 1 || input.chunkCount > 64) {
    throw new WippHttpError(400, "bad_chunks", "Nombre de morceaux invalide.");
  }
  if (input.byteSize < 1 || input.byteSize > 100 * 1024 * 1024) {
    throw new WippHttpError(400, "too_large", "Fichier trop volumineux.");
  }
  const sql = await getSql();
  const id = `a_${randomBytes(12).toString("hex")}`;
  await sql`
    insert into wipp_attachments (id, chat_id, owner_id, state, view_once, chunk_count, byte_size)
    values (${id}, ${chatId}, ${meId}, ${"uploading"}, ${Boolean(input.viewOnce)}, ${input.chunkCount}, ${input.byteSize})
  `;
  return { id, state: "uploading" as const };
}

export async function putChunk(
  meId: string,
  attachmentId: string,
  index: number,
  ciphertextB64: string,
  sha256: string,
) {
  await ensureMessagingReady();
  const sql = await getSql();
  const rows = await sql<{ chat_id: string; owner_id: string; state: string; chunk_count: number }>`
    select chat_id, owner_id, state, chunk_count from wipp_attachments where id = ${attachmentId} limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Pièce jointe introuvable.");
  if (row.owner_id !== meId) throw new WippHttpError(403, "forbidden", "Tu n'es pas l'expéditeur.");
  if (row.state !== "uploading") throw new WippHttpError(409, "closed", "Envoi déjà terminé.");
  if (index < 0 || index >= row.chunk_count) throw new WippHttpError(400, "bad_index", "Morceau invalide.");
  await assertMember(meId, row.chat_id);
  if (!/^[A-Za-z0-9+/=_-]+$/.test(ciphertextB64) || ciphertextB64.length > 8_000_000) {
    throw new WippHttpError(400, "bad_cipher", "Ciphertext refusé.");
  }
  await sql`
    insert into wipp_attachment_chunks (attachment_id, chunk_index, ciphertext_b64, sha256)
    values (${attachmentId}, ${index}, ${ciphertextB64}, ${sha256})
    on conflict (attachment_id, chunk_index) do update
      set ciphertext_b64 = excluded.ciphertext_b64, sha256 = excluded.sha256
  `;
  return { ok: true as const };
}

export async function completeAttachment(meId: string, attachmentId: string, messageId?: string) {
  const sql = await getSql();
  const rows = await sql<{ owner_id: string; chunk_count: number; chat_id: string }>`
    select owner_id, chunk_count, chat_id from wipp_attachments where id = ${attachmentId} limit 1
  `;
  const row = rows[0];
  if (!row || row.owner_id !== meId) throw new WippHttpError(403, "forbidden", "Pièce jointe refusée.");
  const got = await sql<{ c: number }>`
    select count(*)::int as c from wipp_attachment_chunks where attachment_id = ${attachmentId}
  `;
  if (Number(got[0]?.c) !== row.chunk_count) {
    throw new WippHttpError(409, "incomplete", "Morceaux manquants.");
  }
  await sql`
    update wipp_attachments
    set state = 'available', message_id = ${messageId ?? null}
    where id = ${attachmentId} and state = 'uploading'
  `;
  return { ok: true as const, state: "available" as const };
}

export async function readChunk(meId: string, attachmentId: string, index: number) {
  await ensureMessagingReady();
  await sweepMedia();
  const sql = await getSql();
  const rows = await sql<{
    chat_id: string;
    state: string;
    view_once: boolean;
    claimed_by: string | null;
  }>`
    select chat_id, state, view_once, claimed_by from wipp_attachments where id = ${attachmentId} limit 1
  `;
  const row = rows[0];
  if (!row) throw new WippHttpError(404, "not_found", "Pièce jointe introuvable.");
  await assertMember(meId, row.chat_id);
  if (row.state === "consumed") throw new WippHttpError(410, "consumed", "Média déjà consommé.");
  if (row.view_once) {
    if (row.state === "available") {
      const claimed = await sql<{ id: string }>`
        update wipp_attachments
        set state = 'claimed', claimed_by = ${meId}, claimed_at = now()
        where id = ${attachmentId} and state = 'available'
        returning id
      `;
      if (!claimed.length) throw new WippHttpError(409, "claimed", "Déjà ouvert ailleurs.");
    } else if (row.claimed_by !== meId) {
      throw new WippHttpError(409, "claimed", "Déjà ouvert ailleurs.");
    }
  } else if (row.state !== "available" && row.state !== "claimed") {
    throw new WippHttpError(409, "unavailable", "Pièce jointe indisponible.");
  }
  const chunks = await sql<{ ciphertext_b64: string; sha256: string }>`
    select ciphertext_b64, sha256 from wipp_attachment_chunks
    where attachment_id = ${attachmentId} and chunk_index = ${index} limit 1
  `;
  if (!chunks[0]) throw new WippHttpError(404, "not_found", "Morceau introuvable.");
  return { ciphertext: chunks[0].ciphertext_b64, sha256: chunks[0].sha256, index };
}

export async function consumeAttachment(meId: string, attachmentId: string) {
  const sql = await getSql();
  const updated = await sql<{ id: string }>`
    update wipp_attachments
    set state = 'consumed', consumed_at = now()
    where id = ${attachmentId} and view_once = true and state = 'claimed' and claimed_by = ${meId}
    returning id
  `;
  if (!updated.length) throw new WippHttpError(409, "not_claimed", "Ouverture non revendiquée.");
  await sql`delete from wipp_attachment_chunks where attachment_id = ${attachmentId}`;
  return { ok: true as const, state: "consumed" as const };
}

export function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
