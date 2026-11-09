// REBORN — in the MOTION reel design language. 1080x1920 @ 60fps, 45.7s, 3-sample motion blur.
// Ink ground, paper type, coral / lime / cobalt accents, kinetic mask-reveal typography, geometry,
// a rhythm grid, an easing lab, a 3D point cloud, a marquee, stamp cuts and a timecode HUD.
const W = 1080, H = 1920, FPS = 60, DUR = 45.7;
window.META = { W, H, FPS, DUR };
const C = { bg: '#0A0A0F', paper: '#F4F1EA', coral: '#FF4A1C', lime: '#C8FF2E', cobalt: '#2E4BFF', ink: '#0A0A0F', grey: '#3A3B46' };
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: x => x, outCubic: x => 1 - Math.pow(1 - x, 3), inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outElastic: x => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * TAU / 3) + 1,
  outBounce: x => { const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375; return n1 * (x -= 2.625 / d1) * x + .984375; },
};
const wob = (d, k = 7, w = 18) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(w * d);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

// ───────── the speech: phrases split into kinetic lines ─────────
const PHRASES = [
  [0.05, 1.90, "THAT VERSION|OF MYSELF|IS A MEMORY."], [2.00, 3.40, "I DON'T|NEED IT|ANYMORE."],
  [3.70, 5.10, "I|WANT|TO|WIN."], [5.35, 6.80, "NOW IS|THE TIME"], [6.95, 8.30, "TO BE|REBORN"],
  [9.40, 12.30, "NO MATTER HOW MUCH|YOU KNOCK ON THE DOOR|TO SOMEONE'S HEART"], [12.45, 14.60, "IN THE END|YOU CAN'T|CHANGE THEM."],
  [15.40, 17.00, "WHICH IS WHY|YOU HAVE TO BE|THE ONE"], [17.40, 19.40, "TO CHANGE|YOURSELF."],
  [19.50, 22.20, "WHEN THE WORLD|AROUND YOU ISN'T|FOLLOWING YOUR PLAN"], [22.40, 23.90, "THE ONLY WAY|TO FIX IT"], [24.00, 25.60, "IS TO|FIX YOU."],
  [25.90, 28.30, "IF I CAN'T SEE THE LIGHT|THAT LEADS|TO THE GOAL"], [28.45, 30.50, "THEN I NEED TO|BECOME|THE LIGHT."],
  [31.30, 33.30, "WATCH ME,|I'LL DEVOUR IT"], [33.40, 35.20, "AND TURN IT|INTO LIGHT."], [35.90, 37.40, "IF IT MEANS|WINNING"],
  [37.50, 40.40, "I DON'T MIND|DESTROYING|MY OWN SELF."], [41.30, 43.50, "I'LL BE|REBORN AGAIN"], [43.60, 45.70, "AS MANY TIMES|AS IT TAKES"],
];
const syl = w => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g) || []).length);
// LT[pi][li] = time each line starts being spoken
const LT = PHRASES.map(([t0, t1, txt]) => {
  const lines = txt.split('|'), wts = lines.map(l => l.split(' ').reduce((a, w) => a + syl(w), 0)), tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0; return lines.map((l, i) => { const v = t0 + (t1 - t0) * 0.85 * acc / tot; acc += wts[i]; return v; });
});
const L = (pi, li) => LT[pi][li];
const LN = pi => PHRASES[pi][2].split('|');
const DROPS = [6.95, 17.40, 24.00, 28.45, 33.40, 37.50, 41.30];
const KNOCKS = [9.9, 10.3, 10.7, 11.25, 11.65, 12.05];
const BEAT = 0.368;

