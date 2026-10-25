# Changelog

## 3.7.0 (2026-10-25)

Deployment KB 1.1: desktop flow inputs and outputs, tested for every type. The KB data files, Type References and prompts are unchanged (classic KB 3.4.0, Power Fx edition 1.1.0).

- **Inputs and outputs, every type** (section 7). 1.0 was based on one Text input and one Text output. Now proven for Text, sensitive Text, Number, Boolean, Custom object, List and Datatable, on desktop flows written through the API on PAD 2.73. Runs from a cloud flow and from the Console both worked. The Designer showed every variable correctly and kept them when it published. The header type names are `String`, `Numeric`, `Bool`, `CustomObject`, `List` and `DataTable`.
- **What each declaration does.** The `inputs`/`outputs` column decides which inputs a run accepts: header lines without it fail with `FlowArgumentError`. The header defines the script's variables: the column without them fails to load. A misspelled type fails at load, not silently.
- **Cloud runs.**
  - Inputs are matched by variable name, not `FriendlyName`.
  - An input added to the desktop flow is accepted without changing the cloud flow.
  - A missing required input fails with `InvalidRobinArgument`.
  - Numbers come back as decimals (`42.0`).
  - Defaults are still ignored, wherever they're stored.
- **Sensitive values** are hidden only in `flowsessions`, and only with `"format": "password"` in the column. The cloud flow's run history stores them in plain text unless the action has Secure inputs and outputs turned on.
- **Correction:** 1.0's column example kept a Text default in `default`. The Designer keeps defaults in `value`, and the Console's input form reads them from there. The example now uses the Designer's format.
- `flowsessions.inputs` and `outputs` are file columns, read through `/outputs/$value`. On Console runs they hold text rather than typed JSON.
- **Two new troubleshooting rows** (section 9):
  - Every Console run of a new flow fails with "Load failed." after a .NET 10 update. The open Console lost its runtime (`MissingNetRuntimeAssembly`); restart PAD.
  - The Designer refuses to save with "already been modified by one of its owners" after an API write; reopen the flow.

## 3.6.1 (2026-10-19)

File cleanup only. The KB data, Type References and prompts are unchanged (classic KB 3.4.0, Power Fx edition 1.1.0).

- **Removed the old file names** `PAD_Robin_ActionKB_v3_3.json` and `PAD_Robin_TypeReference_v3_1.json`, frozen at 3.3.0 since 3.3.1. Use `PAD_Robin_ActionKB.json` and `PAD_Robin_TypeReference.json`. A link to an old name still works at its tag, for example `.../pad-robin-action-kb/v3.6.0/PAD_Robin_ActionKB_v3_3.json`.

## 3.6.0 (2026-10-19)

Adds the Deployment KB. The KB data files, Type References and prompts are unchanged.

- **New: `PAD_Robin_Deployment_KB.md`** (1.0), the companion to the Action KB. The Action KB answers "what Robin will PAD accept?"; this one answers "how do I deliver it and run it?". It covers one sign-in for Graph, the Flow API and Dataverse; discovering the user's real environments, connections and connector operations; creating, starting and running cloud flows through the Flow API and the Dataverse `workflow` table, with the definition rules the API enforces and their exact error messages; validating desktop flows before delivery and delivering them by paste; running desktop flows from a cloud flow or the Console and reading the result from `flowsessions`; and a troubleshooting table. Every claim is marked Re-confirmed, Proven or Measured, checked against PAD 2.73.
- **Direct Dataverse writes for desktop flows,** documented in full and marked as unsupported by Microsoft: editing and creating desktop flows, UI elements, inputs and outputs, child flows, and cloud connector actions, including operations with dynamic schemas.
- README links the Deployment KB from the file table and from "Using it with an AI assistant".

## 3.5.0 (2026-10-17)

Adds `error_handling` to every record, in both editions: can the action take an `ON ERROR` handler, and under which error names. Classic KB 3.4.0, Power Fx edition 1.1.0; the Type References are unchanged. Prompted by a question on Reddit about error handling in the KB.

