// world.js: the 3D side of storyreel. Builds sets and characters, and draws any frame of a timeline.
// Every frame is a pure function of the frame number: no accumulated state, no Math.random, no clocks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = x => 1 - Math.pow(1 - clamp(x), 2.2);
const rad = d => d * Math.PI / 180;
function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0), ((s ^ (s >>> 13)) >>> 0) / 4294967296); }
const v3 = (p, y = 0) => (p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p[0], y, p[1]));

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0, ...o });
function box(g, w, h, d, color, x, y, z, o = {}) {
  const geo = o.r ? new RoundedBoxGeometry(w, h, d, 3, o.r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.m)); m.position.set(x, y, z);
  m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m); return m;
}
function cyl(g, r1, r2, h, color, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, o.seg || 16), o.mat || mat(color, o.m)); m.position.set(x, y, z);
  m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m); return m;
}
function ball(g, r, color, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), o.mat || mat(color, o.m)); m.position.set(x, y, z);
  m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m); return m;
}

// ---------- faces: one small canvas texture per expression, shared by every character ----------
const FACES = {};
function faceTex(expr) {
  if (FACES[expr]) return FACES[expr];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const eye = (cx, cy, rx, ry) => { x.fillStyle = '#1b1b24'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx - rx * .3, cy - ry * .35, rx * .32, ry * .28, 0, 0, 7); x.fill(); };
  const arc = (cx, cy, r, a0, a1, lw = 9) => { x.strokeStyle = '#1b1b24'; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
  const brow = (x0, y0, x1, y1) => { x.strokeStyle = '#1b1b24'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
  const L = 82, R = 174, EY = 112;
  x.fillStyle = 'rgba(255,120,120,.28)'; for (const cx of [52, 204]) { x.beginPath(); x.ellipse(cx, 160, 22, 13, 0, 0, 7); x.fill(); }
  if (expr === 'happy') { arc(L, EY + 8, 20, Math.PI * 1.1, Math.PI * 1.9, 10); arc(R, EY + 8, 20, Math.PI * 1.1, Math.PI * 1.9, 10); x.fillStyle = '#1b1b24'; x.beginPath(); x.arc(128, 168, 30, 0, Math.PI); x.fill(); x.fillStyle = '#ff7a8a'; x.beginPath(); x.ellipse(128, 188, 15, 8, 0, 0, 7); x.fill(); }
  else if (expr === 'sleepy') { arc(L, EY, 18, .15 * Math.PI, .85 * Math.PI); arc(R, EY, 18, .15 * Math.PI, .85 * Math.PI); x.fillStyle = '#1b1b24'; x.beginPath(); x.ellipse(128, 178, 9, 11, 0, 0, 7); x.fill(); }
  else if (expr === 'shock') { for (const cx of [L, R]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, EY, 27, 0, 7); x.fill(); x.fillStyle = '#1b1b24'; x.beginPath(); x.arc(cx, EY, 11, 0, 7); x.fill(); } brow(L - 24, 68, L + 20, 62); brow(R - 20, 62, R + 24, 68); x.fillStyle = '#1b1b24'; x.beginPath(); x.ellipse(128, 186, 20, 27, 0, 0, 7); x.fill(); }
  else if (expr === 'sad' || expr === 'cry') { eye(L, EY + 4, 14, 18); eye(R, EY + 4, 14, 18); brow(L - 22, 84, L + 18, 70); brow(R - 18, 70, R + 22, 84); arc(128, 204, 26, Math.PI * 1.2, Math.PI * 1.8); if (expr === 'cry') { x.fillStyle = '#58b8ff'; for (const cx of [L, R]) { x.beginPath(); x.ellipse(cx, EY + 44, 9, 22, 0, 0, 7); x.fill(); } } }
  else if (expr === 'angry') { eye(L, EY + 4, 14, 16); eye(R, EY + 4, 14, 16); brow(L - 22, 70, L + 20, 88); brow(R - 20, 88, R + 22, 70); x.fillStyle = '#1b1b24'; x.fillRect(100, 176, 56, 14); }
  else if (expr === 'yell') { arc(L, EY + 6, 18, Math.PI * 1.1, Math.PI * 1.9, 10); arc(R, EY + 6, 18, Math.PI * 1.1, Math.PI * 1.9, 10); brow(L - 22, 72, L + 20, 82); brow(R - 20, 82, R + 22, 72); x.fillStyle = '#1b1b24'; x.beginPath(); x.ellipse(128, 184, 30, 32, 0, 0, 7); x.fill(); x.fillStyle = '#ff7a8a'; x.beginPath(); x.ellipse(128, 202, 17, 10, 0, 0, 7); x.fill(); }
  else { eye(L, EY, 15, 20); eye(R, EY, 15, 20); if (expr === 'smirk') arc(136, 160, 26, .15 * Math.PI, .7 * Math.PI); else arc(128, 158, 22, .2 * Math.PI, .8 * Math.PI); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (FACES[expr] = t);
}

// ---------- characters: rounded toy figures with a big head, mitten hands and shoes ----------
const LEG = .62, TOR = .72, HEAD = .66;
function makeChar(c) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = LEG;
  const skin = c.skin || '#f1c7a1', shirt = c.shirt || '#3bb273', pants = c.pants || '#2b3a67', hair = c.hair || '#3a2a1a', shoes = c.shoes || '#f4f4f4';
  box(body, .72, TOR, .42, shirt, 0, TOR / 2, 0, { r: .1 });
  const headG = new THREE.Group(); headG.position.y = TOR + .02; body.add(headG);
  box(headG, .72, HEAD, .66, skin, 0, HEAD / 2, 0, { r: .16 });
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex('neutral'), transparent: true, depthWrite: false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), faceMat); face.position.set(0, HEAD / 2 - .02, .335); headG.add(face);
  const hs = c.hairStyle || 'short';
  if (hs === 'short' || hs === 'bob' || hs === 'bun') { box(headG, .78, .26, .72, hair, 0, HEAD - .05, -.01, { r: .1 }); box(headG, .78, .5, .2, hair, 0, HEAD / 2 + .08, -.29, { r: .08 }); }
  if (hs === 'bob') { box(headG, .16, .56, .5, hair, -.36, HEAD / 2 - .04, -.06, { r: .06 }); box(headG, .16, .56, .5, hair, .36, HEAD / 2 - .04, -.06, { r: .06 }); }
  if (hs === 'bun') ball(headG, .2, hair, 0, HEAD + .16, -.12);
  if (hs === 'spiky') for (let i = 0; i < 5; i++) { const m = cyl(headG, 0, .15, .34, hair, -.26 + i * .13, HEAD + .1, -.02 + (i % 2) * .1, { seg: 5 }); m.rotation.z = (i - 2) * -.18; }
  if (hs === 'cap') { box(headG, .78, .22, .72, c.capColor || '#e63946', 0, HEAD - .04, 0, { r: .09 }); box(headG, .6, .06, .34, c.capColor || '#e63946', 0, HEAD - .12, .44, { r: .025 }); }
  if (hs === 'beanie') { box(headG, .78, .3, .72, c.capColor || '#ffb703', 0, HEAD - .04, 0, { r: .13 }); ball(headG, .11, '#ffffff', 0, HEAD + .17, 0); }
  const arm = side => { const g = new THREE.Group(); g.position.set(side * .47, TOR - .08, 0); body.add(g); box(g, .22, .6, .25, shirt, 0, -.25, 0, { r: .08 }); const hand = ball(g, .135, skin, 0, -.62, 0); return { g, hand }; };
  const leg = side => { const g = new THREE.Group(); g.position.set(side * .18, LEG, 0); root.add(g); box(g, .3, LEG - .1, .32, pants, 0, -(LEG - .1) / 2, 0, { r: .07 }); box(g, .32, .16, .44, shoes, 0, -LEG + .08, .05, { r: .06 }); return g; };
  const aL = arm(-1), aR = arm(1);
  // balloon: lives in the scene, tied to the right hand each frame
  const bal = new THREE.Group(); const bMat = mat(c.balloonColor || '#ff4d6d', { roughness: .25, emissive: c.balloonColor || '#ff4d6d', emissiveIntensity: .28 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 18), bMat); sphere.scale.set(1, 1.16, 1); sphere.castShadow = true; bal.add(sphere);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(.08, .12, 8), bMat); knot.position.y = -.62; bal.add(knot);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1, 5), new THREE.MeshBasicMaterial({ color: '#f5f5f5' }));
  return { root, body, headG, armL: aL.g, armR: aR.g, handR: aR.hand, legL: leg(-1), legR: leg(1), faceMat, bal, string, scale: c.scale || 1 };
}

