// "1% BETTER EVERY DAY": explainer motion piece, 1080x1920, 16s.
// One continuous camera through a single world: a cube becomes the first step,
// the steps grow exponentially, the staircase morphs into the 1.01^x curve, the
// curve fills into a mountain, and the camera dives back into the first cube (loop).
const W = 1080, H = 1920, FPS = 30, DUR = 16;
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
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const wob = (d, k = 7, w = 18) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(w * d);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = { bg0: '#0A0C26', bg1: '#1D1448', hero: '#4FD1FF', heroD: '#1C7FB8', heroL: '#B8EEFF', warm: '#FFB547', red: '#FF5A6E', ink: '#F4F6FF', dim: '#8C8FC4', grey: '#4A4C7A' };
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';

// ───────── the exponential staircase ─────────
const N = 40, SW = 26, A = 22, DEPTH = 12;
const stepTop = i => 10 + A * (Math.pow(1.01, (i + 1) * 365 / N) - 1);   // top height of step i
const curveY = x => 10 + A * (Math.pow(1.01, clamp(x / (N * SW), 0, 1) * 365) - 1);

// timeline (seconds) ─ matches the script
const K = { cube: 0.2, step: 1.2, slow: 2.6, year: 6.4, graph: 8.6, big: 10.6, mount: 12.6, dive: 15.35 };

// steps built and steps climbed over time
function built(t) {
  if (t < K.step) return 1;
  if (t < K.year) return 1 + Math.floor(lerp(0, 3, P(t, K.slow, K.year - 0.2)));
  return Math.min(N, 4 + Math.floor((N - 4) * E.inOutCubic(P(t, K.year, K.graph - 0.3))));
}
function climbed(t) {   // continuous step position of the hero
  if (t < K.slow + 0.4) return -1.6 + 1.6 * E.inOutCubic(P(t, K.step + 0.3, K.slow + 0.4));
  if (t < K.year) return lerp(0, 3, P(t, K.slow + 0.4, K.year));
  return lerp(3, N - 1, E.inOutCubic(P(t, K.year + 0.2, K.graph + 0.2)));
}
const dayOf = t => t < K.step ? 1 : t < K.year ? Math.max(1, Math.round(lerp(1, 30, P(t, K.slow, K.year - 0.2)))) : Math.round(lerp(30, 365, E.inOutCubic(P(t, K.year, K.graph - 0.3))));

