// "When God wants you to grow" v2: bold paper-and-sticker style.
// Spring-physics cards with hard shadows, stamped type, emotion stickers,
// background that shifts per emotion, black flip + card fan finale. No blur effects.
const W = 1080, H = 1920, FPS = 30, DUR = 9.5;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  outBack: x => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const spring = (d, k = 7, w = 13) => d <= 0 ? 0 : 1 - Math.exp(-k * d) * Math.cos(w * d);
const B = k => 0.116 + 0.414 * k;
const DISP = '"Inter Display"', SERIF = '"Liberation Serif"';
const INK = '#111111', PAPER = [238, 232, 221];
const CX = 540, CY = 960, CS = 860;

// chapters: start, sticker word, sticker colour, background tint
const CH = [
  [B(7), 'PAIN', '#FF3B30', [245, 220, 212]],
  [B(8), 'FEAR', '#7B3FF2', [228, 220, 245]],
  [B(9), 'DEPRESSED', '#2F6BFF', [216, 226, 240]],
  [B(11), 'LONELY', '#7C838F', [226, 226, 228]],
  [B(13), 'TIRED', '#FF9F1C', [244, 228, 200]],
  [B(15), 'ANXIOUS', '#9B5DE5', [230, 221, 242]],
  [B(17), 'UNCOMFORTABLE', '#FF4A1C', [242, 214, 206]],
];
const FIN = B(19);

function font(ctx, w, size, fam = DISP, style = '') { ctx.font = `${style} ${w} ${size}px ${fam}`; }
const rgb = c => `rgb(${c.map(Math.round).join(',')})`;
function cover(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + w / 2 - img.width * k / 2, y + h / 2 - img.height * k / 2, img.width * k, img.height * k);
}
// clip card: hard offset shadow, rounded image, thick ink outline
function card(ctx, img, cx, cy, w, h, rot = 0, s = 1, shadow = 18) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  const r = 34;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-w / 2 + shadow, -h / 2 + shadow, w, h, r); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.clip();
  if (img) cover(ctx, img, -w / 2, -h / 2, w, h); else { ctx.fillStyle = '#222'; ctx.fillRect(-w / 2, -h / 2, w, h); }
  ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
  ctx.restore();
}
// sticker pill that pops in on a spring
function sticker(ctx, text, cx, cy, size, bg, fg, rot, d, maxW = 900) {
  if (d < 0) return;
  font(ctx, 900, size);
  let tw = ctx.measureText(text).width;
  if (tw > maxW - 80) { size *= (maxW - 80) / tw; font(ctx, 900, size); tw = ctx.measureText(text).width; }
  const pw = tw + size * 0.75, ph = size * 1.25;
  const s = Math.max(0, spring(d, 9, 16));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * (2 - s)); ctx.scale(s, s);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-pw / 2 + 12, -ph / 2 + 12, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}
// word stamped onto the page: drops from big + tilted, settles with a bounce
function stamp(ctx, text, x, base, size, t, t0, { color = INK, align = 'left' } = {}) {
  const d = t - t0;
  if (d < 0) return 0;
  font(ctx, 900, size);
  const tw = ctx.measureText(text).width;
  const s = lerp(1.7, 1, E.outBack(clamp(d / 0.22))), rot = lerp(-0.12, 0, E.outBack(clamp(d / 0.22)));
  const ax = align === 'left' ? x : x - tw / 2;
  ctx.save(); ctx.translate(ax + tw / 2, base - size * 0.35); ctx.rotate(rot); ctx.scale(s, s);
  ctx.globalAlpha = clamp(d / 0.06);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color; ctx.fillText(text, 0, size * 0.35);
  ctx.restore();
  return tw;
}

// ───────── background: paper that shifts tone per emotion, black curtain for the finale ─────────
function background(ctx, t) {
  let c = PAPER;
  for (const [t0, , , tint] of CH) if (t >= t0) c = c.map((v, i) => lerp(v, tint[i], E.outCubic(P(t, t0, t0 + 0.25))));
  ctx.fillStyle = rgb(c); ctx.fillRect(0, 0, W, H);
  // dotted paper texture
  ctx.fillStyle = 'rgba(17,17,17,0.07)';
  for (let y = 40; y < H; y += 48) for (let x = 40 + ((y / 48) % 2) * 24; x < W; x += 48) ctx.fillRect(x - 2, y - 2, 4, 4);
  const k = E.outExpo(P(t, FIN, FIN + 0.3));
  if (k > 0) { ctx.fillStyle = '#0B0B0B'; ctx.fillRect(0, H * (1 - k), W, H * k + 2); }
}

