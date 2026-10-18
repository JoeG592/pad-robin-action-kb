// marketing/video/tools/check-flows.test.js
const test = require("node:test");
const assert = require("node:assert");
const { checkRobin } = require("./check-flows.js");

const kb = { actions: [
  { actionId: "Folder.GetFiles", input_params: [{ name: "Folder" }, { name: "FileFilter" }], output_params: [{ name: "Files" }] },
  { actionId: "Folder.IfFolderExists.DoesNotExist", input_params: [{ name: "Path" }], output_params: [] },
  { actionId: "Display.ShowMessageDialog.ShowMessage", input_params: [{ name: "Message" }, { name: "Title" }], output_params: [{ name: "ButtonPressed" }] },
  { actionId: "Clipboard.SetText", input_params: [{ name: "Text" }], output_params: [] },
  { actionId: "Text.ToNumber", input_params: [{ name: "Text" }], output_params: [{ name: "Number" }] },
  { actionId: "Logging.LogMessage", input_params: [{ name: "Message" }], output_params: [] },
  { actionId: "File.Move", input_params: [{ name: "Files" }, { name: "Destination" }, { name: "IfFileExists", type: "IfExists", enumValues: ["DoNothing", "Overwrite"] }], output_params: [{ name: "MovedFiles" }] },
  { actionId: "Variables.AddItemToList", input_params: [{ name: "Item" }, { name: "List", type: "List`1" }], output_params: [] },
] };
// Variables the snippets below assume already exist (flow inputs, for the purpose of these tests).
const KNOWN = ["N", "S", "L", "A", "Files", "Mail", "ReportDate", "Folder", "Root", "Name", "Raw", "Owner"];
const errs = src => checkRobin(src, kb, { knownVars: KNOWN }).errors;
const ok = src => assert.deepStrictEqual(errs(src), []);
const flags = (src, re) => { const e = errs(src); assert.ok(e.some(x => re.test(x)), "expected " + re + " in " + JSON.stringify(e)); };

test("valid action line passes", () => {
  const r = checkRobin("Folder.GetFiles Folder: $'''C:\\x: y''' FileFilter: $'''*''' Files=> Files", kb, { knownVars: KNOWN });
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.actionLines, 1);
});

test("unknown action id, argument and output are errors; names are case-insensitive", () => {
  flags("Folder.GetAllFiles Folder: $'''C:\\x'''", /unknown action Folder\.GetAllFiles/);
  assert.deepStrictEqual(errs("Folder.GetFiles folder: $'''C:\\x''' Recursive: True Files=> Files Count=> N"), [
    "line 1: Folder.GetFiles has no argument Recursive",
    "line 1: Folder.GetFiles has no output Count",
  ]);
  ok("clipboard.settext Text: $'''x'''");
});

test("WAIT <seconds> is a built-in delay, WAIT (...) is still checked as an action", () => {
  const r = checkRobin("WAIT 5\nWAIT N * 2\nWAIT (Folder.NoSuchWait Path: $'''C:\\x''')", kb, { knownVars: KNOWN });
  assert.deepStrictEqual(r.errors, ["line 3: unknown action Folder.NoSuchWait"]);
  assert.strictEqual(r.actionLines, 1);
});

// Silent rejects found by paste probes on PAD 2.72 (2026-10-06): PAD drops the WHOLE paste.
test("%...% outside a string is an error; bare expressions and %...% inside strings are fine", () => {
  flags("SET N TO 5\nSET M TO %N + 1%", /outside a string/);
  flags("IF %N% = 5 THEN\nEND", /outside a string/);
  flags("Clipboard.SetText Text: %Msg%", /outside a string/);
  ok("SET N TO 5\nSET M TO N + 1\nSET T TO S + 'b'\nIF N + 1 = 6 THEN\nEND\nWAIT N\nClipboard.SetText Text: $'''Total %N + 1%'''");
});