- **New field `error_handling: { on_error, errors }`.** 1,016 records take `ON ERROR` and list the error names their action declares, for `ON ERROR <Name>` cases (`File.ReadTextFromFile.ReadText` declares `FileNotFoundError`, `DirectoryNotFoundError` and `ReadFromFileError`). 70 don't, for example `Text.ChangeCase`, `Variables.CreateNewList` and `File.IfFile`: `ON ERROR` on them lands with "Exception handling isn't supported for this statement" in the Designer, and a cloud-triggered run ("Run a flow built with Power Automate for desktop") rejects the whole flow when it loads. Only a flow written outside the Designer gets past the paste, and it still runs from the Console. Guard those actions with `BLOCK ... ON BLOCK ERROR`.
- **Tested on the cloud path, both editions, PAD 2.73.** Every published golden example was written into a test flow, behind an `IF` that is never true so nothing ran, and the flow was started from the cloud: the `on_error: true` records in 90 batches with `ON ERROR <Name>` for each listed error plus a default `ON ERROR` (2,769 named cases), which all loaded; each `on_error: false` record on its own with a plain `ON ERROR`, which was rejected. 334 runs, the same result in the classic and the Power Fx flow. A made-up error name was rejected, so the names are checked.
- **`WAIT` takes `ON ERROR` even when its action declares no errors** (`File.WaitForFile.Created` and `.Deleted`, both `MouseAndKeyboard.WaitForMouse` forms): the wait itself can time out. A real run caught a `WAIT (...) FOR 2` timeout ("Timeout has expired.") with `ON ERROR`. Conditions follow their action. The error names come from PAD's module DLLs; these 4 are the only records where the cloud loader disagreed with the DLLs, and `on_error` follows the loader.
- **Rule 20, error handlers:** `ON ERROR REPEAT n TIMES WAIT n` first (it also takes `RetryType: RetryType.Exponential MinInterval: 1 MaxInterval: 10`), then `ON ERROR <Name>` cases, then the plain `ON ERROR`, and one `END` closes them all. A named case after the plain `ON ERROR`, or a second `ON ERROR ... END` after the first, drops the whole paste. `NEXT ACTION` is not allowed in a handler. A named `ON BLOCK ERROR` case is for custom error codes (`ON BLOCK ERROR MyErr IsUserDefinedErrorCode: True` catches `FlowControl.ThrowCustomError CustomErrorCode: $'''MyErr'''`); an action's error name there is an error. Real runs confirmed the routing: a named case caught its error ahead of the default, and another custom code fell through to the default.
- **New rule 21:** `ON ERROR` only where `error_handling.on_error` is true, with names from `error_handling.errors`.
- **Probe corpus:** 13 new paste probes on PAD 2.73 (round 7) back rules 20 and 21; 456 probes in all.
- **`check-flows.js`** flags `ON ERROR` on an action with `on_error: false`, an error name the action doesn't declare, a named case after the default, a handler that doesn't follow its action, and a named `ON BLOCK ERROR` case without `IsUserDefinedErrorCode: True`. It now understands several cases sharing one `END` and the `WAIT (...) FOR <seconds>` timeout form. On the corpus: 107/107 silent rejects, 22/27 pastes with errors, 320/322 clean.
- **Correction:** 3.4.x said `ON ERROR` on an action that can't raise errors "pastes and runs from the Console". It runs from the Console only when the flow was written outside the Designer; a paste shows the error.
- `PROMPT.md` and `PROMPT_PowerFx.md` tell the model to use `error_handling`. README: fixed the PAD log path in the Power Fx notes (`C:\ProgramData\Microsoft\Power Automate\Logs`).
- The old file names `PAD_Robin_ActionKB_v3_3.json` and `PAD_Robin_TypeReference_v3_1.json` stay frozen at 3.3.0, without `error_handling`.

## 3.4.1 (2026-10-13)

Correction to the Power Fx notes. Power Fx edition 1.0.1; the classic files are unchanged.

- **Power Fx flows do run from the cloud.** 3.4.0 said cloud-triggered runs of Power Fx flows fail on PAD 2.73 with "incompatible PowerFx version". They don't: a clean Power Fx flow ran through an HTTP-triggered cloud flow with the same results as from the Console. The error we saw came from a mistake in our test flow (a record inside text). PAD reports any error it finds while loading a Power Fx flow with that same message, even when the flow's and the installed Power Fx versions match, so the message points at the wrong cause. The real error is in PAD's RobinEngine log (`robin.project.validate.flowcontainserror`).
- Updated in `power_fx.run_time_traps` (`PAD_Robin_ActionKB_PowerFx.json`), the README and `PROMPT_PowerFx.md`.

