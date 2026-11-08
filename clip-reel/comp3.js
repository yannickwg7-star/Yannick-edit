// "When God wants you to grow" v3: liquid & squishy motion.
// Every cut has its own effect, rendered with a WebGL shader on the clip card:
// squash & bloop, melt, water ripple, gooey blobs, bubble pop, swirl, jelly glitch,
// liquid wave, ink splash. Text and stickers bounce with squash & stretch.
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
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
};
const spring = (d, k = 7, w = 13) => d <= 0 ? 0 : 1 - Math.exp(-k * d) * Math.cos(w * d);
const wob = (d, k = 7, w = 18) => d <= 0 ? 0 : Math.exp(-k * d) * Math.sin(w * d);   // decaying jiggle
const B = k => 0.116 + 0.414 * k;
const DISP = '"Inter Display"', SERIF = '"Liberation Serif"';
const INK = '#111111', PAPER = [238, 232, 221];
const CX = 540, CY = 960, CS = 860;

// each cut gets its own effect
const FX = { none: 0, ripple: 1, melt: 2, blobs: 3, bubble: 4, swirl: 5, jelly: 6, wave: 7, ink: 8 };
const CUTS = [
  [B(7), 'squash'], [B(8), 'melt'], [B(9), 'ripple'], [B(11), 'blobs'], [B(13), 'bubble'],
  [B(15), 'swirl'], [B(17), 'jelly'], [B(19), 'wave'], [B(20), 'ink'], [B(21), 'bloop'],
];
const CH = [
  [B(7), 'PAIN', '#FF3B30', [245, 220, 212], 'bloop'],
  [B(8), 'FEAR', '#7B3FF2', [228, 220, 245], 'drop'],
  [B(9), 'DEPRESSED', '#2F6BFF', [216, 226, 240], 'stretch'],
  [B(11), 'LONELY', '#7C838F', [226, 226, 228], 'bloop'],
  [B(13), 'TIRED', '#FF9F1C', [244, 228, 200], 'drop'],
  [B(15), 'ANXIOUS', '#9B5DE5', [230, 221, 242], 'shake'],
  [B(17), 'UNCOMFORTABLE', '#FF4A1C', [242, 214, 206], 'stretch'],
];
const FIN = B(19);

