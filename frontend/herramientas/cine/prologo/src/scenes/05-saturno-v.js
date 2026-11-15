/*
 * 05 saturno-v : Saturn V lifts off.  T 24.0 to 27.0, illustrated, hard cut.
 * Side-on Saturn V (rocketWhite with rocketBlack roll bands, art bible 10.3, height:width ~ 11:1),
 * 620 px tall on the left third (x 640), launch tower on its right, dawn stripes (Act 1, stripeApricot).
 * Layers back to front: 1 stripes, 2 dusk ground, 3 tower, 4 rocket, 5 flame, 6 smoke, 7 annBlue trajectory.
 * Beats: T 24.0 ignition flash; T 24.75 swing arms retract, rise starts (260 px inQuad to T 27), trajectory
 * draws on; each beat a new smoke billow. Shake +-3 px at 12 Hz T 24 to 25.5.
 */
(function () {
  'use strict';
  const ID = 'saturno-v';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_IGN = 0; //    T 24.0
  const B_LIFT = 0.75; // T 24.75
  const RX = 640, TOP = 120, H = 620, BASE = TOP + H; // rocket base y 740
  const W = 58;

  // rocket profile: [fraction from base, half width]
  const PROF = [
    [0, W / 2], [0.383, W / 2], [0.42, W / 2], [0.66, W / 2], [0.69, W * 0.33], [0.85, W * 0.33],
    [0.9, W * 0.24], [0.93, W * 0.24], [0.958, W * 0.06], [0.958, 0],
  ];
  const yOf = (f) => BASE - f * H;

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const right = PROF.map(([f, w]) => [RX + w, yOf(f)]);
    const left = PROF.slice().reverse().map(([f, w]) => [RX - w, yOf(f)]);
    const body = right.concat(left);
    const r = LIB.rng(sd('smoke'));
    const puffs = [];
    for (let wave = 0; wave < 4; wave++) {
      for (let i = 0; i < 9; i++) {
        const side = i % 2 ? 1 : -1;
        puffs.push({ wave, x: RX + side * r.range(10, 60), y: BASE + r.range(10, 50), dx: side * r.range(80, 360) * (1 + wave * 0.25), dy: -r.range(0, 90), r: r.range(34, 70), seed: sd('p', wave, i) });
      }
    }
    GEO = { body, puffs };
    return GEO;
  }

  function band(ctx, L, f0, f1, hw, seed, roll) {
    const y0 = yOf(f1), y1 = yOf(f0);
    ctx.save();
    ctx.fillStyle = P.rocketBlack;
    if (roll) {
      ctx.fillRect(RX - hw, y0, hw, y1 - y0); // roll pattern: half black, half white
    } else ctx.fillRect(RX - hw, y0, hw * 2, y1 - y0);
    ctx.restore();
    L.inkLine(ctx, RX - hw, y0, RX + hw, y0, { width: 1.6, color: P.inkSoft, seed, taper: 0 });
    L.inkLine(ctx, RX - hw, y1, RX + hw, y1, { width: 1.6, color: P.inkSoft, seed: seed + 1, taper: 0 });
  }

  function drawRocket(ctx, L, g, flick) {
    // fins and engine bells
    for (const s of [-1, 1]) L.inkPath(ctx, [[RX + s * W * 0.5, BASE - 40], [RX + s * W * 0.95, BASE - 6], [RX + s * W * 0.95, BASE + 6], [RX + s * W * 0.5, BASE + 4]], { closed: true, fill: P.rocketBlack, width: 2.4, seed: sd('fin', s), smooth: false });
    for (const dx of [-18, 0, 18]) L.inkPath(ctx, [[RX + dx - 7, BASE], [RX + dx + 7, BASE], [RX + dx + 10, BASE + 18], [RX + dx - 10, BASE + 18]], { closed: true, fill: P.rocketBlack, width: 2, seed: sd('bell', dx), smooth: false });
    L.inkPath(ctx, g.body, { closed: true, fill: P.rocketWhite, width: 4.5, seed: sd('body'), smooth: false, double: true });
    band(ctx, L, 0.02, 0.13, W / 2, sd('b1'), true);
    band(ctx, L, 0.33, 0.383, W / 2, sd('b2'), true);
    band(ctx, L, 0.40, 0.415, W / 2, sd('b3'), false);
    band(ctx, L, 0.69, 0.74, W * 0.33, sd('b4'), true);
    band(ctx, L, 0.84, 0.85, W * 0.33, sd('b5'), false);
    // seams
    for (const f of [0.2, 0.26, 0.5, 0.58, 0.78]) L.inkLine(ctx, RX - W / 2 + 2, yOf(f), RX + W / 2 - 2, yOf(f), { width: 1.2, color: P.inkSoft, alpha: 0.7, seed: sd('seam', f), taper: 0 });
    // curved contour hatching on the shadow half (right)
    L.hatch(ctx, g.body, { angle: -Math.PI / 2, spacing: 6, width: 1.3, alpha: 0.75, seed: sd('hb'), length: [30, 90], density: (x) => L.smoothstep(RX + 4, RX + W * 0.42, x) });
    // escape tower lattice and tip
    const ty0 = yOf(0.958), ty1 = TOP;
    L.inkLine(ctx, RX - 5, ty0, RX, ty1 + 10, { width: 1.6, seed: sd('t1') });
    L.inkLine(ctx, RX + 5, ty0, RX, ty1 + 10, { width: 1.6, seed: sd('t2') });
    L.inkPath(ctx, [[RX - 3, ty1 + 14], [RX + 3, ty1 + 14], [RX, ty1]], { closed: true, fill: P.rocketBlack, width: 1.6, seed: sd('tip'), smooth: false });
    // flame
    if (flick > 0) {
      const fl = (70 + 40 * flick) * (0.9 + 0.2 * LIB.h3(Math.floor(LIB.T * 12), 3, sd('fl')));
      const outer = [[RX - 26, BASE + 14], [RX - 34, BASE + fl * 0.5], [RX, BASE + fl], [RX + 34, BASE + fl * 0.5], [RX + 26, BASE + 14]];
      L.inkPath(ctx, L.smoothPts(outer, true, 6), { closed: true, fill: P.flame, width: 2.4, color: P.inkSoft, seed: sd('fo') });
      const inner = [[RX - 14, BASE + 16], [RX - 16, BASE + fl * 0.4], [RX, BASE + fl * 0.72], [RX + 16, BASE + fl * 0.4], [RX + 14, BASE + 16]];
      L.inkPath(ctx, L.smoothPts(inner, true, 6), { closed: true, fill: P.flameCore, width: 1.4, color: P.flame, seed: sd('fi') });
    }
  }

  function drawTower(ctx, L, arm) {
    const x0 = 712, x1 = 800, y0 = 150, y1 = 760;
    L.inkPath(ctx, L.rectPts(x0, y0, x1 - x0, y1 - y0, 40), { closed: true, width: 2.8, seed: sd('tw'), smooth: false });
    const p = [];
    for (let y = y0; y < y1; y += 44) {
      L.inkLine(ctx, x0, y, x1, y, { width: 1.4, color: P.inkSoft, seed: sd('tr', y), taper: 0 });
      L.inkLine(ctx, x0, y, x1, y + 44, { width: 1.1, color: P.inkSoft, alpha: 0.8, seed: sd('td', y), taper: 0 });
      L.inkLine(ctx, x1, y, x0, y + 44, { width: 1.1, color: P.inkSoft, alpha: 0.8, seed: sd('te', y), taper: 0 });
    }
    void p;
    // crane at the top
    L.inkLine(ctx, x0 - 10, y0, x1 + 40, y0, { width: 2.8, seed: sd('crane') });
    // swing arms: rotate away after T 24.75
    for (const [y, len] of [[300, 46], [420, 46], [540, 46], [660, 46]]) {
      const a = arm * 1.2;
      const ex = x0 - Math.cos(a) * len, ey = y - Math.sin(a) * len;
      L.inkLine(ctx, x0, y, ex, ey, { width: 4, seed: sd('arm', y), taper: 0 });
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const g = geo();

      // camera shake (12 Hz, +-3 px, T 24 to 25.5)
      const si = Math.floor(t * 12 + 1e-6);
      const sk = t < 1.5 ? 3 * (1 - t / 1.5 * 0.5) : 0;
      const sx = (L.h3(si, 1, sd('sh')) * 2 - 1) * sk, sy = (L.h3(si, 2, sd('sh')) * 2 - 1) * sk;

      ctx.save();
      ctx.translate(sx, sy);
      // 1. dawn stripes
      L.stripes(ctx, { bounds: [-20, -20, 1960, 1120], colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: (info.T / 0.75) * 6, seed: sd('st') });
      // 2. ground (calm, dusky for subtitles)
      const gnd = [[-20, 770], [1940, 770], [1940, 1100], [-20, 1100]];
      L.inkPath(ctx, gnd, { closed: true, fill: L.mix(P.inkSoft, P.dusk, 0.35), width: 2.8, seed: sd('gnd'), smooth: false });
      L.hatch(ctx, gnd, { spacing: 8, width: 1.3, alpha: 0.5, seed: sd('gh') });
      // launch platform
      const plat = [[470, 742], [860, 742], [860, 778], [470, 778]];
      L.inkPath(ctx, plat, { closed: true, fill: P.inkFaint, width: 2.8, seed: sd('plat'), smooth: false });
      L.hatch(ctx, plat, { spacing: 5, width: 1.2, alpha: 0.8, seed: sd('plh') });

      // 3. tower
      const arm = E.outCubic(clamp((tw - B_LIFT) / 0.5));
      drawTower(ctx, L, arm);

      // 4-5. rocket rising on twos
      const rise = 260 * E.inQuad(clamp((tw - B_LIFT) / (3 - B_LIFT)));
      const flick = t < B_IGN ? 0 : clamp(tw / 0.25);
      ctx.save();
      ctx.translate(0, -rise);
      drawRocket(ctx, L, g, flick);
      ctx.restore();

      // ignition flash T 24.0
      const fl = 1 - clamp(t / (9 * FR));
      if (fl > 0) {
        const star = [];
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU, rr = (i % 2 ? 60 : 140) * (0.6 + 0.4 * fl);
          star.push([RX + Math.cos(a) * rr, BASE + 20 + Math.sin(a) * rr * 0.6]);
        }
        L.inkPath(ctx, star, { closed: true, fill: P.flameCore, fillAlpha: fl, width: 2, color: P.flame, alpha: fl, seed: sd('flash'), smooth: false });
      }

      // 6. smoke billows: one wave per beat, expanding on twos
      const puffs = [];
      g.puffs.forEach((p) => {
        const ta = p.wave * 0.75;
        if (tw < ta) return;
        const u = E.outCubic(clamp((tw - ta) / 2.2));
        puffs.push([p.x + p.dx * u, p.y + p.dy * u - 20 * u, p.r * (0.4 + 0.8 * u)]);
      });
      if (puffs.length) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-20, -20, 1960, 860); // keep smoke above the subtitle band
        ctx.clip();
        ctx.lineWidth = 5.6;
        ctx.strokeStyle = P.ink;
        ctx.beginPath();
        puffs.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); });
        ctx.stroke();
        ctx.fillStyle = P.white;
        ctx.fill();
        const path = new Path2D();
        puffs.forEach(([x, y, r]) => { path.moveTo(x + r, y); path.arc(x, y, r, 0, TAU); });
        L.hatch(ctx, path, { bounds: [100, 500, 1200, 360], spacing: 6, width: 1.3, color: P.tan, alpha: 0.9, seed: sd('smh'), length: [10, 28],
          density: (x, y) => { let d = 0; for (const [px, py, r] of puffs) { const dx = (x - px) / r, dy = (y - py) / r; if (dx * dx + dy * dy < 1) d = Math.max(d, clamp((dx * 0.7 + dy * 0.7) * 1.4)); } return d; } });
        ctx.restore();
      }
      ctx.restore();

      // 7. annBlue trajectory above the nose, draws on over 9 frames from T 24.75 (24 fps)
      if (t >= B_LIFT) {
        const dp = E.outExpo(clamp((t - B_LIFT) / (9 * FR) + 1 / 9));
        const yTop = TOP - rise - 14;
        const y1 = lerp(yTop, -10, dp);
        ctx.save();
        ctx.strokeStyle = P.annBlue;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.moveTo(RX + sx, yTop + sy);
        ctx.lineTo(RX + sx, y1 + sy);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
