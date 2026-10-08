/**
 * Server-side WIPP push. Titles/bodies never include ciphertext.
 * WIPP Privé / generic_notify → generic copy even when the app is killed.
 */
import { getSql } from "@/lib/db";
import { listPushTokens, disablePushTokens } from "@/lib/messaging/calls";
import { sendExpoPush } from "@/lib/push/expo";
import { sendApnsAlert, sendFcmAlert } from "@/lib/push/native";
import { assertNoSensitivePush, sanitizePushData, type PushData } from "@/lib/push/payload";

const PRIVATE_TITLE = "WIPP";
const PRIVATE_BODY = "Nouveau message";

const recent = new Map<string, number>();
const DEDUP_MS = 10 * 60_000;

function alreadySent(eventId: string) {
  const now = Date.now();
  for (const [id, at] of recent) {
    if (now - at > DEDUP_MS) recent.delete(id);
  }
  if (recent.has(eventId)) return true;
  recent.set(eventId, now);
  return false;
}

/** Memory first, then a durable row so a restart or a second instance does not send twice. */
async function claimEvent(eventId: string) {
  if (alreadySent(eventId)) return false;
  try {
    const sql = await getSql();
    const rows = await sql<{ ok: boolean }>`
      select public.wipp_lot15_claim_push(${eventId}) as ok
    `;
    if (rows[0]?.ok === false) return false;
  } catch {
    /* migration 0015 not applied yet: in-process dedupe still applies */
  }
  return true;
}

export async function sendProfilePush(input: {
  profileId: string;
  title: string;
  body: string;
  data: PushData;
  channelId: "messages" | "requests" | "calls";
  /** E2E envelope decrypted on the phone (iOS extension / Android background task). */
  wenc?: Record<string, unknown>;
  pic?: { url: string; p?: string; name: string; id: string; group?: string };
}) {
  if (!(await claimEvent(input.data.eventId))) return { sent: 0, deduped: true as const };
  const data = sanitizePushData(input.data as unknown as Record<string, unknown>);
  assertNoSensitivePush(data, input.title, input.body);
  const tokens = await listPushTokens(input.profileId);
  const apns = tokens.filter((t) => t.kind === "apns").map((t) => t.token);
  // Plain "fcm" = older Android builds (system notification); "fcm-e2e" = builds that decrypt previews.
  const fcm = tokens.filter((t) => t.kind === "fcm").map((t) => t.token);
  const fcmE2e = tokens.filter((t) => t.kind === "fcm-e2e").map((t) => t.token);
  // A phone that registered a native token gets it directly from Apple/Google, not twice via Expo.
  const native = new Set<string>([...(apns.length ? ["ios"] : []), ...(fcm.length || fcmE2e.length ? ["android"] : [])]);
  const expo = tokens
    .filter((t) => (t.kind === "expo" || t.token.startsWith("ExponentPushToken")) && !native.has(t.platform))
    .map((t) => t.token);
  const collapseId = input.data.eventId;
  const jobs: Promise<{ sent: number; invalid: string[] }>[] = [];
  if (expo.length) {
    jobs.push(
      sendExpoPush(expo, {
        title: input.title,
        body: input.body,
        data,
        channelId: input.channelId,
        collapseId,
        priority: input.channelId === "calls" ? "high" : "default",
      }).then((r) => ({ sent: r.sent, invalid: r.invalidTokens })),
    );
  }
  if (apns.length) jobs.push(sendApnsAlert(apns, { title: input.title, body: input.body, data, collapseId, wenc: input.wenc, pic: input.pic }));
  if (fcm.length) jobs.push(sendFcmAlert(fcm, { title: input.title, body: input.body, data, channelId: input.channelId, collapseId }));
  if (fcmE2e.length) jobs.push(sendFcmAlert(fcmE2e, { title: input.title, body: input.body, data, channelId: input.channelId, collapseId, wenc: input.wenc }));
  const results = await Promise.allSettled(jobs);
  let sent = 0;
  const invalid: string[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    sent += r.value.sent;
    invalid.push(...r.value.invalid);
  }
  if (invalid.length) await disablePushTokens(invalid);
  return { sent, deduped: false as const };
}

export function privateCopy() {
  return { title: PRIVATE_TITLE, body: PRIVATE_BODY };
}

