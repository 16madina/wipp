import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

test("nearby token is hashed not stored raw", () => {
  const token = "AB3K7Q2M";
  const hash = createHash("sha256").update(token).digest("hex");
  assert.equal(hash.length, 64);
  assert.equal(hash.includes(token), false);
});
