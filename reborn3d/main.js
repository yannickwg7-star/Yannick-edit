// REBORN 3D — "rebuilding yourself, brick by brick". Three.js, 1080x1920 @ 30fps, 45.7s.
// Black void, glossy reflective floor, matte white figure, beige bricks, one red accent (the goal flag).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920, FPS = 30, DUR = 45.7;
window.META = { W, H, FPS, DUR };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => x * x * (3 - 2 * x);
const E = {
  inOut: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out: x => 1 - Math.pow(1 - x, 3), in: x => x * x * x,
  outBack: x => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
};
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ───────── speech map ─────────
const PHRASES = [
  [0.05, 1.90, "THAT VERSION OF MYSELF IS A MEMORY", ['MEMORY']],
  [2.00, 3.40, "I DON'T NEED IT ANYMORE", ['ANYMORE']],
  [3.70, 5.10, "I WANT TO WIN", ['WIN']],
  [5.35, 6.80, "NOW IS THE TIME", ['TIME']],
  [6.95, 8.30, "TO BE REBORN", ['REBORN']],
  [9.40, 12.30, "NO MATTER HOW MUCH YOU KNOCK ON THE DOOR TO SOMEONE'S HEART", ['KNOCK', 'HEART']],
  [12.45, 14.60, "IN THE END YOU CAN'T CHANGE THEM", ["CAN'T"]],
  [15.40, 17.00, "WHICH IS WHY YOU HAVE TO BE THE ONE", ['ONE']],
  [17.40, 19.40, "TO CHANGE YOURSELF", ['YOURSELF']],
  [19.50, 22.20, "WHEN THE WORLD AROUND YOU ISN'T FOLLOWING YOUR PLAN", ['PLAN']],
  [22.40, 23.90, "THE ONLY WAY TO FIX IT", ['FIX']],
  [24.00, 25.60, "IS TO FIX YOU", ['YOU']],
  [25.90, 28.30, "IF I CAN'T SEE THE LIGHT THAT LEADS TO THE GOAL", ['LIGHT', 'GOAL']],
  [28.45, 30.50, "THEN I NEED TO BECOME THE LIGHT", ['BECOME', 'LIGHT']],
  [31.30, 33.30, "WATCH ME, I'LL DEVOUR IT", ['DEVOUR']],
  [33.40, 35.20, "AND TURN IT INTO LIGHT", ['LIGHT']],
  [35.90, 37.40, "IF IT MEANS WINNING", ['WINNING']],
  [37.50, 40.40, "I DON'T MIND DESTROYING MY OWN SELF", ['DESTROYING']],
  [41.30, 43.50, "I'LL BE REBORN AGAIN", ['REBORN']],
  [43.60, 45.70, "AS MANY TIMES AS IT TAKES", ['TAKES']],
];
const DROPS = [6.95, 17.40, 24.00, 28.45, 33.40, 37.50, 41.30];
const KNOCKS = [9.9, 10.3, 10.7, 11.25, 11.65, 12.05];

// ───────── renderer, scene, post ─────────
const canvas3d = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 9, 22);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 80);
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.38, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// floor: glossy reflection, darkened and faded into the void
const reflector = new Reflector(new THREE.PlaneGeometry(60, 60), { clipBias: 0.003, textureWidth: W / 2, textureHeight: H / 2, color: 0x3a3a3a });
reflector.rotation.x = -Math.PI / 2; scene.add(reflector);
const fadeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512); return new THREE.CanvasTexture(c);
})();
const fade = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
fade.rotation.x = -Math.PI / 2; fade.position.set(1.8, 0.002, 0); scene.add(fade);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.004; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);

// lights
const key = new THREE.SpotLight(0xfff4e8, 90, 0, 0.62, 0.65, 2);
key.position.set(2.6, 7.5, 4.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight(0xdfe6ff, 1.1); rim.position.set(-3, 4, -5); scene.add(rim);
const hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 0.35); scene.add(hemi);
const heroLight = new THREE.PointLight(0xfff0d8, 0, 9, 2); scene.add(heroLight);
const flagLight = new THREE.PointLight(0xff2b2b, 0, 3, 2); scene.add(flagLight);

// ───────── materials & geometry ─────────
const M = {
  hero: new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.42, metalness: 0.0, emissive: 0xffffff, emissiveIntensity: 0 }),
  old: new THREE.MeshStandardMaterial({ color: 0x7c818b, roughness: 0.7 }),
  them: new THREE.MeshStandardMaterial({ color: 0x8d929c, roughness: 0.65, transparent: true }),
  brick: new THREE.MeshStandardMaterial({ color: 0xd9ccb7, roughness: 0.86 }),
  wbrick: new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.42, emissive: 0xffffff, emissiveIntensity: 0.3 }),
  red: new THREE.MeshStandardMaterial({ color: 0xe81c1c, roughness: 0.4, emissive: 0xff1010, emissiveIntensity: 0.25 }),
  pole: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }),
};
const BW = 0.4, BH = 0.2, BD = 0.2;
const brickGeo = new RoundedBoxGeometry(BW - 0.012, BH - 0.012, BD - 0.012, 2, 0.022);

