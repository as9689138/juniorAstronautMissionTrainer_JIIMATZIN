/*
 * 23 perseverance — Perseverance on Mars
 * T 115.5 to 123.0 (local 0 to 7.5), illustrated (paper plate), hard cut in.
 *
 * Side view of the Mars 2020 rover (JPL proportions: six 52.5 cm wheels on rocker-bogie legs, white boxy
 * body, RTG at the rear, remote-sensing mast with camera head, robotic arm stowed at the front) crawling
 * 180 px to the right across marsSoil under a butterscotch marsSky, leaving twin tracks.
 *
 * Layers, back to front:
 *   1  marsSky (flat) with sparse marsDust haze hatching, small pale sun with one soft halo
 *   2  distant mesas on the horizon (parallax 0.3)
 *   3  ground: marsSoil, mid dunes hatched in marsShadow, regolith stipple, rocks
 *   4  twin tracks (far and near wheels), dust puffs on beats
 *   5  rover far-side wheels, rocker-bogie, body, deck, RTG, antenna, mast, arm, near wheels
 *   6  dark foreground (calm subtitle band)
 *   7  overlays: annBlue dashed tracks, annYellow ring on the mast camera at T 120.0
 *
 * Camera pans with the rover at 24 fps; the rover moves on twos.
 */
