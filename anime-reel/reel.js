// "NEVER GIVE UP" — anime-style 9:16 Instagram Reel, fully procedural.
// Every shot is an original illustration drawn in code; every frame is a pure
// function of time. 1080x1920 @ 30fps, 4-sample motion blur.

const W = 1080, H = 1920, FPS = 30, DUR = 15;
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
  for (const [x, y, r] of fig.heads) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    for (const [a0, len, w = 0.32] of fig.hair || []) {
      const a = a0 + Math.sin(HAIR.t * HAIR.speed + a0 * 5) * HAIR.flutter;
      const L = len * HAIR.lift;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - w) * r * 0.9, y + Math.sin(a - w) * r * 0.9);
      ctx.lineTo(x + Math.cos(a) * (r + L), y + Math.sin(a) * (r + L));
      ctx.lineTo(x + Math.cos(a + w) * r * 0.9, y + Math.sin(a + w) * r * 0.9);
      ctx.fill();
    }
  }
}
const HAIR = { t: 0, speed: 3, flutter: 0.06, lift: 1 };
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
  hair: a.hair,
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
  hair: [[-2.0, 12], [-2.4, 15], [-2.8, 14], [-3.15, 11], [-1.6, 9], [-1.25, 7, 0.25]],
  heads: [[84, -80, 15]],
};
const DESK_SLUMP = { // seated, head down on folded arms (front view), origin at seat
  parts: [[0, -6, 27, 0, -54, 30], [-32, -54, 14, 32, -54, 14], [-44, -64, 11, 44, -64, 11]],
  heads: [[0, -80, 21]],
  hair: [[-1.57, 16], [-2.1, 14], [-1.05, 14], [-2.6, 12], [-0.55, 12], [-3.0, 9], [-0.15, 9]],
};
const STAND_SLOUCH = { // standing, head low, hands in pockets (faces right)
  parts: [
    [0, -90, 11, -4, -46, 9], [-4, -46, 9, -2, 0, 7], [-2, 0, 6, 12, 0, 5],
    [6, -90, 11, 10, -46, 9], [10, -46, 9, 14, 0, 7], [14, 0, 6, 26, 0, 5],
    [2, -92, 15, 9, -148, 17],
    [10, -146, 8, 13, -110, 7], [13, -110, 7, 9, -92, 7],
  ],
  hair: [[-2.0, 12], [-2.4, 15], [-2.8, 14], [-3.15, 11], [-1.6, 9], [-1.25, 7, 0.25]],
  heads: [[19, -164, 12]],
};
const SWING_HUNCH = { // on a swing seat at origin, elbows on knees, face in hands
  parts: [
    [-10, -8, 13, 40, -6, 11], [40, -6, 10, 44, 56, 8], [44, 58, 7, 62, 60, 6],
    [-8, -10, 17, 22, -68, 17],
    [20, -64, 8, 36, -14, 7], [36, -14, 7, 42, -54, 6],
  ],
  hair: [[-2.0, 12], [-2.4, 15], [-2.8, 14], [-3.15, 11], [-1.6, 9], [-1.25, 7, 0.25]],
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
  hair: [[-1.57, 22], [-1.95, 20], [-1.2, 20], [-2.35, 16], [-0.8, 16], [-2.75, 12], [-0.4, 12]],
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


// ───────────── anime kit ─────────────
const SERIF = '"Liberation Serif"';
const TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H;
const tctx = TMP.getContext('2d');

const KNEEL = { // on both knees, fists on the ground, head hanging (faces right)
  parts: [
    [-10, -55, 16, 40, -10, 12], [40, -10, 11, -40, -4, 8],
    [-6, -58, 18, 40, -120, 18],
    [42, -116, 9, 60, -60, 8], [60, -60, 8, 72, -8, 7], [74, -8, 10, 74, -8, 10],
    [36, -112, 9, 50, -58, 8], [50, -58, 8, 58, -8, 7],
  ],
  heads: [[64, -126, 15]],
  hair: [[-2.4, 12], [-2.0, 14], [-1.6, 13], [-1.2, 12], [-0.8, 11], [-2.8, 11], [1.3, 12, 0.25], [1.7, 10, 0.25]],
};
const POWER = { // standing, fists clenched at sides (front view)
  parts: [
    [-16, -98, 15, -30, -52, 12], [-30, -52, 11, -40, 0, 9], [-40, 0, 8, -52, 0, 7],
    [16, -98, 15, 30, -52, 12], [30, -52, 11, 40, 0, 9], [40, 0, 8, 52, 0, 7],
    [-34, -165, 13, 34, -165, 13], [0, -170, 9, 0, -184, 9],
    [-36, -164, 11, -54, -120, 9], [-54, -120, 9, -58, -80, 8], [-58, -78, 12, -58, -74, 12],
    [36, -164, 11, 54, -120, 9], [54, -120, 9, 58, -80, 8], [58, -78, 12, 58, -74, 12],
  ],
  polys: VIC_UP.polys,
  heads: [[0, -198, 17]],
  hair: [[-1.57, 30], [-1.9, 28], [-1.25, 28], [-2.25, 24], [-0.9, 24], [-2.6, 18], [-0.55, 18], [-2.95, 12], [-0.2, 12]],
};

// manga concentration lines
function speedLines(ctx, cx, cy, t, { n = 110, inner = 430, col = '255,255,255', a = 0.55, w = 9 } = {}) {
  const r = rng(Math.floor(t * 15) + 77);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU, ri = inner * (0.7 + r() * 0.6), ww = (0.3 + r()) * w * 0.004;
    ctx.fillStyle = `rgba(${col},${a * (0.4 + 0.6 * r())})`;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * ri, cy + Math.sin(ang) * ri);
    ctx.lineTo(cx + Math.cos(ang - ww) * 2400, cy + Math.sin(ang - ww) * 2400);
    ctx.lineTo(cx + Math.cos(ang + ww) * 2400, cy + Math.sin(ang + ww) * 2400);
    ctx.fill();
  }
  ctx.restore();
}

