// REBORN — 3D stage edition. The REBORN story as real 3D objects on a black void with a glossy
// reflective floor and soft studio light (reference look). Three.js, 1080x1920 @ 30fps, 45.7s.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920, FPS = 30, DUR = 45.7, CX = 540, TY = 1390;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => x * x * (3 - 2 * x);
const TAU = Math.PI * 2;
const E = {
  inOut: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outCubic: x => 1 - Math.pow(1 - x, 3), inCubic: x => x * x * x, out: x => 1 - Math.pow(1 - x, 3),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function spring(d, freq = 3.2, z = 0.42) { if (d <= 0) return 0; const w = TAU * freq, wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * d) * (Math.cos(wd * d) + (z * w / wd) * Math.sin(wd * d)); }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
const C = { ink: '#F4F4F6', amber: '#FFAB00', emer: '#00E676' };
const DISP = '"Inter Display"', MONO = '"JetBrains Mono"';
const AMB = new THREE.Color(0xffab00), EMR = new THREE.Color(0x00e676);
const DROPS = [6.95, 17.40, 24.00, 28.45, 33.40, 37.50, 41.30];
const KNOCKS = [9.9, 10.3, 10.7, 11.25, 11.65, 12.05];

// ───────── renderer / stage ─────────
const c3 = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: c3, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0); scene.fog = new THREE.Fog(0, 8, 24);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(45, W / H, 0.03, 80);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.55, 0.88); composer.addPass(bloom);
composer.addPass(new OutputPass());
const floor = new Reflector(new THREE.PlaneGeometry(60, 60), { clipBias: 0.003, textureWidth: W / 2, textureHeight: H / 2, color: 0x404040 });
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const fadeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.78)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); return new THREE.CanvasTexture(c); })();
const fade = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
fade.rotation.x = -Math.PI / 2; fade.position.y = 0.002; scene.add(fade);
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.6 }));
catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.004; catcher.receiveShadow = true; scene.add(catcher);
const key = new THREE.SpotLight(0xfff3e6, 110, 0, 0.55, 0.7, 2);
key.position.set(1.8, 7.2, 4.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 5;
scene.add(key, key.target); key.target.position.set(0, 0.8, 0);
const rim = new THREE.DirectionalLight(0xdbe4ff, 1.3); rim.position.set(-3, 4, -5); scene.add(rim);
const hemi = new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.25); scene.add(hemi);
const glowL = new THREE.PointLight(0xffab00, 0, 7, 2); scene.add(glowL);

// ───────── materials ─────────
const M = {
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, envMapIntensity: 0.35, emissive: 0x000000 }),
  grey: new THREE.MeshStandardMaterial({ color: 0x6e737d, roughness: 0.7, envMapIntensity: 0.3 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffb21f, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.55, envMapIntensity: 0.4 }),
  glowA: new THREE.MeshBasicMaterial({ color: 0xffab00 }), glowE: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
  ringMat: new THREE.MeshBasicMaterial({ color: 0xffab00, transparent: true }),
};
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; return o; };
const add = (...o) => { o.forEach(x => scene.add(x)); return o[0]; };

// the anchor: one glowing ring that never leaves the centre of the stage
const ring = add(mesh(new THREE.TorusGeometry(1.15, 0.012, 12, 160), M.ringMat, false)); ring.position.set(0, 1.25, -0.7);

