import test from "node:test";
import assert from "node:assert/strict";
import * as P from "./project";

test("cut 10-20 s out of a 30 s video gives 20 s, two parts joined", () => {
  let p = P.createProject({ uri: "file:///a.mov", duration: 30 });
  p = P.splitAt(p, 10).project;
  const r = P.splitAt(p, 20);
  p = r.project;
  assert.equal(p.segments.length, 3);
  p = P.removeSegment(p, p.segments[1].id);
  assert.equal(P.totalDuration(p), 20);
  const spec = P.exportSpec(p);
  assert.deepEqual(spec.segments.map((s) => [s.start, s.end]), [[0, 10], [20, 30]]);
  assert.equal(P.locate(p, 12)!.sourceTime, 22);
});

test("volume per segment stays independent", () => {
  let p = P.createProject({ uri: "a", duration: 30 });
  p = P.splitAt(p, 10).project;
  p = P.splitAt(p, 20).project;
  p = P.updateSegment(p, p.segments[0].id, { volume: 0 });
  p = P.updateSegment(p, p.segments[2].id, { volume: 0.4 });
  assert.deepEqual(P.exportSpec(p).segments.map((s) => s.volume), [0, 1, 0.4]);
});

test("two sources, reorder, undo / redo", () => {
  let h = P.historyOf(P.createProject({ uri: "a", duration: 12 }));
  h = P.commit(h, P.addSource(h.present, { uri: "b", duration: 8 }));
  h = P.commit(h, P.moveSegment(h.present, h.present.segments[1].id, -1));
  assert.deepEqual(P.exportSpec(h.present).segments.map((s) => s.uri), ["b", "a"]);
  h = P.undo(h);
  assert.deepEqual(P.exportSpec(h.present).segments.map((s) => s.uri), ["a", "b"]);
  h = P.redo(h);
  assert.equal(P.exportSpec(h.present).segments[0].uri, "b");
  assert.equal(P.addSource(h.present, { uri: "c", duration: 3 }), h.present);
});

test("text timing and speed", () => {
  let p = P.createProject({ uri: "a", duration: 20 });
  const t = P.addText(p, 4, { text: "Bisous", size: 0.08, color: "#fff", style: "box", font: "classic", bold: true, shadow: false, align: "center", rot: 0, anim: "pop" });
  p = t.project;
  assert.deepEqual([p.texts[0].from, p.texts[0].to], [4, 7]);
  p = P.updateSegment(p, p.segments[0].id, { speed: 2 });
  assert.equal(P.totalDuration(p), 10);
});

test("animation curves end at rest", () => {
  for (const a of P.STUDIO_ANIMS) {
    const end = P.animAt(a, P.ANIM_SEC);
    assert.ok(Math.abs(end.opacity - 1) < 1e-6 && Math.abs(end.scale - 1) < 1e-6 && Math.abs(end.dy) < 1e-6, a);
  }
});