// ───────── figure rig ─────────
function capsule(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); m.castShadow = true; return m; }
function makeFigure(mat, s = 1) {
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.92;
  const torso = new THREE.Group(); hips.add(torso);
  const body = capsule(0.16, 0.42, mat); body.position.y = 0.32; torso.add(body);
  const pelvis = capsule(0.14, 0.12, mat); pelvis.rotation.z = Math.PI / 2; pelvis.position.y = 0.02; hips.add(pelvis);
  const neck = new THREE.Group(); neck.position.y = 0.66; torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), mat); head.position.y = 0.17; head.castShadow = true; neck.add(head);
  const limb = (parent, x, y, len1, len2, r) => {
    const j1 = new THREE.Group(); j1.position.set(x, y, 0); parent.add(j1);
    const a = capsule(r, len1, mat); a.position.y = -len1 / 2 - r * 0.3; j1.add(a);
    const j2 = new THREE.Group(); j2.position.y = -len1 - r * 0.6; j1.add(j2);
    const b = capsule(r * 0.92, len2, mat); b.position.y = -len2 / 2 - r * 0.3; j2.add(b);
    return [j1, j2];
  };
  const [shL, elL] = limb(torso, -0.25, 0.58, 0.26, 0.24, 0.058);
  const [shR, elR] = limb(torso, 0.25, 0.58, 0.26, 0.24, 0.058);
  const [hipL, knL] = limb(hips, -0.1, 0, 0.36, 0.36, 0.07);
  const [hipR, knR] = limb(hips, 0.1, 0, 0.36, 0.36, 0.07);
  root.scale.setScalar(s);
  return { root, hips, torso, neck, shL, elL, shR, elR, hipL, knL, hipR, knR };
}
const POSES = {
  stand: { sp: 0, hd: 0, shLx: 0, shLz: 0.08, elL: 0, shRx: 0, shRz: -0.08, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  slump: { sp: 0.38, hd: 0.5, shLx: 0.15, shLz: 0.05, elL: -0.2, shRx: 0.15, shRz: -0.05, elR: -0.2, hpL: -0.1, knL: 0.2, hpR: -0.1, knR: 0.2, y: -0.04 },
  knock: { sp: 0.05, hd: 0.1, shLx: 0.05, shLz: 0.08, elL: 0, shRx: -1.55, shRz: -0.1, elR: -1.0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  kneel: { sp: 0.55, hd: 0.25, shLx: -1.0, shLz: 0.1, elL: -0.4, shRx: -1.25, shRz: -0.1, elR: -0.3, hpL: -1.45, knL: 1.5, hpR: 0.15, knR: 1.75, y: -0.42 },
  power: { sp: -0.08, hd: -0.15, shLx: 0, shLz: 0.55, elL: 0, shRx: 0, shRz: -0.55, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  arms: { sp: -0.12, hd: -0.3, shLx: 0, shLz: 2.6, elL: 0, shRx: 0, shRz: -2.6, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  flag: { sp: -0.1, hd: -0.25, shLx: 0, shLz: 0.25, elL: 0, shRx: 0, shRz: -2.75, elR: 0, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
  shock: { sp: -0.12, hd: -0.25, shLx: -0.3, shLz: 0.35, elL: -0.5, shRx: -0.3, shRz: -0.35, elR: -0.5, hpL: 0, knL: 0, hpR: 0, knR: 0, y: 0 },
};
const mix = (a, b, k) => { const o = {}; for (const n in a) o[n] = lerp(a[n], b[n], k); return o; };
function walk(base, ph, amt = 1) {
  const o = { ...base }, s = Math.sin(ph) * amt;
  o.hpL += 0.45 * s; o.hpR -= 0.45 * s; o.knL += 0.5 * Math.max(0, -Math.sin(ph)) * amt; o.knR += 0.5 * Math.max(0, Math.sin(ph)) * amt;
  o.shLx -= 0.35 * s; o.shRx += 0.35 * s; o.y += 0.025 * Math.abs(Math.cos(ph)) * amt; return o;
}
function applyPose(f, p) {
  f.hips.position.y = 0.92 + p.y; f.torso.rotation.x = p.sp; f.neck.rotation.x = p.hd;
  f.shL.rotation.set(p.shLx, 0, p.shLz); f.elL.rotation.x = p.elL; f.shR.rotation.set(p.shRx, 0, p.shRz); f.elR.rotation.x = p.elR;
  f.hipL.rotation.x = p.hpL; f.knL.rotation.x = p.knL; f.hipR.rotation.x = p.hpR; f.knR.rotation.x = p.knR;
}
const hero = makeFigure(M.hero), oldMe = makeFigure(M.old), them = makeFigure(M.them, 1.05);
scene.add(hero.root, oldMe.root, them.root);

// ───────── world layout ─────────
const colX = c => 0.8 + c * 0.42;           // staircase columns
const STEPS = 8;
const SLOTS = [];                             // build order: column by column, bottom up, two bricks deep
for (let c = 0; c < STEPS; c++) for (let l = 0; l <= c; l++) for (const z of [-0.105, 0.105]) SLOTS.push([colX(c), BH / 2 + l * BH, z]);
const NA = SLOTS.length;                      // 72
const FLAG = new THREE.Vector3(colX(STEPS - 1) + 0.12, STEPS * BH, 0);
const PALLET = [1.9, 0, 1.25];
// build schedule (time each brick lands in its slot)
const BT = new Array(NA), BT2 = new Array(NA).fill(null);
for (let k = 0; k < NA; k++) {
  if (k < 12) BT[k] = lerp(17.65, 19.35, k / 11);
  else if (k < 30) BT[k] = lerp(19.6, 21.05, (k - 12) / 17);
  else BT[k] = lerp(22.55, 25.35, E.inOut((k - 30) / (NA - 30)) * 0.55 + (k - 30) / (NA - 30) * 0.45);
}
for (let k = 20; k < 30; k++) BT2[k] = lerp(22.5, 23.4, (k - 20) / 9);     // the bricks that fall when the plan breaks get rebuilt first
for (let k = 30; k < NA; k++) BT[k] = lerp(23.5, 25.35, (k - 30) / (NA - 30));
const r0 = rng(5);
const BR = Array.from({ length: NA }, (_, i) => {
  const a = r0() * Math.PI * 2, rad = 0.35 + r0() * 1.3;
  return {
    body: [(r0() - 0.5) * 0.42, 0.12 + r0() * 1.5, (r0() - 0.5) * 0.24],
    tumble: [r0() * 6, r0() * 6, r0() * 6],
    scatter: [Math.cos(a) * rad, BH / 2, Math.sin(a) * rad * 0.7 + 0.15], sy: r0() * Math.PI,
    fallDur: 0.55 + r0() * 0.45, orb: r0() * Math.PI * 2, orbH: r0(),
    fallen: [colX(4 + (i % 2)) + (r0() - 0.5) * 1.4, BH / 2, 0.55 + r0() * 0.8], fy: r0() * Math.PI,
  };
});
const palletPos = k => { const p = NA - 1 - k, lv = Math.floor(p / 12), q = p % 12; return [PALLET[0] + (q % 4) * BW, BH / 2 + lv * BH, PALLET[2] + Math.floor(q / 4) * BD]; };
// wall for the door scene (someone else's heart)
const WALL = []; for (let row = 0; row < 7; row++) for (let i = 0; i < (row % 2 ? 7 : 6); i++) WALL.push([-1.1 + i * BW + (row % 2 ? -BW / 2 : 0) + BW / 2, BH / 2 + row * BH, -0.95]);
// white bricks: the hero's body when he shatters at the top
const NW = 40;
const TOP = new THREE.Vector3(colX(STEPS - 1), STEPS * BH, 0);
const WB = Array.from({ length: NW }, (_, i) => { const r = rng(100 + i); const a = r() * Math.PI * 2, sp = 1.2 + r() * 2.4;
  return { body: [(r() - 0.5) * 0.4, 0.1 + r() * 1.55, (r() - 0.5) * 0.25], land: [TOP.x + Math.cos(a) * sp, BH / 2, Math.sin(a) * sp * 0.6 + 0.4], tumble: [r() * 9, r() * 9, r() * 9], up: 1 + r() * 1.5 }; });

const bricks = new THREE.InstancedMesh(brickGeo, M.brick, NA); bricks.castShadow = true; bricks.receiveShadow = true; scene.add(bricks);
const wall = new THREE.InstancedMesh(brickGeo, M.brick, WALL.length); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
const wbricks = new THREE.InstancedMesh(brickGeo, M.wbrick, NW); wbricks.castShadow = true; scene.add(wbricks);
for (const m of [bricks, wall, wbricks]) m.frustumCulled = false;
const flag = new THREE.Group();
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), M.pole); pole.position.y = 0.375; pole.castShadow = true; flag.add(pole);
const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2, 12, 4), M.red); cloth.position.set(0.17, 0.62, 0); cloth.castShadow = true;
cloth.material.side = THREE.DoubleSide; flag.add(cloth); scene.add(flag);
const clothBase = cloth.geometry.attributes.position.array.slice();
// the plan: a red dashed path from the hero to the goal, which breaks
const DASH = []; const dashGeo = new THREE.BoxGeometry(0.12, 0.025, 0.025);
for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(dashGeo, M.red); scene.add(m); DASH.push(m); }

