import { isStoryLive, type StoryItem } from "./types";

export type StoryRing = "accent" | "muted" | "none";

export function liveStoriesFor(stories: StoryItem[], userId: string, now = Date.now()) {
  return stories.filter((story) => story.userId === userId && isStoryLive(story, now));
}

/** Gold while any active item is unviewed. Gray only when every active item was viewed. */
export function storyRing(stories: StoryItem[], userId: string, now = Date.now()): StoryRing {
  const live = liveStoriesFor(stories, userId, now);
  if (!live.length) return "none";
  return live.some((story) => !story.viewed) ? "accent" : "muted";
}

/** Other people only. Unviewed owners first, then fully viewed. Recency is stable inside each group. */
export function orderedOtherStoryUsers(stories: StoryItem[], now = Date.now()) {
  const latest = new Map<string, { unseen: boolean; at: number }>();
  for (const story of stories) {
    if (story.userId === "me" || !isStoryLive(story, now)) continue;
    const current = latest.get(story.userId);
    const at = Math.max(current?.at ?? 0, story.createdAt);
    const unseen = (current?.unseen ?? false) || !story.viewed;
    latest.set(story.userId, { unseen, at });
  }
  return [...latest.entries()]
    .sort((a, b) => Number(b[1].unseen) - Number(a[1].unseen) || b[1].at - a[1].at || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}
