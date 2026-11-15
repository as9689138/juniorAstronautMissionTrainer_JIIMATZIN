// 01 chispa — A spark becomes the orbits. T 0 to 4.5, schematic, film start.
// Opens on the G1 structure as a faint ghost around a 2 px spark; builds the full G1 glyph beat by beat;
// ends on the full G1 with the orbits turning — 29-glifo-final ends on exactly this pose (loop).
// Layers: 1 blueprint (same options as 29) + navyDeep veil, 2 ghost G1 construction, 3 spark,
//         4 canonical glyph (copied verbatim from 03-orbitas-del-cosmos.js), 5 magenta ring on Mars.
(function () {
  'use strict';
  const ID = 'chispa';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
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

  const B_SUN = 0.75; //   T 0.75 sun pops, 12 ticks
  const B_EARTH = 1.5; //  T 1.5 Earth orbit traces, dot lands on the 8th
  const B_MOON = 2.25; //  T 2.25 Moon orbit
  const B_MARS = 3.0; //   T 3.0 Mars orbit + act arc, Mars dot lands with magenta ring on the 8th
  const B_TURN = 3.75; //  T 3.75 orbits start to turn (Earth 6 deg/s)
  const DUR = 4.5;

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur || DUR);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((v) => v))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);
      // boil index counted back from the shot end, so the last frame matches 29's last frame
      const bi = 100000 + Math.floor((t - DUR) * 12 + 1e-6);

      // 1. blueprint, veiled navyDeep at the start (from black)
      L.blueprint(ctx, { center: [960, 450], seed: 29 });
      const veil = 0.88 * (1 - L.smoothstep(0, B_EARTH, t));
      if (veil > 0) {
        ctx.globalAlpha = veil;
        ctx.fillStyle = P.navyDeep;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.globalAlpha = 1;
      }
      // 2. ghost G1: the structure is there from frame 0, faint and dotted
      const ghost = 1 - L.smoothstep(B_MARS, B_TURN, t);
      if (ghost > 0) {
        ctx.save();
        ctx.strokeStyle = P.lavender;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 6]);
        const pulse = 0.16 + 0.05 * (Math.floor(t / 0.375) % 2); // breathes on 8ths
        ctx.globalAlpha = pulse * ghost;
        ctx.beginPath();
        for (const r of [GLYPH.EARTH_ORBIT, GLYPH.MARS_ORBIT, GLYPH.GUIDE_R]) {
          ctx.moveTo(GLYPH.X + r, GLYPH.Y);
          ctx.arc(GLYPH.X, GLYPH.Y, r, 0, TAU);
        }
        const pz = glyphPose(GLYPH.X, GLYPH.Y, 1, 0);
        ctx.moveTo(pz.ex + GLYPH.MOON_ORBIT, pz.ey);
        ctx.arc(pz.ex, pz.ey, GLYPH.MOON_ORBIT, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      // 3. spark: a 2 px point that swells on the 8th, then becomes the sun
      if (t < B_SUN) {
        const sw = t < 0.375 ? 1 : 1.6;
        ctx.globalAlpha = 1;
        L.glowDot(ctx, GLYPH.X, GLYPH.Y, 2 * sw, { rays: 4, rayLen: 4, glow: 6, seed: sd('spark'), boil: bi });
      }
      // 4. the glyph, built beat by beat
      const u = Math.max(0, t - B_TURN);
      const eo = hit(B_EARTH, 9, E.outExpo);
      const mo = hit(B_MOON, 9, E.outExpo);
      const ma = hit(B_MARS, 9, E.outExpo);
      drawGlyph(ctx, L, {
        x: GLYPH.X, y: GLYPH.Y, s: 1, act: 1, u, bi,
        sun: popTwos(B_SUN),
        guide: hit(B_SUN, 9, E.outExpo),
        earthOrbit: eo, earth: popTwos(B_EARTH + 9 * FR),
        moonOrbit: mo, moon: popTwos(B_MOON + 9 * FR),
        marsOrbit: ma, arc: ma, mars: popTwos(B_MARS + 9 * FR),
      });
      // 5. magenta ring as Mars lands (12 frames)
      const b5 = B_MARS + 9 * FR;
      if (t >= b5 && t < b5 + 12 * FR) {
        const f = hit(b5, 12);
        const pz = glyphPose(GLYPH.X, GLYPH.Y, 1, u);
        ctx.save();
        ctx.strokeStyle = P.magenta;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - f;
        ctx.beginPath();
        ctx.arc(pz.mx, pz.my, 14 + 40 * E.outExpo(f), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