// ───────── helpers ─────────
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
function setInst(mesh, i, p, r = [0, 0, 0], s = 1) { tmpP.set(...p); tmpQ.setFromEuler(tmpE.set(...r)); tmpS.setScalar(s); tmpM.compose(tmpP, tmpQ, tmpS); mesh.setMatrixAt(i, tmpM); }
function arc(a, b, u, h) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(Math.PI * u) * h, lerp(a[2], b[2], u)]; }
function fall(a, b, u) { const k = u * u; return [lerp(a[0], b[0], ss(u)), lerp(a[1], b[1], k) + (u > 0.85 ? Math.sin((u - 0.85) / 0.15 * Math.PI) * 0.05 : 0), lerp(a[2], b[2], ss(u))]; }
function heroBody(base, rotY, local) { const c = Math.cos(rotY), s = Math.sin(rotY); return [base[0] + local[0] * c + local[2] * s, base[1] + local[1], base[2] - local[0] * s + local[2] * c]; }

// ───────── hero choreography ─────────
function climbPos(t) {   // 29.2 → 33.3, column by column
  const c = (STEPS) * P(t, 29.2, 33.3), i = Math.min(STEPS - 1, Math.floor(c)), f = c >= STEPS ? 1 : c - i;
  const from = i === 0 ? [0.35, 0] : [colX(i - 1), i * BH], to = [colX(i), (i + 1) * BH];
  const k = ss(f); return { x: lerp(from[0], to[0], k), y: lerp(from[1], to[1], k) + Math.sin(Math.PI * f) * 0.06, ph: c * Math.PI };
}
function heroState(t) {
  let pos = [0, 0, 0], rotY = 0, pose = POSES.stand, vis = true, glow = 0;
  if (t < 6.95) vis = false;
  else if (t < 9.0) { pos = [0, lerp(-1.95, 0, E.out(P(t, 6.95, 7.75))), 0]; pose = mix(POSES.power, POSES.stand, P(t, 7.8, 8.6)); rotY = 0.3 * Math.sin(P(t, 7.9, 9.0) * Math.PI); }
  else if (t < 9.5) { const k = P(t, 9.0, 9.5); pos = [0, 0, lerp(0, -0.45, k)]; rotY = lerp(0, Math.PI, E.inOut(k)); pose = walk(POSES.stand, k * Math.PI * 2, 0.7); }
  else if (t < 12.4) {
    rotY = Math.PI; pos = [0, 0, -0.45];
    let knk = 0; for (const k of KNOCKS) knk = Math.max(knk, Math.sin(Math.PI * P(t, k - 0.1, k + 0.1)));
    pose = mix(POSES.stand, POSES.knock, P(t, 9.5, 9.8)); pose = { ...pose, elR: pose.elR + 0.5 * knk, shRx: pose.shRx + 0.12 * knk };
  } else if (t < 15.0) { rotY = Math.PI; pos = [0, 0, -0.45]; pose = mix(POSES.knock, POSES.slump, E.inOut(P(t, 12.4, 13.2))); }
  else if (t < 16.6) { rotY = lerp(Math.PI, 0, E.inOut(P(t, 15.0, 15.8))); pos = [0, 0, -0.45]; pose = mix(POSES.slump, POSES.stand, P(t, 15.5, 16.2)); }
  else if (t < 17.4) { const k = P(t, 16.6, 17.4); rotY = lerp(0, Math.PI / 2, E.inOut(k)); pos = [lerp(0, 0.25, k), 0, lerp(-0.45, 0.5, k)]; pose = walk(POSES.stand, k * Math.PI * 3, 0.8); }
  else if (t < 25.6) {
    const building = BT.findIndex(b => b > t), k = building < 0 ? NA - 1 : building;
    const sx = SLOTS[k][0] - 0.45;
    rotY = Math.PI / 2;
    const shock = t > 21.2 && t < 22.45;
    pos = [Math.max(0.25, sx), 0, 0.5];
    let reach = 0; for (let j = 0; j < NA; j++) { const d = t - BT[j]; if (d > -0.25 && d < 0.05) reach = Math.max(reach, Math.sin(Math.PI * P(d, -0.25, 0.05))); }
    pose = shock ? mix(POSES.kneel, POSES.shock, E.out(P(t, 21.2, 21.5))) : mix(POSES.stand, POSES.kneel, E.inOut(P(t, 17.4, 17.75)));
    if (!shock) pose = { ...pose, shRx: pose.shRx - 0.35 * reach, shLx: pose.shLx - 0.25 * reach, sp: pose.sp + 0.08 * reach };
    if (t > 22.45 && t < 22.75) pose = mix(POSES.shock, POSES.kneel, P(t, 22.45, 22.75));
    if (t > 25.35) pose = mix(POSES.kneel, POSES.stand, P(t, 25.35, 25.6));
  } else if (t < 29.2) { rotY = Math.PI / 2; pos = [0.35, 0, 0.5]; pose = t < 28.45 ? mix(POSES.stand, POSES.slump, P(t, 25.9, 26.6)) : mix(POSES.slump, POSES.power, E.outBack(P(t, 28.45, 28.8))); pos[2] = lerp(0.5, 0, P(t, 28.8, 29.2)); }
  else if (t < 33.35) { const c = climbPos(t); rotY = Math.PI / 2; pos = [c.x, c.y, 0]; pose = walk(POSES.stand, c.ph, 1); }
  else if (t < 37.5) {
    pos = [TOP.x, TOP.y, 0]; rotY = lerp(Math.PI / 2, 0.35, E.inOut(P(t, 33.4, 34.2)));
    pose = t < 35.9 ? mix(POSES.stand, POSES.arms, E.outBack(P(t, 33.4, 33.8))) : mix(POSES.arms, POSES.flag, P(t, 35.9, 36.4));
  } else {
    pos = [TOP.x, TOP.y, 0]; rotY = 0.35; pose = POSES.arms;
    const re = [[37.5, 41.3, 42.3], [43.6, 43.6, 44.05], [44.4, 44.4, 44.85], [45.05, 45.05, 45.4]];
    // shatter windows: [shatterAt, reformStart, reformEnd]
    vis = true;
    if (t >= 37.5 && t < 42.3) vis = false;
    if (t >= 43.6 && t < 44.05) vis = false;
    if (t >= 44.4 && t < 44.85) vis = false;
  }
  if (t >= 28.45) glow = t < 33.4 ? E.out(P(t, 28.45, 28.9)) : 1;
  if (t >= 37.5) glow = 0.75;
  return { pos, rotY, pose, vis, glow };
}
// white brick shatter cycles: [out start, out dur, back start, back dur]
const CYC = [[37.5, 1.3, 41.3, 1.0], [43.6, 0.22, 43.82, 0.23], [44.4, 0.2, 44.6, 0.25], [45.05, 0.15, 45.2, 0.2]];
function wbrickState(i, t) {
  const b = WB[i], home = heroBody([TOP.x, TOP.y, 0], 0.35, b.body);
  for (let c = CYC.length - 1; c >= 0; c--) {
    const [o, od, bk, bd] = CYC[c];
    if (t < o) continue;
    const land = c === 0 ? b.land : [lerp(home[0], b.land[0], 0.35), home[1] + 0.3 * b.up, lerp(home[2], b.land[2], 0.35)];
    if (t < o + od) { const u = P(t, o, o + od); return { p: c === 0 ? fall(arc(home, [home[0], home[1] + b.up * 0.6, home[2]], 0.5, 0), land, u) : arc(home, land, E.out(u), 0.2), r: b.tumble.map(v => v * u), vis: true }; }
    if (t < bk) return { p: land, r: [0, b.tumble[1], 0], vis: true };
    if (t < bk + bd) { const u = E.inOut(P(t, bk, bk + bd)); return { p: arc(land, home, u, c === 0 ? 0.9 : 0.2), r: b.tumble.map(v => v * (1 - u)), vis: true }; }
    return { vis: false };
  }
  return { vis: false };
}
// stair/rubble bricks
function brickState(i, t) {
  const b = BR[i];
  if (t < 2.2) return null;
  const tr = t > 5.35 && t < 6.95 ? P(t, 5.35, 6.95) : 0;
  const trem = [Math.sin(t * 61 + i) * 0.012 * tr, Math.abs(Math.sin(t * 47 + i * 3)) * 0.02 * tr, 0];
  const t1 = 2.2 + b.fallDur;
  if (t < t1) { const u = P(t, 2.2, t1); return { p: fall([b.body[0], b.body[1], b.body[2]], b.scatter, u), r: [b.tumble[0] * (1 - u), b.sy + b.tumble[1] * (1 - u), b.tumble[2] * (1 - u)] }; }
  const go = 6.95 + i * 0.006;
  if (t < go) return { p: [b.scatter[0] + trem[0], b.scatter[1] + trem[1], b.scatter[2]], r: [0, b.sy, 0] };
  const orbit = tt => { const k = P(tt, 6.95, 8.3), a = b.orb + (tt - 6.95) * 3.2; const rr = 0.75 + 0.25 * Math.sin(b.orb * 3); return [Math.cos(a) * rr, 0.25 + b.orbH * 1.9 * E.out(k) + 0.15, Math.sin(a) * rr]; };
  if (t < go + 0.35) { const u = E.out(P(t, go, go + 0.35)); return { p: arc(b.scatter, orbit(go + 0.35), u, 0.3), r: [u * 2, b.sy + u * 3, 0] }; }
  const land = 8.25 + i * 0.008;
  if (t < land) return { p: orbit(t), r: [t * 2 + i, t * 3 + b.sy, 0] };
  const pp = palletPos(i);
  if (t < land + 0.45) { const u = E.inOut(P(t, land, land + 0.45)); return { p: arc(orbit(land), pp, u, 0.35), r: [(1 - u) * (land * 2 + i), (1 - u) * (land * 3 + b.sy), 0] }; }
  const bt = BT2[i] !== null && BT2[i] !== undefined ? null : null;
  const placeFrom = (from, t0) => ({ p: arc(from, SLOTS[i], E.inOut(P(t, t0 - 0.32, t0)), 0.45), r: [0, (1 - P(t, t0 - 0.32, t0)) * 1.2, 0] });
  if (t < BT[i] - 0.32 && !(i >= 20 && i < 30 && t > 21.2)) return { p: pp, r: [0, 0, 0] };
  if (i >= 20 && i < 30) {
    const firstPlace = lerp(19.6, 21.05, (i - 12) / 17);
    if (t < firstPlace - 0.32) return { p: pp, r: [0, 0, 0] };
    if (t < firstPlace) return { p: arc(pp, SLOTS[i], E.inOut(P(t, firstPlace - 0.32, firstPlace)), 0.45), r: [0, 0, 0] };
    const fs = 21.2 + (i - 20) * 0.025;
    if (t < fs) return { p: SLOTS[i], r: [0, 0, 0] };
    if (t < fs + 0.55) { const u = P(t, fs, fs + 0.55); return { p: fall(SLOTS[i], b.fallen, u), r: [u * 3, b.fy * u, u * 2] }; }
    const rb = BT2[i];
    if (t < rb - 0.32) return { p: b.fallen, r: [0, b.fy, 0] };
    if (t < rb) { const u = E.inOut(P(t, rb - 0.32, rb)); return { p: arc(b.fallen, SLOTS[i], u, 0.5), r: [0, b.fy * (1 - u), 0] }; }
    return { p: SLOTS[i], r: [0, 0, 0] };
  }
  if (t < BT[i]) return placeFrom(pp, BT[i]);
  return { p: SLOTS[i], r: [0, 0, 0] };
}

