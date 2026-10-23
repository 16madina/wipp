/**
 * Wippmoji Studio, server side: reference character, pack of 10 animated stickers, library.
 * The photo goes straight to the provider and is never stored. Results are copied into the
 * public « wippmoji » bucket under an unguessable path, so they can be shown to anyone in a chat.
 */
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { WippHttpError } from "@/lib/messaging/server";
import { PACK_SIZE, PACK_SIZES, WIPPMOJI_EXPRESSIONS, WIPPPOP_ANIMATIONS, WIPPPOP_SECONDS, WIPPPOP_SIZE, WIPPPOP_SIZES, expressionPrompt, popPrompt, popReferencePrompt, referencePrompt, type WippmojiStyle } from "./catalog";
import { wippmojiProvider } from "./providers";

const VIDEO_SECONDS = Number(process.env.WIPPMOJI_VIDEO_SECONDS || 6);
const MAX_ATTEMPTS = 2;
const LIMITS = { referencesPerDay: Number(process.env.WIPPMOJI_REFS_PER_DAY || 6), packsPerDay: Number(process.env.WIPPMOJI_PACKS_PER_DAY || 2) };
// Published prices (Oct. 2026): image edit ~ $0.07, video $0.08 / s (1.5) or $0.02 / s (lite). Estimates only.
const COST = { reference: 0.07, videoPerSecond: (process.env.WIPPMOJI_VIDEO_MODEL || "").includes("lite") ? 0.02 : 0.08 };

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

export async function wippmojiPublicUrl(path: string) {
  const base = (process.env.WIPP_PUBLIC_ORIGIN || "https://wippapp.com").replace(/\/$/, "");
  return `${base}/wm/${path}`;
}

/** Copies a file the provider made (temporary URL) into our database. */
async function keep(sourceUrl: string, path: string, contentType: string) {
  const src = await fetch(sourceUrl);
  if (!src.ok) throw new Error(`download_${src.status}`);
  const bytes = Buffer.from(await src.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("file_too_big");
  const sql = await getSql();
  await sql`insert into wippmoji_media (path, content_type, bytes) values (${path}, ${contentType}, ${bytes})
    on conflict (path) do update set content_type = excluded.content_type, bytes = excluded.bytes`;
}

type StudioSettings = {
  prices: { moji: Record<string, string>; pop: Record<string, string> };
  characterLimit: number;
  /** Video model per kind (e.g. "grok-imagine-video-1.5" or "grok-imagine-video-1.5-lite"); empty = server default. */
  models: { moji: string; pop: string };
  /** Seconds skipped at the start of new clips, per kind (each clip can then be changed in wippmoji_assets.start_offset). */
  startOffset: { moji: number; pop: number };
};
const DEFAULT_SETTINGS: StudioSettings = {
  prices: { moji: { "5": "4,99 $ CAD", "10": "7,99 $ CAD" }, pop: { "3": "4,99 $ CAD", "7": "9,99 $ CAD" } },
  characterLimit: 2,
  models: { moji: "", pop: "" },
  startOffset: { moji: 0, pop: 0 },
};
let settingsCache: { at: number; value: StudioSettings } | null = null;

/** Prices shown and characters included per purchase, read from the wippmoji_settings table (changed without a new app). */
export async function studioSettings(): Promise<StudioSettings> {
  if (settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache.value;
  const value: StudioSettings = { ...DEFAULT_SETTINGS, prices: { ...DEFAULT_SETTINGS.prices }, models: { ...DEFAULT_SETTINGS.models }, startOffset: { ...DEFAULT_SETTINGS.startOffset } };
  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: unknown }>`select key, value from wippmoji_settings`;
    for (const r of rows) {
      if (r.key === "prices" && r.value && typeof r.value === "object") value.prices = { ...value.prices, ...(r.value as StudioSettings["prices"]) };
      if (r.key === "character_limit" && Number(r.value) > 0) value.characterLimit = Number(r.value);
      if (r.key === "models" && r.value && typeof r.value === "object") value.models = { ...value.models, ...(r.value as StudioSettings["models"]) };
      if (r.key === "start_offset" && r.value && typeof r.value === "object") value.startOffset = { ...value.startOffset, ...(r.value as StudioSettings["startOffset"]) };
    }
  } catch {
    // Table not there yet: defaults.
  }
  settingsCache = { at: Date.now(), value };
  return value;
}

