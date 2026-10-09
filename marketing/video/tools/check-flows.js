// marketing/video/tools/check-flows.js
// Static pre-paste check of Robin flow files against the public Action KB.
// CLI: node tools/check-flows.js <kb.json> <flow.robin>... [--expect-fail <flow.robin>]
//
// Rules come from paste probes on PAD 2.72 (2026-10-06, 563 pastes). Most of them make the Designer
// drop the WHOLE paste with an empty canvas and no error message, so they are worth catching first.
const fs = require("fs");
const path = require("path");

// PAD keywords break as property or variable names (Mail.From, SET Error TO ...): use Mail['From'].
const KEYWORDS = ["From", "To", "Step", "End", "In", "Then", "Loop", "If", "Set", "Else", "Not", "And", "Or", "Mod", "Wait", "Call",
  "Exit", "Label", "Next", "Foreach", "Function", "Case", "Default", "Switch", "Block", "Error", "On", "True", "False", "Global",
  "Disable", "While", "Goto", "Throw"];
const KW = new RegExp(`^(${KEYWORDS.join("|")})$`, "i");

// Split the text into statements. Strings ($'''...''') may span lines; inside them a backslash escapes the
// next character, %...% is an expression and %% is a literal percent sign.
function scan(text) {
  const errors = [];
  const stmts = [];
  let line = 1, i = 0;
  let cur = null;                 // { line, bare, exprs: [] }
  const err = (ln, msg) => errors.push({ line: ln, msg });
  const start = () => (cur = cur || { line, bare: "", exprs: [] });
  const finish = () => { if (cur && cur.bare.trim()) stmts.push({ ...cur, bare: cur.bare.trim() }); cur = null; };
  const atLineStart = () => !cur || !cur.bare.trim();
  while (i < text.length) {
    const c = text[i];
    if (c === "\r" && text[i + 1] === "\n") { i++; continue; }
    if (c === "\n" || c === "\r") { finish(); line++; i++; continue; }          // PAD also accepts CR-only line breaks
    if (atLineStart()) {
      const rest = text.slice(i).replace(/^[ \t]+/, "");
      const skip = text.length - i - rest.length;
      if (rest.startsWith("# [ControlRepository]")) break;                 // UI element JSON follows
      if (rest.startsWith("/#")) {                                         // block comment
        const end = text.indexOf("#/", i + skip + 2);
        const stop = end < 0 ? text.length : end + 2;
        stmts.push({ line, bare: "#", exprs: [], comment: true });
        line += (text.slice(i, stop).match(/\n/g) || []).length;
        i = stop; continue;
      }
      if (rest.startsWith("#")) {                                          // line comment
        stmts.push({ line, bare: "#", exprs: [], comment: true });
        const nl = text.indexOf("\n", i); i = nl < 0 ? text.length : nl; continue;
      }
    }
    if (c === "#" && cur && /\s$/.test(cur.bare)) { const nl = text.indexOf("\n", i); i = nl < 0 ? text.length : nl; continue; } // trailing comment
    if (text.startsWith("$'''", i)) {
      start();
      const sLine = line;
      i += 4;
      let closed = false;
      while (i < text.length) {
        const d = text[i];
        if (d === "\n") { line++; i++; continue; }
        if (d === "\\") {
          if (text[i + 1] === "%") {
            err(line, "backslash before % in a string (PAD drops the paste for \\%Var% and loses the % otherwise); write \\\\%Var% for a path, %% for a literal percent sign");
            const v = text.slice(i + 2).match(/^[A-Za-z_][\w.\[\]']*%/);    // skip the rest of \%Var% so it is reported once
            i += 2 + (v ? v[0].length : 0); continue;
          }
          i += 2; continue;
        }
        if (text.startsWith("''''", i)) { err(line, "a string can't end with an apostrophe; escape it as \\' (PAD drops the whole paste)"); i += 4; closed = true; break; }
        if (text.startsWith("'''", i)) { i += 3; closed = true; break; }
        if (d === "'") { err(line, "apostrophe inside $'''...''' drops the whole paste; escape it as \\'"); i++; continue; }
        if (d === "%") {
          if (text[i + 1] === "%") { i += 2; continue; }                  // %% = literal percent
          let j = i + 1, q = false;
          while (j < text.length && !(text[j] === "%" && !q) && !(!q && text.startsWith("'''", j))) { if (text[j] === "'") q = !q; j++; }
          if (text[j] !== "%") { err(line, "lone % inside a string drops the whole paste; write %% for a literal percent sign"); i++; continue; }
          cur.exprs.push({ line, expr: text.slice(i + 1, j) });
          i = j + 1; continue;
        }
        i++;
      }
      if (!closed) err(sLine, "string never closes (a backslash right before ''' escapes the quote; write \\\\''' to end with a backslash)");
      cur.bare += '""';
      continue;
    }
    start();
    cur.bare += c;
    i++;
  }
  finish();
  return { stmts, errors };
}

// Action id, arguments (with their value text) and outputs of one action statement (strings already "").
function parseAction(s) {
  let t = s.replace(/^IF \((.*)\) THEN$/i, "$1").replace(/^WAIT \((.*)\)$/i, "$1").replace(/^LOOP WHILE \((.*)\)$/i, "$1");
  const id = t.split(" ")[0];
  t = t.slice(id.length);
  const outs = [...t.matchAll(/(?:^|\s)(\w+)\s?=>\s?(\w+)/g)].map(m => ({ name: m[1], var: m[2] }));
  const noOut = t.replace(/(?:^|\s)\w+\s?=>\s?\w+/g, " ");
  const marks = [...noOut.matchAll(/(?:^|\s)(\w+)\s?:\s?(?=\S)/g)];
  const argList = marks.map((m, i) => ({ name: m[1], value: noOut.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : noOut.length).trim() }));
  return { id, args: argList.map(a => a.name), argList, outs };
}

// Words in an expression that are not variables.
const NOT_VARS = /^(AND|OR|NOT|mod|True|False|appmask|imgrepo|_)$/i;

function checkRobin(text, kb, opts = {}) {
  const byId = new Map(kb.actions.map(a => [a.actionId.toLowerCase(), a]));
  const modules = new Set(kb.actions.map(a => a.actionId.split(".")[0].toLowerCase()));
  const isActionCall = s => { const m = s.match(/^([A-Za-z]\w*)\.\w+/); return !!m && modules.has(m[1].toLowerCase()); };
  const { stmts, errors: scanErrors } = scan(text);
  const errors = scanErrors.map(e => `line ${e.line}: ${e.msg}`);
  const E = (st, msg) => errors.push(`line ${st.line}: ${msg}`);
  let actionLines = 0;
  const stack = [];                                   // "handler" | "block" | "other"
  let pendingHandler = false;                          // after BLOCK, the next ON BLOCK ERROR opens a handler

  const reservedIn = (st, src, what) => {
    // property access with a keyword name; skip enums (Module.Type.Value) and action ids
    const cleaned = src.replace(/\b[A-Za-z]\w*\.[A-Za-z]\w*\.\w+/g, m => (modules.has(m.split(".")[0].toLowerCase()) ? "" : m));
    for (const m of cleaned.matchAll(/\b([A-Za-z_]\w*(?:\[[^\]]*\])*)\.([A-Za-z_]\w*)/g))
      if (KW.test(m[2])) E(st, `property ${m[1]}.${m[2]}${what}: ${m[2]} is a PAD keyword and drops the whole paste; write ${m[1]}['${m[2]}']`);
  };
  const varName = (st, name, where) => {
    if (/^\d/.test(name)) E(st, `variable ${name} starts with a digit (PAD drops the whole paste)`);
    else if (KW.test(name)) E(st, `${where} ${name} is a PAD keyword and drops the whole paste; pick another name`);
  };

  // Variables set anywhere in the script (PAD variables are flow-wide and case-insensitive), plus any the
  // caller knows exist already (flow inputs). A use of anything else is "Variable 'X' doesn't exist".
  const ID = "[\\p{L}_][\\p{L}\\p{N}_]*";                                          // PAD accepts Unicode names (SET Café TO 1)
  const defined = new Set((opts.knownVars || []).map(v => v.toLowerCase()));
  for (const st of stmts) {
    if (st.comment) continue;
    const s = st.bare.replace(/^DISABLE\s+/i, "");
    let m;
    if ((m = s.match(new RegExp(`^SET\\s+(${ID})\\s+TO\\b`, "iu"))) || (m = s.match(new RegExp(`^LOOP\\s+FOREACH\\s+(${ID})\\s+IN\\b`, "iu"))) || (m = s.match(new RegExp(`^LOOP\\s+(${ID})\\s+FROM\\b`, "iu"))))
      defined.add(m[1].toLowerCase());
    for (const o of s.matchAll(new RegExp(`=>\\s?(${ID})`, "gu"))) defined.add(o[1].toLowerCase());
    // In-place Variables actions (AddItemToList List:, IncreaseVariable Value:, ...) create the variable they
    // modify: PAD 2.72 accepts them with an undefined variable.
    const rec = byId.get(s.split(" ")[0].toLowerCase());
    if (rec && /^Variables\./i.test(rec.actionId) && !(rec.output_params || []).length)
      for (const a of parseAction(s).argList) {
        const p = (rec.input_params || []).find(x => x.name.toLowerCase() === a.name.toLowerCase());
        if (p && (/^(List`1|DataTable)/.test(p.type) || /^(Increase|Decrease)Variable$/.test(rec.actionId.split(".")[1]) && p.name === "Value") && new RegExp(`^${ID}$`, "u").test(a.value))
          defined.add(a.value.toLowerCase());
      }
  }
  const reported = new Set();
  const usesIn = (st, src) => {
    let t = src.replace(/'(?:\\.|[^'\\])*'/g, "''");                               // expression string literals; \' is escaped (appmask['Window \'X\''])
    t = t.replace(/\b[A-Za-z]\w*\.[A-Za-z]\w*\.\w+/g, x => (modules.has(x.split(".")[0].toLowerCase()) ? " " : x)); // enums
    for (const m of t.matchAll(/(^|[^.\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*)(?![\p{L}\p{N}_])(?!\s*\()/gu)) {
      const name = m[2];
      if (NOT_VARS.test(name) || defined.has(name.toLowerCase()) || reported.has(name.toLowerCase())) continue;
      reported.add(name.toLowerCase());
      E(st, `variable ${name} is used but never set in this script (PAD: "Variable '${name}' doesn't exist")`);
    }
  };

  stmts.forEach((st, k) => {
    if (st.comment) return;
    let s = st.bare.replace(/^DISABLE\s+/i, "");
    const U = s.toUpperCase();
    for (const x of st.exprs) { reservedIn(st, x.expr, " inside a string"); usesIn(st, x.expr); }
    if (/\S\s+SET\s+\w+\s+TO\s/i.test(s)) E(st, "two statements on one line drop the whole paste; put each on its own line");
    if (s.includes("%")) E(st,"%...% outside a string drops the whole paste; write the expression without percent signs (SET X TO N + 1, IF N = 5, Text: Msg)");

    if (s.startsWith("@@")) {
      if (!/^@@copilotGeneratedAction\b/i.test(s)) E(st, `${s.split(/[:\s]/)[0]} lines drop the whole paste (only @@copilotGeneratedAction is confirmed to paste)`);
      const next = stmts[k + 1];
      if (!next || next.comment || next.bare.startsWith("@@")) E(st, "an @@ line must be followed directly by an action (PAD drops the whole paste)");
      return;
    }
    if (/^\*\*(END)?REGION\b/i.test(s)) return;
    if (/^(END )?REGION\b/i.test(s)) { E(st, "write **REGION Name / **ENDREGION; REGION / END REGION drops the whole paste"); return; }
    if (/^FUNCTION\b/i.test(s) || /^END FUNCTION\b/i.test(s)) { E(st, "subflow definitions (FUNCTION ... END FUNCTION) can't be pasted; paste each subflow's body into its own subflow"); return; }
    if (/^EXIT FUNCTION\b/i.test(s)) { E(st, "EXIT FUNCTION only works inside a subflow"); return; }

    const inHandler = stack[stack.length - 1] === "handler";
    if (inHandler && !/^(SET |CALL |GOTO |THROW ERROR\b|END\b)/i.test(s)) {
      if (/^(IF|LOOP|SWITCH|BLOCK)\b/i.test(s)) E(st, "IF / LOOP / SWITCH inside an error handler drops the whole paste; set a flag here and test it after the block");
      else E(st, "only SET, CALL, GOTO and THROW ERROR are allowed inside ON BLOCK ERROR / ON ERROR (\"The statement isn't allowed inside exception handling\")");
    }

    if (/^END\b/i.test(s)) { stack.pop(); return; }
    if (/^ON BLOCK ERROR\b/i.test(s)) {
      if (/REPEAT/i.test(s)) E(st, "ON BLOCK ERROR has no REPEAT option (REPEAT n TIMES WAIT n belongs to an action's ON ERROR)");
      if (pendingHandler) { stack.push("handler"); pendingHandler = false; }
      return;
    }
    if (/^ON ERROR\b/i.test(s)) {
      if (/^ON ERROR\s+GOTO\b/i.test(s)) { E(st, "ON ERROR GOTO Label drops the whole paste; put GOTO Label inside ON ERROR ... END"); return; }
      stack.push("handler"); return;
    }
    if (/^BLOCK\b/i.test(s)) { stack.push("block"); pendingHandler = true; return; }
    pendingHandler = false;
    if (/^ELSE IF\s*\(/i.test(s) && isActionCall(s.replace(/^ELSE IF\s*\(/i, ""))) { E(st, "ELSE IF (Action ...) THEN drops the whole paste; use ELSE with a nested IF (Action ...) THEN ... END"); return; }
    if (/^(ELSE|ELSE IF .* THEN|DEFAULT|NEXT LOOP|EXIT LOOP|EXIT\b.*|THROW ERROR\b.*|LABEL \w+|GOTO \w+|CALL \w+.*|WAIT (?!\().*)$/i.test(s)) {
      reservedIn(st, s, "");
      const c = s.match(/^ELSE IF (.*) THEN$/i) || s.match(/^WAIT (.*)$/i);
      if (c) usesIn(st, c[1]);
      return;
    }
    if (/^CASE\b/i.test(s)) {
      if (!/^CASE\s*(=|<>|>=|<=|>|<)/i.test(s)) E(st, "CASE takes a comparison (CASE = x, <>, >, <, >=, <=); other forms drop the whole paste");
      reservedIn(st, s, ""); usesIn(st, s.replace(/^CASE\s*(=|<>|>=|<=|>|<)?/i, "")); return;
    }
    if (/^SWITCH\b/i.test(s)) { stack.push("other"); reservedIn(st, s, ""); usesIn(st, s.replace(/^SWITCH/i, "")); return; }
    let m;
    if ((m = s.match(/^ERROR\s*=>\s*(\w+)/i))) { varName(st, m[1], "variable"); return; }
    if ((m = s.match(/^SET\s+(\S+)\s+TO\b/i))) { varName(st, m[1], "variable"); const v = s.replace(/^SET\s+\S+\s+TO/i, ""); reservedIn(st, v, ""); usesIn(st, v); return; }
    if ((m = s.match(/^LOOP\s+FOREACH\s+(\w+)\s+IN\b/i))) { stack.push("other"); varName(st, m[1], "loop variable"); reservedIn(st, s, ""); usesIn(st, s.replace(/^LOOP\s+FOREACH\s+\w+\s+IN/i, "")); return; }
    if ((m = s.match(/^LOOP\s+(\w+)\s+FROM\b/i))) { stack.push("other"); varName(st, m[1], "loop variable"); reservedIn(st, s, ""); usesIn(st, s.replace(/^LOOP\s+\w+\s+FROM/i, "").replace(/\b(TO|STEP)\b/gi, " ")); return; }

    const wrapped = s.match(/^(IF|WAIT|LOOP WHILE)\s*\((.*)\)(\s+THEN)?$/i);
    const isAction = wrapped ? isActionCall(wrapped[2]) : !/^(IF|LOOP)\b/i.test(s);
    if (/^(IF|LOOP)\b/i.test(s)) stack.push("other");
    if (!isAction) { reservedIn(st, s, ""); usesIn(st, s.replace(/^(IF|LOOP WHILE)\b/i, "").replace(/\bTHEN$/i, "")); return; }

    actionLines++;
    const { id, args, argList, outs } = parseAction(s);
    const rec = byId.get(id.toLowerCase());
    if (!rec) { E(st, `unknown action ${id}`); return; }
    const ins = new Set((rec.input_params || []).map(p => p.name.toLowerCase()));
    const os = new Set((rec.output_params || []).map(p => p.name.toLowerCase()));
    const seen = new Set();
    for (const a of args) {
      if (seen.has(a.toLowerCase())) E(st, `${id} sets argument ${a} twice`);
      seen.add(a.toLowerCase());
      if (!ins.has(a.toLowerCase())) E(st, `${id} has no argument ${a}`);
    }
    // Enum arguments: the value must be one the KB lists for that input (KB 3.1.5 carries enumValues).
    for (const a of argList) {
      const p = (rec.input_params || []).find(x => x.name.toLowerCase() === a.name.toLowerCase());
      const ev = p && p.enumValues;
      let e;
      if (ev && (e = a.value.match(/^([A-Za-z]\w*)\.([A-Za-z]\w*)\.(\w+)$/))) {
        if (!ev.some(v => v.toLowerCase() === e[3].toLowerCase()))
          E(st, `${id} ${a.name}: ${e[3]} is not a value of ${e[1]}.${e[2]} (${ev.slice(0, 8).join(", ")}${ev.length > 8 ? ", ..." : ""})`);
        continue;
      }
      if (ev && /^[A-Za-z_]\w*$/.test(a.value) && !defined.has(a.value.toLowerCase()) && ev.some(v => v.toLowerCase() === a.value.toLowerCase())) {
        reported.add(a.value.toLowerCase());
        E(st, `${id} ${a.name}: an enum value needs its module and type, e.g. Module.${p.type}.${a.value}; copy the form from the golden example`);
        continue;
      }
      usesIn(st, a.value);
    }
    for (const o of outs) {
      if (!os.has(o.name.toLowerCase())) E(st, `${id} has no output ${o.name}`);
      varName(st, o.var, "output variable");
    }
    reservedIn(st, s.slice(id.length), "");
  });
  return { errors, actionLines };
}

module.exports = { checkRobin, parseAction, scan, KEYWORDS };

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