// ───────── camera choreography ─────────
const CAM = [
  [0.0, [1.5, 1.25, 3.3], [0, 0.85, 0]], [2.0, [1.3, 1.1, 2.9], [0, 0.7, 0]], [3.4, [1.25, 0.85, 2.6], [0.1, 0.35, 0.1]],
  [3.9, [1.4, 1.5, 3.4], [3.4, 1.8, 0]], [5.2, [1.6, 1.6, 3.2], [3.6, 1.85, 0]],
  [5.6, [1.0, 0.6, 2.3], [0, 0.25, 0.1]], [6.9, [0.9, 0.55, 2.0], [0, 0.3, 0.1]],
  [7.6, [2.2, 1.6, 4.4], [0.3, 1.1, 0]], [9.2, [2.6, 1.7, 4.0], [0.2, 1.0, -0.3]],
  [9.6, [1.9, 1.45, 2.4], [0, 1.0, -0.8]], [12.4, [1.7, 1.4, 2.1], [0, 1.0, -0.8]], [14.8, [1.4, 1.2, 2.6], [0, 0.9, -0.5]],
  [15.8, [0.9, 1.35, 2.5], [0, 1.0, -0.3]], [17.3, [1.4, 1.3, 3.1], [0.5, 0.8, 0]],
  [17.8, [2.2, 1.4, 4.1], [1.3, 0.6, 0.1]], [21.0, [2.7, 1.5, 4.5], [1.8, 0.7, 0.1]], [22.4, [2.5, 1.2, 3.9], [2.0, 0.6, 0.3]],
  [25.4, [3.4, 1.8, 5.6], [2.0, 1.0, 0]], [28.4, [2.6, 1.5, 4.8], [1.3, 1.0, 0]],
  [29.3, [1.7, 1.4, 3.6], [0.9, 1.0, 0]], [33.3, [4.7, 2.9, 3.8], [3.5, 2.45, 0]],
  [35.8, [4.5, 3.0, 3.4], [3.7, 2.55, 0]], [37.4, [4.4, 2.9, 3.4], [3.7, 2.45, 0]],
  [39.5, [5.4, 2.9, 5.4], [3.2, 1.6, 0.3]], [41.2, [5.0, 3.0, 4.6], [3.5, 2.3, 0.2]],
  [43.5, [5.6, 3.0, 5.8], [3.2, 1.8, 0]], [45.7, [7.0, 3.6, 8.0], [2.6, 1.4, 0]],
];
const HARD = [3.9, 5.6, 9.6, 17.8, 29.3];   // cuts (with a quick ease) instead of glides
function cameraAt(t) {
  let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
  const [t0, p0, q0] = CAM[i], [t1, p1, q1] = CAM[i + 1];
  let k = E.inOut(P(t, t0, t1));
  if (HARD.includes(t1)) k = ss(P(t, t0, t1));
  const pos = p0.map((v, j) => lerp(v, p1[j], k)), tgt = q0.map((v, j) => lerp(v, q1[j], k));
  for (let j = 0; j < 3; j++) pos[j] = tgt[j] + (pos[j] - tgt[j]) * 1.5;   // pull back for the portrait frame
  // follow the climb
  if (t > 29.3 && t < 33.3) { const c = climbPos(t); const f = ss(P(t, 29.3, 29.8)) * (1 - ss(P(t, 32.6, 33.3))); pos[0] = lerp(pos[0], c.x + 1.3, f); pos[1] = lerp(pos[1], c.y + 1.6, f); pos[2] = lerp(pos[2], 4.4, f); tgt[0] = lerp(tgt[0], c.x + 0.2, f); tgt[1] = lerp(tgt[1], c.y + 0.9, f); }
  // impact shake on drops
  for (const d of DROPS) { const q = t - d; if (q > 0 && q < 0.5) { const a = Math.exp(-q * 11) * 0.06; pos[0] += a * Math.sin(q * 90); pos[1] += a * Math.cos(q * 77); } }
  for (const d of KNOCKS) { const q = t - d; if (q > 0 && q < 0.25) pos[1] += Math.exp(-q * 20) * 0.012 * Math.sin(q * 120); }
  // breathing drift
  pos[0] += Math.sin(t * 0.37) * 0.04; pos[1] += Math.sin(t * 0.29) * 0.03;
  return { pos, tgt };
}

