/**
 * Video Studio project: what the person edits. The source files are never changed;
 * the final video is made from this description on the phone (see exportStudioProject).
 * All edit functions are pure: they return a new project, so undo / redo is a list of past projects.
 */

export const MAX_SOURCES = 2;
export const MAX_OUTPUT_SEC = 60;
export const MIN_SEGMENT_SEC = 0.3;
export const SPEEDS = [0.5, 1, 1.5, 2] as const;

export type StudioSource = { id: string; uri: string; duration: number; index: number };

export type StudioSegment = {
  id: string;
  sourceId: string;
  /** Seconds in the source file. */
  start: number;
  end: number;
  /** 0–1. 0 = muted. */
  volume: number;
  speed: number;
};

export type StudioTextStyle = "plain" | "box" | "outline";
export type StudioFont = "classic" | "serif" | "rounded" | "mono" | "hand";
export type StudioAlign = "left" | "center" | "right";
export type StudioAnim = "none" | "appear" | "fade" | "pop" | "slide";
export const STUDIO_FONTS: StudioFont[] = ["classic", "serif", "rounded", "mono", "hand"];
export const STUDIO_ANIMS: StudioAnim[] = ["none", "appear", "fade", "pop", "slide"];
/** Intro animation length (seconds), same in the preview and the export. */
export const ANIM_SEC = 0.4;

/** Font file used on each system, for both the preview and the export (so they match). */
export const FONT_FILES: Record<StudioFont, { ios: string | null; iosBold: string | null; android: string }> = {
  classic: { ios: null, iosBold: null, android: "sans-serif" },
  serif: { ios: "Georgia", iosBold: "Georgia-Bold", android: "serif" },
  rounded: { ios: "ArialRoundedMTBold", iosBold: "ArialRoundedMTBold", android: "sans-serif-medium" },
  mono: { ios: "Menlo-Regular", iosBold: "Menlo-Bold", android: "monospace" },
  hand: { ios: "Noteworthy-Light", iosBold: "Noteworthy-Bold", android: "casual" },
};
export function fontFileFor(font: StudioFont, bold: boolean, os: string): string | null {
  const f = FONT_FILES[font] ?? FONT_FILES.classic;
  return os === "ios" ? (bold ? f.iosBold : f.ios) : f.android;
}

/** Intro animation state at `t` seconds after the text appears (preview and export use the same curve). */
export function animAt(anim: StudioAnim, t: number) {
  const p = Math.max(0, Math.min(1, t / ANIM_SEC));
  const ease = 1 - Math.pow(1 - p, 3);
  switch (anim) {
    case "fade":
      return { opacity: ease, scale: 1, dy: 0 };
    case "appear":
      return { opacity: ease, scale: 1.3 - 0.3 * ease, dy: 0 };
    case "pop":
      return { opacity: Math.min(1, p * 3), scale: p < 0.6 ? 0.5 + (0.62 * p) / 0.6 : 1.12 - (0.12 * (p - 0.6)) / 0.4, dy: 0 };
    case "slide":
      return { opacity: ease, scale: 1, dy: 0.08 * (1 - ease) };
    default:
      return { opacity: 1, scale: 1, dy: 0 };
  }
}

export type StudioText = {
  id: string;
  text: string;
  /** Centre of the text, 0–1 across the 9:16 canvas. */
  x: number;
  y: number;
  /** Font size as a share of the canvas width. */
  size: number;
  color: string;
  style: StudioTextStyle;
  font: StudioFont;
  bold: boolean;
  shadow: boolean;
  align: StudioAlign;
  /** Degrees, clockwise. */
  rot: number;
  anim: StudioAnim;
  /** Seconds on the final (edited) timeline. */
  from: number;
  to: number;
};

export type StudioFilterKind = "none" | "bright" | "contrast" | "warm" | "cool" | "vivid" | "bw";
export const STUDIO_FILTERS: StudioFilterKind[] = ["none", "bright", "contrast", "warm", "cool", "vivid", "bw"];
/** One filter for the whole video, with its strength (0–1). Texts are never filtered. */
export type StudioFilter = { kind: StudioFilterKind; amount: number };

export type StudioProject = { sources: StudioSource[]; segments: StudioSegment[]; texts: StudioText[]; filter?: StudioFilter };

