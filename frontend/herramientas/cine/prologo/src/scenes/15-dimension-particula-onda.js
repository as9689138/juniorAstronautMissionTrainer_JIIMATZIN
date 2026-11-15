// 15 dimension-particula-onda : Dimension, particle, wave. T 70.5 to 76.5 (6 s), schematic, cut.
// Montage of four cards in the centre (960, 450), 1.5 s each: wireframe cube, particle cloud, sine wave,
// atom (the same atom 16 pushes into). Each draws on in 9 frames; magenta flash on each change; push 1 -> 1.05.
//
// Layers: 1 blueprint plate; 2 card frame, rulers, index pips; 3 card content; 4 magenta flash; 5 progress glyph.
(function () {
  'use strict';
  const ID = 'dimension-particula-onda';
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
  // Beats: cards at T 70.5, 72.0, 73.5, 75.0 (local 0, 1.5, 3.0, 4.5); detail on the second beat
  const CARDS = [0, 1.5, 3.0, 4.5];
  const CC = [960, 450]; // card centre
  const CW = 820, CH = 600;

  let PART = null;
  function particles() {
    if (PART) return PART;
    const r = LIB.rng(sd('particles'));
    const a = [];
    for (let i = 0; i < 140; i++) {
      const g = r.gauss ? [r.gauss(), r.gauss()] : [r.range(-1.6, 1.6), r.range(-1.6, 1.6)];
      a.push({ x: clamp(g[0], -2, 2) * 110, y: clamp(g[1], -2, 2) * 75, s: r.range(0, 1000), big: i < 12 });
    }
    PART = a;
    return a;
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

      // 1. plate
      L.blueprint(ctx, { w: 1920, h: 1080, center: [960, 450], seed: 15 });

      const ci = Math.min(3, Math.floor(t / 1.5 + 1e-6));
      const c0 = CARDS[ci];
      const lt = t - c0;
      const p = hit(c0, 9, E.outExpo); // draw-on
      const p2 = hit(c0 + 0.75, 9, E.outExpo); // second-beat detail
      const z = 1 + 0.05 * E.outSine(lt / 1.5);

      ctx.save();
      ctx.translate(CC[0], CC[1]);
      ctx.scale(z, z);
      ctx.translate(-CC[0], -CC[1]);

      // 2. card frame
      const fr = LIB.rrectPts(CC[0] - CW / 2, CC[1] - CH / 2, CW, CH, 14, 20);
      dbl(ctx, fr, { seed: sd('frame'), gap: 9, alpha: 0.7 });
      L.ticks(ctx, CC[0] - CW / 2 + 30, CC[1] + CH / 2 - 26, { length: CW - 60, n: 40, len: 6, major: 5, majorLen: 12, alpha: 0.35, baseline: false, side: -1 });
      L.ticks(ctx, CC[0] - CW / 2 + 26, CC[1] - CH / 2 + 30, { length: CH - 60, angle: Math.PI / 2, n: 30, len: 6, major: 5, majorLen: 12, alpha: 0.35, baseline: false, side: -1 });
      // card index pips (four small squares, the current one lit)
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.strokeStyle = LAV;
        ctx.fillStyle = i === ci ? WHITE : NAVY;
        ctx.globalAlpha = i <= ci ? 0.9 : 0.4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(CC[0] + CW / 2 - 110 + i * 22, CC[1] - CH / 2 + 22, 12, 12);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      L.guideCircle(ctx, CC[0], CC[1], 250, { alpha: 0.12, cross: 14 });

      // 3. card content
      if (ci === 0) cube(ctx, L, p, p2, tw);
      else if (ci === 1) cloud(ctx, L, p, p2, tw);
      else if (ci === 2) wave(ctx, L, p, p2, tw, lt);
      else {
        const phi = [0, 1, 2].map((k) => ATOM.PH0[k] + ATOM.OMEGA[k] * tw);
        drawAtom(ctx, { p, pe: popTwos(c0 + 0.75), phi });
        L.guideCircle(ctx, ATOM.cx, ATOM.cy, 120, { alpha: 0.14 * p2, dash: [6, 6] });
      }
      ctx.restore();

      // 4. magenta flash on every card change (12 frames)
      const fu = hit(c0, 12, E.outExpo);
      if (fu < 1) {
        ctx.save();
        ctx.strokeStyle = MAG;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - fu;
        const g = 10 + 40 * fu;
        ctx.strokeRect(CC[0] - CW / 2 - g, CC[1] - CH / 2 - g, CW + 2 * g, CH + 2 * g);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18 * (1 - fu);
        ctx.fillStyle = MAG;
        ctx.fillRect(CC[0] - CW / 2, CC[1] - CH / 2, CW, CH);
        ctx.restore();
      }

      // 5. progress glyph (Act 2)
      progressGlyph(ctx, 2);
    },
  });

  // wireframe cube, slow yaw, grid cells on faces, corner glow dots and brackets on the 2nd beat
  function cube(ctx, L, p, p2, tw) {
    const s = 150, yaw = 0.6 + tw * 0.35, pitch = -0.45;
    const V = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const zz of [-1, 1]) V.push([x, y, zz]);
    const proj = (v) => {
      let x = v[0] * Math.cos(yaw) - v[2] * Math.sin(yaw);
      let zz = v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
      let y = v[1] * Math.cos(pitch) - zz * Math.sin(pitch);
      return [CC[0] + x * s, CC[1] + 10 + y * s];
    };
    const P2 = V.map(proj);
    const edges = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      let d = 0;
      for (let k = 0; k < 3; k++) if (V[i][k] !== V[j][k]) d++;
      if (d === 1) edges.push([i, j]);
    }
    // face grids (lattice lines) on all faces, faint
    if (p2 > 0) {
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha = 0.25 * p2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let ax = 0; ax < 3; ax++) for (const sgn of [-1, 1]) for (let q = -0.5; q <= 0.51; q += 0.5) {
        const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], d = [0, 0, 0];
        const u = (ax + 1) % 3, w = (ax + 2) % 3;
        a[ax] = b[ax] = c[ax] = d[ax] = sgn;
        a[u] = q; a[w] = -1; b[u] = q; b[w] = 1;
        c[w] = q; c[u] = -1; d[w] = q; d[u] = 1;
        const A = proj(a), B = proj(b), C = proj(c), D = proj(d);
        ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        ctx.moveTo(C[0], C[1]); ctx.lineTo(D[0], D[1]);
      }
      ctx.stroke();
      ctx.restore();
    }
    for (let e = 0; e < edges.length; e++) {
      const [i, j] = edges[e];
      dbl(ctx, [P2[i], P2[j]], { closed: false, p: clamp(p * 1.4 - e * 0.03), gap: 0, seed: sd('edge', e), w: 2.5 });
    }
    // diagonal guide through the cube
    sec(ctx, [P2[0], P2[7]], { p: p2, alpha: 0.3, seed: sd('diag') });
    if (p2 > 0) {
      for (let i = 0; i < 8; i++) L.glowDot(ctx, P2[i][0], P2[i][1], 5 * p2, { rays: 8, rayLen: 2.4, glow: 5, seed: sd('cv', i) });
      L.bracket(ctx, CC[0] - 260, CC[1] + 230, CC[0] + 260, CC[1] + 230, { p: p2 });
      L.bracket(ctx, CC[0] + 300, CC[1] - 200, CC[0] + 300, CC[1] + 200, { p: p2 });
    }
  }

  // particle cloud: drifting dots on twos, a dozen glow dots, tracks on the 2nd beat
  function cloud(ctx, L, p, p2, tw) {
    const A = particles();
    ctx.save();
    ctx.fillStyle = WHITE;
    for (let i = 0; i < A.length; i++) {
      const q = A[i];
      const k = clamp(p * 1.6 - (i / A.length) * 0.6);
      if (k <= 0) continue;
      const x = CC[0] + q.x * k * 1.1 + 18 * LIB.noise1(tw * 0.8 + q.s, 3);
      const y = CC[1] + q.y * k * 1.1 + 18 * LIB.noise1(tw * 0.8 + q.s, 7);
      if (q.big) {
        if (p2 > 0) {
          // track: short dotted trail
          ctx.globalAlpha = 0.35 * p2;
          for (let s = 1; s <= 5; s++) {
            const tx = CC[0] + q.x * 1.1 + 18 * LIB.noise1((tw - s * 0.08) * 0.8 + q.s, 3);
            const ty = CC[1] + q.y * 1.1 + 18 * LIB.noise1((tw - s * 0.08) * 0.8 + q.s, 7);
            ctx.beginPath(); ctx.arc(tx, ty, 1.3, 0, TAU); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        L.glowDot(ctx, x, y, 6 * k, { rays: 8, rayLen: 2.4, glow: 5, seed: sd('pg', i) });
      } else {
        ctx.globalAlpha = 0.75 * k;
        ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.4, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    L.guideCircle(ctx, CC[0], CC[1], 210, { alpha: 0.3 * p2, dash: [8, 8], width: 1.5 });
    L.ticks(ctx, CC[0], CC[1], { r: 220, n: 60, len: 8, major: 5, majorLen: 16, alpha: 0.45, p: p2 });
  }

  // sine wave: lineWhite, travelling; axis, faint harmonic; wavelength bracket and crest dot on the 2nd beat
  function wave(ctx, L, p, p2, tw, lt) {
    const x0 = CC[0] - 340, x1 = CC[0] + 340, A = 120, lam = 260;
    sec(ctx, [[x0 - 20, CC[1]], [x1 + 20, CC[1]]], { p, alpha: 0.5, seed: sd('axis') });
    const ph = tw * 2.2;
    const pts = [], pts2 = [];
    const xe = lerp(x0, x1, p);
    for (let x = x0; x <= xe; x += 4) {
      pts.push([x, CC[1] - A * Math.sin(((x - x0) / lam) * TAU - ph)]);
      pts2.push([x, CC[1] - A * 0.45 * Math.sin(((x - x0) / lam) * TAU * 2 - ph * 1.6)]);
    }
    if (p2 > 0) sec(ctx, pts2, { alpha: 0.35 * p2, seed: sd('h2'), color: P.paleBlue });
    if (pts.length > 1) {
      LIB.inkPath(ctx, pts, Object.assign(lineOpts({ w: 3, color: WHITE, alpha: 0.95, seed: sd('wave') }), { closed: false }));
      LIB.inkPath(ctx, offsetPts(pts, 7, false), Object.assign(lineOpts({ w: 1.2, color: LAV, alpha: 0.4, seed: sd('wave2') }), { closed: false }));
    }
    L.ticks(ctx, x0, CC[1] + A + 40, { length: x1 - x0, n: 34, len: 6, major: 5, majorLen: 14, alpha: 0.4, p, baseline: false });
    if (p2 > 0) {
      // crest-to-crest bracket: first crest after x0
      const xc = x0 + ((ph / TAU + 0.25) % 1) * lam;
      L.bracket(ctx, xc, CC[1] - A - 40, xc + lam, CC[1] - A - 40, { p: p2 });
      L.bracket(ctx, x1 + 40, CC[1] - A, x1 + 40, CC[1] + A, { p: p2 });
      const xd = x0 + ((lt / 1.5) * (x1 - x0));
      L.glowDot(ctx, xd, CC[1] - A * Math.sin(((xd - x0) / lam) * TAU - ph), 7 * p2, { rays: 12, rayLen: 2.3, glow: 5, seed: sd('crest') });
    }
  }
})();
