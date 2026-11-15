/*
 * 02 mars-dune-alpha : Four volunteers, a printed habitat.
 * Global T 6.0 to 15.0 (9 s, 12 beats), illustrated (paper plate, warehouse interior on Earth).
 *
 * Layers, back to front (under a slow push 1.0 -> 1.06):
 *   1. Warehouse back wall: stripes (stripeCream / stripeApricot) seen through high windows, trusses.
 *   2. Concrete floor.
 *   3. Inflatable bubble (inkFaint double outline, translucent, seams).
 *   4. Red-sand yard (marsSoil, stipple).
 *   5. Mars Dune Alpha (art bible 10.5): four vaulted modules, print layers every 6 px, door at x 760.
 *   6. The four CHAPEA volunteers (art bible 10.8), walking right on twos, entering one per beat.
 *   7. Overlays (screen-fixed): annBlue dashed walking line, annYellow bracket over the habitat,
 *      annMagenta ring when the door closes.
 *
 * Beats (local t): 0.75 walk starts (T 6.75); 5.25 / 6.0 / 6.75 / 7.5 entries (T 11.25 ... 13.5);
 * 8.25 door closed + ring (T 14.25).
 */
(function () {
  'use strict';
  const ID = 'mars-dune-alpha';
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
  const B_WALK = 0.75; // T 6.75
  const B_DOOR = 5.25; // T 11.25 first entry
  const B_ENTER = [5.25, 6.0, 6.75, 7.5]; // T 11.25, 12.0, 12.75, 13.5
  const B_CLOSE = 8.25; // T 14.25

  // ---- composition ----
  const GY = 724; // habitat / yard ground line (feet)
  const DOOR_X = 760, DOOR_W = 58, DOOR_H = 196;
  const GAP = 84; // spacing in the line
  const START = 60; // leader x at B_WALK
  const VH = 176; // volunteer height
  const MODS = [
    { x0: 610, x1: 900, h: 252 },
    { x0: 880, x1: 1130, h: 306 },
    { x0: 1110, x1: 1270, h: 214 },
    { x0: 1250, x1: 1430, h: 270 },
  ];
  const HAB_X0 = 600, HAB_X1 = 1440;
  const VOLS = [
    { skin: 'skinLight', hair: 'wood', long: true },
    { skin: 'skinDeep', hair: 'ink', long: false },
    { skin: 'skinWarm', hair: 'inkSoft', long: true },
    { skin: 'skinWarm', hair: 'rocketBlack', long: false },
  ];

  // leader x as a function of (twos) time; each volunteer is GAP behind.
  function leadX(t) {
    if (t <= B_WALK) return START;
    if (t <= B_DOOR) return lerp(START, DOOR_X, (t - B_WALK) / (B_DOOR - B_WALK));
    return DOOR_X + ((t - B_DOOR) / BEAT) * GAP;
  }

  function modShape(m) {
    const pts = [];
    const wallTop = GY - m.h * 0.62;
    // left wall bulging outward (curved, printed)
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      pts.push([m.x0 + 10 * Math.sin(u * Math.PI) * -0.4 + u * 12, lerp(GY, wallTop, u)]);
    }
    // vault
    const cx = (m.x0 + m.x1) / 2, rx = (m.x1 - m.x0) / 2 - 12, ry = m.h - (GY - wallTop);
    for (let k = 1; k < 30; k++) {
      const a = Math.PI + (k / 30) * Math.PI;
      pts.push([cx + Math.cos(a) * rx, wallTop + Math.sin(a) * ry]);
    }
    for (let k = 0; k <= 8; k++) {
      const u = 1 - k / 8;
      pts.push([m.x1 - u * 12 + 4 * Math.sin(u * Math.PI), lerp(GY, wallTop, u)]);
    }
    return pts;
  }

  // ---- geometry ----
  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(sd('geo'));
    const bubble = [];
    for (let k = 0; k <= 64; k++) {
      const a = Math.PI + (k / 64) * Math.PI;
      bubble.push([960 + Math.cos(a) * 820, 800 + Math.sin(a) * 640]);
    }
    const yard = [];
    for (let x = 150; x <= 1770; x += 30) yard.push([x, 688 + 10 * LIB.noise1(x * 0.01, sd('yard'))]);
    yard.push([1790, 800], [1700, 822], [220, 822], [130, 800]);
    const mods = MODS.map(modShape);
    const pebbles = [];
    for (let i = 0; i < 26; i++) pebbles.push([r.range(200, 1720), r.range(740, 812), r.range(4, 9)]);
    GEO = { bubble, yard, mods, pebbles };
    return GEO;
  }

  function layer(name, fn) {
    const S = FILM.S || 1;
    return LIB.cached(['02', name, S].join('|'), () => {
      const c = FILM.makeCanvas(Math.round(1920 * S), Math.round(1080 * S));
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

  // 1-2. warehouse (static)
  function drawWarehouse(g) {
    const L = FROZEN;
    // wall: dim paper
    g.fillStyle = P.paperShade;
    g.fillRect(-200, -200, 2320, 1480);
    // high windows: stripes through the panes
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 270, y = 70, w = 220, h = 230;
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      LIB.stripes(g, { bounds: { x, y, w, h }, colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: 0, seed: sd('str') });
      g.restore();
      L.inkPath(g, LIB.rectPts(x, y, w, h, 12), { closed: true, width: 2.8, seed: sd('win', i), smooth: false });
      for (let k = 1; k < 3; k++) L.inkLine(g, x + (w * k) / 3, y, x + (w * k) / 3, y + h, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: sd('mul', i, k), taper: 0 });
      L.inkLine(g, x, y + h / 2, x + w, y + h / 2, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: sd('mulh', i), taper: 0 });
    }
    // wall hatching between windows (lower wall, shade)
    L.hatch(g, LIB.rectPts(-40, 300, 2000, 460, 8), { angle: -Math.PI / 4, spacing: 12, width: 1.2, color: P.paperDeep, alpha: 0.7, length: [20, 60], density: (x, y) => clamp((y - 330) / 300), seed: sd('wallh') });
    // trusses along the top
    L.inkLine(g, -40, 34, 1960, 34, { width: 2.8, seed: sd('tr0'), taper: 0 });
    L.inkLine(g, -40, 58, 1960, 58, { width: 2.2, seed: sd('tr1'), taper: 0 });
    const zz = [];
    for (let x = -40, k = 0; x <= 1960; x += 40, k++) zz.push([x, k % 2 ? 58 : 34]);
    L.inkPath(g, zz, { width: 1.4, color: P.inkSoft, smooth: false, seed: sd('trz') });
    // columns
    for (const cx of [20, 1900]) {
      L.inkPath(g, LIB.rectPts(cx - 14, 34, 28, 760, 12), { closed: true, width: 2.4, fill: P.paperDeep, seed: sd('col', cx), smooth: false });
      L.hatch(g, LIB.rectPts(cx - 14, 34, 28, 760, 12), { angle: -Math.PI / 4, spacing: 6, width: 1.2, color: P.inkSoft, alpha: 0.6, density: (x) => clamp((x - cx) / 10 + 0.4), seed: sd('colh', cx) });
    }
    // floor
    const floor = [[-200, 770], [2120, 770], [2120, 1280], [-200, 1280]];
    L.inkPath(g, floor, { closed: true, width: 2.4, fill: LIB.mix(P.paperDeep, P.inkFaint, 0.25), seed: sd('floor'), smooth: false });
    L.hatch(g, floor, { angle: -Math.PI / 4, spacing: 9, width: 1.3, color: P.inkSoft, alpha: 0.55, length: [20, 70], density: (x, y) => clamp(0.35 + (y - 800) / 260), seed: sd('floorh') });
    for (let k = 0; k < 6; k++) L.inkLine(g, -40 + k * 380, 800, -260 + k * 420, 1080, { width: 1.4, color: P.inkFaint, alpha: 0.5, seed: sd('fj', k), taper: 0 });
  }

  // 3-5. bubble, yard, habitat (static)
  function drawHabitat(g, G) {
    const L = FROZEN;
    // bubble interior: faint translucent film
    g.save();
    g.globalAlpha = 0.18;
    g.fillStyle = P.white;
    g.beginPath();
    LIB.tracePath(g, G.bubble, false);
    g.closePath();
    g.fill();
    g.restore();
    // seams (meridians)
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      const mer = [];
      for (let j = 0; j <= 24; j++) {
        const v = j / 24;
        const y = 800 - 640 * Math.sin(v * Math.PI / 2);
        const half = 820 * Math.cos(v * Math.PI / 2);
        mer.push([960 + half * (f * 2 - 1), y]);
      }
      L.inkPath(g, mer, { width: 1.3, color: P.inkFaint, alpha: 0.45, seed: sd('mer', k), taper: 20 });
    }
    for (let k = 1; k < 4; k++) {
      const v = k / 4;
      const y = 800 - 640 * Math.sin(v * Math.PI / 2);
      const half = 820 * Math.cos(v * Math.PI / 2);
      L.inkPath(g, LIB.ellipsePts(960, y, half, 20 * (1 - v), 48).slice(24), { width: 1.2, color: P.inkFaint, alpha: 0.35, seed: sd('lat', k), taper: 20 });
    }
    // yard
    L.inkPath(g, G.yard, { closed: true, width: 2.6, fill: P.marsSoil, seed: sd('yard'), wobble: 1.2 });
    L.stipple(g, G.yard, { spacing: 9, r: [1, 2.1], color: P.marsShadow, alpha: 0.75, seed: sd('yst') });
    L.stipple(g, G.yard, { spacing: 14, r: [0.9, 1.7], color: P.marsDust, alpha: 0.9, seed: sd('yst2') });
    L.hatch(g, G.yard, { angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.marsShadow, alpha: 0.6, length: [14, 40], density: (x, y) => clamp((y - 770) / 50), seed: sd('yh') });
    G.pebbles.forEach((pb, i) => L.inkPath(g, LIB.ellipsePts(pb[0], pb[1], pb[2], pb[2] * 0.6, 12), { closed: true, width: 1.4, fill: P.marsDust, seed: sd('peb', i) }));

    // habitat: modules, print layers, shading
    G.mods.forEach((pts, i) => {
      const m = MODS[i];
      L.inkPath(g, pts, { closed: true, width: 4.2, fill: P.tan, seed: sd('mod', i), wobble: 0.8, double: { alpha: 0.4, from: 0.05, to: 0.35 } });
      // print layers every 6 px, alternating tan / ochre
      g.save();
      g.beginPath();
      LIB.tracePath(g, pts, true);
      g.clip();
      const lp = new Path2D(), lq = new Path2D();
      let k = 0;
      for (let y = GY - 4; y > GY - m.h - 4; y -= 6, k++) {
        const w = 3 * Math.sin(y * 0.07 + i);
        (k % 2 ? lq : lp).moveTo(m.x0 - 10, y + w);
        for (let x = m.x0; x <= m.x1 + 10; x += 30) (k % 2 ? lq : lp).lineTo(x, y + 1.2 * Math.sin(x * 0.05 + k));
      }
      g.lineWidth = 1.2;
      g.strokeStyle = P.ochre;
      g.globalAlpha = 0.55;
      g.stroke(lp);
      g.strokeStyle = P.inkSoft;
      g.globalAlpha = 0.35;
      g.stroke(lq);
      g.restore();
      // shadow side (lower right)
      const cx = (m.x0 + m.x1) / 2, w2 = (m.x1 - m.x0) / 2;
      L.hatch(g, pts, { angle: -Math.PI / 4, spacing: 7, width: 1.4, color: P.ochre, alpha: 0.9, length: [12, 36], density: (x, y) => clamp(((x - cx) / w2) * 1.6 - 0.4), seed: sd('modh', i) });
      L.hatch(g, pts, { angle: Math.PI * 0.58, spacing: 7, width: 1.2, color: P.inkSoft, alpha: 0.7, length: [8, 22], density: (x) => clamp(((x - cx) / w2) * 2 - 1.2), seed: sd('modx', i) });
      // lit vault edge upper left
      const wallTop = GY - m.h * 0.62, ry = m.h - (GY - wallTop), rx = w2 - 12;
      const hl = [];
      for (let j = 0; j <= 12; j++) {
        const a = Math.PI * 1.08 + (j / 12) * Math.PI * 0.32;
        hl.push([cx + Math.cos(a) * (rx - 8), wallTop + Math.sin(a) * (ry - 8)]);
      }
      L.inkPath(g, hl, { width: 5, color: P.stripeYellow, alpha: 0.9, seed: sd('hl', i), taper: 10 });
      // small round windows on the bigger modules
      if (i === 1 || i === 3) {
        for (let w = 0; w < (i === 1 ? 2 : 1); w++) {
          const wx = cx - 40 + w * 80 + (i === 3 ? 40 : 0), wy = GY - m.h * 0.42;
          L.inkPath(g, LIB.rrectPts(wx - 18, wy - 24, 36, 48, 16, 6), { closed: true, width: 2.4, fill: P.inkSoft, seed: sd('mw', i, w), smooth: false });
          L.inkLine(g, wx - 10, wy - 14, wx - 2, wy - 20, { width: 2, color: P.paper, alpha: 0.7, seed: sd('mwg', i, w), taper: 2 });
        }
      }
    });
    // ground contact line + shadow under the habitat
    g.save();
    g.globalAlpha = 0.25;
    g.fillStyle = P.marsShadow;
    g.beginPath();
    g.ellipse(1030, GY + 6, 440, 14, 0, 0, TAU);
    g.fill();
    g.restore();
    // door frame (opening drawn live)
    L.inkPath(g, LIB.rrectPts(DOOR_X - DOOR_W / 2 - 8, GY - DOOR_H - 8, DOOR_W + 16, DOOR_H + 8, 26, 8), { closed: true, width: 2.8, fill: P.ochre, seed: sd('dframe'), smooth: false });
  }

  // ---- a CHAPEA volunteer (art bible 10.8), profile walking right; feet at (x, y) ----
  function capsule(x0, y0, x1, y1, r, n = 10) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = a - Math.PI / 2 + (Math.PI * i) / n;
      out.push([x1 + Math.cos(u) * r, y1 + Math.sin(u) * r]);
    }
    for (let i = 0; i <= n; i++) {
      const u = a + Math.PI / 2 + (Math.PI * i) / n;
      out.push([x0 + Math.cos(u) * r, y0 + Math.sin(u) * r]);
    }
    return out;
  }
  function drawVol(ctx, L, V) {
    const s = V.h / 180;
    const seed = V.seed;
    const sw = 2.6 / s, dw = 1.4 / s;
    const ph = V.phase;
    const sw1 = Math.sin(ph) * 0.42;
    const bob = Math.abs(Math.cos(ph)) * 3;
    ctx.save();
    ctx.translate(V.x, V.y);
    ctx.scale(s, s);
    if (V.alpha < 1) ctx.globalAlpha = V.alpha;
    // ground shadow
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.fillStyle = P.marsShadow;
    ctx.beginPath();
    ctx.ellipse(4, 1, 30, 5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.translate(0, -bob);
    const hip = [0, -84];
    const leg = (ang, back) => {
      const fx = hip[0] + Math.sin(ang) * 82, fy = hip[1] + Math.cos(ang) * 82;
      const c = back ? LIB.mix(P.earthOceanDeep, P.ink, 0.35) : P.earthOceanDeep;
      L.inkPath(ctx, capsule(hip[0], hip[1], fx, fy - 4, 10), { closed: true, width: sw, fill: c, seed: seed + (back ? 1 : 2), wobble: 0.6 });
      L.inkPath(ctx, LIB.ellipsePts(fx + 7, fy - 3, 14, 6, 14), { closed: true, width: dw, fill: P.ink, seed: seed + (back ? 3 : 4), wobble: 0.3 });
    };
    const arm = (ang, back) => {
      const sx = 2, sy = -142;
      const hx = sx + Math.sin(ang) * 60, hy = sy + Math.cos(ang) * 60;
      const c = back ? LIB.mix(P.earthOceanDeep, P.ink, 0.35) : P.earthOceanDeep;
      L.inkPath(ctx, capsule(sx, sy, hx, hy, 8), { closed: true, width: sw, fill: c, seed: seed + (back ? 5 : 6), wobble: 0.6 });
      L.inkCircle(ctx, hx, hy + 2, 6.5, { width: dw, fill: P[V.skin], seed: seed + (back ? 7 : 8), wobble: 0.2 });
      if (!back) {
        // mission patch: a little red planet on the sleeve
        const px = lerp(sx, hx, 0.25), py = lerp(sy, hy, 0.25);
        L.inkCircle(ctx, px, py, 4.5, { width: dw * 0.8, fill: P.marsSoil, seed: seed + 9, wobble: 0.1 });
      }
    };
    leg(-sw1, true);
    arm(sw1 * 0.9, true);
    // torso
    const torso = LIB.rrectPts(-17, -152, 34, 74, 14, 6);
    L.inkPath(ctx, torso, { closed: true, width: sw, fill: P.earthOceanDeep, seed: seed + 11, wobble: 0.6 });
    L.hatch(ctx, torso, { angle: -Math.PI / 4, spacing: 5, width: 1.2 / s, color: P.ink, alpha: 0.7, length: [6, 18], density: (x) => clamp((x - 2) / 12), seed: seed + 12 });
    // lighter collar
    L.inkPath(ctx, [[-10, -152], [2, -138], [14, -152]], { closed: true, width: dw, fill: P.earthOcean, seed: seed + 13, smooth: false });
    L.inkLine(ctx, 2, -138, 2, -96, { width: dw, color: P.earthOcean, alpha: 0.8, seed: seed + 14, taper: 3 });
    // belt
    L.inkLine(ctx, -16, -88, 16, -88, { width: dw * 1.6, color: P.ink, seed: seed + 15, taper: 0 });
    leg(sw1, false);
    arm(-sw1 * 0.9, false);
    // neck + head
    L.inkPath(ctx, LIB.rectPts(-4, -162, 10, 14, 4), { closed: true, width: dw, fill: P[V.skin], seed: seed + 16, smooth: false });
    const hx = 3, hy = -170;
    if (V.long) L.inkPath(ctx, [[hx - 8, hy - 10], [hx - 17, hy + 4], [hx - 16, hy + 22], [hx - 6, hy + 18], [hx - 4, hy]], { closed: true, width: dw, fill: P[V.hair], seed: seed + 17 });
    L.inkCircle(ctx, hx, hy, 15, { width: sw, fill: P[V.skin], seed: seed + 18, wobble: 0.4 });
    // hair cap (back and top of the head, profile facing right)
    const cap = [];
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI * 0.62 + (k / 14) * Math.PI * 1.25;
      cap.push([hx + Math.cos(a) * 16, hy + Math.sin(a) * 16]);
    }
    cap.push([hx + 4, hy - 6], [hx - 6, hy - 2]);
    L.inkPath(ctx, cap, { closed: true, width: dw, fill: P[V.hair], seed: seed + 19 });
    // shadow on the face's lower right + ear
    L.inkCircle(ctx, hx - 3, hy + 2, 3, { width: dw * 0.8, fill: LIB.mix(P[V.skin], P.ink, 0.2), seed: seed + 20 });
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
    ctx.ellipse(x, y, rr * 0.7, rr, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const G = geo();
      const zoom = lerp(1.0, 1.06, E.inOutSine(t / info.dur));
      const CX = 960, CY = 520;
      const cam = (x, y) => [960 + (x - CX) * zoom, 540 + (y - CY) * zoom];

      L.camera(ctx, { x: CX, y: CY, zoom }, () => {
        ctx.drawImage(layer('wh', drawWarehouse), -60, -40, 2040, 1160);
        ctx.drawImage(layer('hab', (g) => drawHabitat(g, G)), 0, 0, 1920, 1080);
        // bubble outline live (boils), double, inkFaint
        L.inkPath(ctx, G.bubble, { width: 2.8, color: P.inkFaint, seed: sd('bub'), wobble: 1.2, double: { alpha: 0.4, from: 0.1, to: 0.9 }, taper: 30 });
        // habitat hero outlines live on the boil
        G.mods.forEach((pts, i) => L.inkPath(ctx, pts, { closed: true, width: 4.2, seed: sd('modl', i), wobble: 0.8 }));

        // door: dark opening while open; panel slides shut by B_CLOSE
        const dx0 = DOOR_X - DOOR_W / 2, dy0 = GY - DOOR_H;
        const open = t < B_DOOR - 0.75 ? E.outCubic(clamp((tw - (B_DOOR - 1.5)) / 0.75)) : 1;
        const shut = E.inOutCubic(clamp((tw - (B_CLOSE - 0.375)) / 0.375 + (t >= B_CLOSE ? 1 : 0)));
        const doorOpen = open * (1 - shut);
        L.inkPath(ctx, LIB.rrectPts(dx0, dy0, DOOR_W, DOOR_H, 22, 6), { closed: true, width: 2.4, fill: P.inkSoft, seed: sd('dop'), smooth: false });
        // warm interior glow (flat)
        ctx.save();
        ctx.globalAlpha = 0.35 * doorOpen;
        ctx.fillStyle = P.sun;
        ctx.fillRect(dx0 + 6, dy0 + 40, DOOR_W - 12, DOOR_H - 40);
        ctx.restore();

        // volunteers: those already inside are clipped to the opening
        const lx = leadX(tw);
        const drawn = [];
        VOLS.forEach((v, i) => {
          const x = lx - i * GAP;
          if (x < -120) return;
          const inT = tw - B_ENTER[i];
          let alpha = 1;
          let clip = false;
          if (inT >= 0) {
            clip = true;
            alpha = 1 - clamp(inT / 0.5);
            if (alpha <= 0) return;
          }
          drawn.push({ v, i, x, alpha, clip });
        });
        // panel (under the outside walkers but over those inside)
        const panel = (k) => {
          const pw = DOOR_W * (1 - k);
          if (pw < 1) return;
          L.inkPath(ctx, LIB.rrectPts(dx0, dy0, pw, DOOR_H, Math.min(22, pw / 2), 6), { closed: true, width: 2.6, fill: P.ochre, seed: sd('panel'), smooth: false });
          L.hatch(ctx, LIB.rectPts(dx0, dy0, pw, DOOR_H, 6), { angle: -Math.PI / 4, spacing: 7, width: 1.3, color: P.inkSoft, alpha: 0.6, length: [8, 24], seed: sd('panelh') });
        };
        drawn.filter((d) => d.clip).forEach((d) => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(dx0, dy0 - 10, DOOR_W, DOOR_H + 14);
          ctx.clip();
          drawVol(ctx, L, { x: Math.min(d.x, DOOR_X + 14), y: GY, h: VH * (1 - 0.06 * (1 - d.alpha)), phase: d.x / 46 * Math.PI, seed: sd('vol', d.i), alpha: d.alpha, ...d.v });
          ctx.restore();
        });
        panel(doorOpen);
        drawn.filter((d) => !d.clip).forEach((d) => {
          const walking = tw > B_WALK;
          drawVol(ctx, L, { x: d.x, y: GY + 2, h: VH, phase: walking ? (d.x / 46) * Math.PI : 0, seed: sd('vol', d.i), alpha: 1, ...d.v });
        });
      });

      // 7. overlays (screen-fixed through the camera mapping)
      // annBlue dashed walking line, drawing on with the leader
      const wl0 = cam(START - 40, GY + 14), wl1 = cam(DOOR_X, GY + 14);
      const wp = clamp((tw - B_WALK) / (B_DOOR - B_WALK) + (t >= B_WALK ? 0.04 : 0));
      if (wp > 0) {
        ctx.save();
        ctx.strokeStyle = P.annBlue;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.globalAlpha = t > B_CLOSE ? 1 - clamp((t - B_CLOSE) / 0.5) * 0.6 : 1;
        ctx.beginPath();
        ctx.moveTo(wl0[0], wl0[1]);
        ctx.lineTo(lerp(wl0[0], wl1[0], wp), wl1[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        // arrowhead at the door
        if (wp >= 1) {
          ctx.beginPath();
          ctx.moveTo(wl1[0] - 14, wl1[1] - 8);
          ctx.lineTo(wl1[0], wl1[1]);
          ctx.lineTo(wl1[0] - 14, wl1[1] + 8);
          ctx.stroke();
        }
        ctx.restore();
      }
      // annYellow bracket over the habitat's width, from beat 2
      const bp = t < 1.5 ? 0 : E.outExpo(clamp((t - 1.5) / (12 * FR) + 1 / 12));
      if (bp > 0) {
        const b0 = cam(HAB_X0, GY - 330), b1 = cam(HAB_X1, GY - 330);
        L.bracket(ctx, b0[0], b0[1], b1[0], b1[1], { style: 'square', offset: 0, cap: 16, color: P.annYellow, alpha: 1, width: 2.5, p: bp });
      }
      // annMagenta ring on the door when it closes
      const dc = cam(DOOR_X, GY - DOOR_H / 2);
      ring(ctx, dc[0], dc[1], 90 * zoom, 150 * zoom, t, B_CLOSE, P.annMagenta, 14, 3);
      if (t >= B_CLOSE) {
        // a held thin ring after the flash
        ctx.save();
        ctx.strokeStyle = P.annMagenta;
        ctx.globalAlpha = clamp((t - B_CLOSE) / 0.3) * 0.9;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(dc[0], dc[1], 64 * zoom, 124 * zoom, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
