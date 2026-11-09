// ── 2D typography + tags, shared with REBORN v2 ──
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

