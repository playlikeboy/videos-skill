// reelkit.js: shared helpers for 1080x1920 canvas reels rendered by the javascript-animation skill.
// A reel page defines FRAMES and draw(t) and then calls startReel(). Every frame is a pure function of t.
const W = 1080, H = 1920, FPS = 30;
const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, start, dur) => clamp((t - start) / dur);
const E = {
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  inOut: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};

// Scene alpha stacks with per-element alpha through GA.
let GA = 1;
const setA = a => { ctx.globalAlpha = clamp(GA * a); };
function scene(t, a, b, fn, fin = .25, fout = .2) {
  if (t < a || t >= b) return;
  const alpha = Math.min(prog(t, a, fin), 1 - prog(t, b - fout, fout));
  const prev = GA; GA = prev * alpha; ctx.save(); fn(t - a, b - a); ctx.restore(); GA = prev; ctx.globalAlpha = 1;
}

function txt(s, x, y, o = {}) {
  const { px = 64, fam = 'Inter', wt = 700, fill = '#fff', align = 'center', alpha = 1, ls = 0 } = o;
  ctx.font = `${wt} ${px}px "${fam}"`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = ls + 'px'; ctx.fillStyle = fill; setA(alpha); ctx.fillText(s, x, y); ctx.letterSpacing = '0px';
}
// Text that rises into place: p is 0..1 progress.
function rise(s, x, y, p, o = {}) { if (p <= 0) return; const e = E.out(p); txt(s, x, y + (1 - e) * 46, { ...o, alpha: (o.alpha ?? 1) * e }); }
function measure(s, px, fam = 'Inter', wt = 700) { ctx.font = `${wt} ${px}px "${fam}"`; return ctx.measureText(s).width; }
function wrap(s, maxW, px, fam = 'Inter', wt = 700) {
  ctx.font = `${wt} ${px}px "${fam}"`;
  const lines = []; let cur = '';
  for (const w of s.split(' ')) { const next = cur ? cur + ' ' + w : w; if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next; }
  if (cur) lines.push(cur); return lines;
}
function rr(x, y, w, h, r, fill, stroke, lw = 3, alpha = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); setA(alpha);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function check(cx, cy, size, p, color, lw = 9) {
  if (p <= 0) return;
  const pts = [[-.5, 0], [-.12, .36], [.5, -.34]].map(([a, b]) => [cx + a * size, cy + b * size]);
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  const p1 = clamp(p / .4), p2 = clamp((p - .4) / .6);
  ctx.lineTo(lerp(pts[0][0], pts[1][0], p1), lerp(pts[0][1], pts[1][1], p1));
  if (p2 > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], p2), lerp(pts[1][1], pts[2][1], p2));
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; setA(1); ctx.stroke();
}
function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0), ((s ^ (s >>> 13)) >>> 0) / 4294967296); }

// Code-made soundtrack: kick, hat, bass and a plucked arpeggio on a beat grid. Fades in and out so nothing startles.
function buildScore(ac, { bpm, dur, root = 45, chords = [0, 0, 5, 3], minor = true, kickFrom = 0, level = 1, hits = [] }) {
  const beat = 60 / bpm, f = m => 440 * Math.pow(2, (m - 69) / 12);
  const master = ac.createGain(); master.connect(ac.destination);
  master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(.8 * level, .5);
  master.gain.setValueAtTime(.8 * level, dur - 1.3); master.gain.linearRampToValueAtTime(0, dur);
  const r = rng(7), noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  const env = (t, peak, decay) => { const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .006); g.gain.exponentialRampToValueAtTime(.0008, t + decay); g.connect(master); return g; };
  const osc = (type, freq, t, decay, peak, lp) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); let node = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(env(t, peak, decay)); o.start(t); o.stop(t + decay + .05); return o;
  };
  const tri = minor ? [0, 3, 7, 12] : [0, 4, 7, 12], beats = Math.floor(dur / beat);
  for (let i = 0; i < beats; i++) {
    const t = i * beat, ch = root + chords[Math.floor(i / 4) % chords.length];
    if (t >= kickFrom) {
      const k = osc('sine', 150, t, .24, .95); k.frequency.exponentialRampToValueAtTime(44, t + .13);
      const h = ac.createBufferSource(); h.buffer = noise; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
      h.connect(hp); hp.connect(env(t + beat / 2, .13, .06)); h.start(t + beat / 2); h.stop(t + beat / 2 + .1);
    }
    for (let e = 0; e < 2; e++) {
      const te = t + e * beat / 2;
      osc('sawtooth', f(ch - 12), te, .22, .2, 420);
      osc('triangle', f(ch + 12 + tri[(i * 2 + e) % 4]), te, .3, .13);
    }
  }
  for (const t of hits) { // soft impact on scene changes
    const n = ac.createBufferSource(); n.buffer = noise; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(200, t + .5);
    n.connect(lp); lp.connect(env(t, .3, .55)); n.start(t); n.stop(t + .6);
    const s = osc('sine', 90, t, .5, .5); s.frequency.exponentialRampToValueAtTime(38, t + .4);
  }
}

function startReel(frames, draw) {
  window.FRAMES = frames; window.FPS = FPS;
  window.draw = fr => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; GA = 1; ctx.clearRect(0, 0, W, H); draw(fr / FPS); };
  if (!location.search.includes('render')) { const t0 = performance.now(); const loop = () => { window.draw(Math.floor(((performance.now() - t0) / 1000 * FPS) % frames)); requestAnimationFrame(loop); }; loop(); }
  else window.draw(0);
}
