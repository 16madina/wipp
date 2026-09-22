import { STORY_VIDEO_MAX_MS } from "./types";

export type MusicMood = "trending" | "chill" | "party" | "afro" | "lofi" | "rnb";

export type StoryMusic = {
  id: string;
  title: string;
  artist: string;
  mood: MusicMood;
  durationMs: number;
  src: string;
  color: string;
};

export const STORY_MUSIC: StoryMusic[] = [
  { id: "gold-hour", title: "Gold Hour", artist: "Sol", mood: "trending", durationMs: 10_000, src: "/music/gold-hour.mp3", color: "#FFD84D" },
  { id: "afterglow", title: "Afterglow", artist: "Mira", mood: "rnb", durationMs: 10_000, src: "/music/afterglow.mp3", color: "#c4a574" },
  { id: "terrasse", title: "Terrasse", artist: "Kori", mood: "afro", durationMs: 10_000, src: "/music/terrasse.mp3", color: "#e8a23a" },
  { id: "ralenti", title: "Ralenti", artist: "Lune", mood: "lofi", durationMs: 10_000, src: "/music/ralenti.mp3", color: "#8b93a7" },
  { id: "heatwave", title: "Heatwave", artist: "Atlas", mood: "party", durationMs: 10_000, src: "/music/heatwave.mp3", color: "#e85d4c" },
  { id: "ville-calme", title: "Ville calme", artist: "Vesper", mood: "chill", durationMs: 10_000, src: "/music/ville-calme.mp3", color: "#5ec8f0" },
  { id: "pulse", title: "Pulse", artist: "Juno", mood: "party", durationMs: 10_000, src: "/music/pulse.mp3", color: "#c4b5fd" },
  { id: "minuit", title: "Minuit", artist: "Nia K.", mood: "chill", durationMs: 10_000, src: "/music/minuit.mp3", color: "#1a2a4a" },
];

export const MUSIC_MOODS: MusicMood[] = ["trending", "chill", "party", "afro", "lofi", "rnb"];

export const STORY_VIEW_MS = 4_200;

export function storyViewMs(item: {
  type?: string;
  durationMs?: number;
  music?: StoryMusic | null;
}) {
  if (item.type === "video") return Math.min(item.durationMs ?? 8_000, STORY_VIDEO_MAX_MS);
  if (item.music) return item.music.durationMs;
  return STORY_VIEW_MS;
}

export function findStoryMusic(id: string) {
  return STORY_MUSIC.find((t) => t.id === id);
}
