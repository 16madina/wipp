// Finds the French texts written directly in the screens and wraps them with tr("…"), the helper that
// returns the English text when the app is in English (src/lib/tr.ts). The French text itself is the key.
//   node scripts/i18n-codemod.mjs            → dry run: counts, and writes the list of texts
//   node scripts/i18n-codemod.mjs --write    → edits the files
// Safe to run again: already wrapped texts are skipped.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const WRITE = process.argv.includes("--write");
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "scripts/i18n-found.json";
const ROOTS = ["src/screens", "src/components", "app"];
const SKIP = /(^|\/)(generated|mirror)\//;
const ATTRS = new Set(["label", "title", "placeholder", "accessibilityLabel", "accessibilityHint", "subtitle", "body", "hint", "message", "caption", "description", "emptyTitle", "emptyBody", "cta", "note", "heading", "sub", "confirmLabel", "cancelLabel", "text", "name"]);
const JSX_TEXT_ATTRS = new Set([...ATTRS].filter((a) => a !== "text" && a !== "name"));
const PROP_KEYS = new Set(["label", "title", "description", "hint", "body", "subtitle", "placeholder", "q", "a", "note", "caption", "sub", "cta", "heading"]);
const CALLS = new Set(["setError", "setNote", "setMessage", "setNotice", "setInfo", "setHint", "setWarning", "setStatusText", "toast", "showToast", "alert", "errorText", "setPublishLabel", "setFeedback", "setProblem"]);

/** A text for people (not an id, a colour, a path…): has a lowercase letter and is not identifier-like. */
function human(s) {
  const v = s.trim();
  if (v.length < 2 || !/[a-zà-ÿ]/.test(v) || !/[A-Za-zÀ-ÿ]/.test(v)) return false;
  if (/^[a-z0-9_./:#@%+\-]+$/.test(v)) return false; // cover, flex-start, #fff, fr-FR, srv:…
  if (/^(Inter_|GreatVibes_|DancingScript_)/.test(v) || /^https?:/.test(v) || /^rgba?\(/.test(v)) return false;
  if (/^[A-Za-z]+_[A-Za-z0-9_]+$/.test(v)) return false;
  if (/^[a-z]+[A-Z0-9][A-Za-z0-9]*$/.test(v)) return false; // a translation key (onb1Title), not a text
  return true;
}
const q = (s) => JSON.stringify(s);
function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  const out = [];
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, " ");
    if (i !== 0) l = l.replace(/^ +/, "");
    if (i !== lines.length - 1) l = l.replace(/ +$/, "");
    if (l) out.push(l);
  });
  return out.join(" ");
}

const found = {};
let total = 0, filesChanged = 0;
function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, list);
    else if (/\.tsx?$/.test(e.name) && !SKIP.test(p)) list.push(p);
  }
  return list;
}