// ───────── WebGL card renderer ─────────
const GLC = document.createElement('canvas'); GLC.width = W; GLC.height = H;
const gl = GLC.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true, antialias: false });
const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
const FS = `
precision highp float;
uniform vec2 uRes; uniform sampler2D uA, uB, uTxt;
uniform float uAspA, uAspB, uHasB;
uniform vec2 uC, uSize, uSq; uniform float uRot, uRad, uWob;
uniform int uFx, uMode; uniform float uP, uD;
uniform vec2 uBoxMin, uBoxSize;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= .5; } return v; }
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
vec3 cov(sampler2D t, float asp, vec2 uv){
  uv = clamp(uv, 0.001, 0.999);
  vec2 u = uv; if (asp > 1.) u.x = .5 + (uv.x - .5) / asp; else u.y = .5 + (uv.y - .5) * asp;
  return texture2D(t, u).rgb; }
vec2 local(vec2 px){
  vec2 p = px - uC; float c = cos(-uRot), s = sin(-uRot);
  p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) / uSq;
  p += vec2(sin(p.y*.018 + uD*26.), cos(p.x*.018 + uD*22.)) * uWob;   // jelly wobble
  return p; }

vec3 effect(vec2 uv, out float edge){
  edge = 0.;
  vec3 A = cov(uA, uAspA, uv);
  if (uHasB < .5 || uFx == 0) return A;
  vec2 q = uv - .5; float r = length(q);
  if (uFx == 1) {            // water drop ripple
    float R = uP * .9, w = .028 * exp(-uD*2.5);
    vec2 off = normalize(q + 1e-5) * sin(r*55. - uD*30.) * w;
    edge = smoothstep(.012, 0., abs(r - R));
    return r < R ? cov(uA, uAspA, uv + off) : cov(uB, uAspB, uv + off*.7);
  }
  if (uFx == 2) {            // melt: the old picture drips down
    float drip = uP*1.35*(.55 + .45*noise(vec2(uv.x*14., 1.))) + .06*sin(uv.x*40.)*uP;
    edge = smoothstep(.02, 0., abs(uv.y - drip)) * step(uP, .98);
    return uv.y < drip ? A : cov(uB, uAspB, uv - vec2(0., drip));
  }
  if (uFx == 3) {            // gooey blobs
    float f = 0.;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 c = vec2(hash(vec2(fi, 3.)), hash(vec2(fi, 7.))) * .8 + .1;
      float rr = max(0., uP*1.6 - fi*.09) * (.16 + .06*hash(vec2(fi, 9.)));
      f += rr*rr / (dot(uv - c, uv - c) + 1e-4);
    }
    edge = smoothstep(.25, 0., abs(f - 1.)) * step(f, 1.4);
    return f > 1. ? A : cov(uB, uAspB, uv);
  }
  if (uFx == 4) {            // bubble: old picture inflates, then pops
    if (uP < .55) { float k = uP / .55 * .9; vec2 b = q * (1. - k*(1. - r*r*2.4)); return cov(uB, uAspB, .5 + b); }
    float pk = (uP - .55) / .45; edge = smoothstep(.015, 0., abs(r - pk*.75)) * (1. - pk);
    return A;
  }
  if (uFx == 5) {            // swirl
    float m = smoothstep(.35, .65, uP);
    float aOld = uP * 7. * (1. - smoothstep(0., .72, r)), aNew = (1. - uP) * -7. * (1. - smoothstep(0., .72, r));
    vec2 o = vec2(cos(aOld)*q.x - sin(aOld)*q.y, sin(aOld)*q.x + cos(aOld)*q.y);
    vec2 n = vec2(cos(aNew)*q.x - sin(aNew)*q.y, sin(aNew)*q.x + cos(aNew)*q.y);
    return mix(cov(uB, uAspB, .5 + o), cov(uA, uAspA, .5 + n), m);
  }
  if (uFx == 6) {            // jelly glitch: wavy slices + RGB split
    float k = exp(-uD*7.), o = .045*k;
    vec2 w = vec2(sin(uv.y*26. + uD*45.) * .04 * k, 0.);
    return vec3(cov(uA, uAspA, uv + w + vec2(o, 0.)).r, cov(uA, uAspA, uv + w).g, cov(uA, uAspA, uv + w - vec2(o, 0.)).b);
  }
  if (uFx == 7) {            // liquid wave rising from the bottom
    float e = 1.05 - uP*1.2 + sin(uv.x*13. + uD*14.)*.04 + sin(uv.x*29. - uD*9.)*.015;
    edge = smoothstep(.015, 0., abs(uv.y - e));
    return uv.y > e ? A : cov(uB, uAspB, uv);
  }
  if (uFx == 8) {            // ink splash
    float m = r - uP*.95 + (fbm(uv*5. + 3.) - .5)*.35;
    edge = smoothstep(.02, 0., abs(m));
    return m < 0. ? A : cov(uB, uAspB, uv);
  }
  return A;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  if (uMode == 1) {          // liquid text: clip inside wobbling letters
    vec2 su = px / uRes;
    vec2 w = vec2(sin(su.y*38. + uD*7.), sin(su.x*26. + uD*5.)) * .0045;
    float m = texture2D(uTxt, su + w).a;
    float sh = texture2D(uTxt, (px - vec2(14.)) / uRes + w).a;
    float ol = 0.;
    for (int i = 0; i < 8; i++) { float a = float(i)*.785; ol = max(ol, texture2D(uTxt, su + w + vec2(cos(a), sin(a))*6./uRes).a); }
    vec3 col = cov(uA, uAspA, (px - uBoxMin) / uBoxSize);
    vec3 c = mix(vec3(.067), col, smoothstep(.45, .55, m));
    float a = max(max(m, ol), sh);
    gl_FragColor = vec4(c * a, a);
    return;
  }
  vec2 hs = uSize * .5;
  vec2 p = local(px);
  float sd = sdRound(p, hs, uRad);
  float sds = sdRound(local(px - vec2(18.)), hs, uRad);
  float edge;
  vec3 col = effect(p / uSize + .5, edge);
  col = mix(col, vec3(1.), edge * .9);
  float inside = smoothstep(1., -1., sd);
  float outline = smoothstep(1., -1., abs(sd + 3.5) - 3.5);
  col = mix(col, vec3(.067), outline);
  float shadow = smoothstep(1., -1., sds) * (1. - inside);
  float a = max(inside, shadow);
  vec3 c = inside > 0. ? col : vec3(.067);
  gl_FragColor = vec4(c * a, a);
}`;
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
function makeTex(unit) {
  const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return tx;
}
const TX = [makeTex(0), makeTex(1), makeTex(2)];
gl.uniform1i(U('uA'), 0); gl.uniform1i(U('uB'), 1); gl.uniform1i(U('uTxt'), 2);
const uploaded = [null, null, null];
function upload(unit, src) {
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, TX[unit]);
  if (uploaded[unit] !== src || src instanceof HTMLCanvasElement) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); uploaded[unit] = src; }
}
function glDraw(o) {
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  upload(0, o.A); if (o.B) upload(1, o.B); if (o.txt) upload(2, o.txt);
  gl.uniform2f(U('uRes'), W, H);
  gl.uniform1f(U('uAspA'), o.A.width / o.A.height); gl.uniform1f(U('uAspB'), o.B ? o.B.width / o.B.height : 1);
  gl.uniform1f(U('uHasB'), o.B ? 1 : 0);
  gl.uniform2f(U('uC'), o.cx ?? CX, o.cy ?? CY); gl.uniform2f(U('uSize'), o.w ?? CS, o.h ?? CS);
  gl.uniform2f(U('uSq'), o.sx ?? 1, o.sy ?? 1); gl.uniform1f(U('uRot'), o.rot ?? 0); gl.uniform1f(U('uRad'), o.rad ?? 36);
  gl.uniform1f(U('uWob'), o.wob ?? 0); gl.uniform1i(U('uFx'), o.fx ?? 0); gl.uniform1i(U('uMode'), o.mode ?? 0);
  gl.uniform1f(U('uP'), o.p ?? 1); gl.uniform1f(U('uD'), o.d ?? 0);
  gl.uniform2f(U('uBoxMin'), ...(o.boxMin || [0, 0])); gl.uniform2f(U('uBoxSize'), ...(o.boxSize || [W, H]));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return GLC;
}

