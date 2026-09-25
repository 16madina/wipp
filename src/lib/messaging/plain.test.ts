import assert from "node:assert/strict";
import test from "node:test";
import { citePreview, decodePlain, encodePlain } from "./plain.ts";

test("plain text stays a raw string", () => {
  assert.equal(encodePlain({ text: "salut" }), "salut");
  assert.deepEqual(decodePlain("salut"), { text: "salut" });
});

test("reply preview stays inside the encrypted payload", () => {
  const wire = encodePlain({
    text: "d'accord",
    reply: { id: "m1", preview: citePreview("bonjour   ami"), senderId: "u1" },
  });
  const back = decodePlain(wire);
  assert.equal(back.text, "d'accord");
  assert.equal(back.reply?.id, "m1");
  assert.equal(back.reply?.preview, "bonjour ami");
});
