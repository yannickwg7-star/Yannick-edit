// Compositor for the clip edit: hook text, beat-synced punch-ins, black bars,
// caption band, flashes. Source frames are pushed in per output frame.
const W = 1080, H = 1920, FPS = 30, DUR = 10.8;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const SANS = '"Inter"';
const PIC_Y = 420, PIC_H = 1080, BAND_Y = 960;

// every cut on the beat grid (story clip has its own internal cuts)
const CUTS = [3.203, 3.62, 4.037, 4.453, 4.87, 5.70, 6.50, 7.30, 8.17, 9.03, 9.60, 10.017, 10.433];
const CAPS = [
  [4.87, 5.70, 'They make you depressed'],
  [5.70, 6.50, 'They make you lonely'],
  [6.50, 7.30, 'They make you tired'],
  [7.30, 8.17, 'They make you anxious'],
  [8.17, 9.03, 'They make you uncomfortable'],
];
const lastCut = t => CUTS.reduce((m, c) => (t >= c ? c : m), -1);

function wrap(ctx, words, maxW) {
  const lines = [[]]; let w = 0; const sp = ctx.measureText(' ').width;
  for (const word of words) {
    const ww = ctx.measureText(word).width;
    if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0; }
    lines[lines.length - 1].push(word); w += (w ? sp : 0) + ww;
  }
  return lines;
}
function caption(ctx, text, t, t0, { size = 62, stagger = 0, accent = [], pop = false, y = BAND_Y } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px ${SANS}`; ctx.textBaseline = 'middle';
  const lines = text.split('|').flatMap(seg => wrap(ctx, seg.trim().split(' '), 940));
  const sp = ctx.measureText(' ').width, lh = size * 1.2;
  let wi = 0;
  lines.forEach((line, li) => {
    const lw = line.reduce((a, w, i) => a + ctx.measureText(w).width + (i ? sp : 0), 0);
    let x = W / 2 - lw / 2;
    const ly = y + (li - (lines.length - 1) / 2) * lh;
    for (const word of line) {
      const ws = t0 + wi * stagger, p = E.outCubic(P(t, ws, ws + 0.22)), ww = ctx.measureText(word).width;
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = p;
        ctx.translate(x + ww / 2, ly + (1 - p) * 14);
        if (pop) { const s = lerp(1.35, 1, E.outBack(P(t, ws, ws + 0.25))); ctx.scale(s, s); }
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
        ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(word, -ww / 2, 0); ctx.shadowBlur = 0;
        ctx.fillStyle = accent.includes(word) ? '#ffd27a' : '#fff';
        ctx.fillText(word, -ww / 2, 0);
        ctx.restore();
      }
      x += ww + sp; wi++;
    }
  });
  ctx.restore();
}

function drawPicture(ctx, img, t, seg) {
  const c = lastCut(t), d = t - c;
  const punch = c > 0 ? lerp(seg.kind === 'flash' ? 1.22 : 1.14, 1, E.outExpo(P(d, 0, 0.32))) : 1;
  const drift = 1 + 0.05 * P(t, seg.t0, seg.t1);
  const beat = 1 + 0.012 * Math.exp(-((t - 0.286) % 0.4167) * 9);   // tiny pulse on every beat
  const s = punch * drift * beat;
  let sx = 0, sy = 0;
  if (c > 0 && d < 0.3) { const k = Math.exp(-d * 16) * 14; sx = k * Math.sin(d * 95 + c * 9); sy = k * Math.cos(d * 81 + c * 5); }
  // main picture (cover-cropped into a 1080x1080 window)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, PIC_Y, W, PIC_H); ctx.clip();
  ctx.translate(W / 2 + sx, PIC_Y + PIC_H / 2 + sy); ctx.scale(s, s);
  const k = Math.max(W / img.width, PIC_H / img.height);
  ctx.filter = seg.kind === 'flash' ? 'brightness(0.7) contrast(1.15) saturate(0.85)' : 'contrast(1.06) saturate(1.12)';
  ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
  ctx.restore();
}
function renderScene(ctx, t, img, seg) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (img && seg) drawPicture(ctx, img, t, seg);
  else { // hook: slow light breathing behind the text
    const g = ctx.createRadialGradient(W / 2, BAND_Y, 0, W / 2, BAND_Y, 700);
    g.addColorStop(0, `rgba(255,255,255,${0.035 + 0.02 * Math.sin(t * 2)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // captions
  if (t < 4.87) {
    const z = lerp(1.0, 1.06, P(t, 0, 4.87));
    ctx.save(); ctx.translate(W / 2, BAND_Y); ctx.scale(z, z); ctx.translate(-W / 2, -BAND_Y);
    caption(ctx, 'When God wants | you to grow', t, 0.3, { size: 70, stagger: 0.42 });
    ctx.restore();
  } else if (t < 9.03) {
    const c = CAPS.find(c => t >= c[0] && t < c[1]);
    if (c) caption(ctx, c[2], t, c[0], { size: 70 });
  } else {
    caption(ctx, 'But they never | make you fail', t, 9.03, { size: 82, stagger: 0.1, accent: ['never'], pop: true });
  }
  // cut flashes
  const c = lastCut(t), d = t - c;
  if (c > 0 && d < 0.15) { ctx.fillStyle = `rgba(255,255,255,${(c >= 9.6 ? 0.55 : 0.32) * (1 - d / 0.15)})`; ctx.fillRect(0, 0, W, H); }
  // end fade
  const f = P(t, DUR - 0.3, DUR);
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
  mctx.globalCompositeOperation = 'overlay'; mctx.globalAlpha = 0.07;
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
window.ready = document.fonts.load(`700 64px ${SANS}`);