// ───────── 2D helpers ─────────
function font(ctx, w, size, fam = DISP, style = '') { ctx.font = `${style} ${w} ${size}px ${fam}`; }
const rgb = c => `rgb(${c.map(Math.round).join(',')})`;
function cover(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + w / 2 - img.width * k / 2, y + h / 2 - img.height * k / 2, img.width * k, img.height * k);
}
function card2d(ctx, img, cx, cy, w, h, rot, sx = 1, sy = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sx, sy);
  const r = 26;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-w / 2 + 12, -h / 2 + 12, w, h, r); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.clip(); cover(ctx, img, -w / 2, -h / 2, w, h); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
  ctx.restore();
}
// stickers with different squishy entrances
function sticker(ctx, text, cx, cy, size, bg, fg, rot, d, style = 'bloop', maxW = 900) {
  if (d < 0) return;
  font(ctx, 900, size);
  let tw = ctx.measureText(text).width;
  if (tw > maxW - 80) { size *= (maxW - 80) / tw; font(ctx, 900, size); tw = ctx.measureText(text).width; }
  const pw = tw + size * 0.75, ph = size * 1.25;
  let sx = 1, sy = 1, ox = 0, oy = 0, r = rot;
  if (style === 'bloop') { const s = spring(d, 9, 16); sx = s * (1 + 0.35 * wob(d, 8, 22)); sy = s * (1 - 0.35 * wob(d, 8, 22)); }
  if (style === 'drop') { const s = spring(d, 10, 15); oy = (1 - s) * -500; const land = Math.max(0, d - 0.1); sx = 1 + 0.3 * wob(land, 9, 24); sy = 1 - 0.3 * wob(land, 9, 24); }
  if (style === 'stretch') { const s = spring(d, 9, 14); ox = (1 - s) * 1100; sx = 1 + 0.6 * Math.abs(1 - s) + 0.2 * wob(d, 8, 20); sy = 1 - 0.3 * Math.abs(1 - s); }
  if (style === 'shake') { const s = spring(d, 10, 18); sx = sy = s; r = rot + 0.25 * wob(d, 5, 40); }
  ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(r); ctx.scale(sx, sy);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-pw / 2 + 12, -ph / 2 + 12, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}
