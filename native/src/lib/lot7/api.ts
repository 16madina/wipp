import { supabase } from "../supabase";
import type { Listing, LifestyleItem, StoryItem } from "../types";
import { groupPreview } from "./rules";

function rawId(id: string) {
  return id.startsWith("srvuser:") ? id.slice("srvuser:".length) : id;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function createServerGroup(name: string, memberIds: string[]) {
  return rpc<string>("wipp_lot7_create_group", {
    p_name: name.trim(),
    p_members: memberIds.map(rawId),
  });
}

export async function addGroupMember(chatId: string, memberId: string) {
  return rpc<string>("wipp_lot7_add_member", { p_chat: chatId, p_member: rawId(memberId) });
}

export async function removeGroupMember(chatId: string, memberId: string) {
  return rpc<string>("wipp_lot7_remove_member", { p_chat: chatId, p_member: rawId(memberId) });
}

export async function setGroupAdmin(chatId: string, memberId: string, on: boolean) {
  return rpc<string>("wipp_lot7_set_admin", { p_chat: chatId, p_member: rawId(memberId), p_on: on });
}

export async function banGroupMember(chatId: string, memberId: string) {
  return rpc<string>("wipp_lot7_ban", { p_chat: chatId, p_member: rawId(memberId) });
}

export async function leaveServerGroup(chatId: string) {
  return rpc<string>("wipp_lot7_leave", { p_chat: chatId });
}

export async function renameServerGroup(chatId: string, name: string) {
  return rpc<string>("wipp_lot7_rename", { p_chat: chatId, p_name: name });
}

export async function postGroupMessage(input: {
  chatId: string;
  body: string;
  clientId: string;
  replyTo?: string | null;
  mentions?: string[];
}) {
  const id = await rpc<string>("wipp_lot7_post", {
    p_chat: input.chatId,
    p_body: input.body,
    p_client: input.clientId,
    p_reply: input.replyTo ?? null,
    p_mentions: (input.mentions ?? []).map(rawId),
  });
  try {
    const { wippApi } = await import("../proximity/wipp-session");
    await wippApi(`chats/${input.chatId}/notify`, {
      method: "POST",
      body: JSON.stringify({ messageId: id, vault: false }),
    });
  } catch {
    /* notify REST is best-effort; Realtime remains the live path */
  }
  return id;
}

export async function createGroupInvite(chatId: string, token: string) {
  return rpc<string>("wipp_lot7_invite", { p_chat: chatId, p_token: token });
}

export async function peekGroupInvite(token: string) {
  return rpc<{ status: string; chat_id?: string; name?: string; members?: number }>("wipp_lot7_peek", {
    p_token: token,
  });
}

export async function joinGroupInvite(token: string) {
  return rpc<{ status: string; chat_id?: string; name?: string; members?: number }>("wipp_lot7_join", {
    p_token: token,
  });
}

export function mentionIdsInText(text: string, members: { id: string; username?: string }[]) {
  const hits = new Set<string>();
  const re = /@([a-z0-9_]{2,32})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1].toLowerCase();
    const user = members.find((u) => u.username?.toLowerCase() === name);
    if (user) hits.add(rawId(user.id));
  }
  return [...hits];
}

type StoryRow = {
  id: string;
  author_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  kind: "text" | "image" | "video";
  body?: string | null;
  media_url?: string | null;
  audience: "contacts" | "only_me" | "close";
  created_at: string;
  expires_at: string;
  views?: number;
};

function mapStory(row: StoryRow, me: string | null): StoryItem {
  const createdAt = Date.parse(row.created_at);
  const expiresAt = Date.parse(row.expires_at);
  return {
    id: row.id,
    userId: me && row.author_id === me ? "me" : `srvuser:${row.author_id}`,
    type: row.kind,
    text: row.body ?? "",
    imageUrl: row.kind === "image" ? row.media_url ?? undefined : undefined,
    videoUrl: row.kind === "video" ? row.media_url ?? undefined : undefined,
    createdAt,
    expiresAt,
    ttlMs: Math.max(0, expiresAt - createdAt),
    viewers: [],
    audience: row.audience === "only_me" ? "me" : row.audience === "close" ? "close" : "contacts",
  };
}

export async function publishStory(input: {
  kind: "text" | "image" | "video";
  body?: string;
  mediaUrl?: string | null;
  audience: "contacts" | "only_me" | "close";
}) {
  return rpc<string>("wipp_lot7_publish_story", {
    p_kind: input.kind,
    p_body: input.body ?? "",
    p_media: input.mediaUrl ?? null,
    p_audience: input.audience,
  });
}

export async function fetchStories(me: string | null) {
  const rows = await rpc<StoryRow[]>("wipp_lot7_stories");
  return (rows ?? []).map((row) => mapStory(row, me));
}

export async function markStoryView(id: string) {
  return rpc<string>("wipp_lot7_view_story", { p_id: id });
}

export async function fetchStoryViewers(id: string) {
  return rpc<{ viewer_id: string; username: string; display_name: string; viewed_at: string }[]>("wipp_lot7_story_viewers", {
    p_id: id,
  });
}

