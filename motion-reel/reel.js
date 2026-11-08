// MOTION REEL — a 15s procedural motion-graphics piece.
// Everything is a pure function of time t (seconds), so any frame can be
// rendered deterministically. 1920x1080, rendered at 60fps with 4-sample
// 180° shutter motion blur.

const W = 1920, H = 1080, FPS = 60, DUR = 15;
const C = {
  bg: '#0A0A0F', paper: '#F4F1EA', coral: '#FF4A1C', lime: '#C8FF2E',
  cobalt: '#2E4BFF', violet: '#8A5CFF', ink: '#0A0A0F',
};
const DISPLAY = '"Inter Display"', MONO = '"JetBrains Mono"';

// ───────────────────────── math & easing ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: x => x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outQuint: x => 1 - Math.pow(1 - x, 5),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inBack: x => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
  outElastic: x => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * TAU / 3) + 1,
  outBounce: x => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375;
    return n1 * (x -= 2.625 / d1) * x + .984375;
  },
};
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

// ───────────────────────── drawing helpers ─────────────────────────
function bg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(-W, -H, W * 3, H * 3); }
function font(ctx, w, size, fam = DISPLAY) { ctx.font = `${w} ${size}px ${fam}`; }

// Text line revealed from behind a mask (classic kinetic-type slide-up).
function revealLine(ctx, s, x, y, size, p, color, align = 'left', weight = 900, dir = 1) {
  font(ctx, weight, size);
  const w = ctx.measureText(s).width;
  const x0 = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 40, y - size * 0.86, w + 80, size * 1.02);
  ctx.clip();
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y + (1 - p) * size * 1.02 * dir);
  ctx.restore();
}

// Per-letter layout (kerning aware via prefix measurement).
function layout(ctx, str, x, size, weight, fam = DISPLAY, ls = 0, align = 'center') {
  font(ctx, weight, size, fam);
  const total = ctx.measureText(str).width + ls * (str.length - 1);
  const x0 = align === 'center' ? x - total / 2 : x;
  const out = [];
  for (let i = 0; i < str.length; i++) {
    out.push({ ch: str[i], x: x0 + ctx.measureText(str.slice(0, i)).width + i * ls, w: ctx.measureText(str[i]).width });
  }
  return { out, total, x0 };
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+*';
function scramble(str, p, seed) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < str.length; i++) {
    const g = GLYPHS[Math.floor(r() * GLYPHS.length)];
    s += (str[i] === ' ' || i / str.length < p) ? str[i] : g;
  }
  return s;
}
const typed = (str, p) => str.slice(0, Math.floor(str.length * clamp(p) + 1e-6));
// Typewriter text that stays anchored while it types (centre computed from the full string).
function typeCentered(ctx, str, p, x, y, cursor = false) {
  const full = ctx.measureText(str).width;
  const s = typed(str, p);
  if (!s.length) return;
  ctx.save(); ctx.textAlign = 'left';
  ctx.fillText(s + (cursor && p < 1 ? '_' : ''), x - full / 2, y);
  ctx.restore();
}

// ───────────────────────── camera ─────────────────────────
const IMPACTS = [[2.0, 14], [4.0, 12], [6.5, 12], [9.0, 16], [11.5, 12], [11.75, 9], [12.0, 9], [12.25, 9], [12.5, 10], [13.5, 24]];
function cam(t) {
  let x = 0, y = 0, s = 1;
  for (const [t0, a] of IMPACTS) {
    const d = t - t0;
    if (d >= 0 && d < 0.6) {
      const k = Math.exp(-d * 11);
      x += a * k * Math.sin(d * 95 + t0 * 7);
      y += a * k * Math.cos(d * 83 + t0 * 3);
      s += 0.03 * (a / 14) * Math.exp(-d * 9);
    }
  }
  return { x, y, s };
}