// ───────── update the whole world for time t ─────────
function update(t) {
  // old self
  oldMe.root.visible = t < 2.2;
  applyPose(oldMe, POSES.slump);
  oldMe.root.position.set(t > 1.95 ? Math.sin(t * 90) * 0.01 : 0, 0, 0);
  // them (behind the wall), turning away and walking off
  them.root.visible = t > 9.3 && t < 14.8;
  if (them.root.visible) {
    const turn = E.inOut(P(t, 12.6, 13.2)), go = P(t, 13.1, 14.7);
    them.root.position.set(0.25, 0, -1.4 - go * 3.2); them.root.rotation.y = turn * Math.PI;
    applyPose(them, go > 0 ? walk(POSES.stand, go * 14, 0.9) : POSES.stand);
    M.them.opacity = 1 - P(t, 13.8, 14.7);
  }
  // hero
  const h = heroState(t);
  hero.root.visible = h.vis; hero.root.position.set(...h.pos); hero.root.rotation.y = h.rotY; applyPose(hero, h.pose);
  M.hero.emissiveIntensity = h.glow * 0.55;
  // bricks
  for (let i = 0; i < NA; i++) { const s = brickState(i, t); if (!s) setInst(bricks, i, [0, -5, 0], [0, 0, 0], 0.001); else setInst(bricks, i, s.p, s.r); }
  bricks.instanceMatrix.needsUpdate = true;
  WALL.forEach((p, i) => {
    const up = E.outBack(P(t, 9.15 + i * 0.006, 9.45 + i * 0.006)), down = E.in(P(t, 14.9 + (i % 7) * 0.02, 15.5 + (i % 7) * 0.02));
    const y = lerp(p[1] - 1.6, p[1], up) - down * 1.6;
    if (up <= 0 || down >= 1) setInst(wall, i, [0, -5, 0], [0, 0, 0], 0.001); else setInst(wall, i, [p[0], y, p[2]]);
  });
  wall.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < NW; i++) { const s = wbrickState(i, t); if (!s.vis) setInst(wbricks, i, [0, -5, 0], [0, 0, 0], 0.001); else setInst(wbricks, i, s.p, s.r); }
  wbricks.instanceMatrix.needsUpdate = true;
  // flag: floats as a distant goal, lands on the top step once the stairs exist, raised at the end
  flag.visible = t > 3.75;
  const appear = E.outBack(P(t, 3.75, 4.2));
  let fp = FLAG.clone(); fp.y += 0.25 * (1 - P(t, 25.0, 25.5)) + Math.sin(t * 1.6) * 0.04 * (1 - P(t, 25.0, 25.5));
  flag.position.copy(fp); flag.scale.setScalar(Math.max(0.001, appear)); flag.rotation.set(0, 0, 0);
  if (t > 36.0 && t < 37.5) { const k = E.inOut(P(t, 36.0, 36.5)); const hand = heroBody([TOP.x, TOP.y, 0], 0.35, [0.3, 1.45, 0]); flag.position.set(lerp(fp.x, hand[0], k), lerp(fp.y, hand[1] - 0.35, k), lerp(fp.z, hand[2], k)); }
  if (t >= 37.5) { const k = E.in(P(t, 37.5, 38.1)); const hand = heroBody([TOP.x, TOP.y, 0], 0.35, [0.3, 1.45, 0]); flag.position.set(hand[0] + k * 0.2, lerp(hand[1] - 0.35, FLAG.y, ss(P(t, 37.5, 38.3))), hand[2]); flag.rotation.z = -0.4 * k * (1 - P(t, 38.3, 38.8)); }
  const ca = cloth.geometry.attributes.position;
  for (let v = 0; v < ca.count; v++) { const x = clothBase[v * 3]; ca.setZ(v, Math.sin(x * 14 - t * 7) * 0.025 * (x + 0.17) * 3); }
  ca.needsUpdate = true;
  M.red.emissiveIntensity = t < 25.9 ? 0.25 : t < 28.45 ? 0.08 : 0.32;
  flagLight.position.copy(flag.position).add(new THREE.Vector3(0.17, 0.6, 0.2)); flagLight.intensity = flag.visible ? (t < 25.9 ? 0.3 : t < 28.45 ? 0.08 : 0.5) : 0;
  // the plan: dashes from the hero toward the goal (19.6), falling when the world doesn't follow (21.2)
  DASH.forEach((m, i) => {
    const u = i / (DASH.length - 1), x = lerp(0.45, FLAG.x, u), y = Math.min(STEPS * BH, Math.max(0, (x - 0.6) / 0.42) * BH) + 0.04;
    const on = P(t, 19.6 + u * 0.8, 19.7 + u * 0.8), drop = P(t, 21.2 + (i % 5) * 0.04, 21.9 + (i % 5) * 0.04);
    m.visible = on > 0 && drop < 1 && t < 22.2;
    m.position.set(x, y + 0.02 - drop * drop * (y + 0.1), 0.32); m.rotation.set(drop * i, 0, Math.atan2(BH, 0.42) * 0.9 + drop * 2); m.scale.setScalar(on);
  });
  // lighting cues
  const dark = P(t, 25.8, 26.6) * (1 - P(t, 28.45, 28.7));
  key.intensity = lerp(90, 12, dark) * (t > 37.5 ? 0.85 : 1); hemi.intensity = lerp(0.35, 0.04, dark); rim.intensity = lerp(1.1, 0.15, dark);
  key.target.position.set(...(t < 9.4 ? [0, 0.6, 0] : t < 15.4 ? [0, 0.8, -0.7] : t < 29 ? [1.6, 0.6, 0] : [3.0, 1.4, 0]));
  key.position.set(t < 17 ? 2.6 : 4.2, 7.5, 4.5);
  const hp = hero.root.position;
  heroLight.position.set(hp.x + 0.3, hp.y + 2.3, hp.z + 1.1);
  let hl = h.glow * 3;
  const burst = t - 33.4; if (burst > 0 && burst < 1.5) hl += 6 * Math.exp(-burst * 3);
  const ign = t - 28.45; if (ign > 0 && ign < 1) hl += 5 * Math.exp(-ign * 4);
  if (t >= 37.5) hl = 2 + (t > 41.3 && t < 42.6 ? 5 * Math.sin(Math.PI * P(t, 41.3, 42.6)) : 0);
  heroLight.intensity = hl;
  bloom.strength = 0.38 + (h.glow > 0 ? 0.12 : 0) + (burst > 0 && burst < 1.2 ? 0.45 * Math.exp(-burst * 2.5) : 0) + (ign > 0 && ign < 0.8 ? 0.4 * Math.exp(-ign * 3) : 0);
  renderer.toneMappingExposure = 1.0 + (t > 45.0 ? -P(t, 45.25, 45.7) : 0);
  const c = cameraAt(t); camera.position.set(...c.pos); camera.lookAt(...c.tgt);
}

