/** Visual text placed on a Story. Distinct from the caption stored in body. */
export type StoryOverlay = {
  text: string;
  /** Horizontal center, 0–1 across the Story canvas. */
  x: number;
  /** Vertical center, 0–1 across the Story canvas. */
  y: number;
  scale: number;
};

export function storyOverlay(text: string, x = 0.5, y = 0.22, scale = 1): StoryOverlay | null {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!clean) return null;
  return {
    text: clean,
    x: clamp(x, 0.12, 0.88),
    y: clamp(y, 0.16, 0.72),
    scale: clamp(scale, 0.7, 2.4),
  };
}

export function parseStoryOverlay(value: unknown): StoryOverlay | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { text?: unknown; x?: unknown; y?: unknown; scale?: unknown };
  if (typeof row.text !== "string") return null;
  return storyOverlay(
    row.text,
    typeof row.x === "number" ? row.x : 0.5,
    typeof row.y === "number" ? row.y : 0.22,
    typeof row.scale === "number" ? row.scale : 1,
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}