// jagged lightning bolt
function bolt(ctx, x1, y1, x2, y2, seed, disp = 120, col = 'rgba(190,240,255,1)', lw = 4) {
  const r = rng(seed);
  let pts = [[x1, y1], [x2, y2]];
  for (let k = 0; k < 6; k++) {
    const np = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const d = disp / Math.pow(1.8, k);
      np.push([(ax + bx) / 2 + (r() - 0.5) * d, (ay + by) / 2 + (r() - 0.5) * d], [bx, by]);
    }
    pts = np;
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [w, c] of [[lw * 5, 'rgba(80,160,255,0.25)'], [lw * 2, 'rgba(150,210,255,0.6)'], [lw, col]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  }
  ctx.restore();
}

// flame aura around a body region
const FLAMES = (() => { const r = rng(21); return Array.from({ length: 70 }, () => ({ u: r(), v: r(), p: r(), s: 0.6 + r() * 0.8, w: 0.6 + r() * 0.8 })); })();
const AUR = document.createElement('canvas'); AUR.width = W / 2; AUR.height = H / 2;
const actx = AUR.getContext('2d');
function aura(ctx, cx, footY, w, h, t, k, pal = ['255,140,30', '255,215,90', '255,252,230'], front = false) {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, cx, footY - h * 0.45, h * 0.9, `rgba(${pal[0]},A)`, 0.5 * k);
  actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W / 2, H / 2);
  actx.setTransform(0.5, 0, 0, 0.5, 0, 0); actx.globalCompositeOperation = 'lighter';
  FLAMES.forEach((f, i) => {
    const ph = (t * 1.8 * f.s + f.p) % 1;
    const side = f.u < 0.5 ? -1 : 1, edge = Math.abs(f.u - 0.5) * 2;
    const top = i % 6 === 0;
    const bx = front ? cx + (f.u - 0.5) * w : top ? cx + (f.u - 0.5) * w * 0.5 : cx + side * w * (0.25 + 0.3 * edge) * (1 + ph * 0.5);
    const by = top ? footY - h * (0.75 + 0.1 * f.v) - ph * h * 0.2 : footY - f.v * h * 0.8 - ph * h * 0.35;
    const fh = h * (0.18 + 0.3 * f.s) * k * (1 - ph * 0.45), fw = 26 * f.w * (0.6 + k * 0.5);
    const sway = Math.sin(t * 9 + i) * fw * 0.5 + (top ? 0 : side * fh * 0.18);
    const a = Math.sin(Math.PI * ph);
    [[pal[0], 1, 0.45], [pal[1], 0.62, 0.5], [pal[2], 0.3, 0.65]].forEach(([c, sc, al]) => {
      const W2 = fw * sc, H2 = fh * sc;
      actx.fillStyle = `rgba(${c},${al * a})`;
      actx.beginPath(); actx.moveTo(bx - W2, by);
      actx.bezierCurveTo(bx - W2, by - H2 * 0.45, bx + sway - W2 * 0.15, by - H2 * 0.75, bx + sway, by - H2);
      actx.bezierCurveTo(bx + sway + W2 * 0.15, by - H2 * 0.75, bx + W2, by - H2 * 0.45, bx + W2, by);
      actx.arc(bx, by, W2, 0, Math.PI); actx.fill();
    });
  });
  ctx.filter = 'blur(5px)';
  ctx.drawImage(AUR, 0, 0, W, H);
  ctx.filter = 'none';
  ctx.drawImage(AUR, 0, 0, W, H);
  ctx.restore();
}

