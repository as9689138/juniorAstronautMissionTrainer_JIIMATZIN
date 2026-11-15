// 06 ruta-a-la-luna — The route to the Moon, 1969. T 27 to 30 (3 s), schematic.
// Earth (520, 470) r 120 on the left, Moon (1450, 380) r 45 on the right; the free-return figure-eight
// traces on over 2 beats; the craft (glow dot) leaves the parking orbit at T 27.0 and slips behind the
// Moon at T 29.25 (lunar orbit insertion on the far side) with a magenta ring. Year 1969 at (960, 760).
// Layers: 1 blueprint, 2 guides (Moon's orbit arc, axis, brackets), 3 Earth, 4 Moon, 5 path, 6 craft,
//         7 year, 8 progress glyph (Act 1, copied verbatim from 03).
(function () {
  'use strict';
  const ID = 'ruta-a-la-luna';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // (copied verbatim from 03-orbitas-del-cosmos.js)
  // ==========================================================================
  // GLIFO CANÓNICO — progress glyph (art bible §5, storyboard G1).
  // This file owns the canonical drawing. Every other scene copies GLYPH, glyphPose() and
  // drawGlyph() VERBATIM (never re-derive the numbers).
  //   Large form G1 : centre (960, 450), s = 1.
  //   Small form    : centre (1720, 170), s = GLYPH.SMALL = 56 / 220 = 0.2545.
  //   act           : GLYPH.ACT[0..3] = 0.25 (Act 1), 0.5 (Act 2), 0.75 (Act 3), 1 (Act 4).
  //   Corner use    : drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[0] });
  //   u             : seconds of orbit turning (0 = the canonical pose of G1). Corner glyphs pass 0.
  //   build keys    : sun, earthOrbit, earth, moonOrbit, moon, marsOrbit, mars, arc, guide (0..1 each,
  //                   default 1; sun/earth/moon/mars are pop scales and may overshoot) — used by 01.
  // ==========================================================================
  const GLYPH = {
    X: 960, Y: 450, SX: 1720, SY: 170, SMALL: 56 / 220,
    SUN_R: 10,
    EARTH_ORBIT: 110, EARTH_R: 9, EARTH_A0: -30, EARTH_RATE: 6, // deg, deg/s
    MOON_ORBIT: 26, MOON_R: 3.5, MOON_A0: -120, MOON_RATE: 40,
    MARS_ORBIT: 220, MARS_R: 11, MARS_A0: 200, MARS_RATE: 3.2,
    ARC_A0: -90, // the act arc starts at 12 o'clock and runs clockwise on the Mars orbit
    DOUBLE: 9, // inner line of the double outline, px inside (scaled)
    GUIDE_R: 420,
    ACT: [0.25, 0.5, 0.75, 1],
    SEED: 'glyph',
  };
  function glyphPose(x, y, s, u) {
    const D = Math.PI / 180;
    const ea = (GLYPH.EARTH_A0 + GLYPH.EARTH_RATE * u) * D;
    const ma = (GLYPH.MARS_A0 + GLYPH.MARS_RATE * u) * D;
    const la = (GLYPH.MOON_A0 + GLYPH.MOON_RATE * u) * D;
    const ex = x + Math.cos(ea) * GLYPH.EARTH_ORBIT * s, ey = y + Math.sin(ea) * GLYPH.EARTH_ORBIT * s;
    return {
      ea, ma, la, ex, ey,
      mx: x + Math.cos(ma) * GLYPH.MARS_ORBIT * s, my: y + Math.sin(ma) * GLYPH.MARS_ORBIT * s,
      lx: ex + Math.cos(la) * GLYPH.MOON_ORBIT * s, ly: ey + Math.sin(la) * GLYPH.MOON_ORBIT * s,
    };
  }
  function drawGlyph(ctx, L, o) {
    const P = L.pal, TAU = Math.PI * 2, D = Math.PI / 180;
    const x = o.x != null ? o.x : GLYPH.X, y = o.y != null ? o.y : GLYPH.Y;
    const s = o.s != null ? o.s : 1, u = o.u || 0;
    const act = o.act != null ? o.act : 1;
    const bi = o.bi != null ? o.bi : L.boil(L.T);
    const A = o.alpha != null ? o.alpha : 1;
    const st = (key) => (o[key] != null ? o[key] : 1);
    const k = L.clamp((s - GLYPH.SMALL) / (1 - GLYPH.SMALL)); // 0 small form .. 1 large form
    const kb = L.smoothstep(0.45, 1, k); // furniture only the large form carries
    const lw = (a, b) => a + (b - a) * k;
    const pose = glyphPose(x, y, s, u);
    const seed = L.hash(GLYPH.SEED, 1) & 0x7fffffff;
    ctx.save();
    ctx.lineCap = 'round';
    const ring = (cx, cy, r, a0, p, color, alpha, width, dash) => {
      if (p <= 0 || alpha <= 0 || r <= 0) return;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + TAU * Math.min(1, p));
      ctx.strokeStyle = color;
      ctx.globalAlpha = A * alpha;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const disc = (cx, cy, r, color, alpha) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fillStyle = color;
      ctx.globalAlpha = A * alpha;
      ctx.fill();
    };
    const halo = (cx, cy, r, color, alpha) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, L.rgba(color, 0.5 * alpha));
      g.addColorStop(0.4, L.rgba(color, 0.14 * alpha));
      g.addColorStop(1, L.rgba(color, 0));
      ctx.globalAlpha = A;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    };
    const RM = GLYPH.MARS_ORBIT * s, RE = GLYPH.EARTH_ORBIT * s, RL = GLYPH.MOON_ORBIT * s;
    // 0. small-form plate: a dark disc and a bezel so the glyph reads over any schematic
    if (k < 1) {
      const pk = 1 - k;
      disc(x, y, RM + 14, P.navyDeep, 0.6 * pk);
      ring(x, y, RM + 12, -Math.PI / 2, 1, P.lavender, 0.3 * pk, 1);
      ctx.globalAlpha = A * pk;
      L.ticks(ctx, x, y, { r: RM + 12, n: 36, len: 3, major: 9, majorLen: 6, alpha: 0.4, width: 1, boil: bi });
    }
    // 1. large-form furniture: guide circle r 420, degree ring, axes, inward month ticks
    if (kb > 0) {
      ring(x, y, GLYPH.GUIDE_R * s, -Math.PI / 2, st('guide'), P.lavender, 0.15 * kb, 1.5);
      ring(x, y, (GLYPH.GUIDE_R - 9) * s, -Math.PI / 2, st('guide'), P.lavender, 0.07 * kb, 1, [2, 7]);
      ctx.globalAlpha = A * kb;
      L.ticks(ctx, x, y, { r: RM + 10 * s, n: 72, len: 6 * s, major: 6, majorLen: 13 * s, alpha: 0.35, width: 1, p: st('marsOrbit') });
      L.ticks(ctx, x, y, { r: RE - 14 * s, n: 12, len: 6 * s, inward: true, alpha: 0.4, width: 1, p: st('earthOrbit') });
      const ax = new Path2D();
      const ar = (GLYPH.GUIDE_R + 20) * s * st('guide');
      ax.moveTo(x - ar, y); ax.lineTo(x - 30 * s, y); ax.moveTo(x + 30 * s, y); ax.lineTo(x + ar, y);
      ax.moveTo(x, y - ar); ax.lineTo(x, y - 30 * s); ax.moveTo(x, y + 30 * s); ax.lineTo(x, y + ar);
      ctx.strokeStyle = P.lavender;
      ctx.globalAlpha = A * 0.1 * kb;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 9]);
      ctx.stroke(ax);
      ctx.setLineDash([]);
    }
    // 2. Mars orbit: schemMars dashed ring, then the act arc lit over it (soft glow + core)
    ring(x, y, RM, GLYPH.ARC_A0 * D, st('marsOrbit'), P.schemMars, 0.55, lw(1.1, 1.5), [lw(3, 10), lw(3, 8)]);
    ring(x, y, RM - GLYPH.DOUBLE * s, GLYPH.ARC_A0 * D, st('marsOrbit'), P.lavender, 0.3 * k, 1);
    const ap = act * st('arc');
    ring(x, y, RM, GLYPH.ARC_A0 * D, ap, P.schemMars, 0.16, lw(6, 11));
    ring(x, y, RM, GLYPH.ARC_A0 * D, ap, P.schemMars, 1, lw(2.6, 4));
    if (ap > 0 && ap < 1) {
      const ae = (GLYPH.ARC_A0 * D) + TAU * ap;
      disc(x + Math.cos(ae) * RM, y + Math.sin(ae) * RM, lw(2.4, 4), P.schemMars, 1);
    }
    // 3. Earth orbit: double lavender outline (inner line fades out in the small form)
    ring(x, y, RE, pose.ea, st('earthOrbit'), P.lavender, 0.85, lw(1.4, 2.5));
    ring(x, y, RE - GLYPH.DOUBLE * s, pose.ea, st('earthOrbit'), P.lavender, 0.5 * k, 1.5);
    // 4. Moon orbit around the Earth
    ring(pose.ex, pose.ey, RL, pose.la, st('moonOrbit'), P.lavender, 0.6, lw(1, 1.5));
    // 5. Sun: glow dot with 12 rays, 12 ticks in the large form
    const sunK = st('sun');
    if (sunK > 0) {
      ctx.globalAlpha = A;
      L.glowDot(ctx, x, y, Math.max(2.6, GLYPH.SUN_R * s) * sunK, {
        rays: 12, rayLen: lw(2.4, 3.4), glow: lw(3.5, 4.5), boil: bi, seed, twinkle: 0.12,
      });
      if (kb > 0) {
        ctx.globalAlpha = A * kb * Math.min(1, sunK);
        L.ticks(ctx, x, y, { r: 30 * s * Math.min(1.1, sunK), n: 12, len: 14 * s, alpha: 0.6, boil: bi });
      }
    }
    // 6. dots: Earth (schemOxygen), Moon (lineWhite), Mars (schemMars)
    const er = Math.max(2.4, GLYPH.EARTH_R * s) * st('earth');
    if (er > 0) {
      halo(pose.ex, pose.ey, er * 3.2, P.schemOxygen, 1);
      disc(pose.ex, pose.ey, er, P.schemOxygen, 1);
      ring(pose.ex, pose.ey, er + 3 * s, 0, 1, P.lineWhite, 0.55 * k, 1);
    }
    const lr = Math.max(1.3, GLYPH.MOON_R * s) * st('moon');
    if (lr > 0) disc(pose.lx, pose.ly, lr, P.lineWhite, 0.95);
    const mr = Math.max(2.8, GLYPH.MARS_R * s) * st('mars');
    if (mr > 0) {
      halo(pose.mx, pose.my, mr * 3.2, P.schemMars, 1);
      disc(pose.mx, pose.my, mr, P.schemMars, 1);
      ring(pose.mx, pose.my, mr + 3 * s, 0, 1, P.lineWhite, 0.55 * k, 1);
    }
    ctx.restore();
  }
  // ===================== end GLIFO CANÓNICO =================================

  const B_TLI = 0.375; //   T 27.375 burn marker
  const B_YEAR = 0.75; //   T 27.75 year 1969
  const B_PATH = 1.5; //    T 28.5 path complete, crossing marked
  const B_MID = 1.875; //   T 28.875 distance bracket
  const B_LOI = 2.25; //    T 29.25 arrival, magenta ring
  const DUR = 3;
  const EX = 520, EY = 470, ER = 120;
  const MX = 1450, MY = 380, MR = 45;
  // figure-eight, closed; index 0 = Earth's left side (parking orbit exit)
  const PATH = [
    [345, 470], [400, 600], [520, 650], [660, 610], [850, 500], [1075, 400], [1300, 300], [1450, 282],
    [1548, 380], [1450, 478], [1300, 460], [1075, 400], [850, 340], [660, 330], [520, 290], [400, 340],
  ];
  const ARRIVE_IDX = 8; // far side of the Moon

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const pts = L.smoothPts(PATH, true, 4);
    const S = [0];
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length];
      S.push(S[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    // arrival arclength: nearest resampled point to PATH[ARRIVE_IDX]
    let best = 0, bd = 1e9;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - PATH[ARRIVE_IDX][0], pts[i][1] - PATH[ARRIVE_IDX][1]);
      if (d < bd) { bd = d; best = i; }
    }
    const r = L.rng(sd('craters'));
    const craters = [];
    for (let i = 0; i < 7; i++) craters.push([r.range(-0.6, 0.6), r.range(-0.6, 0.6), r.range(0.08, 0.2)]);
    GEO = { pts, S, total: S[pts.length], arrive: S[best], craters };
    return GEO;
  }
  function at(G, s) {
    s = ((s % G.total) + G.total) % G.total;
    let lo = 0, hi = G.pts.length;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (G.S[m] <= s) lo = m; else hi = m; }
    const a = G.pts[lo], b = G.pts[(lo + 1) % G.pts.length];
    const f = (s - G.S[lo]) / Math.max(1e-6, G.S[lo + 1] - G.S[lo]);
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  // continents on the Earth disc (unit, Americas facing)
  const AMER = [
    [-0.6, -0.6], [-0.3, -0.78], [0.05, -0.78], [0.28, -0.56], [0.24, -0.3], [0.06, -0.12], [0.04, 0.08],
    [0.2, 0.2], [0.45, 0.26], [0.58, 0.45], [0.4, 0.7], [0.26, 0.9], [0.18, 0.6], [0.08, 0.32], [-0.12, 0.08],
    [-0.3, -0.14], [-0.52, -0.36],
  ];

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur || DUR);
      const G = geo(L);
      const bi = L.boil(info.T);
      const tw = L.onTwos(t);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((v) => v))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);
      ctx.save();
      ctx.lineCap = 'round';
      const ring = (cx, cy, r, color, alpha, width, dash, a0 = -Math.PI / 2, p = 1) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + TAU * p);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // 1. blueprint
      L.blueprint(ctx, { center: [985, 430], seed: 61 });

      // 2. guides
      ring(EX, EY, Math.hypot(MX - EX, MY - EY), P.lavender, 0.14, 1.5, [10, 8], -20 * DEG, 0.07); // Moon's orbit
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = P.lavender;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(EX - 260, EY + (EY - MY) * 260 / (MX - EX));
      ctx.lineTo(MX + 260, MY - (EY - MY) * 260 / (MX - EX));
      ctx.stroke();
      ctx.setLineDash([]);
      ring(EX, EY, 175, P.lavender, 0.12, 1, [2, 7]);
      ring(MX, MY, 95, P.lavender, 0.12, 1, [2, 7]);
      ctx.globalAlpha = 1;
      L.bracket(ctx, EX, EY + 230, MX, MY + 230, { alpha: 0.55, p: hit(B_MID, 9, E.outExpo) });
      L.bracket(ctx, EX - ER, EY - ER - 40, EX + ER, EY - ER - 40, { alpha: 0.4, style: 'square' });

      // 3. Earth
      ring(EX, EY, ER + 30, P.lavender, 0.3, 1, [3, 6]); // parking orbit
      ctx.beginPath();
      ctx.arc(EX, EY, ER, 0, TAU);
      ctx.fillStyle = P.navyDeep;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      const edisc = L.ellipsePts(EX, EY, ER - 3, ER - 3, 64);
      ctx.globalAlpha = 1;
      L.hexLattice(ctx, edisc, { r: 11, alpha: 0.08, seed: sd('hexall'), boil: bi });
      const amer = L.smoothPts(AMER.map((q) => [EX + q[0] * ER, EY + q[1] * ER]), true, 5);
      L.hexLattice(ctx, amer, { r: 7, alpha: 0.4, seed: sd('hexam'), boil: bi });
      ctx.beginPath();
      L.tracePath(ctx, amer, true);
      ctx.strokeStyle = P.lavender;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.arc(EX, EY, ER, 0, TAU);
      ctx.clip();
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = -60; a <= 60; a += 30) {
        const rx = Math.abs(Math.sin(a * DEG)) * ER;
        ctx.moveTo(EX + rx, EY);
        ctx.ellipse(EX, EY, Math.max(0.5, rx), ER, 0, 0, TAU);
        const yy = EY + Math.sin(a * DEG) * ER, hw = Math.cos(a * DEG) * ER;
        ctx.moveTo(EX - hw, yy);
        ctx.lineTo(EX + hw, yy);
      }
      ctx.stroke();
      ctx.restore();
      ring(EX, EY, ER, P.lavender, 0.85, 2.5);
      ring(EX, EY, ER - 9, P.lavender, 0.5, 1.5);
      ring(EX, EY, ER + 4, P.schemOxygen, 0.55, 1.5);
      ctx.globalAlpha = 1;
      L.ticks(ctx, EX, EY, { r: ER + 12, n: 48, len: 7, major: 4, majorLen: 14, alpha: 0.4, width: 1 });

      // 4. Moon
      ctx.beginPath();
      ctx.arc(MX, MY, MR, 0, TAU);
      ctx.fillStyle = P.navyDeep;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      for (const c of G.craters) ring(MX + c[0] * MR, MY + c[1] * MR, c[2] * MR, P.lavender, 0.45, 1);
      ring(MX, MY, MR, P.lavender, 0.85, 2.5);
      ring(MX, MY, MR - 9, P.lavender, 0.5, 1.5);
      ctx.globalAlpha = 1;
      L.ticks(ctx, MX, MY, { r: MR + 10, n: 24, len: 6, major: 6, majorLen: 12, alpha: 0.4, width: 1 });

      // 5. path: dashed lavender, traced over 2 beats from the craft's start
      const pp = E.inOutSine(clamp(t / B_PATH));
      if (pp > 0) {
        const n = Math.max(2, Math.floor(G.pts.length * pp));
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const q = G.pts[i];
          if (i === 0) ctx.moveTo(q[0], q[1]);
          else ctx.lineTo(q[0], q[1]);
        }
        if (pp >= 1) ctx.closePath();
        ctx.strokeStyle = P.lavender;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -tw * 24; // dashes creep on twos along the route
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        // trace head
        const h = G.pts[n - 1];
        if (pp < 1) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = P.lineWhite;
          ctx.beginPath();
          ctx.arc(h[0], h[1], 3, 0, TAU);
          ctx.fill();
        }
      }
      // crossing mark
      if (t >= B_PATH) {
        const k = popTwos(B_PATH);
        ctx.globalAlpha = 1;
        L.ticks(ctx, 1075, 400, { r: 12 * k, n: 8, len: 8, alpha: 0.6 });
        ring(1075, 400, 8 * k, P.lavender, 0.7, 1.5);
      }
      // TLI burn marker
      if (t >= B_TLI) {
        const k = popTwos(B_TLI);
        const q = PATH[1];
        ring(q[0], q[1], 10 * k, P.schemOxygen, 0.9, 2);
        ctx.globalAlpha = 1;
        L.ticks(ctx, q[0], q[1], { r: 14 * k, n: 12, len: 6, alpha: 0.5, color: P.schemOxygen });
      }

      // 6. craft (on twos), leaving a schemOxygen wake
      const cp = E.inOutSine(clamp(tw / B_LOI));
      const sNow = cp * G.arrive;
      if (cp > 0) {
        ctx.beginPath();
        const steps = Math.max(2, Math.floor(sNow / 6));
        for (let i = 0; i <= steps; i++) {
          const q = at(G, (i / steps) * sNow);
          if (i === 0) ctx.moveTo(q[0], q[1]);
          else ctx.lineTo(q[0], q[1]);
        }
        ctx.strokeStyle = P.schemOxygen;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      const c = at(G, sNow);
      ctx.globalAlpha = 1;
      L.glowDot(ctx, c[0], c[1], 7, { rays: 10, rot: c[2], seed: sd('craft'), boil: bi });
      // arrival: magenta ring, 12 frames
      if (t >= B_LOI) {
        const f = hit(B_LOI, 12);
        ring(c[0], c[1], 12 + 60 * E.outExpo(f), P.magenta, 1 - f, 3);
        ring(MX, MY, MR + 22, P.magenta, 0.6 * (1 - f), 1.5);
      }

      // 7. year
      const yp = hit(B_YEAR, 9, E.outExpo);
      if (yp > 0) {
        ctx.globalAlpha = 1;
        L.text(ctx, '1969', 960, 760 + 8 * (1 - yp), { size: 30, color: P.lavender, alpha: 0.85 * yp, align: 'center', baseline: 'middle', tracking: 4 });
        L.ticks(ctx, 900, 790, { kind: 'linear', length: 120, n: 12, len: 6, major: 6, majorLen: 12, alpha: 0.4 * yp, p: yp });
      }

      // 8. progress glyph (Act 1)
      ctx.globalAlpha = 1;
      drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[0], u: 0, bi });
      ctx.restore();
    },
  });
})();
