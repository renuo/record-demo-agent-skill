#!/usr/bin/env node
// Self-hosted screen recorder for demoing an implemented feature.
//
// Drives a local Chromium (via Playwright) through a scripted list of "moments"
// and records the session to a video file. No external service is involved.
//
// Usage:
//   node record.mjs --url http://localhost:3000 --steps steps.json --out demo.webm
//
// steps.json format:
//   {
//     "viewport": { "width": 1280, "height": 800 },   // optional
//     "steps": [
//       { "action": "goto",  "path": "/" },
//       { "action": "wait",  "ms": 800 },
//       { "action": "click", "text": "Sign in" },
//       { "action": "click", "selector": "#submit" },
//       { "action": "fill",  "selector": "#email", "value": "a@b.ch" },
//       { "action": "hover", "selector": ".card" },
//       { "action": "scroll", "to": "bottom" },        // "top" | number | selector
//       { "action": "press", "key": "Enter" },
//       { "action": "waitForSelector", "selector": ".result" }
//     ]
//   }
//
// Each action is padded with a short, human-paced pause so the result does not
// look like a jittery bot. The recorded video is saved to --out.

import { readFile } from "node:fs/promises";
import { rename, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
    args[name] = value;
  }
  return args;
}

const args = parseArgs(process.argv);
const baseUrl = (args.url || "http://localhost:3000").replace(/\/$/, "");
const stepsPath = args.steps || "steps.json";
const outPath = resolve(args.out || "demo.webm");
const padBefore = Number(args["pad-before"] ?? 400);
const padAfter = Number(args["pad-after"] ?? 900);

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Playwright is not installed. Run `npm install` in this skill directory " +
      "and `npx playwright install chromium`, then retry.",
  );
  process.exit(2);
}

const config = JSON.parse(await readFile(stepsPath, "utf8"));
const viewport = config.viewport || { width: 1280, height: 800 };
const steps = config.steps || [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function locate(page, step) {
  if (step.selector) return page.locator(step.selector).first();
  if (step.text) return page.getByText(step.text, { exact: false }).first();
  throw new Error(`Step ${JSON.stringify(step)} needs "selector" or "text"`);
}

async function runStep(page, step) {
  await sleep(padBefore);
  switch (step.action) {
    case "goto":
      await page.goto(step.url || baseUrl + (step.path || "/"), { waitUntil: "load" });
      break;
    case "click":
      await (await locate(page, step)).click();
      break;
    case "fill":
      await (await locate(page, step)).fill(step.value ?? "");
      break;
    case "hover":
      await (await locate(page, step)).hover();
      break;
    case "press":
      await page.keyboard.press(step.key || "Enter");
      break;
    case "scroll":
      await scroll(page, step.to);
      break;
    case "waitForSelector":
      await page.waitForSelector(step.selector, { timeout: step.timeout ?? 10000 });
      break;
    case "wait":
      break; // padding below is the wait
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
  await sleep(step.ms ?? padAfter);
}

async function scroll(page, to) {
  if (to === "bottom") {
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  } else if (to === "top") {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  } else if (typeof to === "number") {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), to);
  } else if (typeof to === "string") {
    await page.locator(to).first().scrollIntoViewIfNeeded();
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: dirname(outPath), size: viewport },
});
const page = await context.newPage();

let failed = null;
try {
  await page.goto(baseUrl, { waitUntil: "load" }); // start at --url; steps can navigate elsewhere with `goto`
  await sleep(padBefore);
  for (const step of steps) {
    console.error(`▶ ${step.action} ${step.selector || step.text || step.path || step.to || ""}`.trim());
    await runStep(page, step);
  }
} catch (err) {
  failed = err;
  console.error(`Step failed: ${err.message}`);
} finally {
  const video = page.video();
  await context.close(); // flushes the video file to disk
  await browser.close();
  if (video) {
    const recorded = await video.path();
    await mkdir(dirname(outPath), { recursive: true });
    await rename(recorded, outPath);
    console.error(`Saved recording to ${outPath}`);
  }
}

process.exit(failed ? 1 : 0);
