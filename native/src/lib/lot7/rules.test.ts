import assert from "node:assert/strict";
import test from "node:test";
import { actorMayChangeRoles, groupInFilter, groupPreview, storyReadable, STORY_SERVER_TTL_MS } from "./rules.ts";

const day = STORY_SERVER_TTL_MS;

test("story contacts are visible only to contacts and the author", () => {
  const base = { audience: "contacts" as const, deleted: false, expiresAt: 2_000, now: 1_000 };
  assert.equal(storyReadable({ ...base, author: true, contact: false }), true);
  assert.equal(storyReadable({ ...base, author: false, contact: true }), true);
  assert.equal(storyReadable({ ...base, author: false, contact: false }), false);
});

test("only me and close friends stay closed", () => {
  const base = { deleted: false, expiresAt: 2_000, now: 1_000, author: false, contact: true };
  assert.equal(storyReadable({ ...base, audience: "only_me" }), false);
  assert.equal(storyReadable({ ...base, audience: "close" }), false);
  assert.equal(storyReadable({ ...base, audience: "close", closeFriend: true }), true);
  assert.equal(storyReadable({ ...base, audience: "only_me", author: true }), true);
});

test("expired or deleted stories leave the feed", () => {
  assert.equal(
    storyReadable({ audience: "contacts", author: true, contact: true, deleted: false, expiresAt: 1_000, now: 1_000 }),
    false,
  );
  assert.equal(
    storyReadable({ audience: "contacts", author: true, contact: true, deleted: true, expiresAt: 5_000, now: 1_000 }),
    false,
  );
  assert.equal(day, 86_400_000);
});

test("a member cannot grant admin rights", () => {
  assert.equal(actorMayChangeRoles(false), false);
  assert.equal(actorMayChangeRoles(true), true);
});

test("group filter keeps groups out of personal and shops", () => {
  assert.equal(groupInFilter("all", "group", false), true);
  assert.equal(groupInFilter("groups", "group", false), true);
  assert.equal(groupInFilter("people", "group", false), false);
  assert.equal(groupInFilter("shops", "group", false), false);
  assert.equal(groupInFilter("people", "dm", false), true);
  assert.equal(groupInFilter("shops", "dm", true), true);
});

test("group media preview does not pretend the body is E2EE", () => {
  assert.equal(groupPreview(JSON.stringify({ k: "wipp-group-media", type: "image" })), "Photo");
  assert.equal(groupPreview("salut"), "salut");
  assert.equal(groupPreview("salut").includes("chiffr"), false);
});
