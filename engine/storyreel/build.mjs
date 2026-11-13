#!/usr/bin/env node
// build.mjs: story.json -> narrated, captioned 1080x1920 MP4.
//
//   node engine/storyreel/build.mjs engine/storyreel/stories/<name>.json            full build
//   node engine/storyreel/build.mjs <story> --sheet                                 one frame per shot, tiled
//   node engine/storyreel/build.mjs <story> --stills 1.5,7.2                        frames at those seconds
//   options: --workers N (default 8)   --retts (narrate again even if the text is unchanged)
//
// Steps: 1 narration + word timings (tts.py)  2 timeline (each cut lands on a word start)
//        3 frames (headless Chrome, several workers)  4 music bed + effects  5 mux and loudness-normalize.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, createReadStream, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeBed } from './lib/audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../..');
const { chromium } = createRequire(ROOT + '/')('playwright-core');
const args = process.argv.slice(2), storyPath = resolve(args[0] || '');
const opt = n => { const i = args.indexOf(n); return i < 0 ? undefined : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
if (!args[0] || !existsSync(storyPath)) { console.error('usage: node build.mjs story.json [--sheet] [--stills s1,s2] [--workers N] [--retts]'); process.exit(1); }
const story = JSON.parse(readFileSync(storyPath, 'utf8')), name = basename(storyPath, '.json'), OUT = join(HERE, 'build', name);
mkdirSync(OUT, { recursive: true });
const fps = story.meta?.fps || 30;

// 1. narration (skipped when the spoken text and voice settings are unchanged)
const sayHash = createHash('sha1').update(JSON.stringify([story.shots.map(s => s.say), story.meta?.voice, story.meta?.wpm, story.meta?.pitch])).digest('hex');
if (opt('--retts') || !existsSync(join(OUT, 'words.json')) || !existsSync(join(OUT, 'say.hash')) || readFileSync(join(OUT, 'say.hash'), 'utf8') !== sayHash) {
  execFileSync(join(HERE, '.venv/bin/python'), [join(HERE, 'tts.py'), storyPath, OUT], { stdio: 'inherit' }); writeFileSync(join(OUT, 'say.hash'), sayHash);
}
const words = JSON.parse(readFileSync(join(OUT, 'words.json'), 'utf8'));

// 2. timeline: a shot starts on the first word spoken in it
const starts = story.shots.map((_, i) => words.find(w => w.shot === i)?.t0);
const duration = words[words.length - 1].t1 + (story.meta?.tail ?? .8);
const shots = story.shots.map((s, i) => { let t1 = duration; for (let j = i + 1; j < starts.length; j++) if (starts[j] !== undefined) { t1 = starts[j]; break; } return { ...s, t0: i === 0 ? 0 : starts[i] ?? t1, t1 }; });
const tl = { fps, duration, cast: story.cast, sets: story.sets, shots, words };
writeFileSync(join(OUT, 'timeline.json'), JSON.stringify(tl));
const frames = Math.round(duration * fps);
console.log(`timeline: ${shots.length} shots, ${duration.toFixed(1)}s, median shot ${[...shots.map(s => s.t1 - s.t0)].sort((a, b) => a - b)[shots.length >> 1].toFixed(2)}s`);

// 3. frames
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/engine/storyreel/player.html?render&tl=/engine/storyreel/build/${encodeURIComponent(name)}/timeline.json`;
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
async function openPage() {
  let browser; try { browser = await chromium.launch({ channel: 'chrome', args: GL }); } catch { browser = await chromium.launch({ args: GL }); }
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto(url); try { await page.waitForFunction('window.READY === true', null, { timeout: 120000 }); } catch { console.error('player failed to start:', errs); await browser.close(); process.exit(1); }
  return { browser, page, errs };
}
const grab = (page, f) => page.evaluate(f => { window.draw(f); return document.getElementById('out').toDataURL('image/jpeg', .93).split(',')[1]; }, f).then(b => Buffer.from(b, 'base64'));
const FR = join(OUT, 'frames'); rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });

async function renderList(list, workers) { // list: [{frame, file}]
  const n = Math.min(workers, list.length), t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: n }, async (_, w) => {
    const { browser, page, errs } = await openPage();
    const lo = Math.floor(list.length * w / n), hi = Math.floor(list.length * (w + 1) / n);
    for (let i = lo; i < hi; i++) { writeFileSync(list[i].file, await grab(page, list[i].frame)); if (++done % 150 === 0) console.log(`frames ${done}/${list.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
    if (errs.length) console.error('page errors:', errs.slice(0, 3)); await browser.close();
  }));
}
const tile = (pattern, count, out, cols = 6) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', pattern, '-vf', `scale=270:480,tile=${cols}x${Math.ceil(count / cols)}`, '-frames:v', '1', '-q:v', '4', out]);

