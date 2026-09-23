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
    const [a, b, c] = parts;

    if (method === "GET" && a === "health") {
      return json({ ok: true, service: "wipp-messaging", demoPassword: "wipp-demo" });
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

    if (method === "POST" && a === "chats" && b && c === "messages") {
      const me = await resolveSession(bearer(request));
      const body = await readBody<{ body?: string; clientId?: string }>(request);
      const message = await sendMessage(me.id, b, body.body ?? "", body.clientId);
      return json({ message }, 201);
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

    return json({ error: "not_found", message: "Route API inconnue." }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