async function loadBusinessMeta(chatId: string): Promise<{ publicId: string; name: string; ownerId: string } | null> {
  const sql = await getSql();
  const tries = [
    `select bc.public_id as "publicId", bc.name, bc.owner_profile_id as "ownerId"
     from wipp_business_chats t
     join wipp_business_cards bc on bc.id = t.card_id
     where t.chat_id = $1 limit 1`,
    `select bc.public_id as "publicId", bc.name, bc.owner_profile_id as "ownerId"
     from wipp_business_chats t
     join wipp_business_cards bc on bc.id = t.business_card_id
     where t.chat_id = $1 limit 1`,
    `select public_id as "publicId", name, owner_profile_id as "ownerId"
     from wipp_business_cards where chat_id = $1 limit 1`,
    `select bc.public_id as "publicId", bc.name, bc.owner_profile_id as "ownerId"
     from wipp_chats c
     join wipp_business_cards bc on bc.id = c.business_card_id
     where c.id = $1 limit 1`,
  ];
  for (const q of tries) {
    try {
      const rows = await sql.query<{ publicId: string; name: string; ownerId: string }>(q, [chatId]);
      if (rows[0]?.publicId && rows[0].name && rows[0].ownerId) return rows[0];
    } catch {
      /* table or column absent on this environment */
    }
  }
  return null;
}

async function peerFlags(chatId: string, profileId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{ muted_until: string | null; generic_notify: boolean }>`
      select muted_until::text, generic_notify
      from wipp_chat_members
      where chat_id = ${chatId} and profile_id = ${profileId}
      limit 1
    `;
    return rows[0] ?? { muted_until: null, generic_notify: false };
  } catch {
    const rows = await sql<{ muted_until: string | null }>`
      select muted_until::text
      from wipp_chat_members
      where chat_id = ${chatId} and profile_id = ${profileId}
      limit 1
    `;
    return { muted_until: rows[0]?.muted_until ?? null, generic_notify: false };
  }
}

/**
 * The stored E2E envelope, trimmed to what the phone needs to decrypt it (IV, ciphertext, sender
 * public key x/y, chat id as HKDF salt). The server never has the key: this is ciphertext only.
 */
async function previewEnvelope(chatId: string, messageId: string): Promise<Record<string, unknown> | undefined> {
  try {
    const sql = await getSql();
    const rows = await sql<{ body: string }>`select body from wipp_messages where id = ${messageId} and chat_id = ${chatId} limit 1`;
    const raw = rows[0]?.body;
    if (!raw || !raw.startsWith("{")) return undefined;
    const env = JSON.parse(raw) as { e2e?: boolean; iv?: string; ct?: string; spk?: { x?: string; y?: string } };
    if (!env.e2e || !env.iv || !env.ct || !env.spk?.x || !env.spk?.y) return undefined;
    const wenc = { c: chatId, iv: env.iv, ct: env.ct, spk: { x: env.spk.x, y: env.spk.y } };
    // APNs payloads are capped at 4 KB: long messages keep the generic text.
    return JSON.stringify(wenc).length <= 2800 ? wenc : undefined;
  } catch {
    return undefined;
  }
}