if (opt('--sheet') || opt('--stills')) {
  const secs = opt('--stills') ? String(opt('--stills')).split(',').map(Number) : shots.map(s => s.t0 + (s.t1 - s.t0) * .6);
  const list = secs.map((s, i) => ({ frame: Math.min(frames - 1, Math.round(s * fps)), file: join(FR, `s${String(i).padStart(4, '0')}.jpg`) }));
  await renderList(list, Number(opt('--workers')) || 8);
  if (opt('--sheet')) { tile(join(FR, 's%04d.jpg'), list.length, join(OUT, 'sheet.jpg')); console.log('sheet ->', join(OUT, 'sheet.jpg')); } else console.log('stills ->', FR);
  server.close(); process.exit(0);
}
await renderList(Array.from({ length: frames }, (_, f) => ({ frame: f, file: join(FR, `f${String(f).padStart(6, '0')}.jpg`) })), Number(opt('--workers')) || 8);
server.close();

// 4. music bed + effects: a whoosh on every change of set, hits where the story asks for them
const events = [];
shots.forEach((s, i) => {
  if (i && s.set !== shots[i - 1].set) events.push({ t: s.t0, type: 'whoosh' });
  if (s.fx?.includes('flash')) events.push({ t: s.t0, type: 'boom' }); if (s.fx?.includes('shake')) events.push({ t: s.t0, type: 'thud' });
  for (const a of [...(s.actors || []), ...(s.crowds || (s.crowd ? [s.crowd] : []))]) if (a.pop !== undefined) for (let k = 0; k < (a.n ? Math.min(7, a.n) : 1); k++) events.push({ t: s.t0 + a.pop + k * (a.popSpread ?? .8) / 7, type: 'pop' });
});
// meta.music: a music file (path from the project root) to loop under the voice instead of the code-made bed.
let music = story.meta?.music ? resolve(ROOT, story.meta.music) : null;
if (music && !existsSync(music)) { console.warn('meta.music not found, using the code-made bed instead:', music); music = null; }
writeBed(join(OUT, 'bed.wav'), duration, story.meta?.mood, events, !!music);

// 5. encode and mix. The bed sits under the voice; the mix is normalized to -16 LUFS like the reference.
const mp4 = join(OUT, `${name}.mp4`);
const fadeOut = `afade=t=out:st=${Math.max(0, duration - 1.2).toFixed(2)}:d=1.2`;
const mix = music
  ? `[1:a]apad[v];[2:a]volume=.9[b];[3:a]volume=${story.meta?.musicGain ?? .32},afade=t=in:d=0.4,${fadeOut}[m];[v][b][m]amix=inputs=3:duration=shortest:normalize=0,loudnorm=I=-16:LRA=5:TP=-1.5[a]`
  : `[1:a]apad[v];[2:a]volume=${story.meta?.bedGain ?? .55}[b];[v][b]amix=inputs=2:duration=shortest:normalize=0,loudnorm=I=-16:LRA=5:TP=-1.5[a]`;
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(FR, 'f%06d.jpg'), '-i', join(OUT, 'voice.wav'), '-i', join(OUT, 'bed.wav'), ...(music ? ['-stream_loop', '-1', '-i', music] : []),
  '-filter_complex', mix,
  '-map', '0:v', '-map', '[a]', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', duration.toFixed(3), '-movflags', '+faststart', mp4], { stdio: 'inherit' });
rmSync(FR, { recursive: true, force: true });
console.log('done ->', mp4);
