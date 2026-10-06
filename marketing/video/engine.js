// marketing/video/engine.js - builds the stage for a layout and draws frame t (classic script).
(function () {
  const M = window.Motion, S = window.Scenes, C = window.CAPTURES;
  const fmt = new URLSearchParams(location.search).get("format") === "4x5" ? "4x5" : "16x9";
  const FW = fmt === "4x5" ? 1080 : 1920, FH = fmt === "4x5" ? 1350 : 1080;
  const BORDER = 9;                                  // maximised-window border cropped from captures
  const NATIVE_W = 1920, NATIVE_H = 1020;            // window capture after border crop
  const STRIP_TOP = 2;                               // first row sits 2 px below the canvas top
  const SCROLLBAR = 18;                              // canvas rect includes the vertical scrollbar
  const s0 = fmt === "4x5" ? (FW * 0.96) / NATIVE_W : (FW * 0.9) / NATIVE_W;
  const winX = (FW - NATIVE_W * s0) / 2;
  const winY = fmt === "4x5" ? 150 : (FH - NATIVE_H * s0) / 2 - 18;
  const availH = fmt === "4x5" ? winY + NATIVE_H * s0 + 40 : FH - 120;
  // 1.36 leaves room for the 3% hold drift, so native scale never exceeds 1.4
  const L = { frameW: FW, frameH: FH, s0, winX, winY, maxNative: 1.36, margin: 0.94, availH };

  document.documentElement.style.setProperty("--fw", FW + "px");
  document.documentElement.style.setProperty("--fh", FH + "px");
  document.body.classList.add("f" + fmt);
  const stage = document.getElementById("stage");
  const $ = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || stage).appendChild(e); return e; };

  // ---- PAD window (world, moved by the camera) ----
  const world = $("div", "world");
  const win = $("div", "win", world);
  win.style.cssText = `left:${winX}px;top:${winY}px;width:${NATIVE_W * s0}px;height:${NATIVE_H * s0}px`;
  const base = $("div", "win-img", win);
  const viewport = $("div", "viewport", win);
  const strip = $("div", "strip", viewport);
  const sbmask = $("div", "sbmask", viewport);
  const badge = $("div", "badge", win);
  const cursor = $("div", "cursor", world, '<svg viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 14 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>');
  const keyhint = $("div", "keyhint", world, "Ctrl + V");

  // ---- overlays (not moved by the camera) ----
  const chip = $("div", "chip");
  const title = $("div", "title");
  const how = $("div", "how", stage, `
    <div class="how-col"><div class="how-lbl">KB template</div><pre class="how-code" id="how-tpl"></pre></div>
    <div class="how-col"><div class="how-lbl">Golden example, pasted with 0 errors</div><pre class="how-code" id="how-gold"></pre></div>
    <div class="how-col"><div class="how-lbl">In PAD Designer</div><div class="how-row" id="how-row"></div></div>`);
  const proof = $("div", "proof", stage, `
    <div class="proof-text"><div class="proof-num"><b>988</b><span>/988</span></div><div class="proof-sub">examples re-pasted on PAD 2.72</div>
      <div class="proof-num z">0</div><div class="proof-sub">paste errors</div></div>
    <div class="proof-strip"></div>`);
  const proofStrip = proof.querySelector(".proof-strip");
  const PROOF_FLOW = "04-sales-api-report";
  const cta = $("div", "cta", stage, `<div class="cta-name">PAD Robin Action KB</div><div class="cta-url">github.com/JoeG592/pad-robin-action-kb</div><div class="cta-sub">Free · CC BY 4.0 · Not affiliated with Microsoft</div>`);
  const caption = $("div", "caption");

  const img = (flow, kind) => `captures/${flow}-${kind}.png`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const viewH = flow => C[flow].canvas.h - STRIP_TOP;
  const maxScroll = flow => Math.max(0, C[flow].stripHeight - viewH(flow));
  function scrollFor(flow, focus) {
    const rows = C[flow].rows, a = rows[focus.from], b = rows[focus.to];
    return clamp((a.y + b.y + b.h) / 2 - viewH(flow) / 2, 0, maxScroll(flow));
  }
  function rangeRect(flow, focus, scroll) {
    const rows = C[flow].rows, cv = C[flow].canvas, a = rows[focus.from], b = rows[focus.to];
    const w = fmt === "4x5" ? Math.min(cv.w, 980) : cv.w - SCROLLBAR;
    return { x: cv.x - BORDER, y: cv.y - BORDER + STRIP_TOP + a.y - scroll, w, h: b.y + b.h - a.y };
  }

  function tracks(shot) {
    // camera keys {z,tx,ty} and canvas scroll: wide first, each beat scrolls then eases in over 0.8 s,
    // and the shot ends wide again
    const cam = [{ t: shot.t0, v: M.wide() }], scr = [{ t: shot.t0, v: 0 }];
    let scroll = 0;
    for (const b of shot.beats || []) {
      const ns = scrollFor(shot.flow, b.focus);
      if (ns !== scroll) { scr.push({ t: b.t - 0.9, v: scroll }, { t: b.t - 0.1, v: ns, ease: "camera" }); scroll = ns; }
      cam.push({ t: b.t - 0.8, v: cam[cam.length - 1].v }, { t: b.t, v: M.cameraFor(rangeRect(shot.flow, b.focus, scroll), L), ease: "camera" });
    }
    cam.push({ t: shot.t1 - 1.2, v: cam[cam.length - 1].v }, { t: shot.t1 - 0.3, v: M.wide(), ease: "camera" });
    return { cam, scr };
  }
  S.shots.forEach(s => { if (s.type === "paste") s.track = tracks(s); });

  function drawPaste(s, t) {
    world.style.opacity = 1;
    const cap = C[s.flow], cv = cap.canvas, n = cap.rows.length;
    const shown = M.revealCount(t, s.paste, n, 0.05);
    base.style.backgroundImage = `url(${img(s.flow, shown >= n ? "full" : "empty")})`;
    base.style.backgroundSize = `${cap.window.w * s0}px ${cap.window.h * s0}px`;
    base.style.backgroundPosition = `${-BORDER * s0}px ${-BORDER * s0}px`;
    viewport.style.cssText = `left:${(cv.x - BORDER) * s0}px;top:${(cv.y - BORDER + STRIP_TOP) * s0}px;width:${cv.w * s0}px;height:${viewH(s.flow) * s0}px`;
    const revealH = shown ? cap.rows[shown - 1].y + cap.rows[shown - 1].h : 0;
    const scroll = M.sample(s.track.scr, t);
    strip.style.cssText = `background-image:url(${img(s.flow, "strip")});width:${cv.w * s0}px;height:${cap.stripHeight * s0}px;` +
      `background-size:${cv.w * s0}px ${cap.stripHeight * s0}px;transform:translateY(${-scroll * s0}px);` +
      `clip-path:inset(0 0 ${Math.max(0, cap.stripHeight - revealH) * s0}px 0);opacity:${shown ? 1 : 0}`;
    sbmask.style.cssText = `width:${SCROLLBAR * s0}px;opacity:${shown ? 1 : 0}`;
    badge.style.cssText = `left:${(cap.badge.x - BORDER) * s0}px;top:${(cap.badge.y - BORDER) * s0}px;width:${cap.badge.w * s0}px;height:${cap.badge.h * s0}px;background:${cap.badge.color}`;
    const c = M.sample(s.track.cam, t);
    // slow hold drift to 103% across the shot, about the frame centre
    const d = 1 + 0.03 * clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
    world.style.transform = `translate(${FW / 2 - (FW / 2 - c.tx) * d}px,${FH / 2 - (FH / 2 - c.ty) * d}px) scale(${c.z * d})`;
    // cursor: glides in, pauses, Ctrl+V at s.paste, then leaves
    const cx = winX + (cv.x - BORDER + cv.w * 0.45) * s0, cy = winY + (cv.y - BORDER + 140) * s0;
    const k = M.sample([{ t: s.paste - 0.9, v: 0 }, { t: s.paste - 0.2, v: 1, ease: "camera" }, { t: s.paste + 0.6, v: 1 }, { t: s.paste + 1.3, v: 0, ease: "accel" }], t);
    cursor.style.transform = `translate(${M.lerp(cx + 260, cx, k)}px,${M.lerp(cy + 220, cy, k)}px) scale(1.5)`;
    cursor.style.opacity = t > s.paste - 0.9 && t < s.paste + 1.3 ? 1 : 0;
    keyhint.style.transform = `translate(${cx + 34}px,${cy + 30}px)`;
    keyhint.style.opacity = M.captionAlpha(t, s.paste - 0.35, s.paste + 0.45, 0.12);
    if (s.chip) {
      chip.textContent = s.chip.text.replace("{n}", cap.actions);
      chip.style.opacity = M.captionAlpha(t, s.chip.t, s.t1 - 0.4, 0.2);
      chip.style.setProperty("--rise", `${(1 - M.ease.decel(clamp((t - s.chip.t) / 0.25, 0, 1))) * 8}px`);
    }
    if (s.title) { title.textContent = s.title.text; title.style.opacity = M.captionAlpha(t, s.title.t, s.t1 - 0.3, 0.25); }
  }

  // "how" shot: template and golden come from the KB (window.KB_HOW, set in video.html); the row is a real capture
  (function fillHow() {
    const s = S.shots.find(x => x.type === "how");
    document.getElementById("how-tpl").textContent = window.KB_HOW.template;
    document.getElementById("how-gold").textContent = window.KB_HOW.golden;
    const cap = C[s.row.flow], r = cap.rows[s.row.index];
    const el = document.getElementById("how-row");
    const z = 1.3;   // within the 1.4x native-scale limit
    el.style.backgroundImage = `url(${img(s.row.flow, "strip")})`;
    el.style.backgroundSize = `${cap.canvas.w * z}px ${cap.stripHeight * z}px`;
    el.style.backgroundPosition = `${-200 * z}px ${-r.y * z}px`;
    el.style.height = `${r.h * z}px`;
  })();

  window.DURATION = S.DURATION;
  window.FORMAT = fmt;
  window.render = function (t) {
    const s = S.shots.find(x => t >= x.t0 && t < x.t1) || S.shots[S.shots.length - 1];
    // short fade through the backdrop between shots
    stage.style.setProperty("--shot", Math.min(M.ease.decel(clamp((t - s.t0) / 0.25, 0, 1)), clamp((s.t1 - t) / 0.2, 0, 1)));
    for (const el of [world, how, proof, cta, chip, title]) el.style.opacity = 0;
    if (s.type === "paste") drawPaste(s, t);
    if (s.type === "how") {
      how.style.opacity = 1;
      [...how.children].forEach((col, i) => { const a = M.ease.decel(clamp((t - s.t0 - 0.2 - i * 1.6) / 0.25, 0, 1)); col.style.opacity = a; col.style.transform = `translateY(${(1 - a) * 8}px)`; });
    }
    if (s.type === "proof") {
      proof.style.opacity = 1;
      proof.querySelector(".proof-num b").textContent = Math.round(988 * M.ease.decel(clamp((t - s.t0 - 0.2) / 0.6, 0, 1)));
      // a slow scroll through the real 61-row capture of flow 4
      const cap = C[PROOF_FLOW], w = proofStrip.clientWidth, sc = w / cap.canvas.w, h = cap.stripHeight * sc;
      const travel = Math.max(0, h - proofStrip.clientHeight);
      proofStrip.style.backgroundImage = `url(${img(PROOF_FLOW, "strip")})`;
      proofStrip.style.backgroundSize = `${w}px ${h}px`;
      proofStrip.style.backgroundPosition = `0 ${-travel * M.ease.linear((t - s.t0) / (s.t1 - s.t0))}px`;
    }
    if (s.type === "cta") cta.style.opacity = 1;
    const cs = S.captions().find(c => t >= c.t0 && t < c.t1);
    caption.innerHTML = cs ? cs.text.replace(/\n/g, "<br>") : "";
    caption.style.opacity = cs ? M.captionAlpha(t, cs.t0, cs.t1) : 0;
    caption.style.setProperty("--rise", `${cs ? (1 - M.ease.decel(clamp((t - cs.t0) / 0.25, 0, 1))) * 8 : 0}px`);
  };
  window.render(0);
})();