// ───────── figure rig ─────────
function capsule(r, len, mat) { return mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); }
function makeFigure(mat) {
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.92;
  const torso = new THREE.Group(); hips.add(torso);
  const body = capsule(0.16, 0.42, mat); body.position.y = 0.32; torso.add(body);
  const pelvis = capsule(0.14, 0.12, mat); pelvis.rotation.z = Math.PI / 2; hips.add(pelvis);
  const neck = new THREE.Group(); neck.position.y = 0.66; torso.add(neck);
  const head = mesh(new THREE.SphereGeometry(0.15, 32, 24), mat); head.position.y = 0.17; neck.add(head);
  const limb = (p, x, y, l1, l2, r) => { const j1 = new THREE.Group(); j1.position.set(x, y, 0); p.add(j1); const a = capsule(r, l1, mat); a.position.y = -l1 / 2 - r * 0.3; j1.add(a); const j2 = new THREE.Group(); j2.position.y = -l1 - r * 0.6; j1.add(j2); const b = capsule(r * 0.92, l2, mat); b.position.y = -l2 / 2 - r * 0.3; j2.add(b); return [j1, j2]; };
  const [shL, elL] = limb(torso, -0.25, 0.58, 0.26, 0.24, 0.058), [shR, elR] = limb(torso, 0.25, 0.58, 0.26, 0.24, 0.058);
  const [hipL, knL] = limb(hips, -0.1, 0, 0.36, 0.36, 0.07), [hipR, knR] = limb(hips, 0.1, 0, 0.36, 0.36, 0.07);
  return { root, hips, torso, neck, shL, elL, shR, elR, hipL, knL, hipR, knR };
}
const POSE = {
  stand: { sp: 0, hd: 0, shLx: 0, shLz: 0.08, elL: 0, shRx: 0, shRz: -0.08, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  slump: { sp: 0.38, hd: 0.5, shLx: 0.15, shLz: 0.05, elL: -0.2, shRx: 0.15, shRz: -0.05, elR: -0.2, hpL: -0.1, knL: 0.2, hpR: -0.1, knR: 0.2, y: -0.04 },
  knock: { sp: 0.05, hd: 0.1, shLx: 0.05, shLz: 0.08, elL: 0, shRx: -1.55, shRz: -0.1, elR: -1.0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  power: { sp: -0.08, hd: -0.15, shLx: 0, shLz: 0.55, elL: 0, shRx: 0, shRz: -0.55, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  arms: { sp: -0.12, hd: -0.3, shLx: 0, shLz: 2.6, elL: 0, shRx: 0, shRz: -2.6, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  look: { sp: -0.04, hd: -0.2, shLx: 0, shLz: 0.1, elL: 0, shRx: 0, shRz: -0.1, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
};
const mix = (a, b, k) => { const o = {}; for (const n in a) o[n] = lerp(a[n], b[n], k); return o; };
function walk(base, ph, amt = 1) { const o = { ...base }, s = Math.sin(ph) * amt; o.hpL += 0.45 * s; o.hpR -= 0.45 * s; o.knL += 0.5 * Math.max(0, -Math.sin(ph)) * amt; o.knR += 0.5 * Math.max(0, Math.sin(ph)) * amt; o.shLx -= 0.35 * s; o.shRx += 0.35 * s; o.y += 0.025 * Math.abs(Math.cos(ph)) * amt; return o; }
function pose(f, p) { f.hips.position.y = 0.92 + p.y; f.torso.rotation.x = p.sp; f.neck.rotation.x = p.hd; f.shL.rotation.set(p.shLx, 0, p.shLz); f.elL.rotation.x = p.elL; f.shR.rotation.set(p.shRx, 0, p.shRz); f.elR.rotation.x = p.elR; f.hipL.rotation.x = p.hpL; f.knL.rotation.x = p.knL; f.hipR.rotation.x = p.hpR; f.knR.rotation.x = p.knR; }
const hero = makeFigure(M.white); add(hero.root);
const CHEST = () => new THREE.Vector3(hero.root.position.x, hero.root.position.y + 1.32, hero.root.position.z + 0.12);

// ───────── helpers ─────────
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return { c, g, tx, draw: (...a) => { draw(g, ...a); tx.needsUpdate = true; } }; }
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function points(n, color, size) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ color, size, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
}
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
function inst(m, i, p, r = [0, 0, 0], s = 1) { tmpV.set(...p); tmpQ.setFromEuler(tmpE.set(...r)); tmpS.setScalar(Math.max(1e-4, s)); tmpM.compose(tmpV, tmpQ, tmpS); m.setMatrixAt(i, tmpM); }
const instanced = (g, m, n) => { const o = new THREE.InstancedMesh(g, m, n); o.castShadow = true; o.frustumCulled = false; scene.add(o); return o; };
const shockRing = add(mesh(new THREE.TorusGeometry(1, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true }), false));
shockRing.rotation.x = Math.PI / 2;

// ───────── 1 · memory: a polaroid of the old self that burns away ─────────
const photo = canvasTex(512, 600, g => {
  g.fillStyle = '#ECEAE4'; g.fillRect(0, 0, 512, 600);
  const gr = g.createLinearGradient(0, 30, 0, 470); gr.addColorStop(0, '#2B3140'); gr.addColorStop(1, '#12151C'); g.fillStyle = gr; g.fillRect(32, 32, 448, 440);
  g.fillStyle = '#596276'; g.beginPath(); g.ellipse(256, 210, 34, 38, 0, 0, TAU); g.fill();           // slumped grey figure
  g.beginPath(); g.roundRect(214, 250, 84, 150, 28); g.fill(); g.fillRect(222, 390, 28, 82); g.fillRect(262, 390, 28, 82);
  g.fillStyle = '#7A7A80'; g.font = '500 28px "JetBrains Mono"'; g.textAlign = 'center'; g.fillText('OLD ME · 2024', 256, 540);
}); photo.draw();
const burnN = (() => { const r = rng(4); const a = new Float32Array(130); for (let i = 0; i < 130; i++) a[i] = r(); return a; })();
const burn = canvasTex(256, 300, (g, k, t) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 300); g.fillStyle = '#000';
  const edge = 300 - k * 360;
  g.beginPath(); g.moveTo(0, 300);
  for (let x = 0; x <= 256; x += 4) { const n = burnN[(x / 2) | 0] * 0.5 + burnN[((x / 2) | 0) % 37] * 0.5; g.lineTo(x, edge + (n - 0.5) * 50 + Math.sin(x * 0.07 + t * 9) * 8); }
  g.lineTo(256, 300); g.fill();
});
const glowMap = canvasTex(256, 300, (g, k, t) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 300); if (k <= 0 || k >= 1) return;
  const edge = 300 - k * 360; g.strokeStyle = '#ffab00'; g.lineWidth = 14; g.filter = 'blur(4px)'; g.beginPath();
  for (let x = 0; x <= 256; x += 4) { const n = burnN[(x / 2) | 0] * 0.5 + burnN[((x / 2) | 0) % 37] * 0.5; const y = edge + (n - 0.5) * 50 + Math.sin(x * 0.07 + t * 9) * 8 - 6; x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.filter = 'none';
});
const polaroid = add(mesh(new THREE.BoxGeometry(0.95, 1.12, 0.02), new THREE.MeshStandardMaterial({ map: photo.tx, alphaMap: burn.tx, alphaTest: 0.5, emissiveMap: glowMap.tx, emissive: 0xffffff, emissiveIntensity: 3, roughness: 0.6, envMapIntensity: 0.3 })));
const embers = points(260, 0xffb52e, 0.05);
const EMB = (() => { const r = rng(11); return Array.from({ length: 260 }, () => ({ u: r(), v: r(), vx: (r() - 0.5) * 0.9, vy: 0.6 + r() * 1.4, vz: (r() - 0.5) * 0.5, tr: r() })); })();
// ───────── 2 · the win: a real gold trophy ─────────
const trophy = new THREE.Group();
{ const prof = [[0, 0], [0.34, 0.02], [0.33, 0.12], [0.08, 0.16], [0.06, 0.4], [0.1, 0.48], [0.38, 0.62], [0.44, 1.05], [0.41, 1.06], [0.36, 0.66], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y));
  trophy.add(mesh(new THREE.LatheGeometry(prof, 64), M.gold));
  for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.17, 0.03, 12, 40, Math.PI * 1.1), M.gold); h.position.set(s * 0.43, 0.82, 0); h.rotation.z = s > 0 ? -Math.PI / 2 - 0.15 : Math.PI / 2 + 0.15; trophy.add(h); } }
add(trophy);
// ───────── 3 · the clock that shatters ─────────
const clock = new THREE.Group();
{ const face = mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.06, 64), M.dark); face.rotation.x = Math.PI / 2; clock.add(face);
  const rim = mesh(new THREE.TorusGeometry(0.84, 0.035, 16, 120), M.gold); clock.add(rim); }
