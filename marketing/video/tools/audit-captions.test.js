// marketing/video/tools/audit-captions.test.js
const test = require("node:test");
const assert = require("node:assert");
const { audit } = require("./audit-captions.js");

test("flags long lines, too many lines, short display, unknown numbers", () => {
  const caps = [
    { t0: 0, t1: 3, text: "AI-written PAD scripts rarely paste." },
    { t0: 3, t1: 4, text: "Paste it. Every action lands." },
    { t0: 4, t1: 8, text: "This line is definitely longer than forty-two characters" },
    { t0: 8, t1: 12, text: "one\ntwo\nthree" },
    { t0: 12, t1: 16, text: "999 paste-tested actions" },
  ];
  const r = audit(caps, new Set(["988", "45", "44", "0", "2.72"]));
  assert.deepStrictEqual(r, [
    "caption 2 shown 1.00 s, needs 2.50 s",
    "caption 3 line 1 is 56 chars (max 42)",
    "caption 4 has 3 lines (max 2)",
    "caption 5 number 999 not in allowed set",
  ]);
});

test("clean captions pass", () => {
  // 52 chars needs 52/17 = 3.06 s on screen
  assert.deepStrictEqual(audit([{ t0: 0, t1: 3.2, text: "988 paste-tested actions.\nYour AI copies, you paste." }], new Set(["988"])), []);
});
