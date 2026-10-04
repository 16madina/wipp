import { uploadFileToStorage } from "../upload-file";
import { SUPABASE_URL } from "../firebase-config";
import { firebaseIdToken } from "../firebase-phone";
import { parseStoryOverlay, type StoryOverlay } from "../story-overlay";
import { supabase } from "../supabase";
import type { Listing, LifestyleItem, StoryItem, User } from "../types";
import { groupPreview } from "./rules";

function rawId(id: string) {
  return id.startsWith("srvuser:") ? id.slice("srvuser:".length) : id;
}

/** Session cache only. The server row in wipp_story_views stays the source of truth after migration 0020. */
const sessionViewedStoryIds = new Set<string>();

export function rememberViewedStory(id: string) {
  sessionViewedStoryIds.add(id);
}

export function forgetViewedStory(id: string) {
  sessionViewedStoryIds.delete(id);
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
  overlay?: unknown;
  media_url?: string | null;
  audience: "contacts" | "only_me" | "close";
  created_at: string;
  expires_at: string;
  views?: number;
  viewed?: boolean;
};

function mapStory(row: StoryRow, me: string | null, mineUsername: string | null): StoryItem {
  const createdAt = Date.parse(row.created_at);
  const expiresAt = Date.parse(row.expires_at);
  const sameProfile = Boolean(me && row.author_id === me);
  const sameUsername = Boolean(
    mineUsername && row.username && row.username.toLowerCase() === mineUsername.toLowerCase(),
  );
  return {
    id: row.id,
    userId: sameProfile || sameUsername ? "me" : `srvuser:${row.author_id}`,
    type: row.kind,
    text: row.body ?? "",
    overlay: parseStoryOverlay(row.overlay) ?? undefined,
    mediaPath: row.media_url && !row.media_url.startsWith("http") ? row.media_url : undefined,
    imageUrl: row.kind === "image" && row.media_url?.startsWith("http") ? row.media_url : undefined,
    videoUrl: row.kind === "video" && row.media_url?.startsWith("http") ? row.media_url : undefined,
    createdAt,
    expiresAt,
    ttlMs: Math.max(0, expiresAt - createdAt),
    viewers: [],
    viewCount: typeof row.views === "number" ? row.views : undefined,
    viewed: row.viewed === true,
    audience: row.audience === "only_me" ? "me" : row.audience === "close" ? "close" : "contacts",
  };
}

async function storyIdentity(meHint: string | null) {
  let me = meHint;
  try {
    const resolved = await myProfileId();
    if (resolved) me = resolved;
  } catch {
    /* The story RPC uses this same resolver. Keep the hint if it is unavailable. */
  }
  const { useWippStore } = await import("../store");
  const state = useWippStore.getState();
  if (me && state.serverProfileId !== me) useWippStore.setState({ serverProfileId: me });
  return { me, username: state.me.username || state.serverUsername || null, users: state.users };
}

function rememberStoryAuthors(rows: StoryRow[], me: string | null, users: Record<string, User>) {
  const next: Record<string, User> = { ...users };
  let changed = false;
  for (const row of rows) {
    if (me && row.author_id === me) continue;
    const id = `srvuser:${row.author_id}`;
    const name = row.display_name || row.username || "";
    if (!name || next[id]?.displayName) continue;
    const [firstName, ...rest] = name.split(" ");
    next[id] = {
      id,
      firstName: firstName || name,
      lastName: rest.join(" "),
      displayName: name,
      username: row.username || "",
      bio: "",
      avatar: row.avatar_url || "",
      online: false,
      connected: true,
      city: "",
    };
    changed = true;
  }
  if (!changed) return;
  void import("../store").then(({ useWippStore }) => useWippStore.setState({ users: next as never }));
}

export async function publishStory(input: {
  kind: "text" | "image" | "video";
  body?: string;
  mediaUrl?: string | null;
  audience: "contacts" | "only_me" | "close";
  overlay?: StoryOverlay | null;
}) {
  const args = {
    p_kind: input.kind,
    p_body: input.body ?? "",
    p_media: input.mediaUrl ?? null,
    p_audience: input.audience,
  };
  if (!input.overlay) return rpc<string>("wipp_lot7_publish_story", args);
  return rpc<string>("wipp_lot7_publish_story", { ...args, p_overlay: input.overlay });
}

