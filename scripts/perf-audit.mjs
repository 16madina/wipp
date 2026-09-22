#!/usr/bin/env node
/**
 * Performance probe for Wipp. Run against a live origin (dev or preview).
 * Usage: node scripts/perf-audit.mjs http://127.0.0.1:8081/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = "/workspace/screenshots/perf-audit.json";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--mute-audio"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await context.addInitScript(() => {
  window.__wippPerf = {
    longTasks: [],
    frames: [],
    clicks: [],
  };
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__wippPerf.longTasks.push({
        name: e.name,
        start: Math.round(e.startTime),
        dur: Math.round(e.duration),
      });
    }
  });
  try {
    po.observe({ type: "longtask", buffered: true });
  } catch {
    /* unsupported */
  }
});

const page = await context.newPage();
const started = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
const navMs = Date.now() - started;

async function metrics(label) {
  return page.evaluate((label) => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]),
    );
    const lcp = performance
      .getEntriesByType("largest-contentful-paint")
      .at(-1);
    const resources = performance.getEntriesByType("resource");
    const byType = {};
    let transfer = 0;
    let decoded = 0;
    for (const r of resources) {
      const kind = r.initiatorType || "other";
      byType[kind] = (byType[kind] || 0) + 1;
      transfer += r.transferSize || 0;
      decoded += r.decodedBodySize || 0;
    }
    const js = resources.filter((r) => r.name.includes(".js") || r.initiatorType === "script");
    const media = resources.filter((r) =>
      /\.(mp4|mp3|mov|webm)(\?|$)/i.test(r.name),
    );
    const img = resources.filter((r) => r.initiatorType === "img" || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(r.name));
    const mem = performance.memory
      ? {
          usedMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
          totalMB: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1),
          limitMB: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1),
        }
      : null;
    const video = document.querySelector("video");
    return {
      label,
      nav: nav
        ? {
            ttfb: Math.round(nav.responseStart),
            dcl: Math.round(nav.domContentLoadedEventEnd),
            load: Math.round(nav.loadEventEnd),
            domInteractive: Math.round(nav.domInteractive),
            transferKB: Math.round((nav.transferSize || 0) / 1024),
          }
        : null,
      paints,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      resources: {
        count: resources.length,
        transferKB: Math.round(transfer / 1024),
        decodedKB: Math.round(decoded / 1024),
        byType,
        js: js.length,
        jsKB: Math.round(js.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        images: img.length,
        imgKB: Math.round(img.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        media: media.map((r) => ({
          name: r.name.split("/").pop(),
          ms: Math.round(r.duration),
          kb: Math.round((r.transferSize || r.decodedBodySize || 0) / 1024),
        })),
      },
      memory: mem,
      video: video
        ? {
            paused: video.paused,
            muted: video.muted,
            t: +video.currentTime.toFixed(2),
            ready: video.readyState,
          }
        : null,
      longTasks: (window.__wippPerf?.longTasks || []).length,
      longTaskMs: (window.__wippPerf?.longTasks || []).reduce((s, t) => s + t.dur, 0),
      longestTask: Math.max(0, ...(window.__wippPerf?.longTasks || []).map((t) => t.dur)),
      nodes: document.querySelectorAll("*").length,
      text: (document.body.innerText || "").slice(0, 80).replace(/\s+/g, " "),
    };
  }, label);
}

async function fpsSample(ms = 800) {
  return page.evaluate(async (ms) => {
    return new Promise((resolve) => {
      const times = [];
      let last = performance.now();
      let id = 0;
      const stop = performance.now() + ms;
      const loop = (now) => {
        times.push(now - last);
        last = now;
        if (now < stop) id = requestAnimationFrame(loop);
        else {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          const dropped = times.filter((d) => d > 20).length;
          resolve({
            frames: times.length,
            avgFps: +(1000 / avg).toFixed(1),
            droppedOver20ms: dropped,
            maxFrameMs: +Math.max(...times).toFixed(1),
          });
        }
      };
      id = requestAnimationFrame(loop);
      void id;
    });
  }, ms);
}

async function tapText(text) {
  const t0 = Date.now();
  const btn = page.getByRole("button", { name: text }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 2500 }).catch(() => {});
  } else {
    await page.getByText(text, { exact: false }).first().click({ timeout: 2500 }).catch(() => {});
  }
  return Date.now() - t0;
}

const cold = await metrics("cold");
await page.screenshot({ path: "/workspace/screenshots/perf-01-cold.png" });

const tapIntro = await tapText("Wipp");
await page.waitForTimeout(400);
const intro = await metrics("intro");
const introFps = await fpsSample(900);

await page.waitForTimeout(2800);
const afterIntro = await metrics("after-intro");

const tapDemo = await tapText("Ouvrir la démo");
await page.waitForTimeout(500);
const chats = await metrics("chats");
await page.screenshot({ path: "/workspace/screenshots/perf-02-chats.png" });

const scrollFps = await page.evaluate(async () => {
  const scroller =
    [...document.querySelectorAll("div")].find((el) => el.scrollHeight > el.clientHeight + 80) ||
    document.scrollingElement;
  const times = [];
  let last = performance.now();
  const stop = performance.now() + 900;
  let y = 0;
  return new Promise((resolve) => {
    const loop = (now) => {
      times.push(now - last);
      last = now;
      y += 28;
      if (scroller) scroller.scrollTop = y;
      if (now < stop) requestAnimationFrame(loop);
      else {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        resolve({
          frames: times.length,
          avgFps: +(1000 / avg).toFixed(1),
          droppedOver20ms: times.filter((d) => d > 20).length,
          maxFrameMs: +Math.max(...times).toFixed(1),
          scrollTop: scroller?.scrollTop ?? 0,
        });
      }
    };
    requestAnimationFrame(loop);
  });
});

const tapChat = await tapText("Alex");
await page.waitForTimeout(400);
const convo = await metrics("conversation");

const typeMs = await page.evaluate(async () => {
  const ta = document.querySelector("textarea");
  if (!ta) return { ok: false };
  const t0 = performance.now();
  ta.focus();
  const native = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  native.set.call(ta, "Salut ça va ?");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  const send = [...document.querySelectorAll("button")].find((b) =>
    b.querySelector("svg"),
  );
  send?.click();
  return { ok: true, ms: Math.round(performance.now() - t0) };
});

await page.waitForTimeout(200);
const afterSend = await metrics("after-send");

const exploreMs = await tapText("Explorer");
await page.waitForTimeout(500);
const explore = await metrics("explore");
const exploreFps = await fpsSample(800);

const meMs = await tapText("Moi");
await page.waitForTimeout(300);
const me = await metrics("me");

const report = {
  url,
  viewport: "390x844 @2x",
  gotoMs: navMs,
  interactions: {
    tapIntro,
    tapDemo,
    tapChat,
    typeSend: typeMs,
    exploreMs,
    meMs,
  },
  fps: { intro: introFps, chatsScroll: scrollFps, explore: exploreFps },
  snapshots: { cold, intro, afterIntro, chats, convo, afterSend, explore, me },
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
