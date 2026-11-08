// "WHEN GOD WANTS YOU TO GROW" — 9:16 Instagram Reel, fully procedural.
// Every shot is an original illustration drawn in code; every frame is a pure
// function of time. 1080x1920 @ 30fps, 4-sample motion blur.

const W = 1080, H = 1920, FPS = 30, DUR = 14;
window.META = { W, H, FPS, DUR };
const SANS = '"Inter"';

// ───────────── math ─────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
const noise1 = x => { // smooth 1D value noise
  const i = Math.floor(x), f = x - i, h = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
};

// ───────────── figure rig ─────────────
// A figure = tapered capsules + polygons + heads, feet at y=0, ~1 unit = 1px at s=1.
function capsule(ctx, x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1e-3;
  const nx = -dy / d, ny = dx / d;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1); ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.lineTo(x2 - nx * r2, y2 - ny * r2); ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x1, y1, r1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x2, y2, r2, 0, TAU); ctx.fill();
}
function figureShape(ctx, fig) {
  for (const p of fig.parts) capsule(ctx, ...p);
  for (const poly of fig.polys || []) {
    ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  }
  for (const [x, y, r] of fig.heads) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
}
// draw with rim light: rim-coloured copy, then dark copy nudged away from the light
function drawFigure(ctx, fig, x, y, s, dark, rim, rdx = 0, rdy = 0, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (rim) { ctx.fillStyle = rim; figureShape(ctx, fig); ctx.translate(rdx / s, rdy / s); }
  ctx.fillStyle = dark; figureShape(ctx, fig);
  ctx.restore();
}
const mixFig = (a, b, k) => ({
  parts: a.parts.map((p, i) => p.map((v, j) => lerp(v, b.parts[i][j], k))),
  polys: a.polys,
  heads: a.heads.map((h, i) => h.map((v, j) => lerp(v, b.heads[i][j], k))),
});

const SIT_HUG = { // sitting against a wall, head buried in knees (faces right)
  parts: [
    [22, -20, 20, 50, -82, 19],
    [24, -18, 14, 82, -64, 12], [82, -64, 11, 96, -6, 9],
    [28, -16, 15, 88, -60, 12], [88, -60, 11, 104, -6, 9], [100, -6, 8, 124, -5, 6],
    [54, -80, 9, 92, -56, 8], [92, -56, 8, 112, -40, 7],
    [46, -86, 16, 74, -86, 14],
  ],
  heads: [[84, -80, 15]],
};
const DESK_SLUMP = { // seated, head down on folded arms (front view), origin at seat
  parts: [[0, -6, 27, 0, -54, 30], [-32, -54, 14, 32, -54, 14], [-44, -64, 11, 44, -64, 11]],
  heads: [[0, -80, 21]],
};
const STAND_SLOUCH = { // standing, head low, hands in pockets (faces right)
  parts: [
    [0, -90, 11, -4, -46, 9], [-4, -46, 9, -2, 0, 7], [-2, 0, 6, 12, 0, 5],
    [6, -90, 11, 10, -46, 9], [10, -46, 9, 14, 0, 7], [14, 0, 6, 26, 0, 5],
    [2, -92, 15, 9, -148, 17],
    [10, -146, 8, 13, -110, 7], [13, -110, 7, 9, -92, 7],
  ],
  heads: [[19, -164, 12]],
};
const SWING_HUNCH = { // on a swing seat at origin, elbows on knees, face in hands
  parts: [
    [-10, -8, 13, 40, -6, 11], [40, -6, 10, 44, 56, 8], [44, 58, 7, 62, 60, 6],
    [-8, -10, 17, 22, -68, 17],
    [20, -64, 8, 36, -14, 7], [36, -14, 7, 42, -54, 6],
  ],
  heads: [[42, -68, 13]],
};
const VIC_UP = { // arms raised (front view)
  parts: [
    [-14, -98, 15, -22, -52, 12], [-22, -52, 11, -26, 0, 9], [-26, 0, 8, -36, 0, 7],
    [14, -98, 15, 22, -52, 12], [22, -52, 11, 26, 0, 9], [26, 0, 8, 36, 0, 7],
    [-34, -165, 13, 34, -165, 13], [0, -170, 9, 0, -184, 9],
    [-34, -166, 11, -60, -214, 9], [-60, -214, 9, -50, -262, 8], [-50, -262, 11, -50, -270, 11],
    [34, -166, 11, 60, -214, 9], [60, -214, 9, 50, -262, 8], [50, -262, 11, 50, -270, 11],
  ],
  polys: [
    [[-38, -168], [38, -168], [26, -106], [-26, -106]],
    [[-30, -114], [30, -114], [36, -68], [5, -64], [0, -80], [-5, -64], [-36, -68]],
  ],
  heads: [[0, -198, 17]],
};
const VIC_DOWN = { ...VIC_UP, parts: VIC_UP.parts.map((p, i) => {
  const arms = {
    8: [-34, -166, 11, -46, -122, 9], 9: [-46, -122, 9, -40, -150, 8], 10: [-40, -150, 11, -40, -156, 11],
    11: [34, -166, 11, 46, -122, 9], 12: [46, -122, 9, 40, -150, 8], 13: [40, -150, 11, 40, -156, 11],
  };
  return arms[i] || p;
}) };