const ticks = []; for (let i = 0; i < 12; i++) { const tk = mesh(new THREE.BoxGeometry(0.03, i % 3 ? 0.08 : 0.14, 0.02), M.glowA, false); clock.add(tk); ticks.push(tk); }
const handH = mesh(new THREE.BoxGeometry(0.05, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.4 })); clock.add(handH);
const handM = mesh(new THREE.BoxGeometry(0.03, 0.62, 0.02), M.glowA, false); clock.add(handM);
add(clock);
const shards = instanced(new THREE.TetrahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 0.7, roughness: 0.2, emissive: 0xffab00, emissiveIntensity: 0.6 }), 70);
const SH = (() => { const r = rng(3); return Array.from({ length: 70 }, (_, i) => ({ a: i / 70 * TAU, sp: 1.2 + r() * 2.2, vz: (r() - 0.3) * 1.5, rot: [r() * 9, r() * 9, r() * 9] })); })();
// ───────── 4 · the door with a heart lock ─────────
const door = new THREE.Group();
{ for (const [w, h, x, y] of [[0.12, 2.25, -0.56, 1.125], [0.12, 2.25, 0.56, 1.125], [1.24, 0.12, 0, 2.2]]) { const b = mesh(new THREE.BoxGeometry(w, h, 0.18), M.dark); b.position.set(x, y, 0); door.add(b); } }
const slab = mesh(new THREE.BoxGeometry(1.0, 2.1, 0.07), M.wood); slab.position.set(0, 1.08, 0); door.add(slab);
for (const y of [0.6, 1.5]) { const pn = mesh(new THREE.BoxGeometry(0.72, 0.7, 0.02), new THREE.MeshStandardMaterial({ color: 0x3b291d, roughness: 0.6 })); pn.position.set(0, y, 0.045); slab.add(pn); pn.position.y = y - 1.08; }
const heartShape = new THREE.Shape(); heartShape.moveTo(0, -0.1); heartShape.bezierCurveTo(-0.2, 0.02, -0.1, 0.17, 0, 0.07); heartShape.bezierCurveTo(0.1, 0.17, 0.2, 0.02, 0, -0.1);
const heart = mesh(new THREE.ExtrudeGeometry(heartShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 }), M.gold);
heart.position.set(0.34, 0.0, 0.05); slab.add(heart);
const underGlow = mesh(new THREE.BoxGeometry(1.0, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0xffab00 }), false); underGlow.position.set(0, 0.012, 0.06); door.add(underGlow);
const behind = new THREE.PointLight(0xffab00, 0, 4, 2); behind.position.set(0, 0.25, -0.5); door.add(behind);
add(door);
const ripples = KNOCKS.map(() => add(mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }), false)));
// ───────── 5 · the mirror (a real reflection) ─────────
const mirror = new THREE.Group();
const glass = new Reflector(new THREE.PlaneGeometry(1.0, 2.0), { clipBias: 0.003, textureWidth: 512, textureHeight: 1024, color: 0x9aa4a8 });
glass.position.y = 1.1; mirror.add(glass);
for (const [w, h, x, y] of [[0.1, 2.2, -0.55, 1.1], [0.1, 2.2, 0.55, 1.1], [1.2, 0.1, 0, 2.15], [1.2, 0.1, 0, 0.05]]) { const b = mesh(new THREE.BoxGeometry(w, h, 0.1), M.gold); b.position.set(x, y, 0); mirror.add(b); }
add(mirror);
const pieces = instanced(new THREE.BoxGeometry(0.11, 0.11, 0.03), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 1.2, roughness: 0.3 }), 36);
const PZ = (() => { const r = rng(21); return Array.from({ length: 36 }, () => ({ a: r() * TAU, d: 2 + r() * 2, y: r() * 2.5, del: r() * 0.35, lx: (r() - 0.5) * 0.4, ly: 0.2 + r() * 1.4, rot: [r() * 8, r() * 8, r() * 8] })); })();
// ───────── 6 · the blueprint and the world ─────────
const bp = canvasTex(768, 640, (g, draw, brk) => {
  g.fillStyle = '#0E2A4A'; g.fillRect(0, 0, 768, 640);
  g.strokeStyle = 'rgba(150,200,255,0.22)'; g.lineWidth = 2;
  for (let x = 0; x <= 768; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 640); g.stroke(); }
  for (let y = 0; y <= 640; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(768, y); g.stroke(); }
  const pts = [[110, 520], [240, 520], [240, 360], [430, 360], [430, 190], [640, 190], [640, 110]];
  g.lineWidth = 12; g.lineCap = 'round'; g.setLineDash([30, 20]);
  for (let i = 0; i < pts.length - 1; i++) {
    const k = clamp(draw * (pts.length - 1) - i); if (k <= 0) break;
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], off = brk * (i % 2 ? 50 : -60);
    g.save(); g.translate((x0 + x1) / 2 + off, (y0 + y1) / 2 + brk * 110 + off * 0.5); g.rotate(brk * (i % 2 ? 0.45 : -0.5));
    g.strokeStyle = brk > 0 ? '#FFAB00' : '#CFE6FF';
    g.beginPath(); g.moveTo((x0 - x1) / 2, (y0 - y1) / 2); g.lineTo(lerp((x0 - x1) / 2, (x1 - x0) / 2, k), lerp((y0 - y1) / 2, (y1 - y0) / 2, k)); g.stroke(); g.restore();
  }
  g.setLineDash([]); g.fillStyle = '#CFE6FF'; g.font = '800 44px "JetBrains Mono"'; g.fillText('A', 70, 540); g.fillText('B', 660, 96);
});
const blueprint = add(mesh(new THREE.BoxGeometry(1.5, 1.25, 0.03), [M.dark, M.dark, M.dark, M.dark, new THREE.MeshStandardMaterial({ map: bp.tx, roughness: 0.5, emissive: 0xffffff, emissiveMap: bp.tx, emissiveIntensity: 0.35 }), M.dark]));
const globeTex = canvasTex(512, 256, g => { g.fillStyle = '#2B6FE0'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#2FD089'; const r = rng(6); for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * 512, 30 + r() * 196, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, TAU); g.fill(); } }); globeTex.draw();
const globe = add(mesh(new THREE.SphereGeometry(0.28, 48, 32), new THREE.MeshStandardMaterial({ map: globeTex.tx, roughness: 0.35, envMapIntensity: 0.6 })));
// ───────── 7 · gears ─────────
function gearGeo(r, teeth) {
  const s = new THREE.Shape(); for (let i = 0; i < teeth * 2; i++) { const a0 = i / (teeth * 2) * TAU, rr = i % 2 ? r : r * 1.2; const pa = [Math.cos(a0 - 0.07) * rr, Math.sin(a0 - 0.07) * rr], pb = [Math.cos(a0 + 0.07) * rr, Math.sin(a0 + 0.07) * rr]; i ? s.lineTo(...pa) : s.moveTo(...pa); s.lineTo(...pb); }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.35, 0, TAU, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 6 }); g.center(); return g;
}
const GEARS = [[-0.7, 1.75, 0.34, 12], [0.62, 1.95, 0.26, 10], [0.7, 0.95, 0.4, 14], [-0.62, 0.75, 0.24, 9]].map(([x, y, r, n]) => ({ x, y, r, m: add(mesh(gearGeo(r, n), M.steel)) }));
const chestGear = add(mesh(gearGeo(0.11, 9), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.3 }), false));
// ───────── 8 · the corridor of light ─────────
const frames = []; const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.5, emissive: 0xffab00, emissiveIntensity: 0 });
for (let i = 0; i < 9; i++) { const g = new THREE.Group(), m = frameMat(); for (const [w, h, x, y] of [[0.06, 2.8, -0.85, 1.4], [0.06, 2.8, 0.85, 1.4], [1.76, 0.06, 0, 2.8]]) { const b = mesh(new THREE.BoxGeometry(w, h, 0.06), m); b.position.set(x, y, 0); g.add(b); } g.position.z = -0.8 - i * 1.25; g.userData.m = m; add(g); frames.push(g); }
const goal = new THREE.Group(); { const gm = new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0 }); for (const [w, h, x, y] of [[0.04, 0.8, -0.6, 0.4], [0.04, 0.8, 0.6, 0.4], [1.24, 0.04, 0, 0.8]]) { const b = mesh(new THREE.BoxGeometry(w, h, 0.04), gm); b.position.set(x, y, 0); goal.add(b); } for (let i = 1; i < 6; i++) { const b = mesh(new THREE.BoxGeometry(0.008, 0.78, 0.008), gm); b.position.set(-0.6 + i * 0.2, 0.4, -0.1); goal.add(b); } goal.userData.m = gm; goal.position.z = -11.5; add(goal); }
const rays = []; for (let i = 0; i < 10; i++) { const r = mesh(new THREE.PlaneGeometry(0.16, 9), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); add(r); rays.push(r); }
// ───────── 9 · the vortex ─────────
const NV = 360, vortex = instanced(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x050607, metalness: 0.9, roughness: 0.15, envMapIntensity: 1.2 }), NV);
const VX = (() => { const r = rng(41); return Array.from({ length: NV }, () => ({ a: r() * TAU, r: 0.6 + r() * 2.2, y: r() * 2.6, sp: 0.6 + r() * 1.4 })); })();
const sparks = points(320, 0xffb52e, 0.06), vtrail = points(200, 0x00e676, 0.035);
// ───────── 10/11 · crystal shards of the self ─────────
const NC = 120, crystal = instanced(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0xf6fffa, roughness: 0.12, metalness: 0.1, emissive: 0x00e676, emissiveIntensity: 0.35, envMapIntensity: 1.2 }), NC);
const CR = (() => { const r = rng(55); return Array.from({ length: NC }, () => { const lim = r(); return { lx: (r() - 0.5) * 0.36, ly: 0.12 + r() * 1.6, lz: (r() - 0.5) * 0.22, d: [(r() - 0.5) * 2.6, (r() - 0.2) * 1.8, (r() - 0.5) * 1.6], rot: [r() * 6, r() * 6, r() * 6], s: 0.7 + r() * 0.9 }; }); })();
const endDot = add(mesh(new THREE.SphereGeometry(0.06, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }), false));

