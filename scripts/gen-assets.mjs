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

const lines = files.map(
  (rel) => `  ${JSON.stringify(rel)}: require("../../assets/wipp/${rel}"),`,
);

const out = `/* Generated from assets/wipp. Do not edit. */
export const raster = {
${lines.join("\n")}
} as const;

export type RasterKey = keyof typeof raster;
`;

fs.mkdirSync("src/generated", { recursive: true });
fs.writeFileSync("src/generated/raster.ts", out);
console.log(`raster assets: ${files.length}`);
