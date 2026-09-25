# PAD Robin Action Knowledge Base

A paste-validated reference for the Robin scripting language behind Power Automate Desktop (PAD), built so AI assistants can write desktop flows that actually paste.

There is no official Robin reference. The original language site went offline in 2021, the Designer is the only thing that knows the syntax, and every action has selector variants with different argument sets that the Designer never shows you in text form. Ask a model to write Robin from its training data and you get scripts that PAD silently rejects: paste them, and the canvas stays empty.

This repo is the missing reference.

## What is in it

| File | Contents |
|---|---|
| `PAD_Robin_ActionKB_v3_1.json` | 988 Robin actions across 45 modules. Every record has a template, a golden example that pasted into PAD Designer with zero errors, typed input and output parameters, and the other selector forms of the same action. |
| `PAD_Robin_TypeReference_v3_1.json` | 44 parameter types with the exact syntax PAD accepts for each: strings, numbers, file paths, handle variables, lists, UI selectors, and the rule for enums. |
| `PROMPT.md` | A system prompt that turns a model into a template filler over these two files. This is how the data is meant to be used. |

Validated against PAD 2.72 (build 2.72.00183.26250), September 2026: all 988 golden examples were re-pasted exactly as published into the 2.72 Designer, with zero errors.

## The two-table idea

Do not ask the model to write Robin. Ask it to pick an action from the KB, copy the golden example, and change the values, using the Type Reference to format each value. The model does lookup and substitution, not code generation. In practice this took a pipeline from roughly one working script in five to scripts that paste clean on the first try, including 30-action compositions with loops and conditions.

## Fields

```json
{
  "actionId": "Text.JoinText.JoinWithDelimiter",
  "module": "Text",
  "kind": "Action",
  "selector": "JoinWithDelimiter",
  "template": "Text.JoinText.JoinWithDelimiter List: `` StandardDelimiter: Text.StandardDelimiter.Space DelimiterTimes: 1 Result=> JoinedText",
  "golden_example": "Text.JoinText.JoinWithDelimiter List: List StandardDelimiter: Text.StandardDelimiter.Space DelimiterTimes: 1 Result=> JoinedText",
  "input_params": [ { "name": "List", "type": "List`1<String>", "required": true }, ... ],
  "output_params": [ { "name": "Result", "type": "String", "defaultVariable": "JoinedText" } ],
  "constraints": { "DelimiterType": "Standard" },
  "sibling_selectors": [ "Text.JoinText.Join", "Text.JoinText.JoinWithCustomDelimiter" ],
  "needs_ui_selector": false,
  "validation": "paste-validated 2026-09 (PAD 2.72) ..."
}
```

- **actionId** is the Robin id: `Module.Action` or `Module.Action.Selector`.
- **kind** tells you the wrapper. `Condition` records are written `IF (...) THEN` and need an `END`; `Wait` records are `WAIT (...)`; `While` records are `LOOP WHILE (...)` with an `END`.
- **template** has empty backticks where you must supply a value. **golden_example** is the same line with placeholder values, and it pasted into the Designer without a single error.
- **input_params** names are the Robin argument names. Some differ from PAD's internal property names, for example `Element` rather than `Control`, so always use these.
- **sibling_selectors** is the field that matters most for non-trivial scripts. `Text.JoinText.Join` takes only a list. If you need a delimiter, the argument does not exist on that form; it lives on `JoinWithDelimiter`. Adding an argument from one form to another gives "Unknown argument". Inventing a selector name gives an empty canvas.
- **constraints** are the properties a selector fixes, which is why they are absent from its arguments.
- **needs_ui_selector** marks 17 records whose input is a recorded UI element, web element, or image. Their examples use a placeholder and will not run as written; the shape is still correct.

## Syntax rules PAD enforces

1. Strings are `$'''value'''`. Booleans are bare `True` / `False`. Numbers are bare.
2. Variables produced by an earlier action are referenced by bare name (`Instance: ExcelInstance`). Inside a string, use `%Name%`.
3. Enums are fully qualified, `Module.EnumType.Value`, and the module is the one that owns the type (`Text.StandardDelimiter.NewLine`).
4. Outputs are `Name=> Variable`.
5. Blocks: `IF ... THEN` / `ELSE` / `END`, `LOOP FOREACH x IN list` / `END`, `SET x TO value`.
6. When pasting into the Designer, do not include the file header lines (`@@ConnectionString`, `IMPORT`, `@SENSITIVE`). The Designer silently rejects a paste that contains them.
7. A paste is all-or-nothing on syntax: one malformed line rejects the whole clipboard with no message. Semantic problems (unknown argument, undefined variable, wrong type) land on the canvas with an error and a line number.

## How it was validated

Every golden example was pasted into PAD Designer through UI automation and accepted with zero errors in the error pane. The March 2026 set (369 records) was additionally run through producer-to-consumer chains, so that, for example, an Excel action was validated with a real `ExcelInstance` from a launch action before it. The September 2026 sets were validated the same way in batches, with each action's error flag read back from the canvas individually: 578 records on PAD 2.67, and 46 records on PAD 2.72 (the new PowerPoint, PGP, LLM, Triggers and environment actions, plus records whose arguments changed in 2.72).

After each PAD update, the action ids and argument lists of every record are re-extracted from the module DLLs and compared. Records whose arguments changed are re-pasted on the new build, and records that no longer exist are removed (see CHANGELOG). Then every golden example in the release is re-pasted exactly as published on the new build. Each example gets the variables it references, such as an `ExcelInstance` or a `FileList`, from a validated producer action placed before it in the same paste. For PAD 2.72 that full re-paste was 988 examples in 83 batches with zero errors; each record's `validation` field records it.

Pasting proves the golden example, not the metadata around it. So before each release, every record is also checked against the PAD module DLLs: its argument and output names and types, the arguments its template and example use, and its selector, constraints and sibling forms. The Type Reference's producer actions get the same check. A release is not published unless that check has zero errors.

Validation means the Designer accepts the line. It does not mean the placeholder values make sense for your task; that is the model's job.

## What is not in this release

PAD 2.72 exposes 236 further selector variants that are not included here: 200 need a recorded UI element or image and cannot be validated from text, 25 need a live mail or work-queue connection to validate, and 11 are deprecated, removed, or unknown to the Designer. They may follow in a later release.

## Using it with an AI assistant

1. Give the model `PROMPT.md` as the system prompt.
2. Include the Type Reference, and the KB records for the modules your task needs (the full KB is about 3 MB; filter by `module`).
3. Ask for the flow. Paste the result into an empty flow in PAD Designer.
4. If the error pane lists anything, feed the messages back to the model with the same context.

## Maintenance

PAD updates add and change actions. The KB carries the PAD build it was validated against, and the intent is to re-validate after each Designer release. Issues and pull requests are welcome; a report of a record that fails to paste on a newer build is the most useful kind.

## License

The data files are released under Creative Commons Attribution 4.0 (CC BY 4.0). Use them for anything, including commercially, with attribution.

Built by Joe Green while automating Power Automate Desktop for real-world use.