// ───────────────────────── SCENE A · the point (0–2s) ─────────────────────────
function sceneA(ctx, t) {
  bg(ctx, C.bg);
  const cx = W / 2, cy = H / 2;

  // dot-grid field revealed radially from the centre
  const rev = E.outExpo(P(t, 0.15, 1.3)) * 1250;
  const fade = 1 - P(t, 1.3, 1.7);
  if (rev > 0 && fade > 0) {
    for (let x = 30; x < W; x += 60) for (let y = 30; y < H; y += 60) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > rev) continue;
      const edge = clamp((rev - d) / 160);
      ctx.fillStyle = hexA(C.paper, 0.16 * edge * fade);
      const s = 2 + 2 * (1 - edge);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  // ripples on every beat
  for (const t0 of [0.05, 0.5, 1.0]) {
    const p = P(t, t0, t0 + 1.0);
    if (p > 0 && p < 1) {
      ctx.strokeStyle = hexA(C.paper, 0.55 * (1 - p));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, lerp(18, 380, E.outExpo(p)), 0, TAU); ctx.stroke();
    }
  }

  // coordinate readout
  const lp = P(t, 0.3, 0.7), lo = 1 - P(t, 0.9, 1.05);
  if (lp > 0 && lo > 0) {
    ctx.globalAlpha = lo;
    font(ctx, 500, 20, MONO); ctx.textAlign = 'center'; ctx.fillStyle = hexA(C.paper, 0.7);
    typeCentered(ctx, 'x:960  y:540  r:16', lp, cx, cy + 74);
    ctx.globalAlpha = 1;
  }

  // the dot → anticipation squash → stretch to a line
  const appear = E.outBack(P(t, 0.05, 0.4));
  const squash = Math.sin(Math.PI * P(t, 0.72, 1.0));
  const s = E.inOutExpo(P(t, 1.0, 1.45));
  let w = lerp(32, W * 1.3, s) * appear, h = lerp(32, 6, s) * appear;
  w *= 1 + 0.28 * squash; h *= 1 - 0.32 * squash;
  if (t < 1.8 && w > 0) {
    // center bar thickens as the line becomes a band
    const thick = E.inOutExpo(P(t, 1.45, 1.8));
    h = lerp(h, H / 9 + 2, thick);
    ctx.fillStyle = C.coral;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(h / 2, w / 2) * (1 - thick)); ctx.fill();
  }
  // bars sweep in alternately to fill the frame
  const n = 9, bh = H / n;
  for (let i = 0; i < n; i++) {
    if (i === 4 && t < 1.8) continue;
    const d = Math.abs(i - 4) / 4;
    const p = E.inOutExpo(P(t, 1.48 + d * 0.16, 1.48 + d * 0.16 + 0.34));
    if (p <= 0) continue;
    const dir = i % 2 ? 1 : -1;
    ctx.fillStyle = C.coral;
    ctx.fillRect((1 - p) * W * 1.05 * dir, i * bh - 1, W, bh + 2);
  }
}

// ───────────────────────── SCENE B · kinetic type (2–4s) ─────────────────────────
const B_LINES = [['EVERY', 2.0, C.ink], ['FRAME', 2.25, C.ink], ['IS A', 2.5, C.ink], ['CHOICE.', 2.75, C.paper]];
const B_NOTES = ['→ timing', '→ spacing', '→ weight', '→ feel'];
function sceneBContent(ctx, t) {
  bg(ctx, C.coral);
  // radiating rings
  for (let k = 0; k < 7; k++) {
    const p = (((t - 2.0) * 0.55 + k / 7) % 1 + 1) % 1;
    ctx.strokeStyle = hexA(C.ink, 0.13 * (1 - p) * E.outCubic(P(t, 2.0, 2.4)));
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(1520, 540, p * 1000, 0, TAU); ctx.stroke();
  }
  ctx.save();
  const z = lerp(1.07, 1, E.outExpo(P(t, 2.0, 2.7)));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const base = [336, 521, 706, 891];
  B_LINES.forEach(([s, t0, col], i) => {
    const p = E.outExpo(P(t, t0, t0 + 0.45));
    revealLine(ctx, s, 130, base[i], 200, p, col, 'left', 900);
    // index & annotation
    const q = P(t, t0 + 0.1, t0 + 0.4);
    if (q > 0) {
      font(ctx, 500, 22, MONO); ctx.textAlign = 'left'; ctx.fillStyle = hexA(C.ink, 0.85);
      ctx.fillText(typed(B_NOTES[i], q), 1290, base[i] - 60);
      ctx.fillStyle = hexA(C.ink, 0.5);
      ctx.fillText('0' + (i + 1), 1290, base[i] - 96);
      ctx.fillStyle = hexA(C.ink, 0.35);
      ctx.fillRect(1290, base[i] - 46, 380 * E.outExpo(q), 2);
    }
  });
  ctx.restore();
}
function sceneB(ctx, t) {
  if (t < 3.55) return sceneBContent(ctx, t);
  bg(ctx, C.bg);
  const n = 10, sh = H / n;
  for (let i = 0; i < n; i++) {
    const t0 = 3.55 + ((i * 7) % n) * 0.018;
    const q = E.inExpo(P(t, t0, t0 + 0.26));
    const dx = (i % 2 ? 1 : -1) * q * W * 1.15;
    ctx.save();
    ctx.beginPath(); ctx.rect(-W, i * sh, W * 3, sh + 1); ctx.clip();
    ctx.translate(dx, 0);
    sceneBContent(ctx, t);
    ctx.restore();
  }
}

