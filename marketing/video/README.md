# Promo video

`pad-robin-kb-promo.mp4` (1920×1080) and `pad-robin-kb-promo-4x5.mp4` (1080×1350, for feeds) are 80-second, 30 fps promos for the KB, with no audio. They are made to work muted: captions carry the story.

**Every PAD Designer frame is a real capture of a real paste into PAD 2.72** (2.72.00183.26250), taken by `capture.ps1`. The paste animation and camera moves are recreated from those captures:
- rows are revealed top to bottom
- the cursor is drawn
- zooms crop the capture, at most 1.4× its native resolution

The one edit to the captured pixels: the flow checker's notification badge in the right-hand toolbar is covered.

| Time | Beat | Flow |
|---|---|---|
| 0–5 s | A script written from memory is pasted, and PAD shows real errors | `flows/00-hook-memory.robin` |
| 5–10 s | The same request built from the KB pastes clean | `flows/00-hook-kb.robin` (9 actions) |
| 10–18 s | KB template → golden example → the pasted row | `Excel.LaunchExcel.LaunchAndOpen` |
| 18–27 s | 1 · Back up a folder | `flows/01-backup-downloads.robin` (4 actions) |
| 27–38 s | 2 · Save Outlook attachments by date | `flows/02-outlook-attachments.robin` (16 actions) |
| 38–50 s | 3 · Monthly invoice report | `flows/03-monthly-invoice-report.robin` (29 actions) |
| 50–64 s | 4 · Sales API to an Excel report, with an error-handling block | `flows/04-sales-api-report.robin` (61 actions) |
| 64–72 s | Proof: all 988 examples re-pasted on PAD 2.72, 0 errors | |
| 72–80 s | Repo and licence | |

All example flows are built only from the KB's golden examples. Each pasted with 0 errors, and the hook flow failed as intended; the results are in `captures/*.json`. The flows were paste-validated, not run.

A Robin rule came up while building them: a backslash directly before a `%variable%` in a string makes PAD 2.72 reject the **whole** paste with no error message, and the canvas just stays empty. `$'''C:\Reports\%Month%'''` is rejected; write `$'''C:\Reports\\%Month%'''`. A later probe of 563 pastes found more rules of this kind; they are listed in the main README under "Syntax rules PAD enforces". (An earlier version of this page also said property access in an `IF` condition is rejected. That does not reproduce.)

`tools/check-flows.js` checks a flow against all of those rules, as well as the action ids and argument names.

## Re-capturing

Needs PAD Designer open on a flow named `PAD_Robin_test`, plus a paste validator script that defines `Find-Designer` and `Invoke-PasteValidate` (pass `-Validator <path>` or set `PAD_VALIDATOR`). Run it in a visible terminal and keep your hands off the mouse and keyboard while it works:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\capture.ps1                                # all flows
powershell.exe -ExecutionPolicy Bypass -File .\capture.ps1 -Flow "02-outlook-attachments"
node tools/build-capture-index.js
```

## Checks

```sh
node --test "tools/*.test.js" motion.test.js
node tools/check-flows.js ../../PAD_Robin_ActionKB_v3_1.json flows/00-hook-kb.robin flows/01-backup-downloads.robin flows/02-outlook-attachments.robin flows/03-monthly-invoice-report.robin flows/04-sales-api-report.robin --expect-fail flows/00-hook-memory.robin
node tools/audit-captions.js
```

## Re-rendering

Requirements: Node 18+, Playwright with Chromium (`tools/browser.cjs` also finds an already-installed Playwright Chromium), and ffmpeg. Fonts are not committed:

```sh
mkdir -p fonts && cd fonts
curl -LO https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip
unzip -j Selawik_Release.zip 'selawk*.ttf'
mv selawk.ttf Selawik-Regular.ttf; mv selawksl.ttf Selawik-Semilight.ttf; mv selawksb.ttf Selawik-Semibold.ttf; mv selawkb.ttf Selawik-Bold.ttf
curl -LO https://github.com/microsoft/cascadia-code/releases/download/v2407.24/CascadiaCode-2407.24.zip
unzip -j CascadiaCode-2407.24.zip ttf/CascadiaMono.ttf
cd ..

node render.mjs --stills --format 16x9      # one PNG per beat
node render.mjs --format 16x9               # pad-robin-kb-promo.mp4
node render.mjs --format 4x5                # pad-robin-kb-promo-4x5.mp4
```

The code is split into three files:
- `scenes.js`: timing, captions and camera beats
- `motion.js`: motion math (Fluent easing curves, camera framing)
- `engine.js`: drawing

To inspect any moment, open `video.html?format=4x5` in a browser and call `render(42)` in the console.

Power Automate is a trademark of Microsoft. This project is not affiliated with or endorsed by Microsoft.
