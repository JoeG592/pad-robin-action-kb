# Example flows

Complete classic Robin flows built only from the KB's golden examples, with their values changed for the task. They are the flows pasted in the promo video. Paste one into an empty flow in PAD Designer to see it land.

| File | What it does | Rows in the Designer |
|---|---|---|
| `01-backup-downloads.robin` | Back up a folder | 4 |
| `02-outlook-attachments.robin` | Save Outlook attachments into folders by date | 16 |
| `03-monthly-invoice-report.robin` | Build a monthly invoice report in Excel | 29 |
| `04-sales-api-report.robin` | Call a sales API and write an Excel report, with an error-handling block | 61 |
| `00-hook-kb.robin` | Open each Excel file in a folder, stamp "Processed" and the time into its first free row, save it, then show how many were stamped | 9 |
| `00-hook-memory.robin` | **Deliberately wrong.** The same request written from memory, the way a model writes Robin without the KB. Its action ids and argument names don't exist, so PAD flags every line | 9 |

Each flow was pasted into PAD Designer: the five working flows landed with zero errors on PAD 2.72, and `00-hook-memory.robin` failed as intended. All six were checked again against the current KB with the checker, with the same result:

```
node marketing/video/tools/check-flows.js PAD_Robin_ActionKB.json examples/00-hook-kb.robin examples/01-backup-downloads.robin examples/02-outlook-attachments.robin examples/03-monthly-invoice-report.robin examples/04-sales-api-report.robin --expect-fail examples/00-hook-memory.robin
```

They were paste-validated, not run: the folders, mailboxes, files and API in them are placeholders. Change the values for your own task before running one.
