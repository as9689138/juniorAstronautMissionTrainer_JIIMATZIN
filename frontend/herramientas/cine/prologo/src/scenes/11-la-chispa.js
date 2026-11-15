/*
 * 11 la-chispa : Then... what is it?  T 48.0 to 54.0 (6 s), illustrated, cut. The hinge of the film.
 * Near-dark; the child G3 (block copied verbatim from 08) faintly lit; cupped hands near (900, 640).
 * T 48.75 a star glints, 49.5 hands rise, 50.25 the child looks down, 51.0 the spark ignites (outBack),
 * 51.75 / 52.5 / 53.25 the glow grows on each beat and lights the face; annYellow rings pulse.
 * Layers: background as 08 under a spaceInk wash -> dark child and hands -> lit child and hands inside the
 * light pool, crossHatch building the dark at the rim -> spark (one soft halo, core, sparkle) -> rings.
 * Camera: locked at 10's end frame (zoom 1.15 anchored on the eye) so the 10 -> 11 cut matches.
 */
(function () {
  'use strict';
  const ID = 'la-chispa';
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

  // Beats (local seconds; global in comments)
  const B_P3 = 0.75;    // T 33.75 narration P3, star pop
  const B_BLINK = 1.5;  // T 34.5 blink
  const B_STAR2 = 2.25; // T 35.25 star pop
  const B_LINE = 3.0;   // T 36.0 sight-line draws on
  const B_RING = 3.75;  // T 36.75 ring round the Moon

  const MOON = [1450, 200], MOON_R = 40;

  /*@@CHILD-BEGIN@@*/
  // ===== G3: the child in profile. Identical block in 08, 10 and 11 (storyboard Shared geometry). =====
  const G3 = { cx: 820, cy: 420, r: 110, nose: [938, 432], eye: [880, 405], eyeR: 9, chin: [905, 505] };
  const CREF = 'nino-mira-arriba';
  let CHILD = null;
  function childGeo(L) {
    if (CHILD) return CHILD;
    const { cx, cy, r } = G3;
    const at = (deg, rr) => [cx + Math.cos(deg * DEG) * rr, cy + Math.sin(deg * DEG) * rr];
    const head = [];
    for (let a = -30; a >= -258; a -= 4) head.push(at(a, r));
    head.push([830, 524], [858, 518], [884, 513], [G3.chin[0], G3.chin[1]], [914, 494], [917, 483], [922, 474],
      [917, 467], [925, 461], [924, 452], [920, 446], [928, 444], [935, 440], [G3.nose[0], G3.nose[1]], [933, 424],
      [927, 414], [925, 408], [929, 397], [929, 384], [923, 372]);
    const hair = [];
    for (let a = -30; a >= -210; a -= 3) {
      const u = (-30 - a) / 180;
      const spike = Math.pow(Math.max(0, Math.sin(u * Math.PI * 7 + 0.4)), 4) * 11 * Math.sin(Math.PI * Math.min(1, u * 1.12));
      hair.push(at(a, r + 6 + spike));
    }
    hair.push([750, 486], [776, 476], [790, 456], [794, 430], [804, 410], [830, 397], [856, 388], [872, 381],
      [882, 395], [890, 377], [902, 389], [909, 371]);
    const strands = [];
    for (let k = 0; k < 7; k++) {
      const pts = [];
      const a0 = -202 + k * 6, a1 = -62 - k * 4, rr = 66 + k * 7;
      for (let a = a0; a <= a1; a += 6) pts.push(at(a, rr + 3 * Math.sin(a * 0.11 + k)));
      strands.push(pts);
    }
    CHILD = {
      head,
      hair,
      strands,
      ear: L.ellipsePts(809, 440, 13, 19, 28, -0.15),
      earIn: [[805, 428], [815, 433], [816, 446], [808, 453]],
      neck: [[792, 500], [858, 506], [866, 560], [874, 604], [778, 604], [786, 552]],
      hood: [[700, 622], [706, 566], [728, 526], [760, 506], [792, 512], [796, 560], [780, 600], [744, 622]],
      hoodIn: [[722, 610], [730, 566], [752, 534], [778, 524]],
      body: [[598, 1090], [610, 900], [628, 770], [660, 676], [706, 624], [770, 594], [840, 590], [904, 598],
        [950, 626], [978, 682], [996, 780], [1008, 900], [1016, 1090]],
      collar: [[776, 598], [800, 588], [836, 592], [874, 597], [906, 600], [902, 618], [870, 614], [832, 609],
        [798, 607], [780, 614]],
      strings: [[[870, 614], [866, 660], [869, 702]], [[893, 616], [899, 664], [897, 710]]],
      seam: [[762, 606], [724, 680], [700, 780], [690, 900], [686, 1090]],
      folds: [[[930, 690], [948, 750], [954, 830]], [[812, 640], [846, 700]], [[700, 720], [716, 800]], [[960, 900], [972, 990]]],
    };
    return CHILD;
  }
  // o: skin, skinShade, hair, hood, hoodShade, line, string, blink 0..1, lookDown 0..1, brow (px lift),
  //    mouth ('o' | 'smile'), catches [[dx, dy, r], ...] (white points in the eye)
  function drawChild(ctx, L, o) {
    const P = L.pal, G = childGeo(L);
    const cs = (...k) => L.hash(CREF, 'child', ...k) & 0x7fffffff;
    const ink = o.line || P.ink;
    const skin = o.skin || P.skinWarm, skinSh = o.skinShade || P.skinDeep;
    const hood = o.hood || P.teal, hoodSh = o.hoodShade || P.tealDeep;
    const hairC = o.hair || P.ink;
    // hoodie body
    L.inkPath(ctx, G.body, { closed: true, width: 4.5, color: ink, fill: hood, seed: cs(1) });
    L.hatch(ctx, G.body, {
      spacing: 8, width: 1.4, color: hoodSh, alpha: 0.85, seed: cs(2),
      density: (x, y) => clamp(sstep(830, 990, x) + 0.6 * (1 - sstep(612, 700, y)) * sstep(770, 800, x) * (1 - sstep(900, 930, x))),
    });
    L.hatch(ctx, G.body, { spacing: 6, width: 1.3, color: hoodSh, alpha: 0.8, seed: cs(3), angle: 1.83, density: (x) => sstep(930, 1010, x) });
    for (let i = 0; i < G.folds.length; i++) L.inkPath(ctx, G.folds[i], { width: 1.6, color: hoodSh, alpha: 0.95, seed: cs(4, i) });
    L.inkPath(ctx, G.seam, { width: 1.6, color: o.seamC || P.inkSoft, alpha: 0.9, seed: cs(5) });
    // hood bunched behind the neck
    L.inkPath(ctx, G.hood, { closed: true, width: 2.8, color: ink, fill: hood, seed: cs(6) });
    L.hatch(ctx, G.hood, { spacing: 6, width: 1.3, color: hoodSh, alpha: 0.85, seed: cs(7), density: (x, y) => 0.35 + 0.65 * sstep(540, 610, y) });
    L.inkPath(ctx, G.hoodIn, { width: 1.6, color: ink, alpha: 0.9, seed: cs(8) });
    // neck in the head's shadow
    L.inkPath(ctx, G.neck, { closed: true, width: 2.8, color: ink, fill: skin, seed: cs(9) });
    L.hatch(ctx, G.neck, { spacing: 6, width: 1.3, color: skinSh, alpha: 0.85, seed: cs(10), density: (x, y) => 0.55 + 0.45 * (1 - sstep(520, 560, y)) });
    // collar and drawstrings
    L.inkPath(ctx, G.collar, { closed: true, width: 2.8, color: ink, fill: hood, seed: cs(11) });
    for (let i = 0; i < 2; i++) {
      const s = G.strings[i];
      L.inkPath(ctx, s, { width: 3.2, color: o.string || P.paperShade, seed: cs(12, i), taper: [2, 4] });
      const e = s[s.length - 1];
      L.inkPath(ctx, L.rectPts(e[0] - 3, e[1], 6, 12, 4), { closed: true, width: 1.6, color: ink, fill: o.string || P.paperShade, seed: cs(13, i) });
    }
    // head
    L.inkPath(ctx, G.head, { closed: true, width: 4.5, color: ink, fill: skin, seed: cs(14), double: { alpha: 0.4, width: 0.33, from: 0.62, to: 0.86 } });
    L.hatch(ctx, G.head, {
      spacing: 7, width: 1.3, color: skinSh, alpha: 0.8, seed: cs(15),
      density: (x, y) => clamp(sstep(48, 96, y - 420 + 0.3 * (x - 820)) + 0.7 * sstep(30, 0, Math.hypot(x - 924, y - 449))),
    });
    // cheek blush (flat)
    ctx.save();
    ctx.globalAlpha *= 0.42;
    ctx.fillStyle = o.blush || P.rose;
    ctx.beginPath();
    ctx.ellipse(892, 452, 17, 10, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
    // hair
    L.inkPath(ctx, G.hair, { closed: true, width: 4.5, color: ink, fill: hairC, seed: cs(16) });
    for (let i = 0; i < G.strands.length; i++) L.inkPath(ctx, G.strands[i], { width: 1.6, color: o.hairHi || P.inkSoft, alpha: 0.95, seed: cs(17, i) });
    // ear
    L.inkPath(ctx, G.ear, { closed: true, width: 2.8, color: ink, fill: skin, seed: cs(18) });
    L.inkPath(ctx, G.earIn, { width: 1.6, color: o.earC || P.inkSoft, alpha: 0.9, seed: cs(19) });
    L.hatch(ctx, G.ear, { spacing: 5, width: 1.2, color: skinSh, alpha: 0.8, seed: cs(20), density: (x, y) => sstep(436, 456, y) });
    // brow, nostril, mouth
    const bl = o.brow || 0;
    L.inkPath(ctx, [[866, 389 - bl], [878, 383 - bl], [893, 385 - bl * 0.6]], { width: 3.2, color: ink, seed: cs(21), taper: [4, 8] });
    L.inkPath(ctx, [[926, 439], [931, 443], [925, 446]], { width: 1.6, color: ink, alpha: 0.9, seed: cs(22), taper: [2, 3] });
    if (o.mouth === 'smile') {
      L.inkPath(ctx, [[907, 461], [914, 468], [921, 467]], { width: 2.4, color: ink, seed: cs(23), taper: [3, 4] });
    } else {
      ctx.save();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(917.5, 467, 3, 4, 0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // eye (G3: centre (880, 405), radius 9)
    const ex = G3.eye[0], ey = G3.eye[1], er = G3.eyeR;
    const blink = o.blink || 0;
    if (blink < 0.92) {
      ctx.save();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, TAU);
      ctx.fill();
      ctx.fillStyle = o.catchC || P.white;
      for (const c of o.catches || [[3, -3.4, 2.6]]) {
        ctx.globalAlpha = c[3] != null ? c[3] : 1;
        ctx.beginPath();
        ctx.arc(ex + c[0], ey + c[1], c[2], 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      const lid = Math.max(blink, (o.lookDown || 0) * 0.42);
      const ly = ey - er + 2 * er * lid;
      if (lid > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ex, ey, er + 1.5, 0, TAU);
        ctx.clip();
        ctx.fillStyle = skin;
        ctx.fillRect(ex - er - 2, ey - er - 2, 2 * er + 4, ly - (ey - er) + 2);
        ctx.restore();
      }
      L.inkPath(ctx, [[ex - er - 2, ly + 1.5], [ex, ly - 1], [ex + er + 2, ly + 0.5]], { width: 2.4, color: ink, seed: cs(24), taper: [3, 5] });
      L.inkPath(ctx, [[ex + er, ly + 1], [ex + er + 7, ly - 3]], { width: 1.8, color: ink, seed: cs(25), taper: [1, 3], smooth: false });
    } else {
      L.inkPath(ctx, [[ex - er - 1, ey - 1], [ex, ey + 3.5], [ex + er + 2, ey]], { width: 2.8, color: ink, seed: cs(26), taper: [3, 5] });
      L.inkPath(ctx, [[ex + er + 1, ey], [ex + er + 7, ey + 3]], { width: 1.8, color: ink, seed: cs(27), taper: [1, 3], smooth: false });
    }
  }
  /*@@CHILD-END@@*/

  // ---- background geometry (t-independent) ----
  let BG = null;
  function bgGeo(L) {
    if (BG) return BG;
    const sd = (...k) => L.hash(CREF, ...k) & 0x7fffffff;
    const far = [], near = [];
    const yFar = (x) => 708 + 26 * L.noise1(x * 0.0035, sd(1)) + 9 * L.noise1(x * 0.013, sd(2));
    const yNear = (x) => 806 - 18 * Math.sin(x * 0.0021 + 0.8) + 10 * L.noise1(x * 0.006, sd(3));
    for (let x = -40; x <= 1960; x += 20) far.push([x, yFar(x)]);
    far.push([1960, 1100], [-40, 1100]);
    for (let x = -40; x <= 1960; x += 20) near.push([x, yNear(x)]);
    near.push([1960, 1100], [-40, 1100]);
    const r = L.rng(sd(4));
    const houses = [];
    for (let x = 1090; x < 1820;) {
      const w = r.range(42, 72), h = r.range(30, 52);
      const base = yNear(x + w / 2) + 6;
      houses.push({ x, w, h, base, roof: r.range(16, 26), win: r.int(1, 2), lit: r.chance(0.75), s: sd(10, houses.length) });
      x += w + r.range(10, 46);
    }
    const trees = [];
    for (const tx of [150, 230, 360, 470, 1880]) {
      const base = yNear(tx) + 4;
      trees.push({ x: tx, base, h: r.range(46, 74), rr: r.range(20, 30), s: sd(20, tx) });
    }
    const sparks = [];
    const rs = L.rng(sd(5));
    while (sparks.length < 16) {
      const x = rs.range(140, 1780), y = rs.range(60, 600);
      if (Math.hypot(x - MOON[0], y - MOON[1]) < 120) continue;
      if (x > 560 && x < 1080 && y > 260) continue; // the head
      if (x > 1680 && y < 110) continue; // skip button corner
      sparks.push({ x, y, s: rs.range(7, 13), k: sparks.length });
    }
    const sky = [[-40, -40], [1960, -40]];
    for (let x = 1960; x >= -40; x -= 20) sky.push([x, yFar(x) + 4]);
    // crescent: outer disc minus a disc shifted up-left
    const C1 = [MOON[0] - 18, MOON[1] - 7], R1 = 37;
    const dir = Math.atan2(C1[1] - MOON[1], C1[0] - MOON[0]);
    const outer = [], inner = [];
    for (let i = 0; i <= 120; i++) {
      const a = dir + (i / 120) * TAU;
      const p = [MOON[0] + Math.cos(a) * MOON_R, MOON[1] + Math.sin(a) * MOON_R];
      if (Math.hypot(p[0] - C1[0], p[1] - C1[1]) > R1) outer.push(p);
    }
    for (let i = 0; i <= 120; i++) {
      const a = dir + Math.PI + (i / 120) * TAU;
      const p = [C1[0] + Math.cos(a) * R1, C1[1] + Math.sin(a) * R1];
      if (Math.hypot(p[0] - MOON[0], p[1] - MOON[1]) < MOON_R) inner.push(p);
    }
    const o0 = outer[outer.length - 1];
    if (inner.length && Math.hypot(inner[0][0] - o0[0], inner[0][1] - o0[1]) > Math.hypot(inner[inner.length - 1][0] - o0[0], inner[inner.length - 1][1] - o0[1])) inner.reverse();
    BG = { far, near, houses, trees, sparks, sky, crescent: outer.concat(inner) };
    return BG;
  }

  function sparkle(ctx, L, x, y, s, a, seed, col) {
    if (s <= 0.2 || a <= 0) return;
    L.inkPath(ctx, [[x - s, y], [x + s, y]], { width: 1.8, color: col, alpha: a, seed, taper: [s * 0.8, s * 0.8], smooth: false, wobble: 0.3 });
    L.inkPath(ctx, [[x, y - s * 1.2], [x, y + s * 1.2]], { width: 1.8, color: col, alpha: a, seed: seed + 1, taper: [s, s], smooth: false, wobble: 0.3 });
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSky(ctx, L, t, bi) {
    const P = L.pal, B = bgGeo(L);
    const sd = (...k) => L.hash(CREF, ...k) & 0x7fffffff;
    ctx.fillStyle = P.nightSky;
    ctx.fillRect(-40, -40, 2000, 1160);
    // tone toward the top: night hatching, crossed near the very top
    L.hatch(ctx, null, { bounds: [-40, -40, 2000, 560], spacing: 8, width: 1.4, color: P.night, alpha: 0.85, seed: sd(30), density: (x, y) => 1 - sstep(-20, 520, y) });
    // stars
    L.stipple(ctx, B.sky, { spacing: 30, r: [0.7, 1.7], color: P.white, alpha: 0.75, seed: sd(31), density: (x, y) => 0.6 * (1 - sstep(420, 700, y)) });
    L.stipple(ctx, B.sky, { spacing: 15, r: [0.5, 1.0], color: P.stripeSky, alpha: 0.5, seed: sd(32), density: (x, y) => 0.35 * (1 - sstep(300, 650, y)) });
    for (const s of B.sparks) {
      const tw = 0.75 + 0.35 * L.h3(s.k, bi, 77);
      sparkle(ctx, L, s.x, s.y, s.s * tw, 0.9, sd(40, s.k), P.white);
    }
  }

  function drawMoon(ctx, L, ringP) {
    const P = L.pal, B = bgGeo(L);
    const sd = (...k) => L.hash(CREF, ...k) & 0x7fffffff;
    // earthshine disc
    L.inkPath(ctx, L.ellipsePts(MOON[0], MOON[1], MOON_R, MOON_R, 40), { closed: true, width: 1.4, color: P.moonShade, alpha: 0.35, fill: L.mix(P.nightSky, P.moonDark, 0.35), seed: sd(50) });
    ctx.save();
    ctx.beginPath(); ctx.arc(MOON[0], MOON[1], MOON_R, 0, TAU); ctx.clip();
    ctx.fillStyle = P.moonGrey; ctx.fillRect(MOON[0] - 50, MOON[1] - 50, 100, 100);
    L.hatch(ctx, null, { bounds: [MOON[0] - 45, MOON[1] - 45, 90, 90], spacing: 5, width: 1.2, color: P.moonShade, alpha: 0.85, seed: sd(52), angle: 1.2, density: (x, y) => sstep(0, 26, Math.hypot(x - MOON[0] + 8, y - MOON[1] + 3) - 18) });
    ctx.fillStyle = L.mix(P.nightSky, P.moonDark, 0.35);
    ctx.beginPath(); ctx.arc(MOON[0] - 18, MOON[1] - 7, 37, 0, TAU); ctx.fill();
    ctx.restore();
    L.inkPath(ctx, L.ellipsePts(MOON[0], MOON[1], MOON_R, MOON_R, 40), { closed: true, width: 2.8, color: P.ink, seed: sd(51) });
  }

  function drawGround(ctx, L, bi) {
    const P = L.pal, B = bgGeo(L);
    const sd = (...k) => L.hash(CREF, ...k) & 0x7fffffff;
    L.inkPath(ctx, B.far, { closed: true, width: 2.8, color: P.ink, alpha: 0.8, fill: P.dusk, seed: sd(60) });
    L.hatch(ctx, B.far, { spacing: 8, width: 1.3, color: P.night, alpha: 0.8, seed: sd(61), density: (x, y) => 0.25 + 0.75 * sstep(720, 780, y) });
    L.stipple(ctx, B.far, { spacing: 14, r: [0.8, 1.6], color: P.nightSky, alpha: 0.7, seed: sd(62), density: 0.4 });
    const houseC = L.mix(P.night, P.ink, 0.45);
    for (const tr of B.trees) {
      L.inkPath(ctx, [[tr.x, tr.base], [tr.x, tr.base - tr.h * 0.6]], { width: 4, color: houseC, seed: tr.s, taper: [2, 4] });
      L.inkPath(ctx, L.ellipsePts(tr.x, tr.base - tr.h * 0.6 - tr.rr * 0.7, tr.rr, tr.rr * 1.15, 26), { closed: true, width: 2.4, color: P.ink, fill: houseC, seed: tr.s + 1 });
    }
    for (const h of B.houses) {
      const x0 = h.x, x1 = h.x + h.w, yb = h.base, yt = h.base - h.h;
      const pts = [[x0, yb], [x0, yt], [(x0 + x1) / 2, yt - h.roof], [x1, yt], [x1, yb]];
      L.inkPath(ctx, pts, { closed: true, width: 2.4, color: P.ink, fill: houseC, seed: h.s, smooth: false, wobble: 0.8 });
      for (let k = 0; k < h.win; k++) {
        const wx = x0 + (h.w * (k + 1)) / (h.win + 1) - 4, wy = yt + h.h * 0.3;
        ctx.fillStyle = h.lit ? P.warmLight : P.nightSky;
        ctx.globalAlpha = h.lit ? 0.85 + 0.15 * L.h3(h.s, k, bi >> 2) : 0.6;
        ctx.fillRect(wx, wy, 8, 9);
        ctx.globalAlpha = 1;
      }
    }
    L.inkPath(ctx, B.near, { closed: true, width: 2.8, color: P.ink, fill: P.night, seed: sd(63) });
    L.hatch(ctx, B.near, { spacing: 7, width: 1.3, color: P.spaceInk, alpha: 0.75, seed: sd(64), density: (x, y) => 0.3 + 0.7 * sstep(820, 940, y) });
  }

  // ---- the cupped hands and forearm (world coords; hands centred near (900, 640)) ----
  function drawHands(ctx, L, dy, pal) {
    const P = L.pal;
    const hs = (...k) => L.hash(ID, 'hands', ...k) & 0x7fffffff;
    const sh = (pts) => pts.map((p) => [p[0], p[1] + dy]);
    const sleeve = sh([[740, 700], [800, 650], [858, 628], [872, 664], [820, 700], [770, 760], [724, 770]]);
    L.inkPath(ctx, sleeve, { closed: true, width: 2.8, color: P.ink, fill: pal.hood, seed: hs(1) });
    L.hatch(ctx, sleeve, { spacing: 6, width: 1.3, color: pal.hoodShade, alpha: 0.85, seed: hs(2), density: (x, y) => sstep(650 + dy, 720 + dy, y) });
    const cup = [];
    for (let a = 0; a <= 180; a += 8) cup.push([902 + Math.cos(a * DEG) * 62, 640 + dy + Math.sin(a * DEG) * 36]);
    cup.push([860, 634 + dy], [902, 628 + dy], [946, 632 + dy]);
    L.inkPath(ctx, cup, { closed: true, width: 4.5, color: P.ink, fill: pal.skin, seed: hs(3) });
    L.hatch(ctx, cup, { spacing: 6, width: 1.3, color: pal.skinShade, alpha: 0.85, seed: hs(4), density: (x, y) => sstep(650 + dy, 676 + dy, y) });
    // finger creases on the front hand
    for (let i = 0; i < 3; i++) {
      const x = 918 + i * 13;
      L.inkPath(ctx, sh([[x, 640 - i * 2], [x + 4, 656 - i * 3], [x + 2, 668 - i * 5]]), { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: hs(5, i), taper: [3, 5] });
    }
    // thumb over the rim
    L.inkPath(ctx, sh([[866, 640], [884, 628], [906, 627], [914, 634], [896, 640], [874, 646]]), { closed: true, width: 2.8, color: P.ink, fill: pal.skin, seed: hs(6) });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const B_P4 = 0.75;    // T 48.75 narration P4: a star glints
      const B_HANDS = 1.5;  // T 49.5 the hands rise into the frame
      const B_LOOK = 2.25;  // T 50.25 the child looks down at the hands
      const B_IGN = 3.0;    // T 51.0 the spark ignites (bar 18 hinge)
      const GROW = [3.0, 3.75, 4.5, 5.25]; // T 51.0, 51.75, 52.5, 53.25

      // camera locked on the end frame of 10: 1.15 anchored on the eye
      const z = 1.15;
      const ex = G3.eye[0], ey = G3.eye[1];
      const SP = [902, 626];
      // light level by beats (outBack steps)
      const coreSteps = [6, 14, 24, 32], poolSteps = [150, 250, 350, 460];
      let core = 0, pool = 0;
      for (let i = 0; i < GROW.length; i++) {
        const k = t < GROW[i] ? 0 : E.outBack(clamp((t - GROW[i]) / (4 * FR) + 0.25));
        if (k > 0) {
          core = lerp(i ? coreSteps[i - 1] : 0, coreSteps[i], k);
          pool = lerp(i ? poolSteps[i - 1] : 0, poolSteps[i], k);
        }
      }
      if (t > 5.25) { // a last swell to the end of the shot
        const u = L.seg(t, 5.25 + 4 * FR, 6.0, 'inOutSine');
        core = lerp(core, 40, u);
        pool = lerp(pool, 560, u);
      }
      const hdy = t < B_HANDS ? 220 : 220 * (1 - E.outBack(clamp((L.onTwos(t) - B_HANDS) / (6 * FR) + 1 / 6)));
      const look = t < B_LOOK ? 0 : drawing(B_LOOK) < 1 ? 0.5 : 1;
      const dark = {
        skin: L.mix(P.skinWarm, P.night, 0.68), skinShade: P.spaceInk, hood: L.mix(P.teal, P.night, 0.72), hoodShade: P.spaceInk,
        hair: P.ink, string: L.mix(P.paperShade, P.night, 0.7), blush: L.mix(P.rose, P.night, 0.7), hairHi: L.mix(P.inkSoft, P.night, 0.3),
        seamC: P.spaceInk, earC: P.spaceInk,
      };
      const lit = {
        skin: L.mix(P.skinWarm, P.flameCore, 0.18), skinShade: P.skinDeep, hood: P.teal, hoodShade: P.tealDeep,
        hair: P.ink, string: P.paperShade, blush: P.rose, hairHi: P.inkSoft,
      };
      const face = (pal) => Object.assign({ brow: look ? -1 : 1, mouth: t >= GROW[1] ? 'smile' : 'o', lookDown: look,
        catches: t >= B_IGN ? [[2.5, 3.2, 2.4]] : [[3, -3.4, 1.6, 0.6]] }, pal);

      L.camera(ctx, { x: ex + (960 - ex) / z, y: ey + (540 - ey) / z, zoom: z }, () => {
        drawSky(ctx, L, t, bi);
        if (t >= B_P4) sparkle(ctx, L, 1240, 150, 14 * [0.72, 1.08, 1][Math.min(2, drawing(B_P4))], 1, sd(80), P.white);
        drawMoon(ctx, L);
        drawGround(ctx, L, bi);
        ctx.save();
        ctx.globalAlpha = 0.66;
        ctx.fillStyle = P.spaceInk;
        ctx.fillRect(-100, -100, 2200, 1300);
        ctx.restore();
        // the child in the dark
        drawChild(ctx, L, face(dark));
        if (hdy < 219) drawHands(ctx, L, hdy, dark);
        // the spark's light: lit colours inside the pool, hatching building the dark at its edge
        if (pool > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(SP[0], SP[1], pool, 0, TAU);
          ctx.clip();
          ctx.fillStyle = L.mix(P.night, P.dusk, 0.5);
          ctx.globalAlpha = 0.55;
          ctx.fillRect(SP[0] - pool, SP[1] - pool, pool * 2, pool * 2);
          ctx.globalAlpha = 1;
          drawChild(ctx, L, face(lit));
          drawHands(ctx, L, 0, lit);
          L.crossHatch(ctx, null, {
            bounds: [SP[0] - pool, SP[1] - pool, pool * 2, pool * 2], spacing: 6, width: 1.4, color: P.spaceInk, alpha: 0.9, seed: sd(90), tone: 0.8,
            // the far side of each form from the spark (up and back) and the pool's rim
            density: (x, y) => clamp(sstep(pool * 0.5, pool, Math.hypot(x - SP[0], y - SP[1])) + 0.5 * sstep(-40, 140, (SP[1] - y) - (x - SP[0]) * 0.6 - 220)),
          });
          ctx.restore();
        }
      });

      // the spark itself (screen space at its world position): one soft halo, hot core, a sparkle
      const sx = ex + (SP[0] - ex) * z, sy = ey + (SP[1] - ey) * z;
      if (core > 0.5) {
        const flick = 0.92 + 0.16 * L.h3(bi, 3, 9);
        const hr = core * 4.5 * flick;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, hr);
        g.addColorStop(0, L.rgba(P.flame, 0.55));
        g.addColorStop(0.3, L.rgba(P.flame, 0.2));
        g.addColorStop(1, L.rgba(P.flame, 0));
        ctx.fillStyle = g;
        ctx.fillRect(sx - hr, sy - hr, hr * 2, hr * 2);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = P.flameCore;
        ctx.beginPath();
        ctx.arc(sx, sy, core * 0.55, 0, TAU);
        ctx.fill();
        ctx.fillStyle = P.white;
        ctx.beginPath();
        ctx.arc(sx, sy, core * 0.28, 0, TAU);
        ctx.fill();
        ctx.restore();
        sparkle(ctx, L, sx, sy, core * 1.3 * flick, 0.95, sd(91), P.white);
      }
      // overlays: annYellow rings pulse from the spark on each beat
      for (let i = 0; i < GROW.length; i++) {
        const rp = hit(GROW[i], 12, E.outExpo);
        if (rp <= 0 || t > GROW[i] + 14 * FR) continue;
        const fade = 1 - clamp((t - GROW[i]) / (12 * FR));
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(sx, sy, coreSteps[i] + 20 + 130 * rp, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      if (t >= B_IGN) {
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, core + 16, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
