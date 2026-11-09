// "YOU'RE NOT LAZY, YOU'RE SCARED" (v2, all out): explainer motion piece, 1080x1920, 18s.
// Lamp-lit room with cast shadows, a word that becomes an object, a crowd of opinions,
// a dive inside the brain (neural network, fear centre flooding red), an iris back to the
// desk where the figure's own shadow becomes the fear, and words that act out their meaning.
const W = 1080, H = 1920, FPS = 30, DUR = 18;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const wob = (d, k = 7, w = 18) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(w * d);
const spring = (d, k = 7, w = 13) => d <= 0 ? 0 : 1 - Math.exp(-k * d) * Math.cos(w * d);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = {
  bg0: '#16051F', bg1: '#3E0B38', wall: '#2A0F33', wallL: '#3B1747',
  blue: '#2F62FF', blueL: '#5C8BFF', blueD: '#1A3BB0',
  gold: '#F4B428', goldL: '#FFD873', goldD: '#B87A0E',
  cyan: '#38D6FF', cyanL: '#BFF3FF', cyanD: '#0E6F96',
  red: '#FF3355', redL: '#FF8A9E', redD: '#A3122E', green: '#4BFFA6',
  paper: '#E9E6F2', paperD: '#B5B0C9', ink: '#FFF4FB', lamp: '#FFC970',
};
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';

// ───────── timeline (matches the voiceover script) ─────────
const T = { lazyQ: 1.6, fly: 2.8, toScale: 2.95, crowd: 3.3, lean: 3.55, but: 6.45, brainDrop: 6.55, dust: 7.0,
  toBrain: 7.85, inside: 8.35, timeHi: 9.7, crack: 10.6, emo: 11.25, outBrain: 12.35, desk: 12.8, monster: 13.4,
  fear: 14.62, start: 15.35, end: 18.0 };
const WORDS = [   // timed to the AI voiceover (words.json)
  [0.508, 'YOU'],
  [0.681, 'THINK'],
  [0.854, "YOU'RE"],
  [1.200, 'LAZY.', 'red'],
  [3.000, 'MOST'],
  [3.195, 'PEOPLE'],
  [3.584, 'BELIEVE'],
  [4.168, 'PROCRASTINATION', 'stretch'],
  [5.141, 'MEANS'],
  [5.336, 'NO'],
  [5.531, 'DISCIPLINE.', 'red'],
  [6.450, 'BUT', 'cyan'],
  [6.610, 'RESEARCH'],
  [6.929, 'SAYS'],
  [7.089, 'THE'],
  [7.249, 'OPPOSITE.', 'flip'],
  [9.727, "IT'S"],
  [9.918, 'NOT'],
  [10.109, 'A'],
  [10.300, 'TIME', 'crack'],
  [10.682, 'PROBLEM.'],
  [11.275, "IT'S"],
  [11.462, 'AN'],
  [11.650, 'EMOTION', 'cyan'],
  [12.213, 'PROBLEM.'],
  [12.780, 'YOU'],
  [12.963, 'AVOID'],
  [13.330, 'THE'],
  [13.513, 'TASK'],
  [13.869, 'TO'],
  [14.057, 'AVOID'],
  [14.432, 'THE'],
  [14.620, 'FEAR.', 'fear'],
  [15.550, 'START', 'gold'],
  [15.894, 'SMALL.', 'small'],
];

