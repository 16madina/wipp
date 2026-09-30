import assert from "node:assert/strict";
import { test } from "node:test";
import { screenFromPushData, screenFromWippScheme } from "./router.ts";

test("message tap opens the conversation, not a second thread", () => {
  const s = screenFromPushData({ type: "message", chatId: "abc", eventId: "m1" });
  assert.deepEqual(s, { name: "conversation", chatId: "srv:abc" });
});

test("private flag does not change routing target", () => {
  const s = screenFromPushData({ type: "message", chatId: "srv:xyz", private: true, eventId: "m2" });
  assert.deepEqual(s, { name: "conversation", chatId: "srv:xyz" });
});

test("connection request opens Demandes", () => {
  assert.deepEqual(screenFromPushData({ type: "request", requestId: "r1", eventId: "r1" }), { name: "requests" });
});

test("touch opens incoming screen without embedding the code", () => {
  const s = screenFromPushData({ type: "touch", inviteId: "inv1", eventId: "inv1" });
  assert.deepEqual(s, { name: "touch-incoming" });
  assert.ok(!JSON.stringify(s).includes("code"));
});

test("group and story stay pending", () => {
  assert.equal(screenFromPushData({ type: "group", eventId: "g" }), null);
  assert.equal(screenFromPushData({ type: "story", eventId: "s" }), null);
});

test("wipp scheme internal routes", () => {
  assert.deepEqual(screenFromWippScheme("wipp://requests"), { name: "requests" });
  assert.deepEqual(screenFromWippScheme("wipp://touch"), { name: "touch-incoming" });
  assert.deepEqual(screenFromWippScheme("wipp://c/hello"), { name: "conversation", chatId: "srv:hello" });
});
