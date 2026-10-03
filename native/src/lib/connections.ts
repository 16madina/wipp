import { supabase } from "./supabase";

export type RealRequest = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

export type Relation = "none" | "connected" | "pending_out" | "pending_in" | "self";

async function myProfileId(): Promise<string | null> {
  const { data } = await supabase.rpc("wipp_my_profile_id");
  return (data as string | null) ?? null;
}

export async function listIncomingRequests(): Promise<RealRequest[]> {
  try {
    const { wippApi } = await import("./proximity/wipp-session");
    const data = await wippApi<{ requests?: RealRequest[] }>("connections/requests");
    if (Array.isArray(data.requests)) return data.requests;
  } catch {
    /* older server, or the phone is not linked yet */
  }
  const { useWippStore } = await import("./store");
  const me = useWippStore.getState().serverProfileId ?? (await myProfileId());
  if (!me) return [];
  const { data: reqs } = await supabase
    .from("wipp_connection_requests")
    .select("id,status,created_at,expires_at,sender_id")
    .eq("recipient_id", me)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (!reqs?.length) return [];
  const ids = reqs.map((r: { sender_id: string }) => r.sender_id);
  const { data: profs } = await supabase
    .from("wipp_public_profiles")
    .select("id,username,display_name,avatar_url")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p: { id: string }) => [p.id, p]));
  return (reqs as Array<{ id: string; status: string; created_at: string; expires_at: string; sender_id: string }>)
    .filter((r) => byId.has(r.sender_id))
    .map((r) => {
      const p = byId.get(r.sender_id) as {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
      return {
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        sender: { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url },
      };
    });
}

async function insertRequestDirect(senderId: string, recipientId: string, via: string): Promise<string | null> {
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const base = { sender_id: senderId, recipient_id: recipientId, status: "pending", expires_at: expires };
  const payloads = [
    { ...base, id: crypto.randomUUID(), via: "request" },
    { ...base, id: crypto.randomUUID(), via },
    { ...base, via: "request" },
    { ...base },
  ];
  let blocked = false;
  for (const row of payloads) {
    const { error } = await supabase.from("wipp_connection_requests").insert(row);
    if (!error) return "sent";
    const text = `${error.code ?? ""} ${error.message ?? ""}`;
    console.warn("[wipp] connection insert", text);
    if (/23505|duplicate/i.test(text)) return "already_pending";
    if (/42501|permission|policy|row-level/i.test(text)) blocked = true;
  }
  return blocked ? null : null;
}

export async function sendRequest(
  username: string,
  via: "request" | "qr" | "touch" = "request",
  peerId?: string,
): Promise<string> {
  const clean = username.replace(/^@/, "").trim().toLowerCase();
  const { useWippStore } = await import("./store");
  const me = useWippStore.getState().serverProfileId;
  const peer = peerId?.startsWith("srvuser:") ? peerId.slice("srvuser:".length) : peerId;
  if (me && peer && peer !== me) {
    const direct = await insertRequestDirect(me, peer, via);
    if (direct) {
      try {
        const { wippApi } = await import("./proximity/wipp-session");
        await wippApi("push/connection", {
          method: "POST",
          body: JSON.stringify({ username: clean }),
        });
      } catch {
        /* the request row exists; the notification is best-effort */
      }
      return direct;
    }
  }
  const { wippApi } = await import("./proximity/wipp-session");
  const res = await wippApi<{ status: string }>("connections/requests", {
    method: "POST",
    body: JSON.stringify({ username: clean, via: "request" }),
  });
  try {
    const { wippApi } = await import("./proximity/wipp-session");
    await wippApi("push/connection", {
      method: "POST",
      body: JSON.stringify({ username: clean }),
    });
  } catch {
    /* push is server-side; request itself already succeeded */
  }
  return res.status;
}

export async function respondRequest(id: string, action: "accept" | "decline" | "ignore"): Promise<string> {
  const { wippApi } = await import("./proximity/wipp-session");
  const res = await wippApi<{ status: string }>(`connections/requests/${id}`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  return res.status;
}

export async function blockProfile(profileId: string): Promise<boolean> {
  const me = await myProfileId();
  const raw = profileId.startsWith("srvuser:") ? profileId.slice("srvuser:".length) : profileId;
  if (!me || me === raw) return false;
  const { error } = await supabase.from("wipp_blocks").insert({
    id: `blk_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
    blocker_id: me,
    blocked_id: raw,
    reason: "request",
  });
  return !error;
}

export type BlockedProfile = { id: string; username: string; displayName: string };

export async function listBlockedProfiles(): Promise<BlockedProfile[]> {
  const { wippApi } = await import("./proximity/wipp-session");
  const res = await wippApi<{ blocks?: BlockedProfile[] }>("blocks");
  return res.blocks ?? [];
}

export async function listBlockedIds(): Promise<string[]> {
  return (await listBlockedProfiles()).map((row) => row.id);
}

export async function unblockProfile(profileId: string): Promise<boolean> {
  const raw = profileId.startsWith("srvuser:") ? profileId.slice("srvuser:".length) : profileId;
  if (!raw) return false;
  const { wippApi } = await import("./proximity/wipp-session");
  await wippApi(`blocks/${encodeURIComponent(raw)}`, { method: "DELETE" });
  return true;
}

export async function getRelation(peerId: string): Promise<Relation> {
  const me = await myProfileId();
  if (!me) return "none";
  const raw = peerId.startsWith("srvuser:") ? peerId.slice("srvuser:".length) : peerId;
  if (me === raw) return "self";
  const [a, b] = [me, raw].sort();
  const { data: conn } = await supabase.from("wipp_connections").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (conn) return "connected";
  const { data: out } = await supabase
    .from("wipp_connection_requests")
    .select("id")
    .eq("sender_id", me)
    .eq("recipient_id", raw)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (out) return "pending_out";
  const { data: inn } = await supabase
    .from("wipp_connection_requests")
    .select("id")
    .eq("sender_id", raw)
    .eq("recipient_id", me)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (inn) return "pending_in";
  return "none";
}

export const STATUS_FR: Record<string, string> = {
  sent: "Demande envoyée",
  already_pending: "Demande déjà en attente",
  already_connected: "Vous êtes déjà connectés",
  accepted_existing: "Vous êtes maintenant connectés",
  not_found: "Profil introuvable",
  rate_limited: "Trop de demandes aujourd'hui, réessaie demain",
  paused: "Demandes en pause avec cette personne",
  invalid: "Demande impossible",
  no_session: "Connecte-toi avec un vrai compte",
  error: "Une erreur est survenue",
  accepted: "Vous êtes connectés",
  declined: "Demande refusée",
  ignored: "Demande ignorée",
  already_handled: "Demande déjà traitée",
  expired: "Demande expirée",
  blocked: "Profil introuvable",
};