// ───────── camera keyframes (world centre x, y; zoom) ─────────
function heroPos(t) {
  const c = climbed(t);
  if (c < 0) return [c * SW + SW / 2, 0];
  const i = Math.floor(c), f = c - i;
  const x = lerp(i * SW + SW / 2, (i + 1) * SW + SW / 2, f);
  const y0 = stepTop(i), y1 = i + 1 < N ? stepTop(i + 1) : stepTop(i);
  const hop = Math.sin(Math.PI * f) * 8;
  return [x, lerp(y0, y1, E.inOutCubic(f)) + hop];
}
function camera(t) {
  const [hx, hy] = heroPos(t);
  let x, y, z;
  if (t < K.step) { x = SW / 2; y = 12; z = lerp(9, 6.5, E.outCubic(P(t, 0, K.step))); }
  else if (t < K.year) {
    const k = E.inOutCubic(P(t, K.step, K.step + 1.0));
    x = lerp(SW / 2, hx + 20, k); y = lerp(12, hy + 40, k); z = lerp(6.5, 5.2, k);
  } else if (t < K.graph) {
    const k = E.inOutCubic(P(t, K.year, K.graph));
    const nb = built(t), cx = nb * SW / 2 + 20, cy = stepTop(Math.max(0, nb - 1)) / 2 + 60;
    x = lerp(hx + 20, cx, k); y = lerp(hy + 40, cy, k);
    z = Math.min(lerp(5.2, 1.05, E.inOutCubic(P(t, K.year, K.graph - 0.4))), 900 / (nb * SW + 120), 1300 / (stepTop(Math.max(0, nb - 1)) + 260));
    const kk = E.inOutCubic(P(t, K.graph - 0.8, K.graph));
    x = lerp(x, N * SW / 2 + 40, kk); y = lerp(y, stepTop(N - 1) / 2 + 60, kk); z = lerp(z, 0.95, kk);
  } else if (t < K.mount) {
    // ride the curve with the marker
    const u = E.inOutCubic(P(t, K.graph + 0.3, K.big));
    const mx = u * N * SW, my = curveY(mx);
    const k = E.inOutCubic(P(t, K.graph, K.graph + 0.5)), back = E.inOutCubic(P(t, K.big + 0.4, K.mount));
    x = lerp(N * SW / 2 + 40, lerp(mx, N * SW / 2 + 40, back), k); y = lerp(stepTop(N - 1) / 2 + 60, lerp(my + 60, stepTop(N - 1) / 2 + 100, back), k);
    z = lerp(0.95, lerp(1.7, 0.95, back), k);
  } else if (t < K.dive) {
    const k = E.inOutCubic(P(t, K.mount, K.mount + 1.2));
    x = N * SW / 2 + 40; y = lerp(stepTop(N - 1) / 2 + 100, stepTop(N - 1) / 2 + 40, k); z = lerp(0.95, 0.8, k);
  } else {   // dive back into the first cube: the loop point
    const k = E.inExpo(P(t, K.dive, DUR));
    x = lerp(N * SW / 2 + 40, SW / 2, E.inOutCubic(P(t, K.dive, DUR))); y = lerp(stepTop(N - 1) / 2 + 40, 12, E.inOutCubic(P(t, K.dive, DUR)));
    z = lerp(0.8, 9, k);
  }
  return { x, y, z };
}

// ───────── drawing primitives (world coords: y up) ─────────
function block(ctx, x, y0, w, h, col, colTop, colSide, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = colSide; ctx.beginPath(); ctx.moveTo(x + w, -y0); ctx.lineTo(x + w + DEPTH, -y0 - DEPTH * 0.6); ctx.lineTo(x + w + DEPTH, -(y0 + h) - DEPTH * 0.6); ctx.lineTo(x + w, -(y0 + h)); ctx.fill();
  ctx.fillStyle = colTop; ctx.beginPath(); ctx.moveTo(x, -(y0 + h)); ctx.lineTo(x + DEPTH, -(y0 + h) - DEPTH * 0.6); ctx.lineTo(x + w + DEPTH, -(y0 + h) - DEPTH * 0.6); ctx.lineTo(x + w, -(y0 + h)); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(x, -(y0 + h), w, h);
  ctx.globalAlpha = 1;
}
// faceless hero: pill body, round head, swinging limbs
function hero(ctx, x, y, s, phase, col = C.hero, colD = C.heroD, pose = 'walk') {
  ctx.save(); ctx.translate(x, -y); ctx.scale(s, s);
  const sw = pose === 'walk' ? Math.sin(phase) : 0;
  ctx.lineCap = 'round'; ctx.strokeStyle = colD; ctx.lineWidth = 3.4;
  const leg = (a) => { ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(Math.sin(a) * 6, 0); ctx.stroke(); };
  leg(sw * 0.7); leg(-sw * 0.7);
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-5, -27, 10, 17, 5); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 3;
  if (pose === 'flag') { ctx.beginPath(); ctx.moveTo(3, -24); ctx.lineTo(9, -34); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(-8, -17); ctx.stroke(); }
  else { const arm = (a) => { ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(Math.sin(a) * 6, -15); ctx.stroke(); }; arm(-sw * 0.8); arm(sw * 0.8); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -32, 5, 0, TAU); ctx.fill();
  ctx.restore();
}
function bystander(ctx, x, s, t, i) {   // grey figure looking down at a glowing phone
  ctx.save(); ctx.translate(x, 0); ctx.scale(s, s);
  ctx.fillStyle = C.grey; ctx.strokeStyle = C.grey; ctx.lineCap = 'round'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(-3, 0); ctx.moveTo(2, -11); ctx.lineTo(3, 0); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-5, -27, 10, 17, 5); ctx.fill();
  ctx.beginPath(); ctx.arc(1.5, -31, 5, 0, TAU); ctx.fill();
  const glow = 0.6 + 0.4 * Math.sin(t * 3 + i);
  ctx.fillStyle = `rgba(160,220,255,${glow})`; ctx.fillRect(4, -23, 4, 6);
  ctx.globalAlpha = 0.25 * glow; ctx.beginPath(); ctx.arc(6, -26, 9, 0, TAU); ctx.fill();
  ctx.restore();
}

