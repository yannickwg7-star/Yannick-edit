// "YOU'RE NOT LAZY, YOU'RE SCARED": explainer motion piece, 1080x1920, 17.5s.
// One world the camera travels through: the desk, the scale of beliefs, the scanned brain,
// the broken clock, and back to the desk where the task's shadow becomes the fear.
const W = 1080, H = 1920, FPS = 30, DUR = 17.5;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
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
  bg0: '#1A0626', bg1: '#4A0D42', wall: 'rgba(255,255,255,0.035)',
  blue: '#2F62FF', blueL: '#5C8BFF', blueD: '#1A3BB0',
  gold: '#F4B428', goldL: '#FFD873', goldD: '#B87A0E',
  cyan: '#38D6FF', cyanL: '#BFF3FF', cyanD: '#0E6F96',
  red: '#FF3355', redL: '#FF8A9E', redD: '#A3122E', green: '#4BFFA6',
  paper: '#E9E6F2', paperD: '#B5B0C9', ink: '#FFF4FB',
};
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';

// ───────── timeline (matches the script) ─────────
const T = { lazyQ: 1.6, toScale: 3.0, lean: 3.5, but: 6.45, brainDrop: 6.55, dust: 7.0, toBrain: 7.9, scan: 8.3,
  toClock: 9.6, crack: 10.6, toEmotion: 11.2, toDesk: 12.6, monster: 13.4, fear: 14.6, start: 15.35, end: 17.5 };
const WORDS = [
  [0.30, 'YOU'], [0.55, 'THINK'], [0.85, "YOU'RE"], [1.20, 'LAZY.', 'red'],
  [3.20, 'MOST'], [3.45, 'PEOPLE'], [3.80, 'BELIEVE'], [4.25, 'PROCRASTINATION', 'small'], [5.05, 'MEANS'], [5.35, 'NO'], [5.65, 'DISCIPLINE.', 'red'],
  [6.45, 'BUT', 'cyan'], [6.80, 'RESEARCH'], [7.20, 'SAYS'], [7.45, 'THE'], [7.70, 'OPPOSITE.', 'cyan'],
  [9.70, "IT'S"], [9.90, 'NOT'], [10.10, 'A'], [10.30, 'TIME', 'red'], [10.65, 'PROBLEM.'],
  [11.25, "IT'S"], [11.45, 'AN'], [11.65, 'EMOTION', 'cyan'], [12.10, 'PROBLEM.'],
  [12.85, 'YOU'], [13.05, 'AVOID'], [13.35, 'THE'], [13.55, 'TASK'], [13.95, 'TO'], [14.15, 'AVOID'], [14.40, 'THE'], [14.62, 'FEAR.', 'redBig'],
  [15.55, 'START', 'gold'], [15.95, 'SMALL.', 'goldBig'],
];

// ───────── world layout ─────────
const SX = 1300, PIV = -130, BEAM = 300;       // scale
const CLK = [2450, -60];                        // clock
function beamAngle(t) {
  let a = 0;
  a += -0.26 * spring(t - T.lean, 6, 11);                       // LAZY makes the left side heavy
  a += 0.58 * spring(t - T.brainDrop - 0.12, 6, 10);           // the brain drops: flips to the right
  a += 0.12 * E.inOutCubic(P(t, T.dust, T.dust + 0.8));         // LAZY dissolves: right goes further down
  return a;
}
function panPos(t, side) {   // side -1 left, +1 right
  const a = beamAngle(t);
  return [SX + side * BEAM * Math.cos(a), PIV + side * BEAM * Math.sin(a) + 215];
}
function brainPos(t) { const [x, y] = panPos(t, 1); return [x, y - 112]; }

