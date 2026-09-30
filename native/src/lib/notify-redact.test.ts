import assert from "node:assert/strict";
import { test } from "node:test";
import { PRIVATE_NOTICE_BODY, PRIVATE_NOTICE_TITLE, redactNotification } from "./notify-redact.ts";

test("private chat never leaks sender or text", () => {
  const out = redactNotification(
    {
      title: "Maya",
      body: "Voici mon adresse 12 rue X",
      avatar: "https://cdn.example/maya.jpg",
      chatId: "srv:abc",
    },
    true,
  );
  assert.equal(out.title, PRIVATE_NOTICE_TITLE);
  assert.equal(out.body, PRIVATE_NOTICE_BODY);
  assert.equal(out.avatar, undefined);
  assert.ok(!JSON.stringify(out).includes("Maya"));
  assert.ok(!JSON.stringify(out).includes("adresse"));
});

test("normal chat keeps payload", () => {
  const src = { title: "Alex", body: "Salut", avatar: "a.png", chatId: "srv:1" };
  assert.deepEqual(redactNotification(src, false), src);
});
