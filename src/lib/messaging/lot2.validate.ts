/**
 * Validation lot 2. Refus si DATABASE_URL est défini.
 */
import assert from "node:assert/strict";
import { handleWippApi } from "@/lib/messaging/handler";
import { getSql } from "@/lib/db";
import { muteIsActive } from "@/lib/messaging/chat-prefs";

if (process.env.DATABASE_URL?.trim()) {
  console.error("Refus: cette validation ne doit pas tourner sur DATABASE_URL.");
  process.exit(1);
}

const failures: string[] = [];
function results(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  if (!ok) failures.push(name);
}

const pushes: unknown[] = [];
const origFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("exp.host")) {
    pushes.push(JSON.parse(String(init?.body ?? "[]")));
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
  assert.equal(muteIsActive(null), false);
  assert.equal(muteIsActive("infinity"), true);
  assert.equal(muteIsActive(new Date(Date.now() + 60_000).toISOString()), true);
  assert.equal(muteIsActive(new Date(Date.now() - 60_000).toISOString()), false);

  const stamp = Date.now().toString(36);
  const a = await api("POST", "register", undefined, { username: `p2a${stamp}`, password: "secret-pass", displayName: "A" });
  const b = await api("POST", "register", undefined, { username: `p2b${stamp}`, password: "secret-pass", displayName: "B" });
  const tokenA = (a.data as { token: string }).token;
  const tokenB = (b.data as { token: string }).token;
  const opened = await api("POST", "chats", tokenA, { peerUsername: `p2b${stamp}` });
  const chat = (opened.data.chat as { id: string }).id;

  const pin = await api("POST", `chats/${chat}/prefs`, tokenA, { pinned: true });
  results("pin", pin.status === 200 && Boolean((pin.data as { pinnedAt?: number }).pinnedAt), String(pin.status));
  const unpin = await api("POST", `chats/${chat}/prefs`, tokenA, { pinned: false });
  results("unpin", unpin.status === 200 && !(unpin.data as { pinnedAt?: number }).pinnedAt, String(unpin.status));

  const arch = await api("POST", `chats/${chat}/prefs`, tokenA, { archived: true });
  const list = await api("GET", "chats", tokenA);
  const row = ((list.data.chats as { id: string; archivedAt?: number }[]) ?? []).find((c) => c.id === chat);
  results("archive", arch.status === 200 && Boolean(row?.archivedAt), `archived=${row?.archivedAt ?? null}`);
  await api("POST", `chats/${chat}/prefs`, tokenA, { archived: false });

  const always = await api("POST", `chats/${chat}/prefs`, tokenB, { mute: "always" });
  results("mute always", (always.data as { mutedUntil?: string }).mutedUntil === "always", JSON.stringify(always.data));

  await api("POST", "devices/push", tokenB, { token: "ExponentPushToken[lot2]", platform: "android", kind: "expo" });
  pushes.length = 0;
  await api("POST", `chats/${chat}/focus`, tokenB, { active: false });
  const sent = await api("POST", `chats/${chat}/messages`, tokenA, { body: "ciphertext-only", clientId: `m-${stamp}` });
  const listed = await api("GET", `chats/${chat}/messages`, tokenB);
  results("mute keeps message", sent.status === 201 && ((listed.data.messages as unknown[]) ?? []).length === 1, `status ${sent.status}`);
  results("mute blocks push", pushes.length === 0, `pushes=${pushes.length}`);

  await api("POST", `chats/${chat}/prefs`, tokenB, { mute: "off" });
  pushes.length = 0;
  await api("POST", `chats/${chat}/messages`, tokenA, { body: "ciphertext-two", clientId: `m2-${stamp}` });
  results("unmute allows push", pushes.length === 1, `pushes=${pushes.length}`);

  const marked = await api("POST", `chats/${chat}/prefs`, tokenB, { manuallyUnread: true });
  const before = (marked.data as { manuallyUnreadAt?: number }).manuallyUnreadAt;
  const msgId = (sent.data.message as { id: string }).id;
  await api("POST", `chats/${chat}/receipts`, tokenB, { messageIds: [msgId], kind: "read" });
  const sql = await getSql();
  const receipt = await sql<{ read_at: string | null }>`
    select read_at::text from wipp_receipts where message_id = ${msgId} and profile_id = ${(b.data as { profile: { id: string } }).profile.id}
  `;
  await api("POST", `chats/${chat}/focus`, tokenB, { active: true });
  const after = await api("GET", "chats", tokenB);
  const afterRow = ((after.data.chats as { id: string; manuallyUnreadAt?: number | null }[]) ?? []).find((c) => c.id === chat);
  const receiptAfter = await sql<{ read_at: string | null }>`
    select read_at::text from wipp_receipts where message_id = ${msgId}
  `;
  results(
    "manual unread",
    Boolean(before) && !afterRow?.manuallyUnreadAt && Boolean(receipt[0]?.read_at) && receiptAfter[0]?.read_at === receipt[0]?.read_at,
    `before=${before} after=${afterRow?.manuallyUnreadAt ?? null}`,
  );

  const c = await api("POST", "register", undefined, { username: `p2d${stamp}`, password: "secret-pass", displayName: "D" });
  const denied = await api("POST", `chats/${chat}/prefs`, (c.data as { token: string }).token, { pinned: true });
  results("prefs outsider", denied.status === 403, String(denied.status));

  const leaked = await sql<{ n: number }>`
    select count(*)::int as n from wipp_chat_members
    where pinned_at::text ilike '%ciphertext%' or coalesce(muted_until::text,'') ilike '%secret%'
  `;
  results("no plaintext in prefs", Number(leaked[0]?.n) === 0, String(leaked[0]?.n));

  console.log(failures.length ? `FAILED ${failures.join(", ")}` : "ALL_LOT2_PASS");
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
