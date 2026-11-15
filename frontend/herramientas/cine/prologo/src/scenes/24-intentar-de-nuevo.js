/*
 * 24 intentar-de-nuevo : Try again (illustrated)
 * Global T 123.0 to 129.0 (local 0 to 6). Cut in. Camera locked.
 *
 * Layers, back to front:
 *   1. Stripe sky (Act 3: stripeCream / stripeYellow), drifting 6 px per beat
 *   2. Distant hills and a tree line; construction circle around the pad
 *   3. Field (sage, hatched) and the darker foreground band (subtitle area, calm)
 *   4. Controller box and cable; launch pad, rod and blast plate
 *   5. Smoke puffs (behind rockets)
 *   6. Rocket 1: wobbling launch, apogee, parachute, falls; lies in the grass afterwards
 *   7. Rocket 2: pops onto the pad, launches straight up and leaves the frame
 *   8. Overlays: annBlue expected path + ruler, annMagenta failed arc + change ring, annYellow ring on the fall
 *
 * Beats (local): 0.75 narration P8, the expected path draws on; 1.5 launch 1 (T 124.5); 2.25 apogee, chute
 * pops (fizzle T 125.25); 3.0 lands (T 126.0); 3.75 rocket 2 pops onto the pad; 4.5 launch 2 (T 127.5,
 * whoosh); 5.25 clears the frame top, smoke billows; holds to 6.0 (T 129).
 */