// ───────── choreography ─────────
const scenes = [[0, 3.6], [3.6, 5.3], [5.3, 9.4], [9.4, 14.75], [14.75, 19.45], [19.45, 22.35], [22.35, 25.85], [25.85, 30.7], [30.7, 35.5], [35.5, 40.7], [40.7, 45.71]];
const sceneIdx = t => scenes.findIndex(s => t >= s[0] && t < s[1]);
const CYC = [[37.5, 2.6, 41.3, 1.0], [43.6, 0.25, 43.85, 0.25], [44.4, 0.22, 44.62, 0.25], [45.05, 0.15, 45.2, 0.2]];
function crystalK(t) {   // 0 = whole figure, 1 = fully scattered
  for (let i = CYC.length - 1; i >= 0; i--) { const [o, od, b, bd] = CYC[i]; if (t < o) continue; if (t < o + od) return E.outCubic(P(t, o, o + od)) * (i ? 0.45 : 1); if (t < b) return i ? 0.45 : 1; if (t < b + bd) return (1 - E.inOut(P(t, b, b + bd))) * (i ? 0.45 : 1); return 0; }
  return 0;
}
function heroAt(t) {
  let p = [0, 0, 0.15], ry = 0, ps = POSE.stand, vis = false, glow = 0, glowCol = EMR;
  if (t >= 6.95 && t < 9.4) { vis = true; p = [0, lerp(-1.95, 0, E.out(P(t, 6.95, 7.8))), 0.15]; ps = mix(POSE.power, POSE.stand, P(t, 7.9, 8.6)); glow = 0.5 * (1 - P(t, 7.6, 9)); }
  else if (t >= 9.4 && t < 14.75) {
    vis = true; ry = Math.PI - 0.35; p = [lerp(0, -0.42, P(t, 9.4, 9.6)), 0, lerp(0.15, 0.4, P(t, 9.4, 9.6))];
    let k = 0; for (const kn of KNOCKS) k = Math.max(k, Math.sin(Math.PI * P(t, kn - 0.1, kn + 0.1)));
    ps = t < 12.4 ? mix(POSE.stand, POSE.knock, P(t, 9.5, 9.8)) : mix(POSE.knock, POSE.slump, E.inOut(P(t, 12.4, 13.2)));
    if (t < 12.4) ps = { ...ps, elR: ps.elR + 0.5 * k, shRx: ps.shRx + 0.12 * k };
  } else if (t >= 14.75 && t < 19.2) {
    vis = true; ry = Math.PI + 0.25; p = [-0.32, 0, 0.75]; ps = mix(POSE.slump, POSE.look, P(t, 15.4, 16.2));
    glow = E.outCubic(P(t, 17.9, 18.6)); if (glow > 0) ps = mix(POSE.look, POSE.power, glow);
  } else if (t >= 19.2 && t < 22.6) { vis = t < 19.45 || t > 21.6; ry = 0.6; p = [-0.95, 0, 0.8]; ps = POSE.look; if (t < 19.45) { const k = P(t, 19.2, 19.45); p = [lerp(-0.32, -0.95, k), 0, 0.8]; ps = walk(POSE.stand, k * TAU, 0.8); ry = lerp(Math.PI, 0.6, k); } }
  else if (t >= 22.6 && t < 25.85) { vis = true; const k = E.inOut(P(t, 22.6, 23.6)); p = [lerp(-0.95, 0, k), 0, lerp(0.8, 0.3, k)]; ry = lerp(0.6, 0, k); ps = k < 1 ? walk(POSE.look, k * TAU * 1.5, 0.8 * (1 - k)) : POSE.look; if (t > 24) { glow = 0.8; ps = mix(POSE.look, POSE.power, E.outBack(P(t, 24, 24.4))); } }
  else if (t >= 25.85 && t < 30.7) { vis = true; p = [0, 0, 0.6]; ps = t < 28.45 ? mix(POSE.stand, POSE.slump, P(t, 25.9, 26.6)) : mix(POSE.slump, POSE.power, E.outBack(P(t, 28.45, 28.85))); glowCol = AMB; glow = t < 28.45 ? 0.15 * P(t, 27, 28.45) : 1; }
  else if (t >= 30.7 && t < 35.5) { vis = true; p = [0, 0, 0.6]; glowCol = AMB; glow = 0.8; ps = t < 33.4 ? mix(POSE.power, POSE.look, P(t, 30.7, 31.5)) : mix(POSE.look, POSE.arms, E.outBack(P(t, 33.4, 33.8))); }
  else if (t >= 35.5) { p = [0, 0, 0.6]; glow = 0.7; ps = t < 37.5 ? mix(POSE.arms, POSE.look, P(t, 35.5, 36.2)) : POSE.arms; vis = crystalK(t) < 0.02; }
  return { p, ry, ps, vis, glow, glowCol };
}
const CAM = [   // [time, position, target]
  [0, [0.9, 1.45, 4.4], [0, 1.15, 0]], [3.5, [0.5, 1.3, 3.8], [0, 1.05, 0]],
  [3.6, [-0.8, 1.2, 3.9], [0, 0.7, 0]], [5.3, [0.6, 1.25, 3.7], [0, 0.75, 0]],
  [6.9, [0, 1.25, 3.4], [0, 1.15, 0]], [9.35, [0.9, 1.5, 4.6], [0, 1.1, 0]],
  [9.45, [1.5, 1.5, 4.3], [-0.05, 1.15, -0.2]], [12.4, [1.2, 1.45, 3.9], [-0.05, 1.1, -0.2]], [14.7, [0.6, 1.4, 4.2], [0, 1.1, 0]],
  [14.8, [0.9, 1.45, 4.3], [0.05, 1.15, -0.2]], [17.3, [0.7, 1.4, 3.7], [0.05, 1.15, -0.2]], [19.4, [0.6, 1.45, 4.2], [0, 1.15, 0]],
  [19.5, [0.4, 1.3, 3.6], [0, 1.0, 0]], [22.3, [0.2, 1.35, 3.9], [0, 1.1, 0]],
  [22.4, [0.0, 1.4, 4.1], [0, 1.25, 0]], [25.3, [0.15, 1.4, 3.3], [0, 1.25, 0]],
  [25.9, [0.0, 1.35, 4.6], [0, 1.3, -3]], [28.4, [0.0, 1.3, 3.9], [0, 1.25, -3]], [30.6, [0.3, 1.4, 4.4], [0, 1.2, -2]],
  [30.75, [1.6, 1.8, 4.4], [0, 1.1, 0.4]], [33.35, [0.9, 1.5, 3.6], [0, 1.15, 0.4]], [35.4, [0.0, 1.3, 4.4], [0, 1.4, 0.4]],
  [35.6, [0.0, 1.35, 4.3], [0, 1.45, 0.4]], [37.4, [0.0, 1.35, 4.0], [0, 1.35, 0.4]], [40.6, [1.2, 1.7, 5.4], [0, 1.2, 0.4]],
  [40.75, [0.0, 1.4, 4.6], [0, 1.25, 0.4]], [45.7, [0.0, 1.5, 6.2], [0, 1.2, 0.4]],
];
const CUTS = [3.6, 9.45, 14.8, 19.5, 22.4, 25.9, 30.75, 35.6, 40.75];
function cameraAt(t) {
  let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
  const [t0, p0, q0] = CAM[i], [t1, p1, q1] = CAM[i + 1];
  const k = CUTS.includes(t0) ? E.outCubic(P(t, t0, t1)) * 0.0 + E.inOut(P(t, t0, t1)) : E.inOut(P(t, t0, t1));
  const pos = p0.map((v, j) => lerp(v, p1[j], k)), tgt = q0.map((v, j) => lerp(v, q1[j], k));
  tgt[1] -= 0.3; for (let j = 0; j < 3; j++) pos[j] = tgt[j] + (pos[j] - tgt[j]) * 1.45;   // stage sits in the upper 2/3, words below
  if (t > 25.4 && t < 25.9) { const c = CHEST(), d = E.inExpo(P(t, 25.4, 25.88)); pos[0] = lerp(pos[0], c.x, d); pos[1] = lerp(pos[1], c.y, d); pos[2] = lerp(pos[2], c.z + 0.08, d); tgt[0] = lerp(tgt[0], c.x, d); tgt[1] = lerp(tgt[1], c.y, d); tgt[2] = lerp(tgt[2], c.z - 1, d); }
  for (const d of DROPS) { const q = t - d; if (q > 0 && q < 0.5) { const a = Math.exp(-q * 11) * 0.06; pos[0] += a * Math.sin(q * 90); pos[1] += a * Math.cos(q * 77); } }
  pos[0] += Math.sin(t * 0.37) * 0.03; pos[1] += Math.sin(t * 0.29) * 0.02;
  return { pos, tgt };
}