export async function fetchStories(meHint: string | null) {
  const rows = await rpc<StoryRow[]>("wipp_lot7_stories");
  const identity = await storyIdentity(meHint);
  const { useWippStore } = await import("../store");
  const already = new Set(useWippStore.getState().stories.filter((story) => story.viewed).map((story) => story.id));
  rememberStoryAuthors(rows ?? [], identity.me, identity.users);
  return Promise.all(
    (rows ?? []).map(async (row) => {
      const story = mapStory(row, identity.me, identity.username);
      if (typeof row.viewed !== "boolean" && (already.has(row.id) || sessionViewedStoryIds.has(row.id))) story.viewed = true;
      if (!story.mediaPath) return story;
      try {
        return await hydrateStoryMedia(story, true);
      } catch {
        return story;
      }
    }),
  );
}

let storiesRequested = 0;
let storiesApplied = 0;

/**
 * Reload stories into the store. Two reloads can overlap (publish + inbox sync);
 * an older answer that lands last must not overwrite a newer list.
 */
export async function refreshStoriesInStore(meHint: string | null) {
  const seq = ++storiesRequested;
  const stories = await fetchStories(meHint);
  if (seq < storiesApplied) return null;
  storiesApplied = seq;
  const { useWippStore } = await import("../store");
  useWippStore.setState({ stories });
  return stories;
}

export async function markStoryView(id: string) {
  return rpc<string>("wipp_lot7_view_story", { p_id: id });
}

export async function fetchStoryViewers(id: string) {
  const data = await rpc<unknown>("wipp_lot7_story_viewers", { p_id: id });
  const rows = typeof data === "string" ? JSON.parse(data) : data;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as { username?: string; display_name?: string; viewed_at?: string };
    return [{
      username: item.username ?? "",
      displayName: item.display_name || item.username || "WIPP",
      viewedAt: item.viewed_at ?? "",
    }];
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
  country?: string | null;
  area?: string | null;
  contact_phone?: string | null;
  negotiable?: boolean | null;
  currency?: string | null;
  condition?: string | null;
  photo_urls?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  boosted?: boolean | null;
  publish_at?: string | null;
  views?: number | null;
};

const CATS = new Set(["auto", "realty", "electronics", "fashion", "home", "jobs", "leisure", "goods", "services"]);
const CONDITIONS = new Set(["new", "like_new", "good", "used"]);
const ETAT = /^\[\[etat:(new|like-new|like_new|good|used)\]\]\n?/;

export function listingPhotoPaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { paths?: unknown };
      if (Array.isArray(parsed.paths)) return parsed.paths.filter((item): item is string => typeof item === "string" && item.length > 0);
    } catch {
      /* a plain path or URL */
    }
  }
  return [raw];
}

export function encodeListingPhotos(paths: string[]): string | null {
  const clean = paths.filter(Boolean);
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify({ paths: clean });
}

function storedCondition(value: string | null | undefined): Listing["condition"] | undefined {
  const raw = (value ?? "").trim().toLowerCase().replace("like-new", "like_new");
  return CONDITIONS.has(raw) ? (raw as Listing["condition"]) : undefined;
}

function splitListingCopy(description: string) {
  const match = description.match(ETAT);
  return {
    condition: storedCondition(match?.[1]),
    description: description.replace(ETAT, ""),
  };
}

function listingPaths(row: ListingRow) {
  const stored = Array.isArray(row.photo_urls) ? row.photo_urls.filter((item) => typeof item === "string" && item.length > 0) : [];
  if (stored.length === 1 && stored[0].startsWith("{")) return listingPhotoPaths(stored[0]);
  if (stored.length) return stored;
  return listingPhotoPaths(row.photo_url);
}

async function presentStoredMedia(paths: string[]) {
  const shown: string[] = [];
  for (const path of paths) {
    if (!path) continue;
    if (path.startsWith("http")) {
      shown.push(path);
      continue;
    }
    try {
      shown.push(await signPublicMedia(path));
    } catch (err) {
      console.warn("[wipp] listing/event image unresolved", err instanceof Error ? err.message : "unknown");
      shown.push("");
    }
  }
  return shown;
}

