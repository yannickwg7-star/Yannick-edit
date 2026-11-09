// REBORN — high-retention 9:16 motion piece, 1080x1920 @ 60fps, 45.7s.
// Retention system: one focus ring locked to the screen centre that morphs into every metaphor
// object; word-by-word spring typography in the central band; a pattern interrupt every ~2.2s
// (6 beats @ 163 BPM) cycling glow-shift / DOF pulse / 3D tilt / grid warp; slow camera push
// during builds with a snap + micro-shake on every drop. Background: 3D wireframe floor +
// depth-of-field particle field, slate black, vignette, film grain.
const W = 1080, H = 1920, FPS = 60, DUR = 45.7;
window.META = { W, H, FPS, DUR };
const CX = 540, CY = 740;                    // focal point of every object
const TY = 1390;                             // centre of the typography band
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
};
// damped spring (unit step response). freq in Hz, damping ratio z
function spring(d, freq = 3.2, z = 0.42) {
  if (d <= 0) return 0;
  const w = TAU * freq, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * d) * (Math.cos(wd * d) + (z * w / wd) * Math.sin(wd * d));
}
const kick = (d, k = 9, f = 18) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(f * d);   // decaying jiggle
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const C = {
  slate0: '#0B0D11', slate1: '#14171D', ink: '#F4F4F6', dim: 'rgba(244,244,246,0.32)',
  amber: '#FFAB00', amberL: '#FFD36B', amberD: '#B36F00',
  emer: '#00E676', emerL: '#8BFFC3', emerD: '#00915A',
  steel: '#3A4150', steelL: '#5B6478', steelD: '#232833',
};
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';

// ───────── audio map (phrase timings from the speech) ─────────
const PHRASES = [
  [0.05, 1.90, "THAT VERSION OF MYSELF | IS A MEMORY", ['MEMORY'], 'a'],
  [2.00, 3.40, "I DON'T NEED IT | ANYMORE", ['ANYMORE'], 'a'],
  [3.70, 5.10, "I WANT | TO WIN", ['WIN'], 'a'],
  [5.35, 6.80, "NOW IS | THE TIME", ['TIME'], 'a'],
  [6.95, 8.30, "TO BE | REBORN", ['REBORN'], 'e'],
  [9.40, 12.30, "NO MATTER HOW MUCH | YOU KNOCK ON THE DOOR | TO SOMEONE'S HEART", ['KNOCK', 'HEART'], 'a'],
  [12.45, 14.60, "IN THE END | YOU CAN'T | CHANGE THEM", ["CAN'T"], 'a'],
  [15.40, 17.00, "WHICH IS WHY | YOU HAVE TO BE | THE ONE", ['ONE'], 'e'],
  [17.40, 19.40, "TO CHANGE | YOURSELF", ['CHANGE', 'YOURSELF'], 'e'],
  [19.50, 22.20, "WHEN THE WORLD | AROUND YOU ISN'T | FOLLOWING YOUR PLAN", ['PLAN'], 'a'],
  [22.40, 23.90, "THE ONLY WAY | TO FIX IT", ['FIX'], 'a'],
  [24.00, 25.60, "IS TO | FIX YOU", ['FIX', 'YOU'], 'e'],
  [25.90, 28.30, "IF I CAN'T SEE | THE LIGHT THAT LEADS | TO THE GOAL", ['LIGHT', 'GOAL'], 'a'],
  [28.45, 30.50, "THEN I NEED TO | BECOME | THE LIGHT", ['BECOME', 'LIGHT'], 'a'],
  [31.30, 33.30, "WATCH ME | I'LL DEVOUR IT", ['DEVOUR'], 'e'],
  [33.40, 35.20, "AND TURN IT | INTO LIGHT", ['LIGHT'], 'a'],
  [35.90, 37.40, "IF IT MEANS | WINNING", ['WINNING'], 'a'],
  [37.50, 40.40, "I DON'T MIND | DESTROYING | MY OWN SELF", ['DESTROYING'], 'e'],
  [41.30, 43.50, "I'LL BE | REBORN AGAIN", ['REBORN', 'AGAIN'], 'e'],
  [43.60, 45.70, "AS MANY TIMES | AS IT TAKES", ['TIMES', 'TAKES'], 'a'],
];
const DROPS = [0.05, 6.95, 17.40, 24.00, 28.45, 33.40, 37.50, 41.30];
const BEAT = 0.368, PHASE = 0.27;
const INTERRUPTS = Array.from({ length: 21 }, (_, k) => PHASE + 2.208 * k).filter(t => t > 1 && t < DUR - 0.5)
  .map((t, i) => [t, ['glow', 'dof', 'tilt', 'warp'][i % 4]]);

// word timings: syllable-weighted over the first 85% of each phrase
const syl = w => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g) || []).length);
const WORDS = [];
PHRASES.forEach(([t0, t1, text, acc, col], pi) => {
  const lines = text.split('|').map(s => s.trim().split(' '));
  const flat = lines.flat(), w = flat.map(syl), tot = w.reduce((a, b) => a + b, 0), span = (t1 - t0) * 0.85;
  let acc0 = 0, k = 0;
  lines.forEach((ln, li) => ln.forEach((word, wi) => {
    WORDS.push({ pi, li, wi, word, t: t0 + span * acc0 / tot, accent: acc.includes(word.replace(/[,.]/g, '')), col });
    acc0 += w[k++];
  }));
});

// ───────── camera: push during builds, snap + shake on drops, interrupt tilts ─────────
function camera(t) {
  let z = 1, sx = 0, sy = 0, rot = 0;
  const prev = DROPS.filter(d => t >= d).pop() ?? 0, next = DROPS.find(d => d > t) ?? DUR;
  z *= 1 + 0.055 * E.inOutSine(P(t, prev + 0.4, next));                   // slow push-in toward each drop
  const d = t - prev;
  z *= 1 + 0.09 * Math.exp(-d * 7) * (prev > 0.1 ? 1 : 0.4);              // snap
  const sk = Math.exp(-d * 13) * (prev > 0.1 ? 22 : 12);
  sx += sk * Math.sin(d * 97); sy += sk * Math.cos(d * 83);
  for (const [it, type] of INTERRUPTS) {
    const q = t - it;
    if (q >= 0 && q < 0.9 && type === 'tilt') rot += 0.022 * Math.sin(Math.PI * P(q, 0, 0.9)) * (Math.round(it) % 2 ? 1 : -1);
    if (q >= 0 && q < 0.5 && type === 'dof') z *= 1 + 0.018 * Math.sin(Math.PI * P(q, 0, 0.5));
  }
  return { z, sx, sy, rot };
}
function interrupt(t, type) {
  let v = 0;
  for (const [it, ty] of INTERRUPTS) if (ty === type) { const q = t - it; if (q >= 0 && q < 0.9) v = Math.max(v, Math.sin(Math.PI * P(q, 0, type === 'dof' ? 0.5 : 0.9))); }
  return v;
}
const sceneAccent = t => (PHRASES.filter(p => t >= p[0] - 0.2).pop() || PHRASES[0])[4] === 'e' ? C.emer : C.amber;

