// REBORN — film cut. One story told with four motifs: the dot (you), the grid (other people),
// the line (the plan), the light (what you become). Grey and cold → warm → full light.
// Three big moments only (reborn / become the light / reborn again). Film finish: grain, gate
// weave, halation, dust, light leaks. 1080x1920 @ 60fps, 45.7s.
const W = 1080, H = 1920, FPS = 60, DUR = 45.7;
window.META = { W, H, FPS, DUR };
const SANS = '"Inter Display"', SERIF = '"Instr"';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3), inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outQuart: x => 1 - Math.pow(1 - x, 4),
  outBounce: x => { const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375; return n1 * (x -= 2.625 / d1) * x + .984375; },
};
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const noise1 = x => { const i = Math.floor(x), f = x - i, h = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); };
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixc = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const rgb = (c, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;

// ───────── the speech (measured from the subtitle track) ─────────
const PH = [
  { txt: "that version|of myself|is a *memory*", al: 'left', x: 96, y: 1250, s: 92 },
  { txt: "i don't need it|*anymore*", al: 'left', x: 96, y: 1300, s: 92 },
  { txt: "i want|to WIN", al: 'center', y: 1330, s: 128, big: { WIN: 1.7 } },
  { txt: "now is the time", al: 'center', y: 1500, s: 54, ls: 10 },
  { txt: "to be|REBORN", al: 'center', y: 1300, s: 70, big: { REBORN: 3.0 } },
  { txt: "no matter how much|you knock on the door|to someone's *heart*", al: 'left', x: 96, y: 1290, s: 76 },
  { txt: "in the end|you can't|change *them*", al: 'right', x: 984, y: 1270, s: 96 },
  { txt: "which is why|you have to be|the *one*", al: 'center', y: 1280, s: 88, big: { 'one': 1.6 } },
  { txt: "to change|*yourself*", al: 'center', y: 1320, s: 110, big: { 'yourself': 1.3 } },
  { txt: "when the world|around you isn't|following your *plan*", al: 'left', x: 96, y: 1330, s: 78 },
  { txt: "the only way|to fix it", al: 'left', x: 96, y: 1360, s: 92 },
  { txt: "is to|FIX YOU", al: 'center', y: 1330, s: 80, big: { FIX: 2.4, YOU: 2.4 } },
  { txt: "if i can't see the light|that leads|to the goal", al: 'center', y: 1420, s: 56, ls: 6 },
  { txt: "then i need to|BECOME|the *light*", al: 'center', y: 1250, s: 72, big: { BECOME: 2.7, 'light': 1.6 } },
  { txt: "watch me,|i'll devour it", al: 'left', x: 96, y: 1330, s: 100 },
  { txt: "and turn it|into *light*", al: 'right', x: 984, y: 1330, s: 104, big: { 'light': 1.4 } },
  { txt: "if it means|winning", al: 'center', y: 1460, s: 62, ls: 8 },
  { txt: "i don't mind|DESTROYING|my own self", al: 'center', y: 1270, s: 66, big: { DESTROYING: 2.4 } },
  { txt: "i'll be|reborn again", lockup: true },
  { txt: "as many times as it takes", al: 'center', y: 1520, s: 46, ls: 10 },
];
const WIN = [[0.05, 1.9], [2.1, 3.5], [3.8, 5.2], [5.5, 6.9], [7.1, 8.2], [9.4, 12.2], [12.4, 14.5], [15.5, 16.9], [17.4, 18.6], [19.7, 22.0],
  [22.5, 23.6], [23.8, 24.9], [25.9, 28.3], [28.5, 30.4], [31.5, 33.2], [33.4, 34.7], [35.8, 37.2], [37.5, 39.9], [41.6, 43.2], [43.6, 45.4]];
const EXACT = { 7: [15.5, 15.8, 16.4], 8: [17.4, 17.9], 11: [23.8, 24.1], 14: [31.5, 32.0], 15: [33.4, 34.4], 16: [35.8, 36.2], 18: [41.6, 41.85] };
const syl = w => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g) || []).length);
const WORDS = [];
PH.forEach((ph, pi) => {
  const lines = ph.txt.split('|').map(l => l.split(' ')), [w0, w1] = WIN[pi];
  const lsy = lines.map(l => l.reduce((a, w) => a + syl(w), 0)), tot = lsy.reduce((a, b) => a + b, 0);
  let acc = 0;
  const starts = EXACT[pi] || lsy.map(v => { const s = w0 + (w1 - w0) * 0.9 * acc / tot; acc += v; return s; });
  lines.forEach((l, li) => {
    const end = li + 1 < lines.length ? starts[li + 1] : Math.max(starts[li] + 0.3, w1 - 0.1);
    const ws = l.map(syl), wt = ws.reduce((a, b) => a + b, 0); let a2 = 0;
    l.forEach((raw, wi) => {
      const it = raw.startsWith('*'), word = raw.replace(/\*/g, '');
      WORDS.push({ pi, li, wi, word, it, t: starts[li] + (end - starts[li]) * 0.85 * a2 / wt });
      a2 += ws[wi];
    });
  });
});
const wordT = (pi, w) => WORDS.find(x => x.pi === pi && x.word === w).t;
const T_REBORN = wordT(4, 'REBORN'), T_BECOME = wordT(13, 'BECOME'), T_DESTROY = wordT(17, 'DESTROYING'), T_LIGHT2 = wordT(15, 'light'), T_AGAIN = 41.85;
const KNOCKS = [9.9, 10.3, 10.7, 11.25, 11.65, 12.05];
const BIG = [T_REBORN, T_BECOME, T_AGAIN];