test("apostrophes inside strings must be escaped", () => {
  flags("Clipboard.SetText Text: $'''Joe's report'''", /apostrophe/);
  flags("Clipboard.SetText Text: $'''He said 'hi''''", /end with an apostrophe/);
  ok("Clipboard.SetText Text: $'''Joe\\'s report'''");
  ok("SET O TO {'name': 'Joe'}\nClipboard.SetText Text: $'''%O['name']%'''");
});

test("a lone percent sign in a string is an error; %% is a literal percent", () => {
  flags("Clipboard.SetText Text: $'''100% done'''", /lone %/);
  ok("Clipboard.SetText Text: $'''100%% done'''");
  ok("SET N TO 5\nClipboard.SetText Text: $'''%N%%% done'''");
});

test("backslash escapes: before %Var%, before the closing quotes, and \\% are errors", () => {
  assert.deepStrictEqual(errs("SET Folder TO $'''C:\\Reports\\%ReportDate%'''"),
    ["line 1: backslash before % in a string (PAD drops the paste for \\%Var% and loses the % otherwise); write \\\\%Var% for a path, %% for a literal percent sign"]);
  ok("SET Folder TO $'''C:\\Reports\\\\%ReportDate%'''");
  ok("SET Path TO $'''%Folder%\\Report.xlsx'''");
  flags("Clipboard.SetText Text: $'''C:\\Temp\\'''", /never closes/);
  ok("Clipboard.SetText Text: $'''C:\\Temp\\\\'''");
});

test("multi-line strings are one statement", () => {
  ok("SET Body TO $'''Line one\nEND\n# not a comment\nIF x THEN'''\nClipboard.SetText Text: Body");
  flags("SET Body TO $'''Line one\nJoe's line'''", /line 2: apostrophe/);
});

test("PAD keywords as property or variable names are errors; bracket access is fine", () => {
  flags("SET X TO Mail.From", /Mail\.From.*Mail\['From'\]/);
  flags("Clipboard.SetText Text: $'''%Mail.To%'''", /Mail\.To inside a string/);
  flags("SET Error TO 1", /variable Error is a PAD keyword/);
  flags("Text.ToNumber Text: $'''1''' Number=> Next", /output variable Next/);
  flags("SET 1abc TO 1", /starts with a digit/);
  ok("SET X TO Mail['From']\nSET Y TO Mail.Subject\nSET C TO Files.Count");
});

test("property access in IF is fine (rule 9 of 3.1.3 retracted)", () => {
  ok("IF Files.Count = 0 THEN\nEND\nIF 3 = L.Count THEN\nEND\nLOOP WHILE L.Count > N\nEND");
});

