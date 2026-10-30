/**
 * Call reactions: registry + live state.
 *
 * Each reaction has a stable id and, once delivered, an animation file made in advance (Grok → green screen removed
 * → animated WebP with a real transparent background, see scripts/convert-reaction.sh). The file is in the app,
 * never sent during the call: phones only exchange the reaction id ({ t: "react", r, n }).
 *
 * `file: null` = the final animation is not delivered yet: a temporary placeholder (the emoji, gently animated)
 * is shown and marked as such. Never replace a delivered file by an emoji.
 */
import { AccessibilityInfo } from "react-native";
import { create } from "zustand";

export type ReactionId = "bravo" | "amour" | "mdr" | "fete" | "chaud" | "wow" | "valide" | "diamant";
export type ReactionPlace = "over" | "around";

export type ReactionDef = {
  id: ReactionId;
  label: string;
  /** Placeholder until the animation file is delivered (and the icon in the picker). */
  emoji: string;
  /** Animated WebP with transparency (require(...)), or null while waiting for the Grok file. */
  file: number | null;
  durationMs: number;
  /** Size relative to the participant's photo / tile. */
  scale: number;
  place: ReactionPlace;
  /** Optional sound (off by default in settings). */
  sound: number | null;
  /** Collective effect when several people send it together. */
  collective?: { label: string; file: number | null; threshold: number; windowMs: number; durationMs: number };
};

export const REACTIONS: ReactionDef[] = [
  { id: "bravo", label: "Bravo", emoji: "👏", file: null, durationMs: 2600, scale: 1.1, place: "over", sound: null, collective: { label: "Ovation", file: null, threshold: 3, windowMs: 5000, durationMs: 3000 } },
  { id: "amour", label: "Amour", emoji: "❤️", file: null, durationMs: 2600, scale: 1.2, place: "around", sound: null, collective: { label: "Grand cœur", file: null, threshold: 3, windowMs: 5000, durationMs: 3000 } },
  { id: "mdr", label: "MDR", emoji: "😂", file: null, durationMs: 2400, scale: 1.0, place: "over", sound: null, collective: { label: "Fou rire", file: null, threshold: 3, windowMs: 5000, durationMs: 3000 } },
  { id: "fete", label: "Fête", emoji: "🎉", file: null, durationMs: 2600, scale: 1.3, place: "around", sound: null, collective: { label: "Célébration", file: null, threshold: 3, windowMs: 5000, durationMs: 3000 } },
  { id: "chaud", label: "C’est chaud", emoji: "🔥", file: null, durationMs: 2400, scale: 1.2, place: "around", sound: null },
  { id: "wow", label: "Wow", emoji: "😮", file: null, durationMs: 2000, scale: 1.0, place: "over", sound: null },
  { id: "valide", label: "Validé", emoji: "💯", file: null, durationMs: 2000, scale: 1.0, place: "over", sound: null },
  { id: "diamant", label: "Diamant", emoji: "💎", file: null, durationMs: 2600, scale: 1.1, place: "around", sound: null },
];

export const REACTION_BY_ID = Object.fromEntries(REACTIONS.map((r) => [r.id, r])) as Record<ReactionId, ReactionDef>;
export const isReactionId = (x: unknown): x is ReactionId => typeof x === "string" && x in REACTION_BY_ID;

/** Tunable limits (anti-spam, collective effects). */
export const REACTION_RULES = {
  /** One reaction every … per person (sender side). */
  sendEveryMs: 700,
  /** At most … reactions per person per 3 s (receiver side). */
  perPersonPer3s: 4,
  /** At most … animations at the same time on screen. */
  maxOnScreen: 6,
  /** Pause between two collective effects. */
  collectiveCooldownMs: 15000,
  /** WIPP Moment: once every … per person, and … between two Moments on screen. */
  momentEveryMs: 30000,
  momentGapMs: 10000,
  momentDurationMs: 3000,
  /** Messages older than this are ignored (late after a bad connection). */
  maxAgeMs: 8000,
};

export type LiveReaction = { key: string; from: string; r: ReactionId; at: number };

type State = {
  live: LiveReaction[];
  collective: { r: ReactionId; at: number } | null;
  /** WIPP Moment on screen (who started it). */
  moment: { from: string; at: number } | null;
  /** Settings (saved on the phone). */
  reduceMotion: boolean;
  sounds: boolean;
};