export async function deleteServerStory(id: string) {
  return rpc<string>("wipp_lot7_delete_story", { p_id: id });
}

type ListingRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  price_label?: string | null;
  city: string;
  photo_url?: string | null;
  created_at: string;
  username?: string;
  display_name?: string;
};

const CATS = new Set(["auto", "home", "goods", "jobs", "services"]);

function mapListing(row: ListingRow, me: string | null): Listing {
  const cat = CATS.has(row.category) ? (row.category as Listing["category"]) : "goods";
  return {
    id: row.id,
    title: row.title,
    price: row.price_label || "",
    city: row.city,
    distance: "",
    sellerId: me && row.owner_id === me ? "me" : `srvuser:${row.owner_id}`,
    category: cat,
    image: row.photo_url || "",
    description: row.description,
    createdAt: Date.parse(row.created_at),
  };
}

export async function fetchListings(me: string | null, q = "") {
  const rows = await rpc<ListingRow[]>("wipp_lot7_listings", { p_q: q });
  return (rows ?? []).map((row) => mapListing(row, me));
}

export async function saveListing(input: {
  id?: string;
  title: string;
  description: string;
  category: string;
  price: string;
  city: string;
  photo?: string | null;
}) {
  return rpc<string>("wipp_lot7_save_listing", {
    p_title: input.title,
    p_desc: input.description,
    p_cat: input.category,
    p_price: input.price,
    p_city: input.city,
    p_photo: input.photo ?? null,
    p_id: input.id ?? "",
  });
}

export async function removeListing(id: string) {
  return rpc<string>("wipp_lot7_remove_listing", { p_id: id });
}

type EventRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  city: string;
  place: string;
  starts_at?: string | null;
  photo_url?: string | null;
  contact?: string | null;
};

function mapEvent(row: EventRow, me: string | null): LifestyleItem {
  return {
    id: row.id,
    kind: "event",
    title: row.title,
    when: row.starts_at ? new Date(row.starts_at).toLocaleString() : "",
    place: row.place,
    city: row.city,
    lat: 0,
    lng: 0,
    hostId: me && row.owner_id === me ? "me" : `srvuser:${row.owner_id}`,
    image: row.photo_url || "",
    note: row.contact ? `${row.description}\n${row.contact}` : row.description,
    paid: false,
  };
}

export async function fetchEvents(me: string | null, q = "") {
  const rows = await rpc<EventRow[]>("wipp_lot7_events", { p_q: q });
  return (rows ?? []).map((row) => mapEvent(row, me));
}

export async function saveEvent(input: {
  id?: string;
  title: string;
  description: string;
  city: string;
  place: string;
  starts: string;
  photo?: string | null;
  contact?: string;
}) {
  return rpc<string>("wipp_lot7_save_event", {
    p_title: input.title,
    p_desc: input.description,
    p_city: input.city,
    p_place: input.place,
    p_starts: input.starts,
    p_photo: input.photo ?? null,
    p_contact: input.contact ?? "",
    p_id: input.id ?? "",
  });
}

export async function removeEvent(id: string) {
  return rpc<string>("wipp_lot7_remove_event", { p_id: id });
}

export type SaveRef = { kind: "listing" | "event" | "business"; id: string };

export async function fetchSaves(): Promise<SaveRef[]> {
  const { data, error } = await supabase.from("wipp_saves").select("kind,target_id");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { kind: SaveRef["kind"]; target_id: string }[]).map((row) => ({
    kind: row.kind,
    id: row.target_id,
  }));
}

export async function toggleSave(kind: SaveRef["kind"], id: string, on: boolean) {
  const { data: me, error: meErr } = await supabase.rpc("wipp_my_profile_id");
  if (meErr || !me) throw new Error(meErr?.message || "no_session");
  if (!on) {
    const { error } = await supabase.from("wipp_saves").delete().eq("kind", kind).eq("target_id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("wipp_saves").upsert({
    profile_id: me as string,
    kind,
    target_id: id,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function uploadBucket(bucket: "wipp-public-media" | "wipp-private-media", path: string, bytes: Uint8Array, mime: string) {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message || "signed-url");
  return signed.data.signedUrl;
}

export function uploadPublicMedia(path: string, bytes: Uint8Array, mime: string) {
  return uploadBucket("wipp-public-media", path, bytes, mime);
}

export function uploadPrivateMedia(path: string, bytes: Uint8Array, mime: string) {
  return uploadBucket("wipp-private-media", path, bytes, mime);
}

export async function setCloseFriend(profileId: string, on: boolean) {
  const raw = profileId.startsWith("srvuser:") ? profileId.slice("srvuser:".length) : profileId;
  return rpc<string>("wipp_lot15_set_close", { p_friend: raw, p_on: on });
}

export async function fetchCloseFriends() {
  return rpc<{ id: string; username: string; display_name: string; avatar_url: string | null }[]>("wipp_lot15_close_friends");
}

export async function fetchServices(q = "") {
  return rpc<
    { id: string; category: string; name: string; country: string; city: string; address: string; phone: string; hours: string; source: string }[]
  >("wipp_lot15_services", { p_q: q });
}

export { groupPreview };