function update(t) {
  const si = sceneIdx(t), accent = t < 6.95 || (t >= 9.4 && t < 15.4) || (t >= 19.45 && t < 24) || (t >= 25.85 && t < 31.3) || (t >= 33.4 && t < 37.5) ? AMB : EMR;
  // anchor ring
  M.ringMat.color.copy(accent).lerp(new THREE.Color(1, 1, 1), 0.3); ring.visible = !(si === 7) && !(t > 25.4 && t < 25.9);
  ring.scale.setScalar(t < 0.4 ? E.outExpo(P(t, 0, 0.35)) : 1); M.ringMat.opacity = 0.85;
  ring.rotation.z = t * 0.1;
  // hero
  const h = heroAt(t); hero.root.visible = h.vis; hero.root.position.set(...h.p); hero.root.rotation.y = h.ry; pose(hero, h.ps);
  M.white.emissive.copy(h.glowCol); M.white.emissiveIntensity = h.glow * 0.42;
  glowL.color.copy(h.glowCol); glowL.position.set(h.p[0] + 0.4, 2.4, h.p[2] + 1.2);
  let gl = h.glow * 2.5; for (const d of [28.45, 33.4, 41.3]) { const q = t - d; if (q > 0 && q < 1.2) gl += 8 * Math.exp(-q * 3.5); } glowL.intensity = gl;
  // 1 · polaroid + embers
  const bk = P(t, 2.0, 3.4);
  polaroid.visible = t < 3.45; if (polaroid.visible) { const pop = spring(t - 0.25, 2.6, 0.5); polaroid.scale.setScalar(Math.max(0.001, pop)); polaroid.position.set(0, 1.25 + Math.sin(t * 1.3) * 0.02, 0); polaroid.rotation.set(0, -0.25 + t * 0.06, -0.07); burn.draw(bk, t); glowMap.draw(bk, t); }
  const ep = embers.geometry.attributes.position.array; embers.visible = t > 2.0 && t < 3.95;
  EMB.forEach((e, i) => {
    const q = clamp((bk - e.u * 0.9) * 2.2), sx = (e.v - 0.5) * 0.9, sy = 0.7 + e.u * 1.1;
    let x = sx + e.vx * q, y = sy + e.vy * q * 0.6, z = e.vz * q;
    const f = E.inOut(P(t, 3.55, 3.92)); const tx = (e.v - 0.5) * 0.55 * (1 - e.u * 0.4), ty = 0.4 + e.u * 0.65;
    x = lerp(x, tx, f); y = lerp(y, ty, f); z = lerp(z, 0, f);
    if (q <= 0 && f <= 0) y = -9;
    ep[i * 3] = x; ep[i * 3 + 1] = y; ep[i * 3 + 2] = z;
  });
  embers.geometry.attributes.position.needsUpdate = true; embers.material.opacity = 1 - P(t, 3.85, 3.95);
  // 2 · trophy
  trophy.visible = (t >= 3.8 && t < 5.3) || (t >= 35.8 && t < 37.6);
  if (t < 30) { const s = spring(t - 3.8, 2.6, 0.45), out = E.inCubic(P(t, 5.0, 5.3)); trophy.scale.setScalar(Math.max(0.001, s * (1 - out))); trophy.position.set(0, 0.02, 0.1); trophy.rotation.y = t * 0.8 + out * 9; }
  else { const s = spring(t - 35.8, 2.6, 0.5), out = E.inCubic(P(t, 37.3, 37.6)); trophy.scale.setScalar(Math.max(0.001, s * 0.32 * (1 - out))); trophy.position.set(0, 2.08 + Math.sin(t * 2) * 0.03, 0.6); trophy.rotation.y = t; }
  // 3 · clock + shatter + shockwave
  clock.visible = t >= 5.3 && t < 6.95; clock.position.set(0, 1.25, 0);
  if (clock.visible) {
    clock.scale.setScalar(spring(t - 5.3, 2.8, 0.5)); const spin = E.inCubic(P(t, 5.3, 6.95)) * 40 + t;
    ticks.forEach((tk, i) => { const a = i / 12 * TAU, k = spring(t - 5.4 - i * 0.03, 3.5, 0.45); tk.position.set(Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0.05); tk.rotation.z = -a; tk.scale.setScalar(Math.max(0.001, k)); });
    handM.position.set(Math.sin(spin) * 0.28, Math.cos(spin) * 0.28, 0.07); handM.rotation.z = -spin; handH.position.set(Math.sin(spin / 12) * 0.18, Math.cos(spin / 12) * 0.18, 0.06); handH.rotation.z = -spin / 12;
    clock.rotation.y = 0.15 * Math.sin(t * 2) * (1 + 3 * P(t, 6.2, 6.95));
  }
  const sb = t - 6.95;
  SH.forEach((s, i) => { if (sb < 0 || sb > 1.6) return inst(shards, i, [0, -9, 0], [0, 0, 0], 0); const k = E.outExpo(clamp(sb / 1.2)); inst(shards, i, [Math.cos(s.a) * (0.8 + s.sp * k), 1.25 + Math.sin(s.a) * (0.8 + s.sp * k) - sb * sb * 0.8, s.vz * k], s.rot.map(v => v * k), 1 - P(sb, 0.9, 1.6)); });
  shards.instanceMatrix.needsUpdate = true;
  const sw = E.outExpo(clamp(sb / 0.9)); shockRing.visible = sb > 0 && sb < 0.9; shockRing.position.set(0, 0.05, 0.1); shockRing.scale.setScalar(0.3 + sw * 5); shockRing.material.opacity = 1 - sw;
  // 4 · door
  door.visible = t >= 9.2 && t < 15.0; if (door.visible) {
    const up = spring(t - 9.2, 2.4, 0.55), m = E.inOut(P(t, 14.6, 15.0)); door.position.set(0, 0, -0.35); door.scale.set(1, Math.max(0.001, up * (1 - m)), 1);
    let sh = 0; for (const k of KNOCKS) { const q = t - k; if (q > 0 && q < 0.4) sh += Math.exp(-q * 16) * Math.sin(q * 60) * 0.015; } slab.position.x = sh; slab.rotation.y = sh * 0.6;
    const lit = 1 - E.inOut(P(t, 12.6, 13.3)); behind.intensity = 6 * lit; underGlow.material.color.setRGB(lit, 0.67 * lit, 0); heart.material = M.gold;
  }
  ripples.forEach((r, i) => { const q = P(t, KNOCKS[i], KNOCKS[i] + 0.5); r.visible = q > 0 && q < 1; r.position.set(-0.2, 1.3, -0.28); r.scale.setScalar(1 + q * 4); r.material.opacity = 0.7 * (1 - q); });
  // 5 · mirror (flips at 19.1 into the blueprint)
  mirror.visible = t >= 14.8 && t < 19.45; glass.visible = mirror.visible;
  if (mirror.visible) { const k = spring(t - 14.8, 2.2, 0.55); mirror.position.set(0, 0, -0.35); mirror.scale.set(1, Math.max(0.001, k), 1); mirror.rotation.y = E.inCubic(P(t, 19.1, 19.45)) * Math.PI / 2; }
  const as = P(t, 17.4, 18.4);
  PZ.forEach((p, i) => { const k = E.outCubic(clamp((as - p.del) / 0.6)); if (t < 17.4 || t > 18.6) return inst(pieces, i, [0, -9, 0], [0, 0, 0], 0); const hx = hero.root.position.x + p.lx, hy = p.ly, hz = hero.root.position.z - 0.05; inst(pieces, i, [lerp(Math.cos(p.a) * p.d, hx, k), lerp(p.y, hy, k), lerp(Math.sin(p.a) * p.d, hz, k)], p.rot.map(v => v * (1 - k)), 1 - P(t, 18.35, 18.6)); });
  pieces.instanceMatrix.needsUpdate = true;
  // 6 · blueprint + globe
  blueprint.visible = t >= 19.45 && t < 22.4;
  if (blueprint.visible) { const k = spring(t - 19.45, 2.4, 0.55); blueprint.position.set(0.15, 1.2, -0.35); blueprint.rotation.set(-0.05, lerp(-Math.PI / 2, 0, clamp(k, 0, 1.15)), -0.03); blueprint.scale.setScalar(1 - E.inCubic(P(t, 22.1, 22.4))); bp.draw(E.inOut(P(t, 19.7, 20.7)), E.outExpo(P(t, 21.1, 21.6))); }
  globe.visible = t >= 20.4 && t < 22.75;
  if (globe.visible) { const roll = E.inOut(P(t, 20.4, 21.15)), toC = E.inOut(P(t, 21.7, 22.35)), sh = 1 - E.inCubic(P(t, 22.38, 22.75)); const x = lerp(lerp(2.4, 0.15, roll), 0, toC), y = lerp(0.28, 1.25, toC); globe.position.set(x, y, lerp(0.35, 0, toC)); globe.rotation.set(0, 0, -(x - 2.4) / 0.28); globe.scale.setScalar(Math.max(0.001, lerp(1, 1.9, toC) * sh)); }
  // 7 · gears burst from the globe and lock into the chest
  const lock = E.inOut(P(t, 23.7, 24.15)), spin = t * 2.2 + E.inCubic(P(t, 22.4, 23.7)) * 6, chest = CHEST();
  GEARS.forEach((g, i) => { g.m.visible = t >= 22.38 && t < 24.15; const out = spring(t - 22.4 - i * 0.05, 2.4, 0.5); g.m.position.set(lerp(lerp(0, g.x, out), chest.x, lock), lerp(lerp(1.25, g.y, out), chest.y, lock), lerp(0, chest.z, lock)); g.m.rotation.set(0, 0, spin * (i % 2 ? -1 : 1) * (0.3 / g.r)); g.m.scale.setScalar(Math.max(0.001, out * (1 - lock))); });
  chestGear.visible = t >= 24.0 && t < 25.9; chestGear.position.copy(chest); chestGear.position.z += 0.1; chestGear.rotation.z = t * 3; chestGear.scale.setScalar(spring(t - 24.0, 3, 0.4));
  // 8 · corridor
  const cor = t >= 25.85 && t < 30.75, ign = t - 28.45;
  frames.forEach((f, i) => { f.visible = cor; const k = ign > 0 ? E.outCubic(clamp((ign - i * 0.07) / 0.5)) : 0; f.userData.m.emissiveIntensity = k * (1.6 - i * 0.12); f.userData.m.color.setHex(k > 0 ? 0x4a3a20 : 0x2a2d35); });
  goal.visible = cor; goal.userData.m.emissiveIntensity = ign > 0 ? 1.2 * E.outCubic(clamp(ign / 0.9)) : 0.02;
  rays.forEach((r, i) => { r.visible = cor && ign > 0; const a = i / rays.length * TAU + t * 0.15; r.position.set(0, 1.35, 0.4); r.rotation.set(0, 0, a); r.material.opacity = 0.12 * E.outCubic(clamp(ign / 0.6)) * (0.6 + 0.4 * Math.sin(i * 3.1 + t)); });
  // 9 · vortex + sparks
  const vx = t >= 30.75 && t < 33.4, suck = E.inCubic(P(t, 31.3, 33.4));
  VX.forEach((v, i) => { if (!vx) return inst(vortex, i, [0, -9, 0], [0, 0, 0], 0); const a = v.a + t * v.sp * (1 + suck * 6), rr = v.r * (1 - suck * 0.93); inst(vortex, i, [Math.cos(a) * rr, lerp(v.y, 1.3, suck), 0.6 + Math.sin(a) * rr * 0.7], [0, 0, 0], 1 - suck * 0.4); });
  vortex.instanceMatrix.needsUpdate = true;
  const vt = vtrail.geometry.attributes.position.array; vtrail.visible = vx;
  for (let i = 0; i < 200; i++) { const v = VX[i], a = v.a + (t - 0.05) * v.sp * (1 + suck * 6), rr = v.r * (1 - suck * 0.93); vt[i * 3] = Math.cos(a) * rr; vt[i * 3 + 1] = lerp(v.y, 1.3, suck); vt[i * 3 + 2] = 0.6 + Math.sin(a) * rr * 0.7; }
  vtrail.geometry.attributes.position.needsUpdate = true;
  const boom = t - 33.4, spk = sparks.geometry.attributes.position.array; sparks.visible = boom > 0 && boom < 2.2;
  for (let i = 0; i < 320; i++) { const v = VX[i % NV], k = E.outExpo(clamp(boom / 0.9)); const d = (0.3 + v.r * 1.4) * k; spk[i * 3] = Math.cos(v.a + i) * d; spk[i * 3 + 1] = 1.3 + Math.sin(v.a * 1.7 + i) * d * 0.8 - boom * boom * 0.15; spk[i * 3 + 2] = 0.6 + Math.sin(v.a + i * 0.5) * d * 0.6; }
  sparks.geometry.attributes.position.needsUpdate = true; sparks.material.opacity = 1 - P(boom, 1.2, 2.2);
  // 10/11 · crystal self
  const ck = crystalK(t), hp = hero.root.position;
  CR.forEach((c, i) => { if (t < 37.5 || ck < 0.01) return inst(crystal, i, [0, -9, 0], [0, 0, 0], 0); const drift = t < 41.3 ? (t - 37.5) * 0.05 : 0; inst(crystal, i, [hp.x + c.lx + c.d[0] * ck, c.ly + c.d[1] * ck + drift * c.d[1], hp.z + c.lz + c.d[2] * ck], c.rot.map(v => v * ck + t * 0.4 * ck), c.s); });
  crystal.instanceMatrix.needsUpdate = true;
  const end = P(t, 45.25, 45.62); endDot.visible = end > 0; endDot.position.set(0, 1.25, 0.6); endDot.scale.setScalar(lerp(4, 1, end));
  if (end > 0) { hero.root.scale.setScalar(Math.max(0.001, 1 - E.inCubic(end))); ring.scale.setScalar(Math.max(0.001, 1 - E.inCubic(end))); } else hero.root.scale.setScalar(1);
  // lighting
  const dark = P(t, 25.85, 26.4) * (1 - P(t, 28.45, 28.6));
  key.intensity = lerp(110, 10, dark) * (cor && ign > 0 ? 0.35 : 1); hemi.intensity = lerp(0.25, 0.03, dark); rim.intensity = lerp(1.3, 0.2, dark);
  bloom.strength = 0.42 + (DROPS.some(d => t - d > 0 && t - d < 0.6) ? 0.35 * Math.max(...DROPS.map(d => t - d > 0 && t - d < 0.6 ? Math.exp(-(t - d) * 4) : 0)) : 0);
  renderer.toneMappingExposure = 1 - 0.0 * end;
  const c = cameraAt(t); camera.position.set(...c.pos); camera.lookAt(...c.tgt);
}

