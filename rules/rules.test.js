// rules/rules.test.js - the rules file is the single source: its evidence must hold, the checker must agree
// with its examples, and every rendered copy must be current.   node --test rules/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const rules = require("./robin-rules.json");
const { verify, targets, scoreChecker } = require("./render-rules.js");
const { checkRobin, KEYWORDS } = require("../marketing/video/tools/check-flows.js");
const kb = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "PAD_Robin_ActionKB_v3_3.json"), "utf8"));

test("every rule's evidence holds in the probe corpus", () => {
  assert.deepStrictEqual(verify(), []);
});

for (const r of rules.rules) {
  if (!r.bad && !r.good) continue;
  test(`checker agrees with rule ${r.id}`, () => {
    for (const src of r.bad || []) assert.ok(checkRobin(src, kb).errors.length > 0, `should flag:\n${src}`);
    for (const src of r.good || []) assert.deepStrictEqual(checkRobin(src, kb).errors, [], `should pass:\n${src}`);
  });
}

test("the checker's keyword list is the rules file's list", () => {
  const kw = rules.rules.find(r => r.id === "keywords-as-names").keywords;
  assert.deepStrictEqual([...KEYWORDS].sort(), [...kw].sort());
});

test("the checker catches every silent reject in the corpus", () => {
  const s = scoreChecker();
  assert.deepStrictEqual(s.missed, []);
});

test("README.md and PROMPT.md are rendered from the current rules", () => {
  const score = scoreChecker();
  for (const t of targets({}, score)) {
    const text = fs.readFileSync(t.file, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    assert.strictEqual(t.make(text.replace(/\r\n/g, "\n")).replace(/\n/g, eol), text, `${path.basename(t.file)} is out of date: node rules/render-rules.js`);
  }
});
