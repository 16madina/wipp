/** Draft handed from the story "+" action to the editor. Not a second story system. */

export type StoryMediaDraft = {
  mode: "media";
  uri: string;
  kind: "image" | "video";
  mime: string;
};

export type StoryTextDraft = {
  mode: "text";
};

export type StoryDraft = StoryMediaDraft | StoryTextDraft;

let pending: StoryDraft | null = null;

export function setStoryDraft(draft: StoryDraft) {
  pending = draft;
}

export function takeStoryDraft() {
  const draft = pending;
  pending = null;
  return draft;
}
