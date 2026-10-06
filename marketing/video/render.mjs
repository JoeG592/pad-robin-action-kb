// Renders video.html frame by frame and encodes it to MP4 with ffmpeg.
// Usage: node render.mjs [--format 16x9|4x5] [--fps 30] [--stills] [out.mp4]
// Needs Playwright (Chromium) and ffmpeg on PATH. Fonts: see README.md.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { launch } = require("./tools/browser.cjs");

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const format = arg("--format", "16x9");
const fps = Number(arg("--fps", 30));
const stills = args.includes("--stills");
const size = format === "4x5" ? { width: 1080, height: 1350 } : { width: 1920, height: 1080 };
const out = path.resolve(args.find(a => a.endsWith(".mp4")) || path.join(here, format === "4x5" ? "pad-robin-kb-promo-4x5.mp4" : "pad-robin-kb-promo.mp4"));

const browser = await launch();
const page = await browser.newPage({ viewport: size });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(pathToFileURL(path.join(here, "video.html")).href + "?format=" + format);
await page.evaluate(() => document.fonts.ready);
if (errors.length) { console.error(errors); process.exit(1); }
const duration = await page.evaluate(() => window.DURATION);

if (stills) {
  // one still per beat, for review
  for (const t of [3, 8, 13, 16, 21, 31, 35, 42, 46, 53, 57, 61, 68, 76]) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(here, `still-${format}-${String(t).padStart(2, "0")}.png`) });
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