// ───────────── anime eye close-up ─────────────
// mood: 'sad' | 'shock' | 'power'
function shotEye(ctx, lt, mood) {
  const sad = mood === 'sad', shock = mood === 'shock', power = mood === 'power';
  ctx.save();
  if (shock) ctx.translate(Math.sin(lt * 80) * 10, Math.cos(lt * 67) * 7);
  push(ctx, 540, 960, sad ? lerp(1.0, 1.08, lt / 2.5) : power ? lerp(1.15, 1.0, E.outExpo(clamp(lt / 0.5))) : lerp(1.0, 1.2, E.outExpo(clamp(lt / 0.2))));
  // skin, cel-shaded in two tones
  const skin = power ? '#f2c79c' : '#d9b49a', shade = power ? '#c7875f' : '#a98575';
  ctx.fillStyle = skin; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.moveTo(-200, -200); ctx.lineTo(W + 200, -200); ctx.lineTo(W + 200, 640);
  ctx.bezierCurveTo(700, 760, 300, 700, -200, 820); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-200, 1100); ctx.quadraticCurveTo(80, 1300, 60, H + 200); ctx.lineTo(-200, H + 200); ctx.fill();
  // nose bridge line + cheek
  ctx.strokeStyle = 'rgba(90,50,40,0.5)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(80, 980); ctx.quadraticCurveTo(110, 1180, 70, 1400); ctx.stroke();
  // eyebrow
  const browIn = sad ? -40 : shock ? -70 : 40;
  ctx.fillStyle = '#1a1210';
  ctx.beginPath(); ctx.moveTo(150, 700 + browIn); ctx.quadraticCurveTo(520, 590 + browIn * 0.4, 960, 660);
  ctx.lineTo(950, 690); ctx.quadraticCurveTo(520, 640 + browIn * 0.4, 160, 740 + browIn); ctx.fill();

  // eye geometry
  const ex = 560, ey = 960, hw = 380;
  let open = sad ? 0.55 : shock ? 1.05 : 1.0;
  if (sad) { const b = P(lt, 1.55, 1.65) - P(lt, 1.7, 1.85); open *= 1 - clamp(b) * 0.95; }
  if (power) open = lerp(0.1, 1.0, E.outBack(clamp(lt / 0.18)));
  const topY = lerp(ey + 90, ey - 260, open), botY = ey + 170;
  const eyePath = () => {
    ctx.beginPath(); ctx.moveTo(ex - hw, ey + 30);
    ctx.bezierCurveTo(ex - hw * 0.5, topY, ex + hw * 0.5, topY, ex + hw, ey - 20);
    ctx.bezierCurveTo(ex + hw * 0.4, botY, ex - hw * 0.5, botY, ex - hw, ey + 30); ctx.closePath();
  };
  ctx.save(); eyePath(); ctx.clip();
  ctx.fillStyle = '#f4efe9'; ctx.fillRect(ex - hw, ey - 300, hw * 2, 600);
  // iris
  const look = sad ? -40 : 0, iS = shock ? 0.62 : 1, pS = shock ? 0.28 : power ? 0.55 : 1;
  const ix = ex + look, iy = ey + 20, irx = 175 * iS, iry = 215 * iS;
  const ig = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
  if (power) { ig.addColorStop(0, '#7a2a00'); ig.addColorStop(0.5, '#ff9a1a'); ig.addColorStop(1, '#fff1a0'); }
  else if (shock) { ig.addColorStop(0, '#0b1830'); ig.addColorStop(1, '#4a7fc0'); }
  else { ig.addColorStop(0, '#0d1428'); ig.addColorStop(1, '#3e5f96'); }
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU); ctx.fill();
  if (power) { // radial streaks + rings
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU + lt * 0.8;
      ctx.strokeStyle = `rgba(255,230,140,${0.25 + 0.25 * Math.sin(i * 3 + lt * 10)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * irx * 0.35, iy + Math.sin(a) * iry * 0.35); ctx.lineTo(ix + Math.cos(a) * irx * 0.95, iy + Math.sin(a) * iry * 0.95); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#05070c'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#04050a'; ctx.beginPath(); ctx.ellipse(ix, iy + 10, 72 * pS * iS, power ? 120 * iS : 95 * pS * iS, 0, 0, TAU); ctx.fill();
  // lid shadow band
  ctx.fillStyle = 'rgba(60,40,70,0.35)';
  ctx.beginPath(); ctx.moveTo(ex - hw, topY - 40); ctx.bezierCurveTo(ex - hw * 0.5, topY + 30, ex + hw * 0.5, topY + 30, ex + hw, topY - 40); ctx.lineTo(ex + hw, topY - 200); ctx.lineTo(ex - hw, topY - 200); ctx.fill();
  // highlights
  ctx.fillStyle = power ? '#fffbe8' : '#ffffff';
  ctx.beginPath(); ctx.ellipse(ix - 70 * iS, iy - 90 * iS, 48 * iS, 34 * iS, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + 75 * iS, iy + 85 * iS, 18 * iS, 0, TAU); ctx.fill();
  if (sad) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(ix, iy + 150, 150, 26, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  // upper lid line with wing + lashes
  ctx.fillStyle = '#0a0606';
  ctx.beginPath(); ctx.moveTo(ex - hw - 10, ey + 34);
  ctx.bezierCurveTo(ex - hw * 0.5, topY - 26, ex + hw * 0.5, topY - 26, ex + hw + 60, ey - 60);
  ctx.lineTo(ex + hw + 20, ey - 8);
  ctx.bezierCurveTo(ex + hw * 0.5, topY + 12, ex - hw * 0.5, topY + 12, ex - hw - 10, ey + 34); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const bx = ex + hw - 30 + i * 30, by = lerp(topY, ey - 30, 0.75 + i * 0.1);
    ctx.beginPath(); ctx.moveTo(bx - 14, by); ctx.lineTo(bx + 60 + i * 10, by - 70 + i * 26); ctx.lineTo(bx + 14, by + 6); ctx.fill();
  }
  // lower lid
  ctx.strokeStyle = 'rgba(40,20,20,0.75)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(ex - hw * 0.4, botY - 12); ctx.quadraticCurveTo(ex + hw * 0.3, botY + 6, ex + hw * 0.85, ey + 50); ctx.stroke();
  // tear
  if (sad) {
    const tp = P(lt, 0.6, 2.4);
    if (tp > 0) {
      const ty = lerp(botY - 10, botY + 520, E.inOutCubic(tp)), tx = ex - 120 + tp * 20;
      ctx.fillStyle = 'rgba(200,230,255,0.85)';
      ctx.beginPath(); ctx.moveTo(tx, ty - 46); ctx.quadraticCurveTo(tx + 22, ty, tx, ty + 14); ctx.quadraticCurveTo(tx - 22, ty, tx, ty - 46); ctx.fill();
      ctx.strokeStyle = 'rgba(200,230,255,0.35)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex - 120, botY - 10); ctx.lineTo(tx, ty - 40); ctx.stroke();
    }
  }
  if (shock) { // shock lines + sweat
    ctx.strokeStyle = 'rgba(20,10,30,0.7)'; ctx.lineWidth = 6;
    for (let i = 0; i < 9; i++) { const x = 120 + i * 100; ctx.beginPath(); ctx.moveTo(x, 1230); ctx.lineTo(x + 10, 1480 + (i % 3) * 60); ctx.stroke(); }
    ctx.fillStyle = 'rgba(210,235,255,0.9)';
    ctx.beginPath(); ctx.moveTo(930, 520); ctx.quadraticCurveTo(990, 640, 940, 660); ctx.quadraticCurveTo(880, 640, 930, 520); ctx.fill();
  }
  // hair strands over the brow
  HAIR.t = lt;
  ctx.fillStyle = power ? '#1a0d05' : '#0b0c12';
  for (let i = 0; i < 7; i++) {
    const bx = -60 + i * 190, sw = Math.sin(lt * (power ? 14 : 2) + i) * (power ? 50 : 14);
    const up = power ? E.outCubic(clamp(lt / 0.3)) : 0;
    const tipY = lerp(560 + (i % 2) * 140, -150, up);
    ctx.beginPath(); ctx.moveTo(bx - 120, -200); ctx.quadraticCurveTo(bx + sw, tipY * 0.5, bx + 40 + sw, tipY); ctx.quadraticCurveTo(bx + 60, tipY * 0.5, bx + 120, -200); ctx.fill();
  }
  ctx.restore();
  // lighting / mood
  if (sad) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#3c5578'; ctx.fillRect(0, 0, W, H); ctx.restore();
    for (const d of RAIN) {
      const y = ((d.y + lt * d.v) % 2200) - 140, x = d.x + y * 0.14;
      ctx.strokeStyle = `rgba(185,220,235,${0.1 + d.d * 0.22})`; ctx.lineWidth = 1 + d.d * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d.l * 0.14, y - d.l * (0.6 + d.d)); ctx.stroke();
    }
  } else if (shock) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#7a3a48'; ctx.fillRect(0, 0, W, H); ctx.restore();
    speedLines(ctx, 560, 980, lt, { col: '0,0,0', a: 0.75, inner: 520 });
  } else {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = '#ff8a1a'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 560, 980, 520, 'rgba(255,160,40,A)', 0.3);
    ctx.restore();
    aura(ctx, 540, H + 300, 1300, 1100, lt, 0.45, undefined, true);
    speedLines(ctx, 560, 980, lt, { col: '255,240,200', a: 0.5, inner: 600 });
  }
}

// ───────────── "Give up?" · kneeling in the storm ─────────────
function shotKneel(ctx, lt) {
  ctx.save();
  push(ctx, 560, 1300, lerp(1.0, 1.12, E.outCubic(clamp(lt / 0.75))));
  ctx.fillStyle = grad(ctx, 0, 1350, [[0, '#14030a'], [0.6, '#5a0f1e'], [1, '#a3262a']]);
  ctx.fillRect(-200, -200, W + 400, 1560);
  // storm clouds (cel bands)
  ctx.fillStyle = 'rgba(20,4,10,0.75)';
  for (let i = 0; i < 6; i++) { const y = 200 + i * 150, x = ((i * 280 + lt * 60) % 1600) - 400; ctx.beginPath(); ctx.ellipse(x + 400, y, 520, 60 + i * 6, 0, 0, TAU); ctx.fill(); }
  const fl = Math.floor(lt * 10) % 4 === 1;
  if (fl) { bolt(ctx, 820, -50, 700, 1300, Math.floor(lt * 10) + 5, 260); ctx.fillStyle = 'rgba(255,220,230,0.18)'; ctx.fillRect(-200, -200, W + 400, H + 400); }
  // ruined ground
  ctx.fillStyle = grad(ctx, 1340, H, [[0, '#1a0508'], [1, '#050102']]);
  ctx.fillRect(-200, 1340, W + 400, 800);
  ctx.strokeStyle = 'rgba(255,90,70,0.25)'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(560, 1360); ctx.lineTo(560 + Math.cos(i * 0.9 + 0.3) * 600, 1360 + Math.abs(Math.sin(i * 0.9 + 0.3)) * 400 + 40); ctx.stroke(); }
  HAIR.t = lt; HAIR.flutter = 0.1;
  drawFigure(ctx, KNEEL, 500, 1360, 3.0, '#080204', 'rgba(255,90,90,0.9)', -4, 2);
  HAIR.flutter = 0.06;
  ctx.restore();
  for (const d of RAIN) {
    const y = ((d.y + lt * d.v * 1.3) % 2200) - 140, x = d.x + y * 0.25;
    ctx.strokeStyle = `rgba(255,190,200,${0.1 + d.d * 0.25})`; ctx.lineWidth = 1 + d.d * 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d.l * 0.25, y - d.l); ctx.stroke();
  }
}

// ───────────── power-up ─────────────
const DEBRIS = (() => { const r = rng(31); return Array.from({ length: 40 }, () => ({ x: r() * 1300 - 110, y: 1380 + r() * 400, s: 8 + r() * 40, v: 80 + r() * 260, a: r() * TAU, p: r(), sides: 4 + Math.floor(r() * 3) })); })();
function shotPower(ctx, lt, { zoom = 1, fx = 540, fy = 1100, k = 1, bolts = false } = {}) {
  const cx = 540, foot = 1420;
  ctx.save();
  push(ctx, fx, fy, zoom * lerp(1.0, 1.05, clamp(lt / 2.5)));
  ctx.fillStyle = grad(ctx, 0, foot, [[0, '#06040a'], [0.7, '#2a0f06'], [1, '#5a2008']]);
  ctx.fillRect(-300, -300, W + 600, foot + 300);
  // sky rays
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, 1050);
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + (i - 9.5) * 0.11 + Math.sin(lt * 2 + i) * 0.01;
    ctx.fillStyle = `rgba(255,150,40,${0.05 * k})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2400, a - 0.025, a + 0.025); ctx.fill();
  }
  ctx.restore();
  // ground
  ctx.fillStyle = grad(ctx, foot - 10, H, [[0, '#2a1208'], [1, '#080302']]);
  ctx.beginPath(); ctx.moveTo(-300, foot + 60); ctx.quadraticCurveTo(540, foot - 30, W + 300, foot + 60); ctx.lineTo(W + 300, H + 300); ctx.lineTo(-300, H + 300); ctx.fill();
  // glowing cracks
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cr = rng(41);
  for (let i = 0; i < 10; i++) {
    let x = cx + (cr() - 0.5) * 60, y = foot + 10, a = (cr() < 0.5 ? Math.PI - 0.2 : 0.2) + (cr() - 0.5) * 0.5;
    const len = lerp(0, 1, k);
    ctx.strokeStyle = 'rgba(255,170,60,0.9)'; ctx.lineWidth = 4; ctx.shadowColor = '#ff8a1a'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 8 * len; j++) { a += (cr() - 0.5) * 0.7; x += Math.cos(a) * 50; y += Math.abs(Math.sin(a)) * 30 + 6; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  // shockwave ring on the ground
  const sw = (lt * 1.6) % 1;
  ctx.strokeStyle = `rgba(255,220,150,${0.6 * (1 - sw) * k})`; ctx.lineWidth = 10 * (1 - sw) + 1;
  ctx.beginPath(); ctx.ellipse(cx, foot + 10, 60 + sw * 900, 12 + sw * 150, 0, 0, TAU); ctx.stroke();
  // rising debris
  for (const d of DEBRIS) {
    const y = d.y - ((lt * d.v + d.p * 900) % 1300) * k, x = d.x + Math.sin(lt + d.a) * 10;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d.a + lt * (d.p - 0.5) * 3);
    ctx.fillStyle = '#140804'; ctx.strokeStyle = 'rgba(255,170,80,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let j = 0; j < d.sides; j++) { const a = j / d.sides * TAU; const rr = d.s * (0.7 + 0.3 * Math.sin(j * 2.3 + d.a)); j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // aura + figure
  aura(ctx, cx, foot, 360, 900, lt, k);
  HAIR.t = lt; HAIR.speed = 22; HAIR.flutter = 0.12; HAIR.lift = 1 + 0.3 * Math.sin(lt * 20) * k;
  ctx.save(); ctx.shadowColor = 'rgba(255,190,90,1)'; ctx.shadowBlur = 50 * k;
  drawFigure(ctx, POWER, cx, foot, 3.0, '#0b0503', null);
  ctx.restore();
  drawFigure(ctx, POWER, cx, foot, 3.0, '#0b0503', 'rgba(255,220,140,1)', 0, 3);
  HAIR.speed = 3; HAIR.flutter = 0.06; HAIR.lift = 1;
  // glowing eyes
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) { glow(ctx, cx + s * 17, foot - 3.0 * 200, 40, 'rgba(255,230,140,A)', k); ctx.fillStyle = '#fff6d0'; ctx.fillRect(cx + s * 17 - 9, foot - 600 - 2, 18, 5); }
  ctx.restore();
  if (bolts) for (let i = 0; i < 3; i++) {
    const sd = Math.floor(lt * 12) * 3 + i, r = rng(sd), a = r() * TAU;
    bolt(ctx, cx + Math.cos(a) * 60, foot - 400 + Math.sin(a) * 200, cx + Math.cos(a) * (300 + r() * 300), foot - 400 + Math.sin(a) * (300 + r() * 400), sd, 160);
  }
  ctx.restore();
  // embers
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of EMBERS) {
    const y = ((e.y - lt * e.v * 2) % H + H) % H, x = e.x + Math.sin(lt * 3 + e.p) * 30;
    ctx.fillStyle = `rgba(255,${150 + e.s * 90},60,${(0.3 + 0.6 * e.s) * k})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + e.s * 4, 0, TAU); ctx.fill();
  }
  ctx.restore();
  speedLines(ctx, 540, 860, lt, { col: '255,230,190', a: 0.35 * k, inner: 560 });
}

// black/white/red impact frame of any shot
function impactFrame(ctx, draw, lt) {
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.globalCompositeOperation = 'source-over'; tctx.filter = 'none';
  draw(tctx, lt);
  ctx.save();
  ctx.filter = 'grayscale(1) contrast(4) invert(1)';
  ctx.drawImage(TMP, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#ff3a3a'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  speedLines(ctx, 540, 900, lt + 1, { col: '0,0,0', a: 0.9, inner: 380, w: 14 });
}

// victory with aura (final)
function shotFinal(ctx, lt) {
  shotVictory(ctx, lt);
  ctx.save();
  push(ctx, 540, 1100, lerp(1.0, 1.12, E.inOutSine(clamp(lt / 4.7))));
  ctx.restore();
  speedLines(ctx, 540, 900, lt, { col: '255,235,200', a: 0.25 * (1 - P(lt, 0.4, 1.6)), inner: 500 });
}

// ───────────── serif captions (reference style) ─────────────
function scap(ctx, text, t, t0, { y = 1260, size = 82, stagger = 0.12, accent = [], pop = false, out = 99 } = {}) {
  const fade = 1 - P(t, out, out + 0.15);
  if (fade <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${SERIF}`; ctx.textBaseline = 'middle';
  const lines = text.split('|').flatMap(seg => wrap(ctx, seg.trim().split(' '), 920));
  const sp = ctx.measureText(' ').width, lh = size * 1.12;
  let wi = 0;
  lines.forEach((line, li) => {
    const lw = line.reduce((a, w, i) => a + ctx.measureText(w).width + (i ? sp : 0), 0);
    let x = W / 2 - lw / 2;
    const ly = y + (li - (lines.length - 1) / 2) * lh;
    for (const word of line) {
      const ws = t0 + wi * stagger;
      const p = E.outCubic(P(t, ws, ws + 0.18));
      const ww = ctx.measureText(word).width;
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = p * fade;
        ctx.translate(x + ww / 2, ly);
        const s = pop ? lerp(1.6, 1, E.outBack(P(t, ws, ws + 0.22))) : 1;
        ctx.scale(s, s);
        ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
        ctx.strokeText(word, -ww / 2, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = accent.includes(word) ? '#ffcf5a' : '#ffffff';
        ctx.fillText(word, -ww / 2, 0);
        ctx.restore();
      }
      x += ww + sp; wi++;
    }
  });
  ctx.restore();
}

