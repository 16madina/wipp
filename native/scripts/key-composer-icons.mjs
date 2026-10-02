// Removes the outer black background of the composer sticker icon (assets/composer/src/sticker.png),
// keeping the black glass inside the icon, then trims to a square transparent PNG.
// Usage: node scripts/key-composer-icons.mjs
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const dir = path.resolve(import.meta.dirname, "../assets/composer");
const HARD = 18;
const SOFT = 70;

for (const name of ["sticker"]) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, "src", `${name}.png`)));
  const { width: w, height: h, data } = png;
  const peak = (i) => Math.max(data[i], data[i + 1], data[i + 2]);
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const v = peak(p * 4);
    if (v >= SOFT) continue;
    seen[p] = 1;
    data[p * 4 + 3] = v <= HARD ? 0 : Math.round(((v - HARD) / (SOFT - HARD)) * 255);
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const side = Math.max(maxX - minX, maxY - minY) + 1;
  const out = new PNG({ width: side, height: side });
  out.data.fill(0);
  const ox = Math.floor((side - (maxX - minX + 1)) / 2);
  const oy = Math.floor((side - (maxY - minY + 1)) / 2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const s = (y * w + x) * 4;
      const d = ((y - minY + oy) * side + (x - minX + ox)) * 4;
      data.copy(out.data, d, s, s + 4);
    }
  }
  fs.writeFileSync(path.join(dir, `${name}.png`), PNG.sync.write(out));
  console.log(`${name}.png ${side}x${side}`);
}
