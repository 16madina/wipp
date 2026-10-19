// Same job as i18n-codemod.mjs, for src/lib (texts built outside the screens: previews, errors, catalogues).
//   node scripts/i18n-lib-codemod.mjs           → dry run, lists what needs a hand
//   node scripts/i18n-lib-codemod.mjs --write   → edits the files
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const WRITE = process.argv.includes("--write");
const SKIP = /(i18n|seed|stickers|sticker-keywords|countries|countries-world|legal|tr|language-pref)\.ts$|\.test\.ts$|\/generated\/|\/mirror\//;
const fr = (s) => /[éèàçêùôîÉÀ’]|(^| )(le|la|les|un|une|des|de|du|est|pas|pour|sur|ton|ta|tes|vous|avec|impossible|aucun|déjà)( |$)/i.test(s) && /[a-zà-ÿ]{3}/.test(s) && !/^[a-z0-9_./:#@%+\-]+$/.test(s.trim());
const EXTRA = new Set(JSON.parse(fs.readFileSync("scripts/i18n-lib-extra.json", "utf8")));
const EXTRA_UI = new Set(JSON.parse(fs.readFileSync("scripts/i18n-screens-extra.json", "utf8")));
const q = (s) => JSON.stringify(s);
const par0 = (p) => p.parentPath;
function walk(dir, list = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, list); else if (/\.tsx?$/.test(e.name) && !SKIP.test(p)) list.push(p); } return list; }
const found = [];
const ROOTS = process.argv.includes("--all") ? ["src/lib", "src/screens", "src/components", "app"] : ["src/lib"];
const IDKEYS = new Set(["id", "key", "value", "kind", "type", "category", "condition", "mode", "style", "tone", "tab", "name", "route", "icon"]);
for (const file of ROOTS.flatMap((r) => walk(r))) {
  const src = fs.readFileSync(file, "utf8");
  const ast = parser.parse(src, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const edits = [];
  const isTr = (p) => p.parentPath.isCallExpression() && p.parentPath.node.callee.name === "tr";
  // A text also used as an identifier in this file (compared, switch case, object key) is never wrapped.
  const ident = new Set();
  traverse(ast, { StringLiteral(p) { const par = p.parentPath; if ((par.isBinaryExpression() && /^[!=]==?$/.test(par.node.operator)) || par.isSwitchCase() || (par.isObjectProperty() && par.node.key === p.node)) ident.add(p.node.value); } });
  const inLib = file.startsWith("src/lib");
  const handle = (p, text, replacement) => {
    if (ident.has(text) && !(par0(p).isBinaryExpression() || par0(p).isSwitchCase())) return console.log("AUSSI-IDENT", file, p.node.loc.start.line, text);
    const par = p.parentPath;
    if (par.isImportDeclaration() || par.isTSLiteralType() || isTr(p)) return;
    if (par.isObjectProperty() && par.node.key === p.node) return console.log("CLÉ", file, p.node.loc.start.line, text);
    if (par.isBinaryExpression() && /^[!=]==?$/.test(par.node.operator)) return console.log("COMPARAISON", file, p.node.loc.start.line, text);
    if (par.isSwitchCase()) return console.log("CASE", file, p.node.loc.start.line, text);
    if (par.isArrayExpression() && p.getFunctionParent() && par.node.elements.indexOf(p.node) >= 1 && par.node.elements.some((e) => e && e.type !== "StringLiteral" && e.type !== "TemplateLiteral" || par.parentPath.isArrayExpression())) { found.push(text); edits.push([p.node.start, p.node.end, replacement]); return; }
    if (par.isArrayExpression() && p.getFunctionParent() && par.parentPath.isArrayExpression() && par.node.elements.indexOf(p.node) >= 1) { found.push(text); edits.push([p.node.start, p.node.end, replacement]); return; }
    if (par.isArrayExpression()) return console.log("TABLEAU", file, p.node.loc.start.line, text);
    if (par.isObjectProperty() && par.node.key.type === "Identifier" && IDKEYS.has(par.node.key.name)) return console.log("IDENT", file, p.node.loc.start.line, text);
    if (file.endsWith("screens/connect.tsx") && p.node.loc.start.line > 770 && p.node.loc.start.line < 860) return;
    if (p.getFunctionParent()) { found.push(text); edits.push([p.node.start, p.node.end, replacement]); return; }
    if (par.isObjectProperty() && !par.node.computed && par.node.key.type === "Identifier") {
      found.push(text);
      edits.push([par.node.start, par.node.end, `get ${par.node.key.name}() { return ${replacement}; }`]);
      return;
    }
    console.log("MODULE", file, p.node.loc.start.line, text);
  };
  traverse(ast, {
    StringLiteral(p) { const v = p.node.value; if (fr(v) || (inLib ? EXTRA.has(v) : EXTRA_UI.has(v))) handle(p, v, `tr(${q(v)})`); },
    JSXText(p) { if (fr(p.node.value)) console.log("JSX", file, p.node.loc.start.line, p.node.value.trim().slice(0, 60)); },
    JSXAttribute(p) { const v = p.get("value"); if (v.isStringLiteral() && (fr(v.node.value) || EXTRA_UI.has(v.node.value)) && !/^(style|testID|key|name|variant|tone|mode|type|kind|id|fontFamily)$/.test(String(p.node.name.name))) { found.push(v.node.value); edits.push([v.node.start, v.node.end, `{tr(${q(v.node.value)})}`]); p.skip(); } },
    TemplateLiteral(p) {
      const n = p.node;
      const t = n.quasis.map((z, i) => z.value.cooked + (i < n.expressions.length ? `{${i}}` : "")).join("");
      if (!fr(t.replace(/\{\d+\}/g, "")) && !(inLib ? EXTRA.has(t) : EXTRA_UI.has(t))) return;
      const args = n.expressions.map((e) => src.slice(e.start, e.end));
      handle(p, t, `tr(${q(t)}${args.length ? ", " + args.join(", ") : ""})`);
    },
  });
  if (!edits.length || !WRITE) continue;
  edits.sort((a, b) => b[0] - a[0]);
  let out = src, last = Infinity;
  for (const [s, e, text] of edits) { if (e > last) continue; out = out.slice(0, s) + text + out.slice(e); last = s; }
  if (!/import \{[^}]*\btr\b[^}]*\} from "[./a-z]*tr"/.test(out)) {
    let rel = path.relative(path.dirname(file), "src/lib/tr"); if (!rel.startsWith(".")) rel = "./" + rel;
    out = /^"use /.test(out) ? out.replace(/\n/, `\nimport { tr } from "${rel}";\n`) : `import { tr } from "${rel}";\n` + out;
  }
  fs.writeFileSync(file, out);
}
fs.writeFileSync("scripts/i18n-lib-found.json", JSON.stringify([...new Set(found)], null, 1));
console.log(WRITE ? "modifié" : "à modifier", found.length, "textes,", new Set(found).size, "différents");
