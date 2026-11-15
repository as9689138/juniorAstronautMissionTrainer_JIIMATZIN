/*
 * 20 reflejo-en-el-visor : The sun in the visor
 * Global T 96 to 102 (6 s, 8 beats), illustrated, hard cut in from 19 (G4 match cut).
 *
 * Layers, back to front:
 *   1. deep space (spaceInk) with sparse stipple stars (screen-fixed)
 *   -- push 1.0 to 1.08 scaled about the G4 centre (960, 400), so the sun never leaves its pixels --
 *   2. suit collar and shoulders (suitBeige, gold trim), dark and hatched in the subtitle band
 *   3. corrugated air hose behind the helmet, lower right
 *   4. helmet shell (helmetGold): contour hatching on the lower-right shadow, pale lit edge upper left
 *   5. side lamps, top seam, zigzag antenna with ball (top right)
 *   6. visor ring (helmetGoldDeep) with bolts
 *   7. visor disc (visorBlack): reflected stars, reflected G4 sun (flame / flameCore) with granulation,
 *      the double outline echoed at r 150 / 141, prominence loops dancing on twos, wave rings on every beat
 *   8. visor glints: one long and one short streak at upper left; the sweep at T 99.75
 *   9. overlay: annYellow arc annotation riding a wave
 */