(function () {
  'use strict';
  const ID = 'intentar-de-nuevo';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
  const h3 = (a, b, c) => (LIB.hash(a, b, c) % 100000) / 100000;

  const INK = P.ink, SOFT = P.inkSoft, FAINT = P.inkFaint;
  const WHITE_R = P.rocketWhite, RED = P.red, ROSE = P.rose, SAGE = P.sage, TEAL = P.teal, TEALD = P.tealDeep;
  const MAG = P.annMagenta, BLUE = P.annBlue, YEL = P.annYellow;

  // ---------------------------------------------------------------------------
  // Beats and layout
  // ---------------------------------------------------------------------------
  const B_NARR = 0.75;  // T 123.75
  const B_L1 = 1.5;     // T 124.5 launch 1
  const B_APO = 2.25;   // T 125.25 apogee, chute, fizzle
  const B_LAND = 3.0;   // T 126.0 lands
  const B_R2 = 3.75;    // T 126.75 rocket 2 on the pad
  const B_L2 = 4.5;     // T 127.5 launch 2
  const B_OUT = 5.25;   // T 128.25 out of frame, smoke billows

  const HORIZON = 690;
  const PAD_X = 760, PAD_Y = 760;     // pad foot
  const ROCKET_X = 784, ROCKET_Y = 640; // rocket centre when seated (base at y 732)
  const LAND = [1236, 792];           // where rocket 1 lies

  // ---------------------------------------------------------------------------
  // Geometry (t-independent, built once)
  // ---------------------------------------------------------------------------
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const r = L.rng(sd('geo'));
    // hills
    const hill = (x0, x1, base, amp, seed) => {
      const pts = [];
      for (let x = x0; x <= x1; x += 30) {
        const u = (x - x0) / (x1 - x0);
        pts.push([x, base - amp * Math.sin(u * Math.PI) * (0.85 + 0.15 * Math.sin(u * 9 + seed))]);
      }
      pts.push([x1, base + 40], [x0, base + 40]);
      return pts;
    };
    const hills = [hill(-60, 900, HORIZON + 6, 120, 1), hill(620, 1980, HORIZON + 6, 90, 2.4)];
    // tree crowns along the right
    const trees = [];
    for (const [x, y, rr] of [[1560, 640, 62], [1660, 650, 50], [1760, 628, 70], [210, 660, 44]]) {
      const pts = [];
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const bump = 1 + 0.1 * Math.sin(a * 5 + x) + 0.05 * Math.sin(a * 11);
        pts.push([x + Math.cos(a) * rr * bump, y + Math.sin(a) * rr * 0.9 * bump]);
      }
      trees.push({ x, y, rr, pts });
    }
    // grass tufts on the field (seeded)
    const tufts = [];
    for (let i = 0; i < 110; i++) {
      const x = r.range(-20, 1940);
      const y = r.range(HORIZON + 30, 850);
      tufts.push([x, y, r.range(8, 18), r.range(-0.3, 0.3)]);
    }
    // field outline (slight undulation)
    const field = [];
    for (let x = -40; x <= 1960; x += 40) field.push([x, HORIZON + 4 * Math.sin(x * 0.006)]);
    field.push([1960, 1100], [-40, 1100]);
    const fore = [];
    for (let x = -40; x <= 1960; x += 40) fore.push([x, 852 + 6 * Math.sin(x * 0.01 + 1)]);
    fore.push([1960, 1100], [-40, 1100]);
    GEO = { hills, trees, tufts, field, fore };
    return GEO;
  }

  // ---------------------------------------------------------------------------
  // Rocket 1 flight (positions are functions of time, sampled on twos for the object)
  // ---------------------------------------------------------------------------
  function flight1(tt) {
    // returns { x, y, a, phase }
    if (tt < B_L1) return { x: ROCKET_X, y: ROCKET_Y, a: 0, phase: 'pad' };
    if (tt < B_APO) {
      const u = clamp((tt - B_L1) / (B_APO - B_L1));
      const up = E.outQuad(u);
      const x = ROCKET_X + 250 * Math.pow(u, 1.6) + 26 * Math.sin(u * 15) * u;
      const y = ROCKET_Y - 410 * up;
      const a = 0.62 * u + 0.32 * Math.sin(u * 15 + 0.4) * u;
      return { x, y, a, phase: 'up' };
    }
    if (tt < B_LAND) {
      const v = clamp((tt - B_APO) / (B_LAND - B_APO));
      const sx = ROCKET_X + 250 + 26 * Math.sin(15);
      const sy = ROCKET_Y - 410;
      const x = lerp(sx, LAND[0], v) + 18 * Math.sin(v * 7);
      const y = lerp(sy, LAND[1] - 30, E.inQuad(v * 0.7 + 0.3 * v * v));
      return { x, y, a: 1.15 + 0.2 * Math.sin(v * 8), phase: 'chute', v };
    }
    return { x: LAND[0], y: LAND[1], a: Math.PI / 2 + 0.08, phase: 'down' };
  }
  function flight2(tt) {
    if (tt < B_L2) return { x: ROCKET_X, y: ROCKET_Y };
    const u = (tt - B_L2) / 1.0;
    return { x: ROCKET_X, y: ROCKET_Y - 980 * u * u - 60 * u };
  }

  // ---------------------------------------------------------------------------
  // Draw helpers
  // ---------------------------------------------------------------------------
  function drawRocket(ctx, L, x, y, ang, sc, seed, bi, flame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(sc, sc);
    // flame first (behind the body)
    if (flame > 0) {
      const fl = 34 + 46 * flame * (0.8 + 0.4 * h3(bi, seed, 3));
      const fpts = [[-10, 90], [0, 90 + fl], [10, 90]];
      L.inkPath(ctx, [[-11, 90], [-7, 90 + fl * 0.55], [0, 90 + fl], [7, 90 + fl * 0.55], [11, 90]], {
        closed: true, width: 1.8, color: SOFT, fill: P.flame, seed: seed + 40, taper: [4, 8], wobble: 1,
      });
      L.inkPath(ctx, [[-5, 92], [0, 92 + fl * 0.55], [5, 92]], { closed: true, width: 0.1, alpha: 0, fill: P.flameCore, seed: seed + 41 });
      void fpts;
    }
    // fins (red), behind the tube
    const finL = [[-15, 46], [-46, 92], [-46, 108], [-15, 92]];
    const finR = finL.map(([a, b]) => [-a, b]);
    L.inkPath(ctx, finL, { closed: true, width: 2.8, fill: RED, seed: seed + 1, smooth: false, taper: [4, 8] });
    L.inkPath(ctx, finR, { closed: true, width: 2.8, fill: RED, seed: seed + 2, smooth: false, taper: [4, 8] });
    L.hatch(ctx, finR, { spacing: 5, width: 1.2, alpha: 0.75, seed: seed + 3, length: [10, 24], inset: 2 });
    // nozzle
    L.inkPath(ctx, [[-9, 90], [9, 90], [7, 98], [-7, 98]], { closed: true, width: 2, fill: P.rocketBlack, seed: seed + 4, smooth: false, taper: [3, 6] });
    // body tube
    const tube = [[-15, -60], [15, -60], [15, 90], [-15, 90]];
    L.inkPath(ctx, tube, { closed: true, width: 4.5, fill: WHITE_R, seed: seed + 5, smooth: false, taper: [6, 12] });
    // shadow side: contour hatching on the right half
    L.hatch(ctx, [[5, -58], [14, -58], [14, 88], [5, 88]], { angle: -Math.PI / 2 + 0.05, spacing: 3.4, width: 1.2, alpha: 0.6, seed: seed + 6, length: [20, 60], inset: 1 });
    // roll band and seam
    L.inkPath(ctx, [[-15, -38], [15, -38], [15, -28], [-15, -28]], { closed: true, width: 1.6, fill: P.rocketBlack, seed: seed + 7, smooth: false, taper: [2, 4] });
    L.inkLine(ctx, -15, 40, 15, 40, { width: 1.6, color: SOFT, seed: seed + 8 });
    // centre fin edge-on
    L.inkPath(ctx, [[-3, 54], [3, 54], [3, 110], [-3, 110]], { closed: true, width: 1.6, fill: RED, seed: seed + 9, smooth: false, taper: [2, 4] });
    // launch lug
    L.inkPath(ctx, [[-21, 4], [-15, 4], [-15, 30], [-21, 30]], { closed: true, width: 1.6, fill: WHITE_R, seed: seed + 10, smooth: false, taper: [2, 4] });
    // nose cone (ogive)
    const nose = [[-15, -60], [-13, -78], [-8, -96], [0, -114], [8, -96], [13, -78], [15, -60]];
    L.inkPath(ctx, nose, { closed: true, width: 4.5, fill: WHITE_R, seed: seed + 11, taper: [6, 12] });
    L.hatch(ctx, [[4, -62], [14, -62], [11, -84], [5, -98]], { angle: -Math.PI / 2 + 0.25, spacing: 3.4, width: 1.1, alpha: 0.55, seed: seed + 12, length: [10, 30], inset: 1 });
    // port window
    L.inkCircle(ctx, 0, -4, 5, { width: 1.6, color: SOFT, seed: seed + 13 });
    ctx.restore();
  }

  function drawChute(ctx, L, cx, cy, ax, ay, open, seed) {
    // canopy centre (cx, cy), attachment (ax, ay), open 0..1 (width)
    const rx = 78 * open, ry = 54 * (0.5 + 0.5 * open);
    if (rx < 4) return;
    const top = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      top.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    // scalloped hem
    const hem = [];
    const g = 6;
    for (let k = g; k >= 0; k--) {
      const x0 = cx + rx - (2 * rx * k) / g;
      hem.push([x0, cy]);
      if (k > 0) hem.push([x0 - rx / g, cy - 9 * open]);
    }
    const canopy = top.concat(hem.reverse().slice(1));
    // shroud lines
    for (let k = 0; k <= g; k += 1) {
      const x0 = cx - rx + (2 * rx * k) / g;
      L.inkLine(ctx, x0, cy, ax, ay, { width: 1.2, color: SOFT, alpha: 0.8, seed: seed + 30 + k, taper: [2, 6], wobble: 0.6 });
    }
    L.inkPath(ctx, canopy, { closed: true, width: 3.2, fill: ROSE, seed: seed + 1, taper: [6, 12] });
    // gores
    for (let k = 1; k < g; k++) {
      const x0 = cx - rx + (2 * rx * k) / g;
      const f = (x0 - cx) / rx;
      L.inkPath(ctx, [[cx + f * rx * 0.15, cy - ry * 0.98], [cx + f * rx * 0.6, cy - ry * 0.75], [x0, cy - 2]], { width: 1.4, color: SOFT, seed: seed + 10 + k, taper: [4, 8] });
    }
    // shade on the lower right of the dome
    L.hatch(ctx, canopy, { spacing: 6, width: 1.2, alpha: 0.6, seed: seed + 2, density: (x, y) => clamp((x - cx) / rx * 1.4 + (y - cy + ry) / ry * 0.4 - 0.3), length: [12, 30] });
  }

  function puff(ctx, L, x, y, rr, a, seed) {
    if (a <= 0.02 || rr < 2) return;
    const pts = [];
    const n = 20;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU;
      const b = 1 + 0.16 * Math.sin(ang * 4 + seed) + 0.08 * Math.sin(ang * 7 + seed * 2);
      pts.push([x + Math.cos(ang) * rr * b, y + Math.sin(ang) * rr * 0.86 * b]);
    }
    ctx.save();
    ctx.globalAlpha *= a;
    L.inkPath(ctx, pts, { closed: true, width: 1.8, color: SOFT, fill: P.white, seed, taper: [6, 10] });
    if (rr > 22) L.hatch(ctx, pts, { spacing: 7, width: 1.1, alpha: 0.45, seed: seed + 1, density: (px, py) => clamp(((px - x) + (py - y)) / rr - 0.2), length: [8, 18] });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const T = info.shot.start + t;
      const bi = L.boil(T);
      const G = geo(L);

      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // 1. Stripe sky (drift 6 px per beat, from global T)
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: (T / 0.75) * 6, bounds: { x: 0, y: 0, w: 1920, h: HORIZON + 40 } });

      // 2. Hills, trees, construction circle
      L.guideCircle(ctx, PAD_X, 520, 330, { color: FAINT, alpha: 0.3, width: 1.4, cross: 18 });
      L.guideCircle(ctx, PAD_X, 520, 220, { color: FAINT, alpha: 0.22, width: 1.2, dash: [6, 8] });
      const hillCol = L.mix(SAGE, P.paper, 0.45);
      G.hills.forEach((h, i) => {
        L.inkPath(ctx, h, { closed: true, width: 2.8, fill: hillCol, seed: sd('hill', i), taper: [8, 16] });
        L.hatch(ctx, h, { spacing: 12, width: 1.2, alpha: 0.35, seed: sd('hh', i), density: 0.6, color: TEALD });
      });
      G.trees.forEach((tr, i) => {
        L.inkLine(ctx, tr.x, tr.y + tr.rr * 0.6, tr.x + 3, HORIZON + 30, { width: 4, color: INK, seed: sd('trunk', i) });
        L.inkPath(ctx, tr.pts, { closed: true, width: 2.8, fill: L.mix(SAGE, TEALD, 0.25), seed: sd('tree', i), taper: [8, 14] });
        L.crossHatch(ctx, tr.pts, { tone: 0.5, spacing: 7, width: 1.2, alpha: 0.7, seed: sd('th', i), color: TEALD, density: (x, y) => clamp(((x - tr.x) + (y - tr.y)) / tr.rr * 0.8 + 0.2) });
      });

      // 3. Field and foreground band
      L.inkPath(ctx, G.field, { closed: true, width: 2.8, fill: SAGE, seed: sd('field'), taper: [8, 16] });
      L.hatch(ctx, G.field, { spacing: 12, width: 1.3, alpha: 0.4, seed: sd('fh'), color: TEALD, length: [10, 30], density: (x, y) => clamp((y - HORIZON) / 200) });
      const foreCol = L.mix(SAGE, TEALD, 0.6);
      ctx.save();
      ctx.beginPath();
      L.tracePath(ctx, G.fore, true);
      ctx.fillStyle = foreCol;
      ctx.fill();
      ctx.restore();
      L.inkPath(ctx, G.fore.slice(0, -2), { width: 2.2, color: TEALD, seed: sd('foreline'), taper: [10, 20] });
      L.hatch(ctx, G.fore, { spacing: 14, width: 1.2, alpha: 0.25, seed: sd('foh'), color: INK, length: [12, 26], density: 0.5 });
      // grass tufts
      ctx.save();
      ctx.strokeStyle = TEALD;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      for (let i = 0; i < G.tufts.length; i++) {
        const [x, y, hgt, lean] = G.tufts[i];
        const j = (h3(i, bi, 77) - 0.5) * 0.8;
        for (let k = -1; k <= 1; k++) {
          ctx.moveTo(x + k * 3, y);
          ctx.quadraticCurveTo(x + k * 4 + lean * hgt * 0.5, y - hgt * 0.6, x + k * 6 + lean * hgt + j, y - hgt * (k === 0 ? 1 : 0.75));
        }
      }
      ctx.stroke();
      ctx.restore();

      // 4. Controller box, cable, pad
      L.inkPath(ctx, [[440, 800], [520, 820], [640, 790], [720, 770], [PAD_X - 10, PAD_Y - 6]], { width: 1.8, color: INK, seed: sd('cable'), taper: [4, 10] });
      L.inkPath(ctx, L.rrectPts(392, 776, 64, 40, 6, 12), { closed: true, width: 2.8, fill: P.ochre, seed: sd('box'), taper: [4, 8] });
      L.hatch(ctx, [[430, 778], [454, 778], [454, 814], [430, 814]], { spacing: 5, width: 1.2, alpha: 0.7, seed: sd('boxh') });
      const btnOn = (t >= B_L1 && t < B_L1 + 0.25) || (t >= B_L2 && t < B_L2 + 0.25);
      L.inkCircle(ctx, 412, 790, 6, { width: 1.6, fill: btnOn ? P.red : P.rose, seed: sd('btn') });
      L.inkLine(ctx, 444, 776, 448, 756, { width: 1.6, seed: sd('key') });
      // tripod legs
      L.inkLine(ctx, PAD_X, PAD_Y - 24, PAD_X - 54, PAD_Y + 14, { width: 2.8, seed: sd('leg', 1) });
      L.inkLine(ctx, PAD_X, PAD_Y - 24, PAD_X + 58, PAD_Y + 12, { width: 2.8, seed: sd('leg', 2) });
      L.inkLine(ctx, PAD_X, PAD_Y - 24, PAD_X + 6, PAD_Y + 22, { width: 2.8, seed: sd('leg', 3) });
      // blast plate
      L.inkPath(ctx, [[PAD_X - 6, PAD_Y - 30], [PAD_X + 62, PAD_Y - 30], [PAD_X + 58, PAD_Y - 22], [PAD_X - 2, PAD_Y - 22]], { closed: true, width: 2.4, fill: P.hoseGrey, seed: sd('plate'), smooth: false, taper: [3, 6] });
      // scorch on the plate after a launch
      if (t >= B_L1) L.stipple(ctx, [[PAD_X + 6, PAD_Y - 30], [PAD_X + 52, PAD_Y - 30], [PAD_X + 52, PAD_Y - 22], [PAD_X + 6, PAD_Y - 22]], { spacing: 4, alpha: 0.7, seed: sd('scorch'), r: [0.8, 1.5] });
      // launch rod
      L.inkLine(ctx, PAD_X + 2, PAD_Y - 24, PAD_X + 2, 470, { width: 2.2, seed: sd('rod'), taper: [2, 8] });
      L.inkCircle(ctx, PAD_X + 2, 468, 3, { width: 1.4, fill: P.rocketBlack, seed: sd('rodcap') });

      // 5. Smoke puffs
      // launch 1: sputtering trail (puffs spawned on twos along the climb)
      for (let k = 0; k < 9; k++) {
        const tk = B_L1 + k / 12;
        if (tw < tk) break;
        const f = flight1(tk);
        const age = tw - tk;
        const life = 1.3;
        if (age > life) continue;
        const rr = 10 + 26 * E.outCubic(age / life) + h3(k, 1, sd('p1')) * 6;
        const bx = f.x - Math.sin(f.a) * -95 + (h3(k, 2, sd('p1')) - 0.5) * 20;
        const by = f.y + Math.cos(f.a) * 95 + 18 * age;
        puff(ctx, L, bx, by, rr, (1 - age / life) * 0.95, sd('puff1', k));
      }
      // pad clouds at each launch
      for (const [b0, n, big] of [[B_L1, 4, 0.8], [B_L2, 6, 1.2]]) {
        for (let k = 0; k < n; k++) {
          const age = tw - b0 - k * 0.0833;
          if (age < 0) continue;
          const life = 1.6;
          if (age > life) continue;
          const side = k % 2 ? 1 : -1;
          const spread = (24 + 70 * E.outCubic(age / life)) * big * (0.5 + k * 0.18);
          const rr = (14 + 26 * E.outCubic(age / life)) * big;
          puff(ctx, L, ROCKET_X + side * spread, PAD_Y - 30 - k * 4 - 10 * age, rr, (1 - age / life) * 0.95, sd('padp', b0 * 10, k));
        }
      }
      // launch 2: clean straight column
      for (let k = 0; k < 12; k++) {
        const tk = B_L2 + k / 12;
        if (tw < tk) break;
        const f = flight2(tk);
        const age = tw - tk;
        const life = 1.4;
        if (age > life) continue;
        const rr = 8 + 18 * E.outCubic(age / life);
        if (f.y + 110 < -40) continue;
        puff(ctx, L, f.x + (h3(k, 3, sd('p2')) - 0.5) * 8, f.y + 112 + 10 * age, rr, (1 - age / life) * 0.85, sd('puff2', k));
      }

      // 8a. Expected path (annBlue), behind the rockets: appears with the narration
      if (t >= B_NARR - FR) {
        const ep = hit(B_NARR, 9, E.outExpo);
        const yTop = lerp(ROCKET_Y - 120, 120, ep);
        ctx.save();
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.globalAlpha = t >= B_L2 ? 1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(ROCKET_X, ROCKET_Y - 130);
        ctx.lineTo(ROCKET_X, yTop);
        ctx.stroke();
        ctx.restore();
        // ruler beside the path
        L.ticks(ctx, ROCKET_X + 52, ROCKET_Y - 130, { length: (ROCKET_Y - 130 - 120), angle: -Math.PI / 2, n: 16, len: 12, major: 4, majorLen: 28, color: BLUE, alpha: 0.9, width: 2, p: ep, side: 1 });
      }

      // 6. Rocket 1
      const f1 = flight1(tw);
      if (f1.phase === 'pad') {
        drawRocket(ctx, L, ROCKET_X, ROCKET_Y, 0, 1, sd('r1'), bi, 0);
      } else if (f1.phase === 'up') {
        // sputtering flame: on twos, flickers out near apogee
        const fu = clamp((tw - B_L1) / (B_APO - B_L1));
        const flick = fu < 0.75 ? (h3(drawing(B_L1), 5, sd('fl')) > 0.25 ? 1 - fu * 0.6 : 0.25) : 0;
        drawRocket(ctx, L, f1.x, f1.y, f1.a, 1, sd('r1'), bi, flick);
      } else if (f1.phase === 'chute') {
        const open = [0.35, 0.8, 1.06, 1][Math.min(3, drawing(B_APO))];
        const nx = f1.x + Math.sin(f1.a) * 114 * 0, ny = f1.y;
        // canopy rides above the rocket, attached near the nose by the shock cord
        const noseX = f1.x + Math.sin(f1.a) * 112, noseY = f1.y - Math.cos(f1.a) * 112;
        const cx = noseX - 20, cy = noseY - 110;
                drawRocket(ctx, L, f1.x, f1.y, f1.a, 1, sd('r1'), bi, 0);
        drawChute(ctx, L, cx, cy, noseX, noseY, open, sd('chute'));
        void nx; void ny;
      } else {
        // lying in the grass with the canopy collapsed beside it
        const drape = [[LAND[0] + 110, LAND[1] + 8], [LAND[0] + 150, LAND[1] - 22], [LAND[0] + 200, LAND[1] - 18], [LAND[0] + 236, LAND[1] + 4], [LAND[0] + 220, LAND[1] + 14], [LAND[0] + 130, LAND[1] + 16]];
        L.inkPath(ctx, [[LAND[0] + 100, LAND[1] - 4], [LAND[0] + 130, LAND[1] + 4]], { width: 1.4, color: SOFT, seed: sd('cord2') });
        L.inkPath(ctx, drape, { closed: true, width: 2.8, fill: ROSE, seed: sd('drape'), taper: [6, 10] });
        L.hatch(ctx, drape, { spacing: 6, width: 1.2, alpha: 0.6, seed: sd('drh'), density: 0.6 });
        const bump = t < B_LAND + 0.25 ? [-10, 3, 0][Math.min(2, drawing(B_LAND))] : 0;
        drawRocket(ctx, L, LAND[0], LAND[1] - 16 + bump, f1.a, 0.92, sd('r1'), bi, 0);
        // landing dust
        if (t < B_LAND + 0.75) {
          const age = tw - B_LAND;
          for (let k = 0; k < 3; k++) puff(ctx, L, LAND[0] - 60 + k * 70, LAND[1] + 6 - 14 * age, 10 + 20 * E.outCubic(age / 0.75), 1 - age / 0.75, sd('dust', k));
        }
      }

      // 8b. Failed arc (annMagenta), traced behind rocket 1 at 24 fps
      if (t >= B_L1) {
        const tEnd = Math.min(t, B_LAND);
        const pts = [];
        for (let tt = B_L1; tt <= tEnd + 1e-6; tt += 1 / 48) {
          const f = flight1(tt);
          pts.push([f.x, f.y + 40]);
        }
        const fade = t > B_L2 ? 0.55 : 1;
        if (pts.length > 1) {
          ctx.save();
          ctx.strokeStyle = MAG;
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.setLineDash([14, 10]);
          ctx.globalAlpha = fade;
          ctx.beginPath();
          L.tracePath(ctx, pts, false);
          ctx.stroke();
          ctx.restore();
        }
        // change ring at apogee (fizzle)
        const rk = (t - B_APO) / (12 * FR);
        if (rk >= -1 / 12 && rk < 1) {
          const f = flight1(B_APO);
          ctx.save();
          ctx.strokeStyle = MAG;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1 - Math.max(0, rk);
          ctx.beginPath();
          ctx.arc(f.x, f.y, 30 + 70 * E.outExpo(rk + 1 / 12), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
      // attention ring on the fallen rocket (annYellow), lands with it
      if (t >= B_LAND) {
        const yk = (t - B_LAND) / (12 * FR);
        const settle = yk < 1 ? 60 + 60 * E.outExpo(yk + 1 / 12) : 120;
        ctx.save();
        ctx.strokeStyle = YEL;
        ctx.lineWidth = 3;
        ctx.globalAlpha = yk < 1 ? 1 : t < B_L2 ? 0.8 : 0.45;
        ctx.beginPath();
        ctx.ellipse(LAND[0] + 60, LAND[1] - 10, settle * 1.4, settle * 0.55, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Rocket 2: pops onto the pad, then flies straight
      if (t >= B_R2) {
        const f2 = flight2(tw);
        const sc = t < B_L2 ? popTwos(B_R2) : 1;
        if (f2.y > -260) {
          const flame = t >= B_L2 ? 1 : 0;
          ctx.save();
          ctx.translate(ROCKET_X, ROCKET_Y + 90);
          ctx.scale(1, sc);
          ctx.translate(-ROCKET_X, -(ROCKET_Y + 90));
          drawRocket(ctx, L, f2.x, f2.y, 0, 1, sd('r2'), bi, flame);
          ctx.restore();
        }
        // whoosh motion lines beside the climbing rocket (24 fps)
        if (t >= B_L2 && t < B_OUT + 0.4) {
          const fy = flight2(t).y;
          ctx.save();
          ctx.strokeStyle = BLUE;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          for (const dx of [-34, 34]) {
            ctx.moveTo(ROCKET_X + dx, fy + 20);
            ctx.lineTo(ROCKET_X + dx, fy + 120);
          }
          ctx.stroke();
          ctx.restore();
        }
        // exit ring at the frame top when it leaves (change ring, annBlue)
        const xk = (t - B_OUT) / (12 * FR);
        if (xk >= -1 / 12 && xk < 1) {
          ctx.save();
          ctx.strokeStyle = BLUE;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1 - Math.max(0, xk);
          ctx.beginPath();
          ctx.arc(ROCKET_X, 110, 20 + 60 * E.outExpo(xk + 1 / 12), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    },
  });
})();
