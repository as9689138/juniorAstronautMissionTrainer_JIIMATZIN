// 03 dias-378 — 378 days, then the route to Mars. T 15 to 22.5, schematic.
// Tally ring (960, 430) r 260: 378 day ticks fill clockwise T 15..19.5 while "378" counts up; T 19.5 the ring
// collapses into Earth's dot (420, 520) and a Hohmann half-ellipse traces to Mars (1500, 380) with a glow-dot craft.
// Progress glyph: GLYPH / glyphPose / drawGlyph copied verbatim from 01-ano-2030.js (canonical), small form, full.
(function () {
  'use strict';
  const ID = 'dias-378';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ==========================================================================
  // GLIFO CANÓNICO — progress glyph (art bible §5, storyboard G1).
  // Copied verbatim from 01-ano-2030.js (owner of the canonical drawing in the intro). Copies GLYPH, glyphPose() and
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

  // ---------------------------------------------------------------------------
  // Local timing (shot starts at global T 15). Beat 0.75 s.
  const DUR = 7.5;
  const T_FILL = 4.5;        // ticks fill 0 .. 4.5 (T 15 .. 19.5)
  const T_COLL = 5.25;       // ring collapses into Earth 4.5 .. 5.25
  const T_ARR = 7.125;       // craft arrives at Mars (8th grid), chime on the cut T 22.5
  const RX = 960, RY = 430, RR = 260, N = 378;
  const EX = 420, EY = 520, MX = 1500, MY = 380;
  const TAU = Math.PI * 2;

  // Hohmann half-ellipse from Earth (theta = PI) to Mars (theta = 0), bulging upward
  const HC = [(EX + MX) / 2, (EY + MY) / 2];
  const HA = Math.hypot(MX - EX, MY - EY) / 2, HB = 250;
  const UX = (MX - EX) / (2 * HA), UY = (MY - EY) / (2 * HA);
  const VX = UY, VY = -UX; // perpendicular, pointing up
  const hoh = (k) => {
    const th = Math.PI * (1 - k);
    const c = Math.cos(th) * HA, s = Math.sin(th) * HB;
    return [HC[0] + c * UX + s * VX, HC[1] + c * UY + s * VY];
  };

  function dot(ctx, x, y, r, color, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function ring(ctx, x, y, r, color, a, w, dash) {
    if (r <= 0 || a <= 0) return;
    ctx.globalAlpha = a;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  FILM.scene({
    id: ID,
    draw(ctx, t0, info) {
      const L = info.lib;
      const t = clamp(t0, 0, DUR - 1e-4);
      const bi = L.boil(L.T);
      L.blueprint(ctx, { center: [RX, RY] });
      ctx.save();
      ctx.lineCap = 'round';

      // ---- tally ring --------------------------------------------------------
      const fill = clamp(t / T_FILL);
      const fillE = E.inOutSine(fill);
      const n = Math.min(N, Math.floor(fillE * N + 1e-6));
      const col = E.inCubic(L.seg(t, T_FILL, T_COLL));
      if (col < 1) {
        const cx = lerp(RX, EX, col), cy = lerp(RY, EY, col);
        const s = lerp(1, 0.04, col);
        const A = 1 - 0.5 * col;
        const R = RR * s;
        // double outline: outer 2.5 lavender 85 %, inner 1.5 50 % 9 px inside
        ring(ctx, cx, cy, R + 24 * s, P.lavender, 0.85 * A, 2.5);
        ring(ctx, cx, cy, R + 15 * s, P.lavender, 0.5 * A, 1.5);
        ring(ctx, cx, cy, R - 30 * s, P.lavender, 0.3 * A, 1);
        ring(ctx, cx, cy, R - 120 * s, P.lavender, 0.15 * A, 1.5, [2, 8]);
        // 378 day ticks: unlit ghosts, then lit (weeks every 7th longer)
        const pg = new Path2D(), pl = new Path2D(), pw = new Path2D();
        for (let i = 0; i < N; i++) {
          const a = -Math.PI / 2 + (i / N) * TAU;
          const wk = i % 7 === 0;
          const r0 = R - (wk ? 22 : 14) * s, r1 = R + 6 * s;
          const c = Math.cos(a), si = Math.sin(a);
          const tgt = i < n ? (wk ? pw : pl) : pg;
          tgt.moveTo(cx + c * r0, cy + si * r0);
          tgt.lineTo(cx + c * r1, cy + si * r1);
        }
        ctx.strokeStyle = P.lavender;
        ctx.globalAlpha = 0.14 * A;
        ctx.lineWidth = 1;
        ctx.stroke(pg);
        ctx.strokeStyle = P.lineWhite;
        ctx.globalAlpha = 0.6 * A;
        ctx.lineWidth = 1.5;
        ctx.stroke(pl);
        ctx.globalAlpha = 0.9 * A;
        ctx.lineWidth = 2;
        ctx.stroke(pw);
        // 12 month marks outside: one more lit per beat-ish as the days pass
        for (let m = 0; m < 12; m++) {
          const a = -Math.PI / 2 + (m / 12) * TAU;
          const lit = n >= (m * N) / 12;
          dot(ctx, cx + Math.cos(a) * (R + 40 * s), cy + Math.sin(a) * (R + 40 * s), 3.5 * s + 0.5, lit ? P.lavender : P.grid, lit ? 0.9 * A : 0.5 * A);
        }
        // head of the count: glow dot riding the ring
        if (fill > 0 && fill < 1) {
          const a = -Math.PI / 2 + fillE * TAU;
          L.glowDot(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 6, { rays: 8, boil: bi, seed: 7 });
        }
        // numbers: 378 counting (64 px) and 2023 under it
        const na = 1 - L.seg(t, T_FILL, T_FILL + 0.375);
        if (na > 0) {
          ctx.globalAlpha = na;
          L.text(ctx, String(n), cx, cy + 22, { size: 64, align: 'center', color: P.lavender, alpha: 0.85, tracking: 3 });
          L.text(ctx, '2023', cx, cy + 70, { size: 30, align: 'center', color: P.lavender, alpha: 0.6, tracking: 3 });
        }
        // completion: magenta flash on the full ring (12 frames)
        if (t >= T_FILL) {
          const f = clamp((t - T_FILL) * 2);
          ring(ctx, cx, cy, R + 24 * s + 40 * E.outExpo(f), P.magenta, 1 - f, 3);
        }
      }

      // ---- transfer: Earth, Mars, Hohmann arc -------------------------------
      const tp = L.seg(t, T_FILL - 0.75, T_FILL); // scenery fades in over the last beat of the fill
      if (tp > 0) {
        // faint orbit hints through each planet, centred off frame left (a sun beyond the edge)
        ctx.globalAlpha = 1;
        L.guideCircle(ctx, -200, 560, 620, { alpha: 0.14 * tp });
        L.guideCircle(ctx, -200, 560, 1710, { alpha: 0.12 * tp });
        // Mars: schemMars double outline + hex hint
        const mp = E.outBack(L.seg(L.onTwos(t), T_FILL - 0.75, T_FILL - 0.375));
        ring(ctx, MX, MY, 38 * mp, P.schemMars, 0.85, 2.5);
        ring(ctx, MX, MY, 29 * mp, P.schemMars, 0.5, 1.5);
        dot(ctx, MX, MY, 11 * mp, P.schemMars, 1);
        // Earth: lavender double outline
        const ep = E.outBack(L.seg(L.onTwos(t), T_FILL - 0.375, T_FILL));
        ring(ctx, EX, EY, 34 * ep, P.lavender, 0.85, 2.5);
        ring(ctx, EX, EY, 25 * ep, P.lavender, 0.5, 1.5);
        const eg = 1 + 0.5 * Math.sin(Math.PI * L.seg(t, T_COLL - 0.2, T_COLL + 0.3));
        dot(ctx, EX, EY, 9 * ep * eg, P.lineWhite, 1);
      }
      const ap = L.seg(t, T_COLL, T_ARR, 'inOutSine');
      if (t >= T_COLL) {
        // ghost path, then the traced arc (schemMars, dashed trajectory)
        const all = [], done = [];
        for (let i = 0; i <= 96; i++) {
          const k = i / 96;
          const p = hoh(k);
          all.push(p);
          if (k <= ap) done.push(p);
        }
        done.push(hoh(ap));
        ctx.lineWidth = 1;
        ctx.strokeStyle = P.lavender;
        ctx.globalAlpha = 0.18;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        LIB.tracePath(ctx, all, false);
        ctx.stroke();
        ctx.setLineDash([14, 10]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = P.schemMars;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        LIB.tracePath(ctx, done, false);
        ctx.stroke();
        ctx.setLineDash([]);
        // distance ticks along the arc, one per 8th as the craft passes
        for (let j = 1; j < 8; j++) {
          const k = j / 8;
          if (ap < k) break;
          const p = hoh(k), q = hoh(k + 0.002);
          const dx = q[0] - p[0], dy = q[1] - p[1], dl = Math.hypot(dx, dy) || 1;
          const nx = -dy / dl, ny = dx / dl;
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = P.lineWhite;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p[0] - nx * 8, p[1] - ny * 8);
          ctx.lineTo(p[0] + nx * 8, p[1] + ny * 8);
          ctx.stroke();
        }
        // departure flash on Earth (12 frames)
        const f0 = clamp((t - T_COLL) * 2);
        if (f0 < 1) ring(ctx, EX, EY, 34 + 30 * E.outExpo(f0), P.magenta, 1 - f0, 3);
        // craft
        const c = hoh(ap);
        ctx.globalAlpha = 1;
        L.glowDot(ctx, c[0], c[1], 8, { rays: 12, rot: t * 2, boil: bi, seed: 11 });
        // arrival: magenta ring on Mars (12 frames)
        if (t >= T_ARR) {
          const f = clamp((t - T_ARR) * 2);
          ring(ctx, MX, MY, 38 + 36 * E.outExpo(f), P.magenta, 1 - f, 3);
        }
      }
      ctx.restore();

      // progress glyph, small, full
      ctx.globalAlpha = 1;
      drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[3], u: 0, bi });
      ctx.globalAlpha = 1;
    },
  });
})();
