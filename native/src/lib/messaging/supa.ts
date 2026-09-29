import "../crypto-polyfill";
/**
 * Messaging data layer on Supabase (anon key + user JWT, RLS as the signed-in user).
 * Bodies are already E2E envelopes when they reach here; nothing is decrypted server-side.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { loadCachedProfileJson, saveCachedProfileJson } from "./identity";
import type { WippChatSummary, WippMessage, WippProfile } from "./types";
import { previewFromBody } from "../crypto";

const db = supabase as unknown as { from: (t: string) => any; rpc: (n: string) => any };
let profileMem: WippProfile | null = null;
const PROFILE_COLS = "id, username, display_name, avatar_url, bio, e2e_public_jwk, role";
const ms = (v: string | null | undefined) => (v ? Date.parse(v) : null);

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  e2e_public_jwk: JsonWebKey | null;
  role: string;
};

export function mapProfile(p: ProfileRow): WippProfile {
  return {
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    bio: p.bio ?? "",
    e2ePublicJwk: p.e2e_public_jwk,
    role: p.role === "admin" ? "admin" : "user",
  };
}

export function cachedProfile(): WippProfile | null {
  return profileMem;
}

export function setCachedProfile(p: WippProfile | null) {
  profileMem = p;
  void saveCachedProfileJson(p ? JSON.stringify(p) : null);
}

export async function hydrateCachedProfile() {
  if (profileMem) return profileMem;
  const raw = await loadCachedProfileJson();
  if (!raw) return null;
  try {
    profileMem = JSON.parse(raw) as WippProfile;
    return profileMem;
  } catch {
    return null;
  }
}

export async function loadMe(): Promise<WippProfile> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    setCachedProfile(null);
    throw new Error("Non connecté");
  }
  const { data: pid } = await db.rpc("wipp_my_profile_id");
  const { data, error } = await db.from("wipp_profiles").select(PROFILE_COLS).eq("id", pid ?? "").maybeSingle();
  if (error || !data) throw new Error("Profil introuvable");
  const p = mapProfile(data);
  setCachedProfile(p);
  return p;
}

async function meId() {
  return (cachedProfile() ?? (await loadMe())).id;
}

export async function publishKey(jwk: JsonWebKey) {
  const id = await meId();
  const { data, error } = await db
    .from("wipp_profiles")
    .update({ e2e_public_jwk: jwk })
    .eq("id", id)
    .select(PROFILE_COLS)
    .single();
  if (error) throw new Error(error.message);
  const p = mapProfile(data);
  setCachedProfile(p);
  return p;
}

export async function searchProfiles(q: string) {
  const clean = q.replace(/^@/, "").replace(/[%_(),]/g, "").trim();
  if (clean.length < 2) return [];
  const { data } = await db
    .from("wipp_public_profiles")
    .select(PROFILE_COLS)
    .or(`username.ilike.${clean},username.ilike.${clean}%,display_name.ilike.%${clean}%`)
    .limit(20);
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function listChats(): Promise<WippChatSummary[]> {
  const me = await meId();
  const { data: mine } = await db
    .from("wipp_chat_members")
    .select("chat_id, pinned_at, archived_at, muted_until, muted_forever, manually_unread_at")
    .eq("profile_id", me);
  const rows = (mine ?? []) as Array<Record<string, any>>;
  if (!rows.length) return [];
  const ids = rows.map((r) => r.chat_id!);
  const { data: others } = await db
    .from("wipp_chat_members")
    .select(`chat_id, wipp_profiles(${PROFILE_COLS})`)
    .in("chat_id", ids)
    .neq("profile_id", me);
  const { data: metas } = await db.from("wipp_chats").select("id, disappear_after_ms").in("id", ids);
  const disappear = new Map(
    ((metas ?? []) as { id: string; disappear_after_ms?: number | null }[]).map((c) => [c.id, c.disappear_after_ms ?? null]),
  );
  const out: WippChatSummary[] = [];
  for (const r of rows) {
    const peerRow = (others ?? []).find((o: any) => o.chat_id === r.chat_id)?.wipp_profiles;
    if (!peerRow) continue;
    const { data: last } = await db
      .from("wipp_messages")
      .select("body, created_at, deleted_at")
      .eq("chat_id", r.chat_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: unreadRows } = await db
      .from("wipp_messages")
      .select("id, wipp_receipts(profile_id, read_at)")
      .eq("chat_id", r.chat_id)
      .neq("sender_id", me)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(99);
    const unread = ((unreadRows ?? []) as any[]).filter(
      (m) => !(m.wipp_receipts ?? []).some((x: any) => x.profile_id === me && x.read_at),
    ).length;
    const muted = r.muted_until;
    out.push({
      id: r.chat_id!,
      peer: mapProfile(peerRow),
      preview: last ? (last.deleted_at ? "Message supprimé" : previewFromBody(last.body ?? "")) : "",
      lastAt: ms(last?.created_at) ?? 0,
      unread,
      pinnedAt: ms(r.pinned_at),
      archivedAt: ms(r.archived_at),
      mutedUntil: r.muted_forever ? "always" : muted && Date.parse(muted) > Date.now() ? ms(muted) : null,
      manuallyUnreadAt: ms(r.manually_unread_at),
      disappearAfterMs: disappear.get(r.chat_id!) ?? null,
    });
  }
  return out;
}

const MSG_COLS =
  "id, chat_id, sender_id, body, client_id, created_at, reply_to, edited_at, deleted_at, pinned_at, pinned_by, wipp_reactions(profile_id, emoji, created_at), wipp_receipts(profile_id, delivered_at, read_at)";

function mapMessage(r: any, me: string): WippMessage {
  const receipts = (r.wipp_receipts ?? []) as any[];
  const others = receipts.filter((x) => x.profile_id !== r.sender_id);
  const delivered = others.map((x) => x.delivered_at).find(Boolean);
  const read = others.map((x) => x.read_at).find(Boolean);
  void me;
  return {
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    body: r.deleted_at ? "" : r.body,
    clientId: r.client_id,
    createdAt: Date.parse(r.created_at),
    replyTo: r.reply_to,
    editedAt: ms(r.edited_at),
    deletedAt: ms(r.deleted_at),
    pinnedAt: ms(r.pinned_at),
    pinnedBy: r.pinned_by,
    deliveredAt: ms(delivered),
    readAt: ms(read),
    reactions: (r.wipp_reactions ?? []).map((x: any) => ({
      profileId: x.profile_id,
      emoji: x.emoji,
      createdAt: Date.parse(x.created_at),
    })),
  };
}

export async function listMessages(chatId: string, before?: number): Promise<WippMessage[]> {
  const me = await meId();
  let q = db.from("wipp_messages").select(MSG_COLS).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(80);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  const [{ data, error }, { data: hides }] = await Promise.all([
    q,
    db.from("wipp_message_hides").select("message_id").eq("profile_id", me),
  ]);
  if (error) throw new Error(error.message);
  const hideSet = new Set(((hides ?? []) as { message_id: string }[]).map((h) => h.message_id));
  const visible = ((data ?? []) as any[]).filter((r) => !hideSet.has(r.id));
  const list = visible.map((r) => mapMessage(r, me)).sort((a, b) => a.createdAt - b.createdAt);
  const undelivered = visible
    .filter(
      (r: any) =>
        r.sender_id !== me &&
        !r.deleted_at &&
        !(r.wipp_receipts ?? []).some((x: any) => x.profile_id === me && x.delivered_at),
    )
    .map((r: any) => r.id);
  if (undelivered.length) void upsertReceipts(undelivered, "delivered");
  return list;
}

async function one(id: string) {
  const me = await meId();
  const { data, error } = await db.from("wipp_messages").select(MSG_COLS).eq("id", id).single();
  if (error) throw new Error(error.message);
  return mapMessage(data, me);
}

export async function insertMessage(chatId: string, body: string, clientId: string, replyTo?: string | null) {
  const me = await meId();
  const { data: existing } = await db.from("wipp_messages").select("id").eq("client_id", clientId).maybeSingle();
  if (existing) return one(existing.id);
  const id = `m_${crypto.randomUUID()}`;
  const { error } = await db.from("wipp_messages").insert({
    id,
    chat_id: chatId,
    sender_id: me,
    body,
    client_id: clientId,
    reply_to: replyTo ?? null,
    created_at: new Date().toISOString(),
  });
  if (error) {
    const { data: dup } = await db.from("wipp_messages").select("id").eq("client_id", clientId).maybeSingle();
    if (dup) return one(dup.id);
    throw new Error(error.message);
  }
  return one(id);
}

export async function updateMessage(id: string, patch: Record<string, unknown>) {
  const { error } = await db.from("wipp_messages").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return one(id);
}

export async function hideMessage(id: string) {
  const me = await meId();
  const { error } = await db
    .from("wipp_message_hides")
    .upsert({ message_id: id, profile_id: me, hidden_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function toggleReaction(id: string, emoji: string) {
  const me = await meId();
  const { data: cur } = await db.from("wipp_reactions").select("emoji").eq("message_id", id).eq("profile_id", me).maybeSingle();
  if (cur?.emoji === emoji) {
    await db.from("wipp_reactions").delete().eq("message_id", id).eq("profile_id", me);
  } else {
    const { error } = await db
      .from("wipp_reactions")
      .upsert({ message_id: id, profile_id: me, emoji, created_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  return one(id);
}

export async function upsertReceipts(ids: string[], kind: "delivered" | "read") {
  if (!ids.length) return;
  const me = await meId();
  const now = new Date().toISOString();
  const rows = ids.map((message_id) =>
    kind === "read"
      ? { message_id, profile_id: me, delivered_at: now, read_at: now }
      : { message_id, profile_id: me, delivered_at: now },
  );
  if (kind === "delivered") {
    await db.from("wipp_receipts").upsert(rows, { ignoreDuplicates: true });
  } else {
    await db.from("wipp_receipts").upsert(rows);
  }
}

export async function updatePrefs(
  chatId: string,
  patch: { pinned?: boolean; archived?: boolean; mute?: string; manuallyUnread?: boolean },
) {
  const me = await meId();
  const now = Date.now();
  const row: Record<string, string | boolean | null> = {};
  if (patch.pinned !== undefined) row.pinned_at = patch.pinned ? new Date().toISOString() : null;
  if (patch.archived !== undefined) row.archived_at = patch.archived ? new Date().toISOString() : null;
  if (patch.manuallyUnread !== undefined) row.manually_unread_at = patch.manuallyUnread ? new Date().toISOString() : null;
  if (patch.mute !== undefined) {
    const add = { "1h": 36e5, "8h": 288e5, "1w": 6048e5 } as Record<string, number>;
    row.muted_forever = patch.mute === "always";
    row.muted_until =
      patch.mute === "off" || patch.mute === "always" ? null : new Date(now + (add[patch.mute] ?? 0)).toISOString();
  }
  await db.from("wipp_chat_members").update(row).eq("chat_id", chatId).eq("profile_id", me);
}

export type LiveKind = "message" | "edit" | "delete" | "reaction" | "pin" | "receipt" | "typing";
export type LiveEvt = { id: string; chatId: string; kind: LiveKind; at: number; payload: Record<string, unknown> };

const rooms = new Map<string, RealtimeChannel>();

export function joinRoom(chatId: string, onTyping?: (e: LiveEvt) => void) {
  const existing = rooms.get(chatId);
  if (existing && !onTyping) return existing;
  if (existing) void supabase.removeChannel(existing);
  const me = cachedProfile();
  const ch = supabase.channel(`wipp-room:${chatId}`, {
    config: { broadcast: { self: false }, presence: { key: me?.id ?? "anon" } },
  });
  ch.on("broadcast", { event: "typing" }, ({ payload }) =>
    onTyping?.({ id: `t_${Date.now()}`, chatId, kind: "typing", at: Date.now(), payload }),
  );
  ch.subscribe();
  rooms.set(chatId, ch);
  return ch;
}

export function leaveRoom(chatId: string) {
  const ch = rooms.get(chatId);
  if (ch) void supabase.removeChannel(ch);
  rooms.delete(chatId);
}

export function sendTyping(chatId: string, active: boolean) {
  const ch = rooms.get(chatId) ?? joinRoom(chatId);
  void ch.send({ type: "broadcast", event: "typing", payload: { profileId: cachedProfile()?.id, active } });
}

export function setFocus(chatId: string, active: boolean) {
  const ch = rooms.get(chatId) ?? joinRoom(chatId);
  if (active) void ch.track({ at: Date.now() });
  else void ch.untrack();
}

export function subscribeChanges(onEvent: (e: LiveEvt) => void) {
  const ch = supabase.channel(`wipp-changes:${crypto.randomUUID()}`);
  const emit = (chatId: string, kind: LiveKind, payload: Record<string, unknown>) =>
    onEvent({ id: `ev_${Date.now()}`, chatId, kind, at: Date.now(), payload });
  ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "wipp_messages" }, (p: any) =>
    emit(p.new.chat_id, "message", { id: p.new.id }),
  );
  ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "wipp_messages" }, (p: any) => {
    const n = p.new;
    const kind: LiveKind = n.deleted_at ? "delete" : n.edited_at && p.old?.edited_at !== n.edited_at ? "edit" : "pin";
    emit(n.chat_id, kind, { id: n.id });
  });
  const byMessage = async (messageId: string, kind: LiveKind) => {
    const { data } = await db.from("wipp_messages").select("chat_id").eq("id", messageId).maybeSingle();
    if (data) emit(data.chat_id, kind, { id: messageId });
  };
  ch.on("postgres_changes", { event: "*", schema: "public", table: "wipp_reactions" }, (p: any) =>
    void byMessage((p.new?.message_id ?? p.old?.message_id) as string, "reaction"),
  );
  ch.on("postgres_changes", { event: "*", schema: "public", table: "wipp_receipts" }, (p: any) =>
    void byMessage((p.new?.message_id ?? p.old?.message_id) as string, "receipt"),
  );
  const resubscribe = () => {
    ch.subscribe((status) => {
      if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setTimeout(resubscribe, 2500);
      }
    });
  };
  resubscribe();
  return () => void supabase.removeChannel(ch);
}