// jelly word: lands squashed, wobbles back to shape
function jellyWord(ctx, text, x, base, size, t, t0, color = INK) {
  const d = t - t0; if (d < 0) return 0;
  font(ctx, 900, size);
  const tw = ctx.measureText(text).width;
  const drop = spring(d, 11, 15);
  const j = wob(d, 6, 22);
  ctx.save(); ctx.translate(x + tw / 2, base); ctx.scale(1 + 0.35 * j, (1 - 0.35 * j) * drop);
  ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
  return tw;
}

// ───────── background: paper tinted per emotion, liquid black curtain for the finale ─────────
function background(ctx, t) {
  let c = PAPER;
  for (const [t0, , , tint] of CH) if (t >= t0) c = c.map((v, i) => lerp(v, tint[i], E.outCubic(P(t, t0, t0 + 0.25))));
  ctx.fillStyle = rgb(c); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(17,17,17,0.07)';
  for (let y = 40; y < H; y += 48) for (let x = 40 + ((y / 48) % 2) * 24; x < W; x += 48) ctx.fillRect(x - 2, y - 2, 4, 4);
  const k = E.outCubic(P(t, FIN, FIN + 0.38));
  if (k > 0) {   // a black liquid wave floods up from the bottom
    const top = H * (1 - k * 1.08);
    ctx.fillStyle = '#0B0B0B'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, top + Math.sin(x * 0.012 + t * 14) * 45 * (1 - k) + Math.sin(x * 0.031 - t * 9) * 18 * (1 - k));
    ctx.lineTo(W, H); ctx.fill();
  }
}