## 3.4.0 (2026-10-13)

Adds the Power Fx edition. The classic files are unchanged (still `"version": "3.3.0"` inside).

- **New: `PAD_Robin_ActionKB_PowerFx.json`** (Power Fx edition 1.0.0) for desktop flows created with Power Fx enabled. Same 1,086 records, ids, arguments and enums as the classic KB; the values in templates and golden examples are written in Power Fx (`$fx'text'`, `$fx'=expression'`, `${...}` interpolation). Every golden example was pasted into a Power Fx-enabled flow on PAD 2.73 (2.73.00155.26278): 90 batches, zero errors. Two data table literals keep the classic `{ ... }` form, which pasted clean. Suggested by a user on Reddit.
- **New: `PAD_Robin_TypeReference_PowerFx.json`** (1.0.0), the Type Reference written for Power Fx flows, and **`PROMPT_PowerFx.md`**, the system prompt for them.
- **Run-time traps:** in a Power Fx flow a clean paste doesn't guarantee the flow runs. Classic list access (`L.Count`, `L[0]`) pastes clean and fails at run time, and `ON ERROR` / `ON BLOCK ERROR` don't catch it; index arguments of list and data table actions are 1-based; files and errors are records in text (`${File.FullName}`, `${E.Message}`). The KB's `power_fx` block lists these, and the README has a classic vs Power Fx table. They come from running KB actions with real values in a classic and a Power Fx flow on PAD 2.73.
- `check-flows.js` still checks classic Robin only; it reports false errors on `$fx'...'` values.
- **Old names still kept:** `PAD_Robin_ActionKB_v3_3.json` and `PAD_Robin_TypeReference_v3_1.json` stay in this release too, because 3.3.1 came out the same day. They will be removed in a later release.

## 3.3.1 (2026-10-13)

File names only; the data is the same as 3.3.0 (the files still say `"version": "3.3.0"` inside).

- **Stable file names:** `PAD_Robin_ActionKB.json` and `PAD_Robin_TypeReference.json`. From now on the names stay the same between releases, so a raw link on `main` always gets the latest KB. The version is inside each file and in the release tags; link a tag (`.../v3.3.1/PAD_Robin_ActionKB.json`) to stay on one version. Suggested by a user on Reddit.
- **Old names kept for one release:** `PAD_Robin_ActionKB_v3_3.json` and `PAD_Robin_TypeReference_v3_1.json` are still here with the same content, so existing links keep working. They will be removed in the next release.
- README, PROMPT.md, LICENSE, the rules renderer and the marketing tools now use the new names.

## 3.3.0 (2026-10-09)

1,086 records across 46 modules (989 in 3.2.0), validated on PAD 2.73 (2.73.00155.26278). The KB file is now `PAD_Robin_ActionKB_v3_3.json`; the Type Reference is unchanged.

- **97 UI-element records added** (50 desktop: `UIAutomation`, `MouseAndKeyboard`; 47 web: `WebAutomation`): every record whose input is a recorded UI element (`UIControl` / `WebControl`) and not an image. Their examples refer to placeholder elements, `appmask['Window \'KB Test Window\'']['Button \'OK\'']` and `appmask['Web Page \'KB Test Page\'']['Button \'Submit\'']`, and their `validation` field says so. Swap in the names of elements you record in the Designer.
- **How they were validated:** the test flow's UI element repository was filled with the placeholder elements, then the examples were pasted into the Designer as usual (21 batches, zero errors). Pasting checks the reference: a control paste with an element the flow doesn't have was rejected with "UI element '...' wasn't found", so a clean paste means the action, its arguments and the element reference are all valid.
- **Checker fix:** `check-flows.js` read the words inside `appmask['Window \'X\'']` as undefined variables, because it ended the quoted name at the escaped `\'`. Any script with a recorded element got false "variable ... is used but never set" errors. It now handles `\'` in quoted names; new test included.
- Not included: 139 variants (was 236). 103 need a recorded image or an element the placeholders don't cover (mostly image-based mouse and OCR actions), 25 need a live mail or work-queue context, 11 are deprecated.

## 3.2.0 (2026-10-08)