/** Signed photo URL for the lock screen (profiles: public bucket, groups: private bucket). Null = no photo. */
async function signedPhoto(path: string | null | undefined) {
  if (!path) return null;
  if (/^https:\/\//i.test(path)) return path.length <= 1200 ? path : null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^(business|profiles|groups)\//.test(path)) return null;
  const { SUPABASE_URL } = await import("@/lib/supabase/config");
  const bucket = path.startsWith("groups/") ? "wipp-private-media" : "wipp-public-media";
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encoded}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signed = data.signedUrl || data.signedURL || "";
    if (!signed) return null;
    const url = signed.startsWith("http") ? signed : `${SUPABASE_URL}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
    return url.length <= 1200 ? url : null;
  } catch {
    return null;
  }
}

export async function notifyChatMessage(input: {
  senderId: string;
  chatId: string;
  messageId: string;
  vault?: boolean;
}) {
  const { muteIsActive } = await import("@/lib/messaging/chat-prefs");
  const { isPresent } = await import("@/lib/messaging/message-live");
  const { isBlocked } = await import("@/lib/messaging/server");
  const sql = await getSql();
  const peers = await sql<{ profile_id: string }>`
    select profile_id from wipp_chat_members where chat_id = ${input.chatId} and profile_id <> ${input.senderId}
  `;
  const me = await sql<{ display_name: string; username: string; avatar_url: string | null }>`
    select display_name, username, avatar_url from wipp_profiles where id = ${input.senderId} limit 1
  `;
  const biz = await loadBusinessMeta(input.chatId);
  let groupName: string | null = null;
  let groupAvatar: string | null = null;
  try {
    const groups = await sql<{ name: string; avatar_url: string | null }>`
      select name, avatar_url from wipp_groups where chat_id = ${input.chatId} limit 1
    `;
    groupName = groups[0]?.name ?? null;
    groupAvatar = groups[0]?.avatar_url ?? null;
  } catch {
    groupName = null;
  }
  // Photo on the notification, like WhatsApp: the group's photo in a group, else the sender's.
  const senderName = me[0]?.display_name || (me[0]?.username ? `@${me[0].username}` : "WIPP");
  // The phone keeps its own copy of photos it already showed (App Group): the push only names the
  // storage path `p`. `url` is a fallback when the server can sign (service key set).
  const photoPath = (groupName ? groupAvatar ?? me[0]?.avatar_url : me[0]?.avatar_url) ?? "";
  const photoUrl = await signedPhoto(photoPath);
  const pic = {
    url: photoUrl ?? "",
    p: /^(business|profiles|groups)\//.test(photoPath) ? photoPath.slice(0, 200) : "",
    name: senderName.slice(0, 64),
    id: input.senderId,
    ...(groupName ? { group: groupName.slice(0, 64) || "Groupe" } : {}),
  };
  for (const peer of peers) {
    if (isPresent(input.chatId, peer.profile_id)) continue;
    const flags = await peerFlags(input.chatId, peer.profile_id);
    if (muteIsActive(flags.muted_until)) continue;
    if (await isBlocked(input.senderId, peer.profile_id)) continue;
    const redact = Boolean(input.vault) || Boolean(flags.generic_notify);
    if (redact) {
      const copy = privateCopy();
      await sendProfilePush({
        profileId: peer.profile_id,
        title: copy.title,
        body: copy.body,
        channelId: "messages",
        data: {
          type: "message",
          eventId: input.messageId,
          chatId: input.chatId,
          private: true,
        },
      });
      continue;
    }
    if (groupName) {
      // Who wrote, never the content: the "Aperçu des messages" choice lives on the phone only.
      const who = me[0]?.username ? `@${me[0].username}` : me[0]?.display_name || "Quelqu’un";
      await sendProfilePush({
        profileId: peer.profile_id,
        title: groupName.slice(0, 64) || "Groupe",
        body: `${who} : Nouveau message`,
        channelId: "messages",
        pic,
        data: {
          type: "message",
          eventId: input.messageId,
          chatId: input.chatId,
          group: true,
        },
      });
      continue;
    }
    if (biz) {
      const ownerIsPeer = biz.ownerId === peer.profile_id;
      // The owner sees the customer (name + photo); the customer sees the business (name + logo).
      let bizPic: typeof pic | undefined = ownerIsPeer ? { ...pic, name: `${senderName.slice(0, 40)} · ${biz.name.slice(0, 20)}` } : undefined;
      if (!ownerIsPeer) {
        let logo = "";
        try {
          const rows = await sql<{ logo_url: string | null }>`select logo_url from wipp_business_cards where public_id = ${biz.publicId} limit 1`;
          logo = rows[0]?.logo_url ?? "";
        } catch {
          logo = "";
        }
        bizPic = { url: "", p: logo && !/^https?:/i.test(logo) ? `card/${logo}`.slice(0, 200) : "", name: biz.name.slice(0, 64) || "WIPP", id: `biz:${biz.publicId}` };
      }
      await sendProfilePush({
        profileId: peer.profile_id,
        pic: bizPic,
        title: biz.name.slice(0, 64) || "WIPP",
        body: ownerIsPeer ? "Nouveau message professionnel" : "Nouveau message",
        channelId: "messages",
        wenc: await previewEnvelope(input.chatId, input.messageId),
        data: {
          type: "message",
          eventId: input.messageId,
          chatId: input.chatId,
          business: true,
          publicId: biz.publicId,
        },
      });
      continue;
    }
    await sendProfilePush({
      profileId: peer.profile_id,
      title: me[0]?.display_name || "WIPP",
      body: "Nouveau message",
      channelId: "messages",
      wenc: await previewEnvelope(input.chatId, input.messageId),
      pic,
      data: {
        type: "message",
        eventId: input.messageId,
        chatId: input.chatId,
      },
    });
  }
}

export async function notifyConnectionRequest(input: {
  senderId: string;
  recipientId: string;
  requestId: string;
  senderName: string;
}) {
  await sendProfilePush({
    profileId: input.recipientId,
    title: input.senderName.slice(0, 64) || "WIPP",
    body: "Demande de connexion",
    channelId: "requests",
    data: {
      type: "request",
      eventId: input.requestId,
      requestId: input.requestId,
    },
  });
}

export async function notifyTouchIncoming(input: { recipientId: string; inviteId: string }) {
  await sendProfilePush({
    profileId: input.recipientId,
    title: "WIPP Touch",
    body: "Quelqu’un veut se connecter près de toi",
    channelId: "requests",
    data: {
      type: "touch",
      eventId: input.inviteId,
      inviteId: input.inviteId,
    },
  });
}
