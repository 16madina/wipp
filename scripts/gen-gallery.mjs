import fs from "node:fs";
import path from "node:path";

const root = path.resolve("assets");
const skipExt = new Set([".json", ".asset.json"]);
const imageExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const videoExt = new Set([".mp4", ".webm"]);
const audioExt = new Set([".mp3", ".m4a", ".wav"]);

/** @type {{ rel: string, folder: string, name: string, kind: string, bytes: number }[]} */
const items = [];

function kindOf(ext) {
  if (imageExt.has(ext)) return "image";
  if (videoExt.has(ext)) return "video";
  if (audioExt.has(ext)) return "audio";
  return "file";
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else {
      const ext = path.extname(ent.name).toLowerCase();
      if (ent.name.endsWith(".asset.json") || skipExt.has(ext)) continue;
      const rel = path.relative(root, p).replaceAll("\\", "/");
      const parts = rel.split("/");
      const folder = parts[0] === "wipp" ? (parts[1] ?? "wipp") : parts[0];
      const st = fs.statSync(p);
      items.push({ rel, folder, name: parts[parts.length - 1], kind: kindOf(ext), bytes: st.size });
    }
  }
}

walk(root);
items.sort((a, b) => a.folder.localeCompare(b.folder) || a.rel.localeCompare(b.rel));

const folders = {};
for (const it of items) folders[it.folder] = (folders[it.folder] ?? 0) + 1;

const missing = [
  { name: "wipp-auth-welcome.png", note: "Pointeur Lovable __l5e uniquement (fichier binaire absent du dépôt)" },
  { name: "wipp-auth-phone.png", note: "Pointeur Lovable __l5e uniquement (fichier binaire absent du dépôt)" },
  { name: "wipp-auth-profile.png", note: "Pointeur Lovable __l5e uniquement — copie locale : profile-no-password.png" },
  { name: "wipp-logo-gold.png", note: "Pointeur Lovable __l5e uniquement" },
];

function card(it) {
  const src = `/assets/${it.rel}`;
  if (it.kind === "image") {
    return `<figure class="card" data-folder="${it.folder}" data-kind="image"><img loading="lazy" src="${src}" alt="${it.name}"><figcaption><b>${it.name}</b><span>${it.folder}</span></figcaption></figure>`;
  }
  if (it.kind === "video") {
    return `<figure class="card wide" data-folder="${it.folder}" data-kind="video"><video controls preload="metadata" src="${src}"></video><figcaption><b>${it.name}</b><span>${it.folder} · vidéo</span></figcaption></figure>`;
  }
  if (it.kind === "audio") {
    return `<figure class="card" data-folder="${it.folder}" data-kind="audio"><div class="audio-box">♪</div><audio controls preload="none" src="${src}"></audio><figcaption><b>${it.name}</b><span>${it.folder} · audio</span></figcaption></figure>`;
  }
  return `<figure class="card" data-folder="${it.folder}" data-kind="file"><div class="file-box">${it.name}</div><figcaption><b>${it.name}</b><span>${it.folder}</span></figcaption></figure>`;
}

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WIPP — assets récupérés</title>
  <style>
    :root { --bg:#070a0f; --fg:#f7f9fc; --muted:#8b93a7; --accent:#ffd84d; --card:#121722; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--fg); }
    header { position:sticky; top:0; z-index:5; background:#0b1220ee; backdrop-filter:blur(16px); padding:18px 20px 12px; border-bottom:1px solid #ffffff14; }
    h1 { margin:0; font-size:22px; letter-spacing:-.03em; }
    h1 span { color:var(--accent); }
    .meta { color:var(--muted); font-size:13px; margin-top:6px; }
    nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    nav button { background:#121722; color:var(--fg); border:1px solid #ffffff18; border-radius:999px; padding:7px 12px; font-size:12px; cursor:pointer; }
    nav button.on { background:var(--accent); color:#0b1220; border-color:transparent; font-weight:700; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; padding:16px 20px 80px; }
    .card { margin:0; background:var(--card); border-radius:14px; overflow:hidden; border:1px solid #ffffff12; }
    .card.wide { grid-column: span 2; }
    .card img, .card video { width:100%; height:140px; object-fit:cover; display:block; background:#0b1220; }
    .card[data-folder="flags"] img { object-fit:contain; padding:18px; height:90px; }
    .card[data-folder="stickers"] img, .card[data-folder="fx"] img { object-fit:contain; background:#0a0e16; }
    figcaption { padding:8px 10px 10px; font-size:11px; }
    figcaption b { display:block; word-break:break-all; font-weight:600; }
    figcaption span { color:var(--muted); }
    .audio-box, .file-box { height:90px; display:grid; place-items:center; font-size:28px; color:var(--accent); }
    audio { width:100%; }
    .missing { margin:0 20px 20px; padding:14px 16px; border:1px dashed #ffd84d55; border-radius:12px; color:var(--muted); font-size:13px; }
    .missing b { color:var(--accent); }
  </style>
</head>
<body>
  <header>
    <h1>WIPP <span>récupéré</span></h1>
    <p class="meta">${items.length} fichiers originaux depuis WIPP-MESSENGER · ${Object.keys(folders).length} dossiers · aucune image générée</p>
    <nav id="nav">
      <button class="on" data-folder="all">Tout (${items.length})</button>
      ${Object.entries(folders).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n]) => `<button data-folder="${k}">${k} (${n})</button>`).join("")}
    </nav>
  </header>
  <section class="missing">
    <b>Absents du dépôt (pointeurs Lovable uniquement)</b>
    <div>${missing.map(m => `${m.name} — ${m.note}`).join("<br>")}</div>
  </section>
  <section class="grid" id="grid">
    ${items.map(card).join("\n")}
  </section>
  <script>
    const buttons = [...document.querySelectorAll("nav button")];
    const cards = [...document.querySelectorAll(".card")];
    buttons.forEach((b) => b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.toggle("on", x === b));
      const f = b.dataset.folder;
      cards.forEach((c) => { c.style.display = f === "all" || c.dataset.folder === f ? "" : "none"; });
    }));
  </script>
</body>
</html>
`;

fs.mkdirSync("preview", { recursive: true });
fs.writeFileSync("preview/index.html", html);
fs.writeFileSync("preview/catalog.json", JSON.stringify({ count: items.length, folders, items }, null, 2));
console.log(`gallery: ${items.length} files`);
