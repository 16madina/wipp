/**
 * Lot 6 push: mute, generic vault copy, token unregister, notify-after-store.
 * Refus si DATABASE_URL est défini.
 */
import assert from "node:assert/strict";
import { handleWippApi } from "@/lib/messaging/handler";
import { sanitizePushData } from "@/lib/push/payload";

if (process.env.DATABASE_URL?.trim()) {
  console.error("Refus: cette validation ne doit pas tourner sur DATABASE_URL.");
  process.exit(1);
}

const failures: string[] = [];
function results(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  if (!ok) failures.push(name);
}

const pushes: Array<{ title?: string; body?: string; data?: Record<string, unknown> }> = [];
const origFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("exp.host")) {
    const batch = JSON.parse(String(init?.body ?? "[]")) as typeof pushes;
    pushes.push(...(Array.isArray(batch) ? batch : [batch]));
    return new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200 });
  }
  return origFetch(input, init);
}) as typeof fetch;

async function api(method: string, path: string, token?: string, body?: unknown) {
  const res = await handleWippApi(
    new Request(`http://wipp.test/api/wipp/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

async function main() {
  const stripped = sanitizePushData({
    type: "message",
    eventId: "m1",
    chatId: "c1",
    jwt: "aaa",
    body: "plaintext",
    phone: "+1",
    firebase_uid: "x",
  });
  results("payload strip", !("jwt" in stripped) && !("body" in stripped) && !("phone" in stripped), JSON.stringify(stripped));

  const stamp = Date.now().toString(36);
  const a = await api("POST", "register", undefined, { username: `p6a${stamp}`, password: "secret-pass", displayName: "Amina" });
  const b = await api("POST", "register", undefined, { username: `p6b${stamp}`, password: "secret-pass", displayName: "Binta" });
  const tokenA = (a.data as { token: string }).token;
  const tokenB = (b.data as { token: string }).token;
  const opened = await api("POST", "chats", tokenA, { peerUsername: `p6b${stamp}` });
  const chat = (opened.data.chat as { id: string }).id;

  await api("POST", "devices/push", tokenB, {
    token: "ExponentPushToken[lot6]",
    platform: "android",
    kind: "expo",
    installationId: "inst-lot6",
  });

  pushes.length = 0;
  await api("POST", `chats/${chat}/focus`, tokenB, { active: false });
  await api("POST", `chats/${chat}/messages`, tokenA, { body: "ciphertext-secret", clientId: `m-${stamp}`, vault: true });
  const vaultPush = pushes[0];
  results(
    "private generic",
    vaultPush?.title === "WIPP" && vaultPush?.body === "Nouveau message" && vaultPush?.data?.private === true,
    JSON.stringify(vaultPush),
  );
  results(
    "no ciphertext in push",
    !JSON.stringify(pushes).includes("ciphertext-secret") && !JSON.stringify(pushes).includes("Amina"),
    JSON.stringify(pushes),
  );

  await api("POST", `chats/${chat}/prefs`, tokenB, { mute: "always" });
  pushes.length = 0;
  await api("POST", `chats/${chat}/messages`, tokenA, { body: "muted-cipher", clientId: `m2-${stamp}` });
  results("mute respected", pushes.length === 0, `pushes=${pushes.length}`);

  await api("POST", `chats/${chat}/prefs`, tokenB, { mute: "off", genericNotify: true });
  pushes.length = 0;
  const sent = await api("POST", `chats/${chat}/messages`, tokenA, { body: "still-cipher", clientId: `m3-${stamp}` });
  results("generic_notify", pushes[0]?.title === "WIPP" && !JSON.stringify(pushes).includes("Amina"), JSON.stringify(pushes[0]));

  const messageId = (sent.data.message as { id: string }).id;
  pushes.length = 0;
  const notify = await api("POST", `chats/${chat}/notify`, tokenA, { messageId, vault: true });
  results("notify endpoint", notify.status === 200, String(notify.status));
  results("notify dedup", pushes.length === 0, `pushes=${pushes.length}`);

  const unreg = await api("POST", "devices/push/unregister", tokenB, { token: "ExponentPushToken[lot6]", installationId: "inst-lot6" });
  results("unregister", unreg.status === 200, String(unreg.status));
  pushes.length = 0;
  await api("POST", `chats/${chat}/prefs`, tokenB, { genericNotify: false });
  await api("POST", `chats/${chat}/messages`, tokenA, { body: "after-unreg", clientId: `m4-${stamp}` });
  results("unregistered silent", pushes.length === 0, `pushes=${pushes.length}`);

  console.log(failures.length ? `FAILED ${failures.join(", ")}` : "ALL_LOT6_PASS");
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
