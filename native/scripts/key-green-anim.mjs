#!/usr/bin/env node
/**
 * Green-screen → transparent WebP for WIPP surprise animations.
 *
 * Samples the four corners of the first frame for the key color, then
 * colorkey + despill so the character sits on the chat, not on a green plate.
 *
 *   node scripts/key-green-anim.mjs input.mp4 --out assets/wipp/fx/surprise/anims/amour-foo.webp
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

const input = process.argv[2];
const ffmpeg = process.env.WIPP_FFMPEG || "ffmpeg";
const ffprobe = process.env.WIPP_FFPROBE || "ffprobe";
if (!input || input.startsWith("-")) {
  console.error("usage: node scripts/key-green-anim.mjs <green.mp4> --out <file.webp>");
  process.exit(1);
}

const out = arg("--out", path.join("assets/wipp/fx/surprise/anims", `${path.parse(input).name}.webp`));
const similarity = arg("--similarity", "0.22");
const blend = arg("--blend", "0.1");
const size = arg("--size", "720");
const fps = arg("--fps", "16");
const quality = arg("--q", "58");
const effort = arg("--effort", "4");
const posterAt = arg("--poster-at", "0");
const tmp = fs.mkdtempSync("/tmp/wipp-chroma-");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`${cmd} ${args[0]} failed`);
  }
  return r;
}

function sampleCorner(x, y) {
  const raw = path.join(tmp, `c-${x}-${y}.rgb`);
  run(ffmpeg, [
    "-y",
    "-i",
    input,
    "-vframes",
    "1",
    "-vf",
    `crop=20:20:${x}:${y}`,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    raw,
  ]);
  const buf = fs.readFileSync(raw);
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i + 2 < buf.length; i += 3) {
    r += buf[i];
    g += buf[i + 1];
    b += buf[i + 2];
    n++;
  }
  return { r: r / n, g: g / n, b: b / n };
}

const probe = run(ffprobe, [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=width,height,duration",
  "-of",
  "csv=p=0",
  input,
]);
const [width, height] = probe.stdout.trim().split(",").map((n) => Number.parseFloat(n) || 0);
const mx = Math.max(0, Math.floor((width || 512) - 28));
const my = Math.max(0, Math.floor((height || 512) - 28));
const corners = [sampleCorner(8, 8), sampleCorner(mx, 8), sampleCorner(8, my), sampleCorner(mx, my)];
const key = {
  r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
  g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
  b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
};
const hex = ((1 << 24) + (key.r << 16) + (key.g << 8) + key.b).toString(16).slice(1);
console.log(`key #${hex} from corners`, corners.map((c) => [Math.round(c.r), Math.round(c.g), Math.round(c.b)]));

fs.mkdirSync(path.dirname(out), { recursive: true });
run(ffmpeg, [
  "-y",
  "-i",
  input,
  "-vf",
  `colorkey=0x${hex}:${similarity}:${blend},despill=type=green:mix=0.45:expand=0,format=rgba,fps=${fps},scale=${size}:-1:flags=lanczos`,
  "-c:v",
  "libwebp",
  "-lossless",
  "0",
  "-compression_level",
  effort,
  "-q:v",
  quality,
  "-loop",
  "1",
  "-an",
  out,
]);

const poster = out.replace(/\.webp$/i, ".png");
run(ffmpeg, [
  "-y",
  "-ss",
  posterAt,
  "-i",
  input,
  "-vframes",
  "1",
  "-update",
  "1",
  "-vf",
  `colorkey=0x${hex}:${similarity}:${blend},despill=type=green:mix=0.45:expand=0,format=rgba,scale=${size}:-1:flags=lanczos`,
  poster,
]);

// ffmpeg writes an opaque white canvas. Mojis use a transparent one, otherwise the chat shows a plate.
const webp = fs.readFileSync(out);
let cursor = 12;
while (cursor + 8 < webp.length) {
  const tag = webp.toString("ascii", cursor, cursor + 4);
  const size = webp.readUInt32LE(cursor + 4);
  if (tag === "ANIM") {
    // Only clear BGRA; preserve the loop count (one playback).
    webp.fill(0, cursor + 8, cursor + 12);
    break;
  }
  cursor += 8 + size + (size & 1);
}
fs.writeFileSync(out, webp);

const dur = run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]);
console.log(`wrote ${out} poster ${poster} duration ${dur.stdout.trim()}s`);
fs.rmSync(tmp, { recursive: true, force: true });
