# Changelog

## 3.0 (2026-09-14)

First public release.

- 953 paste-validated Robin actions across 41 modules, validated against PAD 2.67 (2.67.00143.26090).
- Every action's selector variants are included where they could be validated from text. 584 of the records are selector forms that no previous reference listed, such as `Text.JoinText.JoinWithDelimiter`, `Text.Replace.ReplaceTextWithRegex`, `Excel.ReadFromExcel.ReadAllCells`, and `Excel.CloseExcel.CloseAndSaveAs`.
- New per-record fields: `kind`, `selector`, `sibling_selectors`, `constraints`, `needs_ui_selector`, `validation`.
- Robin argument names are recorded as PAD accepts them, which in some cases differ from PAD's internal property names (`Element`, `SMTPServer`, `IMAPServer`).
- Type Reference 3.0: 42 types, adding `OCREngineObject`, `Double`, and `CustomErrorCode`.

Known change in PAD 2.67 relative to earlier builds: `Text.Replace` became `Text.Replace.ReplaceText`, dropped `IsRegEx` from the default form, and gained `ComparisonType`. The regex form is `Text.Replace.ReplaceTextWithRegex`.

Not included: 231 selector variants that need a recorded UI element or image (198), a live mail or work-queue connection (25), or are deprecated or unknown to the Designer (8).
