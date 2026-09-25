# Changelog

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