export const useReactions = create<State>(() => ({ live: [], collective: null, moment: null, reduceMotion: false, sounds: false }));

const seen = new Map<string, number>();
const recentBySender = new Map<string, number[]>();
const forCollective = new Map<ReactionId, { from: string; at: number }[]>();
let lastCollectiveAt = 0;
let lastSentAt = 0;

/** Sender side: may I send now? */
export function canSendReaction() {
  const now = Date.now();
  if (now - lastSentAt < REACTION_RULES.sendEveryMs) return false;
  lastSentAt = now;
  return true;
}

export function newNonce() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** A reaction from someone (me included). Returns false if dropped (double, too old, too many). */
export function receiveReaction(from: string, r: ReactionId, nonce: string, sentAt?: number) {
  const now = Date.now();
  const id = `${from}:${nonce}`;
  if (seen.has(id)) return false;
  seen.set(id, now);
  if (seen.size > 300) for (const [k, t] of seen) if (now - t > 60_000) seen.delete(k);
  // Phones' clocks differ a little: only drop clearly stale messages.
  if (sentAt && now - sentAt > REACTION_RULES.maxAgeMs && now - sentAt < 3_600_000) return false;
  const times = (recentBySender.get(from) ?? []).filter((t) => now - t < 3000);
  if (times.length >= REACTION_RULES.perPersonPer3s) return false;
  times.push(now);
  recentBySender.set(from, times);

  const def = REACTION_BY_ID[r];
  useReactions.setState((s) => ({ live: [...s.live.filter((x) => now - x.at < 4000), { key: id, from, r, at: now }].slice(-REACTION_RULES.maxOnScreen) }));
  setTimeout(() => useReactions.setState((s) => ({ live: s.live.filter((x) => x.key !== id) })), def.durationMs + 100);

  // Collective effect: same reaction from enough different people in the window (each phone decides alike).
  if (def.collective) {
    const list = (forCollective.get(r) ?? []).filter((x) => now - x.at < def.collective!.windowMs && x.from !== from);
    list.push({ from, at: now });
    forCollective.set(r, list);
    if (list.length >= def.collective.threshold && now - lastCollectiveAt > REACTION_RULES.collectiveCooldownMs) {
      lastCollectiveAt = now;
      forCollective.set(r, []);
      useReactions.setState({ collective: { r, at: now } });
      setTimeout(() => useReactions.setState((s) => (s.collective?.at === now ? { collective: null } : s)), def.collective.durationMs);
    }
  }
  return true;
}

export function resetReactions() {
  seen.clear();
  recentBySender.clear();
  forCollective.clear();
  useReactions.setState({ live: [], collective: null, moment: null });
  lastMomentAt = 0;
}

/* Settings: saved on the phone; system "reduce motion" is respected. */
const KEY = "wipp-call-reactions";
export async function loadReactionSettings() {
  try {
    const S = await import("expo-secure-store");
    const raw = await S.getItemAsync(KEY);
    const saved = raw ? (JSON.parse(raw) as { reduceMotion?: boolean; sounds?: boolean }) : {};
    const system = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    useReactions.setState({ reduceMotion: saved.reduceMotion ?? system, sounds: saved.sounds ?? false });
  } catch {
    /* defaults */
  }
}
export async function saveReactionSettings(patch: { reduceMotion?: boolean; sounds?: boolean }) {
  useReactions.setState(patch);
  try {
    const S = await import("expo-secure-store");
    const { reduceMotion, sounds } = useReactions.getState();
    await S.setItemAsync(KEY, JSON.stringify({ reduceMotion, sounds }));
  } catch {
    /* not saved */
  }
}

let lastMomentAt = 0;
let lastMomentSent = 0;
/** Sender side: a WIPP Moment at most every 30 s. */
export function canSendMoment() {
  const now = Date.now();
  if (now - lastMomentSent < REACTION_RULES.momentEveryMs) return false;
  lastMomentSent = now;
  return true;
}
export function receiveMoment(from: string, nonce: string) {
  const now = Date.now();
  const id = `m:${from}:${nonce}`;
  if (seen.has(id) || now - lastMomentAt < REACTION_RULES.momentGapMs) return false;
  seen.set(id, now);
  lastMomentAt = now;
  useReactions.setState({ moment: { from, at: now } });
  setTimeout(() => useReactions.setState((s) => (s.moment?.at === now ? { moment: null } : s)), REACTION_RULES.momentDurationMs);
  return true;
}
