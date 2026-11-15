/*
 * 28 huella-en-marte : A bootprint on Mars.
 * Global T 150.0 to 156.0 (6 s, 8 beats), illustrated (Martian ground, close), camera locked on G2.
 *
 * Layers, back to front:
 *   1. Ground: marsSoil, wind ripples, stipple grains, small hatched pebbles (cached, frozen lines).
 *   2. The bootprint G2 (storyboard Shared geometry), screen-fixed: oval centred (960, 470), long axis 380
 *      rotated -12 deg from vertical (toe at top), width 200, toe 10 % wider than the heel, 14 straight ridges
 *      across the sole spanning 86 % of the local width, marsShadow on marsSoil. Frame 0 = 07's last frame.
 *   3. The boot's shadow on the ground as it nears.
 *   4. Dust puffs (marsDust) at the step and the lift; grains settle on twos.
 *   5. The boot (suitBeige, gold trim) entering from the top, down at T 151.5, lifting at T 152.25.
 *   6. Overlay: annMagenta ring on the print at T 152.25.
 *
 * Beats (local t): 0 G2 holds (match from 07), 0.75 boot enters, 1.5 boot down (outBack), 2.25 lifts + ring,
 * 3.0 boot gone, 3.75 / 4.5 / 5.25 dust settles and pebbles roll in.
 */
