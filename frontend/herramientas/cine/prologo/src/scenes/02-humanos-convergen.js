/*
 * 02 humanos-convergen : Humanity converges.  T 4.5 to 10.5, illustrated, hard cut.
 * Night sky (stipple stars above y 560, 4 bright stars with 4-point glints), a hill with its crest at
 * (960, 600). Two lines of people (three skin tones mixed) walk in from both edges to the crest, arrive by
 * T 9.0 and look up (first heads T 7.5, all by T 9.0). A child at the crest. annBlue dashed motion trails,
 * annYellow ring around the crest group at T 9.75. Camera push 1.00 -> 1.06 about (960, 560).
 * Layers: 1 sky, 2 stars, 3 far hills, 4 hill, 5 trails, 6 people, 7 ring.
 * The crowd layout (CROWD) is reused in silhouette by 04 (seeded with this shot's id).
 */
(function () {
  'use strict';
  const ID = 'humanos-convergen';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_UP0 = 3.0; //  T 7.5 first heads up
  const B_ALL = 4.5; //  T 9.0 all arrived, all heads up
  const B_RING = 5.25; // T 9.75 ring
  const hillY = (x) => 600 + 0.00019 * (x - 960) * (x - 960) + 6 * Math.sin(x * 0.004);

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const r = LIB.rng(sd('crowd'));
    const skins = [P.skinLight, P.skinWarm, P.skinDeep];
    const coats = [P.rose, P.teal, P.ochre, P.tan, P.sage];
    const people = [];
    for (const side of [-1, 1]) {
      for (let k = 0; k < 9; k++) {
        const child = side === 1 && k === 0;
        const xf = 960 + side * (child ? 18 : 40 + k * 44) + r.range(-8, 8);
        const arrive = 3.0 + Math.round((k * 1.5) / 8 / 0.375) * 0.375;
        const D = 150 * arrive;
        people.push({
          side, k, child, xf, x0: xf + side * D, arrive,
          h: child ? 66 : r.range(84, 110),
          dy: (k % 2 ? 10 : -4) + r.range(-3, 3),
          skin: skins[(k + (side > 0 ? 1 : 0)) % 3],
          coat: coats[r.int(0, 4)],
          hair: r.pick([P.ink, P.ink, P.inkSoft, P.inkFaint]),
          up: B_UP0 + Math.min(4, Math.round((k * 1.5) / 8 / 0.375)) * 0.375,
          seed: sd('p', side, k),
        });
      }
    }
    people.sort((a, b) => a.dy - b.dy);
    const hill = [];
    for (let x = -120; x <= 2040; x += 30) hill.push([x, hillY(x)]);
    hill.push([2040, 1200], [-120, 1200]);
    const far = [];
    for (let x = -120; x <= 2040; x += 40) far.push([x, 640 - 40 * Math.sin(x * 0.0021 + 1.2) - 18 * Math.sin(x * 0.007)]);
    far.push([2040, 1200], [-120, 1200]);
    const bright = [[310, 170], [760, 110], [1240, 230], [1560, 140]];
    GEO = { people, hill, far, bright };
    return GEO;
  }

  // figure at feet (x, y); dir +1 faces right; look 0..1 head tilted up; pose 0/1/2(stand)
  function figure(ctx, L, p, x, y, dir, look, pose, sil) {
    const h = p.h, ink = sil || P.ink;
    const hipY = y - 0.45 * h, shY = y - 0.76 * h;
    const spread = pose === 2 ? 0.05 : pose === 0 ? 0.16 : -0.16;
    const lean = -0.04 * look * dir * h;
    // legs
    L.inkLine(ctx, x + lean * 0.3, hipY, x + spread * h, y, { width: h * 0.075, color: ink, seed: p.seed + 1, taper: 0 });
    L.inkLine(ctx, x + lean * 0.3, hipY, x - spread * h, y, { width: h * 0.075, color: ink, seed: p.seed + 2, taper: 0 });
    // arms
    const sw = pose === 2 ? 0.04 : -spread * 0.8;
    L.inkLine(ctx, x + lean, shY + 4, x + lean + sw * h + dir * 0.03 * h, hipY + 0.06 * h, { width: h * 0.06, color: ink, seed: p.seed + 3, taper: 0 });
    // coat
    const coat = [[x + lean - 0.11 * h, shY], [x + lean + 0.11 * h, shY], [x + 0.14 * h, hipY + 0.07 * h], [x - 0.14 * h, hipY + 0.07 * h]];
    L.inkPath(ctx, coat, { closed: true, fill: sil || p.coat, width: sil ? 1 : 2.2, color: ink, seed: p.seed + 4, smooth: false });
    if (!sil) L.hatch(ctx, coat, { spacing: 4, width: 1, alpha: 0.55, seed: p.seed + 5, length: [6, 14], density: (px) => clamp((px - x) / (0.14 * h) * 0.8 + 0.2) });
    // head
    const hr = 0.11 * h;
    const hx = x + lean * 1.4 - dir * look * 0.02 * h, hy = shY - hr * 1.1;
    const fa = dir > 0 ? lerp(0, -1.05, look) : lerp(Math.PI, Math.PI + 1.05, look);
    L.inkPath(ctx, L.ellipsePts(hx, hy, hr, hr, 20), { closed: true, fill: sil || p.skin, width: sil ? 1 : 2, color: ink, seed: p.seed + 6 });
    if (!sil) {
      // hair cap on the back of the head
      ctx.save();
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.arc(hx, hy, hr + 0.5, fa + Math.PI * 0.45, fa + Math.PI * 1.45);
      ctx.closePath();
      ctx.fill();
      // nose and eye
      ctx.fillStyle = p.skin;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(fa - 0.35) * hr, hy + Math.sin(fa - 0.35) * hr);
      ctx.lineTo(hx + Math.cos(fa) * hr * 1.3, hy + Math.sin(fa) * hr * 1.3);
      ctx.lineTo(hx + Math.cos(fa + 0.3) * hr, hy + Math.sin(fa + 0.3) * hr);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      ctx.arc(hx + Math.cos(fa - 0.25) * hr * 0.55, hy + Math.sin(fa - 0.25) * hr * 0.55, Math.max(1.2, hr * 0.12), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function personAt(p, t) {
    const tt = Math.min(t, p.arrive);
    const v = (p.xf - p.x0) / (p.arrive - 0.1875);
    const dec = p.arrive - 0.375;
    const d = tt < dec ? v * tt : v * dec + v * (tt - dec) - (v * (tt - dec) * (tt - dec)) / (2 * 0.375);
    const x = t >= p.arrive ? p.xf : p.x0 + d;
    return x;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const g = geo();
      const z = lerp(1, 1.06, E.inOutSine(t / info.dur));

      L.camera(ctx, { x: 960, y: 560 - 20 / z, zoom: z }, (c) => {
        // 1. sky
        c.fillStyle = P.night;
        c.fillRect(-60, -60, 2040, 1200);
        // 2. stars
        L.stipple(c, null, { bounds: [-60, -60, 2040, 620], spacing: 26, r: [0.8, 2.0], color: P.white, alpha: 0.85, seed: sd('stars'), density: 0.55 });
        g.bright.forEach(([x, y], i) => {
          const tws = 0.7 + 0.3 * L.h3(Math.floor(tw / 0.75 + 1e-6), i, sd('tw'));
          const s = 14 * tws;
          c.save();
          c.strokeStyle = P.white;
          c.lineWidth = 2;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s);
          c.stroke();
          c.fillStyle = P.white;
          c.beginPath();
          c.arc(x, y, 3, 0, TAU);
          c.fill();
          c.restore();
        });
        // 3. far hills
        L.inkPath(c, g.far, { closed: true, fill: L.mix(P.dusk, P.night, 0.4), width: 2, color: P.ink, alpha: 0.6, seed: sd('far'), smooth: false });
        // 4. hill
        L.inkPath(c, g.hill, { closed: true, fill: L.mix(P.sage, P.night, 0.42), width: 2.8, seed: sd('hill'), smooth: false });
        L.hatch(c, g.hill, { spacing: 8, width: 1.4, color: P.inkSoft, alpha: 0.8, seed: sd('hh'), density: (x, y) => clamp(L.smoothstep(960, 1700, x) * 0.8 + L.smoothstep(700, 1000, y) * 0.6) });
        L.crossHatch(c, g.hill, { layers: 1, angle: -0.35, spacing: 7, width: 1.2, color: P.ink, alpha: 0.5, seed: sd('hc'), density: (x, y) => L.smoothstep(850, 1050, y) });
        // 5. annBlue dashed trails behind each line (fade after arrival)
        const fade = 1 - clamp((t - B_ALL) / 0.5);
        if (fade > 0) {
          for (const side of [-1, 1]) {
            const trail = g.people.filter((p) => p.side === side).reduce((m, p) => (side < 0 ? Math.min(m, personAt(p, tw)) : Math.max(m, personAt(p, tw))), side < 0 ? 1e9 : -1e9);
            const xs = side < 0 ? -40 : 1960;
            const pts = [];
            const n = 16;
            for (let i = 0; i <= n; i++) {
              const x = lerp(xs, trail - side * 30, i / n);
              pts.push([x, hillY(x) - 40]);
            }
            c.save();
            c.globalAlpha = fade;
            c.strokeStyle = P.annBlue;
            c.lineWidth = 2.5;
            c.setLineDash([14, 10]);
            c.beginPath();
            L.tracePath(c, pts, false);
            c.stroke();
            c.restore();
          }
        }
        // 6. people (on twos)
        g.people.forEach((p) => {
          const x = personAt(p, tw);
          const moving = tw < p.arrive;
          const pose = moving ? Math.floor(tw / 0.375 + 1e-6) % 2 : 2;
          const look = tw < p.up ? 0 : E.outBack(clamp((tw - p.up) / (4 * FR) + 0.25));
          const dir = moving ? p.side * -1 : (x < 960 ? 1 : -1) * (p.child ? -1 : 1);
          figure(c, L, p, x, hillY(x) + p.dy, dir, Math.min(1.05, look), pose, null);
        });
        // 7. ring around the crest group
        if (t >= B_RING) {
          const rp = (t - B_RING) / FR;
          const ex = E.outExpo(clamp((rp + 1) / 9));
          c.save();
          c.globalAlpha = 1 - clamp((rp - 12) / 6) * 0.6;
          c.strokeStyle = P.annYellow;
          c.lineWidth = 3;
          c.beginPath();
          c.ellipse(960, 545, lerp(330, 440, ex), lerp(110, 140, ex), 0, 0, TAU);
          c.stroke();
          c.restore();
        }
      });
    },
  });
})();
