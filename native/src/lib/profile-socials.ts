/** Links to the person's social networks, shown as icons on the profile. Handles only, typed by the owner. */
import { supabase } from "./supabase";
import { useWippStore } from "./store";
import { tr } from "./tr";

export const SOCIAL_KINDS = ["tiktok", "instagram", "snapchat", "facebook", "youtube"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];
export type Socials = Partial<Record<SocialKind, string>>;

export const SOCIAL_NAME: Record<SocialKind, string> = { tiktok: "TikTok", instagram: "Instagram", snapchat: "Snapchat", facebook: "Facebook", youtube: "YouTube" };

/** « @name », « name » or a pasted profile link → the bare handle (empty when it is not usable). */
export function cleanHandle(raw: string): string {
  let v = raw.trim();
  if (/^https?:\/\//i.test(v) || /^(www\.)?[a-z]+\.(com|me)\//i.test(v)) {
    v = v.replace(/^https?:\/\//i, "").replace(/[?#].*$/, "");
    const parts = v.split("/").filter(Boolean).slice(1).filter((p) => p !== "add" && p !== "u" && p !== "c" && p !== "channel" && p !== "user");
    v = parts[0] ?? "";
  }
  v = v.replace(/^@+/, "");
  return /^[A-Za-z0-9._-]{2,40}$/.test(v) ? v : "";
}

export function socialLink(kind: SocialKind, handle: string) {
  if (kind === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (kind === "instagram") return `https://www.instagram.com/${handle}`;
  if (kind === "snapchat") return `https://www.snapchat.com/add/${handle}`;
  if (kind === "youtube") return `https://www.youtube.com/@${handle}`;
  return `https://www.facebook.com/${handle}`;
}

function parse(value: unknown): Socials {
  const out: Socials = {};
  if (value && typeof value === "object") {
    for (const kind of SOCIAL_KINDS) {
      const h = cleanHandle(String((value as Record<string, unknown>)[kind] ?? ""));
      if (h) out[kind] = h;
    }
  }
  return out;
}

/** Someone's links. Empty when they have none (or when the server does not know the field yet). */
export async function loadSocials(profileId: string): Promise<Socials> {
  try {
    const { data, error } = await supabase.from("wipp_public_profiles").select("socials").eq("id", profileId.replace(/^srvuser:/, "")).maybeSingle();
    if (error) return {};
    return parse((data as { socials?: unknown } | null)?.socials);
  } catch {
    return {};
  }
}

export async function loadMySocials() {
  const id = useWippStore.getState().serverProfileId;
  if (!id) return;
  const socials = await loadSocials(id);
  if (useWippStore.getState().serverProfileId === id) useWippStore.setState((s) => ({ me: { ...s.me, socials } }));
}

export async function saveMySocials(draft: Record<SocialKind, string>) {
  const id = useWippStore.getState().serverProfileId;
  const socials: Socials = {};
  for (const kind of SOCIAL_KINDS) {
    const raw = draft[kind].trim();
    if (!raw) continue;
    const h = cleanHandle(raw);
    if (!h) throw new Error(tr("Le nom {0} n’est pas valide.", SOCIAL_NAME[kind]));
    socials[kind] = h;
  }
  if (!id) throw new Error(tr("Connecte-toi avec un vrai compte"));
  const { data, error } = await supabase
    .from("wipp_profiles")
    .update({ socials: Object.keys(socials).length ? socials : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) throw new Error(tr("Tes réseaux n’ont pas pu être enregistrés."));
  useWippStore.setState((s) => ({ me: { ...s.me, socials } }));
}