// Pose a character for an animation. t: seconds into the shot, g: seconds into the film (keeps idle motion continuous over cuts).
function pose(ch, anim, t, g, ph = 0) {
  const { body, headG, armL, armR, legL, legR, root } = ch;
  for (const o of [body, headG, armL, armR, legL, legR]) o.rotation.set(0, 0, 0);
  body.position.y = LEG; let lift = 0; const s = Math.sin, a = g * 2.2 + ph;
  armL.rotation.z = -.1; armR.rotation.z = .1; body.position.y += s(a) * .012; headG.rotation.z = s(a * .7) * .03;
  const swing = (w, A) => { const k = s(t * w + ph); legL.rotation.x = k * A; legR.rotation.x = -k * A; armL.rotation.x = -k * A * .9; armR.rotation.x = k * A * .9; body.position.y += Math.abs(Math.cos(t * w + ph)) * .05; };
  if (anim === 'walk') swing(9, .6);
  else if (anim === 'run') { swing(15, .95); body.rotation.x = .16; }
  else if (anim === 'talk') { headG.rotation.x = s(t * 9) * .05; armR.rotation.x = -.9 + s(t * 6) * .25; armR.rotation.z = .25; }
  else if (anim === 'wave') { armR.rotation.z = 2.5 + s(t * 11) * .35; }
  else if (anim === 'cheer') { armL.rotation.z = -2.7; armR.rotation.z = 2.7; lift = Math.abs(s(t * 8 + ph)) * .28; }
  else if (anim === 'shock') { armL.rotation.z = -.9; armR.rotation.z = .9; body.rotation.x = -.12; headG.rotation.x = -.1; root.position.x += s(t * 60) * .012 * clamp(1 - t * 2); }
  else if (anim === 'sad') { headG.rotation.x = .38; body.rotation.x = .1; armL.rotation.z = -.04; armR.rotation.z = .04; }
  else if (anim === 'sit') { legL.rotation.x = legR.rotation.x = -1.5; lift = -.36; }
  else if (anim === 'sleep') { root.rotation.x = -Math.PI / 2; lift = .5; body.position.y += s(g * 1.6) * .01; }
  else if (anim === 'float') { armR.rotation.z = 2.95; armR.rotation.x = s(a) * .06; legL.rotation.x = .18 + s(a) * .1; legR.rotation.x = -.1 - s(a) * .1; body.rotation.z = s(a * .8) * .06; lift = s(a * 1.3) * .06; }
  else if (anim === 'hang') { armL.rotation.z = -2.9; armR.rotation.z = 2.9; body.rotation.z = s(t * 4) * .12; legL.rotation.x = s(t * 4) * .3; legR.rotation.x = -s(t * 4) * .3; }
  else if (anim === 'cling') { root.rotation.x = .85; armL.rotation.x = armR.rotation.x = -2.2; armL.rotation.z = .25; armR.rotation.z = -.25; legL.rotation.x = s(t * 7) * .35; legR.rotation.x = -s(t * 7) * .35; headG.rotation.x = -.6; }
  else if (anim === 'reach') { armR.rotation.x = -2.5; armR.rotation.z = .15; armL.rotation.x = -2.3; headG.rotation.x = -.35; body.rotation.x = -.08; lift = Math.abs(s(t * 7)) * .12; }
  else if (anim === 'yell') { armL.rotation.x = -2.0; armL.rotation.z = .55; armR.rotation.x = -2.0; armR.rotation.z = -.55; headG.rotation.x = -.28; body.rotation.x = -.1 + s(t * 20) * .015; }
  else if (anim === 'fall') { root.rotation.x = t * 5; armL.rotation.z = -2.2; armR.rotation.z = 2.2; }
  else if (anim === 'splash') { legL.rotation.x = legR.rotation.x = -1.45; lift = -.3; armL.rotation.z = -1.6; armR.rotation.z = 1.6; }
  return lift;
}