test("ELSE IF (Action) is an error; ELSE IF <condition> and a nested IF (Action) are fine", () => {
  flags("IF A = 1 THEN\nELSE IF (Folder.IfFolderExists.DoesNotExist Path: $'''C:\\r''') THEN\nEND", /ELSE IF \(Action/);
  ok("IF A = 1 THEN\nELSE IF A = 2 THEN\nELSE\n    IF (Folder.IfFolderExists.DoesNotExist Path: $'''C:\\r''') THEN\n    END\nEND");
});

test("error handlers only allow SET, CALL, GOTO and THROW ERROR", () => {
  ok("BLOCK Work\nON BLOCK ERROR\n    SET Failed TO True\nEND\n    Clipboard.SetText Text: $'''x'''\nEND");
  flags("BLOCK Work\nON BLOCK ERROR\n    Logging.LogMessage Message: $'''x'''\nEND\nEND", /only SET, CALL, GOTO and THROW ERROR/);
  flags("BLOCK Work\nON BLOCK ERROR\n    IF A = 1 THEN\n    END\nEND\nEND", /IF \/ LOOP \/ SWITCH inside an error handler/);
  ok("Text.ToNumber Text: $'''x''' Number=> N\nON ERROR REPEAT 2 TIMES WAIT 5\n    SET N TO 0\n    THROW ERROR\nEND");
  flags("Text.ToNumber Text: $'''x''' Number=> N\nON ERROR\n    Logging.LogMessage Message: $'''x'''\nEND", /only SET/);
  flags("Text.ToNumber Text: $'''x''' Number=> N\nON ERROR GOTO Fallback\nEND", /ON ERROR GOTO/);
  flags("BLOCK Work\nON BLOCK ERROR REPEAT 2 TIMES WAIT 2\nEND\nEND", /no REPEAT/);
});

test("structure: SWITCH, regions, comments, DISABLE, @@ and subflows", () => {
  ok("SWITCH N\n    CASE = 1\n        SET A TO 1\n    CASE <= 3\n        SET A TO 2\n    DEFAULT\n        SET A TO 3\nEND");
  flags("SWITCH S\n    CASE Contains $'''b'''\nEND", /CASE takes a comparison/);
  ok("**REGION Setup\n/# block\ncomment #/\nSET A TO 1 # trailing note\nDISABLE Clipboard.SetText Text: $'''x'''\n**ENDREGION");
  flags("REGION Setup\nSET A TO 1\nEND REGION", /\*\*REGION/);
  ok("@@copilotGeneratedAction: 'False'\nSET A TO 1");
  flags("@@copilotGeneratedAction: 'False'\n# comment\nSET A TO 1", /followed directly by an action/);
  flags("FUNCTION Sub1 GLOBAL\n    SET X TO 1\nEND FUNCTION", /subflow definitions/);
  flags("SET A TO 1 SET B TO 2", /two statements/);
  ok("ERROR => LastError Reset: True\nLABEL Top\nGOTO Top\nEXIT Code: 1 ErrorMessage: $'''x'''\nLOOP WHILE (N) < (10)\n    EXIT LOOP\nEND");
});

test("control flow is skipped, conditions are checked", () => {
  const src = [
    "SET Count TO 0",
    "LOOP FOREACH Item IN Files",
    "    IF Contains(Item, $'''x''', False) AND Count = 0 THEN",
    "        NEXT LOOP",
    "    END",
    "END",
    "IF (Folder.IfFolderExists.DoesNotExist Path: $'''C:\\r''') THEN",
    "ELSE",
    "END",
  ].join("\n");
  const r = checkRobin(src, kb, { knownVars: KNOWN });
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.actionLines, 1);
});

test("undefined variables are errors; SET, outputs, loop variables and in-place list arguments define them", () => {
  assert.deepStrictEqual(checkRobin("Clipboard.SetText Text: Missing", kb).errors,
    ["line 1: variable Missing is used but never set in this script (PAD: \"Variable 'Missing' doesn't exist\")"]);
  assert.deepStrictEqual(checkRobin("SET A TO 1\nIF a + 1 = 2 THEN\nEND\nLOOP i FROM 0 TO A STEP 1\n    Clipboard.SetText Text: $'''%i%'''\nEND", kb).errors, []);
  assert.deepStrictEqual(checkRobin("Variables.AddItemToList Item: $'''x''' List: Errors\nClipboard.SetText Text: Errors", kb).errors, []);
  assert.deepStrictEqual(checkRobin("SET Café TO 1\rClipboard.SetText Text: Café", kb).errors, []);
  assert.deepStrictEqual(checkRobin("Clipboard.SetText Text: Flow", kb, { knownVars: ["Flow"] }).errors, []);
});

test("recorded UI element references: the words inside appmask['Window \\'X\\''] are not variables", () => {
  assert.deepStrictEqual(checkRobin("Clipboard.SetText Text: appmask['Window \\'KB Test Window\\'']['Button \\'OK\\'']", kb).errors, []);
  assert.deepStrictEqual(checkRobin("Clipboard.SetText Text: imgrepo['Images']['Login button']", kb).errors, []);
  // an escaped quote must not end the literal early, but a real variable after it is still checked
  assert.deepStrictEqual(checkRobin("Clipboard.SetText Text: appmask['Window \\'A B\\''] + Missing", kb).errors,
    ["line 1: variable Missing is used but never set in this script (PAD: \"Variable 'Missing' doesn't exist\")"]);
});

