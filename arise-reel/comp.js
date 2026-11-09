// Solo Leveling study edit: beat-synced cuts with varied hits, stacked kinetic words, ARISE finale.
const W = 1080, H = 1920, FPS = 30, DUR = 11.67;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const HB = 0.233, T = j => 0.008 + HB * j;
const DROP = T(16), PUSH = T(36), ARISE = T(44);
const DISP = '"Inter Display"';

// words: [beat index, text]; a new phrase starts where `p` is set
const WORDS = [
  [0, 'WHILE', 1], [2, 'THEY'], [4, 'SLEEP'],
  [6, 'YOU', 1], [8, 'STUDY.'],
  [10, 'THEY', 1], [12, 'CALL YOU'], [14, 'WEAK.'],
  [16, 'BUT', 1], [17, 'EVERY'], [18, 'PAGE'],
  [20, 'IS', 1], [21, 'A'], [22, 'LEVEL UP.'],
  [24, 'NO', 1], [26, 'EXCUSES.'],
  [28, 'THE WEAK', 1], [30, 'STAY'], [32, 'WEAK.'],
  [34, 'YOU', 1], [36, 'LEVEL UP'],
  [38, 'EVERY', 1], [40, 'SINGLE'], [42, 'DAY.'],
  [44, 'ARISE.', 1],
].map(([j, w, p]) => ({ t: j === 0 ? 0 : T(j), w, p: !!p }));

// ───────── RGB split helper ─────────
const CH = ['#ff0000', '#00ff00', '#0000ff'].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
function rgbSplit(ctx, src, amt) {
  ['#ff0000', '#00ff00', '#0000ff'].forEach((col, i) => {
    const c = CH[i].getContext('2d');
    c.globalCompositeOperation = 'source-over'; c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = col; c.fillRect(0, 0, W, H);
  });
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(CH[0], amt, 0); ctx.drawImage(CH[1], 0, 0); ctx.drawImage(CH[2], -amt, amt * 0.4);
  ctx.restore();
}

// ───────── picture with a different hit per cut ─────────
const HITS = ['punch', 'ramp', 'tilt', 'whipL', 'shake', 'punch', 'whipR', 'ramp', 'tilt', 'shake'];
const PIC = document.createElement('canvas'); PIC.width = W; PIC.height = H; const pc = PIC.getContext('2d');
function picture(ctx, img, t, seg, idx) {
  const d = Math.max(0, t - seg.t0), len = seg.t1 - seg.t0;
  let s = 1, rot = 0, ox = 0, oy = 0;
  if (seg.part === 'intro') { s = lerp(1.07, 1.0, E.outCubic(P(d, 0, 0.45))) * (1 + 0.03 * d / len); }
  else if (seg.part === 'arise') { s = lerp(1.0, 1.14, d / len) * lerp(1.1, 1, E.outExpo(P(d, 0, 0.3))); }
  else {
    const hit = (t >= DROP && t < DROP + HB) || (t >= PUSH && t < PUSH + HB) ? 'big' : HITS[idx % HITS.length];
    const q = E.outExpo(P(d, 0, 0.2));
    if (hit === 'punch') s = lerp(1.2, 1.0, q);
    if (hit === 'ramp') s = 1.0 + 0.12 * (d / len);
    if (hit === 'tilt') { rot = lerp(0.07 * (idx % 2 ? 1 : -1), 0, q); s = 1.1; }
    if (hit === 'whipL' || hit === 'whipR') { ox = (1 - q) * 260 * (hit === 'whipL' ? -1 : 1); s = 1.06; }
    if (hit === 'shake' || hit === 'big') { const k = Math.exp(-d * 14) * (hit === 'big' ? 34 : 16); ox = k * Math.sin(d * 95); oy = k * Math.cos(d * 80); s = hit === 'big' ? lerp(1.25, 1.03, q) : 1.08; }
  }
  pc.setTransform(1, 0, 0, 1, 0, 0); pc.fillStyle = '#000'; pc.fillRect(0, 0, W, H);
  pc.translate(W / 2 + ox, H / 2 + oy); pc.rotate(rot); pc.scale(s, s); pc.translate(-W / 2, -H / 2);
  pc.drawImage(img, 0, 0, W, H);
  // RGB split on the two big hits and briefly on every 4th fast cut
  const big = (t >= DROP && t < DROP + 0.2) || (t >= PUSH && t < PUSH + 0.2);
  const small = seg.part !== 'intro' && seg.part !== 'arise' && idx % 4 === 0 && d < 0.1;
  if (big || small) rgbSplit(ctx, PIC, (big ? 26 : 12) * (1 - d / 0.2));
  else ctx.drawImage(PIC, 0, 0);
}