// ───────────────────────── SCENE C · rhythm grid (4–6.5s) ─────────────────────────
function sceneC(ctx, t) {
  bg(ctx, C.bg);
  const lt = t - 4;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(lerp(-0.05, 0.05, E.inOutCubic(P(t, 4, 6.5))));
  const z = lerp(1.0, 1.16, E.inOutCubic(P(t, 4, 6.3)));
  ctx.scale(z, z);
  const cell = 120, cols = 19, rows = 11;
  const maxd = Math.hypot(8 * cell, 4.5 * cell);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = (c - (cols - 1) / 2) * cell, y = (r - (rows - 1) / 2) * cell;
    const d = Math.hypot(x, y) / maxd;
    const sin = E.outBack(P(t, 4.0 + d * 0.42, 4.0 + d * 0.42 + 0.35));
    const so = Math.max(0, 1 - E.inBack(P(t, 6.0 + (1 - Math.min(d, 1)) * 0.2, 6.0 + (1 - Math.min(d, 1)) * 0.2 + 0.22)));
    const k = sin * so;
    if (k <= 0.001) continue;
    let v = 0.5 + 0.5 * Math.sin(d * 9.5 - lt * 6.2);
    v = E.inOutCubic(v);
    const size = cell * lerp(0.14, 0.7, v) * k;
    const rad = lerp(size / 2, size * 0.06, v);
    const rot = (1 - v) * Math.PI / 2 + lt * 0.4;
    ctx.fillStyle = v > 0.86 ? C.lime : hexA(C.paper, lerp(0.22, 1, v));
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, Math.max(0, rad)); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // "RHYTHM" — difference-blended over the grid
  const L = layout(ctx, 'RHYTHM', W / 2, 300, 900);
  const out = P(t, 5.95, 6.25);
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = C.paper; ctx.textAlign = 'left';
  L.out.forEach((g, i) => {
    const p = E.outExpo(P(t, 4.45 + i * 0.05, 4.45 + i * 0.05 + 0.5));
    if (p <= 0) return;
    const s = lerp(1.6, 1, p) * (1 - E.inBack(out) * 0.6);
    const a = p * (1 - out);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(g.x + g.w / 2, 540);
    ctx.scale(s, s);
    ctx.fillText(g.ch, -g.w / 2, 108);
    ctx.restore();
  });
  ctx.restore();

  // label
  const lp = P(t, 4.5, 4.9);
  font(ctx, 500, 20, MONO); ctx.textAlign = 'center'; ctx.fillStyle = hexA(C.paper, 0.6 * (1 - out));
  typeCentered(ctx, 'stagger: 42ms  ·  offset: radial  ·  loop: ∞', lp, W / 2, 760);

  // cobalt iris into the next scene
  const ir = E.inExpo(P(t, 6.16, 6.5)) * 1150;
  if (ir > 0) {
    ctx.fillStyle = C.cobalt;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, ir, 0, TAU); ctx.fill();
  }
}

