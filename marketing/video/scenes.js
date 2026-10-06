// marketing/video/scenes.js - the promo timeline (classic script; also require()-able)
(function (root) {
  const DURATION = 80;

  // Shot types: "paste" (a PAD window: empty -> cursor Ctrl+V -> rows reveal -> Ready -> camera beats),
  // "how" (template | golden | pasted row), "proof", "cta".
  // Beat focus = {from, to}: first and last canvas row index (see captures/<flow>.json rows[].i).
  // The engine scrolls the canvas so the focused rows are visible, then eases the camera onto them.
  const shots = [
    { id: "hook", type: "paste", flow: "00-hook-memory", t0: 0, t1: 5, paste: 0.9,
      beats: [{ t: 2.5, focus: { from: 2, to: 6 } }] },
    { id: "fix", type: "paste", flow: "00-hook-kb", t0: 5, t1: 10, paste: 5.5,
      beats: [{ t: 7.4, focus: { from: 1, to: 7 } }],
      chip: { t: 6.4, text: "{n} actions · 0 errors" } },
    { id: "how", type: "how", t0: 10, t1: 18, row: { flow: "00-hook-kb", index: 2 } },
    { id: "ex1", type: "paste", flow: "01-backup-downloads", t0: 18, t1: 27, paste: 18.6,
      beats: [{ t: 20.6, focus: { from: 1, to: 2 } }],
      chip: { t: 19.6, text: "{n} actions · 0 errors" } },
    { id: "ex2", type: "paste", flow: "02-outlook-attachments", t0: 27, t1: 38, paste: 27.6,
      beats: [{ t: 29.8, focus: { from: 7, to: 7 } }, { t: 33.6, focus: { from: 9, to: 14 } }],
      chip: { t: 28.8, text: "{n} actions · 0 errors" } },
    { id: "ex3", type: "paste", flow: "03-monthly-invoice-report", t0: 38, t1: 50, paste: 38.6,
      beats: [{ t: 41, focus: { from: 11, to: 15 } }, { t: 45, focus: { from: 18, to: 24 } }],
      chip: { t: 40.2, text: "{n} actions · 0 errors" } },
    { id: "ex4", type: "paste", flow: "04-sales-api-report", t0: 50, t1: 64, paste: 50.6,
      beats: [{ t: 53, focus: { from: 12, to: 15 } },
              { t: 56.6, focus: { from: 27, to: 32 } },
              { t: 60.2, focus: { from: 55, to: 59 } }],
      chip: { t: 52, text: "{n} actions · 0 errors" } },
    { id: "proof", type: "proof", t0: 64, t1: 72 },
    { id: "cta", type: "cta", t0: 72, t1: 80 },
  ];

  const CAPTIONS = [
    { t0: 0.4, t1: 4.8, text: "AI-written PAD scripts rarely paste." },
    { t0: 5.6, t1: 9.8, text: "PAD Robin Action KB:\nbuilt from it, every action pastes." },
    { t0: 10.4, t1: 13.9, text: "Every action has a paste-tested example." },
    { t0: 14.1, t1: 17.8, text: "988 actions. Your AI copies,\nyou paste." },
    { t0: 18.4, t1: 26.6, text: "1 · Back up a folder" },
    { t0: 27.4, t1: 37.6, text: "2 · Save Outlook attachments by date" },
    { t0: 38.4, t1: 49.6, text: "3 · Monthly invoice report" },
    { t0: 50.4, t1: 63.6, text: "4 · Sales API to an Excel report" },
    { t0: 64.4, t1: 71.6, text: "Every example pasted exactly as published." },
  ];

  const Scenes = { DURATION, shots, captions: () => CAPTIONS };
  root.Scenes = Scenes;
  if (typeof module !== "undefined") module.exports = Scenes;
})(typeof globalThis !== "undefined" ? globalThis : this);