Updated for PAD 2.73 (2.73.00155.26278). 989 records across 46 modules. The KB file is now `PAD_Robin_ActionKB_v3_2.json`; the Type Reference is unchanged (`PAD_Robin_TypeReference_v3_1.json`).

- **New in PAD 2.73:** the `ComputerUse` module with `ComputerUse.InvokeComputerUse` (prompt, endpoint, provider `AzureAI` or `OpenAI`, model, interaction mode `AutomationFramework` or `PureVision`). Paste-validated on 2.73.
- **Changed in PAD 2.73:** `LLM.InvokeLLM` gained an optional `ToolBindings` argument (MCP tool bindings). It must be a literal configuration: `ToolBindings: $'''[]'''` pastes clean, while free text or an empty value lands with "MCP tool bindings must be a literal configuration, not a variable or expression" / "Parameter 'Tools': Can't be empty". The golden example now includes `ToolBindings: $'''[]'''`. The 2.72 example without `ToolBindings` still pastes clean.
- **Nothing removed.** Every published 2.72 id still exists in 2.73.
- **Full regression on PAD 2.73:** all 987 golden examples carried over from 3.1.5 re-pasted exactly as published (83 batches, 1,110 canvas rows), zero errors. The `validation` field on each record says so.
- **Syntax regression on PAD 2.73:** all 443 probes in `rules/probe-corpus.json` re-pasted and gave the same outcomes as on 2.72 (one probe came back empty on the first pass and pasted clean when re-run; no rule changed). The corpus itself still records the 2.72 outcomes.
- DLL consistency check against the 2.73 modules: zero errors; the same 14 warnings as on 2.72.

## 3.1.5 (2026-10-07)

- **Enum values on every enum input.** The 139 enum inputs that had none, all inherited from v2.1, now list their allowed values in `enumValues`. All 536 enum inputs on published records carry them, so a script can be checked for values such as `File.IfExists.AddSequentialSuffix`, which doesn't exist (`File.IfExists` has only `DoNothing` and `Overwrite`). The release check now fails if a published enum input lacks the values the PAD DLLs define.
- **One source for the syntax rules.** `rules/robin-rules.json` holds the 24 rules. Each one has its wording, examples the checker must flag and must pass, and the probe pastes that prove it. The README rules section and PROMPT.md are rendered from it by `rules/render-rules.js`. The renderer refuses if a rule cites a probe that doesn't show what the rule claims: a silent or error rule needs a failing probe and a clean one, and a value rule needs PAD's own description of the row.
- **Probe corpus published.** `rules/probe-corpus.json` has 443 probe pastes into PAD 2.72 with their outcomes: 105 rejected silently, 23 landed with errors, 315 clean.
- **Checker:** `check-flows.js` now also checks:
  - enum values against `enumValues`, and enums written without their module
  - variables that are used but never set, while handling Unicode names, CR-only line breaks and in-place list actions (`Variables.AddItemToList List:` creates the list), which PAD accepts

  On the corpus it flags 105 of 105 silent rejects and 18 of 23 pastes with errors (up from 11), and passes 313 of 315 clean pastes. The 2 it flags use `\%`, which PAD accepts while dropping the percent sign.
- Tests run on every push (GitHub Actions): rule evidence, the checker against each rule's examples, and up-to-date rendered copies.

## 3.1.4 (2026-10-06)

- **Syntax rules rewritten from 563 probe pastes on PAD 2.72** (README "Syntax rules PAD enforces", PROMPT.md). Newly documented rules that make PAD reject the whole paste with no error:
  - `%...%` outside a string (`SET X TO %N + 1%`, `IF %N% = 5`, `Text: %Msg%`). Write expressions bare; `%...%` belongs inside strings.
  - an unescaped apostrophe inside `$'''...'''` (write `\'`), and a lone `%` (write `%%`)
  - a backslash right before the closing quotes or between two variables (write `\\`). A UNC path needs `\\\\server`; with two backslashes it silently becomes `\server`.
  - PAD keywords as variable or property names (`Mail.From`, `SET Error TO`). Write `Mail['From']`.
  - `ELSE IF (Action ...) THEN`, an `IF` inside an error handler, `FUNCTION` definitions, an `@@` line not followed by an action, two statements on one line.

  Also documented: error handlers accept only `SET`, `CALL`, `GOTO` and `THROW ERROR`. Newly confirmed to work: `SWITCH` / `CASE`, `ELSE IF`, `LOOP WHILE`, condition functions, bare expressions, `ON ERROR REPEAT`, `ERROR => LastError`, `**REGION` and multi-line strings.
