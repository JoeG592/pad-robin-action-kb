// rules/render-rules.js - render rules/robin-rules.json into every place that states the Robin syntax rules.
//
//   node rules/render-rules.js [--check] [--skill <SKILL.md>] [--prompt-module <file.js>]
//
// Always: README.md (between <!-- robin-rules:begin --> and <!-- robin-rules:end -->) and PROMPT.md (the
// lines from "VALUE SYNTAX:" up to "VARIABLES:"). --skill: the pad-robin SKILL.md (same markers as README).
// --prompt-module: also writes the prompt block as an ES module (export const ROBIN_SYNTAX_RULES) for an app
// that builds its own system prompt.
// --check writes nothing and exits 1 if any target is out of date.
//
// Before rendering it verifies every rule against rules/probe-corpus.json and refuses on any problem: each
// cited probe must exist with the stated outcome (and row description, for value checks); a silent or error
// rule must cite a failing probe and a clean one; a value rule must cite a row description.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const rulesFile = require("./robin-rules.json");
const corpus = require("./probe-corpus.json");

function verify(rules = rulesFile, probes = corpus.probes) {
  const P = new Map(probes.map(p => [p.id, p]));
  const problems = [];
  for (const r of rules.rules) {
    const ev = r.evidence || [];
    for (const e of ev) {
      const p = P.get(e.probe);
      if (!p) { problems.push(`${r.id}: probe ${e.probe} is not in the corpus`); continue; }
      if (p.outcome !== e.outcome) problems.push(`${r.id}: probe ${e.probe} was ${p.outcome}, rule says ${e.outcome}`);
      if (e.detail && !(p.details || []).some(d => d.includes(e.detail))) problems.push(`${r.id}: no row of ${e.probe} reads ${JSON.stringify(e.detail)}`);
    }
    if (r.kind === "silent" || r.kind === "error") {
      if (!ev.length && !r.evidence_note) problems.push(`${r.id}: a ${r.kind} rule needs evidence`);
      if (ev.length && !ev.some(e => e.outcome !== "clean")) problems.push(`${r.id}: no probe shows the failure`);
      if (ev.length && !ev.some(e => e.outcome === "clean")) problems.push(`${r.id}: no probe shows the fix pasting clean`);
    }
    if (r.kind === "value" && !ev.some(e => e.detail)) problems.push(`${r.id}: a value rule needs a row-description check`);
    if (!rules.sections.some(s => s.id === r.section)) problems.push(`${r.id}: unknown section ${r.section}`);
  }
  return problems;
}

const fill = (text, r, style) => text.replace("{keywords}", () => (r.keywords || []).map(k => (style === "doc" ? "`" + k + "`" : k)).join(", "));

// Markdown for README / SKILL.md. `score` is the checker's result on the corpus.
function renderDoc(score) {
  const out = [];
  out.push(`Every rule below was confirmed by pasting into PAD ${rulesFile.pad_build.split(".").slice(0, 2).join(".")} (${rulesFile.pad_build}): ${corpus.probes.length} probe pastes in October 2026, kept with their outcomes in \`rules/probe-corpus.json\`. Most failures are silent. PAD drops the whole paste, the canvas stays empty and no error is shown, so one bad line costs the whole script.`);
  let n = 0;
  for (const s of rulesFile.sections) {
    const rules = rulesFile.rules.filter(r => r.section === s.id && r.doc);
    if (!rules.length) continue;
    out.push("", `**${s.title}**`, "");
    for (const r of rules) {
      n++;
      const pad = " ".repeat(String(n).length + 2);
      const lines = fill(r.doc, r, "doc").split("\n");
      out.push(`${n}. ${lines[0]}`, ...lines.slice(1).map(l => (l ? pad + l : "")));
    }
  }
  out.push("",
    "The 3.1.3 documentation said property access in an `IF` condition rejects the paste. That was wrong: it does not reproduce, and the form that fails is `%...%` outside a string.",
    "",
    "`marketing/video/tools/check-flows.js` checks a script against these rules and the KB before you paste it:",
    "",
    "```",
    "node marketing/video/tools/check-flows.js PAD_Robin_ActionKB_v3_3.json flow.robin",
    "```",
    "",
    `On the probe corpus it flags ${score.rejectedCaught} of ${score.rejected} silent rejects and ${score.errorsCaught} of ${score.errors} pastes that landed with errors, and passes ${score.cleanPassed} of ${score.clean} clean pastes. The ${score.clean - score.cleanPassed} it flags use \`\\%\`, which PAD accepts while silently dropping the percent sign.`);
  return out.join("\n");
}

