/*
 * 07 eagle-y-huella : Eagle and the first bootprint.  T 30.0 to 33.0, illustrated, hard cut.
 *
 * 20 July 1969, Sea of Tranquility. Black lunar sky WITHOUT stars, the Earth (r 60) at (1500, 220).
 * The lunar module Eagle (4 legs, gold-foil descent stage, silver ascent stage) on the left third.
 * T 31.5: the bootprint presses in (outBack, 4 frames), annYellow ring; the camera dollies in and
 * tilts down until the frame is all ground and the print sits EXACTLY on G2 — match cut to shot 28.
 *
 * ---------------------------------------------------------------------------------------------
 * G2 (storyboard "Shared geometry"), numbers used here — shot 28 must land on the same pixels:
 *   centre (960, 470) screen px; long axis 380 px; width 200 px (max full width of the oval);
 *   long axis rotated -12 deg from vertical, toe at the top (toe leans LEFT: toe tip at
 *   (960 - 190*sin12, 470 - 190*cos12) = (920.5, 284.2), heel tip (999.5, 655.8));
 *   half-width profile: toe end 10 % wider than heel -> factor lerp(1/1.10, 1, s), s = 0 heel .. 1 toe,
 *   times sqrt(1 - (v/190)^2), normalised so the widest point is exactly 100 px (half of 200);
 *   14 ridges ACROSS the sole at v_i = -190 + 380*(i+1)/15 (i = 0..13), each a straight segment
 *   spanning 86 % of the local width (u = +-0.86 * halfWidth(v)).
 *   Final-frame styling here: depression moonShade, ridges moonDark 7 px, ridge lit edge moonGrey 2.2 px
 *   offset 5 px toward the heel, outline ink 4.5 px, rim lip mix(moonGrey, white, .35) at 1.10 scale.
 *   The print is computed in SCREEN space (never through ctx camera transforms) and reaches G2
 *   exactly at the last frame (t = 3 - 1/24): push ends there, scale 1, squash 1.
 * ---------------------------------------------------------------------------------------------
 *
 * Layers, back to front:
 *   1. sky spaceInk, no stars (pitch-shifted with the tilt)
 *   2. Earth, gibbous, lit from the left, Americas facing the viewer
 *   3. ground fill moonGrey below the horizon (screen-space clip)
 *   4. near ground (camera): regolith stipple, craters, pebbles, shadowed foreground band
 *   5. far layer (tilt): horizon details, Eagle shadow, Eagle, landing dust
 *   6. near: thrown regolith grains after the step
 *   7. the bootprint G2 (screen space)
 *   8. overlay: annYellow ring at T 31.5
 */
