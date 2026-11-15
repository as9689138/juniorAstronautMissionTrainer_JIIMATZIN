/*
 * 04 base-marte-uno : Base Marte Uno, 2030.
 * Global T 22.5 to 31.5 (9 s, 12 beats), illustrated (paper plate, Martian morning).
 *
 * Layers, back to front (all under a slow pan right of 120 px):
 *   1. Sky: marsSky above y 520, pale dawn bands, dust streaks.
 *   2. Small pale sun upper left with one soft halo.
 *   3. Far mesas on the horizon.
 *   4. Ground: marsSoil with hatched dunes and rocks; calm and dark below y 860.
 *   5. Base Marte Uno (art bible 10.5): violet domes, tubes, airlock, resource lights; windows light one per beat
 *      from t 4.5 (T 27.0).
 *   6. The three astronauts (art bible 10.1; Wenceslao, Judith, Atlas, 300 px) and the IA robot (10.9) walking
 *      in from the left on twos, stopping at t 6.75 (T 29.25).
 *   7. Overlay: annYellow ring on the airlock at t 6.75 (T 29.25).
 *
 * The astronaut drawing (drawAstro, drawPatch and helpers) is copied verbatim from the prologue's
 * 27 tres-astronautas, with one addition: optional walking legs (A.legs).
 */
