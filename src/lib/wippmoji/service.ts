/**
 * Wippmoji Studio, server side: reference character, pack of 10 animated stickers, library.
 * The photo goes straight to the provider and is never stored. Results are copied into the
 * public « wippmoji » bucket under an unguessable path, so they can be shown to anyone in a chat.
 */
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";
import { PACK_SIZE, WIPPMOJI_EXPRESSIONS, expressionPrompt, referencePrompt, type WippmojiStyle } from "./catalog";
import { wippmojiProvider } from "./providers";

const BUCKET = "wippmoji";
const VIDEO_SECONDS = Number(process.env.WIPPMOJI_VIDEO_SECONDS || 6);
const MAX_ATTEMPTS = 2;
const LIMITS = { referencesPerDay: Number(process.env.WIPPMOJI_REFS_PER_DAY || 6), packsPerDay: Number(process.env.WIPPMOJI_PACKS_PER_DAY || 2) };
// Published prices (Oct. 2026): image edit ~ $0.07, video $0.08 / s (1.5) or $0.02 / s (lite). Estimates only.
const COST = { reference: 0.07, videoPerSecond: (process.env.WIPPMOJI_VIDEO_MODEL || "").includes("lite") ? 0.02 : 0.08 };

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

async function storageBase() {
  const { SUPABASE_URL } = await import("@/lib/supabase/config");
  return SUPABASE_URL.replace(/\/$/, "");
}

