/**
 * What is placed on a Story photo or video: texts (font, colour, background) and Wippie / Wippmoji stickers.
 * Distinct from the caption stored in body. Positions are 0–1 across the Story canvas, so every screen size matches.
 * The first text is also kept in the old flat fields (text, x, y, scale) for older app versions.
 */
export type StoryFont = "classic" | "strong" | "hand" | "typewriter" | "elegant" | "neon";
export type StoryTextBg = "none" | "solid" | "soft";

export type StoryTextLayer = {
  t: "text";
  text: string;
  x: number;
  y: number;
  scale: number;
  /** Degrees. */
  rot: number;
  font: StoryFont;
  color: string;
  bg: StoryTextBg;
};

export type StoryStickerLayer = { t: "sticker"; id: string; x: number; y: number; scale: number; rot: number };

export type StoryLayer = StoryTextLayer | StoryStickerLayer;

export type StoryOverlay = {
  text: string;
  x: number;
  y: number;
  scale: number;
  layers?: StoryLayer[];
};

export const STORY_FONTS: StoryFont[] = ["classic", "strong", "hand", "typewriter", "elegant", "neon"];
export const STORY_COLORS = ["#ffffff", "#000000", "#ffd84d", "#ff4d6d", "#ff8a3d", "#3ddc84", "#2ec5ff", "#1a6bd9", "#a259ff", "#ff7ac6"];
export const MAX_LAYERS = 12;
export const MAX_STICKERS = 6;

function clamp(value: number, min: number, max: number, fallback = (min + max) / 2) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function cleanText(text: string) {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 120);
}

export function normalizeLayer(raw: unknown): StoryLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const common = {
    x: clamp(num(r.x, 0.5), 0.02, 0.98, 0.5),
    y: clamp(num(r.y, 0.4), 0.04, 0.96, 0.4),
    scale: clamp(num(r.scale, 1), 0.3, 4, 1),
    rot: clamp(num(r.rot, 0), -180, 180, 0),
  };
  if (r.t === "sticker") {
    const id = typeof r.id === "string" && /^[a-z0-9-]{2,40}$/.test(r.id) ? r.id : null;
    return id ? { t: "sticker", id, ...common } : null;
  }
  if (r.t === "text" || typeof r.text === "string") {
    const text = typeof r.text === "string" ? cleanText(r.text) : "";
    if (!text) return null;
    const font = STORY_FONTS.includes(r.font as StoryFont) ? (r.font as StoryFont) : "classic";
    const color = typeof r.color === "string" && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color.toLowerCase() : "#ffffff";
    const bg = r.bg === "solid" || r.bg === "soft" ? r.bg : "none";
    return { t: "text", text, ...common, font, color, bg };
  }
  return null;
}

/** Layers → what is sent and stored. Null when nothing is placed. */
export function overlayFromLayers(layers: StoryLayer[]): StoryOverlay | null {
  const clean = layers.map(normalizeLayer).filter((l): l is StoryLayer => l !== null).slice(0, MAX_LAYERS);
  if (!clean.length) return null;
  const firstText = clean.find((l): l is StoryTextLayer => l.t === "text");
  return {
    text: firstText ? firstText.text.replace(/\s+/g, " ").slice(0, 80) : "",
    x: firstText ? clamp(firstText.x, 0.12, 0.88) : 0.5,
    y: firstText ? clamp(firstText.y, 0.16, 0.72) : 0.22,
    scale: firstText ? clamp(firstText.scale, 0.7, 2.4) : 1,
    layers: clean,
  };
}

/** Stored overlay → layers to draw (old stories: one white text). */
export function layersOf(overlay: StoryOverlay | null | undefined): StoryLayer[] {
  if (!overlay) return [];
  if (overlay.layers?.length) return overlay.layers;
  if (!overlay.text) return [];
  return [{ t: "text", text: overlay.text, x: overlay.x, y: overlay.y, scale: overlay.scale, rot: 0, font: "strong", color: "#ffffff", bg: "none" }];
}

export function parseStoryOverlay(value: unknown): StoryOverlay | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { text?: unknown; x?: unknown; y?: unknown; scale?: unknown; layers?: unknown };
  if (Array.isArray(row.layers)) return overlayFromLayers(row.layers as StoryLayer[]);
  if (typeof row.text !== "string" || !row.text.trim()) return null;
  return {
    text: row.text.trim().slice(0, 80),
    x: clamp(typeof row.x === "number" ? row.x : 0.5, 0.12, 0.88),
    y: clamp(typeof row.y === "number" ? row.y : 0.22, 0.16, 0.72),
    scale: clamp(typeof row.scale === "number" ? row.scale : 1, 0.7, 2.4),
  };
}

/** Kept for older call sites: one plain text. */
export function storyOverlay(text: string, x = 0.5, y = 0.22, scale = 1): StoryOverlay | null {
  return overlayFromLayers([{ t: "text", text, x, y, scale, rot: 0, font: "strong", color: "#ffffff", bg: "none" }]);
}