// ───────── background: gradient, parallax dust, graph paper ─────────
const DUST = (() => { const r = rng(4); return Array.from({ length: 90 }, () => ({ x: r() * 3000 - 1000, y: r() * 3000 - 1000, s: r(), d: 0.2 + r() * 0.6 })); })();
function backdrop(ctx, t, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft light behind the action
  const rg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, 900);
  rg.addColorStop(0, 'rgba(79,209,255,0.10)'); rg.addColorStop(1, 'rgba(79,209,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  // parallax dust: further = slower
  for (const p of DUST) {
    const sx = ((p.x - cam.x * p.d * 2) % 1400 + 1400) % 1400 - 160, sy = ((p.y + cam.y * p.d * 2 + t * 12 * p.d) % 2200 + 2200) % 2200 - 140;
    ctx.fillStyle = `rgba(184,238,255,${0.08 + 0.18 * p.s})`; ctx.beginPath(); ctx.arc(sx, sy, 1 + p.s * 2.5, 0, TAU); ctx.fill();
  }
}

// ───────── world ─────────
function world(ctx, t, cam) {
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, cam.y);
  const lw = 1 / cam.z;
  const g = P(t, K.graph, K.graph + 0.8);              // graph mode
  const m = E.inOutCubic(P(t, K.mount, K.mount + 1.2)); // mountain mode
  // ground line
  ctx.strokeStyle = 'rgba(140,143,196,0.5)'; ctx.lineWidth = 2 * lw;
  ctx.beginPath(); ctx.moveTo(-2000, 0); ctx.lineTo(3000, 0); ctx.stroke();
  // graph paper + axes
  if (g > 0) {
    ctx.save(); ctx.globalAlpha = g * (1 - m * 0.7);
    ctx.strokeStyle = 'rgba(140,143,196,0.14)'; ctx.lineWidth = lw;
    for (let x = 0; x <= N * SW + 1; x += N * SW / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -stepTop(N - 1) - 60); ctx.stroke(); }
    for (let y = 0; y <= stepTop(N - 1) + 60; y += 100) { ctx.beginPath(); ctx.moveTo(0, -y); ctx.lineTo(N * SW, -y); ctx.stroke(); }
    ctx.strokeStyle = C.dim; ctx.lineWidth = 2.5 * lw;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(N * SW + 30, 0); ctx.moveTo(-20, 0); ctx.lineTo(-20, -stepTop(N - 1) - 80); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = `600 ${18}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('DAYS →', N * SW - 70, 28); ctx.fillText('365', N * SW - 18, 52);
    ctx.save(); ctx.translate(-34, -stepTop(N - 1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('YOU', 0, 0); ctx.restore();
    ctx.restore();
  }
  // mountain fill under the curve + back ranges (parallax silhouettes)
  if (m > 0) {
    ctx.save(); ctx.globalAlpha = m;
    for (const [off, sc, col] of [[-260, 0.7, 'rgba(40,30,100,0.9)'], [520, 0.55, 'rgba(50,38,120,0.9)']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(off - 400, 0);
      for (let x = 0; x <= N * SW; x += 20) ctx.lineTo(off + x * 0.9, -curveY(x) * sc * (0.6 + 0.4 * Math.sin(x * 0.01 + off)));
      ctx.lineTo(off + N * SW + 400, 0); ctx.fill();
    }
    const mg = ctx.createLinearGradient(0, -stepTop(N - 1), 0, 0);
    mg.addColorStop(0, 'rgba(79,209,255,0.55)'); mg.addColorStop(1, 'rgba(28,127,184,0.05)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x <= N * SW; x += 6) ctx.lineTo(x, -curveY(x));
    ctx.lineTo(N * SW + 260, 0); ctx.fill();
    ctx.restore();
  }
  // staircase (fades as it morphs into the curve)
  const nb = built(t), fade = 1 - E.inOutCubic(P(t, K.graph + 0.2, K.graph + 1.2));
  if (fade > 0) for (let i = 0; i < nb; i++) {
    const bt = i === 0 ? K.cube : (i < 4 ? lerp(K.slow, K.year, i / 4) : lerp(K.year, K.graph - 0.3, E.inOutCubic((i - 4) / (N - 4)) ));
    const pop = i === 0 ? E.outBack(P(t, K.cube, K.cube + 0.45)) : E.outBack(P(t, bt, bt + 0.25));
    if (pop <= 0) continue;
    const j = i === 0 ? wob(t - K.cube, 6, 20) : wob(t - bt, 8, 22);
    const h = stepTop(i) * pop, w = SW * (1 + 0.25 * j);
    const hl = i === 0 && t < K.step + 0.5 ? 1 : 0;
    block(ctx, i * SW - (w - SW) / 2, 0, w - 2, h, hl ? C.warm : C.hero, hl ? '#FFE0A3' : C.heroL, hl ? '#C9852A' : C.heroD, fade);
  }
  // the first cube returns so the camera can dive back into it (seamless loop)
  const back = E.outBack(P(t, K.dive - 0.5, K.dive - 0.1));
  if (back > 0) block(ctx, 0, 0, SW - 2, stepTop(0) * back, C.warm, '#FFE0A3', '#C9852A');
  // "1%" label on the first cube
  const lab = E.outBack(P(t, K.cube + 0.3, K.cube + 0.6)) * (1 - P(t, K.step + 0.4, K.step + 0.7));
  if (lab > 0) {
    ctx.save(); ctx.translate(SW / 2 - 1, -stepTop(0) - 16); ctx.scale(lab, lab);
    ctx.font = `800 9px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.fillText('+1%', 0, 0);
    ctx.restore();
  }
  // the curve itself, drawn on by the marker
  if (t >= K.graph) {
    const draw = E.inOutCubic(P(t, K.graph + 0.3, K.big));
    const xe = draw * N * SW;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [lwid, col] of [[14, 'rgba(79,209,255,0.18)'], [7, 'rgba(79,209,255,0.45)'], [3.5, C.heroL]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lwid * lw * cam.z * 0.75;
      ctx.beginPath(); for (let x = 0; x <= xe; x += 3) x ? ctx.lineTo(x, -curveY(x)) : ctx.moveTo(0, -curveY(0)); ctx.stroke();
    }
    // marker with live multiplier
    if (t < K.mount + 0.6) {
      const mx = xe, my = curveY(mx), mult = Math.pow(1.01, clamp(mx / (N * SW)) * 365);
      const a = 1 - P(t, K.mount, K.mount + 0.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = C.warm; ctx.beginPath(); ctx.arc(mx, -my, 8 * lw * cam.z * 0.75, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,181,71,0.5)'; ctx.lineWidth = 2 * lw;
      ctx.beginPath(); ctx.arc(mx, -my, (14 + 6 * Math.sin(t * 8)) * lw * cam.z * 0.75, 0, TAU); ctx.stroke();
      ctx.font = `700 ${16 / cam.z * 1.8}px ${MONO}`; ctx.fillStyle = C.warm; ctx.textAlign = 'right';
      ctx.fillText(`${mult.toFixed(2)}×`, mx - 16, -my - 14);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // bystanders on their phones (nobody notices)
  const by = P(t, K.slow - 0.2, K.slow + 0.3) * (1 - P(t, K.year + 0.6, K.year + 1.2));
  if (by > 0) { ctx.save(); ctx.globalAlpha = by; [-150, -122, -96, -64].forEach((x, i) => bystander(ctx, x, 1.0, t, i)); ctx.restore(); }
  // the hero
  const [hx, hy] = heroPos(t);
  const mHero = m > 0;
  if (!mHero) {
    const ph = climbed(t) * Math.PI * 2;
    if (t < K.graph + 0.6) { ctx.save(); ctx.globalAlpha = 1 - P(t, K.graph + 0.2, K.graph + 0.6); hero(ctx, hx, hy, 1, ph); ctx.restore(); }
  } else {
    const px = N * SW - 10, py = curveY(N * SW - 10), up = E.outBack(P(t, K.mount + 0.6, K.mount + 1.1));
    if (up > 0) {
      ctx.save(); ctx.globalAlpha = clamp(up);
      hero(ctx, px, py + (1 - up) * 30, 1.6, 0, C.hero, C.heroD, 'flag');
      // flag
      const fw = wob(t - K.mount - 1.0, 3, 9);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * lw * cam.z * 0.6; ctx.beginPath(); ctx.moveTo(px + 15, -py - 52); ctx.lineTo(px + 15, -py - 100); ctx.stroke();
      ctx.fillStyle = C.warm; ctx.beginPath(); ctx.moveTo(px + 15, -py - 100); ctx.quadraticCurveTo(px + 40, -py - 96 + fw * 6, px + 60, -py - 92); ctx.lineTo(px + 15, -py - 80); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

// ───────── screen-space UI: day counter, equation, kinetic words ─────────
function dayCard(ctx, t) {
  const a = P(t, K.slow - 0.2, K.slow + 0.2) * (1 - P(t, K.graph + 0.2, K.graph + 0.6));
  if (a <= 0) return;
  const day = dayOf(t);
  ctx.save(); ctx.globalAlpha = a;
  const x = W / 2, y = 300, w = 300, h = 150;
  ctx.fillStyle = 'rgba(244,246,255,0.95)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 22); ctx.fill();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, 40, [22, 22, 0, 0]); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 22px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', x, y - h / 2 + 21);
  // flip: the number drops in each time it changes
  ctx.fillStyle = '#16183A'; ctx.font = `900 80px ${DISP}`; ctx.fillText(String(day), x, y + 22);
  ctx.restore();
}
function equation(ctx, t) {
  const a = E.outCubic(P(t, K.graph + 0.6, K.graph + 1.0)) * (1 - P(t, K.mount + 0.2, K.mount + 0.6));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const full = '1.01³⁶⁵ = 37.8', n = Math.floor(full.length * P(t, K.graph + 0.6, K.graph + 1.6));
  ctx.font = `700 52px ${MONO}`; ctx.fillStyle = C.ink;
  const tw = ctx.measureText(full).width;
  ctx.textAlign = 'left'; ctx.fillText(full.slice(0, n) + (n < full.length && Math.floor(t * 4) % 2 ? '_' : ''), W / 2 - tw / 2, 330);
  ctx.restore();
}
const WORDS = [
  [0.30, 'IF'], [0.52, 'YOU'], [0.72, 'GET'], [0.92, 'JUST'], [1.18, '1%', 'big'], [1.70, 'BETTER'], [2.00, 'EVERY'], [2.30, 'DAY…'],
  [3.00, 'NOBODY', 'red'], [3.35, 'WILL'], [3.60, 'NOTICE.'],
  [4.30, 'NOT'], [4.48, 'IN'], [4.62, 'A'], [4.78, 'WEEK.'],
  [5.30, 'NOT'], [5.48, 'IN'], [5.62, 'A'], [5.78, 'MONTH.'],
  [6.45, 'BUT', 'warm'], [6.75, 'AFTER'], [7.05, 'ONE'], [7.35, 'YEAR…', 'warm'],
  [8.70, "YOU'RE"], [8.95, 'NOT'], [9.20, '1%'], [9.55, 'BETTER.'],
  [10.20, "YOU'RE"], [10.60, '37×', 'huge'], [11.50, 'BETTER.'],
  [12.80, 'SMALL'], [13.15, 'STEPS.'], [13.90, 'EVERY'], [14.25, 'DAY.', 'warm'],
];
function kinetic(ctx, t) {
  let cur = null, next = null;
  for (let i = 0; i < WORDS.length; i++) if (t >= WORDS[i][0]) { cur = WORDS[i]; next = WORDS[i + 1]; }
  if (!cur || t > 15.2) return;
  const [t0, w, kind] = cur, d = t - t0;
  const size = kind === 'huge' ? 300 : kind === 'big' ? 220 : 120;
  const col = kind === 'red' ? C.red : kind === 'warm' ? C.warm : kind === 'huge' || kind === 'big' ? C.hero : C.ink;
  const pop = E.outBack(P(d, 0, 0.18)), sq = wob(d, 9, 26);
  ctx.save(); ctx.translate(W / 2, 1480); ctx.scale(lerp(0.6, 1, pop) * (1 + 0.12 * sq), lerp(0.6, 1, pop) * (1 - 0.12 * sq));
  ctx.font = `900 ${size}px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = clamp(d / 0.04);
  ctx.fillStyle = 'rgba(5,6,20,0.55)'; ctx.fillText(w, 6, 10);
  ctx.fillStyle = col; ctx.fillText(w, 0, 0);
  ctx.restore();
  // the 37× moment: ring shockwave + sparks
  if (kind === 'huge') {
    const r = E.outExpo(P(d, 0, 0.7));
    ctx.strokeStyle = `rgba(79,209,255,${1 - r})`; ctx.lineWidth = 10 * (1 - r);
    ctx.beginPath(); ctx.arc(W / 2, 1480, 120 + r * 600, 0, TAU); ctx.stroke();
    const rr = rng(37);
    for (let i = 0; i < 40; i++) {
      const a = rr() * TAU, sp = 300 + rr() * 900, k = E.outExpo(P(d, 0, 0.9));
      ctx.fillStyle = `rgba(255,${180 + rr() * 60},90,${1 - P(d, 0.2, 0.9)})`;
      ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * sp * k, 1480 + Math.sin(a) * sp * k, 3 + rr() * 5, 0, TAU); ctx.fill();
    }
  }
}

// ───────── frame ─────────
function renderScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const cam = camera(t);
  // a small kick on the big moment
  const d = t - K.big;
  if (d > 0 && d < 0.5) { const k = Math.exp(-d * 10) * 14; ctx.translate(k * Math.sin(d * 90), k * Math.cos(d * 70)); }
  backdrop(ctx, t, cam);
  world(ctx, t, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  dayCard(ctx, t);
  equation(ctx, t);
  kinetic(ctx, t);
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

const main = document.getElementById('c'); main.width = W; main.height = H;
const mctx = main.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
const sctx = scratch.getContext('2d');
window.drawFrame = function (frame, S = 4) {
  const t = frame / FPS;
  for (let i = 0; i < S; i++) {
    const ts = clamp(t + ((i + 0.5) / S - 0.5) * 0.5 / FPS, 0, DUR - 1e-4);
    renderScene(sctx, ts);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
};
window.renderFrame = f => { window.drawFrame(f); return main.toDataURL('image/png'); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 40px ${MONO}`)]);
