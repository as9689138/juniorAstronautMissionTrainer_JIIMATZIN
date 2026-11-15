/*
 * 19 olas-del-sol : The sun's dancing waves
 * Global T 91.5 to 96 (4.5 s, 6 beats), schematic, hard cut in, G4 holds into 20.
 *
 * Layers, back to front:
 *   1. blueprint plate (guide circles centred on the sun)
 *   2. starfield: tiny crossed ticks, twinkling on the boil
 *   3. dipole magnetic field lines (lavender, faint) and their travelling pulses
 *   4. wave rings: wavy rings leave the limb on every beat and expand (24 fps)
 *   5. sun interior: soft glow, hex granulation lattice, two active-region glow dots
 *   6. G4 double lavender outline, r 150 at (960, 400): screen-fixed match-cut contract
 *   7. prominence loops at the limb, arcing up on twos (lineWhite strands), footpoint glows
 *   8. measurement: radial tick crown, diameter bracket, two callout circles with leaders
 *   9. magenta flare on beat T 93.75 (12 frames)
 *  10. progress glyph (Act 3: three quarters lit), screen-fixed
 */
(function () {
  'use strict';
  const ID = 'olas-del-sol';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const BEAT = 0.75;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // G4 (storyboard Shared geometry): the sun disc. Do not move.
  const SX = 960, SY = 400, SR = 150, SR_IN = 141;

  // Beats, shot-local (global in comments)
  const B0 = 0.0;   // T 91.5  cut in, rings already in flight
  const B1 = 0.75;  // T 92.25
  const B2 = 1.5;   // T 93.0
  const B3 = 2.25;  // T 93.75 magenta flare
  const B4 = 3.0;   // T 94.5
  const B5 = 3.75;  // T 95.25
  const FLARE = B3;

  // Prominence loops: centre angle, half-span (rad), height, beat it arcs up on, strands
  const LOOPS = [
    { a: -136 * DEG, d: 17 * DEG, h: 60, on: -1, n: 4 },
    { a: -64 * DEG, d: 21 * DEG, h: 78, on: B1, n: 5 },
    { a: -6 * DEG, d: 12 * DEG, h: 40, on: -1, n: 3 },
    { a: 38 * DEG, d: 19 * DEG, h: 66, on: B2, n: 4 },
    { a: 100 * DEG, d: 12 * DEG, h: 38, on: B4, n: 3 },
    { a: 152 * DEG, d: 20 * DEG, h: 72, on: B3, n: 5 },
    { a: 202 * DEG, d: 11 * DEG, h: 44, on: B0, n: 3 },
  ];
  const FLARE_LOOP = 1; // the loop at -62 deg erupts on the flare beat

  // Callouts (screen-fixed, inside the safe area)
  const CL = { x: 420, y: 610, r: 84 };   // left: the wave, a scrolling sine
  const CRT = { x: 1500, y: 610, r: 84 }; // right: one loop magnified

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(sd('stars'));
    const stars = [];
    let guard = 0;
    while (stars.length < 120 && guard++ < 4000) {
      const x = r.range(40, 1880), y = r.range(30, 850);
      if (Math.hypot(x - SX, y - SY) < 300) continue;
      if (x > 1620 && y < 260) continue;
      if (Math.hypot(x - CL.x, y - CL.y) < CL.r + 20) continue;
      if (Math.hypot(x - CRT.x, y - CRT.y) < CRT.r + 20) continue;
      stars.push({ x, y, s: r.range(3, 9), big: r.chance(0.12), ph: r.int(0, 999) });
    }
    // dipole field lines r = Lk * sin^2(theta), theta colatitude, axis vertical
    const field = [];
    for (const Lk of [230, 300, 390, 500, 640, 800]) {
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 140; i++) {
          const th = 0.02 + (i / 140) * (Math.PI - 0.04);
          const rr = Lk * Math.sin(th) * Math.sin(th);
          if (rr < SR + 2) continue;
          pts.push([SX + side * rr * Math.sin(th), SY - rr * Math.cos(th)]);
        }
        if (pts.length > 4) field.push({ pts, Lk, side });
      }
    }
    // dust specks inside the disc for granulation
    const gran = [];
    const rg = LIB.rng(sd('gran'));
    for (let i = 0; i < 90; i++) {
      const a = rg() * TAU, rr = Math.sqrt(rg()) * (SR_IN - 10);
      gran.push([SX + Math.cos(a) * rr, SY + Math.sin(a) * rr, rg.range(0.8, 1.8)]);
    }
    GEO = { stars, field, gran };
    return GEO;
  }

  // ---------- helpers ----------
  function strokePts(ctx, pts, color, alpha, width, closed, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    LIB.tracePath(ctx, pts, !!closed);
    ctx.stroke();
    ctx.restore();
  }

  function arcStroke(ctx, x, y, r, color, alpha, width, a0 = 0, a1 = TAU, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
    ctx.restore();
  }

  // wavy ring: radius R plus a two-mode ripple that slides with time
  function waveRingPts(R, amp, phase, seed) {
    const pts = [];
    const n = Math.max(90, Math.round(R * 0.9));
    const k1 = 24, k2 = 9;
    const s = (seed % 100) / 100;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = R + amp * (0.85 * Math.sin(k1 * a + phase) + 0.2 * Math.sin(k2 * a - phase * 1.3 + s * TAU));
      pts.push([SX + Math.cos(a) * rr, SY + Math.sin(a) * rr]);
    }
    return pts;
  }

  // a prominence arch: feet on the limb at a +- d, apex height h; strand k shrinks inward
  function loopPts(a, d, h, k, nStr, grow) {
    // an arcade: strands root on the limb arc, shifted along it, nested in height
    const pts = [];
    const mid = (nStr - 1) / 2;
    const off = (k - mid) * 0.04;
    const dd = d * (1 - Math.abs(k - mid) * 0.12);
    const hh = h * (1 - Math.abs(k - mid) * 0.2) * grow;
    const lean = 0.18 * Math.sin(a * 3.1 + 0.7);
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const s = Math.sin(Math.PI * u);
      const ang = a + off - dd + 2 * dd * u + lean * dd * s * s;
      const rr = SR + hh * Math.pow(s, 0.85);
      pts.push([SX + Math.cos(ang) * rr, SY + Math.sin(ang) * rr]);
    }
    return pts;
  }

  // the progress glyph, G1 reduced to (1720, 170), r 56 (scale 56/220)
  function progressGlyph(ctx, L, act) {
    const cx = 1720, cy = 170, s = 56 / 220;
    ctx.save();
    arcStroke(ctx, cx, cy, 220 * s, P.lavender, 0.45, 1);
    arcStroke(ctx, cx, cy, 110 * s, P.lavender, 0.5, 1);
    arcStroke(ctx, cx, cy, 220 * s, P.schemMars, 1, 2.5, -Math.PI / 2, -Math.PI / 2 + act * TAU);
    L.ticks(ctx, cx, cy, { r: 220 * s + 4, n: 24, len: 4, alpha: 0.35, width: 1 });
    const ex = cx + Math.cos(-30 * DEG) * 110 * s, ey = cy + Math.sin(-30 * DEG) * 110 * s;
    arcStroke(ctx, ex, ey, 26 * s, P.lavender, 0.45, 1);
    ctx.fillStyle = P.schemOxygen;
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(3, 9 * s), 0, TAU);
    ctx.fill();
    const mx = cx + Math.cos(200 * DEG) * 220 * s, my = cy + Math.sin(200 * DEG) * 220 * s;
    ctx.fillStyle = P.schemMars;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(3.5, 11 * s), 0, TAU);
    ctx.fill();
    L.glowDot(ctx, cx, cy, 3, { rays: 0, glow: 4, seed: sd('glyph') });
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const G = geo();
      const hit = (a, frames, e, lead = 1) =>
        t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames));

      // 1. blueprint plate
      L.blueprint(ctx, { center: [SX, SY], seed: sd('plate') % 1000 });
      L.guideCircle(ctx, SX, SY, 220, { alpha: 0.16, cross: 0 });
      L.guideCircle(ctx, SX, SY, 330, { alpha: 0.13, dash: [6, 10] });
      L.guideCircle(ctx, SX, SY, 470, { alpha: 0.12 });
      // crosshair through the sun centre (long construction lines)
      strokePts(ctx, [[SX - 760, SY], [SX + 760, SY]], P.lavender, 0.12, 1);
      strokePts(ctx, [[SX, 40], [SX, 840]], P.lavender, 0.12, 1);

      // 2. starfield ticks
      ctx.save();
      ctx.strokeStyle = P.lineWhite;
      ctx.lineCap = 'round';
      for (const s of G.stars) {
        const tw8 = 0.35 + 0.5 * LIB.noise1(bi * 0.37 + s.ph, 11) * 0.5 + 0.25;
        ctx.globalAlpha = clamp(tw8, 0.15, 0.85) * (s.big ? 1 : 0.7);
        ctx.lineWidth = s.big ? 1.5 : 1;
        const l = s.big ? s.s + 3 : s.s * 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - l, s.y); ctx.lineTo(s.x + l, s.y);
        ctx.moveTo(s.x, s.y - l); ctx.lineTo(s.x, s.y + l);
        ctx.stroke();
        if (s.big) {
          ctx.globalAlpha *= 0.6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.6, 0, TAU);
          ctx.fillStyle = P.lineWhite;
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. dipole field lines with travelling pulses (24 fps)
      for (const f of G.field) {
        strokePts(ctx, f.pts, P.lavender, f.Lk > 600 ? 0.1 : 0.17, 1);
        const n = f.pts.length;
        const u = ((t / 3 + (f.Lk / 900) + (f.side > 0 ? 0.5 : 0)) % 1 + 1) % 1;
        const q = f.pts[Math.min(n - 1, Math.floor(u * n))];
        ctx.save();
        ctx.globalAlpha = 0.55 * Math.sin(Math.PI * u);
        ctx.fillStyle = P.paleBlue;
        ctx.beginPath();
        ctx.arc(q[0], q[1], 2.4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 4. wave rings: one leaves the limb on every beat (plus two already in flight at frame 0)
      const LIFE = 2.6;
      for (let k = -3; k <= 5; k++) {
        const b = k * BEAT;
        const age = t - b + FR; // visible on the beat frame
        if (age <= 0 || age > LIFE) continue;
        const u = age / LIFE;
        const R = SR + 4 + 640 * E.outCubic(u);
        const amp = lerp(2, 7, Math.min(1, u * 2.5)) * (1 - u * 0.3);
        const alpha = Math.pow(1 - u, 1.6) * 0.9;
        const pts = waveRingPts(R, amp, t * 2.2 + k * 1.7, sd('ring', k));
        strokePts(ctx, pts, P.lavender, alpha, u < 0.2 ? 2.5 : 1.8);
        // a quieter echo ring just behind it
        if (u > 0.06) strokePts(ctx, waveRingPts(R - 16 - 20 * u, amp * 0.6, t * 2.2 + k * 1.7 + 0.9, sd('ring2', k)), P.lavender, alpha * 0.4, 1);
        // tick marks where the newest ring crosses the axes
        if (u < 0.5) {
          ctx.save();
          ctx.strokeStyle = P.lineWhite;
          ctx.globalAlpha = alpha * 0.8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2 + Math.PI / 4;
            ctx.moveTo(SX + Math.cos(a) * (R - 8), SY + Math.sin(a) * (R - 8));
            ctx.lineTo(SX + Math.cos(a) * (R + 8), SY + Math.sin(a) * (R + 8));
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. sun interior
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(SX, SY, SR * 0.2, SX, SY, SR * 2.2);
      const pulse = 0.9 + 0.1 * Math.cos(((t % BEAT) / BEAT) * TAU);
      halo.addColorStop(0, LIB.rgba(P.glow, 0.16 * pulse));
      halo.addColorStop(0.45, LIB.rgba(P.glow, 0.08 * pulse));
      halo.addColorStop(1, LIB.rgba(P.glow, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(SX - SR * 2.2, SY - SR * 2.2, SR * 4.4, SR * 4.4);
      ctx.restore();
      const disc = (c) => { c.arc(SX, SY, SR_IN - 1, 0, TAU); };
      L.hexLattice(ctx, disc, {
        r: 17, alpha: 0.3, seed: sd('hex'), bounds: [SX - SR, SY - SR, SR * 2, SR * 2],
        cellFn: (cx, cy, i, j) => {
          const d = Math.hypot(cx - SX, cy - SY) / SR_IN;
          const lit = LIB.noise2(cx * 0.02 + tw * 0.6, cy * 0.02, 33);
          if (lit > 0.35) return { fill: P.lavender, alpha: 0.08 + 0.06 * (1 - d) };
          return true;
        },
      });
      ctx.save();
      ctx.fillStyle = P.lavender;
      for (const g of G.gran) {
        ctx.globalAlpha = 0.25 + 0.25 * LIB.noise1(bi * 0.5 + g[0], 4);
        ctx.beginPath();
        ctx.arc(g[0], g[1], g[2], 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      // limb-darkening rings inside the disc
      arcStroke(ctx, SX, SY, SR_IN - 22, P.lavender, 0.14, 1);
      arcStroke(ctx, SX, SY, SR_IN - 48, P.lavender, 0.1, 1, 0, TAU, [3, 7]);
      // active regions
      L.glowDot(ctx, SX - 46, SY - 30, 7, { rays: 8, rayLen: 2.4, glow: 5, seed: sd('ar1'), intensity: 0.8 });
      L.glowDot(ctx, SX + 52, SY + 44, 5, { rays: 0, glow: 5, seed: sd('ar2'), intensity: 0.7 });

      // 6. G4 double outline (exact, screen-fixed)
      arcStroke(ctx, SX, SY, SR, P.lavender, 0.85, 2.5);
      arcStroke(ctx, SX, SY, SR_IN, P.lavender, 0.5, 1.5);

      // 7. prominence loops, arcing up on twos
      for (let li = 0; li < LOOPS.length; li++) {
        const lp = LOOPS[li];
        let grow;
        if (lp.on < 0) grow = 1;
        else grow = tw < lp.on ? 0 : [0.35, 0.62, 0.84, 1.04, 1][Math.min(4, Math.floor((tw - lp.on) * 12 + 1e-6))];
        if (grow <= 0) {
          // footpoints wait as faint dots
          const fx = SX + Math.cos(lp.a) * SR, fy = SY + Math.sin(lp.a) * SR;
          L.glowDot(ctx, fx, fy, 3, { rays: 0, glow: 4, seed: sd('wait', li), intensity: 0.5 });
          continue;
        }
        // breathing on twos
        const breathe = 1 + 0.06 * Math.sin(tw * 4.2 + li * 1.3);
        let h = lp.h * breathe;
        let lift = 0;
        if (li === FLARE_LOOP && t >= FLARE) {
          // erupts: the loop swells and detaches outward
          const e = E.outCubic(clamp((tw - FLARE) / 1.6));
          h *= 1 + 0.9 * e;
          lift = e;
        }
        for (let k = 0; k < lp.n; k++) {
          const pts = loopPts(lp.a, lp.d, h, k, lp.n, grow);
          const outer = Math.abs(k - (lp.n - 1) / 2) < 0.6;
          strokePts(ctx, pts, P.lineWhite, outer ? 0.85 : 0.42, outer ? 1.8 : 1.1);
        }
        if (lift > 0) {
          // a detached plasma blob rides outward along the loop axis
          const rr = SR + h * 1.05 + 40 * lift;
          strokePts(ctx, L.ellipsePts(SX + Math.cos(lp.a) * rr, SY + Math.sin(lp.a) * rr, 14 + 18 * lift, 8 + 10 * lift, 28, lp.a + Math.PI / 2), P.lineWhite, 0.55 * (1 - lift * 0.5), 1.2, true);
        }
        // footpoint glows
        for (const s of [-1, 1]) {
          const a = lp.a + s * lp.d;
          L.glowDot(ctx, SX + Math.cos(a) * SR, SY + Math.sin(a) * SR, 3.2, { rays: 0, glow: 5, seed: sd('foot', li, s), intensity: 0.75 });
        }
      }

      // 8. measurement and callouts
      L.ticks(ctx, SX, SY, { r: SR + 14, n: 72, len: 7, major: 6, majorLen: 15, alpha: 0.45, width: 1 });
      L.bracket(ctx, SX - SR, SY + SR + 70, SX + SR, SY + SR + 70, { alpha: 0.6, p: 1 });
      strokePts(ctx, [[SX - SR, SY + 8], [SX - SR, SY + SR + 82]], P.lavender, 0.16, 1, false, [4, 6]);
      strokePts(ctx, [[SX + SR, SY + 8], [SX + SR, SY + SR + 82]], P.lavender, 0.16, 1, false, [4, 6]);

      // left callout: the wave, a sine sliding at the ring speed (24 fps)
      {
        const c = CL;
        ctx.save();
        ctx.fillStyle = P.navyDeep;
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
        ctx.restore();
        arcStroke(ctx, c.x, c.y, c.r, P.lavender, 0.85, 2.5);
        arcStroke(ctx, c.x, c.y, c.r - 9, P.lavender, 0.5, 1.5);
        ctx.save();
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 12, 0, TAU); ctx.clip();
        for (let g = -3; g <= 3; g++) {
          strokePts(ctx, [[c.x + g * 22, c.y - c.r], [c.x + g * 22, c.y + c.r]], P.grid, 0.5, 1);
          strokePts(ctx, [[c.x - c.r, c.y + g * 22], [c.x + c.r, c.y + g * 22]], P.grid, 0.5, 1);
        }
        const sine = [], sine2 = [];
        for (let i = 0; i <= 80; i++) {
          const x = c.x - c.r + (i / 80) * c.r * 2;
          sine.push([x, c.y + Math.sin((x - c.x) * 0.085 - t * 6.2) * 30]);
          sine2.push([x, c.y + Math.sin((x - c.x) * 0.085 - t * 6.2 + 1.2) * 18]);
        }
        strokePts(ctx, sine2, P.lavender, 0.35, 1);
        strokePts(ctx, sine, P.lineWhite, 0.85, 1.8);
        ctx.restore();
        // wavelength bracket inside the callout
        const lam = TAU / 0.085;
        L.bracket(ctx, c.x - lam / 2, c.y + 50, c.x + lam / 2, c.y + 50, { alpha: 0.5, cap: 10, width: 1 });
        // leader to the nearest ring zone
        const lx = SX + Math.cos(Math.PI * 0.86) * (SR + 70), ly = SY + Math.sin(Math.PI * 0.86) * (SR + 70);
        strokePts(ctx, [[c.x + c.r * 0.8, c.y - c.r * 0.6], [lerp(c.x, lx, 0.6), ly + 30], [lx, ly]], P.lavender, 0.4, 1);
        ctx.save(); ctx.fillStyle = P.lavender; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(lx, ly, 3, 0, TAU); ctx.fill(); ctx.restore();
      }

      // right callout: one prominence loop magnified, with field arrows
      {
        const c = CRT;
        ctx.save();
        ctx.fillStyle = P.navyDeep;
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
        ctx.restore();
        arcStroke(ctx, c.x, c.y, c.r, P.lavender, 0.85, 2.5);
        arcStroke(ctx, c.x, c.y, c.r - 9, P.lavender, 0.5, 1.5);
        ctx.save();
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 12, 0, TAU); ctx.clip();
        // limb as a flat-ish arc at the bottom
        const base = c.y + 40;
        strokePts(ctx, [[c.x - c.r, base + 8], [c.x, base - 2], [c.x + c.r, base + 8]], P.lavender, 0.7, 1.5);
        const breathe = 1 + 0.08 * Math.sin(tw * 4.2);
        for (let k = 0; k < 5; k++) {
          const pts = [];
          const w = 46 - k * 7, hh = (64 - k * 9) * breathe;
          for (let i = 0; i <= 30; i++) {
            const u = i / 30;
            pts.push([c.x - w + 2 * w * u, base - Math.pow(Math.sin(Math.PI * u), 0.8) * hh]);
          }
          strokePts(ctx, pts, P.lineWhite, k === 0 ? 0.85 : 0.4, k === 0 ? 1.8 : 1);
        }
        // arrowheads travelling along the outer strand (on twos)
        for (let j = 0; j < 3; j++) {
          const u = ((tw * 0.7 + j / 3) % 1);
          const x = c.x - 46 + 92 * u;
          const y = base - Math.pow(Math.sin(Math.PI * u), 0.8) * 64 * breathe;
          ctx.save();
          ctx.fillStyle = P.paleBlue;
          ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        const la = LOOPS[3];
        const lx = SX + Math.cos(la.a) * (SR + la.h * 0.7), ly = SY + Math.sin(la.a) * (SR + la.h * 0.7);
        strokePts(ctx, [[lx, ly], [lerp(lx, c.x, 0.5), c.y - c.r - 10], [c.x - c.r * 0.7, c.y - c.r * 0.7]], P.lavender, 0.4, 1);
        ctx.save(); ctx.fillStyle = P.lavender; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(lx, ly, 3, 0, TAU); ctx.fill(); ctx.restore();
        L.ticks(ctx, c.x, c.y, { r: c.r + 6, n: 36, len: 5, alpha: 0.35, width: 1 });
      }
      L.ticks(ctx, CL.x, CL.y, { r: CL.r + 6, n: 36, len: 5, alpha: 0.35, width: 1 });

      // vertical ruler at the left edge, a tick scale for the ring radii
      L.ticks(ctx, 150, 140, { kind: 'linear', length: 600, angle: Math.PI / 2, n: 30, len: 10, major: 5, majorLen: 22, side: 1, alpha: 0.4, width: 1 });

      // 9. magenta flare on the flare beat: ring at the erupting loop apex, 12 frames
      if (t >= FLARE - FR && t < FLARE + 12 * FR) {
        const u = hit(FLARE, 12, E.outExpo);
        const lp = LOOPS[FLARE_LOOP];
        const rr = SR + lp.h * 1.2;
        const fx = SX + Math.cos(lp.a) * rr, fy = SY + Math.sin(lp.a) * rr;
        arcStroke(ctx, fx, fy, 10 + 70 * u, P.magenta, 1 - u, 3);
        arcStroke(ctx, SX, SY, SR + 6 + 30 * u, P.magenta, (1 - u) * 0.6, 3, lp.a - 0.5, lp.a + 0.5);
      }

      // 10. progress glyph, Act 3
      progressGlyph(ctx, L, 0.75);
    },
  });
})();
