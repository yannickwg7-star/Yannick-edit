// "When God wants you to grow": designed motion edit.
// Kinetic type, text-mask reveals, beat-synced designed transitions, HUD details.
// Source frames are pushed in per output frame by compose.cjs. No blur effects.
const W = 1080, H = 1920, FPS = 30, DUR = 10.8;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const SANS = '"Inter"', DISP = '"Inter Display"', MONO = '"JetBrains Mono"';
const GOLD = '#ffd27a';
const PX = 0, PY = 420, PW = 1080, PH = 1080;     // picture window
const BEAT = 0.4167;

// cut → designed transition
const CUTS = [
  [3.203, 'punch'], [3.62, 'slice'], [4.037, 'punch'], [4.453, 'slice'],
  [4.87, 'aperture'], [5.70, 'slice'], [6.50, 'iris'], [7.30, 'punch'], [8.17, 'slice'],
  [9.03, 'aperture'], [9.447, 'punch'], [9.863, 'slice'], [10.28, 'mask'],
];
const STORY = [
  [4.87, 'DEPRESSED'], [5.70, 'LONELY'], [6.50, 'TIRED'], [7.30, 'ANXIOUS'], [8.17, 'UNCOMFORTABLE'],
];
const lastCut = t => { let c = null; for (const k of CUTS) if (t >= k[0]) c = k; return c; };

// ───────── helpers ─────────
function font(ctx, w, size, fam = SANS) { ctx.font = `${w} ${size}px ${fam}`; }
function cover(ctx, img, x, y, w, h, s = 1, ox = 0, oy = 0) {
  const k = Math.max(w / img.width, h / img.height) * s;
  ctx.drawImage(img, x + w / 2 - img.width * k / 2 + ox, y + h / 2 - img.height * k / 2 + oy, img.width * k, img.height * k);
}
// letters rising out of a mask, staggered
function riseText(ctx, str, cx, base, size, t, t0, { weight = 900, fam = DISP, color = '#fff', stagger = 0.03, ls = 0, dur = 0.38, shadow = true, maxW = 960 } = {}) {
  font(ctx, weight, size, fam);
  ctx.letterSpacing = ls + 'px';
  let wd = ctx.measureText(str).width;
  if (wd > maxW) { size *= maxW / wd; font(ctx, weight, size, fam); wd = ctx.measureText(str).width; }
  let x = cx - wd / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], cw = ctx.measureText(ch).width;
    const p = E.outExpo(P(t, t0 + i * stagger, t0 + i * stagger + dur));
    if (p > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 10, base - size * 0.95, cw + 20, size * 1.15); ctx.clip();
      const y = base + (1 - p) * size * 1.05;
      if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(ch, x + 4, y + 5); }
      ctx.fillStyle = color; ctx.fillText(ch, x, y);
      ctx.restore();
    }
    x += cw;
  }
  ctx.letterSpacing = '0px';
  return { size, wd };
}