// ───────── 2D overlay: captions, world labels, grade ─────────
const out = document.getElementById('c'); out.width = W; out.height = H; const ctx = out.getContext('2d');
const MONO = '"JetBrains Mono"';
const syl = w => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g) || []).length);
const WORDS = [];
PHRASES.forEach(([t0, t1, text, acc], pi) => { const ws = text.split(' '), wt = ws.map(syl), tot = wt.reduce((a, b) => a + b, 0); let a = 0; ws.forEach((w, i) => { WORDS.push({ pi, w, t: t0 + (t1 - t0) * 0.85 * a / tot, acc: acc.includes(w.replace(/[,.]/g, '')) }); a += wt[i]; }); });
function wrap(words, maxW, size) {
  ctx.font = `700 ${size}px ${MONO}`; ctx.letterSpacing = '4px';
  const lines = [[]]; let w = 0;
  for (const word of words) { const ww = ctx.measureText(word.w + ' ').width; if (lines[lines.length - 1].length && w + ww > maxW) { lines.push([]); w = 0; } lines[lines.length - 1].push(word); w += ww; }
  return lines;
}
function captions(t) {
  let pi = -1; PHRASES.forEach((p, i) => { if (t >= p[0] - 0.02) pi = i; });
  if (pi < 0) return;
  const [, t1] = PHRASES[pi], next = PHRASES[pi + 1] ? PHRASES[pi + 1][0] : DUR;
  const outK = P(t, Math.min(t1 + 0.4, next - 0.1), next - 0.02);
  const ws = WORDS.filter(w => w.pi === pi), size = ws.length <= 4 ? 58 : 46;
  const lines = wrap(ws, 900, size);
  ctx.save(); ctx.textBaseline = 'middle'; ctx.font = `700 ${size}px ${MONO}`; ctx.letterSpacing = '4px';
  lines.forEach((ln, li) => {
    const lw = ln.reduce((a, w) => a + ctx.measureText(w.w + ' ').width, 0) - ctx.measureText(' ').width;
    let x = W / 2 - lw / 2; const y = 1460 + (li - (lines.length - 1) / 2) * size * 1.35;
    for (const w of ln) {
      const d = t - w.t, ww = ctx.measureText(w.w).width;
      if (d >= 0) {
        const k = E.out(P(d, 0, 0.18));
        ctx.globalAlpha = k * (1 - outK);
        ctx.fillStyle = w.acc ? '#FF2B2B' : '#F4F4F6';
        if (w.acc) { ctx.shadowColor = 'rgba(255,40,40,0.7)'; ctx.shadowBlur = 18; } else ctx.shadowBlur = 0;
        ctx.fillText(w.w, x, y + (1 - k) * 14);
      }
      x += ctx.measureText(w.w + ' ').width;
    }
  });
  ctx.restore();
}
function label(text, world, t, t0, t1, col = '#F4F4F6') {
  const a = P(t, t0, t0 + 0.3) * (1 - P(t, t1 - 0.3, t1)); if (a <= 0) return;
  const v = new THREE.Vector3(...world).project(camera); if (v.z > 1) return;
  const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `700 34px ${MONO}`; ctx.letterSpacing = '6px'; ctx.textAlign = 'center'; ctx.fillStyle = col;
  ctx.fillText(text, x, y); ctx.restore();
}
let NOISE;
function grade(frame) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256; const n = NOISE.getContext('2d'), id = n.createImageData(256, 256), r = rng(9); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } n.putImageData(id, 0, 0); }
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  const pat = ctx.createPattern(NOISE, 'repeat'); pat.setTransform(new DOMMatrix().translate((frame * 53) % 256, (frame * 97) % 256).scale(1.4));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.font = `500 22px ${MONO}`; ctx.letterSpacing = '8px'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(244,244,246,0.22)'; ctx.fillText('REBORN', W / 2, 1830); ctx.restore();
}
window.drawFrame = function (frame) {
  const t = Math.min(frame / FPS, DUR - 1e-3);
  update(t);
  composer.render();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(canvas3d, 0, 0);
  label('OLD ME', [0, 2.0, 0], t, 0.3, 2.2);
  label('GOAL', [FLAG.x + 0.17, FLAG.y + 1.1, 0], t, 4.1, 5.3, '#FF2B2B');
  label('NEW ME', [0, 2.15, 0], t, 7.8, 9.1);
  label('THEM', [0.25, 2.25, -1.4], t, 10.0, 13.2);
  label('YOUR PLAN', [2.2, 1.35, 0.3], t, 19.9, 21.25, '#FF2B2B');
  label('GOAL', [FLAG.x + 0.17, FLAG.y + 1.0, 0], t, 26.4, 28.4, 'rgba(255,43,43,0.45)');
  label('YOU', [TOP.x, TOP.y + 2.0, 0], t, 34.0, 35.8);
  label('REBIRTH × ∞', [TOP.x, TOP.y + 2.1, 0], t, 43.8, 45.4, '#FF2B2B');
  captions(t);
  grade(frame);
  const end = P(t, 45.3, 45.7); if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
};
window.renderFrame = f => { window.drawFrame(f); return out.toDataURL('image/jpeg', 0.92); };
window.ready = document.fonts.load(`700 40px ${MONO}`).then(() => true);