// ---------- sets ----------
const TIME = {
  day: { sky: ['#4f9fe8', '#bfe3ff'], hemi: ['#ffffff', '#7fa66b', 1.15], sun: ['#fff1d6', 2.6, [7, 11, 6]], fog: ['#cfe6fb', 26, 80], lit: 0 },
  sunset: { sky: ['#3f4a9a', '#ffb07a'], hemi: ['#ffd3b0', '#59506e', .95], sun: ['#ff9d5c', 2.7, [-9, 5, 5]], fog: ['#f5b89a', 24, 75], lit: .5 },
  night: { sky: ['#03040f', '#141d4a'], hemi: ['#5868c9', '#0c0c1c', 1.0], sun: ['#a8bcff', 1.5, [-6, 10, 5]], fog: ['#0b1030', 22, 70], lit: 1 },
};
function skyTex(top, bottom, stars) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, top); g.addColorStop(.75, bottom); g.addColorStop(1, bottom); x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
  if (stars) { const r = rng(11); x.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { x.globalAlpha = .3 + r() * .7; const sz = r() < .1 ? 3 : 1.6; x.fillRect(r() * 512, r() * 700, sz, sz); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tree(g, x, z, s = 1, leaf = '#3f9b4b') { cyl(g, .16 * s, .22 * s, 1.5 * s, '#7a4f2b', x, .75 * s, z, { seg: 8 }); ball(g, 1.0 * s, leaf, x, 2.1 * s, z); ball(g, .75 * s, leaf, x + .55 * s, 2.7 * s, z + .2 * s); ball(g, .7 * s, leaf, x - .5 * s, 2.6 * s, z - .2 * s); }
function lamp(g, scene, x, z, lit) { cyl(g, .06, .08, 3.2, '#3d4350', x, 1.6, z, { seg: 8 }); const m = ball(g, .2, '#fff4c9', x, 3.3, z, { cast: false, m: { emissive: '#ffe9a8', emissiveIntensity: lit ? 2.4 : .15 } }); if (lit) { const p = new THREE.PointLight('#ffd98a', 14, 11, 1.8); p.position.set(x, 3.2, z); scene.add(p); } return m; }
function windows(g, cx, cy, cz, cols, rows, dx, dy, lit, seed, w = .7, h = .9, axis = 'z') {
  const r = rng(seed);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = lit && r() < .62, m = mat(on ? '#ffd772' : '#9cc9ee', { emissive: on ? '#ffc94d' : '#000000', emissiveIntensity: on ? 1.5 * lit : 0, roughness: .3 });
    const ox = (i - (cols - 1) / 2) * dx, oy = j * dy;
    if (axis === 'z') box(g, w, h, .08, 0, cx + ox, cy + oy, cz, { mat: m, cast: false }); else box(g, .08, h, w, 0, cx, cy + oy, cz + ox, { mat: m, cast: false });
  }
}
function signTex(text, bg = '#263354', fg = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 192; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 1024, 192);
  x.fillStyle = fg; x.font = '900 120px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 512, 104); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SETS = {
  // An open college quad: main building at the back, hostel block on the right, fountain, benches, lamps.
  campus(g, scene, o, T) {
    box(g, 120, .2, 120, '#5fae57', 0, -.1, 0, { cast: false }); box(g, 3.2, .04, 60, '#e2d3b0', 0, .02, 0, { cast: false }); box(g, 60, .04, 2.6, '#e2d3b0', 0, .02, -4.2, { cast: false });
    box(g, 20, 8.5, 5, '#b8654a', 0, 4.25, -11); box(g, 21, .5, 5.6, '#e9dcc3', 0, 8.7, -11); box(g, 5, 4.6, .8, '#e9dcc3', 0, 2.3, -8.3); box(g, 2, 3, .2, '#5b3a22', 0, 1.5, -7.85);
    for (let i = 0; i < 3; i++) box(g, 6 - i * .5, .2, 1.2 - i * .3, '#cfc7b8', 0, .1 + i * .2, -7.3 - i * .15, { cast: false });
    windows(g, -6.2, 2, -8.46, 4, 3, 1.7, 2.2, T.lit, 3); windows(g, 6.2, 2, -8.46, 4, 3, 1.7, 2.2, T.lit, 4);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .8), new THREE.MeshBasicMaterial({ map: signTex(o.sign || 'LIBRARY') })); sg.position.set(0, 5.2, -7.88); g.add(sg);
    box(g, 6, 11, 16, '#d9c9a8', 15, 5.5, -2); box(g, 6.4, .5, 16.4, '#8d5a44', 15, 11.2, -2); windows(g, 11.96, 1.8, -2, 6, 4, 2.4, 2.3, T.lit, 9, .9, 1.1, 'x');
    cyl(g, 2.1, 2.3, .55, '#d7d2c8', 4.6, .28, 1.4, { seg: 28 }); cyl(g, 1.85, 1.85, .1, '#49b6ff', 4.6, .52, 1.4, { seg: 28, cast: false, m: { roughness: .15, emissive: '#1d6fb3', emissiveIntensity: .3 } }); cyl(g, .16, .22, 1.2, '#d7d2c8', 4.6, 1, 1.4); ball(g, .28, '#d7d2c8', 4.6, 1.7, 1.4);
    for (const [x, z] of [[-3.4, -1.6], [3.3, -2.6]]) { box(g, 1.9, .12, .6, '#9a6a3c', x, .55, z); box(g, 1.9, .5, .1, '#9a6a3c', x, .95, z - .28); box(g, .12, .55, .5, '#3d4350', x - .8, .27, z); box(g, .12, .55, .5, '#3d4350', x + .8, .27, z); }
    for (const [x, z] of [[-2.2, 2.5], [2.2, -5.6], [-2.2, -5.6], [8, 4]]) lamp(g, scene, x, z, T.lit);
    for (const [x, z, s] of [[-7, -3, 1.2], [-9.5, 2, 1.5], [-6, 5.5, 1.1], [8.6, -6, 1.3], [-12, -7, 1.6], [9.5, 7.5, 1.2]]) tree(g, x, z, s);
  },
  // A residential street: road down the middle, houses and trees on both sides.
  street(g, scene, o, T) {
    box(g, 120, .2, 120, '#5fae57', 0, -.1, 0, { cast: false }); box(g, 7, .04, 120, '#3b3f4a', 0, .02, 0, { cast: false }); for (let z = -40; z < 40; z += 3) box(g, .16, .02, 1.2, '#f0d24a', 0, .05, z, { cast: false });
    for (const sx of [-1, 1]) { box(g, 2, .16, 120, '#cfc7b8', sx * 4.6, .08, 0, { cast: false }); for (let i = 0; i < 5; i++) { const z = -22 + i * 9.5, x = sx * 10, col = ['#c96f53', '#e8d8b0', '#8fa9c4', '#d9a05b', '#b8654a'][(i + (sx > 0 ? 2 : 0)) % 5]; box(g, 6.5, 4.4, 6, col, x, 2.2, z); const roof = cyl(g, 0, 4.9, 2.4, '#5c3b34', x, 5.6, z, { seg: 4 }); roof.rotation.y = Math.PI / 4; box(g, 1.1, 2.1, .12, '#5b3a22', x - sx * 3.3, 1.05, z + 1.6); windows(g, x - sx * 3.3, 2.6, z - .9, 2, 1, 1.6, 1, T.lit, i * 7 + (sx > 0 ? 50 : 0), 1.0, 1.1, 'x'); tree(g, sx * 6.3, z + 4.6, .9); lamp(g, scene, sx * 3.9, z + 4.2, T.lit); } }
  },
  // A hostel room: two walls, bed, window, desk.
  bedroom(g, scene, o, T) {
    box(g, 9, .2, 8, '#a8744a', 0, -.1, 0, { cast: false }); box(g, 9, 5, .2, o.wall || '#4c6fa8', 0, 2.5, -3.2, { cast: false }); box(g, .2, 5, 8, o.wall2 || '#42639a', -4.4, 2.5, 0, { cast: false });
    box(g, 2.3, 2.3, .1, 0, 1.6, 2.6, -3.08, { cast: false, mat: new THREE.MeshBasicMaterial({ map: skyTex(T.sky[0], T.sky[1], T.lit === 1) }) }); box(g, 2.5, .12, .16, '#f1ede4', 1.6, 2.6, -3.04); box(g, .12, 2.5, .16, '#f1ede4', 1.6, 2.6, -3.04); box(g, 2.6, .14, .3, '#f1ede4', 1.6, 1.4, -3);
    box(g, 2.2, .5, 4.2, '#7b5233', -2.6, .35, -.6, { r: .06 }); box(g, 2.1, .3, 4.0, '#f4f1ea', -2.6, .72, -.6, { r: .1 }); box(g, 2.14, .24, 2.6, o.blanket || '#2ec4b6', -2.6, .86, .1, { r: .1 }); box(g, 1.3, .22, .7, '#ffffff', -2.6, .98, -2.1, { r: .1 }); box(g, 2.2, 1.3, .2, '#7b5233', -2.6, .9, -2.75, { r: .05 });
    box(g, 2.2, .1, 1, '#c9a26b', 2.7, 1.1, -2.5); for (const [x, z] of [[1.7, -2.9], [3.7, -2.9], [1.7, -2.1], [3.7, -2.1]]) box(g, .1, 1.1, .1, '#8a6a42', x, .55, z); box(g, .5, .7, .06, '#1d1f2b', 2.4, 1.5, -2.7); const bulb = ball(g, .16, '#fff1c2', 3.4, 1.55, -2.5, { cast: false, m: { emissive: '#ffd98a', emissiveIntensity: 2 } }); cyl(g, .04, .1, .4, '#3d4350', 3.4, 1.3, -2.5); const p = new THREE.PointLight('#ffd08a', 9, 9, 1.6); p.position.set(3.2, 1.9, -2); scene.add(p);
    box(g, 3.2, .03, 2.2, '#e85d75', .6, .02, .6, { cast: false, r: .01 });
  },
  // A classroom: board at the back, rows of desks.
  classroom(g, scene, o, T) {
    box(g, 12, .2, 11, '#c9b08a', 0, -.1, 0, { cast: false }); box(g, 12, 5, .2, '#efe6d2', 0, 2.5, -4.6, { cast: false }); box(g, .2, 5, 11, '#e6dcc6', -6, 2.5, 0, { cast: false }); box(g, 5.6, 2.2, .1, '#2f5d50', 0, 2.7, -4.45, { cast: false }); box(g, 5.9, .12, .2, '#8a6a42', 0, 1.55, -4.4);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 2.9, z = -1.6 + r * 2.2; box(g, 1.5, .08, .8, '#b98d58', x, .98, z); box(g, .08, .96, .08, '#555b66', x - .65, .48, z); box(g, .08, .96, .08, '#555b66', x + .65, .48, z); }
    const p = new THREE.PointLight('#fff3da', 20, 16, 1.4); p.position.set(0, 4.4, 0); scene.add(p);
  },
};
function buildSet(def) {
  const scene = new THREE.Scene(), T = TIME[def.time || 'day'];
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex(T.sky[0], T.sky[1], T.lit === 1), side: THREE.BackSide, fog: false })); scene.add(sky);
  scene.fog = new THREE.Fog(T.fog[0], T.fog[1], T.fog[2]);
  scene.add(new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]));
  const sun = new THREE.DirectionalLight(T.sun[0], T.sun[1]); sun.position.set(...T.sun[2]); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; scene.add(sun);
  if (T.lit === 1 && def.type !== 'bedroom' && def.type !== 'classroom') { const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#f6f1d2', fog: false })); moon.position.set(-22, 46, -60); scene.add(moon); }
  const g = new THREE.Group(); scene.add(g); SETS[def.type](g, scene, def, T);
  const N = 600, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const bits = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: .13, sizeAttenuation: true })); bits.frustumCulled = false; scene.add(bits);
  return { scene, chars: {}, crowd: [], bits, N };
}