test("enum argument values are checked against the KB enumValues", () => {
  const ok = "File.Move Files: Files IfFileExists: File.IfExists.Overwrite MovedFiles=> Moved";
  assert.deepStrictEqual(checkRobin(ok, kb, { knownVars: KNOWN }).errors, []);
  assert.deepStrictEqual(checkRobin(ok.replace("Overwrite", "AddSequentialSuffix"), kb, { knownVars: KNOWN }).errors,
    ["line 1: File.Move IfFileExists: AddSequentialSuffix is not a value of File.IfExists (DoNothing, Overwrite)"]);
  assert.match(checkRobin(ok.replace("File.IfExists.Overwrite", "Overwrite"), kb, { knownVars: KNOWN }).errors[0], /needs its module and type/);
});

test("ON ERROR follows the record's error_handling: on_error, declared names, case order, one END", () => {
  const ekb = { actions: [
    { actionId: "Text.ToNumber", input_params: [{ name: "Text" }], output_params: [{ name: "Number" }], error_handling: { on_error: true, errors: ["TextNotValidNumberError"] } },
    { actionId: "Text.ChangeCase", input_params: [{ name: "Text" }, { name: "NewCase" }], output_params: [{ name: "Result" }], error_handling: { on_error: false, errors: [] } },
    { actionId: "File.WaitForFile.Created", input_params: [{ name: "File" }], output_params: [], error_handling: { on_error: true, errors: [] } },
  ] };
  const e = src => checkRobin(src, ekb, { knownVars: KNOWN }).errors;
  const num = "Text.ToNumber Text: Raw Number=> N";
  assert.deepStrictEqual(e([num, "ON ERROR REPEAT 2 TIMES WAIT 1", "ON ERROR TextNotValidNumberError", "    SET N TO 0", "ON ERROR", "    SET A TO 1", "END", "SET S TO N"].join("\n")), []);
  assert.deepStrictEqual(e(["WAIT (File.WaitForFile.Created File: $'''C:\\x''') FOR 5", "ON ERROR", "    SET A TO 1", "END"].join("\n")), []);
  assert.ok(e(["Text.ChangeCase Text: S Result=> T", "ON ERROR", "    SET A TO 1", "END"].join("\n")).some(x => /can't raise errors.*BLOCK/.test(x)));
  assert.ok(e([num, "ON ERROR NoSuchError", "    SET N TO 0", "END"].join("\n")).some(x => /declares no error NoSuchError.*TextNotValidNumberError/.test(x)));
  assert.ok(e([num, "ON ERROR", "    SET A TO 1", "ON ERROR TextNotValidNumberError", "    SET N TO 0", "END"].join("\n")).some(x => /after the default ON ERROR/.test(x)));
  assert.ok(e([num, "ON ERROR TextNotValidNumberError", "    SET N TO 0", "END", "ON ERROR", "    SET A TO 1", "END"].join("\n")).some(x => /right after the action/.test(x)));
  // without error_handling in the KB (older releases) only the structure is checked
  assert.deepStrictEqual(errs([num, "ON ERROR NoSuchError", "    SET N TO 0", "END"].join("\n")), []);
});

test("a named ON BLOCK ERROR case needs IsUserDefinedErrorCode: True", () => {
  flags("BLOCK W\nON BLOCK ERROR TextNotValidNumberError\n    SET A TO 1\nON BLOCK ERROR\n    SET A TO 2\nEND\n    SET N TO 1\nEND", /custom error codes/);
  ok("BLOCK W\nON BLOCK ERROR MyErr IsUserDefinedErrorCode: True\n    SET A TO 1\nON BLOCK ERROR\n    SET A TO 2\nEND\n    SET N TO 1\nEND");
});