// ───────── the colour arc ─────────
const COLD = hex('#0C0D10'), WARMBG = hex('#17100A'), CREAM = hex('#EEE5D3'), INKD = hex('#15110D');
const GREYDOT = hex('#80838A'), AMBER = hex('#FFB347'), AMBERD = hex('#D9761A'), PAPER = hex('#EAE4D8');
function warmth(t) {
  let w = 0;
  w = Math.max(w, 0.3 * E.outCubic(P(t, T_REBORN, T_REBORN + 0.6)));
  w += 0.12 * P(t, 16.2, 18.4);
  w += 0.45 * E.outCubic(P(t, T_BECOME, T_BECOME + 0.9));
  w -= 0.5 * E.inOutCubic(P(t, T_DESTROY - 0.2, T_DESTROY + 1.5));
  w += 0.65 * E.outCubic(P(t, T_AGAIN, T_AGAIN + 0.5));
  return clamp(w);
}
const invK = t => E.inOutCubic(P(t, 42.05, 42.7)) * (1 - E.inOutCubic(P(t, 45.15, 45.6)));
const bgCol = t => mixc(mixc(COLD, WARMBG, warmth(t)), CREAM, invK(t));
const inkCol = t => mixc(PAPER, INKD, invK(t));
const accent = t => mixc(mixc(GREYDOT, AMBER, warmth(t)), AMBERD, invK(t));

// ───────── the dot: position, size ─────────
const DOTK = [[0, 540, 760], [9.5, 540, 760], [10.4, 600, 700], [12.6, 600, 700], [15.3, 540, 780], [19.3, 540, 780], [20.0, 230, 1010],
  [25.3, 230, 1010], [26.1, 540, 800], [41.0, 540, 800]];
function dotXY(t) {
  let i = 0; while (i < DOTK.length - 2 && t >= DOTK[i + 1][0]) i++;
  const [t0, x0, y0] = DOTK[i], [t1, x1, y1] = DOTK[i + 1], k = E.inOutCubic(P(t, t0, t1));
  let x = lerp(x0, x1, k), y = lerp(y0, y1, k);
  for (const kn of KNOCKS) x += 22 * Math.sin(Math.PI * P(t, kn - 0.09, kn + 0.07));   // nudge forward on each knock
  return [x, y];
}
function dotR(t) {
  let r = 22;
  r += 6 * E.outCubic(P(t, T_REBORN, T_REBORN + 0.5));
  r += 3 * E.outCubic(P(t, 17.9, 18.4));
  r += 8 * E.inOutCubic(P(t, 31.5, 33.6)) * (1 - P(t, T_LIGHT2, T_LIGHT2 + 0.6));
  r += 3 * Math.sin(Math.PI * P(t, 3.95, 4.35)) + 4 * Math.sin(Math.PI * P(t, 4.5, 4.95));       // want… WIN
  return r;
}
// ───────── camera: slow breathing drift, one push-in, three impacts ─────────
function camera(t) {
  let z = 1 + 0.025 * Math.sin(t * 0.21) + 0.6 * E.inOutCubic(P(t, 15.4, 18.4)) * (1 - E.inOutCubic(P(t, 18.7, 19.6)));
  z += 0.04 * E.inOutSine(P(t, 5.5, 7.0)) * (1 - P(t, T_REBORN, T_REBORN + 0.3));                // the tension before "reborn"
  let sx = 0, sy = 0;
  for (const b of BIG) { const d = t - b; if (d > 0 && d < 0.7) { const k = Math.exp(-d * 9) * 16; sx += k * Math.sin(d * 85); sy += k * Math.cos(d * 71); z += 0.05 * Math.exp(-d * 7); } }
  const [dx, dy] = dotXY(t);
  return { z, sx, sy, fx: dx, fy: dy };
}

