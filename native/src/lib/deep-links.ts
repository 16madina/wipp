import { useWippStore } from "./store";
import { upsertRemoteProfile } from "./public-profiles";
import { resolveWippQr, type QrDestination } from "./qr-resolver";

export { upsertRemoteProfile } from "./public-profiles";

/** wippapp.com/c/<code> or wipp://c/<code> → the call link code. */
export function callLinkToken(raw: string) {
  const m = /^(?:https?:\/\/(?:www\.)?(?:wippapp\.com|wipp\.me)|wipp:\/)\/c\/([A-Za-z0-9_-]{16,64})(?:[/?#]|$)/i.exec(raw.trim());
  return m ? m[1]! : null;
}

export async function openWippLink(raw: string, mode: "push" | "replace" = "push") {
  // Invitation to a WIPP online event: https://wippapp.com/e/{eventId}?k=…
  const { parseLiveLink } = await import("./event-live");
  const liveLink = parseLiveLink(raw);
  if (liveLink) {
    const st = useWippStore.getState();
    if (!st.onboarded) {
      const { setPendingNav } = await import("./push/nav-intent");
      setPendingNav({ kind: "url", url: raw });
      return { ok: true as const, kind: "pending" as const };
    }
    try {
      const { joinLiveLink } = await import("./event-live");
      if (liveLink.k) await joinLiveLink(liveLink.eventId, liveLink.k);
      const { fetchEvents } = await import("./lot7/api");
      useWippStore.setState({ lifestyle: await fetchEvents(st.serverProfileId) });
    } catch (err) {
      const { errorText } = await import("./error-fr");
      return { ok: false as const, error: errorText(err, "Invitation invalide.") };
    }
    (mode === "replace" ? st.replace : st.push)({ name: "lifestyle", itemId: liveLink.eventId });
    return { ok: true as const, kind: "internal" as const };
  }
  const callToken = callLinkToken(raw);
  if (callToken) {
    const st = useWippStore.getState();
    const screen = { name: "call-join" as const, token: callToken };
    if (!st.onboarded) {
      const { setPendingNav } = await import("./push/nav-intent");
      setPendingNav({ kind: "screen", screen });
      return { ok: true as const, kind: "pending" as const };
    }
    (mode === "replace" ? st.replace : st.push)(screen);
    return { ok: true as const, kind: "internal" as const };
  }
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
  return goToQrDestination(dest, mode);
}

/** Opens an already-resolved WIPP QR (profile, business card, group). */
export function goToQrDestination(dest: Extract<QrDestination, { ok: true }>, mode: "push" | "replace" = "push") {
  const st = useWippStore.getState();
  const go = mode === "replace" ? st.replace : st.push;
  if (dest.kind === "remote-profile") {
    const userId = upsertRemoteProfile(dest.profile, dest.connected);
    go({ name: "found-profile", userId, via: "qr", offerToken: dest.offer?.token, offerMinutes: dest.offer?.minutes });
    return dest;
  }
  if (dest.kind === "business") {
    go({ name: "business-card-view", publicId: dest.publicId });
    return dest;
  }
  go({ name: "qr-group", key: dest.token });
  return dest;
}
