import {
  acceptTouchCode,
  cancelTouchShare,
  createTouchShare,
  getTouchShare,
  peekTouchCodePublic,
  rejectTouchCode,
  resolveTouchCode,
  WIPP_TOUCH_CODE_ENTROPY_BITS,
  WIPP_TOUCH_CODE_LENGTH,
  WIPP_TOUCH_SERVICE_UUID,
} from "@/lib/messaging/touch";
import {
  getDetectStatus,
  reportTouchDetect,
  reportTouchShock,
} from "@/lib/messaging/touch-bump";
import { getTouchBumpConfig } from "@/lib/messaging/touch-config";
import { TOUCH_RL, touchRateLimit } from "@/lib/messaging/touch-rate-limit";
import { liveKitPublicConfig } from "@/lib/livekit/config";
import { mintCallToken } from "@/lib/livekit/token";
import {
  answerCallInvite,
  createCallInvite,
  getOutgoingCallStatus,
  hangupCallInvite,
  listIncomingCalls,
  registerPushToken,
} from "@/lib/messaging/calls";
import {
  WippHttpError,
  adminBlockUser,
  adminListFlags,
  adminListRecentMessages,
  adminListUsers,
  adminStats,
  adminUnblockUser,
  claimLinkCode,
  createLinkCode,
  deleteAccount,
  ensureMessagingReady,
  getLinkStatus,
  getOrCreateDm,
  linkAdminPhone,
  listChats,
  listDevices,
  listMessages,
  loginProfile,
  loginWithFirebaseIdToken,
  logoutSession,
  publishE2ePublicKey,
  registerProfile,
  resolveSession,
  searchProfiles,
  sendMessage,
  blockUser,
  unblockUser,
  setDisappear,
  assertNotBlocked,
} from "./server";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data: unknown, status = 200) {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  );
}

function errorResponse(err: unknown) {
  if (err instanceof WippHttpError) {
    return json({ error: err.code, message: err.message }, err.status);
  }
  console.error("[wipp-api]", err);
  return json({ error: "internal", message: "Erreur serveur." }, 500);
}

/** Preflight for mobile / cross-origin web clients. */
export function handleWippOptions() {
  return withCors(new Response(null, { status: 204 }));
}

function bearer(request: Request) {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}

function pathParts(request: Request) {
  const url = new URL(request.url);
  const raw = url.pathname.replace(/^\/api\/wipp\/?/, "");
  return raw.split("/").filter(Boolean);
}

async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new WippHttpError(400, "bad_json", "JSON invalide.");
  }
}

