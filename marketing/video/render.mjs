// Renders video.html frame by frame and encodes it to MP4 with ffmpeg.
// Usage: node render.mjs [out.mp4] [--fps 30] [--stills]
// Needs Playwright (Chromium) and ffmpeg on PATH. Fonts: see README.md.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve(args.find(a => a.endsWith(".mp4")) || path.join(here, "pad-robin-kb-promo.mp4"));
const fps = Number(args[args.indexOf("--fps") + 1]) || 30;
const stills = args.includes("--stills");

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(here, "video.html")).href);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);

if (stills) {
  // One still per scene, for review
  for (const t of [7.5, 13, 21, 33, 47.5, 57, 64, 71]) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(here, `still-${String(t).replace(".", "_")}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });

const frames = Math.round(duration * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.render(t), i / fps);
  const buf = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  if (i % fps === 0) process.stdout.write(`\r${Math.round(i / frames * 100)}%`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
await browser.close();
console.log(`\nwrote ${out}`);