// ───────────── timeline (120 BPM grid) ─────────────
const sub = (fn, ...a) => (c, lt) => fn(c, lt, ...a);
const zoomed = (fn, fx, fy, z) => (c, lt) => { c.save(); push(c, fx, fy, z); fn(c, lt + 0.75); c.restore(); };
const TL = [
  [0.0, 2.5, sub(shotEye, 'sad')],
  [2.5, 3.25, shotAlley], [3.25, 4.0, zoomed(shotAlley, 560, 1250, 1.7)],
  [4.0, 4.75, shotClass], [4.75, 5.5, zoomed(shotClass, 760, 960, 2.2)],
  [5.5, 6.25, shotField], [6.25, 7.0, zoomed(shotField, 720, 1250, 2.0)],
  [7.0, 7.75, shotSwing], [7.75, 8.5, zoomed(shotSwing, 600, 1300, 1.8)],
  [8.5, 9.25, shotKneel],
  [9.25, 9.75, sub(shotEye, 'shock')],
  [9.75, 10.25, null],
  [10.25, 10.75, sub(shotEye, 'power')],
  [10.75, 11.25, sub(shotPower, { k: 1 })],
  [11.25, 11.5, (c, lt) => impactFrame(c, sub(shotPower, { k: 1, bolts: true }), lt + 0.5)],
  [11.5, 12.0, sub(shotPower, { zoom: 2.0, fx: 540, fy: 820, k: 1, bolts: true })],
  [12.0, 12.25, (c, lt) => impactFrame(c, sub(shotPower, { zoom: 1.4, fy: 1000, k: 1, bolts: true }), lt + 1.0)],
  [12.25, 12.75, sub(shotPower, { zoom: 0.9, k: 1.2, bolts: true })],
  [12.75, 15.0, shotFinal],
];
const CUTS = TL.map(s => s[0]).filter(t => t > 0);
const BIG = [10.25, 11.25, 12.0, 12.75];

