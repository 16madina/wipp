import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bytesToToken,
  distinguishCandidates,
  extractTokenFromAdv,
  isOpaqueToken,
  median,
  normalizeToken,
  passesRssiMin,
  TOUCH_BUMP_DEFAULTS,
} from "./logic";

test("opaque token rejects PII-looking payloads", () => {
  assert.equal(normalizeToken("user@wipp.app"), null);
  assert.equal(normalizeToken("auth_user_id"), null);
  assert.equal(isOpaqueToken("AB3K7Q2M"), true);
  assert.equal(normalizeToken("ab3k7q2m"), "AB3K7Q2M");
});

test("BLE service data extracts 8-char token only", () => {
  const token = "AB3K7Q2M";
  const b64 = Buffer.from(token, "ascii").toString("base64");
  assert.equal(extractTokenFromAdv({ serviceDataBase64: b64 }), token);
  assert.equal(extractTokenFromAdv({ localName: token }), token);
  assert.equal(extractTokenFromAdv({ localName: "+15145551212" }), null);
});

test("RSSI min filter uses backend-style threshold", () => {
  assert.equal(passesRssiMin([-40, -42, -41], -55), true);
  assert.equal(passesRssiMin([-80, -82, -79], -55), false);
  assert.equal(median([-40, -50, -42]), -42);
});

test("multiple devices when RSSI gap is too small", () => {
  const now = Date.now();
  const cfg = { rssiMinDbm: -55, rssiGapDb: 8 };
  const a = { token: "AAAAAAAA", rssi: -40, rssiSamples: [-40, -41], lastSeen: now };
  const b = { token: "BBBBBBBB", rssi: -42, rssiSamples: [-42, -43], lastSeen: now };
  const r = distinguishCandidates([a, b], cfg, now);
  assert.equal(r.distinction, "multiple");
  assert.equal(r.winner, null);
});

test("single winner when RSSI gap is large enough", () => {
  const now = Date.now();
  const cfg = { rssiMinDbm: -55, rssiGapDb: 8 };
  const a = { token: "AAAAAAAA", rssi: -36, rssiSamples: [-36, -37], lastSeen: now };
  const b = { token: "BBBBBBBB", rssi: -50, rssiSamples: [-50, -51], lastSeen: now };
  const r = distinguishCandidates([a, b], cfg, now);
  assert.equal(r.distinction, "single");
  assert.equal(r.winner?.token, "AAAAAAAA");
});

test("bytesToToken skips manufacturer company id", () => {
  const payload = Buffer.from([0x4c, 0x00, ...Buffer.from("AB3K7Q2M")]).toString("base64");
  assert.equal(bytesToToken(payload, { skipCompanyId: true }), "AB3K7Q2M");
});

test("defaults match wipp_touch_config bump keys", () => {
  assert.equal(TOUCH_BUMP_DEFAULTS.rssiMinDbm, -55);
  assert.equal(TOUCH_BUMP_DEFAULTS.rssiGapDb, 8);
  assert.equal(TOUCH_BUMP_DEFAULTS.shockGThreshold, 2.2);
  assert.equal(TOUCH_BUMP_DEFAULTS.shockMaxDurationMs, 120);
  assert.equal(TOUCH_BUMP_DEFAULTS.calibrationLog, false);
});
