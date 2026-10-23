/** Wippmoji Studio, app side: talks to the WIPP server, which alone calls the AI provider. */
import * as ImageManipulator from "expo-image-manipulator";
import { wippApi } from "./proximity/wipp-session";
import type { StickerDef } from "./stickers";

export type WippmojiStyle = "cartoon" | "realistic";
export type WippmojiStatus = { allowed: boolean; provider: "xai" | "mock"; packSize: number; expressions: { id: string; fr: string; en: string }[] };
export type WippmojiSticker = { id: string; expression: string; label: string | null; status: "pending" | "ready" | "failed" | "deleted"; path: string | null; url: string | null };
export type WippmojiPack = { id: string; status: "generating" | "ready" | "partial" | "deleted"; posterUrl: string; stickers: WippmojiSticker[] };
export type WippmojiAvatar = { id: string; style: WippmojiStyle; referenceUrl: string };

export const wippmojiStatus = () => wippApi<WippmojiStatus>("wippmoji/status");
export const wippmojiLibrary = () => wippApi<{ avatars: (WippmojiAvatar & { createdAt: string })[]; packs: WippmojiPack[] }>("wippmoji/library");
export const wippmojiPack = (id: string) => wippApi<WippmojiPack>(`wippmoji/packs/${encodeURIComponent(id)}`);
export const deleteWippmojiAvatar = (id: string) => wippApi<{ ok: true }>(`wippmoji/avatars/${encodeURIComponent(id)}/delete`, { method: "POST" });

/** Square, 1024 px, JPEG: what the AI needs, and nothing else from the original file (no location or camera data). */
export async function preparePhoto(uri: string) {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error("photo");
  return `data:image/jpeg;base64,${out.base64}`;
}

export function createWippmojiAvatar(photo: string, style: WippmojiStyle) {
  return wippApi<WippmojiAvatar>("wippmoji/avatars", { method: "POST", body: JSON.stringify({ photo, style, consent: true }) });
}

export function createWippmojiPack(avatarId: string, expressions: string[], language: "fr" | "en" | null) {
  return wippApi<WippmojiPack>("wippmoji/packs", { method: "POST", body: JSON.stringify({ avatarId, expressions, language }) });
}

/** A finished sticker, ready to be sent like the built-in ones (the id carries where the clip is). */
export function wippmojiStickerDef(s: WippmojiSticker): StickerDef | null {
  if (s.status !== "ready" || !s.path) return null;
  return { id: `wm:${s.path}`, pack: "moji", src: "", labelFr: s.label || "Wippmoji", labelEn: s.label || "Wippmoji" };
}

let cache: StickerDef[] | null = null;
/** My finished Wippmojis (kept in memory while the app is open). */
export async function myWippmojis(refresh = false): Promise<StickerDef[]> {
  if (cache && !refresh) return cache;
  const lib = await wippmojiLibrary();
  cache = lib.packs.flatMap((p) => p.stickers.map(wippmojiStickerDef).filter((x): x is StickerDef => x !== null));
  return cache;
}
export function forgetMyWippmojis() {
  cache = null;
}
