// 05 sistemas-encendidos — Systems on. T 31.5 to 36, schematic.
// Base Marte Uno plan from above (art bible §10.10): seven double-outlined rooms joined by corridors; rooms light
// one per beat (Pasillo 31.5, Mando 32.25, Energía 33.0, Soporte vital 33.75, Invernadero + Comunicaciones 34.5,
// Refugio 35.25) with their resource glow dot and a magenta ring. "2030" under the plan.
// Progress glyph: GLYPH / glyphPose / drawGlyph copied verbatim from 01-ano-2030.js (canonical), small form, full.
(function () {
  'use strict';
  const ID = 'sistemas-encendidos';
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
  // Base Marte Uno plan (art bible §10.10), seen from above, centred. Rooms light one per beat.
  // Local timing (shot starts at global T 31.5). Beat 0.75 s.
  const DUR = 4.5;
  const TAU = Math.PI * 2;
  // [name, cx, cy, w, h, colour key, light time]
  const ROOMS = [
    ['pasillo', 960, 440, 380, 110, 'lineWhite', 0.0],
    ['mando', 960, 215, 280, 130, 'commandPink', 0.75],
    ['energia', 560, 270, 250, 150, 'energyYellow', 1.5],
    ['soporte', 560, 610, 270, 150, 'oxygenCyan', 2.25],
    ['invernadero', 1360, 610, 300, 160, 'oxygenCyan', 3.0],
    ['comunicaciones', 1360, 270, 250, 150, 'commsGreen', 3.0],
    ['refugio', 960, 670, 300, 110, 'shieldViolet', 3.75],
  ];
  // corridors (centre polylines from the Pasillo out to each room), indexed like ROOMS
  const CORR = [
    null,
    [[960, 385], [960, 280]],
    [[770, 440], [560, 440], [560, 345]],
    [[770, 440], [560, 440], [560, 535]],
    [[1150, 440], [1360, 440], [1360, 530]],
    [[1150, 440], [1360, 440], [1360, 345]],
    [[960, 495], [960, 615]],
  ];
  const CW = 34; // corridor width

  function polyLen(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }
  function polyAt(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= l) {
        const k = d / l;
        return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
      }
      d -= l;
    }
    return pts[pts.length - 1];
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function line(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
  }

  FILM.scene({
    id: ID,
    draw(ctx, t0, info) {
      const L = info.lib;
      const t = clamp(t0, 0, DUR - 1e-4);
      const tw = L.onTwos(t);
      const bi = L.boil(L.T);
      L.blueprint(ctx, { center: [960, 440] });
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter';

      // site outline: large faint rounded boundary + bracket across the plan
      ctx.strokeStyle = P.lavender;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 10]);
      rrect(ctx, 380, 120, 1160, 650, 60);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      L.bracket(ctx, 430, 790, 1490, 790, { alpha: 0.6 });

      // corridors: wide lavender stroke, then a dark core -> clean double lines with mitred joints
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < CORR.length; i++) {
          line(ctx, CORR[i]);
          ctx.strokeStyle = pass ? P.navyDeep : P.lavender;
          ctx.globalAlpha = pass ? 1 : 0.6;
          ctx.lineCap = 'butt';
          ctx.lineWidth = pass ? CW - 3 : CW;
          ctx.stroke();
        }
      }
      // corridor centre dashes, and the power pulse that runs out from the Pasillo when a room lights
      for (let i = 1; i < CORR.length; i++) {
        const lit = t >= ROOMS[i][6];
        const col = P[ROOMS[i][5]];
        line(ctx, CORR[i]);
        ctx.setLineDash([6, 10]);
        ctx.strokeStyle = lit ? col : P.lavender;
        ctx.globalAlpha = lit ? 0.7 : 0.25;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        const t1 = ROOMS[i][6] - 0.375;
        const k = L.seg(t, t1, ROOMS[i][6], 'inQuad');
        if (k > 0 && k < 1) {
          const len = polyLen(CORR[i]);
          const p = polyAt(CORR[i], len * k);
          ctx.globalAlpha = 1;
          L.glowDot(ctx, p[0], p[1], 5, { color: col, rays: 0, boil: bi, seed: 30 + i });
        }
      }

      // rooms
      for (let i = 0; i < ROOMS.length; i++) {
        const [name, cx, cy, w, h, ck, tl] = ROOMS[i];
        const col = P[ck];
        const lit = t >= tl;
        const lk = lit ? E.outCubic(L.seg(tw, tl, tl + 0.25)) : 0;
        const x = cx - w / 2, y = cy - h / 2;
        // floor: navyDeep, warms a little toward the room colour when lit
        rrect(ctx, x, y, w, h, 22);
        ctx.fillStyle = P.navyDeep;
        ctx.globalAlpha = 1;
        ctx.fill();
        if (lk > 0) {
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.07 * lk;
          ctx.fill();
        }
        // interior structure: rectangular cells (machines), 1 px lavender
        ctx.save();
        rrect(ctx, x + 9, y + 9, w - 18, h - 18, 14);
        ctx.clip();
        const cell = new Path2D();
        const sp = 30 + ((L.hash(ID, name) >>> 0) % 3) * 6;
        for (let gx = x + sp; gx < x + w; gx += sp) { cell.moveTo(gx, y); cell.lineTo(gx, y + h); }
        for (let gy = y + sp * 0.8; gy < y + h; gy += sp * 0.8) { cell.moveTo(x, gy); cell.lineTo(x + w, gy); }
        ctx.strokeStyle = lit ? col : P.lavender;
        ctx.globalAlpha = lit ? 0.22 + 0.1 * lk : 0.16;
        ctx.lineWidth = 1;
        ctx.stroke(cell);
        // a couple of fixtures per room (racks), seeded
        const r = L.rng(L.hash(ID, name, 'fx'));
        for (let k = 0; k < 3; k++) {
          const fw = 30 + r() * 40, fh = 14 + r() * 12;
          const fx = x + 24 + r() * (w - 48 - fw), fy = y + 22 + r() * (h - 44 - fh);
          ctx.globalAlpha = lit ? 0.6 : 0.35;
          ctx.strokeStyle = P.lavender;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(fx, fy, fw, fh);
        }
        ctx.restore();
        // double outline: outer 2.5 px lavender 85 %, inner 1.5 px 50 %, 9 px inside
        rrect(ctx, x, y, w, h, 22);
        ctx.strokeStyle = lit ? L.mix(P.lavender, col, 0.35 * lk) : P.lavender;
        ctx.globalAlpha = lit ? 0.85 : 0.55;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        rrect(ctx, x + 9, y + 9, w - 18, h - 18, 14);
        ctx.globalAlpha = lit ? 0.5 : 0.3;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // corner ticks
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = P.lineWhite;
        ctx.lineWidth = 1.5;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const ax = cx + sx * (w / 2 + 8), ay = cy + sy * (h / 2 + 8);
          ctx.beginPath();
          ctx.moveTo(ax - sx * 14, ay);
          ctx.lineTo(ax, ay);
          ctx.lineTo(ax, ay - sy * 14);
          ctx.stroke();
        }
        // resource glow dot (unlit: a dim socket)
        const dx = cx, dy = cy;
        if (!lit) {
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = P.lavender;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(dx, dy, 7, 0, TAU);
          ctx.stroke();
        } else {
          ctx.globalAlpha = 1;
          L.glowDot(ctx, dx, dy, 9 * (0.6 + 0.4 * lk), { color: col, rays: 12, rayLen: 2.6, boil: bi, seed: 50 + i, rot: i * 0.4 });
          ctx.globalAlpha = 0.6 * lk;
          L.ticks(ctx, dx, dy, { r: 26, n: 12, len: 6, alpha: 0.6, p: lk, boil: bi });
          // magenta change ring, 12 frames
          const f = clamp((t - tl) * 2);
          if (f < 1) {
            ctx.globalAlpha = 1 - f;
            ctx.strokeStyle = P.magenta;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(dx, dy, 18 + 60 * E.outExpo(f), 0, TAU);
            ctx.stroke();
          }
        }
      }

      // 2030 small under the plan
      ctx.globalAlpha = 1;
      L.text(ctx, '2030', 960, 828, { size: 30, align: 'center', color: P.lavender, alpha: 0.85, tracking: 3 });
      ctx.restore();

      // progress glyph, small, full
      ctx.globalAlpha = 1;
      drawGlyph(ctx, L, { x: GLYPH.SX, y: GLYPH.SY, s: GLYPH.SMALL, act: GLYPH.ACT[3], u: 0, bi });
      ctx.globalAlpha = 1;
    },
  });
})();
