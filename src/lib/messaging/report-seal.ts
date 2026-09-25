/**
 * Voluntary report copy, sealed to the moderation key.
 * Ordinary clients only ever receive the public key.
 */
import { getSql } from "@/lib/db";
import { deriveChatKey, encryptText, decryptText, generateBundle, type KeyBundle } from "@/lib/crypto";
import { WippHttpError, ensureMessagingReady } from "@/lib/messaging/server";
import { randomBytes } from "node:crypto";

const REPORT_CTX = "wipp-report-v1";

async function loadOrCreateKey(): Promise<KeyBundle> {
  const sql = await getSql();
  const rows = await sql<{ public_jwk: string; private_jwk: string }>`
    select public_jwk, private_jwk from wipp_moderation_keys limit 1
  `;
  if (rows[0]) {
    return {
      publicJwk: JSON.parse(rows[0].public_jwk) as JsonWebKey,
      privateJwk: JSON.parse(rows[0].private_jwk) as JsonWebKey,
    };
  }
  const bundle = await generateBundle();
  await sql`
    insert into wipp_moderation_keys (id, public_jwk, private_jwk)
    values (${`mk_${randomBytes(8).toString("hex")}`}, ${JSON.stringify(bundle.publicJwk)}, ${JSON.stringify(bundle.privateJwk)})
  `;
  return bundle;
}

export async function moderationPublicKey() {
  await ensureMessagingReady();
  const bundle = await loadOrCreateKey();
  return bundle.publicJwk;
}

export async function sealForModeration(plaintext: string, publicJwk: JsonWebKey) {
  const eph = await generateBundle();
  const key = await deriveChatKey(eph, publicJwk, REPORT_CTX);
  const blob = await encryptText(key, plaintext);
  return JSON.stringify({ v: 1, eph: eph.publicJwk, iv: blob.iv, ct: blob.ct });
}

export async function openSealedReport(actorId: string, flagId: string) {
  await ensureMessagingReady();
  const sql = await getSql();
  const me = await sql<{ role: string }>`select role from wipp_profiles where id = ${actorId} limit 1`;
  if (me[0]?.role !== "admin") throw new WippHttpError(403, "forbidden", "Réservé à la modération.");
  const flags = await sql<{ sealed_payload: string | null; message_id: string | null }>`
    select sealed_payload, message_id from wipp_moderation_flags where id = ${flagId} limit 1
  `;
  const flag = flags[0];
  if (!flag?.sealed_payload) throw new WippHttpError(404, "not_found", "Signalement vide ou expiré.");
  const packed = JSON.parse(flag.sealed_payload) as { eph: JsonWebKey; iv: string; ct: string };
  const bundle = await loadOrCreateKey();
  const key = await deriveChatKey(
    { publicJwk: bundle.publicJwk, privateJwk: bundle.privateJwk },
    packed.eph,
    REPORT_CTX,
  );
  const text = await decryptText(key, { v: 1, alg: "AES-GCM", iv: packed.iv, ct: packed.ct });
  await sql`
    insert into wipp_moderation_access (id, flag_id, actor_id, action)
    values (${`ma_${randomBytes(6).toString("hex")}`}, ${flagId}, ${actorId}, ${"open"})
  `;
  return { text, messageId: flag.message_id };
}

export async function submitReport(
  reporterId: string,
  input: { chatId: string; messageId: string; reason: string; sealedPayload: string },
) {
  await ensureMessagingReady();
  const sql = await getSql();
  const member = await sql`
    select 1 from wipp_chat_members where chat_id = ${input.chatId} and profile_id = ${reporterId} limit 1
  `;
  if (!member.length) throw new WippHttpError(403, "forbidden", "Tu n'es pas membre de ce chat.");
  const message = await sql`
    select 1 from wipp_messages where id = ${input.messageId} and chat_id = ${input.chatId} limit 1
  `;
  if (!message.length) throw new WippHttpError(404, "not_found", "Message introuvable.");
  if (!input.sealedPayload.startsWith("{") || input.sealedPayload.length > 200_000) {
    throw new WippHttpError(400, "bad_seal", "Signalement scellé invalide.");
  }
  const id = `flg_${randomBytes(8).toString("hex")}`;
  const retain = new Date(Date.now() + 30 * 86400_000).toISOString();
  await sql`
    insert into wipp_moderation_flags (
      id, target_type, target_id, reporter_id, reason, status, sealed_payload, chat_id, message_id, retain_until
    ) values (
      ${id}, ${"message"}, ${input.messageId}, ${reporterId}, ${input.reason.slice(0, 200)}, ${"open"},
      ${input.sealedPayload}, ${input.chatId}, ${input.messageId}, ${retain}
    )
  `;
  return { id, status: "open" as const, retainUntil: retain };
}