// ---------- camera ----------
const FRAMING = { wide: { d: 12, el: 10 }, full: { d: 6.6, el: 6 }, medium: { d: 4.0, el: 4 }, close: { d: 2.5, el: 2 }, xclose: { d: 1.7, el: 0 }, low: { d: 4.4, el: -13 }, high: { d: 8.5, el: 36 }, top: { d: 11, el: 68 } };
function aimCamera(cam, shot, lt, dur, where, idx) {
  const c = shot.cam || {}, f = FRAMING[c.shot || 'medium'], e = easeOut(lt / dur), sign = idx % 2 ? 1 : -1;
  let target;
  if (typeof c.on === 'string' && where[c.on]) { const w = where[c.on]; target = w.pos.clone(); target.y += (['wide', 'full', 'high', 'top'].includes(c.shot) ? 1.05 : 1.62) * w.scale; }
  else target = Array.isArray(c.on) ? new THREE.Vector3(...c.on) : new THREE.Vector3(0, 1.3, 0);
  let d = c.dist ?? f.d, az = c.az ?? 0, el = c.el ?? f.el, roll = c.roll ?? 0; const move = c.move || 'push', k = Math.min(.36, (c.speed ?? .09) * dur);
  if (move === 'push') d *= 1 - k * e; else if (move === 'pull') d *= 1 - k * (1 - e); else d *= 1 - .03 * e;
  if (move === 'orbit') az += (c.deg ?? 8 * dur) * (e - .5) * sign; else az += 1.6 * dur * (e - .5) * sign;
  if (move === 'crane') el += (c.deg ?? 14) * (e - .5);
  if (move === 'truck') target.x += (c.amt ?? .5 * dur) * (e - .5) * sign;
  if (c.rise) target.y += c.rise * (e - .5);
  const a = rad(az), b = rad(el);
  cam.position.set(target.x + d * Math.sin(a) * Math.cos(b), Math.max(.22, target.y + d * Math.sin(b)), target.z + d * Math.cos(a) * Math.cos(b));
  cam.fov = c.fov ?? 52; cam.updateProjectionMatrix(); cam.lookAt(target); cam.rotateZ(rad(roll + .5 * sign * (e - .5)));
  if (shot.fx?.includes('shake')) { const q = clamp(1 - lt / .5); cam.position.x += Math.sin(lt * 90) * .05 * q; cam.position.y += Math.cos(lt * 77) * .05 * q; }
}

