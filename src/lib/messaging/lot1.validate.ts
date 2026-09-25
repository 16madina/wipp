/**
 * Validation lot 1 — deux comptes, API réelle, base PGLite.
 * Ne change pas le protocole. Échoue si un scénario serveur est faux.
 */
import assert from "node:assert/strict";
import { handleWippApi } from "@/lib/messaging/handler";
import { getSql } from "@/lib/db";
import { subscribeLive } from "@/lib/messaging/message-live";
import { deriveChatKey, encryptText, generateBundle, makeE2eEnvelope } from "@/lib/crypto";
import { encodePlain } from "@/lib/messaging/plain";

if (process.env.DATABASE_URL?.trim()) {
  console.error("Refus: cette validation ne doit pas tourner sur DATABASE_URL.");
  process.exit(1);
}

const SECRET = "phrase-secrete-lot1-ne-doit-pas-fuir";
const CITE = "apercu-citation-secret-lot1";
const pushes: { title?: string; body?: string; data?: Record<string, unknown> }[] = [];

const origFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("exp.host")) {
    const payload = JSON.parse(String(init?.body ?? "[]")) as {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    }[];
    pushes.push(...payload);
    return new Response(JSON.stringify({ data: payload.map(() => ({ status: "ok" })) }), { status: 200 });
  }
  return origFetch(input, init);
}) as typeof fetch;

type Session = { token: string; profile: { id: string; username: string } };
type Msg = {
  id: string;
  senderId: string;
  body: string;
  replyTo?: string | null;
  editedAt?: number | null;
  deletedAt?: number | null;
  pinnedAt?: number | null;
  deliveredAt?: number | null;
  readAt?: number | null;
  reactions?: { profileId: string; emoji: string }[];
};

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

