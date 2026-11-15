// 29 glifo-final — The orbits close the loop. T 156 to 162, schematic.
// Mars large (double outline r 160) with the Base Marte Uno marker; at T 158.25 the progress glyph flies
// from the corner (1720, 170) to G1 (960, 450) while Mars shrinks into the glyph's Mars dot (inOutSine,
// 2.25 s); T 160.5 to 162 hold with the orbits turning. The last frame equals 01's last frame (loop).
// Layers: 1 blueprint (same options as 01), 2 Mars (lattice, meridians, cap, terminator hatch, ticks,
//         bracket), 3 base marker + magenta ring, 4 canonical glyph (copied verbatim from 03).
(function () {
  'use strict';
  const ID = 'glifo-final';
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

  const B_BASE = 0.75; //  T 156.75 base marker pops
  const B_RING = 1.5; //   T 157.5 magenta ring on Mars
  const B_FLY = 2.25; //   T 158.25 glyph flies to centre (to T 160.5)
  const B_HOLD = 4.5; //   T 160.5 hold, orbits turning
  const DUR = 6;
  const MX = 960, MY = 450, MR = 160;
  const BASE = [0.28, 0.22]; // base marker on the disc (unit)
  // u offset so the last frame (t = 6 - 1/24) has the same u as 01's last frame (t = 4.5 - 1/24, turning from 3.75)
  const U_OFF = DUR - (4.5 - 3.75);

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur || DUR);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((v) => v))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);
      const bi = 100000 + Math.floor((t - DUR) * 12 + 1e-6);
      const u = t - U_OFF;
      const k = E.inOutSine(clamp((t - B_FLY) / (B_HOLD - B_FLY)));
      const gx = lerp(GLYPH.SX, GLYPH.X, k), gy = lerp(GLYPH.SY, GLYPH.Y, k);
      const gs = lerp(GLYPH.SMALL, 1, k);
      const pose = glyphPose(gx, gy, gs, u);

      // 1. blueprint
      L.blueprint(ctx, { center: [960, 450], seed: 29 });

      // 2. Mars: shrinks into the glyph's Mars dot
      const mx = lerp(MX, pose.mx, k), my = lerp(MY, pose.my, k), mr = lerp(MR, GLYPH.MARS_R * gs, k);
      const mA = 1 - L.smoothstep(0.82, 1, k);
      const det = 1 - L.smoothstep(0, 0.45, k);
      ctx.save();
      ctx.lineCap = 'round';
      if (mA > 0) {
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.fillStyle = P.navyDeep;
        ctx.globalAlpha = 0.85 * mA;
        ctx.fill();
        if (det > 0.01) {
          const disc = L.ellipsePts(mx, my, mr - 3, mr - 3, 64);
          ctx.globalAlpha = det * mA;
          L.hexLattice(ctx, disc, { r: 12 * mr / MR, alpha: 0.22, seed: sd('hex'), boil: bi });
          ctx.save();
          ctx.beginPath();
          ctx.arc(mx, my, mr, 0, TAU);
          ctx.clip();
          ctx.strokeStyle = P.lavender;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.2 * det * mA;
          ctx.beginPath();
          for (let a = -75; a <= 75; a += 25) {
            const rx = Math.abs(Math.sin(a * DEG)) * mr;
            ctx.moveTo(mx + rx, my);
            ctx.ellipse(mx, my, Math.max(0.5, rx), mr, 0, 0, TAU);
            const yy = my + Math.sin(a * DEG) * mr, hw = Math.cos(a * DEG) * mr;
            ctx.moveTo(mx - hw, yy);
            ctx.lineTo(mx + hw, yy);
          }
          ctx.stroke();
          // polar cap
          ctx.globalAlpha = 0.7 * det * mA;
          ctx.strokeStyle = P.lineWhite;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(mx - 0.08 * mr, my - 0.86 * mr, 0.36 * mr, 0.13 * mr, -0.1, 0, TAU);
          ctx.stroke();
          // craters and a valley line
          ctx.strokeStyle = P.lavender;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5 * det * mA;
          for (const [cx, cy, cr] of [[-0.42, 0.1, 0.12], [-0.15, 0.5, 0.08], [0.45, -0.3, 0.1], [-0.5, -0.4, 0.07]]) {
            ctx.beginPath();
            ctx.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(mx - 0.6 * mr, my - 0.05 * mr);
          ctx.quadraticCurveTo(mx - 0.1 * mr, my + 0.1 * mr, mx + 0.45 * mr, my - 0.02 * mr);
          ctx.stroke();
          ctx.restore();
          // terminator hatch on the lower right (sun upper left)
          const term = [];
          const ad = 45 * DEG;
          for (let i = 0; i <= 20; i++) {
            const a = ad - Math.PI / 2 + (i / 20) * Math.PI;
            term.push([mx + Math.cos(a) * mr, my + Math.sin(a) * mr]);
          }
          for (let i = 0; i <= 20; i++) {
            const a = Math.PI / 2 - (i / 20) * Math.PI;
            const lx = Math.cos(a) * mr * 0.4, ly = Math.sin(a) * mr;
            term.push([mx + lx * Math.cos(ad) - ly * Math.sin(ad), my + lx * Math.sin(ad) + ly * Math.cos(ad)]);
          }
          ctx.globalAlpha = det * mA;
          L.hatch(ctx, term, { spacing: 6, angle: 105 * DEG, color: P.lavender, alpha: 0.26, width: 1, seed: sd('term'), boil: bi });
          L.ticks(ctx, mx, my, { r: mr + 14, n: 72, len: 7, major: 6, majorLen: 15, alpha: 0.4, width: 1 });
          L.bracket(ctx, mx - mr, my + mr + 46, mx + mr, my + mr + 46, { alpha: 0.6, p: hit(0, 9, E.outExpo) });
          L.guideCircle(ctx, mx, my, mr * 1.6, { alpha: 0.14, dash: [3, 8], quadrants: 10 });
        }
        // double outline
        ctx.globalAlpha = 0.85 * mA;
        ctx.strokeStyle = P.lavender;
        ctx.lineWidth = lerp(2.5, 1.5, k);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.stroke();
        if (mr > 30) {
          ctx.globalAlpha = 0.5 * mA * det;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(mx, my, mr - 9, 0, TAU);
          ctx.stroke();
        }
        // schemMars rim tightens toward the dot
        ctx.globalAlpha = 0.9 * mA * (1 - det);
        ctx.strokeStyle = P.schemMars;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.stroke();
      }
      // 3. base marker + magenta ring
      const bk = popTwos(B_BASE) * (1 - L.smoothstep(0, 0.5, k));
      const bx = mx + BASE[0] * mr, by = my + BASE[1] * mr;
      if (bk > 0) {
        ctx.globalAlpha = 1;
        L.glowDot(ctx, bx, by, 7 * bk, { color: P.schemMars, core: P.glow, rays: 12, seed: sd('base'), boil: bi });
        ctx.globalAlpha = Math.min(1, bk);
        L.ticks(ctx, bx, by, { r: 20, n: 12, len: 10, alpha: 0.6, p: hit(B_BASE, 9, E.outExpo) });
      }
      if (t >= B_RING && t < B_RING + 12 * FR) {
        const f = hit(B_RING, 12);
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = P.magenta;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, 16 + 70 * E.outExpo(f), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      // 4. the glyph (Act 4, all lit). While it flies, its own Mars dot is replaced by the shrinking
      //    Mars disc and fades in as the disc arrives; in the corner (k = 0) it shows normally.
      const marsDot = k <= 0 ? 1 : L.smoothstep(0.82, 1, k);
      ctx.globalAlpha = 1;
      drawGlyph(ctx, L, { x: gx, y: gy, s: gs, act: GLYPH.ACT[3], u, bi, mars: marsDot });
    },
  });
})();