// ───────────── shared looks ─────────────
function grad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function glow(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function push(ctx, ox, oy, z) { ctx.translate(ox, oy); ctx.scale(z, z); ctx.translate(-ox, -oy); }

// ───────────── SHOT 1 · alley in the rain ─────────────
const RAIN = (() => { const r = rng(1); return Array.from({ length: 300 }, () => ({ x: r() * 1500 - 300, y: r() * 2200, v: 2200 + r() * 1200, l: 30 + r() * 60, d: r() })); })();
const SPLASH = (() => { const r = rng(2); return Array.from({ length: 60 }, () => ({ x: r() * W, y: 1380 + r() * 520, p: r() })); })();
function shotAlley(ctx, lt) {
  ctx.save();
  push(ctx, 600, 1260, lerp(1.0, 1.1, E.inOutSine(clamp(lt / 1.4))));
  ctx.fillStyle = '#0d1517'; ctx.fillRect(-200, -200, W + 400, H + 400);
  // wall + bricks
  ctx.fillStyle = grad(ctx, 0, 1360, [[0, '#0b1214'], [1, '#1a2528']]); ctx.fillRect(-200, -200, W + 400, 1560);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
  for (let y = -160, row = 0; y < 1360; y += 48, row++) {
    ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(W + 200, y); ctx.stroke();
    for (let x = -200 + (row % 2) * 60; x < W + 200; x += 120) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 48); ctx.stroke(); }
  }
  // door recess & pipe
  ctx.fillStyle = '#070b0c'; ctx.fillRect(820, 620, 300, 740);
  ctx.fillStyle = '#0a1012'; ctx.fillRect(170, -200, 30, 1560);
  ctx.fillStyle = 'rgba(140,190,175,0.25)'; ctx.fillRect(194, -200, 4, 1560);
  // flickering lamp above door
  const fl = 0.75 + 0.25 * noise1(lt * 18) - (noise1(lt * 7 + 3) > 0.82 ? 0.5 : 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 860, 560, 1000, 'rgba(120,190,165,A)', 0.30 * fl);
  glow(ctx, 860, 560, 160, 'rgba(210,255,235,A)', 0.8 * fl);
  ctx.restore();
  ctx.fillStyle = '#cfe9df'; ctx.fillRect(810, 552, 110, 12);
  // wet ground
  ctx.fillStyle = grad(ctx, 1360, H, [[0, '#121b1d'], [1, '#040607']]); ctx.fillRect(-200, 1356, W + 400, 800);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createLinearGradient(0, 1360, 0, 1900);
  rg.addColorStop(0, `rgba(140,210,190,${0.22 * fl})`); rg.addColorStop(1, 'rgba(140,210,190,0)');
  ctx.filter = 'blur(18px)'; ctx.fillStyle = rg; ctx.fillRect(820, 1360, 90, 560); ctx.filter = 'none';
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(540, 1360, 190, 22, 0, 0, TAU); ctx.fill();
  drawFigure(ctx, SIT_HUG, 450, 1362, 2.6, '#040708', `rgba(150,215,195,${0.55 * fl + 0.2})`, -4, 3);
  // splashes
  ctx.strokeStyle = 'rgba(170,215,215,0.35)'; ctx.lineWidth = 1.5;
  for (const s of SPLASH) {
    const p = (lt * 2.2 + s.p) % 1;
    ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.ellipse(s.x, s.y, 4 + p * 26, 1 + p * 5, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // rain (screen space, in front)
  ctx.lineCap = 'round';
  for (const d of RAIN) {
    const y = ((d.y + lt * d.v) % 2200) - 140, x = d.x + y * 0.14;
    ctx.strokeStyle = `rgba(185,220,225,${0.12 + d.d * 0.28})`; ctx.lineWidth = 1 + d.d * 2.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d.l * 0.14, y - d.l * (0.6 + d.d)); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(20,45,50,0.25)'; ctx.fillRect(0, 0, W, H); // teal grade
}

// ───────────── SHOT 2 · empty classroom ─────────────
const DUST = (() => { const r = rng(3); return Array.from({ length: 110 }, () => ({ x: r(), y: r(), s: r(), p: r() * TAU })); })();
function shotClass(ctx, lt) {
  const camX = lerp(-0.5, 0.25, E.inOutSine(clamp(lt / 1.4))), camY = 1.35, f = 820, cx = 540, cy = 820;
  const pr = (x, y, z) => [cx + (x - camX) * f / z, cy + (camY - y) * f / z];
  const poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach((p, i) => { const [a, b] = pr(...p); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); ctx.fill(); };
  ctx.save();
  push(ctx, 540, 900, lerp(1.04, 1.0, clamp(lt / 1.4)));
  const ZN = 1.0, ZF = 15;
  ctx.fillStyle = '#3c4247'; ctx.fillRect(-100, -100, W + 200, H + 200);
  poly([[-4, 3.2, ZF], [4, 3.2, ZF], [4, 0, ZF], [-4, 0, ZF]], '#4d5257');                       // back wall
  poly([[-4, 0, ZN], [4, 0, ZN], [4, 0, ZF], [-4, 0, ZF]], grad(ctx, 800, H, [[0, '#5a5048'], [1, '#2a2522']])); // floor
  poly([[-4, 3.2, ZN], [4, 3.2, ZN], [4, 3.2, ZF], [-4, 3.2, ZF]], '#2b2f33');                   // ceiling
  poly([[-4, 0, ZN], [-4, 3.2, ZN], [-4, 3.2, ZF], [-4, 0, ZF]], '#3a3b3d');                     // left wall
  poly([[4, 0, ZN], [4, 3.2, ZN], [4, 3.2, ZF], [4, 0, ZF]], '#33383c');                         // right wall
  // blackboard
  poly([[-2.2, 2.4, ZF - 0.01], [2.2, 2.4, ZF - 0.01], [2.2, 1.0, ZF - 0.01], [-2.2, 1.0, ZF - 0.01]], '#1f2b26');
  // windows + light on the floor + volumetric shafts
  const L = [1, -0.75, -0.35];
  const wins = [[2.5, 4.6], [6.0, 8.1], [9.5, 11.6]];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [z0, z1] of wins) {
    const corners = [[-4, 2.6, z0], [-4, 2.6, z1], [-4, 1.0, z1], [-4, 1.0, z0]];
    const onFloor = corners.map(([x, y, z]) => { const k = y / -L[1]; return [x + L[0] * k, 0, z + L[2] * k]; });
    poly(onFloor, 'rgba(255,190,110,0.30)');
    poly([corners[0], corners[1], onFloor[1], onFloor[0]], 'rgba(255,200,130,0.05)');
    poly([corners[3], corners[2], onFloor[2], onFloor[3]], 'rgba(255,200,130,0.05)');
    poly([corners[0], corners[3], onFloor[3], onFloor[0]], 'rgba(255,200,130,0.045)');
  }
  ctx.restore();
  for (const [z0, z1] of wins) {
    poly([[-4, 2.6, z0], [-4, 2.6, z1], [-4, 1.0, z1], [-4, 1.0, z0]], '#ffe2b0');
    const zm = (z0 + z1) / 2;
    ctx.strokeStyle = '#3a3b3d'; ctx.lineWidth = 6 * 3 / zm;
    const [a, b] = pr(-4, 2.6, zm), [c, d] = pr(-4, 1.0, zm);
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
  }
  // desks, far to near
  const rows = [12.4, 10.6, 8.8, 7.0, 5.2, 3.4], cols = [-2.7, -1.35, 0, 1.35, 2.7];
  for (const z of rows) for (const x of cols) {
    const lit = x < 0 ? 1 : 0.75;
    // chair (behind desk)
    const zc = z + 0.5;
    poly([[x - .2, .45, zc - .2], [x + .2, .45, zc - .2], [x + .2, .45, zc + .2], [x - .2, .45, zc + .2]], '#2e2a28');
    poly([[x - .2, .45, zc + .2], [x + .2, .45, zc + .2], [x + .2, .9, zc + .22], [x - .2, .9, zc + .22]], '#3a3330');
    if (z === 3.4 && x === 1.35) { // the lonely student
      const [sx, sy] = pr(x, .45, zc), s = f / zc * 0.0058;
      drawFigure(ctx, DESK_SLUMP, sx, sy, s, '#15130f', 'rgba(255,190,120,0.8)', s * 3, 0);
    }
    for (const [lx, lz] of [[-.28, -.18], [.28, -.18], [-.28, .18], [.28, .18]]) {
      const [a, b] = pr(x + lx, .72, z + lz), [c, d] = pr(x + lx, 0, z + lz);
      ctx.strokeStyle = '#1d1a18'; ctx.lineWidth = Math.max(1, 0.035 * f / z);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    }
    poly([[x - .3, .66, z - .21], [x + .3, .66, z - .21], [x + .3, .72, z - .21], [x - .3, .72, z - .21]], `rgb(${90 * lit},${60 * lit},${36 * lit})`);
    poly([[x - .3, .72, z - .21], [x + .3, .72, z - .21], [x + .3, .72, z + .21], [x - .3, .72, z + .21]], `rgb(${190 * lit},${128 * lit},${76 * lit})`);
  }
  ctx.restore();
  // dust in the light
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const x = d.x * W + Math.sin(lt * 0.8 + d.p) * 20, y = ((d.y * H + lt * (10 + d.s * 20)) % H);
    ctx.fillStyle = `rgba(255,210,150,${0.12 + 0.35 * d.s * (0.5 + 0.5 * Math.sin(lt * 3 + d.p))})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + d.s * 2.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(30,40,60,0.18)'; ctx.fillRect(0, 0, W, H);
}

// ───────────── SHOT 3 · sunset field ─────────────
const GRASS = (() => { const r = rng(4); const g = Array.from({ length: 420 }, () => { const d = r(); return { x: r() * 1300 - 110, d, h: 40 + d * d * 380 + r() * 60, w: 2 + d * 9, p: r() * TAU, c: r() }; }); return g.sort((a, b) => a.d - b.d); })();
const CITY = (() => { const r = rng(5); const b = []; for (let x = -100; x < 1200;) { const w = 30 + r() * 70; b.push([x, w, 20 + r() * 110]); x += w + r() * 10; } return b; })();
function shotField(ctx, lt) {
  ctx.save();
  push(ctx, 620, 1150, lerp(1.0, 1.08, E.inOutSine(clamp(lt / 1.4))));
  const HZ = 1200;
  ctx.fillStyle = grad(ctx, 0, HZ, [[0, '#24123a'], [0.45, '#8e2f3a'], [0.8, '#f06a2a'], [1, '#ffbd5c']]);
  ctx.fillRect(-200, -200, W + 400, HZ + 200);
  // sun
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 470, 1080, 900, 'rgba(255,150,60,A)', 0.45);
  ctx.restore();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(470, 1080, 160, 0, TAU); ctx.fill();
  // cloud bands across the sun
  ctx.save(); ctx.filter = 'blur(5px)'; ctx.fillStyle = 'rgba(70,20,45,0.6)';
  [[860, 520, 30], [960, 700, 18], [1030, 420, 14], [700, 380, 22], [1110, 620, 10]].forEach(([y, w, h], i) => {
    const x = ((i * 310 + lt * (14 + i * 6)) % 1500) - 300;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); ctx.fill();
  });
  ctx.restore();
  // city on the horizon
  ctx.fillStyle = 'rgba(110,40,55,0.85)';
  for (const [x, w, h] of CITY) ctx.fillRect(x, HZ - h, w, h + 2);
  // hills
  ctx.fillStyle = '#4a1d2c';
  ctx.beginPath(); ctx.moveTo(-200, HZ + 10);
  for (let x = -200; x <= W + 200; x += 40) ctx.lineTo(x, HZ + 10 - 30 * Math.sin(x * 0.006 + 1) - 20 * Math.sin(x * 0.017));
  ctx.lineTo(W + 200, H + 200); ctx.lineTo(-200, H + 200); ctx.fill();
  ctx.fillStyle = grad(ctx, 1260, H, [[0, '#2a0f1a'], [1, '#0e050a']]);
  ctx.beginPath(); ctx.moveTo(-200, 1300);
  for (let x = -200; x <= W + 200; x += 40) ctx.lineTo(x, 1290 + 25 * Math.sin(x * 0.004 + 2));
  ctx.lineTo(W + 200, H + 200); ctx.lineTo(-200, H + 200); ctx.fill();
  // long shadow + figure
  ctx.fillStyle = 'rgba(8,2,6,0.55)';
  ctx.beginPath(); ctx.moveTo(705, 1336); ctx.lineTo(1150, 1380); ctx.lineTo(1150, 1392); ctx.lineTo(735, 1340); ctx.fill();
  let figDrawn = false;
  const drawFig = () => drawFigure(ctx, STAND_SLOUCH, 720, 1338, 1.35, '#14060c', 'rgba(255,170,90,0.95)', 3, 0);
  // grass
  for (const g of GRASS) {
    if (!figDrawn && g.d > 0.28) { drawFig(); figDrawn = true; }
    const by = 1300 + g.d * 640, sway = Math.sin(lt * 1.6 + g.x * 0.008 + g.p) * (0.08 + g.d * 0.12) + 0.06;
    const tx = g.x + Math.sin(sway) * g.h, ty = by - Math.cos(sway) * g.h;
    const k = 1 - g.d;
    ctx.fillStyle = `rgb(${Math.round(lerp(14, 70, k * k * (0.6 + g.c * 0.4)))},${Math.round(lerp(5, 22, k * k))},${Math.round(lerp(10, 30, k * k))})`;
    ctx.beginPath(); ctx.moveTo(g.x - g.w, by);
    ctx.quadraticCurveTo(g.x + (tx - g.x) * 0.3, by - g.h * 0.55, tx, ty);
    ctx.quadraticCurveTo(g.x + (tx - g.x) * 0.3 + g.w * 0.5, by - g.h * 0.5, g.x + g.w, by); ctx.fill();
  }
  // birds
  ctx.strokeStyle = 'rgba(40,10,25,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = 120 + lt * 70 + i * 46, y = 560 + Math.abs(i - 2) * 26 + i * 4, fl = Math.sin(lt * 12 + i) * 8;
    ctx.beginPath(); ctx.moveTo(x - 14, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + 14, y - fl); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,120,40,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ───────────── SHOT 4 · swing at night ─────────────
const STARS = (() => { const r = rng(6); return Array.from({ length: 150 }, () => ({ x: r() * W, y: r() * 1150, s: r(), p: r() * TAU })); })();
const TREES = (() => { const r = rng(7); return Array.from({ length: 40 }, (_, i) => [i * 32 - 60, 60 + r() * 110, 26 + r() * 30]); })();
function shotSwing(ctx, lt) {
  ctx.save();
  push(ctx, 520, 1300, lerp(1.08, 1.0, E.inOutSine(clamp(lt / 1.4))));
  ctx.fillStyle = grad(ctx, 0, 1300, [[0, '#04060f'], [1, '#18223f']]); ctx.fillRect(-200, -200, W + 400, 1520);
  for (const s of STARS) { ctx.fillStyle = `rgba(220,230,255,${0.25 + 0.6 * s.s * (0.6 + 0.4 * Math.sin(lt * 4 + s.p))})`; ctx.fillRect(s.x, s.y, 1 + s.s * 2, 1 + s.s * 2); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 820, 420, 380, 'rgba(170,190,255,A)', 0.25); ctx.restore();
  ctx.fillStyle = '#e9edff'; ctx.beginPath(); ctx.arc(820, 420, 62, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(160,170,210,0.35)'; ctx.beginPath(); ctx.arc(800, 405, 14, 0, TAU); ctx.arc(840, 440, 9, 0, TAU); ctx.fill();
  // tree line
  ctx.fillStyle = '#080c1a';
  for (const [x, h, r] of TREES) { ctx.beginPath(); ctx.arc(x, 1300 - h, r, 0, TAU); ctx.fill(); ctx.fillRect(x - r, 1300 - h, r * 2, h); }
  ctx.fillStyle = grad(ctx, 1290, H, [[0, '#0b1020'], [1, '#020308']]); ctx.fillRect(-200, 1290, W + 400, 900);
  // street light
  ctx.fillStyle = '#05070e'; ctx.fillRect(126, 760, 10, 760); ctx.fillRect(126, 760, 90, 8);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(0, 770, 0, 1540);
  cone.addColorStop(0, 'rgba(255,190,110,0.28)'); cone.addColorStop(1, 'rgba(255,190,110,0.02)');
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(196, 772); ctx.lineTo(220, 772); ctx.lineTo(430, 1540); ctx.lineTo(-20, 1540); ctx.fill();
  glow(ctx, 208, 772, 70, 'rgba(255,215,160,A)', 0.9);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,190,110,0.10)'; ctx.beginPath(); ctx.ellipse(205, 1530, 260, 40, 0, 0, TAU); ctx.fill();
  // swing frame
  const rim = 'rgba(150,170,255,0.55)';
  ctx.lineCap = 'round';
  const pole = (x1, y1, x2, y2, w) => { ctx.lineWidth = w; ctx.strokeStyle = rim; ctx.beginPath(); ctx.moveTo(x1 + 2, y1); ctx.lineTo(x2 + 2, y2); ctx.stroke(); ctx.strokeStyle = '#04060c'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  pole(290, 1560, 345, 920, 16); pole(400, 1560, 345, 920, 16);
  pole(905, 1560, 960, 920, 16); pole(1015, 1560, 960, 920, 16);
  pole(345, 920, 960, 920, 16);
  // empty swing
  const swing = (px, th, len) => {
    const sx = px + Math.sin(th) * len, sy = 926 + Math.cos(th) * len;
    ctx.strokeStyle = 'rgba(140,155,200,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px - 4, 926); ctx.lineTo(sx - 40, sy); ctx.moveTo(px + 4, 926); ctx.lineTo(sx + 40, sy); ctx.stroke();
    ctx.fillStyle = '#05070d'; ctx.fillRect(sx - 46, sy - 5, 92, 12);
    return [sx, sy];
  };
  swing(790, 0.10 * Math.sin(lt * 1.9 + 1.2), 460);
  const th = 0.045 * Math.sin(lt * 2.2);
  const [sx, sy] = swing(560, th, 460);
  drawFigure(ctx, SWING_HUNCH, sx, sy, 2.1, '#03050b', 'rgba(170,185,255,0.75)', -3, 2, th * 0.6);
  // ground fog
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = ((lt * (20 + i * 12) + i * 400) % 1600) - 500;
    glow(ctx, x + 300, 1440 + i * 60, 520, 'rgba(90,110,170,A)', 0.07);
  }
  ctx.restore();
  ctx.restore();
}

// ───────────── SHOT 5 · victory ─────────────
const EMBERS = (() => { const r = rng(8); return Array.from({ length: 170 }, () => ({ x: r() * W, y: r() * H, v: 120 + r() * 380, s: r(), p: r() * TAU })); })();
const CROWD = (() => { const r = rng(9); const c = []; for (let row = 0; row < 4; row++) for (let x = -40; x < W + 60; x += 46 + r() * 26) c.push({ x, row, h: r(), arm: r() < 0.35, p: r() * TAU, ph: r() < 0.08 }); return c; })();
function shotVictory(ctx, lt) {
  const cx = 540, cy = 900;
  ctx.save();
  push(ctx, 540, 1100, lerp(1.0, 1.12, E.inOutSine(clamp(lt / 4.7))));
  ctx.fillStyle = '#0d0503'; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // rotating rays
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(lt * 0.12);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * TAU, w = 0.035 + 0.03 * Math.sin(i * 7.3);
    ctx.fillStyle = `rgba(255,170,70,${0.05 + 0.04 * Math.sin(i * 3.1 + lt * 2)})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2200, a - w, a + w); ctx.fill();
  }
  ctx.restore();
  glow(ctx, cx, cy, 1200, 'rgba(255,120,30,A)', 0.55);
  glow(ctx, cx, cy, 560, 'rgba(255,200,110,A)', 0.8);
  glow(ctx, cx, cy, 220, 'rgba(255,250,230,A)', 1.0);
  // anamorphic streak
  const st = ctx.createLinearGradient(0, 0, W, 0);
  st.addColorStop(0, 'rgba(255,190,120,0)'); st.addColorStop(0.5, 'rgba(255,230,190,0.55)'); st.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = st; ctx.fillRect(-200, cy - 5, W + 400, 10);
  // spotlights from above
  for (let i = 0; i < 2; i++) {
    const a = (i ? 1 : -1) * (0.35 + 0.08 * Math.sin(lt * 0.9 + i));
    ctx.save(); ctx.translate(i ? W + 60 : -60, -100); ctx.rotate(a);
    const sg = ctx.createLinearGradient(0, 0, 0, 1800);
    sg.addColorStop(0, 'rgba(255,230,190,0.22)'); sg.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(260, 1800); ctx.lineTo(-260, 1800); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // ring floor + ropes
  ctx.fillStyle = grad(ctx, 1380, 1560, [[0, '#3a1a0c'], [1, '#120604']]);
  ctx.beginPath(); ctx.moveTo(-200, 1560); ctx.lineTo(120, 1384); ctx.lineTo(960, 1384); ctx.lineTo(1280, 1560); ctx.fill();
  // champion
  const k = E.outBack(P(lt, 0.0, 0.55));
  const fig = mixFig(VIC_DOWN, VIC_UP, k);
  ctx.save(); ctx.shadowColor = 'rgba(255,200,120,0.95)'; ctx.shadowBlur = 40;
  drawFigure(ctx, fig, cx, 1392, 2.75, '#120704', null);
  ctx.restore();
  drawFigure(ctx, fig, cx, 1392, 2.75, '#0c0503', null);
  const ropes = [[1300, '#c63a2a'], [1420, '#e8e0d4'], [1530, '#2a46c6']];
  ropes.forEach(([y, c]) => {
    ctx.strokeStyle = c; ctx.lineWidth = 10; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(-200, y + 80); ctx.quadraticCurveTo(540, y + 20, W + 200, y + 80); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  // crowd (foreground, dark)
  for (const c of CROWD) {
    const by = 1700 + c.row * 70, bob = Math.sin(lt * 7 + c.p) * 6 * (c.arm ? 1.5 : 0.5);
    const s = 1 + c.row * 0.25;
    ctx.fillStyle = `rgb(${8 + (3 - c.row) * 4},${4 + (3 - c.row) * 2},${3})`;
    ctx.beginPath(); ctx.arc(c.x, by - 50 * s + bob, 22 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.roundRect(c.x - 38 * s, by - 30 * s + bob, 76 * s, 200, 26 * s); ctx.fill();
    if (c.arm) { ctx.lineWidth = 14 * s; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x + 26 * s, by - 20 * s + bob); ctx.lineTo(c.x + 40 * s, by - 110 * s + bob * 2); ctx.stroke(); }
    if (c.ph && Math.sin(lt * 9 + c.p * 5) > 0.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, c.x + 40 * s, by - 120 * s, 40, 'rgba(255,255,255,A)', 0.8); ctx.restore(); }
  }
  ctx.restore();
  // embers
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of EMBERS) {
    const y = ((e.y - lt * e.v) % H + H) % H, x = e.x + Math.sin(lt * 2 + e.p) * 30;
    ctx.fillStyle = `rgba(255,${140 + e.s * 90},60,${0.25 + 0.6 * e.s})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + e.s * 3.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ───────────── HOOK · black ─────────────
const MOTES = (() => { const r = rng(10); return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: r(), p: r() * TAU })); })();
function shotHook(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.12 * m.s * (0.5 + 0.5 * Math.sin(t * 2 + m.p))})`;
    ctx.beginPath(); ctx.arc(m.x + Math.sin(t * 0.5 + m.p) * 20, (m.y - t * 15 * m.s + H) % H, 1 + m.s * 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ───────────── captions ─────────────
function wrap(ctx, words, maxW) {
  const lines = [[]]; let w = 0; const sp = ctx.measureText(' ').width;
  for (const word of words) {
    const ww = ctx.measureText(word).width;
    if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0; }
    lines[lines.length - 1].push(word); w += (w ? sp : 0) + ww;
  }
  return lines;
}
// words reveal with blur + rise; `accent` words are tinted gold
function caption(ctx, text, t, t0, { y = 600, size = 66, stagger = 0.16, accent = [], blur = true, pop = false } = {}) {
  ctx.save();
  ctx.font = `600 ${size}px ${SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const lines = text.split('|').flatMap(seg => wrap(ctx, seg.trim().split(' '), 900));
  const sp = ctx.measureText(' ').width, lh = size * 1.22;
  let wi = 0;
  lines.forEach((line, li) => {
    const lw = line.reduce((a, w, i) => a + ctx.measureText(w).width + (i ? sp : 0), 0);
    let x = W / 2 - lw / 2;
    const ly = y + (li - (lines.length - 1) / 2) * lh;
    for (const word of line) {
      const p = E.outCubic(P(t, t0 + wi * stagger, t0 + wi * stagger + 0.35));
      const ww = ctx.measureText(word).width;
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = p;
        if (blur && p < 1) ctx.filter = `blur(${(1 - p) * 10}px)`;
        ctx.translate(x + ww / 2, ly + (1 - p) * 18);
        if (pop) { const s = lerp(1.35, 1, E.outBack(P(t, t0 + wi * stagger, t0 + wi * stagger + 0.3))); ctx.scale(s, s); }
        ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
        ctx.fillStyle = accent.includes(word) ? '#ffd27a' : '#ffffff';
        ctx.fillText(word, -ww / 2, 0);
        ctx.restore();
      }
      x += ww + sp; wi++;
    }
  });
  ctx.restore();
}

// ───────────── timeline ─────────────
const SHOTS = [
  [3.2, 4.6, shotAlley, 'They make you depressed'],
  [4.6, 6.0, shotClass, 'They make you lonely'],
  [6.0, 7.4, shotField, 'They make you tired'],
  [7.4, 8.8, shotSwing, 'They make you uncomfortable'],
];
const PAYOFF = 9.3;
const CUTS = [3.2, 4.6, 6.0, 7.4, PAYOFF];

function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  // camera shake on cuts
  let sx = 0, sy = 0;
  for (const c of CUTS) { const d = t - c; if (d >= 0 && d < 0.4) { const k = Math.exp(-d * 14) * (c === PAYOFF ? 22 : 8); sx += k * Math.sin(d * 90 + c); sy += k * Math.cos(d * 77 + c); } }
  ctx.translate(sx, sy);
  if (t < 3.2) {
    shotHook(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    caption(ctx, 'When God wants | you to grow', t, 0.35, { y: 900, size: 76, stagger: 0.17 });
  } else if (t < 8.8) {
    const [t0, , fn, text] = SHOTS.find(s => t >= s[0] && t < s[1]);
    fn(ctx, t - t0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    caption(ctx, text, t, t0, { stagger: 0.0, blur: false });
  } else if (t < PAYOFF) {
    ctx.fillStyle = '#000'; ctx.fillRect(-50, -50, W + 100, H + 100);
    // heartbeat pulse
    const hb = Math.max(Math.exp(-Math.max(0, t - 8.85) * 10) * (t > 8.85 ? 1 : 0), Math.exp(-Math.max(0, t - 9.05) * 10) * (t > 9.05 ? 1 : 0));
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
    g.addColorStop(0, `rgba(120,20,10,${0.25 * hb})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    shotVictory(ctx, t - PAYOFF);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    caption(ctx, 'But they never | make you fail', t, PAYOFF + 0.15, { y: 430, size: 84, stagger: 0.14, accent: ['never'], pop: true });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // cut flashes
  for (const c of CUTS) {
    const d = t - c;
    if (d >= 0 && d < 0.5) { ctx.fillStyle = `rgba(255,${c === PAYOFF ? 235 : 255},${c === PAYOFF ? 200 : 255},${(c === PAYOFF ? 0.95 : 0.35) * Math.exp(-d * (c === PAYOFF ? 7 : 16))})`; ctx.fillRect(0, 0, W, H); }
  }
}

let NOISE = null;
function post(ctx, frame) {
  if (!NOISE) {
    NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256;
    const n = NOISE.getContext('2d'), id = n.createImageData(256, 256), r = rng(99);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    n.putImageData(id, 0, 0);
  }
  const r = rng(frame * 7 + 3);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
  const pat = ctx.createPattern(NOISE, 'repeat');
  pat.setTransform(new DOMMatrix().translate(Math.floor(r() * 256), Math.floor(r() * 256)).scale(1.5));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.45, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

const SAMPLES = 4, SHUTTER = 0.5;
const main = document.getElementById('c'), mctx = main.getContext('2d');
main.width = W; main.height = H;
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
const sctx = scratch.getContext('2d');
window.drawFrame = function (frame, samples = SAMPLES) {
  const t = frame / FPS;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < samples; i++) {
    const ts = clamp(t + ((i + 0.5) / samples - 0.5) * SHUTTER / FPS, 0, DUR - 1e-4);
    renderScene(sctx, ts);
    mctx.globalAlpha = 1 / (i + 1);
    mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
  post(mctx, frame);
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/png'); };
window.ready = Promise.all([document.fonts.load(`600 66px ${SANS}`)]);
