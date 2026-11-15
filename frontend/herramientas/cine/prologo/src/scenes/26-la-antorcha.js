/*
 * 26 la-antorcha : Your turn — the torch.
 * Global T 135.0 to 141.0 (6 s, 8 beats), illustrated (paper plate, Act 4 stripes).
 *
 * Layers, back to front (under a slow push 1.0 -> 1.06):
 *   1. Stripes (stripeCream / stripeApricot), drifting 6 px per beat.
 *   2. Construction: faint circles, cross and ticks around the helmet (inkFaint 30 %).
 *   3. Floor band (calm, dark-mid under the subtitles).
 *   4. The small astronaut (art bible 10.1, 520 px tall, centre (1080, 560)), no patch: this is "you".
 *   5. The torch handle (behind the glove), the elder's hand and sleeve entering from the left.
 *   6. The flame (flame + flameCore) with one soft halo; leans with motion.
 *   7. Overlays: annYellow rings pulsing from the flame.
 *
 * Beats (local t): 0 torch enters, 0.75 arm reaches (T 135.75 narration P9), 1.5 hand-off (T 136.5),
 * 2.25 the elder lets go, 3.0 raise (T 138.0, outBack), 3.75 / 4.5 / 5.25 pulses.
 */
(function () {
  'use strict';
  const ID = 'la-antorcha';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const BEAT = 0.75;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_REACH = 0.75; // T 135.75
  const B_HAND = 1.5; // T 136.5
  const B_LET = 2.25; // T 137.25
  const B_RAISE = 3.0; // T 138.0
  const PULSES = [3.0, 3.75, 4.5, 5.25];

  const FX = 1080, FY = 820, HH = 520; // feet and height: centre (1080, 560)

  // ===========================================================================
  // The game's astronaut (art bible 10.1), shared verbatim with 27 tres-astronautas.
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
  // Pose (on twos)
  // ===========================================================================
  const SC = HH / 360;
  function gloveAt(a) {
    const sx = FX - AU.SH * SC, sy = FY + AU.SHY * SC;
    return [sx - Math.sin(a) * AU.ARM * SC, sy + Math.cos(a) * AU.ARM * SC];
  }
  const A_REST = 0.25, A_REACH = 1.1, A_UP = 2.62;
  function armAngle(t) {
    if (t < B_REACH) return A_REST;
    if (t < B_RAISE) return lerp(A_REST, A_REACH, E.outCubic(clamp((t - B_REACH) / 0.6)));
    return lerp(A_REACH, A_UP, E.outBack(clamp((t - B_RAISE) / (8 * FR))));
  }
  const T_START = [520, 660];
  function torchAt(t) {
    if (t < B_HAND) {
      const u = E.outCubic(clamp(t / B_HAND));
      const g = gloveAt(A_REACH);
      return { x: lerp(T_START[0], g[0], u), y: lerp(T_START[1], g[1], u), tilt: lerp(0.18, 0.04, u) };
    }
    const g = gloveAt(armAngle(t));
    const up = t < B_RAISE ? 0 : E.outBack(clamp((t - B_RAISE) / (8 * FR)));
    return { x: g[0], y: g[1], tilt: lerp(0.04, -0.14, up) };
  }
  function handAt(t, tc) {
    // the elder's hand grips 72 px below the grip point, then lets go and slides out left
    if (t < B_LET) return { x: tc.x - Math.sin(tc.tilt) * 72, y: tc.y + Math.cos(tc.tilt) * 72, open: 0 };
    const u = E.inCubic(clamp((t - B_LET) / 0.75));
    const g = torchAt(B_LET);
    return { x: lerp(g.x - Math.sin(g.tilt) * 72, -300, u), y: lerp(g.y + Math.cos(g.tilt) * 72, 740, u), open: clamp((t - B_LET) / 0.25) };
  }

  function drawHandle(ctx, L, tc) {
    const ax = Math.sin(tc.tilt), ay = -Math.cos(tc.tilt); // up the torch
    const nx = -ay, ny = ax;
    const b = [tc.x - ax * 100, tc.y - ay * 100], top = [tc.x + ax * 96, tc.y + ay * 96];
    const hw0 = 8, hw1 = 12;
    const pts = [
      [b[0] + nx * hw0, b[1] + ny * hw0], [top[0] + nx * hw1, top[1] + ny * hw1],
      [top[0] - nx * hw1, top[1] - ny * hw1], [b[0] - nx * hw0, b[1] - ny * hw0],
    ];
    L.inkPath(ctx, pts, { closed: true, width: 2.8, fill: P.torchBronze, smooth: false, seed: sd('handle'), wobble: 0.5 });
    L.hatch(ctx, pts, { angle: tc.tilt + 0.25, spacing: 6, width: 1.3, color: P.ink, alpha: 0.7, length: [4, 10], density: (x, y) => clamp(((x - tc.x) * nx + (y - tc.y) * ny) / 6 + 0.3), seed: sd('handleh') });
    [-0.6, 0.15, 0.75].forEach((f, i) => {
      const u = (f + 1) / 2;
      const cx = lerp(b[0], top[0], u), cy = lerp(b[1], top[1], u);
      const w = lerp(hw0, hw1, u) + 2;
      L.inkLine(ctx, cx - nx * w, cy - ny * w, cx + nx * w, cy + ny * w, { width: 3, color: P.helmetGoldDeep, seed: sd('band', i), taper: 3 });
    });
    const c0 = top, c1 = [top[0] + ax * 40, top[1] + ay * 40];
    const cup = [
      [c0[0] + nx * 13, c0[1] + ny * 13], [c1[0] + nx * 30, c1[1] + ny * 30],
      [c1[0] - nx * 30, c1[1] - ny * 30], [c0[0] - nx * 13, c0[1] - ny * 13],
    ];
    L.inkPath(ctx, cup, { closed: true, width: 3.2, fill: P.helmetGoldDeep, smooth: false, seed: sd('cup'), wobble: 0.5 });
    L.hatch(ctx, cup, { angle: -0.8, spacing: 5, width: 1.2, color: P.ink, alpha: 0.6, density: (x, y) => clamp(((x - c0[0]) * nx + (y - c0[1]) * ny) / 12 + 0.4), length: [6, 14], seed: sd('cuph') });
    return { fx: c1[0], fy: c1[1], ax, ay, nx, ny, rim: () => L.inkLine(ctx, c1[0] - nx * 32, c1[1] - ny * 32, c1[0] + nx * 32, c1[1] + ny * 32, { width: 5, color: P.helmetGold, seed: sd('rim'), taper: 4 }) };
  }

  function drawFlame(ctx, L, f, lean, bi, tw) {
    const H = 128, Wd = 34;
    const pt = (u, side) => {
      const w = Wd * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.1 * u);
      const flick = 5 * LIB.noise1(u * 3 + bi * 0.9, sd('fl'));
      const bend = lean * H * u * u + flick * u;
      return [f.fx + f.ax * H * u + f.nx * (side * w + bend), f.fy + f.ay * H * u + f.ny * (side * w + bend)];
    };
    const outer = [];
    for (let i = 0; i <= 16; i++) outer.push(pt(i / 16, 1));
    for (let i = 16; i >= 0; i--) outer.push(pt(i / 16, -1));
    const hx = f.fx + f.ax * H * 0.4, hy = f.fy + f.ay * H * 0.4;
    const hr = 230 + 14 * Math.sin(tw * 8);
    const g = ctx.createRadialGradient(hx, hy, 10, hx, hy, hr);
    g.addColorStop(0, LIB.rgba(P.flameCore, 0.5));
    g.addColorStop(0.3, LIB.rgba(P.flame, 0.18));
    g.addColorStop(1, LIB.rgba(P.flame, 0));
    ctx.fillStyle = g;
    ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    L.inkPath(ctx, outer, { closed: true, width: 3, color: P.inkSoft, fill: P.flame, seed: sd('flame'), wobble: 1 });
    const inner = [];
    for (let i = 0; i <= 12; i++) inner.push(pt((i / 12) * 0.72, 0.55));
    for (let i = 12; i >= 0; i--) inner.push(pt((i / 12) * 0.72, -0.55));
    ctx.save();
    ctx.fillStyle = P.flameCore;
    ctx.beginPath();
    LIB.tracePath(ctx, inner, true);
    ctx.fill();
    ctx.restore();
    for (let k = 0; k < 3; k++) {
      const q = [];
      for (let i = 0; i <= 6; i++) q.push(pt(0.4 + i * 0.07, (k - 1) * 0.6));
      L.inkPath(ctx, q, { width: 1.6, color: P.orange, alpha: 0.8, seed: sd('tongue', k), taper: 6 });
    }
    f.rim();
    return [hx, hy];
  }

  function drawHand(ctx, L, h) {
    const sx0 = h.x - 440, sy0 = h.y + 130;
    const ex = h.x - 50, ey = h.y + 8;
    const a = Math.atan2(ey - sy0, ex - sx0);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const r0 = 56, r1 = 38;
    const sleeve = [[sx0 + nx * r0, sy0 + ny * r0], [ex + nx * r1, ey + ny * r1], [ex - nx * r1, ey - ny * r1], [sx0 - nx * r0, sy0 - ny * r0]];
    L.inkPath(ctx, sleeve, { closed: true, width: 3.6, fill: P.teal, smooth: false, seed: sd('sleeve'), wobble: 1.2 });
    L.hatch(ctx, sleeve, { angle: a + 0.9, spacing: 6, width: 1.4, color: P.tealDeep, alpha: 0.9, length: [10, 30], density: (x, y) => clamp(((x - ex) * nx + (y - ey) * ny) / 30 + 0.4), seed: sd('sleeveh') });
    const cx = ex - Math.cos(a) * 16, cy = ey - Math.sin(a) * 16;
    L.inkLine(ctx, cx + nx * r1, cy + ny * r1, cx - nx * r1, cy - ny * r1, { width: 2.2, color: P.tealDeep, seed: sd('cuff'), taper: 4 });
    const palm = LIB.ellipsePts(h.x - 20, h.y + 6, 40, 31, 28, a * 0.5);
    L.inkPath(ctx, palm, { closed: true, width: 3.4, fill: P.skinDeep, seed: sd('palm'), wobble: 0.6 });
    L.hatch(ctx, palm, { angle: -0.8, spacing: 6, width: 1.3, color: P.ink, alpha: 0.5, density: (x, y) => clamp((y - h.y) / 20 + 0.2), length: [6, 14], seed: sd('palmh') });
    for (let k = 0; k < 4; k++) {
      const fx = h.x + 10 + h.open * 18, fy = h.y - 16 + k * 14;
      const fp = LIB.capsulePts(fx, fy, 32 - k * 2, 7.5, -0.12 - h.open * 0.6, 18);
      L.inkPath(ctx, fp, { closed: true, width: 2.4, fill: P.skinDeep, seed: sd('finger', k), wobble: 0.3 });
    }
    const th = LIB.capsulePts(h.x - 4, h.y - 30, 40, 8, -0.5 - h.open * 0.5, 18);
    L.inkPath(ctx, th, { closed: true, width: 2.6, fill: LIB.mix(P.skinDeep, P.skinWarm, 0.3), seed: sd('thumb'), wobble: 0.3 });
  }

  function ring(ctx, x, y, r0, r1, t, a, color, frames = 12, width = 3) {
    if (t < a) return;
    const u = clamp((t - a) / (frames * FR) + 1 / frames);
    if (u >= 1) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1 - E.inQuad(u);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, lerp(r0, r1, E.outExpo(u)), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const zoom = lerp(1.0, 1.06, E.inOutSine(t / info.dur));
      let flamePt = [0, 0];
      L.camera(ctx, { x: 1000, y: 500, zoom }, () => {
        // 1. stripes
        L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: (info.T / BEAT) * 6, bounds: { x: -100, y: -100, w: 2120, h: 1280 } });
        // 2. construction
        const hc = [FX, FY + AU.HC[1] * SC];
        L.guideCircle(ctx, hc[0], hc[1], 300, { color: P.inkFaint, alpha: 0.3, width: 1.4, ink: true, seed: sd('gc') });
        L.guideCircle(ctx, hc[0], hc[1], 430, { color: P.inkFaint, alpha: 0.22, width: 1.4, ink: true, seed: sd('gc2') });
        L.inkLine(ctx, hc[0], 30, hc[0], 1050, { width: 1.4, color: P.inkFaint, alpha: 0.3, seed: sd('v'), taper: 0 });
        L.inkLine(ctx, 300, hc[1], 1800, hc[1], { width: 1.4, color: P.inkFaint, alpha: 0.3, seed: sd('h'), taper: 0 });
        L.ticks(ctx, hc[0], hc[1], { r: 300, n: 36, len: 12, major: 6, color: P.inkFaint, alpha: 0.45, width: 1.4 });
        // 3. floor band
        const floor = [[-100, 812], [2020, 806], [2020, 1200], [-100, 1200]];
        L.inkPath(ctx, floor, { closed: true, width: 3, fill: LIB.mix(P.paperDeep, P.inkSoft, 0.35), smooth: false, seed: sd('floor'), wobble: 1.5 });
        L.hatch(ctx, floor, { angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.inkSoft, alpha: 0.6, length: [20, 60], seed: sd('floorh') });

        // 4-5. astronaut, torch, the elder's hand
        const a = armAngle(tw);
        const tc = torchAt(tw);
        const prev = torchAt(Math.max(0, tw - 1 / 12));
        const lean = clamp(-(tc.x - prev.x) * 0.012, -0.45, 0.45) + 0.04 * LIB.noise1(bi * 0.7, 5);
        const fTop = [tc.x + Math.sin(tc.tilt) * 220, tc.y - Math.cos(tc.tilt) * 220];
        const raised = tw < B_RAISE ? 0 : clamp((tw - B_RAISE) / (8 * FR));
        let fl = null;
        drawAstro(ctx, L, {
          x: FX, y: FY, h: HH, turn: 0, patch: null, seed: sd('you'), ow: 4.5,
          armL: a, armR: 0.2, armLFront: a > 1.7,
          reflect: { x: fTop[0], y: fTop[1], k: lerp(0.45, 1, raised) },
          rim: 0, shadow: P.ink,
          blink: Math.floor(t / BEAT + 1e-6),
          onGloveL: (c) => { if (tw >= B_HAND) fl = drawHandle(c, L, tc); },
        });
        if (!fl) fl = drawHandle(ctx, L, tc);
        if (tw < B_LET + 0.8) drawHand(ctx, L, handAt(tw, tc));
        // 6. flame
        flamePt = drawFlame(ctx, L, fl, lean, bi, tw);
      });
      // 7. overlays
      const fx = 960 + (flamePt[0] - 1000) * zoom, fy = 540 + (flamePt[1] - 500) * zoom;
      ring(ctx, fx, fy + 150 * zoom, 30, 100, t, B_HAND, P.annYellow, 10, 3);
      PULSES.forEach((p) => ring(ctx, fx, fy, 70, 260, t, p, P.annYellow, 12, 3));
    },
  });
})();
