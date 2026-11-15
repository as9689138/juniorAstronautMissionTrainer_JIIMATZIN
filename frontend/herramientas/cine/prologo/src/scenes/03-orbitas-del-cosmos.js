// 03 orbitas-del-cosmos — Pull-back to the infinite. T 10.5 to 16.5 (6 s), schematic.
// Owner of the canonical progress glyph (art bible §5, storyboard G1): see "GLIFO CANÓNICO" below.
//
// Layers, back to front:
//   1. blueprint plate (cached)
//   2. galaxy layer: field stars, core glow, two-arm log spiral (traces T 15.0 to 16.0)
//   3. solar layer: heliosphere ring, outer planet orbits + belt, Mars orbit, Earth orbit, Sun
//   4. Earth system: Moon orbit and Moon, the Earth (double outline r 180, hex continents, meridians, terminator)
//   5. screen-fixed annotation: log tick ruler at the left, Earth bracket, magenta "here" ring
//   6. progress glyph (small, Act 1 = a quarter lit)
//
// Camera: log-linear pull-back anchored on the Earth at (960, 450), inOutSine over the shot,
// zoom 1 -> 0.06. The solar layer collapses a little faster in the second half so the Sun's
// system shrinks to a point inside the galaxy; the galaxy layer settles to rx 760 px at the end.
(function () {
  'use strict';
  const ID = 'orbitas-del-cosmos';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

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

  // ---- beats (local t; global T in comments) -------------------------------
  const B_MOON = 0.75; //   T 11.25
  const B_EORB = 1.5; //    T 12.0
  const B_MARS = 2.25; //   T 12.75
  const B_OUTER = 3.0; //   T 13.5
  const B_NEIGH = 3.75; //  T 14.25
  const B_GAL = 4.5; //     T 15.0 (arms trace to T 16.0)
  const B_HERE = 5.25; //   T 15.75 magenta ring on the Sun
  const DUR = 6;

  // ---- world geometry (solar layer; world units = px at zoom 1) -------------
  const EX = 960, EY = 450; // Earth, the camera anchor
  const EARTH_R = 180;
  const MOON_ORB = 340, MOON_R = 46, MOON_A = -40 * DEG;
  const SUN_DIR = 200 * DEG, EORB = 900;
  const SUNX = EX + Math.cos(SUN_DIR) * EORB, SUNY = EY + Math.sin(SUN_DIR) * EORB;
  const MARS_ORB = 1370, MARS_A = -10 * DEG;
  const OUTER = [
    { r: 2300, a: 30, pr: 9 },
    { r: 3300, a: 160, pr: 8, ring: true },
    { r: 4400, a: -40, pr: 6 },
    { r: 5500, a: 215, pr: 6 },
  ];
  const BELT = [1700, 1950];
  const HELIO = 8000;
  // the Americas facing the viewer (unit disc, y down), Greenland separately
  const AMERICAS = [
    [-0.62, -0.62], [-0.48, -0.74], [-0.3, -0.8], [-0.05, -0.8], [0.12, -0.74], [0.2, -0.64], [0.3, -0.55],
    [0.22, -0.46], [0.33, -0.36], [0.26, -0.24], [0.14, -0.2], [0.06, -0.12], [-0.02, 0.0], [0.04, 0.08],
    [0.12, 0.15], [0.2, 0.2], [0.3, 0.19], [0.45, 0.25], [0.6, 0.35], [0.58, 0.5], [0.46, 0.64], [0.36, 0.78],
    [0.28, 0.9], [0.22, 0.82], [0.2, 0.62], [0.12, 0.47], [0.08, 0.33], [0.1, 0.25], [0.03, 0.2], [-0.1, 0.1],
    [-0.2, 0.0], [-0.28, -0.12], [-0.4, -0.24], [-0.52, -0.36], [-0.66, -0.46],
  ];
  const GREENLAND = [[0.3, -0.9], [0.46, -0.85], [0.44, -0.72], [0.34, -0.68], [0.27, -0.76]];
  const MEXICO = [0.0, 0.06];

  // ---- galaxy (unit plane, radius 1; post-transform offsets in units of rx) --
  const GAL_TILT = -14 * DEG, GAL_SQ = 0.58, GAL_RX_END = 760;
  const SUN_GAL_R = 0.3; // the Sun sits on arm 0, 0.3 of the radius out
  const ARM_B = Math.log(1 / 0.07) / (3.1 * Math.PI), ARM_TH = 3.1 * Math.PI;

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const r = L.rng(sd('galaxy'));
    // rotate the pattern so the Sun's arm point lands on +x after tilt
    const thS = Math.log(SUN_GAL_R / 0.07) / ARM_B;
    const omega = -thS - GAL_TILT;
    const tf = (gx, gy) => {
      // plane rotation by omega, tilt, squash
      const c = Math.cos(omega + GAL_TILT), s = Math.sin(omega + GAL_TILT);
      const x = gx * c - gy * s, y = gx * s + gy * c;
      return [x, y * GAL_SQ];
    };
    const arm = (k, th) => {
      const rr = 0.07 * Math.exp(ARM_B * th);
      const a = th + k * Math.PI;
      return [rr * Math.cos(a), rr * Math.sin(a), rr];
    };
    const arms = [0, 1].map((k) => {
      const pts = [];
      for (let i = 0; i <= 220; i++) {
        const th = (i / 220) * ARM_TH;
        const a = arm(k, th);
        pts.push(tf(a[0], a[1]));
      }
      return pts;
    });
    const sunOff = (() => { const a = arm(0, thS); return tf(a[0], a[1]); })();
    const stars = [];
    for (let i = 0; i < 2800; i++) {
      const kind = r();
      let gx, gy, q;
      if (kind < 0.62) {
        const k = r() < 0.5 ? 0 : 1;
        const th = Math.pow(r(), 0.8) * ARM_TH;
        const a = arm(k, th);
        const sc = 0.035 + a[2] * 0.11;
        gx = a[0] + r.gauss() * sc;
        gy = a[1] + r.gauss() * sc;
        q = th / ARM_TH;
      } else if (kind < 0.8) {
        const rr = Math.abs(r.gauss()) * 0.11, a = r() * TAU;
        gx = Math.cos(a) * rr; gy = Math.sin(a) * rr;
        q = 0;
      } else {
        const rr = Math.sqrt(r()) * 1.05, a = r() * TAU;
        gx = Math.cos(a) * rr; gy = Math.sin(a) * rr;
        q = -1; // field star, never "traced"
      }
      const [x, y] = tf(gx, gy);
      stars.push({ x, y, q, rad: r.range(0.5, 1.5), b: r.range(0.35, 1) });
    }
    const knots = [];
    for (const k of [0, 1]) {
      for (let i = 0; i < 12; i++) {
        const th = ((i + 0.6 + r.range(-0.2, 0.2)) / 12.4) * ARM_TH;
        const a = arm(k, th);
        const sc = 0.02;
        const [x, y] = tf(a[0] + r.gauss() * sc, a[1] + r.gauss() * sc);
        knots.push({ x, y, q: th / ARM_TH, r: r.range(2, 3.6), seed: sd('knot', k, i) });
      }
    }
    // asteroid belt points (world, around the Sun)
    const belt = [];
    for (let i = 0; i < 520; i++) {
      const a = r() * TAU, rr = r.range(BELT[0], BELT[1]);
      belt.push([Math.cos(a) * rr, Math.sin(a) * rr, r.range(0.6, 1.4)]);
    }
    // Earth continents (unit)
    const amer = L.smoothPts(AMERICAS, true, 0.03);
    const green = L.smoothPts(GREENLAND, true, 0.03);
    GEO = { arms, sunOff, stars, knots, belt, amer, green };
    return GEO;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur || DUR);
      const G = geo(L);
      const bi = L.boil(info.T);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((v) => v))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // ---- camera -----------------------------------------------------------
      const LN = Math.log(0.06);
      const e1 = E.inOutSine(clamp(t / DUR));
      const zCam = Math.exp(LN * e1); // storyboard camera, 1 -> 0.06
      const e2 = E.inOutSine(clamp((t - B_MARS) / (DUR - B_MARS)));
      const zs = Math.exp(LN * e1 * (1 + 0.55 * e2)); // solar layer
      const zsEnd = Math.exp(LN * 1.55);
      const sx = (wx) => EX + (wx - EX) * zs;
      const sy = (wy) => EY + (wy - EY) * zs;
      const sunX = sx(SUNX), sunY = sy(SUNY);
      const galRx = GAL_RX_END * Math.pow(zs / zsEnd, 0.75);
      const gcx = sunX - G.sunOff[0] * galRx, gcy = sunY - G.sunOff[1] * galRx;

      ctx.save();
      ctx.lineCap = 'round';
      const ring = (cx, cy, r, a0, p, color, alpha, width, dash) => {
        if (p <= 0 || alpha <= 0.002 || r <= 0.5) return;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + TAU * Math.min(1, p));
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      const dot = (x, y, r, color, alpha) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      };

      // 1. blueprint ----------------------------------------------------------
      L.blueprint(ctx, { center: [960, 450], seed: 31 });

      // 2. galaxy -------------------------------------------------------------
      const field = L.smoothstep(B_OUTER, B_NEIGH + 0.4, t);
      const armQ = E.inOutSine(clamp((t - B_GAL) / 1.0)); // T 15.0 -> 16.0
      const solarFade = 1 - 0.8 * L.smoothstep(B_GAL - 0.2, B_GAL + 0.9, t);
      if (field > 0) {
        // core glow
        if (armQ > 0 || t > B_NEIGH) {
          const cr = galRx * 0.22;
          const g = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, cr);
          const ck = 0.3 + 0.7 * armQ;
          g.addColorStop(0, L.rgba(P.glow, 0.45 * ck * field));
          g.addColorStop(0.35, L.rgba(P.paleBlue, 0.12 * ck * field));
          g.addColorStop(1, L.rgba(P.paleBlue, 0));
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = g;
          ctx.fillRect(gcx - cr, gcy - cr, cr * 2, cr * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        // stars, bucketed by alpha
        const buckets = [new Path2D(), new Path2D(), new Path2D()];
        const bAlpha = [0.3, 0.6, 0.95];
        const W = 1920, H = 1080;
        for (let i = 0; i < G.stars.length; i++) {
          const st = G.stars[i];
          const x = gcx + st.x * galRx, y = gcy + st.y * galRx;
          if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
          let a = st.b * field * 0.5;
          if (st.q >= 0) a += st.b * 0.6 * clamp((armQ - st.q) * 8 + (st.q === 0 ? armQ * 3 : 0));
          if (a < 0.08) continue;
          const bk = a < 0.35 ? 0 : a < 0.7 ? 1 : 2;
          // subtitle band stays calm
          const rad = st.rad * (y > 860 ? 0.7 : 1);
          if (y > 860 && bk === 2) continue;
          buckets[bk].moveTo(x + rad, y);
          buckets[bk].arc(x, y, rad, 0, TAU);
        }
        for (let b = 0; b < 3; b++) {
          ctx.globalAlpha = bAlpha[b];
          ctx.fillStyle = P.lineWhite;
          ctx.fill(buckets[b]);
        }
        // arm centrelines: double lavender outline traced from the core outward
        if (armQ > 0) {
          for (const pts of G.arms) {
            const n = Math.max(2, Math.floor(pts.length * armQ));
            for (const [wid, al, off] of [[2.2, 0.6, 0], [1.2, 0.3, 9]]) {
              ctx.beginPath();
              for (let i = 0; i < n; i++) {
                const x = gcx + pts[i][0] * galRx, y = gcy + pts[i][1] * galRx + off * (i / pts.length);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.strokeStyle = P.lavender;
              ctx.globalAlpha = al;
              ctx.lineWidth = wid;
              ctx.stroke();
            }
          }
          // knots: glow dots that pop as the trace passes them
          for (const kn of G.knots) {
            if (armQ < kn.q) continue;
            const x = gcx + kn.x * galRx, y = gcy + kn.y * galRx;
            if (x < -40 || x > 1960 || y < -40 || y > 850) continue;
            const pop = clamp((armQ - kn.q) * 10);
            ctx.globalAlpha = 1;
            L.glowDot(ctx, x, y, kn.r * (0.6 + 0.4 * pop), { rays: 8, rayLen: 2.6, seed: kn.seed, boil: bi, intensity: 0.8 });
          }
          // rim: dashed ellipse and a degree scale on it
          ctx.save();
          ctx.translate(gcx, gcy);
          ctx.rotate(0);
          ctx.beginPath();
          ctx.ellipse(0, 0, galRx * 1.08, galRx * 1.08 * GAL_SQ, GAL_TILT, 0, TAU * armQ);
          ctx.strokeStyle = P.lavender;
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([10, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // 3. solar layer --------------------------------------------------------
      // heliosphere / the Sun's neighbourhood
      const neigh = hit(B_NEIGH, 9, E.outExpo);
      if (neigh > 0) {
        ring(sunX, sunY, HELIO * zs, -Math.PI / 2, neigh, P.lavender, 0.28 * solarFade, 1.5, [10, 8]);
        ring(sunX, sunY, HELIO * zs + 9, -Math.PI / 2, neigh, P.lavender, 0.12 * solarFade, 1);
        ctx.globalAlpha = solarFade;
        L.ticks(ctx, sunX, sunY, { r: HELIO * zs, n: 96, len: 6, major: 8, majorLen: 14, alpha: 0.35, p: neigh, width: 1 });
        // ruler from the Sun out to the heliosphere edge (no numbers)
        const ang = -28 * DEG;
        ctx.globalAlpha = solarFade;
        L.ticks(ctx, sunX, sunY, { kind: 'linear', length: HELIO * zs * neigh, angle: ang, n: 20, len: 6, major: 5, majorLen: 14, alpha: 0.45, side: -1 });
      }
      // outer planets + belt
      const outerP = hit(B_OUTER, 9, E.outExpo);
      if (outerP > 0) {
        // asteroid belt
        const bp = new Path2D();
        for (const b of G.belt) {
          const x = sunX + b[0] * zs, y = sunY + b[1] * zs;
          if (x < 0 || x > 1920 || y < 0 || y > 850) continue;
          bp.moveTo(x + b[2], y);
          bp.arc(x, y, b[2], 0, TAU);
        }
        ctx.globalAlpha = 0.4 * outerP * solarFade;
        ctx.fillStyle = P.lavender;
        ctx.fill(bp);
        OUTER.forEach((pl, i) => {
          const pp = hit(B_OUTER + i * 2 * FR, 9, E.outExpo);
          const R = pl.r * zs;
          ring(sunX, sunY, R, pl.a * DEG, pp, P.lavender, 0.42 * solarFade, 1.5, i % 2 ? [2, 7] : null);
          if (pp >= 1) {
            const px = sunX + Math.cos(pl.a * DEG) * R, py = sunY + Math.sin(pl.a * DEG) * R;
            const pr = Math.max(2, pl.pr * Math.min(1, zs * 6)) * popTwos(B_OUTER + 9 * FR + i * 2 * FR);
            dot(px, py, pr, P.lineWhite, 0.9 * solarFade);
            ring(px, py, pr + 5, 0, 1, P.lavender, 0.5 * solarFade, 1);
            if (pl.ring) {
              ctx.save();
              ctx.globalAlpha = 0.7 * solarFade;
              ctx.strokeStyle = P.lavender;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.ellipse(px, py, pr * 2.4, pr * 0.8, -0.35, 0, TAU);
              ctx.stroke();
              ctx.restore();
            }
          }
        });
      }
      // Mars orbit
      const marsP = hit(B_MARS, 9, E.outExpo);
      if (marsP > 0) {
        const R = MARS_ORB * zs;
        ring(sunX, sunY, R, MARS_A, marsP, P.lavender, 0.62 * solarFade, 1.5);
        ring(sunX, sunY, R - 9, MARS_A, marsP, P.lavender, 0.25 * solarFade, 1);
        if (marsP >= 1) {
          const px = sunX + Math.cos(MARS_A) * R, py = sunY + Math.sin(MARS_A) * R;
          const pr = Math.max(2.2, 8 * Math.min(1, zs * 2.5)) * popTwos(B_MARS + 9 * FR);
          dot(px, py, pr, P.lineWhite, 0.95 * solarFade);
          ring(px, py, pr + 6, 0, 1, P.lavender, 0.55 * solarFade, 1);
        }
      }
      // Earth orbit and the Sun
      const eoP = hit(B_EORB, 9, E.outExpo);
      if (eoP > 0) {
        const R = EORB * zs;
        const a0 = SUN_DIR + Math.PI; // starts at the Earth
        ring(sunX, sunY, R, a0, eoP, P.lavender, 0.8 * Math.max(0.35, solarFade), 2);
        ring(sunX, sunY, R - 9, a0, eoP, P.lavender, 0.4 * solarFade, 1.2);
        if (R > 60) {
          ctx.globalAlpha = solarFade;
          L.ticks(ctx, sunX, sunY, { r: R + 6, n: 12, len: 10, alpha: 0.5, p: eoP });
        }
        const sk = popTwos(B_EORB);
        ctx.globalAlpha = 1;
        L.glowDot(ctx, sunX, sunY, clamp(60 * zs, 4.5, 13) * sk, { rays: 12, seed: sd('sun'), boil: bi });
      }

      // 4. Earth system -------------------------------------------------------
      const moonP = hit(B_MOON, 9, E.outExpo);
      if (moonP > 0) {
        const R = MOON_ORB * zs;
        ring(EX, EY, R, MOON_A, moonP, P.lavender, 0.6 * solarFade, 1.5);
        if (R > 30) ring(EX, EY, R + 9, MOON_A, moonP, P.lavender, 0.2 * solarFade, 1, [2, 6]);
        if (moonP >= 1) {
          const mk = popTwos(B_MOON + 9 * FR);
          const mx = EX + Math.cos(MOON_A) * R, my = EY + Math.sin(MOON_A) * R;
          const mr = Math.max(1.6, MOON_R * zs) * mk;
          dot(mx, my, mr, P.navyDeep, 0.9 * solarFade);
          ring(mx, my, mr, 0, 1, P.lineWhite, 0.85 * solarFade, mr > 8 ? 2 : 1.2);
          if (mr > 12) {
            ring(mx, my, mr - 6, 0, 1, P.lavender, 0.4 * solarFade, 1);
            for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.16], [0.35, -0.35, 0.12], [-0.1, 0.45, 0.1]]) {
              ring(mx + cx * mr, my + cy * mr, cr * mr, 0, 1, P.lavender, 0.45 * solarFade, 1);
            }
          }
        }
      }
      const RE = EARTH_R * zs;
      if (RE > 7) {
        const det = L.smoothstep(14, 60, RE);
        // body
        dot(EX, EY, RE, P.navyDeep, 0.85);
        // whole-surface lattice and Americas lattice
        if (RE > 40) {
          const disc = L.ellipsePts(EX, EY, RE - 2, RE - 2, 72);
          L.hexLattice(ctx, disc, { r: Math.max(5, 15 * zs), alpha: 0.08 * det, seed: sd('hexall'), boil: bi });
          const toS = (pts) => pts.map((q) => [EX + q[0] * RE, EY + q[1] * RE]);
          const amer = toS(G.amer), green = toS(G.green);
          L.hexLattice(ctx, amer, { r: Math.max(4, 9 * zs), alpha: 0.4 * det, seed: sd('hexam'), boil: bi });
          L.hexLattice(ctx, green, { r: Math.max(4, 9 * zs), alpha: 0.32 * det, seed: sd('hexgr'), boil: bi });
          for (const poly of [amer, green]) {
            ctx.beginPath();
            L.tracePath(ctx, poly, true);
            ctx.strokeStyle = P.lavender;
            ctx.globalAlpha = 0.6 * det;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          // meridians and parallels
          ctx.save();
          ctx.beginPath();
          ctx.arc(EX, EY, RE, 0, TAU);
          ctx.clip();
          ctx.strokeStyle = P.lavender;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.18 * det;
          ctx.beginPath();
          for (let k = -75; k <= 75; k += 15) {
            const rx = Math.abs(Math.sin(k * DEG)) * RE;
            ctx.moveTo(EX + rx, EY);
            ctx.ellipse(EX, EY, Math.max(0.5, rx), RE, 0, 0, TAU);
          }
          for (let k = -75; k <= 75; k += 15) {
            const yy = EY + Math.sin(k * DEG) * RE, hw = Math.cos(k * DEG) * RE;
            ctx.moveTo(EX - hw, yy);
            ctx.lineTo(EX + hw, yy);
          }
          ctx.stroke();
          ctx.restore();
          // terminator: hatch the side away from the Sun (Sun to the upper left)
          const term = [];
          const ad = SUN_DIR + Math.PI; // anti-sun direction
          for (let i = 0; i <= 24; i++) {
            const a = ad - Math.PI / 2 + (i / 24) * Math.PI;
            term.push([EX + Math.cos(a) * RE, EY + Math.sin(a) * RE]);
          }
          for (let i = 0; i <= 24; i++) {
            const a = ad + Math.PI / 2 - (i / 24) * Math.PI;
            const c = Math.cos(a - ad), s = Math.sin(a - ad);
            const lx = c * RE * 0.38, ly = s * RE;
            term.push([EX + lx * Math.cos(ad) - ly * Math.sin(ad), EY + lx * Math.sin(ad) + ly * Math.cos(ad)]);
          }
          L.hatch(ctx, term, { spacing: 7, angle: 105 * DEG, color: P.lavender, alpha: 0.24 * det, width: 1, seed: sd('term'), boil: bi });
          // México marker in schemOxygen
          const mxx = EX + MEXICO[0] * RE, mxy = EY + MEXICO[1] * RE;
          ctx.globalAlpha = det;
          L.glowDot(ctx, mxx, mxy, 5, { color: P.schemOxygen, core: P.lineWhite, rays: 8, rayLen: 2.6, seed: sd('mx'), boil: bi });
        }
        // double outline
        ring(EX, EY, RE, -Math.PI / 2, 1, P.lavender, 0.85, 2.5);
        if (RE > 20) ring(EX, EY, RE - 9, -Math.PI / 2, 1, P.lavender, 0.5 * det, 1.5);
        ctx.globalAlpha = det;
        L.ticks(ctx, EX, EY, { r: RE + 12, n: 48, len: 8, major: 4, majorLen: 16, alpha: 0.4, width: 1 });
        // schemOxygen rim once the Earth is small
        ring(EX, EY, RE + 3, 0, 1, P.schemOxygen, 0.8 * (1 - det), 1.5);
      } else {
        const r = Math.max(3.2, RE);
        ctx.globalAlpha = 1;
        L.glowDot(ctx, EX, EY, r, { color: P.schemOxygen, core: P.schemOxygen, rays: 0, glow: 3.5, seed: sd('edot'), boil: bi, twinkle: 0.05 });
        dot(EX, EY, r, P.schemOxygen, 1);
      }

      // 5. screen-fixed annotation --------------------------------------------
      // Earth diameter bracket (fades as the Earth shrinks)
      const brA = 1 - L.smoothstep(B_EORB, B_MARS + 0.4, t);
      if (brA > 0 && RE > 30) {
        ctx.globalAlpha = brA;
        L.bracket(ctx, EX - RE, EY + RE + 44, EX + RE, EY + RE + 44, { alpha: 0.6, p: hit(0, 9, E.outExpo) });
        L.bracket(ctx, EX + RE + 50, EY - RE, EX + RE + 50, EY + RE, { alpha: 0.4, style: 'square', offset: 0 });
      }
      // log zoom ruler at the left edge: one major tick per decade; the marker slides down with the pull-back
      {
        const x0 = 150, y0 = 150, y1 = 790;
        ctx.globalAlpha = 1;
        L.ticks(ctx, x0, y0, { kind: 'linear', length: y1 - y0, angle: Math.PI / 2, n: 32, len: 8, major: 8, majorLen: 20, alpha: 0.45, side: 1 });
        const lz = clamp(-Math.log(zs) / -Math.log(zsEnd));
        const my = y0 + (y1 - y0) * lz;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = P.lineWhite;
        ctx.beginPath();
        ctx.moveTo(x0 - 6, my);
        ctx.lineTo(x0 - 20, my - 8);
        ctx.lineTo(x0 - 20, my + 8);
        ctx.closePath();
        ctx.fill();
        // landed layers marked on the ruler
        [B_MOON, B_EORB, B_MARS, B_OUTER, B_NEIGH, B_GAL].forEach((b, i) => {
          if (t < b) return;
          const zz = Math.exp(LN * E.inOutSine(clamp(b / DUR)) * (1 + 0.55 * E.inOutSine(clamp((b - B_MARS) / (DUR - B_MARS)))));
          const yy = y0 + (y1 - y0) * clamp(-Math.log(zz) / -Math.log(zsEnd));
          dot(x0 + 30, yy, 3 * popTwos(b), P.lavender, 0.8);
        });
      }
      // magenta "here": ring on the Sun inside the galaxy, 12 frames
      if (t >= B_HERE) {
        const f = hit(B_HERE, 12, (v) => v);
        const rr = 10 + 46 * E.outExpo(f);
        ring(sunX, sunY, rr, 0, 1, P.magenta, 1 - f, 3);
        ring(sunX, sunY, 12, 0, 1, P.magenta, 0.25 + 0.5 * (1 - f), 1.5);
      }

      // 6. progress glyph (Act 1) ---------------------------------------------
      ctx.globalAlpha = 1;
      drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[0], u: 0, bi });
      ctx.restore();
    },
  });
})();
