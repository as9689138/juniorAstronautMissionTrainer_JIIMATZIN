/*
 * 27 tres-astronautas : Wenceslao, Judith and Atlas.
 * Global T 141.0 to 150.0 (9 s, 12 beats), illustrated (paper plate, Martian dawn).
 *
 * Layers, back to front (all under the slow pull-back camera, 1.08 -> 1.0):
 *   1. Sky: marsSky, flat dawn bands near the horizon, dust streaks.
 *   2. Sun: small pale disc rising at the left, one soft halo; clears the horizon at T 147.0.
 *   3. Far mesas (two silhouette ranges, lit ridges, hatched shadow sides).
 *   4. Valley floor and dunes.
 *   5. Base Marte Uno (art bible 10.5): violet domes, tubes, plinths, warm windows, resource lights.
 *   6. The ridge (loma): marsSoil, hatched shadow, rocks and pebbles; calm and dark below y 860.
 *   7. The three astronauts (art bible 10.1): Wenceslao x 700, Judith x 960, Atlas x 1220, 360 px tall.
 *   8. Overlays: annYellow ring around each astronaut on T 143.25, 144.0, 144.75.
 *
 * Beats (local t): 0 open, 0.75 dust gust, 1.5 base light, 2.25/3.0/3.75 rings + helmet turns,
 * 4.5 / 5.25 base lights, 6.0 sun clears the horizon, 6.75 / 7.5 / 8.25 base lights + dust.
 */