// ---------- player ----------
export function createPlayer(tl, out) {
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(52, W / H, .1, 200), ctx = out.getContext('2d'), fps = tl.fps, sets = {};
  const getSet = id => sets[id] || (sets[id] = buildSet(tl.sets[id]));
  const PAL = { skin: ['#f1c7a1', '#e0a878', '#c68655', '#8d5a3a', '#f6d7bd'], shirt: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f77f00', '#ffffff', '#3a86ff', '#8ac926'], pants: ['#2b3a67', '#3d405b', '#1d3557', '#5c4d7d', '#6b705c'], hair: ['#2b1d14', '#3a2a1a', '#6b4423', '#111111', '#a55728', '#d9b382'], style: ['short', 'bob', 'bun', 'spiky', 'cap', 'beanie'], bal: ['#ff4d6d', '#ffd166', '#4cc9f0', '#b5179e', '#80ed99', '#ff9f1c'] };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function getChar(S, id) { if (!S.chars[id]) { const ch = makeChar(tl.cast[id] || {}); S.scene.add(ch.root, ch.bal, ch.string); S.chars[id] = ch; } return S.chars[id]; }
  function getCrowd(S, i) { if (!S.crowd[i]) { const r = rng(1000 + i), ch = makeChar({ skin: pick(r, PAL.skin), shirt: pick(r, PAL.shirt), pants: pick(r, PAL.pants), hair: pick(r, PAL.hair), hairStyle: pick(r, PAL.style), capColor: pick(r, PAL.shirt), balloonColor: pick(r, PAL.bal) }); S.scene.add(ch.root, ch.bal, ch.string); S.crowd[i] = ch; } return S.crowd[i]; }
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  // Place one figure for this frame. Returns its position so the camera can find it.
  function place(S, ch, a, lt, dur, g, ph, bursts) {
    const mp = clamp(lt / (dur * (a.moveFor ?? 1))), arrived = a.then && mp >= 1, from = v3(a.at || [0, 0]), to = a.to ? v3(a.to) : from, pos = from.clone().lerp(to, a.to ? (a.ease === 'in' ? mp * mp : a.ease === 'linear' ? mp : easeOut(mp)) : 0);
    const sc = (a.scale || 1) * ch.scale; ch.root.visible = true; ch.root.rotation.set(0, 0, 0); ch.root.position.copy(pos); ch.root.scale.setScalar(sc);
    let face = a.face ?? 0; if (a.to && a.face === undefined) face = Math.atan2(to.x - from.x, to.z - from.z) * 180 / Math.PI;
    const lift = pose(ch, arrived ? a.then : a.anim || 'idle', lt, g, ph); ch.root.position.y += lift * sc; ch.root.rotation.y = rad(face);
    ch.faceMat.map = faceTex((arrived && a.exprThen) || a.expr || 'neutral');
    const size = a.balloon || 0, popAt = a.pop === undefined ? Infinity : a.pop, popped = lt >= popAt;
    ch.bal.visible = ch.string.visible = size > 0 && !popped;
    if (size > 0) {
      ch.root.updateWorldMatrix(true, true); ch.handR.getWorldPosition(tmp);
      const r = .34 + size * .2, sway = Math.sin(g * 1.7 + ph) * .18, top = new THREE.Vector3(tmp.x + sway, tmp.y + 1.0 + size * .45, tmp.z + Math.cos(g * 1.3 + ph) * .1);
      if (!popped) { ch.bal.position.copy(top); ch.bal.scale.setScalar(r / .5 * (1 + .03 * Math.sin(g * 3 + ph))); const mid = tmp.clone().add(top).multiplyScalar(.5), dir = top.clone().sub(tmp), len = dir.length() - r * 1.1; ch.string.position.copy(tmp.clone().add(dir.clone().normalize().multiplyScalar(len / 2))); ch.string.scale.set(1, Math.max(.01, len), 1); ch.string.quaternion.setFromUnitVectors(up, dir.normalize()); }
      else if (lt - popAt < .6) bursts.push({ at: top, age: lt - popAt, seed: Math.floor(ph * 1000) + 1 });
    }
    return { pos, scale: sc };
  }

  function draw(frame) {
    const t = frame / fps; let i = tl.shots.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = tl.shots.length - 1;
    const shot = tl.shots[i], lt = t - shot.t0, dur = shot.t1 - shot.t0, S = getSet(shot.set), where = {}, bursts = [];
    for (const ch of [...Object.values(S.chars), ...S.crowd]) ch.root.visible = ch.bal.visible = ch.string.visible = false;
    (shot.actors || []).forEach((a, n) => { where[a.id] = place(S, getChar(S, a.id), a, lt, dur, t, n * 1.7, bursts); });
    for (const c of shot.crowds || (shot.crowd ? [shot.crowd] : [])) {
      const r = rng(c.seed || 5), [x0, z0, x1, z1] = c.area;
      for (let n = 0; n < c.n; n++) {
        const x = lerp(x0, x1, r()), z = lerp(z0, z1, r()), ph = r() * 6, y0 = c.lift ? c.lift[0] * (0.5 + r()) : 0, y1 = c.lift ? c.lift[1] * (0.5 + r()) : y0, popAt = c.pop === undefined ? undefined : c.pop + r() * (c.popSpread ?? .8);
        const landed = popAt !== undefined && lt >= popAt, fall = landed ? clamp((lt - popAt) / .35) : 0;
        place(S, getCrowd(S, (c.offset || 0) + n), { at: [x, lerp(lerp(y0, y1, easeOut(lt / dur)), 0, fall * fall), z], face: c.face ?? (r() * 60 - 30), anim: landed && fall >= 1 ? (c.after || 'cheer') : c.anim, expr: landed ? (c.exprAfter || 'happy') : c.expr, balloon: c.balloon ? c.balloon * (.6 + r() * .8) : 0, pop: popAt, scale: .9 + r() * .2 }, lt, dur, t, ph, bursts);
      }
    }
    // balloon-pop confetti
    const P = S.bits.geometry.attributes.position; let n = 0;
    for (const b of bursts) { const r = rng(b.seed); for (let k = 0; k < 14 && n < S.N; k++, n++) { const th = r() * 6.28, ph = r() * 3.14, sp = 2 + r() * 3, a = b.age; P.setXYZ(n, b.at.x + Math.sin(ph) * Math.cos(th) * sp * a, b.at.y + Math.cos(ph) * sp * a - 4 * a * a, b.at.z + Math.sin(ph) * Math.sin(th) * sp * a); } }
    for (; n < S.N; n++) P.setXYZ(n, 0, -50, 0); P.needsUpdate = true;
    aimCamera(cam, shot, lt, dur, where, i); renderer.render(S.scene, cam);

    ctx.globalAlpha = 1; ctx.drawImage(glc, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.32)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (shot.fx?.includes('flash')) { ctx.globalAlpha = clamp(1 - lt / .28) * .95; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // captions: one spoken word at a time, popped in on its first frames
    let w = null; for (const x of tl.words) { if (x.t0 <= t + 1e-6) w = x; else break; }
    if (w && t < w.t1 + .35) {
      const age = t - w.t0, s = 1 + .16 * clamp(1 - age / .09), text = w.w.replace(/^[^\w']+|[^\w'%:]+$/g, '');
      ctx.save(); ctx.translate(W / 2, H * .705); ctx.scale(s, s); ctx.font = '900 92px Inter, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.strokeStyle = '#000'; ctx.lineWidth = 20; ctx.strokeText(text, 0, 0); ctx.shadowColor = 'transparent'; ctx.fillStyle = w.hot ? '#ffe14d' : '#fff'; ctx.fillText(text, 0, 0); ctx.restore();
    }
  }
  return { frames: Math.round(tl.duration * fps), fps, draw };
}
