// audio.mjs: a code-made music bed and sound effects, written straight to a WAV file. No samples, no libraries.
import { writeFileSync } from 'node:fs';

const SR = 44100;
const MOODS = {
  calm: { bpm: 100, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 65]] },
  tense: { bpm: 112, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]] },
  happy: { bpm: 116, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]] },
};
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0), ((s ^ (s >>> 13)) >>> 0) / 4294967296); }

// events: [{t, type: 'whoosh' | 'boom' | 'pop' | 'thud'}]
export function writeBed(path, dur, mood = 'calm', events = [], musicOff = false) {
  const M = MOODS[mood] || MOODS.calm, n = Math.ceil(dur * SR), L = new Float32Array(n), R = new Float32Array(n), beat = 60 / M.bpm, bar = beat * 4;
  const add = (i, l, r = l) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };
  // pad + sub: one chord per bar, slow attack and release so chords overlap
  for (let b = 0; !musicOff && b * bar < dur; b++) {
    const ch = M.chords[b % M.chords.length], t0 = b * bar, len = bar + .7;
    for (let k = 0; k < len * SR; k++) {
      const t = k / SR, env = Math.min(1, t / .5) * Math.min(1, (len - t) / .7); let v = 0;
      for (const m of ch) { const f = hz(m); v += Math.sin(6.2832 * f * t) + .35 * Math.sin(6.2832 * f * 2.003 * t) + .15 * Math.sin(6.2832 * f * 3.001 * t); }
      v = v / ch.length * .11 * env * (1 + .15 * Math.sin(6.2832 * .4 * (t0 + t))); const sub = Math.sin(6.2832 * hz(ch[0] - 24) * t) * .1 * env;
      add(Math.floor(t0 * SR) + k, v + sub);
    }
    // plucked eighth notes, alternating sides
    for (let e = 0; e < 8; e++) {
      const m = ch[[0, 2, 1, 2, 3 % ch.length, 2, 1, 2][e]] + 12, ts = t0 + e * beat / 2, f = hz(m), pan = e % 2 ? .7 : .3;
      for (let k = 0; k < .4 * SR; k++) { const t = k / SR, v = (Math.sin(6.2832 * f * t) + .3 * Math.sin(6.2832 * f * 3 * t)) * Math.exp(-t * 9) * .085; add(Math.floor(ts * SR) + k, v * (1 - pan) * 2, v * pan * 2); }
    }
  }
  const r = rng(3);
  for (const ev of events) {
    const i0 = Math.floor(ev.t * SR);
    if (ev.type === 'whoosh') { // band-passed noise sweeping up
      let lo = 0, bp = 0; const len = .38 * SR;
      for (let k = 0; k < len; k++) { const p = k / len, fc = 300 + 3200 * p * p, f = 2 * Math.sin(Math.PI * fc / SR), x = r() * 2 - 1; const hp = x - lo - .5 * bp; bp += f * hp; lo += f * bp; add(i0 - Math.floor(len * .6) + k, bp * Math.sin(Math.PI * p) ** 2 * .22); }
    } else if (ev.type === 'boom' || ev.type === 'thud') {
      const g = ev.type === 'boom' ? .5 : .3; let ph = 0;
      for (let k = 0; k < .7 * SR; k++) { const t = k / SR, f = 38 + 60 * Math.exp(-t * 9); ph += 6.2832 * f / SR; add(i0 + k, Math.sin(ph) * Math.exp(-t * 6) * g + (r() * 2 - 1) * Math.exp(-t * 40) * .1); }
    } else if (ev.type === 'pop') {
      let ph = 0; for (let k = 0; k < .12 * SR; k++) { const t = k / SR, f = 300 + 900 * Math.exp(-t * 40); ph += 6.2832 * f / SR; add(i0 + k, (Math.sin(ph) * .2 + (r() * 2 - 1) * .25 * Math.exp(-t * 90)) * Math.exp(-t * 28)); }
    }
  }
  // fades, then 16-bit stereo WAV
  for (let i = 0; i < n; i++) { const t = i / SR, g = Math.min(1, t / .4) * Math.min(1, (dur - t) / 1.2); L[i] *= g; R[i] *= g; }
  const buf = Buffer.alloc(44 + n * 4); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  writeFileSync(path, buf);
}
