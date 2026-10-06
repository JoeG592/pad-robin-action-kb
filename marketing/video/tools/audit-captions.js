// marketing/video/tools/audit-captions.js
// CLI: node tools/audit-captions.js   (reads ../scenes.js, ../captures/*.json, ../../../PAD_Robin_ActionKB_v3_1.json)
const fs = require("fs");
const path = require("path");

function audit(captions, allowed) {
  const out = [];
  captions.forEach((c, i) => {
    const n = i + 1, lines = c.text.split("\n"), chars = c.text.replace(/\n/g, " ").length;
    const need = Math.max(2.5, chars / 17), shown = c.t1 - c.t0;
    if (shown + 1e-9 < need) out.push(`caption ${n} shown ${shown.toFixed(2)} s, needs ${need.toFixed(2)} s`);
    lines.forEach((l, j) => { if (l.length > 42) out.push(`caption ${n} line ${j + 1} is ${l.length} chars (max 42)`); });
    if (lines.length > 2) out.push(`caption ${n} has ${lines.length} lines (max 2)`);
    for (const m of c.text.match(/\d+(?:\.\d+)?/g) || []) if (!allowed.has(m)) out.push(`caption ${n} number ${m} not in allowed set`);
  });
  return out;
}
module.exports = { audit };

if (require.main === module) {
  const here = path.join(__dirname, "..");
  const S = require(path.join(here, "scenes.js"));
  const kb = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "PAD_Robin_ActionKB_v3_1.json"), "utf8"));
  const tr = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "PAD_Robin_TypeReference_v3_1.json"), "utf8"));
  // step labels 1-4, "CC BY 4.0", the PAD build, and the KB counts
  const allowed = new Set([String(kb.counts.total), String(kb.counts.modules), String(tr.types.length), "0", "2.72", "4.0", "1", "2", "3", "4"]);
  const capDir = path.join(here, "captures");
  for (const f of fs.readdirSync(capDir).filter(f => f.endsWith(".json")))
    allowed.add(String(JSON.parse(fs.readFileSync(path.join(capDir, f), "utf8").replace(/^﻿/, "")).actions));
  const problems = audit(S.captions(), allowed);
  console.log(problems.length ? problems.join("\n") : `captions OK (${S.captions().length})`);
  process.exit(problems.length ? 1 : 0);
}
