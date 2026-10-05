/** Personal phrase on the profile card (replaces the fixed "Good Vibes Only"). */
import { supabase } from "./supabase";
import { useWippStore } from "./store";

export const MOTTO_MAX = 40;

function apply(motto: string) {
  useWippStore.setState((s) => {
    const users = { ...s.users };
    if (users.me) users.me = { ...users.me, motto };
    if (s.serverProfileId && users[`srvuser:${s.serverProfileId}`]) {
      users[`srvuser:${s.serverProfileId}`] = { ...users[`srvuser:${s.serverProfileId}`], motto };
    }
    return { me: { ...s.me, motto }, users };
  });
}

export async function loadMyMotto() {
  const id = useWippStore.getState().serverProfileId;
  if (!id) return;
  try {
    const { data } = await supabase.from("wipp_profiles").select("motto").eq("id", id).maybeSingle();
    if (data && useWippStore.getState().serverProfileId === id) apply(((data as { motto?: string | null }).motto ?? "").trim());
  } catch {
    /* keep what is shown */
  }
}

export async function saveMyMotto(raw: string) {
  const id = useWippStore.getState().serverProfileId;
  const motto = raw.replace(/\s+/g, " ").trim().slice(0, MOTTO_MAX);
  const previous = useWippStore.getState().me.motto ?? "";
  apply(motto);
  if (!id) return;
  const { data, error } = await supabase
    .from("wipp_profiles")
    .update({ motto: motto || null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    apply(previous);
    throw new Error("La phrase n’a pas pu être enregistrée.");
  }
}
