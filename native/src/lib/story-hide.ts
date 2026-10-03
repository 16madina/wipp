import { useWippStore } from "./store";

const hidden = new Set<string>();

export function isStoryHidden(id: string) {
  return hidden.has(id);
}

/** Hides one story on this device until the next full reload of the set. */
export function hideStoryLocal(id: string) {
  hidden.add(id);
  useWippStore.setState((state) => ({ stories: [...state.stories] }));
}
