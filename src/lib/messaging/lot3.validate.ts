/**
 * Validation lot 3. Refus si DATABASE_URL est défini.
 */
import assert from "node:assert/strict";
import { handleWippApi } from "@/lib/messaging/handler";
import { getSql } from "@/lib/db";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { decryptChunk, encryptChunk, newFileKey } from "@/lib/messaging/media-crypto";
import { sealForModeration } from "@/lib/messaging/report-seal";

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

function b64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

async function main() {
  const key = newFileKey();
  const a1 = encryptChunk(key, "att-test", 0, new TextEncoder().encode("photo-secrete"));
  const a2 = encryptChunk(key, "att-test", 0, new TextEncoder().encode("photo-secrete"));
  results("nonce unique", a1.iv !== a2.iv, `${a1.iv} ${a2.iv}`);
  const plain = decryptChunk(key, "att-test", a1);
  results("gcm decrypt", new TextDecoder().decode(plain) === "photo-secrete", "ok");
  let aadFail = false;
  try {
    decryptChunk(key, "att-test", { ...a1, index: 1 });
  } catch {
    aadFail = true;
  }
  results("aad lie l'index", aadFail, aadFail ? "rejet" : "accepte");
  let hashFail = false;
  try {
    decryptChunk(key, "att-test", { ...a1, sha256: "00" });
  } catch {
    hashFail = true;
  }
  results("sha precoce", hashFail, hashFail ? "rejet" : "accepte");
  const tampered = new Uint8Array(a1.ciphertext);
  tampered[0] ^= 1;
  let gcmFail = false;
  try {
    decryptChunk(key, "att-test", { ...a1, ciphertext: tampered, sha256: bytesToHex(sha256(tampered)) });
  } catch {
    gcmFail = true;
  }
  results("tag gcm", gcmFail, gcmFail ? "rejet" : "accepte");

  const stamp = Date.now().toString(36);
  const userA = `l3a${stamp}`.slice(0, 20);
  const userB = `l3b${stamp}`.slice(0, 20);
  const regA = await api("POST", "register", undefined, { username: userA, password: "secret-pass", displayName: "A" });
  const regB = await api("POST", "register", undefined, { username: userB, password: "secret-pass", displayName: "B" });
  const tokenA = (regA.data as { token: string }).token;
  const tokenB = (regB.data as { token: string }).token;
  const idA = (regA.data as { profile: { id: string } }).profile.id;
  const idB = (regB.data as { profile: { id: string } }).profile.id;
  const opened = await api("POST", "chats", tokenA, { peerUsername: userB });
  const chat = (opened.data.chat as { id: string }).id;

  const secretName = `nom-secret-${stamp}.pdf`;
  const created = await api("POST", `chats/${chat}/attachments`, tokenA, {
    chunkCount: 1,
    byteSize: 12,
    viewOnce: true,
  });
  const att = (created.data as { id: string }).id;
  const chunk = encryptChunk(newFileKey(), att, 0, new TextEncoder().encode("bytes-vocaux"));
  const put = await api("PUT", `attachments/${att}/chunks/0`, tokenA, {
    ciphertext: b64(chunk.ciphertext),
    sha256: chunk.sha256,
  });
  const again = await api("PUT", `attachments/${att}/chunks/0`, tokenA, {
    ciphertext: b64(chunk.ciphertext),
    sha256: chunk.sha256,
  });
  results("upload ciphertext", created.status === 201 && put.status === 200 && again.status === 200, `${created.status}/${put.status}`);
  const done = await api("POST", `attachments/${att}/complete`, tokenA, {});
  results("attachment disponible", done.status === 200, String(done.status));

  const readB = await api("GET", `attachments/${att}/chunks/0`, tokenB);
  const readA = await api("GET", `attachments/${att}/chunks/0`, tokenA);
  results("claim atomique", readB.status === 200 && readA.status === 409, `B=${readB.status} A=${readA.status}`);
  const consumed = await api("POST", `attachments/${att}/consume`, tokenB);
  const after = await api("GET", `attachments/${att}/chunks/0`, tokenB);
  const sql = await getSql();
  const left = await sql<{ c: number }>`select count(*)::int as c from wipp_attachment_chunks where attachment_id = ${att}`;
  results("consomme supprime", consumed.status === 200 && after.status === 410 && Number(left[0]?.c) === 0, `after=${after.status} chunks=${left[0]?.c}`);

  const sqlRows = await sql<{ ciphertext_b64: string }>`
    select ciphertext_b64 from wipp_attachment_chunks where ciphertext_b64 like ${"%" + secretName + "%"}
  `;
  const bodies = await sql<{ body: string }>`
    select body from wipp_messages where body like ${"%" + secretName + "%"} or body like ${"%bytes-vocaux%"}
  `;
  results("pas de clair", sqlRows.length === 0 && bodies.length === 0, `files=${sqlRows.length} bodies=${bodies.length}`);

  const disappear = await api("POST", `chats/${chat}/disappear`, tokenA, { ms: 86_400_000 });
  const sent = await api("POST", `chats/${chat}/messages`, tokenA, { body: "enveloppe-e2e", clientId: `e-${stamp}` });
  const msgId = (sent.data.message as { id: string }).id;
  await sql`update wipp_messages set expires_at = now() - interval '1 minute' where id = ${msgId}`;
  const listed = await api("GET", `chats/${chat}/messages`, tokenB);
  const body = ((listed.data.messages as { id: string; body: string }[]) ?? []).find((m) => m.id === msgId)?.body;
  results("ephemere", disappear.status === 200 && body === '{"tombstone":true}', body ?? "absent");

  const orphan = await api("POST", `chats/${chat}/attachments`, tokenA, { chunkCount: 1, byteSize: 4, viewOnce: false });
  const orphanId = (orphan.data as { id: string }).id;
  await sql`update wipp_attachments set created_at = now() - interval '25 hours' where id = ${orphanId}`;
  await api("GET", `chats/${chat}/messages`, tokenA);
  const orphanLeft = await sql`select 1 from wipp_attachments where id = ${orphanId}`;
  results("sweep abandon", orphanLeft.length === 0, `left=${orphanLeft.length}`);

  const pub = await api("GET", "moderation/key", tokenA);
  const publicJwk = (pub.data as { publicJwk: JsonWebKey }).publicJwk;
  results("cle moderation publique", pub.status === 200 && !("d" in (publicJwk ?? {})), String(pub.status));
  const sealed = await sealForModeration("copie-volontaire-unique", publicJwk);
  const report = await api("POST", "reports", tokenA, {
    chatId: chat,
    messageId: msgId,
    reason: "abus",
    sealedPayload: sealed,
  });
  const flagId = (report.data as { id: string }).id;
  const denied = await api("POST", `admin/flags/${flagId}/open`, tokenB);
  await sql`update wipp_profiles set role = 'admin' where id = ${idA}`;
  const openedFlag = await api("POST", `admin/flags/${flagId}/open`, tokenA);
  const access = await sql<{ c: number }>`select count(*)::int as c from wipp_moderation_access where flag_id = ${flagId}`;
  results(
    "signalement scelle",
    report.status === 201 && denied.status === 403 && (openedFlag.data as { text?: string }).text === "copie-volontaire-unique" && Number(access[0]?.c) === 1,
    `rep=${report.status} deny=${denied.status}`,
  );
  results("pas le fil", !("messages" in openedFlag.data), Object.keys(openedFlag.data).join(","));

  await api("POST", "blocks", tokenA, { profileId: idB });
  const sendBlocked = await api("POST", `chats/${chat}/messages`, tokenB, { body: "non", clientId: `b-${stamp}` });
  const dmBlocked = await api("POST", "chats", tokenB, { peerUsername: userA });
  const attBlocked = await api("POST", `chats/${chat}/attachments`, tokenB, { chunkCount: 1, byteSize: 8 });
  const callBlocked = await api("POST", "calls/invite", tokenB, { peerId: idA, kind: "audio" });
  const reactBlocked = await api("POST", `chats/${chat}/messages/${msgId}/reaction`, tokenB, { emoji: "👍" });
  await api("POST", "devices/push", tokenA, { token: "ExponentPushToken[lot3]", platform: "android", kind: "expo" });
  pushes.length = 0;
  const sendA = await api("POST", `chats/${chat}/messages`, tokenA, { body: "non-plus", clientId: `a-${stamp}` });
  results(
    "blocage routes",
    sendBlocked.status === 403 && dmBlocked.status === 403 && attBlocked.status === 403 && callBlocked.status === 403 && reactBlocked.status === 403 && sendA.status === 403 && pushes.length === 0,
    `send=${sendBlocked.status} dm=${dmBlocked.status} att=${attBlocked.status} call=${callBlocked.status} react=${reactBlocked.status} push=${pushes.length}`,
  );

  if (failures.length) {
    console.log(`FAIL ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("ALL_LOT3_PASS");
}

void main();
