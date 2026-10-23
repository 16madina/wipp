/** Wippmoji Studio, app side: talks to the WIPP server, which alone calls the AI provider. */
import * as ImageManipulator from "expo-image-manipulator";
import { wippApi } from "./proximity/wipp-session";
import type { StickerDef } from "./stickers";

export type WippmojiStyle = "cartoon" | "realistic";
export type WippmojiKind = "moji" | "pop";
export type WippmojiChoice = { id: string; fr: string; en: string };
export type WippmojiStatus = { allowed: boolean; provider: "xai" | "mock"; packSize: number; expressions: WippmojiChoice[]; pop?: { packSize: number; animations: WippmojiChoice[] } };
export type WippmojiSticker = { id: string; expression: string; label: string | null; status: "pending" | "ready" | "failed" | "deleted"; path: string | null; url: string | null };
export type WippmojiPack = { id: string; type?: "expressions" | "wipppop"; status: "generating" | "ready" | "partial" | "deleted"; posterUrl: string; stickers: WippmojiSticker[] };
export type WippmojiAvatar = { id: string; style: WippmojiStyle; kind?: WippmojiKind; referenceUrl: string };

export const wippmojiStatus = () => wippApi<WippmojiStatus>("wippmoji/status");
export const wippmojiLibrary = () => wippApi<{ avatars: (WippmojiAvatar & { createdAt: string })[]; packs: WippmojiPack[] }>("wippmoji/library");
export const wippmojiPack = (id: string) => wippApi<WippmojiPack>(`wippmoji/packs/${encodeURIComponent(id)}`);
export const deleteWippmojiAvatar = (id: string) => wippApi<{ ok: true }>(`wippmoji/avatars/${encodeURIComponent(id)}/delete`, { method: "POST" });

export type WippmojiFraming = "face" | "bust" | "full";
export type PhotoCrop = { originX: number; originY: number; width: number; height: number };

/** The chosen frame of the photo, 1024 px wide, JPEG: what the AI needs, and nothing else from the original file (no location or camera data). */
export async function preparePhoto(uri: string, crop?: PhotoCrop) {
  const actions: ImageManipulator.Action[] = crop ? [{ crop }, { resize: { width: Math.min(1024, Math.round(crop.width)) } }] : [{ resize: { width: 1024 } }];
  const out = await ImageManipulator.manipulateAsync(uri, actions, { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error("photo");
  return `data:image/jpeg;base64,${out.base64}`;
}

export function createWippmojiAvatar(photo: string, style: WippmojiStyle, framing: WippmojiFraming = "bust", kind: WippmojiKind = "moji") {
  return wippApi<WippmojiAvatar>("wippmoji/avatars", { method: "POST", body: JSON.stringify({ photo, style, framing, kind, consent: true }) });
}

export function createWippmojiPack(avatarId: string, expressions: string[], language: "fr" | "en" | null, type: "expressions" | "wipppop" = "expressions") {
  return wippApi<WippmojiPack>("wippmoji/packs", { method: "POST", body: JSON.stringify({ avatarId, expressions, language, type }) });
}

/** A finished sticker, ready to be sent like the built-in ones (the id carries where the clip is). */
export function wippmojiStickerDef(s: WippmojiSticker, pop = false): StickerDef | null {
  if (s.status !== "ready" || !s.path) return null;
  void pop; // WippPop clips are on green too, like the stickers
  return { id: `wm:${s.path}`, pack: "moji", src: "", labelFr: s.label || "Wippmoji", labelEn: s.label || "Wippmoji" };
}

let cache: StickerDef[] | null = null;
/** My finished Wippmojis (kept in memory while the app is open). */
export async function myWippmojis(refresh = false): Promise<StickerDef[]> {
  if (cache && !refresh) return cache;
  const lib = await wippmojiLibrary();
  cache = lib.packs.filter((p) => p.type !== "wipppop").flatMap((p) => p.stickers.map((s) => wippmojiStickerDef(s)).filter((x): x is StickerDef => x !== null));
  return cache;
}
export function forgetMyWippmojis() {
  cache = null;
}
