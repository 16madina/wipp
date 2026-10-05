import fs from "node:fs";
import path from "node:path";

const root = path.resolve("assets/wipp");
const raster = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const files = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (raster.has(path.extname(ent.name).toLowerCase())) {
      files.push(path.relative(root, p).replaceAll("\\", "/"));
    }
  }
}

walk(root);
files.sort();

const rank = { ".png": 0, ".jpg": 1, ".jpeg": 2, ".webp": 3, ".gif": 4 };
const preferred = new Map();
for (const rel of files) {
  const base = rel.replace(/\.[^.]+$/, "");
  const current = preferred.get(base);
  if (!current || rank[path.extname(rel).toLowerCase()] < rank[path.extname(current).toLowerCase()]) {
    preferred.set(base, rel);
  }
}

const lines = files.map((rel) => {
  // One file per base name: Android merges bundled images by name without extension,
  // so requiring both x.jpg and x.webp fails with "Duplicate resources".
  // Animations keep their own name; their still image is named *-poster.png.
  const source = preferred.get(rel.replace(/\.[^.]+$/, "")) ?? rel;
  return `  ${JSON.stringify(rel)}: require("../../assets/wipp/${source}"),`;
});

const out = `/* Generated from assets/wipp. Do not edit. */
export const raster = {
${lines.join("\n")}
} as const;

export type RasterKey = keyof typeof raster;
`;

fs.mkdirSync("src/generated", { recursive: true });
fs.writeFileSync("src/generated/raster.ts", out);
console.log(`raster assets: ${files.length}`);