(function () {
  'use strict';
  const ID = 'huella-en-marte';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const BEAT = 0.75;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_ENTER = 0.75; // T 150.75 narration P10
  const B_DOWN = 1.5; // T 151.5
  const B_LIFT = 2.25; // T 152.25
  const B_GONE = 3.0; // T 153.0

  // ---- G2 (copied from the storyboard) ----
  const G2 = { cx: 960, cy: 470, len: 380, width: 200, rot: (-12 * Math.PI) / 180, ridges: 14, span: 0.86 };
  const DIR = [Math.sin(G2.rot), -Math.cos(G2.rot)]; // heel -> toe (toe at top, tilted by -12 deg)
  const NRM = [-DIR[1], DIR[0]];
  const at = (s, v) => [G2.cx + DIR[0] * s * (G2.len / 2) + NRM[0] * v, G2.cy + DIR[1] * s * (G2.len / 2) + NRM[1] * v];
  // half-width along the axis, s = -1 heel .. 1 toe; toe lobe 100, heel lobe 91 (toe 10 % wider)
  function halfW(s) {
    const env = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), 2.4)), 1 / 2.4);
    const lobe = 91 + 9 * LIB.smoothstep(-0.6, 0.4, s) - 7 * Math.exp(-Math.pow((s + 0.1) / 0.22, 2));
    return (G2.width / 2) * (lobe / 100) * env;
  }
  function outline(grow = 0, n = 64) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const s = -1 + (2 * i) / n;
      out.push(at(s * (1 + grow / 190), halfW(s) + grow));
    }
    for (let i = n - 1; i >= 1; i--) {
      const s = -1 + (2 * i) / n;
      out.push(at(s * (1 + grow / 190), -halfW(s) - grow));
    }
    return out;
  }
  const RIDGE_S = Array.from({ length: G2.ridges }, (_, i) => -1 + (2 * (i + 1)) / (G2.ridges + 1));

  function drawPrint(ctx, L) {
    const o = outline(0);
    // raised lit rim (lower right) and the dip
    L.inkPath(ctx, outline(9), { closed: true, width: 3, color: P.marsDust, alpha: 0.9, seed: sd('rim'), wobble: 0.8 });
    L.inkPath(ctx, o, { closed: true, width: 4.5, color: P.marsShadow, fill: LIB.mix(P.marsSoil, P.marsShadow, 0.22), seed: sd('print'), wobble: 0.6 });
    // inner wall in shadow on the upper-left side (light from upper left)
    L.hatch(ctx, o, {
      angle: -Math.PI / 4, spacing: 5, width: 1.4, color: P.marsShadow, alpha: 0.9, length: [8, 22],
      density: (x, y) => {
        const dx = x - G2.cx, dy = y - G2.cy;
        const v = dx * NRM[0] + dy * NRM[1];
        const s = (dx * DIR[0] + dy * DIR[1]) / (G2.len / 2);
        const w = halfW(clamp(s, -0.99, 0.99)) || 1;
        return clamp((-v / w - 0.45) * 2.4) + clamp((s - 0.78) * 4) * 0.6;
      },
      seed: sd('wall'),
    });
    // 14 ridges across the sole, straight, 86 % of the local width
    RIDGE_S.forEach((s, i) => {
      const w = halfW(s) * G2.span;
      const a = at(s, -w), b = at(s, w);
      L.inkLine(ctx, a[0], a[1], b[0], b[1], { width: 6, color: P.marsShadow, seed: sd('ridge', i), taper: [6, 6], wobble: 0.5 });
      // lit lip of each ridge (just heel-side)
      const a2 = at(s - 0.022, -w * 0.9), b2 = at(s - 0.022, w * 0.9);
      L.inkLine(ctx, a2[0], a2[1], b2[0], b2[1], { width: 1.6, color: P.marsDust, alpha: 0.8, seed: sd('lip', i), taper: [8, 8], wobble: 0.4 });
    });
    L.stipple(ctx, o, { spacing: 12, r: [0.8, 1.6], color: P.marsShadow, alpha: 0.6, seed: sd('pst') });
  }

  // ---- static ground (cached per render scale, lines frozen) ----
  function groundLayer() {
    const S = FILM.S || 1;
    return LIB.cached(['28', 'ground', S].join('|'), () => {
      const c = FILM.makeCanvas(Math.round(1920 * S), Math.round(1080 * S));
      const g = c.getContext('2d');
      g.scale(S, S);
      const r = LIB.rng(sd('ground'));
      g.fillStyle = P.marsSoil;
      g.fillRect(0, 0, 1920, 1080);
      const fr = { boil: false };
      const all = [[0, 0], [1920, 0], [1920, 1080], [0, 1080]];
      // broad tonal mottling with hatch (darker toward the bottom, calm under subtitles)
      LIB.hatch(g, all, Object.assign({ angle: -Math.PI / 4, spacing: 9, width: 1.3, color: P.marsShadow, alpha: 0.55, length: [16, 50], density: (x, y) => clamp(0.15 + 0.35 * LIB.noise2(x * 0.004, y * 0.004, 5) + (y - 760) / 260) }, fr));
      LIB.hatch(g, all, Object.assign({ angle: -Math.PI / 4 + 1.05, spacing: 8, width: 1.2, color: P.marsShadow, alpha: 0.5, length: [14, 40], density: (x, y) => clamp((y - 870) / 120) }, fr));
      // wind ripples
      for (let k = 0; k < 16; k++) {
        const y0 = 60 + k * 52 + r.range(-10, 10);
        const pts = [];
        for (let x = -40; x <= 1960; x += 40) pts.push([x, y0 + 14 * Math.sin(x * 0.006 + k) + 6 * LIB.noise1(x * 0.01, k)]);
        LIB.inkPath(g, pts, { width: 1.6, color: k * 52 > 760 ? P.marsShadow : P.marsShadow, alpha: k * 52 > 760 ? 0.35 : 0.55, seed: sd('rip', k), taper: [80, 80], wobble: 2, boil: false });
        LIB.inkPath(g, pts.map((p) => [p[0], p[1] + 4]), { width: 1.4, color: P.marsDust, alpha: k * 52 > 760 ? 0.25 : 0.7, seed: sd('ripl', k), taper: [80, 80], wobble: 2, boil: false });
      }
      LIB.stipple(g, all, { spacing: 9, r: [0.9, 2], color: P.marsShadow, alpha: 0.7, density: (x, y) => clamp(0.55 - (y - 800) / 300), seed: sd('st1'), boil: false });
      LIB.stipple(g, all, { spacing: 13, r: [0.9, 1.8], color: P.marsDust, alpha: 0.8, density: (x, y) => clamp(0.6 - (y - 760) / 200), seed: sd('st2'), boil: false });
      // pebbles, keep them out of the print and out of the subtitle band
      for (let k = 0; k < 30; k++) {
        const x = r.range(60, 1860), y = r.range(60, 820);
        const dx = x - G2.cx, dy = y - G2.cy;
        if (Math.hypot(dx * 1.6, dy) < 300) continue;
        const w = r.range(10, 34), h = w * r.range(0.5, 0.75);
        const pts = LIB.ellipsePts(x, y, w, h, 14, r.range(-0.4, 0.4)).map((p) => [p[0] + r.range(-2, 2), p[1] + r.range(-2, 2)]);
        g.save();
        g.globalAlpha = 0.35;
        g.fillStyle = P.marsShadow;
        g.beginPath();
        g.ellipse(x + w * 0.35, y + h * 0.6, w, h * 0.6, 0, 0, TAU);
        g.fill();
        g.restore();
        LIB.inkPath(g, pts, { closed: true, width: 2, fill: LIB.mix(P.marsSoil, P.marsDust, 0.45), seed: sd('peb', k), wobble: 0.4, boil: false });
        LIB.hatch(g, pts, { angle: -Math.PI / 4, spacing: 4.5, width: 1.1, color: P.marsShadow, density: (px) => clamp((px - x) / w + 0.2), length: [5, 12], seed: sd('pebh', k), boil: false });
      }
      return c;
    });
  }

  // boot height: 0 = pressed into the print, >0 = above (closer to camera)
  function bootH(t) {
    if (t < B_DOWN) return lerp(2.6, 0, E.inCubic(clamp(t / B_DOWN)));
    if (t < B_LIFT) return 0;
    return lerp(0, 3.2, E.inCubic(clamp((t - B_LIFT) / (B_GONE - B_LIFT))));
  }

  function drawBoot(ctx, L, h, squash) {
    const k = 1 + 0.32 * h;
    const oy = -330 * h;
    ctx.save();
    ctx.translate(G2.cx, G2.cy + oy);
    ctx.scale(k * (1 + 0.04 * squash), k * (1 - 0.03 * squash));
    ctx.translate(-G2.cx, -G2.cy);
    // boot: sole rim (suitShade), upper (suitBeige), toe cap
    L.inkPath(ctx, outline(14), { closed: true, width: 4.5, fill: P.suitShade, seed: sd('sole'), wobble: 0.6 });
    L.inkPath(ctx, outline(0), { closed: true, width: 2.4, fill: P.suitBeige, seed: sd('upper'), wobble: 0.6 });
    L.hatch(ctx, outline(0), { angle: -Math.PI / 4, spacing: 6.5, width: 1.3, color: P.suitShade, length: [10, 28], density: (x, y) => clamp(((x - G2.cx) * NRM[0] + (y - G2.cy) * NRM[1]) / 60 + 0.15), seed: sd('bh') });
    const cap = [];
    for (let i = 0; i <= 14; i++) { const s = 0.42 + (0.55 * i) / 14; cap.push(at(s, halfW(s) * 0.86)); }
    for (let i = 14; i >= 0; i--) { const s = 0.42 + (0.55 * i) / 14; cap.push(at(s, -halfW(s) * 0.86)); }
    L.inkPath(ctx, cap, { closed: true, width: 2.4, fill: P.suitShade, seed: sd('cap'), wobble: 0.4 });
    L.hatch(ctx, cap, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.helmetGoldDeep, density: (x, y) => clamp(((x - G2.cx) * NRM[0] + (y - G2.cy) * NRM[1]) / 50), length: [6, 16], seed: sd('caph') });
    // straps across the instep
    for (let i = 0; i < 3; i++) {
      const s = 0.1 + i * 0.1;
      const w = halfW(s) * 0.8;
      const p0 = at(s, -w), p1 = at(s, w);
      L.inkLine(ctx, p0[0], p0[1], p1[0], p1[1], { width: 3, color: P.helmetGoldDeep, seed: sd('strap', i), taper: 4 });
    }
    // the leg seen from above: a padded cylinder coming toward the camera, gold trim at the cuff
    const ank = at(-0.42, 0);
    const lr = 104;
    L.inkPath(ctx, LIB.ellipsePts(ank[0], ank[1], lr + 10, lr + 10, 56), { closed: true, width: 4.5, fill: P.helmetGold, seed: sd('trim'), wobble: 0.8 });
    L.hatch(ctx, LIB.ellipsePts(ank[0], ank[1], lr + 10, lr + 10, 56), { angle: -0.6, spacing: 5, width: 1.3, color: P.helmetGoldDeep, density: (x, y) => clamp((x - ank[0] + y - ank[1]) / 120), length: [6, 16], seed: sd('trimh') });
    L.inkPath(ctx, LIB.ellipsePts(ank[0], ank[1], lr, lr, 56), { closed: true, width: 3, fill: P.suitBeige, seed: sd('legc'), wobble: 0.8 });
    for (let i = 1; i <= 3; i++) {
      L.inkCircle(ctx, ank[0] - i * 4, ank[1] - i * 4, lr - i * 24, { width: 1.8, color: P.inkSoft, alpha: 0.8, seed: sd('legr', i), wobble: 0.6 });
    }
    L.hatch(ctx, LIB.ellipsePts(ank[0], ank[1], lr, lr, 56), { angle: -Math.PI / 4, spacing: 7, width: 1.4, color: P.suitShade, density: (x, y) => clamp((x - ank[0] + y - ank[1]) / 90 + 0.1), length: [10, 30], bend: 3, seed: sd('legh') });
    ctx.restore();
  }

  function puffs(ctx, L, t, a, n, r0, r1, seed, tw) {
    if (t < a) return;
    const u = clamp((tw - a) / 1.5);
    if (u >= 1) return;
    const rr = LIB.rng(seed);
    for (let i = 0; i < n; i++) {
      const s = -1 + (2 * (i + 0.5)) / n;
      const side = i % 2 ? 1 : -1;
      const base = at(s * 0.9, side * (halfW(s * 0.9) + 14));
      const dir = [NRM[0] * side, NRM[1] * side];
      const d = lerp(r0, r1, E.outCubic(u)) * rr.range(0.6, 1.2);
      const x = base[0] + dir[0] * d, y = base[1] + dir[1] * d - 30 * u;
      const rad = rr.range(14, 30) * (0.6 + 0.8 * u);
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - u);
      L.inkCircle(ctx, x, y, rad, { width: 1.8, color: P.marsShadow, fill: P.marsDust, seed: seed + i, wobble: 1.4 });
      ctx.restore();
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);

      // 1. ground
      ctx.drawImage(groundLayer(), 0, 0, 1920, 1080);

      // 2. the print (screen-fixed G2)
      drawPrint(ctx, L);

      // pebbles that roll into the print on the late beats
      [3.75, 4.5, 5.25].forEach((b, i) => {
        const s = [0.62, -0.5, 0.1][i], side = [1, -1, 1][i];
        const end = at(s, side * halfW(s) * 0.6), start = at(s, side * (halfW(s) + 70));
        const u = tw < b ? 0 : E.outBack(clamp((tw - b) / (6 / 12)));
        const x = lerp(start[0], end[0], u), y = lerp(start[1], end[1], u);
        L.inkCircle(ctx, x, y, 7, { width: 1.8, fill: LIB.mix(P.marsSoil, P.marsDust, 0.5), seed: sd('roll', i), wobble: 0.3 });
      });

      // 3. boot shadow
      const h = bootH(tw);
      if (h < 3.1) {
        const sa = clamp(1 - h / 2.6) * 0.42;
        ctx.save();
        ctx.globalAlpha = sa;
        ctx.fillStyle = P.marsShadow;
        ctx.beginPath();
        LIB.tracePath(ctx, outline(18 + h * 30), true);
        ctx.fill();
        ctx.restore();
      }

      // 4. dust: the step, the lift, then grains settle each beat (on twos)
      puffs(ctx, L, t, B_DOWN, 12, 10, 120, sd('pd'), tw);
      puffs(ctx, L, t, B_LIFT, 8, 6, 70, sd('pl'), tw);
      if (t >= B_DOWN) {
        const beatsAfter = Math.floor((t - B_DOWN) / BEAT + 1e-6);
        const dens = clamp(0.7 - beatsAfter * 0.12);
        if (dens > 0) {
          L.stipple(ctx, outline(130), {
            spacing: 10, r: [1, 2.2], color: P.marsDust, alpha: 0.9, seed: sd('settle', Math.floor(tw * 12) % 3),
            density: (x, y) => {
              const dx = x - G2.cx, dy = y - G2.cy;
              const s = (dx * DIR[0] + dy * DIR[1]) / (G2.len / 2);
              const v = Math.abs(dx * NRM[0] + dy * NRM[1]);
              const w = halfW(clamp(s, -0.99, 0.99));
              return v > w + 6 ? dens * clamp(1 - (v - w) / 130) : 0;
            },
          });
        }
      }

      // 5. boot
      if (tw < B_GONE) {
        const squash = tw >= B_DOWN && tw < B_LIFT ? 1 - E.outBack(clamp((tw - B_DOWN) / (4 / 12))) * 0.6 : 0;
        drawBoot(ctx, L, h, squash);
      }

      // 6. annMagenta ring on the print
      if (t >= B_LIFT) {
        const u = clamp((t - B_LIFT) / (12 * FR) + 1 / 12);
        if (u < 1) {
          ctx.save();
          ctx.strokeStyle = P.annMagenta;
          ctx.globalAlpha = 1 - E.inQuad(u);
          ctx.lineWidth = 3;
          ctx.beginPath();
          const rr = lerp(1.05, 1.35, E.outExpo(u));
          ctx.ellipse(G2.cx, G2.cy, 120 * rr, 205 * rr, G2.rot, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    },
  });
})();
