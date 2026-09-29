import { useWippStore } from "./store";
import { upsertRemoteProfile } from "./public-profiles";
import { resolveWippQr } from "./qr-resolver";

export { upsertRemoteProfile } from "./public-profiles";

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
