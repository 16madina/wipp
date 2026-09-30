import { isPrivateChat, lockPrivateSession } from "./private-vault";
import { useWippStore } from "./store";
import type { Screen } from "./types";

export function isPrivateSurface(screen: Screen | undefined) {
  if (!screen) return false;
  if (screen.name === "wipp-private") return true;
  if (screen.name === "conversation" && "chatId" in screen && isPrivateChat(screen.chatId)) return true;
  return false;
}

export function popPrivateSurfaces() {
  lockPrivateSession();
  const stack = useWippStore.getState().stack;
  const next = stack.filter((scr) => !isPrivateSurface(scr));
  if (!next.length || next.every((s) => s.name === "splash")) {
    useWippStore.getState().goTab("chats");
    return;
  }
  if (next.length !== stack.length) {
    useWippStore.setState({ stack: next });
  }
}

export function lockPrivateOnBackground() {
  popPrivateSurfaces();
}
