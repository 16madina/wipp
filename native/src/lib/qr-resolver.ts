/**
 * WippQRResolver : QR brut → type → validation → destination.
 * Types : PROFILE /@user, TEMP /t/..., GROUP /g/..., BUSINESS /b/...
 */
import { QR_HOST, profileQr } from "./qr-payload";
import { supabase } from "./supabase";
import { getPublicBusinessCard } from "./business-card";
import { findPublicByUsername } from "./public-profiles";
import { useWippStore } from "./store";
import { GROUP_FR, groupInviteCall, isServerToken, redeemTemp, type RemoteProfile } from "./qr-remote";

export type QrKind = "profile" | "temporary" | "group" | "business";

export type QrDestination =
  | { ok: true; kind: "remote-profile"; profile: RemoteProfile; connected: boolean; offer?: { token: string; minutes: number } }
  | { ok: true; kind: "remote-group"; token: string; name: string; members: number; member: boolean }
  | { ok: true; kind: "group"; token: string }
  | { ok: true; kind: "business"; publicId: string }
  | { ok: false; error: string };

export const QR_ERRORS = {
  notWipp: "Ce QR n'est pas un QR WIPP",
  expired: "QR expiré",
  used: "QR déjà utilisé",
  userMissing: "Utilisateur introuvable",
  groupMissing: "Groupe introuvable",
  shopMissing: "Carte introuvable",
  unverifiable: "Impossible de vérifier le QR",
} as const;

export const groupQr = (token: string) => `https://${QR_HOST}/g/${token}`;
export const businessQr = (handle: string) => `https://${QR_HOST}/b/${handle}`;
export { profileQr };

const HOSTS = new Set([QR_HOST, "wipp.me", "www.wippapp.com", "www.wipp.me"]);

function toHttps(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("/@") || s.startsWith("/t/") || s.startsWith("/g/") || s.startsWith("/b/")) {
    return `https://${QR_HOST}${s}`;
  }
  if (/^wipp:\/\//i.test(s)) {
    const rest = s.replace(/^wipp:\/\//i, "").replace(/^\/+/, "");
    if (rest.startsWith("@") || /^(t|g|b)\//.test(rest) || rest.startsWith("%40")) {
      return `https://${QR_HOST}/${decodeURIComponent(rest)}`;
    }
    try {
      const u = new URL(s.replace(/^wipp:/i, "https:"));
      return `https://${QR_HOST}${u.pathname}`;
    } catch {
      return null;
    }
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.replace(/^www\./, "");
    if (!HOSTS.has(u.hostname) && !HOSTS.has(host)) return null;
    return `https://${QR_HOST}${u.pathname}`;
  } catch {
    return null;
  }
}

export function identifyQr(raw: string): { kind: QrKind; value: string } | null {
  const href = toHttps(raw);
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const p = url.pathname;
  let m = /^\/@([a-z0-9._]{2,30})$/i.exec(p);
  if (m) return { kind: "profile", value: m[1]!.toLowerCase() };
  m = /^\/t\/([A-Za-z0-9_-]{16,64})$/.exec(p);
  if (m) return { kind: "temporary", value: m[1]! };
  m = /^\/g\/([A-Za-z0-9_-]{4,64})$/.exec(p);
  if (m) return { kind: "group", value: m[1]! };
  m = /^\/b\/([a-z0-9._-]{2,40})$/i.exec(p);
  if (m) return { kind: "business", value: m[1]!.toLowerCase() };
  return null;
}

export async function resolveWippQr(raw: string): Promise<QrDestination> {
  const id = identifyQr(raw);
  if (!id) return { ok: false, error: QR_ERRORS.notWipp };

  if (id.kind === "temporary") {
    if (!isServerToken(id.value)) return { ok: false, error: QR_ERRORS.unverifiable };
    try {
      const r = await redeemTemp(id.value);
      if (r.status === "ok" && r.profile) {
        // Ephemeral QR: an OFFER of an ephemeral connection the scanner must accept.
        return {
          ok: true,
          kind: "remote-profile",
          profile: r.profile,
          connected: Boolean(r.connected),
          offer: r.offer ? { token: id.value, minutes: r.offer.minutes } : undefined,
        };
      }
      if (r.status === "expired") return { ok: false, error: QR_ERRORS.expired };
      if (r.status === "used") return { ok: false, error: QR_ERRORS.used };
      if (r.status === "self") return { ok: false, error: "C'est ton propre QR" };
      if (r.status === "no_session") return { ok: false, error: "Connecte-toi avec un vrai compte" };
      return { ok: false, error: QR_ERRORS.unverifiable };
    } catch {
      return { ok: false, error: QR_ERRORS.unverifiable };
    }
  }

  if (id.kind === "profile") {
    const mine = (useWippStore.getState().serverUsername || "").toLowerCase();
    if (mine && mine === id.value) return { ok: false, error: "C'est ton propre QR" };
    try {
      const p = await findPublicByUsername(id.value);
      if (p) {
        const meId = useWippStore.getState().serverProfileId;
        if (meId && p.id === meId) return { ok: false, error: "C'est ton propre QR" };
        let connected = false;
        if (meId) {
          const a = [meId, p.id].sort();
          const { data: c } = await supabase
            .from("wipp_connections")
            .select("status, expires_at")
            .eq("user_a", a[0])
            .eq("user_b", a[1])
            .maybeSingle();
          const row = c as { status?: string; expires_at?: string | null } | null;
          connected = Boolean(row && row.status === "active" && (!row.expires_at || Date.parse(row.expires_at) > Date.now()));
        }
        return { ok: true, kind: "remote-profile", connected, profile: p };
      }
    } catch {
      /* missing */
    }
    return { ok: false, error: QR_ERRORS.userMissing };
  }

  if (id.kind === "group") {
    if (isServerToken(id.value)) {
      try {
        const { peekGroupInvite } = await import("./lot7/api");
        const peeked = await peekGroupInvite(id.value);
        if (peeked.status === "ok" || peeked.status === "already_member") {
          return {
            ok: true,
            kind: "remote-group",
            token: id.value,
            name: peeked.name ?? "",
            members: peeked.members ?? 0,
            member: peeked.status === "already_member",
          };
        }
        if (peeked.status && peeked.status !== "invalid") {
          return { ok: false, error: GROUP_FR[peeked.status] ?? QR_ERRORS.unverifiable };
        }
      } catch {
        /* older invite RPC below */
      }
      try {
        const r = await groupInviteCall(id.value, false);
        if (r.status === "ok" || r.status === "already_member") {
          return {
            ok: true,
            kind: "remote-group",
            token: id.value,
            name: r.name ?? "",
            members: r.members ?? 0,
            member: r.status === "already_member",
          };
        }
        return { ok: false, error: GROUP_FR[r.status] ?? QR_ERRORS.unverifiable };
      } catch {
        return { ok: false, error: QR_ERRORS.unverifiable };
      }
    }
    return { ok: true, kind: "group", token: id.value };
  }

  try {
    const card = await getPublicBusinessCard(id.value);
    if (card) return { ok: true, kind: "business", publicId: card.publicId };
  } catch {
    /* missing */
  }
  return { ok: false, error: QR_ERRORS.shopMissing };
}
