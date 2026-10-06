/**
 * End-to-end encryption for GROUPS.
 * - A random 256-bit group key per "epoch". It is sealed for each member with that member's public
 *   key (ECDH + HKDF, the same primitive as private messages) and stored server-side sealed only.
 * - A new epoch is created by the next sender whenever the members changed (join, leave, removal,
 *   or someone without a key got one): people who left cannot read new messages; newcomers do not
 *   get older keys (no history before they joined).
 * - The message body keeps the private-message envelope shape + `g` (epoch), so older app versions
 *   simply show "🔒 Message chiffré" instead of raw data.
 */
import { b64, decryptText, deriveChatKey, encryptText, type E2eEnvelope, type KeyBundle, unb64 } from "../crypto";
import { supabase } from "../supabase";

export type GroupEnvelope = E2eEnvelope & { g: number };

const keys = new Map<string, Uint8Array>(); // `${chatId}|${epoch}` → group key
const pendingRotation = new Map<string, Promise<number | null>>();

const rawChat = (chatId: string) => chatId.replace(/^srv:/, "");
/** Domain separation: the pairwise key that seals a group key is never the private-chat key. */
const sealInfo = (chatId: string, epoch: number) => `wipp-gk|${chatId}|${epoch}`;

export function isGroupEnvelope(value: unknown): value is GroupEnvelope {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return o.e2e === true && typeof o.g === "number" && typeof o.iv === "string" && typeof o.ct === "string";
}

export function parseGroupBody(body: string | undefined | null): GroupEnvelope | null {
  const t = (body ?? "").trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as unknown;
    return isGroupEnvelope(o) ? o : null;
  } catch {
    return null;
  }
}

type Member = { id: string; jwk: JsonWebKey | null };

async function currentMembers(chatId: string): Promise<Member[]> {
  const { data: rows, error } = await supabase.from("wipp_chat_members").select("profile_id").eq("chat_id", chatId);
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r: { profile_id: string }) => r.profile_id);
  if (!ids.length) return [];
  const { data: profs, error: e2 } = await supabase.from("wipp_profiles").select("id,e2e_public_jwk").in("id", ids);
  if (e2) throw new Error(e2.message);
  const byId = new Map((profs ?? []).map((p: { id: string; e2e_public_jwk: JsonWebKey | null }) => [p.id, p.e2e_public_jwk]));
  return ids.map((id) => ({ id, jwk: (byId.get(id) as JsonWebKey | null | undefined) ?? null }));
}

async function latestEpoch(chatId: string): Promise<{ epoch: number; memberIds: string[] } | null> {
  const { data, error } = await supabase
    .from("wipp_group_key_epochs")
    .select("epoch,member_ids")
    .eq("chat_id", chatId)
    .order("epoch", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as { epoch: number; member_ids: string[] } | undefined;
  return row ? { epoch: row.epoch, memberIds: row.member_ids } : null;
}

/** My copy of the group key for an epoch (unsealed on this phone, cached in memory). */
export async function groupKey(chatIdRaw: string, epoch: number, identity: KeyBundle, meId: string): Promise<Uint8Array | null> {
  const chatId = rawChat(chatIdRaw);
  const cacheKey = `${chatId}|${epoch}`;
  const hit = keys.get(cacheKey);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("wipp_group_keys")
    .select("sealed")
    .eq("chat_id", chatId)
    .eq("epoch", epoch)
    .eq("member_id", meId)
    .limit(1);
  if (error) return null;
  const sealed = (data ?? [])[0]?.sealed as { iv: string; ct: string; spk: JsonWebKey } | undefined;
  if (!sealed) return null; // not a member at that time (joined later, or had no key yet)
  try {
    const wrap = await deriveChatKey(identity, sealed.spk, sealInfo(chatId, epoch));
    const raw = unb64(await decryptText(wrap, { v: 1, alg: "AES-GCM", iv: sealed.iv, ct: sealed.ct } as never));
    if (raw.byteLength !== 32) return null;
    keys.set(cacheKey, raw);
    return raw;
  } catch {
    return null;
  }
}

async function rotate(chatId: string, members: Member[], previous: number, identity: KeyBundle, meId: string): Promise<number> {
  const raw = new Uint8Array(32);
  globalThis.crypto.getRandomValues(raw);
  const epoch = previous + 1;
  const sealedKeys = [];
  for (const m of members) {
    if (!m.jwk) continue; // no key yet: included automatically at the first message after they get one
    const wrap = await deriveChatKey(identity, m.jwk, sealInfo(chatId, epoch));
    const blob = await encryptText(wrap, b64(raw));
    sealedKeys.push({ member: m.id, sealed: { iv: blob.iv, ct: blob.ct, spk: identity.publicJwk } });
  }
  if (!sealedKeys.some((k) => k.member === meId)) throw new Error("no_own_key");
  const { error } = await supabase.rpc("wipp_group_key_rotate", { p_chat: chatId, p_epoch: epoch, p_keys: sealedKeys });
  if (error) throw new Error(error.message.includes("epoch_conflict") ? "epoch_conflict" : error.message);
  keys.set(`${chatId}|${epoch}`, raw);
  return epoch;
}

/**
 * The epoch to send with: the latest one if it was given to exactly the current members (with a key),
 * otherwise a new one is created now. Two phones rotating at once: the server refuses one, which retries.
 */
export async function ensureSendEpoch(chatIdRaw: string, identity: KeyBundle, meId: string): Promise<number | null> {
  const chatId = rawChat(chatIdRaw);
  const running = pendingRotation.get(chatId);
  if (running) return running;
  const job = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const [members, latest] = await Promise.all([currentMembers(chatId), latestEpoch(chatId)]);
      const keyed = members.filter((m) => m.jwk).map((m) => m.id).sort();
      const given = [...(latest?.memberIds ?? [])].sort();
      const same = latest && keyed.length === given.length && keyed.every((id, i) => id === given[i]);
      if (same && (await groupKey(chatId, latest.epoch, identity, meId))) return latest.epoch;
      try {
        return await rotate(chatId, members, latest?.epoch ?? 0, identity, meId);
      } catch (err) {
        if ((err as Error).message !== "epoch_conflict") throw err;
      }
    }
    return null;
  })().finally(() => pendingRotation.delete(chatId));
  pendingRotation.set(chatId, job);
  return job;
}

/** Encrypt a group message body (the same inner formats as before: text, sticker / media JSON). */
export async function encryptGroupBody(chatIdRaw: string, plain: string, identity: KeyBundle, meId: string): Promise<string | null> {
  const chatId = rawChat(chatIdRaw);
  const epoch = await ensureSendEpoch(chatId, identity, meId);
  if (!epoch) return null;
  const key = await groupKey(chatId, epoch, identity, meId);
  if (!key) return null;
  const blob = await encryptText(key, plain);
  const env: GroupEnvelope = { ...blob, e2e: true, spk: identity.publicJwk, g: epoch };
  return JSON.stringify(env);
}

/** Decrypt a group body, or null if this phone has no key for that epoch. */
export async function decryptGroupBody(chatIdRaw: string, env: GroupEnvelope, identity: KeyBundle, meId: string): Promise<string | null> {
  const key = await groupKey(chatIdRaw, env.g, identity, meId);
  if (!key) return null;
  try {
    return await decryptText(key, { v: 1, alg: "AES-GCM", iv: env.iv, ct: env.ct } as never);
  } catch {
    return null;
  }
}

/** Sign-out: forget every unsealed group key kept in memory. */
export function forgetGroupKeys() {
  keys.clear();
}
