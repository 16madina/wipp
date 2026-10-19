// every French key used through tr() in the sources + catalogue arrays → which ones are missing from the list
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/x.js");
const parser = require("@babel/parser"); const traverse = require("@babel/traverse").default;
function walk(dir, list = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, list); else if (/\.tsx?$/.test(e.name) && !/generated|mirror|\.test\.|lib\/tr\.ts$/.test(p)) list.push(p); } return list; }
const keys = new Set();
const ARRAYS = new Set(["CARD_CATEGORIES", "REPORT_REASONS", "GROUP_REPORT_REASONS", "GROUP_CATEGORIES", "EVENT_CATS", "EVENT_FILTERS", "GROUP_STEPS", "SUPPORT_TOPICS", "TONES", "MONTHS", "MONTHS_SHORT", "DAYS"]);
for (const file of [...walk("src"), ...walk("app")]) {
  const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] });
  traverse(ast, {
    CallExpression(p) { const c = p.node.callee; if (c.type === "Identifier" && c.name === "tr" && p.node.arguments[0]?.type === "StringLiteral") keys.add(p.node.arguments[0].value); },
    VariableDeclarator(p) { if (p.node.id.type !== "Identifier" || !ARRAYS.has(p.node.id.name)) return; let init = p.node.init; while (init && init.type !== "ArrayExpression") init = init.expression; for (const el of init?.elements ?? []) if (el.type === "StringLiteral") keys.add(el.value); },
    ArrayExpression(p) { if (p.getFunctionParent() || !p.parentPath.isArrayExpression() && !p.findParent((x) => x.isVariableDeclarator() && ["DISAPPEAR_OPTIONS", "EVENT_WHERE"].includes(x.node.id.name))) return; for (const el of p.node.elements) if (el?.type === "StringLiteral" && /[A-ZÀ-Ý0-9]/.test(el.value[0] ?? "") && el.value.length > 2) keys.add(el.value); },
  });
}
// clip("id", "label") labels and error rules
for (const m of fs.readFileSync("src/lib/surprise.ts", "utf8").matchAll(/[cC]lip\((?:"[^"]*", )?"[^"]*", "([^"]*)"\)/g)) keys.add(m[1]);
for (const m of fs.readFileSync("src/lib/error-fr.ts", "utf8").matchAll(/\/i, "([^"]*)"\]/g)) keys.add(m[1]);
keys.add("Recherche de GIF bientôt disponible. Tu peux déjà coller le lien d’un GIF."); keys.add("Nouveau message"); for (const k of ["Carte à gratter", "Confettis", "Compte à rebours", "Secret", "Faux profil", "Messages", "Demandes", "Appels", "Stories", "Homme", "Femme", "Non renseigné"]) keys.add(k);
const list = JSON.parse(fs.readFileSync("scripts/i18n-fr-list.json", "utf8"));
const have = new Set(list);
const missing = [...keys].filter((k) => !have.has(k));
if (process.argv.includes("--append")) { fs.writeFileSync("scripts/i18n-fr-list.json", JSON.stringify([...list, ...missing], null, 1)); }
console.log(list.length, "dans la liste,", keys.size, "clés utilisées,", missing.length, "manquantes");
missing.forEach((k, i) => console.log(`${list.length + i}|${k.replaceAll("\n", "⏎")}`));
