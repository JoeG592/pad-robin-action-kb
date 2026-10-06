// marketing/video/tools/build-capture-index.js
// captures/*.json -> captures/index.js defining window.CAPTURES (file:// pages cannot fetch JSON).
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "captures");
const caps = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, ""));
  j.rows = [].concat(j.rows);
  j.errors = [].concat(j.errors || []);
  caps[j.flow] = j;
}
fs.writeFileSync(path.join(dir, "index.js"), "window.CAPTURES = " + JSON.stringify(caps, null, 1) + ";\n");
console.log(Object.entries(caps).map(([k, v]) => `${k}: ${v.status} ${v.actions} actions, ${v.rows.length} rows, strip ${v.canvas.w}x${v.stripHeight}`).join("\n"));
