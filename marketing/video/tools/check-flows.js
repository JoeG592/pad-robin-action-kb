// marketing/video/tools/check-flows.js
// Static check of Robin flow files against the public Action KB.
// CLI: node tools/check-flows.js <kb.json> <flow.robin>... [--expect-fail <flow.robin>]
const fs = require("fs");
const path = require("path");

// Built-in Robin statements (not KB actions). `WAIT <seconds>` is a delay; `WAIT (Action ...)` wraps a KB Wait action.
const CONTROL = /^(SET |LOOP |END\b|ELSE\b|ELSE IF |IF (?!\()|WAIT (?!\()|NEXT LOOP|EXIT|CALL |FUNCTION |LABEL |GOTO |BLOCK |ON BLOCK ERROR|ON ERROR|THROW ERROR|DISABLE |#)/;

function parseLine(line) {
  let s = line.trim()
    .replace(/^IF \((.*)\) THEN$/, "$1")
    .replace(/^WAIT \((.*)\)$/, "$1")
    .replace(/^LOOP WHILE \((.*)\)$/, "$1");
  const id = s.split(" ")[0];
  s = s.slice(id.length)
    .replace(/\$'''[\s\S]*?'''/g, '""')
    .replace(/\[[^\]]*\]/g, "[]")
    .replace(/\{[^}]*\}/g, "{}");
  const args = [...s.matchAll(/(?:^|\s)(\w+): /g)].map(m => m[1]);
  const outs = [...s.matchAll(/(?:^|\s)(\w+)=> \w+/g)].map(m => m[1]);
  return { id, args, outs };
}

function checkRobin(text, kb) {
  const byId = new Map(kb.actions.map(a => [a.actionId, a]));
  const errors = [];
  let actionLines = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    // PAD 2.72 silently rejects the whole paste for these two (paste probes, 2026-10-06).
    for (const m of line.matchAll(/\$'''([\s\S]*?)'''/g))
      for (const v of m[1].matchAll(/(?<!\\)\\%(\w[\w.]*)%/g))
        errors.push(`line ${i + 1}: backslash before %${v[1]}% in a string; write \\\\%${v[1]}% (PAD rejects the whole paste)`);
    const cond = line.match(/^(?:ELSE )?IF (?!\()(.*) THEN$/);
    if (cond) {
      const prop = cond[1].replace(/\$'''[\s\S]*?'''/g, '""').match(/\b[A-Za-z_]\w*\.[A-Za-z_]\w*/);
      if (prop) errors.push(`line ${i + 1}: property access ${prop[0]} in an IF condition; SET it to a variable first (PAD rejects the whole paste)`);
    }
    const isAction = /^(IF|WAIT|LOOP WHILE) \(/.test(line) || !CONTROL.test(line);
    if (!isAction) return;
    actionLines++;
    const { id, args, outs } = parseLine(line);
    const rec = byId.get(id);
    if (!rec) { errors.push(`line ${i + 1}: unknown action ${id}`); return; }
    const ins = new Set((rec.input_params || []).map(p => p.name.toLowerCase()));
    const os = new Set((rec.output_params || []).map(p => p.name.toLowerCase()));
    for (const a of args) if (!ins.has(a.toLowerCase())) errors.push(`line ${i + 1}: ${id} has no argument ${a}`);
    for (const o of outs) if (!os.has(o.toLowerCase())) errors.push(`line ${i + 1}: ${id} has no output ${o}`);
  });
  return { errors, actionLines };
}

module.exports = { checkRobin, parseLine };

if (require.main === module) {
  const args = process.argv.slice(2);
  const ef = args.indexOf("--expect-fail");
  const expectFail = ef >= 0 ? path.resolve(args.splice(ef, 2)[1]) : null;
  const [kbPath, ...flows] = args;
  const kb = JSON.parse(fs.readFileSync(kbPath, "utf8"));
  let bad = false;
  for (const f of [...flows, ...(expectFail ? [expectFail] : [])]) {
    const r = checkRobin(fs.readFileSync(f, "utf8"), kb);
    const shouldFail = path.resolve(f) === expectFail;
    const ok = shouldFail ? r.errors.length > 0 : r.errors.length === 0;
    console.log(`${ok ? "OK  " : "BAD "} ${path.basename(f)}: ${r.actionLines} action lines, ${r.errors.length} errors${shouldFail ? " (expected to fail)" : ""}`);
    for (const e of r.errors) console.log("     " + e);
    if (!ok) bad = true;
  }
  process.exit(bad ? 1 : 0);
}