function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  let sx = 0, sy = 0;
  for (const c of CUTS) {
    const d = t - c;
    if (d >= 0 && d < 0.4) { const k = Math.exp(-d * 14) * (BIG.includes(c) ? 26 : 9); sx += k * Math.sin(d * 90 + c); sy += k * Math.cos(d * 77 + c); }
  }
  if (t >= 11.5 && t < 12.75) { sx += Math.sin(t * 97) * 6; sy += Math.cos(t * 83) * 6; }
  ctx.translate(sx, sy);
  const seg = TL.find(s => t >= s[0] && t < s[1]) || TL[TL.length - 1];
  if (seg[2]) seg[2](ctx, t - seg[0]);
  else { // heartbeat black
    ctx.fillStyle = '#000'; ctx.fillRect(-50, -50, W + 100, H + 100);
    const hb = [9.8, 10.0].reduce((m, h) => Math.max(m, t > h ? Math.exp(-(t - h) * 10) : 0), 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
    g.addColorStop(0, `rgba(140,20,10,${0.3 * hb})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // captions
  if (t < 2.5) scap(ctx, 'When God wants | you to grow', t, 0.3, { stagger: 0.16 });
  if (t >= 2.5) {
    if (t < 4.0) scap(ctx, 'They make you depressed', t, 2.5, { stagger: 0 });
    else if (t < 5.5) scap(ctx, 'They make you lonely', t, 4.0, { stagger: 0 });
    else if (t < 7.0) scap(ctx, 'They make you tired', t, 5.5, { stagger: 0 });
    else if (t < 8.5) scap(ctx, 'They make you | uncomfortable', t, 7.0, { stagger: 0 });
    else if (t < 9.9) scap(ctx, 'Give up?', t, 8.55, { size: 120, pop: true, out: 9.75 });
    else if (t < 12.75) scap(ctx, "I'll Never | Give Up", t, 10.25, { size: 116, stagger: 0.18, pop: true, accent: ['Never'] });
    else scap(ctx, 'But they never | make you fail', t, 12.85, { size: 88, stagger: 0.14, pop: true, accent: ['never'] });
  }
  // flashes
  for (const c of CUTS) {
    const d = t - c, big = BIG.includes(c);
    if (d >= 0 && d < 0.4) { ctx.fillStyle = `rgba(255,${big ? 240 : 255},${big ? 210 : 255},${(big ? 0.9 : 0.3) * Math.exp(-d * (big ? 9 : 18))})`; ctx.fillRect(0, 0, W, H); }
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
    mctx.filter = 'saturate(1.3) contrast(1.08)';
    mctx.drawImage(scratch, 0, 0);
    mctx.filter = 'none';
  }
  mctx.globalAlpha = 1;
  post(mctx, frame);
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/png'); };
window.ready = Promise.all([document.fonts.load(`600 66px ${SANS}`), document.fonts.load(`700 80px ${SERIF}`)]);
