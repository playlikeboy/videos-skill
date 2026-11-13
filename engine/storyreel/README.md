# storyreel

Turns one JSON story into a narrated, captioned 1080x1920 story reel with 3D characters. The format follows the "In this town…" story reels analysed in `ANALYSIS.md`.

## Build

Run from the project root (`videos-skill/`):

```bash
node engine/storyreel/build.mjs engine/storyreel/stories/balloon-secrets.json            # full MP4
node engine/storyreel/build.mjs engine/storyreel/stories/balloon-secrets.json --sheet    # one frame per shot
node engine/storyreel/build.mjs engine/storyreel/stories/balloon-secrets.json --stills 9.6,13.5
```

Output goes to `engine/storyreel/build/<story name>/`: `<name>.mp4`, `sheet.jpg`, `timeline.json`, `words.json`, `voice.wav`, `bed.wav`.

A 31 s reel renders in about 85 s with 12 workers on this machine. Always run `--sheet` and look at it before a full build.

Needs: Node 18+, ffmpeg, Chrome, `playwright-core` and `three` (installed in the project root), and `engine/storyreel/.venv` with `edge-tts`. Narration sends the script text to Microsoft's online speech service.

## Pipeline

| Step | File | What it does |
|---|---|---|
| 1 | `tts.py` | Narrates the whole script in one request, speeds it to `meta.wpm`, writes word timings |
| 2 | `build.mjs` | Builds the timeline: each shot starts on the first word of its `say` text |
| 3 | `player.html` + `lib/world.js` | Draws any frame from the timeline (three.js). Headless Chrome workers save the frames |
| 4 | `lib/audio.mjs` | Synthesizes the music bed and effects: whoosh on set change, boom on `flash`, thud on `shake`, pops |
| 5 | `build.mjs` | Encodes, mixes the bed under the voice, normalizes to −16 LUFS |

Every frame is a pure function of the frame number. Keep it that way: no `Math.random`, no clocks, no state carried between frames.

## Story file

```json
{
  "meta":  { "voice": "en-US-BrianNeural", "wpm": 265, "mood": "calm", "fps": 30 },
  "cast":  { "kabir": { "skin": "#c68655", "shirt": "#f77f00", "pants": "#3d405b", "hair": "#16110d", "hairStyle": "spiky", "balloonColor": "#ff4d6d" } },
  "sets":  { "day": { "type": "campus", "time": "day" } },
  "shots": [ { "say": "But *big* ones?", "set": "day", "cam": { "shot": "close", "on": "kabir", "el": -14 }, "actors": [ { "id": "kabir", "at": [0, 0], "anim": "shock", "expr": "shock", "balloon": 3.2 } ] } ]
}
```

Write one shot per clause. A shot lists everything in it; nothing carries over from the previous shot.

### meta

| Key | Values |
|---|---|
| `voice` | Any edge-tts voice. Falls back to Brian, Andrew, Aria if the service refuses one |
| `wpm` | Target speaking rate. Tempo change is capped at 1.7x |
| `mood` | `calm`, `tense`, `happy` (music bed) |
| `bedGain` | Bed level under the voice, default 0.55 |
| `music`, `musicGain` | A music file to loop under the voice instead of the code-made bed (path from the project root), and its level, default 0.32. Use only music you have the rights to |
| `tail` | Seconds held after the last word, default 0.8 |

### cast

`skin`, `shirt`, `pants`, `hair`, `shoes`, `capColor`, `balloonColor` (hex colours), `hairStyle` (`short`, `bob`, `bun`, `spiky`, `cap`, `beanie`), `scale`.

### sets

| `type` | Contents | Useful spots (x, z) |
|---|---|---|
| `campus` | Main building at the back (`sign` text, default LIBRARY), hostel block on the right, fountain, benches, lamps, trees | Fountain (4.6, 1.4), benches (−3.4, −1.6) and (3.3, −2.6), lamp (−2.2, 2.5), building front z = −8 |
| `street` | Road, houses and trees both sides | Road centre x = 0 |
| `bedroom` | Two walls, bed, window, desk, lamp, rug | Bed top (−2.6, y 0.9, −0.6) |
| `classroom` | Board, nine desks | Desks on a 2.9 x 2.2 grid |

`time`: `day`, `sunset`, `night`. Add a set by writing a function in `SETS` in `lib/world.js`.

### shots

| Key | Meaning |
|---|---|
| `say` | Words spoken during this shot. `*word*` makes the caption yellow |
| `set` | Key from `sets` |
| `cam` | Camera, see below |
| `actors` | Named cast members in the shot |
| `crowd` or `crowds` | Background characters |
| `fx` | `["flash"]` white flash and boom at the cut, `["shake"]` camera shake and thud |

**cam**

| Key | Meaning |
|---|---|
| `shot` | `wide`, `full`, `medium`, `close`, `xclose`, `low`, `high`, `top` |
| `on` | Actor id (camera follows them) or a point `[x, y, z]` |
| `move` | `push` (default), `pull`, `orbit`, `truck`, `crane`. Every move also drifts slightly |
| `az`, `el` | Angle around the target and above it, in degrees. `az` 0 is straight in front |
| `dist`, `fov`, `roll`, `speed`, `deg`, `amt`, `rise` | Overrides for distance, lens, dutch tilt and move size |

**actors**

| Key | Meaning |
|---|---|
| `id` | Key from `cast` |
| `at`, `to` | `[x, z]` or `[x, y, z]`. With `to`, the actor moves across the shot and faces the direction of travel |
| `face` | Heading in degrees. 0 faces the default camera |
| `anim` | `idle`, `walk`, `run`, `talk`, `wave`, `cheer`, `shock`, `sad`, `sit`, `sleep`, `float`, `hang`, `cling`, `reach`, `yell`, `fall`, `splash` |
| `expr` | `neutral`, `happy`, `sad`, `cry`, `shock`, `angry`, `yell`, `sleepy`, `smirk` |
| `ease` | `out` (default), `in`, `linear` |
| `moveFor`, `then`, `exprThen` | Finish the move in this fraction of the shot, then switch animation and expression |
| `balloon`, `pop` | Balloon size on the right wrist; `pop` is the second within the shot when it bursts |
| `scale` | Size multiplier |

**crowd**: `n`, `area` `[x0, z0, x1, z1]`, `anim`, `expr`, `face`, `seed`, `balloon`, `lift` `[y0, y1]`, `pop`, `popSpread`, `after`, `exprAfter`, `offset`.

## Adding to the engine

| To add | Where |
|---|---|
| An animation | One `else if` in `pose()` |
| An expression | One branch in `faceTex()` |
| A set | One function in `SETS` |
| A story prop (number badge, string to the sky, glowing object) | Follow the balloon: create it in `makeChar()`, position it in `place()` |
| A sound effect | One branch in `writeBed()` and one event in step 4 of `build.mjs` |

## Known limits

- The balloon is the only story prop so far.
- No lip movement; talking is a head nod and a hand gesture.
- Chrome renders with software WebGL here, so render time grows with crowd size.
- I have checked frames by eye but nobody has yet listened to a finished mix.