// ───────── stacked kinetic words ─────────
function words(ctx, t) {
  let start = 0;
  WORDS.forEach((w, i) => { if (w.p && t >= w.t) start = i; });
  let stop = WORDS.findIndex((w, i) => i > start && w.p);
  if (stop < 0) stop = WORDS.length;
  const lines = WORDS.slice(start, stop).filter(w => t >= w.t);
  if (!lines.length) return;
  const arise = lines[0].w === 'ARISE.';
  const sizes = lines.map(w => {
    let size = arise ? 230 : w.w.length <= 4 ? 190 : 150;
    ctx.font = `900 ${size}px ${DISP}`;
    const tw = ctx.measureText(w.w).width;
    if (tw > 960) size *= 960 / tw;
    return size;
  });
  const lh = sizes.map(s => s * 0.98), total = lh.reduce((a, b) => a + b, 0);
  let y = 980 - total / 2;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((w, i) => {
    const d = t - w.t, pop = E.outBack(P(d, 0, 0.16));
    const s = lerp(1.45, 1, pop), size = sizes[i];
    ctx.save(); ctx.translate(W / 2, y + lh[i] / 2); ctx.scale(s, s); ctx.globalAlpha = clamp(d / 0.05);
    ctx.font = `900 ${size}px ${DISP}`;
    if (arise) ctx.letterSpacing = '8px';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(w.w, 5, -lh[i] / 2 + 7);
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineJoin = 'round'; ctx.strokeText(w.w, 0, -lh[i] / 2);
    ctx.fillStyle = arise ? '#bfe6ff' : '#ffffff';
    if (arise && Math.sin(t * 60) > 0.6 && d < 0.4) ctx.fillStyle = '#ffffff';   // flicker in like the System
    ctx.fillText(w.w, 0, -lh[i] / 2);
    ctx.restore();
    y += lh[i];
  });
  ctx.restore();
}

function renderScene(ctx, t, img, seg) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const idx = seg ? parseInt(seg.dir.slice(1), 10) : 0;
  if (img) picture(ctx, img, t, seg, idx);
  // vignette + darker look for the finale so the word glows
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${t >= ARISE ? 0.75 : 0.5})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (t >= ARISE) { ctx.fillStyle = 'rgba(0,10,30,0.25)'; ctx.fillRect(0, 0, W, H); }
  words(ctx, t);
  // flashes on the drop and the second push
  for (const [c, a] of [[DROP, 0.9], [PUSH, 0.7], [ARISE, 0.5]]) {
    const d = t - c;
    if (d >= 0 && d < 0.18) { ctx.fillStyle = `rgba(255,255,255,${a * (1 - d / 0.18)})`; ctx.fillRect(0, 0, W, H); }
  }
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
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    n.putImageData(id, 0, 0);
  }
  mctx.save(); mctx.globalCompositeOperation = 'overlay'; mctx.globalAlpha = 0.07;
  const pat = mctx.createPattern(NOISE, 'repeat');
  pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256));
  mctx.fillStyle = pat; mctx.fillRect(0, 0, W, H); mctx.restore();
}
async function load(url) { const i = new Image(); i.src = url; await i.decode(); return i; }
window.renderFrame = async function (frame, dataUrl, seg) {
  const img = dataUrl ? await load(dataUrl) : null;
  const t = frame / FPS, S = 2;
  for (let i = 0; i < S; i++) {
    const ts = Math.max(0, t + ((i + 0.5) / S - 0.5) * 0.5 / FPS);
    renderScene(sctx, ts, img, seg);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1; post(frame);
  return main.toDataURL('image/png');
};
window.ready = document.fonts.load(`900 100px ${DISP}`);