// Plain text for PROMPT.md and app prompts (--prompt-module).
function renderPrompt() {
  const out = [];
  let heading = null;
  for (const s of rulesFile.sections) {
    const rules = rulesFile.rules.filter(r => r.section === s.id && r.prompt);
    if (!rules.length) continue;
    if (s.prompt !== heading) { if (heading) out.push(""); out.push(s.prompt); heading = s.prompt; }
    for (const r of rules) for (const l of r.prompt) out.push(fill(l, r, "prompt"));
  }
  return out.join("\n");
}

// Score the checker on the corpus (needs the public KB in the repo root).
function scoreChecker() {
  const { checkRobin } = require("../marketing/video/tools/check-flows.js");
  const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "PAD_Robin_ActionKB_v3_3.json"), "utf8"));
  const s = { rejected: 0, rejectedCaught: 0, errors: 0, errorsCaught: 0, clean: 0, cleanPassed: 0, missed: [], falsePositives: [] };
  for (const p of corpus.probes) {
    const flagged = checkRobin(p.robin, kb).errors.length > 0;
    if (p.outcome === "rejected") { s.rejected++; if (flagged) s.rejectedCaught++; else s.missed.push(p.id); }
    else if (p.outcome === "errors") { s.errors++; if (flagged) s.errorsCaught++; }
    else { s.clean++; if (!flagged) s.cleanPassed++; else s.falsePositives.push(p.id); }
  }
  return s;
}

function between(text, begin, end, body, file) {
  const a = text.indexOf(begin), b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${file}: markers ${begin} / ${end} not found`);
  return text.slice(0, a + begin.length) + "\n" + body + "\n" + text.slice(b);
}

const tlEscape = s => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

function targets(opts, score) {
  const doc = renderDoc(score), prompt = renderPrompt();
  const t = [];
  const docInto = file => ({ file, make: text => between(text, "<!-- robin-rules:begin -->", "<!-- robin-rules:end -->", doc, file) });
  t.push(docInto(path.join(ROOT, "README.md")));
  t.push({ file: path.join(ROOT, "PROMPT.md"), make: text => {
    const a = text.indexOf("VALUE SYNTAX:"), b = text.indexOf("VARIABLES:");
    if (a < 0 || b < a) throw new Error("PROMPT.md: VALUE SYNTAX: ... VARIABLES: not found");
    return text.slice(0, a) + prompt + "\n\n" + text.slice(b);
  } });
  if (opts.skill) t.push(docInto(opts.skill));
  if (opts.promptModule) t.push({ file: opts.promptModule, make: () =>
    "// GENERATED from github.com/JoeG592/pad-robin-action-kb rules/robin-rules.json by rules/render-rules.js.\n" +
    "// Do not edit by hand: change the rules file and re-render.\n" +
    "export const ROBIN_SYNTAX_RULES = `" + tlEscape(prompt) + "`;\n" });
  return t;
}

module.exports = { verify, renderDoc, renderPrompt, scoreChecker, targets };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
  const check = argv.includes("--check");
  const problems = verify();
  if (problems.length) { for (const p of problems) console.error("RULES  " + p); process.exit(1); }
  const score = scoreChecker();
  let stale = 0;
  for (const t of targets({ skill: opt("--skill"), promptModule: opt("--prompt-module") }, score)) {
    const before = fs.existsSync(t.file) ? fs.readFileSync(t.file, "utf8") : "";
    const eol = before.includes("\r\n") ? "\r\n" : "\n";
    const after = t.make(before.replace(/\r\n/g, "\n")).replace(/\n/g, eol);
    if (after === before) { console.log("up to date  " + t.file); continue; }
    stale++;
    if (check) console.log("OUT OF DATE " + t.file);
    else { fs.writeFileSync(t.file, after); console.log("rendered    " + t.file); }
  }
  console.log(`${rulesFile.rules.length} rules verified against ${corpus.probes.length} probes; checker: ${score.rejectedCaught}/${score.rejected} silent rejects, ${score.errorsCaught}/${score.errors} errors, ${score.cleanPassed}/${score.clean} clean`);
  if (check && stale) process.exit(1);
}