export async function wippmojiPublicUrl(path: string) {
  return `${await storageBase()}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Copies a file the provider made (temporary URL) into our bucket. */
async function keep(sourceUrl: string, path: string, contentType: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new WippHttpError(503, "storage_unavailable", "Stockage indisponible.");
  const src = await fetch(sourceUrl);
  if (!src.ok) throw new Error(`download_${src.status}`);
  const bytes = new Uint8Array(await src.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("file_too_big");
  const res = await fetch(`${await storageBase()}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Until in-app purchases exist, only the team and the listed testers may generate (real generations cost money). */
async function assertAllowed(profileId: string) {
  const testers = (process.env.WIPPMOJI_TESTERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (testers.includes(profileId)) return;
  const sql = await getSql();
  const rows = await sql<{ role: string | null }>`select role from wipp_profiles where id = ${profileId} limit 1`;
  if (rows[0]?.role === "admin" || rows[0]?.role === "moderator") return;
  throw new WippHttpError(403, "wippmoji_not_open", "Wippmoji Studio arrive bientôt.");
}

async function usedToday(profileId: string, kind: "reference" | "video") {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*)::int as n from wippmoji_usage where profile_id = ${profileId} and kind = ${kind} and created_at > now() - interval '1 day'`;
  return rows[0]?.n ?? 0;
}

async function logUsage(profileId: string, kind: "reference" | "video", provider: string, seconds: number | null, cost: number) {
  const sql = await getSql();
  await sql`insert into wippmoji_usage (profile_id, kind, provider, seconds, est_cost_usd) values (${profileId}, ${kind}, ${provider}, ${seconds}, ${provider === "mock" ? 0 : cost})`;
}

export async function wippmojiStatus(profileId: string) {
  let allowed = true;
  try {
    await assertAllowed(profileId);
  } catch {
    allowed = false;
  }
  return { allowed, provider: wippmojiProvider().name, packSize: PACK_SIZE, expressions: WIPPMOJI_EXPRESSIONS.map(({ id, fr, en }) => ({ id, fr, en })) };
}

export async function createWippmojiAvatar(profileId: string, input: { photo?: string; style?: string; consent?: boolean }) {
  await assertAllowed(profileId);
  if (!input.consent) throw new WippHttpError(400, "consent_required", "Ton accord est nécessaire.");
  const style: WippmojiStyle = input.style === "realistic" ? "realistic" : "cartoon";
  const photo = input.photo ?? "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) throw new WippHttpError(400, "bad_photo", "Photo invalide.");
  if (photo.length > 4_000_000) throw new WippHttpError(413, "photo_too_big", "Photo trop lourde.");
  if ((await usedToday(profileId, "reference")) >= LIMITS.referencesPerDay) throw new WippHttpError(429, "daily_limit", "Limite du jour atteinte. Réessaie demain.");
  const provider = wippmojiProvider();
  const made = await provider.createReference(photo, referencePrompt(style));
  const id = uid("wma");
  const path = `${profileId}/${id}/reference.${provider.name === "mock" ? "webp" : "jpg"}`;
  await keep(made.url, path, provider.name === "mock" ? "image/webp" : "image/jpeg");
  await logUsage(profileId, "reference", provider.name, null, COST.reference);
  const sql = await getSql();
  await sql`insert into wippmoji_avatars (id, profile_id, style, reference_path, provider) values (${id}, ${profileId}, ${style}, ${path}, ${provider.name})`;
  return { id, style, referenceUrl: await wippmojiPublicUrl(path) };
}

export async function createWippmojiPack(profileId: string, input: { avatarId?: string; expressions?: string[]; language?: string | null }) {
  await assertAllowed(profileId);
  const sql = await getSql();
  const avatars = await sql<{ id: string; style: WippmojiStyle; reference_path: string }>`
    select id, style, reference_path from wippmoji_avatars where id = ${input.avatarId ?? ""} and profile_id = ${profileId} and status = 'ready' limit 1`;
  const avatar = avatars[0];
  if (!avatar) throw new WippHttpError(404, "avatar_not_found", "Personnage introuvable.");
  const ids = [...new Set(input.expressions ?? [])];
  const chosen = ids.map((id) => WIPPMOJI_EXPRESSIONS.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  if (chosen.length !== PACK_SIZE) throw new WippHttpError(400, "pack_size", `Choisis exactement ${PACK_SIZE} expressions.`);
  if ((await usedToday(profileId, "video")) + PACK_SIZE > LIMITS.packsPerDay * PACK_SIZE) throw new WippHttpError(429, "daily_limit", "Limite du jour atteinte. Réessaie demain.");
  const language = input.language === "fr" || input.language === "en" ? input.language : null;
  const packId = uid("wmp");
  await sql`insert into wippmoji_packs (id, profile_id, avatar_id, language) values (${packId}, ${profileId}, ${avatar.id}, ${language})`;
  const provider = wippmojiProvider();
  const referenceUrl = await wippmojiPublicUrl(avatar.reference_path);
  for (const e of chosen) {
    const label = language ? e[language] : null;
    const assetId = uid("wms");
    let requestId: string | null = null;
    let error: string | null = null;
    try {
      requestId = (await provider.startVideo(referenceUrl, expressionPrompt(avatar.style, e, label), VIDEO_SECONDS)).requestId;
      await logUsage(profileId, "video", provider.name, VIDEO_SECONDS, VIDEO_SECONDS * COST.videoPerSecond);
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 300) : "start_failed";
    }
    await sql`insert into wippmoji_assets (id, pack_id, profile_id, expression_id, label, provider_request_id, status, attempts, error)
      values (${assetId}, ${packId}, ${profileId}, ${e.id}, ${label ?? e.fr}, ${requestId}, ${requestId ? "pending" : "failed"}, 1, ${error})`;
  }
  return getWippmojiPack(profileId, packId);
}

type AssetRow = { id: string; expression_id: string; label: string | null; provider_request_id: string | null; media_path: string | null; status: string; attempts: number };

/** Also moves the generation forward: each call checks the stickers still being made. */
export async function getWippmojiPack(profileId: string, packId: string) {
  const sql = await getSql();
  const packs = await sql<{ id: string; avatar_id: string; status: string; language: string | null; reference_path: string; style: WippmojiStyle }>`
    select p.id, p.avatar_id, p.status, p.language, a.reference_path, a.style from wippmoji_packs p join wippmoji_avatars a on a.id = p.avatar_id
    where p.id = ${packId} and p.profile_id = ${profileId} and p.status <> 'deleted' limit 1`;
  const pack = packs[0];
  if (!pack) throw new WippHttpError(404, "pack_not_found", "Pack introuvable.");
  let assets = await sql<AssetRow>`select id, expression_id, label, provider_request_id, media_path, status, attempts from wippmoji_assets where pack_id = ${packId} order by created_at`;
  const provider = wippmojiProvider();
  for (const a of assets.filter((x) => x.status === "pending" && x.provider_request_id)) {
    try {
      const st = await provider.videoStatus(a.provider_request_id!);
      if (st.status === "done" && st.url) {
        const path = `${profileId}/${pack.avatar_id}/${a.id}.mp4`;
        await keep(st.url, path, "video/mp4");
        await sql`update wippmoji_assets set status = 'ready', media_path = ${path}, updated_at = now() where id = ${a.id}`;
      } else if (st.status === "failed") {
        // One more try with the same reference before giving up on this sticker.
        if (a.attempts < MAX_ATTEMPTS) {
          const e = WIPPMOJI_EXPRESSIONS.find((x) => x.id === a.expression_id)!;
          const label = pack.language === "fr" || pack.language === "en" ? e[pack.language] : null;
          const { requestId } = await provider.startVideo(await wippmojiPublicUrl(pack.reference_path), expressionPrompt(pack.style, e, label), VIDEO_SECONDS);
          await logUsage(profileId, "video", provider.name, VIDEO_SECONDS, VIDEO_SECONDS * COST.videoPerSecond);
          await sql`update wippmoji_assets set provider_request_id = ${requestId}, attempts = attempts + 1, updated_at = now() where id = ${a.id}`;
        } else {
          await sql`update wippmoji_assets set status = 'failed', error = ${st.error ?? "failed"}, updated_at = now() where id = ${a.id}`;
        }
      }
    } catch (err) {
      await sql`update wippmoji_assets set error = ${err instanceof Error ? err.message.slice(0, 300) : "check_failed"}, updated_at = now() where id = ${a.id}`;
    }
  }
  assets = await sql<AssetRow>`select id, expression_id, label, provider_request_id, media_path, status, attempts from wippmoji_assets where pack_id = ${packId} order by created_at`;
  const pending = assets.some((a) => a.status === "pending");
  if (!pending && pack.status === "generating") {
    const next = assets.every((a) => a.status === "ready") ? "ready" : "partial";
    await sql`update wippmoji_packs set status = ${next}, completed_at = now() where id = ${packId}`;
    pack.status = next;
  }
  return {
    id: pack.id,
    status: pack.status,
    posterUrl: await wippmojiPublicUrl(pack.reference_path),
    stickers: await Promise.all(
      assets.map(async (a) => ({ id: a.id, expression: a.expression_id, label: a.label, status: a.status, path: a.media_path, url: a.media_path ? await wippmojiPublicUrl(a.media_path) : null })),
    ),
  };
}

export async function listWippmojiLibrary(profileId: string) {
  const sql = await getSql();
  const avatars = await sql<{ id: string; style: string; reference_path: string; created_at: string }>`
    select id, style, reference_path, created_at::text from wippmoji_avatars where profile_id = ${profileId} and status = 'ready' order by created_at desc limit 20`;
  const packs = await sql<{ id: string }>`select id from wippmoji_packs where profile_id = ${profileId} and status <> 'deleted' order by created_at desc limit 20`;
  return {
    avatars: await Promise.all(avatars.map(async (a) => ({ id: a.id, style: a.style, referenceUrl: await wippmojiPublicUrl(a.reference_path), createdAt: a.created_at }))),
    packs: await Promise.all(packs.map((p) => getWippmojiPack(profileId, p.id))),
  };
}

/** Removes the character and its packs from the library. Stickers already sent stay visible in those chats. */
export async function deleteWippmojiAvatar(profileId: string, avatarId: string) {
  const sql = await getSql();
  await sql`update wippmoji_avatars set status = 'deleted' where id = ${avatarId} and profile_id = ${profileId}`;
  await sql`update wippmoji_packs set status = 'deleted' where avatar_id = ${avatarId} and profile_id = ${profileId}`;
  return { ok: true as const };
}
