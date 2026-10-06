// marketing/video/tools/check-flows.test.js
const test = require("node:test");
const assert = require("node:assert");
const { checkRobin } = require("./check-flows.js");

const kb = { actions: [
  { actionId: "Folder.GetFiles", input_params: [{ name: "Folder" }, { name: "FileFilter" }], output_params: [{ name: "Files" }] },
  { actionId: "Folder.IfFolderExists.DoesNotExist", input_params: [{ name: "Path" }], output_params: [] },
  { actionId: "Display.ShowMessageDialog.ShowMessage", input_params: [{ name: "Message" }, { name: "Title" }], output_params: [{ name: "ButtonPressed" }] },
] };

test("valid action line passes", () => {
  const r = checkRobin("Folder.GetFiles Folder: $'''C:\\x: y''' FileFilter: $'''*''' Files=> Files", kb);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.actionLines, 1);
});

test("unknown action id is an error", () => {
  const r = checkRobin("Folder.GetAllFiles Folder: $'''C:\\x'''", kb);
  assert.match(r.errors[0], /line 1: unknown action Folder\.GetAllFiles/);
});

test("unknown argument and output are errors, case-insensitive match is ok", () => {
  const r = checkRobin("Folder.GetFiles folder: $'''C:\\x''' Recursive: True Files=> Files Count=> N", kb);
  assert.deepStrictEqual(r.errors, [
    "line 1: Folder.GetFiles has no argument Recursive",
    "line 1: Folder.GetFiles has no output Count",
  ]);
});

test("control flow is skipped, conditions are checked", () => {
  const src = [
    "SET Count TO 0",
    "LOOP FOREACH Item IN Files",
    "    IF Count = 0 THEN",
    "    END",
    "END",
    "IF (Folder.IfFolderExists.DoesNotExist Path: $'''C:\\r''') THEN",
    "ELSE",
    "END",
  ].join("\n");
  const r = checkRobin(src, kb);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.actionLines, 1);
});