(function () {
  'use strict';
  const ID = 'perseverance';
  const FR = 1 / 24;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (L, ...k) => L.hash(ID, ...k) & 0x7fffffff;

  const B_MAST = 4.5; // T 120.0 the mast turns to the viewer
  const HORIZON = 520;
  const GY = 700; // ground line under the rover (world)
  const X0 = 1040, CRAWL = 180;
  const WR = 26; // wheel radius (0.525 m at 100 px/m)
  const HUBS = [118, -6, -124]; // front, middle, rear hub offsets
  const FAR = [12, -13]; // far-side offset

  function gY(x) {
    // gentle bumps the rocker-bogie rides over
    return GY + 4 * Math.sin(x * 0.021) + 3 * Math.sin(x * 0.057 + 1.3);
  }

  function roverX(t) {
    return X0 + CRAWL * (t / 7.5);
  }

  function rig(xc) {
    // hub positions follow the ground; body follows the average (rocker-bogie)
    const hubs = HUBS.map((o) => [xc + o, gY(xc + o) - WR]);
    const bogie = [(hubs[1][0] + hubs[2][0]) / 2, (hubs[1][1] + hubs[2][1]) / 2 - 40];
    const front = hubs[0];
    const bodyY = (front[1] + bogie[1] + 40) / 2 - 2; // nominal hub line
    const ang = Math.atan2(front[1] - (bogie[1] + 40), front[0] - bogie[0]) * 0.5;
    return { hubs, bogie, bodyY, ang };
  }

  function mesas(L) {
    const pts = [[-200, HORIZON]];
    const r = L.rng(sd(L, 'mesa'));
    let x = -200;
    while (x < 2400) {
      const w = r.range(120, 320), h = r.range(10, 60);
      pts.push([x + w * 0.15, HORIZON - h * r.range(0.3, 0.6)]);
      pts.push([x + w * 0.3, HORIZON - h]);
      pts.push([x + w * 0.62, HORIZON - h * r.range(0.85, 1)]);
      pts.push([x + w * 0.8, HORIZON - h * r.range(0.2, 0.5)]);
      x += w;
      pts.push([x, HORIZON - r.range(0, 6)]);
    }
    pts.push([2400, HORIZON + 4], [-200, HORIZON + 4]);
    return pts;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const camX = 960 + 130 * (t / info.dur);
      const xc = roverX(tw);
      const R = rig(xc);
      const ink = P.ink;

      // 1 sky
      ctx.fillStyle = P.marsSky;
      ctx.fillRect(0, 0, 1920, 1080);
      L.hatch(ctx, [[0, 0], [1920, 0], [1920, 300], [0, 300]], { angle: -0.08, spacing: 9, width: 1.3, color: P.marsDust, alpha: 0.55, length: [30, 90], density: (x, y) => clamp(1 - y / 300), seed: sd(L, 'sky') });
      L.hatch(ctx, [[0, 430], [1920, 430], [1920, 520], [0, 520]], { angle: -0.04, spacing: 10, width: 1.2, color: P.marsDust, alpha: 0.45, length: [40, 120], density: (x, y) => clamp((y - 430) / 90) * 0.7, seed: sd(L, 'haze') });
      {
        const sx = 430, sy = 190;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
        g.addColorStop(0, L.rgba(P.warmLight, 0.55));
        g.addColorStop(0.35, L.rgba(P.warmLight, 0.18));
        g.addColorStop(1, L.rgba(P.warmLight, 0));
        ctx.fillStyle = g;
        ctx.fillRect(sx - 120, sy - 120, 240, 240);
        L.inkCircle(ctx, sx, sy, 17, { width: 1.6, color: P.inkSoft, alpha: 0.6, fill: L.mix(P.sun, P.white, 0.6), seed: sd(L, 'sun') });
      }

      // 2 mesas, parallax
      ctx.save();
      ctx.translate(-(camX - 960) * 0.3, 0);
      const M = mesas(L);
      L.inkPath(ctx, M, { closed: true, width: 2.2, fill: P.marsDust, color: P.marsShadow, seed: sd(L, 'mesaL') });
      L.hatch(ctx, M, { angle: -Math.PI / 4, spacing: 7, width: 1.2, color: P.marsShadow, alpha: 0.6, length: [8, 24], density: (x, y) => (Math.sin(x * 0.03) > 0.1 ? 0.8 : 0.2), seed: sd(L, 'mesaH') });
      ctx.restore();

      L.camera(ctx, { x: camX, y: 540 }, () => {
        // 3 ground
        const G = [[0, HORIZON], [2400, HORIZON], [2400, 1200], [0, 1200]];
        ctx.fillStyle = P.marsSoil;
        ctx.fillRect(0, HORIZON, 2400, 700);
        // dunes (mid ground)
        const r = L.rng(sd(L, 'dunes'));
        for (let i = 0; i < 7; i++) {
          const cx = 150 + i * 330 + r.range(-60, 60), cy = r.range(560, 640), w = r.range(220, 380), h = r.range(26, 50);
          const top = [];
          for (let k = 0; k <= 16; k++) {
            const u = k / 16;
            top.push([cx - w / 2 + w * u, cy - h * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.4)]);
          }
          const dune = top.concat([[cx + w / 2, cy + 6], [cx - w / 2, cy + 6]]);
          L.inkPath(ctx, top, { width: 2, color: P.marsShadow, seed: sd(L, 'dl', i), taper: [30, 40] });
          L.hatch(ctx, dune, { angle: -Math.PI / 4, spacing: 7, width: 1.3, color: P.marsShadow, alpha: 0.75, length: [10, 30], density: (x) => clamp((x - (cx + w * 0.05)) / (w * 0.2)), seed: sd(L, 'dh', i) });
          L.inkPath(ctx, top.slice(2, 9), { width: 1.6, color: P.marsDust, alpha: 0.9, seed: sd(L, 'dlit', i), taper: [20, 30] });
        }
        L.stipple(ctx, null, { bounds: { x: 0, y: 540, w: 2400, h: 340 }, spacing: 16, r: [1, 2.2], color: P.marsShadow, alpha: 0.7, density: (x, y) => 0.35 + 0.4 * clamp((y - 540) / 300), seed: sd(L, 'regolith') });
        L.stipple(ctx, null, { bounds: { x: 0, y: 560, w: 2400, h: 300 }, spacing: 22, r: [1, 1.8], color: P.marsDust, alpha: 0.8, density: 0.4, seed: sd(L, 'regolith2') });
        // rocks
        const rr = L.rng(sd(L, 'rocks'));
        for (let i = 0; i < 26; i++) {
          const x = rr.range(80, 2300), y = rr.range(600, 840);
          if (Math.abs(y - GY) < 26 && x > 600) continue;
          const s = lerp(5, 22, (y - 600) / 240) * rr.range(0.6, 1.3);
          const pts = [];
          for (let k = 0; k < 7; k++) {
            const q = Math.PI + (k / 6) * Math.PI;
            pts.push([x + Math.cos(q) * s * rr.range(0.8, 1.2), y + Math.sin(q) * s * 0.75 * rr.range(0.7, 1.1)]);
          }
          L.inkPath(ctx, pts, { closed: true, width: 1.8, fill: P.marsSoil, color: ink, seed: sd(L, 'rk', i) });
          L.hatch(ctx, pts, { angle: -Math.PI / 4, spacing: 4, width: 1.1, color: P.marsShadow, alpha: 0.9, length: [4, 10], density: (px) => (px > x - s * 0.1 ? 1 : 0), seed: sd(L, 'rkh', i) });
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = P.marsShadow;
          ctx.beginPath();
          ctx.ellipse(x + s * 0.5, y + 1, s * 0.9, s * 0.18, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        // 4 twin tracks: far wheels then near wheels, from the left edge to the rear wheel
        const rearX = xc + HUBS[2];
        const track = (dy, dx, alpha, seed) => {
          const pts = [];
          for (let x = 300; x <= rearX + dx; x += 12) pts.push([x, gY(x) + dy]);
          if (pts.length < 2) return;
          const band = pts.map((p) => [p[0], p[1] - 3]).concat(pts.slice().reverse().map((p) => [p[0], p[1] + 5]));
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = P.marsShadow;
          ctx.beginPath();
          L.tracePath(ctx, band, true);
          ctx.fill();
          ctx.strokeStyle = P.marsDust;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let x = 300 + ((seed * 7) % 9); x <= rearX + dx; x += 9) {
            const y = gY(x) + dy;
            ctx.moveTo(x - 3, y - 2);
            ctx.lineTo(x + 1, y + 4);
          }
          ctx.stroke();
          ctx.restore();
        };
        track(FAR[1] + 2, FAR[0], 0.55, 1);
        track(3, 0, 0.8, 2);

        // dust puffs kicked up on each beat behind the rear wheel
        for (let b = 0; b < 10; b++) {
          const tb = b * 0.75;
          if (tw < tb) break;
          const age = tw - tb;
          if (age > 1.4) continue;
          const u = age / 1.4;
          const px = roverX(tb) + HUBS[2] - 20 - u * 40, py = GY - 14 - u * 26;
          L.stipple(ctx, L.ellipsePts(px, py, 14 + u * 30, 8 + u * 14, 16), { spacing: 6, r: [1, 2], color: P.marsDust, alpha: 0.9 * (1 - u), density: 0.7, seed: sd(L, 'puff', b) });
        }

        // 5 the rover
        drawRover(ctx, L, P, xc, R, tw, t);
      });

      // 6 dark foreground (subtitle band)
      L.hatch(ctx, [[0, 820], [1920, 820], [1920, 1080], [0, 1080]], { angle: -Math.PI / 4, spacing: 6, width: 1.4, color: P.marsShadow, alpha: 0.85, density: (x, y) => clamp((y - 820) / 80), seed: sd(L, 'fg') });
      ctx.save();
      ctx.fillStyle = P.marsShadow;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, 880);
      for (let x = 0; x <= 1920; x += 40) ctx.lineTo(x, 872 + 8 * Math.sin(x * 0.009 + 1));
      ctx.lineTo(1920, 1080);
      ctx.lineTo(0, 1080);
      ctx.fill();
      ctx.restore();

      // 7 overlays
      L.camera(ctx, { x: camX, y: 540 }, () => {
        const rearX = xc + HUBS[2];
        ctx.save();
        ctx.strokeStyle = P.annBlue;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.lineCap = 'round';
        for (const [dy, dx] of [[16, 0], [FAR[1] - 10, FAR[0]]]) {
          ctx.beginPath();
          for (let x = 320; x <= rearX + dx - 30; x += 12) {
            const y = gY(x) + dy;
            if (x === 320) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
        const e = t < B_MAST ? 0 : E.outExpo(clamp((t - B_MAST) / (12 * FR) + 1 / 12));
        if (e > 0 && t < B_MAST + 13 * FR) {
          const head = mastHead(R, xc);
          ctx.save();
          ctx.strokeStyle = P.annYellow;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1 - clamp((t - B_MAST) / (12 * FR));
          ctx.beginPath();
          ctx.arc(head[0], head[1], 30 + 70 * e, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      });
    },
  });

  // ---------------------------------------------------------------- rover parts
  function bodyFrame(R, xc) {
    return { x: xc, y: R.bodyY - 70, a: R.ang };
  }
  function mastHead(R, xc) {
    const f = bodyFrame(R, xc);
    const lx = 86, ly = -206;
    const c = Math.cos(f.a), s = Math.sin(f.a);
    return [f.x + lx * c - ly * s, f.y + lx * s + ly * c];
  }

  function wheel(ctx, L, P, x, y, rot, seed, far) {
    const col = far ? L.mix(P.rocketBlack, P.marsShadow, 0.4) : P.rocketBlack;
    L.inkCircle(ctx, x, y, WR, { width: 2.8, fill: col, seed });
    // grousers around the rim
    ctx.save();
    ctx.strokeStyle = far ? P.marsShadow : P.hoseGrey;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const q = rot + (i / 18) * TAU;
      ctx.moveTo(x + Math.cos(q) * (WR - 5), y + Math.sin(q) * (WR - 5));
      ctx.lineTo(x + Math.cos(q) * (WR - 1), y + Math.sin(q) * (WR - 1));
    }
    ctx.stroke();
    // curved spokes
    ctx.strokeStyle = far ? P.marsShadow : P.eagleSilver;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const q = rot + (i / 6) * TAU;
      ctx.moveTo(x + Math.cos(q) * 6, y + Math.sin(q) * 6);
      ctx.quadraticCurveTo(x + Math.cos(q + 0.5) * 14, y + Math.sin(q + 0.5) * 14, x + Math.cos(q + 0.35) * (WR - 6), y + Math.sin(q + 0.35) * (WR - 6));
    }
    ctx.stroke();
    ctx.restore();
    L.inkCircle(ctx, x, y, 7, { width: 1.6, fill: far ? P.marsShadow : P.hoseGrey, seed: seed + 1 });
  }

  function legs(ctx, L, P, R, xc, dx, dy, far, seed) {
    const f = bodyFrame(R, xc);
    const H = R.hubs.map((h) => [h[0] + dx, h[1] + dy]);
    const piv = [xc + 6 + dx, f.y + 48 + dy];
    const bog = [R.bogie[0] + dx, R.bogie[1] + dy];
    const col = far ? P.marsShadow : P.eagleSilver;
    const o = { width: far ? 5 : 6.5, color: far ? P.marsShadow : P.ink, seed };
    // rocker: pivot -> forward knee -> front hub; pivot -> bogie pivot
    const knee = [H[0][0] - 22, piv[1] - 4];
    const pathR = [H[0], knee, piv, bog];
    L.inkPath(ctx, pathR, Object.assign({}, o, { smooth: false, taper: [4, 4] }));
    L.inkPath(ctx, pathR, { width: far ? 2 : 2.6, color: col, seed: seed + 1, smooth: false, taper: [4, 4] });
    const pathB = [H[1], bog, H[2]];
    L.inkPath(ctx, pathB, Object.assign({}, o, { smooth: false, taper: [4, 4], seed: seed + 2 }));
    L.inkPath(ctx, pathB, { width: far ? 2 : 2.6, color: col, seed: seed + 3, smooth: false, taper: [4, 4] });
    L.inkCircle(ctx, piv[0], piv[1], 6, { width: 1.6, fill: col, seed: seed + 4 });
    L.inkCircle(ctx, bog[0], bog[1], 5, { width: 1.6, fill: col, seed: seed + 5 });
    // steering actuators above the corner wheels
    for (const i of [0, 2]) {
      L.inkPath(ctx, L.rectPts(H[i][0] - 7, H[i][1] - WR - 16, 14, 14, 6), { closed: true, width: 1.6, fill: far ? P.marsShadow : P.hoseGrey, seed: seed + 10 + i });
    }
  }

  function drawRover(ctx, L, P, xc, R, tw, t) {
    const k = sd(L, 'rover');
    const rot = (xc - X0) / WR;
    // far side
    for (let i = 0; i < 3; i++) wheel(ctx, L, P, R.hubs[i][0] + FAR[0], R.hubs[i][1] + FAR[1], rot + i, k + 10 + i, true);
    legs(ctx, L, P, R, xc, FAR[0], FAR[1], true, k + 20);

    const f = bodyFrame(R, xc);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.a);
    const ha = -Math.PI / 4 - f.a;
    // RTG at the rear, tilted, with fins
    const rtg = [[-128, -10], [-176, -64], [-160, -80], [-112, -26]];
    L.inkPath(ctx, rtg, { closed: true, width: 2.6, fill: P.hoseGrey, seed: k + 30, smooth: false });
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const u = 0.1 + i * 0.13;
      const ax = lerp(-128, -176, u), ay = lerp(-10, -64, u);
      ctx.moveTo(ax - 6, ay - 6 + 10);
      ctx.lineTo(ax + 28, ay - 22 + 10);
    }
    ctx.stroke();
    ctx.restore();
    L.hatch(ctx, [[-120, -18], [-168, -72], [-160, -80], [-112, -26]], { angle: ha, spacing: 5, width: 1.2, alpha: 0.7, seed: k + 31 });
    // body: white box
    const body = L.rectPts(-132, -54, 258, 50, 20);
    L.inkPath(ctx, body, { closed: true, width: 4.5, fill: P.rocketWhite, seed: k + 32, double: { alpha: 0.4 } });
    L.hatch(ctx, [[-132, -22], [126, -22], [126, -4], [-132, -4]], { angle: ha, spacing: 8, width: 1.3, color: P.inkSoft, alpha: 0.7, seed: k + 33 });
    L.hatch(ctx, [[96, -54], [126, -54], [126, -4], [96, -4]], { angle: ha, spacing: 6, width: 1.3, color: P.inkSoft, alpha: 0.7, seed: k + 34 });
    for (const x of [-60, 20, 96]) L.inkLine(ctx, x, -50, x, -8, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: k + 35 + x });
    L.inkLine(ctx, -128, -30, 122, -30, { width: 1.4, color: P.inkSoft, alpha: 0.6, seed: k + 36 });
    // deck plate and calibration target / small boxes
    L.inkPath(ctx, L.rectPts(-136, -62, 266, 9, 20), { closed: true, width: 2.6, fill: P.eagleSilver, seed: k + 37 });
    L.inkPath(ctx, L.rectPts(-40, -82, 48, 20, 12), { closed: true, width: 2.2, fill: P.rocketWhite, seed: k + 38 });
    L.inkPath(ctx, L.rectPts(-96, -76, 30, 14, 10), { closed: true, width: 2, fill: P.eagleGold, seed: k + 39 });
    // high-gain antenna: hexagonal disk on a post
    L.inkLine(ctx, 30, -62, 30, -94, { width: 3, seed: k + 40 });
    L.inkPath(ctx, L.ellipsePts(30, -100, 30, 8, 6, 0.12), { closed: true, width: 2.4, fill: P.hoseGrey, seed: k + 41 });
    // UHF antenna
    L.inkLine(ctx, -10, -82, -10, -110, { width: 2, seed: k + 42 });
    L.inkCircle(ctx, -10, -112, 4, { width: 1.4, fill: P.rocketWhite, seed: k + 43 });
    // mast
    L.inkPath(ctx, L.rectPts(80, -184, 12, 122, 20), { closed: true, width: 3, fill: P.rocketWhite, seed: k + 44 });
    L.hatch(ctx, [[86, -184], [92, -184], [92, -62], [86, -62]], { angle: ha, spacing: 5, width: 1.1, color: P.inkSoft, alpha: 0.7, seed: k + 45 });
    L.inkPath(ctx, L.rectPts(76, -150, 20, 12, 8), { closed: true, width: 2, fill: P.eagleSilver, seed: k + 46 });
    // head: yaw 0 profile facing right, 1 facing the viewer (turns at T 120.0, on twos)
    const yaw = tw < B_MAST ? 0 : L.ease.outBack(clamp((tw - B_MAST) / (8 * FR) + 1 / 8));
    const hx = 86, hy = -206;
    const fw = lerp(10, 50, yaw), sw = lerp(46, 14, clamp(yaw));
    const x0 = hx - (fw + sw) / 2;
    // side face then front face
    const sideX = yaw < 0.5 ? x0 : x0 + fw;
    const frontX = yaw < 0.5 ? x0 + sw : x0;
    L.inkPath(ctx, L.rectPts(sideX, hy - 16, sw, 30, 10), { closed: true, width: 3, fill: P.rocketWhite, seed: k + 47 });
    L.hatch(ctx, L.rectPts(sideX, hy - 16, sw, 30, 10), { angle: ha, spacing: 5, width: 1.2, color: P.inkSoft, alpha: 0.6, seed: k + 48 });
    L.inkPath(ctx, L.rectPts(frontX, hy - 16, fw, 30, 10), { closed: true, width: 3, fill: P.eagleSilver, seed: k + 49 });
    // lenses: SuperCam big eye and the two Mastcam-Z eyes, on the front face
    const lc = frontX + fw / 2;
    L.inkPath(ctx, L.ellipsePts(lc, hy - 4, Math.max(2, fw * 0.22), 8, 16), { closed: true, width: 1.8, fill: P.rocketBlack, seed: k + 50 });
    L.inkPath(ctx, L.ellipsePts(lc - fw * 0.32, hy + 8, Math.max(1.5, fw * 0.1), 4, 12), { closed: true, width: 1.4, fill: P.rocketBlack, seed: k + 51 });
    L.inkPath(ctx, L.ellipsePts(lc + fw * 0.32, hy + 8, Math.max(1.5, fw * 0.1), 4, 12), { closed: true, width: 1.4, fill: P.rocketBlack, seed: k + 52 });
    if (yaw > 0.3) L.inkCircle(ctx, lc - fw * 0.07, hy - 7, 2, { width: 0.8, color: P.white, fill: P.white, seed: k + 53, boil: false });
    // robotic arm stowed at the front: shoulder, two links, turret with drill
    L.inkPath(ctx, [[126, -40], [150, -54], [168, -22]], { width: 7, seed: k + 60, smooth: false, taper: [3, 3] });
    L.inkPath(ctx, [[126, -40], [150, -54], [168, -22]], { width: 3, color: P.rocketWhite, seed: k + 61, smooth: false, taper: [3, 3] });
    L.inkCircle(ctx, 150, -54, 5, { width: 1.6, fill: P.eagleSilver, seed: k + 62 });
    L.inkPath(ctx, L.rrectPts(156, -24, 28, 26, 6, 8), { closed: true, width: 2.6, fill: P.eagleSilver, seed: k + 63 });
    L.hatch(ctx, L.rrectPts(170, -24, 14, 26, 4, 8), { angle: ha, spacing: 4, width: 1.1, alpha: 0.7, seed: k + 64 });
    L.inkLine(ctx, 170, 2, 170, 20, { width: 3, seed: k + 65 });
    ctx.restore();

    // near side legs and wheels
    legs(ctx, L, P, R, xc, 0, 0, false, k + 70);
    for (let i = 0; i < 3; i++) {
      wheel(ctx, L, P, R.hubs[i][0], R.hubs[i][1], rot + i, k + 80 + i, false);
      L.hatch(ctx, L.ellipsePts(R.hubs[i][0] + 6, R.hubs[i][1] + 6, WR - 4, WR - 4, 20), { angle: -Math.PI / 4, spacing: 5, width: 1.1, color: P.ink, alpha: 0.6, length: [4, 12], density: (x, y) => (x + y > R.hubs[i][0] + R.hubs[i][1] + 8 ? 1 : 0), seed: k + 90 + i });
    }
    // contact shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = P.marsShadow;
    ctx.beginPath();
    ctx.ellipse(xc + 10, GY + 4, 180, 7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
})();
