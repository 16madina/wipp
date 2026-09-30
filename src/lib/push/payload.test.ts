import assert from "node:assert/strict";
import { test } from "node:test";
import { assertNoSensitivePush, sanitizePushData } from "./payload.ts";

test("keeps routing keys only", () => {
  const out = sanitizePushData({
    type: "message",
    eventId: "m_1",
    chatId: "c_1",
    jwt: "eyJhbGciOi",
    body: "secret plaintext",
    phone: "+1555",
    firebase_uid: "abc",
    auth_user_id: "u1",
    code: "TOUCHCODE",
  });
  assert.equal(out.type, "message");
  assert.equal(out.eventId, "m_1");
  assert.equal(out.chatId, "c_1");
  assert.equal(out.body, undefined);
  assert.equal(out.jwt, undefined);
  assert.equal(out.phone, undefined);
  assert.equal(out.code, undefined);
});

test("private payload has no identity fields", () => {
  const data = sanitizePushData({
    type: "message",
    eventId: "m_2",
    chatId: "c_2",
    private: true,
  });
  assertNoSensitivePush(data, "WIPP", "Nouveau message");
  assert.equal(data.private, true);
  assert.ok(!("displayName" in data));
  assert.ok(!("avatar" in data));
});
