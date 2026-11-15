// 16 electron : Every electron. T 76.5 to 81 (4.5 s), schematic, cut.
// The atom from 15 large at centre; push 1x -> 3x into orbit A until the electron's glow fills the
// centre (push target (1100, 380), converging on screen (960, 450)); magenta burst on T 80.25.
//
// Layers, back to front:
//   1. blueprint plate (screen-fixed)
//   2. world: fine sub-grid that appears with zoom, guide circles, tick ring
//   3. world: the atom (three orbits, nucleus, two other electrons), orbit A highlight + ticks
//   4. world: standing wave traced along orbit A
//   5. screen: the pushed electron (glow grows), tick ring, probability shells
//   6. magenta burst
//   7. progress glyph (G1 reduced, Act 2: half lit)
(function () {
  'use strict';
  const ID = 'electron';
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
  // The atom (same block in 15 and 16, seeded from 'atom' so the boil matches across the cut).
  // Centre (960, 450); three orbits rx 300, ry 92; orbit A is turned so it passes through the
  // storyboard's push target (1100, 380); B and C sit at +-60 degrees from A.
  const ATOM = (() => {
    const cx = 960, cy = 450, rx = 300, ry = 92;
    const dx = 1100 - cx, dy = 380 - cy;
    const f = (th) => {
      const x = dx * Math.cos(th) + dy * Math.sin(th);
      const y = -dx * Math.sin(th) + dy * Math.cos(th);
      return (x * x) / (rx * rx) + (y * y) / (ry * ry) - 1;
    };
    let lo = Math.atan2(dy, dx), hi = lo + Math.PI / 2;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (f(m) < 0) lo = m; else hi = m;
    }
    const thA = (lo + hi) / 2;
    const xa = dx * Math.cos(thA) + dy * Math.sin(thA);
    const ya = -dx * Math.sin(thA) + dy * Math.cos(thA);
    const phiT = Math.atan2(ya / ry, xa / rx);
    const rots = [thA, thA + 60 * DEG, thA - 60 * DEG];
    const at = (k, phi) => {
      const th = rots[k];
      const ex = rx * Math.cos(phi), ey = ry * Math.sin(phi);
      return [cx + ex * Math.cos(th) - ey * Math.sin(th), cy + ex * Math.sin(th) + ey * Math.cos(th)];
    };
    const orbitPts = rots.map((th) => LIB.ellipsePts(cx, cy, rx, ry, 120, th));
    // nucleus: a tight cluster of nucleons
    const rn = LIB.rng(LIB.hash('atom', 'nucleus'));
    const nuc = [[0, 0]];
    for (let i = 0; i < 6; i++) nuc.push([Math.cos((i / 6) * TAU) * 17, Math.sin((i / 6) * TAU) * 17]);
    for (let i = 0; i < 5; i++) nuc.push([Math.cos((i / 5) * TAU + 0.5) * 30 + rn.range(-2, 2), Math.sin((i / 5) * TAU + 0.5) * 30 + rn.range(-2, 2)]);
    const OMEGA = [1.15, -0.9, 0.75]; // radians per second
    const PH0 = [phiT - 1.15 * 6.0 - 0.35, 2.2, 4.1]; // orbit A's electron sits near the target as 15 ends
    return { cx, cy, rx, ry, rots, at, orbitPts, phiT, nuc, OMEGA, PH0 };
  })();
  const aseed = (...k) => LIB.hash('atom', ...k) & 0x7fffffff;

  // drawAtom(ctx, o): o.p orbit draw-on, o.pe electron pop, o.k width scale, o.phi [3] electron phases,
  // o.skipE electron index the caller draws itself, o.hiA highlight of orbit A (0..1)
  function drawAtom(ctx, o) {
    const k = o.k || 1;
    const p = o.p != null ? o.p : 1;
    // orbits
    for (let i = 0; i < 3; i++) {
      const pi = clamp(p * 1.25 - i * 0.12);
      if (pi <= 0) continue;
      const pts = ATOM.orbitPts[i];
      const hi = i === 0 ? o.hiA || 0 : 0;
      dbl(ctx, pts, { p: pi, seed: aseed('orb', i), gap: 6 * k, k, color: hi > 0.5 ? WHITE : LAV, alpha: 0.85 + 0.15 * hi });
    }
    // nucleus
    const pn = clamp(p * 2);
    if (pn > 0) {
      const rr = 13;
      for (let i = ATOM.nuc.length - 1; i >= 0; i--) {
        const q = ATOM.nuc[i];
        const x = ATOM.cx + q[0] * pn, y = ATOM.cy + q[1] * pn;
        ctx.save();
        ctx.fillStyle = NAVY;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
        ctx.restore();
        sec(ctx, LIB.ellipsePts(x, y, rr, rr, 20), { closed: true, seed: aseed('nuc', i), alpha: i % 2 ? 0.55 : 0.85, w: 1.6, k });
        if (i % 2 === 0) {
          ctx.save();
          ctx.strokeStyle = LAV; ctx.globalAlpha *= 0.4; ctx.lineWidth = 1 * k;
          ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
          ctx.restore();
        }
      }
      LIB.glowDot(ctx, ATOM.cx, ATOM.cy, 11 * pn, { rays: 12, rayLen: 2.2, glow: 6, seed: aseed('core') });
    }
    // electrons
    const pe = o.pe != null ? o.pe : 1;
    if (pe > 0 && o.phi) {
      for (let i = 0; i < 3; i++) {
        if (i === o.skipE) continue;
        const q = ATOM.at(i, o.phi[i]);
        LIB.glowDot(ctx, q[0], q[1], 9 * pe, { rays: 12, rayLen: 2.2, glow: 5, color: P.paleBlue, seed: aseed('e', i) });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Beats (shot-local; global T in comments)
  const B_HI = 0.75; //   T 77.25 orbit A brightens, ticks along it
  const B_WAVE = 1.5; //  T 78.0  standing wave traces along orbit A
  const B_RING = 2.25; // T 78.75 tick ring locks onto the electron
  const B_SHELL = 3.0; // T 79.5  electron arrives; probability shells pop
  const B_BURST = 3.75; //T 80.25 magenta burst
  const S0 = [960, 450]; // screen point the push converges on

  const elecPhi = (t) => ATOM.phiT - 0.35 * (1 - E.outCubic(clamp(t / B_SHELL)));

  // fine world-space lattice around the atom that only shows once zoomed (sells the push)
  let SUB = null;
  function subGrid() {
    if (SUB) return SUB;
    const p = new Path2D();
    for (let x = 700; x <= 1300; x += 20) { p.moveTo(x, 200); p.lineTo(x, 700); }
    for (let y = 200; y <= 700; y += 20) { p.moveTo(700, y); p.lineTo(1300, y); }
    SUB = p;
    return p;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // 1. plate (screen-fixed)
      L.blueprint(ctx, { w: 1920, h: 1080, center: [960, 450], seed: 16 });

      // camera: zoom 1 -> 3 (log-linear, inOutSine), focus slides onto the electron
      const u = E.inOutSine(t / 4.5);
      const z = Math.pow(3, u);
      const eNow = ATOM.at(0, elecPhi(tw));
      const fu = E.inOutCubic(clamp(t / 3.6));
      const F = [lerp(ATOM.cx, eNow[0], fu), lerp(ATOM.cy, eNow[1], fu)];
      const k = Math.pow(z, -0.7); // lines thin as we push, but not all the way
      const toScreen = (w) => [S0[0] + z * (w[0] - F[0]), S0[1] + z * (w[1] - F[1])];

      ctx.save();
      ctx.translate(S0[0], S0[1]);
      ctx.scale(z, z);
      ctx.translate(-F[0], -F[1]);

      // 2. world sub-grid, fades in with zoom
      const ga = clamp((z - 1.2) / 1.2) * 0.22;
      if (ga > 0) {
        ctx.save();
        ctx.strokeStyle = P.grid;
        ctx.globalAlpha = ga;
        ctx.lineWidth = 1 / z;
        ctx.stroke(subGrid());
        ctx.restore();
      }
      // guide circles around the atom
      L.guideCircle(ctx, ATOM.cx, ATOM.cy, 330, { alpha: 0.16, width: 1.5 * k });
      L.guideCircle(ctx, ATOM.cx, ATOM.cy, 120, { alpha: 0.14, width: 1.5 * k, dash: [6 * k, 6 * k] });
      L.ticks(ctx, ATOM.cx, ATOM.cy, { r: 338, n: 96, len: 10 * k, major: 8, majorLen: 20 * k, alpha: 0.45, width: 1.5 * k });

      // 3. atom
      const phis = [0, ATOM.PH0[1] + ATOM.OMEGA[1] * (6 + tw), ATOM.PH0[2] + ATOM.OMEGA[2] * (6 + tw)];
      const hiA = hit(B_HI, 6, E.outQuad);
      drawAtom(ctx, { k, phi: phis, skipE: 0, hiA });

      // orbit A ticks (pop on B_HI)
      if (hiA > 0) {
        const pts = ATOM.orbitPts[0];
        ctx.save();
        ctx.strokeStyle = WHITE;
        ctx.globalAlpha = 0.6 * hiA;
        ctx.lineWidth = 1.5 * k;
        ctx.beginPath();
        const n = pts.length;
        for (let i = 0; i < n; i += 3) {
          const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
          let nx = -(b[1] - a[1]), ny = b[0] - a[0];
          const l = Math.hypot(nx, ny) || 1;
          nx /= l; ny /= l;
          const len = (i % 15 === 0 ? 14 : 7) * k;
          ctx.moveTo(pts[i][0] - nx * len, pts[i][1] - ny * len);
          ctx.lineTo(pts[i][0] + nx * len, pts[i][1] + ny * len);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. standing wave along orbit A (7 wavelengths), traces on at 24 fps
      const pw = hit(B_WAVE, 18, E.outExpo);
      if (pw > 0) {
        const th = ATOM.rots[0];
        const n = 420;
        const ph0 = elecPhi(tw);
        ctx.save();
        ctx.strokeStyle = P.paleBlue;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.6 * k;
        ctx.beginPath();
        const m = Math.round(n * pw);
        for (let i = 0; i <= m; i++) {
          const phi = ph0 + (i / n) * TAU;
          const amp = 14 * Math.sin(7 * (phi - ATOM.phiT) + Math.PI / 2) * Math.cos(t * 4);
          const ex = (ATOM.rx + amp) * Math.cos(phi), ey = (ATOM.ry + amp * 0.35) * Math.sin(phi);
          const x = ATOM.cx + ex * Math.cos(th) - ey * Math.sin(th);
          const y = ATOM.cy + ex * Math.sin(th) + ey * Math.cos(th);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 5. the electron (screen space so its glow can grow to fill the centre)
      const es = toScreen(eNow);
      const er = 9 * z * (1 + 3.2 * E.inCubic(clamp((t - 2.25) / 2.0)));
      // probability shells
      const psh = popTwos(B_SHELL);
      if (psh > 0) {
        for (let i = 0; i < 4; i++) {
          L.guideCircle(ctx, es[0], es[1], (er * 2.2 + i * 34) * psh, { alpha: 0.35 - i * 0.06, width: 1.5, dash: [8, 7], start: t * (i % 2 ? 0.6 : -0.6) });
        }
      }
      // tick ring locking on
      const pr = hit(B_RING, 9, E.outExpo);
      if (pr > 0) {
        const R = 70 + er * 1.4;
        L.ticks(ctx, es[0], es[1], { r: R, n: 36, len: 10, major: 9, majorLen: 20, alpha: 0.6, p: pr, rot: -t * 0.5 });
        L.guideCircle(ctx, es[0], es[1], R - 6, { alpha: 0.3, p: pr, width: 1.5 });
        // crosshair brackets
        ctx.save();
        ctx.strokeStyle = LAV;
        ctx.globalAlpha = 0.6 * pr;
        ctx.lineWidth = 1.5;
        const c = R + 30;
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          ctx.moveTo(es[0] + sx * c, es[1] + sy * (c - 18));
          ctx.lineTo(es[0] + sx * c, es[1] + sy * c);
          ctx.lineTo(es[0] + sx * (c - 18), es[1] + sy * c);
        }
        ctx.stroke();
        ctx.restore();
      }
      L.glowDot(ctx, es[0], es[1], er, { rays: 16, rayLen: 2.3, glow: 5, color: P.paleBlue, seed: aseed('e', 0), rot: tw * 0.4 });

      // 6. magenta burst on T 80.25 (12 frames, then gone)
      const bu = hit(B_BURST, 12, E.outExpo);
      if (bu > 0 && bu < 1) {
        ctx.save();
        ctx.strokeStyle = MAG;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = (1 - bu) * (1 - i * 0.25);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(es[0], es[1], er * 1.2 + (220 + i * 160) * bu, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1 - bu;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU + 0.1;
          const r0 = er * 1.3 + 140 * bu, r1 = r0 + (i % 2 ? 40 : 90) * (1 - bu * 0.5);
          ctx.moveTo(es[0] + Math.cos(a) * r0, es[1] + Math.sin(a) * r0);
          ctx.lineTo(es[0] + Math.cos(a) * r1, es[1] + Math.sin(a) * r1);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 * (1 - bu);
        ctx.fillStyle = MAG;
        ctx.beginPath();
        ctx.arc(es[0], es[1], er * 2 + 200 * bu, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 7. progress glyph (Act 2), screen-fixed
      progressGlyph(ctx, 2);
    },
  });
})();
