import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVerifier,
  lockRemaining,
  nextLock,
  verifierMatches,
  waitForFails,
} from "./private-crypto.ts";

test("PIN hash is not plaintext and verifies", () => {
  const v = createVerifier("2468");
  assert.notEqual(v.hash, "2468");
  assert.ok(!v.hash.includes("2468"));
  assert.equal(v.salt.length, 32);
  assert.equal(verifierMatches("2468", v), true);
  assert.equal(verifierMatches("0000", v), false);
});

test("short PIN is rejected", () => {
  assert.throws(() => createVerifier("12"), /short/);
});

test("rate-limit wait grows then caps", () => {
  assert.equal(waitForFails(0), 0);
  assert.equal(waitForFails(1), 1_000);
  assert.equal(waitForFails(6), 60_000);
  assert.equal(waitForFails(99), 60_000);
  const now = 1_000_000;
  const lock = nextLock({ fails: 2, until: 0 }, now);
  assert.equal(lock.fails, 3);
  assert.equal(lockRemaining(lock, now), 5_000);
  assert.equal(lockRemaining(lock, now + 5_000), 0);
});
