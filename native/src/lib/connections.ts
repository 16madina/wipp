import { supabase } from "./supabase";

export type RealRequest = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  via?: string;
  invisible?: boolean;
  ring?: "man" | "woman" | "other" | null;
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
    .select("id,status,created_at,expires_at,sender_id,via,sender_invisible,sender_ring")
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
  return (reqs as Array<{ id: string; status: string; created_at: string; expires_at: string; sender_id: string; via?: string | null; sender_invisible?: boolean | null; sender_ring?: string | null }>)
    .filter((r) => byId.has(r.sender_id))
    .map((r) => {
      const p = byId.get(r.sender_id) as {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
      // Invisible sender from À proximité: no photo in the request.
      const masked = r.via === "nearby" && Boolean(r.sender_invisible);
      return {
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        via: r.via ?? "request",
        invisible: masked,
        ring: masked ? (r.sender_ring === "man" || r.sender_ring === "woman" ? r.sender_ring : "other") : null,
        sender: {
          id: p.id,
          username: p.username,
          displayName: masked ? p.display_name.split(" ")[0] || p.username : p.display_name,
          avatarUrl: masked ? null : p.avatar_url,
        },
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

export async function respondRequest(
  id: string,
  action: "accept" | "decline" | "ignore",
  choice?: import("./types").ConnectionChoice,
): Promise<string> {
  const { wippApi } = await import("./proximity/wipp-session");
  const res = await wippApi<{ status: string }>(`connections/requests/${id}`, {
    method: "POST",
    // The person who accepts chooses permanent / ephemeral; the server computes the expiry.
    body: JSON.stringify({ action, ...(choice ?? {}) }),
  });
  return res.status;
}

function rawId(peerId: string) {
  return peerId.startsWith("srvuser:") ? peerId.slice("srvuser:".length) : peerId;
}

/** My connection with one person (server truth: active / expired, permanent / ephemeral, upgrade requests). */
export async function fetchConnectionWith(peerId: string): Promise<import("./types").ConnectionInfo | null> {
  const { wippApi } = await import("./proximity/wipp-session");
  const res = await wippApi<{ connection: import("./types").ConnectionInfo | null }>(`connections/with/${encodeURIComponent(rawId(peerId))}`);
  return res.connection;
}

/** "Garder ce contact": asks the other person to make the ephemeral connection permanent. */
export async function requestKeepContact(peerId: string) {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{ status: string }>(`connections/with/${encodeURIComponent(rawId(peerId))}/upgrade`, { method: "POST", body: "{}" });
}

export async function answerKeepContact(peerId: string, accept: boolean) {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{ status: string }>(`connections/with/${encodeURIComponent(rawId(peerId))}/upgrade-respond`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

/** All my ACTIVE contacts, used to mark who is really a contact. */
export async function fetchActiveConnections() {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{
    connections: { profile: { id: string; username: string; displayName: string; avatarUrl: string | null; bio: string }; connection: import("./types").ConnectionInfo }[];
  }>("connections/active");
}

/** B accepts / refuses the ephemeral connection offered by a temporary QR. */
export async function answerTempQrOffer(token: string, accept: boolean) {
  const { wippApi } = await import("./proximity/wipp-session");
  return wippApi<{ status: string; connectionType?: string; expiresAt?: number | null }>("qr/temp/offer", {
    method: "POST",
    body: JSON.stringify({ token, accept }),
  });
}

/** Human duration: 15 min, 1 h, 24 h, 7 jours, 3 jours 4 h… */
export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes / 60} h`;
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  return `${d} jour${d > 1 ? "s" : ""}${h ? ` ${h} h` : ""}`;
}

/** "23 h 42 min", "2 j 4 h", "12 min" — computed from the SERVER's expires_at and the current time. */
export function remainingLabel(expiresAt: number, now = Date.now()) {
  const total = Math.max(0, Math.ceil((expiresAt - now) / 60000));
  if (total < 1) return "moins d’une minute";
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d) return `${d} j${h ? ` ${h} h` : ""}`;
  if (h) return `${h} h${m ? ` ${m} min` : ""}`;
  return `${m} min`;
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
  const { data: conn } = await supabase
    .from("wipp_connections")
    .select("status, expires_at")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  // An expired ephemeral connection is not a contact any more.
  const c = conn as { status?: string; expires_at?: string | null } | null;
  if (c && c.status === "active" && (!c.expires_at || Date.parse(c.expires_at) > Date.now())) return "connected";
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
  unavailable: "Impossible d’envoyer cette demande.",
  blocked: "Impossible d’envoyer cette demande.",
  no_session: "Connecte-toi avec un vrai compte",
  error: "Une erreur est survenue",
  accepted: "Vous êtes connectés",
  declined: "Demande refusée",
  ignored: "Demande ignorée",
  already_handled: "Demande déjà traitée",
  expired: "Demande expirée",
};
