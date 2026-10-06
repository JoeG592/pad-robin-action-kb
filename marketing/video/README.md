# Promo video

`pad-robin-kb-promo.mp4` is a 73-second, 1920×1080, 30 fps promo for the KB, with no audio. It is an HTML animation (`video.html`) rendered frame by frame in headless Chromium and encoded with ffmpeg.

The look follows Power Automate's light Fluent style: a bright brand blue, teal loop blocks, purple variable cards and neutral greys. The colours sit close to the product's but aren't the exact brand values. The fonts are Microsoft's open-source ones: Selawik, the Segoe UI fallback, and Cascadia Mono. There are no Microsoft logos.

| Time | Scene |
|---|---|
| 0–10 s | An AI writes Robin from memory, it gets pasted into the Designer, and the canvas stays empty |
| 10–16.5 s | Why: there is no official Robin reference |
| 16.5–24 s | Title on brand blue, plus counters: 988 actions, 45 modules, 44 types, 0 paste errors on PAD 2.72 |
| 24–35 s | The two-table idea: a template, a filled line, sibling selectors, and the Type Reference |
| 35–52 s | The same request built with the KB: the script is pasted into a designer mock-up and 9 actions appear |
| 52–59 s | Proof: a real PAD Designer screenshot of that paste (`assets/pad-real-paste.png`) |
| 59–66 s | Results from the README, as cards styled like cloud-flow steps |
| 66–73 s | Call to action: repo URL, CC BY 4.0, trademark notice |

## Robin files

- `demo-flow.robin` is the 9-action script shown in scenes 5 and 6. It was pasted into PAD Designer, giving 9 actions and Status: Ready (see the screenshot).
- `showcase/monthly-invoice-report.robin` is a larger 27-line flow built from golden examples. It covers dates, a folder check with `IF`, CSV, a loop with `IF/ELSE`, Excel, a list join, a zip and a dialog. It hasn't been pasted yet. Paste it into PAD and screen-record the paste to get footage for a longer cut.

## Re-rendering

Requirements: Node 18+, Playwright with Chromium, and ffmpeg. The fonts in `fonts/` are not committed. To fetch them:

```sh
mkdir -p fonts && cd fonts
curl -LO https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip
unzip -j Selawik_Release.zip 'selawk*.ttf'
mv selawk.ttf Selawik-Regular.ttf; mv selawksl.ttf Selawik-Semilight.ttf; mv selawksb.ttf Selawik-Semibold.ttf; mv selawkb.ttf Selawik-Bold.ttf
curl -LO https://github.com/microsoft/cascadia-code/releases/download/v2407.24/CascadiaCode-2407.24.zip
unzip -j CascadiaCode-2407.24.zip ttf/CascadiaMono.ttf
cd ..

node render.mjs --stills                  # one PNG per scene, for review
node render.mjs pad-robin-kb-promo.mp4    # full render, about 9 minutes
```

To edit the video, change the text in `video.html`, and the timing in the `S` table and the `render(t)` function. Opening `video.html` in a browser shows frame 0; run `render(30)` in the console to jump to any second.