// ───────────────────────── SCENE D · easing lab (6.5–9s) ─────────────────────────
const TRACKS = [
  ['linear', E.lin, C.paper],
  ['ease-in-out-cubic', E.inOutCubic, C.lime],
  ['ease-out-back', E.outBack, C.coral],
  ['ease-out-elastic', E.outElastic, C.ink],
];
const TX0 = 880, TX1 = 1720, TY = [430, 560, 690, 820];
function cycleU(t, ease) {
  const p2 = P(t, 7.95, 8.75);
  if (p2 > 0) return 1 - ease(p2);
  return ease(P(t, 6.85, 7.75));
}
function bez(p0, p1, p2, p3, s) {
  const u = 1 - s;
  return u * u * u * p0 + 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s * p3;
}
function sceneD(ctx, t) {
  bg(ctx, C.cobalt);
  revealLine(ctx, 'EASE', 150, 290, 170, E.outExpo(P(t, 6.5, 6.95)), C.paper);
  font(ctx, 500, 22, MONO); ctx.textAlign = 'left'; ctx.fillStyle = hexA(C.paper, 0.75);
  ctx.fillText(typed('cubic-bezier(.34, 1.56, .64, 1)', P(t, 6.7, 7.1)), 155, 345);

  // graph
  const gx = 155, gy = 410, S = 500;
  const ax = E.outExpo(P(t, 6.6, 7.05));
  ctx.strokeStyle = hexA(C.paper, 0.1); ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(gx + i * S / 5, gy + S); ctx.lineTo(gx + i * S / 5, gy + S - S * ax); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, gy + S - i * S / 5); ctx.lineTo(gx + S * ax, gy + S - i * S / 5); ctx.stroke();
  }
  ctx.strokeStyle = hexA(C.paper, 0.45); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx, gy + S - S * ax); ctx.lineTo(gx, gy + S); ctx.lineTo(gx + S * ax, gy + S); ctx.stroke();

  const X = u => gx + u * S, Y = v => gy + S - v * S;
  const cp = [[0, 0], [0.34, 1.56], [0.64, 1], [1, 1]];
  const hp = E.outBack(P(t, 6.9, 7.2));
  if (hp > 0) {
    ctx.strokeStyle = hexA(C.paper, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(lerp(0, .34, hp)), Y(lerp(0, 1.56, hp))); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(lerp(1, .64, hp)), Y(1)); ctx.stroke();
    ctx.fillStyle = C.lime;
    for (const [u, v] of [[lerp(0, .34, hp), lerp(0, 1.56, hp)], [lerp(1, .64, hp), 1]]) {
      ctx.beginPath(); ctx.arc(X(u), Y(v), 9, 0, TAU); ctx.fill();
    }
  }
  const cdraw = E.inOutCubic(P(t, 6.75, 7.3));
  if (cdraw > 0) {
    ctx.strokeStyle = C.paper; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 80 * cdraw; i++) {
      const s = i / 80;
      const u = bez(0, .34, .64, 1, s), v = bez(0, 1.56, 1, 1, s);
      i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v));
    }
    ctx.stroke();
  }
  // moving probe on the curve
  const sp = P(t, 7.95, 8.75) > 0 ? 1 - P(t, 7.95, 8.75) : P(t, 6.85, 7.75);
  if (t > 6.85) {
    const u = bez(0, .34, .64, 1, sp), v = bez(0, 1.56, 1, 1, sp);
    ctx.setLineDash([6, 8]); ctx.strokeStyle = hexA(C.paper, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(u), Y(v)); ctx.lineTo(X(u), Y(0)); ctx.moveTo(X(u), Y(v)); ctx.lineTo(X(0), Y(v)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(X(u), Y(v), 14, 0, TAU); ctx.fill();
    font(ctx, 500, 20, MONO); ctx.fillStyle = C.paper; ctx.textAlign = 'left';
    ctx.fillText(`t ${u.toFixed(2)}  v ${v.toFixed(2)}`, gx, gy + S + 50);
  }

  // tracks + balls with onion skin
  TRACKS.forEach(([name, ease, col], i) => {
    const y = TY[i];
    const g = E.outExpo(P(t, 6.6 + i * 0.06, 7.05 + i * 0.06));
    if (g <= 0) return;
    ctx.strokeStyle = hexA(C.paper, 0.25); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(TX0, y); ctx.lineTo(lerp(TX0, TX1, g), y); ctx.stroke();
    ctx.fillStyle = hexA(C.paper, 0.4);
    ctx.fillRect(TX0 - 1, y - 10, 2, 20); ctx.fillRect(lerp(TX0, TX1, g) - 1, y - 10, 2, 20);
    font(ctx, 500, 20, MONO); ctx.textAlign = 'left'; ctx.fillStyle = hexA(C.paper, 0.75);
    ctx.fillText(typed(name, P(t, 6.7 + i * 0.06, 7.0 + i * 0.06)), TX0, y - 34);
    for (let k = 7; k >= 0; k--) {
      const u = cycleU(t - k * 0.024, ease);
      const a = k === 0 ? 1 : 0.22 * (1 - k / 8);
      ctx.fillStyle = hexA(col, a * g);
      ctx.beginPath(); ctx.arc(lerp(TX0, TX1, u), y, 17, 0, TAU); ctx.fill();
    }
  });

  // double-ring iris (lime edge, ink core) from the elastic ball
  const r = E.inExpo(P(t, 8.7, 9.0)) * 2400;
  if (r > 0) {
    const ox = lerp(TX0, TX1, cycleU(t, E.outElastic)), oy = TY[3];
    ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.fill();
    if (r > 50) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(ox, oy, r - 50, 0, TAU); ctx.fill(); }
  }
}