// ───────── picture with designed transitions ─────────
function picture(ctx, img, t, seg) {
  const c = lastCut(t), d = c ? t - c[0] : 99, type = c ? c[1] : 'none';
  let s = 1 + 0.045 * P(t, seg.t0, seg.t1), ox = 0, oy = 0;
  if (type === 'punch') {
    s *= lerp(1.2, 1, E.outExpo(P(d, 0, 0.35)));
    const k = Math.exp(-d * 18) * 9; ox = k * Math.sin(d * 90); oy = k * Math.cos(d * 70);
  }
  if (type === 'iris' || type === 'aperture') s *= lerp(1.1, 1, E.outExpo(P(d, 0, 0.4)));
  if (type === 'slice') s *= lerp(1.06, 1, E.outExpo(P(d, 0, 0.3)));
  const draw = () => {
    ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
    cover(ctx, img, PX, PY, PW, PH, s, ox, oy);
    ctx.restore();
  };
  if (type === 'slice' && d < 0.3) {
    const n = 8, sh = PH / n;
    for (let i = 0; i < n; i++) {
      const q = E.outExpo(P(d, i * 0.014, i * 0.014 + 0.24));
      ctx.save(); ctx.beginPath(); ctx.rect(PX, PY + i * sh, PW, sh + 1); ctx.clip();
      ctx.translate((1 - q) * W * (i % 2 ? 1 : -1), 0); draw(); ctx.restore();
    }
  } else if (type === 'aperture' && d < 0.4) {
    const q = E.outExpo(P(d, 0, 0.32)), hh = PH * q;
    ctx.save(); ctx.beginPath(); ctx.rect(PX, PY + PH / 2 - hh / 2, PW, hh); ctx.clip(); draw(); ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${1 - q})`;
    ctx.fillRect(0, PY + PH / 2 - hh / 2 - 2, W, 3); ctx.fillRect(0, PY + PH / 2 + hh / 2 - 1, W, 3);
  } else if (type === 'iris' && d < 0.4) {
    const r = E.outExpo(P(d, 0, 0.34)) * 820;
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, PY + PH / 2, r, 0, Math.PI * 2); ctx.clip(); draw(); ctx.restore();
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - P(d, 0, 0.34))})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W / 2, PY + PH / 2, r, 0, Math.PI * 2); ctx.stroke();
  } else draw();
  if (d < 0.1) { ctx.fillStyle = `rgba(255,255,255,${0.22 * (1 - d / 0.1)})`; ctx.fillRect(PX, PY, PW, PH); }
}

// ───────── HUD: chapter index, beat ticks, progress, timecode ─────────
function hud(ctx, t) {
  const a = P(t, 3.2, 3.6) * (1 - P(t, 10.28, 10.5));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  font(ctx, 500, 22, MONO); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textBaseline = 'alphabetic';
  let idx, label;
  if (t < 4.87) { idx = '00'; label = 'PROLOGUE'; }
  else if (t < 9.03) { idx = '0' + STORY.filter(s => t >= s[0]).length; label = 'CHAPTER'; }
  else { idx = '06'; label = 'BREAKTHROUGH'; }
  ctx.textAlign = 'left'; ctx.fillText(`${idx} / 06`, 64, PY - 34);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(label, W - 64, PY - 34);
  const y = PY + PH + 46;
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(64, y, W - 128, 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(64, y, (W - 128) * clamp(t / DUR), 2);
  for (let k = 0; k * BEAT + 0.286 < DUR; k++) {
    const bt = k * BEAT + 0.286, x = 64 + (W - 128) * bt / DUR, on = t >= bt;
    const pulse = on ? Math.exp(-(t - bt) * 10) : 0;
    ctx.fillStyle = on ? `rgba(255,${Math.round(210 + 45 * (1 - pulse))},${Math.round(122 + 133 * (1 - pulse))},1)` : 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - 1, y - 6 - pulse * 10, 2, 14 + pulse * 10);
  }
  font(ctx, 500, 18, MONO); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('WHEN GOD WANTS YOU TO GROW', 64, y + 40);
  ctx.textAlign = 'right';
  const f = Math.floor(t * FPS);
  ctx.fillText(`00:${String(Math.floor(f / FPS)).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`, W - 64, y + 40);
  ctx.restore();
}

// ───────── HOOK: line, words on the beat, GROW as a window, zoom through the O ─────────
const TM = document.createElement('canvas'); TM.width = W; TM.height = H;
const tm = TM.getContext('2d');
const MK = document.createElement('canvas'); MK.width = W; MK.height = H;
const mk = MK.getContext('2d');
// paint `img` (via drawFn) into TM, keep only where drawMask paints, composite onto ctx
function masked(ctx, drawImg, drawMask, alpha = 1) {
  tm.setTransform(1, 0, 0, 1, 0, 0); tm.globalCompositeOperation = 'source-over'; tm.clearRect(0, 0, W, H);
  mk.setTransform(1, 0, 0, 1, 0, 0); mk.clearRect(0, 0, W, H);
  tm.save(); drawImg(tm); tm.restore();
  mk.save(); drawMask(mk); mk.restore();
  tm.globalCompositeOperation = 'destination-in'; tm.drawImage(MK, 0, 0); tm.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(TM, 0, 0); ctx.restore();
}
function hook(ctx, t, img) {
  const lp = E.outExpo(P(t, 0.0, 0.5)), fadeAll = 1 - P(t, 2.95, 3.1);
  ctx.save(); ctx.globalAlpha = fadeAll;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(W / 2 - 300 * lp * (1 - P(t, 2.2, 2.4)), 905, 600 * lp * (1 - P(t, 2.2, 2.4)), 2);
  const words = [['WHEN', 0.286], ['GOD', 0.703], ['WANTS', 1.12], ['YOU', 1.536], ['TO', 1.953]];
  font(ctx, 700, 64, SANS); ctx.letterSpacing = '6px';
  const sp = 26, widths = words.map(([w]) => ctx.measureText(w).width);
  const line1 = widths.slice(0, 3).reduce((a, b) => a + b) + sp * 2, line2 = widths.slice(3).reduce((a, b) => a + b) + sp;
  ctx.letterSpacing = '0px';
  let x1 = W / 2 - line1 / 2, x2 = W / 2 - line2 / 2;
  const lift = lerp(0, -300, E.inOutCubic(P(t, 2.2, 2.55)));   // the words make room for GROW
  words.forEach(([w, t0], i) => {
    const on2 = i >= 3, x = on2 ? x2 : x1, base = on2 ? 990 : 880;
    ctx.save(); ctx.translate(0, lift);
    riseText(ctx, w, x + widths[i] / 2, base, 64, t, t0, { weight: 700, fam: SANS, stagger: 0.02, ls: 6, dur: 0.35 });
    ctx.restore();
    if (on2) x2 += widths[i] + sp; else x1 += widths[i] + sp;
  });
  ctx.restore();
  // GROW: the clip plays inside the letters, then we zoom through the O
  if (t >= 2.37 && img) {
    const z = 1 + E.inExpo(P(t, 2.88, 3.203)) * 60;
    font(tm, 900, 300, DISP);
    const gw = tm.measureText('GROW').width, gx = W / 2 - gw / 2, base = 1100;
    const oX = gx + tm.measureText('GR').width + tm.measureText('O').width * 0.1, oY = base - 110;
    const rise = E.outExpo(P(t, 2.37, 2.75));
    masked(ctx, c => cover(c, img, 0, 0, W, H, lerp(1.25, 1.0, rise) * (1 + 0.04 * P(t, 2.37, 3.2))), m => {
      m.translate(oX, oY); m.scale(z, z); m.translate(-oX, -oY);
      m.beginPath(); m.rect(gx - 20, base - 300 * 0.78, gw + 40, 300 * 0.82); m.clip();
      font(m, 900, 300, DISP); m.fillStyle = '#fff'; m.textBaseline = 'alphabetic'; m.fillText('GROW', gx, base + (1 - rise) * 260);
    });
    ctx.save(); ctx.translate(oX, oY); ctx.scale(z, z); ctx.translate(-oX, -oY);
    ctx.beginPath(); ctx.rect(gx - 20, base - 300 * 0.78, gw + 40, 300 * 0.82); ctx.clip();
    font(ctx, 900, 300, DISP); ctx.lineWidth = 2 / z; ctx.strokeStyle = `rgba(255,210,122,${0.9 * (1 - P(t, 2.9, 3.05))})`;
    ctx.textBaseline = 'alphabetic'; ctx.strokeText('GROW', gx, base + (1 - rise) * 260);
    ctx.restore();
  }
}

// ───────── story captions ─────────
function storyText(ctx, t) {
  const cur = STORY.filter(s => t >= s[0]).pop();
  if (!cur) return;
  const [t0, word] = cur;
  riseText(ctx, 'THEY MAKE YOU', W / 2, 905, 40, t, t0, { weight: 600, fam: SANS, stagger: 0.012, ls: 10, dur: 0.3 });
  riseText(ctx, word, W / 2, 1050, 150, t, t0 + 0.06, { stagger: 0.028, dur: 0.4, maxW: 940 });
  const u = E.outExpo(P(t, t0 + 0.1, t0 + 0.45));
  ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - 60 * u, 1082, 120 * u, 4);
}

// ───────── finale: BUT THEY / NEVER / MAKE YOU FAIL, then the last clip inside NEVER ─────────
function finale(ctx, t, img) {
  const m = P(t, 10.28, 10.42);
  font(ctx, 900, 270, DISP);
  const nw = ctx.measureText('NEVER').width, nx = W / 2 - nw / 2, nb = 1075;
  if (m > 0 && img) {
    masked(ctx, c => cover(c, img, 0, 600, W, 700, lerp(1.0, 1.08, P(t, 10.28, 10.8))), mm => {
      font(mm, 900, 270, DISP); mm.fillStyle = '#fff'; mm.textBaseline = 'alphabetic'; mm.fillText('NEVER', nx, nb);
    }, m);
    font(ctx, 900, 270, DISP); ctx.lineWidth = 3; ctx.strokeStyle = GOLD; ctx.textBaseline = 'alphabetic';
    ctx.strokeText('NEVER', nx, nb);
  }
  riseText(ctx, 'BUT THEY', W / 2, 800, 52, t, 9.05, { weight: 700, fam: SANS, stagger: 0.02, ls: 14, dur: 0.35 });
  if (m < 1) {
    ctx.save(); ctx.globalAlpha = 1 - m;
    const pop = lerp(1.25, 1, E.outBack(P(t, 9.447, 9.75)));
    ctx.translate(W / 2, nb - 100); ctx.scale(pop, pop); ctx.translate(-W / 2, -(nb - 100));
    riseText(ctx, 'NEVER', W / 2, nb, 270, t, 9.447, { color: GOLD, stagger: 0.035, dur: 0.38 });
    ctx.restore();
  }
  riseText(ctx, 'MAKE YOU FAIL.', W / 2, 1185, 52, t, 9.863, { weight: 700, fam: SANS, stagger: 0.018, ls: 14, dur: 0.35 });
  const r = E.outExpo(P(t, 9.9, 10.4));
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(64, 730, 220 * r, 2); ctx.fillRect(W - 64 - 220 * r, 730, 220 * r, 2);
  ctx.fillRect(64, 1230, 220 * r, 2); ctx.fillRect(W - 64 - 220 * r, 1230, 220 * r, 2);
}

// ───────── frame ─────────
function renderScene(ctx, t, img, seg) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < 3.203) hook(ctx, t, seg && seg.kind === 'grow' ? img : null);
  else {
    const inMask = t >= 10.28;
    if (img && !inMask) picture(ctx, img, t, seg);
    if (t < 4.87) {   // one word per flash
      const fw = [[3.203, 'PAIN'], [3.62, 'LOSS'], [4.037, 'DOUBT'], [4.453, 'FEAR']].filter(f => t >= f[0]).pop();
      if (fw) riseText(ctx, fw[1], W / 2, 1035, 190, t, fw[0], { stagger: 0.025, dur: 0.3 });
    }
    if (t >= 4.87 && t < 9.03) storyText(ctx, t);
    if (t >= 9.03) {
      if (!inMask) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(PX, PY, PW, PH); }
      finale(ctx, t, img);
    }
    hud(ctx, t);
  }
  const f = P(t, DUR - 0.25, DUR);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}

const main = document.getElementById('c'); main.width = W; main.height = H;
const mctx = main.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
const sctx = scratch.getContext('2d');
let NOISE;
function post(frame) {
  if (!NOISE) {
    NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256;
    const n = NOISE.getContext('2d'), id = n.createImageData(256, 256);
    let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    n.putImageData(id, 0, 0);
  }
  mctx.save();
  mctx.globalCompositeOperation = 'overlay'; mctx.globalAlpha = 0.06;
  const pat = mctx.createPattern(NOISE, 'repeat');
  pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256));
  mctx.fillStyle = pat; mctx.fillRect(0, 0, W, H);
  mctx.restore();
}
window.renderFrame = async function (frame, dataUrl, seg) {
  let img = null;
  if (dataUrl) { img = new Image(); img.src = dataUrl; await img.decode(); }
  const t = frame / FPS, S = 3;
  for (let i = 0; i < S; i++) {
    const ts = t + ((i + 0.5) / S - 0.5) * 0.5 / FPS;
    renderScene(sctx, Math.max(0, ts), img, seg);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
  post(frame);
  return main.toDataURL('image/png');
};
window.ready = Promise.all([
  document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 64px ${SANS}`),
  document.fonts.load(`600 40px ${SANS}`), document.fonts.load(`500 22px ${MONO}`),
]);
