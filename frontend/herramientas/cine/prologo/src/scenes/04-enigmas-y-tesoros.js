/*
 * 04 enigmas-y-tesoros : Enigmas and treasures in the sky.  T 16.5 to 24.0, illustrated, hard cut.
 * Night sky full frame (stipple stars twinkling on twos), thin hill silhouette (crest y 790) with the crowd
 * from 02 in silhouette, looking up. Treasures pop one per event with an annYellow ring (9 frames):
 *   T 17.25 comet (upper left), T 18.0 ringed planet (upper right), T 19.5 nebula swirl (centre),
 *   T 21.0 bright-star cluster, T 22.5 Mars (marsSoil r 22 at (1380, 560)); T 23.25 annMagenta ring on Mars, held.
 * Camera drifts right 40 px across the shot. Layers: 1 sky, 2 stars, 3 treasures, 4 hill + crowd, 5 rings.
 */
(function () {
  'use strict';
  const ID = 'enigmas-y-tesoros';
  const REF = 'humanos-convergen'; // crowd seeded from 02
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_COMET = 0.75; // T 17.25
  const B_PLANET = 1.5; // T 18.0
  const B_NEB = 3.0; //   T 19.5
  const B_CLUS = 4.5; //  T 21.0
  const B_MARS = 6.0; //  T 22.5
  const B_MAG = 6.75; //  T 23.25
  const COMET = [420, 250], PLANET = [1420, 250], NEB = [960, 380], CLUS = [620, 520], MARS = [1380, 560];
  const hillY = (x) => 790 + 0.00008 * (x - 960) * (x - 960);

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(LIB.hash(REF, 'crowd-sil'));
    const crowd = [];
    for (let k = 0; k < 18; k++) {
      const x = 960 + (k - 8.5) * 26 + r.range(-6, 6);
      crowd.push([x, k === 9 ? 38 : r.range(48, 62), r.range(-1, 1) < 0 ? -1 : 1, LIB.hash(REF, 'sil', k) & 0xffff]);
    }
    const hill = [];
    for (let x = -100; x <= 2100; x += 30) hill.push([x, hillY(x)]);
    hill.push([2100, 1200], [-100, 1200]);
    const c = LIB.rng(sd('clus'));
    const clus = [];
    for (let i = 0; i < 7; i++) clus.push([CLUS[0] + c.range(-60, 60), CLUS[1] + c.range(-40, 40), c.range(3, 6)]);
    GEO = { crowd, hill, clus };
    return GEO;
  }

  function glint(ctx, x, y, s, a = 1) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = P.white;
    ctx.fillStyle = P.white;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, s * 0.2), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function ring(ctx, x, y, r0, r1, t, a, color, hold) {
    if (t < a) return;
    const rp = (t - a) / FR;
    const ex = E.outExpo(clamp((rp + 1) / 9));
    const al = hold ? 1 : 1 - clamp((rp - 6) / 6);
    if (al <= 0) return;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, lerp(r0, r1, ex), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const g = geo();
      const pop = (a) => (tw < a ? 0 : [0.72, 1.08, 1][Math.min(2, Math.floor((t - a) * 12 + 1e-6))]);
      const camX = 960 + 40 * E.inOutSine(t / info.dur);

      L.camera(ctx, { x: camX, y: 540 }, (c) => {
        // 1. sky
        c.fillStyle = P.night;
        c.fillRect(-100, -60, 2120, 1200);
        // 2. stars (twinkle on twos via the boil)
        L.stipple(c, null, { bounds: [-100, -60, 2120, 900], spacing: 24, r: [0.7, 2.0], color: P.white, alpha: 0.85, seed: sd('st'), density: 0.6, boilAmp: 0.6 });
        [[220, 120], [1120, 90], [1700, 330], [780, 160], [1600, 690]].forEach(([x, y], i) => glint(c, x, y, 8 + 5 * L.h3(Math.floor(tw * 4), i, sd('gl')), 0.9));

        // 3. treasures
        // comet
        let s = pop(B_COMET);
        if (s) {
          const [x, y] = COMET;
          const dx = 6 * tw;
          c.save();
          c.translate(x + dx, y);
          c.scale(s, s);
          const tail = [[0, -10], [-210, -120], [-250, -90], [-220, -60], [0, 10]];
          L.inkPath(c, L.smoothPts(tail, true, 6), { closed: true, fill: P.flame, fillAlpha: 0.85, width: 2, color: P.inkSoft, seed: sd('tail') });
          L.inkPath(c, L.smoothPts([[0, -6], [-150, -78], [-170, -66], [0, 6]], true, 6), { closed: true, fill: P.flameCore, width: 1.2, color: P.flame, seed: sd('tail2') });
          L.inkCircle(c, 0, 0, 12, { fill: P.white, width: 2.4, seed: sd('head') });
          c.restore();
        }
        // ringed planet
        s = pop(B_PLANET);
        if (s) {
          const [x, y] = PLANET, R = 46 * s;
          const tilt = -0.3;
          c.save();
          c.lineWidth = 6; c.strokeStyle = P.ink;
          c.beginPath(); c.ellipse(x, y, R * 2, R * 0.5, tilt, Math.PI, TAU); c.stroke();
          c.restore();
          const disc = L.ellipsePts(x, y, R, R, 40);
          L.inkPath(c, disc, { closed: true, fill: P.ochre, width: 2.8, seed: sd('pl') });
          L.hatch(c, disc, { spacing: 5, width: 1.3, alpha: 0.8, seed: sd('plh'), density: (px, py) => clamp(((px - x) * 0.7 + (py - y) * 0.7) / R + 0.2) });
          c.save();
          c.lineWidth = 6; c.strokeStyle = P.ink;
          c.beginPath(); c.ellipse(x, y, R * 2, R * 0.5, tilt, 0, Math.PI); c.stroke();
          c.lineWidth = 2.5; c.strokeStyle = P.tan;
          c.beginPath(); c.ellipse(x, y, R * 1.85, R * 0.44, tilt, 0, Math.PI); c.stroke();
          c.restore();
        }
        // nebula swirl: stipple spiral, grows in over 6 frames then turns slowly on twos
        if (tw >= B_NEB) {
          const grow = clamp((t - B_NEB) / (6 * FR) + 1 / 6);
          const [x, y] = NEB;
          const rot = (tw - B_NEB) * 0.12;
          for (const [col, ph, sp] of [[P.duskRose, 0, 6], [P.rose, Math.PI, 7]]) {
            L.stipple(c, null, {
              bounds: [x - 190, y - 130, 380, 260], spacing: sp, r: [0.8, 2.0], color: col, alpha: 0.85, seed: sd('neb', ph),
              density: (px, py) => {
                const dx = (px - x) / 1.6, dy = py - y;
                const rr = Math.hypot(dx, dy) / 120;
                if (rr > grow) return 0;
                const a = Math.atan2(dy, dx) - rot + ph;
                const arm = Math.cos(a * 2 - rr * 7);
                return clamp((arm * 0.5 + 0.5) * (1 - rr) * 1.4);
              },
            });
          }
        }
        // cluster of bright stars
        if (tw >= B_CLUS) g.clus.forEach(([x, y, r], i) => glint(c, x, y, r * 2.6 * pop(B_CLUS) * (0.85 + 0.15 * L.h3(Math.floor(tw * 6), i, sd('cg')))));
        // Mars
        s = pop(B_MARS);
        if (s) {
          const [x, y] = MARS, R = 22 * s;
          const disc = L.ellipsePts(x, y, R, R, 28);
          L.inkPath(c, disc, { closed: true, fill: P.marsSoil, width: 2.4, seed: sd('mars') });
          L.hatch(c, disc, { spacing: 4, width: 1.1, color: P.marsShadow, alpha: 0.9, seed: sd('mh'), length: [5, 12], density: (px, py) => clamp(((px - x) * 0.7 + (py - y) * 0.7) / R + 0.3) });
          c.save();
          c.fillStyle = P.white;
          c.beginPath(); c.ellipse(x, y - R * 0.82, R * 0.4, R * 0.16, 0, 0, TAU); c.fill();
          c.restore();
        }

        // 4. hill silhouette + crowd silhouettes
        const dark = L.mix(P.ink, P.night, 0.45);
        L.inkPath(c, g.hill, { closed: true, fill: dark, width: 2.2, seed: sd('hill'), smooth: false });
        L.hatch(c, g.hill, { spacing: 9, width: 1.2, color: P.ink, alpha: 0.6, seed: sd('hh') });
        g.crowd.forEach(([x, h, dir, s0]) => {
          const y = hillY(x) + 2;
          const hr = 0.12 * h;
          c.save();
          c.fillStyle = dark;
          c.strokeStyle = P.ink;
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(x - 0.16 * h, y);
          c.lineTo(x - 0.13 * h, y - 0.72 * h);
          c.lineTo(x + 0.13 * h, y - 0.72 * h);
          c.lineTo(x + 0.16 * h, y);
          c.closePath();
          c.fill(); c.stroke();
          c.beginPath();
          c.arc(x - dir * 0.03 * h, y - 0.72 * h - hr * 0.9, hr, 0, TAU);
          c.fill(); c.stroke();
          // upturned nose
          c.beginPath();
          const fa = dir > 0 ? -1.0 : Math.PI + 1.0;
          const hx = x - dir * 0.03 * h, hy = y - 0.72 * h - hr * 0.9;
          c.moveTo(hx + Math.cos(fa - 0.4) * hr, hy + Math.sin(fa - 0.4) * hr);
          c.lineTo(hx + Math.cos(fa) * hr * 1.35, hy + Math.sin(fa) * hr * 1.35);
          c.lineTo(hx + Math.cos(fa + 0.4) * hr, hy + Math.sin(fa + 0.4) * hr);
          c.fill();
          c.restore();
          void s0;
        });

        // 5. rings
        ring(c, COMET[0] + 6 * tw, COMET[1], 20, 52, t, B_COMET, P.annYellow);
        ring(c, PLANET[0], PLANET[1], 60, 112, t, B_PLANET, P.annYellow);
        ring(c, NEB[0], NEB[1], 120, 210, t, B_NEB, P.annYellow);
        ring(c, CLUS[0], CLUS[1], 50, 96, t, B_CLUS, P.annYellow);
        ring(c, MARS[0], MARS[1], 28, 48, t, B_MARS, P.annYellow);
        ring(c, MARS[0], MARS[1], 36, 64, t, B_MAG, P.annMagenta, true);
      });
    },
  });
})();