// ───────── world layout ─────────
const SX = 1500, PIV = -130, BEAM = 300;       // the scale sits in the next room
function beamAngle(t) {
  let a = 0;
  a += -0.26 * spring(t - T.lean, 6, 11);
  a += 0.58 * spring(t - T.brainDrop - 0.12, 6, 10);
  a += 0.12 * E.inOutCubic(P(t, T.dust, T.dust + 0.8));
  return a;
}
function panPos(t, side) { const a = beamAngle(t); return [SX + side * BEAM * Math.cos(a), PIV + side * BEAM * Math.sin(a) + 215]; }
function brainPos(t) { const [x, y] = panPos(t, 1); return [x, y - 112]; }
// ───────── primitives ─────────
function shade(ctx, x0, y0, x1, y1, c0, c1) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
function tag(ctx, text, x, y, d, col = C.cyan, txt = '#071A2A', size = 22) {   // cyan label that pops in
  if (d < 0) return;
  const s = E.outBack(P(d, 0, 0.25));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width + size * 1.2, h = size * 1.7;
  ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
  ctx.restore();
}
// blocky faceless figure, lit from the left (side view). facing: 1 right, -1 left
function figure(ctx, x, y, s, t, { facing = 1, slump = 0, reach = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * facing, s);
  const breathe = Math.sin(t * 2.2) * 1.5;
  // legs
  ctx.fillStyle = C.blueD; ctx.beginPath(); ctx.roundRect(-14, -150, 24, 150, 8); ctx.fill();
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.roundRect(-6, -150, 24, 150, 8); ctx.fill();
  ctx.fillStyle = C.blueD; ctx.beginPath(); ctx.roundRect(-14, -8, 40, 14, 6); ctx.fill();
  // torso leans forward when slumped
  ctx.save(); ctx.translate(0, -150); ctx.rotate(slump * 0.32);
  ctx.fillStyle = shade(ctx, -30, 0, 30, 0, C.blueL, C.blueD);
  ctx.beginPath(); ctx.roundRect(-30, -150 + breathe, 60, 158, 22); ctx.fill();
  // arm (reaches forward at the end)
  ctx.save(); ctx.translate(8, -130 + breathe); ctx.rotate(lerp(0.12 + slump * 0.2, -1.25, reach));
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.roundRect(-11, 0, 22, 120, 11); ctx.fill();
  ctx.restore();
  // head drops when slumped
  ctx.save(); ctx.translate(6, -186 + breathe + slump * 16); ctx.rotate(slump * 0.35);
  const hg = ctx.createRadialGradient(-12, -12, 4, 0, 0, 42);
  hg.addColorStop(0, C.blueL); hg.addColorStop(1, C.blueD);
  ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 0, 34, 38, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.restore();
}
function paperStack(ctx, x, y, w, h, t) {
  const n = 14, sh = h / n, r = rng(9);
  for (let i = 0; i < n; i++) {
    const off = (r() - 0.5) * 14, yy = y - (i + 1) * sh;
    ctx.fillStyle = C.paperD; ctx.fillRect(x + off + 6, yy + 4, w, sh - 2);
    ctx.fillStyle = shade(ctx, x, 0, x + w, 0, C.paper, '#CFCAE0'); ctx.fillRect(x + off, yy, w, sh - 3);
    ctx.fillStyle = 'rgba(80,70,110,0.35)'; ctx.fillRect(x + off + 14, yy + sh * 0.35, w * 0.55, 3);
  }
  ctx.save(); ctx.translate(x + w / 2, y - h - 34); ctx.rotate(-0.05);
  ctx.font = `900 34px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.fillText('TASKS', 0, 0);
  ctx.restore();
}
function alarm(ctx, x, y, t) {
  const ring = Math.sin(t * 40) * (Math.sin(t * 3) > 0.3 ? 0.08 : 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ring);
  ctx.fillStyle = C.redD; ctx.beginPath(); ctx.arc(0, -42, 44, 0, TAU); ctx.fill();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(-4, -44, 40, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFE9EE'; ctx.beginPath(); ctx.arc(-4, -44, 30, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3A0A16'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -44); ctx.lineTo(-4 + Math.cos(t * 2 - 1.5) * 20, -44 + Math.sin(t * 2 - 1.5) * 20);
  ctx.moveTo(-4, -44); ctx.lineTo(-4 + Math.cos(t * 0.3) * 13, -44 + Math.sin(t * 0.3) * 13); ctx.stroke();
  ctx.fillStyle = C.goldD; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(-4 + s * 26, -84, 12, Math.PI, 0); ctx.fill(); }
  ctx.restore();
}
// golden balance scale
function scaleObj(ctx, t) {
  const a = beamAngle(t);
  ctx.fillStyle = shade(ctx, SX - 150, 0, SX + 150, 0, C.goldL, C.goldD);
  ctx.beginPath(); ctx.moveTo(SX - 150, 380); ctx.lineTo(SX + 150, 380); ctx.lineTo(SX + 90, 330); ctx.lineTo(SX - 90, 330); ctx.fill();
  ctx.fillStyle = shade(ctx, SX - 22, 0, SX + 22, 0, C.goldL, C.goldD); ctx.fillRect(SX - 20, PIV, 40, 460);
  ctx.save(); ctx.translate(SX, PIV); ctx.rotate(a);
  ctx.fillStyle = shade(ctx, 0, -12, 0, 12, C.goldL, C.goldD); ctx.beginPath(); ctx.roundRect(-BEAM - 14, -12, BEAM * 2 + 28, 24, 12); ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.goldL; ctx.beginPath(); ctx.arc(SX, PIV, 24, 0, TAU); ctx.fill();
  for (const side of [-1, 1]) {
    const ex = SX + side * BEAM * Math.cos(a), ey = PIV + side * BEAM * Math.sin(a);
    const [px, py] = [ex, ey + 215];
    ctx.strokeStyle = C.goldD; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(px - 100, py); ctx.moveTo(ex, ey); ctx.lineTo(px + 100, py); ctx.stroke();
    ctx.fillStyle = shade(ctx, px - 110, 0, px + 110, 0, C.goldL, C.goldD);
    ctx.beginPath(); ctx.ellipse(px, py, 112, 18, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 112, py); ctx.quadraticCurveTo(px, py + 70, px + 112, py); ctx.fill();
    ctx.fillStyle = C.goldL; ctx.beginPath(); ctx.arc(ex, ey, 10, 0, TAU); ctx.fill();
  }
}
// the red LAZY block (dissolves into particles)
const DUSTP = (() => { const r = rng(21); return Array.from({ length: 260 }, () => ({ u: r(), v: r(), vx: -(120 + r() * 380), vy: -(60 + r() * 260), s: 2 + r() * 5, d: r() * 0.35 })); })();
function lazyBlock(ctx, t) {
  const [px, py] = panPos(t, -1);
  const appear = E.outBack(P(t, T.toScale + 0.3, T.toScale + 0.6));
  if (appear <= 0) return;
  const bw = 190, bh = 92, x = px - bw / 2, y = py - bh - 10 + (1 - appear) * -300;
  const k = P(t, T.dust, T.dust + 1.0);
  if (k <= 0) {
    ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 30;
    ctx.fillStyle = shade(ctx, x, y, x, y + bh, C.redL, C.redD); ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 14); ctx.fill();
    ctx.restore();
    ctx.font = `900 62px ${DISP}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LAZY', px, y + bh / 2 + 3);
    tag(ctx, 'CONSENSUS', px, y - 50, t - T.lean - 0.2, C.cyan);
    return;
  }
  for (const p of DUSTP) {   // disintegrate left-to-right like sand blown away
    const q = clamp((k - p.u * 0.5 - p.d * 0.3) / 0.6);
    if (q >= 1) continue;
    const ex = x + p.u * bw + p.vx * E.outCubic(q), ey = y + p.v * bh + p.vy * E.outCubic(q) + 80 * q * q;
    ctx.fillStyle = q > 0 ? `rgba(255,${80 + q * 120},${100 + q * 60},${1 - q})` : C.red;
    ctx.fillRect(ex, ey, p.s * (1 - q * 0.5), p.s * (1 - q * 0.5));
  }
}
// the brain: lobed silhouette, gyri, glossy highlight, fear knot
const GYRI = (() => { const r = rng(5); return Array.from({ length: 16 }, () => { let x = (r() - 0.5) * 220, y = (r() - 0.5) * 150, a = r() * TAU; const pts = [[x, y]]; for (let i = 0; i < 9; i++) { a += (r() - 0.5) * 1.6; x += Math.cos(a) * 18; y += Math.sin(a) * 14; pts.push([x, y]); } return pts; }); })();
function brainPath(ctx, R) {
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const th = i / 80 * TAU, r = R * (1 + 0.05 * Math.sin(th * 7) + 0.035 * Math.sin(th * 13 + 1));
    const x = Math.cos(th) * r * 1.22, y = Math.sin(th) * r * 0.86 - (Math.sin(th) > 0 ? Math.sin(th) * R * 0.08 : 0);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function brain(ctx, t, x, y, s, fear = 0, emotion = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const R = 100;
  // stem + cerebellum
  ctx.fillStyle = C.cyanD; ctx.beginPath(); ctx.roundRect(10, 50, 34, 70, 14); ctx.fill();
  ctx.fillStyle = shade(ctx, 40, 40, 110, 110, C.cyan, C.cyanD); ctx.beginPath(); ctx.ellipse(70, 62, 48, 32, 0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(191,243,255,0.6)'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(70, 62, 40 - i * 9, 22 - i * 5, 0.2, 0.1, Math.PI - 0.1); ctx.stroke(); }
  // glow + body
  ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 50 + 20 * Math.sin(t * 3);
  brainPath(ctx, R); ctx.fillStyle = shade(ctx, -120, -90, 120, 90, '#3FE0FF', '#0B5A86'); ctx.fill();
  ctx.restore();
  ctx.save(); brainPath(ctx, R); ctx.clip();
  ctx.strokeStyle = 'rgba(205,248,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const g of GYRI) { ctx.beginPath(); g.forEach(([gx, gy], i) => i ? ctx.lineTo(gx, gy) : ctx.moveTo(gx, gy)); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(8,60,90,0.6)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-110, 10); ctx.quadraticCurveTo(0, -20, 110, 0); ctx.stroke();
  // fear knot (amygdala) pulsing red
  if (fear > 0) {
    const p = 0.75 + 0.25 * Math.sin(t * 9);
    const fg = ctx.createRadialGradient(10, 20, 0, 10, 20, 70 * fear * p);
    fg.addColorStop(0, `rgba(255,51,85,${0.95 * fear})`); fg.addColorStop(1, 'rgba(255,51,85,0)');
    ctx.fillStyle = fg; ctx.fillRect(-130, -110, 260, 220);
  }
  if (emotion > 0) { ctx.fillStyle = `rgba(75,255,166,${0.18 * emotion})`; ctx.fillRect(-130, -110, 260, 220); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-48, -52, 22, 11, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
}
// the scanner: a caliper that slides over the brain + readout panel

// ───────── camera (world scenes) ─────────
function camera(t) {
  const desk = { x: -95, y: -70, z: 1.1 }, scale = { x: SX - 20, y: 0, z: 0.98 };
  const [bx, by] = brainPos(t);
  const dive = { x: bx, y: by, z: 9 };
  const deskBack = { x: -110, y: -150, z: 1.02 }, hands = { x: -40, y: -40, z: 1.32 };
  const seg = [[0, desk, 'c'], [T.toScale, desk, 'x'], [T.toScale + 0.42, scale, 'c'], [T.toBrain, scale, 'i'], [T.inside, dive, 'c'],
    [T.desk, deskBack, 'c'], [T.monster, deskBack, 'c'], [T.fear, { x: -180, y: -220, z: 0.92 }, 'c'], [T.start, { x: -180, y: -220, z: 0.92 }, 'c'],
    [T.start + 0.9, hands, 'c'], [T.end, { ...hands, z: 1.38 }, 'c']];
  for (let i = 0; i < seg.length - 1; i++) {
    const [t0, a, ease] = seg[i], [t1, b] = seg[i + 1];
    if (t >= t0 && t <= t1) {
      const u = P(t, t0, t1);
      const k = ease === 'x' ? E.inOutExpo(u) : ease === 'i' ? E.inExpo(u) : E.inOutCubic(u);
      if (ease === 'i') return { x: lerp(a.x, b.x, E.inOutCubic(u)), y: lerp(a.y, b.y, E.inOutCubic(u)), z: a.z * Math.pow(b.z / a.z, k), roll: 0 };
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), roll: ease === 'x' ? Math.sin(Math.PI * u) * 0.05 : 0 };
    }
  }
  return { ...hands, z: 1.38, roll: 0 };
}

// ───────── lamp light ─────────
const LAMP = [70, -128];
function lampPower(t) {
  let p = 1;
  if (t > T.desk && t < T.start) {   // flickers as the fear grows
    const f = Math.sin(t * 53) * Math.sin(t * 17.3) * Math.sin(t * 7.1);
    p = 0.78 + 0.22 * Math.sign(f) * Math.min(1, Math.abs(f) * 4) * P(t, T.monster, T.fear);
    if (t > T.fear && t < T.fear + 0.35) p = 0.35;
  }
  if (t >= T.start) p = lerp(0.8, 1.25, E.inOutCubic(P(t, T.start, T.start + 0.8)));
  return p;
}
function warmth(t) { return t >= T.start ? E.inOutCubic(P(t, T.start, T.start + 0.8)) : 0; }

// ───────── the room ─────────
const BOOKS = (() => { const r = rng(12); const b = []; let x = -690; while (x < -430) { const w = 16 + r() * 22; b.push([x, w, 70 + r() * 60, r()]); x += w + 3; } return b; })();
function room(ctx, t) {
  // wall + floor
  ctx.fillStyle = C.wall; ctx.fillRect(-1000, -1000, 1640, 1380);
  ctx.fillStyle = '#14061B'; ctx.fillRect(-1000, 380, 1640, 700);
  // window with blinds (moonlight)
  ctx.fillStyle = '#0B1630'; ctx.fillRect(380, -720, 230, 360);
  for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(140,180,255,0.30)'; ctx.fillRect(380, -720 + i * 40, 230, 18); }
  ctx.strokeStyle = '#4A2557'; ctx.lineWidth = 14; ctx.strokeRect(380, -720, 230, 360);
  // moonlight stripes on the wall
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(110,150,255,0.05)';
    ctx.beginPath(); ctx.moveTo(380, -700 + i * 40); ctx.lineTo(610, -700 + i * 40); ctx.lineTo(380 - 300, -150 + i * 64); ctx.lineTo(380 - 520, -150 + i * 64); ctx.fill();
  }
  ctx.restore();
  // shelf with books
  ctx.fillStyle = '#4B2A5E'; ctx.fillRect(-720, -520, 320, 16);
  for (const [x, w, h, c] of BOOKS) { ctx.fillStyle = ['#5B3A78', '#7A3A5E', '#3A4A7A', '#6A5A3A'][Math.floor(c * 4)]; ctx.fillRect(x, -520 - h, w, h); }
}
// the figure's shadow cast on the wall by the lamp, and the fear it turns into
function castShadow(ctx, t, fig) {
  const m = E.inOutCubic(P(t, T.monster, T.fear));                         // shadow → monster
  const shrink = E.inOutCubic(P(t, T.start + 0.4, T.start + 1.8));          // monster → shadow again
  const morph = m * (1 - shrink);
  const p = lampPower(t);
  const ax = fig.x - 190, ay = 380;
  ctx.save();
  ctx.globalAlpha = 0.55 * (1 - morph) * clamp(p);
  ctx.translate(ax, ay); ctx.scale(1.55, 1.55); ctx.translate(-fig.x, -ay);
  figureSilhouette(ctx, fig, 'rgba(8,0,14,1)', t);
  ctx.restore();
  if (morph > 0.01) {
    const roar = t > T.fear ? 1 + 0.07 * wob(t - T.fear, 5, 30) : 1;
    ctx.save(); ctx.translate(ax + 40, ay); ctx.scale(lerp(0.7, 1.15, morph) * roar, lerp(0.7, 1.15, morph) * roar);
    ctx.globalAlpha = morph; monsterShape(ctx, t, morph);
    ctx.restore();
  }
}
function figureSilhouette(ctx, fig, col, t) {
  // same pose, flat colour
  ctx.save(); ctx.translate(fig.x, fig.y); ctx.scale(fig.s * fig.facing, fig.s);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.roundRect(-14, -150, 32, 150, 8); ctx.fill();
  ctx.save(); ctx.translate(0, -150); ctx.rotate(fig.slump * 0.32);
  ctx.beginPath(); ctx.roundRect(-30, -150, 60, 158, 22); ctx.fill();
  ctx.save(); ctx.translate(8, -130); ctx.rotate(lerp(0.12 + fig.slump * 0.2, -1.25, fig.reach)); ctx.beginPath(); ctx.roundRect(-11, 0, 22, 120, 11); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(6, -186 + fig.slump * 16); ctx.beginPath(); ctx.ellipse(0, 0, 34, 38, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.restore(); ctx.restore();
}
function monsterShape(ctx, t, k) {
  ctx.fillStyle = 'rgba(6,0,12,0.9)';
  ctx.beginPath(); ctx.moveTo(-170, 0);
  ctx.bezierCurveTo(-220, -200, -200, -420, -120, -520); ctx.lineTo(-150, -640); ctx.lineTo(-70, -560);
  ctx.bezierCurveTo(-30, -600, 30, -600, 70, -560); ctx.lineTo(150, -640); ctx.lineTo(120, -520);
  ctx.bezierCurveTo(200, -420, 230, -200, 170, 0);
  for (let i = 0; i < 6; i++) ctx.lineTo(170 - i * 68, i % 2 ? -40 : 0);
  ctx.closePath(); ctx.fill();
  // claw reaching for the figure (to the right now)
  const reach = Math.sin(t * 2) * 10;
  ctx.beginPath(); ctx.moveTo(170, -260); ctx.quadraticCurveTo(330, -300, 380 + reach, -220); ctx.lineTo(400 + reach, -250); ctx.lineTo(380 + reach, -200); ctx.lineTo(410 + reach, -200); ctx.lineTo(360 + reach, -180); ctx.quadraticCurveTo(300, -230, 170, -200); ctx.fill();
  const eg = (0.8 + 0.2 * Math.sin(t * 12)) * k;
  ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 30; ctx.fillStyle = `rgba(255,51,85,${eg})`;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 55, -420, 30, 13, -s * 0.35, 0, TAU); ctx.fill(); }
  ctx.fillStyle = `rgba(255,208,216,${k})`; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-90 + i * 30, -330); ctx.lineTo(-75 + i * 30, -300); ctx.lineTo(-60 + i * 30, -330); ctx.fill(); }
  ctx.restore();
}
function lampObj(ctx, t) {
  const p = lampPower(t), w = warmth(t);
  // light cone + pool (additive)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const col = w > 0 ? `rgba(255,${200 + 30 * w},${120 + 40 * w},` : 'rgba(255,190,110,';
  const g = ctx.createRadialGradient(LAMP[0], LAMP[1] + 40, 10, LAMP[0], LAMP[1] + 160, 620);
  g.addColorStop(0, col + (0.42 * p) + ')'); g.addColorStop(1, col + '0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(LAMP[0] - 40, LAMP[1] + 20); ctx.lineTo(LAMP[0] + 40, LAMP[1] + 20); ctx.lineTo(LAMP[0] + 520, 380); ctx.lineTo(LAMP[0] - 560, 380); ctx.fill();
  const wg = ctx.createRadialGradient(LAMP[0], LAMP[1], 0, LAMP[0], LAMP[1], 900);
  wg.addColorStop(0, col + (0.18 * p) + ')'); wg.addColorStop(1, col + '0)');
  ctx.fillStyle = wg; ctx.fillRect(-1000, -1000, 2000, 1400);
  ctx.restore();
  // the lamp itself
  ctx.strokeStyle = '#1E0E28'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, 150); ctx.lineTo(-10, -40); ctx.lineTo(50, -120); ctx.stroke();
  ctx.fillStyle = '#1E0E28'; ctx.beginPath(); ctx.ellipse(10, 146, 40, 10, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(LAMP[0], LAMP[1]); ctx.rotate(0.45);
  ctx.fillStyle = shade(ctx, -50, 0, 50, 0, '#5A2A6E', '#2A0F33'); ctx.beginPath(); ctx.moveTo(-28, -30); ctx.lineTo(28, -30); ctx.lineTo(52, 22); ctx.lineTo(-52, 22); ctx.fill();
  ctx.fillStyle = `rgba(255,236,190,${clamp(p)})`; ctx.beginPath(); ctx.ellipse(0, 22, 50, 9, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function deskScene(ctx, t) {
  room(ctx, t);
  const slump = E.inOutCubic(P(t, 0.9, 1.6)) * (1 - E.inOutCubic(P(t, T.start, T.start + 0.5)));
  const facing = t > T.desk && t < T.start + 0.15 ? -1 : 1;
  const reach = E.inOutCubic(P(t, T.start + 0.4, T.start + 1.1));
  const fig = { x: -230, y: 380, s: 1.0, facing, slump, reach };
  castShadow(ctx, t, fig);
  lampObj(ctx, t);
  ctx.fillStyle = shade(ctx, -40, 150, 520, 150, '#7A4A8C', '#4B2A5E'); ctx.fillRect(-40, 150, 520, 26);
  ctx.fillStyle = '#2E1638'; ctx.fillRect(-20, 176, 22, 204); ctx.fillRect(440, 176, 22, 204);
  paperStack(ctx, 180, 150, 210, 330, t);
  alarm(ctx, 120, 150, t);
  figure(ctx, fig.x, fig.y, fig.s, t, fig);
  // rim light on the figure from the lamp
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * lampPower(t);
  figureSilhouette(ctx, { ...fig, x: fig.x + 4 }, 'rgba(255,190,110,0.5)', t); ctx.restore();
  if (reach > 0) {
    const k = E.inOutCubic(P(t, T.start + 0.8, T.start + 1.6));
    ctx.save(); ctx.translate(lerp(285, -120, k), lerp(-185, -195, k)); ctx.rotate(lerp(0, -0.25, k) + wob(t - T.start - 1.6, 6, 18) * 0.2);
    ctx.shadowColor = C.goldL; ctx.shadowBlur = 30 * k; ctx.fillStyle = '#FFF6E0'; ctx.fillRect(-60, -10, 120, 18);
    ctx.restore();
    tag(ctx, 'ONE PAGE', lerp(285, -120, k), -260, t - T.start - 1.4, C.gold, '#2A1600', 24);
  }
  tag(ctx, 'LAZY?', -230, -330, t - T.lazyQ, C.red, '#fff', 30);
  const q = E.outBack(P(t, T.lazyQ + 0.3, T.lazyQ + 0.6)) * (1 - P(t, T.toScale, T.toScale + 0.2));
  if (q > 0) {
    ctx.save(); ctx.translate(-80, -330); ctx.scale(q, q); ctx.rotate(0.15 + wob(t - T.lazyQ - 0.3, 5, 14) * 0.3);
    ctx.font = `900 200px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.redD; ctx.fillText('?', 8, 8); ctx.fillStyle = C.red; ctx.fillText('?', 0, 0);
    ctx.restore();
  }
  // foreground plant silhouette (parallax handled by drawing it again in screen space)
}
// the crowd of opinions behind the scale
const CROWD = (() => { const r = rng(31); return Array.from({ length: 7 }, (_, i) => ({ x: SX - 600 + i * 200 + (r() - 0.5) * 40, s: 0.95 + r() * 0.15, d: r() * 0.3 })); })();
function crowd(ctx, t) {
  for (const c of CROWD) {
    const k = E.outBack(P(t, T.crowd + c.d, T.crowd + c.d + 0.35)) * (1 - P(t, T.but + 0.3, T.but + 0.7));
    if (k <= 0) continue;
    ctx.save(); ctx.translate(c.x, 380); ctx.scale(c.s * k, c.s * k);
    ctx.fillStyle = '#6E4C80'; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.roundRect(-14, -150, 32, 150, 8); ctx.fill(); ctx.beginPath(); ctx.roundRect(-30, -300, 60, 158, 22); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -336, 34, 38, 0, 0, TAU); ctx.fill();
    // pointing arm toward the LAZY block
    const dir = c.x < SX - BEAM ? 1 : -1, nod = Math.sin(t * 6 + c.x) * 0.06;
    ctx.save(); ctx.translate(8, -280); ctx.rotate(dir > 0 ? -1.2 + nod : 1.2 + nod - Math.PI); ctx.beginPath(); ctx.roundRect(-11, 0, 22, 130, 11); ctx.fill(); ctx.restore();
    ctx.restore();
  }
}

// ───────── inside the brain: neural network scene (screen space) ─────────
const NODES = (() => {
  const r = rng(77), n = [];
  while (n.length < 95) {
    const x = r() * 1000 + 40, y = r() * 1100 + 250;
    const dx = (x - 540) / 500, dy = (y - 800) / 560;
    if (dx * dx + dy * dy < 1) n.push({ x, y, s: r(), ph: r() * TAU });
  }
  return n;
})();
const EDGES = (() => {
  const e = [];
  NODES.forEach((a, i) => {
    const near = NODES.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [j] of near) if (i < j || !e.some(([x, y]) => x === j && y === i)) e.push([i, j]);
  });
  return e;
})();
const AMY = [610, 1010], TIMEC = [330, 520];
function network(ctx, t, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  // deep tissue background
  const bg = ctx.createRadialGradient(540, 820, 50, 540, 820, 1100);
  bg.addColorStop(0, '#0B2F4A'); bg.addColorStop(1, '#04060F');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const born = d => E.outBack(P(t, T.inside - 0.1 + d / 1400, T.inside + 0.25 + d / 1400));
  const collapse = E.inCubic(P(t, T.outBrain, T.outBrain + 0.35));
  const redR = E.inOutCubic(P(t, T.emo + 0.3, T.outBrain)) * 1150;           // fear spreads
  const pos = nd => [lerp(nd.x, AMY[0], collapse), lerp(nd.y, AMY[1], collapse)];
  const redness = (x, y) => clamp((redR - Math.hypot(x - AMY[0], y - AMY[1])) / 160);
  // edges with travelling signals
  ctx.lineCap = 'round';
  EDGES.forEach(([i, j], k) => {
    const a = NODES[i], b = NODES[j], [ax, ay] = pos(a), [bx, by] = pos(b);
    const d = Math.hypot(a.x - 540, a.y - 800), bn = Math.min(born(d), born(Math.hypot(b.x - 540, b.y - 800)));
    if (bn <= 0) return;
    const rd = redness((ax + bx) / 2, (ay + by) / 2);
    ctx.strokeStyle = rd > 0 ? `rgba(255,${Math.round(lerp(214, 51, rd))},${Math.round(lerp(255, 85, rd))},0.45)` : 'rgba(56,214,255,0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, clamp(bn)), lerp(ay, by, clamp(bn))); ctx.stroke();
    const sp = 0.6 + (k % 5) * 0.25, ph = ((t * sp + k * 0.137) % 1);
    ctx.fillStyle = rd > 0.5 ? C.redL : C.cyanL;
    ctx.beginPath(); ctx.arc(lerp(ax, bx, ph), lerp(ay, by, ph), 3.5, 0, TAU); ctx.fill();
  });
  // nodes
  NODES.forEach(nd => {
    const [x, y] = pos(nd), b = born(Math.hypot(nd.x - 540, nd.y - 800));
    if (b <= 0) return;
    const rd = redness(x, y), pulse = 0.7 + 0.3 * Math.sin(t * 4 + nd.ph);
    ctx.save(); ctx.shadowColor = rd > 0.5 ? C.red : C.cyan; ctx.shadowBlur = 16;
    ctx.fillStyle = rd > 0.5 ? C.red : C.cyan;
    ctx.beginPath(); ctx.arc(x, y, (5 + nd.s * 6) * b * pulse, 0, TAU); ctx.fill(); ctx.restore();
  });
  // time cluster: hologram clock, highlighted then cracked
  const tc = E.outBack(P(t, T.inside + 0.4, T.inside + 0.8)) * (1 - collapse);
  if (tc > 0) {
    const [cx, cy] = TIMEC, R = 92 * tc, hi = P(t, T.timeHi, T.timeHi + 0.2);
    ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 24;
    ctx.strokeStyle = hi > 0 ? `rgba(191,243,255,${0.6 + 0.4 * hi})` : 'rgba(56,214,255,0.7)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82); ctx.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); ctx.stroke(); }
    const spin = t * 3 + E.inCubic(P(t, T.timeHi, T.crack)) * 25;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin) * R * 0.7, cy + Math.sin(spin) * R * 0.7); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin * 0.1) * R * 0.45, cy + Math.sin(spin * 0.1) * R * 0.45); ctx.stroke();
    ctx.restore();
    const ck = E.outExpo(P(t, T.crack, T.crack + 0.25));
    if (ck > 0) {
      ctx.strokeStyle = C.cyanL; ctx.lineWidth = 3; const r = rng(3);
      for (let b = 0; b < 5; b++) { let x = cx + 10, y = cy - 8, a = r() * TAU; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 4 * ck; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 20; y += Math.sin(a) * 20; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 20; ctx.strokeStyle = C.red; ctx.lineWidth = 16;
      const x1 = E.outCubic(P(t, T.crack + 0.1, T.crack + 0.35)), x2 = E.outCubic(P(t, T.crack + 0.25, T.crack + 0.5));
      ctx.beginPath(); ctx.moveTo(cx - 80, cy - 80); ctx.lineTo(cx - 80 + 160 * x1, cy - 80 + 160 * x1); ctx.stroke();
      if (x2 > 0) { ctx.beginPath(); ctx.moveTo(cx + 80, cy - 80); ctx.lineTo(cx + 80 - 160 * x2, cy - 80 + 160 * x2); ctx.stroke(); }
      ctx.restore();
    }
    tag(ctx, ck > 0 ? 'TIME: NOT THE ISSUE' : 'TIME', cx, cy + R + 48, t - T.inside - 0.6, ck > 0 ? C.red : C.cyan, ck > 0 ? '#fff' : '#071A2A', 22);
  }
  // the fear centre (amygdala)
  const ag = E.outBack(P(t, T.inside + 0.6, T.inside + 1.0));
  if (ag > 0) {
    const [ax, ay] = AMY, heat = lerp(0.35, 1, P(t, T.emo, T.emo + 0.4)), pulse = 0.85 + 0.15 * Math.sin(t * (heat > 0.5 ? 14 : 5));
    const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, 170 * ag * pulse * (0.6 + heat));
    g.addColorStop(0, `rgba(255,90,120,${0.95 * heat})`); g.addColorStop(0.4, `rgba(255,51,85,${0.55 * heat})`); g.addColorStop(1, 'rgba(255,51,85,0)');
    ctx.fillStyle = g; ctx.fillRect(ax - 400, ay - 400, 800, 800);
    ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 30; ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.ellipse(ax, ay, 34 * ag * pulse, 24 * ag * pulse, 0.4, 0, TAU); ctx.fill(); ctx.restore();
    tag(ctx, heat > 0.6 ? 'AMYGDALA · FEAR OVERLOAD' : 'AMYGDALA', ax, ay + 95, t - T.inside - 0.9, C.red, '#fff', 22);
  }
  // HUD
  ctx.font = `700 22px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(191,243,255,0.8)';
  const hud = 'NEURAL SCAN · SUBJECT: YOU';
  ctx.fillText(hud.slice(0, Math.floor(hud.length * P(t, T.inside, T.inside + 0.6))), 70, 150);
  ctx.strokeStyle = 'rgba(191,243,255,0.5)'; ctx.lineWidth = 3;
  for (const [x, y, sx, sy] of [[50, 190, 1, 1], [1030, 190, -1, 1], [50, 1420, 1, -1], [1030, 1420, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 40); ctx.lineTo(x, y); ctx.lineTo(x + sx * 40, y); ctx.stroke(); }
  ctx.restore();
}

// ───────── foreground parallax (screen space): plant leaves & desk edge ─────────
function foreground(ctx, t, cam) {
  const inRoom = cam.x < 600 ? 1 : 0;
  if (!inRoom) return;
  const ox = -cam.x * 0.6 - 200, oy = -cam.y * 0.4;
  ctx.save(); ctx.translate(ox, oy + 1400);
  ctx.fillStyle = '#0A0310';
  for (let i = 0; i < 6; i++) {
    const a = -1.9 + i * 0.32 + Math.sin(t * 1.2 + i) * 0.03;
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -260, 60, 260, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// ───────── kinetic words that act out their meaning ─────────
const PAL = { base: ['#FFF4FB', '#FFE0F2', '#C9F6FF'], red: ['#FF3355', '#FF6F87', '#FF3355'], cyan: ['#38D6FF', '#9DEBFF', '#38D6FF'], gold: ['#FFD873', '#F4B428', '#FFD873'] };
function kinetic(ctx, t) {
  let cur = null;
  for (const w of WORDS) if (t >= w[0]) cur = w;
  if (!cur || t > T.end) return;
  const [t0, word, kind = ''] = cur, d = t - t0;
  // LAZY. flies out of the room toward the scale (it becomes the block)
  if (word === 'LAZY.' && t > T.fly) {
    const k = E.inExpo(P(t, T.fly, T.toScale + 0.2));
    if (k >= 1) return;
    ctx.save(); ctx.translate(lerp(W / 2, W + 300, k), lerp(1610, 700, k)); ctx.rotate(k * 0.8); ctx.scale(1 - k * 0.4, 1 - k * 0.4);
    ctx.font = `900 140px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.red; ctx.fillText('LAZY', 0, 0);
    ctx.restore(); return;
  }
  let size = kind === 'fear' ? 230 : kind === 'small' ? 210 : kind === 'stretch' ? 112 : 140;
  if (kind === 'small') size = lerp(210, 80, E.outBack(P(d, 0.45, 0.8)));            // SMALL gets small
  const pal = kind === 'fear' || kind === 'red' || kind === 'crack' ? PAL.red : kind === 'cyan' || kind === 'flip' ? PAL.cyan : kind === 'gold' || kind === 'small' ? PAL.gold : PAL.base;
  ctx.save();
  ctx.font = `900 ${size}px ${DISP}`; ctx.textBaseline = 'middle';
  let tw = ctx.measureText(word).width, sz = size;
  let spacing = kind === 'stretch' ? lerp(26, 0, E.outCubic(P(d, 0, 0.8))) : 0;      // PROCRASTINATION drags
  if (tw + spacing * word.length > 980) { sz = size * 980 / (tw + spacing * word.length); ctx.font = `900 ${sz}px ${DISP}`; tw = ctx.measureText(word).width; spacing *= sz / size; }
  const y = 1610;
  let x = W / 2 - (tw + spacing * (word.length - 1)) / 2;
  const r = rng(Math.floor(t0 * 100));
  const shakeAmt = kind === 'fear' ? Math.exp(-d * 4) * 18 + 3 : 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], cw = ctx.measureText(ch).width;
    const li = E.outBack(P(d, i * 0.012, i * 0.012 + 0.16));
    const glitch = d < 0.08 ? (r() - 0.5) * 30 : 0;
    ctx.save(); ctx.translate(x + cw / 2 + glitch + (r() - 0.5) * shakeAmt, y + (1 - li) * 40 + (r() - 0.5) * shakeAmt);
    let sy = lerp(0.4, 1, li), sx = sy;
    if (kind === 'flip') sy *= Math.cos(Math.PI * E.inOutCubic(P(d, 0.35 + i * 0.04, 0.6 + i * 0.04)));   // OPPOSITE turns upside down
    ctx.scale(sx, sy);
    ctx.fillStyle = 'rgba(10,0,20,0.6)'; ctx.fillText(ch, -cw / 2 + 5, 7);
    const g = ctx.createLinearGradient(0, -sz / 2, 0, sz / 2); g.addColorStop(0, pal[i % 3]); g.addColorStop(1, pal[(i + 1) % 3]);
    ctx.fillStyle = g;
    if (kind === 'crack' && t > T.crack) {                // TIME splits in half
      const s = E.outCubic(P(t, T.crack, T.crack + 0.4));
      ctx.save(); ctx.beginPath(); ctx.rect(-cw, -sz, cw * 2, sz); ctx.clip(); ctx.translate(-8 * s, -14 * s); ctx.rotate(-0.05 * s); ctx.fillText(ch, -cw / 2, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(-cw, 0, cw * 2, sz); ctx.clip(); ctx.translate(8 * s, 14 * s); ctx.rotate(0.05 * s); ctx.fillText(ch, -cw / 2, 0); ctx.restore();
    } else ctx.fillText(ch, -cw / 2, 0);
    ctx.restore();
    x += cw + spacing;
  }
  if (d < 0.08) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(56,214,255,0.25)'; ctx.fillRect(0, y - sz * 0.15, W, sz * 0.12); }
  ctx.restore();
}

// ───────── frame composition ─────────
function backdrop(ctx) { ctx.fillStyle = shade(ctx, 0, 0, 0, H, C.bg0, C.bg1); ctx.fillRect(0, 0, W, H); }
function worldScene(ctx, t, cam) {
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll || 0); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  // the next room (scale) lives to the right: magenta stage
  ctx.fillStyle = shade(ctx, 640, -1000, 640, 380, '#2A0A33', '#4A0D42'); ctx.fillRect(640, -1200, 2200, 1580);
  ctx.fillStyle = '#14061B'; ctx.fillRect(640, 380, 2200, 700);
  const sg = ctx.createRadialGradient(SX, -100, 0, SX, -100, 900); sg.addColorStop(0, 'rgba(255,60,170,0.20)'); sg.addColorStop(1, 'rgba(255,60,170,0)');
  ctx.fillStyle = sg; ctx.fillRect(640, -1200, 2200, 1580);
  deskScene(ctx, t);
  crowd(ctx, t);
  scaleObj(ctx, t);
  lazyBlock(ctx, t);
  const [bx, by] = brainPos(t), drop = P(t, T.brainDrop - 0.25, T.brainDrop);
  if (drop > 0) {
    const sq = wob(t - T.brainDrop, 8, 20), yy = lerp(by - 900, by, E.inCubic(drop));
    ctx.save(); ctx.translate(bx, yy + 80); ctx.scale(1 + 0.18 * sq, 1 - 0.18 * sq); ctx.translate(-bx, -(yy + 80));
    brain(ctx, t, bx, yy, 0.9, E.outCubic(P(t, T.toBrain - 0.3, T.toBrain)) * 0.6, 0);
    ctx.restore();
  }
  ctx.restore();
}
const CHROMA = ['#ff0000', '#00ff00', '#0000ff'].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
function chroma(ctx, src, amt) {
  ['#ff0000', '#00ff00', '#0000ff'].forEach((col, i) => { const c = CHROMA[i].getContext('2d'); c.globalCompositeOperation = 'source-over'; c.drawImage(src, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = col; c.fillRect(0, 0, W, H); });
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(CHROMA[0], amt, 0); ctx.drawImage(CHROMA[1], 0, 0); ctx.drawImage(CHROMA[2], -amt, amt * 0.5); ctx.restore();
}
const LAYER = document.createElement('canvas'); LAYER.width = W; LAYER.height = H; const lctx = LAYER.getContext('2d');
function renderScene(ctx, t) {
  const c = lctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const cam = camera(t);
  let sx = 0, sy = 0;
  for (const [tt, a] of [[T.brainDrop, 16], [T.crack, 12], [T.fear, 26], [T.lean, 8]]) { const d = t - tt; if (d > 0 && d < 0.5) { const k = Math.exp(-d * 10) * a; sx += k * Math.sin(d * 90); sy += k * Math.cos(d * 71); } }
  c.translate(sx, sy);
  backdrop(c);
  if (t < T.inside) {
    worldScene(c, t, cam);
    if (t >= T.toBrain) {   // dive transition: tunnel rings + flash while zooming into the brain
      const k = P(t, T.toBrain + 0.2, T.inside);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const r = ((k * 2 + i / 6) % 1) * 1300; c.strokeStyle = `rgba(56,214,255,${0.35 * (1 - r / 1300) * k})`; c.lineWidth = 18; c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke(); }
      c.restore();
      c.fillStyle = `rgba(160,240,255,${E.inExpo(k) * 0.95})`; c.fillRect(0, 0, W, H);
    }
  } else if (t < T.outBrain + 0.45) {
    if (t >= T.outBrain + 0.3) { c.fillStyle = C.redD; c.fillRect(0, 0, W, H); }
    network(c, t, 1 - P(t, T.outBrain + 0.3, T.outBrain + 0.45));
  } else if (t < T.desk) {
    c.fillStyle = C.redD; c.fillRect(0, 0, W, H);
  } else {
    worldScene(c, t, cam);
    if (t < T.desk + 0.35) {   // red iris opening onto the desk
      const k = E.outCubic(P(t, T.desk, T.desk + 0.35));
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.beginPath(); c.arc(W / 2, H * 0.45, k * 1300 + 1, 0, TAU); c.fill(); c.restore();
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-over'; c.fillStyle = C.redD; c.fillRect(0, 0, W, H); c.restore();
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  foreground(c, t, cam);
  // whip pan speed lines
  const wp = P(t, T.toScale, T.toScale + 0.42);
  if (wp > 0 && wp < 1) {
    const a = Math.sin(Math.PI * wp), r = rng(Math.floor(t * 30));
    c.fillStyle = `rgba(255,220,250,${0.35 * a})`;
    for (let i = 0; i < 26; i++) c.fillRect(r() * W, r() * H, 200 + r() * 500, 3);
  }
  kinetic(c, t);
  // grade: scanlines, grain-ish texture, vignette, fear pulse
  c.fillStyle = 'rgba(0,0,0,0.09)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,0,12,0.6)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const fd = t - T.fear;
  if (fd > 0 && fd < 0.4) { c.fillStyle = `rgba(255,30,70,${0.28 * (1 - fd / 0.4)})`; c.fillRect(0, 0, W, H); }
  if (t > T.start + 0.2) { c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,200,120,${0.25 * warmth(t)})`; c.fillRect(0, 0, W, H); c.restore(); }
  // chromatic aberration on the big hits
  let ab = 0;
  for (const [tt, a] of [[T.brainDrop, 14], [T.crack, 12], [T.fear, 24], [T.inside, 16]]) { const d = t - tt; if (d > 0 && d < 0.25) ab = Math.max(ab, a * (1 - d / 0.25)); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
  if (ab > 0.5) chroma(ctx, LAYER, ab); else ctx.drawImage(LAYER, 0, 0);
}

const main = document.getElementById('c'); main.width = W; main.height = H;
const mctx = main.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
const sctx = scratch.getContext('2d');
let NOISE;
function grain(frame) {
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256; const n = NOISE.getContext('2d'), id = n.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } n.putImageData(id, 0, 0); }
  mctx.save(); mctx.globalCompositeOperation = 'overlay'; mctx.globalAlpha = 0.07;
  const pat = mctx.createPattern(NOISE, 'repeat'); pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256));
  mctx.fillStyle = pat; mctx.fillRect(0, 0, W, H); mctx.restore();
}
window.drawFrame = function (frame, S = 3) {
  const t = frame / FPS;
  for (let i = 0; i < S; i++) {
    const ts = clamp(t + ((i + 0.5) / S - 0.5) * 0.5 / FPS, 0, DUR - 1e-4);
    renderScene(sctx, ts);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1; grain(frame);
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/png'); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 24px ${MONO}`)]);
