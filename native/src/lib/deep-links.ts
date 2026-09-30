import { useWippStore } from "./store";
import { upsertRemoteProfile } from "./public-profiles";
import { resolveWippQr } from "./qr-resolver";

export { upsertRemoteProfile } from "./public-profiles";

export async function openWippLink(raw: string, mode: "push" | "replace" = "push") {
  const { screenFromWippScheme } = await import("./push/router");
  const internal = screenFromWippScheme(raw);
  if (internal) {
    const st = useWippStore.getState();
    if (!st.onboarded) {
      const { setPendingNav } = await import("./push/nav-intent");
      setPendingNav({ kind: "screen", screen: internal });
      return { ok: true as const, kind: "pending" as const };
    }
    if (internal.name === "conversation") {
      try {
        await st.syncServerInbox();
      } catch {
        /* ignore */
      }
      if (!useWippStore.getState().chats.some((c) => c.id === internal.chatId)) {
        return { ok: false as const, error: "Conversation introuvable" };
      }
    }
    const go = mode === "replace" ? st.replace : st.push;
    go(internal);
    return { ok: true as const, kind: "internal" as const };
  }
  return openResolvedQr(raw, mode);
}

export async function openResolvedQr(raw: string, mode: "push" | "replace" = "push") {
  const dest = await resolveWippQr(raw);
  const st = useWippStore.getState();
  const go = mode === "replace" ? st.replace : st.push;
  if (!dest.ok) {
    go({ name: "scanner", error: dest.error });
    return dest;
  }
  if (dest.kind === "remote-profile") {
    const userId = upsertRemoteProfile(dest.profile, dest.connected);
    go({ name: "found-profile", userId, via: "qr" });
    return dest;
  }
  if (dest.kind === "business") {
    go({ name: "business-card-view", publicId: dest.publicId });
    return dest;
  }
  go({ name: "qr-group", key: dest.token });
  return dest;
}
