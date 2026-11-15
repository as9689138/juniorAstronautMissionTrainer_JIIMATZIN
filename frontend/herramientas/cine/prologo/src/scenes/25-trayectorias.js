/*
 * 25 trayectorias : Every attempt has a result (schematic)
 * Global T 129.0 to 135.0 (local 0 to 6). Cut in. Camera locked.
 *
 * Layers, back to front:
 *   1. Blueprint plate; faint orbit guides of Earth and Mars around an off-frame sun
 *   2. Earth (left, lavender double outline, hex lattice) and Mars (right, schemMars, hex lattice)
 *   3. Failed attempts: dashed lavender arcs that miss (short, high, low), each ending in a result mark
 *   4. Results ruler: one tick per attempt (every attempt is data)
 *   5. The last attempt: solid arc, glowDot craft, lands on Mars with a magenta ring
 *   6. Progress glyph, small G1, Act 3 = three quarters (screen-fixed)
 *
 * Beats (local): arcs trace on 0.75, 1.5, 2.25 (misses) and 3.0 (the good one; T 129.75 .. 132.0);
 * 3.75 mid-course correction tick; 4.5 lands (T 133.5) magenta ring; 5.25 Mars answers with a pulse.
 */
(function () {
  'use strict';
  const ID = 'trayectorias';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
  const h3 = (a, b, c) => (LIB.hash(a, b, c) % 100000) / 100000;

  const GLOW = P.glow, PALE = P.paleBlue;
  const LAV = P.lavender, WHITE = P.lineWhite, MAG = P.magenta, MARS = P.schemMars, OXY = P.schemOxygen;

  const EARTH = [380, 470], ER = 105;
  const MARSC = [1460, 420], MR = 78;
  const SUN = [-760, 520];
  const B_ARC = [0.75, 1.5, 2.25, 3.0];
  const B_MID = 3.75, B_LAND = 4.5, B_ECHO = 5.25;
  const RULER = { x: 760, y: 770, len: 400 };

  // trajectories: cubic beziers from the Earth's limb; the first three miss
  const TRAJ = [
    { p: [[470, 420], [700, 160], [940, 180], [1080, 380]] },            // falls short
    { p: [[468, 400], [760, 40], [1260, 40], [1580, 135]] },             // overshoots above Mars
    { p: [[478, 450], [800, 300], [1200, 700], [1560, 640]] },           // passes below Mars
    { p: [[466, 410], [760, 120], [1180, 150], [MARSC[0] - MR * 0.62, MARSC[1] - MR * 0.78]] }, // lands
  ];
  const bez = (q, u) => {
    const a = 1 - u;
    return [
      a * a * a * q[0][0] + 3 * a * a * u * q[1][0] + 3 * a * u * u * q[2][0] + u * u * u * q[3][0],
      a * a * a * q[0][1] + 3 * a * a * u * q[1][1] + 3 * a * u * u * q[2][1] + u * u * u * q[3][1],
    ];
  };
  const DUR = [0.6, 0.6, 0.6, 1.5];

  function strokePts(ctx, pts, w, a, col, dash) {
    if (pts.length < 2 || a <= 0) return;
    ctx.save();
    ctx.beginPath();
    LIB.tracePath(ctx, pts, false);
    ctx.strokeStyle = col;
    ctx.globalAlpha *= a;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }
  function circle(ctx, x, y, r, w, a, col, dash) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.strokeStyle = col;
    ctx.globalAlpha *= a;
    ctx.lineWidth = w;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }

  // Progress glyph, small form of G1 (storyboard Shared geometry): centre (1720, 170), scale 56/220.
  // Sun glowDot r 10, Earth orbit r 110 with Earth dot (schemOxygen, r 9) at -30 deg, Moon orbit r 26 around
  // the Earth dot, Mars orbit r 220 with Mars dot (schemMars, r 11) at 200 deg; act arc in schemMars on the
  // Mars orbit from 12 o'clock clockwise (Act 3 = three quarters). Dots keep a 3 px floor so they read.
  function progressGlyph(ctx, L, act, bi) {
    const cx = 1720, cy = 170, s = 56 / 220;
    const rE = 110 * s, rM = 220 * s, rMo = 26 * s;
    const aE = -30 * DEG, aM = 200 * DEG;
    const ex = cx + Math.cos(aE) * rE, ey = cy + Math.sin(aE) * rE;
    const mx = cx + Math.cos(aM) * rM, my = cy + Math.sin(aM) * rM;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = LAV;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, rE, 0, TAU);
    ctx.moveTo(cx + rM, cy);
    ctx.arc(cx, cy, rM, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ex, ey, rMo, 0, TAU);
    ctx.stroke();
    // act arc
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = MARS;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, rM, -Math.PI / 2, -Math.PI / 2 + TAU * (act / 4));
    ctx.stroke();
    ctx.restore();
    L.ticks(ctx, cx, cy, { r: rM + 5, n: 24, len: 3, alpha: 0.3, width: 1 });
    ctx.save();
    ctx.fillStyle = OXY;
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(3, 9 * s), 0, TAU);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(ex + rMo, ey, 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = MARS;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(3, 11 * s), 0, TAU);
    ctx.fill();
    ctx.restore();
    L.glowDot(ctx, cx, cy, Math.max(3, 10 * s), { rays: 8, glow: 4, seed: sd('glyph'), boil: bi });
  }


  function planet(ctx, L, c, r, col, seed, bi) {
    ctx.save();
    ctx.fillStyle = P.navyDeep;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(c[0], c[1], r, 0, TAU);
    ctx.fill();
    ctx.restore();
    L.hexLattice(ctx, (g) => g.arc(c[0], c[1], r - 4, 0, TAU), { r: 13, alpha: 0.3, color: col, seed, bounds: { x: c[0] - r, y: c[1] - r, w: 2 * r, h: 2 * r } });
    // latitude ellipses
    for (const k of [-0.5, 0, 0.5]) {
      const yy = c[1] + k * r;
      const hw = r * Math.sqrt(1 - k * k);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(c[0], yy, hw, hw * 0.16, 0, 0, TAU);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    const j = (h3(bi, seed, 1) - 0.5) * 0.6;
    circle(ctx, c[0], c[1], r + j, 2.5, 0.85, col);
    circle(ctx, c[0], c[1], r - 9, 1.5, 0.5, col);
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.shot.start + t);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // 1. Plate and orbit guides
      L.blueprint(ctx, { center: [960, 460] });
      const rE = Math.hypot(EARTH[0] - SUN[0], EARTH[1] - SUN[1]);
      const rM = Math.hypot(MARSC[0] - SUN[0], MARSC[1] - SUN[1]);
      L.guideCircle(ctx, SUN[0], SUN[1], rE, { alpha: 0.18, dash: [4, 8] });
      L.guideCircle(ctx, SUN[0], SUN[1], rM, { alpha: 0.18, dash: [4, 8] });
      L.ticks(ctx, SUN[0], SUN[1], { r: rM - 8, n: 360, len: 6, major: 5, majorLen: 14, alpha: 0.25, start: -0.22, span: 0.44 });
      L.guideCircle(ctx, EARTH[0], EARTH[1], ER + 40, { alpha: 0.14, quadrants: 8 });
      L.guideCircle(ctx, MARSC[0], MARSC[1], MR + 40, { alpha: 0.14, quadrants: 8 });
      L.bracket(ctx, EARTH[0], EARTH[1] + ER + 60, MARSC[0], EARTH[1] + ER + 60, { alpha: 0.4 });

      // 2. Planets
      planet(ctx, L, EARTH, ER, LAV, sd('earth'), bi);
      planet(ctx, L, MARSC, MR, MARS, sd('mars'), bi);
      // Mars polar cap
      strokePts(ctx, [[MARSC[0] - 24, MARSC[1] - MR + 12], [MARSC[0], MARSC[1] - MR + 18], [MARSC[0] + 24, MARSC[1] - MR + 12]], 1.5, 0.8, MARS);
      // launch site glow on Earth (craft waiting)
      L.glowDot(ctx, TRAJ[0].p[0][0], TRAJ[0].p[0][1] + 10, 6, { rays: 8, seed: sd('site'), boil: bi, intensity: 0.7 });

      // 3. Attempts
      const ends = [];
      for (let i = 0; i < 4; i++) {
        const a0 = B_ARC[i];
        if (t < a0) continue;
        const prog = E.outCubic(clamp((t - a0) / DUR[i] + 1 / (DUR[i] * 24)));
        const n = 80;
        const pts = [];
        for (let k = 0; k <= Math.round(n * prog); k++) pts.push(bez(TRAJ[i].p, k / n));
        if (prog < 1 && pts.length) pts.push(bez(TRAJ[i].p, prog));
        const good = i === 3;
        const older = !good && t >= B_ARC[i + 1];
        if (good) strokePts(ctx, pts, 2.5, 0.95, WHITE);
        else strokePts(ctx, pts, 2.5, older ? 0.4 : 0.85, LAV, [14, 10]);
        const tip = pts[pts.length - 1];
        if (prog < 1 && tip) L.glowDot(ctx, tip[0], tip[1], 7, { rays: 8, seed: sd('craft', i), boil: bi });
        if (prog >= 1) ends.push(i);
        // result mark at the end of a miss: small ring + cross tick
        if (!good && prog >= 1) {
          const e = bez(TRAJ[i].p, 1);
          const sc = popTwos(a0 + DUR[i]);
          circle(ctx, e[0], e[1], 10 * sc, 1.5, 0.8, LAV);
          strokePts(ctx, [[e[0] - 7 * sc, e[1] - 7 * sc], [e[0] + 7 * sc, e[1] + 7 * sc]], 1.5, 0.8, LAV);
          strokePts(ctx, [[e[0] + 7 * sc, e[1] - 7 * sc], [e[0] - 7 * sc, e[1] + 7 * sc]], 1.5, 0.8, LAV);
          // magenta flash when the miss registers (12 frames)
          const rk = (t - (a0 + DUR[i])) / (12 * FR);
          if (rk < 1) circle(ctx, e[0], e[1], 12 + 26 * E.outExpo(rk), 3, 1 - rk, MAG);
        }
      }

      // 4. Results ruler: one tick per attempt
      L.ticks(ctx, RULER.x, RULER.y, { length: RULER.len, n: 8, len: 8, alpha: 0.4, baseline: true });
      for (let i = 0; i < 4; i++) {
        const tr = B_ARC[i] + DUR[i];
        if (t < tr) continue;
        const x = RULER.x + (i + 1) * (RULER.len / 5);
        const sc = popTwos(tr);
        strokePts(ctx, [[x, RULER.y], [x, RULER.y - 28 * sc]], i === 3 ? 3 : 2, 0.9, i === 3 ? MARS : WHITE);
        ctx.save();
        ctx.fillStyle = i === 3 ? MARS : WHITE;
        ctx.beginPath();
        ctx.arc(x, RULER.y - 28 * sc, 3.5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 5. Mid-course correction tick on the good arc, landing ring, Mars echo
      if (t >= B_MID) {
        const m = bez(TRAJ[3].p, 0.55);
        const sc = popTwos(B_MID);
        strokePts(ctx, [[m[0], m[1] - 20 * sc], [m[0], m[1] + 20 * sc]], 2, 0.85, WHITE);
        circle(ctx, m[0], m[1], 14 * sc, 1.5, 0.6, LAV);
      }
      if (t >= B_LAND) {
        const e = bez(TRAJ[3].p, 1);
        const rk = (t - B_LAND) / (12 * FR);
        if (rk < 1) circle(ctx, e[0], e[1], 14 + 70 * E.outExpo(rk + 1 / 12), 3, 1 - rk, MAG);
        L.glowDot(ctx, e[0], e[1], 8, { rays: 12, rot: tw, seed: sd('land'), boil: bi, color: MARS });
      }
      if (t >= B_ECHO) {
        const k = clamp((t - B_ECHO) / (18 * FR));
        circle(ctx, MARSC[0], MARSC[1], MR + 14 + 60 * E.outCubic(k), 2, 0.8 * (1 - k), MARS);
        circle(ctx, MARSC[0], MARSC[1], MR + 14, 2, 0.7, MARS);
      }

      // 6. Progress glyph
      progressGlyph(ctx, L, 3, bi);
    },
  });
})();