for (const file of ROOTS.flatMap((r) => walk(r))) {
  const src = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(src, { sourceType: "module", plugins: ["typescript", "jsx"] });
  } catch (e) {
    console.log("ILLISIBLE", file, e.message);
    continue;
  }
  const edits = [];
  const add = (fr) => {
    (found[file] ??= []).push(fr);
    total++;
  };
  const wrapped = (p) => p.parentPath?.isCallExpression() && p.parentPath.node.callee.type === "Identifier" && p.parentPath.node.callee.name === "tr";
  const inFunction = (p) => Boolean(p.getFunctionParent());
  /** `…${a}…${b}` → tr("…{0}…{1}", a, b) */
  const template = (p) => {
    const n = p.node;
    const pattern = n.quasis.map((qz, i) => qz.value.cooked + (i < n.expressions.length ? `{${i}}` : "")).join("");
    if (!human(pattern.replace(/\{\d+\}/g, ""))) return;
    add(pattern);
    const args = n.expressions.map((e) => src.slice(e.start, e.end));
    edits.push([n.start, n.end, `tr(${q(pattern)}${args.length ? ", " + args.join(", ") : ""})`]);
  };
  const literal = (p) => {
    if (wrapped(p)) return;
    if (p.isStringLiteral()) {
      if (!human(p.node.value)) return;
      add(p.node.value);
      edits.push([p.node.start, p.node.end, `tr(${q(p.node.value)})`]);
    } else if (p.isTemplateLiteral()) template(p);
  };
  /** Texts reachable through ? : , && , || , ?? and + from an expression shown on screen. */
  const operands = (p) => {
    if (p.isStringLiteral() || p.isTemplateLiteral()) literal(p);
    else if (p.isConditionalExpression()) {
      operands(p.get("consequent"));
      operands(p.get("alternate"));
    } else if (p.isLogicalExpression()) {
      operands(p.get("left"));
      operands(p.get("right"));
    } else if (p.isBinaryExpression({ operator: "+" })) {
      operands(p.get("left"));
      operands(p.get("right"));
    } else if (p.isParenthesizedExpression?.() || p.isTSAsExpression() || p.isTSNonNullExpression()) operands(p.get("expression"));
  };

  traverse(ast, {
    JSXText(p) {
      const text = jsxText(p.node.value);
      const core = text.trim();
      // Text between tags is always for people, even one lowercase word (« revoir », « profil »).
      if (core.length < 2 || !/[A-Za-zÀ-ÿ]{2}/.test(core)) return;
      add(core);
      const raw = p.node.value;
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      edits.push([p.node.start, p.node.end, `${lead}{tr(${q(core)})}${trail}`]);
    },
    JSXAttribute(p) {
      const name = p.node.name.name;
      if (typeof name !== "string" || !ATTRS.has(name)) return;
      const v = p.get("value");
      if (v.isStringLiteral()) {
        if (!JSX_TEXT_ATTRS.has(name) || !human(v.node.value)) return;
        add(v.node.value);
        edits.push([v.node.start, v.node.end, `{tr(${q(v.node.value)})}`]);
      } else if (v.isJSXExpressionContainer() && JSX_TEXT_ATTRS.has(name)) operands(v.get("expression"));
    },
    JSXExpressionContainer(p) {
      if (p.parentPath.isJSXElement() || p.parentPath.isJSXFragment()) operands(p.get("expression"));
    },
    CallExpression(p) {
      const c = p.node.callee;
      const name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" && c.property.type === "Identifier" ? c.property.name : "";
      if (!CALLS.has(name)) return;
      for (const a of p.get("arguments")) operands(a);
    },
    ObjectProperty(p) {
      const k = p.node.key;
      const key = k.type === "Identifier" ? k.name : k.type === "StringLiteral" ? k.value : "";
      if (!PROP_KEYS.has(key) || p.node.computed) return;
      const v = p.get("value");
      if (inFunction(p)) {
        operands(v);
        return;
      }
      // Module-level data is built once, before the language is known: a getter reads it at display time.
      if (v.isStringLiteral() && human(v.node.value) && !p.node.shorthand) {
        add(v.node.value);
        edits.push([p.node.start, p.node.end, `get ${key}() { return tr(${q(v.node.value)}); }`]);
      }
    },
  });

  if (!edits.length) continue;
  filesChanged++;
  if (!WRITE) continue;
  // Apply from the end; drop edits nested inside another one.
  edits.sort((a, b) => b[0] - a[0]);
  let out = src, lastStart = Infinity;
  for (const [s, e, text] of edits) {
    if (e > lastStart) continue;
    out = out.slice(0, s) + text + out.slice(e);
    lastStart = s;
  }
  if (!/from "(\.\.?\/)+(src\/)?lib\/tr"/.test(out)) {
    const rel = path.relative(path.dirname(file), "src/lib/tr").replaceAll("\\", "/");
    const imp = `import { tr } from "${rel.startsWith(".") ? rel : "./" + rel}";\n`;
    const m = [...out.matchAll(/^import [^\n]*\n(?:(?!import )[^\n]*\n)*?/gm)];
    const lastImport = out.lastIndexOf("\nimport ");
    const end = out.indexOf(";\n", lastImport) + 2;
    out = lastImport >= 0 ? out.slice(0, end) + imp + out.slice(end) : imp + out;
  }
  fs.writeFileSync(file, out);
}
const unique = [...new Set(Object.values(found).flat())];
fs.writeFileSync(OUT, JSON.stringify({ unique, byFile: found }, null, 1));
console.log(`${WRITE ? "modifié" : "à modifier"} : ${filesChanged} fichiers, ${total} textes, ${unique.length} textes différents → ${OUT}`);