/** Colour settings sent to the native engines (same numbers on iPhone and Android). */
export function filterParams(f: StudioFilter | undefined) {
  const a = f && f.kind !== "none" ? clamp(f.amount, 0, 1) : 0;
  const p = { brightness: 0, contrast: 1, saturation: 1, red: 1, blue: 1 };
  switch (f?.kind) {
    case "bright": p.brightness = 0.15 * a; break;
    case "contrast": p.contrast = 1 + 0.35 * a; break;
    case "warm": p.red = 1 + 0.12 * a; p.blue = 1 - 0.12 * a; break;
    case "cool": p.red = 1 - 0.1 * a; p.blue = 1 + 0.12 * a; break;
    case "vivid": p.saturation = 1 + 0.6 * a; break;
    case "bw": p.saturation = 1 - a; break;
  }
  return p;
}

export function setFilter(p: StudioProject, filter: StudioFilter): StudioProject {
  return { ...p, filter: { kind: filter.kind, amount: clamp(filter.amount, 0, 1) } };
}

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function segmentLength(seg: StudioSegment) {
  return (seg.end - seg.start) / seg.speed;
}

export function totalDuration(p: StudioProject) {
  return p.segments.reduce((sum, s) => sum + segmentLength(s), 0);
}

/** Where each segment starts on the final timeline. */
export function segmentOffsets(p: StudioProject) {
  let at = 0;
  return p.segments.map((s) => {
    const from = at;
    at += segmentLength(s);
    return { seg: s, from, to: at };
  });
}

/** Final-timeline time → segment and the matching time in its source file. */
export function locate(p: StudioProject, t: number) {
  const list = segmentOffsets(p);
  if (!list.length) return null;
  const time = clamp(t, 0, list[list.length - 1].to);
  const hit = list.find((x) => time < x.to - 1e-4) ?? list[list.length - 1];
  const index = list.indexOf(hit);
  return { index, seg: hit.seg, from: hit.from, to: hit.to, sourceTime: hit.seg.start + (time - hit.from) * hit.seg.speed };
}

export function createProject(source: { uri: string; duration: number }, range?: { start: number; end: number }): StudioProject {
  const src: StudioSource = { id: newId("src"), uri: source.uri, duration: source.duration, index: 0 };
  const start = range ? clamp(range.start, 0, source.duration) : 0;
  const end = range ? clamp(range.end, start + MIN_SEGMENT_SEC, source.duration) : source.duration;
  return { sources: [src], segments: [{ id: newId("seg"), sourceId: src.id, start, end, volume: 1, speed: 1 }], texts: [] };
}

export function addSource(p: StudioProject, source: { uri: string; duration: number }): StudioProject {
  if (p.sources.length >= MAX_SOURCES) return p;
  const src: StudioSource = { id: newId("src"), uri: source.uri, duration: source.duration, index: p.sources.length };
  return {
    ...p,
    sources: [...p.sources, src],
    segments: [...p.segments, { id: newId("seg"), sourceId: src.id, start: 0, end: source.duration, volume: 1, speed: 1 }],
  };
}

/** Cuts the segment under final-timeline time t in two. */
export function splitAt(p: StudioProject, t: number): { project: StudioProject; rightId: string | null } {
  const hit = locate(p, t);
  if (!hit) return { project: p, rightId: null };
  const cut = hit.sourceTime;
  if (cut - hit.seg.start < MIN_SEGMENT_SEC || hit.seg.end - cut < MIN_SEGMENT_SEC) return { project: p, rightId: null };
  const left: StudioSegment = { ...hit.seg, end: cut };
  const right: StudioSegment = { ...hit.seg, id: newId("seg"), start: cut };
  const segments = [...p.segments];
  segments.splice(hit.index, 1, left, right);
  return { project: { ...p, segments }, rightId: right.id };
}

/** Removes a segment; the parts around it are joined. Texts that end up past the end are pulled back. */
export function removeSegment(p: StudioProject, id: string): StudioProject {
  if (p.segments.length <= 1) return p;
  const segments = p.segments.filter((s) => s.id !== id);
  const next = { ...p, segments };
  // A source that has no segment left is dropped (frees a slot for another video).
  const used = new Set(segments.map((s) => s.sourceId));
  next.sources = p.sources.filter((s) => used.has(s.id)).map((s, index) => ({ ...s, index }));
  return fitTexts(next);
}