- **Retraction:** rule 9 of the 3.1.3 documentation ("property access in an `IF` condition rejects the paste") was wrong. `IF Files.Count = 0 THEN` pastes fine in 17 variants; the form that fails is `%Files.Count%`.
- **Parameter lists completed on 10 records** whose `input_params` left out arguments the action accepts: `SMTPServer` on `Email.SendEmail.Send`, `IMAPServer` on `Email.ProcessEmails.Move` and `Email.RetrieveEmails.Retrieve`, all six arguments of `FTP.OpenConnection`, `Instance` / `Account` and others on `Outlook.RetrieveEmailMessages.RetrieveEmails` and `Outlook.SendEmailThroughOutlook.SendEmail`, plus `Excel.LaunchExcel.LaunchAndOpen` and the Chrome, Edge and Firefox launch actions (25 inputs and 1 output in all). Six of these records use the missing arguments in their own golden examples, so a checker that trusted `input_params` rejected valid code. Golden examples unchanged. The release check now fails on any missing input or output.
- **`marketing/video/tools/check-flows.js` rewritten** to enforce the new rules and to stop flagging valid constructs (property access in `IF`, `SWITCH`, `**REGION`, condition functions, `LOOP WHILE (A) < (B)`, multi-line strings). Scored against the probe pastes, it caught all 108 silent rejects.

## Documentation (2026-10-06)

- Two syntax rules that make PAD 2.72 reject the **whole** paste with no error (README rules 8 and 9, and PROMPT.md):
  - A backslash directly before `%Variable%` in a string. Write `\\%Variable%`.
  - Property access in an `IF` condition. `SET` it to a variable first. (Retracted in 3.1.4: it does not reproduce.)

  Found by paste probes while building the example flows for the promo video. No data files changed.
- Promo video v2 (`marketing/video/`): 80 s, 16:9 and 4:5, built from real PAD 2.72 captures of four example flows (4 to 61 actions), all pasted with 0 errors.

## 3.1.3 (2026-09-24)

- **Parameter lists fixed on 18 records.** Their `input_params` listed 83 arguments the action form does not accept. Most were properties the selector already fixes, such as `CheckMode` on `File.IfFile.Exists` and `WaitFor` on `Services.WaitForService.Started`. Others belonged to sibling forms: 19 each on the two `OCR ...WithWindowsOcr` records, plus the Web and WebAutomation condition records. Adding any of them to a script gives "Unknown argument". `Web.InvokeSoapService` listed its address as `Url`; the real argument is `Endpoint`.
- Missing entries added on the same records: `RetrieveMode`, `Connection` and `ExchangeFolder` inputs and the `EmailMessages` output on `Exchange.RetrieveExchangeMessages.RetrieveEmails`, the `PrinterName` output on `Workstation.GetDefaultPrinter`, and default output variable names where they were missing.
- Golden examples unchanged. They only ever used real arguments, which is why they passed the full 2.72 re-paste.
- Every record, and every Type Reference producer, is now checked against the PAD 2.72 module DLLs before release: argument and output names and types, the arguments used in each template and golden example, selectors, constraints and sibling forms.

## 3.1.2 (2026-09-24)

- **Confirmed on PAD 2.72:** the old bare ids `Database.Connect` and `Scripting.RunPythonScript` are rejected on paste as "Unknown action" ("Module 'Database' or action 'Connect' wasn't found."). Removing `PythonVersion` does not help. Use `Database.Connect.Connect` / `.ConnectOracle` and `Scripting.RunPythonScript.RunPythonScript` / `.RunPythonScript34` / `.RunPythonScriptCPython`.
- **Type Reference 3.1.1:** `created_by` now lists exact PAD 2.72 action ids for `SqlConnectionHandle` (was the rejected `Database.Connect`), `TerminalSessionHandle` and `FtpConnectionBase` (were action names without their selector). Every `created_by` id now exists in PAD 2.72.
- **Output metadata fixes** from the PAD 2.72 DLLs (golden examples unchanged; they were already correct):
  - `FTP.OpenConnection` output type is `FtpConnectionBase`, not `SqlConnectionHandle`.
  - `Azure.CreateSnapshot` output type is `AzureSnapshot`.
  - `Web.DownloadFromWeb.Download` and `Web.InvokeWebService.InvokeWebService` no longer list a `DownloadedFile` output they do not have.