// ───────────────────────── SCENE E · point cloud (9–11.5s) ─────────────────────────
const NPTS = 1200;
const PTS = (() => {
  const r = rng(7), sphere = [], torus = [], cube = [], scatter = [], seed = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NPTS; i++) {
    const y = 1 - (i / (NPTS - 1)) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
    sphere.push([Math.cos(th) * rr * 330, y * 330, Math.sin(th) * rr * 330]);
  }
  const nu = 60, nv = 20;
  for (let i = 0; i < NPTS; i++) {
    const a = (i % nu) / nu * TAU, b = Math.floor(i / nu) / nv * TAU;
    const R = 280, rr = 105;
    torus.push([(R + rr * Math.cos(b)) * Math.cos(a), rr * Math.sin(b), (R + rr * Math.cos(b)) * Math.sin(a)]);
  }
  const h = 250;
  for (let i = 0; i < NPTS; i++) {
    if (i % 2 === 0) { // edges
      const e = Math.floor(r() * 12), s = r() * 2 - 1;
      const axis = Math.floor(e / 4), sa = (e & 1) ? 1 : -1, sb = (e & 2) ? 1 : -1;
      const p = axis === 0 ? [s, sa, sb] : axis === 1 ? [sa, s, sb] : [sa, sb, s];
      cube.push(p.map(v => v * h));
    } else { // faces
      const f = Math.floor(r() * 6), a = r() * 2 - 1, b = r() * 2 - 1, sg = f & 1 ? 1 : -1;
      const ax = f >> 1;
      const p = ax === 0 ? [sg, a, b] : ax === 1 ? [a, sg, b] : [a, b, sg];
      cube.push(p.map(v => v * h));
    }
    const th = r() * TAU, ph = Math.acos(r() * 2 - 1), d = 1400 + r() * 1600;
    scatter.push([Math.sin(ph) * Math.cos(th) * d, Math.sin(ph) * Math.sin(th) * d, Math.cos(ph) * d]);
    seed.push([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r()]);
  }
  return { sphere, torus, cube, scatter, seed };
})();
const PCOL = Array.from({ length: 10 }, (_, i) => {
  const k = i / 9; // 0 front … 1 back
  const a = [214, 255, 90], b = [70, 90, 255];
  return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
});
function sceneE(ctx, t) {
  bg(ctx, C.bg);
  const cx = W / 2, cy = 500;
  const a = E.outExpo(P(t, 9.0, 9.75));
  const b = E.inOutCubic(P(t, 9.85, 10.4));
  const c = E.inOutCubic(P(t, 10.5, 11.0));
  const ex = E.inExpo(P(t, 11.12, 11.5));
  const wob = Math.sin(Math.PI * b) + Math.sin(Math.PI * c);
  const ry = (t - 9) * 1.1 + E.inOutCubic(P(t, 10.4, 11.05)) * 1.2;
  const rx = 0.38 + 0.22 * Math.sin((t - 9) * 1.3);
  const cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);

  // orbit ellipses
  const op = E.outExpo(P(t, 9.3, 10.0)) * (1 - ex);
  if (op > 0) {
    ctx.strokeStyle = hexA(C.paper, 0.14 * op); ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath(); ctx.ellipse(cx, cy, 560 * op, 150 * op, (k ? -0.25 : 0.2) + (t - 9) * (k ? -0.15 : 0.12), 0, TAU); ctx.stroke();
    }
  }

  const buckets = PCOL.map(() => []);
  for (let i = 0; i < NPTS; i++) {
    const S = PTS.sphere[i], T = PTS.torus[i], Q = PTS.cube[i], X = PTS.scatter[i], sd = PTS.seed[i];
    let x = lerp(lerp(lerp(X[0], S[0], a), T[0], b), Q[0], c);
    let y = lerp(lerp(lerp(X[1], S[1], a), T[1], b), Q[1], c);
    let z = lerp(lerp(lerp(X[2], S[2], a), T[2], b), Q[2], c);
    x += sd[0] * wob * 60; y += sd[1] * wob * 60; z += sd[2] * wob * 60;
    const k = 1 + ex * (5 + sd[3] * 6);
    x *= k; y *= k; z *= k;
    // rotate Y then X
    let x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR;
    let y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
    const zz = z2 + 1100;
    if (zz < 60) continue;
    const f = 950 / zz;
    const px = cx + x1 * f, py = cy + y1 * f;
    if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue;
    const di = Math.round(clamp((zz - 750) / 700) * 9);
    buckets[di].push(px, py, Math.max(0.6, 3.0 * f));
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let bi = 9; bi >= 0; bi--) {
    const arr = buckets[bi];
    if (!arr.length) continue;
    ctx.fillStyle = PCOL[bi];
    ctx.beginPath();
    for (let j = 0; j < arr.length; j += 3) { ctx.moveTo(arr[j] + arr[j + 2], arr[j + 1]); ctx.arc(arr[j], arr[j + 1], arr[j + 2], 0, TAU); }
    ctx.fill();
  }
  ctx.restore();

  // title — thin, tracked out
  const L = layout(ctx, 'DIMENSION', W / 2, 96, 200, DISPLAY, 42);
  ctx.textAlign = 'left';
  L.out.forEach((g, i) => {
    const p = E.outExpo(P(t, 9.25 + i * 0.04, 9.25 + i * 0.04 + 0.6));
    const a2 = p * (1 - ex);
    if (a2 <= 0) return;
    ctx.fillStyle = hexA(C.paper, a2);
    ctx.fillText(g.ch, g.x, 960 + (1 - p) * 40);
  });

  // live readouts
  const rp = P(t, 9.4, 9.8) * (1 - ex);
  if (rp > 0) {
    const form = t < 10.15 ? 'SPHERE' : t < 10.75 ? 'TORUS' : 'CUBE';
    const deg = ((ry * 180 / Math.PI) % 360).toFixed(1).padStart(5, '0');
    font(ctx, 500, 20, MONO); ctx.textAlign = 'left';
    const rows = [['VERTICES', String(NPTS)], ['FORM', form], ['ROT.Y', deg + '°'], ['FOCAL', '950mm']];
    rows.forEach(([k, v], i) => {
      ctx.fillStyle = hexA(C.paper, 0.45 * rp); ctx.fillText(k, 1500, 420 + i * 40);
      ctx.fillStyle = hexA(i === 1 ? C.lime : C.paper, 0.9 * rp); ctx.fillText(v, 1640, 420 + i * 40);
    });
    ctx.fillStyle = hexA(C.paper, 0.25 * rp); ctx.fillRect(1500, 395, 2, 160);
  }

  // flash into the next scene
  const fl = P(t, 11.38, 11.5);
  if (fl > 0) { ctx.fillStyle = hexA(C.coral, E.inExpo(fl)); ctx.fillRect(-W, -H, W * 3, H * 3); }
}