// ───────── overlay ─────────
const out = document.getElementById('c'); out.width = W; out.height = H; const ctx = out.getContext('2d');
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


function tagAt(text, world, t, t0, t1, col) { if (t < t0 || t > t1) return; const v = new THREE.Vector3(...world).project(camera); if (v.z > 1) return; ctx.save(); ctx.globalAlpha = 1 - P(t, t1 - 0.25, t1); tag(ctx, text, (v.x + 1) / 2 * W, (1 - v.y) / 2 * H, t - t0, col, 28); ctx.restore(); }
let NOISE;
function grade(frame) {
  const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.3, W / 2, H * 0.42, H * 0.82); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256; const n = NOISE.getContext('2d'), id = n.createImageData(256, 256), r = rng(9); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } n.putImageData(id, 0, 0); }
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07; const pat = ctx.createPattern(NOISE, 'repeat'); pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256).scale(1.4)); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.drawFrame = function (frame) {
  const t = Math.min(frame / FPS, DUR - 1e-3);
  update(t); composer.render();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
  ctx.drawImage(c3, 0, 0);
  for (const d of DROPS) { const q = t - d; if (q >= 0 && q < 0.15) { ctx.fillStyle = `rgba(255,248,230,${0.25 * (1 - q / 0.15)})`; ctx.fillRect(0, 0, W, H); } }
  tagAt('MEMORY', [0.42, 1.95, 0], t, 1.2, 3.3, C.amber);
  tagAt('GOAL: WIN', [0, 1.32, 0.1], t, 4.1, 5.2, C.amber);
  tagAt('NOW', [0, 2.25, 0], t, 5.6, 6.95, C.amber);
  tagAt('NEW SELF · v2.0', [0, 2.15, 0.15], t, 7.4, 9.3, C.emer);
  tagAt('× ' + KNOCKS.filter(k => t >= k).length + ' KNOCKS', [-0.55, 2.45, -0.3], t, 10.0, 12.5, C.ink);
  tagAt('STILL LOCKED', [0.3, 2.45, -0.3], t, 12.75, 14.6, C.amber);
  tagAt('YOU', [0, 2.4, -0.3], t, 15.9, 19.0, C.ink);
  tagAt('CHANGE ✓', [0, 0.35, 0.8], t, 18.0, 19.0, C.emer);
  tagAt('YOUR PLAN', [-0.4, 1.95, -0.3], t, 19.8, 21.6, C.ink);
  tagAt('PLAN ✕', [0.5, 0.5, -0.3], t, 21.3, 22.2, C.amber);
  tagAt('FIX: YOU', [0, 2.15, 0.3], t, 24.1, 25.4, C.emer);
  tagAt('GOAL: NOT VISIBLE', [0, 2.3, -3], t, 26.4, 28.4, C.ink);
  tagAt('SOURCE: YOU', [0, 2.3, 0.6], t, 28.7, 30.6, C.amber);
  tagAt('DEVOURING · ' + Math.round(E.inCubic(P(t, 31.3, 33.4)) * 100) + '%', [0, 2.55, 0.6], t, 31.6, 33.35, C.emer);
  tagAt('→ LIGHT', [0, 2.6, 0.6], t, 33.6, 35.4, C.amber);
  tagAt('COST: ANY', [0, 2.6, 0.6], t, 36.2, 37.45, C.ink);
  tagAt('OLD SELF: DELETED', [0, 2.6, 0.6], t, 37.8, 41.2, C.emer);
  const n = t < 43.6 ? 1 : t < 44.4 ? 2 : t < 45.05 ? 3 : 0;
  tagAt(n ? 'REBIRTH × ' + n : 'REBIRTH × ∞', [0, 2.4, 0.6], t, 41.6, 45.3, n ? C.emer : C.amber);
  typography(ctx, t);
  grade(frame);
  const fe = P(t, 45.45, 45.7); if (fe > 0) { ctx.fillStyle = `rgba(0,0,0,${fe})`; ctx.fillRect(0, 0, W, H); }
};
window.renderFrame = f => { window.drawFrame(f); return out.toDataURL('image/jpeg', 0.92); };
window.ready = Promise.all([document.fonts.load(`900 100px ${DISP}`), document.fonts.load(`700 28px ${MONO}`)]).then(() => true);
