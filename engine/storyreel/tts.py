"""Narrate a story and time every word.

usage: tts.py story.json out_dir
Writes out_dir/voice.wav (sped up to the story's target words per minute) and out_dir/words.json
([{w, t0, t1, shot, hot}]). Words wrapped in *asterisks* in a shot's "say" text are marked hot.
"""
import asyncio, json, re, subprocess, sys
import edge_tts

story = json.load(open(sys.argv[1])); out = sys.argv[2]; meta = story.get("meta", {})
voice = meta.get("voice", "en-US-BrianNeural"); target = meta.get("wpm", 265)

# Full narration as one request (natural prosody), remembering which characters belong to which shot.
full, spans, hot = "", [], set()
for i, shot in enumerate(story["shots"]):
    say = shot["say"]
    for m in re.finditer(r"\*([^*]+)\*", say): hot.update(w.lower().strip(".,!?") for w in m.group(1).split())
    say = say.replace("*", "")
    start = len(full); full += say + " "; spans.append((start, len(full), i))


async def synth(v, **kw):
    words, audio = [], bytearray()
    com = edge_tts.Communicate(full, v, **kw)
    async for ch in com.stream():
        if ch["type"] == "audio": audio.extend(ch["data"])
        elif ch["type"] == "WordBoundary": words.append((ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]))
    return words, audio


def run():
    # The service sometimes refuses one voice; fall back to others so a build never dies on that.
    for v in dict.fromkeys([voice, "en-US-BrianNeural", "en-US-AndrewNeural", "en-US-AriaNeural"]):
        for kw in ({"boundary": "WordBoundary", "pitch": meta.get("pitch", "+0Hz")}, {"boundary": "WordBoundary"}):
            try:
                words, audio = asyncio.run(synth(v, **kw))
                if audio and words:
                    print("tts voice:", v); return words, audio
            except Exception as e:
                print("tts retry:", v, type(e).__name__, file=sys.stderr)
    sys.exit("tts failed: no audio or no word timings")


words, audio = run()
open(f"{out}/voice.mp3", "wb").write(audio)
dur = words[-1][0] + words[-1][1]
factor = max(0.8, min(1.7, target / (len(words) / dur * 60)))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{out}/voice.mp3", "-af", f"atempo={factor:.4f}", "-ar", "48000", "-ac", "2", f"{out}/voice.wav"], check=True)

# Find each spoken word in the text to learn its shot.
res, cur, low = [], 0, full.lower()
for off, d, text in words:
    k = low.find(text.lower(), cur)
    if k < 0: k = cur
    cur = k + len(text)
    shot = next((i for a, b, i in spans if a <= k < b), spans[-1][2])
    res.append({"w": text, "t0": round(off / factor, 3), "t1": round((off + d) / factor, 3), "shot": shot, "hot": text.lower().strip(".,!?") in hot})
json.dump(res, open(f"{out}/words.json", "w"))
print(f"tts: {len(res)} words, tempo x{factor:.2f}, {res[-1]['t1']:.1f}s, {len(res) / res[-1]['t1'] * 60:.0f} wpm")