- No records added or removed.

## 3.1.1 (2026-09-24)

- **Full regression on PAD 2.72.00183.26250:** all 988 golden examples re-pasted exactly as published (83 batches, 1,111 canvas rows), zero errors. The 942 records first validated on 2.67 or earlier now say so in their `validation` field, and the file header carries a `regression` summary.
- **Fix:** `FTP.CloseConnection` listed its `Connection` input as `SqlConnectionHandle`; the correct type is `FtpConnectionBase`. This was the only input type in the KB that disagreed with the PAD module DLLs.
- No records added or removed. File names stay `_v3_1`.

## 3.1 (2026-09-24)

Updated for PAD 2.72 (2.72.00183.26250). 988 records across 45 modules.

- **New modules:** PowerPoint (21 selector forms: launch, attach, close, save, add / delete / move / copy slides, read, write), PGP (encrypt / decrypt file, key file or key as text), LLM (`LLM.InvokeLLM`), Triggers (`WaitForTriggerAction`), and PowerAutomateEnvironment (environment and flow metadata).
- **Other new actions:** `Variables.FilterList`, `MouseAndKeyboard.SetKeyboardLayout`, `Database.Connect.ConnectOracle`, `Database.ExecuteSqlStatement.ConnectAndExecuteOracle`.
- **Breaking, removed in PAD 2.72:**
  - `Database.Connect` is now `Database.Connect.Connect` (or `.ConnectOracle`).
  - `Scripting.RunPythonScript` is now `Scripting.RunPythonScript.RunPythonScript`, `.RunPythonScript34`, or `.RunPythonScriptCPython` (takes `PythonPath`). `PythonVersion` is gone.
  - `GenerativeAI.RunCUAPrompt` no longer exists; the GenerativeAI module is gone.
- **Arguments added in PAD 2.72** (golden examples updated and re-validated): `AuthApp` on the three `Cyberark.GetPassword` forms; `EnableParallelProcessing` on `WorkQueues.BatchEnqueueWorkQueueItems`; `ThrowOnDuplicateWorkQueueItem` on both `WorkQueues.EnqueueWorkQueueItem` forms; `ThrowIfWorkQueueNotFound` on `WorkQueues.GetWorkQueueItems`.
- 46 records paste-validated on PAD 2.72 (7 batches, zero failures). The other 942 were validated on 2.67 or earlier; their ids and arguments match the 2.72 DLLs. The `validation` field names the build per record.
- Type Reference 3.1: 44 types, adding `PowerPointInstanceHandle` and `Int64`.
- Files renamed to `_v3_1`. The 3.0 files remain available at the `v3.0` tag.

## 3.0 (2026-09-14)

First public release.

- 953 paste-validated Robin actions across 41 modules, validated against PAD 2.67 (2.67.00143.26090).
- Every action's selector variants are included where they could be validated from text. 584 of the records are selector forms that no previous reference listed, such as `Text.JoinText.JoinWithDelimiter`, `Text.Replace.ReplaceTextWithRegex`, `Excel.ReadFromExcel.ReadAllCells`, and `Excel.CloseExcel.CloseAndSaveAs`.
- New per-record fields: `kind`, `selector`, `sibling_selectors`, `constraints`, `needs_ui_selector`, `validation`.
- Robin argument names are recorded as PAD accepts them, which in some cases differ from PAD's internal property names (`Element`, `SMTPServer`, `IMAPServer`).
- Type Reference 3.0: 42 types, adding `OCREngineObject`, `Double`, and `CustomErrorCode`.

Known change in PAD 2.67 relative to earlier builds: `Text.Replace` became `Text.Replace.ReplaceText`, dropped `IsRegEx` from the default form, and gained `ComparisonType`. The regex form is `Text.Replace.ReplaceTextWithRegex`.

Not included: 231 selector variants that need a recorded UI element or image (198), a live mail or work-queue connection (25), or are deprecated or unknown to the Designer (8).