// ───────────────────────── SCENE F · energy (11.5–13.5s) ─────────────────────────
const MARQ = 'MOTION — DESIGN — TIMING — RHYTHM — ';
function sceneF(ctx, t) {
  if (t < 11.75) {
    bg(ctx, C.coral);
    const p = E.outExpo(P(t, 11.5, 11.72));
    const s = lerp(1.35, 1.0, p);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
    font(ctx, 900, 560); ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
    ctx.fillText('MOTION', 0, 200);
    ctx.restore();
  } else if (t < 12.0) {
    bg(ctx, C.lime);
    const lt = t - 11.75;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.1);
    font(ctx, 900, 330); ctx.textAlign = 'center';
    for (let r = -2; r <= 2; r++) {
      const dx = (r % 2 ? 1 : -1) * (lt * 2400 - 300);
      if (r === 0) { ctx.fillStyle = C.ink; ctx.fillText('MOTION', -dx * 0.3, 115); }
      else { ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeText('MOTION', dx, r * 290 + 115); }
    }
    ctx.restore();
  } else if (t < 12.25) {
    bg(ctx, C.bg);
    ctx.strokeStyle = hexA(C.paper, 0.2); ctx.lineWidth = 2;
    const g = E.outExpo(P(t, 12.0, 12.2));
    ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - H / 2 * g); ctx.lineTo(W / 2, H / 2 + H / 2 * g);
    ctx.moveTo(W / 2 - W / 2 * g, H / 2); ctx.lineTo(W / 2 + W / 2 * g, H / 2); ctx.stroke();
    const shapes = [[480, 270, C.coral, 'circle'], [1440, 270, C.cobalt, 'square'], [480, 810, C.lime, 'tri'], [1440, 810, C.paper, 'ring']];
    shapes.forEach(([x, y, col, kind], i) => {
      const p = E.outBack(P(t, 12.0 + i * 0.03, 12.0 + i * 0.03 + 0.17));
      if (p <= 0) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate((1 - p) * 1.2 + (t - 12) * 1.5); ctx.scale(p, p);
      ctx.fillStyle = col; ctx.strokeStyle = col;
      ctx.beginPath();
      if (kind === 'circle') { ctx.arc(0, 0, 170, 0, TAU); ctx.fill(); }
      else if (kind === 'square') { ctx.rect(-150, -150, 300, 300); ctx.fill(); }
      else if (kind === 'tri') { ctx.moveTo(0, -180); ctx.lineTo(160, 110); ctx.lineTo(-160, 110); ctx.closePath(); ctx.fill(); }
      else { ctx.lineWidth = 34; ctx.arc(0, 0, 150, 0, TAU); ctx.stroke(); }
      ctx.restore();
    });
  } else if (t < 12.5) {
    bg(ctx, C.paper);
    const p = E.outExpo(P(t, 12.25, 12.47));
    const bw = E.inOutExpo(P(t, 12.25, 12.45));
    ctx.fillStyle = C.coral; ctx.fillRect(lerp(-W, W, bw), 0, W * 0.35, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(lerp(1.4, 1, p), lerp(1.4, 1, p));
    font(ctx, 900, 1300); ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
    ctx.fillText('M', 0, 470);
    ctx.restore();
    ctx.fillStyle = C.cobalt;
    ctx.beginPath(); ctx.arc(W / 2 + 300, H / 2 - 230, 70 * E.outBack(P(t, 12.3, 12.45)), 0, TAU); ctx.fill();
  } else {
    bg(ctx, C.bg);
    const lt = t - 12.5;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.14);
    font(ctx, 900, 130); ctx.textAlign = 'left';
    const tw = ctx.measureText(MARQ).width;
    for (let i = 0; i < 11; i++) {
      const y = (i - 5) * 150 + 46;
      const dir = i % 2 ? 1 : -1;
      const speed = 700 + (i % 3) * 220;
      const dist = speed * lt + 1500 * lt * lt;
      const t0 = 13.18 + Math.abs(i - 5) * 0.022;
      const exit = E.inExpo(P(t, t0, t0 + 0.24)) * 3200 * dir;
      let x = -1700 + ((dist * dir) % tw + tw) % tw - tw + exit;
      const hi = i === 5;
      for (; x < 1700 + Math.abs(exit); x += tw) {
        if (hi) { ctx.fillStyle = C.coral; ctx.fillText(MARQ, x, y); }
        else if (i % 2) { ctx.fillStyle = hexA(C.paper, 0.92); ctx.fillText(MARQ, x, y); }
        else { ctx.strokeStyle = hexA(C.paper, 0.6); ctx.lineWidth = 2; ctx.strokeText(MARQ, x, y); }
      }
    }
    ctx.restore();
  }
}

