# Promo video

`pad-robin-kb-promo.mp4` is a 66-second, 1920×1080, 30 fps promo for the KB, with no audio. It is an HTML animation (`video.html`) rendered frame by frame in headless Chromium and encoded with ffmpeg.

| Time | Scene |
|---|---|
| 0–10 s | An AI writes Robin from memory, it gets pasted into the Designer, and the canvas stays empty |
| 10–16.5 s | Why: there is no official Robin reference |
| 16.5–24 s | Title, plus counters: 988 actions, 45 modules, 44 types, 0 paste errors on PAD 2.72 |
| 24–35 s | The two-table idea: a template, a filled line, sibling selectors, and the Type Reference |
| 35–52 s | The same request built with the KB: the script is pasted and 9 actions and 7 variables appear |
| 52–59 s | Results from the README: about 1 in 5 before, 30-action compositions, full re-paste on 2.72 |
| 59–66 s | Call to action: repo URL, CC BY 4.0, trademark notice |

The designer window is a generic mock-up, not a screenshot of PAD, and it uses no Microsoft logos. If you record the real Designer, you can swap that footage in for scene 5 (35–52 s).

## Demo flow

`demo-flow.robin` is the script shown in scene 5. Every line follows a golden example's shape, with new values. **Paste it into an empty flow in PAD Designer once before you publish the video**, so the "pastes clean" claim is backed by a real paste.

## Re-rendering

Requirements: Node 18+, Playwright with Chromium, ffmpeg, and two OFL fonts in `fonts/` (they are not committed):

```sh
mkdir -p fonts
curl -L -o fonts/Inter.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
curl -L -o fonts/JetBrainsMono.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"

node render.mjs --stills                  # one PNG per scene, for review
node render.mjs pad-robin-kb-promo.mp4    # full render, about 8 minutes
```

To edit the video, change the text in `video.html`, and the timing in the `S` table and the `render(t)` function. Opening `video.html` in a browser shows frame 0; run `render(30)` in the console to jump to any second.