function mapListing(row: ListingRow, me: string | null, shown: string[]): Listing {
  const cat = CATS.has(row.category) ? (row.category as Listing["category"]) : "goods";
  const copy = splitListingCopy(row.description);
  const paths = listingPaths(row);
  const label = row.price_label || "";
  const legacyNegotiable = /négociable/i.test(label);
  return {
    id: row.id,
    title: row.title,
    price: label,
    city: row.city,
    distance: "",
    sellerId: me && row.owner_id === me ? "me" : `srvuser:${row.owner_id}`,
    category: cat,
    image: shown[0] || "",
    photos: shown.filter(Boolean),
    photoPaths: paths,
    description: copy.description,
    condition: storedCondition(row.condition) ?? copy.condition,
    country: row.country ?? "",
    area: row.area ?? "",
    contactPhone: row.contact_phone ?? "",
    negotiable: Boolean(row.negotiable) || legacyNegotiable,
    currency: row.currency || "",
    createdAt: Date.parse(row.created_at),
    lat: typeof row.lat === "number" ? row.lat : undefined,
    lng: typeof row.lng === "number" ? row.lng : undefined,
    boosted: Boolean(row.boosted),
    publishAt: row.publish_at ? Date.parse(row.publish_at) : undefined,
    views: row.views ?? 0,
  };
}

export async function fetchListings(me: string | null, q = "") {
  const rows = await rpc<ListingRow[]>("wipp_lot7_listings", { p_q: q });
  return Promise.all(
    (rows ?? []).map(async (row) => mapListing(row, me, await presentStoredMedia(listingPaths(row)))),
  );
}

export async function saveListing(input: {
  id?: string;
  title: string;
  description: string;
  category: string;
  price: string;
  city: string;
  photo?: string | null;
  country?: string;
  area?: string;
  phone?: string;
  negotiable?: boolean;
  currency?: string;
  condition?: string;
  photos?: string[] | null;
}) {
  return rpc<string>("wipp_lot7_save_listing", {
    p_title: input.title,
    p_desc: input.description,
    p_cat: input.category,
    p_price: input.price,
    p_city: input.city,
    p_photo: input.photo ?? null,
    p_id: input.id ?? "",
    p_country: input.country ?? "",
    p_area: input.area ?? "",
    p_phone: input.phone ?? "",
    p_negotiable: input.negotiable ?? false,
    p_currency: input.currency ?? "",
    p_condition: input.condition ?? "",
    p_photos: input.photos ?? null,
  });
}

/** Counts one view per person (never the owner). */
export async function viewListing(id: string) {
  try {
    await rpc<null>("wipp_lot7_view_listing", { p_id: id });
  } catch {
    /* a missed view is harmless */
  }
}

export type ListingStats = {
  views: number;
  memberSince: number | null;
  sellerListings: number;
  rating: number | null;
  ratingCount: number;
  myRating: number | null;
};

export async function listingStats(id: string): Promise<ListingStats | null> {
  const raw = await rpc<Record<string, unknown> | null>("wipp_lot7_listing_stats", { p_id: id });
  if (!raw) return null;
  return {
    views: Number(raw.views ?? 0),
    memberSince: raw.member_since ? Date.parse(String(raw.member_since)) : null,
    sellerListings: Number(raw.seller_listings ?? 0),
    rating: raw.rating == null ? null : Number(raw.rating),
    ratingCount: Number(raw.rating_count ?? 0),
    myRating: raw.my_rating == null ? null : Number(raw.my_rating),
  };
}

export async function rateSeller(sellerProfileId: string, stars: number) {
  return rpc<null>("wipp_lot7_rate_seller", { p_seller: sellerProfileId.replace(/^srvuser:/, ""), p_stars: stars });
}