// ───────────────────────── SCENE G · resolve (13.5–15s) ─────────────────────────
const DOT_T0 = 14.0, DOT_DUR = 0.36;
const SUB = 'DESIGNED & ANIMATED ENTIRELY IN CODE';
function sceneG(ctx, t) {
  bg(ctx, C.bg);
  const z = lerp(1.06, 1.0, E.outCubic(P(t, 13.5, 15)));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);

  // burst rings
  for (const [d, col, lw] of [[0, C.coral, 70], [0.08, C.paper, 3]]) {
    const p = P(t, 13.5 + d, 14.35 + d);
    if (p > 0 && p < 1) {
      ctx.strokeStyle = col; ctx.lineWidth = lerp(lw, 0.5, E.outCubic(p));
      ctx.beginPath(); ctx.arc(W / 2, H / 2, lerp(0, 760, E.outExpo(p)), 0, TAU); ctx.stroke();
    }
  }

  const size = 250, base = 630, dotR = 27, gap = 18;
  font(ctx, 900, size);
  const wWord = ctx.measureText('MOTION').width;
  const total = wWord + gap + dotR * 2;
  const x0 = W / 2 - total / 2;
  const L = layout(ctx, 'MOTION', x0, size, 900, DISPLAY, 0, 'left');
  ctx.textAlign = 'left';
  L.out.forEach((g, i) => {
    const t0 = 13.6 + i * 0.045;
    const p = E.outExpo(P(t, t0, t0 + 0.6));
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(g.x - 30, base - size * 0.86, g.w + 60, size * 1.02); ctx.clip();
    ctx.fillStyle = C.paper;
    ctx.fillText(g.ch, g.x, base + (1 - p) * size * 1.02);
    ctx.restore();
  });

  // the coral dot from the opening lands as the full stop
  const dp = P(t, DOT_T0, DOT_T0 + DOT_DUR);
  if (dp > 0) {
    const dx = x0 + wWord + gap + dotR, restY = base - dotR;
    const y = lerp(-120, restY, E.outBounce(dp));
    const near = Math.exp(-Math.abs(y - restY) / 14);
    const sq = near * (1 - P(t, DOT_T0 + DOT_DUR, DOT_T0 + DOT_DUR + 0.15)) * 0.35;
    ctx.fillStyle = C.coral;
    ctx.beginPath(); ctx.ellipse(dx, y + dotR * sq * 0.5, dotR * (1 + sq), dotR * (1 - sq), 0, 0, TAU); ctx.fill();
    const rp = P(t, DOT_T0 + 0.131, DOT_T0 + 0.7);
    if (rp > 0 && rp < 1) {
      ctx.strokeStyle = hexA(C.coral, 1 - rp); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dx, restY, lerp(dotR, 130, E.outExpo(rp)), 0, TAU); ctx.stroke();
    }
  }

  // rule lines
  const lp = E.outExpo(P(t, 14.05, 14.7));
  if (lp > 0) {
    ctx.fillStyle = hexA(C.paper, 0.35);
    const my = base - size * 0.36;
    ctx.fillRect(x0 - 50 - 320 * lp, my - 1, 320 * lp, 2);
    ctx.fillRect(x0 + total + 50, my - 1, 320 * lp, 2);
  }
  // subtitle typed on
  font(ctx, 500, 22, MONO); ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillStyle = hexA(C.paper, 0.7);
  const sp = P(t, 14.25, 14.65);
  typeCentered(ctx, SUB, sp, W / 2, 760, true);
  ctx.fillStyle = hexA(C.coral, 0.9);
  typeCentered(ctx, '— CLAUDE —', P(t, 14.62, 14.78), W / 2, 806);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

