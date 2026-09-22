#!/usr/bin/env node
/**
 * Publish Wipp (équivalent Lovable) :
 *   1) build + deploy API/site sur Vercel
 *   2) pousse une mise à jour OTA Expo (sans rebuild store)
 *
 * Usage:
 *   node scripts/publish-wipp.mjs
 *   node scripts/publish-wipp.mjs --api-only
 *   node scripts/publish-wipp.mjs --ota-only
 *   node scripts/publish-wipp.mjs -m "fix écran chats"
 *
 * Secrets one-shot (env) :
 *   VERCEL_TOKEN  https://vercel.com/account/tokens
 *   EXPO_TOKEN    https://expo.dev/settings/access-tokens
 *   DATABASE_URL  chaîne Supabase (déjà dans .env local)
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mergeAppEnv, readAppEnv, readDotEnv, projectRoot } from "./with-app-env.mjs";

const root = projectRoot();
const deployPath = join(root, ".grok", "deploy.json");
const mobileDir = join(root, "mobile");

function loadDeploy() {
  try {
    return JSON.parse(readFileSync(deployPath, "utf8"));
  } catch {
    return {
      apiUrl: "",
      vercelProjectName: "wipp",
      expoOwner: "",
      expoSlug: "wipp",
      easProjectId: "",
      bundleId: "com.wipp.app",
    };
  }
}

function saveDeploy(data) {
  writeFileSync(deployPath, `${JSON.stringify(data, null, 2)}\n`);
}

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: opts.input != null ? ["pipe", "inherit", "inherit"] : "inherit",
      env: opts.env || process.env,
      cwd: opts.cwd || root,
    });
    if (opts.input != null) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} → exit ${code}`));
    });
  });
}

function runCapture(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: opts.env || process.env,
      cwd: opts.cwd || root,
    });
    child.stdout.on("data", (d) => {
      chunks.push(d);
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      chunks.push(d);
      process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const out = Buffer.concat(chunks).toString("utf8");
      if (code === 0) resolve(out);
      else reject(new Error(`${command} ${args.join(" ")} → exit ${code}\n${out}`));
    });
  });
}

function parseArgs(argv) {
  const flags = new Set();
  let message = "Mise à jour Wipp";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--api-only" || a === "--ota-only" || a === "--skip-build") flags.add(a);
    else if ((a === "--message" || a === "-m") && argv[i + 1]) {
      message = argv[++i];
    }
  }
  return { flags, message };
}

function ensureTokens(needApi, needOta, env) {
  const missing = [];
  if (needApi && !env.VERCEL_TOKEN) missing.push("VERCEL_TOKEN");
  if (needOta && !env.EXPO_TOKEN) missing.push("EXPO_TOKEN");
  if (needApi && !env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!missing.length) return;
  console.error(`
❌ Secrets manquants : ${missing.join(", ")}

Une seule fois (comptes gratuits) :
  1) Vercel → https://vercel.com/account/tokens          → VERCEL_TOKEN
  2) Expo   → https://expo.dev/settings/access-tokens   → EXPO_TOKEN
  3) DATABASE_URL = ta chaîne Postgres Supabase

Dis-moi ensuite les tokens (ou exporte-les) et je publie.
`);
  process.exit(2);
}

async function syncDatabaseUrl(env) {
  try {
    await run(
      "npx",
      [
        "--yes",
        "vercel@59",
        "env",
        "add",
        "DATABASE_URL",
        "production",
        "--token",
        env.VERCEL_TOKEN,
        "--force",
        "--yes",
      ],
      { env, input: `${env.DATABASE_URL}\n` },
    );
    console.log("✅ DATABASE_URL synchronisée sur Vercel (production).");
  } catch (err) {
    console.warn(
      "[publish] DATABASE_URL non poussée automatiquement — vérifie Project → Settings → Env sur Vercel.",
      err?.message || err,
    );
  }
}

async function publishApi(deploy, env) {
  console.log("\n── 1/2  Hébergement API (Vercel) ──\n");
  await syncDatabaseUrl(env);

  const out = await runCapture(
    "npx",
    [
      "--yes",
      "vercel@59",
      "deploy",
      "--prebuilt",
      "--prod",
      "--yes",
      "--token",
      env.VERCEL_TOKEN,
    ],
    { env },
  );

  const urls = [...out.matchAll(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi)].map((m) => m[0]);
  const apiUrl = (urls[urls.length - 1] || deploy.apiUrl || "").replace(/\/$/, "");
  if (!apiUrl) {
    throw new Error("Impossible de lire l’URL Vercel dans la sortie du deploy.");
  }

  deploy.apiUrl = apiUrl;
  saveDeploy(deploy);
  console.log(`\n✅ API live : ${deploy.apiUrl}`);
  console.log(`   Health   : ${deploy.apiUrl}/api/wipp/health`);
  return deploy;
}

async function ensureEasProject(deploy, env) {
  if (deploy.easProjectId) return deploy;

  console.log("Lien projet Expo (eas init)…");
  try {
    const out = await runCapture(
      "npx",
      ["--yes", "eas-cli@16", "init", "--non-interactive", "--force"],
      { env: { ...env, EXPO_TOKEN: env.EXPO_TOKEN }, cwd: mobileDir },
    );
    const match = out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (match) {
      deploy.easProjectId = match[1];
      saveDeploy(deploy);
      return deploy;
    }
  } catch (err) {
    console.warn("[publish] eas init:", err?.message || err);
  }

  try {
    const out = await runCapture("npx", ["--yes", "eas-cli@16", "project:info"], {
      env: { ...env, EXPO_TOKEN: env.EXPO_TOKEN },
      cwd: mobileDir,
    });
    const match = out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (match) {
      deploy.easProjectId = match[1];
      saveDeploy(deploy);
    }
  } catch {
    /* ignore */
  }

  return deploy;
}

