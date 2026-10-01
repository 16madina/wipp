import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callPushData,
  directTokenAllowed,
  groupObjectPath,
  groupTokenAllowed,
  historyOutcome,
  isPrivateStoragePath,
  storyObjectPath,
} from "./rules.ts";

test("story and group paths are audience-scoped folders", () => {
  assert.equal(storyObjectPath("user_abcd", "styup_1234"), "stories/user_abcd/styup_1234");
  assert.equal(groupObjectPath("srv:g_abcd1234", "msg_abcd"), "groups/g_abcd1234/msg_abcd");
  assert.equal(isPrivateStoragePath("groups/g_abcd1234/msg_abcd"), true);
  assert.equal(isPrivateStoragePath("https://cdn.example/x"), false);
  assert.throws(() => storyObjectPath("../x", "styup_1234"));
});

test("tokens are refused for expired, declined and ringing callees", () => {
  assert.equal(directTokenAllowed("accepted", false), true);
  assert.equal(directTokenAllowed("accepted", true), false);
  assert.equal(directTokenAllowed("ringing", false), false);
  assert.equal(directTokenAllowed("missed", false), false);
  assert.equal(groupTokenAllowed("accepted", "joined", false), true);
  assert.equal(groupTokenAllowed("ringing", "joining", false), true);
  assert.equal(groupTokenAllowed("ringing", "ringing", false), false);
  assert.equal(groupTokenAllowed("accepted", "declined", false), false);
  assert.equal(groupTokenAllowed("accepted", "left", false), false);
  assert.equal(groupTokenAllowed("ended", "joined", false), false);
});

test("call push carries only a routing id", () => {
  const data = callPushData("call_abc", true, "g_abcd1234");
  const blob = JSON.stringify(data);
  assert.equal(data.type, "call");
  assert.equal(data.eventId, "call_abc");
  assert.ok(!blob.includes("room"));
  assert.ok(!blob.toLowerCase().includes("token"));
  assert.ok(!blob.includes("phone"));
  assert.equal(historyOutcome("rejected"), "declined");
  assert.equal(historyOutcome("missed"), "missed");
});
