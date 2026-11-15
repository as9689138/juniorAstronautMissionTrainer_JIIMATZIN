// 14 que-mueve-al-planeta : What moves the planet. T 64.5 to 70.5 (6 s), schematic, cut.
// The Earth at four positions on an orbit ellipse (centre (960, 450), rx 560, ry 220) around a glowDot sun,
// each axis tilted 23.4 degrees (fixed in space), with spinning rotation arrows; seasons' gears faint behind.
// Layers: 1 blueprint; 2 gears; 3 orbit trace + chevrons; 4 far Earth, sun, other Earths (lattice, night
// hatching, axis, tilt arc, equator/tropics, rotation arrow); magenta ring when the year closes; 5 progress glyph.
(function () {
  'use strict';
  const ID = 'que-mueve-al-planeta';
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
  // Beats (shot-local; global T in comments)
  const B_EARTH = [0.75, 1.5, 2.25, 3.0]; // T 65.25, 66.0, 66.75, 67.5: Earths land right, far, left, near
  const B_NIGHT = 3.75; // T 68.25 night sides hatch in
  const B_EQ = 4.5; //     T 69.0  equators and tropics
  const B_RAYS = 5.25; //  T 69.75 sun-to-Earth guides and season ticks
  const O = [960, 450], RX = 560, RY = 220;
  const TILT = 23.4 * DEG; // axis top leans right, fixed in space
  const ANG = [0, -90, 180, 90].map((a) => a * DEG); // right, far, left, near
  const posOf = (a) => [O[0] + Math.cos(a) * RX, O[1] + Math.sin(a) * RY];
  const radOf = (a) => 80 + 14 * Math.sin(a);

  function gearPts(cx, cy, r, teeth, rot) {
    const out = [];
    const n = teeth * 4;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const rr = i % 4 < 2 ? r + 14 : r;
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return out;
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
      L.blueprint(ctx, { w: 1920, h: 1080, center: [960, 450], seed: 14 });

      // 2. gears of the seasons, faint, turning slowly (on twos)
      const gears = [[960, 450, 300, 30, 0.08], [470, 640, 130, 14, -0.18], [1460, 270, 150, 16, -0.16]];
      for (let i = 0; i < gears.length; i++) {
        const [gx, gy, gr, gt, sp] = gears[i];
        const pts = gearPts(gx, gy, gr, gt, tw * sp);
        ctx.save();
        ctx.strokeStyle = LAV;
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, gr * 0.62, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, gr * 0.16, 0, TAU);
        for (let s = 0; s < 6; s++) {
          const a = tw * sp + (s / 6) * TAU;
          ctx.moveTo(gx + Math.cos(a) * gr * 0.16, gy + Math.sin(a) * gr * 0.16);
          ctx.lineTo(gx + Math.cos(a) * gr * 0.62, gy + Math.sin(a) * gr * 0.62);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. orbit traces from the first Earth round to the last (24 fps), then stays
      const po = E.inOutSine(clamp(t / 3.0));
      const orb = [];
      for (let i = 0; i <= 160; i++) orb.push(posOf(-(i / 160) * TAU * po));
      if (po > 0) {
        dbl(ctx, orb, { closed: false, seed: sd('orbit'), gap: 6, alpha: 0.8, p: 1 });
        // chevrons along the orbit (direction of travel)
        ctx.save();
        ctx.strokeStyle = LAV;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = -((k + 0.5) / 8) * TAU;
          if (-a / TAU > po) continue;
          const q = posOf(a), q2 = posOf(a - 0.02);
          let dx = q2[0] - q[0], dy = q2[1] - q[1];
          const l = Math.hypot(dx, dy); dx /= l; dy /= l;
          ctx.moveTo(q[0] - dx * 9 - dy * 7, q[1] - dy * 9 + dx * 7);
          ctx.lineTo(q[0], q[1]);
          ctx.lineTo(q[0] - dx * 9 + dy * 7, q[1] - dy * 9 - dx * 7);
        }
        ctx.stroke();
        ctx.restore();
      }
      // season ticks on the orbit + sun guides (beat 5.25)
      const pr = hit(B_RAYS, 9, E.outExpo);

      // 4. Earths behind the sun (far), sun, Earths in front
      const order = [1, 0, 2, 3];
      for (const i of order) {
        if (i === 0) drawSun(ctx, L, t, tw, hit);
        drawEarth(ctx, L, i, hit, popTwos, tw, pr);
      }

      // magenta: the year closes when the fourth Earth lands (12 frames)
      const mu = hit(B_EARTH[3], 12, E.outExpo);
      if (mu > 0 && mu < 1) {
        ctx.save();
        ctx.strokeStyle = MAG;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - mu;
        ctx.beginPath();
        ctx.ellipse(O[0], O[1], RX + 40 * mu, RY + 16 * mu, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 5. progress glyph
      progressGlyph(ctx, 2);
    },
  });

  function drawSun(ctx, L, t, tw, hit) {
    L.guideCircle(ctx, O[0], O[1], 70, { alpha: 0.2, cross: 100 });
    L.ticks(ctx, O[0], O[1], { r: 80, n: 48, len: 6, major: 4, majorLen: 12, alpha: 0.45, rot: tw * 0.2 });
    L.glowDot(ctx, O[0], O[1], 16, { rays: 16, rayLen: 2.6, glow: 6, seed: sd('sun'), rot: tw * 0.15 });
  }

  function drawEarth(ctx, L, i, hit, popTwos, tw, pr) {
    const pop = popTwos(B_EARTH[i]);
    if (pop <= 0) return;
    const a = ANG[i];
    const [x, y] = posOf(a);
    const r = radOf(a) * pop;
    const pIn = hit(B_EARTH[i] + 0.375, 9, E.outExpo);
    const circ = L.ellipsePts(x, y, r, r, 64);
    // sun guide (dashed) and season tick on the orbit
    if (pr > 0) {
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha = 0.3 * pr;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(O[0], O[1]);
      ctx.lineTo(lerp(O[0], x, pr), lerp(O[1], y, pr));
      ctx.stroke();
      ctx.restore();
    }
    dbl(ctx, circ, { seed: sd('earth', i), gap: 7, color: OXY, fill: NAVY, fillAlpha: 1 });
    // land cells: hex lattice, brighter cells where the noise says land
    if (pIn > 0) {
      ctx.save();
      ctx.globalAlpha = pIn;
      const rot = tw * 0.6;
      L.hexLattice(ctx, offsetPts(circ, 8), {
        r: 9, alpha: 0.22, color: OXY, seed: sd('hex', i),
        cellFn: (cx, cy) => (LIB.noise2((cx - x) / 40 + rot, (cy - y) / 40, 5 + i) > 0.15 ? { fill: OXY, alpha: 0.18 } : true),
      });
      ctx.restore();
    }
    // night side hatching (side away from the sun)
    const ph = hit(B_NIGHT, 9, E.outExpo);
    if (ph > 0) {
      const sa = Math.atan2(O[1] - y, O[0] - x); // direction to the sun
      const half = [];
      for (let k = 0; k <= 32; k++) {
        const b = sa + Math.PI / 2 + (k / 32) * Math.PI;
        half.push([x + Math.cos(b) * (r - 4), y + Math.sin(b) * (r - 4)]);
      }
      ctx.save();
      ctx.globalAlpha = ph;
      L.hatch(ctx, half, { spacing: 6, width: 1.1, color: LAV, alpha: 0.55, seed: sd('night', i), length: [12, 40] });
      ctx.restore();
      sec(ctx, [half[0], half[32]], { alpha: 0.5 * ph, seed: sd('term', i), color: LAV });
    }
    // axis tilted 23.4 degrees (draws on an 8th after the Earth lands)
    const ax = Math.sin(TILT), ay = -Math.cos(TILT);
    const L2 = (r + 34) * pIn;
    if (pIn > 0) {
      LIB.inkPath(ctx, [[x - ax * L2, y - ay * L2], [x + ax * L2, y + ay * L2]], Object.assign(lineOpts({ w: 2, color: WHITE, alpha: 0.9, seed: sd('axis', i) }), { closed: false, smooth: false }));
      // vertical reference and the tilt arc
      ctx.save();
      ctx.strokeStyle = LAV;
      ctx.globalAlpha = 0.45 * pIn;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(x, y - r - 30); ctx.lineTo(x, y - r + 6); ctx.stroke();
      ctx.restore();
      L.arcAnnotation(ctx, x, y, r + 22, -Math.PI / 2, -Math.PI / 2 + TILT, { color: LAV, width: 1.5, alpha: 0.7, p: pIn, endTicks: 6 });
    }
    // equator and tropics (beat 4.5)
    const pe = hit(B_EQ, 9, E.outExpo);
    if (pe > 0) {
      for (const [lat, al] of [[0, 0.75], [0.4, 0.35], [-0.4, 0.35]]) {
        const cxl = x + ax * r * lat * -1, cyl = y + ay * r * lat * -1;
        const rr = r * Math.sqrt(1 - lat * lat);
        const pts = L.ellipsePts(cxl, cyl, rr, rr * 0.22, 48, TILT);
        sec(ctx, pts, { closed: true, p: pe, alpha: al, color: OXY, seed: sd('eq', i, lat) });
      }
    }
    // rotation arrow around the north pole: an ellipse arc with a spinning arrowhead
    if (pIn > 0) {
      const nx = x + ax * (r + 14), ny = y + ay * (r + 14);
      const er = r * 0.42, eh = er * 0.28;
      const spin = tw * 3 + i;
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(TILT);
      ctx.strokeStyle = WHITE;
      ctx.fillStyle = WHITE;
      ctx.globalAlpha = 0.85 * pIn;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, er, eh, 0, spin, spin + 4.6);
      ctx.stroke();
      const e2 = spin + 4.6;
      const hx = Math.cos(e2) * er, hy = Math.sin(e2) * eh;
      const tx = -Math.sin(e2) * er, ty = Math.cos(e2) * eh;
      const tl = Math.hypot(tx, ty) || 1;
      const ux = tx / tl, uy = ty / tl;
      ctx.beginPath();
      ctx.moveTo(hx + ux * 7, hy + uy * 7);
      ctx.lineTo(hx - ux * 3 - uy * 5, hy - uy * 3 + ux * 5);
      ctx.lineTo(hx - ux * 3 + uy * 5, hy - uy * 3 - ux * 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // landing flash: lavender ring
    const lu = hit(B_EARTH[i], 9, E.outExpo);
    if (lu < 1) {
      ctx.save();
      ctx.strokeStyle = WHITE;
      ctx.globalAlpha = 0.6 * (1 - lu);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 10 + 40 * lu, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
})();