// ───────── camera ─────────
function camera(t) {
  const keys = [];
  const desk = { x: 50, y: 20, z: 1.36 }, scale = { x: SX, y: 20, z: 0.98 };
  const [bx, by] = brainPos(t), brain = { x: bx - 70, y: by + 10, z: 1.55 };
  const clock = { x: CLK[0], y: CLK[1] + 40, z: 1.5 };
  const deskWide = { x: 80, y: -150, z: 1.0 }, hands = { x: -10, y: 0, z: 1.4 };
  const seg = [[0, desk], [T.toScale, desk], [T.toScale + 0.9, scale], [T.toBrain, scale], [T.toBrain + 0.6, brain],
    [T.toClock, brain], [T.toClock + 0.6, clock], [T.toEmotion, clock], [T.toEmotion + 0.6, brain], [T.toDesk, brain],
    [T.toDesk + 0.8, desk], [T.monster, desk], [T.fear, deskWide], [T.start, deskWide], [T.start + 0.8, hands], [T.end, hands]];
  for (let i = 0; i < seg.length - 1; i++) {
    const [t0, a] = seg[i], [t1, b] = seg[i + 1];
    if (t >= t0 && t <= t1) {
      const k = t1 > t0 ? E.inOutCubic(P(t, t0, t1)) : 1;
      // a slight overshoot "drift" on the arrival makes the camera feel handheld-smooth
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) * (1 + 0.04 * Math.sin(Math.PI * k)) };
    }
  }
  return hands;
}

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
function scanner(ctx, t, bx, by) {
  const a = E.outCubic(P(t, T.scan, T.scan + 0.4)) * (1 - P(t, T.toClock + 0.2, T.toClock + 0.5));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const sy = by - 260 + (1 - a) * -200, jaw = lerp(160, 128, E.inOutCubic(P(t, T.scan + 0.3, T.scan + 0.9)));
  ctx.fillStyle = shade(ctx, bx - 12, 0, bx + 12, 0, '#E4E8F2', '#8A90A6'); ctx.fillRect(bx - 12, sy - 200, 24, 260);
  for (const s of [-1, 1]) {
    ctx.fillStyle = shade(ctx, 0, sy, 0, sy + 160, '#DDE2EE', '#7A8098');
    ctx.beginPath(); ctx.moveTo(bx + s * 12, sy + 40); ctx.lineTo(bx + s * jaw, sy + 40); ctx.lineTo(bx + s * jaw, sy + 170); ctx.lineTo(bx + s * (jaw - 18), sy + 170); ctx.lineTo(bx + s * (jaw - 18), sy + 70); ctx.lineTo(bx + s * 12, sy + 70); ctx.fill();
  }
  ctx.fillStyle = '#0B1A12'; ctx.fillRect(bx - 10, sy - 150, 20, 90);
  const lvl = E.inOutCubic(P(t, T.scan + 0.4, T.scan + 1.1));
  ctx.fillStyle = C.green; ctx.fillRect(bx - 6, sy - 64 - 82 * lvl, 12, 82 * lvl);
  // scan line sweeping over the brain
  const sl = (t * 1.7) % 1;
  ctx.fillStyle = 'rgba(75,255,166,0.35)'; ctx.fillRect(bx - 150, by - 100 + sl * 200, 300, 4);
  // readout panel
  const px = bx - 392, py = by - 150, pw = 262, ph = 150;
  const pa = E.outBack(P(t, T.scan + 0.5, T.scan + 0.8));
  ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(pa, pa); ctx.translate(-(px + pw / 2), -(py + ph / 2));
  ctx.shadowColor = C.red; ctx.shadowBlur = 20;
  ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(40,4,16,0.85)';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = `700 21px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = [['SCANNING…', '#FFC2CD'], ['TIME MGMT: OK', '#FFC2CD'], ['FEAR LEVEL: HIGH', C.red]];
  lines.forEach(([s, c], i) => {
    const n = Math.floor(s.length * P(t, T.scan + 0.6 + i * 0.25, T.scan + 0.85 + i * 0.25));
    ctx.fillStyle = c; ctx.fillText(s.slice(0, n), px + 22, py + 22 + i * 40);
  });
  ctx.restore();
  ctx.restore();
}
function clockObj(ctx, t) {
  const [cx, cy] = CLK, R = 170;
  const spin = E.inCubic(P(t, T.toClock, T.crack)) * 30 + t * 0.6;
  ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 30;
  ctx.fillStyle = shade(ctx, cx - R, cy - R, cx + R, cy + R, '#5C8BFF', '#1A3BB0'); ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#F2F0FA'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2A2440';
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.save(); ctx.translate(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22)); ctx.rotate(a); ctx.fillRect(-8, -3, 16, 6); ctx.restore(); }
  ctx.strokeStyle = '#2A2440'; ctx.lineCap = 'round';
  ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin * 0.08 - 1.5) * R * 0.5, cy + Math.sin(spin * 0.08 - 1.5) * R * 0.5); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin - 1.5) * R * 0.78, cy + Math.sin(spin - 1.5) * R * 0.78); ctx.stroke();
  // crack + red X
  const ck = E.outExpo(P(t, T.crack, T.crack + 0.25));
  if (ck > 0) {
    ctx.strokeStyle = '#2A2440'; ctx.lineWidth = 4;
    const r = rng(3);
    for (let b = 0; b < 6; b++) { let x = cx + 30, y = cy - 20, a = r() * TAU; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 5 * ck; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 30; y += Math.sin(a) * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    const xk = E.outCubic(P(t, T.crack + 0.1, T.crack + 0.4));
    ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 25; ctx.strokeStyle = C.red; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(cx - 150, cy - 150); ctx.lineTo(cx - 150 + 300 * xk, cy - 150 + 300 * xk); ctx.stroke();
    const xk2 = E.outCubic(P(t, T.crack + 0.25, T.crack + 0.55));
    if (xk2 > 0) { ctx.beginPath(); ctx.moveTo(cx + 150, cy - 150); ctx.lineTo(cx + 150 - 300 * xk2, cy - 150 + 300 * xk2); ctx.stroke(); }
    ctx.restore();
  }
  tag(ctx, 'TIME ✕', cx, cy + R + 70, t - T.crack - 0.3, C.red, '#fff', 30);
}
// fear monster: the task stack's shadow on the wall grows teeth
function monster(ctx, t, ax, ay) {
  const grow = E.outBack(P(t, T.monster, T.fear + 0.2)) * lerp(1, 0.42, E.inOutCubic(P(t, T.start + 0.3, T.start + 1.6)));
  if (grow <= 0.01) return;
  const roar = t > T.fear ? 1 + 0.06 * wob(t - T.fear, 5, 30) : 1;
  ctx.save(); ctx.translate(ax, ay); ctx.scale(grow * roar, grow * roar);
  ctx.fillStyle = 'rgba(8,0,16,0.82)';
  ctx.beginPath(); ctx.moveTo(-170, 0);
  ctx.bezierCurveTo(-220, -200, -200, -420, -120, -520); ctx.lineTo(-150, -640); ctx.lineTo(-70, -560);   // left horn
  ctx.bezierCurveTo(-30, -600, 30, -600, 70, -560); ctx.lineTo(150, -640); ctx.lineTo(120, -520);          // right horn
  ctx.bezierCurveTo(200, -420, 230, -200, 170, 0);
  for (let i = 0; i < 6; i++) ctx.lineTo(170 - i * 68, i % 2 ? -40 : 0);
  ctx.closePath(); ctx.fill();
  // claws reaching toward the figure
  ctx.beginPath(); ctx.moveTo(-170, -260); ctx.quadraticCurveTo(-330, -300, -380, -220); ctx.lineTo(-400, -250); ctx.lineTo(-380, -200); ctx.lineTo(-410, -200); ctx.lineTo(-360, -180); ctx.quadraticCurveTo(-300, -230, -170, -200); ctx.fill();
  const eg = 0.8 + 0.2 * Math.sin(t * 12);
  ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 30; ctx.fillStyle = `rgba(255,51,85,${eg})`;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 55, -420, 30, 13, s * 0.35, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#FFD0D8'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-90 + i * 30, -330); ctx.lineTo(-75 + i * 30, -300); ctx.lineTo(-60 + i * 30, -330); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}

// ───────── backdrop ─────────
const MOTES = (() => { const r = rng(8); return Array.from({ length: 80 }, () => ({ x: r() * 4000 - 1200, y: r() * 2400 - 1200, s: r(), d: 0.3 + r() * 0.5 })); })();
function backdrop(ctx, t, cam) {
  ctx.fillStyle = shade(ctx, 0, 0, 0, H, C.bg0, C.bg1); ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, 950);
  rg.addColorStop(0, 'rgba(255,60,170,0.16)'); rg.addColorStop(1, 'rgba(255,60,170,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  for (const m of MOTES) {
    const sx = ((m.x - cam.x * m.d) % 1500 + 1500) % 1500 - 200, sy = ((m.y - cam.y * m.d - t * 10 * m.d) % 2300 + 2300) % 2300 - 200;
    ctx.fillStyle = `rgba(255,170,230,${0.06 + 0.16 * m.s})`; ctx.beginPath(); ctx.arc(sx, sy, 1 + m.s * 3, 0, TAU); ctx.fill();
  }
}