// ───────── helpers ─────────
function font(ctx, w, size, fam = DISP) { ctx.font = `${w} ${size}px ${fam}`; }
function bg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(-W, -H, W * 3, H * 3); }
function maskLine(ctx, s, x, y, size, p, color, align = 'left', weight = 900, outline = false) {
  if (p <= 0) return 0;
  font(ctx, weight, size);
  const w = ctx.measureText(s).width, x0 = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 40, y - size * 0.86, w + 80, size * 1.02); ctx.clip();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeText(s, x, y + (1 - p) * size * 1.02); }
  else { ctx.fillStyle = color; ctx.fillText(s, x, y + (1 - p) * size * 1.02); }
  ctx.restore(); return w;
}
function fitSize(ctx, s, size, maxW, weight = 900) { font(ctx, weight, size); const w = ctx.measureText(s).width; return w > maxW ? size * maxW / w : size; }
// stack: each line of a phrase mask-reveals as it is spoken
function stack(ctx, t, pi, x, y0, size, lh, colorOf, align = 'left', maxW = 960) {
  LN(pi).forEach((s, li) => { const sz = fitSize(ctx, s, size, maxW); maskLine(ctx, s, x, y0 + li * lh, sz, E.outExpo(P(t, L(pi, li), L(pi, li) + 0.4)), colorOf(li, s), align); });
}
function slam(ctx, s, x, y, size, t, t0, color, maxW = 980) {   // big word slams in (scale + settle)
  const d = t - t0; if (d < 0) return;
  const sz = fitSize(ctx, s, size, maxW), k = E.outExpo(clamp(d / 0.28)), sc = lerp(1.35, 1, k);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); font(ctx, 900, sz); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = clamp(d / 0.05); ctx.fillStyle = color; ctx.fillText(s, 0, sz * 0.36); ctx.restore();
}
function mono(ctx, s, x, y, t, t0, dur = 0.4, col = C.paper, size = 26, align = 'left') {
  const p = P(t, t0, t0 + dur); if (p <= 0) return;
  ctx.save(); font(ctx, 500, size, MONO); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const full = ctx.measureText(s).width, x0 = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
  ctx.fillText(s.slice(0, Math.floor(s.length * p)), x0, y); ctx.restore();
}
function layoutLetters(ctx, str, cx, size, weight = 900) {
  font(ctx, weight, size); const total = ctx.measureText(str).width; const x0 = cx - total / 2;
  return { total, x0, out: [...str].map((ch, i) => ({ ch, x: x0 + ctx.measureText(str.slice(0, i)).width, w: ctx.measureText(ch).width })) };
}
function riseLetters(ctx, str, cx, base, size, t, t0, color, stagger = 0.04) {
  const L2 = layoutLetters(ctx, str, cx, size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  L2.out.forEach((g, i) => { const p = E.outExpo(P(t, t0 + i * stagger, t0 + i * stagger + 0.55)); if (p <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(g.x - 20, base - size * 0.86, g.w + 40, size * 1.02); ctx.clip(); ctx.fillStyle = color; ctx.fillText(g.ch, g.x, base + (1 - p) * size * 1.02); ctx.restore(); });
  return L2;
}
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+*';
function scramble(str, p, seed) { const r = rng(seed); let s = ''; for (let i = 0; i < str.length; i++) { const g = GLYPHS[Math.floor(r() * GLYPHS.length)]; s += (str[i] === ' ' || i / str.length < p) ? str[i] : g; } return s; }

// ───────── camera ─────────
const IMPACTS = [[0.05, 10], ...DROPS.map(d => [d, 18]), ...KNOCKS.map(k => [k, 7]), [43.6, 10], [44.4, 10], [45.05, 10]];
function cam(t) {
  let x = 0, y = 0, s = 1;
  for (const [t0, a] of IMPACTS) { const d = t - t0; if (d >= 0 && d < 0.6) { const k = Math.exp(-d * 11); x += a * k * Math.sin(d * 95 + t0 * 7); y += a * k * Math.cos(d * 83 + t0 * 3); s += 0.03 * (a / 14) * Math.exp(-d * 9); } }
  return { x, y, s };
}

// ───────── 3D point cloud (sphere / torus / scatter / sun) ─────────
const NPTS = 1100;
const PTS = (() => {
  const r = rng(7), sphere = [], torus = [], scatter = [], seed = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NPTS; i++) { const y = 1 - (i / (NPTS - 1)) * 2, rr = Math.sqrt(1 - y * y), th = ga * i; sphere.push([Math.cos(th) * rr * 330, y * 330, Math.sin(th) * rr * 330]); }
  const nu = 55, nv = 20; for (let i = 0; i < NPTS; i++) { const a = (i % nu) / nu * TAU, b = Math.floor(i / nu) / nv * TAU; torus.push([(280 + 100 * Math.cos(b)) * Math.cos(a), 100 * Math.sin(b), (280 + 100 * Math.cos(b)) * Math.sin(a)]); }
  for (let i = 0; i < NPTS; i++) { const th = r() * TAU, ph = Math.acos(r() * 2 - 1), d = 1300 + r() * 1500; scatter.push([Math.sin(ph) * Math.cos(th) * d, Math.sin(ph) * Math.sin(th) * d, Math.cos(ph) * d]); seed.push([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r()]); }
  return { sphere, torus, scatter, seed };
})();
function cloud(ctx, t, cx, cy, { form = 1, torus = 0, explode = 0, glow = 0, dim = 1, colA = [214, 255, 90], colB = [70, 90, 255] } = {}) {
  const ry = t * 0.9, rx = 0.35 + 0.2 * Math.sin(t * 1.2), cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const buckets = Array.from({ length: 8 }, () => []);
  for (let i = 0; i < NPTS; i++) {
    const S = PTS.sphere[i], T = PTS.torus[i], X = PTS.scatter[i], sd = PTS.seed[i];
    let x = lerp(lerp(X[0], S[0], form), T[0], torus), y = lerp(lerp(X[1], S[1], form), T[1], torus), z = lerp(lerp(X[2], S[2], form), T[2], torus);
    const k = 1 + explode * (4 + sd[3] * 8); x *= k; y *= k; z *= k;
    const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR, y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR, zz = z2 + 1100;
    if (zz < 60) continue;
    const f = 950 / zz, px = cx + x1 * f, py = cy + y1 * f;
    if (px < -60 || px > W + 60 || py < -60 || py > H + 60) continue;
    buckets[Math.round(clamp((zz - 750) / 700) * 7)].push(px, py, Math.max(0.6, (2.6 + glow * 2) * f));
  }
  for (let b = 7; b >= 0; b--) {
    const k = b / 7, c = colA.map((v, i) => Math.round(lerp(v, colB[i], k)));
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${dim})`; ctx.beginPath();
    const a = buckets[b]; for (let j = 0; j < a.length; j += 3) { ctx.moveTo(a[j] + a[j + 2], a[j + 1]); ctx.arc(a[j], a[j + 1], a[j + 2], 0, TAU); } ctx.fill();
  }
  if (glow > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 700); g.addColorStop(0, `rgba(200,255,46,${0.45 * glow})`); g.addColorStop(1, 'rgba(200,255,46,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 700, cy - 700, 1400, 1400); }
  ctx.restore();
}

// ═════════ SCENES ═════════
// 0 · 0.0–2.0 · the dot, the dot grid, the memory
function sMemory(ctx, t) {
  bg(ctx, C.bg);
  const cx = W / 2, cy = 640;
  const rev = E.outExpo(P(t, 0.15, 1.4)) * 1500, drift = P(t, 1.45, 2.0);
  for (let x = 30; x < W; x += 60) for (let y = 30; y < H; y += 60) {
    const d = Math.hypot(x - cx, y - cy); if (d > rev) continue;
    const e = clamp((rev - d) / 160), r = rng(x * 7 + y);
    ctx.fillStyle = hexA(C.paper, 0.18 * e * (1 - drift)); const s = 2 + 2 * (1 - e);
    ctx.fillRect(x - s / 2 + (r() - 0.5) * 200 * drift, y - s / 2 - drift * 120 * r(), s, s);
  }
  for (const t0 of [0.05, 0.6, 1.2]) { const p = P(t, t0, t0 + 1.0); if (p > 0 && p < 1) { ctx.strokeStyle = hexA(C.paper, 0.55 * (1 - p)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, lerp(20, 420, E.outExpo(p)), 0, TAU); ctx.stroke(); } }
  const ap = E.outBack(P(t, 0.05, 0.4)), sq = Math.sin(Math.PI * P(t, 1.65, 2.0));
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.ellipse(cx, cy, 20 * ap * (1 + 0.3 * sq), 20 * ap * (1 - 0.35 * sq), 0, 0, TAU); ctx.fill();
  mono(ctx, 'fig.01 — the old self', cx, cy + 90, t, 0.4, 0.5, hexA(C.paper, 0.6), 24, 'center');
  stack(ctx, t, 0, 90, 1240, 120, 125, (li) => li === 2 ? C.coral : C.paper);
}
// 1 · 2.0–3.7 · the dot stretches into a line, bars sweep in coral
function sAnymore(ctx, t) {
  bg(ctx, C.bg);
  const cx = W / 2, cy = 640, s = E.inOutExpo(P(t, 2.0, 2.4));
  ctx.fillStyle = C.coral;
  const w = lerp(40, W * 1.3, s), h = lerp(40, 8, s);
  if (t < 2.75) { const th = E.inOutExpo(P(t, 2.4, 2.75)); const hh = lerp(h, H / 12 + 2, th); ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - hh / 2, w, hh, Math.min(hh, w) / 2 * (1 - th)); ctx.fill(); }
  const n = 12, bh = H / n, mid = Math.round(cy / bh - 0.5);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - mid) / n, p = E.inOutExpo(P(t, 2.42 + d * 0.5, 2.42 + d * 0.5 + 0.3));
    if (p <= 0) continue; ctx.fillRect((1 - p) * W * 1.05 * (i % 2 ? 1 : -1), i * bh - 1, W, bh + 2);
  }
  ctx.save(); ctx.globalCompositeOperation = 'difference'; stack(ctx, t, 1, 90, 1240, 150, 150, () => C.paper); ctx.restore();
}
// 2 · 3.7–5.35 · coral, stacked kinetic WANT / WIN, radiating rings
function sWin(ctx, t) {
  bg(ctx, C.coral);
  for (let k = 0; k < 7; k++) { const p = (((t - 3.7) * 0.55 + k / 7) % 1 + 1) % 1; ctx.strokeStyle = hexA(C.ink, 0.13 * (1 - p)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(820, 520, p * 1300, 0, TAU); ctx.stroke(); }
  const z = lerp(1.07, 1, E.outExpo(P(t, 3.7, 4.4)));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const base = [560, 830, 1100, 1370];
  LN(2).forEach((s, i) => { maskLine(ctx, s, 90, base[i], 280, E.outExpo(P(t, L(2, i), L(2, i) + 0.4)), i === 3 ? C.paper : C.ink); });
  ['→ desire', '→ intent', '→ direction', '→ the goal'].forEach((s, i) => { const q = P(t, L(2, i) + 0.1, L(2, i) + 0.4); if (q <= 0) return; mono(ctx, s, 700, base[i] - 150, t, L(2, i) + 0.1, 0.3, hexA(C.ink, 0.85), 28); ctx.fillStyle = hexA(C.ink, 0.35); ctx.fillRect(700, base[i] - 130, 280 * E.outExpo(q), 3); });
  ctx.restore();
  // exit: slices fly apart
  if (t > 5.1) { const n = 12, sh = H / n; const snap = ctx.getImageData ? null : null; }
}
function slicedExit(ctx, t, t0, dur, draw, toCol) {
  bg(ctx, toCol); const n = 12, sh = H / n;
  for (let i = 0; i < n; i++) { const q = E.inExpo(P(t, t0 + ((i * 7) % n) * 0.012, t0 + ((i * 7) % n) * 0.012 + dur)); ctx.save(); ctx.beginPath(); ctx.rect(-W, i * sh, W * 3, sh + 1); ctx.clip(); ctx.translate((i % 2 ? 1 : -1) * q * W * 1.15, 0); draw(ctx, t); ctx.restore(); }
}
// 3 · 5.35–6.95 · now is the time: rolling timecode
function sTime(ctx, t) {
  bg(ctx, C.bg);
  const d = t - 5.35, f = Math.floor((t * 60) % 60), sec = Math.floor(t), speed = 1 + E.inCubic(P(t, 5.35, 6.95)) * 40;
  const tc = ['00', '00', String(sec).padStart(2, '0'), String(Math.floor(f * speed) % 60).padStart(2, '0')];
  font(ctx, 900, 150); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  tc.forEach((g, i) => { const k = E.outExpo(P(d, i * 0.06, i * 0.06 + 0.4)); ctx.save(); ctx.beginPath(); ctx.rect(0, 470, W, 200); ctx.clip(); ctx.fillStyle = i === 3 ? C.lime : C.paper; ctx.fillText(g, 180 + i * 240, 620 + (1 - k) * 160); ctx.restore(); if (i < 3) { ctx.fillStyle = hexA(C.paper, 0.4); ctx.fillText(':', 300 + i * 240, 610); } });
  mono(ctx, 'TC — RUNNING', W / 2, 720, t, 5.5, 0.3, hexA(C.paper, 0.6), 26, 'center');
  // progress ring closing
  const p = E.inOutCubic(P(t, 5.4, 6.95)); ctx.strokeStyle = C.lime; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(W / 2, 1000, 120, -Math.PI / 2, -Math.PI / 2 + p * TAU); ctx.stroke();
  ctx.strokeStyle = hexA(C.paper, 0.15); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, 1000, 120, 0, TAU); ctx.stroke();
  stack(ctx, t, 3, W / 2, 1380, 170, 170, li => li === 1 ? C.lime : C.paper, 'center');
}
// 4 · 6.95–9.4 · REBORN: the point cloud assembles into a sphere
function sReborn(ctx, t) {
  bg(ctx, C.bg);
  const a = E.outExpo(P(t, 6.95, 7.9)), push = E.inExpo(P(t, 8.9, 9.4));
  cloud(ctx, t, W / 2, 700, { form: a, explode: push * 0.5 });
  const sw = E.outExpo(P(t, 6.95, 7.7)); if (sw < 1) { ctx.strokeStyle = hexA(C.lime, 1 - sw); ctx.lineWidth = 16 * (1 - sw); ctx.beginPath(); ctx.arc(W / 2, 700, 40 + sw * 900, 0, TAU); ctx.stroke(); }
  maskLine(ctx, 'TO BE', W / 2, 1180, 110, E.outExpo(P(t, L(4, 0), L(4, 0) + 0.4)), C.paper, 'center');
  riseLetters(ctx, 'REBORN', W / 2, 1420, 230, t, L(4, 1), C.lime, 0.05);
  [['VERTICES', String(NPTS)], ['FORM', a < 0.95 ? 'ASSEMBLING' : 'SPHERE'], ['STATE', 'v2.0']].forEach(([k, v], i) => { mono(ctx, k, 90, 1580 + i * 40, t, 7.6 + i * 0.1, 0.3, hexA(C.paper, 0.45), 24); mono(ctx, v, 300, 1580 + i * 40, t, 7.7 + i * 0.1, 0.3, i === 1 ? C.lime : C.paper, 24); });
}
// 5–7 · 9.4–15.4 · the rhythm grid: knocks ripple through it, then it greys out
function grid(ctx, t, { greys = 0, keepOne = 0, oneScale = 1, shrink = 0 } = {}) {
  const cell = 120, cols = 9, rows = 7, ox = (W - cols * cell) / 2 + cell / 2, oy = 170 + cell / 2;
  const door = [Math.floor(cols / 2), 3];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = ox + c * cell, y = oy + r * cell, dd = Math.hypot(c - door[0], r - door[1]);
    const intro = E.outBack(P(t, 9.4 + dd * 0.035, 9.4 + dd * 0.035 + 0.35));
    let wave = 0; for (const k of KNOCKS) { const q = t - k - dd * 0.045; if (q > 0 && q < 0.5) wave = Math.max(wave, Math.sin(Math.PI * q / 0.5)); }
    const isOne = c === door[0] && r === door[1];
    const fade = isOne ? 1 : 1 - keepOne;
    if (fade <= 0.01 || intro <= 0) continue;
    let v = 0.25 + 0.75 * wave;
    const size = cell * lerp(0.18, 0.72, v) * intro * (isOne ? oneScale : 1) * (1 - shrink * (isOne ? 0 : 1));
    const rad = lerp(size / 2, size * 0.08, v), rot = (1 - v) * Math.PI / 4;
    const col = isOne && keepOne > 0 ? C.lime : wave > 0.6 && greys < 0.5 ? C.coral : hexA(greys > 0 ? '#8A8A96' : C.paper, lerp(0.25, 1, v) * (1 - greys * 0.55));
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, Math.max(0, rad)); ctx.fill(); ctx.restore();
  }
  return [ox + door[0] * cell, oy + door[1] * cell];
}
function sDoor(ctx, t) {
  bg(ctx, C.bg);
  const greys = E.inOutCubic(P(t, 12.5, 13.3));
  grid(ctx, t, { greys });
  // KNOCK slams, difference-blended over the grid
  ctx.save(); ctx.globalCompositeOperation = 'difference';
  KNOCKS.forEach((k, i) => { const d = t - k; if (d < 0 || d > 0.4 || t > 12.4) return; slam(ctx, 'KNOCK', W / 2 + (i % 2 ? 60 : -60), 590, 250, t, k, C.paper); });
  ctx.restore();
  mono(ctx, '× ' + KNOCKS.filter(k => t >= k).length + ' / KNOCKS', 90, 1120, t, 9.9, 0.3, C.lime, 28);
  if (t < 12.45) stack(ctx, t, 5, W / 2, 1300, 92, 105, (li, s) => li === 1 ? C.coral : C.paper, 'center');
  else {
    stack(ctx, t, 6, W / 2, 1280, 150, 160, li => li === 1 ? C.coral : C.paper, 'center');
    const x = E.outCubic(P(t, 13.1, 13.45)); if (x > 0) { ctx.strokeStyle = C.coral; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(470, 1395); ctx.lineTo(470 + 460 * x, 1395 - 50 * x); ctx.stroke(); }
    mono(ctx, 'STATUS: LOCKED', W - 90, 1120, t, 12.8, 0.3, C.coral, 28, 'right');
  }
}
// 7 · 15.4–17.4 · the one: everything fades except one lime cell
function sOne(ctx, t) {
  bg(ctx, C.bg);
  const keep = E.inOutCubic(P(t, 15.3, 16.0)), grow = 1 + 1.8 * E.outBack(P(t, 16.4, 16.9));
  const [ox, oy] = grid(ctx, Math.max(t, 12.0), { greys: 1, keepOne: keep, oneScale: grow });
  if (keep > 0.5) { ctx.strokeStyle = hexA(C.lime, 0.6); ctx.lineWidth = 3; const r = 140 + 40 * Math.sin(t * 4); ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke(); mono(ctx, 'fig.07 — you', ox + 170, oy + 10, t, 15.9, 0.3, C.lime, 26); }
  stack(ctx, t, 7, W / 2, 1280, 130, 140, li => li === 2 ? C.lime : C.paper, 'center');
}
// 8 · 17.4–19.5 · change yourself: the cell morphs shape on every beat, colour flips
function sChange(ctx, t) {
  const k = Math.min(3, Math.floor((t - 17.4) / (BEAT * 2))), d = t - (17.4 + k * BEAT * 2);
  const bgs = [C.coral, C.lime, C.cobalt, C.paper], fgs = [C.ink, C.ink, C.paper, C.ink];
  bg(ctx, bgs[k]);
  const p = E.outBack(P(d, 0, 0.3)), cx = W / 2, cy = 640, s = 260 * p;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((1 - p) * 1.4 + (t - 17.4) * 0.8); ctx.fillStyle = fgs[k]; ctx.strokeStyle = fgs[k]; ctx.beginPath();
  if (k === 0) ctx.rect(-s, -s, s * 2, s * 2), ctx.fill();
  else if (k === 1) ctx.arc(0, 0, s, 0, TAU), ctx.fill();
  else if (k === 2) { ctx.moveTo(0, -s * 1.1); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s, s * 0.7); ctx.closePath(); ctx.fill(); }
  else { ctx.lineWidth = 50; ctx.arc(0, 0, s * 0.85, 0, TAU); ctx.stroke(); }
  ctx.restore();
  mono(ctx, ['SQUARE', 'CIRCLE', 'TRIANGLE', 'RING'][k] + ' → v' + (k + 1), W / 2, 1000, t, 17.4 + k * BEAT * 2, 0.2, hexA(fgs[k], 0.8), 28, 'center');
  maskLine(ctx, 'TO CHANGE', W / 2, 1250, 130, E.outExpo(P(t, L(8, 0), L(8, 0) + 0.4)), fgs[k], 'center');
  slam(ctx, 'YOURSELF.', W / 2, 1460, 220, t, L(8, 1), fgs[k]);
}
// 9–11 · 19.5–25.85 · the easing lab: your plan vs the world, then the curve gets re-fitted
const bez = (a, b, c, d, s) => { const u = 1 - s; return u * u * u * a + 3 * u * u * s * b + 3 * u * s * s * c + s * s * s * d; };
function sLab(ctx, t) {
  bg(ctx, C.cobalt);
  const gx = 120, gy = 330, S = 840;
  const ax = E.outExpo(P(t, 19.5, 20.0));
  ctx.strokeStyle = hexA(C.paper, 0.12); ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx + i * S / 6, gy + S); ctx.lineTo(gx + i * S / 6, gy + S - S * ax); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, gy + S - i * S / 6); ctx.lineTo(gx + S * ax, gy + S - i * S / 6); ctx.stroke(); }
  ctx.strokeStyle = hexA(C.paper, 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy + S - S * ax); ctx.lineTo(gx, gy + S); ctx.lineTo(gx + S * ax, gy + S); ctx.stroke();
  const X = u => gx + u * S, Y = v => gy + S - v * S * 0.8;
  // your plan: a straight dashed line A → B
  const pd = E.inOutCubic(P(t, 19.7, 20.5));
  ctx.setLineDash([18, 14]); ctx.strokeStyle = C.paper; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(pd), Y(pd)); ctx.stroke(); ctx.setLineDash([]);
  mono(ctx, 'your plan: linear', gx + 20, gy + 50, t, 19.8, 0.4, C.paper, 26);
  // the world: an elastic, overshooting path that ignores the plan
  const wd = P(t, 20.6, 21.9), refit = E.inOutCubic(P(t, 22.6, 23.8));
  const worldV = u => lerp(u + 0.32 * Math.sin(u * 13) * (1 - u * 0.3) + 0.25 * Math.sin(u * 5.3), bez(0, 0.1, 0.9, 1, u), refit);
  if (t > 20.6) {
    ctx.strokeStyle = refit > 0.5 ? C.lime : C.coral; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    const end = t < 22.4 ? wd : 1; for (let i = 0; i <= 120 * end; i++) { const u = i / 120; i ? ctx.lineTo(X(u), Y(worldV(u))) : ctx.moveTo(X(u), Y(worldV(u))); } ctx.stroke();
    mono(ctx, refit > 0.5 ? 'the world: re-fitted ✓' : 'the world: elastic(chaos)', gx + 20, gy + 92, t, 20.7, 0.4, refit > 0.5 ? C.lime : C.coral, 26);
  }
  // bezier handles being dragged (fixing the curve) 22.4–23.9
  if (t > 22.4 && t < 25.85) {
    const hp = E.outBack(P(t, 22.4, 22.7));
    const h1 = [lerp(0.6, 0.1, refit), lerp(1.3, 0.0, refit)], h2 = [lerp(0.2, 0.9, refit), lerp(-0.2, 1, refit)];
    ctx.strokeStyle = hexA(C.paper, 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(h1[0]), Y(h1[1])); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(h2[0]), Y(h2[1])); ctx.stroke();
    for (const [u, v] of [h1, h2]) { ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(X(u), Y(v), 16 * hp, 0, TAU); ctx.fill(); }
    mono(ctx, `cubic-bezier(${h1[0].toFixed(2)}, ${h1[1].toFixed(2)}, ${h2[0].toFixed(2)}, ${h2[1].toFixed(2)})`, gx, gy + S + 60, t, 22.5, 0.3, C.paper, 24);
  }
  // the ball: rides the world's path, snaps onto the fixed curve on "fix you"
  if (t > 20.6) {
    const u = t < 24 ? (t < 22.4 ? wd : 1) : E.outBack(P(t, 24.0, 24.8)), v = worldV(clamp(u));
    for (let k = 6; k >= 0; k--) { const uu = clamp(u - k * 0.02); ctx.fillStyle = hexA(t > 24 ? C.lime : C.paper, k ? 0.15 * (1 - k / 7) : 1); ctx.beginPath(); ctx.arc(X(uu), Y(worldV(uu)), 22, 0, TAU); ctx.fill(); }
  }
  // text
  if (t < 22.4) stack(ctx, t, 9, W / 2, 1400, 92, 104, li => li === 2 ? C.lime : C.paper, 'center');
  else if (t < 24.0) stack(ctx, t, 10, W / 2, 1420, 130, 140, li => li === 1 ? C.lime : C.paper, 'center');
  else { maskLine(ctx, 'IS TO', W / 2, 1360, 110, E.outExpo(P(t, L(11, 0), L(11, 0) + 0.4)), C.paper, 'center'); slam(ctx, 'FIX YOU.', W / 2, 1560, 220, t, L(11, 1), C.lime); }
  // exit: zoom into the ball
  const ex = E.inExpo(P(t, 25.4, 25.85)); if (ex > 0) { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(X(1), Y(1), ex * 2400, 0, TAU); ctx.fill(); }
}
// 12–13 · 25.85–31.3 · darkness, then become the light (the cloud turns into a sun)
function sLight(ctx, t) {
  bg(ctx, C.bg);
  const ign = t - 28.45, lit = E.outCubic(clamp(ign / 0.7));
  if (ign < 0) {
    cloud(ctx, t, W / 2, 640, { form: 1, torus: 1, dim: 0.22, colA: [120, 120, 140], colB: [40, 40, 60] });
    const blink = Math.floor(t * 3) % 2; mono(ctx, 'GOAL: ' + (blink ? 'NOT FOUND' : '—'), W / 2, 1040, t, 26.2, 0.3, hexA(C.paper, 0.5), 28, 'center');
    stack(ctx, t, 12, W / 2, 1300, 88, 100, li => li === 2 ? hexA(C.paper, 0.9) : hexA(C.paper, 0.55), 'center');
    return;
  }
  // iris burst + sun
  const r = E.outExpo(clamp(ign / 0.6)) * 1500;
  ctx.save(); ctx.globalAlpha = 1 - P(ign, 0.35, 0.8); ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(W / 2, 640, r, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(W / 2, 640, Math.max(0, r - 60 - 600 * lit), 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(W / 2, 640); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + t * 0.15; ctx.fillStyle = `rgba(200,255,46,${0.07 * lit})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1700, a - 0.04, a + 0.04); ctx.fill(); }
  ctx.restore();
  cloud(ctx, t, W / 2, 640, { form: 1, torus: 1 - lit, glow: lit, colA: [235, 255, 150], colB: [200, 255, 46] });
  mono(ctx, 'SOURCE: YOU', W / 2, 1040, t, 28.7, 0.3, C.lime, 28, 'center');
  maskLine(ctx, LN(13)[0], W / 2, 1230, 90, E.outExpo(P(t, L(13, 0), L(13, 0) + 0.4)), C.paper, 'center');
  slam(ctx, 'BECOME', W / 2, 1400, 190, t, L(13, 1), C.paper);
  maskLine(ctx, 'THE LIGHT.', W / 2, 1600, 130, E.outExpo(P(t, L(13, 2), L(13, 2) + 0.4)), C.lime, 'center');
}
// 14 · 31.3–33.4 · devour: the marquee accelerates and is sucked into the centre
const MARQ = 'DEVOUR — DEVOUR — ';
function sDevour(ctx, t) {
  bg(ctx, C.bg);
  const lt = t - 30.7, suck = E.inCubic(P(t, 31.6, 33.4));
  ctx.save(); ctx.translate(W / 2, 760); ctx.rotate(-0.16 - suck * 0.6); ctx.scale(1 - suck * 0.85, 1 - suck * 0.85);
  font(ctx, 900, 150); ctx.textAlign = 'left';
  const tw = ctx.measureText(MARQ).width;
  for (let i = 0; i < 13; i++) {
    const y = (i - 6) * 165 + 50, dir = i % 2 ? 1 : -1, dist = (700 + (i % 3) * 220) * lt + 2400 * suck * suck;
    let x = -1700 + ((dist * dir) % tw + tw) % tw - tw;
    for (; x < 1700; x += tw) { if (i === 6) { ctx.fillStyle = C.lime; ctx.fillText(MARQ, x, y); } else if (i % 2) { ctx.fillStyle = hexA(C.paper, 0.9); ctx.fillText(MARQ, x, y); } else { ctx.strokeStyle = hexA(C.paper, 0.55); ctx.lineWidth = 2; ctx.strokeText(MARQ, x, y); } }
  }
  ctx.restore();
  // the black hole
  const hr = 40 + 160 * suck; ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(W / 2, 760, hr, 0, TAU); ctx.fill(); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.stroke();
  mono(ctx, 'DEVOURING · ' + Math.round(suck * 100) + '%', W / 2, 1120, t, 31.4, 0.3, C.lime, 28, 'center');
  ctx.fillStyle = 'rgba(10,10,15,0.75)'; ctx.fillRect(0, 1200, W, 420);
  stack(ctx, t, 14, W / 2, 1340, 150, 160, li => li === 1 ? C.lime : C.paper, 'center');
}
// 15 · 33.4–35.9 · into light: stamp cuts on the beat
function sStamps(ctx, t) {
  const k = Math.min(5, Math.floor((t - 33.4) / BEAT)), d = t - (33.4 + k * BEAT);
  const pop = E.outExpo(clamp(d / 0.2)), sc = lerp(1.3, 1, pop);
  if (k === 0) { bg(ctx, C.coral); ctx.save(); ctx.translate(W / 2, 760); ctx.scale(sc, sc); font(ctx, 900, 420); ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.fillText('LIGHT', 0, 150); ctx.restore(); }
  else if (k === 1) { bg(ctx, C.lime); ctx.save(); ctx.translate(W / 2, 760); ctx.rotate(-0.1); font(ctx, 900, 300); ctx.textAlign = 'center'; for (let r = -3; r <= 3; r++) { const dx = (r % 2 ? 1 : -1) * (d * 2200 - 250); if (r === 0) { ctx.fillStyle = C.ink; ctx.fillText('LIGHT', -dx * 0.3, 100); } else { ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeText('LIGHT', dx, r * 270 + 100); } } ctx.restore(); }
  else if (k === 2) { bg(ctx, C.bg); const sh = [[300, 420, C.coral, 'c'], [780, 420, C.cobalt, 's'], [300, 1000, C.lime, 't'], [780, 1000, C.paper, 'r']];
    ctx.strokeStyle = hexA(C.paper, 0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, 140); ctx.lineTo(W / 2, 1280); ctx.moveTo(60, 710); ctx.lineTo(W - 60, 710); ctx.stroke();
    sh.forEach(([x, y, col, kind], i) => { const p = E.outBack(P(d, i * 0.03, i * 0.03 + 0.2)); if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate((1 - p) * 1.2); ctx.scale(p, p); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.beginPath(); if (kind === 'c') { ctx.arc(0, 0, 170, 0, TAU); ctx.fill(); } else if (kind === 's') { ctx.rect(-150, -150, 300, 300); ctx.fill(); } else if (kind === 't') { ctx.moveTo(0, -180); ctx.lineTo(160, 110); ctx.lineTo(-160, 110); ctx.closePath(); ctx.fill(); } else { ctx.lineWidth = 34; ctx.arc(0, 0, 150, 0, TAU); ctx.stroke(); } ctx.restore(); }); }
  else if (k === 3) { bg(ctx, C.paper); ctx.save(); ctx.translate(W / 2, 800); ctx.scale(sc, sc); font(ctx, 900, 1250); ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.fillText('L', 0, 440); ctx.restore(); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(W / 2 + 260, 420, 80 * E.outBack(P(d, 0.05, 0.25)), 0, TAU); ctx.fill(); }
  else { bg(ctx, C.bg); cloud(ctx, t, W / 2, 700, { form: 1, explode: E.outExpo(P(t, 34.9, 35.9)) * 0.6, glow: 0.6, colA: [235, 255, 150], colB: [255, 74, 28] }); }
  const ink = k === 2 || k >= 4 ? C.paper : C.ink;
  ctx.fillStyle = k >= 4 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0)';
  maskLine(ctx, 'AND TURN IT', W / 2, 1420, 100, E.outExpo(P(t, L(15, 0), L(15, 0) + 0.3)), ink, 'center');
  maskLine(ctx, 'INTO LIGHT.', W / 2, 1600, 150, E.outExpo(P(t, L(15, 1), L(15, 1) + 0.3)), k >= 4 ? C.lime : ink, 'center');
}
// 16 · 35.9–37.5 · if it means winning
function sWinning(ctx, t) {
  bg(ctx, C.bg);
  const p = E.outExpo(P(t, 36.0, 36.6));
  ctx.strokeStyle = C.coral; ctx.lineWidth = lerp(60, 6, p); ctx.beginPath(); ctx.arc(W / 2, 700, lerp(0, 380, p), 0, TAU); ctx.stroke();
  for (const [x, y, sx, sy] of [[180, 340, 1, 1], [900, 340, -1, 1], [180, 1060, 1, -1], [900, 1060, -1, -1]]) { const k = E.outExpo(P(t, 36.1, 36.6)); ctx.strokeStyle = C.paper; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + sy * 60 * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60 * k, y); ctx.stroke(); }
  mono(ctx, 'COST: ANY', W / 2, 712, t, 36.2, 0.3, C.coral, 34, 'center');
  maskLine(ctx, 'IF IT MEANS', W / 2, 1280, 110, E.outExpo(P(t, L(16, 0), L(16, 0) + 0.4)), C.paper, 'center');
  riseLetters(ctx, 'WINNING', W / 2, 1500, 200, t, L(16, 1), C.coral, 0.04);
}
// 17 · 37.5–41.3 · destroying my own self: the self (cloud) explodes, the type shatters into slices
function sDestroy(ctx, t) {
  bg(ctx, C.bg);
  const d = t - 37.5, ex = E.outExpo(clamp(d / 2.5));
  cloud(ctx, t, W / 2, 680, { form: 1, explode: ex * 0.3, colA: [244, 241, 234], colB: [255, 74, 28] });
  const draw = c => { maskLine(c, "I DON'T MIND", W / 2, 1200, 110, E.outExpo(P(t, L(17, 0), L(17, 0) + 0.4)), C.paper, 'center'); slam(c, 'DESTROYING', W / 2, 1390, 180, t, L(17, 1), C.coral); maskLine(c, 'MY OWN SELF.', W / 2, 1580, 120, E.outExpo(P(t, L(17, 2), L(17, 2) + 0.4)), C.paper, 'center'); };
  const n = 14, sh = 600 / n;
  for (let i = 0; i < n; i++) { const g = Math.sin(t * 31 + i * 7) * 30 * Math.exp(-Math.pow((t - L(17, 1)) * 2, 2)) + (t > 40.1 ? (i % 2 ? 1 : -1) * E.inExpo(P(t, 40.1 + i * 0.01, 40.6)) * 1200 : 0); ctx.save(); ctx.beginPath(); ctx.rect(0, 1080 + i * sh, W, sh + 1); ctx.clip(); ctx.translate(g, 0); draw(ctx); ctx.restore(); }
  mono(ctx, 'OLD SELF: DELETED', W / 2, 1060, t, 38.0, 0.4, C.coral, 28, 'center');
}
// 18–19 · 41.3–45.7 · REBORN. lockup with the coral dot from the opening; counter; collapse to the dot
function sAgain(ctx, t) {
  bg(ctx, C.bg);
  const z = lerp(1.06, 1.0, E.outCubic(P(t, 41.3, 45.7)));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  for (const [dd, col, lw] of [[0, C.lime, 70], [0.08, C.paper, 3]]) { const p = P(t, 41.3 + dd, 42.1 + dd); if (p > 0 && p < 1) { ctx.strokeStyle = col; ctx.lineWidth = lerp(lw, 0.5, E.outCubic(p)); ctx.beginPath(); ctx.arc(W / 2, 760, lerp(0, 900, E.outExpo(p)), 0, TAU); ctx.stroke(); } }
  const size = 210, base = 860, dotR = 26, gap = 14;
  font(ctx, 900, size); const ww = ctx.measureText('REBORN').width, x0 = W / 2 - (ww + gap + dotR * 2) / 2;
  // rebirth cycles: the word re-forms faster each time
  const cycles = [41.4, 43.6, 44.4, 45.05], ci = cycles.filter(c => t >= c).length - 1, c0 = cycles[Math.max(0, ci)];
  const L2 = layoutLetters(ctx, 'REBORN', 0, size); ctx.textAlign = 'left';
  L2.out.forEach((g, i) => { const st = ci === 0 ? 0.05 : 0.015, p = E.outExpo(P(t, c0 + i * st, c0 + i * st + (ci === 0 ? 0.55 : 0.2))); if (p <= 0) return;
    const gx = x0 + (g.x - L2.x0); ctx.save(); ctx.beginPath(); ctx.rect(gx - 20, base - size * 0.86, g.w + 40, size * 1.02); ctx.clip(); ctx.fillStyle = C.paper; ctx.fillText(g.ch, gx, base + (1 - p) * size * 1.02); ctx.restore(); });
  const dp = P(t, 42.0, 42.36), dx = x0 + ww + gap + dotR, restY = base - dotR;
  if (dp > 0) { const y = lerp(-120, restY, E.outBounce(dp)), near = Math.exp(-Math.abs(y - restY) / 14), sq = near * 0.3 * (1 - P(t, 42.36, 42.5)); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.ellipse(dx, y + dotR * sq * 0.5, dotR * (1 + sq), dotR * (1 - sq), 0, 0, TAU); ctx.fill(); }
  const lp = E.outExpo(P(t, 42.1, 42.7)); ctx.fillStyle = hexA(C.paper, 0.35); ctx.fillRect(x0 - 40 - 220 * lp, base - size * 0.36, 220 * lp, 2); ctx.fillRect(x0 + ww + gap + dotR * 2 + 40, base - size * 0.36, 220 * lp, 2);
  maskLine(ctx, "I'LL BE", W / 2, 560, 100, E.outExpo(P(t, L(18, 0), L(18, 0) + 0.4)), C.paper, 'center');
  maskLine(ctx, 'AGAIN', W / 2, 1060, 120, E.outExpo(P(t, L(18, 1) + 0.25, L(18, 1) + 0.65)), C.lime, 'center');
  // counter
  if (t > 43.6) { const n = ci >= 3 ? '∞' : String(ci + 1); font(ctx, 900, 160); ctx.textAlign = 'center'; ctx.fillStyle = C.coral; const k = E.outBack(P(t, c0, c0 + 0.2)); ctx.save(); ctx.translate(W / 2, 1330); ctx.scale(k, k); ctx.fillText('×' + n, 0, 55); ctx.restore(); }
  mono(ctx, 'AS MANY TIMES AS IT TAKES', W / 2, 1500, t, L(19, 0), 0.9, hexA(C.paper, 0.8), 30, 'center');
  ctx.restore();
  const end = E.inCubic(P(t, 45.25, 45.7)); if (end > 0) { ctx.fillStyle = `rgba(10,10,15,${end})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(W / 2, 640, 20 + (1 - end) * 30, 0, TAU); ctx.fill(); }
}

// ───────── HUD (difference-blended over everything) ─────────
const SCENES = [[0, 2.0, sMemory, '00 — MEMORY'], [2.0, 3.7, sAnymore, '01 — LET GO'], [3.7, 5.35, sWin, '02 — WANT'], [5.35, 6.95, sTime, '03 — NOW'],
  [6.95, 9.4, sReborn, '04 — REBORN'], [9.4, 15.3, sDoor, '05 — KNOCK'], [15.3, 17.4, sOne, '06 — THE ONE'], [17.4, 19.5, sChange, '07 — CHANGE'],
  [19.5, 25.85, sLab, '08 — THE PLAN'], [25.85, 30.7, sLight, '09 — LIGHT'], [30.7, 33.4, sDevour, '10 — DEVOUR'], [33.4, 35.9, sStamps, '11 — INTO LIGHT'],
  [35.9, 37.5, sWinning, '12 — WINNING'], [37.5, 41.3, sDestroy, '13 — DESTROY'], [41.3, 45.71, sAgain, '14 — AGAIN']];
const pad = n => String(n).padStart(2, '0');
function hud(ctx, t) {
  const a = E.outCubic(P(t, 0.15, 0.7)) * (1 - P(t, 45.2, 45.5)); if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = 0.8 * a; ctx.fillStyle = C.paper; ctx.strokeStyle = C.paper; ctx.lineWidth = 2;
  font(ctx, 500, 24, MONO); ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('REBORN/REEL', 64, 88);
  const si = SCENES.findIndex(s => t >= s[0] && t < s[1]), s0 = SCENES[Math.max(0, si)];
  ctx.textAlign = 'right'; ctx.fillText(scramble(s0[3], P(t - s0[0], 0, 0.22), si * 131 + Math.floor(t * 30)), W - 64, 88);
  const f = Math.min(DUR * FPS - 1, Math.floor(t * FPS + 1e-6));
  ctx.textAlign = 'left'; ctx.fillText(`TC 00:00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`, 64, H - 84);
  ctx.textAlign = 'right'; ctx.fillText('1080×1920 · 60FPS', W - 64, H - 84);
  ctx.globalAlpha = 0.2 * a; ctx.fillRect(64, H - 62, W - 128, 2); ctx.globalAlpha = 0.85 * a; ctx.fillRect(64, H - 62, (W - 128) * clamp(t / DUR), 2);
  for (const d of DROPS) { const x = 64 + (W - 128) * d / DUR; ctx.fillRect(x - 1, H - 70, 2, 18); }
  const m = 40, l = 26; ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y); }
  ctx.stroke(); ctx.restore();
}

function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const c = cam(t);
  ctx.translate(W / 2 + c.x, H / 2 + c.y); ctx.scale(c.s, c.s); ctx.translate(-W / 2, -H / 2);
  const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
  // designed exits between some scenes
  if (sc[2] === sWin && t > 5.12) slicedExit(ctx, t, 5.12, 0.22, sWin, C.bg);
  else if (sc[2] === sOne && t > 17.15) { sOne(ctx, t); const r = E.inExpo(P(t, 17.15, 17.4)) * 1500; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(W / 2, 640 + 0, r, 0, TAU); ctx.fill(); }
  else if (sc[2] === sChange && t > 19.25) { sChange(ctx, t); const r = E.inExpo(P(t, 19.25, 19.5)) * 1500; ctx.fillStyle = C.cobalt; ctx.beginPath(); ctx.arc(W / 2, 640, r, 0, TAU); ctx.fill(); }
  else sc[2](ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  hud(ctx, t);
  for (const d of DROPS) { const q = t - d; if (q >= 0 && q < 0.45) { ctx.fillStyle = `rgba(255,255,255,${0.75 * Math.exp(-q * 9)})`; ctx.fillRect(0, 0, W, H); } }
}
let NOISE = null;
function post(ctx, frame) {
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256; const n = NOISE.getContext('2d'), id = n.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } n.putImageData(id, 0, 0); }
  const r = rng(frame * 7 + 3);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1;
  const pat = ctx.createPattern(NOISE, 'repeat'); pat.setTransform(new DOMMatrix().translate(Math.floor(r() * 256), Math.floor(r() * 256)));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
const SAMPLES = 3, SHUTTER = 0.5;
const main = document.getElementById('c'); main.width = W; main.height = H; const mctx = main.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H; const sctx = scratch.getContext('2d');
window.drawFrame = function (frame, samples = SAMPLES) {
  const t = frame / FPS;
  for (let i = 0; i < samples; i++) { const ts = clamp(t + ((i + 0.5) / samples - 0.5) * SHUTTER / FPS, 0, DUR - 1e-4); renderScene(sctx, ts); mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0); }
  mctx.globalAlpha = 1; post(mctx, frame);
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/jpeg', 0.93); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`500 24px ${MONO}`)]);
