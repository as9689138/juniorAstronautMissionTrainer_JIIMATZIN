/*
 * 21 linea-del-tiempo : Generations of missions (schematic)
 * Global T 102.0 to 109.5 (local 0 to 7.5). Cut in.
 *
 * Layers, back to front:
 *   1. Blueprint plate (world space, rides the pan)
 *   2. Station cards: guide circles, corner marks, leader lines (world)
 *   3. The rail: double line, tick ruler, lit segment, station nodes (world)
 *   4. Station glyphs: Sputnik 1957, lunar module 1969, Hubble 1990, ISS 1998, Perseverance 2021,
 *      CHAPEA dome 2023 (world), ghosted until lit, then a pop, a magenta ring and the year
 *   5. Travelling pulse on the rail (world)
 *   6. End bracket and the open arrow beyond 2023 (world)
 *   7. Progress glyph, small G1, Act 3 = three quarters (screen-fixed)
 *
 * Beats (local): 0.75 narration P7 / ruler draws on; stations light 1.5, 2.25, 3.0, 3.75, 4.5, 5.25;
 * 6.0 the pulse reaches the rail end and a bracket spans the six; 6.75 every station pulses together.
 * Camera pans right 160 px over the whole shot (24 fps).
 */
(function () {
  'use strict';
  const ID = 'linea-del-tiempo';
  const LIB = FILM.lib;
  const P = LIB.pal;
  const E = LIB.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
  const h3 = (a, b, c) => (LIB.hash(a, b, c) % 100000) / 100000;

  // colours hoisted (pal reads are proxied)
  const LAV = P.lavender, WHITE = P.lineWhite, MAG = P.magenta, MARS = P.schemMars, OXY = P.schemOxygen,
    GLOW = P.glow, PALE = P.paleBlue;

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  const RAIL_Y = 470, RAIL_X0 = 200, RAIL_X1 = 1720;
  const ST_X = [380, 630, 880, 1130, 1380, 1630];
  const GLY_Y = 336;            // glyph card centre
  const YEAR_Y = 190;           // year baseline
  const GSC = 1.45;             // glyph scale
  const GSC_I = [1, 1, 1, 0.86, 1, 1]; // per-glyph trim (the ISS is the widest)
  const BAND_Y0 = 610, BAND_Y1 = 800; // lattice band under the rail (above the subtitle band)
  const YEARS = ['1957', '1969', '1990', '1998', '2021', '2023'];
  const T_LIGHT = [1.5, 2.25, 3.0, 3.75, 4.5, 5.25]; // T 103.5 .. 107.25
  const B_RULER = 0.75;   // T 102.75 narration P7
  const B_END = 6.0;      // T 108.0 pulse reaches the rail end, bracket
  const B_ALL = 6.75;     // T 108.75 all stations pulse
  const PAN = 160;

  // ---------------------------------------------------------------------------
  // Geometry (local to each glyph, centre 0,0; built once)
  // ---------------------------------------------------------------------------
  let GEO = null;
  const ell = (cx, cy, rx, ry, n = 48, rot = 0, a0 = 0, a1 = TAU) => {
    const out = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return out;
  };
  const rot = (pts, a, ox = 0, oy = 0) => {
    const c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y]) => [ox + x * c - y * s, oy + x * s + y * c]);
  };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  // inset copy of a closed outline toward its centroid (for the inner line of the double outline)
  const inset = (pts, d) => {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= pts.length; cy /= pts.length;
    let r = 0;
    for (const p of pts) r += Math.hypot(p[0] - cx, p[1] - cy);
    r /= pts.length;
    const k = Math.max(0.2, 1 - d / Math.max(1, r));
    return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  };

  function geo() {
    if (GEO) return GEO;
    const g = [];
    // Each glyph: { main: [closed outlines (double)], lines: [open polylines (secondary)],
    //               fine: [open polylines (lattice, 1 px)], dots: [[x,y,r]], tint: [open polylines in tint] }

    // 1957 Sputnik: polished sphere, four swept-back antennae
    {
      const sx = 30, sy = -4, R = 32;
      const main = [ell(sx, sy, R, R, 56)];
      const lines = [];
      const fine = [];
      // meridians and parallels
      for (const k of [0.32, 0.66]) fine.push(ell(sx, sy, R * k, R, 40));
      fine.push(ell(sx, sy, R, R * 0.28, 40));
      fine.push(ell(sx, sy - 14, R * 0.9, R * 0.2, 36, 0, Math.PI, TAU));
      fine.push(ell(sx, sy + 14, R * 0.9, R * 0.2, 36, 0, 0, Math.PI));
      // antenna roots and antennae (two upper, two lower, swept back in a cone)
      // roots on the back-left of the sphere, tips swept back in a cone
      const ant = [[150, -110, -46], [170, -118, -16], [190, -118, 16], [210, -110, 46]];
      const dots = [];
      for (const [deg, ex0, ey0] of ant) {
        const a = deg * DEG;
        const rx = sx + Math.cos(a) * R, ry = sy + Math.sin(a) * R;
        const ex = sx + ex0, ey = sy + ey0;
        lines.push([[rx, ry], [ex, ey]]);
        // root collar
        fine.push(ell(rx, ry, 4, 4, 12));
        dots.push([ex, ey, 2.4]);
      }
      // seam ring dashed (drawn as fine)
      g.push({ main, lines, fine, dots, tint: [], lattice: [ell(sx, sy, R - 6, R - 6, 40)] });
    }

    // 1969 lunar module: octagonal descent stage, four splayed legs, angular ascent stage
    {
      const desc = [[-46, -10], [-36, -20], [36, -20], [46, -10], [46, 18], [36, 28], [-36, 28], [-46, 18]];
      const asc = [[-32, -20], [-36, -40], [-24, -60], [16, -60], [30, -48], [34, -20]];
      const main = [desc, asc];
      const lines = [
        // outer legs + struts
        [[-44, 14], [-76, 60]], [[-40, -6], [-76, 60]],
        [[44, 14], [76, 60]], [[40, -6], [76, 60]],
        // front leg (ladder side) and back leg
        [[-6, 28], [-10, 66]], [[10, 26], [16, 58]],
        // docking hatch, antenna mast
        [[-6, -60], [-6, -72]], [[-6, -72], [8, -78]],
        [[22, -60], [28, -74]],
      ];
      const fine = [];
      // foil creases
      for (let i = 0; i < 6; i++) {
        const x = -38 + i * 15;
        fine.push([[x, -16], [x + 7 + (i % 2) * 4, 24]]);
      }
      // ladder rungs on the front leg
      for (let i = 0; i < 5; i++) {
        const u = i / 4;
        const y = 34 + u * 28;
        fine.push([[-12 + u * -0.5, y], [-2 + u * -0.8, y]]);
      }
      fine.push([[-12, 32], [-14, 64]]);
      // ascent stage panel lines and triangular window
      fine.push([[-34, -30], [32, -30]]);
      fine.push([[-14, -52], [0, -52], [-14, -38], [-14, -52]]);
      fine.push(ell(18, -42, 7, 7, 16));
      // footpads
      const pads = [ell(-76, 62, 11, 3.5, 20), ell(76, 62, 11, 3.5, 20), ell(-10, 68, 9, 3, 18), ell(16, 60, 8, 2.6, 18)];
      g.push({ main, lines, fine: fine.concat(pads), dots: [[8, -78, 2.2]], tint: [], lattice: [] });
    }

    // 1990 Hubble: tube with aft shroud, open aperture door, two solar arrays
    {
      const A = -12 * DEG;
      const tube = rot(rect(-40, -22, 58, 22), A);
      const aft = rot(rect(-76, -26, -40, 26), A);
      const door = rot([[58, -22], [86, -52]], A);
      const armT = rot([[-18, -22], [-18, -34]], A), armB = rot([[-18, 22], [-18, 34]], A);
      const panT = rot(rect(-52, -66, 18, -34), A), panB = rot(rect(-52, 34, 18, 66), A);
      const fine = [];
      for (const x of [-12, 18, 44]) fine.push(rot([[x, -22], [x, 22]], A));
      for (const x of [-64, -52]) fine.push(rot([[x, -26], [x, 26]], A));
      // aperture rim
      fine.push(rot(ell(58, 0, 5, 22, 20, 0, -Math.PI / 2, Math.PI / 2), A));
      // array cells
      for (const [y0, y1] of [[-66, -34], [34, 66]]) {
        for (let x = -52 + 10; x < 18; x += 10) fine.push(rot([[x, y0], [x, y1]], A));
        for (let y = y0 + 8; y < y1; y += 8) fine.push(rot([[-52, y], [18, y]], A));
      }
      g.push({ main: [tube, aft, panT, panB], lines: [door, armT, armB], fine, dots: [], tint: [], lattice: [] });
    }

    // 1998 ISS: long truss, four pairs of solar wings, pressurised modules
    {
      const truss = rect(-88, -5, 88, 5);
      const wings = [];
      for (const x of [-78, -58, 58, 78]) {
        wings.push(rect(x - 7, -62, x + 7, -10));
        wings.push(rect(x - 7, 10, x + 7, 62));
      }
      const modH = rect(-30, 9, 34, 23);
      const modV = rect(-8, 23, 8, 50);
      const node = rect(-14, -22, 14, -5);
      const fine = [];
      // truss zigzag
      const z = [];
      for (let x = -88, k = 0; x <= 88; x += 8, k++) z.push([x, k % 2 ? -5 : 5]);
      fine.push(z);
      // wing cells
      for (const x of [-78, -58, 58, 78]) {
        for (const [y0, y1] of [[-62, -10], [10, 62]]) {
          for (let y = y0 + 6.5; y < y1; y += 6.5) fine.push([[x - 7, y], [x + 7, y]]);
          fine.push([[x, y0], [x, y1]]);
        }
      }
      // module rings
      for (const x of [-16, 2, 20]) fine.push([[x, 9], [x, 23]]);
      fine.push([[-8, 36], [8, 36]]);
      // radiators
      const lines = [[[-36, 5], [-44, 26]], [[40, 5], [48, 26]], [[-36, -5], [-40, -24]], [[40, -5], [44, -24]]];
      g.push({ main: [truss, modH, modV, node].concat(wings), lines, fine, dots: [], tint: [], lattice: [] });
    }

    // 2021 Perseverance: boxy body, mast with camera head, arm, six wheels on rocker-bogie
    {
      const body = [[-46, -22], [36, -22], [40, -14], [40, 4], [-46, 4]];
      const head = rect(12, -78, 40, -64);
      const wheels = [ell(-42, 34, 11, 11, 24), ell(-4, 34, 11, 11, 24), ell(34, 34, 11, 11, 24)];
      const lines = [
        // mast
        [[24, -22], [24, -64]],
        // rocker and bogie
        [[12, 4], [34, 26]], [[12, 4], [-20, 18]], [[-20, 18], [-42, 26]], [[-20, 18], [-4, 26]],
        // arm
        [[-46, -6], [-66, 6], [-72, 24]],
        // RTG at the back
        [[40, -12], [54, -4], [50, 6], [40, 2]],
      ];
      const fine = [];
      // deck panel lines
      for (let x = -36; x < 36; x += 12) fine.push([[x, -22], [x, 4]]);
      fine.push([[-46, -12], [40, -12]]);
      // wheel spokes and hubs
      for (const [cx] of [[-42], [-4], [34]]) {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          fine.push([[cx, 34], [cx + Math.cos(a) * 9, 34 + Math.sin(a) * 9]]);
        }
      }
      // camera eyes on the head
      fine.push(ell(20, -71, 3, 3, 10), ell(32, -71, 3, 3, 10));
      // turret at the arm end
      fine.push(ell(-72, 28, 6, 4, 14));
      // UHF antenna
      fine.push([[-30, -22], [-30, -32]], ell(-30, -34, 6, 2, 12));
      g.push({ main: [body, head].concat(wheels), lines, fine, dots: [[-4, 34, 2.4], [-42, 34, 2.4], [34, 34, 2.4]], tint: [], lattice: [] });
    }

    // 2023 CHAPEA, Mars Dune Alpha: 3D printed vaults with print layers, four crew dots
    {
      const big = ell(-18, 30, 62, 64, 40, 0, Math.PI, TAU);
      const small = ell(50, 30, 36, 42, 30, 0, Math.PI, TAU);
      const base = [[-90, 30], [90, 30]];
      const door = ell(-30, 30, 11, 18, 16, 0, Math.PI, TAU);
      const fine = [];
      // print layers every 6 px inside each vault (horizontal, clipped to the arc)
      for (let y = 24; y > -32; y -= 6) {
        const dy = (30 - y) / 64;
        if (dy < 1) {
          const hw = 62 * Math.sqrt(1 - dy * dy);
          fine.push([[-18 - hw + 3, y], [-18 + hw - 3, y]]);
        }
        const dy2 = (30 - y) / 42;
        if (dy2 < 1) {
          const hw2 = 36 * Math.sqrt(1 - dy2 * dy2);
          // skip where the big vault already covers
          const x0 = Math.max(50 - hw2 + 3, -18 + 62 * Math.sqrt(Math.max(0, 1 - dy * dy)));
          if (x0 < 50 + hw2 - 3) fine.push([[x0, y], [50 + hw2 - 3, y]]);
        }
      }
      // ground hatch (red-sand yard)
      for (let x = -84; x < 90; x += 9) fine.push([[x, 34], [x - 6, 40]]);
      const dots = [[-42, 52, 4.2], [-18, 52, 4.2], [6, 52, 4.2], [30, 52, 4.2]];
      g.push({ main: [big, small], lines: [base, door], fine, dots, tint: [], lattice: [], openMain: true });
    }

    // insets for the double outline
    for (const s of g) s.inner = s.main.map((pts) => inset(pts, 5));

    // card corner marks (local)
    const corner = [];
    const cw = 116, chh = 112;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corner.push([[sx * cw, sy * chh + -sy * 14], [sx * cw, sy * chh], [sx * cw - sx * 14, sy * chh]]);
    }
    GEO = { g, corner };
    return GEO;
  }

  // ---------------------------------------------------------------------------
  // Draw helpers
  // ---------------------------------------------------------------------------
  // per-boil wobble (schematic lines move a fraction of a pixel on the 12 fps boil)
  function wob(pts, seed, bi, amp) {
    return pts.map((p, i) => [p[0] + (h3(i, bi, seed) - 0.5) * amp, p[1] + (h3(bi, i, seed + 1) - 0.5) * amp]);
  }
  function strokeList(ctx, list, closed, w, a, col, seed, bi, amp, dash) {
    if (!list.length || a <= 0) return;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k < list.length; k++) LIB.tracePath(ctx, amp ? wob(list[k], seed + k * 13, bi, amp) : list[k], closed);
    ctx.strokeStyle = col;
    ctx.globalAlpha *= a;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }

  // Progress glyph, small form of G1 (storyboard Shared geometry): centre (1720, 170), scale 56/220.
  // Sun glowDot r 10, Earth orbit r 110 with Earth dot (schemOxygen, r 9) at -30 deg, Moon orbit r 26 around
  // the Earth dot, Mars orbit r 220 with Mars dot (schemMars, r 11) at 200 deg; act arc in schemMars on the
  // Mars orbit from 12 o'clock clockwise (Act 3 = three quarters). Dots keep a 3 px floor so they read.
  function progressGlyph(ctx, L, act, bi) {
    const cx = 1720, cy = 170, s = 56 / 220;
    const rE = 110 * s, rM = 220 * s, rMo = 26 * s;
    const aE = -30 * DEG, aM = 200 * DEG;
    const ex = cx + Math.cos(aE) * rE, ey = cy + Math.sin(aE) * rE;
    const mx = cx + Math.cos(aM) * rM, my = cy + Math.sin(aM) * rM;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = LAV;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, rE, 0, TAU);
    ctx.moveTo(cx + rM, cy);
    ctx.arc(cx, cy, rM, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ex, ey, rMo, 0, TAU);
    ctx.stroke();
    // act arc
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = MARS;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, rM, -Math.PI / 2, -Math.PI / 2 + TAU * (act / 4));
    ctx.stroke();
    ctx.restore();
    L.ticks(ctx, cx, cy, { r: rM + 5, n: 24, len: 3, alpha: 0.3, width: 1 });
    ctx.save();
    ctx.fillStyle = OXY;
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(3, 9 * s), 0, TAU);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(ex + rMo, ey, 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = MARS;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(3, 11 * s), 0, TAU);
    ctx.fill();
    ctx.restore();
    L.glowDot(ctx, cx, cy, Math.max(3, 10 * s), { rays: 8, glow: 4, seed: sd('glyph'), boil: bi });
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.shot.start + t);
      const G = geo();

      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      const camX = 960 + PAN * E.inOutSine(t / info.dur);

      L.camera(ctx, { x: camX, y: 540 }, (ctx) => {
        // 1. Plate (world space so the grid travels with the pan)
        L.blueprint(ctx, { x: -40, y: 0, w: 2200, h: 1080, center: [1000, 440] });

        // 2. Cards behind the stations
        for (let i = 0; i < 6; i++) {
          const x = ST_X[i];
          const lit = t >= T_LIGHT[i];
          L.guideCircle(ctx, x, GLY_Y, 128, { alpha: lit ? 0.16 : 0.09, dash: [3, 7], quadrants: 6 });
          ctx.save();
          ctx.translate(x, GLY_Y);
          strokeList(ctx, G.corner, false, 1.5, lit ? 0.6 : 0.3, LAV, sd('corner', i), bi, 0.6);
          ctx.restore();
          // leader from card to rail node
          strokeList(ctx, [[[x, GLY_Y + 112], [x, RAIL_Y - 14]]], false, 1, lit ? 0.5 : 0.22, LAV, 0, 0, 0, [4, 6]);
        }
        // long faint horizontals (card guide rails)
        strokeList(ctx, [[[120, GLY_Y - 112], [1900, GLY_Y - 112]], [[120, GLY_Y + 112], [1900, GLY_Y + 112]]], false, 1, 0.1, LAV, 0, 0, 0);

        // 2b. Lattice band under the rail: each lit station grows a stack of cells, taller for each
        //     generation (what every mission leaves for the next). Rows rise on twos over one beat.
        const stackH = (i) => {
          if (t < T_LIGHT[i]) return 0;
          const full = 2 + i; // rows
          const rows = Math.min(full, 1 + drawing(T_LIGHT[i]));
          return rows;
        };
        L.hexLattice(ctx, L.rectPts(RAIL_X0, BAND_Y0, RAIL_X1 - RAIL_X0, BAND_Y1 - BAND_Y0, 40), {
          r: 17,
          alpha: 0.13,
          seed: sd('band'),
          cellFn: (cx, cy) => {
            for (let i = 0; i < 6; i++) {
              if (Math.abs(cx - ST_X[i]) > 46) continue;
              const rows = stackH(i);
              const rowIdx = Math.floor((BAND_Y1 - cy) / 25.5);
              if (rows > 0 && rowIdx >= 0 && rowIdx < rows) return { fill: LAV, alpha: 0.1 + 0.035 * rowIdx };
            }
            return true;
          },
        });
        // stack outlines: a bracket over each grown stack
        for (let i = 0; i < 6; i++) {
          const rows = stackH(i);
          if (!rows) continue;
          const top = BAND_Y1 - rows * 25.5 - 10;
          strokeList(ctx, [[[ST_X[i] - 52, top + 10], [ST_X[i] - 52, top], [ST_X[i] + 52, top], [ST_X[i] + 52, top + 10]]], false, 1.5, 0.6, LAV, sd('stk', i), bi, 0.5);
        }
        // band frame and baseline ticks
        strokeList(ctx, [[[RAIL_X0, BAND_Y1 + 6], [RAIL_X1, BAND_Y1 + 6]]], false, 1.5, 0.45, LAV, 0, 0, 0);
        L.ticks(ctx, RAIL_X0, BAND_Y1 + 6, { length: RAIL_X1 - RAIL_X0, n: 38, len: 7, alpha: 0.35, baseline: false });

        // 2c. Hand-off arcs under the rail: one hop per generation, drawn while the pulse travels
        for (let i = 0; i < 5; i++) {
          const hp = L.seg(t, T_LIGHT[i], T_LIGHT[i + 1], E.inOutCubic);
          if (hp <= 0) continue;
          const mx = (ST_X[i] + ST_X[i + 1]) / 2, rx = (ST_X[i + 1] - ST_X[i]) / 2;
          const n = 40, pts = [];
          for (let k = 0; k <= Math.round(n * hp); k++) {
            const a = Math.PI - (k / n) * Math.PI;
            pts.push([mx + Math.cos(a) * rx, RAIL_Y + 22 + Math.sin(a) * 72]);
          }
          if (pts.length > 1) strokeList(ctx, [pts], false, 1.5, 0.55, LAV, 0, 0, 0, [7, 6]);
          if (hp >= 1) {
            // apex tick
            strokeList(ctx, [[[mx, RAIL_Y + 88], [mx, RAIL_Y + 102]]], false, 1.5, 0.6, WHITE, 0, 0, 0);
          }
        }

        // 3. Rail
        const railW = wob([[RAIL_X0, RAIL_Y - 4.5], [RAIL_X1, RAIL_Y - 4.5]], sd('r1'), bi, 0.5);
        const railI = wob([[RAIL_X0, RAIL_Y + 4.5], [RAIL_X1, RAIL_Y + 4.5]], sd('r2'), bi, 0.5);
        strokeList(ctx, [railW], false, 2.5, 0.85, LAV, 0, 0, 0);
        strokeList(ctx, [railI], false, 1.5, 0.5, LAV, 0, 0, 0);
        // end caps
        strokeList(ctx, [[[RAIL_X0, RAIL_Y - 14], [RAIL_X0, RAIL_Y + 14]]], false, 2, 0.7, LAV, 0, 0, 0);
        // ruler under the rail draws on with the narration beat
        const rp = t < B_RULER ? 0.12 : 0.12 + 0.88 * hit(B_RULER, 18, E.outExpo);
        L.ticks(ctx, RAIL_X0, RAIL_Y + 18, { length: RAIL_X1 - RAIL_X0, n: 152, len: 6, major: 8, majorLen: 15, alpha: 0.45, baseline: false, p: rp });
        L.ticks(ctx, RAIL_X0, RAIL_Y - 18, { length: RAIL_X1 - RAIL_X0, n: 38, len: 5, alpha: 0.3, side: -1, baseline: false, p: rp });

        // pulse position along the rail (24 fps)
        let px;
        if (t < B_RULER) px = RAIL_X0;
        else if (t < T_LIGHT[0]) px = lerp(RAIL_X0, ST_X[0], L.seg(t, B_RULER, T_LIGHT[0], E.inOutCubic));
        else if (t < T_LIGHT[5]) {
          let i = 0;
          while (i < 4 && t >= T_LIGHT[i + 1]) i++;
          px = lerp(ST_X[i], ST_X[i + 1], L.seg(t, T_LIGHT[i], T_LIGHT[i + 1], E.inOutCubic));
        } else px = lerp(ST_X[5], RAIL_X1, L.seg(t, T_LIGHT[5], B_END, E.inOutCubic));
        // lit segment behind the pulse
        if (px > RAIL_X0 + 1) strokeList(ctx, [[[RAIL_X0, RAIL_Y], [px, RAIL_Y]]], false, 3, 0.9, WHITE, 0, 0, 0);

        // station nodes
        for (let i = 0; i < 6; i++) {
          const x = ST_X[i];
          const lit = t >= T_LIGHT[i];
          ctx.save();
          ctx.fillStyle = P.navyDeep;
          ctx.beginPath();
          ctx.arc(x, RAIL_Y, 12, 0, TAU);
          ctx.fill();
          ctx.restore();
          L.guideCircle(ctx, x, RAIL_Y, 12, { alpha: lit ? 0.9 : 0.45, width: 2 });
          L.guideCircle(ctx, x, RAIL_Y, 7, { alpha: lit ? 0.5 : 0.25, width: 1.2 });
        }

        // 4. Station glyphs
        for (let i = 0; i < 6; i++) {
          const s = G.g[i];
          const x = ST_X[i];
          const lit = t >= T_LIGHT[i];
          const sc = lit ? popTwos(T_LIGHT[i]) : 1;
          // the whole pulse at B_ALL
          const allK = t >= B_ALL ? Math.max(0, 1 - (t - B_ALL) / (14 * FR)) : 0;
          ctx.save();
          ctx.translate(x, GLY_Y);
          const gs = GSC * GSC_I[i];
          ctx.scale(sc * gs, sc * gs);
          const k = lit ? 1 : 0.42;
          const seed = sd('gly', i);
          if (lit) {
            strokeList(ctx, s.main, !s.openMain, 2.5 / gs, 0.85, LAV, seed, bi, 0.7);
            strokeList(ctx, s.inner, !s.openMain, 1.5 / gs, 0.5, LAV, seed + 5, bi, 0.7);
            strokeList(ctx, s.lines, false, 1.5 / gs, 0.75, LAV, seed + 9, bi, 0.6);
            strokeList(ctx, s.fine, false, 1 / gs, 0.38, LAV, seed + 17, bi, 0.5);
            strokeList(ctx, s.lattice, true, 1 / gs, 0.35, LAV, seed + 23, bi, 0.5, [3, 4]);
            ctx.fillStyle = WHITE;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            for (const [dx, dy, r] of s.dots) {
              ctx.moveTo(dx + r, dy);
              ctx.arc(dx, dy, r, 0, TAU);
            }
            ctx.fill();
          } else {
            strokeList(ctx, s.main, !s.openMain, 1.2 / gs, k, LAV, seed, bi, 0.5, [5, 4]);
            strokeList(ctx, s.lines, false, 1 / gs, k * 0.8, LAV, seed + 9, bi, 0.5, [5, 4]);
          }
          ctx.restore();
          // CHAPEA crew dots glow once lit (four points)
          if (i === 5 && lit) {
            for (let d = 0; d < 4; d++) {
              const [dx, dy] = s.dots[d];
              const on = t >= T_LIGHT[5] + d * 0.09375; // a 32nd apart, flicker on in a row
              if (on) L.glowDot(ctx, x + dx * GSC, GLY_Y + dy * GSC, 3.8, { rays: 0, glow: 5, seed: sd('crew', d), boil: bi, intensity: 0.9 });
            }
          }
          // year
          if (lit) {
            const yp = hit(T_LIGHT[i], 6, E.linear);
            L.text(ctx, YEARS[i], x, YEAR_Y, { size: 30, align: 'center', color: LAV, alpha: 0.85, weight: 300, tracking: 2, p: yp });
          } else {
            // empty year slot: a short dash
            strokeList(ctx, [[[x - 20, YEAR_Y - 10], [x + 20, YEAR_Y - 10]]], false, 1.2, 0.25, LAV, 0, 0, 0);
          }
          // node glow + magenta change ring (<= 12 frames)
          if (lit) {
            L.glowDot(ctx, x, RAIL_Y, 8 + 3 * allK, { rays: 12, rayLen: 2.6, rot: i * 0.4, seed: sd('node', i), boil: bi, intensity: 0.85 + 0.4 * allK });
            const rk = (t - T_LIGHT[i]) / (12 * FR);
            if (rk < 1) {
              const rr = 14 + 70 * E.outExpo(rk + 1 / 12);
              ctx.save();
              ctx.strokeStyle = MAG;
              ctx.globalAlpha = 1 - rk;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(x, RAIL_Y, rr, 0, TAU);
              ctx.stroke();
              ctx.restore();
            }
            if (allK > 0) {
              ctx.save();
              ctx.strokeStyle = WHITE;
              ctx.globalAlpha = allK * 0.7;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(x, RAIL_Y, 16 + 30 * (1 - allK), 0, TAU);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // 5. Pulse
        if (t >= B_RULER - FR) {
          const k = t < B_END ? 1 : Math.max(0, 1 - (t - B_END) / (10 * FR));
          if (k > 0) L.glowDot(ctx, px, RAIL_Y, 7, { rays: 8, rayLen: 3, rot: tw * 2, seed: sd('pulse'), boil: bi, intensity: k, color: PALE });
        }

        // 6. Growth line across the stack tops and the open arrow beyond 2023
        if (t >= B_END - FR) {
          const gp = hit(B_END, 9, E.outExpo);
          const tops = ST_X.map((x, i) => [x, BAND_Y1 - stackH(i) * 25.5 - 22]);
          const tot = tops.length - 1;
          const upto = gp * tot;
          const pts = [];
          for (let i = 0; i <= Math.floor(upto); i++) pts.push(tops[i]);
          if (upto < tot) {
            const a = Math.floor(upto), f = upto - a;
            pts.push([lerp(tops[a][0], tops[a + 1][0], f), lerp(tops[a][1], tops[a + 1][1], f)]);
          }
          if (pts.length > 1) strokeList(ctx, [pts], false, 2, 0.75, WHITE, sd('trend'), bi, 0.5);
          for (let i = 0; i <= Math.floor(upto); i++) {
            ctx.save();
            ctx.fillStyle = WHITE;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(tops[i][0], tops[i][1], 3.5, 0, TAU);
            ctx.fill();
            ctx.restore();
          }
          const ap = hit(B_END, 9, E.outExpo);
          const ax = RAIL_X1 + 8 + 70 * ap;
          strokeList(ctx, [[[RAIL_X1, RAIL_Y], [ax, RAIL_Y]]], false, 2, 0.7, LAV, 0, 0, 0, [8, 6]);
          strokeList(ctx, [[[ax - 12, RAIL_Y - 10], [ax, RAIL_Y], [ax - 12, RAIL_Y + 10]]], false, 2, 0.8 * ap, LAV, 0, 0, 0);
        }
      });

      // 7. Progress glyph (screen-fixed), Act 3
      progressGlyph(ctx, L, 3, bi);
    },
  });
})();