/** Characters made for this kind since the last pack of that kind: a purchase includes `characterLimit` of them. */
async function charactersUsed(profileId: string, kind: "moji" | "pop") {
  const sql = await getSql();
  const type = kind === "pop" ? "wipppop" : "expressions";
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from wippmoji_avatars a
    where a.profile_id = ${profileId} and a.kind = ${kind}
      and a.created_at > coalesce((select max(created_at) from wippmoji_packs where profile_id = ${profileId} and pack_type = ${type}), 'epoch'::timestamptz)`;
  return rows[0]?.n ?? 0;
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
  const settings = await studioSettings();
  const left = async (k: "moji" | "pop") => Math.max(0, settings.characterLimit - (await charactersUsed(profileId, k).catch(() => 0)));
  return { allowed, prices: settings.prices, characterLimit: settings.characterLimit, charactersLeft: { moji: await left("moji"), pop: await left("pop") }, provider: wippmojiProvider().name, packSize: PACK_SIZE, packSizes: PACK_SIZES, expressions: WIPPMOJI_EXPRESSIONS.map(({ id, fr, en }) => ({ id, fr, en })), pop: { packSize: WIPPPOP_SIZE, packSizes: WIPPPOP_SIZES, animations: WIPPPOP_ANIMATIONS.map(({ id, fr, en }) => ({ id, fr, en })) } };
}

export async function createWippmojiAvatar(profileId: string, input: { photo?: string; style?: string; consent?: boolean; framing?: string; kind?: string }) {
  await assertAllowed(profileId);
  const kind = input.kind === "pop" ? "pop" : "moji";
  if (!input.consent) throw new WippHttpError(400, "consent_required", "Ton accord est nécessaire.");
  const style: WippmojiStyle = input.style === "realistic" && kind === "moji" ? "realistic" : "cartoon";
  const photo = input.photo ?? "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) throw new WippHttpError(400, "bad_photo", "Photo invalide.");
  if (photo.length > 4_000_000) throw new WippHttpError(413, "photo_too_big", "Photo trop lourde.");
  const { characterLimit } = await studioSettings();
  if ((await charactersUsed(profileId, kind)) >= characterLimit) {
    throw new WippHttpError(403, "character_limit", `Tu as déjà créé tes ${characterLimit} personnages inclus. Choisis l’un d’eux pour continuer.`);
  }
  if ((await usedToday(profileId, "reference")) >= LIMITS.referencesPerDay) throw new WippHttpError(429, "daily_limit", "Limite du jour atteinte. Réessaie demain.");
  const provider = wippmojiProvider();
  const made = await provider.createReference(photo, kind === "pop" ? popReferencePrompt() : referencePrompt(style, input.framing === "face" || input.framing === "full" ? input.framing : "bust"));
  const id = uid("wma");
  const path = `${profileId}/${id}/reference.${provider.name === "mock" ? "webp" : "jpg"}`;
  await keep(made.url, path, provider.name === "mock" ? "image/webp" : "image/jpeg");
  await logUsage(profileId, "reference", provider.name, null, COST.reference);
  const sql = await getSql();
  await sql`insert into wippmoji_avatars (id, profile_id, style, reference_path, provider, kind) values (${id}, ${profileId}, ${style}, ${path}, ${provider.name}, ${kind})`;
  return { id, style, kind, referenceUrl: await wippmojiPublicUrl(path) };
}

export async function createWippmojiPack(profileId: string, input: { avatarId?: string; expressions?: string[]; language?: string | null; type?: string }) {
  await assertAllowed(profileId);
  const pop = input.type === "wipppop";
  const sql = await getSql();
  const avatars = await sql<{ id: string; style: WippmojiStyle; reference_path: string; kind: string }>`
    select id, style, reference_path, kind from wippmoji_avatars where id = ${input.avatarId ?? ""} and profile_id = ${profileId} and status = 'ready' limit 1`;
  const avatar = avatars[0];
  if (!avatar) throw new WippHttpError(404, "avatar_not_found", "Personnage introuvable.");
  if (pop !== (avatar.kind === "pop")) throw new WippHttpError(400, "wrong_character", "Ce personnage ne convient pas à ce pack.");
  const catalog: { id: string; fr: string; en: string }[] = pop ? WIPPPOP_ANIMATIONS : WIPPMOJI_EXPRESSIONS;
  const ids = [...new Set(input.expressions ?? [])];
  const chosen = ids.map((id) => catalog.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const sizes = pop ? WIPPPOP_SIZES : PACK_SIZES;
  const size = sizes.includes(chosen.length) ? chosen.length : sizes[sizes.length - 1];
  if (chosen.length !== size) throw new WippHttpError(400, "pack_size", `Choisis ${sizes.join(" ou ")} ${pop ? "animations" : "expressions"}.`);
  if ((await usedToday(profileId, "video")) + size > LIMITS.packsPerDay * PACK_SIZE) throw new WippHttpError(429, "daily_limit", "Limite du jour atteinte. Réessaie demain.");
  const language = input.language === "fr" || input.language === "en" ? input.language : null;
  const packId = uid("wmp");
  await sql`insert into wippmoji_packs (id, profile_id, avatar_id, language, pack_type) values (${packId}, ${profileId}, ${avatar.id}, ${language}, ${pop ? "wipppop" : "expressions"})`;
  const provider = wippmojiProvider();
  const settings = await studioSettings();
  const model = (pop ? settings.models.pop : settings.models.moji) || undefined;
  const offset = Math.max(0, Number(pop ? settings.startOffset.pop : settings.startOffset.moji) || 0);
  const referenceUrl = await wippmojiPublicUrl(avatar.reference_path);
  for (const e of chosen) {
    const label = language ? e[language] : null;
    const assetId = uid("wms");
    let requestId: string | null = null;
    let error: string | null = null;
    try {
      const secs = pop ? WIPPPOP_SECONDS : VIDEO_SECONDS;
      requestId = (await provider.startVideo(referenceUrl, videoPrompt(pop, avatar.style, e.id, label), secs, pop, model)).requestId;
      await logUsage(profileId, "video", provider.name, secs, secs * COST.videoPerSecond);
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 300) : "start_failed";
    }
    await sql`insert into wippmoji_assets (id, pack_id, profile_id, expression_id, label, provider_request_id, status, attempts, error, overlay_text, start_offset, model)
      values (${assetId}, ${packId}, ${profileId}, ${e.id}, ${label ?? e.fr}, ${requestId}, ${requestId ? "pending" : "failed"}, 1, ${error}, ${label}, ${offset}, ${model ?? null})`;
  }
  return getWippmojiPack(profileId, packId);
}

function videoPrompt(pop: boolean, style: WippmojiStyle, id: string, label: string | null) {
  if (pop) return popPrompt(WIPPPOP_ANIMATIONS.find((x) => x.id === id)!, label);
  return expressionPrompt(style, WIPPMOJI_EXPRESSIONS.find((x) => x.id === id)!, label);
}

type AssetRow = { id: string; expression_id: string; label: string | null; overlay_text: string | null; start_offset: number | null; provider_request_id: string | null; media_path: string | null; status: string; attempts: number };

/** Also moves the generation forward: each call checks the stickers still being made. */
export async function getWippmojiPack(profileId: string, packId: string) {
  const sql = await getSql();
  const packs = await sql<{ id: string; avatar_id: string; status: string; language: string | null; reference_path: string; style: WippmojiStyle; pack_type: string }>`
    select p.id, p.avatar_id, p.status, p.language, a.reference_path, a.style, p.pack_type from wippmoji_packs p join wippmoji_avatars a on a.id = p.avatar_id
    where p.id = ${packId} and p.profile_id = ${profileId} and p.status <> 'deleted' limit 1`;
  const pack = packs[0];
  if (!pack) throw new WippHttpError(404, "pack_not_found", "Pack introuvable.");
  let assets = await sql<AssetRow>`select id, expression_id, label, overlay_text, start_offset, provider_request_id, media_path, status, attempts from wippmoji_assets where pack_id = ${packId} order by created_at`;
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
          const pop = pack.pack_type === "wipppop";
          const e = (pop ? WIPPPOP_ANIMATIONS : WIPPMOJI_EXPRESSIONS).find((x) => x.id === a.expression_id)!;
          const label = pack.language === "fr" || pack.language === "en" ? e[pack.language] : null;
          const secs = pop ? WIPPPOP_SECONDS : VIDEO_SECONDS;
          const st2 = await studioSettings();
          const { requestId } = await provider.startVideo(await wippmojiPublicUrl(pack.reference_path), videoPrompt(pop, pack.style, e.id, label), secs, pop, (pop ? st2.models.pop : st2.models.moji) || undefined);
          await logUsage(profileId, "video", provider.name, secs, secs * COST.videoPerSecond);
          await sql`update wippmoji_assets set provider_request_id = ${requestId}, attempts = attempts + 1, updated_at = now() where id = ${a.id}`;
        } else {
          await sql`update wippmoji_assets set status = 'failed', error = ${st.error ?? "failed"}, updated_at = now() where id = ${a.id}`;
        }
      }
    } catch (err) {
      await sql`update wippmoji_assets set error = ${err instanceof Error ? err.message.slice(0, 300) : "check_failed"}, updated_at = now() where id = ${a.id}`;
    }
  }
  assets = await sql<AssetRow>`select id, expression_id, label, overlay_text, start_offset, provider_request_id, media_path, status, attempts from wippmoji_assets where pack_id = ${packId} order by created_at`;
  const pending = assets.some((a) => a.status === "pending");
  if (!pending && pack.status === "generating") {
    const next = assets.every((a) => a.status === "ready") ? "ready" : "partial";
    await sql`update wippmoji_packs set status = ${next}, completed_at = now() where id = ${packId}`;
    pack.status = next;
  }
  return {
    id: pack.id,
    type: pack.pack_type === "wipppop" ? ("wipppop" as const) : ("expressions" as const),
    status: pack.status,
    posterUrl: await wippmojiPublicUrl(pack.reference_path),
    stickers: await Promise.all(
      assets.map(async (a) => ({ id: a.id, expression: a.expression_id, label: a.label, text: a.overlay_text, start: Number(a.start_offset) || 0, status: a.status, path: a.media_path, url: a.media_path ? await wippmojiPublicUrl(a.media_path) : null })),
    ),
  };
}

export async function listWippmojiLibrary(profileId: string) {
  const sql = await getSql();
  const avatars = await sql<{ id: string; style: string; kind: string; reference_path: string; created_at: string }>`
    select id, style, kind, reference_path, created_at::text from wippmoji_avatars where profile_id = ${profileId} and status = 'ready' order by created_at desc limit 20`;
  const packs = await sql<{ id: string }>`select id from wippmoji_packs where profile_id = ${profileId} and status <> 'deleted' order by created_at desc limit 20`;
  return {
    avatars: await Promise.all(avatars.map(async (a) => ({ id: a.id, style: a.style, kind: a.kind, referenceUrl: await wippmojiPublicUrl(a.reference_path), createdAt: a.created_at }))),
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