// ───────── hook ─────────
const TM = document.createElement('canvas'); TM.width = W; TM.height = H; const tm = TM.getContext('2d');
const MK = document.createElement('canvas'); MK.width = W; MK.height = H; const mk = MK.getContext('2d');
function hook(ctx, t, img) {
  const out = E.inExpo(P(t, 2.72, 3.014));            // everything lifts away as the card takes over
  ctx.save(); ctx.translate(0, -out * 1500);
  stamp(ctx, 'WHEN', 90, 520, 180, t, B(0));
  stamp(ctx, 'GOD', 90, 700, 180, t, B(1), { color: '#FF4A1C' });
  stamp(ctx, 'WANTS', 90, 880, 180, t, B(2));
  const yw = stamp(ctx, 'YOU', 90, 1060, 180, t, B(3));
  if (yw) stamp(ctx, 'TO', 90 + yw + 50, 1060, 180, t, B(4));
  ctx.restore();
  if (t < B(5) || !img) return;
  // GROW: cut-out letters with the clip inside, black outline + hard shadow
  const d = t - B(5), size = 330, base = 1420;
  font(ctx, 900, size);
  const gw = ctx.measureText('GROW').width, gx = W / 2 - gw / 2;
  const s = lerp(1.6, 1, E.outBack(clamp(d / 0.24)));
  const grow = E.outExpo(P(t, 2.72, 3.0));            // GROW's box opens into the first card
  const ox = W / 2, oy = base - size * 0.36;
  const tr = c => { c.translate(ox, oy - out * 0); c.scale(s, s); c.translate(-ox, -oy); };
  if (grow < 1) {
    ctx.save(); tr(ctx); ctx.globalAlpha = 1 - grow;
    font(ctx, 900, size); ctx.fillStyle = INK; ctx.fillText('GROW', gx + 14, base + 14);
    ctx.restore();
    tm.setTransform(1, 0, 0, 1, 0, 0); tm.globalCompositeOperation = 'source-over'; tm.clearRect(0, 0, W, H);
    mk.setTransform(1, 0, 0, 1, 0, 0); mk.clearRect(0, 0, W, H);
    cover(tm, img, 0, 900, W, 700);
    mk.save(); tr(mk); font(mk, 900, size); mk.fillStyle = '#fff'; mk.fillText('GROW', gx, base); mk.restore();
    tm.globalCompositeOperation = 'destination-in'; tm.drawImage(MK, 0, 0);
    ctx.save(); ctx.globalAlpha = 1 - grow; ctx.drawImage(TM, 0, 0); ctx.restore();
    ctx.save(); tr(ctx); ctx.globalAlpha = 1 - grow; font(ctx, 900, size); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.strokeText('GROW', gx, base); ctx.restore();
  }
  if (grow > 0) {
    const bx = lerp(gx + gw / 2, CX, grow), by = lerp(base - size * 0.36, CY, grow);
    const bw = lerp(gw, CS, grow), bh = lerp(size * 0.75, CS, grow);
    card(ctx, img, bx, by, bw, bh, lerp(0, -0.04, grow), 1, 18 * grow);
  }
}

// ───────── cards: incoming springs up, previous flicks away ─────────
function cards(ctx, t, img, prev, seg, idx) {
  const d = Math.max(0, t - seg.t0);
  const rot = (idx % 2 ? 1 : -1) * 0.035;
  if (prev && d < 0.4) {
    const q = E.inCubic(clamp(d / 0.32));
    card(ctx, prev, CX - q * 700 * (idx % 2 ? 1 : -1), CY - q * 900, CS, CS, -rot + q * 0.5 * (idx % 2 ? -1 : 1), 1 - q * 0.15);
  }
  const sp = spring(d, 8, 12);
  const shrink = t >= B(21) ? lerp(1, 0.62, spring(t - B(21), 8, 11)) : 1;   // hero card makes room for the fan
  card(ctx, img, CX, CY + (1 - sp) * 1300 + (1 - shrink) * 160, CS, CS, lerp(rot * 5, rot, sp), shrink);
}

