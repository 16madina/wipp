import { supabase } from "./supabase";
import { useWippStore } from "./store";

export function enterWithoutServer(phone: string) {
  const digits = phone.replace(/\D/g, "");
  useWippStore.getState().completeSetup(
    {
      firstName: "",
      lastName: "",
      displayName: digits ? `+${digits}` : "Moi",
      username: digits ? `u${digits.slice(-10)}` : "moi",
      phone,
    },
    true,
  );
}

export async function enterWithSession(accessToken: string, refreshToken: string, phone: string) {
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  const { data: u } = await supabase.auth.getUser();
  let displayName = "";
  let username = "";
  if (u.user) {
    const id = ((await supabase.rpc("wipp_my_profile_id")).data as string | null) ?? "";
    const { data: p } = await supabase
      .from("wipp_public_profiles")
      .select("display_name,username")
      .eq("id", id)
      .maybeSingle();
    displayName = (p?.display_name as string | undefined) ?? "";
    username = (p?.username as string | undefined) ?? "";
  }
  const [firstName, ...rest] = displayName.split(" ");
  useWippStore.getState().completeSetup(
    {
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      displayName,
      ...(username ? { username } : {}),
      phone,
    },
    true,
  );
}