// ───────────────────────── HUD (blended over everything) ─────────────────────────
const LABELS = [[0, '00 — POINT'], [2, '01 — TYPE'], [4, '02 — RHYTHM'], [6.5, '03 — EASING'], [9, '04 — SPACE'], [11.5, '05 — ENERGY'], [13.5, '06 — RESOLVE']];
const pad = n => String(n).padStart(2, '0');
function hud(ctx, t) {
  const a = E.outCubic(P(t, 0.15, 0.7));
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.globalAlpha = 0.75 * a;
  ctx.fillStyle = C.paper; ctx.strokeStyle = C.paper; ctx.lineWidth = 2;
  font(ctx, 500, 18, MONO);
  ctx.textAlign = 'left'; ctx.fillText('MOTION/REEL  v1.0', 72, 76);
  let li = 0; for (let i = 0; i < LABELS.length; i++) if (t >= LABELS[i][0]) li = i;
  const since = t - LABELS[li][0];
  ctx.textAlign = 'right';
  ctx.fillText(scramble(LABELS[li][1], P(since, 0, 0.22), li * 131 + Math.floor(t * 30)), W - 72, 76);
  const f = Math.min(DUR * FPS - 1, Math.floor(t * FPS + 1e-6));
  ctx.textAlign = 'left'; ctx.fillText(`TC 00:00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`, 72, H - 64);
  ctx.textAlign = 'right'; ctx.fillText('1920×1080 · 60FPS · 180°', W - 72, H - 64);
  // progress
  ctx.globalAlpha = 0.2 * a; ctx.fillRect(72, H - 44, W - 144, 2);
  ctx.globalAlpha = 0.8 * a; ctx.fillRect(72, H - 44, (W - 144) * clamp(t / DUR), 2);
  // crop marks
  const m = 36, l = 22;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ───────────────────────── frame composition ─────────────────────────
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const c = cam(t);
  ctx.translate(W / 2 + c.x, H / 2 + c.y); ctx.scale(c.s, c.s); ctx.translate(-W / 2, -H / 2);
  if (t < 2.0) sceneA(ctx, t);
  else if (t < 4.0) sceneB(ctx, t);
  else if (t < 6.5) sceneC(ctx, t);
  else if (t < 9.0) sceneD(ctx, t);
  else if (t < 11.5) sceneE(ctx, t);
  else if (t < 13.5) sceneF(ctx, t);
  else sceneG(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  hud(ctx, t);
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
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.10;
  const pat = ctx.createPattern(NOISE, 'repeat');
  pat.setTransform(new DOMMatrix().translate(Math.floor(r() * 256), Math.floor(r() * 256)));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

const SAMPLES = 4, SHUTTER = 0.5;
const main = document.getElementById('c'), mctx = main.getContext('2d');
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
window.renderFrame = function (frame) { window.drawFrame(frame); return main.toDataURL('image/png'); };
window.ready = Promise.all([
  document.fonts.load(`900 100px ${DISPLAY}`),
  document.fonts.load(`200 100px ${DISPLAY}`),
  document.fonts.load(`500 20px ${MONO}`),
]);