// ───────── world ─────────
function world(ctx, t, cam) {
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  // floor + back wall
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-1600, 380, 5600, 900);
  ctx.strokeStyle = 'rgba(255,140,220,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1600, 380); ctx.lineTo(4000, 380); ctx.stroke();
  ctx.fillStyle = C.wall; ctx.fillRect(-520, -900, 1100, 1280);
  // desk scene
  const slump = E.inOutCubic(P(t, 0.9, 1.6)) * (1 - E.inOutCubic(P(t, T.start, T.start + 0.5)));
  monster(ctx, t, 260, 150);
  ctx.fillStyle = shade(ctx, -40, 150, 520, 150, '#7A4A8C', '#4B2A5E'); ctx.fillRect(-40, 150, 520, 26);
  ctx.fillStyle = '#3A2049'; ctx.fillRect(-20, 176, 22, 204); ctx.fillRect(440, 176, 22, 204);
  paperStack(ctx, 180, 150, 210, 330, t);
  alarm(ctx, 60, 150, t);
  const facing = t > T.toDesk + 0.9 && t < T.start ? -1 : 1;
  const reach = E.inOutCubic(P(t, T.start + 0.4, T.start + 1.1));
  figure(ctx, -230, 380, 1.0, t, { facing, slump, reach });
  // a single sheet: the small start
  if (reach > 0) {
    const k = E.inOutCubic(P(t, T.start + 0.8, T.start + 1.6));
    ctx.save(); ctx.translate(lerp(285, -120, k), lerp(-185, -190, k)); ctx.rotate(lerp(0, -0.25, k));
    ctx.fillStyle = C.paper; ctx.fillRect(-60, -10, 120, 18);
    ctx.restore();
    tag(ctx, 'ONE PAGE', lerp(285, -120, k), -250, t - T.start - 1.3, C.gold, '#2A1600', 24);
  }
  tag(ctx, 'LAZY?', -230, -330, t - T.lazyQ, C.red, '#fff', 30);
  // red question mark
  const q = E.outBack(P(t, T.lazyQ + 0.3, T.lazyQ + 0.6)) * (1 - P(t, T.toScale, T.toScale + 0.3));
  if (q > 0) {
    ctx.save(); ctx.translate(-80, -330); ctx.scale(q, q); ctx.rotate(0.15 + wob(t - T.lazyQ - 0.3, 5, 14) * 0.3);
    ctx.font = `900 200px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.redD; ctx.fillText('?', 8, 8); ctx.fillStyle = C.red; ctx.fillText('?', 0, 0);
    ctx.restore();
  }
  // scale scene
  scaleObj(ctx, t);
  lazyBlock(ctx, t);
  // the brain drops onto the right pan
  const [bx, by] = brainPos(t);
  const drop = P(t, T.brainDrop - 0.25, T.brainDrop);
  if (drop > 0) {
    const sq = wob(t - T.brainDrop, 8, 20);
    const yy = lerp(by - 900, by, E.inCubic(drop));
    const fear = E.outCubic(P(t, T.scan + 1.0, T.scan + 1.4)), emo = E.outCubic(P(t, T.toEmotion + 0.5, T.toEmotion + 0.8));
    ctx.save(); ctx.translate(bx, yy + 80); ctx.scale(1 + 0.18 * sq, 1 - 0.18 * sq); ctx.translate(-bx, -(yy + 80));
    brain(ctx, t, bx, yy, 0.9, fear, emo);
    ctx.restore();
    scanner(ctx, t, bx, by);
    tag(ctx, 'EMOTION ✓', bx, by - 175, t - T.toEmotion - 0.6, C.green, '#062A18', 28);
    if (fear > 0 && t > T.toEmotion + 0.6) tag(ctx, 'FEAR', bx + 10, by + 30, t - T.toEmotion - 0.8, C.red, '#fff', 22);
  }
  clockObj(ctx, t);
  ctx.restore();
}

// ───────── kinetic words (chunky, multi-colour letters, glitch entrance) ─────────
const PAL = { base: ['#FFF4FB', '#FFE0F2', '#C9F6FF'], red: ['#FF3355', '#FF6F87', '#FF3355'], cyan: ['#38D6FF', '#9DEBFF', '#38D6FF'], gold: ['#FFD873', '#F4B428', '#FFD873'] };
function kinetic(ctx, t) {
  let cur = null;
  for (const w of WORDS) if (t >= w[0]) cur = w;
  if (!cur || t > T.end) return;
  const [t0, word, kind = ''] = cur, d = t - t0;
  const size = kind.includes('Big') ? 210 : kind === 'small' ? 112 : 140;
  const pal = PAL[kind.replace('Big', '')] || PAL.base;
  ctx.save();
  ctx.font = `900 ${size}px ${DISP}`; ctx.textBaseline = 'middle';
  let tw = ctx.measureText(word).width, sz = size;
  if (tw > 980) { sz = size * 980 / tw; ctx.font = `900 ${sz}px ${DISP}`; tw = ctx.measureText(word).width; }
  const y = 1610, pop = E.outBack(P(d, 0, 0.16));
  let x = W / 2 - tw / 2;
  const r = rng(Math.floor(t0 * 100));
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], cw = ctx.measureText(ch).width;
    const li = E.outBack(P(d, i * 0.012, i * 0.012 + 0.16));
    const glitch = d < 0.1 ? (r() - 0.5) * 30 : 0;
    ctx.save(); ctx.translate(x + cw / 2 + glitch, y + (1 - li) * 40); ctx.rotate((r() - 0.5) * 0.08 * (1 - pop)); ctx.scale(lerp(0.4, 1, li), lerp(0.4, 1, li));
    ctx.fillStyle = 'rgba(10,0,20,0.6)'; ctx.fillText(ch, -cw / 2 + 5, 7);
    const g = ctx.createLinearGradient(0, -sz / 2, 0, sz / 2);
    g.addColorStop(0, pal[i % 3]); g.addColorStop(1, pal[(i + 1) % 3]);
    ctx.fillStyle = g; ctx.fillText(ch, -cw / 2, 0);
    ctx.restore();
    x += cw;
  }
  // RGB glitch slice on entry
  if (d < 0.08) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(56,214,255,0.25)'; ctx.fillRect(0, y - sz * 0.15, W, sz * 0.12); }
  ctx.restore();
}

// ───────── frame ─────────
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const cam = camera(t);
  // impact shakes: brain lands, clock cracks, fear roars
  let sx = 0, sy = 0;
  for (const [c, a] of [[T.brainDrop, 16], [T.crack, 14], [T.fear, 22]]) { const d = t - c; if (d > 0 && d < 0.5) { const k = Math.exp(-d * 10) * a; sx += k * Math.sin(d * 90); sy += k * Math.cos(d * 71); } }
  ctx.translate(sx, sy);
  backdrop(ctx, t, cam);
  world(ctx, t, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  kinetic(ctx, t);
  // scanlines + vignette (the reference's screen texture)
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,0,12,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // red pulse on FEAR
  const fd = t - T.fear;
  if (fd > 0 && fd < 0.4) { ctx.fillStyle = `rgba(255,30,70,${0.25 * (1 - fd / 0.4)})`; ctx.fillRect(0, 0, W, H); }
}

const main = document.getElementById('c'); main.width = W; main.height = H;
const mctx = main.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
const sctx = scratch.getContext('2d');
window.drawFrame = function (frame, S = 3) {
  const t = frame / FPS;
  for (let i = 0; i < S; i++) {
    const ts = clamp(t + ((i + 0.5) / S - 0.5) * 0.5 / FPS, 0, DUR - 1e-4);
    renderScene(sctx, ts);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/png'); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 24px ${MONO}`)]);