(function () {
  'use strict';
  const ID = 'base-marte-uno';
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
  const B_WIN = 4.5; // T 27.0 first window; then one per beat
  const B_STOP = 6.75; // T 29.25 crew stops, airlock ring
  const PAN = 120;

  // ---- composition (world px; camera pans right by PAN) ----
  const HORIZON = 520;
  const FEET = 806;
  const HGT = 300;
  const CREW = [
    { x: 520, patch: 'gear', key: 'wenceslao' },
    { x: 705, patch: 'flower', key: 'judith' },
    { x: 890, patch: 'cross', key: 'atlas' },
  ];
  const ROBOT_X = 1050;
  const WALK = 820; // distance walked from off-screen left
  const SUN_X = 330, SUN_Y = 190;
  const AIR = { x: 1430, y: 690 }; // airlock door centre (base space)
  // the base is authored around (1500, 662) and placed scaled 1.3 with its anchor at x 1590
  const BT = { ox: 1500, oy: 662, tx: 1590, k: 1.3 };
  const baseXf = (c, fn) => { c.save(); c.translate(BT.tx, BT.oy); c.scale(BT.k, BT.k); c.translate(-BT.ox, -BT.oy); fn(); c.restore(); };
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
        const lg = A.legs; ctx.save(); if (lg) ctx.translate(side < 0 ? lg.dL : lg.dR, -(side < 0 ? lg.lL : lg.lR) / s);
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
        ctx.restore();
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
  // The IA robot (art bible 10.9). Unit space 240 px tall, feet centred at (0, 0).
  // ===========================================================================
  function drawRobot(ctx, L, R) {
    const s = R.h / 240;
    const seed = R.seed;
    const ow = 3.2 / s, dw = 1.5 / s;
    ctx.save();
    ctx.translate(R.x, R.y);
    ctx.scale(s, s);
    // shadow
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = P.marsShadow;
    ctx.beginPath();
    ctx.ellipse(6, 2, 78, 10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.translate(0, -(R.bob || 0));
    // treads: a rounded belt with two wheels each side
    const tread = LIB.rrectPts(-74, -44, 148, 44, 22, 8);
    L.inkPath(ctx, tread, { closed: true, width: ow, fill: P.rocketBlack, seed: seed + 1, wobble: 0.5 });
    for (const wx of [-50, 50]) {
      L.inkCircle(ctx, wx, -22, 17, { width: dw * 1.4, fill: P.hoseGrey, seed: seed + 2 + wx, wobble: 0.3 });
      // spokes turn with the roll
      const a0 = R.roll || 0;
      for (let k = 0; k < 3; k++) {
        const a = a0 + (k * TAU) / 3;
        L.inkLine(ctx, wx, -22, wx + Math.cos(a) * 13, -22 + Math.sin(a) * 13, { width: dw, color: P.ink, seed: seed + 5 + k, taper: 0 });
      }
    }
    // tread lugs
    const lug = new Path2D();
    for (let x = -64 + ((R.roll || 0) * 8) % 12; x < 66; x += 12) { lug.moveTo(x, -44); lug.lineTo(x, -38); lug.moveTo(x, 0); lug.lineTo(x, -6); }
    ctx.save();
    ctx.strokeStyle = P.hoseGrey;
    ctx.lineWidth = dw * 1.2;
    ctx.stroke(lug);
    ctx.restore();
    // body box
    const body = LIB.rrectPts(-62, -134, 124, 92, 8, 6);
    L.inkPath(ctx, body, { closed: true, width: ow, fill: P.eagleSilver, seed: seed + 11, wobble: 0.5, smooth: false });
    L.hatch(ctx, body, { angle: -Math.PI / 4, spacing: 6, width: 1.3 / s, color: P.hoseGrey, alpha: 0.9, length: [8, 22], density: (x, y) => clamp((x - 20) / 30) + clamp((y + 60) / 20) * 0.5, seed: seed + 12 });
    // pink heartbeat display
    L.inkPath(ctx, LIB.rectPts(-46, -122, 64, 34, 6), { closed: true, width: dw * 1.4, fill: P.rocketBlack, seed: seed + 13, smooth: false });
    const hb = [[-42, -104], [-28, -104], [-22, -116], [-16, -94], [-10, -108], [-4, -104], [14, -104]];
    const shift = R.pulse || 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-46, -122, 64, 34);
    ctx.clip();
    L.inkPath(ctx, hb.map((p) => [p[0] + shift, p[1]]), { width: dw * 1.4, color: P.commandPink, smooth: false, seed: seed + 14, taper: 0 });
    ctx.restore();
    // buttons
    const btn = [P.energyYellow, P.commsGreen, P.annMagenta];
    btn.forEach((c, i) => L.inkCircle(ctx, 38, -116 + i * 14, 4.5, { width: dw, fill: c, seed: seed + 15 + i, wobble: 0.1 }));
    L.inkLine(ctx, -46, -78, 46, -78, { width: dw, color: P.inkSoft, seed: seed + 19, taper: 0 });
    L.inkLine(ctx, -46, -66, 46, -66, { width: dw, color: P.inkSoft, seed: seed + 20, taper: 0 });
    // neck pole
    L.inkPath(ctx, LIB.rectPts(-6, -166, 12, 34, 4), { closed: true, width: dw * 1.4, fill: P.hoseGrey, seed: seed + 21, smooth: false });
    // head: grey frame with a black screen
    const head = LIB.rrectPts(-56, -236, 112, 74, 10, 6);
    L.inkPath(ctx, head, { closed: true, width: ow, fill: P.hoseGrey, seed: seed + 22, wobble: 0.4, smooth: false });
    L.inkPath(ctx, LIB.rrectPts(-46, -228, 92, 58, 8, 6), { closed: true, width: dw * 1.4, fill: P.visorBlack, seed: seed + 23, smooth: false });
    // ear bolts
    for (const k of [-1, 1]) L.inkPath(ctx, LIB.rectPts(k * 60 - 6, -212, 12, 26, 4), { closed: true, width: dw * 1.2, fill: P.eagleSilver, seed: seed + 24 + k, smooth: false });
    // antenna zigzag
    L.inkPath(ctx, [[8, -236], [16, -250], [6, -262], [14, -276]], { width: dw * 1.4, smooth: false, seed: seed + 27, taper: [2, 2] });
    L.inkCircle(ctx, 14, -278, 4, { width: dw, fill: P.ink, seed: seed + 28 });
    // cyan eyes (blink on a beat)
    ctx.save();
    ctx.fillStyle = P.oxygenCyan;
    const look = R.look || 0;
    if (R.blink) {
      ctx.fillRect(-26 + look, -199, 16, 4);
      ctx.fillRect(10 + look, -199, 16, 4);
    } else {
      ctx.fillRect(-24 + look, -208, 12, 18);
      ctx.fillRect(12 + look, -208, 12, 18);
    }
    ctx.globalAlpha = 0.25;
    ctx.fillRect(-30 + look, -196 + 18, 60, 3);
    ctx.restore();
    // glint on the screen
    L.inkLine(ctx, -38, -220, -24, -220, { width: 3 / s, color: P.visorGlint, alpha: 0.7, seed: seed + 29, taper: 2 });
    ctx.restore();
  }

  // ===========================================================================
  // Scenery
  // ===========================================================================
  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(sd('geo'));
    const far = [[-80, HORIZON + 10]];
    for (let x = -80; x <= 2140; x += 40) {
      const m = 26 * Math.max(0, LIB.noise1(x * 0.004, sd('far'))) + 10 * LIB.noise1(x * 0.013, sd('far2'));
      const mesa = x > 300 && x < 520 ? 30 : x > 1820 && x < 1960 ? 22 : 0;
      far.push([x, HORIZON - 4 - m - mesa]);
    }
    far.push([2140, HORIZON + 10]);
    const ground = [];
    for (let x = -80; x <= 2140; x += 30) ground.push([x, HORIZON + 4 + 4 * LIB.noise1(x * 0.01, sd('g'))]);
    const groundPoly = ground.concat([[2140, 1160], [-80, 1160]]);
    // dunes: crest curves across the ground
    const dunes = [];
    const rows = [[560, 26, 0.0042], [612, 34, 0.0035], [700, 30, 0.003], [900, 40, 0.0028]];
    rows.forEach(([y0, a, f], i) => {
      const pts = [];
      for (let x = -80; x <= 2140; x += 30) pts.push([x, y0 + a * LIB.noise1(x * f, sd('dune', i))]);
      dunes.push(pts);
    });
    const rocks = [];
    const rx = [140, 380, 1040, 1700, 1930, 260, 1980];
    rx.forEach((x, i) => {
      const w = i < 5 ? r.range(26, 52) : r.range(14, 22);
      const h = w * r.range(0.45, 0.7);
      const y = i < 5 ? r.range(830, 880) : r.range(640, 700);
      const pts = [];
      for (let k = 0; k <= 9; k++) {
        const a = Math.PI + (k / 9) * Math.PI;
        pts.push([x + Math.cos(a) * w * (0.85 + 0.25 * r()), y + Math.sin(a) * h * (0.8 + 0.3 * r())]);
      }
      pts.push([x + w * 0.9, y + 6], [x - w * 0.9, y + 6]);
      rocks.push({ x, y, w, pts, seed: sd('rock', i) });
    });
    const streaks = [];
    for (let i = 0; i < 8; i++) streaks.push({ x: r.range(80, 2000), y: r.range(120, 440), len: r.range(160, 380), s: sd('streak', i) });
    // the track the crew walks (footprints / tread marks)
    GEO = { far, ground, groundPoly, dunes, rocks, streaks };
    return GEO;
  }

  // Base Marte Uno: domes (centre x, ground y, rx, ry)
  const DOMES = [
    { x: 1250, y: 652, rx: 92, ry: 70 },
    { x: 1500, y: 658, rx: 168, ry: 130 },
    { x: 1740, y: 654, rx: 94, ry: 70 },
    { x: 1890, y: 650, rx: 62, ry: 46 },
  ];
  const TUBES = [
    [1330, 1340, 640, 24],
    [1660, 1670, 642, 22],
    [1826, 1832, 640, 16],
  ];
  const LIGHTS = [
    [1218, 604, 'energyYellow'], [1388, 566, 'oxygenCyan'], [1520, 540, 'shieldViolet'], [1600, 572, 'commandPink'],
    [1730, 604, 'commsGreen'], [1336, 618, 'oxygenCyan'], [1882, 622, 'energyYellow'], [1470, 538, 'commsGreen'],
  ];
  // windows: [x, y, w, h], left to right; lit one group per beat from B_WIN
  const WINDOWS = (() => {
    const out = [];
    DOMES.forEach((d, i) => {
      const nw = i === 1 ? 5 : i === 3 ? 1 : 3;
      const wy = d.y - d.ry * 0.4;
      for (let k = 0; k < nw; k++) {
        const wx = d.x + (k - (nw - 1) / 2) * d.rx * (nw > 1 ? 0.32 : 0);
        if (i === 1 && k === 2) continue; // airlock below the centre
        const ww = i === 1 ? 20 : 15, wh = i === 1 ? 28 : 20;
        out.push([wx, wy, ww, wh, i, k]);
      }
    });
    return out.sort((a, b) => a[0] - b[0]);
  })();

  function drawBaseStatic(ctx, L) {
    L.inkPath(ctx, LIB.rectPts(1140, 648, 820, 16, 20), { closed: true, width: 2, seed: sd('plinth'), fill: P.baseDeep, smooth: false });
    TUBES.forEach((tb, i) => {
      const [x0, x1, y, h] = tb;
      const pts = LIB.rrectPts(x0 - 50, y - h, x1 - x0 + 100, h + 8, 9, 8);
      L.inkPath(ctx, pts, { closed: true, width: 2.4, seed: sd('tube', i), fill: P.baseWall });
      L.hatch(ctx, pts, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.baseDeep, density: (x, yy) => clamp((yy - (y - h * 0.3)) / 8), length: [6, 14], seed: sd('tubeh', i) });
      for (let rx = x0 - 40; rx < x1 + 50; rx += 18) L.inkLine(ctx, rx, y - h + 2, rx, y + 6, { width: 1.2, color: P.baseDeep, alpha: 0.5, seed: sd('tr', i, rx), taper: 0 });
    });
    DOMES.forEach((d, i) => {
      const pts = [];
      const n = 44;
      for (let k = 0; k <= n; k++) {
        const a = Math.PI + (k / n) * Math.PI;
        pts.push([d.x + Math.cos(a) * d.rx, d.y + Math.sin(a) * d.ry]);
      }
      const shape = pts.concat([[d.x + d.rx, d.y], [d.x - d.rx, d.y]]);
      L.inkPath(ctx, shape, { closed: true, width: i === 1 ? 4.2 : 3, seed: sd('dome', i), fill: P.baseWall, smooth: true, double: i === 1 ? { alpha: 0.4, from: 0.05, to: 0.4 } : undefined });
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
      L.hatch(ctx, shape, {
        angle: -Math.PI / 4, spacing: i === 1 ? 6 : 5, width: 1.3, color: P.baseDeep, alpha: 0.9, length: [8, 26], bend: 2,
        density: (x, y) => clamp(((x - d.x) / d.rx) * 1.4 + ((y - (d.y - d.ry)) / d.ry) * 0.6 - 0.35),
        seed: sd('domeh', i),
      });
      L.hatch(ctx, shape, {
        angle: Math.PI * 0.58, spacing: 7, width: 1.2, color: P.baseDeep, alpha: 0.7, length: [6, 18],
        density: (x, y) => clamp(((x - d.x) / d.rx) * 2 - 1.1),
        seed: sd('domex', i),
      });
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
    });
    // window frames (dark until lit; the lit fill is drawn live)
    WINDOWS.forEach((w, j) => {
      L.inkPath(ctx, LIB.rrectPts(w[0] - w[2] / 2, w[1] - w[3] / 2, w[2], w[3], 5, 4), { closed: true, width: 1.8, seed: sd('win', j), fill: P.baseDeep, smooth: false, wobble: 0.2 });
    });
    // airlock: a short vestibule in front of the big dome
    const ax = AIR.x, ay = 664;
    const vest = LIB.rrectPts(ax - 58, ay - 88, 116, 92, 26, 8);
    L.inkPath(ctx, vest, { closed: true, width: 3.4, seed: sd('vest'), fill: P.baseWall });
    L.hatch(ctx, vest, { angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.baseDeep, alpha: 0.9, density: (x) => clamp((x - ax) / 40 + 0.2), length: [8, 20], seed: sd('vesth') });
    L.inkPath(ctx, LIB.rrectPts(ax - 26, ay - 70, 52, 74, 20, 6), { closed: true, width: 2.4, seed: sd('door'), fill: P.baseDeep, smooth: false });
    L.inkLine(ctx, ax, ay - 66, ax, ay + 2, { width: 1.4, color: P.baseLight, alpha: 0.6, seed: sd('doorseam'), taper: 0 });
    // mast with a dish
    L.inkLine(ctx, 1600, 556, 1608, 470, { width: 2.6, seed: sd('mast'), taper: 3 });
    L.inkPath(ctx, [[1584, 470], [1608, 486], [1634, 466]], { width: 2.4, seed: sd('dish'), taper: 3 });
    // solar panels on the left
    for (let k = 0; k < 3; k++) {
      const px = 1090 + k * 34, py = 640;
      L.inkLine(ctx, px + 12, py, px + 12, py - 22, { width: 1.6, seed: sd('pp', k), taper: 0 });
      L.inkPath(ctx, [[px, py - 22], [px + 28, py - 30], [px + 30, py - 18], [px + 2, py - 10]], { closed: true, width: 1.8, fill: P.baseDeep, seed: sd('pv', k), smooth: false });
      L.inkLine(ctx, px + 4, py - 18, px + 28, py - 25, { width: 1, color: P.baseLight, alpha: 0.6, seed: sd('pvl', k), taper: 0 });
    }
  }

  function drawBaseLive(ctx, L, t) {
    // windows: one group per beat from B_WIN (warm chord)
    const nb = 6;
    const k = t < B_WIN ? -1 : Math.floor((t - B_WIN) / BEAT + 1e-6);
    WINDOWS.forEach((w, j) => {
      const g = Math.floor((j * nb) / WINDOWS.length);
      if (g > k) return;
      const since = t - (B_WIN + g * BEAT);
      const flash = since < 0.25 ? 1 : 0;
      ctx.save();
      ctx.fillStyle = P.warmLight;
      ctx.fillRect(w[0] - w[2] / 2 + 2, w[1] - w[3] / 2 + 2, w[2] - 4, w[3] - 4);
      if (flash) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(w[0], w[1], w[3] * 0.9, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    });
    // warm spill on the ground grows with the lit windows
    const lit = clamp((k + 1) / nb);
    if (lit > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 * lit;
      ctx.fillStyle = P.warmLight;
      ctx.beginPath();
      ctx.ellipse(1520, 676, 320, 18, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // resource lights: one brightens each beat
    const beatIdx = Math.floor(t / BEAT + 1e-6);
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
    const on = Math.floor(t / (BEAT / 2) + 1e-6) % 2 === 0;
    ctx.save();
    ctx.fillStyle = P.annMagenta;
    ctx.globalAlpha = on ? 1 : 0.35;
    ctx.beginPath();
    ctx.arc(1634, 465, 3.4, 0, TAU);
    ctx.fill();
    // airlock status light: green once the crew arrives
    ctx.globalAlpha = 1;
    ctx.fillStyle = t >= B_STOP ? P.commsGreen : P.energyYellow;
    ctx.beginPath();
    ctx.arc(AIR.x, 588, 4, 0, TAU);
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
    ctx.ellipse(x, y, rr, rr, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function layer(name, fn) {
    const S = FILM.S || 1;
    return LIB.cached(['04', name, S].join('|'), () => {
      const c = FILM.makeCanvas(Math.round(2100 * S), Math.round(1080 * S));
      const g = c.getContext('2d');
      g.scale(S, S);
      fn(g);
      return c;
    });
  }
  const FROZEN = {
    inkPath: (c, p, o) => LIB.inkPath(c, p, Object.assign({}, o, { boil: false })),
    inkLine: (c, a, b, d, e, o) => LIB.inkLine(c, a, b, d, e, Object.assign({}, o, { boil: false })),
    inkCircle: (c, a, b, r, o) => LIB.inkCircle(c, a, b, r, Object.assign({}, o, { boil: false })),
    hatch: (c, p, o) => LIB.hatch(c, p, Object.assign({}, o, { boil: false })),
    stipple: (c, p, o) => LIB.stipple(c, p, Object.assign({}, o, { boil: false })),
  };

  // walk progress for a member: 0 at t 0, 1 at B_STOP (eases into the stop)
  function walkU(tw) {
    const u = clamp(tw / B_STOP);
    return u < 0.8 ? u * 0.9 / 0.8 * 1 : 0.9 + 0.1 * E.outQuad((u - 0.8) / 0.2);
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const G = geo();
      const W = 2100;
      const camX = 960 + PAN * E.inOutSine(t / info.dur);

      L.camera(ctx, { x: camX, y: 540, zoom: 1 }, () => {
        // 1-4. static scenery
        ctx.drawImage(layer('land', (g) => {
          const L2 = FROZEN;
          g.fillStyle = P.marsSky;
          g.fillRect(-200, -200, W + 400, 1500);
          [[400, 0.1], [455, 0.2], [495, 0.32]].forEach(([y0, k], i) => {
            const pts = [];
            for (let x = -200; x <= W + 200; x += 40) pts.push([x, y0 + 8 * LIB.noise1(x * 0.004, sd('band', i))]);
            pts.push([W + 200, 700], [-200, 700]);
            g.fillStyle = LIB.mix(P.marsSky, P.warmLight, k);
            g.beginPath();
            LIB.tracePath(g, pts, true);
            g.fill();
          });
          L2.inkPath(g, G.far, { closed: true, width: 1.8, color: P.inkSoft, alpha: 0.7, fill: LIB.mix(P.marsSky, P.marsShadow, 0.28), seed: sd('far'), wobble: 1.5 });
          L2.hatch(g, G.far, { angle: -Math.PI / 4, spacing: 9, width: 1.2, color: P.marsShadow, alpha: 0.4, length: [14, 40], seed: sd('farh') });
          L2.inkPath(g, G.groundPoly, { closed: true, width: 2.6, fill: P.marsSoil, seed: sd('ground'), wobble: 1.2 });
          // dunes: lit crest, hatched lee side below each crest
          G.dunes.forEach((pts, i) => {
            const lee = pts.concat(pts.slice().reverse().map((p) => [p[0], p[1] + 46 + i * 10]));
            L2.hatch(g, lee, { angle: -Math.PI / 4, spacing: 8 - i, width: 1.3, color: P.marsShadow, alpha: 0.75, length: [16, 46], density: (x) => clamp(0.35 + 0.6 * LIB.noise1(x * 0.006, sd('dd', i))), seed: sd('duneh', i) });
            L2.inkPath(g, pts, { width: 2, color: P.marsShadow, alpha: 0.9, seed: sd('dune', i), taper: 60 });
            L2.inkPath(g, pts.map((p) => [p[0], p[1] - 4]), { width: 2.2, color: P.marsDust, alpha: 0.9, seed: sd('dunel', i), taper: 60 });
          });
          L2.stipple(g, G.groundPoly, { spacing: 13, r: [0.9, 1.8], color: P.marsShadow, alpha: 0.6, seed: sd('gst'), bounds: { x: -80, y: 520, w: 2200, h: 360 } });
          L2.stipple(g, G.groundPoly, { spacing: 17, r: [0.9, 1.6], color: P.marsDust, alpha: 0.7, seed: sd('gst2'), bounds: { x: -80, y: 520, w: 2200, h: 360 } });
          // calm darker band at the bottom (subtitles)
          L2.hatch(g, LIB.rectPts(-80, 850, 2240, 300, 8), { angle: -Math.PI / 4 + 1.05, spacing: 7, width: 1.3, color: P.marsShadow, alpha: 0.75, length: [14, 40], density: (x, y) => clamp((y - 850) / 80), seed: sd('lowx') });
          G.rocks.forEach((rk) => {
            L2.inkPath(g, rk.pts, { closed: true, width: 2.2, fill: LIB.mix(P.marsSoil, P.marsDust, 0.35), seed: rk.seed, wobble: 0.6 });
            L2.hatch(g, rk.pts, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.marsShadow, density: (x) => clamp((x - rk.x + rk.w * 0.1) / (rk.w * 0.5)), length: [6, 16], seed: rk.seed + 1 });
          });
          baseXf(g, () => drawBaseStatic(g, L2));
        }), 0, 0, W, 1080);

        // 2. sun with one soft halo
        const sr = 30;
        const halo = ctx.createRadialGradient(SUN_X, SUN_Y, sr * 0.6, SUN_X, SUN_Y, sr * 5);
        halo.addColorStop(0, LIB.rgba(P.warmLight, 0.5));
        halo.addColorStop(0.35, LIB.rgba(P.warmLight, 0.14));
        halo.addColorStop(1, LIB.rgba(P.warmLight, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(SUN_X - sr * 6, SUN_Y - sr * 6, sr * 12, sr * 12);
        L.inkCircle(ctx, SUN_X, SUN_Y, sr, { width: 2.2, color: P.ochre, fill: LIB.mix(P.sun, P.white, 0.6), seed: sd('sun'), wobble: 0.6 });
        // dust streaks drifting
        G.streaks.forEach((st, i) => {
          const x = st.x + tw * 8 * (i % 2 ? 1 : 0.6);
          L.inkLine(ctx, x, st.y, x + st.len, st.y + 4, { width: 1.6, color: P.marsDust, alpha: 0.5, seed: st.s, taper: [60, 80], wobble: 3 });
        });

        baseXf(ctx, () => drawBaseLive(ctx, L, t));
        // live boil on the big dome and horizon
        L.inkPath(ctx, G.ground, { width: 2.6, seed: sd('ground'), wobble: 1.2, taper: 0 });

        // 6. crew: robot first (furthest right, slightly behind), then the astronauts right to left
        const wu = walkU(tw);
        const off = -WALK * (1 - wu);
        const moving = tw < B_STOP;
        const ph = (wu * WALK) / 52 * Math.PI;
        drawRobot(ctx, L, {
          x: ROBOT_X + off, y: FEET - 30, h: HGT * 0.8, seed: sd('robot'),
          roll: wu * WALK / 20, bob: moving ? Math.abs(Math.sin(ph * 2)) * 2 : 0,
          pulse: ((Math.floor(t / BEAT + 1e-6) % 4) * 6) - 9,
          blink: Math.floor(t / BEAT + 1e-6) % 5 === 3 && (t % BEAT) < 0.25,
          look: moving ? 4 : -6,
        });
        for (let i = CREW.length - 1; i >= 0; i--) {
          const c = CREW[i];
          const p = ph + i * 1.3;
          const sw = moving ? Math.sin(p) : 0;
          const lift = moving ? Math.max(0, Math.sin(p)) * 14 : 0;
          const lift2 = moving ? Math.max(0, -Math.sin(p)) * 14 : 0;
          drawAstro(ctx, L, {
            x: c.x + off, y: FEET + (i % 2) * 6 - (moving ? Math.abs(Math.cos(p)) * 4 : 0), h: HGT,
            turn: moving ? 0.75 : lerp(0.75, 0.45, E.outBack(clamp((tw - B_STOP) / 0.5))),
            patch: c.patch, seed: sd('astro', i), ow: 4.2,
            armL: 0.2 + 0.32 * sw, armR: 0.2 - 0.32 * sw,
            legs: { dL: 8 * sw, dR: -8 * sw, lL: lift, lR: lift2 },
            rim: 0.6, blink: Math.floor(t / BEAT + 1e-6) + i, shadow: P.marsShadow,
          });
        }
      });

      // 7. overlay: annYellow ring on the airlock (screen-fixed through the pan)
      const sx = BT.tx + (AIR.x - BT.ox) * BT.k - (camX - 960), sy = BT.oy + (AIR.y - 66 - BT.oy) * BT.k;
      ring(ctx, sx, sy, 78, 140, t, B_STOP, P.annYellow, 14, 3);
      if (t >= B_STOP) {
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = clamp((t - B_STOP) / 0.3);
        ctx.beginPath();
        ctx.arc(sx, sy, 96, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