// ───────── the grid: other people ─────────
const GRID = []; for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) GRID.push({ x: 90 + i * 150, y: 220 + j * 160, i, j, r: rng(i * 31 + j * 7)(), ph: rng(i * 13 + j)() * TAU });
const SOMEONE = GRID.find(g => g.i === 4 && g.j === 3);   // (690, 700)
function drawGrid(ctx, t) {
  const show = P(t, 9.4, 10.2), dim = 1 - 0.7 * E.inOutCubic(P(t, 12.6, 14.4)), gone = 1 - E.inOutCubic(P(t, 15.9, 16.6));
  if (show <= 0 || gone <= 0) return;
  const [dx, dy] = dotXY(t);
  for (const g of GRID) {
    const dd = Math.hypot(g.x - SOMEONE.x, g.y - SOMEONE.y);
    const a = E.outCubic(P(t, 9.4 + dd * 0.0007, 9.9 + dd * 0.0007)) * dim * gone;
    if (a <= 0 || Math.hypot(g.x - dx, g.y - dy) < 70) continue;
    const drift = E.inOutCubic(P(t, 12.6, 15.4)), ox = (g.x - SOMEONE.x) * 0.25 * drift, oy = (g.y - SOMEONE.y) * 0.25 * drift;
    let r = 10 + Math.sin(t * 1.3 + g.ph) * 1.0, col = mixc(hex('#4D5058'), PAPER, 0);
    if (g === SOMEONE) {
      let fl = 0; for (const k of KNOCKS) fl = Math.max(fl, Math.exp(-Math.max(0, t - k - 0.05) * 7) * (t > k + 0.05 ? 1 : 0));
      r = 16 + 5 * fl; col = mixc(hex('#5A5D66'), hex('#9EA1A8'), fl);   // lights up a little… and goes back to grey
    }
    ctx.fillStyle = rgb(col, a); ctx.beginPath(); ctx.arc(g.x + ox, g.y + oy, r, 0, TAU); ctx.fill();
  }
  for (const k of KNOCKS) {   // ripples from the knocks
    const q = P(t, k + 0.03, k + 0.9); if (q <= 0 || q >= 1) continue;
    ctx.strokeStyle = rgb(PAPER, 0.35 * (1 - q) * dim); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SOMEONE.x, SOMEONE.y, 16 + q * 170, 0, TAU); ctx.stroke();
  }
}

// ───────── memory trail (scene 1) ─────────
function drawTrail(ctx, t) {
  const [dx, dy] = dotXY(t);
  for (let k = 1; k <= 6; k++) {
    const appear = E.outCubic(P(t, 0.2 + k * 0.12, 0.7 + k * 0.12)), leave = E.inCubic(P(t, 2.3 + (6 - k) * 0.12, 2.75 + (6 - k) * 0.12));
    const a = (0.55 - k * 0.07) * appear * (1 - leave);
    if (a <= 0) continue;
    ctx.strokeStyle = rgb(GREYDOT, a); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dx - k * 72 - leave * 40, dy + Math.sin(k * 1.7) * 8, 22 - k * 1.5, 0, TAU); ctx.stroke();
  }
}

