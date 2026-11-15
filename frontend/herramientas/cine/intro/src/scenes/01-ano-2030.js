// 01 ano-2030 — 2030 rewinds to 2023. T 0 to 6, schematic.
// Owner (intro film) of the canonical progress glyph: GLYPH / glyphPose / drawGlyph copied verbatim from the
// prologue's 03-orbitas-del-cosmos.js. Other intro shots copy this block.
// Opens on G1 large, orbits turning; "2030" writes on T 0.75; T 2.25 rewind (4 turns in 1.5 s) while the year
// counts down on twos; T 3.75 lands on 2023 with a magenta ring on Earth; push 1 -> 2.5x on Earth to centre-left.
(function () {
  'use strict';
  const ID = 'ano-2030';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

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

  // ---------------------------------------------------------------------------
  // Timing (local seconds). Beat 0.75 s.
  const T_YEAR = 0.75, T_REW = 2.25, T_LAND = 3.75, DUR = 6;
  const REW_U = 240; // 4 Earth turns at 6 deg/s = 240 s of orbit time, run backwards
  // orbit time u(t): turns forward, rewinds 4 turns T 2.25..3.75, then drifts slowly forward
  function orbitU(t) {
    if (t < T_REW) return t;
    if (t < T_LAND) {
      const k = (t - T_REW) / (T_LAND - T_REW);
      return T_REW - REW_U * E.inOutCubic(k);
    }
    return T_REW - REW_U + (t - T_LAND) * 0.5;
  }

  FILM.scene({
    id: ID,
    draw(ctx, t0, info) {
      const L = info.lib;
      const t = clamp(t0, 0, DUR - 1e-4);
      const bi = L.boil(L.T);
      L.blueprint(ctx, { center: [960, 450] });

      const u = orbitU(t);
      // push on the Earth dot, 1 -> 2.5x, Earth travels toward the frame centre-left
      const pk = E.inOutSine(L.seg(t, T_LAND, DUR));
      const zoom = lerp(1, 2.5, pk);
      const pose = glyphPose(GLYPH.X, GLYPH.Y, 1, u);
      const tx = lerp(pose.ex, 760, pk), ty = lerp(pose.ey, 470, pk);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(zoom, zoom);
      ctx.translate(-pose.ex, -pose.ey);
      // rewind streaks: faint arcs trailing the Earth and Mars while the orbits spin backwards
      const rw = L.seg(t, T_REW, T_REW + 0.375) * (1 - L.seg(t, T_LAND - 0.375, T_LAND));
      if (rw > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const r = [GLYPH.EARTH_ORBIT, GLYPH.MARS_ORBIT, GLYPH.GUIDE_R - 40][i];
          const a = [pose.ea, pose.ma, pose.ea * 0.5][i];
          ctx.beginPath();
          ctx.arc(GLYPH.X, GLYPH.Y, r, a, a + 1.4 - i * 0.3);
          ctx.strokeStyle = [P.schemOxygen, P.schemMars, P.lavender][i];
          ctx.globalAlpha = rw * [0.35, 0.3, 0.18][i];
          ctx.lineWidth = [5, 6, 2][i];
          ctx.stroke();
        }
        ctx.restore();
      }
      // Earth swells a little as the push lands
      const earthK = 1 + 0.4 * E.outBack(L.seg(t, T_LAND, T_LAND + 0.375));
      drawGlyph(ctx, L, { x: GLYPH.X, y: GLYPH.Y, s: 1, act: 1, u, bi, earth: earthK });
      // landing marks on the Earth: magenta change ring (12 frames) and a lasting lavender double ring
      if (t >= T_LAND) {
        const f = clamp((t - T_LAND) * 24 / 12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(pose.ex, pose.ey, 14 + 34 * E.outExpo(f), 0, Math.PI * 2);
        ctx.strokeStyle = P.magenta;
        ctx.globalAlpha = 1 - f;
        ctx.lineWidth = 3 / zoom;
        ctx.stroke();
        const g = E.outBack(L.seg(L.onTwos(t), T_LAND, T_LAND + 0.375));
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = P.lavender;
        ctx.lineWidth = 2.5 / zoom;
        ctx.beginPath();
        ctx.arc(pose.ex, pose.ey, 24 * g, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.arc(pose.ex, pose.ey, 20 * g, 0, Math.PI * 2);
        ctx.stroke();
        // radial ticks around the Earth, one quarter more per beat after landing
        const q = L.seg(L.onTwos(t), T_LAND + 0.75, T_LAND + 0.75 * 3);
        ctx.globalAlpha = 1;
        L.ticks(ctx, pose.ex, pose.ey, { r: 30, n: 24, len: 6, major: 6, majorLen: 10, alpha: 0.6, width: 1.5 / zoom, p: q, boil: bi });
      }
      ctx.restore();

      // year: writes on T 0.75, counts down 2030 -> 2023 on twos during the rewind
      const yr = Math.round(2030 - 7 * E.inOutCubic(L.seg(L.onTwos(t), T_REW, T_LAND)));
      const wp = L.seg(t, T_YEAR, T_YEAR + 0.375);
      const ya = 1 - 0.6 * pk;
      if (wp > 0) {
        ctx.globalAlpha = ya;
        L.text(ctx, String(yr), 960, 760, { size: 64, weight: 300, align: 'center', color: P.lavender, alpha: 0.85, p: wp, tracking: 4 });
        // year ruler 2023..2030 under the number, drawn on with the year, marker slides with the count
        const x0 = 820, x1 = 1100, y = 792;
        ctx.globalAlpha = ya;
        L.ticks(ctx, x0, y, { kind: 'linear', length: x1 - x0, angle: 0, n: 7, len: 8, major: 7, majorLen: 16, alpha: 0.6, p: L.seg(t, T_YEAR, T_YEAR + 0.75), side: 1 });
        const mx = x0 + (x1 - x0) * ((yr - 2023) / 7);
        ctx.fillStyle = yr === 2023 && t >= T_LAND ? P.magenta : P.lineWhite;
        ctx.globalAlpha = ya * 0.9 * wp;
        ctx.beginPath();
        ctx.moveTo(mx, y - 4);
        ctx.lineTo(mx - 7, y - 14);
        ctx.lineTo(mx + 7, y - 14);
        ctx.closePath();
        ctx.fill();
      }
      // a beat pip on the bracket each beat before the rewind (something changes each beat)
      if (t < T_REW) {
        const nb = Math.floor(t / 0.75);
        for (let i = 0; i <= nb; i++) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = P.lavender;
          ctx.beginPath();
          ctx.arc(1180 + i * 16, 744, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // corner glyph fades in as the large one leaves the frame
      const ca = L.seg(t, T_LAND + 0.75, T_LAND + 1.5);
      if (ca > 0) {
        ctx.globalAlpha = 1;
        drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[3], u: 0, bi, alpha: ca });
      }
      ctx.globalAlpha = 1;
    },
  });
})();
