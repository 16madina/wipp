// Turns the green-screen Wippie clips (assets/wipp/stickers/**/x.mp4) into transparent animated WebP
// (public/wipp-media/stickers/wa/**/x.webp), with the same green key as the in-app player.
// An animated image is light enough for many Wippies to move at once; a video player per sticker is not.
// Usage (from native/): node scripts/convert-wippie-clips.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const src = fs.readFileSync("src/lib/stickers.ts", "utf8");
const rows = [...src.matchAll(/anim: "\/stickers\/((?:(?:lui|fun|fun2)\/)?[a-z0-9-]+)\.mp4(?:\?v=\d+)?"([^}]*)\}/g)];
const G = "g(X,Y)", M = "max(r(X,Y),b(X,Y))", L = `(${G}-${M})`;
const keyed = `gt(${G},48)*gt(${L},14)*gt(${G},(r(X,Y)+b(X,Y))*0.42)`;
const KEY = `format=rgba,geq=r='r(X,Y)':g='if(${keyed},${G},if(gt(${G},r(X,Y))*gt(${G},b(X,Y))*gt(${L},6),${M}+${L}*0.25,${G}))':b='b(X,Y)':a='if(${keyed},255*max(0,1-min(1,${L}/36)*1.35),255)'`;
let total = 0;
for (const [, rel, rest] of rows) {
  const soft = /loopSoft/.test(rest);
  const input = `assets/wipp/stickers/${rel}.mp4`;
  const out = `../public/wipp-media/stickers/wa/${rel}.webp`;
  if (!fs.existsSync(input)) { console.log("MANQUE", input); continue; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wippie-"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const cut = soft ? [] : ["-t", "3.05"];
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", input, ...cut, "-an", "-vf", `fps=15,scale=256:256,${KEY}`, path.join(tmp, "f%03d.png")]);
  const frames = fs.readdirSync(tmp).sort().map((f) => path.join(tmp, f));
  execFileSync("img2webp", ["-loop", "0", "-lossy", "-q", "62", "-m", "4", "-d", soft ? "72" : "67", ...frames, "-o", out], { stdio: "ignore" });
  fs.rmSync(tmp, { recursive: true, force: true });
  const kb = Math.round(fs.statSync(out).size / 1024);
  total += kb;
  console.log(rel, frames.length, "images", kb, "Ko");
}
console.log("clips:", rows.length, "total:", Math.round(total / 1024), "Mo");
