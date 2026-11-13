# Reference analysis: "In this world" story compilation

Source: https://www.youtube.com/watch?v=ZjevJcMNo4Y ("In This World Roblox Animation Stories Compilation", channel Goofy Reacts, 17 min 18 s, uploaded 2026-10-23). It is a compilation of vertical story reels shown in a 1920x1080 frame with blurred side bars. Analysed 2026-11-13.

This file records what was measured and how the engine reproduces the format. The stories, characters and look of the source belong to their makers: copy the craft, never the content.

## How it was measured

| What | Method |
|---|---|
| Script and word timing | Speech-to-text with word timestamps (faster-whisper `small.en`) |
| Cuts | ffmpeg scene detection (threshold 0.30) on the centre 9:16 crop |
| Camera motion | For each shot, feature-matched its first and last frames (ORB + RANSAC similarity transform), giving zoom, pan, tilt and roll per second |
| Framing and style | One frame per shot on contact sheets, read by eye |
| Audio | EBU R128 loudness, narrator pitch by autocorrelation, energy in the gaps between words |

Raw numbers are in `reference/`: `cuts.txt` and `camera-per-shot.json`. The transcript and frame sheets of the source video are kept locally only and are not in the repository.

## Script

Ten stories, 35 s to 193 s each. The detector split two of them in half, so the local per-story table has 12 rows.

Every story follows the same skeleton:

1. **Rule (first sentence).** "In this town / In this world, [one impossible rule]." Examples: the moon tucks kids into bed; everyone gets one million steps in a lifetime; a lie shrinks you one inch; a hug swaps your ages.
2. **Mechanism.** Starts with "You see,". Says exactly how the rule works and what it costs you.
3. **Society adapts.** Starts with "So". Two or three quick, funny, visual consequences ("Kids get pulled to school in wagons, grandmas ride ziplines").
4. **One person.** A first-person narrator ("my best friend Jaden") and one named character with a problem the rule makes worse.
5. **Break.** "But one night…" The rule is tested or broken.
6. **Escalation.** Short sentences, one beat each. A reveal about what the rule really is.
7. **Landing.** A changed world in one or two lines, often a callback to an early detail, or a stated moral ("When you skip the hard moments in life, you often skip the beautiful ones hiding right behind them").

Measured writing style:

| Measure | Value |
|---|---|
| Speaking rate | 250–291 words per minute, about 268 overall |
| Sentence length | 5–11 words on average, shorter near the climax |
| Pauses longer than 0.4 s | 17 in 4,636 words. None longer than 1 s |
| Voice | First person, past tense for events, present tense for the rule |
| Names | Plain first names, introduced once |

## Edit and pacing

| Measure | Value |
|---|---|
| Shots | 466 cuts in 1,037 s |
| Median shot length | about 1.7 s. Middle 80% of shots run 0.8 s to 3.6 s |
| Cut placement | 86% of cuts fall within 0.15 s of a word starting |
| Transitions | Hard cuts only. A white flash on a few impact moments |
| New picture | Roughly one new image per clause; the picture shows the noun being spoken |

## Camera

Of 466 shots, 81 could not be matched (too dark, or everything in frame moved) and 40 were under 0.7 s. Among the rest:

| Motion | Share of all shots |
|---|---|
| Push-in, alone or combined with pan, tilt or roll | 56% |
| Pull-out, alone or combined | 9% |
| Pan or tilt without zoom | 2% |
| Locked off | 2% |

- The median push-in scales the picture about 10% per second. Treat that as approximate: characters moving in frame inflate it.
- A shot is almost never still. Even "static" framings drift.
- Framing alternates hard between wide establishing shots, low-angle close-ups of a face, and high angles on crowds.
- Close-ups use a wide lens close to the face, so heads look large.
- Dutch tilt (a few degrees of roll) shows up on tense beats.

## Picture

- Blocky toy-like 3D characters with painted faces. Expression changes by swapping the face: neutral, happy, shocked, crying, angry, asleep.
- Body acting is broad and simple: arms up, lean back, run, float, lie down.
- Built 3D sets with real lighting and shadows. Time of day carries mood: bright day for the rule, night or red light for danger, warm light for endings.
- Story-rule props are large and readable at phone size: glowing numbers on chests, strings going up into the sky, a moon with a face.
- Crowds of 10–40 background characters sell "everyone in this town".

## Captions

| Property | Value |
|---|---|
| Amount | One word on screen at a time, in sync with the voice |
| Position | Centred, about 70% down the frame |
| Type | Heavy sans-serif, white fill, thick black outline, soft drop shadow |
| Size | A six-letter word spans about one third of the frame width |
| Variant | Some later clips use two-line phrases near the top, with one word in capitals |

## Audio

| Measure | Value |
|---|---|
| Loudness | −16.3 LUFS integrated, loudness range 3.6 LU (flat and constant) |
| Narrator pitch | Median about 188 Hz (range 142–262 Hz): a young-sounding or pitched-up voice |
| Bed under the voice | Gaps between words are only about 2 dB quieter than speech, so music or ambience runs the whole time |
| Beat | No strong regular beat detected: the bed reads as ambient, not drum-led |

I could not listen to the audio. Sound effects on actions are likely but were not confirmed.

## How the engine maps to this

| Finding | Engine behaviour |
|---|---|
| About 268 wpm, no pauses | Narration is sped up to `meta.wpm` (default 265) |
| Cuts land on word starts | Each shot begins on the first word of its `say` text |
| Median shot 1.7 s | One shot per clause; the build prints the median so you can check |
| 56% push-ins, nothing static | `cam.move` defaults to `push`; every other move still drifts |
| Wide, low close-up, high crowd | `cam.shot`: `wide`, `full`, `medium`, `close`, `xclose`, `low`, `high`, `top` |
| Face-swap acting | `expr` per actor per shot; 9 expressions |
| Crowds | `crowd` block: count, area, animation, seed |
| One-word captions at 70% | Built in; `*word*` in the script turns that word yellow |
| −16 LUFS with a constant bed | Code-made bed mixed under the voice, normalized to −16 LUFS |

## What the engine does not copy

Characters are an original design (rounded figures, large head, mitten hands, shoes), not Roblox avatars, and no Roblox assets, names or logos are used. Stories must be new.
