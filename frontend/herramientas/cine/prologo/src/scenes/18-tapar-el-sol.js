/*
 * 18 tapar-el-sol : Covering the sun with a finger
 * Global T 87 to 91.5 (4.5 s, 6 beats), illustrated, hard cut in. Locked camera.
 *
 * Layers, back to front:
 *   1. paper + warm stripes (cream / yellow) as the sky, drifting 6 px per beat
 *   2. sun r 60 at (1120, 330) with one soft halo; rays that grow when it shines out
 *   3. landscape: far hills (sage), mid hills (ochre) with trees, dark hatched foreground
 *   4. the raised hand in silhouette (inkSoft, skinDeep rim on the sun side): rises, covers
 *      the sun with the index finger at T 88.5, lowers at T 90.0
 *   5. overlays: annYellow attention ring T 87.75, annMagenta strike T 90.0, annYellow burst T 90.75
 */
(function () {
  'use strict';
  const ID = 'tapar-el-sol';
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

  const SUN = { x: 1120, y: 330, r: 60 };
  const B_LOOK = 0.75;   // T 87.75 attention ring on the sun
  const B_COVER = 1.5;   // T 88.5 finger covers the sun
  const B_PEEK = 2.25;   // T 89.25 corona rays peek around the finger
  const B_LOWER = 3.0;   // T 90.0 strike, hand lowers, sun shines
  const B_BURST = 3.75;  // T 90.75 burst ring

  // Hand in local coordinates: origin at the index fingertip pad, finger pointing up (-y).
  // Finger is 132 wide so it hides a r 60 disc.
  const HAND = [
    [-66, -10], [-58, -58], [-24, -84], [24, -84], [58, -58], [66, -10],   // fingertip
    [70, 150], [78, 210],                                                   // finger to knuckle
    [118, 214], [150, 236], [156, 280],                                    // curled middle finger
    [150, 300], [168, 320], [170, 362], [160, 380],                        // ring finger
    [166, 400], [162, 440], [140, 470],                                    // little finger
    [120, 520], [110, 640], [96, 900], [-200, 900],                        // wrist and forearm
    [-150, 640], [-150, 520], [-170, 440],
    [-196, 380], [-206, 320], [-186, 268], [-140, 250],                    // thumb
    [-100, 262], [-80, 220], [-66, 150],
  ];
  // finger pad centre sits 40 px under the tip
  const PAD = 40;

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const far = [[0, 640]];
    for (let x = 0; x <= 1920; x += 40) far.push([x, 640 - 40 * Math.sin(x * 0.004 + 1) - 20 * Math.sin(x * 0.011)]);
    far.push([1920, 1080], [0, 1080]);
    const mid = [[0, 730]];
    for (let x = 0; x <= 1920; x += 40) mid.push([x, 720 - 50 * Math.sin(x * 0.003 + 2.2) - 16 * Math.sin(x * 0.013)]);
    mid.push([1920, 1080], [0, 1080]);
    const near = [[0, 840]];
    for (let x = 0; x <= 1920; x += 40) near.push([x, 850 - 24 * Math.sin(x * 0.005 + 0.4)]);
    near.push([1920, 1080], [0, 1080]);
    const r = L.rng(sd('trees'));
    const trees = [];
    for (let i = 0; i < 9; i++) {
      const x = 760 + i * 130 + r.range(-30, 30);
      const y = 720 - 50 * Math.sin(x * 0.003 + 2.2) - 16 * Math.sin(x * 0.013) + 6;
      trees.push({ x, y, h: r.range(50, 80), w: r.range(22, 34) });
    }
    GEO = { far, mid, near, trees };
    return GEO;
  }

  function handPose(t, tw) {
    // returns the transform for the fingertip pad
    const cover = { x: SUN.x, y: SUN.y + PAD, rot: 16 * DEG };
    if (t < B_COVER) {
      const u = E.outCubic(clamp(tw / B_COVER));
      return { x: lerp(SUN.x - 220, cover.x, u), y: lerp(1180, cover.y, u), rot: lerp(30 * DEG, cover.rot, u) };
    }
    if (t < B_LOWER) {
      const b = Math.sin((tw - B_COVER) * 5) * 3;
      return { x: cover.x + b, y: cover.y, rot: cover.rot };
    }
    const u = E.inOutCubic(clamp((tw - B_LOWER) / 0.6));
    return { x: lerp(cover.x, SUN.x - 380, u), y: lerp(cover.y, 1320, u), rot: lerp(cover.rot, 34 * DEG, u) };
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const G = geo(L);
      const hit = (a, frames, e, lead = 1) =>
        t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames));

      // 1. sky: paper and warm stripes
      L.paper(ctx);
      ctx.save();
      ctx.globalAlpha = 0.9;
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: (info.T / BEAT) * 6, seed: sd('st') % 9999 });
      ctx.restore();

      // 2. sun
      const shine = hit(B_LOWER + 0.125, 14, E.outCubic);
      ctx.save();
      const hr = SUN.r * (2.6 + 1.2 * shine);
      const halo = ctx.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.9, SUN.x, SUN.y, hr);
      halo.addColorStop(0, LIB.rgba(P.sun, 0.55 + 0.25 * shine));
      halo.addColorStop(1, LIB.rgba(P.sun, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(SUN.x - hr, SUN.y - hr, hr * 2, hr * 2);
      ctx.restore();
      // rays: short before, long once the hand is gone (on twos)
      const nR = 16;
      for (let i = 0; i < nR; i++) {
        const a = (i / nR) * TAU + tw * 0.15;
        const base = i % 2 ? 22 : 38;
        const len = base * (1 + 1.6 * shine) * (0.9 + 0.1 * Math.sin(tw * 9 + i));
        L.inkLine(ctx, SUN.x + Math.cos(a) * (SUN.r + 14), SUN.y + Math.sin(a) * (SUN.r + 14),
          SUN.x + Math.cos(a) * (SUN.r + 14 + len), SUN.y + Math.sin(a) * (SUN.r + 14 + len),
          { width: 3, color: P.ochre, seed: sd('ray', i), taper: [3, 10] });
      }
      L.inkCircle(ctx, SUN.x, SUN.y, SUN.r, { width: 2.8, fill: P.sun, seed: sd('sun') });
      L.stipple(ctx, (c) => c.arc(SUN.x, SUN.y, SUN.r - 6, 0, TAU), { bounds: [SUN.x - SUN.r, SUN.y - SUN.r, SUN.r * 2, SUN.r * 2], spacing: 7, color: P.ochre, alpha: 0.6, seed: sd('gr') % 9999 });

      // 3. landscape
      L.inkPath(ctx, G.far, { closed: true, width: 2.8, fill: P.stripeSage || P.sage, seed: sd('far') });
      L.hatch(ctx, G.far, { spacing: 12, color: P.sage, alpha: 0.6, seed: sd('farh') % 9999, density: (x, y) => clamp((y - 600) / 200) });
      L.inkPath(ctx, G.mid, { closed: true, width: 2.8, fill: P.ochre, seed: sd('mid') });
      L.hatch(ctx, G.mid, { spacing: 8, color: P.ink, alpha: 0.6, seed: sd('midh') % 9999, density: (x, y) => clamp((y - 700) / 160) });
      for (const tr of G.trees) {
        L.inkLine(ctx, tr.x, tr.y, tr.x, tr.y - tr.h * 0.5, { width: 2.4, color: P.ink, seed: sd('tt', tr.x | 0) });
        L.inkPath(ctx, L.ellipsePts(tr.x, tr.y - tr.h * 0.7, tr.w, tr.h * 0.42, 20), { closed: true, width: 2.4, fill: P.sage, seed: sd('tc', tr.x | 0) });
        L.hatch(ctx, L.ellipsePts(tr.x + 6, tr.y - tr.h * 0.65, tr.w * 0.8, tr.h * 0.36, 16), { spacing: 5, alpha: 0.7, seed: sd('th', tr.x | 0) % 9999 });
      }
      L.inkPath(ctx, G.near, { closed: true, width: 2.8, fill: P.inkSoft, seed: sd('near') });
      L.crossHatch(ctx, G.near, { tone: 0.55, spacing: 7, color: P.ink, alpha: 0.6, seed: sd('nearh') % 9999 });

      // 4. the hand silhouette
      const hp = handPose(t, tw);
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.rotate(hp.rot);
      ctx.translate(0, -PAD);
      // rim of light on the sun side, then the silhouette over it, offset so the rim shows
      L.inkPath(ctx, HAND, { closed: true, width: 10, color: P.skinDeep, seed: sd('rim') });
      L.inkPath(ctx, HAND.map(([x, y]) => [x - 4, y + 3]), { closed: true, width: 4.5, fill: P.inkSoft, seed: sd('hand') });
      // knuckle creases and nail line, faint
      L.inkPath(ctx, [[-40, 150], [0, 160], [40, 150]], { width: 1.6, color: P.ink, alpha: 0.6, seed: sd('c1') });
      L.inkPath(ctx, [[-40, 90], [0, 98], [40, 90]], { width: 1.6, color: P.ink, alpha: 0.6, seed: sd('c2') });
      L.inkPath(ctx, [[-36, -40], [-30, -64], [0, -72], [30, -64], [36, -40]], { width: 1.6, color: P.ink, alpha: 0.5, seed: sd('nail') });
      L.hatch(ctx, HAND, { spacing: 6, color: P.ink, alpha: 0.5, seed: sd('hh') % 9999, density: (x, y) => clamp((-x + 40) / 220) });
      // magenta strike across the hand on T 90.0 (draws on in 5 frames)
      const sp = hit(B_LOWER, 5, E.outExpo);
      if (sp > 0) {
        const fade = 1 - clamp((t - B_LOWER - 0.5) / 0.4);
        if (fade > 0) {
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.strokeStyle = P.annMagenta;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-180, 380);
          ctx.lineTo(lerp(-180, 170, sp), lerp(380, -60, sp));
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();

      // 5. overlays
      const ring = (a, r0, grow, col, frames) => {
        if (t < a - FR || t > a + (frames + 1) * FR) return;
        const u = hit(a, frames, E.outExpo);
        ctx.save();
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(SUN.x, SUN.y, r0 + grow * u, 0, TAU); ctx.stroke();
        ctx.restore();
      };
      ring(B_LOOK, SUN.r + 20, 70, P.annYellow, 10);
      ring(B_COVER, SUN.r + 40, 40, P.annYellow, 8);
      ring(B_BURST, SUN.r + 30, 200, P.annYellow, 12);
      // peek: a dashed annYellow arc annotation around the hidden sun
      if (t >= B_PEEK - FR && t < B_LOWER) {
        L.arcAnnotation(ctx, SUN.x, SUN.y, SUN.r + 70, -160 * DEG, -20 * DEG, { color: P.annYellow, width: 2, p: hit(B_PEEK, 9, E.outExpo), dash: [10, 8], arrow: 12 });
      }
    },
  });
})();
