// Finds Playwright and a Chromium that exists on this machine, then launches it.
// Order: local `playwright` package, Node's global lib, npm global root (incl. the @playwright/cli bundle).
// If the bundled Playwright expects a browser build that isn't installed, falls back to the newest
// chromium_headless_shell-* under %LOCALAPPDATA%\ms-playwright, or to PW_CHROMIUM if set.
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

function loadPlaywright() {
  const tries = ["playwright", path.join(process.execPath, "../../lib/node_modules/playwright")];
  try {
    const g = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    tries.push(path.join(g, "playwright"), path.join(g, "@playwright/cli/node_modules/playwright"));
  } catch {}
  for (const t of tries) { try { return require(t); } catch {} }
  throw new Error("Playwright not found. Run: npm i -D playwright && npx playwright install chromium");
}

function installedChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const base = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter(d => /^chromium_headless_shell-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const exe = path.join(base, d, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

async function launch() {
  const pw = loadPlaywright();
  try { return await pw.chromium.launch(); }
  catch (e) {
    const exe = installedChromium();
    if (!exe) throw e;
    return pw.chromium.launch({ executablePath: exe });
  }
}

module.exports = { launch };