/** Position, "mettre en avant" (7 days, one listing at a time) and scheduled publication. */
export async function saveListingExtras(id: string, extras: { lat?: number | null; lng?: number | null; boost: boolean; publishAt?: Date | null }) {
  return rpc<null>("wipp_lot7_listing_extras", {
    p_id: id,
    p_lat: extras.lat ?? null,
    p_lng: extras.lng ?? null,
    p_boost: extras.boost,
    p_publish_at: extras.publishAt ? extras.publishAt.toISOString() : null,
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
  username?: string | null;
  display_name?: string | null;
  ends_at?: string | null;
  category?: string | null;
  country?: string | null;
  address?: string | null;
  is_online?: boolean | null;
  online_url?: string | null;
  is_free?: boolean | null;
  price?: string | null;
  currency?: string | null;
  lat?: number | null;
  lng?: number | null;
  capacity?: number | null;
  adult_only?: boolean | null;
  interested_count?: number | null;
  interested_me?: boolean | null;
  interested_avatars?: string[] | null;
};

const EVENT_CAT = /^Catégorie : (.+)\n/;
const EVENT_END = /^Fin : (.+)\n/;

export function splitEventCopy(description: string) {
  let rest = description;
  let category = "";
  let endsAt = "";
  const cat = rest.match(EVENT_CAT);
  if (cat) {
    category = cat[1]?.trim() ?? "";
    rest = rest.slice(cat[0].length);
  }
  const end = rest.match(EVENT_END);
  if (end) {
    endsAt = end[1]?.trim() ?? "";
    rest = rest.slice(end[0].length);
  }
  return { category, endsAt, description: rest.replace(/^\n/, "") };
}

export function packEventCopy(description: string, category: string, endsAt: string) {
  const head = [
    category.trim() ? `Catégorie : ${category.trim()}` : "",
    endsAt.trim() ? `Fin : ${endsAt.trim()}` : "",
  ].filter(Boolean);
  const body = description.trim();
  return head.length ? `${head.join("\n")}\n${body}` : body;
}

function mapEvent(row: EventRow, me: string | null, image: string): LifestyleItem {
  const copy = splitEventCopy(row.description);
  const contact = row.contact ?? "";
  const category = (row.category ?? "").trim() || copy.category;
  const endsAt = row.ends_at || copy.endsAt;
  const isOnline = Boolean(row.is_online) || row.place === "En ligne";
  const onlineUrl = (row.online_url ?? "").trim() || (isOnline && /^https?:/i.test(contact) ? contact : "");
  const free = typeof row.is_free === "boolean" ? row.is_free : !row.price;
  const price = free ? "" : (row.price ?? "");
  const currency = free ? "" : (row.currency ?? "");
  return {
    id: row.id,
    kind: "event",
    title: row.title,
    when: row.starts_at ? new Date(row.starts_at).toLocaleString() : "",
    place: row.place,
    city: row.city,
    lat: typeof row.lat === "number" ? row.lat : 0,
    lng: typeof row.lng === "number" ? row.lng : 0,
    capacity: row.capacity ?? undefined,
    adultOnly: Boolean(row.adult_only),
    interestedCount: row.interested_count ?? 0,
    interestedMe: Boolean(row.interested_me),
    interestedAvatars: row.interested_avatars ?? [],
    hostId: me && row.owner_id === me ? "me" : `srvuser:${row.owner_id}`,
    hostName: row.display_name || row.username || "",
    image,
    coverPath: row.photo_url || "",
    note: [
      category ? `Catégorie : ${category}` : "",
      endsAt ? `Fin : ${Number.isNaN(Date.parse(endsAt)) ? endsAt : new Date(endsAt).toLocaleString()}` : "",
      copy.description,
      contact,
    ].filter(Boolean).join("\n"),
    details: copy.description,
    contact,
    startsAt: row.starts_at ?? "",
    endsAt,
    paid: free,
    price,
    category,
    country: row.country ?? "",
    address: row.address ?? "",
    isOnline,
    onlineUrl,
    isFree: free,
    currency,
  };
}

export async function toggleInterest(eventId: string, on: boolean) {
  return rpc<null>("wipp_lot7_toggle_interest", { p_id: eventId, p_on: on });
}

export async function saveEventExtras(id: string, extras: { lat?: number | null; lng?: number | null; capacity?: number | null; adult: boolean }) {
  return rpc<null>("wipp_lot7_event_extras", {
    p_id: id,
    p_lat: extras.lat ?? null,
    p_lng: extras.lng ?? null,
    p_capacity: extras.capacity ?? null,
    p_adult: extras.adult,
  });
}

export async function saveCardPosition(lat: number, lng: number) {
  return rpc<null>("wipp_lot7_card_position", { p_lat: lat, p_lng: lng });
}

export async function fetchEvents(me: string | null, q = "") {
  const rows = await rpc<EventRow[]>("wipp_lot7_events", { p_q: q });
  return Promise.all(
    (rows ?? []).map(async (row) => {
      const shown = await presentStoredMedia(row.photo_url ? [row.photo_url] : []);
      return mapEvent(row, me, shown[0] || "");
    }),
  );
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
  ends?: string;
  category?: string;
  country?: string;
  address?: string;
  online?: boolean;
  url?: string;
  free?: boolean;
  price?: string;
  currency?: string;
}) {
  const free = input.free !== false;
  return rpc<string>("wipp_lot7_save_event", {
    p_title: input.title,
    p_desc: input.description,
    p_city: input.city,
    p_place: input.place,
    p_starts: input.starts,
    p_photo: input.photo ?? null,
    p_contact: input.contact ?? "",
    p_id: input.id ?? "",
    p_ends: input.ends ?? "",
    p_category: input.category ?? "",
    p_country: input.country ?? "",
    p_address: input.address ?? "",
    p_online: input.online ?? false,
    p_url: input.url ?? "",
    p_free: free,
    p_price: free ? "" : (input.price ?? ""),
    p_currency: free ? "" : (input.currency ?? ""),
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
  return path;
}

export async function signPrivateMedia(path: string) {
  const signed = await supabase.storage.from("wipp-private-media").createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message || "signed-url");
  return signed.data.signedUrl;
}

const STORY_SIGN_FRESH_MS = 8 * 60 * 1000;

async function signStoryMedia(path: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await signPrivateMedia(path);
    } catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("signed-url");
}

/** Regenerates the authorized URL from the stored private path. Does not publish the bucket. */
export async function hydrateStoryMedia(story: StoryItem, force = false) {
  if (!story.mediaPath) return story;
  const current = story.type === "video" ? story.videoUrl : story.imageUrl;
  const fresh = typeof story.mediaSignedAt === "number" && Date.now() - story.mediaSignedAt < STORY_SIGN_FRESH_MS;
  if (!force && fresh && current?.startsWith("http")) return story;
  const url = await signStoryMedia(story.mediaPath);
  return {
    ...story,
    mediaSignedAt: Date.now(),
    imageUrl: story.type === "image" ? url : story.imageUrl,
    videoUrl: story.type === "video" ? url : story.videoUrl,
  };
}

export async function signPublicMedia(path: string) {
  const { signStorageObject } = await import("../storage-sign");
  return signStorageObject("wipp-public-media", path);
}

export async function uploadPublicMediaFile(
  path: string,
  uri: string,
  mime: string,
  onProgress?: (sent: number, total: number) => void,
) {
  const token = await firebaseIdToken();
  if (!token) throw new Error("Session requise");
  const endpoint = `${SUPABASE_URL}/storage/v1/object/wipp-public-media/${path}`;
  await uploadFileToStorage(endpoint, uri, mime, token, onProgress);
  return path;
}

export async function uploadPublicMedia(path: string, bytes: Uint8Array, mime: string) {
  const stored = await uploadBucket("wipp-public-media", path, bytes, mime);
  return signPublicMedia(stored);
}

export function uploadPrivateMedia(path: string, bytes: Uint8Array, mime: string) {
  return uploadBucket("wipp-private-media", path, bytes, mime);
}

/** Streams a local file to private Storage. Does not read the file into JS memory. */
export async function uploadPrivateMediaFile(
  path: string,
  uri: string,
  mime: string,
  onProgress?: (sent: number, total: number) => void,
) {
  const token = await firebaseIdToken();
  const endpoint = `${SUPABASE_URL}/storage/v1/object/wipp-private-media/${path}`;
  await uploadFileToStorage(endpoint, uri, mime, token, onProgress);
  return path;
}

export async function myProfileId() {
  const { data, error } = await supabase.rpc("wipp_my_profile_id");
  if (error || !data) throw new Error(error?.message || "no_session");
  return String(data);
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
