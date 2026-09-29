import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const HOST = "https://wippapp.com";
const root = path.resolve("assets/wipp");
const srcPath = path.resolve(".source/wipp-messenger/src/lib/sticker-assets.ts");
const src = fs.readFileSync(srcPath, "utf8");
const re = /"(\/stickers\/[^"]+)": "(\/__l5e\/[^"]+)"/g;
const map = [];
const jobs = [];

for (const m of src.matchAll(re)) {
  const rel = m[1].replace(/^\//, "");
  const url = `${HOST}${m[2]}`;
  map.push([rel, url]);
  if (rel.startsWith("stickers/moments/") && rel.endsWith(".png")) jobs.push({ rel, url });
  if (rel.startsWith("stickers/emo/")) jobs.push({ rel, url });
}

const cdn = `export const stickerCdn: Record<string, string> = {
${map.map(([rel, url]) => `  ${JSON.stringify(rel)}: ${JSON.stringify(url)},`).join("\n")}
};

export function stickerRemoteUri(path: string) {
  const key = path.replace(/^\\//, "").split("?")[0];
  return stickerCdn[key];
}
`;
fs.mkdirSync("src/lib", { recursive: true });
fs.writeFileSync("src/lib/sticker-cdn.ts", cdn);
console.log(`sticker-cdn entries: ${map.length}`);

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(new URL(res.headers.location, url).href).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`${res.statusCode} ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

const limit = 4;
let i = 0;
let ok = 0;
let fail = 0;
async function worker() {
  while (i < jobs.length) {
    const job = jobs[i++];
    const dest = path.join(root, job.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const buf = await get(job.url);
      if (buf.length < 1024) throw new Error(`tiny ${buf.length}`);
      fs.writeFileSync(dest, buf);
      ok += 1;
      console.log(`ok ${job.rel} ${buf.length}`);
    } catch (err) {
      fail += 1;
      console.log(`fail ${job.rel} ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: limit }, () => worker()));
console.log(`downloaded ok=${ok} fail=${fail} of ${jobs.length}`);
