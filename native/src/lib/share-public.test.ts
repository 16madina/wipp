import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicWippUrl, isShareSafe } from "./share-safe.ts";

test("blocks JWT and secret labels", () => {
  assert.equal(
    isShareSafe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFBPJVAb77A"),
    false,
  );
  assert.equal(isShareSafe("auth_user_id=xyz"), false);
  assert.equal(isShareSafe("firebase_uid abc"), false);
  assert.equal(isShareSafe("Bearer abc.def"), false);
});

test("allows public WIPP profile and card links", () => {
  assert.equal(isShareSafe("@maya https://wippapp.com/@maya"), true);
  assert.equal(isPublicWippUrl("https://wippapp.com/@maya"), true);
  assert.equal(isPublicWippUrl("https://wippapp.com/b/salon"), true);
  assert.equal(isPublicWippUrl("https://evil.example/@maya"), false);
});
