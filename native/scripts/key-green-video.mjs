/** Green-dominance matte for Grok clips with uneven green lighting. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node scripts/key-green-video.mjs input.mp4 output.webp");
const ffmpeg = process.env.WIPP_FFMPEG || "ffmpeg";
const ffprobe = process.env.WIPP_FFPROBE || "ffprobe";
const width = 360;
const fps = 18;
function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `${binary} failed`);
  return result.stdout;
}
const stream = JSON.parse(run(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", input])).streams[0];
const height = Math.round((width * stream.height / stream.width) / 2) * 2;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "wipp-love-matte-"));
try {
  const raw = path.join(temp, "frames.rgba");
  run(ffmpeg, ["-v", "error", "-y", "-i", input, "-map", "0:v:0", "-vf", `fps=${fps},scale=${width}:${height}:flags=lanczos,format=rgba`, "-f", "rawvideo", raw]);
  const pixels = fs.readFileSync(raw);
  // Compare channels rather than one sampled RGB color: works across the
  // green gradient while retaining pink hearts, white sparkles and gold.
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const dominance = green - Math.max(red, blue);
    const key = Math.max(0, Math.min(1, (dominance - 4) / 24));
    const smooth = key * key * (3 - 2 * key);
    pixels[i + 3] = Math.round(255 * (1 - smooth));
    if (key > 0) pixels[i + 1] = Math.min(green, Math.max(red, blue));
  }
  fs.writeFileSync(raw, pixels);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const rawInput = ["-f", "rawvideo", "-pixel_format", "rgba", "-video_size", `${width}x${height}`, "-framerate", String(fps), "-i", raw];
  run(ffmpeg, ["-v", "error", "-y", ...rawInput, "-c:v", "libwebp_anim", "-lossless", "0", "-compression_level", "2", "-q:v", "64", "-loop", "1", "-an", output]);
  run(ffmpeg, ["-v", "error", "-y", ...rawInput, "-ss", "2.4", "-frames:v", "1", "-update", "1", output.replace(/\.webp$/, ".png")]);
  const webp = fs.readFileSync(output);
  for (let offset = 12; offset + 8 < webp.length;) {
    const size = webp.readUInt32LE(offset + 4);
    if (webp.toString("ascii", offset, offset + 4) === "ANIM") {
      webp.fill(0, offset + 8, offset + 12);
      webp.writeUInt16LE(1, offset + 12);
      break;
    }
    offset += 8 + size + (size & 1);
  }
  fs.writeFileSync(output, webp);
  console.log(JSON.stringify({ output, width, height, fps, frames: pixels.length / (width * height * 4), bytes: webp.length }));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
