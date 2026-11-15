/*
 * 22 relevo-de-manos — Hands pass the torch
 * T 109.5 to 115.5 (local 0 to 6), illustrated (paper plate), hard cut in.
 *
 * Three generations of hands pass one torch left to right:
 *   old hands (skinDeep, wrinkled knit sleeve) hold it from the left,
 *   adult hands (skinLight, teal shirt cuff) take it at T 111.0 (local 1.5),
 *   young hands (skinWarm, dusk hoodie cuff) take it at T 113.25 (local 3.75).
 *
 * Layers, back to front:
 *   1  paper + Act 3 stripes (cream / yellow), drifting 6 px per beat, slight parallax
 *   2  world construction lines (inkFaint 30 %)
 *   3  flame halo (the one soft halo)
 *   4  calm lower register (subtitle band, inkSoft)
 *   5  forearms, sleeves, backs of hands
 *   6  torch: handle, collar, cup
 *   7  fingers and thumbs (in front of the handle)
 *   8  flame, core, sparks
 *   9  overlays: annBlue dashed torch path, annYellow hand-off rings
 *
 * Camera pans right 200 px with the torch (24 fps). Hands and torch on twos.
 */
(function () {
  'use strict';
  const ID = 'relevo-de-manos';
  const FR = 1 / 24;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;

  // beats (local) with global T
  const B_LIFT = 0.75; //   T 110.25 old hands lift and carry
  const B_HAND1 = 1.5; //   T 111.0  hand-off 1 (adult grips)
  const B_REL1 = 2.25; //   T 111.75 old hands open and withdraw
  const B_GRIP1 = 2.625; // T 112.125 adult's second hand grips
  const B_CARRY = 3.0; //   T 112.5  adult carries right
  const B_HAND2 = 3.75; //  T 113.25 hand-off 2 (young grips)
  const B_REL2 = 4.5; //    T 114.0  adult hands open and withdraw
  const B_GRIP2 = 4.875; // T 114.375 young's second hand grips
  const B_RAISE = 5.25; //  T 114.75 young raise the torch

  let SD = null;
  const sd = (L, ...k) => L.hash(ID, ...k) & 0x7fffffff;

  // ---------------------------------------------------------------- torch path
  // anchor = bottom of the handle, world coordinates
  const KEYS = [
    [0, 600, 800, 'linear'],
    [B_LIFT, 600, 782, 'outCubic'],
    [B_HAND1, 840, 766, 'inOutCubic'],
    [B_CARRY, 840, 766, 'linear'],
    [B_HAND2, 1300, 756, 'inOutCubic'],
    [B_RAISE, 1300, 756, 'linear'],
    [6.0, 1330, 712, 'outCubic'],
  ];
  const HANDLE = 250; // handle length
  const SLOT = { A: 52, B: 136, C: 214 };

  function anchor(L, t) {
    const E = L.ease;
    if (t <= KEYS[0][0]) return [KEYS[0][1], KEYS[0][2]];
    for (let i = 1; i < KEYS.length; i++) {
      const k0 = KEYS[i - 1], k1 = KEYS[i];
      if (t <= k1[0]) {
        const u = E[k1[3]]((t - k0[0]) / (k1[0] - k0[0]));
        let x = lerp(k0[1], k1[1], u), y = lerp(k0[2], k1[2], u);
        // the receiving grip catches the weight: a small dip after each hand-off
        for (const h of [B_HAND1, B_HAND2]) {
          const d = (t - h) / (8 * FR);
          if (d > 0 && d < 1) y += 7 * Math.sin(d * Math.PI) * (1 - d);
        }
        return [x, y];
      }
    }
    const k = KEYS[KEYS.length - 1];
    return [k[1], k[2]];
  }
  const velX = (L, t, lag) => (anchor(L, t)[0] - anchor(L, t - lag)[0]) / lag;
  const tiltAt = (L, t) => clamp(velX(L, t, 0.2) * 0.0001, -0.1, 0.1);
  function slotPos(L, t, s) {
    const a = anchor(L, t), r = tiltAt(L, t);
    return [a[0] + Math.sin(r) * s, a[1] - Math.cos(r) * s];
  }

  // ---------------------------------------------------------------- generations
  function gens(P) {
    return {
      old: { skin: P.skinDeep, hatch: P.ink, hatchA: 0.55, sleeve: P.wood, sleeveDeep: P.inkSoft, cuff: 52, scale: 1.0, age: 1 },
      adult: { skin: P.skinLight, hatch: P.inkSoft, hatchA: 0.6, sleeve: P.tealDeep, sleeveDeep: P.ink, cuff: 78, scale: 1.05, age: 0.35 },
      young: { skin: P.skinWarm, hatch: P.inkSoft, hatchA: 0.6, sleeve: P.dusk, sleeveDeep: P.night, cuff: 58, scale: 0.9, age: 0 },
    };
  }

  // hand schedule: slot, side (+1 forearm from lower left, -1 from lower right),
  // rest point and pose, reach start, grip time, release time, withdraw offset
  const HANDS = [
    { id: 0, gen: 'old', slot: 'A', side: 1, rest: null, reach: -1, grip: -1, rel: B_REL1, away: [-190, 360], dl: 0 },
    { id: 1, gen: 'old', slot: 'B', side: 1, rest: null, reach: -1, grip: -1, rel: B_REL1, away: [-230, 330], dl: 2 * FR },
    { id: 2, gen: 'adult', slot: 'C', side: -1, rest: [1080, 690, 0.35], reach: B_LIFT, grip: B_HAND1, rel: B_REL2, away: [120, 380], dl: 0 },
    { id: 3, gen: 'adult', slot: 'A', side: 1, rest: [640, 1010, -0.2], reach: B_REL1 + 2 * FR, grip: B_GRIP1, rel: B_REL2, away: [-200, 360], dl: 2 * FR },
    { id: 4, gen: 'young', slot: 'B', side: -1, rest: [1580, 740, 0.4], reach: B_CARRY, grip: B_HAND2, rel: 99, away: [0, 0], dl: 0 },
    { id: 5, gen: 'young', slot: 'A', side: 1, rest: [1110, 1020, -0.2], reach: B_REL2 + 2 * FR, grip: B_GRIP2, rel: 99, away: [0, 0], dl: 0 },
  ];

  function handState(L, h, t) {
    const E = L.ease;
    const s = SLOT[h.slot];
    const idle = (k) => Math.sin(t * 2.1 + h.id * 1.7) * k;
    if (h.grip >= 0 && t < h.reach) {
      return { x: h.rest[0], y: h.rest[1] + idle(4), rot: h.rest[2], c: 0.12, vis: 1 };
    }
    if (h.grip >= 0 && t < h.grip) {
      const u = E.inOutCubic((t - h.reach) / (h.grip - h.reach));
      const p = slotPos(L, t, s);
      return { x: lerp(h.rest[0], p[0], u), y: lerp(h.rest[1], p[1], u), rot: lerp(h.rest[2], tiltAt(L, t), u), c: lerp(0.12, 0.3, u), vis: 1 };
    }
    if (t < h.rel) {
      const p = slotPos(L, t, s);
      const g = h.grip >= 0 ? t - h.grip : 9;
      const c = h.grip >= 0 ? lerp(0.3, 1, E.outBack(clamp(g / (4 * FR) + 0.25))) : 1;
      return { x: p[0], y: p[1], rot: tiltAt(L, t), c, vis: 1, pop: h.grip >= 0 && g < 4 * FR ? 1 + 0.06 * Math.sin(clamp(g / (4 * FR)) * Math.PI) : 1 };
    }
    // release: fingers open over 4 frames, then the hand withdraws
    const p = slotPos(L, h.rel, s);
    const g = t - h.rel;
    const c = 1 - E.outCubic(g / (4 * FR) + 0.25);
    const w = E.inOutCubic((g - h.dl - 2 * FR) / 0.7);
    return { x: p[0] + h.away[0] * w, y: p[1] + h.away[1] * w, rot: lerp(tiltAt(L, h.rel), -0.35 * h.side, w), c: Math.max(0.1, c), vis: 1 };
  }

  // ---------------------------------------------------------------- geometry
  function capsule(x0, y0, x1, y1, r0, r1, n = 10) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const q = a - Math.PI / 2 + (i / n) * Math.PI;
      out.push([x1 + Math.cos(q) * r1, y1 + Math.sin(q) * r1]);
    }
    for (let i = 0; i <= n; i++) {
      const q = a + Math.PI / 2 + (i / n) * Math.PI;
      out.push([x0 + Math.cos(q) * r0, y0 + Math.sin(q) * r0]);
    }
    return out;
  }
  function tube(x0, y0, dx, dy, d0, d1, w0, w1, n = 8) {
    // polygon of a straight tapered tube from distance d0 to d1 along (dx, dy)
    const nx = -dy, ny = dx;
    const A = [], B = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = lerp(d0, d1, u), w = lerp(w0, w1, u);
      A.push([x0 + dx * d + nx * w, y0 + dy * d + ny * w]);
      B.push([x0 + dx * d - nx * w, y0 + dy * d - ny * w]);
    }
    return A.concat(B.reverse());
  }
  const BACK = [[-6, -36], [-24, -42], [-44, -36], [-58, -18], [-63, 6], [-60, 28], [-54, 48], [-52, 70], [-20, 74], [-14, 52], [-6, 30], [-3, 4]];
  const WRIST = [-36, 66];
  const FDIR = (() => { const l = Math.hypot(-0.4, 1); return [-0.4 / l, 1 / l]; })();
  const FINGERS = [
    // closed y, open y, radius, closed length, open length, open angle
    [-27, -34, 9.6, 50, 70, -0.55],
    [-9, -15, 10.2, 52, 76, -0.36],
    [9, 4, 9.6, 49, 72, -0.2],
    [26, 21, 8.4, 41, 58, -0.04],
  ];

  // local hatch angle from a screen angle, under rotate(rot) then scale(side, 1)
  const locA = (screenA, rot, side) => (side > 0 ? screenA - rot : Math.PI - (screenA - rot));

  // ---------------------------------------------------------------- draw helpers
  function handBack(ctx, L, P, h, st, G) {
    const g = G[h.gen];
    const k = sd(L, 'hand', h.id);
    const side = h.side;
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.scale(side * g.scale * (st.pop || 1), g.scale * (st.pop || 1));
    const ha = locA(-Math.PI / 4, st.rot, side);
    // forearm skin (wrist to cuff) then sleeve
    const fx = WRIST[0], fy = WRIST[1];
    const arm = tube(fx, fy, FDIR[0], FDIR[1], -10, g.cuff + 20, 23, 27);
    L.inkPath(ctx, arm, { closed: true, width: 2.8, fill: g.skin, seed: k + 1 });
    const armShade = tube(fx, fy, FDIR[0], FDIR[1], -4, g.cuff + 16, 1, 26);
    L.hatch(ctx, armShade, { angle: Math.atan2(FDIR[1], FDIR[0]) + Math.PI / 2, spacing: 7, width: 1.3, color: g.hatch, alpha: g.hatchA, length: [8, 22], bend: 2, seed: k + 2 });
    if (g.age > 0.5) {
      // bony wrist: tendon lines and creases
      for (let i = 0; i < 3; i++) {
        const d = 14 + i * 12;
        const cx = fx + FDIR[0] * d, cy = fy + FDIR[1] * d;
        L.inkPath(ctx, [[cx - 12, cy - 4], [cx - 2, cy + 1], [cx + 9, cy - 2]], { width: 1.4, color: P.ink, alpha: 0.6, seed: k + 10 + i, taper: [4, 6] });
      }
    }
    const sl = tube(fx, fy, FDIR[0], FDIR[1], g.cuff, 900, 33, 52);
    L.inkPath(ctx, sl, { closed: true, width: 3, fill: g.sleeve, seed: k + 3 });
    const slShade = tube(fx, fy, FDIR[0], FDIR[1], g.cuff + 4, 900, 4, 50);
    L.hatch(ctx, slShade, { angle: ha, spacing: 6, width: 1.4, color: g.sleeveDeep, alpha: 0.75, seed: k + 4 });
    const cx0 = fx + FDIR[0] * g.cuff, cy0 = fy + FDIR[1] * g.cuff;
    const nx = -FDIR[1], ny = FDIR[0];
    if (h.gen === 'old') {
      // knit cuff ribs and loose wrinkles further up the sleeve
      for (let i = -5; i <= 5; i++) {
        const ox = cx0 + nx * i * 6, oy = cy0 + ny * i * 6;
        L.inkPath(ctx, [[ox, oy], [ox + FDIR[0] * 26, oy + FDIR[1] * 26]], { width: 1.3, color: P.inkSoft, alpha: 0.85, seed: k + 20 + i, taper: [3, 5] });
      }
      L.inkPath(ctx, [[cx0 + FDIR[0] * 28 - nx * 34, cy0 + FDIR[1] * 28 - ny * 34], [cx0 + FDIR[0] * 28 + nx * 34, cy0 + FDIR[1] * 28 + ny * 34]], { width: 2, seed: k + 31 });
      for (let i = 0; i < 6; i++) {
        const d = g.cuff + 50 + i * 34 + (i % 2) * 9;
        const bx = fx + FDIR[0] * d, by = fy + FDIR[1] * d;
        const w = 30 + i * 2;
        const s2 = i % 2 ? 1 : -1;
        L.inkPath(ctx, [[bx - nx * w * 0.9 * s2, by - ny * w * 0.9 * s2], [bx + FDIR[0] * 9, by + FDIR[1] * 9], [bx + nx * w * 0.3 * s2 + FDIR[0] * 4, by + ny * w * 0.3 * s2 + FDIR[1] * 4]], { width: 1.6, color: P.ink, alpha: 0.8, seed: k + 40 + i, taper: [6, 10] });
      }
    } else if (h.gen === 'adult') {
      // shirt cuff band with a button
      const c1 = [cx0 + FDIR[0] * 24, cy0 + FDIR[1] * 24];
      L.inkPath(ctx, [[c1[0] - nx * 36, c1[1] - ny * 36], [c1[0] + nx * 36, c1[1] + ny * 36]], { width: 2.2, seed: k + 32 });
      L.inkCircle(ctx, cx0 + FDIR[0] * 12 - nx * 18, cy0 + FDIR[1] * 12 - ny * 18, 4.2, { width: 1.4, fill: P.white, seed: k + 33 });
      L.inkPath(ctx, [[c1[0] + FDIR[0] * 40 - nx * 20, c1[1] + FDIR[1] * 40 - ny * 20], [c1[0] + FDIR[0] * 120 - nx * 8, c1[1] + FDIR[1] * 120 - ny * 8]], { width: 1.5, color: P.ink, alpha: 0.7, seed: k + 34 });
    } else {
      // ribbed hoodie cuff
      for (let i = -5; i <= 5; i++) {
        const ox = cx0 + nx * i * 5.6, oy = cy0 + ny * i * 5.6;
        L.inkPath(ctx, [[ox, oy], [ox + FDIR[0] * 22, oy + FDIR[1] * 22]], { width: 1.2, color: P.night, alpha: 0.9, seed: k + 20 + i, taper: [3, 5] });
      }
      L.inkPath(ctx, [[cx0 + FDIR[0] * 24 - nx * 35, cy0 + FDIR[1] * 24 - ny * 35], [cx0 + FDIR[0] * 24 + nx * 35, cy0 + FDIR[1] * 24 + ny * 35]], { width: 2, seed: k + 31 });
      L.inkPath(ctx, [[cx0 + FDIR[0] * 70 + nx * 10, cy0 + FDIR[1] * 70 + ny * 10], [cx0 + FDIR[0] * 150 + nx * 22, cy0 + FDIR[1] * 150 + ny * 22]], { width: 1.5, color: P.rose, alpha: 0.8, seed: k + 35 });
    }
    // back of the hand
    L.inkPath(ctx, BACK, { closed: true, width: 3.2, fill: g.skin, seed: k + 5, double: { alpha: 0.35 } });
    L.hatch(ctx, BACK, { angle: ha, spacing: 7, width: 1.3, color: g.hatch, alpha: g.hatchA, seed: k + 6, density: (x, y) => (y > 6 - x * 0.4 ? 1 : 0) });
    // knuckle bumps
    for (let i = 0; i < 4; i++) {
      const y = lerp(FINGERS[i][1], FINGERS[i][0], st.c);
      L.inkPath(ctx, [[-30, y - 6], [-26, y], [-30, y + 6]], { width: 1.5, color: P.inkSoft, alpha: 0.85, seed: k + 50 + i, taper: [3, 4] });
    }
    if (g.age > 0.5) {
      // wrinkles, a vein and age spots
      for (let i = 0; i < 5; i++) {
        const y = -22 + i * 13;
        L.inkPath(ctx, [[-52, y + 3], [-45, y - 1], [-38, y + 2]], { width: 1.2, color: P.ink, alpha: 0.55, seed: k + 60 + i, taper: [3, 4] });
      }
      L.inkPath(ctx, [[-44, 60], [-46, 36], [-40, 14], [-42, -10]], { width: 1.6, color: P.marsShadow, alpha: 0.6, seed: k + 70 });
      L.stipple(ctx, [[-56, -20], [-36, -30], [-36, 20], [-56, 30]], { spacing: 9, r: [1.2, 2.4], color: P.marsShadow, alpha: 0.55, density: 0.35, seed: k + 71 });
    } else if (g.age > 0.2) {
      L.inkPath(ctx, [[-48, 40], [-44, 20], [-46, 0]], { width: 1.2, color: P.inkSoft, alpha: 0.5, seed: k + 70 });
    }
    ctx.restore();
  }

  function handFront(ctx, L, P, h, st, G) {
    const g = G[h.gen];
    const k = sd(L, 'front', h.id);
    const side = h.side;
    const c = st.c;
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.scale(side * g.scale * (st.pop || 1), g.scale * (st.pop || 1));
    const ha = locA(-Math.PI / 4, st.rot, side);
    for (let i = 3; i >= 0; i--) {
      const F = FINGERS[i];
      const y = lerp(F[1], F[0], c);
      const len = lerp(F[4], F[3], c);
      const a = lerp(F[5], 0, c);
      const x0 = -24, x1 = x0 + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      const pts = capsule(x0, y, x1, y1, F[2] + 0.5, F[2] * 0.92);
      L.inkPath(ctx, pts, { closed: true, width: 2.4, fill: g.skin, seed: k + i * 7 });
      // shadow strip along the lower edge of each finger
      const sh = capsule(x0 + 4, y + F[2] * 0.45, x1 - 2, y1 + F[2] * 0.4, F[2] * 0.5, F[2] * 0.45);
      L.hatch(ctx, sh, { angle: ha, spacing: 5, width: 1.2, color: g.hatch, alpha: g.hatchA, length: [6, 14], seed: k + i * 7 + 1 });
      // middle-joint crease
      const jx = lerp(x0, x1, 0.55), jy = lerp(y, y1, 0.55);
      L.inkPath(ctx, [[jx - 2, jy - F[2] * 0.6], [jx + 1.5, jy], [jx - 2, jy + F[2] * 0.6]], { width: 1.3, color: P.inkSoft, alpha: 0.85, seed: k + i * 7 + 2, taper: [3, 3] });
      if (g.age > 0.5) {
        L.inkPath(ctx, [[jx + 5, jy - F[2] * 0.5], [jx + 7, jy], [jx + 5, jy + F[2] * 0.5]], { width: 1.1, color: P.ink, alpha: 0.5, seed: k + i * 7 + 3, taper: [3, 3] });
      }
      if (c < 0.6) {
        // nail at the fingertip of an open hand
        const nx = lerp(x0, x1, 0.9), ny = lerp(y, y1, 0.9);
        L.inkPath(ctx, L.ellipsePts(nx, ny - F[2] * 0.15, 6, 4.2, 12, a), { closed: true, width: 1.1, color: P.inkSoft, fill: L.mix(g.skin, P.white, 0.35), alpha: (0.6 - c) / 0.6, fillAlpha: (0.6 - c) / 0.6, seed: k + i * 7 + 4 });
      } else {
        // tucked fingertip curl
        L.inkPath(ctx, [[x1 - 6, y1 - F[2] * 0.5], [x1 - 1, y1 + 1], [x1 - 7, y1 + F[2] * 0.55]], { width: 1.2, color: P.inkSoft, alpha: 0.8, seed: k + i * 7 + 5, taper: [3, 3] });
      }
    }
    // thumb over the index finger
    const ta = lerp(-1.25, -0.36, c);
    const tl = lerp(54, 50, c);
    const tx0 = -40, ty0 = -26;
    const tx1 = tx0 + Math.cos(ta) * tl, ty1 = ty0 + Math.sin(ta) * tl;
    L.inkPath(ctx, capsule(tx0, ty0, tx1, ty1, 13, 10), { closed: true, width: 2.6, fill: g.skin, seed: k + 90 });
    L.hatch(ctx, capsule(tx0 + 4, ty0 + 6, tx1, ty1 + 5, 6, 4), { angle: ha, spacing: 5, width: 1.2, color: g.hatch, alpha: g.hatchA, length: [6, 14], seed: k + 91 });
    const nxp = tx0 + Math.cos(ta) * (tl - 6), nyp = ty0 + Math.sin(ta) * (tl - 6);
    L.inkPath(ctx, L.ellipsePts(nxp, nyp, 7, 5, 12, ta), { closed: true, width: 1.2, color: P.inkSoft, fill: L.mix(g.skin, P.white, 0.35), seed: k + 92 });
    if (g.age > 0.5) {
      L.inkPath(ctx, [[tx0 + 14, ty0 - 9], [tx0 + 18, ty0 - 3], [tx0 + 16, ty0 + 4]], { width: 1.2, color: P.ink, alpha: 0.5, seed: k + 93, taper: [3, 3] });
    }
    ctx.restore();
  }

  function torch(ctx, L, P, a, tilt) {
    const k = sd(L, 'torch');
    ctx.save();
    ctx.translate(a[0], a[1]);
    ctx.rotate(tilt);
    const ha = -Math.PI / 4 - tilt;
    // handle (tapered bronze cylinder)
    const handle = [[-11, 4], [-13, -HANDLE * 0.5], [-15, -HANDLE], [15, -HANDLE], [13, -HANDLE * 0.5], [11, 4]];
    L.inkPath(ctx, handle, { closed: true, width: 3.2, fill: P.torchBronze, seed: k + 1, smooth: false });
    L.hatch(ctx, [[2, 2], [3, -HANDLE], [15, -HANDLE], [11, 2]], { angle: -tilt + 0.15, spacing: 6, width: 1.3, color: P.ink, alpha: 0.7, length: [6, 12], bend: 1.5, seed: k + 2 });
    L.inkPath(ctx, [[-7, -10], [-9, -HANDLE + 12]], { width: 2, color: P.tan, alpha: 0.8, seed: k + 3, taper: [10, 20] });
    // wrapped bands between the grips
    for (const s of [94, 176]) {
      L.inkPath(ctx, [[-13.5, -s + 3], [0, -s + 6], [13.5, -s + 3]], { width: 1.6, color: P.inkSoft, seed: k + s });
      L.inkPath(ctx, [[-13.5, -s - 3], [0, -s], [13.5, -s - 3]], { width: 1.6, color: P.inkSoft, seed: k + s + 1 });
    }
    // pommel
    L.inkPath(ctx, L.ellipsePts(0, 6, 17, 11, 24), { closed: true, width: 3, fill: P.torchBronze, seed: k + 5 });
    L.hatch(ctx, L.ellipsePts(4, 9, 12, 7, 18), { angle: ha, spacing: 5, width: 1.2, alpha: 0.7, length: [6, 12], seed: k + 6 });
    // collar
    const cy = -HANDLE;
    L.inkPath(ctx, L.rrectPts(-21, cy - 14, 42, 16, 5, 8), { closed: true, width: 2.8, fill: P.torchBronze, seed: k + 7 });
    L.hatch(ctx, [[6, cy - 14], [21, cy - 14], [21, cy + 2], [6, cy + 2]], { angle: ha, spacing: 5, width: 1.2, alpha: 0.7, length: [6, 12], seed: k + 8 });
    // cup: a flared bowl
    const cup = [[-19, cy - 12], [-30, cy - 26], [-42, cy - 46], [-46, cy - 54], [46, cy - 54], [42, cy - 46], [30, cy - 26], [19, cy - 12]];
    L.inkPath(ctx, cup, { closed: true, width: 3.4, fill: P.ochre, seed: k + 9, double: { alpha: 0.4 } });
    L.hatch(ctx, [[6, cy - 12], [19, cy - 12], [30, cy - 26], [44, cy - 50], [12, cy - 50]], { angle: ha, spacing: 6, width: 1.3, color: P.ink, alpha: 0.7, seed: k + 10 });
    L.crossHatch(ctx, [[24, cy - 20], [30, cy - 26], [42, cy - 46], [34, cy - 46]], { spacing: 5, width: 1.2, alpha: 0.6, seed: k + 11 });
    L.inkPath(ctx, [[-36, cy - 38], [0, cy - 33], [36, cy - 38]], { width: 1.6, color: P.inkSoft, seed: k + 12 });
    for (let i = -2; i <= 2; i++) L.inkCircle(ctx, i * 13, cy - 26 - Math.abs(i) * 1.5, 2.6, { width: 1, fill: P.tan, seed: k + 20 + i });
    // rim
    L.inkPath(ctx, L.ellipsePts(0, cy - 54, 47, 9, 28), { closed: true, width: 2.6, fill: P.ink, seed: k + 13 });
    ctx.restore();
  }

  function flameTop(a, tilt) {
    const s = HANDLE + 54;
    return [a[0] + Math.sin(tilt) * s, a[1] - Math.cos(tilt) * s];
  }

  function flameShape(L, bx, by, H, W, lean, fi, seed, phase) {
    const n = 18;
    const right = [], left = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      let hw = u < 0.24 ? W * Math.sqrt(1 - Math.pow((0.24 - u) / 0.24, 2) * 0.82) : W * Math.pow((1 - u) / 0.76, 1.25);
      const fl = 1 + 0.16 * Math.sin(u * 11 + fi * 1.9 + phase) * u + 0.1 * (L.h3(i, fi, seed) - 0.5);
      const fl2 = 1 + 0.16 * Math.sin(u * 9 - fi * 2.3 + phase * 1.7) * u + 0.1 * (L.h3(i + 40, fi, seed) - 0.5);
      const cx = lean * u * u + Math.sin(u * 6 + fi * 1.3) * 5 * u;
      const y = by + 6 - u * H;
      right.push([bx + cx + hw * fl, y]);
      left.push([bx + cx - hw * fl2, y]);
    }
    right[n] = left[n] = [bx + lean + Math.sin(6 + fi * 1.3) * 5, by + 6 - H];
    return right.concat(left.reverse().slice(1, n));
  }

  // ---------------------------------------------------------------- scene
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const T = info.T;
      const G = gens(P);
      const fr = (a, frames, e, lead = 1) => (t < a ? 0 : (e || E.linear)(clamp((t - a) / (frames * FR) + lead / frames)));

      const camX = 960 + 200 * E.inOutSine(t / info.dur);

      // 1 paper and stripes
      L.paper(ctx);
      ctx.save();
      ctx.globalAlpha = 0.93;
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: (6 * T) / 0.75 - (camX - 960) * 0.3 * 0.497, seed: sd(L, 'stripes') });
      ctx.restore();

      const a = anchor(L, tw);
      const tilt = tiltAt(L, tw);
      const vlag = velX(L, tw, 0.35);
      const lean = clamp(-vlag * 0.085, -70, 70);
      const ft = flameTop(a, tilt);
      const swell = 1 + 0.14 * E.outBack(clamp((tw - B_RAISE) / (8 * FR)));
      const fi = Math.floor(t * 12 + 1e-6);

      L.camera(ctx, { x: camX, y: 540 }, () => {
        // 2 construction lines (world fixed)
        ctx.save();
        ctx.strokeStyle = P.inkFaint;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(1060, 520, 420, 0, TAU);
        ctx.moveTo(1060 + 250, 520);
        ctx.arc(1060, 520, 250, 0, TAU);
        ctx.moveTo(300, 520);
        ctx.lineTo(1900, 520);
        for (let i = 0; i < 12; i++) {
          const q = (i / 12) * TAU;
          ctx.moveTo(1060 + Math.cos(q) * 250, 520 + Math.sin(q) * 250);
          ctx.lineTo(1060 + Math.cos(q) * 470, 520 + Math.sin(q) * 470);
        }
        for (const x of [600, 840, 1300]) {
          ctx.moveTo(x, 150);
          ctx.lineTo(x, 840);
        }
        ctx.stroke();
        ctx.restore();

        // 3 the one soft halo around the flame
        {
          const hx = ft[0] + lean * 0.35, hy = ft[1] - 80;
          const R = 230 * swell;
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
          g.addColorStop(0, L.rgba(P.flameCore, 0.55));
          g.addColorStop(0.45, L.rgba(P.flameCore, 0.2));
          g.addColorStop(1, L.rgba(P.flameCore, 0));
          ctx.fillStyle = g;
          ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
        }
      });

      // 4 calm lower register behind the arms (screen fixed)
      ctx.save();
      L.hatch(ctx, [[0, 790], [1920, 790], [1920, 870], [0, 870]], { angle: -Math.PI / 4, spacing: 7, width: 1.3, color: P.inkSoft, alpha: 0.6, density: (x, y) => clamp((y - 790) / 80), seed: sd(L, 'band') });
      ctx.fillStyle = P.inkSoft;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 862);
      for (let x = 0; x <= 1920; x += 40) ctx.lineTo(x, 858 + 4 * Math.sin(x * 0.013));
      ctx.lineTo(1920, 1080);
      ctx.lineTo(0, 1080);
      ctx.fill();
      ctx.restore();

      L.camera(ctx, { x: camX, y: 540 }, () => {
        const states = HANDS.map((h) => handState(L, h, tw));
        // hands drawn back to front: later generations behind? draw givers last so the grip reads
        const order = [5, 4, 3, 2, 1, 0];
        // 5 forearms, sleeves, backs of hands
        for (const i of order) handBack(ctx, L, P, HANDS[i], states[i], G);
        // 6 torch
        torch(ctx, L, P, a, tilt);
        // 7 fingers and thumbs
        for (const i of order) handFront(ctx, L, P, HANDS[i], states[i], G);

        // 8 flame
        const H = 170 * swell, W = 42 * swell;
        const seed = sd(L, 'flame');
        L.inkPath(ctx, flameShape(L, ft[0], ft[1], H, W, lean, fi, seed, 0), { closed: true, width: 2.6, fill: P.flame, color: P.ink, alpha: 0.85, seed: seed + fi % 2, smooth: true });
        // side tongue
        L.inkPath(ctx, flameShape(L, ft[0] + 22, ft[1] - 6, H * 0.45, W * 0.38, lean * 0.6 + 8, fi + 3, seed + 5, 1), { closed: true, width: 1.8, fill: P.flame, color: P.ink, alpha: 0.7, seed: seed + 6 });
        L.inkPath(ctx, flameShape(L, ft[0] - 20, ft[1] - 4, H * 0.38, W * 0.34, lean * 0.6 - 6, fi + 7, seed + 9, 2), { closed: true, width: 1.8, fill: P.flame, color: P.ink, alpha: 0.7, seed: seed + 10 });
        L.inkPath(ctx, flameShape(L, ft[0] + lean * 0.05, ft[1] - 4, H * 0.58, W * 0.56, lean * 0.7, fi + 1, seed + 2, 0.7), { closed: true, width: 1.4, fill: P.flameCore, color: P.orange, alpha: 0.8, seed: seed + 3 });
        // a few flame-red strokes on the shadow (right) side of the flame body
        for (let i = 0; i < 3; i++) {
          const u0 = 0.15 + i * 0.12;
          const x0 = ft[0] + lean * u0 * u0 + W * (0.55 - u0 * 0.4), y0 = ft[1] - u0 * H;
          L.inkPath(ctx, [[x0, y0], [x0 + lean * 0.12 - 4, y0 - H * 0.18]], { width: 1.5, color: P.red, alpha: 0.6, seed: seed + 20 + i + (fi % 3) * 5, taper: [4, 8] });
        }
        // sparks rising, trailing the motion
        for (let s = 0; s < 8; s++) {
          const per = 1.1 + L.h3(s, 1, seed) * 0.5;
          const ph = L.h3(s, 2, seed) * per;
          const age = (tw + ph) % per;
          const u = age / per;
          const sx = ft[0] + (L.h3(s, 3, seed) - 0.5) * 50 + lean * 1.3 * u + Math.sin(u * 8 + s) * 8;
          const sy = ft[1] - H * 0.6 - u * 150;
          const r = 3.4 * (1 - u) + 0.6;
          L.inkCircle(ctx, sx, sy, r, { width: 0.9, color: P.orange, fill: P.flameCore, seed: seed + 40 + s, boil: false });
        }

        // 9 overlays: dashed torch path (above the flame) and hand-off rings
        ctx.save();
        ctx.strokeStyle = P.annBlue;
        ctx.fillStyle = P.annBlue;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        const PY = -540;
        let lx = 0, ly = 0, px = 0, py = 0;
        const steps = Math.max(1, Math.round(t * 24));
        for (let i = 0; i <= steps; i++) {
          const tt = (i / steps) * t;
          const q = anchor(L, tt);
          px = lx; py = ly;
          lx = q[0]; ly = q[1] + PY + Math.sin((q[0] - 600) * 0.012) * 6;
          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const s0 = anchor(L, 0);
        ctx.beginPath();
        ctx.arc(s0[0], s0[1] + PY, 5, 0, TAU);
        ctx.fill();
        // hand-off ticks along the path
        ctx.beginPath();
        for (const [tk, x] of [[B_HAND1, 840], [B_HAND2, 1300]]) {
          if (t >= tk - FR) {
            const y = anchor(L, tk)[1] + PY;
            ctx.moveTo(x, y - 14);
            ctx.lineTo(x, y + 14);
          }
        }
        ctx.stroke();
        const dx = lx - px, dy = ly - py;
        if (Math.hypot(dx, dy) > 0.5) {
          const ang = Math.atan2(dy, dx);
          ctx.translate(lx, ly);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-9, -7);
          ctx.lineTo(-5, 0);
          ctx.lineTo(-9, 7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        for (const [tk, slot] of [[B_HAND1, 'C'], [B_HAND2, 'B']]) {
          const e = fr(tk, 12, E.outExpo);
          if (e > 0 && t < tk + 13 * FR) {
            const p = slotPos(L, tk, SLOT[slot]);
            ctx.save();
            ctx.strokeStyle = P.annYellow;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 1 - clamp((t - tk) / (12 * FR));
            ctx.beginPath();
            ctx.arc(p[0], p[1], 40 + 80 * e, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }
        }
      });
    },
  });
})();