(function () {
  'use strict';
  const ID = 'eagle-y-huella';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_SETTLE = 0.0; // T 30.0  Eagle settled, dust settling
  const B_GLINT = 0.75; // T 30.75 glint on the ascent stage window
  const B_STEP = 1.5; //   T 31.5  bootprint presses in, ring, push starts
  const B_GRAIN = 2.25; // T 32.25 thrown grains land
  const PUSH_END = 3.0 - FR; // last drawn frame: G2 exact

  // ---- G2 ----
  const G2 = { cx: 960, cy: 470, half: 190, rot: -12 * DEG, toe: 1.1, ridges: 14, span: 0.86 };
  const PRINT_WORLD = [960, 745]; // near-ground world point of the print
  const Z_END = 2.2;

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    // half-width profile, normalised so the max half width = 100
    const fac = (v) => {
      const s = clamp((-v / G2.half + 1) / 2); // 0 heel .. 1 toe
      return lerp(1 / G2.toe, 1, s) * Math.sqrt(Math.max(0, 1 - (v / G2.half) * (v / G2.half)));
    };
    let mx = 0;
    for (let i = 0; i <= 400; i++) mx = Math.max(mx, fac(-G2.half + (i / 400) * 2 * G2.half));
    const hw = (v) => (100 * fac(v)) / mx;
    const outline = [];
    const N = 96;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const v = -G2.half * Math.cos(a);
      const w = hw(v);
      outline.push([Math.sin(a) >= 0 ? w : -w, v]);
    }
    const ridges = [];
    for (let i = 0; i < G2.ridges; i++) {
      const v = -G2.half + (2 * G2.half * (i + 1)) / (G2.ridges + 1);
      const w = hw(v) * G2.span;
      ridges.push([[-w, v], [w, v]]);
    }
    // near craters (world, near layer)
    const craters = [
      [1340, 790, 150, 34], [250, 805, 110, 26], [1700, 708, 70, 14], [700, 812, 52, 12],
      [1225, 818, 62, 14], [1180, 700, 40, 10], [780, 668, 34, 8], [1090, 640, 46, 9], [860, 600, 30, 7], [1310, 610, 38, 8],
    ];
    const r = LIB.rng(sd('peb'));
    const pebbles = [];
    for (let i = 0; i < 26; i++) {
      const x = r.range(120, 1800), y = r.range(660, 840);
      if (Math.abs(x - 960) < 140 && Math.abs(y - 745) < 80) continue;
      if (x < 900 && y < 720) continue; // keep clear under the Eagle
      pebbles.push([x, y, r.range(4, 11), r.range(0, TAU)]);
    }
    // foreground shadow band edge (world)
    const band = [];
    for (let x = -300; x <= 2300; x += 40) band.push([x, 858 + 14 * LIB.noise1(x * 0.006, sd('band')) + 6 * LIB.noise1(x * 0.03, sd('band2'))]);
    band.push([2300, 1500], [-300, 1500]);
    // horizon (far)
    const hz = [];
    for (let x = -200; x <= 2120; x += 30) hz.push([x, 640 + 5 * LIB.noise1(x * 0.004, sd('hz')) + 2 * LIB.noise1(x * 0.02, sd('hz2'))]);
    // grains thrown by the step
    const g = LIB.rng(sd('grain'));
    const grains = [];
    for (let i = 0; i < 60; i++) grains.push([g.range(0, TAU), g.range(60, 170), g.range(0.6, 1.6), g.range(1.2, 2.6)]);
    // foil creases
    const c = LIB.rng(sd('crease'));
    const creases = [];
    for (let i = 0; i < 22; i++) {
      const x = c.range(480, 722), y = c.range(484, 584);
      const pts = [[x, y]];
      for (let k = 0; k < 3; k++) pts.push([pts[k][0] + c.range(-12, 12), pts[k][1] + c.range(5, 14)]);
      creases.push(pts);
    }
    GEO = { outline, ridges, craters, pebbles, band, hz, grains, creases, hw };
    return GEO;
  }

  // ---- Earth ----
  function drawEarth(ctx, L, x, y, r) {
    const disc = L.ellipsePts(x, y, r, r, 64);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, disc);
    ctx.fillStyle = P.earthOcean;
    ctx.fill();
    ctx.clip();
    const land = (pts, c) => {
      const q = L.smoothPts(pts.map(([u, v]) => [x + u * r, y + v * r]), true, 4);
      ctx.beginPath();
      L.tracePath(ctx, q);
      ctx.fillStyle = c;
      ctx.fill();
    };
    // North America upper left, México / Central America near centre, South America lower right
    land([[-0.75, -0.55], [-0.35, -0.8], [0.1, -0.7], [0.15, -0.45], [-0.05, -0.3], [-0.15, -0.1], [-0.05, 0.05], [0.05, 0.12], [-0.15, 0.08], [-0.4, -0.15], [-0.62, -0.3]], P.earthLand);
    land([[0.1, 0.18], [0.35, 0.2], [0.55, 0.35], [0.5, 0.6], [0.3, 0.9], [0.2, 0.7], [0.12, 0.4]], P.earthLand);
    L.hatch(ctx, disc, { spacing: 5, width: 1, color: P.earthOceanDeep, alpha: 0.5, seed: sd('eo'), length: [6, 16], density: (px, py) => clamp(((px - x) / r) * 0.9 + 0.2) });
    // clouds
    for (let i = 0; i < 4; i++) {
      const a0 = -0.9 + i * 0.5;
      const cx = x + Math.cos(a0 * 2.1) * r * 0.45, cy = y + (i - 1.5) * r * 0.42;
      const pts = [];
      for (let k = 0; k < 9; k++) pts.push([cx - r * 0.35 + k * r * 0.08, cy + Math.sin(k * 0.9 + i) * r * 0.06]);
      L.inkPath(ctx, pts, { width: 2.2, color: P.earthCloud, alpha: 0.85, seed: sd('cl', i), taper: [6, 10] });
    }
    // polar cap
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.95, r * 0.42, r * 0.16, 0, 0, TAU);
    ctx.fillStyle = P.earthCloud;
    ctx.fill();
    // terminator: night side to the right (sun from the left)
    ctx.beginPath();
    ctx.ellipse(x + r * 0.32, y, r * 0.78, r * 1.05, 0, -Math.PI / 2, Math.PI / 2);
    ctx.arc(x, y, r + 2, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fillStyle = P.spaceInk;
    ctx.globalAlpha = 0.72;
    ctx.fill();
    ctx.restore();
    L.crossHatch(ctx, disc, { spacing: 4.5, width: 1, color: P.spaceInk, alpha: 0.8, seed: sd('term'), length: [8, 20], density: (px) => L.smoothstep(x + r * 0.05, x + r * 0.5, px) });
    // lit limb
    const limb = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * 0.55 + (i / 24) * Math.PI * 0.9;
      limb.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    L.inkPath(ctx, limb, { width: 2, color: P.earthCloud, alpha: 0.75, seed: sd('limb'), taper: [10, 20] });
  }

  // ---- Eagle (far-layer world coordinates; x 600, 380 px tall) ----
  function strut(ctx, L, a, b, seed, w = 6) {
    L.inkPath(ctx, [a, b], { width: w, smooth: false, seed, taper: 0 });
    L.inkPath(ctx, [a, b], { width: w * 0.42, smooth: false, color: P.eagleGold, seed: seed + 1, taper: 0, wobble: 0.5 });
  }
  function footpad(ctx, L, x, y, rx, seed, c = P.eagleGold) {
    L.inkPath(ctx, L.ellipsePts(x, y, rx, rx * 0.33, 32), { closed: true, fill: c, width: 2.6, seed });
    L.inkPath(ctx, [[x - rx * 0.7, y + 2], [x + rx * 0.7, y + 2]], { width: 1.2, color: P.eagleFoilDeep, seed: seed + 3 });
  }
  function drawEagle(ctx, L, g, glint) {
    // back leg (behind, darker)
    strut(ctx, L, [628, 560], [655, 676], sd('lb'), 5);
    footpad(ctx, L, 657, 680, 22, sd('pb'), P.eagleFoilDeep);
    // side legs (primary + two secondary struts)
    strut(ctx, L, [482, 494], [390, 694], sd('ll'));
    strut(ctx, L, [496, 586], [436, 594], sd('ll2'), 4);
    strut(ctx, L, [482, 570], [436, 594], sd('ll3'), 4);
    footpad(ctx, L, 388, 700, 30, sd('pl'));
    strut(ctx, L, [718, 494], [820, 688], sd('lr'));
    strut(ctx, L, [704, 586], [770, 592], sd('lr2'), 4);
    strut(ctx, L, [718, 570], [770, 592], sd('lr3'), 4);
    footpad(ctx, L, 822, 694, 30, sd('pr'));
    // descent stage: octagon seen as front face + two facets
    const front = [[528, 478], [672, 478], [672, 588], [528, 588]];
    const lf = [[474, 488], [528, 478], [528, 588], [474, 578]];
    const rf = [[672, 478], [726, 488], [726, 578], [672, 588]];
    L.inkPath(ctx, lf, { closed: true, fill: P.eagleGold, width: 2.8, seed: sd('lf'), smooth: false });
    L.inkPath(ctx, rf, { closed: true, fill: P.eagleFoilDeep, width: 2.8, seed: sd('rf'), smooth: false });
    L.hatch(ctx, rf, { spacing: 5, width: 1.3, alpha: 0.75, seed: sd('rfh'), length: [10, 30] });
    L.inkPath(ctx, front, { closed: true, fill: P.eagleGold, width: 4.5, seed: sd('fr'), smooth: false });
    // quad panel divisions and foil creases
    L.inkLine(ctx, 600, 480, 600, 586, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: sd('qd') });
    L.inkLine(ctx, 530, 532, 670, 532, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: sd('qd2') });
    for (let i = 0; i < g.creases.length; i++) L.inkPath(ctx, g.creases[i], { width: 1.2, color: P.eagleFoilDeep, alpha: 0.9, seed: sd('cr', i), taper: [4, 8] });
    L.hatch(ctx, front, { spacing: 7, width: 1.2, color: P.eagleFoilDeep, alpha: 0.8, seed: sd('fh'), density: (x, y) => L.smoothstep(600, 672, x) * 0.9 + L.smoothstep(560, 588, y) * 0.4 });
    // descent engine skirt
    L.inkPath(ctx, [[574, 588], [626, 588], [638, 614], [562, 614]], { closed: true, fill: P.rocketBlack, width: 2.6, seed: sd('eng'), smooth: false });
    // front leg with ladder and porch
    strut(ctx, L, [590, 588], [568, 708], sd('lf1'), 6);
    footpad(ctx, L, 566, 714, 32, sd('pf'));
    for (const dx of [-14, 14]) L.inkLine(ctx, 590 + dx, 590, 570 + dx * 0.9, 700, { width: 2, seed: sd('rail', dx) });
    for (let k = 0; k < 8; k++) {
      const y = 600 + k * 13, x = lerp(590, 570, (y - 590) / 110);
      L.inkLine(ctx, x - 13, y, x + 13, y, { width: 1.5, color: P.inkSoft, seed: sd('rung', k), taper: 0 });
    }
    L.inkPath(ctx, [[566, 586], [620, 586], [618, 594], [568, 594]], { closed: true, fill: P.eagleSilver, width: 2, seed: sd('porch'), smooth: false });
    // ascent stage: angular silver cabin
    const cab = [[528, 478], [518, 432], [534, 388], [574, 360], [642, 354], [684, 372], [704, 412], [700, 478]];
    L.inkPath(ctx, [[600, 356], [600, 336], [640, 336], [640, 356]], { closed: true, fill: P.eagleSilver, width: 2.4, seed: sd('tun'), smooth: false });
    L.inkPath(ctx, cab, { closed: true, fill: P.eagleSilver, width: 4.5, seed: sd('cab'), smooth: false, double: true });
    // dark thermal panels
    L.inkPath(ctx, [[530, 452], [600, 452], [600, 478], [528, 478]], { closed: true, fill: P.rocketBlack, width: 2, seed: sd('dp1'), smooth: false });
    L.inkPath(ctx, [[664, 420], [702, 420], [700, 470], [664, 470]], { closed: true, fill: P.rocketBlack, width: 2, seed: sd('dp2'), smooth: false });
    L.hatch(ctx, cab, { spacing: 6, width: 1.3, alpha: 0.75, seed: sd('cabh'), length: [10, 34], density: (x) => L.smoothstep(640, 690, x) });
    L.inkLine(ctx, 536, 392, 690, 392, { width: 1.6, color: P.inkSoft, alpha: 0.85, seed: sd('seam') });
    // triangular windows
    const w1 = [[546, 400], [586, 392], [556, 432]];
    const w2 = [[614, 392], [654, 400], [644, 432]];
    L.inkPath(ctx, w1, { closed: true, fill: P.visorBlack, width: 2.4, seed: sd('w1'), smooth: false });
    L.inkPath(ctx, w2, { closed: true, fill: P.visorBlack, width: 2.4, seed: sd('w2'), smooth: false });
    // hatch door
    L.inkPath(ctx, L.rectPts(582, 440, 34, 36, 10), { closed: true, width: 1.8, color: P.inkSoft, seed: sd('door'), smooth: false });
    // RCS quads
    for (const [x, y] of [[516, 420], [706, 420]]) {
      L.inkLine(ctx, x - 12, y, x + 12, y, { width: 2.4, seed: sd('rcs', x), taper: 0 });
      L.inkLine(ctx, x, y - 12, x, y + 12, { width: 2.4, seed: sd('rcs2', x), taper: 0 });
    }
    // radar dish (left) and S-band antenna (right)
    L.inkLine(ctx, 548, 372, 540, 346, { width: 2, seed: sd('m1') });
    L.inkPath(ctx, L.ellipsePts(538, 340, 14, 9, 24, -0.4), { closed: true, fill: P.eagleSilver, width: 2, seed: sd('dish') });
    L.inkLine(ctx, 676, 370, 690, 334, { width: 2, seed: sd('m2') });
    L.inkPath(ctx, L.ellipsePts(692, 328, 11, 8, 20, 0.5), { closed: true, fill: P.eagleSilver, width: 2, seed: sd('dish2') });
    // window glint (beat 2)
    if (glint > 0) {
      ctx.save();
      ctx.globalAlpha = glint;
      ctx.strokeStyle = P.visorGlint;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      const gx = 562, gy = 404, s = 16 * glint;
      ctx.beginPath();
      ctx.moveTo(gx - s, gy); ctx.lineTo(gx + s, gy);
      ctx.moveTo(gx, gy - s); ctx.lineTo(gx, gy + s);
      ctx.stroke();
      ctx.restore();
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const g = geo();
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      // camera (24 fps): dolly + tilt, inOutSine, ends on the last drawn frame
      const e = E.inOutSine(clamp((t - B_STEP) / (PUSH_END - B_STEP)));
      const z = lerp(1, Z_END, e);
      const camY = lerp(540, PRINT_WORLD[1] + (G2.cy - 540) / Z_END, e);
      const nearX = (x) => (x - 960) * z + 960;
      const nearY = (y) => (y - camY) * z + 540;
      const farZ = 1 + 0.25 * e;
      const shift = -840 * e; // tilt: sky and horizon leave through the top
      const farY = (y) => 640 + (y - 640) * farZ + shift;
      const farX = (x) => 960 + (x - 960) * farZ;

      // 1. sky: plain spaceInk, NO stars
      ctx.fillStyle = P.spaceInk;
      ctx.fillRect(0, 0, 1920, 1080);

      // 2. Earth
      if (shift > -320) drawEarth(ctx, L, 1500, 220 + shift, 60);

      // 3. ground below the far horizon
      const hzS = g.hz.map(([x, y]) => [farX(x), farY(y)]);
      const ground = hzS.concat([[2200, 1200], [-300, 1200]]);
      ctx.save();
      ctx.beginPath();
      L.tracePath(ctx, ground);
      ctx.fillStyle = P.moonGrey;
      ctx.fill();
      ctx.clip();

      // 4. near ground through the camera
      L.camera(ctx, { x: 960, y: camY, zoom: z }, (c) => {
        const vy0 = camY - 540 / z - 20, vy1 = camY + 540 / z + 20;
        const vx0 = 960 - 960 / z - 20, vx1 = 960 + 960 / z + 20;
        const B = [vx0, Math.max(520, vy0), vx1 - vx0, vy1 - Math.max(520, vy0)];
        L.stipple(c, null, { bounds: B, spacing: 9, r: [0.7, 1.7], color: P.moonShade, alpha: 0.55, seed: sd('reg'), density: (x, y) => 0.35 + 0.4 * L.smoothstep(640, 900, y) });
        L.stipple(c, null, { bounds: B, spacing: 15, r: [0.8, 1.6], color: P.white, alpha: 0.4, seed: sd('reg2'), density: 0.35 });
        // craters
        g.craters.forEach(([x, y, rx, ry], i) => {
          if (x + rx < vx0 || x - rx > vx1 || y + ry < vy0 || y - ry > vy1) return;
          const bowl = L.ellipsePts(x, y, rx, ry, 40);
          L.inkPath(c, L.ellipsePts(x + rx * 0.04, y + ry * 0.12, rx * 1.12, ry * 1.25, 40), { closed: true, fill: L.mix(P.moonGrey, P.white, 0.3), width: 1.2, color: P.inkFaint, alpha: 0.5, seed: sd('rim', i) });
          L.inkPath(c, bowl, { closed: true, fill: P.moonShade, width: rx > 80 ? 2.8 : 1.8, seed: sd('cr', i) });
          L.hatch(c, bowl, { spacing: Math.max(3, ry * 0.25), width: 1.2, color: P.moonDark, alpha: 0.85, seed: sd('crh', i), length: [rx * 0.1, rx * 0.4], density: (px, py) => clamp(1.2 - (((px - x) / rx) * 0.6 + ((py - y) / ry) * 0.8 + 0.7)) });
        });
        // pebbles
        g.pebbles.forEach(([x, y, s, a], i) => {
          const pts = L.ellipsePts(x, y, s, s * 0.6, 14, a * 0.2);
          L.inkPath(c, pts, { closed: true, fill: P.moonGrey, width: 1.4, seed: sd('pb', i) });
          c.save();
          c.globalAlpha = 0.6;
          c.fillStyle = P.moonDark;
          c.beginPath();
          c.ellipse(x + s * 0.9, y + s * 0.4, s * 1.1, s * 0.3, 0, 0, TAU);
          c.fill();
          c.restore();
        });
        // foreground shadow band (calm subtitle zone)
        L.inkPath(c, g.band, { closed: true, fill: P.moonShade, width: 2.2, color: P.moonDark, seed: sd('band'), smooth: false });
        L.hatch(c, g.band, { spacing: 7, width: 1.4, color: P.moonDark, alpha: 0.7, seed: sd('bandh'), density: (x, y) => 0.5 + 0.5 * L.smoothstep(870, 980, y) });
      });

      ctx.restore(); // ground clip

      // 5. far layer: Eagle and its shadow, tilting away
      if (shift > -900) {
        ctx.save();
        ctx.translate(960, 640 + shift);
        ctx.scale(farZ, farZ);
        ctx.translate(-960, -640);
        const sh = [[560, 702], [700, 690], [900, 690], [1040, 704], [1070, 716], [900, 724], [640, 722]];
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = P.moonDark;
        ctx.beginPath();
        L.tracePath(ctx, L.smoothPts(sh, true, 6));
        ctx.fill();
        ctx.restore();
        L.hatch(ctx, sh, { spacing: 5, width: 1.2, color: P.moonDark, alpha: 0.7, seed: sd('shh'), length: [10, 30] });
        const glint = t < B_GLINT ? 0 : Math.max(0, 1 - (t - B_GLINT) / (12 * FR)) * Math.min(1, (t - B_GLINT) / (2 * FR) + 0.5);
        drawEagle(ctx, L, g, glint);
        // landing dust settling on twos (T 30.0 to 30.75)
        const dk = clamp(1 - tw / 0.75);
        if (dk > 0) {
          for (const [x, y] of [[388, 700], [822, 694], [566, 714], [600, 640]]) {
            L.stipple(ctx, L.ellipsePts(x, y - 8 - 20 * (1 - dk), 70, 22, 24), { spacing: 6, r: [0.8, 1.8], color: P.moonGrey, alpha: 0.75 * dk, seed: sd('dust', x) });
          }
        }
        ctx.restore();
      }

      // 6. grains thrown by the step (near world, on twos)
      if (t >= B_STEP && tw < B_GRAIN + 0.5) {
        const u = clamp((tw - B_STEP) / 0.75);
        ctx.save();
        ctx.fillStyle = P.moonGrey;
        for (let i = 0; i < g.grains.length; i++) {
          const [a, d, sp, rad] = g.grains[i];
          const k = Math.min(1, u * sp);
          const wx = PRINT_WORLD[0] + Math.cos(a) * d * 0.6 * E.outQuad(k);
          const wy = PRINT_WORLD[1] + Math.sin(a) * d * 0.25 * E.outQuad(k) - 34 * Math.sin(Math.PI * k);
          ctx.globalAlpha = 0.9 * (1 - clamp((tw - B_GRAIN) / 0.5));
          ctx.beginPath();
          ctx.arc(nearX(wx), nearY(wy), rad * z * 0.8, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      // 7. bootprint G2 in screen space
      if (t >= B_STEP) {
        const a = hit(B_STEP, 4, E.outBack);
        const sc = (z / Z_END) * (1 + 0.12 * (1 - a));
        const k = lerp(0.58, 1, e);
        const cx = nearX(PRINT_WORLD[0]), cy = nearY(PRINT_WORLD[1]);
        const cr = Math.cos(G2.rot), sr = Math.sin(G2.rot);
        const T = ([u, v], s = 1) => {
          const x = u * sc * s, y = v * sc * s;
          return [cx + x * cr - y * sr, cy + (x * sr + y * cr) * k];
        };
        const out = g.outline.map((p) => T(p));
        const lip = g.outline.map((p) => T(p, 1.1));
        const al = clamp(a * 1.6);
        ctx.save();
        ctx.globalAlpha = al;
        L.stipple(ctx, g.outline.map((p) => T(p, 1.32)), { spacing: 6 * Math.max(0.5, sc), r: [0.8 * sc + 0.5, 1.8 * sc + 0.6], color: P.moonShade, alpha: 0.8, seed: sd('ring') });
        L.inkPath(ctx, lip, { closed: true, fill: L.mix(P.moonGrey, P.white, 0.35), width: 1.4 * sc + 0.4, color: P.inkFaint, alpha: 0.6, seed: sd('lip') });
        L.inkPath(ctx, out, { closed: true, fill: P.moonShade, width: 4.5 * Math.max(0.55, sc), seed: sd('out'), double: { alpha: 0.4, width: 0.33 } });
        // inner wall in shadow on the upper left (light from upper left)
        L.hatch(ctx, out, {
          spacing: 5 * Math.max(0.6, sc), width: 1.4, color: P.moonDark, alpha: 0.9, seed: sd('wall'), length: [8, 26],
          density: (x, y) => {
            const dx = (x - cx) / (100 * sc), dy = (y - cy) / (190 * sc * k);
            const r = Math.hypot(dx * 0.75, dy);
            return L.smoothstep(0.55, 0.95, r) * clamp((-dx * 0.6 - dy * 0.8) * 1.6 + 0.2);
          },
        });
        g.ridges.forEach((rg, i) => {
          const a0 = T(rg[0]), a1 = T(rg[1]);
          const off = 5 * sc;
          const ox = -sr * off, oy = cr * off * k; // toward the heel
          L.inkPath(ctx, [a0, a1], { width: 7 * sc, color: P.moonDark, seed: sd('rd', i), smooth: false, taper: [4 * sc, 6 * sc] });
          L.inkPath(ctx, [[a0[0] + ox, a0[1] + oy], [a1[0] + ox, a1[1] + oy]], { width: 2.2 * sc, color: P.moonGrey, alpha: 0.9, seed: sd('rl', i), smooth: false, taper: [6 * sc, 8 * sc] });
        });
        ctx.restore();

        // 8. annYellow ring (expands outExpo 9 frames, fades by frame 12)
        const rp = (t - B_STEP) / FR;
        if (rp < 14) {
          const ex = E.outExpo(clamp((rp + 1) / 9));
          const R = 190 * sc * 1.25 * lerp(0.75, 1, ex);
          ctx.save();
          ctx.globalAlpha = 1 - clamp((rp - 6) / 7);
          ctx.strokeStyle = P.annYellow;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx, cy, R * 0.72, R * k, G2.rot, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    },
  });
})();