(function () {
  'use strict';
  const ID = 'tres-astronautas';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const BEAT = 0.75;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // ---- beats (local t; global T in comments) ----
  const B_RING = [2.25, 3.0, 3.75]; // T 143.25, 144.0, 144.75
  const B_SUN = 6.0; // T 147.0

  // ---- composition ----
  const CREW = [
    { x: 700, patch: 'gear', key: 'wenceslao' },
    { x: 960, patch: 'flower', key: 'judith' },
    { x: 1220, patch: 'cross', key: 'atlas' },
  ];
  const HGT = 360;
  const ridgeY = (x) => 712 + 46 * Math.pow((x - 960) / 760, 2) + 5 * LIB.noise1(x * 0.006, 77);
  const SUN_X = 400;
  const HORIZON = 592;

  // ===========================================================================
  // The game's astronaut (art bible 10.1). Authored in a 360 px tall unit space,
  // feet centred at (0, 0), y up is negative. Shared verbatim with 26 la-antorcha.
  // ===========================================================================
  const AU = {
    R: 75.6, // helmet radius: diameter 151.2 = 0.42 * 360
    HC: [0, -284.4], // helmet centre
    SH: 66, // shoulder half-span
    SHY: -198, // shoulder y
    ARM: 88, // arm length
    ARMR: 17, // arm radius
    GLOVE: 19,
  };
  const TORSO = [
    [-60, -214], [-72, -192], [-76, -160], [-73, -126], [-68, -100], [-58, -86], [-30, -80], [0, -79],
    [30, -80], [58, -86], [68, -100], [73, -126], [76, -160], [72, -192], [60, -214], [32, -226], [0, -229], [-32, -226],
  ];
  function legPts(side) {
    const k = side;
    return [
      [k * 8, -94], [k * 52, -94], [k * 54, -60], [k * 50, -30], [k * 10, -30], [k * 7, -60],
    ].map((p) => [p[0], p[1]]);
  }
  function bootPts(side) {
    const k = side;
    return [
      [k * 6, -38], [k * 52, -40], [k * 58, -24], [k * 70, -12], [k * 72, -2], [k * 60, 2], [k * 6, 2], [k * 3, -14],
    ];
  }
  function arcPts(cx, cy, r, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }
  function crescent(cx, cy, r, a0, a1, depth, n = 28) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    for (let i = n; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / n;
      const k = 1 - depth * Math.sin((Math.PI * i) / n);
      out.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
    }
    return out;
  }
  function capsule(x0, y0, x1, y1, r, n = 14) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = a - Math.PI / 2 + (Math.PI * i) / n;
      out.push([x1 + Math.cos(t) * r, y1 + Math.sin(t) * r]);
    }
    for (let i = 0; i <= n; i++) {
      const t = a + Math.PI / 2 + (Math.PI * i) / n;
      out.push([x0 + Math.cos(t) * r, y0 + Math.sin(t) * r]);
    }
    return out;
  }
  function armGeo(side, ang) {
    const sx = side * AU.SH, sy = AU.SHY;
    const gx = sx + side * Math.sin(ang) * AU.ARM, gy = sy + Math.cos(ang) * AU.ARM;
    return { sx, sy, gx, gy };
  }

  /**
   * drawAstro(ctx, L, A)
   *   A.x, A.y   feet centre on screen; A.h height in px
   *   A.turn     -1..1 helmet turn (visor slides toward that side, 0 = facing camera)
   *   A.armL, A.armR  arm angles (0 hangs down, PI/2 straight out, PI straight up)
   *   A.patch    'gear' | 'flower' | 'cross' | null (patch on the viewer-left upper arm)
   *   A.ow       outline width in screen px; A.seed
   *   A.armLFront  draw the viewer-left arm in front of the helmet (raised arm)
   *   A.onGloveL fn(ctx, gx, gy) called in screen space just before the left glove is drawn
   *   A.reflect  { x, y, k, color } a warm light on the visor (screen coords of the light source)
   *   A.rim      0..1 warm rim light from the left (sunrise)
   * Returns { gloveL: [x, y], gloveR: [x, y] } in screen px.
   */
  function drawAstro(ctx, L, A) {
    const s = A.h / 360;
    const ow = (A.ow || 4.2) / s;
    const sw = (A.ow ? A.ow * 0.62 : 2.6) / s;
    const dw = 1.6 / s;
    const seed = A.seed | 0;
    const turn = A.turn || 0;
    const R = AU.R, HX = AU.HC[0], HY = AU.HC[1];
    const toScreen = (p) => [A.x + p[0] * s, A.y + p[1] * s];
    const unit = (fn) => {
      ctx.save();
      ctx.translate(A.x, A.y);
      ctx.scale(s, s);
      fn();
      ctx.restore();
    };
    const hs = (v) => v / s; // screen px -> unit px
    const armL = armGeo(-1, A.armL != null ? A.armL : 0.18);
    const armR = armGeo(1, A.armR != null ? A.armR : 0.18);

    // ---- ground shadow ----
    unit(() => {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = A.shadow || P.marsShadow;
      ctx.beginPath();
      ctx.ellipse(8, 2, 92, 11, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });

    // ---- hose (behind everything): helmet back -> right hip, corrugated ----
    unit(() => {
      const hose = [[HX + R * 0.78, HY + 14], [HX + R * 1.18, HY + 30], [HX + R * 1.36, HY + 78], [HX + R * 1.28, HY + 128], [80, -118], [66, -108]];
      const sm = LIB.smoothPts ? LIB.smoothPts(hose, false, 3) : hose;
      const pts = Array.isArray(sm[0]) ? sm : (() => { const o = []; for (let i = 0; i < sm.length; i += 2) o.push([sm[i], sm[i + 1]]); return o; })();
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 19 + ow;
      ctx.beginPath();
      LIB.tracePath(ctx, pts, false);
      ctx.stroke();
      ctx.strokeStyle = P.hoseGrey;
      ctx.lineWidth = 19 - ow * 0.4;
      ctx.stroke();
      // shadow side of the hose (right half)
      ctx.strokeStyle = LIB.rgba(P.rocketBlack, 0.3);
      ctx.lineWidth = 6;
      ctx.beginPath();
      LIB.tracePath(ctx, pts.map((p) => [p[0] + 5, p[1] + 2]), false);
      ctx.stroke();
      ctx.restore();
      // rings every 8 px of screen at 360 px tall (scaled with the figure)
      let acc = 0;
      const ring = new Path2D();
      const step = 8;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
        const d = Math.hypot(dx, dy);
        acc += d;
        while (acc >= step) {
          acc -= step;
          const u = 1 - acc / d;
          const x = pts[i - 1][0] + dx * u, y = pts[i - 1][1] + dy * u;
          const nx = -dy / d, ny = dx / d;
          ring.moveTo(x - nx * 9, y - ny * 9);
          ring.quadraticCurveTo(x + (dx / d) * 2.2, y + (dy / d) * 2.2, x + nx * 9, y + ny * 9);
        }
      }
      ctx.save();
      ctx.strokeStyle = P.inkSoft;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = dw * 0.9;
      ctx.stroke(ring);
      ctx.restore();
    });

    // ---- arms (behind the torso edge) ----
    const drawArm = (g, side, patch, front) => {
      unit(() => {
        const cap = capsule(g.sx, g.sy, g.gx, g.gy, AU.ARMR, 12);
        L.inkPath(ctx, cap, { closed: true, width: sw, seed: seed + 31 + side, fill: P.suitBeige, wobble: 0.8 });
        // shadow half of the sleeve: contour hatching
        L.hatch(ctx, cap, {
          angle: Math.atan2(g.gy - g.sy, g.gx - g.sx) + 0.15,
          spacing: hs(6.5),
          width: hs(1.3),
          color: P.suitShade,
          alpha: 0.9,
          length: [hs(8), hs(20)],
          density: (x, y) => {
            const ax = g.gx - g.sx, ay = g.gy - g.sy;
            const al = Math.hypot(ax, ay) || 1;
            const nx = -ay / al, ny = ax / al;
            const d = (x - g.sx) * nx + (y - g.sy) * ny; // signed distance across the sleeve
            return clamp((d * side * (ay >= 0 ? 1 : -1) * -1 + 4) / 14);
          },
          seed: seed + 41 + side,
        });
        // padded cuff band
        const cx = lerp(g.sx, g.gx, 0.78), cy = lerp(g.sy, g.gy, 0.78);
        const ax = g.gx - g.sx, ay = g.gy - g.sy, al = Math.hypot(ax, ay) || 1;
        const nx = -ay / al, ny = ax / al;
        L.inkLine(ctx, cx - nx * AU.ARMR, cy - ny * AU.ARMR, cx + nx * AU.ARMR, cy + ny * AU.ARMR, { width: dw * 1.6, color: P.helmetGoldDeep, seed: seed + 51 + side, taper: 4 });
        const ex = lerp(g.sx, g.gx, 0.5), ey = lerp(g.sy, g.gy, 0.5);
        L.inkLine(ctx, ex - nx * AU.ARMR * 0.9, ey - ny * AU.ARMR * 0.9, ex + nx * AU.ARMR * 0.9, ey + ny * AU.ARMR * 0.9, { width: dw, color: P.inkSoft, alpha: 0.8, seed: seed + 53 + side, taper: 4 });
        if (patch) drawPatch(ctx, L, lerp(g.sx, g.gx, 0.3), lerp(g.sy, g.gy, 0.3), patch, seed, dw);
      });
    };
    const drawGlove = (g, side) => {
      unit(() => {
        L.inkCircle(ctx, g.gx, g.gy, AU.GLOVE, { width: sw, seed: seed + 61 + side, fill: P.suitBeige });
        L.hatch(ctx, crescent(g.gx, g.gy, AU.GLOVE, -0.6, 2.2, 0.55, 14), { angle: -0.8, spacing: hs(5), width: hs(1.2), color: P.suitShade, length: [6, 14], seed: seed + 63 + side });
        L.inkPath(ctx, arcPts(g.gx, g.gy, AU.GLOVE * 0.55, 0.2, 1.6, 6), { width: dw, color: P.inkSoft, alpha: 0.8, seed: seed + 65 + side, taper: 3 });
      });
    };

    // ---- legs and boots ----
    unit(() => {
      for (const side of [-1, 1]) {
        const lp = legPts(side);
        L.inkPath(ctx, lp, { closed: true, width: sw, seed: seed + 71 + side, fill: P.suitBeige, smooth: true, wobble: 0.8 });
        const sh = side > 0 ? lp : lp;
        L.hatch(ctx, sh, {
          angle: -Math.PI / 4,
          spacing: hs(7),
          width: hs(1.3),
          color: P.suitShade,
          length: [10, 26],
          density: (x) => clamp(((x - side * 30) * 1) / 18 + (side > 0 ? 0.25 : -0.2)),
          seed: seed + 75 + side,
        });
        L.inkLine(ctx, side * 9, -62, side * 52, -62, { width: dw, color: P.inkSoft, alpha: 0.75, seed: seed + 79 + side, taper: 5 });
        const bp = bootPts(side);
        L.inkPath(ctx, bp, { closed: true, width: sw, seed: seed + 81 + side, fill: P.suitShade, smooth: true, wobble: 0.8 });
        L.hatch(ctx, bp, { angle: -Math.PI / 4, spacing: hs(5.5), width: hs(1.2), color: P.helmetGoldDeep, density: (x, y) => clamp((y + 18) / 16), length: [8, 20], seed: seed + 83 + side });
        L.inkLine(ctx, side * 7, -30, side * 54, -32, { width: dw * 1.5, color: P.helmetGoldDeep, seed: seed + 85 + side, taper: 4 });
      }
    });

    // ---- torso ----
    unit(() => {
      L.inkPath(ctx, TORSO, { closed: true, width: ow, seed: seed + 91, fill: P.suitBeige, wobble: 1 });
      // shadow side: right flank, plus under the helmet
      L.hatch(ctx, TORSO, { angle: -Math.PI / 4, spacing: hs(7), width: hs(1.4), color: P.suitShade, length: [12, 34], density: (x, y) => clamp((x - 22) / 30) + clamp((y + 120) / 40) * 0.5, seed: seed + 93 });
      L.hatch(ctx, TORSO, { angle: Math.PI * 0.58, spacing: hs(7), width: hs(1.2), color: P.helmetGoldDeep, alpha: 0.6, length: [8, 22], density: (x, y) => clamp((x - 48) / 24) * 0.9, seed: seed + 95 });
      // padded bands
      const bands = [-188, -170, -112];
      bands.forEach((by, i) => {
        const half = 70 - (i === 2 ? 2 : 0);
        L.inkPath(ctx, [[-half, by + 3], [-half * 0.4, by - 1], [half * 0.4, by - 1], [half, by + 3]], { width: dw, color: P.inkSoft, alpha: 0.85, seed: seed + 101 + i, taper: 6 });
      });
      // centre seam and rivets
      L.inkLine(ctx, 0, -104, 0, -84, { width: dw, color: P.inkSoft, alpha: 0.7, seed: seed + 109, taper: 4 });
      ctx.save();
      ctx.fillStyle = P.inkSoft;
      for (const rx of [-48, -22, 22, 48]) {
        ctx.beginPath();
        ctx.arc(rx, -180, 2.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      // belt: gold trim
      const belt = [[-70, -104], [70, -104], [68, -94], [-68, -94]];
      L.inkPath(ctx, belt, { closed: true, width: dw * 1.3, seed: seed + 111, fill: P.helmetGold, smooth: false, wobble: 0.5 });
      L.inkPath(ctx, LIB.rectPts(-9, -106, 18, 14, 6), { closed: true, width: dw * 1.2, seed: seed + 113, fill: P.helmetGoldDeep, smooth: false, wobble: 0.3 });
      // chest control panel: dark rectangle with three small lit squares
      L.inkPath(ctx, LIB.rectPts(-34, -158, 68, 34, 8), { closed: true, width: dw * 1.6, seed: seed + 115, fill: P.rocketBlack, smooth: false, wobble: 0.4 });
      ctx.save();
      const lit = [P.energyYellow, P.oxygenCyan, P.commsGreen];
      lit.forEach((c, i) => {
        const on = A.blink == null ? 1 : (A.blink + i) % 3 === 0 ? 1 : 0.55;
        ctx.globalAlpha = on;
        ctx.fillStyle = c;
        ctx.fillRect(-27 + i * 13, -151, 8, 8);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.hoseGrey;
      ctx.fillRect(10, -150, 18, 3.5);
      ctx.fillRect(10, -143, 18, 3.5);
      ctx.fillRect(-27, -137, 54, 3.5);
      ctx.restore();
      // small dial left of the panel
      L.inkCircle(ctx, -54, -142, 6, { width: dw, seed: seed + 117, fill: P.hoseGrey, wobble: 0.2 });
      // gold collar ring, mostly hidden by the helmet
      L.inkPath(ctx, LIB.ellipsePts(0, -212, 58, 14, 40), { closed: true, width: sw, seed: seed + 119, fill: P.helmetGold, wobble: 0.6 });
      L.hatch(ctx, LIB.ellipsePts(0, -212, 58, 14, 40), { angle: -0.4, spacing: hs(5), width: hs(1.2), color: P.helmetGoldDeep, density: (x) => clamp((x - 10) / 30), length: [6, 14], seed: seed + 121 });
    });

    drawArm(armR, 1, null, false);
    if (!A.armLFront) drawArm(armL, -1, A.patch, false);
    drawGlove(armR, 1);
    if (!A.armLFront) {
      if (A.onGloveL) A.onGloveL(ctx, ...toScreen([armL.gx, armL.gy]));
      if (!A.deferGloveL) drawGlove(armL, -1);
    }

    // ---- helmet ----
    unit(() => {
      // antenna: thin 3-segment zigzag from the top-right, length 0.35 D, ending in a ball
      const D = 2 * R;
      const ba = -Math.PI / 2 + 0.55;
      const bx = HX + Math.cos(ba) * (R - 2), by = HY + Math.sin(ba) * (R - 2);
      const zz = [[bx, by], [bx + 0.11 * D, by - 0.1 * D], [bx + 0.01 * D, by - 0.2 * D], [bx + 0.13 * D, by - 0.33 * D]];
      L.inkPath(ctx, zz, { width: dw * 1.6, smooth: false, seed: seed + 131, taper: [2, 2], wobble: 0.3 });
      L.inkCircle(ctx, zz[3][0], zz[3][1], 4.6, { width: dw, seed: seed + 133, fill: P.ink, wobble: 0.1 });
      // ear knobs
      for (const k of [-1, 1]) {
        const kx = HX + k * (R + 2);
        const knob = LIB.rrectPts(kx - 8, HY - 17, 16, 34, 6, 5);
        L.inkPath(ctx, knob, { closed: true, width: sw, seed: seed + 135 + k, fill: k > 0 ? P.helmetGoldDeep : P.helmetGold, wobble: 0.4 });
      }
      // shell
      const shell = LIB.ellipsePts(HX, HY, R, R, 72);
      L.inkPath(ctx, shell, { closed: true, width: ow, seed: seed + 141, fill: P.helmetGold, double: { alpha: 0.4, from: 0.05, to: 0.4 }, wobble: 1 });
      // crest plate on top
      L.inkPath(ctx, [[HX - R * 0.42, HY - R * 0.9], [HX - R * 0.3, HY - R * 0.62], [HX + R * 0.3, HY - R * 0.62], [HX + R * 0.42, HY - R * 0.9]], { width: dw * 1.3, color: P.helmetGoldDeep, seed: seed + 143, taper: 4 });
      // contour hatching on the shadow limb (lower right), two tones
      L.hatch(ctx, crescent(HX, HY, R - 1, -0.55, 2.35, 0.36, 32), { angle: -0.75, spacing: hs(6.5), width: hs(1.4), color: P.helmetGoldDeep, alpha: 0.9, length: [10, 30], bend: 3, seed: seed + 145 });
      L.hatch(ctx, crescent(HX, HY, R - 1, -0.1, 1.95, 0.16, 26), { angle: 0.35, spacing: hs(5.5), width: hs(1.2), color: P.helmetGoldDeep, alpha: 0.85, length: [6, 16], bend: 2, seed: seed + 147 });
      // lit edge upper left (helmetGoldPale)
      ctx.save();
      ctx.strokeStyle = P.helmetGoldPale;
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(HX, HY, R - 9, Math.PI * 1.08, Math.PI * 1.42);
      ctx.stroke();
      if (A.rim) {
        ctx.globalAlpha = A.rim;
        ctx.strokeStyle = P.warmLight;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(HX, HY, R - 4, Math.PI * 0.78, Math.PI * 1.25);
        ctx.stroke();
      }
      ctx.restore();
      // rivets
      ctx.save();
      ctx.fillStyle = P.helmetGoldDeep;
      for (const a of [-2.6, -1.95, -1.2, -0.55]) {
        ctx.beginPath();
        ctx.arc(HX + Math.cos(a) * R * 0.92, HY + Math.sin(a) * R * 0.92, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      // visor ring and black disc (70 % of the front); slides with the turn
      const vx = HX + turn * R * 0.24 - R * 0.02, vy = HY + R * 0.05;
      const sq = 1 - 0.22 * Math.abs(turn);
      const ringPts = LIB.ellipsePts(vx, vy, R * 0.86 * sq, R * 0.86, 60);
      L.inkPath(ctx, ringPts, { closed: true, width: sw, seed: seed + 151, fill: P.helmetGoldDeep, wobble: 0.6 });
      const vr = R * 0.76;
      const visor = LIB.ellipsePts(vx, vy, vr * sq, vr, 60);
      L.inkPath(ctx, visor, { closed: true, width: sw, seed: seed + 153, fill: P.visorBlack, wobble: 0.5 });
      // warm reflection of a light source on the visor
      if (A.reflect && A.reflect.k > 0) {
        const rf = A.reflect;
        const lx = (rf.x - A.x) / s, ly = (rf.y - A.y) / s;
        const dx = lx - vx, dy = ly - vy, dl = Math.hypot(dx, dy) || 1;
        const rx = vx + (dx / dl) * vr * 0.5 * sq, ry = vy + (dy / dl) * vr * 0.5;
        ctx.save();
        ctx.beginPath();
        LIB.tracePath(ctx, visor, true);
        ctx.clip();
        ctx.globalAlpha = clamp(rf.k) * 0.16;
        ctx.fillStyle = rf.color || P.flame;
        ctx.beginPath();
        ctx.ellipse(rx, ry, vr * 0.62 * sq, vr * 0.5, Math.atan2(dy, dx), 0, TAU);
        ctx.fill();
        ctx.globalAlpha = clamp(rf.k);
        // a small flame-shaped highlight: teardrop pointing up
        const fh = vr * 0.34, fw = vr * 0.14;
        ctx.fillStyle = rf.color || P.flame;
        ctx.beginPath();
        ctx.moveTo(rx, ry - fh * 0.6);
        ctx.quadraticCurveTo(rx + fw * 1.4, ry + fh * 0.1, rx, ry + fh * 0.4);
        ctx.quadraticCurveTo(rx - fw * 1.4, ry + fh * 0.1, rx, ry - fh * 0.6);
        ctx.fill();
        ctx.fillStyle = rf.core || P.flameCore;
        ctx.beginPath();
        ctx.ellipse(rx, ry + fh * 0.12, fw * 0.55, fh * 0.22, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // two white glint streaks at upper left: one long, one short
      ctx.save();
      ctx.strokeStyle = P.visorGlint;
      ctx.lineCap = 'round';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.ellipse(vx, vy, vr * 0.72 * sq, vr * 0.72, 0, Math.PI * 1.06, Math.PI * 1.36);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(vx, vy, vr * 0.72 * sq, vr * 0.72, 0, Math.PI * 1.45, Math.PI * 1.53);
      ctx.stroke();
      ctx.restore();
    });

    if (A.armLFront) {
      if (A.onGloveL) A.onGloveL(ctx, ...toScreen([armL.gx, armL.gy]));
      drawArm(armL, -1, A.patch, true);
      if (!A.deferGloveL) drawGlove(armL, -1);
    }
    return {
      gloveL: toScreen([armL.gx, armL.gy]),
      gloveR: toScreen([armR.gx, armR.gy]),
      drawGloveL: () => drawGlove(armL, -1),
      helmet: toScreen([HX, HY]),
      helmetR: R * s,
    };
  }

  function drawPatch(ctx, L, x, y, kind, seed, dw) {
    const r = 12;
    L.inkCircle(ctx, x, y, r, { width: dw * 1.1, seed: seed + 171, fill: kind === 'cross' ? P.white : P.suitShade, wobble: 0.2 });
    ctx.save();
    if (kind === 'gear') {
      ctx.fillStyle = P.energyYellow;
      ctx.beginPath();
      const n = 8;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const rr = i % 2 ? 6.2 : 8.4;
        const a0 = a - Math.PI / (n * 2) * 0.55, a1 = a + Math.PI / (n * 2) * 0.55;
        ctx.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
        ctx.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.suitShade;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fill();
    } else if (kind === 'flower') {
      ctx.fillStyle = P.commsGreen;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6, 3.6, 2.4, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = P.energyYellow;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, TAU);
      ctx.fill();
    } else if (kind === 'cross') {
      ctx.fillStyle = P.red;
      ctx.fillRect(x - 2.6, y - 7, 5.2, 14);
      ctx.fillRect(x - 7, y - 2.6, 14, 5.2);
    }
    ctx.restore();
  }

  // ===========================================================================
  // Scenery geometry (t-independent, built once)
  // ===========================================================================
  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(sd('geo'));
    // far range: low mesas
    const far = [[-80, HORIZON + 8]];
    for (let x = -80; x <= 2000; x += 40) {
      const m = 30 * Math.max(0, LIB.noise1(x * 0.004, sd('far'))) + 14 * LIB.noise1(x * 0.013, sd('far2'));
      const mesa = x > 900 && x < 1180 ? 34 : x > 1240 && x < 1330 ? 18 : 0;
      far.push([x, HORIZON - 10 - m - mesa]);
    }
    far.push([2000, HORIZON + 8]);
    // nearer range
    const mid = [[-80, 660]];
    for (let x = -80; x <= 2000; x += 30) {
      const m = 38 * LIB.noise1(x * 0.0032, sd('mid')) + 12 * LIB.noise1(x * 0.011, sd('mid2'));
      const dip = 46 * Math.exp(-Math.pow((x - 1560) / 300, 2)); // the valley where the base sits
      mid.push([x, 612 - m * (x < 1150 ? 1 : 0.4) + dip * 0.4 + (x < 400 ? 16 : 0)]);
    }
    mid.push([2000, 660]);
    // the ridge
    const ridge = [];
    for (let x = -80; x <= 2000; x += 24) ridge.push([x, ridgeY(x)]);
    const ridgePoly = ridge.concat([[2000, 1140], [-80, 1140]]);
    // rocks on the ridge
    const rocks = [];
    const rockX = [180, 330, 470, 560, 840, 1090, 1380, 1520, 1660, 1800, 250, 1460];
    rockX.forEach((x, i) => {
      const big = i < 10;
      const w = big ? r.range(26, 58) : r.range(16, 26);
      const h = w * r.range(0.45, 0.7);
      const y = ridgeY(x) + (big ? r.range(6, 40) : r.range(60, 110));
      const pts = [];
      const n = 9;
      for (let k = 0; k <= n; k++) {
        const a = Math.PI + (k / n) * Math.PI;
        pts.push([x + Math.cos(a) * w * (0.85 + 0.25 * r()), y + Math.sin(a) * h * (0.8 + 0.3 * r())]);
      }
      pts.push([x + w * 0.9, y + 6], [x - w * 0.9, y + 6]);
      rocks.push({ x, y, w, h, pts, seed: sd('rock', i) });
    });
    // dust streaks in the sky
    const streaks = [];
    for (let i = 0; i < 9; i++) streaks.push({ x: r.range(80, 1840), y: r.range(140, 470), len: r.range(160, 420), s: sd('streak', i) });
    GEO = { far, mid, ridge, ridgePoly, rocks, streaks };
    return GEO;
  }

  // Base Marte Uno (right valley). Domes: centre x, ground y, rx, ry.
  const DOMES = [
    { x: 1400, y: 652, rx: 66, ry: 50 },
    { x: 1560, y: 656, rx: 116, ry: 88 },
    { x: 1712, y: 654, rx: 62, ry: 46 },
    { x: 1800, y: 650, rx: 40, ry: 30 },
  ];
  const TUBES = [
    [1456, 1460, 640, 18],
    [1660, 1668, 642, 16],
    [1766, 1772, 640, 12],
  ];
  const LIGHTS = [
    [1384, 612, 'energyYellow'], [1505, 584, 'oxygenCyan'], [1592, 574, 'shieldViolet'], [1640, 600, 'commandPink'],
    [1700, 620, 'commsGreen'], [1462, 634, 'oxygenCyan'], [1792, 628, 'energyYellow'], [1560, 556, 'commsGreen'],
  ];

  function drawBaseStatic(ctx, L) {
    // plinth strip
    L.inkPath(ctx, LIB.rectPts(1320, 648, 520, 14, 20), { closed: true, width: 2, seed: sd('plinth'), fill: P.baseDeep, smooth: false });
    // tubes (behind domes)
    TUBES.forEach((tb, i) => {
      const [x0, x1, y, h] = tb;
      const pts = LIB.rrectPts(x0 - 40, y - h, x1 - x0 + 80, h + 8, 7, 8);
      L.inkPath(ctx, pts, { closed: true, width: 2.2, seed: sd('tube', i), fill: P.baseWall });
      L.hatch(ctx, pts, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.baseDeep, density: (x, yy) => clamp((yy - (y - h * 0.3)) / 8), length: [6, 14], seed: sd('tubeh', i) });
    });
    // domes
    DOMES.forEach((d, i) => {
      const pts = [];
      const n = 40;
      for (let k = 0; k <= n; k++) {
        const a = Math.PI + (k / n) * Math.PI;
        pts.push([d.x + Math.cos(a) * d.rx, d.y + Math.sin(a) * d.ry]);
      }
      L.inkPath(ctx, pts.concat([[d.x + d.rx, d.y], [d.x - d.rx, d.y]]), { closed: true, width: i === 1 ? 3 : 2.4, seed: sd('dome', i), fill: P.baseWall, smooth: true });
      // highlight crescent upper left
      const hl = [];
      for (let k = 0; k <= 20; k++) {
        const a = Math.PI * 1.08 + (k / 20) * Math.PI * 0.42;
        hl.push([d.x + Math.cos(a) * d.rx * 0.9, d.y + Math.sin(a) * d.ry * 0.9]);
      }
      for (let k = 20; k >= 0; k--) {
        const a = Math.PI * 1.08 + (k / 20) * Math.PI * 0.42;
        const kk = 0.9 - 0.16 * Math.sin((Math.PI * k) / 20);
        hl.push([d.x + Math.cos(a) * d.rx * kk, d.y + Math.sin(a) * d.ry * kk]);
      }
      ctx.save();
      ctx.fillStyle = P.baseLight;
      ctx.beginPath();
      LIB.tracePath(ctx, hl, true);
      ctx.fill();
      ctx.restore();
      // shadow: lower right, hatched baseDeep
      L.hatch(ctx, pts.concat([[d.x + d.rx, d.y], [d.x - d.rx, d.y]]), {
        angle: -Math.PI / 4, spacing: i === 1 ? 6 : 5, width: 1.3, color: P.baseDeep, alpha: 0.9, length: [8, 24], bend: 2,
        density: (x, y) => clamp(((x - d.x) / d.rx) * 1.4 + ((y - (d.y - d.ry)) / d.ry) * 0.6 - 0.35),
        seed: sd('domeh', i),
      });
      // printed layers: faint horizontal lines
      const lp = new Path2D();
      for (let yy = d.y - 6; yy > d.y - d.ry + 6; yy -= 9) {
        const f = Math.sqrt(Math.max(0, 1 - Math.pow((d.y - yy) / d.ry, 2)));
        lp.moveTo(d.x - d.rx * f + 3, yy);
        lp.lineTo(d.x + d.rx * f - 3, yy);
      }
      ctx.save();
      ctx.strokeStyle = P.baseDeep;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.stroke(lp);
      ctx.restore();
      // warm windows: a row of small rounded slots
      const nw = i === 1 ? 5 : i === 3 ? 1 : 3;
      const wy = d.y - d.ry * 0.36;
      for (let k = 0; k < nw; k++) {
        const wx = d.x + (k - (nw - 1) / 2) * d.rx * (nw > 1 ? 0.34 : 0);
        const f = Math.sqrt(Math.max(0, 1 - Math.pow((wx - d.x) / d.rx, 2)));
        if (f < 0.4) continue;
        const ww = i === 1 ? 14 : 10, wh = i === 1 ? 20 : 14;
        L.inkPath(ctx, LIB.rrectPts(wx - ww / 2, wy - wh / 2, ww, wh, 4, 4), { closed: true, width: 1.6, seed: sd('win', i, k), fill: P.warmLight, smooth: false, wobble: 0.2 });
      }
      // door on the big dome
      if (i === 1) {
        L.inkPath(ctx, LIB.rrectPts(d.x - 15, d.y - 34, 30, 34, 12, 5), { closed: true, width: 2, seed: sd('door'), fill: P.baseDeep, smooth: false, wobble: 0.3 });
        ctx.save();
        ctx.fillStyle = P.warmLight;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(d.x - 9, d.y - 27, 18, 4);
        ctx.restore();
      }
    });
    // mast with a dish
    L.inkLine(ctx, 1630, 586, 1636, 520, { width: 2.2, seed: sd('mast'), taper: 3 });
    L.inkPath(ctx, [[1618, 520], [1636, 532], [1656, 518]], { width: 2, seed: sd('dish'), taper: 3 });
    // warm light spill on the ground in front of the base (flat, no gradient)
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = P.warmLight;
    ctx.beginPath();
    ctx.ellipse(1560, 668, 230, 16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBaseLights(ctx, L, t) {
    const beatIdx = Math.floor(t / BEAT + 1e-6);
    // resource lights: one brightens each beat
    LIGHTS.forEach((lt, i) => {
      const [x, y, c] = lt;
      const hot = beatIdx % LIGHTS.length === i;
      ctx.save();
      ctx.fillStyle = P[c];
      ctx.globalAlpha = hot ? 0.38 : 0.16;
      ctx.beginPath();
      ctx.arc(x, y, hot ? 8.5 : 6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, hot ? 3.6 : 2.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    // mast light blinks on the 8th notes
    const on = Math.floor(t / (BEAT / 2) + 1e-6) % 2 === 0;
    ctx.save();
    ctx.fillStyle = P.annMagenta;
    ctx.globalAlpha = on ? 1 : 0.35;
    ctx.beginPath();
    ctx.arc(1636, 518, 3.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function ring(ctx, x, y, r0, r1, t, a, color, frames = 12, width = 3) {
    if (t < a) return;
    const u = clamp((t - a) / (frames * FR) + 1 / frames);
    if (u >= 1) return;
    const rr = lerp(r0, r1, E.outExpo(u));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1 - E.inQuad(u);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(x, y, rr, rr * 1.08, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Static scenery is rendered once per render scale (lines frozen: boil false) and blitted.
  function layer(name, fn) {
    const S = FILM.S || 1;
    return LIB.cached(['27', name, S].join('|'), () => {
      const c = FILM.makeCanvas(Math.round(1920 * S), Math.round(1080 * S));
      const g = c.getContext('2d');
      g.scale(S, S);
      fn(g);
      return c;
    });
  }
  // a lib proxy whose line / tone calls are frozen (no boil) for cached layers
  const FROZEN = {
    inkPath: (c, p, o) => LIB.inkPath(c, p, Object.assign({}, o, { boil: false })),
    inkLine: (c, a, b, d, e, o) => LIB.inkLine(c, a, b, d, e, Object.assign({}, o, { boil: false })),
    inkCircle: (c, a, b, r, o) => LIB.inkCircle(c, a, b, r, Object.assign({}, o, { boil: false })),
    hatch: (c, p, o) => LIB.hatch(c, p, Object.assign({}, o, { boil: false })),
    stipple: (c, p, o) => LIB.stipple(c, p, Object.assign({}, o, { boil: false })),
  };

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const G = geo();
      const W = info.W, H = info.H;

      const zoom = lerp(1.08, 1.0, E.inOutSine(t / info.dur));
      L.camera(ctx, { x: 960, y: 520, zoom }, () => {
        // 1. sky
        ctx.fillStyle = P.marsSky;
        ctx.fillRect(-200, -200, W + 400, H + 400);
        const glowK = lerp(0.65, 1, E.inOutSine(clamp(tw / B_SUN)));
        const bands = [
          [470, LIB.mix(P.marsSky, P.warmLight, 0.12 * glowK)],
          [520, LIB.mix(P.marsSky, P.warmLight, 0.24 * glowK)],
          [560, LIB.mix(P.marsSky, P.warmLight, 0.38 * glowK)],
        ];
        bands.forEach(([y0, c], i) => {
          const pts = [];
          for (let x = -200; x <= W + 200; x += 40) pts.push([x, y0 + 8 * LIB.noise1(x * 0.004, sd('band', i)) + Math.max(0, (x - SUN_X) * 0.035) * (i + 1) * 0.5]);
          pts.push([W + 200, 800], [-200, 800]);
          ctx.save();
          ctx.fillStyle = c;
          ctx.beginPath();
          LIB.tracePath(ctx, pts, true);
          ctx.fill();
          ctx.restore();
        });
        // dust streaks drifting on twos; a gust on beat 2
        const gust = E.outCubic(clamp((tw - 0.75) / 1.5));
        G.streaks.forEach((st, i) => {
          const x = st.x + tw * 6 + gust * 20 * (i % 2 ? 1 : 0.5);
          L.inkLine(ctx, x, st.y, x + st.len, st.y + 4, { width: 1.6, color: P.marsDust, alpha: 0.55, seed: st.s, taper: [60, 80], wobble: 3 });
        });

        // 2. sun: rises on twos, clears the horizon at B_SUN
        const sr = 40;
        const sy = lerp(HORIZON + 26, HORIZON - sr - 34, E.outCubic(clamp(tw / B_SUN)));
        const halo = ctx.createRadialGradient(SUN_X, sy, sr * 0.6, SUN_X, sy, sr * 5.5);
        halo.addColorStop(0, LIB.rgba(P.warmLight, 0.55));
        halo.addColorStop(0.35, LIB.rgba(P.warmLight, 0.16));
        halo.addColorStop(1, LIB.rgba(P.warmLight, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(SUN_X - sr * 6, sy - sr * 6, sr * 12, sr * 12);
        L.inkCircle(ctx, SUN_X, sy, sr, { width: 2.2, color: P.ochre, fill: LIB.mix(P.sun, P.white, 0.55), seed: sd('sun'), wobble: 0.6 });
        L.stipple(ctx, LIB.ellipsePts(SUN_X, sy, sr - 6, sr - 6, 32), { spacing: 7, r: [0.8, 1.4], color: P.sun, alpha: 0.6, seed: sd('sunst') });
        // sun-clear sparkle ticks at the moment it clears
        if (t >= B_SUN) {
          const u = clamp((t - B_SUN) / (12 * FR) + 1 / 12);
          if (u < 1) L.ticks(ctx, SUN_X, sy, { r: sr + 10 + 22 * E.outExpo(u), n: 16, len: 14, color: P.annYellow, alpha: 1 - u, width: 2.2 });
        }

        // 3-6. static scenery, cached per render scale (lines frozen); live boil on the crest line
        const L2 = FROZEN;
        ctx.drawImage(layer('far', (g) => {
        // 3. far range (covers the lower sun)
        L2.inkPath(g, G.far, { closed: true, width: 1.8, color: P.inkSoft, alpha: 0.7, fill: LIB.mix(P.marsSky, P.marsShadow, 0.28), seed: sd('far'), wobble: 1.5 });
        L2.hatch(g, G.far, { angle: -Math.PI / 4, spacing: 9, width: 1.2, color: P.marsShadow, alpha: 0.35, length: [14, 40], density: (x) => 0.35 + 0.35 * LIB.noise1(x * 0.01, 9), seed: sd('farh') });
        }), 0, 0, 1920, 1080);
        ctx.drawImage(layer('mid', (g) => {
        // 4. mid range / valley
        L2.inkPath(g, G.mid, { closed: true, width: 2.4, color: P.ink, alpha: 0.85, fill: P.marsDust, seed: sd('mid'), wobble: 1.5 });
        L2.hatch(g, G.mid, { angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.marsShadow, alpha: 0.7, length: [16, 50], density: (x, y) => clamp(0.25 + 0.5 * LIB.noise1(x * 0.006, 21) + (y - 610) / 120), seed: sd('midh') });
        L2.stipple(g, G.mid, { spacing: 16, r: [0.9, 1.6], color: P.marsShadow, alpha: 0.6, seed: sd('midst'), bounds: { x: -80, y: 560, w: 2080, h: 200 } });

          drawBaseStatic(g, L2);
        }), 0, 0, 1920, 1080);
        drawBaseLights(ctx, L, t);
        ctx.drawImage(layer('ridge', (g) => {
        // 6. ridge
        L2.inkPath(g, G.ridgePoly, { closed: true, width: 3.2, fill: P.marsSoil, seed: sd('ridge'), wobble: 1.4 });
        L2.hatch(g, G.ridgePoly, { angle: -Math.PI / 4, spacing: 8, width: 1.4, color: P.marsShadow, alpha: 0.85, length: [18, 60], density: (x, y) => clamp((y - ridgeY(x) - 30) / 110 + 0.15 * LIB.noise1(x * 0.01, 3)), seed: sd('ridgeh') });
        L2.hatch(g, G.ridgePoly, { angle: -Math.PI / 4 + 1.05, spacing: 7, width: 1.3, color: P.marsShadow, alpha: 0.8, length: [14, 40], density: (x, y) => clamp((y - 840) / 90), seed: sd('ridgex') });
        L2.stipple(g, G.ridgePoly, { spacing: 11, r: [1, 2], color: P.marsShadow, alpha: 0.7, density: (x, y) => clamp(1 - (y - ridgeY(x)) / 160), seed: sd('ridgest'), bounds: { x: -80, y: 680, w: 2080, h: 200 } });
        L2.stipple(g, G.ridgePoly, { spacing: 15, r: [0.9, 1.6], color: P.marsDust, alpha: 0.75, density: (x, y) => clamp(1 - (y - ridgeY(x)) / 100), seed: sd('ridgest2'), bounds: { x: -80, y: 680, w: 2080, h: 160 } });
        // crest lit edge
        L2.inkPath(g, G.ridge.map((p) => [p[0], p[1] + 5]), { width: 2, color: P.marsDust, alpha: 0.9, seed: sd('crest'), taper: 40 });
        G.rocks.forEach((rk) => {
          L2.inkPath(g, rk.pts, { closed: true, width: 2.2, fill: LIB.mix(P.marsSoil, P.marsDust, 0.35), seed: rk.seed, wobble: 0.6 });
          L2.hatch(g, rk.pts, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.marsShadow, density: (x) => clamp((x - rk.x + rk.w * 0.1) / (rk.w * 0.5)), length: [6, 16], seed: rk.seed + 1 });
        });

        }), 0, 0, 1920, 1080);
        L.inkPath(ctx, G.ridge, { width: 3.2, seed: sd('ridge'), wobble: 1.4, taper: 0 });

        // 7. the crew
        CREW.forEach((c, i) => {
          const a = B_RING[i];
          // turn toward camera on the ring beat, in 4 drawings on twos
          const k = tw < a ? 0 : E.outBack(clamp((tw - a) / (4 / 12)));
          const turn = lerp(-0.85, 0, k);
          const y = ridgeY(c.x) + 6;
          drawAstro(ctx, L, {
            x: c.x, y, h: HGT, turn, patch: c.patch, seed: sd('astro', i), ow: 4.2,
            armL: 0.2 + 0.05 * i, armR: 0.18,
            rim: 0.55 + 0.35 * clamp(tw / B_SUN),
            blink: Math.floor(t / BEAT + 1e-6) + i,
            shadow: P.marsShadow,
          });
        });
      });

      // 8. overlays (screen-locked to the camera so they ring the figures)
      const cam = (x, y) => [960 + (x - 960) * zoom, 540 + (y - 520) * zoom];
      CREW.forEach((c, i) => {
        const y = ridgeY(c.x) + 6;
        const [cx, cy] = cam(c.x, y - HGT * 0.5);
        ring(ctx, cx, cy, 150 * zoom, 230 * zoom, t, B_RING[i], P.annYellow, 12, 3);
        // a quiet held bracket under each named astronaut after their ring
        if (t >= B_RING[i]) {
          const u = clamp((t - B_RING[i]) / (9 * FR) + 1 / 9);
          const [bx, by] = cam(c.x, y + 16);
          L.bracket(ctx, bx - 74 * zoom, by, bx + 74 * zoom, by, { style: 'square', offset: -10, cap: 10, color: P.annYellow, alpha: 0.9, width: 2, p: E.outExpo(u) });
        }
      });
    },
  });
})();