// ───────── background: slate, 3D wireframe floor, DOF particles ─────────
const SPR = (() => {   // soft sprites at increasing blur
  return [0, 1, 2, 3, 4, 5].map(i => {
    const c = document.createElement('canvas'), s = 64; c.width = c.height = s;
    const g = c.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const hard = 1 - i / 6;
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(clamp(0.25 + hard * 0.6, 0.05, 0.95), `rgba(255,255,255,${0.6 + hard * 0.4})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s); return c;
  });
})();
const DUST = (() => { const r = rng(7); return Array.from({ length: 110 }, () => ({ x: r() * 1600 - 260, y: r() * 2400 - 240, z: 0.15 + r() * 0.85, s: r(), v: 6 + r() * 20, tint: r() })); })();
function background(ctx, t, cam) {
  ctx.fillStyle = C.slate0; ctx.fillRect(0, 0, W, H);
  const acc = sceneAccent(t), glow = 0.16 + 0.12 * interrupt(t, 'glow');
  const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 1050);
  g.addColorStop(0, hexA(acc, glow)); g.addColorStop(0.45, hexA(C.slate1, 0.9)); g.addColorStop(1, 'rgba(11,13,17,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // wireframe floor
  const warp = interrupt(t, 'warp'), tilt = interrupt(t, 'tilt');
  const horizon = 1180, f = 700, camH = 260, yaw = 0.12 * tilt * Math.sin(t);
  ctx.save(); ctx.lineWidth = 1.4;
  const proj = (X, Z) => {
    const xr = X * Math.cos(yaw) - Z * Math.sin(yaw), zr = X * Math.sin(yaw) + Z * Math.cos(yaw);
    const Y = 18 * Math.sin(X * 0.012 + t * 1.1) * Math.sin(zr * 0.01 - t * 0.7) + warp * 70 * Math.sin(Math.hypot(X, zr - 900) * 0.02 - t * 9);
    const zz = Math.max(40, zr);
    return [CX + xr * f / zz, horizon + (camH - Y) * f / zz];
  };
  const scroll = (t * 140) % 120;
  for (let zi = 0; zi < 26; zi++) {
    const Z = 160 + zi * 120 - scroll, a = 0.22 * (1 - zi / 26);
    ctx.strokeStyle = hexA(acc === C.emer ? '#6FFFC0' : '#FFC966', a);
    ctx.beginPath();
    for (let X = -1800; X <= 1800; X += 90) { const [px, py] = proj(X, Z); X === -1800 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.stroke();
  }
  for (let X = -1800; X <= 1800; X += 180) {
    ctx.strokeStyle = hexA('#9AA3B8', 0.08);
    ctx.beginPath();
    for (let zi = 0; zi <= 26; zi++) { const [px, py] = proj(X, 160 + zi * 120 - scroll); zi ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
  }
  ctx.restore();
  // fade the floor into the horizon haze
  const hz = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 260);
  hz.addColorStop(0, 'rgba(11,13,17,1)'); hz.addColorStop(1, 'rgba(11,13,17,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, horizon - 40, W, 300);
  // DOF particle field (focus plane drifts; a DOF pulse defocuses everything)
  const focus = 0.55 + 0.2 * Math.sin(t * 0.3), dof = interrupt(t, 'dof');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of DUST) {
    const par = 1 - p.z;
    const x = ((p.x - cam.sx * par * 2 + Math.sin(t * 0.4 + p.s * 9) * 30) % 1600 + 1600) % 1600 - 260;
    const y = ((p.y - t * p.v * (1.4 - p.z)) % 2400 + 2400) % 2400 - 240;
    const blur = clamp(Math.abs(p.z - focus) * 7 + dof * 3, 0, 5), size = (2 + p.s * 3.5) * (1.7 - p.z) * (1 + blur * 0.8);
    const a = (0.06 + 0.16 * p.s) * (1 - blur / 7);
    ctx.globalAlpha = a;
    ctx.drawImage(tinted(Math.round(blur), p.tint < 0.25 ? acc : C.ink), x - size, y - size, size * 2, size * 2);
  }
  ctx.restore();
}
const TINT = {};
function tinted(i, col) {
  const k = i + col; if (TINT[k]) return TINT[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.drawImage(SPR[i], 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 64, 64);
  return (TINT[k] = c);
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function shade(ctx, x0, y0, x1, y1, c0, c1) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }

// ───────── shared pieces ─────────
function tag(ctx, text, x, y, d, col = C.amber, size = 30) {
  size = Math.max(size, 28);     // mono label that springs in (bad-grades nod)
  if (d < 0) return;
  const s = spring(d, 3.6, 0.45);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width + size * 1.3, h = size * 1.75;
  ctx.shadowColor = col; ctx.shadowBlur = 22;
  ctx.fillStyle = hexA(col, 0.14); ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
  ctx.restore();
}
function ring(ctx, t, r, col, a = 1, w = 6) {      // the focus ring: the anchor that never leaves
  if (r <= 0 || a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.5;
  const tick = t * 0.6;
  for (let i = 0; i < 4; i++) { const an = tick + i * Math.PI / 2; ctx.beginPath(); ctx.arc(CX, CY, r + 22, an, an + 0.5); ctx.stroke(); }
  ctx.restore();
}
function glowDisc(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// chunky faceless figure (front view), feet at y
function figure(ctx, x, y, s, { body = C.steelL, dark = C.steelD, rim = null, arms = 0, head = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const cs = ctx.createRadialGradient(0, 4, 0, 0, 4, 120); cs.addColorStop(0, 'rgba(0,0,0,0.55)'); cs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cs; ctx.save(); ctx.scale(1, 0.22); ctx.fillRect(-120, -100, 240, 240); ctx.restore();
  if (rim) { ctx.shadowColor = rim; ctx.shadowBlur = 40; }
  ctx.fillStyle = shade(ctx, -40, 0, 40, 0, body, dark);
  ctx.beginPath(); ctx.roundRect(-34, -140, 30, 140, 10); ctx.fill(); ctx.beginPath(); ctx.roundRect(4, -140, 30, 140, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-46, -300, 92, 170, 30); ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(sd * 50, -286); ctx.rotate(sd * (0.12 + arms * 2.6)); ctx.beginPath(); ctx.roundRect(-13, 0, 26, 130, 13); ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(0, -346 + head, 40, 44, 0, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-14, -362 + head, 13, 8, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

// ───────── scenes ─────────
// 0.0–3.6 · hook ring + memory polaroid that burns away
const EMB = (() => { const r = rng(11); return Array.from({ length: 220 }, () => ({ u: r(), v: r(), vx: (r() - 0.5) * 260, vy: -(120 + r() * 380), s: 2 + r() * 4, d: r() })); })();
function sceneMemory(ctx, t) {
  const open = E.outExpo(P(t, 0.0, 0.35));
  ring(ctx, t, 30 + open * 330, C.amber, 1 - P(t, 3.3, 3.6));
  if (t < 0.3) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CX, CY, 10 * (1 - open), 0, TAU); ctx.fill(); }
  const pop = spring(t - 0.25, 2.6, 0.5), burn = P(t, 2.0, 3.4);
  if (pop <= 0) return;
  const w = 380, h = 450, rot = -0.08 + 0.03 * Math.sin(t * 1.3);
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(rot); ctx.scale(pop, pop);
  // burn line rises from the bottom; everything above survives
  const edge = h / 2 - burn * (h + 60);
  ctx.save(); ctx.beginPath();
  ctx.moveTo(-w / 2 - 20, -h / 2 - 30);
  ctx.lineTo(w / 2 + 20, -h / 2 - 30);
  for (let x = w / 2 + 20; x >= -w / 2 - 20; x -= 10) ctx.lineTo(x, edge + 14 * Math.sin(x * 0.07 + t * 9) + 8 * Math.sin(x * 0.19 - t * 5));
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-w / 2 + 14, -h / 2 + 16, w, h);
  ctx.fillStyle = '#ECEAE4'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = shade(ctx, 0, -h / 2 + 24, 0, h / 2 - 90, '#2B3140', '#151922'); ctx.fillRect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 120);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 120); ctx.clip();
  figure(ctx, 0, h / 2 - 96, 0.62, { body: '#596276', dark: '#30364A', arms: -0.02, head: 12 });   // the old self, head down
  ctx.restore();
  ctx.fillStyle = '#7A7A80'; ctx.font = `500 22px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('OLD ME · 2024', 0, h / 2 - 44);
  ctx.restore();
  // glowing burn edge
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.shadowColor = C.amber; ctx.shadowBlur = 24;
  if (burn > 0 && burn < 1) { ctx.beginPath(); for (let x = -w / 2; x <= w / 2; x += 10) { const y = edge + 14 * Math.sin(x * 0.07 + t * 9) + 8 * Math.sin(x * 0.19 - t * 5); x === -w / 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  tag(ctx, 'MEMORY', CX + 150, CY - 270, t - 1.2, C.amber);
  // embers drift up from the burn line
  if (burn > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const e of EMB) {
      const q = clamp((burn - e.u * 0.9) * 2.2);
      if (q <= 0 || q >= 1) continue;
      const x = CX + (e.v - 0.5) * w + e.vx * q, y = CY + h / 2 - e.u * h + e.vy * q;
      ctx.fillStyle = hexA(q < 0.4 ? C.amberL : C.amber, 1 - q); ctx.beginPath(); ctx.arc(x, y, e.s * (1 - q * 0.6), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
// 3.6–5.3 · the win: a chunky trophy springs out of the ring
function trophy(ctx, x, y, s, col = C.amber) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = col; ctx.shadowBlur = 50;
  ctx.fillStyle = shade(ctx, -120, 0, 120, 0, C.amberL, C.amberD);
  ctx.beginPath(); ctx.moveTo(-130, -170); ctx.lineTo(130, -170); ctx.quadraticCurveTo(120, 20, 0, 50); ctx.quadraticCurveTo(-120, 20, -130, -170); ctx.fill();
  ctx.lineWidth = 26; ctx.strokeStyle = C.amberD; ctx.shadowBlur = 0;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 140, -100, 54, sd > 0 ? -1.4 : Math.PI - 1.7, sd > 0 ? 1.7 : Math.PI + 1.4); ctx.stroke(); }
  ctx.fillStyle = C.amberD; ctx.fillRect(-22, 40, 44, 90); ctx.fillStyle = shade(ctx, -110, 0, 110, 0, C.amberL, C.amberD); ctx.beginPath(); ctx.roundRect(-110, 120, 220, 54, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-60, -120, 18, 50, 0.2, 0, TAU); ctx.fill();
  ctx.restore();
}
function sceneWin(ctx, t) {
  const form = E.inOutCubic(P(t, 3.6, 3.95)), s = spring(t - 3.82, 2.8, 0.42);
  const flip = Math.cos(Math.PI / 2 * E.inCubic(P(t, 5.0, 5.3)));
  ring(ctx, t, 330 + 20 * Math.sin(t * 3), C.amber, 0.9);
  glowDisc(ctx, CX, CY, 500, C.amber, 0.22 * s);
  if (form < 1) {      // the embers of the old self fly together and become the goal
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const e of EMB) {
      const sx = CX + (e.v - 0.5) * 520 + e.vx * 0.6, sy = CY - 240 - e.u * 300 + e.vy * 0.2;
      const tx = CX + (e.v - 0.5) * 230 * (1 - e.u * 0.5), ty = CY - 120 + e.u * 260;
      ctx.fillStyle = hexA(C.amberL, 0.9 * (1 - form * 0.7)); ctx.beginPath(); ctx.arc(lerp(sx, tx, form), lerp(sy, ty, form), e.s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  if (s > 0) { ctx.save(); ctx.translate(CX, CY + 40); ctx.scale(flip, 1); trophy(ctx, 0, 0, s, C.amber); ctx.restore(); }
  tag(ctx, 'GOAL: WIN', CX, CY + 290, t - 4.1, C.amber);
}
// 5.3–9.4 · the clock-ring spins, shatters → REBORN: the new self rises in emerald
const SHARD = (() => { const r = rng(3); return Array.from({ length: 48 }, (_, i) => ({ a: i / 48 * TAU + r() * 0.1, sp: 400 + r() * 700, rot: (r() - 0.5) * 8, s: 10 + r() * 24 })); })();
function sceneReborn(ctx, t) {
  const ck = P(t, 5.3, 6.95), burst = t - 6.95;
  if (burst < 0) {
    ring(ctx, t, 330, C.amber, 1, 8);
    const spin = E.inCubic(ck) * 40 + t;
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, k = spring(t - 5.3 - i * 0.025, 3.5, 0.45); if (k <= 0) continue; ctx.lineWidth = i % 3 ? 4 : 8; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 290, CY + Math.sin(a) * 290); ctx.lineTo(CX + Math.cos(a) * (290 + 20 * k + (i % 3 ? 0 : 14 * k)), CY + Math.sin(a) * (290 + 20 * k + (i % 3 ? 0 : 14 * k))); ctx.stroke(); }
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(spin * 0.1 - 1.5) * 150, CY + Math.sin(spin * 0.1 - 1.5) * 150); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(spin - 1.5) * 250, CY + Math.sin(spin - 1.5) * 250); ctx.stroke();
    ctx.restore();
    tag(ctx, 'NOW', CX, CY - 410, t - 5.6, C.amber);
    return;
  }
  // shatter of the clock ring
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const sh of SHARD) {
    const k = E.outExpo(clamp(burst / 1.1)), x = CX + Math.cos(sh.a) * (330 + sh.sp * k), y = CY + Math.sin(sh.a) * (330 + sh.sp * k);
    ctx.save(); ctx.translate(x, y); ctx.rotate(sh.rot * k); ctx.globalAlpha = 1 - clamp(burst / 1.3);
    ctx.fillStyle = sh.a % 0.6 > 0.3 ? C.amber : C.emer; ctx.beginPath(); ctx.moveTo(0, -sh.s); ctx.lineTo(sh.s * 0.6, sh.s); ctx.lineTo(-sh.s * 0.6, sh.s * 0.4); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // shockwave + new ring in emerald
  const sw = E.outExpo(clamp(burst / 0.8));
  ctx.save(); ctx.strokeStyle = hexA(C.emerL, 1 - sw); ctx.lineWidth = 30 * (1 - sw); ctx.beginPath(); ctx.arc(CX, CY, 60 + sw * 900, 0, TAU); ctx.stroke(); ctx.restore();
  ring(ctx, t, lerp(0, 330, spring(burst - 0.15, 2.4, 0.5)), C.emer, 1 - E.inCubic(P(t, 8.6, 9.4)));
  glowDisc(ctx, CX, CY + 60, 520, C.emer, 0.35 * clamp(burst * 2));
  const rise = spring(burst - 0.1, 2.0, 0.5), push = E.inExpo(P(t, 8.5, 9.4));
  figure(ctx, CX, CY + 230 + (1 - rise) * 160 - push * 60, (0.95 + push * 2.4) * clamp(rise), { body: '#E9FFF3', dark: '#7FD9AE', rim: C.emer, arms: 0.05 + 0.05 * Math.sin(t * 2) });
  tag(ctx, 'NEW SELF · v2.0', CX, CY - 380, burst - 0.35, C.emer);
}
// 9.4–14.8 · the door you keep knocking on (stays locked)
const KNOCKS = [9.9, 10.3, 10.7, 11.25, 11.65, 12.05];
function door(ctx, t, x, y, open = 0, lit = 1) {
  const dw = 330, dh = 560;
  ctx.save(); ctx.translate(x, y);
  let shake = 0; for (const k of KNOCKS) shake += kick(t - k, 16, 60) * 6;
  ctx.translate(shake, 0);
  ctx.fillStyle = C.steelD; ctx.beginPath(); ctx.roundRect(-dw / 2 - 30, -dh / 2 - 30, dw + 60, dh + 30, 14); ctx.fill();
  // light leaking under the door (goes out when "you can't change them")
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDisc(ctx, 0, dh / 2 - 6, 260 * lit, C.amber, 0.45 * lit); ctx.restore();
  ctx.fillStyle = shade(ctx, -dw / 2, 0, dw / 2, 0, '#5A4636', '#2E2219'); ctx.beginPath(); ctx.roundRect(-dw / 2, -dh / 2, dw, dh, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 6;
  for (const [px, py, pw, ph] of [[-120, -230, 240, 190], [-120, 0, 240, 190]]) { ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke(); }
  // heart-shaped lock
  ctx.save(); ctx.translate(110, 40); ctx.scale(1.0, 1.0);
  ctx.shadowColor = C.amber; ctx.shadowBlur = 25 * lit;
  ctx.fillStyle = shade(ctx, -40, -40, 40, 40, C.amberL, C.amberD);
  ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-60, -10, -30, -55, 0, -25); ctx.bezierCurveTo(30, -55, 60, -10, 0, 30); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#1A120B'; ctx.beginPath(); ctx.arc(0, -10, 7, 0, TAU); ctx.fill(); ctx.fillRect(-3, -10, 6, 20);
  ctx.restore();
  ctx.restore();
}
function sceneDoor(ctx, t) {
  const inn = spring(t - 9.35, 2.6, 0.5), lit = 1 - E.inOutCubic(P(t, 12.6, 13.4));
  ring(ctx, t, lerp(0, 380, inn), C.amber, 0.5 * (1 - P(t, 14.3, 14.8)), 3);
  ctx.save(); ctx.translate(CX, CY); ctx.scale(inn, inn); ctx.translate(-CX, -CY);
  door(ctx, t, CX, CY, 0, lit);
  ctx.restore();
  // knock ripples
  for (const k of KNOCKS) {
    const q = P(t, k, k + 0.5);
    if (q > 0 && q < 1) { ctx.strokeStyle = hexA(C.ink, 0.6 * (1 - q)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CX - 60, CY - 40, 30 + q * 120, 0, TAU); ctx.stroke(); }
  }
  // the small figure knocking (in front, lower left of the focal zone)
  let arm = 0; for (const k of KNOCKS) arm = Math.max(arm, Math.sin(Math.PI * P(t, k - 0.12, k + 0.12)));
  const turn = E.inOutCubic(P(t, 13.6, 14.3));
  figure(ctx, CX - 210 - turn * 40, CY + 330, 0.62 * inn, { body: '#8E98AE', dark: '#4A5266', arms: 0.15 + 0.35 * arm * (1 - turn), head: turn * 10 });
  tag(ctx, '× ' + Math.min(KNOCKS.length, KNOCKS.filter(k => t >= k).length) + ' KNOCKS', CX - 230, CY - 360, t - 10.0, C.ink, 22);
  if (t > 12.6) tag(ctx, 'STILL LOCKED', CX + 120, CY - 360, t - 12.75, C.amber);
}
// 14.8–19.4 · the door frame becomes a mirror: the only person you can change
const PZ = (() => { const r = rng(21); return Array.from({ length: 24 }, (_, i) => ({ c: i % 6, rw: Math.floor(i / 6), a: r() * TAU, d: 500 + r() * 500, rot: (r() - 0.5) * 6, del: r() * 0.35 })); })();
function sceneMirror(ctx, t) {
  const m = E.inOutCubic(P(t, 14.7, 15.6));                       // door → mirror morph
  const mw = lerp(330, 380, m), mh = lerp(560, 620, m);
  ctx.save();
  const fl = Math.cos(Math.PI / 2 * E.inCubic(P(t, 19.1, 19.45)));   // card-flip out to the blueprint
  ctx.translate(CX, CY); ctx.scale(fl, 1); ctx.translate(-CX, -CY);
  ctx.fillStyle = C.steelD; ctx.beginPath(); ctx.roundRect(CX - mw / 2 - 28, CY - mh / 2 - 28, mw + 56, mh + 56, lerp(14, mw / 2, m) * 0.35 + 14); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(CX - mw / 2, CY - mh / 2, mw, mh, lerp(8, mw / 2, m) * 0.35 + 8); ctx.clip();
  ctx.fillStyle = shade(ctx, CX - mw / 2, CY - mh / 2, CX + mw / 2, CY + mh / 2, '#2D3442', '#0F1218'); ctx.fillRect(CX - mw / 2, CY - mh / 2, mw, mh);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(CX - mw / 2, CY - mh / 2 + 120); ctx.lineTo(CX - mw / 2 + 160, CY - mh / 2); ctx.lineTo(CX - mw / 2 + 230, CY - mh / 2); ctx.lineTo(CX - mw / 2, CY - mh / 2 + 200); ctx.fill();
  // the reflection — assembles from puzzle pieces on "change yourself" and glows emerald
  const asm = P(t, 17.4, 18.4), glow = E.outCubic(P(t, 17.9, 18.6));
  if (t > 15.2) {
    figure(ctx, CX, CY + mh / 2 - 30, 0.78, { body: glow > 0 ? '#E9FFF3' : '#7E889E', dark: glow > 0 ? '#5FC995' : '#3E4558', rim: glow > 0.3 ? C.emer : null, arms: glow * 0.25, head: (1 - glow) * 10 });
  }
  ctx.restore();
  ctx.restore();
  // flying puzzle pieces
  if (t > 17.2 && t < 19.0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of PZ) {
      const k = E.outCubic(clamp((asm - p.del) / 0.6)), gx = CX - 150 + p.c * 60, gy = CY - 200 + p.rw * 100;
      const x = lerp(CX + Math.cos(p.a) * p.d, gx, k), y = lerp(CY + Math.sin(p.a) * p.d, gy, k), a = 1 - P(t, 18.4, 19.0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * (1 - k)); ctx.globalAlpha = a;
      ctx.strokeStyle = C.emer; ctx.lineWidth = 3; ctx.fillStyle = hexA(C.emer, 0.18);
      ctx.beginPath(); ctx.rect(-26, -26, 52, 52); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(26, 0, 10, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  ring(ctx, t, lerp(0, 420, E.outExpo(P(t, 17.4, 17.9))), C.emer, 1 - P(t, 18.8, 19.4));
  if (t < 19.1) { tag(ctx, 'YOU', CX, CY - 380, t - 15.9, C.ink); if (glow > 0) tag(ctx, 'CHANGE ✓', CX, CY + 380, t - 18.0, C.emer); }
}
// 19.4–22.3 · your plan on a blueprint; the world rolls through it
function sceneBlueprint(ctx, t) {
  const inn = spring(t - 19.45, 2.6, 0.5), brk = E.outExpo(P(t, 21.1, 21.6));
  const bw = 600, bh = 520;
  ctx.save(); ctx.translate(CX, CY); ctx.scale(Math.max(0.001, inn), 1); ctx.rotate(-0.04 * clamp(inn));
  ctx.fillStyle = '#0E2A4A'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(150,200,255,0.18)'; ctx.lineWidth = 1.5;
  for (let x = -bw / 2; x <= bw / 2; x += 40) { ctx.beginPath(); ctx.moveTo(x, -bh / 2); ctx.lineTo(x, bh / 2); ctx.stroke(); }
  for (let y = -bh / 2; y <= bh / 2; y += 40) { ctx.beginPath(); ctx.moveTo(-bw / 2, y); ctx.lineTo(bw / 2, y); ctx.stroke(); }
  // the planned route A → B, drawn on; breaks when the world doesn't follow
  const pts = [[-230, 170], [-120, 170], [-120, 40], [40, 40], [40, -120], [220, -120], [220, -190]];
  const draw = E.inOutCubic(P(t, 19.6, 20.6));
  ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.setLineDash([22, 16]);
  for (let i = 0; i < pts.length - 1; i++) {
    const k = clamp(draw * (pts.length - 1) - i); if (k <= 0) break;
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], off = brk * (i % 2 ? 40 : -50), ro = brk * (i % 2 ? 0.4 : -0.5);
    ctx.save(); ctx.translate((x0 + x1) / 2 + off, (y0 + y1) / 2 + off * 0.6 + brk * 90); ctx.rotate(ro);
    ctx.strokeStyle = brk > 0 ? hexA(C.amber, 1 - brk * 0.4) : '#CFE6FF';
    ctx.beginPath(); ctx.moveTo((x0 - x1) / 2, (y0 - y1) / 2); ctx.lineTo(lerp((x0 - x1) / 2, (x1 - x0) / 2, k), lerp((y0 - y1) / 2, (y1 - y0) / 2, k)); ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#CFE6FF'; ctx.font = `800 34px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('A', -260, 182); ctx.fillText('B', 250, -200);
  ctx.restore();
  // the world rolling across the plan
  const toC = E.inOutCubic(P(t, 21.7, 22.35));
  const wx = lerp(lerp(CX + 560, CX - 30, E.inOutCubic(P(t, 20.5, 21.15))), CX, toC), wr = 120 * (1 + 0.5 * toC);
  if (t > 20.5) {
    ctx.save(); ctx.translate(wx, CY + 40 * (1 - toC)); ctx.rotate(-(wx - CX) / 120 + toC * 3);
    ctx.shadowColor = C.emer; ctx.shadowBlur = 30;
    ctx.fillStyle = shade(ctx, -wr, -wr, wr, wr, '#3D8BFF', '#123A8C'); ctx.beginPath(); ctx.arc(0, 0, wr, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#2FD089';
    for (const [x, y, r] of [[-40, -30, 46], [50, 40, 38], [20, -70, 24], [-60, 60, 22]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (t < 21.8) { tag(ctx, 'YOUR PLAN', CX - 170, CY - 340, t - 19.8, C.ink, 22); if (brk > 0) tag(ctx, 'PLAN ✕', CX + 160, CY + 330, t - 21.3, C.amber); }
}
// 22.3–25.8 · gears: fix it → fix YOU (gears lock into the figure's chest)
function gear(ctx, x, y, r, teeth, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const an = i / (teeth * 2) * TAU, rr = i % 2 ? r : r * 1.18; ctx.lineTo(Math.cos(an - 0.08) * rr, Math.sin(an - 0.08) * rr); ctx.lineTo(Math.cos(an + 0.08) * rr, Math.sin(an + 0.08) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.slate0; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fill();
  ctx.restore();
}
function sceneFix(ctx, t) {
  const chest = [CX, CY + 330 - 1.15 * 220], dive = E.inExpo(P(t, 25.4, 25.85));
  ctx.save(); ctx.translate(chest[0], chest[1]); ctx.scale(1 + dive * 9, 1 + dive * 9); ctx.translate(-chest[0], -chest[1]);
  const lock = E.inOutCubic(P(t, 23.7, 24.15)), spin = t * 2.2 + E.inCubic(P(t, 22.4, 23.7)) * 6;
  const gl = 1 - E.inCubic(P(t, 22.35, 22.7));             // the globe collapses into the gear hub
  if (gl > 0) { ctx.save(); ctx.translate(CX, CY); ctx.fillStyle = shade(ctx, -180, -180, 180, 180, '#3D8BFF', '#123A8C'); ctx.beginPath(); ctx.arc(0, 0, 180 * gl, 0, TAU); ctx.fill(); ctx.restore(); }
  const fig = spring(t - 23.85, 2.4, 0.55);
  if (fig > 0) figure(ctx, CX, CY + 330, 1.15 * fig, { body: t > 24 ? '#E9FFF3' : '#8E98AE', dark: t > 24 ? '#5FC995' : '#4A5266', rim: t > 24 ? C.emer : null });
  const G = [[-190, -130, 90, 10, C.steelL], [160, -190, 70, 8, C.steel], [180, 120, 110, 12, C.steelL], [-160, 170, 64, 8, C.steel]];
  G.forEach(([gx, gy, r, n, col], i) => {
    const out = spring(t - 22.42 - i * 0.05, 2.6, 0.5);
    const x = lerp(CX + gx * out, chest[0], lock), y = lerp(CY + gy * out, chest[1], lock), rr = lerp(r, i === 2 ? 60 : 0.01, lock);
    if (rr < 1 || out <= 0) return;
    gear(ctx, x, y, rr * clamp(out, 0, 1.2), n, spin * (i % 2 ? -1 : 1) * (100 / r), lock > 0.9 ? C.emer : col);
  });
  if (t > 24.0) { const k = kick(t - 24.0, 7, 20); glowDisc(ctx, chest[0], chest[1], 260 + 60 * k + dive * 400, C.emer, 0.5 + dive * 0.5); }
  ctx.restore();
  if (dive < 0.2) { tag(ctx, 'FIX IT?', CX, CY - 360, t - 22.6, C.ink, 22); if (t > 24.1) tag(ctx, 'FIX: YOU', CX, CY - 360, t - 24.1, C.emer); }
}
// 25.8–30.6 · a dark corridor with an invisible goal → he becomes the light
function sceneLight(ctx, t) {
  const inn = P(t, 25.8, 26.3), ign = t - 28.45, lit = E.outCubic(clamp(ign / 0.6));
  // corridor walls in perspective toward a goal frame at the vanishing point
  ctx.save(); ctx.globalAlpha = inn;
  const vx = CX, vy = CY - 40;
  for (let i = 0; i < 9; i++) {
    const k = i / 9, s = lerp(1.6, 0.12, Math.pow(k, 0.6)), w = 520 * s, h = 760 * s;
    ctx.strokeStyle = lit > 0 ? hexA(C.amber, (0.5 - k * 0.4) * lit + 0.08) : hexA('#9AA3B8', 0.14 * (1 - k));
    ctx.lineWidth = 3; ctx.strokeRect(vx - w / 2, vy - h / 2, w, h);
  }
  // goal net, barely visible until the light
  ctx.strokeStyle = hexA(C.ink, 0.12 + 0.7 * lit); ctx.lineWidth = 3;
  ctx.strokeRect(vx - 60, vy - 30, 120, 70);
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(vx - 60 + i * 20, vy - 30); ctx.lineTo(vx - 60 + i * 20, vy + 40); ctx.stroke(); }
  ctx.restore();
  if (t < 28.45) tag(ctx, 'GOAL: NOT VISIBLE', CX, CY - 390, t - 26.6, C.ink, 22);
  // figure with a slowly charging core; ignites on "become the light"
  const charge = P(t, 27.0, 28.45);
  if (lit > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, CY + 120);
    for (let i = 0; i < 18; i++) {           // god rays
      const a = i / 18 * TAU + t * 0.25, wd = 0.05 + 0.03 * Math.sin(i * 3.7);
      ctx.fillStyle = hexA(C.amber, 0.12 * lit); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1700, a - wd, a + wd); ctx.fill();
    }
    ctx.restore();
    glowDisc(ctx, CX, CY + 120, 760, C.amber, 0.45 * lit);
  }
  glowDisc(ctx, CX, CY + 120, 90 + charge * 120, C.amber, 0.25 + 0.4 * charge * (0.7 + 0.3 * Math.sin(t * 20)));
  figure(ctx, CX, CY + 360, 1.05, { body: lit > 0 ? '#FFF6E0' : '#4A5266', dark: lit > 0 ? C.amberL : '#262B38', rim: lit > 0 ? C.amber : null, arms: lit * 0.55 });
  const sw = E.outExpo(clamp(ign / 0.9));
  if (ign > 0 && ign < 0.9) { ctx.strokeStyle = hexA(C.amberL, 1 - sw); ctx.lineWidth = 40 * (1 - sw); ctx.beginPath(); ctx.arc(CX, CY + 120, 60 + sw * 1000, 0, TAU); ctx.stroke(); }
  if (ign > 0.2) tag(ctx, 'SOURCE: YOU', CX, CY - 390, ign - 0.25, C.amber);
}
// 30.6–35.4 · a vortex of darkness devoured, then released as light
const VX = (() => { const r = rng(41); return Array.from({ length: 420 }, () => ({ a: r() * TAU, r: 200 + r() * 760, s: 2 + r() * 5, sp: 0.6 + r() * 1.4 })); })();
function sceneDevour(ctx, t) {
  const suck = E.inCubic(P(t, 31.3, 33.4)), boom = t - 33.4;
  figure(ctx, CX, CY + 330, 1.0, { body: '#FFF6E0', dark: C.amberL, rim: C.amber, arms: boom > 0 ? 0.6 : 0.1 });
  if (boom < 0) {
    for (const p of VX) {
      const rr = p.r * (1 - suck * 0.95), a = p.a + t * p.sp * (1 + suck * 6);
      ctx.fillStyle = `rgba(4,5,8,${0.85})`; ctx.strokeStyle = hexA(C.emer, 0.25 + 0.5 * suck);
      ctx.beginPath(); ctx.arc(CX + Math.cos(a) * rr, CY + 100 + Math.sin(a) * rr * 0.55, p.s * (1.2 - suck * 0.6), 0, TAU); ctx.fill(); ctx.stroke();
    }
    glowDisc(ctx, CX, CY + 110, 160 + suck * 160, C.emer, 0.3 + 0.4 * suck);
    tag(ctx, 'DEVOURING · ' + Math.round(suck * 100) + '%', CX, CY - 390, t - 31.6, C.emer, 22);
  } else {
    const k = E.outExpo(clamp(boom / 0.8));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of VX.slice(0, 240)) { const rr = 40 + k * p.r * 1.2, a = p.a; ctx.fillStyle = hexA(p.sp > 1.2 ? C.amberL : C.amber, 1 - clamp(boom / 1.6)); ctx.beginPath(); ctx.arc(CX + Math.cos(a) * rr, CY + 110 + Math.sin(a) * rr, p.s * 1.2, 0, TAU); ctx.fill(); }
    ctx.restore();
    glowDisc(ctx, CX, CY + 110, 900, C.amber, 0.6 * (1 - clamp(boom / 2)) + 0.15);
    ring(ctx, t, lerp(60, 380, k), C.amber, 1);
    tag(ctx, '→ LIGHT', CX, CY - 390, boom - 0.2, C.amber);
  }
}
// 35.4–40.6 · winning, even if it means breaking the old self apart
const FR = (() => { const r = rng(55); return Array.from({ length: 70 }, () => ({ x: (r() - 0.5) * 120, y: -r() * 400, a: r() * TAU, sp: 200 + r() * 520, rot: (r() - 0.5) * 7, s: 10 + r() * 26 })); })();
function sceneDestroy(ctx, t) {
  const crown = spring(t - 36.0, 2.6, 0.5), br = t - 37.5;
  trophy(ctx, CX, CY - 120, 0.55 * crown * (1 - E.inCubic(P(t, 37.3, 37.6))), C.amber);
  if (br < 0) {
    figure(ctx, CX, CY + 360, 1.0, { body: '#E9FFF3', dark: '#5FC995', rim: C.emer, arms: 0.1 });
    tag(ctx, 'COST: ANY', CX, CY - 390, t - 36.3, C.ink, 22);
    return;
  }
  const k = E.outCubic(clamp(br / 2.2));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of FR) {
    const x = CX + f.x + Math.cos(f.a) * f.sp * k, y = CY + 360 + f.y + Math.sin(f.a) * f.sp * k * 0.8 - 80 * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot * k);
    ctx.fillStyle = hexA('#E9FFF3', 0.9 - k * 0.5); ctx.strokeStyle = C.emer; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -f.s); ctx.lineTo(f.s * 0.8, f.s * 0.6); ctx.lineTo(-f.s * 0.7, f.s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  glowDisc(ctx, CX, CY + 160, 560, C.emer, 0.35 * (1 - k * 0.6));
  tag(ctx, 'OLD SELF: DELETED', CX, CY - 390, br - 0.3, C.emer, 22);
}
// 40.6–45.7 · reborn again, as many times as it takes (loops back to the hook dot)
function sceneAgain(ctx, t) {
  const cycles = [[41.3, 1.6], [43.6, 0.7], [44.3, 0.6], [44.9, 0.55]];    // reassemble (and re-shatter faster)
  let cur = cycles[0], n = 0;
  cycles.forEach((c, i) => { if (t >= c[0]) { cur = c; n = i + 1; } });
  const [c0, len] = cur, q = P(t, c0, c0 + len);
  // fragments fly back in, the figure re-forms, flashes, (re-)shatters on the next cycle
  const k = 1 - E.inOutCubic(q);                // 1 = scattered, 0 = whole
  if (q < 1 || n === cycles.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of FR) {
      if (k < 0.02) break;
      const x = CX + f.x + Math.cos(f.a) * f.sp * k, y = CY + 360 + f.y + Math.sin(f.a) * f.sp * k * 0.8 - 80 * k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot * k); ctx.globalAlpha = clamp(k * 1.6); ctx.fillStyle = hexA('#E9FFF3', 0.7); ctx.strokeStyle = C.emer; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -f.s); ctx.lineTo(f.s * 0.8, f.s * 0.6); ctx.lineTo(-f.s * 0.7, f.s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  const whole = 1 - k;
  if (whole > 0.6) figure(ctx, CX, CY + 360, 1.0, { body: '#E9FFF3', dark: '#5FC995', rim: C.emer, arms: 0.15 * whole });
  // rebirth counter ring
  ring(ctx, t, 380, n % 2 ? C.emer : C.amber, 0.8, 5);
  const label = n >= 4 ? 'REBIRTH × ∞' : 'REBIRTH × ' + Math.max(1, n);
  tag(ctx, label, CX, CY - 390, t - c0, n >= 4 ? C.amber : C.emer, 26);
  const fl = P(t, c0 + len - 0.08, c0 + len + 0.12);
  if (fl > 0 && fl < 1) glowDisc(ctx, CX, CY + 160, 700, C.emer, 0.6 * Math.sin(Math.PI * fl));
  // final 0.5s: everything collapses to the centre dot (seamless loop to the hook)
  const end = E.inCubic(P(t, 45.25, 45.7));
  if (end > 0) { ctx.fillStyle = `rgba(11,13,17,${end})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CX, CY, 10 + (1 - end) * 40, 0, TAU); ctx.fill(); }
}

// ───────── kinetic typography engine ─────────
function phraseAt(t) {
  let pi = -1; PHRASES.forEach((p, i) => { if (t >= p[0] - 0.02) pi = i; });
  return pi;
}
const WCACHE = {};
function wordArt(word, size, fill, depthCol) {
  const key = word + size + fill; if (WCACHE[key]) return WCACHE[key];
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `900 ${size}px ${DISP}`;
  const w = Math.ceil(g.measureText(word).width + size * 0.5), h = Math.ceil(size * 1.5);
  c.width = w; c.height = h; g.font = `900 ${size}px ${DISP}`; g.textBaseline = 'middle'; g.textAlign = 'center';
  for (let i = 7; i > 0; i--) { g.fillStyle = depthCol; g.globalAlpha = 0.9 - i * 0.07; g.fillText(word, w / 2 + i * 0.7, h / 2 + i * 1.3); }   // extrusion
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.8); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, fill); gr.addColorStop(1, fill);
  g.fillStyle = gr; g.fillText(word, w / 2, h / 2);
  return (WCACHE[key] = { c, w, h });
}
const SWC = document.createElement('canvas'); SWC.width = 1200; SWC.height = 320; const swc = SWC.getContext('2d');
function sweep(ctx, art, x, y, s, p) {   // specular light band sliding across the word
  swc.setTransform(1, 0, 0, 1, 0, 0); swc.globalCompositeOperation = 'source-over'; swc.clearRect(0, 0, SWC.width, SWC.height);
  swc.drawImage(art.c, 0, 0);
  swc.globalCompositeOperation = 'source-atop';
  const bx = lerp(-art.w * 0.4, art.w * 1.4, p);
  const g = swc.createLinearGradient(bx - 90, 0, bx + 90, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  swc.fillStyle = g; swc.setTransform(1, 0, -0.35, 1, 0, 0); swc.fillRect(bx - 200, 0, 400 + art.h, art.h);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(SWC, 0, 0, art.w, art.h, x - art.w * s / 2, y - art.h * s / 2, art.w * s, art.h * s); ctx.restore();
}
function typography(ctx, t) {
  const pi = phraseAt(t); if (pi < 0) return;
  const [t0, t1] = PHRASES[pi], next = PHRASES[pi + 1] ? PHRASES[pi + 1][0] : DUR;
  const out = E.inCubic(P(t, Math.min(t1 + 0.35, next - 0.12), next - 0.02));
  const ws = WORDS.filter(w => w.pi === pi), nLines = Math.max(...ws.map(w => w.li)) + 1;
  const big = ws.length <= 4, size = big ? 132 : ws.length <= 6 ? 112 : 92, lh = size * 1.08;
  const spoken = ws.filter(w => t >= w.t), active = spoken[spoken.length - 1];
  for (let li = 0; li < nLines; li++) {
    const lw = ws.filter(w => w.li === li);
    const sizes = lw.map(w => Math.round(w.accent ? size * 1.14 : size));
    ctx.font = `900 ${size}px ${DISP}`;
    const widths = lw.map((w, i) => { ctx.font = `900 ${sizes[i]}px ${DISP}`; return ctx.measureText(w.word).width; });
    const gap = size * 0.26, total = widths.reduce((a, b) => a + b, 0) + gap * (lw.length - 1);
    const sc = total > 960 ? 960 / total : 1;
    let x = CX - total * sc / 2;
    const y = TY + (li - (nLines - 1) / 2) * lh - out * 40;
    lw.forEach((w, i) => {
      const d = t - w.t, cx = x + widths[i] * sc / 2;
      x += (widths[i] + gap) * sc;
      if (d < 0) return;
      const isActive = active === w, col = w.col === 'e' ? C.emer : C.amber;
      const fill = w.accent ? col : isActive ? C.ink : '#8E93A0';
      const art = wordArt(w.word, sizes[i], fill, w.accent ? (w.col === 'e' ? '#00552F' : '#5C3800') : '#15171C');
      const s = spring(d, 3.4, 0.4), rise = spring(d, 4.2, 0.62);
      const pop = sc * lerp(0.82, 1, s) * (isActive ? 1 + 0.05 * Math.exp(-d * 5) : 1);
      // mask reveal: the word rises out of its own line
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - art.w * pop, y - sizes[i] * 0.78 * pop, art.w * pop * 2, sizes[i] * 1.6 * pop); ctx.clip();
      ctx.globalAlpha = (1 - out) * (isActive || w.accent ? 1 : 0.5);
      if (isActive || (w.accent && d < 1.5)) { ctx.shadowColor = w.accent ? hexA(col, 0.75) : 'rgba(244,244,246,0.45)'; ctx.shadowBlur = w.accent ? 26 : 14; }
      const yy = y + (1 - rise) * sizes[i] * 0.95;
      ctx.drawImage(art.c, cx - art.w * pop / 2, yy - art.h * pop / 2, art.w * pop, art.h * pop);
      ctx.restore();
      if (w.accent && d > 0.12 && d < 0.75) sweep(ctx, art, cx, yy, pop, P(d, 0.12, 0.75));
      if (w.accent && d < 0.55) {     // echo pulse
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 1; k <= 2; k++) {
          const e = d * (1.2 + k * 0.5), a = (0.55 - d) * 0.28 / k;
          ctx.globalAlpha = Math.max(0, a); const es = pop * (1 + e * 0.6);
          ctx.drawImage(art.c, cx - art.w * es / 2, yy - art.h * es / 2, art.w * es, art.h * es);
        }
        ctx.restore();
      }
    });
  }
}

// ───────── composition ─────────
const SCENES = [[0, 3.6, sceneMemory], [3.6, 5.3, sceneWin], [5.3, 9.4, sceneReborn], [9.4, 14.75, sceneDoor], [14.75, 19.45, sceneMirror],
  [19.45, 22.35, sceneBlueprint], [22.35, 25.85, sceneFix], [25.85, 30.7, sceneLight], [30.7, 35.5, sceneDevour], [35.5, 40.7, sceneDestroy], [40.7, 45.71, sceneAgain]];
const OL = document.createElement('canvas'); OL.width = W; OL.height = H; const ol = OL.getContext('2d');
const RL = document.createElement('canvas'); RL.width = W; RL.height = H; const rl = RL.getContext('2d');
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
  const cam = camera(t);
  background(ctx, t, cam);
  ol.setTransform(1, 0, 0, 1, 0, 0); ol.globalAlpha = 1; ol.globalCompositeOperation = 'source-over'; ol.shadowBlur = 0; ol.clearRect(0, 0, W, H);
  ol.save();
  ol.translate(CX + cam.sx, CY + cam.sy); ol.rotate(cam.rot); ol.scale(cam.z, cam.z); ol.translate(-CX, -CY);
  const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
  const ent = sc[0] > 0 ? E.outExpo(P(t, sc[0], sc[0] + 0.22)) : 1;
  ol.translate(CX, CY); ol.scale(lerp(0.94, 1, ent), lerp(0.94, 1, ent)); ol.translate(-CX, -CY);
  ol.globalAlpha = lerp(0.35, 1, ent);
  sc[2](ol, t);
  ol.restore();
  // glossy floor: reflect the object layer below the floor line, fading with distance
  const floor = CY + 385 * cam.z + cam.sy;
  rl.setTransform(1, 0, 0, 1, 0, 0); rl.globalCompositeOperation = 'source-over'; rl.clearRect(0, 0, W, H);
  rl.save(); rl.translate(0, floor * 2); rl.scale(1, -1); rl.drawImage(OL, 0, 0); rl.restore();
  rl.globalCompositeOperation = 'destination-in';
  const fg = rl.createLinearGradient(0, floor, 0, floor + 360); fg.addColorStop(0, 'rgba(0,0,0,0.26)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  rl.fillStyle = fg; rl.fillRect(0, 0, W, H);
  rl.globalCompositeOperation = 'destination-out'; rl.fillStyle = '#000'; rl.fillRect(0, 0, W, floor);
  ctx.drawImage(RL, 0, 0);
  ctx.drawImage(OL, 0, 0);
  ctx.save(); ctx.translate(cam.sx * 0.5, cam.sy * 0.5); typography(ctx, t); ctx.restore();
}

// ───────── post: bloom, zoom-through blur, chromatic aberration, lens warp, grade, grain (WebGL) ─────────
const GLC = document.getElementById('c'); GLC.width = W; GLC.height = H;
const gl = GLC.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
const ACC = document.createElement('canvas'); ACC.width = W; ACC.height = H; const acc = ACC.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H; const sctx = scratch.getContext('2d');
const B1 = document.createElement('canvas'); B1.width = 270; B1.height = 480; const b1 = B1.getContext('2d');
const B2 = document.createElement('canvas'); B2.width = 90; B2.height = 160; const b2 = B2.getContext('2d');
const FS = `precision highp float;
uniform sampler2D uImg, uB1, uB2; uniform vec2 uRes, uC; uniform float uRad, uCA, uDist, uFlash, uSeed; uniform vec3 uFlashCol;
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 d = uv - uC; vec2 da = d * vec2(1.0, 1.78);
  vec2 duv = uC + d * (1.0 + uDist * dot(da, da));
  vec3 col;
  vec2 off = (duv - uC) * (uCA * 0.018 + 0.0015);
  if (uRad > 0.002) {
    vec3 acc = vec3(0.0); float tot = 0.0;
    for (int i = 0; i < 14; i++) { float k = float(i) / 13.0, w = 1.0 - k * 0.6; vec2 p = uC + (duv - uC) * (1.0 - uRad * k * 0.16);
      acc += vec3(texture2D(uImg, p + off).r, texture2D(uImg, p).g, texture2D(uImg, p - off).b) * w; tot += w; }
    col = acc / tot;
  } else col = vec3(texture2D(uImg, duv + off).r, texture2D(uImg, duv).g, texture2D(uImg, duv - off).b);
  vec3 b = texture2D(uB1, duv).rgb * 0.6 + texture2D(uB2, duv).rgb * 0.8;
  col += b * b * 0.42 + b * 0.10;
  col += uFlashCol * uFlash;
  col = max(col - 0.012, 0.0) * 1.03;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);                // filmic (ACES) curve
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(0.9, 1.0, 1.08), (1.0 - l) * 0.4);                          // cool shadows
  col = mix(col, col * vec3(1.06, 1.0, 0.93), l * 0.3);                                  // warm highlights
  vec2 vd = (uv - vec2(0.5, 0.44)) * vec2(1.0, 1.15); col *= 1.0 - smoothstep(0.32, 0.95, length(vd)) * 0.7;
  float n = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.05;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
function mk(type, src) { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; }
const prog = gl.createProgram();
gl.attachShader(prog, mk(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const al = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
const TEX = [0, 1, 2].map(i => { const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return tx; });
gl.uniform1i(U('uImg'), 0); gl.uniform1i(U('uB1'), 1); gl.uniform1i(U('uB2'), 2);
gl.uniform2f(U('uRes'), W, H); gl.uniform2f(U('uC'), CX / W, CY / H);
const SCENE_STARTS = SCENES.map(s => s[0]).filter(x => x > 0);
function fx(t) {
  let rad = 0, ca = 0.06, dist = 0, flash = 0, fc = [1, 0.85, 0.6];
  for (const s0 of SCENE_STARTS) {   // zoom-through on every scene change
    const pre = P(t, s0 - 0.14, s0), post = Math.exp(-Math.max(0, t - s0) * 9);
    if (t > s0 - 0.14 && t < s0 + 0.5) rad = Math.max(rad, t < s0 ? E.inCubic(pre) : post);
  }
  for (const d0 of DROPS) {
    const q = t - d0; if (q < 0 || q > 1) continue;
    const k = Math.exp(-q * 6);
    ca = Math.max(ca, 1.2 * k); dist = Math.max(dist, 0.22 * Math.exp(-q * 8)); rad = Math.max(rad, 0.9 * Math.exp(-q * 9));
    const fl = 0.2 * Math.exp(-q * 16); if (fl > flash) { flash = fl; fc = sceneAccent(t + 0.01) === C.emer ? [0.4, 1, 0.7] : [1, 0.75, 0.3]; }
  }
  for (const s0 of SCENE_STARTS) { const q = t - s0; if (q >= 0 && q < 0.3) { const fl = 0.12 * Math.sin(Math.PI * q / 0.3); if (fl > flash) { flash = fl; fc = [1, 0.8, 0.55]; } } }   // light leak
  return { rad, ca, dist, flash, fc };
}
function post(t, frame) {
  b1.filter = 'brightness(0.78) contrast(3.4) blur(6px)'; b1.clearRect(0, 0, 270, 480); b1.drawImage(ACC, 0, 0, 270, 480);
  b2.filter = 'blur(5px)'; b2.clearRect(0, 0, 90, 160); b2.drawImage(B1, 0, 0, 90, 160);
  [ACC, B1, B2].forEach((src, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, TEX[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); });
  const f = fx(t);
  gl.uniform1f(U('uRad'), f.rad); gl.uniform1f(U('uCA'), f.ca); gl.uniform1f(U('uDist'), f.dist); gl.uniform1f(U('uFlash'), f.flash);
  gl.uniform3f(U('uFlashCol'), ...f.fc); gl.uniform1f(U('uSeed'), (frame * 7.13) % 1000);
  gl.viewport(0, 0, W, H); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
window.drawFrame = function (frame, S = 2) {
  const t = frame / FPS;
  for (let i = 0; i < S; i++) {
    const ts = clamp(t + ((i + 0.5) / S - 0.5) * 0.5 / FPS, 0, DUR - 1e-4);
    renderScene(sctx, ts);
    acc.globalAlpha = 1 / (i + 1); acc.drawImage(scratch, 0, 0);
  }
  acc.globalAlpha = 1;
  post(t, frame);
};
window.renderFrame = f => { window.drawFrame(f); return GLC.toDataURL('image/jpeg', 0.93); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 24px ${MONO}`)]);
