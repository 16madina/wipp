import type { StickerDef } from "./stickers";
import { STICKER_KEYWORDS } from "./sticker-keywords";

/** Lowercase, no accents (« Cœur » → « coeur »), punctuation and apostrophes become spaces. */
export function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(text: string) {
  return normalizeSearch(text).split(" ").filter(Boolean);
}

type Index = { name: string[]; all: string[] };
const cache = new Map<string, Index>();

function indexOf(s: StickerDef): Index {
  let ix = cache.get(s.id);
  if (!ix) {
    const name = words(s.labelFr);
    ix = { name, all: [...name, ...words(s.labelEn), ...words(STICKER_KEYWORDS[s.id] ?? "")] };
    cache.set(s.id, ix);
  }
  return ix;
}

/** A typed word matches a word that starts with it (« r », « ri », « rire »), or its plural (« coeurs » → « coeur »). */
function matches(typed: string, list: string[]) {
  return list.some((w) => w.startsWith(typed) || (typed.length >= 4 && w.length >= 3 && typed.startsWith(w) && typed.length - w.length <= 2));
}

/**
 * Keeps the stickers where every typed word matches: name first, then the ones found by their search words.
 * Order inside each group stays the tray's order.
 */
export function searchStickers(list: StickerDef[], query: string): StickerDef[] {
  const typed = words(query);
  if (!typed.length) return list;
  const byName: StickerDef[] = [];
  const byWord: StickerDef[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const ix = indexOf(s);
    if (typed.every((t) => matches(t, ix.name))) byName.push(s);
    else if (typed.every((t) => matches(t, ix.all))) byWord.push(s);
  }
  return [...byName, ...byWord];
}