// ───────── hook ─────────
const TXT = document.createElement('canvas'); TXT.width = W; TXT.height = H; const txc = TXT.getContext('2d');
function hook(ctx, t, img) {
  const out = E.inExpo(P(t, 2.72, 3.014));
  ctx.save(); ctx.translate(0, -out * 1500);
  jellyWord(ctx, 'WHEN', 90, 520, 180, t, B(0));
  jellyWord(ctx, 'GOD', 90, 700, 180, t, B(1), '#FF4A1C');
  jellyWord(ctx, 'WANTS', 90, 880, 180, t, B(2));
  const yw = jellyWord(ctx, 'YOU', 90, 1060, 180, t, B(3));
  if (yw) jellyWord(ctx, 'TO', 90 + yw + 50, 1060, 180, t, B(4));
  ctx.restore();
  if (t < B(5) || !img) return;
  const d = t - B(5), size = 330, base = 1420;
  // GROW: liquid letters with the clip flowing inside (shader)
  const grow = E.outExpo(P(t, 2.72, 3.0));
  font(txc, 900, size);
  const gw = txc.measureText('GROW').width, gx = W / 2 - gw / 2;
  if (grow < 1) {
    const s = spring(d, 9, 14), j = wob(d, 6, 20);
    txc.setTransform(1, 0, 0, 1, 0, 0); txc.clearRect(0, 0, W, H);
    txc.translate(W / 2, base - size * 0.36); txc.scale(s * (1 + 0.3 * j) * (1 - grow * 0.3), s * (1 - 0.3 * j) * (1 - grow * 0.3)); txc.translate(-W / 2, -(base - size * 0.36));
    txc.fillStyle = '#fff'; txc.fillText('GROW', gx, base);
    glDraw({ mode: 1, A: img, txt: TXT, d, boxMin: [0, 880], boxSize: [W, 760] });
    ctx.save(); ctx.globalAlpha = 1 - grow; ctx.drawImage(GLC, 0, 0); ctx.restore();
  }
  if (grow > 0) {   // the letters bloop into the first card
    const j = wob(t - 2.72, 6, 18);
    glDraw({ A: img, cx: lerp(W / 2, CX, grow), cy: lerp(base - size * 0.36, CY, grow), w: lerp(gw, CS, grow), h: lerp(size * 0.7, CS, grow),
      sx: 1 + 0.18 * j, sy: 1 - 0.18 * j, wob: 14 * (1 - grow) + 6, d: t, rot: -0.03 * grow });
    ctx.drawImage(GLC, 0, 0);
  }
}

// ───────── the clip card with the cut's effect ─────────
function mainCard(ctx, t, img, prev, seg) {
  const cut = CUTS.filter(c => t >= c[0] - 1e-6).pop();
  const d = cut ? t - cut[0] : 9, kind = cut ? cut[1] : 'none';
  const base = { A: img, B: prev, d, rot: 0.02 * Math.sin(t * 1.3), wob: 7 * Math.exp(-d * 6) };
  let o = { ...base, fx: 0, p: 1 };
  if (FX[kind] !== undefined) o = { ...base, fx: FX[kind], p: clamp(d / ({ ripple: .36, melt: .34, blobs: .34, bubble: .34, swirl: .36, jelly: .3, wave: .36, ink: .36 }[kind])) };
  if (kind === 'squash') {   // old card squeezes flat, new one bloops out
    if (d < 0.12 && prev) { const q = E.inCubic(d / 0.12); o = { ...base, A: prev, B: null, sx: 1 + 0.35 * q, sy: 1 - 0.94 * q, wob: 0 }; }
    else { const k = d - 0.12; o = { ...base, B: null, sy: Math.max(0.06, spring(k, 9, 17)), sx: 1 + 0.35 * Math.exp(-9 * k) * Math.cos(17 * k), wob: 10 * Math.exp(-k * 6) }; }
  }
  if (kind === 'bloop') {    // hero card shrinks with a jelly squish to make room for the fan
    const s = lerp(1, 0.62, spring(d, 8, 11)), j = wob(d, 6, 20);
    o = { ...base, B: null, sx: s * (1 + 0.25 * j), sy: s * (1 - 0.25 * j), cy: CY + (1 - s) * 160, wob: 12 * Math.exp(-d * 5) };
  }
  if (!o.B) o.fx = kind === 'jelly' ? FX.jelly : 0;
  if (kind === 'jelly') { o.B = o.B || img; o.fx = FX.jelly; }
  glDraw(o);
  ctx.drawImage(GLC, 0, 0);
}

// finale fan: the struggle cards squish out around the hero card
function fan(ctx, t, thumbs) {
  const d = t - B(21), n = thumbs.length;
  thumbs.forEach((im, i) => {
    const di = d - i * 0.025, k = spring(di, 8, 11), j = wob(di, 7, 22);
    const phi = lerp(-2.9, -0.24, i / (n - 1));
    const x = CX + Math.cos(phi) * 470 * k, y = CY + 60 + Math.sin(phi) * 470 * k;
    card2d(ctx, im, x, y, 330, 330, (phi + Math.PI / 2) * 0.45 * k, k * (1 + 0.3 * j), k * (1 - 0.3 * j));
  });
}

