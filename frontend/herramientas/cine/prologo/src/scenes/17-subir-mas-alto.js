/*
 * 17 subir-mas-alto : Higher and higher
 * Global T 81 to 87 (6 s, 8 beats), illustrated, hard cut in. Act 3 (stripeYellow).
 *
 * Layers, back to front:
 *   1. paper + stripes (cream / yellow), drifting 6 px per beat (screen-fixed)
 *   -- camera pans up-right 120 px over the shot --
 *   2. the staircase: four wooden blocks rising lower-left to upper-right, hatched shadow faces
 *   3. annBlue rising diagonal guide (draws on at T 81.75)
 *   4. inventions, one per step: wheel (present, rolls), kite (pops T 82.5), biplane (T 84.0),
 *      rocket (T 85.5, launches T 86.25 and exits upper right)
 *   5. annYellow rings on each arrival
 */
(function () {
  'use strict';
  const ID = 'subir-mas-alto';
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

  const B_GUIDE = 0.75;  // T 81.75 guide draws on
  const B_KITE = 1.5;    // T 82.5
  const B_PLANE = 3.0;   // T 84.0
  const B_ROCKET = 4.5;  // T 85.5
  const B_LAUNCH = 5.25; // T 86.25

  // step tops (x0, x1, y) : blocks run down to below the frame
  const STEPS = [
    { x0: 120, x1: 520, y: 800 },
    { x0: 520, x1: 900, y: 660 },
    { x0: 900, x1: 1280, y: 520 },
    { x0: 1280, x1: 1700, y: 380 },
  ];
  const DEPTH = 40; // top face depth (oblique)

  const WHEEL = { x: 330, y: 800 - 92, r: 92 };
  const KITE = { x: 720, y: 400 };
  const PLANE = { x: 1090, y: 330 };
  const ROCKET = { x: 1500, y: 380 }; // base on step 4

  function popTwos(t, a) {
    if (t < a) return 0;
    const d = Math.floor((t - a) * 12 + 1e-6);
    return [0.72, 1.08, 1][Math.min(2, d)];
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const hit = (a, frames, e, lead = 1) =>
        t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames));

      // 1. paper and stripes
      L.paper(ctx);
      ctx.save();
      ctx.globalAlpha = 0.9;
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: (info.T / BEAT) * 6, seed: sd('st') % 9999 });
      ctx.restore();

      const pan = E.inOutSine(t / info.dur);
      L.camera(ctx, { x: 960 + 85 * pan, y: 540 - 85 * pan }, (ctx) => {
        // 2. staircase blocks
        for (let i = 0; i < STEPS.length; i++) {
          const s = STEPS[i];
          const front = [[s.x0, s.y], [s.x1, s.y], [s.x1, 1240], [s.x0, 1240]];
          const top = [[s.x0, s.y], [s.x0 + DEPTH, s.y - DEPTH * 0.6], [s.x1 + DEPTH, s.y - DEPTH * 0.6], [s.x1, s.y]];
          const side = [[s.x1, s.y], [s.x1 + DEPTH, s.y - DEPTH * 0.6], [s.x1 + DEPTH, 1240], [s.x1, 1240]];
          L.inkPath(ctx, front, { closed: true, smooth: false, width: 2.8, fill: i % 2 ? P.tan : P.paperDeep, seed: sd('f', i) });
          // wood grain planks
          for (let k = 1; k < 8; k++) L.inkLine(ctx, s.x0 + 8, s.y + k * 52, s.x1 - 8, s.y + k * 52 + 3, { width: 1.6, color: P.inkSoft, alpha: 0.7, seed: sd('pl', i, k) });
          L.hatch(ctx, front, { spacing: 9, color: P.wood || P.inkSoft, alpha: 0.6, seed: sd('fh', i) % 9999,
            density: (x, y) => clamp((y - s.y) / 420) });
          L.inkPath(ctx, top, { closed: true, smooth: false, width: 2.8, fill: P.stripeCream, seed: sd('t', i) });
          L.inkPath(ctx, side, { closed: true, smooth: false, width: 2.8, fill: P.inkFaint, seed: sd('s', i) });
          L.crossHatch(ctx, side, { tone: 0.6, spacing: 6, color: P.ink, alpha: 0.7, seed: sd('sh', i) % 9999 });
        }

        // 3. annBlue guide, rising diagonal (24 fps draw-on)
        const gp = hit(B_GUIDE, 9, E.outExpo);
        if (gp > 0) {
          const ax = 200, ay = 760, bx = 1760, by = 150;
          L.inkLine(ctx, ax, ay, lerp(ax, bx, gp), lerp(ay, by, gp), { width: 2.5, color: P.annBlue, taper: 0, seed: sd('g'), wobble: 0.6 });
          if (gp > 0.98) {
            const a = Math.atan2(by - ay, bx - ax);
            ctx.save();
            ctx.fillStyle = P.annBlue;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * 10, by + Math.sin(a) * 10);
            ctx.lineTo(bx - Math.cos(a - 0.5) * 22, by - Math.sin(a - 0.5) * 22);
            ctx.lineTo(bx - Math.cos(a + 0.5) * 22, by - Math.sin(a + 0.5) * 22);
            ctx.fill();
            ctx.restore();
          }
          // step ticks along the guide
          for (let k = 1; k < 4; k++) {
            const u = k / 4;
            if (u > gp) continue;
            const x = lerp(ax, bx, u), y = lerp(ay, by, u);
            L.inkLine(ctx, x - 9, y - 12, x + 9, y + 12, { width: 2, color: P.annBlue, taper: 0, seed: sd('gt', k) });
          }
        }

        // 4a. wheel, rolling on its step (on twos), rocking back and forth
        {
          const roll = Math.sin(tw * 2.4) * 22;
          const x = WHEEL.x + roll, y = WHEEL.y, r = WHEEL.r;
          const rot = roll / r;
          L.inkCircle(ctx, x, y, r, { width: 4.5, fill: P.wood || P.tan, seed: sd('wr'), double: true });
          L.inkCircle(ctx, x, y, r - 16, { width: 2.8, fill: P.tan, seed: sd('wi') });
          for (let k = 0; k < 8; k++) {
            const a = rot + (k / 8) * TAU;
            L.inkLine(ctx, x + Math.cos(a) * 18, y + Math.sin(a) * 18, x + Math.cos(a) * (r - 18), y + Math.sin(a) * (r - 18), { width: 3.2, seed: sd('sp', k), taper: [4, 4] });
          }
          L.inkCircle(ctx, x, y, 18, { width: 2.8, fill: P.ochre, seed: sd('hub') });
          L.hatch(ctx, (c) => { c.arc(x, y, r, 0, TAU); }, { bounds: [x - r, y - r, 2 * r, 2 * r], spacing: 7, alpha: 0.7, seed: sd('wh') % 9999,
            density: (px, py) => clamp(((px - x) + (py - y)) / r) });
          // ground shadow
          L.hatch(ctx, L.ellipsePts(x + 10, 800 - 4, r * 0.9, 10, 24), { spacing: 5, alpha: 0.6, seed: sd('ws') % 9999 });
        }

        // 4b. kite on a string tied to step 2
        const kp = popTwos(t, B_KITE);
        if (kp > 0) {
          const sway = Math.sin(tw * 3.1) * 0.08;
          ctx.save();
          ctx.translate(KITE.x, KITE.y);
          ctx.rotate(sway);
          ctx.scale(kp * 1.25, kp * 1.25);
          const kite = [[0, -120], [80, -10], [0, 110], [-80, -10]];
          L.inkPath(ctx, kite, { closed: true, smooth: false, width: 4.5, fill: P.rose, seed: sd('k') });
          L.hatch(ctx, [[0, -120], [80, -10], [0, 110]], { spacing: 8, color: P.ink, alpha: 0.55, seed: sd('kh') % 9999 });
          L.inkLine(ctx, 0, -120, 0, 110, { width: 2.8, color: P.wood || P.inkSoft, seed: sd('k1') });
          L.inkLine(ctx, -80, -10, 80, -10, { width: 2.8, color: P.wood || P.inkSoft, seed: sd('k2') });
          // tail with bows, waving on twos
          const tail = [];
          for (let i = 0; i <= 10; i++) tail.push([Math.sin(i * 0.9 + tw * 7) * 22, 110 + i * 22]);
          L.inkPath(ctx, tail, { width: 1.8, seed: sd('tail') });
          for (let i = 3; i <= 9; i += 3) {
            const [bx, by] = tail[i];
            L.inkPath(ctx, [[bx - 14, by - 8], [bx + 14, by + 8], [bx + 14, by - 8], [bx - 14, by + 8]], { closed: true, smooth: false, width: 1.6, fill: P.ochre, seed: sd('bow', i) });
          }
          ctx.restore();
          // string to the step
          if (kp >= 1) L.inkPath(ctx, [[KITE.x, KITE.y + 20], [KITE.x - 60, KITE.y + 160], [600, 655]], { width: 1.4, color: P.inkSoft, seed: sd('str') });
        }

        // 4c. biplane, tilted up, propeller spinning on twos
        const pp = popTwos(t, B_PLANE);
        if (pp > 0) {
          const bob = Math.sin(tw * 2.6) * 8;
          ctx.save();
          ctx.translate(PLANE.x, PLANE.y + bob);
          ctx.rotate(-12 * DEG);
          ctx.scale(pp * 1.4, pp * 1.4);
          L.inkPath(ctx, [[-150, -10], [-150, -50], [-110, -60], [-100, -14]], { closed: true, smooth: false, width: 2.8, fill: P.ochre, seed: sd('tl') });
          const body = [[-150, -14], [60, -26], [120, -18], [130, 6], [60, 22], [-150, 4]];
          L.inkPath(ctx, body, { closed: true, width: 4.5, fill: P.rocketWhite, seed: sd('body') });
          L.hatch(ctx, body, { spacing: 7, alpha: 0.6, seed: sd('bh') % 9999, density: (x, y) => clamp((y + 4) / 18) });
          // wings and struts
          L.inkLine(ctx, -30, -60, -20, 10, { width: 2.2, seed: sd('s1') });
          L.inkLine(ctx, 60, -64, 66, 8, { width: 2.2, seed: sd('s2') });
          L.inkPath(ctx, L.rrectPts(-70, -78, 190, 20, 9, 8), { closed: true, width: 2.8, fill: P.red || P.rose, seed: sd('w1') });
          L.inkPath(ctx, L.rrectPts(-60, 6, 180, 20, 9, 8), { closed: true, width: 2.8, fill: P.red || P.rose, seed: sd('w2') });
          L.hatch(ctx, L.rrectPts(-60, 6, 180, 20, 9, 8), { spacing: 6, alpha: 0.6, seed: sd('w2h') % 9999 });
          // cockpit and pilot cap
          L.inkCircle(ctx, -10, -32, 14, { width: 2.4, fill: P.inkSoft, seed: sd('pil') });
          // wheels
          L.inkLine(ctx, 30, 22, 20, 52, { width: 2, seed: sd('lg') });
          L.inkCircle(ctx, 20, 58, 12, { width: 2.4, fill: P.rocketBlack, seed: sd('wh1') });
          // propeller: blade length alternates on twos
          const blade = [46, 14, 34, 8][Math.floor(tw * 12) % 4];
          L.inkLine(ctx, 136, -blade, 136, blade, { width: 5, color: P.wood || P.inkSoft, seed: sd('pr'), taper: [6, 6] });
          L.inkCircle(ctx, 136, -6, 7, { width: 2, fill: P.ochre, seed: sd('hubp') });
          ctx.restore();
          // motion lines behind
          for (let k = 0; k < 3; k++) L.inkLine(ctx, PLANE.x - 200 - k * 20, PLANE.y + bob - 10 + k * 22 + 30, PLANE.x - 270 - k * 30, PLANE.y + bob + k * 22 + 44, { width: 1.6, color: P.inkSoft, alpha: 0.7, seed: sd('ml', k) });
        }

        // 4d. rocket: pops on step 4, launches up-right and exits
        const rp = popTwos(t, B_ROCKET);
        if (rp > 0) {
          const lu = t < B_LAUNCH ? 0 : E.inQuad(clamp((tw - B_LAUNCH) / 0.7));
          const rx = ROCKET.x + 520 * lu, ry = ROCKET.y - 900 * lu;
          const shake = t >= B_LAUNCH - 0.375 && t < B_LAUNCH ? (Math.floor(tw * 12) % 2 ? 2 : -2) : 0;
          ctx.save();
          ctx.translate(rx + shake, ry);
          ctx.rotate(18 * DEG * lu);
          ctx.scale(rp, rp);
          // flame
          if (t >= B_LAUNCH - 0.375) {
            const fl = t >= B_LAUNCH ? 1 : 0.4;
            const fh = (90 + 30 * (Math.floor(tw * 12) % 2)) * fl;
            L.inkPath(ctx, [[-26, -6], [0, fh], [26, -6]], { closed: true, width: 2.4, fill: P.flame, seed: sd('fl') });
            L.inkPath(ctx, [[-13, -6], [0, fh * 0.6], [13, -6]], { closed: true, width: 1.4, fill: P.flameCore, seed: sd('fc') });
          }
          L.inkPath(ctx, [[-36, -40], [-70, 4], [-36, -4]], { closed: true, smooth: false, width: 2.8, fill: P.rose, seed: sd('fin1') });
          L.inkPath(ctx, [[36, -40], [70, 4], [36, -4]], { closed: true, smooth: false, width: 2.8, fill: P.rose, seed: sd('fin2') });
          const body = [[-36, -4], [-36, -190], [-20, -250], [0, -282], [20, -250], [36, -190], [36, -4]];
          L.inkPath(ctx, body, { closed: true, width: 4.5, fill: P.rocketWhite, seed: sd('rb'), double: true });
          L.inkPath(ctx, [[-26, -222], [0, -282], [26, -222], [0, -230]], { closed: true, width: 2.4, fill: P.rose, seed: sd('nose') });
          L.hatch(ctx, body, { spacing: 7, alpha: 0.6, seed: sd('rh') % 9999, density: (x) => clamp(x / 30) });
          L.inkCircle(ctx, 0, -150, 16, { width: 2.8, fill: P.teal, seed: sd('win') });
          L.inkLine(ctx, -36, -80, 36, -80, { width: 1.6, color: P.inkSoft, seed: sd('band') });
          ctx.restore();
          // smoke puffs on the step at launch
          if (t >= B_LAUNCH) {
            const u = clamp((tw - B_LAUNCH) / 0.75);
            for (let k = 0; k < 5; k++) {
              const px = ROCKET.x - 110 + k * 55, py = ROCKET.y - 20 - Math.sin(k) * 10;
              const r = (22 + 10 * (k % 2)) * (0.6 + 0.8 * u);
              L.inkCircle(ctx, px, py, r, { width: 2, fill: P.paperShade, seed: sd('puff', k) });
            }
          }
        }

        // 5. annYellow rings on each arrival (24 fps, 10 frames)
        const ring = (a, x, y, r0) => {
          if (t < a - FR || t > a + 11 * FR) return;
          const u = hit(a, 10, E.outExpo);
          ctx.save();
          ctx.globalAlpha = 1 - u;
          ctx.strokeStyle = P.annYellow;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, r0 + 90 * u, 0, TAU); ctx.stroke();
          ctx.restore();
        };
        ring(0, WHEEL.x, WHEEL.y, WHEEL.r + 8);
        ring(B_KITE, KITE.x, KITE.y, 120);
        ring(B_PLANE, PLANE.x, PLANE.y, 150);
        ring(B_ROCKET, ROCKET.x, ROCKET.y - 140, 150);
        ring(B_LAUNCH, ROCKET.x, ROCKET.y, 90);
      });
    },
  });
})();