(function () {
  'use strict';
  const ID = 'reflejo-en-el-visor';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const BEAT = 0.75;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // G4 (storyboard Shared geometry): the sun disc, same pixels as 19 at frame 0.
  const SX = 960, SY = 400, SR = 150, SR_IN = 141;
  // Helmet (art bible 10.1), close-up
  const HX = 960, HY = 520, HR = 470;
  const VX = 960, VY = 440, VR = 330;      // visor: round black disc, 70 percent of the front
  const RING = 30;                          // gold ring width around the visor opening

  const B_ARC = 0.75;  // T 96.75 annotation draws on
  const B_SWEEP = 3.75; // T 99.75 glint sweeps across the visor

  // the same prominence arcade layout as 19 (shot ids differ, geometry is shared)
  const LOOPS = [
    { a: -136 * DEG, d: 17 * DEG, h: 60, n: 4 },
    { a: -64 * DEG, d: 21 * DEG, h: 78, n: 5 },
    { a: -6 * DEG, d: 12 * DEG, h: 40, n: 3 },
    { a: 38 * DEG, d: 19 * DEG, h: 66, n: 4 },
    { a: 100 * DEG, d: 12 * DEG, h: 38, n: 3 },
    { a: 152 * DEG, d: 20 * DEG, h: 72, n: 5 },
    { a: 202 * DEG, d: 11 * DEG, h: 44, n: 3 },
  ];

  const ANT_ROOT = [HX + Math.cos(-35 * DEG) * HR, HY + Math.sin(-35 * DEG) * HR];
  const ANT_END = [1615, 61];

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const helmet = L.ellipsePts(HX, HY, HR, HR, 160);
    const visor = L.ellipsePts(VX, VY, VR, VR, 140);
    const ringOuter = L.ellipsePts(VX, VY, VR + RING, VR + RING, 150);
    // antenna: 3 zigs from root to end
    const ant = [ANT_ROOT];
    const dx = ANT_END[0] - ANT_ROOT[0], dy = ANT_END[1] - ANT_ROOT[1];
    const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const zig = [0.18, 0.36, 0.54, 0.72, 0.88];
    zig.forEach((u, i) => ant.push([ANT_ROOT[0] + dx * u + nx * (i % 2 ? -34 : 34), ANT_ROOT[1] + dy * u + ny * (i % 2 ? -34 : 34)]));
    ant.push(ANT_END);
    // shadow crescent mask: inside helmet, outside the lit circle shifted up-left
    const lit = { x: HX - 120, y: HY - 135, r: HR - 20 };
    // hose path (behind the helmet): from behind the right side down to the hip, off frame
    const hose = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = lerp(1250, 1560, u) + Math.sin(u * Math.PI) * 120;
      const y = lerp(820, 1110, u) - Math.sin(u * Math.PI) * 30;
      hose.push([x, y]);
    }
    const collar = [];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      collar.push([HX + Math.cos(a) * 300, 1000 + Math.sin(a) * 60]);
    }
    const r = L.rng(sd('vstars'));
    const vstars = [];
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * (VR - 6);
      const x = VX + Math.cos(a) * rr, y = VY + Math.sin(a) * rr;
      if (Math.hypot(x - SX, y - SY) < SR + 30) continue;
      vstars.push([x, y, r.range(0.8, 2.2), r.int(0, 999)]);
    }
    const bolts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 15 * DEG;
      bolts.push([VX + Math.cos(a) * (VR + RING / 2), VY + Math.sin(a) * (VR + RING / 2)]);
    }
    GEO = { helmet, visor, ringOuter, ant, lit, hose, collar, vstars, bolts };
    return GEO;
  }

  function strokePts(ctx, pts, color, alpha, width, closed) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    LIB.tracePath(ctx, pts, !!closed);
    ctx.stroke();
    ctx.restore();
  }
  function arcStroke(ctx, x, y, r, color, alpha, width, a0 = 0, a1 = TAU) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
    ctx.restore();
  }
  function loopPts(a, d, h, k, nStr, grow) {
    const pts = [];
    const mid = (nStr - 1) / 2;
    const off = (k - mid) * 0.04;
    const dd = d * (1 - Math.abs(k - mid) * 0.12);
    const hh = h * (1 - Math.abs(k - mid) * 0.2) * grow;
    const lean = 0.18 * Math.sin(a * 3.1 + 0.7);
    for (let i = 0; i <= 36; i++) {
      const u = i / 36;
      const s = Math.sin(Math.PI * u);
      const ang = a + off - dd + 2 * dd * u + lean * dd * s * s;
      const rr = SR + hh * Math.pow(s, 0.85);
      pts.push([SX + Math.cos(ang) * rr, SY + Math.sin(ang) * rr]);
    }
    return pts;
  }
  function waveRingPts(R, amp, phase) {
    const pts = [];
    const n = Math.max(90, Math.round(R * 0.9));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = R + amp * (0.85 * Math.sin(24 * a + phase) + 0.2 * Math.sin(9 * a - phase * 1.3));
      pts.push([SX + Math.cos(a) * rr, SY + Math.sin(a) * rr]);
    }
    return pts;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const G = geo(L);
      const hit = (a, frames, e, lead = 1) =>
        t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames));

      // 1. deep space
      ctx.fillStyle = P.spaceInk;
      ctx.fillRect(0, 0, 1920, 1080);
      L.stipple(ctx, null, { bounds: [0, 0, 1920, 840], spacing: 60, r: [0.8, 1.8], color: P.white, alpha: 0.55, seed: sd('sky') % 9999 });

      // push about the sun centre (24 fps, whole shot)
      const z = 1 + 0.08 * E.inOutSine(t / info.dur);
      ctx.save();
      ctx.translate(SX, SY);
      ctx.scale(z, z);
      ctx.translate(-SX, -SY);

      // 2. suit collar and shoulders
      const shoulders = [[420, 1140], [470, 1030], [620, 975], [1300, 975], [1450, 1030], [1500, 1140]];
      L.inkPath(ctx, shoulders, { closed: true, width: 2.8, fill: P.suitShade, seed: sd('sh') });
      L.crossHatch(ctx, shoulders, { tone: 0.7, spacing: 7, color: P.ink, alpha: 0.55, seed: sd('shh') % 9999 });
      L.inkPath(ctx, G.collar.concat([[HX + 300, 1060], [HX - 300, 1060]]), { closed: true, width: 2.8, fill: P.helmetGoldDeep, seed: sd('col') });
      L.hatch(ctx, G.collar.concat([[HX + 300, 1060], [HX - 300, 1060]]), { spacing: 6, color: P.ink, alpha: 0.6, seed: sd('colh') % 9999 });

      // 3. air hose behind the helmet
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 62;
      ctx.beginPath(); L.tracePath(ctx, G.hose, false); ctx.stroke();
      ctx.strokeStyle = P.hoseGrey;
      ctx.lineWidth = 54;
      ctx.beginPath(); L.tracePath(ctx, G.hose, false); ctx.stroke();
      // rings every 8 px, darker on the lower side
      ctx.strokeStyle = P.ink;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let acc = 0;
      for (let i = 1; i < G.hose.length; i++) {
        const [x0, y0] = G.hose[i - 1], [x1, y1] = G.hose[i];
        const sl = Math.hypot(x1 - x0, y1 - y0);
        const tx = (x1 - x0) / sl, ty = (y1 - y0) / sl;
        for (let s = 0; s < sl; s++) {
          acc++;
          if (acc % 8) continue;
          const px = x0 + tx * s, py = y0 + ty * s;
          ctx.moveTo(px - ty * 26, py + tx * 26);
          ctx.quadraticCurveTo(px + tx * 4, py + ty * 4, px + ty * 26, py - tx * 26);
        }
      }
      ctx.stroke();
      ctx.restore();

      // 4. helmet shell
      L.inkPath(ctx, G.helmet, { closed: true, width: 4.5, fill: P.helmetGold, seed: sd('helm'), double: true });
      const lit = G.lit;
      const shade = (x, y) => clamp((Math.hypot(x - lit.x, y - lit.y) - lit.r + 40) / 170);
      // contour hatching that follows the limb: concentric arcs on the shadow side
      ctx.save();
      ctx.beginPath(); L.tracePath(ctx, G.helmet, true); ctx.clip();
      const rr = L.rng(sd('contour', bi % 3));
      ctx.strokeStyle = P.helmetGoldDeep;
      ctx.lineCap = 'round';
      for (let k = 0; k < 26; k++) {
        const r = HR - 6 - k * 7 * (1 + rr.range(-0.15, 0.15));
        const depth = 1 - k / 26;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.5;
        // strokes along the arc, broken into dashes, where the shade field is dark enough
        ctx.beginPath();
        for (let a = -60 * DEG; a < 170 * DEG; a += 0.06) {
          const x = HX + Math.cos(a) * r, y = HY + Math.sin(a) * r;
          if (shade(x, y) < 0.25 + 0.7 * (1 - depth) * rr()) continue;
          const a1 = a + 0.035 + rr() * 0.03;
          const r2 = r + rr.range(-1, 1);
          ctx.moveTo(HX + Math.cos(a) * r2, HY + Math.sin(a) * r2);
          ctx.arc(HX, HY, r2, a, a1);
        }
        ctx.stroke();
      }
      ctx.restore();
      L.crossHatch(ctx, G.helmet, {
        tone: 0.8, spacing: 6, color: P.ink, alpha: 0.5, seed: sd('hx') % 9999,
        density: (x, y) => clamp(shade(x, y) * 1.4 - 0.55) + (y > 860 ? 0.35 : 0),
      });
      // pale lit edge, upper left
      L.inkPath(ctx, (() => { const p = []; for (let a = 160; a <= 255; a += 3) p.push([HX + Math.cos(a * DEG) * (HR - 22), HY + Math.sin(a * DEG) * (HR - 22)]); return p; })(),
        { width: 12, color: P.helmetGoldPale, seed: sd('pale'), taper: [60, 60] });
      L.inkPath(ctx, (() => { const p = []; for (let a = 200; a <= 230; a += 3) p.push([HX + Math.cos(a * DEG) * (HR - 44), HY + Math.sin(a * DEG) * (HR - 44)]); return p; })(),
        { width: 6, color: P.white, alpha: 0.8, seed: sd('pale2'), taper: [20, 20] });

      // 5. side lamps, top seam, antenna
      for (const s of [-1, 1]) {
        const lx = HX + s * (HR - 46), ly = HY + 70;
        L.inkCircle(ctx, lx, ly, 34, { width: 2.8, fill: P.helmetGoldDeep, seed: sd('lamp', s) });
        L.inkCircle(ctx, lx, ly, 18, { width: 1.6, fill: s < 0 ? P.helmetGoldPale : P.suitShade, seed: sd('lampi', s) });
      }
      const seam = [];
      for (let a = -150; a <= -30; a += 4) seam.push([VX + Math.cos(a * DEG) * (VR + RING + 26), VY + Math.sin(a * DEG) * (VR + RING + 26)]);
      L.inkPath(ctx, seam, { width: 1.6, color: P.inkSoft, alpha: 0.9, seed: sd('seam') });
      for (let a = -140; a <= -40; a += 20) {
        const x = VX + Math.cos(a * DEG) * (VR + RING + 26), y = VY + Math.sin(a * DEG) * (VR + RING + 26);
        L.inkCircle(ctx, x, y, 4, { width: 1.4, fill: P.helmetGoldDeep, seed: sd('rv', a) });
      }
      // antenna mount and zigzag
      L.inkPath(ctx, L.rrectPts(ANT_ROOT[0] - 22, ANT_ROOT[1] - 14, 44, 28, 8, 6), { closed: true, width: 2.8, fill: P.helmetGoldDeep, seed: sd('mount') });
      const antWave = Math.sin(tw * 5) * 3;
      const antPts = G.ant.map(([x, y], i) => [x + antWave * (i / G.ant.length), y]);
      L.inkPath(ctx, antPts, { width: 7, smooth: false, seed: sd('ant'), taper: [2, 6] });
      L.inkCircle(ctx, antPts[antPts.length - 1][0], antPts[antPts.length - 1][1], 13, { width: 2.8, fill: P.helmetGold, seed: sd('ball') });

      // 6. visor ring with bolts
      L.inkPath(ctx, G.ringOuter, { closed: true, width: 2.8, fill: P.helmetGoldDeep, seed: sd('ring') });
      L.hatch(ctx, G.ringOuter, { spacing: 7, color: P.ink, alpha: 0.5, seed: sd('ringh') % 9999,
        density: (x, y) => clamp(((x - VX) + (y - VY)) / (VR * 1.2) + 0.2) });
      for (const [bx, by] of G.bolts) L.inkCircle(ctx, bx, by, 5, { width: 1.4, fill: P.helmetGoldPale, seed: sd('b', bx | 0) });

      // 7. visor disc and its reflection
      ctx.save();
      ctx.fillStyle = P.visorBlack;
      ctx.beginPath(); L.tracePath(ctx, G.visor, true); ctx.fill();
      ctx.clip();
      // reflected stars
      ctx.fillStyle = P.visorGlint;
      for (const [x, y, r, ph] of G.vstars) {
        ctx.globalAlpha = 0.35 + 0.35 * (0.5 + 0.5 * LIB.noise1(bi * 0.4 + ph, 3));
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // one soft halo for the sun
      const halo = ctx.createRadialGradient(SX, SY, SR * 0.9, SX, SY, SR * 2.1);
      halo.addColorStop(0, LIB.rgba(P.flame, 0.38));
      halo.addColorStop(0.4, LIB.rgba(P.flame, 0.12));
      halo.addColorStop(1, LIB.rgba(P.flame, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(SX - SR * 2.2, SY - SR * 2.2, SR * 4.4, SR * 4.4);
      // wave rings on every beat (24 fps), sun-coloured, rippling out to the visor edge
      for (let k = -3; k <= 8; k++) {
        const age = t - k * BEAT + FR;
        if (age <= 0 || age > 2.4) continue;
        const u = age / 2.4;
        const R = SR + 4 + 230 * E.outCubic(u);
        strokePts(ctx, waveRingPts(R, lerp(2, 6, Math.min(1, u * 2.5)), t * 2.2 + k * 1.7), P.sun, Math.pow(1 - u, 1.4) * 0.9, u < 0.2 ? 2.5 : 1.8, true);
        if (u > 0.06) strokePts(ctx, waveRingPts(R - 14 - 16 * u, 4, t * 2.2 + k * 1.7 + 0.9), P.flame, Math.pow(1 - u, 1.4) * 0.45, 1.2, true);
      }
      // prominence loops, dancing on twos
      for (let li = 0; li < LOOPS.length; li++) {
        const lp = LOOPS[li];
        const g = 1 + 0.1 * Math.sin(tw * 4.2 + li * 1.3);
        for (let k = 0; k < lp.n; k++) {
          const outer = Math.abs(k - (lp.n - 1) / 2) < 0.6;
          strokePts(ctx, loopPts(lp.a, lp.d, lp.h, k, lp.n, g), outer ? P.flameCore : P.flame, outer ? 0.95 : 0.7, outer ? 3 : 1.8);
        }
      }
      // the disc
      ctx.fillStyle = P.flame;
      ctx.beginPath(); ctx.arc(SX, SY, SR, 0, TAU); ctx.fill();
      const discClip = (c) => c.arc(SX, SY, SR_IN, 0, TAU);
      L.stipple(ctx, discClip, {
        bounds: [SX - SR, SY - SR, SR * 2, SR * 2], spacing: 6, r: [1, 2.6], color: P.flameCore, alpha: 0.9, seed: sd('gran') % 9999,
        density: (x, y) => clamp(1 - Math.hypot(x - SX, y - SY) / SR_IN * 0.85 + 0.25 * LIB.noise2(x * 0.03, y * 0.03 + tw * 0.4, 5)),
      });
      L.hexLattice(ctx, discClip, { r: 17, color: P.sun, alpha: 0.35, seed: sd('hex') % 9999, bounds: [SX - SR, SY - SR, SR * 2, SR * 2] });
      // the double outline echoes 19's lavender pair on the same radii
      arcStroke(ctx, SX, SY, SR, P.flameCore, 0.95, 2.5);
      arcStroke(ctx, SX, SY, SR_IN, P.sun, 0.7, 1.5);
      // curved reflection of the helmet ring at the visor edge
      arcStroke(ctx, VX, VY, VR - 16, P.helmetGoldDeep, 0.35, 6, 20 * DEG, 160 * DEG);
      // 8. glints: long and short streaks, upper left
      ctx.restore();
      const glint = (a0, a1, r, w, seed) => {
        const p = [];
        for (let a = a0; a <= a1; a += 2) p.push([VX + Math.cos(a * DEG) * r, VY + Math.sin(a * DEG) * r]);
        L.inkPath(ctx, p, { width: w, color: P.visorGlint, seed, taper: [30, 30], boilAmp: 0.4 });
      };
      glint(196, 238, VR - 44, 16, sd('g1'));
      glint(246, 258, VR - 44, 12, sd('g2'));
      // the sweep: a soft diagonal sheen crossing the visor in 14 frames
      if (t >= B_SWEEP - FR) {
        const u = hit(B_SWEEP, 14, E.inOutCubic);
        if (u < 1) {
          ctx.save();
          ctx.beginPath(); L.tracePath(ctx, G.visor, true); ctx.clip();
          const cx = lerp(VX - VR - 120, VX + VR + 120, u);
          ctx.translate(cx, VY);
          ctx.rotate(22 * DEG);
          ctx.globalAlpha = 0.5 * Math.sin(Math.PI * u);
          ctx.fillStyle = P.visorGlint;
          ctx.fillRect(-26, -VR - 80, 52, VR * 2 + 160);
          ctx.globalAlpha *= 0.6;
          ctx.fillRect(40, -VR - 80, 14, VR * 2 + 160);
          ctx.restore();
        }
      }
      L.inkPath(ctx, G.visor, { closed: true, width: 2.8, seed: sd('vis') });

      // 9. overlay: annYellow arc riding the wave launched on the arc beat
      if (t >= B_ARC - FR) {
        const age = t - B_ARC + FR;
        const u = clamp(age / 2.4);
        const R = SR + 4 + 230 * E.outCubic(u) + 14;
        const p = hit(B_ARC, 9, E.outExpo);
        const fade = 1 - clamp((age - 2.0) / 0.4);
        if (fade > 0) {
          ctx.save();
          ctx.globalAlpha = fade;
          L.arcAnnotation(ctx, SX, SY, R, -160 * DEG, -100 * DEG, { color: P.annYellow, width: 2, p, arrow: 12, dot: 4 });
          ctx.restore();
        }
        // and a second ride on the next-but-one wave, so the overlay never stops dancing
      }
      if (t >= B_ARC + 4 * BEAT - FR) {
        const age = t - (B_ARC + 4 * BEAT) + FR;
        const u = clamp(age / 2.4);
        const R = SR + 4 + 230 * E.outCubic(u) + 14;
        const p = hit(B_ARC + 4 * BEAT, 9, E.outExpo);
        L.arcAnnotation(ctx, SX, SY, R, 20 * DEG, 80 * DEG, { color: P.annYellow, width: 2, p, arrow: 12, dot: 4 });
      }
      ctx.restore();
    },
  });
})();