export function updateSegment(p: StudioProject, id: string, patch: Partial<Pick<StudioSegment, "start" | "end" | "volume" | "speed">>): StudioProject {
  return fitTexts({
    ...p,
    segments: p.segments.map((s) => {
      if (s.id !== id) return s;
      const src = p.sources.find((x) => x.id === s.sourceId);
      const max = src?.duration ?? s.end;
      const start = clamp(patch.start ?? s.start, 0, max - MIN_SEGMENT_SEC);
      const end = clamp(patch.end ?? s.end, start + MIN_SEGMENT_SEC, max);
      return { ...s, start, end, volume: clamp(patch.volume ?? s.volume, 0, 1), speed: patch.speed ?? s.speed };
    }),
  });
}

export function moveSegment(p: StudioProject, id: string, delta: -1 | 1): StudioProject {
  const i = p.segments.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.segments.length) return p;
  const segments = [...p.segments];
  [segments[i], segments[j]] = [segments[j], segments[i]];
  return { ...p, segments };
}

export function addText(p: StudioProject, at: number, text: Omit<StudioText, "id" | "from" | "to" | "x" | "y">): { project: StudioProject; id: string } {
  const total = totalDuration(p);
  const from = clamp(at, 0, Math.max(0, total - 0.5));
  const id = newId("txt");
  return { project: { ...p, texts: [...p.texts, { ...text, id, x: 0.5, y: 0.4, from, to: Math.min(total, from + 3) }] }, id };
}

export function updateText(p: StudioProject, id: string, patch: Partial<Omit<StudioText, "id">>): StudioProject {
  const total = totalDuration(p);
  return {
    ...p,
    texts: p.texts.map((t) => {
      if (t.id !== id) return t;
      const n = { ...t, ...patch };
      const from = clamp(n.from, 0, Math.max(0, total - 0.2));
      return { ...n, x: clamp(n.x, 0.05, 0.95), y: clamp(n.y, 0.05, 0.95), size: clamp(n.size, 0.03, 0.3), from, to: clamp(n.to, from + 0.2, total) };
    }),
  };
}

export function removeText(p: StudioProject, id: string): StudioProject {
  return { ...p, texts: p.texts.filter((t) => t.id !== id) };
}

function fitTexts(p: StudioProject): StudioProject {
  const total = totalDuration(p);
  return {
    ...p,
    texts: p.texts
      .filter((t) => t.from < total - 0.1)
      .map((t) => ({ ...t, to: Math.min(t.to, total) })),
  };
}

/** True when the project is just the untouched first video (nothing to export). */
export function isUntouched(p: StudioProject) {
  if (p.sources.length !== 1 || p.segments.length !== 1 || p.texts.length) return false;
  if (p.filter && p.filter.kind !== "none" && p.filter.amount > 0) return false;
  const s = p.segments[0];
  return s.start < 0.05 && Math.abs(s.end - p.sources[0].duration) < 0.05 && s.volume === 1 && s.speed === 1;
}

/** History for undo / redo. */
export type History = { past: StudioProject[]; present: StudioProject; future: StudioProject[] };
export const historyOf = (present: StudioProject): History => ({ past: [], present, future: [] });
export function commit(h: History, next: StudioProject): History {
  if (next === h.present) return h;
  return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

/** What the native exporters receive (same shape on iPhone and Android). */
export function exportSpec(p: StudioProject, os = "ios") {
  const byId = new Map(p.sources.map((s) => [s.id, s]));
  return {
    width: 720,
    height: 1280,
    filter: filterParams(p.filter),
    segments: p.segments.map((s) => ({ uri: byId.get(s.sourceId)!.uri, start: s.start, end: s.end, volume: s.volume, speed: s.speed })),
    texts: p.texts.map((t) => ({
      text: t.text,
      x: t.x,
      y: t.y,
      size: t.size,
      color: t.color,
      style: t.style,
      bold: t.bold,
      shadow: t.shadow,
      align: t.align,
      rot: t.rot,
      anim: t.anim,
      animSec: ANIM_SEC,
      fontName: fontFileFor(t.font, t.bold, os),
      from: t.from,
      to: t.to,
    })),
  };
}
export type ExportSpec = ReturnType<typeof exportSpec>;
