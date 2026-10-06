// marketing/video/motion.js - pure motion math (classic script; also require()-able for tests)
(function (root) {
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 40; i++) { const v = X(t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  const ease = {
    linear: x => Math.min(1, Math.max(0, x)),
    decel: bezier(0, 0, 0, 1),              // Fluent: entering elements
    accel: bezier(1, 0, 1, 1),              // Fluent: exiting elements
    camera: bezier(0.77, 0, 0.175, 1),      // camera moves
    soft: bezier(0.23, 1, 0.32, 1),         // small UI ease-out
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  // keyframes: [{t, v, ease?}] where ease names the curve INTO that key; v may be a number or {k: number}
  function sample(keys, t) {
    if (t <= keys[0].t) return keys[0].v;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        const a = keys[i - 1], b = keys[i], k = ease[b.ease || "camera"]((t - a.t) / (b.t - a.t));
        if (typeof a.v === "number") return lerp(a.v, b.v, k);
        const o = {}; for (const key of Object.keys(a.v)) o[key] = lerp(a.v[key], b.v[key], k); return o;
      }
    }
    return keys[keys.length - 1].v;
  }

  // Camera that frames a rectangle given in native window pixels.
  // L: frameW, frameH, s0 (window draw scale), winX, winY (window top-left in frame), maxNative (cap on s0*z),
  //    margin (fraction of frame width usable), availH (usable frame height for the focus, e.g. above captions)
  function cameraFor(f, L) {
    const zW = (L.frameW * L.margin) / (f.w * L.s0);
    const zH = (L.availH * 0.9) / (f.h * L.s0);
    const z = Math.max(1, Math.min(zW, zH, L.maxNative / L.s0));
    const fx = L.winX + (f.x + f.w / 2) * L.s0, fy = L.winY + (f.y + f.h / 2) * L.s0;
    return { z, tx: L.frameW / 2 - fx * z, ty: L.availH / 2 - fy * z };
  }
  const wide = () => ({ z: 1, tx: 0, ty: 0 });

  function revealCount(t, start, n, step) {
    if (t < start) return 0;
    return Math.min(n, 1 + Math.floor((t - start) / step + 1e-9));
  }
  function captionAlpha(t, t0, t1, fade = 0.25) {
    if (t <= t0 || t >= t1) return 0;
    return Math.min(1, (t - t0) / fade, (t1 - t) / fade);
  }

  const Motion = { ease, lerp, sample, cameraFor, wide, revealCount, captionAlpha, bezier };
  root.Motion = Motion;
  if (typeof module !== "undefined") module.exports = Motion;
})(typeof globalThis !== "undefined" ? globalThis : this);