// ───────── finale fan: every struggle card fans out behind ─────────
const thumbCache = [];
function fan(ctx, t, thumbs) {
  const d = t - B(21), n = thumbs.length;
  thumbs.forEach((im, i) => {
    const k = spring(d - i * 0.025, 8, 11);
    const phi = lerp(-2.9, -0.24, i / (n - 1));           // upper arc behind the hero card
    const x = CX + Math.cos(phi) * 470 * k, y = CY + 60 + Math.sin(phi) * 470 * k;
    card(ctx, im, x, y, 330, 330, (phi + Math.PI / 2) * 0.45 * k, 1, 10);
  });
}

// ───────── frame ─────────
const imgs = {};
async function load(url) { const i = new Image(); i.src = url; await i.decode(); return i; }
function renderScene(ctx, t, img, seg, prev, thumbs) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  background(ctx, t);
  if (t < B(7)) { hook(ctx, t, seg && seg.kind === 'grow' ? img : null); return; }
  const chi = CH.filter(c => t >= c[0]).length - 1;
  const segIdx = seg ? Math.round((seg.t0 - B(7)) / 0.414) : 0;
  const story = t >= B(9) && t < FIN, fin = t >= FIN;
  // caption above the card
  if (story) {
    font(ctx, 400, 84, SERIF, 'italic'); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const p = E.outCubic(P(t, B(9), B(9) + 0.3));
    ctx.save(); ctx.globalAlpha = p; ctx.fillText('They make you', W / 2, 440 + (1 - p) * 30); ctx.restore();
  }
  if (fin) {
    font(ctx, 400, 84, SERIF, 'italic'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const p = E.outCubic(P(t, FIN + 0.05, FIN + 0.35));
    ctx.save(); ctx.globalAlpha = p; ctx.fillText('But they', W / 2, lerp(440, 300, E.outCubic(P(t, B(21), B(21) + 0.3))) + (1 - p) * 30); ctx.restore();
  }
  if (t >= B(21) && thumbs) fan(ctx, t, thumbs);
  if (img) cards(ctx, t, img, prev, seg, segIdx);
  // stickers
  if (!fin && chi >= 0) {
    const [t0, word, col] = CH[chi];
    sticker(ctx, word, CX, CY, word.length > 8 ? 120 : 150, col, '#fff', chi % 2 ? 0.06 : -0.06, t - t0 - 0.04);
  }
  if (fin && t >= B(20)) sticker(ctx, 'NEVER', CX, t >= B(21) ? CY + 160 * (1 - lerp(1, 0.62, spring(t - B(21), 8, 11))) : CY, 190, '#FFD23F', INK, -0.05, t - B(20) - 0.02);
  if (t >= B(21)) {
    font(ctx, 400, 84, SERIF, 'italic'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    const p = E.outCubic(P(t, B(21) + 0.05, B(21) + 0.35));
    ctx.save(); ctx.globalAlpha = p; ctx.fillText('make you fail.', W / 2, 1560 + (1 - p) * 30); ctx.restore();
  }
  // progress chips under the story cards
  if (story) {
    const n = 5, cw = 64, gap = 22, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, y = 1500;
    for (let i = 0; i < n; i++) {
      const on = t >= CH[i + 2][0];
      ctx.fillStyle = on ? CH[i + 2][2] : 'rgba(0,0,0,0)';
      ctx.beginPath(); ctx.roundRect(x0 + i * (cw + gap), y, cw, 18, 9); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    }
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
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    n.putImageData(id, 0, 0);
  }
  mctx.save();
  mctx.globalCompositeOperation = 'multiply'; mctx.globalAlpha = 0.06;
  const pat = mctx.createPattern(NOISE, 'repeat');
  pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256));
  mctx.fillStyle = pat; mctx.fillRect(0, 0, W, H);
  mctx.restore();
}
window.renderFrame = async function (frame, dataUrl, seg, prevUrl, thumbUrls) {
  const img = dataUrl ? await load(dataUrl) : null;
  const prev = prevUrl ? await load(prevUrl) : null;
  const thumbs = thumbUrls ? await Promise.all(thumbUrls.map(load)) : null;
  const t = frame / FPS, S = 3;
  for (let i = 0; i < S; i++) {
    const ts = t + ((i + 0.5) / S - 0.5) * 0.5 / FPS;
    renderScene(sctx, Math.max(0, ts), img, seg, prev, thumbs);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
  post(frame);
  return main.toDataURL('image/png');
};
window.ready = Promise.all([
  document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`italic 400 84px ${SERIF}`),
]);
