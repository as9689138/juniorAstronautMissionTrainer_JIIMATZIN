// 09 tres-respuestas : Not social, not anatomy, not intelligence. T 37.5 to 45 (7.5 s), schematic, cut.
// Three glyphs in a row at x 520, 960, 1400, y 430: two hands shaking, a skeleton, a brain. Each is struck
// through by a magenta diagonal on its clause (T 39.75, 41.25, 43.5) and then dims to 35 percent.
//
// Layers, back to front:
//   1. blueprint plate (navy, grid, guide circles, diagonals)
//   2. per-glyph construction: guide circle, tick ring, centre cross
//   3. glyph 1: two hands shaking (rectangular cells inside the sleeves and forearms)
//   4. glyph 2: skeleton outline (bones as capsules, ribs, vertebrae)
//   5. glyph 3: brain in profile (hex lattice inside, gyri, cerebellum, brainstem)
//   6. activity glow dots on each glyph (go out when the glyph is struck)
//   7. measurement brackets under the glyphs (T 39.75 / 42.0) and one long bracket (T 44.25)
//   8. magenta strikes and their flash rings
//   9. progress glyph (G1 reduced, Act 2: half lit), screen-fixed
(function () {
  'use strict';
  const ID = 'tres-respuestas';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // colours hoisted (pal reads are wrapped)
  const LAV = P.lavender, WHITE = P.lineWhite, NAVY = P.navy, MAG = P.magenta, GLOW = P.glow;
  const MARS = P.schemMars, OXY = P.schemOxygen;

  // ---------------------------------------------------------------------------------------------
  // Beats (shot-local seconds; global T in comments)
  const B_HANDS = 0.0; //   T 37.5  hands draw on
  const B_SKEL = 0.75; //   T 38.25 skeleton draws on
  const B_BRAIN = 1.5; //   T 39.0  brain draws on
  const S_HANDS = 2.25; //  T 39.75 strike 1
  const B_BRK = 3.0; //     T 40.5  brackets under the glyphs
  const S_SKEL = 3.75; //   T 41.25 strike 2
  const B_SCAN1 = 4.5; //   T 42.0  brain scan ring
  const B_SCAN2 = 5.25; //  T 42.75 brain lights more nodes
  const S_BRAIN = 6.0; //   T 43.5  strike 3
  const B_LONG = 6.75; //   T 44.25 long bracket under all three

  const CX = [520, 960, 1400];
  const CY = 430;
  const GS = 1.16; // glyph scale

  // ---------------------------------------------------------------------------------------------
  // Shared schematic helpers (same block in 09, 14, 15, 16)
  function xf(pts, cx, cy, rot = 0, sx = 1, sy = sx) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return pts.map((p) => [cx + (p[0] * sx) * c - (p[1] * sy) * s, cy + (p[0] * sx) * s + (p[1] * sy) * c]);
  }
  function offsetPts(pts, d, closed = true) {
    const n = pts.length;
    let A = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      A += a[0] * b[1] - b[0] * a[1];
    }
    const sgn = A >= 0 ? 1 : -1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
      const b = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      out.push([pts[i][0] - dy * d * sgn, pts[i][1] + dx * d * sgn]);
    }
    return out;
  }
  const lineOpts = (o) => ({
    width: o.w,
    color: o.color || LAV,
    alpha: o.alpha,
    seed: o.seed,
    wobble: o.wobble != null ? o.wobble : 0.9,
    tremble: 0.2,
    rough: 0.12,
    boilAmp: 0.45,
    widthJitter: 0.14,
    taper: o.taper || [3, 6],
    minWidth: 0.4,
    swell: 0.05,
    overlap: 4,
  });
  // a primary schematic outline: outer 2.5 px lavender 85 %, inner 1.5 px 50 %, `gap` px inside
  function dbl(ctx, pts, o = {}) {
    const closed = o.closed !== false;
    const p = o.p != null ? clamp(o.p) : 1;
    if (p <= 0 || !pts || pts.length < 2) return;
    const a = o.alpha != null ? o.alpha : 1;
    const gap = o.gap != null ? o.gap : 9;
    const k = o.k || 1; // width scale (for zoomed worlds)
    const inner = gap ? offsetPts(pts, gap, closed) : null;
    const cut = (arr) => (p >= 1 ? arr : arr.slice(0, Math.max(2, Math.ceil(arr.length * p) + 1)));
    const cl = closed && p >= 1;
    if (o.fill && p >= 1) {
      ctx.save();
      ctx.beginPath();
      LIB.tracePath(ctx, pts, true);
      ctx.fillStyle = o.fill;
      ctx.globalAlpha *= o.fillAlpha != null ? o.fillAlpha : 1;
      ctx.fill();
      ctx.restore();
    }
    LIB.inkPath(ctx, cut(pts), Object.assign(lineOpts({ w: (o.w || 2.5) * k, color: o.color, alpha: 0.85 * a, seed: o.seed }), { closed: cl }));
    if (inner) LIB.inkPath(ctx, cut(inner), Object.assign(lineOpts({ w: (o.wi || 1.5) * k, color: o.color, alpha: 0.5 * a, seed: (o.seed || 1) + 71 }), { closed: cl }));
  }
  // a secondary line: 1.5 px lavender 60 %
  function sec(ctx, pts, o = {}) {
    const p = o.p != null ? clamp(o.p) : 1;
    if (p <= 0 || !pts || pts.length < 2) return;
    const closed = !!o.closed && p >= 1;
    const arr = p >= 1 ? pts : pts.slice(0, Math.max(2, Math.ceil(pts.length * p) + 1));
    LIB.inkPath(ctx, arr, Object.assign(lineOpts({ w: (o.w || 1.5) * (o.k || 1), color: o.color, alpha: (o.alpha != null ? o.alpha : 0.6), seed: o.seed, taper: o.taper || [5, 8] }), { closed }));
  }
  // rectangular cells clipped to a polygon
  function rectCells(ctx, poly, ang, pitch, alpha, color, k = 1) {
    if (alpha <= 0.002) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of poly) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + pitch;
    const c = Math.cos(ang), s = Math.sin(ang);
    const path = new Path2D();
    for (let u = -R; u <= R; u += pitch) {
      path.moveTo(cx + c * u - s * -R, cy + s * u + c * -R);
      path.lineTo(cx + c * u - s * R, cy + s * u + c * R);
      path.moveTo(cx + c * -R - s * u, cy + s * -R + c * u);
      path.lineTo(cx + c * R - s * u, cy + s * R + c * u);
    }
    ctx.save();
    ctx.beginPath();
    LIB.tracePath(ctx, poly, true);
    ctx.clip();
    ctx.strokeStyle = color || LAV;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = 1 * k;
    ctx.stroke(path);
    ctx.restore();
  }
  // Progress glyph: G1 reduced to (1720, 170), r 56 (scale 56/220), Act 2 = half lit in schemMars.
  // Numbers from the storyboard's G1 (canonical owner: 03-orbitas-del-cosmos.js).
  function progressGlyph(ctx, act) {
    const cx = 1720, cy = 170, s = 56 / 220;
    const rE = 110 * s, rM = 220 * s, rMoon = 26 * s;
    const aE = -30 * DEG, aM = 200 * DEG;
    const ex = cx + Math.cos(aE) * rE, ey = cy + Math.sin(aE) * rE;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = LAV;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rM, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, rMoon, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    LIB.ticks(ctx, cx, cy, { r: rM + 4, n: 24, len: 3, major: 6, majorLen: 6, alpha: 0.35, width: 1 });
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = MARS;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, rM, -Math.PI / 2, -Math.PI / 2 + (TAU * act) / 4); ctx.stroke();
    ctx.globalAlpha = 1;
    LIB.glowDot(ctx, cx, cy, 10 * s, { rays: 8, rayLen: 3, glow: 5, seed: 3 });
    ctx.fillStyle = OXY;
    ctx.beginPath(); ctx.arc(ex, ey, 9 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.beginPath(); ctx.arc(ex + Math.cos(60 * DEG) * rMoon, ey + Math.sin(60 * DEG) * rMoon, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = MARS;
    ctx.beginPath(); ctx.arc(cx + Math.cos(aM) * rM, cy + Math.sin(aM) * rM, 11 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------
  // Geometry (local coords around each glyph centre; built once, t-independent)
  let GEO = null;
  function capsule(ax, ay, bx, by, r, n = 40) {
    const len = Math.hypot(bx - ax, by - ay) + 2 * r;
    return LIB.capsulePts((ax + bx) / 2, (ay + by) / 2, len, r, Math.atan2(by - ay, bx - ax), n);
  }
  function rotRect(cx, cy, w, h, rot, rr = 6) {
    return xf(LIB.rrectPts(-w / 2, -h / 2, w, h, rr, 10), cx, cy, rot);
  }
  function geo() {
    if (GEO) return GEO;
    const g = {};
    // ---- hands: left arm rises from lower left, right arm mirrored; fingers of the right hand wrap the left
    const ang = -22 * DEG;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const A = [-196, 84];
    const along = (u, v = 0) => [A[0] + ca * u - sa * v, A[1] + sa * u + ca * v];
    const mir = (pts) => pts.map((q) => [-q[0], q[1]]).reverse();
    const sl = along(26), fa0 = along(52), fa1 = along(158);
    g.sleeveL = rotRect(sl[0], sl[1], 52, 92, ang, 8);
    g.armL = capsule(fa0[0], fa0[1], fa1[0], fa1[1], 30);
    g.sleeveR = mir(g.sleeveL);
    g.armR = mir(g.armL);
    g.cuffL = [along(8, -46), along(8, 46)];
    g.cuffR = g.cuffL.map((q) => [-q[0], q[1]]);
    g.palm = xf(LIB.rrectPts(-82, -40, 164, 82, 34, 10), 0, 14, -4 * DEG);
    g.fingers = [];
    for (let i = 0; i < 4; i++) {
      const fx = -54 + i * 27;
      g.fingers.push(capsule(fx + 9, -22 + i * 2, fx - 7, 50 - Math.abs(i - 1.5) * 6, 12, 30));
    }
    g.thumb = capsule(-58, -30, 26, -42, 13, 32);
    g.knuckles = [];
    for (let i = 0; i < 4; i++) g.knuckles.push([-48 + i * 27, -14 + i * 2]);
    g.handDots = [[0, 14], [-120, 52], [120, 52]];

    // ---- skeleton
    g.skull = LIB.smoothPts(
      [[0, -176], [24, -170], [32, -150], [30, -128], [22, -116], [16, -104], [-16, -104], [-22, -116], [-30, -128], [-32, -150], [-24, -170]],
      true, 5);
    g.eyes = [LIB.ellipsePts(-11, -140, 7, 8, 18), LIB.ellipsePts(11, -140, 7, 8, 18)];
    g.nose = [[-3, -126], [0, -120], [3, -126]];
    g.teeth = [];
    for (let i = 0; i < 6; i++) g.teeth.push([[-12 + i * 5, -112], [-12 + i * 5, -106]]);
    g.vert = [];
    for (let y = -96; y <= 46; y += 11) g.vert.push(LIB.rrectPts(-7, y, 14, 8, 3, 6));
    g.clav = [capsule(-6, -88, -56, -82, 4, 20), capsule(6, -88, 56, -82, 4, 20)];
    g.ribs = [];
    for (let i = 0; i < 6; i++) {
      const y = -74 + i * 15;
      const w = 50 - Math.abs(i - 1.8) * 4.5;
      const dy = 10 + i * 1.5;
      for (const sx of [-1, 1]) {
        g.ribs.push(LIB.smoothPts([[sx * 8, y], [sx * w * 0.75, y - 4], [sx * w, y + dy * 0.45], [sx * w * 0.8, y + dy]], false, 4));
      }
    }
    g.sternum = LIB.rrectPts(-4, -80, 8, 52, 4, 6);
    g.pelvis = LIB.smoothPts(
      [[0, 46], [20, 42], [44, 36], [52, 52], [42, 74], [22, 84], [10, 78], [0, 72], [-10, 78], [-22, 84], [-42, 74], [-52, 52], [-44, 36], [-20, 42]],
      true, 4);
    g.bones = [];
    const limb = (ax, ay, bx, by, r) => g.bones.push(capsule(ax, ay, bx, by, r, 26));
    for (const s of [-1, 1]) {
      limb(s * 60, -80, s * 72, -14, 6.5); // humerus
      limb(s * 74, -6, s * 86, 54, 5.5); // forearm
      limb(s * 24, 82, s * 30, 126, 8); // femur
      limb(s * 30, 136, s * 33, 176, 6.5); // tibia
    }
    g.joints = [];
    for (const s of [-1, 1]) g.joints.push([s * 58, -86, 7], [s * 73, -10, 5], [s * 30, 131, 6], [s * 24, 78, 6]);
    g.feet = [];
    g.handsK = [];
    for (const s of [-1, 1]) {
      g.feet.push(LIB.smoothPts([[s * 28, 180], [s * 44, 182], [s * 56, 186], [s * 30, 188]], true, 3));
      const hx = s * 88, hy = 62;
      for (let f = 0; f < 4; f++) {
        const a = (90 + s * (-30 + f * 16)) * DEG;
        g.handsK.push([[hx, hy], [hx + Math.cos(a) * 22, hy + Math.sin(a) * 22]]);
      }
    }
    g.skelDots = [[0, -40], [0, 60], [-58, -86]];

    // ---- brain (profile facing left)
    const rB = sd('brain-outline');
    const br = [];
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let rx = 150, ry = 104;
      let r = 1 + 0.028 * Math.sin(a * 11 + 1.3) + 0.018 * Math.sin(a * 17 + 0.4) + 0.012 * LIB.noise1(a * 3, rB);
      let x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r - 8;
      if (y > 30) y = 30 + (y - 30) * 0.55; // flatter underside
      if (x > 40 && y > 10) { x -= (x - 40) * 0.12; y -= 6; } // notch for the cerebellum
      br.push([x, y]);
    }
    g.brain = br;
    g.cereb = LIB.smoothPts([[46, 40], [92, 26], [132, 36], [140, 60], [112, 82], [70, 82], [48, 64]], true, 4);
    g.cerebLines = [];
    for (let i = 0; i < 4; i++) {
      const y = 44 + i * 9;
      g.cerebLines.push(LIB.smoothPts([[60 + i * 3, y + 2], [96, y - 3], [128 - i * 4, y + 3]], false, 4));
    }
    g.stem = LIB.smoothPts([[54, 62], [80, 74], [74, 112], [66, 150], [46, 150], [50, 108], [42, 76]], true, 4);
    g.sulcus = LIB.smoothPts([[18, -110], [8, -70], [-4, -40], [-18, -6], [-26, 14]], false, 4);
    g.fissure = LIB.smoothPts([[-92, 28], [-50, 18], [-10, 8], [30, -2], [60, -18], [84, -16]], false, 4);
    g.gyri = [];
    const rg = LIB.rng(sd('gyri'));
    for (let i = 0; i < 16; i++) {
      // short meanders inside the outline
      let x = rg.range(-120, 110), y = rg.range(-90, 20);
      if ((x * x) / (138 * 138) + ((y + 8) * (y + 8)) / (92 * 92) > 0.8) { i--; continue; }
      const pts = [[x, y]];
      let a = rg.range(0, TAU);
      for (let k = 0; k < 5; k++) {
        a += rg.range(-1.3, 1.3);
        x += Math.cos(a) * 14; y += Math.sin(a) * 14;
        if ((x * x) / (138 * 138) + ((y + 8) * (y + 8)) / (92 * 92) > 0.86) break;
        pts.push([x, y]);
      }
      if (pts.length > 2) g.gyri.push(LIB.smoothPts(pts, false, 4));
    }
    g.brainDots = [[-70, -40], [40, -60], [-20, 10], [90, -20], [-100, 0]];
    GEO = g;
    return g;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const g = geo();
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);
      const bi = L.boil(info.T);

      // 1. plate
      L.blueprint(ctx, { w: 1920, h: 1080, center: [960, 450], seed: 9 });

      const ON = [B_HANDS, B_SKEL, B_BRAIN];
      const ST = [S_HANDS, S_SKEL, S_BRAIN];
      const dimOf = (i) => 1 - 0.65 * hit(ST[i] + 6 * FR, 6, E.outQuad, 0);

      // 2. construction per glyph
      for (let i = 0; i < 3; i++) {
        const on = hit(ON[i], 9, E.outExpo);
        if (on <= 0) continue;
        const cx = CX[i];
        const dm = dimOf(i);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * dm;
        L.guideCircle(ctx, cx, CY, 206, { alpha: 0.16, p: on, start: -Math.PI / 2 + i * 0.4, cross: 0 });
        L.ticks(ctx, cx, CY, { r: 212, n: 48, len: 8, major: 6, majorLen: 16, alpha: 0.4 * dm, p: on, start: -Math.PI / 2 });
        ctx.strokeStyle = LAV;
        ctx.globalAlpha *= 0.14;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 220 * on, CY); ctx.lineTo(cx + 220 * on, CY);
        ctx.moveTo(cx, CY - 220 * on); ctx.lineTo(cx, CY + 220 * on);
        ctx.stroke();
        ctx.restore();
      }

      // 3-5. the glyphs
      const drawGlyph = [drawHands, drawSkeleton, drawBrain];
      for (let i = 0; i < 3; i++) {
        const pOut = hit(ON[i], 9, E.outExpo);
        if (pOut <= 0) continue;
        const pIn = hit(ON[i] + 0.375, 9, E.outExpo);
        const dm = dimOf(i);
        ctx.save();
        ctx.globalAlpha = lerp(0.35, 1, dm);
        ctx.translate(CX[i], CY);
        ctx.scale(GS, GS);
        drawGlyph[i](ctx, L, g, pOut, pIn, dm, t, bi);
        ctx.restore();
      }

      // 6. activity glow dots (pop a beat after the glyph, out when struck)
      const dots = [g.handDots, g.skelDots, g.brainDots];
      for (let i = 0; i < 3; i++) {
        const pop = popTwos(ON[i] + 0.75);
        if (pop <= 0) continue;
        const off = 1 - hit(ST[i], 6, E.outQuad, 0);
        if (off <= 0) continue;
        let count = dots[i].length;
        if (i === 2) count = t < B_SCAN1 ? 2 : t < B_SCAN2 ? 4 : 5;
        for (let k = 0; k < count; k++) {
          const d = dots[i][k];
          const pk = i === 2 && k >= 2 ? popTwos(k < 4 ? B_SCAN1 : B_SCAN2) : pop;
          if (pk <= 0) continue;
          ctx.save();
          ctx.globalAlpha = off;
          L.glowDot(ctx, CX[i] + d[0] * GS, CY + d[1] * GS, 8 * pk, { rays: 12, rayLen: 2.3, glow: 5, seed: sd('dot', i, k), rot: k * 0.4 });
          ctx.restore();
        }
      }

      // brain scan rings on the two anticipation beats
      for (const [b, r0] of [[B_SCAN1, 60], [B_SCAN2, 90]]) {
        const u = hit(b, 12, E.outExpo);
        if (u <= 0 || u >= 1) continue;
        ctx.save();
        ctx.strokeStyle = WHITE;
        ctx.globalAlpha = 0.55 * (1 - u);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX[2], CY - 8 * GS, r0 + 120 * u, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 7. brackets under each glyph, then one long bracket under all three
      const pb = hit(B_BRK, 9, E.outExpo);
      if (pb > 0) {
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.globalAlpha = lerp(0.45, 1, dimOf(i));
          L.bracket(ctx, CX[i] - 150, 684, CX[i] + 150, 684, { p: pb, alpha: 0.6, cap: 16 });
          L.ticks(ctx, CX[i] - 150, 704, { length: 300, n: 20, len: 6, major: 5, majorLen: 12, alpha: 0.4, p: pb, baseline: false });
          ctx.restore();
        }
      }
      const pl = hit(B_LONG, 9, E.outExpo);
      if (pl > 0) {
        L.bracket(ctx, CX[0] - 170, 770, CX[2] + 170, 770, { p: pl, alpha: 0.6, cap: 16, style: 'square', offset: -1 });
        L.glowDot(ctx, 960, 770, 6 * popTwos(B_LONG), { rays: 8, rayLen: 2.4, glow: 5, seed: 41 });
      }

      // 8. magenta strikes: a diagonal drawn in 6 frames, full for 12 frames, then settles to 55 %
      for (let i = 0; i < 3; i++) {
        const s0 = ST[i];
        if (t < s0) continue;
        const u = hit(s0, 6, E.outQuad);
        const fade = 1 - 0.45 * clamp((t - (s0 + 12 * FR)) / (8 * FR));
        const ax = CX[i] - 190, ay = CY - 175, bx = CX[i] + 190, by = CY + 175;
        const ex = lerp(ax, bx, u), ey = lerp(ay, by, u);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = MAG;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(ex, ey);
        ctx.stroke();
        // soft second pass (glow) while the strike is fresh
        const fresh = 1 - clamp((t - s0) / (12 * FR));
        if (fresh > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 * fresh;
          ctx.lineWidth = 12;
          ctx.stroke();
        }
        ctx.restore();
        // end caps: small ticks across the line at both ends
        if (u >= 1) {
          ctx.save();
          ctx.strokeStyle = MAG;
          ctx.globalAlpha = fade;
          ctx.lineWidth = 3;
          const nx = -0.66, ny = 0.75;
          ctx.beginPath();
          ctx.moveTo(ax - nx * 10, ay - ny * 10); ctx.lineTo(ax + nx * 10, ay + ny * 10);
          ctx.moveTo(bx - nx * 10, by - ny * 10); ctx.lineTo(bx + nx * 10, by + ny * 10);
          ctx.stroke();
          ctx.restore();
        }
        // flash ring from the glyph centre (12 frames)
        const rr = hit(s0, 12, E.outExpo);
        if (rr < 1) {
          ctx.save();
          ctx.strokeStyle = MAG;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1 - rr;
          ctx.beginPath();
          ctx.arc(CX[i], CY, 60 + 170 * rr, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 0.6 * (1 - rr);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(CX[i], CY, 30 + 110 * rr, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 9. progress glyph (Act 2)
      progressGlyph(ctx, 2);
    },
  });

  // ---------------------------------------------------------------------------------------------
  function drawHands(ctx, L, g, pOut, pIn, dm, t) {
    const fillA = clamp(pOut * 1.4);
    const parts = [
      [g.armL, 'armL', -22 * DEG],
      [g.armR, 'armR', 22 * DEG],
      [g.sleeveL, 'slL', -22 * DEG],
      [g.sleeveR, 'slR', 22 * DEG],
      [g.palm, 'palm', -4 * DEG],
    ];
    for (const [pts, key, ang] of parts) {
      dbl(ctx, pts, { p: pOut, seed: sd(key), gap: key === 'palm' ? 8 : 7, fill: NAVY, fillAlpha: fillA });
      rectCells(ctx, offsetPts(pts, 9), ang, key.startsWith('sl') ? 9 : 14, 0.32 * pIn, LAV);
    }
    // cuff seams
    sec(ctx, g.cuffL, { p: pIn, seed: sd('cuffL'), alpha: 0.6 });
    sec(ctx, g.cuffR, { p: pIn, seed: sd('cuffR'), alpha: 0.6 });
    // fingers of the right hand wrapping the left, then the left thumb on top
    for (let i = 0; i < g.fingers.length; i++) {
      dbl(ctx, g.fingers[i], { p: pOut, seed: sd('fing', i), gap: 4, w: 2.2, wi: 1.1, fill: NAVY, fillAlpha: fillA });
    }
    dbl(ctx, g.thumb, { p: pOut, seed: sd('thumb'), gap: 4, w: 2.2, wi: 1.1, fill: NAVY, fillAlpha: fillA });
    // knuckle marks and nail lines
    if (pIn > 0) {
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha *= 0.5 * pIn;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const k of g.knuckles) { ctx.moveTo(k[0] - 6, k[1]); ctx.lineTo(k[0] + 6, k[1] + 1); }
      ctx.moveTo(14, -44); ctx.lineTo(24, -46);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSkeleton(ctx, L, g, pOut, pIn) {
    dbl(ctx, g.skull, { p: pOut, seed: sd('skull'), gap: 5, fill: NAVY, fillAlpha: clamp(pOut * 1.4) });
    for (let i = 0; i < 2; i++) sec(ctx, g.eyes[i], { p: pIn, closed: true, seed: sd('eye', i), alpha: 0.75 });
    sec(ctx, g.nose, { p: pIn, seed: sd('nose'), alpha: 0.6 });
    if (pIn > 0) {
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha *= 0.45 * pIn;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const s of g.teeth) { ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); }
      ctx.moveTo(-16, -109); ctx.lineTo(16, -109);
      ctx.stroke();
      ctx.restore();
    }
    // spine and ribs
    for (let i = 0; i < g.vert.length; i++) {
      const u = clamp(pOut * 1.3 - i * 0.02);
      sec(ctx, g.vert[i], { p: u, closed: true, seed: sd('v', i), alpha: 0.7, w: 1.4 });
    }
    sec(ctx, g.sternum, { p: pOut, closed: true, seed: sd('stern'), alpha: 0.6 });
    for (let i = 0; i < g.ribs.length; i++) sec(ctx, g.ribs[i], { p: pOut, seed: sd('rib', i), alpha: 0.75, w: 1.8 });
    for (let i = 0; i < 2; i++) dbl(ctx, g.clav[i], { p: pOut, seed: sd('clav', i), gap: 0, w: 2 });
    dbl(ctx, g.pelvis, { p: pOut, seed: sd('pelvis'), gap: 6, fill: NAVY, fillAlpha: clamp(pOut * 1.4) });
    if (pIn > 0) {
      sec(ctx, L.ellipsePts(-20, 60, 9, 10, 18), { p: pIn, closed: true, seed: sd('obt', 0), alpha: 0.5 });
      sec(ctx, L.ellipsePts(20, 60, 9, 10, 18), { p: pIn, closed: true, seed: sd('obt', 1), alpha: 0.5 });
    }
    for (let i = 0; i < g.bones.length; i++) {
      dbl(ctx, g.bones[i], { p: pOut, seed: sd('bone', i), gap: 0, w: 2.2 });
      // marrow centre line
      const b = g.bones[i];
      const h = b.length >> 1;
      if (pIn > 0) {
        ctx.save();
        ctx.strokeStyle = LAV;
        ctx.globalAlpha *= 0.35 * pIn;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const z = b.length - 1;
        ctx.moveTo((b[0][0] + b[h - 1][0]) / 2, (b[0][1] + b[h - 1][1]) / 2);
        ctx.lineTo((b[h][0] + b[z][0]) / 2, (b[h][1] + b[z][1]) / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    for (let i = 0; i < g.joints.length; i++) {
      const j = g.joints[i];
      sec(ctx, L.ellipsePts(j[0], j[1], j[2], j[2], 16), { p: pIn, closed: true, seed: sd('j', i), alpha: 0.8, w: 1.6 });
    }
    for (let i = 0; i < g.feet.length; i++) sec(ctx, g.feet[i], { p: pOut, closed: true, seed: sd('foot', i), alpha: 0.75, w: 1.8 });
    if (pIn > 0) {
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha *= 0.6 * pIn;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of g.handsK) { ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBrain(ctx, L, g, pOut, pIn) {
    const fa = clamp(pOut * 1.4);
    dbl(ctx, g.stem, { p: pOut, seed: sd('stem'), gap: 5, fill: NAVY, fillAlpha: fa });
    dbl(ctx, g.cereb, { p: pOut, seed: sd('cereb'), gap: 5, fill: NAVY, fillAlpha: fa });
    for (let i = 0; i < g.cerebLines.length; i++) sec(ctx, g.cerebLines[i], { p: pIn, seed: sd('cl', i), alpha: 0.5, w: 1.2 });
    dbl(ctx, g.brain, { p: pOut, seed: sd('brain'), gap: 9, fill: NAVY, fillAlpha: fa });
    if (pIn > 0) {
      const inner = offsetPts(g.brain, 12);
      ctx.save();
      ctx.globalAlpha *= pIn;
      L.hexLattice(ctx, inner, { r: 15, alpha: 0.22, width: 1, seed: sd('hex'), jitter: 1.2 });
      ctx.restore();
    }
    sec(ctx, g.sulcus, { p: pIn, seed: sd('sulcus'), alpha: 0.85, w: 2 });
    sec(ctx, g.fissure, { p: pIn, seed: sd('fiss'), alpha: 0.85, w: 2 });
    for (let i = 0; i < g.gyri.length; i++) sec(ctx, g.gyri[i], { p: pIn, seed: sd('gy', i), alpha: 0.6, w: 1.3 });
  }
})();
