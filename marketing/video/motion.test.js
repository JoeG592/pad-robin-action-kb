// marketing/video/motion.test.js
const test = require("node:test");
const assert = require("node:assert");
const M = require("./motion.js");
const near = (a, b, e = 1e-3) => assert.ok(Math.abs(a - b) < e, `${a} !~ ${b}`);

test("cubic-bezier easings hit endpoints and known midpoints", () => {
  for (const f of [M.ease.decel, M.ease.accel, M.ease.camera]) { near(f(0), 0); near(f(1), 1); }
  near(M.ease.decel(0.5), 0.89, 0.005); // (0,0,0,1): x=t^3, y=3t^2-2t^3 -> 0.89 at x=0.5 (front-loaded)
  near(M.ease.accel(0.5), 0.11, 0.005); // (1,0,1,1) mirrors it (back-loaded)
  assert.ok(M.ease.camera(0.25) < 0.08 && M.ease.camera(0.75) > 0.92);   // strong ease-in-out
  near(M.ease.camera(0.5), 0.6, 0.01);  // (0.77,0,0.175,1) is slightly late-weighted
});

test("keyframes interpolate with the segment easing and clamp outside", () => {
  const k = [{ t: 0, v: 0 }, { t: 2, v: 10, ease: "linear" }];
  near(M.sample(k, -1), 0); near(M.sample(k, 1), 5); near(M.sample(k, 3), 10);
});

test("camera zoom fits the focus width and respects the native-scale cap", () => {
  // 16:9: window drawn at s0=0.9; focus = full row width 1526 native px
  const c = M.cameraFor({ x: 342, y: 300, w: 1526, h: 300 }, { frameW: 1920, frameH: 1080, s0: 0.9, winX: 96, winY: 45, maxNative: 1.4, margin: 0.94, availH: 1080 });
  near(c.z, (1920 * 0.94) / (1526 * 0.9), 1e-6);           // width-limited: 1.314
  assert.ok(c.z * 0.9 <= 1.4 + 1e-9);
  // a small focus is capped by maxNative/s0
  const s = M.cameraFor({ x: 400, y: 300, w: 300, h: 80 }, { frameW: 1920, frameH: 1080, s0: 0.9, winX: 96, winY: 45, maxNative: 1.4, margin: 0.94, availH: 1080 });
  near(s.z, 1.4 / 0.9, 1e-6);
  // focus centre lands on frame centre
  const fx = 96 + (400 + 150) * 0.9, fy = 45 + (300 + 40) * 0.9;
  near(s.tx + fx * s.z, 960, 1e-6); near(s.ty + fy * s.z, 540, 1e-6);
});

test("reveal count steps rows in after the start time", () => {
  assert.strictEqual(M.revealCount(0.9, 1.0, 10, 0.05), 0);
  assert.strictEqual(M.revealCount(1.0, 1.0, 10, 0.05), 1);
  assert.strictEqual(M.revealCount(1.2, 1.0, 10, 0.05), 5);
  assert.strictEqual(M.revealCount(9, 1.0, 10, 0.05), 10);
});

test("caption alpha fades in and out over 0.25 s", () => {
  near(M.captionAlpha(1.0, 1.0, 4.0), 0); near(M.captionAlpha(1.25, 1.0, 4.0), 1);
  near(M.captionAlpha(3.0, 1.0, 4.0), 1); near(M.captionAlpha(4.0, 1.0, 4.0), 0);
});
