/*
 * 12 mas-alla-del-ojo : Beyond what the eye can reach.  T 54.0 to 60.0 (6 s), illustrated, cut.
 *
 * Extreme close-up of the child's eye (world centre (960, 450)); the camera pushes 1 -> 6x into the
 * pupil in beat steps (T 55.5, 57.0, 58.5) while the pupil opens on the beats in between, until the
 * pupil fills the frame: a far horizon with pale mountains, the curve of the sky and stars.
 *
 * Layers, back to front:
 *   1. skin field and brow (world, camera)
 *   2. eyeball: sclera, lid shadow hatching, iris (teal, radial tealDeep hatching, limbal ring, collarette)
 *   3. pupil (night) with the inner landscape clipped to it (screen space, its own slower scale)
 *   4. catchlight, lids, lashes (world)
 *   5. overlay: annBlue ruler along the horizon with distance ticks (T 59.25)
 */
(function () {
  'use strict';
  const ID = 'mas-alla-del-ojo';
  const TAU = Math.PI * 2, DEG = Math.PI / 180, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const sd = (...k) => FILM.lib.hash(ID, ...k) & 0x7fffffff;

  const C = [960, 450], IRIS = 235;
  const ZOOM_T = [1.5, 3.0, 4.5], ZOOM_V = [1, 1.75, 3.1, 6.0];          // T 55.5, 57.0, 58.5
  const PUP_T = [0.75, 1.5, 2.25, 3.0, 3.75, 4.5], PUP_V = [88, 96, 108, 122, 145, 168, 200]; // on every beat
  const B_RULER = 5.25; // T 59.25

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const bez = (p0, p1, p2, n) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
      }
      return out;
    };
    const inner = [440, 478], outer = [1480, 432];
    const upper = bez(inner, [900, -40], outer, 40);
    const lower = bez(outer, [1000, 900], inner, 40);
    const almond = upper.concat(lower.slice(1, -1));
    const crease = bez([470, 400], [920, -110], [1470, 360], 40);
    const r = L.rng(sd(1));
    const lashes = [];
    for (let i = 3; i < 38; i += 1) {
      const p = upper[i], q = upper[i + 1];
      const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty);
      const nx = ty / tl, ny = -tx / tl; // outward (up)
      const len = 34 + 26 * Math.sin((i / 40) * Math.PI) + r.range(-6, 6);
      const lean = (i / 40 - 0.3) * 30;
      lashes.push([[p[0], p[1]], [p[0] + nx * len * 0.5 + lean * 0.3, p[1] + ny * len * 0.5], [p[0] + nx * len + lean, p[1] + ny * len - 6]]);
    }
    const lowLash = [];
    for (let i = 8; i < 36; i += 2) {
      const p = lower[40 - i];
      lowLash.push([[p[0], p[1] + 2], [p[0] + (i - 22) * 0.6, p[1] + 16 + r.range(0, 8)]]);
    }
    const brow = [];
    for (let i = 0; i < 60; i++) {
      const x = 420 + i * 18 + r.range(-6, 6);
      const y = 40 - 70 * Math.sin(((x - 420) / 1100) * Math.PI) + r.range(-10, 10);
      brow.push([[x, y + 30], [x + 26, y - 8]]);
    }
    // iris radial strokes (polar), generated once
    const rays = [];
    for (let i = 0; i < 300; i++) {
      const a = (i / 300) * TAU + r.range(-0.01, 0.01);
      rays.push({ a, r0: r.range(0, 0.25), r1: r.range(0.55, 1), w: r.range(1.2, 2.2), bow: r.range(-0.05, 0.05) });
    }
    // inner landscape (screen coords of the final frame)
    const ridge = (base, amp, f, s) => {
      const pts = [];
      for (let x = -60; x <= 1980; x += 16) {
        const v = Math.abs(L.noise1(x * f, s)) * 0.7 + 0.3 * (0.5 + 0.5 * L.noise1(x * f * 3.1, s + 1));
        pts.push([x, base - amp * v]);
      }
      pts.push([1980, 640], [-60, 640]);
      return pts;
    };
    const stars = [];
    for (let i = 0; i < 26; i++) stars.push([r.range(60, 1860), r.range(60, 380), r.range(5, 11)]);
    GEO = { almond, upper, lower, crease, lashes, lowLash, brow, rays, far: ridge(520, 120, 0.004, sd(5)), near: ridge(546, 70, 0.007, sd(6)), stars };
    return GEO;
  }

  function steps(t, T, V, frames, e) {
    let v = V[0];
    for (let i = 0; i < T.length; i++) {
      if (t < T[i]) break;
      v = lerp(V[i], V[i + 1], e(clamp((t - T[i]) / (frames * FR) + 1 / frames)));
    }
    return v;
  }

  function landscape(ctx, L, k, bi) {
    const P = L.pal, G = geo(L);
    ctx.save();
    ctx.translate(960, 540);
    ctx.scale(k, k);
    ctx.translate(-960, -540);
    ctx.fillStyle = P.night;
    ctx.fillRect(-200, -200, 2320, 1500);
    L.hatch(ctx, null, { bounds: [-100, -100, 2120, 500], spacing: 8, width: 1.4, color: P.spaceInk, alpha: 0.85, seed: sd(20), density: (x, y) => 1 - sstep(0, 380, y) });
    L.stipple(ctx, null, { bounds: [-100, -100, 2120, 560], spacing: 26, r: [0.7, 1.6], color: P.white, alpha: 0.8, seed: sd(21), density: (x, y) => 0.6 * (1 - sstep(300, 470, y)) });
    for (let i = 0; i < G.stars.length; i++) {
      const [x, y, s] = G.stars[i];
      const tw = 0.75 + 0.35 * L.h3(i, bi, 3);
      L.inkLine(ctx, x - s * tw, y, x + s * tw, y, { width: 1.8, color: P.white, seed: sd(22, i), taper: s * 0.8, wobble: 0.3 });
      L.inkLine(ctx, x, y - s * tw * 1.2, x, y + s * tw * 1.2, { width: 1.8, color: P.white, seed: sd(23, i), taper: s, wobble: 0.3 });
    }
    // the curve of the sky: the lit band of the atmosphere over the planet's curve
    const RC = 2700, cy = 520 + RC;
    const sky = (ctx2) => { ctx2.arc(960, cy, RC + 90, 0, TAU); };
    L.hatch(ctx, sky, { bounds: [-100, 380, 2120, 220], spacing: 6, width: 1.4, color: P.duskRose, alpha: 0.8, seed: sd(24), angle: -0.1, density: (x, y) => sstep(RC + 90, RC, Math.hypot(x - 960, y - cy)) });
    L.inkPath(ctx, L.ellipsePts(960, cy, RC + 90, RC + 90, 720).filter((p) => p[1] < 700), { width: 1.4, color: P.duskRose, alpha: 0.6, seed: sd(25), taper: 40 });
    // mountains
    L.inkPath(ctx, G.far, { closed: true, width: 2.8, color: P.ink, fill: P.paperShade, seed: sd(26) });
    L.hatch(ctx, G.far, { spacing: 7, width: 1.3, color: P.inkFaint, alpha: 0.85, seed: sd(27), angle: 1.1, density: (x) => 0.35 + 0.35 * L.noise1(x * 0.02, sd(28)) });
    L.inkPath(ctx, G.near, { closed: true, width: 2.8, color: P.ink, fill: P.paperDeep, seed: sd(29) });
    L.hatch(ctx, G.near, { spacing: 6, width: 1.3, color: P.inkSoft, alpha: 0.85, seed: sd(30), density: (x, y) => 0.3 + 0.7 * sstep(500, 560, y) });
    // ground to the horizon line, dark under it (subtitle band calm)
    ctx.fillStyle = P.spaceInk;
    ctx.fillRect(-200, 552, 2320, 900);
    L.inkLine(ctx, -100, 552, 2020, 552, { width: 2.8, color: P.ink, seed: sd(31) });
    L.stipple(ctx, null, { bounds: [-100, 556, 2120, 300], spacing: 12, r: [0.8, 1.8], color: P.nightSky, alpha: 0.8, seed: sd(32), density: (x, y) => 0.7 * (1 - sstep(560, 800, y)) });
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const G = geo(L);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      const z = steps(t, ZOOM_T, ZOOM_V, 12, E.outExpo) * (1 + 0.012 * t);
      const pr = steps(tw, PUP_T, PUP_V, 4, E.outBack);
      const wk = 1 / Math.sqrt(z); // keep line weights near the bible at high zoom

      const covered = pr * z > 1160; // the pupil fills the frame: nothing of the eye is visible
      if (!covered) L.camera(ctx, { x: C[0], y: C[1], zoom: z }, () => {
        // 1 skin and brow
        ctx.fillStyle = P.skinWarm;
        ctx.fillRect(-200, -300, 2400, 1600);
        L.hatch(ctx, null, { bounds: [-100, -100, 2120, 1300], spacing: 9, width: 1.4, color: P.skinDeep, alpha: 0.7, seed: sd(40), density: (x, y) => clamp(0.55 * sstep(640, 820, y) + 0.4 * sstep(1300, 1700, x)) });
        for (let i = 0; i < G.brow.length; i++) L.inkPath(ctx, G.brow[i], { width: 3.2, color: P.inkSoft, alpha: 0.9, seed: sd(41, i), taper: [6, 14] });
        L.inkPath(ctx, G.crease, { width: 2.8 * wk * 1.4, color: P.ink, seed: sd(42) });
        L.hatch(ctx, null, { bounds: [380, 120, 1180, 330], spacing: 6, width: 1.3, color: P.skinDeep, alpha: 0.75, seed: sd(43), clip: false,
          density: (x, y) => { const u = (x - 470) / 1000; const yc = 400 * (1 - u) * (1 - u) - 220 * u * (1 - u) * 2 + 360 * u * u; return sstep(yc - 10, yc + 40, y) * 0.8; } });
        // 2 eyeball
        L.inkPath(ctx, G.almond, { closed: true, width: 2, color: P.inkSoft, fill: P.white, seed: sd(44) });
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, G.almond);
        ctx.clip();
        L.hatch(ctx, null, { bounds: [430, 200, 1060, 500], spacing: 6, width: 1.3, color: P.paperDeep, alpha: 0.85, seed: sd(45),
          density: (x, y) => clamp(1 - sstep(250, 330, y) + sstep(240, 60, Math.abs(x - 960) - 260) * 0) + 0.5 * sstep(330, 520, Math.abs(x - 960)) });
        // iris
        ctx.fillStyle = P.teal;
        ctx.beginPath();
        ctx.arc(C[0], C[1], IRIS, 0, TAU);
        ctx.fill();
        const rp = new Path2D();
        for (let i = 0; i < G.rays.length; i++) {
          const ry = G.rays[i];
          const j = (L.h3(i, bi, 7) - 0.5) * 0.006;
          const r0 = pr + 6 + ry.r0 * (IRIS - pr), r1 = pr + 6 + ry.r1 * (IRIS - pr - 10);
          const a = ry.a + j, w = ry.w * wk * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
          const x0 = C[0] + ca * r0, y0 = C[1] + sa * r0, x1 = C[0] + ca * r1, y1 = C[1] + sa * r1;
          const mx = (x0 + x1) / 2 + nx * ry.bow * (r1 - r0), my = (y0 + y1) / 2 + ny * ry.bow * (r1 - r0);
          rp.moveTo(x0 + nx * w, y0 + ny * w);
          rp.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1);
          rp.quadraticCurveTo(mx - nx * w, my - ny * w, x0 - nx * w, y0 - ny * w);
          rp.closePath();
        }
        ctx.fillStyle = P.tealDeep;
        ctx.globalAlpha = 0.9;
        ctx.fill(rp);
        ctx.globalAlpha = 1;
        // limbal ring and collarette
        ctx.lineWidth = 16;
        ctx.strokeStyle = P.tealDeep;
        ctx.beginPath();
        ctx.arc(C[0], C[1], IRIS - 8, 0, TAU);
        ctx.stroke();
        const col = [];
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * TAU, rr = pr + 22 + (IRIS - pr) * 0.1 + 6 * Math.sin(a * 9 + 1);
          col.push([C[0] + Math.cos(a) * rr, C[1] + Math.sin(a) * rr]);
        }
        L.inkPath(ctx, col, { closed: true, width: 2.4 * wk, color: P.tealDeep, seed: sd(46) });
        L.inkPath(ctx, L.ellipsePts(C[0], C[1], IRIS, IRIS, 96), { closed: true, width: 3 * wk, color: P.ink, seed: sd(47) });
        // lid shadow over the top of the iris
        L.hatch(ctx, null, { bounds: [700, 190, 520, 140], spacing: 5, width: 1.3, color: P.ink, alpha: 0.6, seed: sd(48), density: (x, y) => 1 - sstep(230, 300, y) });
        ctx.restore();
      });

      // 3 the pupil, opening on the far horizon (screen space)
      const psr = pr * z;
      ctx.save();
      ctx.beginPath();
      ctx.arc(960, 540, psr, 0, TAU);
      ctx.clip();
      const k = 0.36 + 0.64 * Math.pow(clamp((z - 1) / 5), 0.6);
      landscape(ctx, L, k, bi);
      ctx.restore();
      if (psr < 1200) L.inkPath(ctx, L.ellipsePts(960, 540, psr, psr, 96), { closed: true, width: 4.5, color: P.ink, seed: sd(50) });

      // 4 catchlight, lids and lashes (world again)
      if (!covered) L.camera(ctx, { x: C[0], y: C[1], zoom: z }, () => {
        const ca = 1 - clamp((z - 2.2) / 0.8);
        if (ca > 0) {
          ctx.save();
          ctx.globalAlpha = 0.92 * ca;
          ctx.fillStyle = P.white;
          ctx.beginPath();
          ctx.ellipse(C[0] - 110, C[1] - 92, 34, 26, -0.5, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(C[0] + 92, C[1] + 70, 9, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        L.inkPath(ctx, G.upper, { width: 6 * wk * 1.3, color: P.ink, seed: sd(51), double: { alpha: 0.4, width: 0.3 } });
        L.inkPath(ctx, G.lower, { width: 2.8 * wk * 1.2, color: P.inkSoft, seed: sd(52) });
        for (let i = 0; i < G.lashes.length; i++) L.inkPath(ctx, G.lashes[i], { width: 3.4 * wk * 1.2, color: P.ink, seed: sd(53, i), taper: [3, 16] });
        for (let i = 0; i < G.lowLash.length; i++) L.inkPath(ctx, G.lowLash[i], { width: 1.8, color: P.inkSoft, seed: sd(54, i), taper: [2, 6] });
        // tear duct
        L.inkPath(ctx, L.ellipsePts(468, 476, 20, 13, 20), { closed: true, width: 1.6, color: P.inkSoft, fill: P.rose, seed: sd(55) });
      });

      // 5 overlay: the ruler along the horizon (distance ticks shrink toward the far point)
      const rp2 = hit(B_RULER, 12, E.outExpo);
      if (rp2 > 0) {
        const y = 600, x0 = 220, x1 = 1700;
        ctx.save();
        ctx.strokeStyle = P.annBlue;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const xe = lerp(x0, x1, rp2);
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(xe, y);
        for (let i = 0; i < 18; i++) {
          const x = x0 + (x1 - x0) * (1 - Math.pow(0.8, i)) / (1 - Math.pow(0.8, 17));
          if (x > xe) break;
          const len = i % 3 === 0 ? 28 : 12;
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - len * (1 - i * 0.03));
        }
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
