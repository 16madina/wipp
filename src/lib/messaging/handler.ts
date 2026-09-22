import {
  WippHttpError,
  claimLinkCode,
  createLinkCode,
  ensureMessagingReady,
  getLinkStatus,
  getOrCreateDm,
  listChats,
  listDevices,
  listMessages,
  loginProfile,
  logoutSession,
  registerProfile,
  resolveSession,
  searchProfiles,
  sendMessage,
} from "./server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorResponse(err: unknown) {
  if (err instanceof WippHttpError) {
    return json({ error: err.code, message: err.message }, err.status);
  }
  console.error("[wipp-api]", err);
  return json({ error: "internal", message: "Erreur serveur." }, 500);
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
    await ensureMessagingReady();
    const parts = pathParts(request);
    const method = request.method.toUpperCase();
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
      const body = await readBody<{ username?: string; password?: string }>(request);
      const session = await loginProfile({
        username: body.username ?? "",
        password: body.password ?? "",
      });
      return json(session);
    }

    if (method === "POST" && a === "logout") {
      await logoutSession(bearer(request));
      return json({ ok: true });
    }

    if (method === "GET" && a === "me") {
      const profile = await resolveSession(bearer(request));
      return json({ profile });
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
