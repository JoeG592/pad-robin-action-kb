# Changelog

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