export async function handleWippApi(request: Request): Promise<Response> {
  try {
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") {
      return handleWippOptions();
    }

    await ensureMessagingReady();
    const parts = pathParts(request);
    const [a, b, c, d, e] = parts;

    if (method === "GET" && a === "health") {
      const livekit = liveKitPublicConfig();
      return json({
        ok: true,
        service: "wipp-messaging",
        demoPassword: "wipp-demo",
        livekit,
        touch: {
          serviceUuid: WIPP_TOUCH_SERVICE_UUID,
          codeLength: WIPP_TOUCH_CODE_LENGTH,
          codeEntropyBits: WIPP_TOUCH_CODE_ENTROPY_BITS,
          bump: await getTouchBumpConfig(),
        },
      });
    }

    if (method === "GET" && a === "calls" && b === "config") {
      return json(liveKitPublicConfig());
    }

    if (method === "POST" && a === "calls" && b === "token") {
      // Soft auth: prefer session identity when present, else accept body identity (demo).
      let identity = "demo";
      let displayName: string | undefined;
      try {
        const me = await resolveSession(bearer(request));
        identity = me.username || me.id;
        displayName = me.displayName;
      } catch {
        /* demo / offline */
      }
      const body = await readBody<{
        roomName?: string;
        identity?: string;
        displayName?: string;
        video?: boolean;
        peerId?: string;
      }>(request);
      if (body.identity?.trim()) identity = body.identity.trim();
      if (body.displayName?.trim()) displayName = body.displayName.trim();
      const roomName =
        body.roomName?.trim() ||
        `wipp-${[identity, body.peerId || "peer"].sort().join("-")}`;
      try {
        const me = await resolveSession(bearer(request));
        if (body.peerId) await assertNotBlocked(me.id, body.peerId);
      } catch (err) {
        if (err instanceof WippHttpError && err.code === "blocked") throw err;
      }
      const token = await mintCallToken({
        roomName,
        identity,
        displayName,
        video: Boolean(body.video),
      });
      return json(token);
    }

    if (method === "POST" && a === "devices" && b === "push") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ token?: string; platform?: string; kind?: string }>(request);
      const result = await registerPushToken({
        profileId: me.id,
        token: body.token ?? "",
        platform: body.platform,
        kind: body.kind,
      });
      return json(result);
    }

    if (method === "POST" && a === "touch" && b === "share" && c && d === "shock") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ shockedAt?: number }>(request);
      const result = await reportTouchShock(me.id, c, body.shockedAt ?? Date.now());
      return json(result);
    }

    if (method === "POST" && a === "touch" && b === "share" && c && d === "cancel") {
      const me = await resolveSession(bearer(request));
      const invite = await cancelTouchShare(me.id, c);
      return json({ invite });
    }

    if (method === "POST" && a === "touch" && b === "share" && !c) {
      const me = await resolveSession(bearer(request));
      const rl = touchRateLimit(`touch:create:${me.id}`, TOUCH_RL.create.limit, TOUCH_RL.create.windowMs);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de partages. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const invite = await createTouchShare(me.id);
      return json({ invite }, 201);
    }

    if (method === "GET" && a === "touch" && b === "share" && c && !d) {
      const me = await resolveSession(bearer(request));
      const invite = await getTouchShare(me.id, c);
      return json({ invite });
    }

    if (method === "POST" && a === "touch" && b === "detect" && !c) {
      const me = await resolveSession(bearer(request));
      const rl = touchRateLimit(`touch:detect:${me.id}`, TOUCH_RL.resolve.limit, TOUCH_RL.resolve.windowMs);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de tentatives. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const body = await readBody<{
        code?: string;
        rssiSamples?: number[];
        detectedAt?: number;
        shockAt?: number | null;
        platform?: string;
        foreground?: boolean;
        channel?: "ble" | "nfc" | "manual" | "qr";
      }>(request);
      if (!body.code?.trim()) throw new WippHttpError(400, "bad_request", "code requis");
      const result = await reportTouchDetect({
        code: body.code,
        profileId: me.id,
        rssiSamples: body.rssiSamples || [],
        detectedAt: body.detectedAt ?? Date.now(),
        shockAt: body.shockAt,
        platform: body.platform,
        foreground: body.foreground,
        channel: body.channel,
      });
      return json(result);
    }

    if (method === "GET" && a === "touch" && b === "detect" && c && d === "status") {
      const me = await resolveSession(bearer(request));
      const result = await getDetectStatus(me.id, c);
      return json(result);
    }

    if (method === "GET" && a === "touch" && b === "config") {
      return json({ bump: await getTouchBumpConfig() });
    }

    if (method === "GET" && a === "touch" && b === "peek" && c) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "anon";
      const rl = touchRateLimit(`touch:peek:${ip}`, 30, 60_000);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de requêtes. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const peek = await peekTouchCodePublic(c);
      return json({ peek });
    }

    if (method === "GET" && a === "touch" && b === "code" && c) {
      const me = await resolveSession(bearer(request));
      const url = new URL(request.url);
      const source = url.searchParams.get("source") || "ble";
      const manual = source === "manual" || source === "qr" || source === "nfc";
      const cfg = manual ? TOUCH_RL.manual : TOUCH_RL.resolve;
      const rl = touchRateLimit(`touch:resolve:${me.id}`, cfg.limit, cfg.windowMs);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de tentatives. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const invite = await resolveTouchCode(me.id, c, { source });
      return json({ invite });
    }

    if (method === "POST" && a === "touch" && b === "code" && c && d === "accept") {
      const me = await resolveSession(bearer(request));
      const rl = touchRateLimit(`touch:accept:${me.id}`, TOUCH_RL.accept.limit, TOUCH_RL.accept.windowMs);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de tentatives. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const invite = await acceptTouchCode(me.id, c);
      return json({ invite });
    }

    if (method === "POST" && a === "touch" && b === "code" && c && d === "reject") {
      const me = await resolveSession(bearer(request));
      const rl = touchRateLimit(`touch:reject:${me.id}`, TOUCH_RL.reject.limit, TOUCH_RL.reject.windowMs);
      if (!rl.ok) {
        throw new WippHttpError(429, "rate_limited", `Trop de tentatives. Réessaie dans ${rl.retryAfterSec}s.`);
      }
      const invite = await rejectTouchCode(me.id, c);
      return json({ invite });
    }

    if (method === "POST" && a === "calls" && b === "invite") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{
        peerUsername?: string;
        peerId?: string;
        kind?: "audio" | "video";
      }>(request);
      const invite = await createCallInvite({
        callerId: me.id,
        peerUsername: body.peerUsername,
        peerId: body.peerId,
        kind: body.kind,
      });
      return json({ invite }, 201);
    }

    if (method === "GET" && a === "calls" && b === "incoming") {
      const me = await resolveSession(bearer(request));
      const invites = await listIncomingCalls(me.id);
      return json({ invites });
    }

    if (method === "GET" && a === "calls" && b && c === "status") {
      const me = await resolveSession(bearer(request));
      const invite = await getOutgoingCallStatus(me.id, b);
      return json({ invite });
    }

    if (method === "POST" && a === "calls" && b && c === "answer") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ accept?: boolean }>(request);
      const invite = await answerCallInvite({
        meId: me.id,
        callId: b,
        accept: body.accept !== false,
      });
      return json({ invite });
    }

    if (method === "POST" && a === "calls" && b && c === "hangup") {
      const me = await resolveSession(bearer(request));
      const invite = await hangupCallInvite({ meId: me.id, callId: b });
      return json({ invite });
    }

    if (method === "POST" && a === "calls" && b && !c) {
      // POST /calls/:id with { action: accept|reject|hangup }
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ action?: string; accept?: boolean }>(request);
      const action = body.action || (body.accept === false ? "reject" : body.accept ? "accept" : "hangup");
      if (action === "accept" || action === "reject") {
        const invite = await answerCallInvite({
          meId: me.id,
          callId: b,
          accept: action === "accept",
        });
        return json({ invite });
      }
      const invite = await hangupCallInvite({ meId: me.id, callId: b });
      return json({ invite });
    }

    if (method === "POST" && a === "register") {
      const body = await readBody<{ username?: string; password?: string; displayName?: string }>(request);
      const session = await registerProfile({
        username: body.username ?? "",
        password: body.password ?? "",
        displayName: body.displayName ?? "",
      });
      return json(session, 201);
    }

    if (method === "POST" && a === "login") {
      const body = await readBody<{ username?: string; phone?: string; password?: string }>(request);
      const session = await loginProfile({
        username: body.username,
        phone: body.phone,
        password: body.password ?? "",
      });
      return json(session);
    }

    if (method === "POST" && a === "auth" && b === "firebase") {
      const body = await readBody<{ idToken?: string }>(request);
      const session = await loginWithFirebaseIdToken(body.idToken ?? "");
      return json(session);
    }

    if (method === "POST" && a === "logout") {
      await logoutSession(bearer(request));
      return json({ ok: true });
    }

    if (method === "POST" && a === "account" && b === "delete") {
      const body = await readBody<{ username?: string; password?: string }>(request);
      const result = await deleteAccount({
        username: body.username ?? "",
        password: body.password ?? "",
      });
      return json(result);
    }

    if (method === "GET" && a === "me") {
      const profile = await resolveSession(bearer(request));
      return json({ profile });
    }

    if (method === "PUT" && a === "me" && b === "e2e-key") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ publicJwk?: JsonWebKey }>(request);
      const profile = await publishE2ePublicKey(me.id, body.publicJwk);
      return json({ profile });
    }

    if (method === "PUT" && a === "me" && b === "admin-phone") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ phone?: string }>(request);
      const profile = await linkAdminPhone(me.id, body.phone ?? "");
      return json({ profile });
    }

    if (method === "GET" && a === "admin" && b === "stats") {
      const me = await resolveSession(bearer(request));
      const stats = await adminStats(me.id);
      return json({ stats });
    }

    if (method === "GET" && a === "admin" && b === "users") {
      const me = await resolveSession(bearer(request));
      const users = await adminListUsers(me.id);
      return json({ users });
    }

    if (method === "GET" && a === "admin" && b === "messages") {
      const me = await resolveSession(bearer(request));
      const messages = await adminListRecentMessages(me.id);
      return json({ messages });
    }

    if (method === "GET" && a === "admin" && b === "flags") {
      const me = await resolveSession(bearer(request));
      const flags = await adminListFlags(me.id);
      return json({ flags });
    }

    if (method === "POST" && a === "admin" && b === "block") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ username?: string; reason?: string }>(request);
      const result = await adminBlockUser(me.id, body.username ?? "", body.reason ?? "");
      return json(result);
    }

    if (method === "POST" && a === "admin" && b === "unblock") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ username?: string }>(request);
      const result = await adminUnblockUser(me.id, body.username ?? "");
      return json(result);
    }

    if (method === "GET" && a === "users" && b === "search") {
      const me = await resolveSession(bearer(request));
      const q = new URL(request.url).searchParams.get("q") ?? "";
      const users = await searchProfiles(q, me.id);
      return json({ users });
    }

    if (method === "GET" && a === "chats" && !b) {
      const me = await resolveSession(bearer(request));
      const chats = await listChats(me.id);
      return json({ chats });
    }

    if (method === "GET" && a === "chats" && b && c === "messages") {
      const me = await resolveSession(bearer(request));
      const afterRaw = new URL(request.url).searchParams.get("after");
      const after = afterRaw ? Number(afterRaw) : undefined;
      const messages = await listMessages(me.id, b, Number.isFinite(after) ? after : undefined);
      return json({ messages });
    }

    if (method === "GET" && a === "stream") {
      const me = await resolveSession(bearer(request));
      const { subscribeLive } = await import("./message-live");
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const memberRows = await sql<{ chat_id: string }>`
        select chat_id from wipp_chat_members where profile_id = ${me.id}
      `;
      const memberChats = new Set(memberRows.map((r) => r.chat_id));
      const encoder = new TextEncoder();
      let unsub = () => {};
      const stream = new ReadableStream({
        start(controller) {
          unsub = subscribeLive((event) => {
            if (!memberChats.has(event.chatId)) return;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: "ready" })}\n\n`));
        },
        cancel() {
          unsub();
        },
      });
      return withCors(
        new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
          },
        }),
      );
    }

    if (method === "POST" && a === "chats" && b && c === "messages" && !d) {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ body?: string; clientId?: string; replyTo?: string; vault?: boolean }>(request);
      const message = await sendMessage(me.id, b, body.body ?? "", body.clientId, {
        replyTo: body.replyTo,
        vault: body.vault,
      });
      return json({ message }, 201);
    }

    if (method === "POST" && a === "chats" && b && c === "messages" && d && e) {
      const me = await resolveSession(bearer(request));
      const actions = await import("./message-actions");
      if (e === "edit") {
        const body = await readBody<{ body?: string }>(request);
        return json({ message: await actions.editMessage(me.id, b, d, body.body ?? "") });
      }
      if (e === "hide") return json(await actions.hideMessage(me.id, b, d));
      if (e === "tombstone") return json(await actions.tombstoneMessage(me.id, b, d));
      if (e === "reaction") {
        const body = await readBody<{ emoji?: string }>(request);
        return json({ message: await actions.setReaction(me.id, b, d, body.emoji ?? "") });
      }
      if (e === "pin") {
        const body = await readBody<{ pinned?: boolean }>(request);
        return json({ message: await actions.setPin(me.id, b, d, Boolean(body.pinned)) });
      }
    }

    if (method === "POST" && a === "chats" && b && c === "receipts") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ messageIds?: string[]; kind?: "delivered" | "read" }>(request);
      const { markReceipt } = await import("./message-actions");
      return json(await markReceipt(me.id, b, body.messageIds ?? [], body.kind === "read" ? "read" : "delivered"));
    }

    if (method === "POST" && a === "chats" && b && c === "prefs") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{
        pinned?: boolean;
        archived?: boolean;
        mute?: "off" | "1h" | "8h" | "1w" | "always";
        manuallyUnread?: boolean;
      }>(request);
      const { setChatPrefs } = await import("./chat-prefs");
      return json(await setChatPrefs(me.id, b, body));
    }

    if (method === "POST" && a === "chats" && b && c === "focus") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ active?: boolean }>(request);
      const { setFocus } = await import("./message-actions");
      return json(await setFocus(me.id, b, Boolean(body.active)));
    }

    if (method === "POST" && a === "chats" && b && c === "typing") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ active?: boolean }>(request);
      const { setTyping } = await import("./message-actions");
      return json(await setTyping(me.id, b, body.active !== false));
    }

    if (method === "POST" && a === "chats" && !b) {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ peerUsername?: string }>(request);
      const chat = await getOrCreateDm(me.id, body.peerUsername ?? "");
      return json({ chat }, 201);
    }

    if (method === "POST" && a === "link" && b === "create") {
      let origin =
        request.headers.get("origin") || new URL(request.url).origin;
      try {
        const body = await readBody<{ origin?: string }>(request);
        if (body.origin) origin = body.origin;
      } catch {
        /* empty body ok */
      }
      const link = await createLinkCode({
        userAgent: request.headers.get("user-agent") ?? undefined,
        origin,
      });
      return json(link, 201);
    }

    if (method === "GET" && a === "link" && b === "status") {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      const status = await getLinkStatus(token);
      return json(status);
    }

    if (method === "POST" && a === "link" && b === "claim") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ code?: string }>(request);
      const result = await claimLinkCode(me.id, body.code ?? "");
      return json(result);
    }

    if (method === "GET" && a === "devices") {
      const me = await resolveSession(bearer(request));
      const devices = await listDevices(me.id);
      return json({ devices });
    }

    if (method === "POST" && a === "blocks" && !b) {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ username?: string; profileId?: string }>(request);
      return json(await blockUser(me.id, body));
    }

    if (method === "POST" && a === "blocks" && b === "remove") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ username?: string; profileId?: string }>(request);
      return json(await unblockUser(me.id, body));
    }

    if (method === "POST" && a === "chats" && b && c === "disappear") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ ms?: number }>(request);
      return json(await setDisappear(me.id, b, Number(body.ms ?? 0)));
    }

    if (method === "POST" && a === "chats" && b && c === "attachments" && !d) {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ chunkCount?: number; byteSize?: number; viewOnce?: boolean }>(request);
      const { createAttachment } = await import("./media-store");
      return json(
        await createAttachment(me.id, b, {
          chunkCount: Number(body.chunkCount ?? 0),
          byteSize: Number(body.byteSize ?? 0),
          viewOnce: Boolean(body.viewOnce),
        }),
        201,
      );
    }

    if (a === "attachments" && b && c === "chunks" && d) {
      const me = await resolveSession(bearer(request));
      const index = Number(d);
      const { putChunk, readChunk } = await import("./media-store");
      if (method === "PUT") {
        const body = await readBody<{ ciphertext?: string; sha256?: string }>(request);
        return json(await putChunk(me.id, b, index, body.ciphertext ?? "", body.sha256 ?? ""));
      }
      if (method === "GET") {
        return json(await readChunk(me.id, b, index));
      }
    }

    if (method === "POST" && a === "attachments" && b && c === "complete") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ messageId?: string }>(request);
      const { completeAttachment } = await import("./media-store");
      return json(await completeAttachment(me.id, b, body.messageId));
    }

    if (method === "POST" && a === "attachments" && b && c === "consume") {
      const me = await resolveSession(bearer(request));
      const { consumeAttachment } = await import("./media-store");
      return json(await consumeAttachment(me.id, b));
    }

    if (method === "GET" && a === "moderation" && b === "key") {
      await resolveSession(bearer(request));
      const { moderationPublicKey } = await import("./report-seal");
      const publicJwk = await moderationPublicKey();
      return json({ publicJwk });
    }

    if (method === "POST" && a === "reports") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ chatId?: string; messageId?: string; reason?: string; sealedPayload?: string }>(request);
      const { submitReport } = await import("./report-seal");
      return json(
        await submitReport(me.id, {
          chatId: body.chatId ?? "",
          messageId: body.messageId ?? "",
          reason: body.reason ?? "",
          sealedPayload: body.sealedPayload ?? "",
        }),
        201,
      );
    }

    if (method === "POST" && a === "admin" && b === "flags" && c && d === "open") {
      const me = await resolveSession(bearer(request));
      const { openSealedReport } = await import("./report-seal");
      return json(await openSealedReport(me.id, c));
    }

    return json({ error: "not_found", message: "Route API inconnue." }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