async function register(username: string): Promise<Session> {
  const res = await api("POST", "register", undefined, {
    username,
    password: "secret-pass",
    displayName: username,
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data as unknown as Session;
}

function results(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  if (!ok) failures.push(name);
}

const failures: string[] = [];

async function main() {
  const stamp = Date.now().toString(36);
  const a = await register(`lota${stamp}`);
  const b = await register(`lotb${stamp}`);
  const c = await register(`lotc${stamp}`);
  const opened = await api("POST", "chats", a.token, { peerUsername: b.profile.username });
  assert.equal(opened.status, 201, JSON.stringify(opened.data));
  const chat = (opened.data.chat as { id: string }).id;
  const other = await api("POST", "chats", a.token, { peerUsername: c.profile.username });
  const chatAC = (other.data.chat as { id: string }).id;

  const idA = await generateBundle();
  const idB = await generateBundle();
  const key = await deriveChatKey(idA, idB.publicJwk, chat);
  async function envelope(text: string, extra?: { reply?: { id: string; preview: string }; forwarded?: boolean }) {
    const plain = encodePlain({ text, reply: extra?.reply, forwarded: extra?.forwarded });
    const blob = await encryptText(key, plain);
    return JSON.stringify(makeE2eEnvelope(blob, idA.publicJwk));
  }

  const events: string[] = [];
  subscribeLive((ev) => {
    if (ev.chatId === chat) events.push(ev.kind);
  });

  const body1 = await envelope(SECRET);
  const sent = await api("POST", `chats/${chat}/messages`, a.token, { body: body1, clientId: `c1-${stamp}` });
  const m1 = (sent.data.message as Msg).id;
  let listA = await api("GET", `chats/${chat}/messages`, a.token);
  let row = ((listA.data.messages as Msg[]) ?? []).find((m) => m.id === m1);
  results("1 sending-sent", sent.status === 201 && row != null && !row.deliveredAt && !row.readAt, `status ${sent.status} delivered=${row?.deliveredAt ?? null}`);

  const del = await api("POST", `chats/${chat}/receipts`, b.token, { messageIds: [m1], kind: "delivered" });
  listA = await api("GET", `chats/${chat}/messages`, a.token);
  row = ((listA.data.messages as Msg[]) ?? []).find((m) => m.id === m1);
  results("1 delivered", del.status === 200 && Boolean(row?.deliveredAt) && !row?.readAt, `delivered=${row?.deliveredAt ?? null} read=${row?.readAt ?? null}`);

  const read = await api("POST", `chats/${chat}/receipts`, b.token, { messageIds: [m1], kind: "read" });
  listA = await api("GET", `chats/${chat}/messages`, a.token);
  row = ((listA.data.messages as Msg[]) ?? []).find((m) => m.id === m1);
  results("2 read", read.status === 200 && Boolean(row?.readAt), `read=${row?.readAt ?? null}`);

  const body2 = await envelope("second-secret");
  const sent2 = await api("POST", `chats/${chat}/messages`, a.token, { body: body2, clientId: `c2-${stamp}` });
  const m2 = (sent2.data.message as Msg).id;
  await api("POST", `chats/${chat}/receipts`, b.token, { messageIds: [m2], kind: "delivered" });
  listA = await api("GET", `chats/${chat}/messages`, a.token);
  row = ((listA.data.messages as Msg[]) ?? []).find((m) => m.id === m2);
  results("3 no read when receipts off", Boolean(row?.deliveredAt) && !row?.readAt, `read=${row?.readAt ?? null}`);

  const replyBody = await envelope("reponse", { reply: { id: m1, preview: CITE } });
  const replied = await api("POST", `chats/${chat}/messages`, a.token, {
    body: replyBody,
    clientId: `c3-${stamp}`,
    replyTo: m1,
  });
  const m3 = (replied.data.message as Msg).id;
  const listB = await api("GET", `chats/${chat}/messages`, b.token);
  const replyRow = ((listB.data.messages as Msg[]) ?? []).find((m) => m.id === m3);
  results("4 reply ref", replied.status === 201 && replyRow?.replyTo === m1 && !String(replyRow.body).includes(CITE) && !String(replyRow.body).includes(SECRET), `replyTo=${replyRow?.replyTo}`);

  const badReply = await api("POST", `chats/${chatAC}/messages`, a.token, {
    body: await envelope("x"),
    clientId: `bad-${stamp}`,
    replyTo: m1,
  });
  results("reply cross-chat blocked", badReply.status === 400, `status ${badReply.status}`);

  const react = await api("POST", `chats/${chat}/messages/${m1}/reaction`, b.token, { emoji: "❤️" });
  const react2 = await api("POST", `chats/${chat}/messages/${m1}/reaction`, b.token, { emoji: "😂" });
  const react3 = await api("POST", `chats/${chat}/messages/${m1}/reaction`, b.token, { emoji: "😂" });
  listA = await api("GET", `chats/${chat}/messages`, a.token);
  row = ((listA.data.messages as Msg[]) ?? []).find((m) => m.id === m1);
  const emojis = (row?.reactions ?? []).map((r) => r.emoji);
  results("7 reaction add-change-remove", react.status === 200 && react2.status === 200 && react3.status === 200 && emojis.length === 0, emojis.join(","));

  const editedBody = await envelope("texte-modifie-secret");
  const edited = await api("POST", `chats/${chat}/messages/${m2}/edit`, a.token, { body: editedBody });
  listB.data.messages = ((await api("GET", `chats/${chat}/messages`, b.token)).data.messages as Msg[]);
  const editedRow = (listB.data.messages as Msg[]).find((m) => m.id === m2);
  results("8 edit", edited.status === 200 && Boolean(editedRow?.editedAt) && !String(editedRow?.body).includes("texte-modifie-secret"), `editedAt=${editedRow?.editedAt}`);

  const sql = await getSql();
  await sql`update wipp_messages set created_at = now() - interval '16 minutes' where id = ${m2}`;
  const late = await api("POST", `chats/${chat}/messages/${m2}/edit`, a.token, { body: editedBody });
  results("9 edit window", late.status === 409, `status ${late.status} ${(late.data as { error?: string }).error}`);

  const hide = await api("POST", `chats/${chat}/messages/${m1}/hide`, a.token);
  const aAfterHide = ((await api("GET", `chats/${chat}/messages`, a.token)).data.messages as Msg[]).some((m) => m.id === m1);
  const bAfterHide = ((await api("GET", `chats/${chat}/messages`, b.token)).data.messages as Msg[]).some((m) => m.id === m1);
  results("10 delete for me", hide.status === 200 && !aAfterHide && bAfterHide, `Asees=${aAfterHide} Bsees=${bAfterHide}`);

  const tomb = await api("POST", `chats/${chat}/messages/${m3}/tombstone`, a.token);
  const tombA = ((await api("GET", `chats/${chat}/messages`, a.token)).data.messages as Msg[]).find((m) => m.id === m3);
  const tombB = ((await api("GET", `chats/${chat}/messages`, b.token)).data.messages as Msg[]).find((m) => m.id === m3);
  results(
    "11 tombstone",
    tomb.status === 200 && tombA?.body === '{"tombstone":true}' && tombB?.body === '{"tombstone":true}' && Boolean(tombA?.deletedAt),
    tombA?.body ?? "",
  );

  const pin = await api("POST", `chats/${chat}/messages/${m2}/pin`, a.token, { pinned: true });
  const pinB = ((await api("GET", `chats/${chat}/messages`, b.token)).data.messages as Msg[]).find((m) => m.id === m2);
  const unpin = await api("POST", `chats/${chat}/messages/${m2}/pin`, b.token, { pinned: false });
  const pinA = ((await api("GET", `chats/${chat}/messages`, a.token)).data.messages as Msg[]).find((m) => m.id === m2);
  results("12 pin", pin.status === 200 && Boolean(pinB?.pinnedAt) && unpin.status === 200 && !pinA?.pinnedAt, `pinnedAfter=${pinA?.pinnedAt ?? null}`);

  const fwd = await envelope("contenu-transfere-secret", { forwarded: true });
  const forwarded = await api("POST", `chats/${chatAC}/messages`, a.token, { body: fwd, clientId: `fwd-${stamp}` });
  const fwdRow = forwarded.data.message as Msg;
  results("13 forward new ciphertext", forwarded.status === 201 && fwdRow.id !== m2 && !fwdRow.body.includes("contenu-transfere-secret") && fwdRow.body !== body2, `id ${fwdRow?.id}`);

  pushes.length = 0;
  await api("POST", "devices/push", b.token, { token: "ExponentPushToken[lot1]", platform: "android", kind: "expo" });
  await api("POST", `chats/${chat}/focus`, b.token, { active: false });
  const typing = await api("POST", `chats/${chat}/typing`, a.token, { active: true });
  const typingTables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name ilike '%typing%'
  `;
  results("14 typing no row", typing.status === 200 && events.includes("typing") && typingTables.length === 0, `events=${events.join(",")}`);
  await api("POST", `chats/${chat}/typing`, a.token, { active: false });

  pushes.length = 0;
  await api("POST", `chats/${chat}/messages`, a.token, { body: await envelope("push-secret"), clientId: `push-${stamp}`, vault: false });
  const normalPush = pushes[0];
  results(
    "15 push metadata only",
    Boolean(normalPush) && normalPush?.body === "Nouveau message" && !JSON.stringify(normalPush).includes("push-secret") && !JSON.stringify(normalPush).includes(SECRET),
    JSON.stringify(normalPush ?? null),
  );

  pushes.length = 0;
  await api("POST", `chats/${chat}/focus`, b.token, { active: true });
  await api("POST", `chats/${chat}/messages`, a.token, { body: await envelope("focus-secret"), clientId: `focus-${stamp}` });
  results("16 no push when focused", pushes.length === 0, `pushes=${pushes.length}`);

  pushes.length = 0;
  await api("POST", `chats/${chat}/focus`, b.token, { active: false });
  await api("POST", `chats/${chat}/messages`, a.token, {
    body: await envelope("vault-secret"),
    clientId: `vault-${stamp}`,
    vault: true,
  });
  const vaultPush = pushes[0];
  results(
    "17 private push",
    vaultPush?.title === "WIPP" && vaultPush.body === "Nouveau message" && vaultPush.data?.private === true && !JSON.stringify(vaultPush).includes(a.profile.username),
    JSON.stringify(vaultPush ?? null),
  );

  const dup = await api("POST", `chats/${chat}/messages`, a.token, { body: body1, clientId: `c1-${stamp}` });
  const count = await sql<{ c: number }>`select count(*)::int as c from wipp_messages where client_id = ${`c1-${stamp}`}`;
  results("19 idempotent no duplicate", dup.status === 201 && Number(count[0]?.c) === 1, `count=${count[0]?.c}`);

  const forgeEdit = await api("POST", `chats/${chat}/messages/${m2}/edit`, b.token, { body: await envelope("pirate") });
  const forgeDel = await api("POST", `chats/${chat}/messages/${m2}/tombstone`, b.token);
  const outsider = await api("POST", `chats/${chat}/messages/${m2}/reaction`, c.token, { emoji: "👍" });
  const outsiderPin = await api("POST", `chats/${chat}/messages/${m2}/pin`, c.token, { pinned: true });
  const outsiderReceipt = await api("POST", `chats/${chat}/receipts`, c.token, { messageIds: [m2], kind: "read" });
  results(
    "RLS api member",
    forgeEdit.status === 403 && forgeDel.status === 403 && outsider.status === 403 && outsiderPin.status === 403 && outsiderReceipt.status === 403,
    `edit=${forgeEdit.status} del=${forgeDel.status} react=${outsider.status} pin=${outsiderPin.status} rcpt=${outsiderReceipt.status}`,
  );

  const blobs = await sql<{ body: string | null }>`
    select body from wipp_messages
    union all
    select emoji from wipp_reactions
  `;
  const leaked = blobs.some((r) =>
    String(r.body ?? "").includes(SECRET) ||
    String(r.body ?? "").includes(CITE) ||
    String(r.body ?? "").includes("contenu-transfere-secret") ||
    String(r.body ?? "").includes("texte-modifie-secret"),
  );
  results("plaintext absent", !leaked, leaked ? "fuite" : "aucune fuite");

  await sql`create role wipp_anon nologin`;
  await sql`grant usage on schema public to wipp_anon`;
  await sql`grant select, insert, update, delete on wipp_messages, wipp_reactions, wipp_receipts, wipp_message_hides to wipp_anon`;
  await sql`set role wipp_anon`;
  const anonRows = await sql`select body from wipp_messages limit 5`;
  await sql`update wipp_messages set body = 'pirate' where id = ${m2}`;
  await sql`reset role`;
  const still = await sql<{ body: string }>`select body from wipp_messages where id = ${m2}`;
  results(
    "RLS direct role",
    anonRows.length === 0 && !String(still[0]?.body).includes("pirate"),
    `rows=${anonRows.length} bodyUntouched=${!String(still[0]?.body).includes("pirate")}`,
  );

  console.log(failures.length ? `FAILED ${failures.join(", ")}` : "ALL_SERVER_PASS");
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
