/*
 * 10 ojos-y-estrellas : Stars in the child's eyes.  T 45.0 to 48.0 (3 s), illustrated, cut.
 * G3 again (the child block and the night background are copied verbatim from 08, seeded from 08's id).
 * Layers: night sky, stars, Moon, hills (as 08) -> the child G3 with star points in the eye -> hatched
 * vignette and darkening into 11 -> annYellow ring round the eye (T 46.5).
 * Camera: push 1.0 -> 1.15 anchored on the eye (880, 405). Beats: 45.75 slow blink, 46.5 ring, 47.25 glints.
 * The 08/09/10 helper constants above (B_*) are unused here.
 */
(function () {
  'use strict';
  const ID = 'ojos-y-estrellas';
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

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const B_BLINK = 0.75; // T 45.75 slow blink
      const B_RING = 1.5;   // T 46.5 annYellow ring round the eye
      const B_GLINT = 2.25; // T 47.25 the eye's star points brighten

      // push 1.0 -> 1.15 anchored on the eye (880, 405): the eye stays on its G3 pixel
      const z = L.mapRange(t, 0, info.dur, 1, 1.15, 'inOutSine');
      const ex = G3.eye[0], ey = G3.eye[1];
      L.camera(ctx, { x: ex + (960 - ex) / z, y: ey + (540 - ey) / z, zoom: z }, () => {
        drawSky(ctx, L, t, bi);
        drawMoon(ctx, L);
        drawGround(ctx, L, bi);
        const bt = tw - B_BLINK;
        const blink = bt < 0 ? 0 : bt < 2 / 12 ? 0.5 : bt < 5 / 12 ? 1 : bt < 7 / 12 ? 0.5 : 0;
        const g = t >= B_GLINT ? 1 : 0.7;
        // the night sky in the eye: tiny star points and a speck of Moon
        drawChild(ctx, L, {
          blink, brow: 2, mouth: 'o',
          catches: [[3, -3.4, 2.3], [-3.6, -1.2, 0.9 * g, g], [-1, 3.6, 1.0 * g, g], [4.2, 2.4, 0.8 * g, g], [-4.6, -4.2, 0.7, g], [1, 0.4, 0.6, g]],
        });
      });

      // the frame darkens toward the edges (hatching), and overall into 11
      const p = info.p;
      L.crossHatch(ctx, null, {
        bounds: [0, 0, 1920, 1080], spacing: 7, width: 1.4, color: P.spaceInk, alpha: 0.9, seed: L.hash(ID, 'vig') & 0x7fffffff, tone: 0.75,
        density: (x, y) => sstep(360 - 120 * p, 1000 - 260 * p, Math.hypot((x - ex) * 0.8, y - ey)) * (0.55 + 0.45 * p),
      });
      ctx.save();
      ctx.globalAlpha = 0.5 * p * p;
      ctx.fillStyle = P.spaceInk;
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.restore();

      // overlay: annYellow ring round the eye
      const rp = hit(B_RING, 12, E.outExpo);
      if (rp > 0) {
        const fade = 1 - clamp((t - B_RING) / (12 * FR));
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.35 + 0.65 * fade;
        ctx.beginPath();
        ctx.arc(ex, ey, 22 + 26 * rp, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, 22 * z, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