async function publishOta(deploy, env, message) {
  console.log("\n── 2/2  Mise à jour app (EAS Update) ──\n");
  deploy = await ensureEasProject(deploy, env);

  if (!deploy.easProjectId) {
    console.error(`
❌ Projet Expo pas encore créé.
Avec EXPO_TOKEN défini, relance — ou une seule fois en local :
  cd mobile && npx eas login && npx eas init
Puis mets le UUID dans .grok/deploy.json → easProjectId
`);
    process.exit(2);
  }

  const otaEnv = {
    ...env,
    EXPO_TOKEN: env.EXPO_TOKEN,
    EXPO_PUBLIC_WIPP_API_URL: deploy.apiUrl || "",
    EAS_PROJECT_ID: deploy.easProjectId,
  };

  await run(
    "npx",
    [
      "--yes",
      "eas-cli@16",
      "update",
      "--channel",
      "production",
      "--message",
      message,
      "--non-interactive",
    ],
    { env: otaEnv, cwd: mobileDir },
  );

  console.log("\n✅ OTA poussée (canal production). Les apps se mettent à jour au prochain lancement.");
}

async function main() {
  const { flags, message } = parseArgs(process.argv.slice(2));
  const needApi = !flags.has("--ota-only");
  const needOta = !flags.has("--api-only");

  const env = mergeAppEnv({ ...readDotEnv(root), ...readAppEnv(root) }, process.env);
  ensureTokens(needApi, needOta, env);

  let deploy = loadDeploy();

  if (needApi && !flags.has("--skip-build")) {
    console.log("\n── Build production ──\n");
    await run("npm", ["run", "build"], { env });
  }

  if (needApi) {
    deploy = await publishApi(deploy, env);
  }

  if (needOta) {
    if (!deploy.apiUrl) {
      console.error("apiUrl manquant — lance d’abord un publish API (ou remplis .grok/deploy.json).");
      process.exit(2);
    }
    await publishOta(deploy, env, message);
  }

  console.log(`
══════════════════════════════════════
  Publication terminée

  Site / API : ${deploy.apiUrl || "(inchangé)"}
  Bundle ID  : ${deploy.bundleId}
  OTA        : canal production

  Prochaine fois : dis-moi juste « publie »
══════════════════════════════════════
`);
}

main().catch((err) => {
  console.error("\n[publish-wipp] échec:", err?.message || err);
  process.exit(1);
});
