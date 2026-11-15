/*
 * 13 mundo-en-la-mano : The world in one bite.  T 60.0 to 64.5 (4.5 s), illustrated, cut.
 *
 * A child's hands (skinDeep) lift the Earth (r 170, centre (960, 430), the Americas facing us) like an apple;
 * a big open mouth waits at the right edge. T 62.25 the mouth opens wide, T 63.0 chomp (outBack),
 * T 63.75 the mouth pulls back and leaves a scalloped bite in the limb; annMagenta arc annotation marks it.
 *
 * Layers, back to front:
 *   1. stripes (stripeCream / stripeSky, Act 2), drifting 6 px a beat
 *   2. sleeves and palms behind the Earth
 *   3. the Earth: ocean, terminator hatching, continents (orthographic, centre lon -92 lat 18), clouds,
 *      polar caps, hero outline (with the bite once taken)
 *   4. fingers and thumbs over the limb
 *   5. crumbs, the mouth (upper face, teeth, jaw)
 *   6. overlay: annMagenta arc annotation round the bite
 */
(function () {
  'use strict';
  const ID = 'mundo-en-la-mano';
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const sd = (...k) => FILM.lib.hash(ID, ...k) & 0x7fffffff;

  const R = 170, EX = 960, EY = 430;
  const B_RISE_END = 2.25; // T 62.25 the Earth is up, the mouth opens wide
  const B_CHOMP = 3.0;     // T 63.0
  const B_NOTCH = 3.75;    // T 63.75
  const LON0 = -92 * DEG, LAT0 = 18 * DEG;
  const BITES = [[-15, 34], [0, 36], [15, 34]]; // angle (deg), radius; centres at R + 8 on the right limb

  // coarse coastlines [lon, lat]
  const LANDS = [
    [[-168, 65.6], [-162, 70], [-156, 71], [-140, 70], [-128, 70], [-115, 68], [-95, 68], [-95, 62], [-92, 57], [-82, 55], [-80, 62], [-75, 62],
      [-64, 60], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 36], [-80, 32], [-80.5, 27], [-80.5, 25.2], [-81.8, 26],
      [-82.7, 28], [-84, 30], [-89, 30], [-94, 29.5], [-97, 27.5], [-97.5, 25], [-97.5, 22], [-96, 19], [-94, 18.3], [-91, 18.6], [-90.5, 21],
      [-87, 21.5], [-87.5, 18], [-88.3, 16], [-84, 16], [-83.3, 15], [-83.6, 11], [-83, 10], [-79.5, 9.5], [-77.5, 8.5], [-80, 7.5], [-82, 8.2],
      [-85.7, 10], [-87.5, 13], [-91, 14], [-94, 16], [-96, 15.7], [-100, 17], [-105, 19.5], [-105.7, 22], [-108, 25], [-111, 28], [-112.7, 31.5],
      [-114.7, 31.5], [-112, 28], [-110, 24], [-109.5, 23], [-112, 25], [-114, 28], [-116.5, 31.8], [-117.3, 33], [-120.6, 34.5], [-122.5, 37.5],
      [-124, 40], [-124.5, 43], [-124, 46], [-124.7, 48.4], [-127, 50.5], [-130, 54], [-133, 57], [-137, 58.5], [-142, 60], [-147, 60.8],
      [-152, 58], [-158, 56], [-163, 55], [-158, 58.5], [-162, 60], [-165, 62.5], [-164.5, 64.5]],
    [[-73, 78], [-60, 82], [-35, 83], [-20, 80], [-18, 75], [-22, 70], [-32, 66], [-40, 63], [-43, 60], [-48, 61], [-52, 65], [-54, 69], [-60, 76], [-68, 77]],
    [[-77, 8], [-72, 12], [-67, 10.5], [-62, 10.5], [-58, 7], [-52, 5], [-50, 1], [-48, -1], [-44, -2.5], [-39, -3], [-35, -5.5], [-35, -9],
      [-38, -13], [-39, -17], [-40, -21], [-43, -23], [-48, -26], [-48.5, -28.5], [-52, -32.5], [-55, -35], [-57.5, -36], [-57, -38.5],
      [-62, -39], [-65, -42], [-65, -45], [-67.5, -47], [-69, -51], [-68.5, -53], [-70, -55], [-74, -52.5], [-75, -48], [-73.5, -42],
      [-73.5, -37], [-71.5, -31], [-71, -25], [-70.2, -18.5], [-72, -17], [-76, -14], [-79, -9], [-81, -6], [-80.5, -3], [-80, 0], [-79.5, 1],
      [-78, 2.5], [-77.5, 4], [-77.3, 7]],
    [[-85, 21.8], [-82, 23], [-77, 22], [-74.2, 20.1], [-77.5, 19.9], [-80, 21.7], [-83, 21.5]],
    [[-74.5, 19.8], [-70, 19.7], [-68.4, 18.5], [-71.5, 17.8], [-74.4, 18.4]],
    [[-17, 14.7], [-17, 21], [-13, 27.5], [-10, 30], [-6, 35.8], [10, 37], [10, 4], [-8, 4.5], [-13, 8], [-15, 11]],
    [[-9, 43], [-9, 37], [-6, 36], [3, 40], [3, 43]],
  ];

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const proj = (lon, lat) => {
      lon *= DEG; lat *= DEG;
      const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon - LON0);
      let x = Math.cos(lat) * Math.sin(lon - LON0);
      let y = Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon - LON0);
      if (cosc < 0) { const l = Math.hypot(x, y) || 1; x /= l; y /= l; }
      return [x * R, -y * R];
    };
    const lands = LANDS.map((poly) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        for (let k = 0; k < 3; k++) out.push(proj(lerp(a[0], b[0], k / 3), lerp(a[1], b[1], k / 3)));
      }
      return out;
    });
    // bitten outline: star-shaped radius per angle (relative to the centre)
    const bitten = [], whole = [];
    for (let i = 0; i < 240; i++) {
      const a = (i / 240) * TAU - Math.PI;
      const ux = Math.cos(a), uy = Math.sin(a);
      let r = R;
      for (const [ba, br] of BITES) {
        const cx = Math.cos(ba * DEG) * (R - 2), cy = Math.sin(ba * DEG) * (R - 2);
        const d = cx * ux + cy * uy, q = cx * cx + cy * cy - d * d;
        if (q < br * br) { const s = d - Math.sqrt(br * br - q); if (s > 0 && s < r) r = s; }
      }
      bitten.push([ux * r, uy * r]);
      whole.push([ux * R, uy * R]);
    }
    const clouds = [];
    const rr = L.rng(sd(3));
    for (let i = 0; i < 7; i++) {
      const cx = rr.range(-120, 120), cy = rr.range(-130, 130);
      if (Math.hypot(cx, cy) > 140) continue;
      const pts = [];
      const r0 = rr.range(14, 26), turns = rr.range(0.9, 1.5), dir = rr.sign();
      for (let k = 0; k <= 24; k++) {
        const u = k / 24, a = dir * u * turns * TAU, r = r0 * (1 - 0.7 * u);
        pts.push([cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.8]);
      }
      clouds.push(pts);
    }
    GEO = { lands, bitten, whole, clouds };
    return GEO;
  }

  function off(pts, x, y) { return pts.map((p) => [p[0] + x, p[1] + y]); }

  function drawEarth(ctx, L, cx, cy, bitten) {
    const P = L.pal, G = geo(L);
    const outline = off(bitten ? G.bitten : G.whole, cx, cy);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, outline);
    ctx.fillStyle = P.earthOcean;
    ctx.fill();
    ctx.clip();
    L.stipple(ctx, null, { bounds: [cx - R, cy - R, 2 * R, 2 * R], spacing: 9, r: [0.8, 1.4], color: P.earthOceanDeep, alpha: 0.5, seed: sd(10), density: 0.35 });
    for (let i = 0; i < G.lands.length; i++) {
      const lp = off(G.lands[i], cx, cy);
      L.inkPath(ctx, lp, { closed: true, width: 1.6, color: P.inkSoft, fill: P.earthLand, seed: sd(11, i), wobble: 0.8 });
      L.hatch(ctx, lp, { spacing: 7, width: 1.2, color: P.leaf, alpha: 0.8, seed: sd(12, i), density: (x, y) => 0.3 + 0.4 * L.noise2(x * 0.03, y * 0.03, sd(13)) });
    }
    // polar caps
    ctx.fillStyle = P.earthCloud;
    ctx.beginPath();
    ctx.ellipse(cx, cy - R + 8, 110, 26, 0, 0, TAU);
    ctx.ellipse(cx, cy + R - 4, 90, 14, 0, 0, TAU);
    ctx.fill();
    // clouds
    for (let i = 0; i < G.clouds.length; i++) L.inkPath(ctx, off(G.clouds[i], cx, cy), { width: 5, color: P.earthCloud, alpha: 0.95, seed: sd(14, i), taper: [4, 14] });
    // terminator: contour hatching on the side away from the light (upper left)
    const dens = (x, y) => sstep(-0.05, 0.75, ((x - cx) * 0.62 + (y - cy) * 0.78) / R);
    L.crossHatch(ctx, null, { bounds: [cx - R, cy - R, 2 * R, 2 * R], spacing: 6, width: 1.4, color: P.earthOceanDeep, alpha: 0.85, seed: sd(15), tone: 0.6, angle: -2.2, bend: 3, density: dens });
    ctx.restore();
    L.inkPath(ctx, outline, { closed: true, width: 4.5, color: P.ink, seed: sd(16), double: { alpha: 0.4, width: 0.33, from: 0.1, to: 0.4 } });
    // a little leaf on top: the apple joke
    L.inkPath(ctx, [[cx - 4, cy - R + 2], [cx - 2, cy - R - 22]], { width: 4, color: P.wood, seed: sd(17), taper: [2, 4] });
    L.inkPath(ctx, [[cx - 2, cy - R - 16], [cx + 18, cy - R - 34], [cx + 40, cy - R - 26], [cx + 18, cy - R - 12]], { closed: true, width: 2.4, color: P.ink, fill: P.leaf, seed: sd(18) });
  }

  function drawHands(ctx, L, cx, cy, front) {
    const P = L.pal;
    for (const s of [-1, 1]) {
      const hx = cx + s * 112, hy = cy + 138;
      if (!front) {
        const sleeve = [[hx - 52, hy + 30], [hx + 52, hy + 40], [hx + s * 40 + 60, 1120], [hx + s * 40 - 70, 1120]];
        L.inkPath(ctx, sleeve, { closed: true, width: 4.5, color: P.ink, fill: P.teal, seed: sd(20, s) });
        L.hatch(ctx, sleeve, { spacing: 7, width: 1.4, color: P.tealDeep, alpha: 0.85, seed: sd(21, s), density: (x) => (s > 0 ? 0.8 : 0.35) });
        const palm = L.ellipsePts(hx, hy, 74, 50, 40, s * -0.55);
        L.inkPath(ctx, palm, { closed: true, width: 4.5, color: P.ink, fill: P.skinDeep, seed: sd(22, s) });
        L.hatch(ctx, palm, { spacing: 6, width: 1.3, color: P.ink, alpha: 0.6, seed: sd(23, s), density: (x, y) => sstep(hy, hy + 40, y) });
      } else {
        // fingers curl up over the limb
        for (let i = 0; i < 4; i++) {
          const a = (s < 0 ? 108 + i * 13 : 72 - i * 13) * DEG;
          const px = cx + Math.cos(a) * (R - 16), py = cy + Math.sin(a) * (R - 16);
          const rot = a + Math.PI / 2;
          const f = L.capsulePts(px, py, 58 - i * 5, 13, rot, 28);
          L.inkPath(ctx, f, { closed: true, width: 2.8, color: P.ink, fill: P.skinDeep, seed: sd(24, s, i) });
          L.inkPath(ctx, [[px + Math.cos(rot) * 12, py + Math.sin(rot) * 12], [px + Math.cos(rot) * 12 + Math.cos(a) * 8, py + Math.sin(rot) * 12 + Math.sin(a) * 8]], { width: 1.6, color: P.ink, alpha: 0.8, seed: sd(25, s, i), taper: 2 });
        }
        const ta = (s < 0 ? 150 : 30) * DEG;
        const th = L.capsulePts(cx + Math.cos(ta) * (R - 10), cy + Math.sin(ta) * (R - 10), 70, 15, ta + (s < 0 ? -1.2 : 1.2), 28);
        L.inkPath(ctx, th, { closed: true, width: 2.8, color: P.ink, fill: P.skinDeep, seed: sd(26, s) });
      }
    }
  }

  // the mouth, facing left; local origin at the lips' front, (mx, my)
  function drawMouth(ctx, L, mx, my, open, bi) {
    const P = L.pal;
    const up = -open * 18, dn = 14 + open * 120;
    const upper = off([[-10, -30], [-18, -46], [-10, -62], [-30, -80], [-58, -98], [-50, -118], [-28, -150], [-14, -220], [20, -330], [700, -330], [700, -30], [40, -30]], mx, my + up);
    const jaw = off([[-8, 0], [-20, 14], [-12, 30], [-30, 62], [-28, 104], [0, 160], [60, 200], [700, 200], [700, 0], [40, 0]], mx, my + dn);
    // interior
    ctx.save();
    ctx.fillStyle = L.mix(P.red, P.ink, 0.55);
    ctx.fillRect(mx - 4, my + up - 32, 720, dn - up + 36);
    ctx.fillStyle = P.rose;
    ctx.beginPath();
    ctx.ellipse(mx + 70, my + dn - 4, 70, 22 + open * 10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // teeth
    for (const [x0, w] of [[-4, 20], [18, 20]]) {
      L.inkPath(ctx, L.rrectPts(mx + x0, my + up - 34, w, 30, 6, 6), { closed: true, width: 2, color: P.ink, fill: P.white, seed: sd(30, x0) });
    }
    L.inkPath(ctx, L.rrectPts(mx + 4, my + dn - 12, 34, 16, 5, 6), { closed: true, width: 2, color: P.ink, fill: P.white, seed: sd(31) });
    L.inkPath(ctx, jaw, { closed: true, width: 4.5, color: P.ink, fill: P.skinWarm, seed: sd(32) });
    L.hatch(ctx, jaw, { spacing: 7, width: 1.3, color: P.skinDeep, alpha: 0.85, seed: sd(33), density: (x, y) => sstep(my + dn + 40, my + dn + 150, y) });
    L.inkPath(ctx, upper, { closed: true, width: 4.5, color: P.ink, fill: P.skinWarm, seed: sd(34) });
    L.hatch(ctx, upper, { spacing: 7, width: 1.3, color: P.skinDeep, alpha: 0.8, seed: sd(35), density: (x, y) => 0.7 * sstep(my + up - 90, my + up - 40, y) * sstep(mx - 30, mx + 30, x) });
    // nostril, cheek blush
    L.inkPath(ctx, [[mx - 44, my + up - 92], [mx - 34, my + up - 86], [mx - 40, my + up - 80]], { width: 1.6, color: P.ink, seed: sd(36), taper: 2 });
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = P.rose;
    ctx.beginPath();
    ctx.ellipse(mx + 90, my + up - 70, 34, 18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      // 1 stripes
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeSky], width: 140, angle: -0.52, offset: (info.T / 0.75) * 6, seed: sd(1) });

      // the Earth rises on twos (outBack lands on T 62.25), then bobs with the bite
      const rise = L.seg(tw, 0, B_RISE_END, 'outBack');
      const jolt = t >= B_CHOMP && t < B_NOTCH ? 8 * (1 - L.seg(tw, B_CHOMP, B_CHOMP + 0.25)) : 0;
      const cx = EX, cy = lerp(EY + 560, EY, rise) + jolt;
      const bitten = t >= B_NOTCH;

      drawHands(ctx, L, cx, cy, false);
      drawEarth(ctx, L, cx, cy, bitten);
      drawHands(ctx, L, cx, cy, true);

      // crumbs from the bite
      if (bitten) {
        const u = L.onTwos(t - B_NOTCH);
        for (let i = 0; i < 7; i++) {
          const a = (-40 + i * 13) * DEG, sp = 120 + 60 * L.h3(i, 1, 4);
          const x = cx + R + Math.cos(a) * sp * u, y = cy + Math.sin(a) * sp * u + 420 * u * u;
          if (y > 830) continue;
          ctx.fillStyle = i % 2 ? P.earthLand : P.earthOcean;
          ctx.beginPath();
          ctx.arc(x, y, 4 + (i % 3), 0, TAU);
          ctx.fill();
        }
      }

      // 5 the mouth
      let mx = 1580, open = 0.35;
      if (t >= B_RISE_END) open = [0.6, 1.08, 1][Math.min(2, drawing(B_RISE_END))];
      if (t >= B_CHOMP) {
        const k = E.outBack(clamp((tw - B_CHOMP) / (4 * FR) + 0.25));
        mx = lerp(1580, R + EX - 4, k);
        open = lerp(1, 0.05, k);
      }
      if (t >= B_NOTCH) {
        const k = E.outExpo(clamp((t - B_NOTCH) / (9 * FR) + 1 / 9));
        mx = lerp(R + EX - 4, 1540, k);
        open = 0.12 + 0.12 * Math.abs(Math.sin((tw - B_NOTCH) * Math.PI * 2.67)); // chewing
      }
      drawMouth(ctx, L, mx, EY + 6, open, bi);

      // 6 overlay: the bite marked with an annMagenta arc annotation
      const ap = hit(B_NOTCH, 9, E.outExpo);
      if (ap > 0) L.arcAnnotation(ctx, cx, cy, R + 34, -30 * DEG, 30 * DEG, { color: P.annMagenta, width: 2, p: ap, endTicks: 8, dot: 4 });
    },
  });
})();