// ───────── the plan: a line that the world bends (19.7–25.3) ─────────
const TARGET = [860, 420];
const WORLD = (() => { const r = rng(5); return Array.from({ length: 26 }, () => ({ x: 120 + r() * 840, y: 330 + r() * 760, vx: (r() - 0.5) * 40, vy: (r() - 0.5) * 40, ph: r() * TAU })); })();
function worldPos(p, t) { return [p.x + p.vx * (t - 19.7) + Math.sin(t * 0.9 + p.ph) * 50, p.y + p.vy * (t - 19.7) + Math.cos(t * 0.7 + p.ph) * 50]; }
function drawPlan(ctx, t) {
  if (t < 19.6 || t > 25.6) return;
  const a = P(t, 19.7, 20.0) * (1 - P(t, 25.2, 25.6));
  const [sx, sy] = dotXY(t), [tx, ty] = TARGET;
  for (const p of WORLD) { const [x, y] = worldPos(p, t); ctx.fillStyle = rgb(hex('#4D5058'), 0.9 * a * P(t, 19.9, 20.6)); ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill(); }
  // target marker
  ctx.strokeStyle = rgb(t > 24.6 ? accent(t) : PAPER, 0.8 * a); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(tx, ty, 22, 0, TAU); ctx.moveTo(tx - 34, ty); ctx.lineTo(tx + 34, ty); ctx.moveTo(tx, ty - 34); ctx.lineTo(tx, ty + 34); ctx.stroke();
  // the planned line: drawn, then bent by the world, then the attempt to straighten it
  const draw = E.inOutCubic(P(t, 19.9, 20.7)), bend = E.inOutCubic(P(t, 20.8, 21.9)) * (1 - 0.7 * Math.sin(Math.PI * P(t, 22.5, 23.4)));
  const retract = E.inCubic(P(t, 23.85, 24.3));
  const n = 64, len = draw * (1 - retract);
  if (len > 0.001) {
    ctx.setLineDash([16, 12]); ctx.lineWidth = 4; ctx.strokeStyle = rgb(PAPER, 0.85 * a); ctx.beginPath();
    for (let i = 0; i <= n * len; i++) {
      const u = i / n; let x = lerp(sx, tx, u), y = lerp(sy, ty, u);
      let px = 0, py = 0;
      for (const p of WORLD) { const [wx, wy] = worldPos(p, t), d = Math.hypot(x - wx, y - wy); if (d < 160) { const f = (160 - d) / 160; px += (x - wx) / (d + 1) * f * 70; py += (y - wy) / (d + 1) * f * 70; } }
      x += px * bend + Math.sin(u * 17 + t * 2) * 30 * bend * Math.sin(Math.PI * u); y += py * bend;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  // fix YOU: the line comes back into the dot, the dot changes, then a new path goes around the world
  const newP = E.inOutCubic(P(t, 24.35, 25.05));
  if (newP > 0) {
    const c1 = [sx + 40, sy - 520], c2 = [tx - 520, ty + 40];
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = rgb(accent(t), a); ctx.beginPath();
    for (let i = 0; i <= 80 * newP; i++) { const u = i / 80, v = 1 - u; const x = v * v * v * sx + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * tx, y = v * v * v * sy + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * ty; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
}

// ───────── light (become the light), devour, destroy, reborn ─────────
const DARK = (() => { const r = rng(9); return Array.from({ length: 90 }, () => ({ a: r() * TAU, r: 700 + r() * 500, s: 3 + r() * 6, sp: 0.6 + r() * 1.2, d: r() * 0.5 })); })();
const SHARDS = (() => { const r = rng(17); return Array.from({ length: 34 }, () => ({ a: r() * TAU, sp: 40 + r() * 140, rot: (r() - 0.5) * 2, s: 7 + r() * 13, v: r() })); })();
function drawLight(ctx, t) {
  const [dx, dy] = dotXY(t);
  const on = E.outExpo(P(t, T_BECOME, T_BECOME + 1.0)) * (1 - 0.75 * E.inOutCubic(P(t, 35.6, 36.8)));
  if (on > 0) {
    const R = 120 + 1500 * on;
    const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, R);
    g.addColorStop(0, rgb(hex('#FFE6B8'), 0.55 * on)); g.addColorStop(0.25, rgb(AMBER, 0.22 * on)); g.addColorStop(1, rgb(AMBER, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(dx, dy); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * 0.04 + Math.sin(i * 7.3) * 0.2; ctx.fillStyle = rgb(AMBER, 0.035 * on * (0.6 + 0.4 * Math.sin(i * 3.1 + t * 0.7))); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1700, a - 0.03, a + 0.03); ctx.fill(); }
    ctx.restore();
  }
  // the goal, barely visible in the dark, revealed by the light
  if (t > 25.9 && t < 31.5) { const gx = 540, gy = 330, a = 0.07 + 0.7 * on * (1 - P(t, 30.8, 31.4)); ctx.strokeStyle = rgb(PAPER, a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, TAU); ctx.moveTo(gx - 34, gy); ctx.lineTo(gx + 34, gy); ctx.moveTo(gx, gy - 34); ctx.lineTo(gx, gy + 34); ctx.stroke(); }
  // devour: darkness spirals in, then is released as light
  if (t > 31.3 && t < 36) {
    for (const p of DARK) {
      const k = E.inCubic(P(t, 31.5 + p.d, 33.6)), a = p.a + (t - 31.5) * p.sp * (1 + k * 3), rr = p.r * (1 - k);
      if (t < T_LIGHT2) { if (k >= 1) continue; ctx.fillStyle = rgb(hex('#050506'), 0.95); ctx.strokeStyle = rgb(accent(t), 0.25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * rr, dy + Math.sin(a) * rr * 0.8, p.s * (1 - k * 0.5), 0, TAU); ctx.fill(); ctx.stroke(); }
      else { const q = E.outCubic(P(t, T_LIGHT2, T_LIGHT2 + 1.4)); ctx.fillStyle = rgb(hex('#FFD48A'), 0.9 * (1 - P(t, T_LIGHT2 + 0.8, T_LIGHT2 + 1.6))); ctx.beginPath(); ctx.arc(dx + Math.cos(p.a) * p.r * 0.8 * q, dy + Math.sin(p.a) * p.r * 0.8 * q, p.s * 0.6, 0, TAU); ctx.fill(); }
    }
  }
}
function drawDot(ctx, t) {
  let [dx, dy] = dotXY(t);
  const r = dotR(t), col = accent(t);
  // the lockup moves the dot into place as the full stop
  if (t >= 41.6) return drawFinale(ctx, t);
  const dim = 1 - 0.65 * E.inOutCubic(P(t, 25.4, 26.2)) * (1 - P(t, T_BECOME - 0.1, T_BECOME + 0.2));
  // destroy: cracks, then shards drift apart in slow motion
  if (t > T_DESTROY - 0.35) {
    const crack = P(t, T_DESTROY - 0.35, T_DESTROY), br = t - T_DESTROY;
    if (br < 0) {
      ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.arc(dx, dy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(bgCol(t)); ctx.lineWidth = 2.5; const rr = rng(4);
      for (let i = 0; i < 5; i++) { const a = rr() * TAU; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + Math.cos(a) * r * crack, dy + Math.sin(a) * r * crack); ctx.stroke(); }
      return;
    }
    const k = E.outCubic(clamp(br / 3.2));
    for (const s of SHARDS) {
      const x = dx + Math.cos(s.a) * s.sp * k * 2.2, y = dy + Math.sin(s.a) * s.sp * k * 2.2 + Math.sin(t + s.v * 9) * 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot * k * 3); ctx.fillStyle = rgb(col, 0.9 - 0.4 * k);
      ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.8, s.s * 0.6); ctx.lineTo(-s.s * 0.7, s.s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    return;
  }
  // impact ring on "reborn"
  const ri = t - T_REBORN;
  if (ri > 0 && ri < 1.4) { const q = E.outExpo(clamp(ri / 1.4)); ctx.strokeStyle = rgb(AMBER, 0.8 * (1 - q)); ctx.lineWidth = 3 + 20 * (1 - q); ctx.beginPath(); ctx.arc(dx, dy, r + q * 700, 0, TAU); ctx.stroke(); }
  // heartbeat before "reborn"
  for (const hb of [5.6, 6.3, 6.9]) { const q = P(t, hb, hb + 0.7); if (q > 0 && q < 1) { ctx.strokeStyle = rgb(GREYDOT, 0.4 * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, r + q * 60, 0, TAU); ctx.stroke(); } }
  // change yourself: a ring closes around the dot
  const cr = E.outCubic(P(t, 17.4, 18.0)) * (1 - P(t, 19.2, 19.6));
  if (cr > 0) { ctx.strokeStyle = rgb(col, 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(dx, dy, r + 16, -Math.PI / 2, -Math.PI / 2 + cr * TAU); ctx.stroke(); }
  // fix you: the dot flares as it changes
  const fx = Math.sin(Math.PI * P(t, 23.9, 24.5));
  const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 5);
  g.addColorStop(0, rgb(col, (0.25 + 0.4 * fx) * dim * (0.4 + warmth(t)))); g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g; ctx.fillRect(dx - r * 5, dy - r * 5, r * 10, r * 10);
  ctx.fillStyle = rgb(col, dim); ctx.beginPath(); ctx.arc(dx, dy, r * (1 + 0.25 * fx), 0, TAU); ctx.fill();
}
// the finale: shards rush back, the room floods with light, REBORN. (the dot is the full stop) + again
function lockupMetrics(ctx) {
  ctx.font = `900 220px ${SANS}`; const ww = ctx.measureText('REBORN').width, r = 26, gap = 16;
  const x0 = W / 2 - (ww + gap + r * 2) / 2; return { ww, r, gap, x0, base: 880, fx: x0 + ww + gap + r, fy: 880 - r };
}
function drawFinale(ctx, t) {
  const [cx, cy] = dotXY(41.0), m = lockupMetrics(ctx), col = accent(t);
  const back = E.inExpo(P(t, 41.6, T_AGAIN));
  if (t < T_AGAIN) {   // the shards tremble on "I'll be", then rush back
    for (const s of SHARDS) {
      const k0 = E.outCubic(clamp((41.6 - T_DESTROY) / 3.2)), k = k0 * (1 - back), tr = Math.sin(t * 60 + s.v * 20) * 2 * P(t, 41.6, 41.7);
      const x = cx + Math.cos(s.a) * s.sp * k * 2.2 + tr, y = cy + Math.sin(s.a) * s.sp * k * 2.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot * k * 3); ctx.fillStyle = rgb(col, 0.8); ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.8, s.s * 0.6); ctx.lineTo(-s.s * 0.7, s.s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    return;
  }
  const d = t - T_AGAIN;
  // light floods from the reborn dot
  if (d < 1.2) { const q = E.outExpo(clamp(d / 0.9)); const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + q * 1600); g.addColorStop(0, rgb(hex('#FFF1D6'), 0.9 * (1 - P(d, 0.6, 1.2)))); g.addColorStop(1, rgb(AMBER, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // the word builds as it is said
  ctx.font = `900 220px ${SANS}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const ink = inkCol(t), end = 1 - E.inCubic(P(t, 45.15, 45.5));
  [...'REBORN'].forEach((ch, i) => {
    const p = E.outQuart(P(t, T_AGAIN + 0.05 + i * 0.075, T_AGAIN + 0.5 + i * 0.075)); if (p <= 0) return;
    const gx = m.x0 + ctx.measureText('REBORN'.slice(0, i)).width;
    ctx.save(); ctx.beginPath(); ctx.rect(gx - 10, m.base - 200, 260, 230); ctx.clip(); ctx.fillStyle = rgb(ink, end); ctx.fillText(ch, gx, m.base + (1 - p) * 230); ctx.restore();
  });
  // the dot travels to the full stop and lands
  const fly = P(t, 42.2, 42.62), y = lerp(cy, m.fy, E.outBounce(fly)), x = lerp(cx, m.fx, E.inOutCubic(fly));
  const pulse = [43.6, 44.4, 45.05].reduce((a, c) => a + Math.max(0, Math.sin(Math.PI * P(t, c, c + 0.35))) * 0.35, 0);
  let fx = x, fy = y, fr = m.r * (1 + pulse);
  const home = E.inOutCubic(P(t, 45.25, 45.65)); fx = lerp(fx, 540, home); fy = lerp(fy, 760, home); fr = lerp(fr, 22, home);
  ctx.fillStyle = rgb(mixc(col, GREYDOT, home)); ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.fill();
  // "again" in the serif, the emotional word
  const ag = E.outQuart(P(t, 42.75, 43.3));
  if (ag > 0) { ctx.save(); ctx.font = `italic 400 190px ${SERIF}`; ctx.textAlign = 'center'; ctx.globalAlpha = ag * end; ctx.fillStyle = rgb(AMBERD); ctx.fillText('again', W / 2 + 40, 1080 + (1 - ag) * 40); ctx.restore(); }
  // rule lines
  const lp = E.outQuart(P(t, 42.5, 43.2)); ctx.fillStyle = rgb(ink, 0.3 * end);
  ctx.fillRect(m.x0 - 40 - 140 * lp, m.base - 80, 140 * lp, 2); ctx.fillRect(m.x0 + m.ww + m.gap + m.r * 2 + 40, m.base - 80, 140 * lp, 2);
}

// ───────── typography: grotesk + italic serif, layouts vary per line ─────────
function typography(ctx, t) {
  let pi = -1; PH.forEach((_, i) => { if (t >= WORDS.find(w => w.pi === i).t - 0.02) pi = i; });
  if (pi < 0 || PH[pi].lockup) return;
  const ph = PH[pi], next = pi + 1 < PH.length ? WORDS.find(w => w.pi === pi + 1).t : DUR;
  const exitAt = Math.min(WIN[pi][1] + 0.7, next - 0.22), out = E.inCubic(P(t, exitAt, exitAt + 0.25));
  if (out >= 1) return;
  const ws = WORDS.filter(w => w.pi === pi), nl = Math.max(...ws.map(w => w.li)) + 1;
  const ink = inkCol(t), acc = warmth(t) > 0.05 || invK(t) > 0 ? accent(t) : hex('#A3A6AD');
  const fontFor = (w, sz) => w.it ? `italic 400 ${sz * 1.32}px ${SERIF}` : `900 ${sz}px ${SANS}`;
  const label = w => w.it ? w.word : w.word.toUpperCase();
  let y = ph.y;
  for (let li = 0; li < nl; li++) {
    const lw = ws.filter(w => w.li === li);
    const sizes = lw.map(w => ph.s * ((ph.big || {})[w.word] || 1));
    const widths = lw.map((w, i) => { ctx.font = fontFor(w, sizes[i]); ctx.letterSpacing = (ph.ls || 0) + 'px'; return ctx.measureText(label(w)).width; });
    const gap = ph.s * 0.28, total = widths.reduce((a, b) => a + b, 0) + gap * (lw.length - 1), sc = total > 900 ? 900 / total : 1;
    const lh = Math.max(...sizes) * sc;
    y += li === 0 ? 0 : lh * 0.98;
    let x = ph.al === 'left' ? ph.x : ph.al === 'right' ? ph.x - total * sc : W / 2 - total * sc / 2;
    lw.forEach((w, i) => {
      const d = t - w.t, r = rng(Math.floor(w.t * 1000))();
      const p = E.outQuart(P(d, 0, 0.42 + r * 0.12));
      if (p > 0) {
        const sz = sizes[i] * sc;
        ctx.save(); ctx.font = fontFor(w, sz); ctx.letterSpacing = (ph.ls || 0) * sc + 'px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.beginPath(); ctx.rect(x - 10, y - sz * 1.05, widths[i] * sc + 30, sz * 1.35); ctx.clip();
        ctx.translate(0, (1 - p) * sz * 0.95 - out * 36);
        ctx.rotate((1 - p) * (r - 0.5) * 0.04);
        ctx.globalAlpha = 1 - out;
        ctx.fillStyle = w.it ? rgb(acc) : rgb(ink, ph.s < 60 ? 0.75 : 1);
        ctx.fillText(label(w), x, y);
        ctx.restore();
      }
      x += (widths[i] + gap) * sc;
    });
  }
}

// ───────── film finish ─────────
const GRAIN = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), id = g.createImageData(512, 512), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 110; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; })();
const HAL = document.createElement('canvas'); HAL.width = W / 4; HAL.height = H / 4; const hal = HAL.getContext('2d');
function film(ctx, src, t, frame) {
  const r = rng(frame * 13 + 5);
  // gate weave
  const wx = (noise1(t * 3.1) - 0.5) * 3.2, wy = (noise1(t * 2.3 + 9) - 0.5) * 3.2, wr = (noise1(t * 1.7 + 4) - 0.5) * 0.0012;
  ctx.save(); ctx.fillStyle = rgb(bgCol(t)); ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + wx, H / 2 + wy); ctx.rotate(wr); ctx.translate(-W / 2, -H / 2); ctx.drawImage(src, 0, 0); ctx.restore();
  // halation: bright areas bleed warm
  hal.filter = 'brightness(0.75) contrast(2.4) blur(6px)'; hal.clearRect(0, 0, W / 4, H / 4); hal.drawImage(src, 0, 0, W / 4, H / 4);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5; ctx.filter = 'sepia(0.6) saturate(2.2) hue-rotate(-12deg)'; ctx.drawImage(HAL, 0, 0, W, H); ctx.restore();
  // light leak in the warm sections
  const lk = warmth(t) * (1 - invK(t) * 0.6);
  if (lk > 0.05) { const lx = W * (0.15 + 0.7 * noise1(t * 0.15)), ly = H * (0.1 + 0.3 * noise1(t * 0.11 + 3)); const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 900); g.addColorStop(0, `rgba(255,140,60,${0.14 * lk})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // grain
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.2;
  const pat = ctx.createPattern(GRAIN, 'repeat'); pat.setTransform(new DOMMatrix().translate(Math.floor(r() * 512), Math.floor(r() * 512)).scale(1.6));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
  // dust & the occasional hair
  const inv = invK(t), dust = inv > 0.5 ? 'rgba(30,24,18,' : 'rgba(235,225,210,';
  for (let i = 0; i < 3; i++) if (r() < 0.45) { const x = r() * W, y = r() * H, s = 1 + r() * 3.5; ctx.fillStyle = dust + (0.25 + r() * 0.35) + ')'; ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.5 + r()), r() * 3, 0, TAU); ctx.fill(); }
  const hairSeed = Math.floor(frame / 9); const hr = rng(hairSeed * 7 + 1);
  if (hr() < 0.1) { const x = hr() * W, y = hr() * H; ctx.strokeStyle = dust + '0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y + 40, x - 20, y + 90, x + 15, y + 140); ctx.stroke(); }
  // flicker + vignette
  ctx.fillStyle = `rgba(0,0,0,${0.025 * r()})`; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.44, H * 0.28, W / 2, H * 0.44, H * 0.82); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.55 - 0.3 * inv})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ───────── frame ─────────
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.letterSpacing = '0px';
  ctx.fillStyle = rgb(bgCol(t)); ctx.fillRect(0, 0, W, H);
  const c = camera(t);
  ctx.save(); ctx.translate(c.fx + c.sx, c.fy + c.sy); ctx.scale(c.z, c.z); ctx.translate(-c.fx, -c.fy);
  drawLight(ctx, t);
  drawTrail(ctx, t);
  drawGrid(ctx, t);
  drawPlan(ctx, t);
  drawDot(ctx, t);
  ctx.restore();
  typography(ctx, t);
}
const main = document.getElementById('c'); main.width = W; main.height = H; const mctx = main.getContext('2d');
const ACC = document.createElement('canvas'); ACC.width = W; ACC.height = H; const acx = ACC.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H; const sctx = scratch.getContext('2d');
window.drawFrame = function (frame, S = 2) {
  const t = frame / FPS;
  for (let i = 0; i < S; i++) { const ts = clamp(t + ((i + 0.5) / S - 0.5) * 0.5 / FPS, 0, DUR - 1e-4); renderScene(sctx, ts); acx.globalAlpha = 1 / (i + 1); acx.drawImage(scratch, 0, 0); }
  acx.globalAlpha = 1;
  film(mctx, ACC, t, frame);
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/jpeg', 0.93); };
window.ready = Promise.all([document.fonts.load(`900 100px ${SANS}`), document.fonts.load(`italic 400 100px ${SERIF}`)]).then(() => document.fonts.check(`italic 400 100px ${SERIF}`));