// ───────── frame ─────────
async function load(url) { const i = new Image(); i.src = url; await i.decode(); return i; }
function renderScene(ctx, t, img, seg, prev, thumbs) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  background(ctx, t);
  if (t < B(7)) { hook(ctx, t, seg && seg.kind === 'grow' ? img : null); return; }
  const chi = CH.filter(c => t >= c[0]).length - 1;
  const story = t >= B(9) && t < FIN, fin = t >= FIN;
  font(ctx, 400, 84, SERIF, 'italic'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (story) {
    const d = t - B(9), j = wob(d, 6, 20);
    ctx.save(); ctx.translate(W / 2, 410); ctx.scale(spring(d, 9, 14) * (1 + 0.2 * j), spring(d, 9, 14) * (1 - 0.2 * j));
    ctx.fillStyle = INK; ctx.fillText('They make you', 0, 0); ctx.restore();
  }
  if (fin) {
    const p = E.outCubic(P(t, FIN + 0.1, FIN + 0.4));
    ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = '#fff';
    ctx.fillText('But they', W / 2, lerp(440, 300, E.outCubic(P(t, B(21), B(21) + 0.3))) + (1 - p) * 30); ctx.restore();
  }
  if (t >= B(21) && thumbs) fan(ctx, t, thumbs);
  if (img) mainCard(ctx, t, img, prev, seg);
  if (!fin && chi >= 0) {
    const [t0, word, col, , style] = CH[chi];
    sticker(ctx, word, CX, CY, word.length > 8 ? 120 : 150, col, '#fff', chi % 2 ? 0.06 : -0.06, t - t0 - 0.08, style);
  }
  if (fin && t >= B(20)) {
    const sq = t >= B(21) ? lerp(1, 0.62, spring(t - B(21), 8, 11)) : 1;
    sticker(ctx, 'NEVER', CX, CY + (1 - sq) * 160, 190, '#FFD23F', INK, -0.05, t - B(20) - 0.06, 'bloop');
  }
  if (t >= B(21)) {
    const d = t - B(21) - 0.08, j = wob(d, 6, 20), s = spring(d, 9, 14);
    if (d > 0) { font(ctx, 400, 84, SERIF, 'italic'); ctx.textAlign = 'center'; ctx.save(); ctx.translate(W / 2, 1560); ctx.scale(s * (1 + 0.2 * j), s * (1 - 0.2 * j)); ctx.fillStyle = '#fff'; ctx.fillText('make you fail.', 0, 0); ctx.restore(); }
  }
  if (story) {   // progress chips that bloop in
    const n = 5, cw = 64, gap = 22, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, y = 1500;
    for (let i = 0; i < n; i++) {
      const t0 = CH[i + 2][0], on = t >= t0, s = on ? 1 + 0.5 * wob(t - t0, 7, 20) : 1;
      ctx.save(); ctx.translate(x0 + i * (cw + gap) + cw / 2, y + 9); ctx.scale(s, 2 - s);
      ctx.fillStyle = on ? CH[i + 2][2] : 'rgba(0,0,0,0)';
      ctx.beginPath(); ctx.roundRect(-cw / 2, -9, cw, 18, 9); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
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
  const t = frame / FPS, S = 2;
  for (let i = 0; i < S; i++) {
    const ts = t + ((i + 0.5) / S - 0.5) * 0.5 / FPS;
    renderScene(sctx, Math.max(0, ts), img, seg, prev, thumbs);
    mctx.globalAlpha = 1 / (i + 1); mctx.drawImage(scratch, 0, 0);
  }
  mctx.globalAlpha = 1;
  post(frame);
  return main.toDataURL('image/png');
};
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`italic 400 84px ${SERIF}`)]);
