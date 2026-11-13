# videos-skill: context for agents

This project makes short vertical videos (Instagram Reels) that promote two products, and publishes them daily. Read this file first, then the file it points to for the job you were given.

## The two brands

| Brand | Site | Instagram | Audience | Facts and rules |
|---|---|---|---|---|
| IndexFast | https://indexfast.co/ | @indexfast | Developers and indie builders | `brands/indexfast/brand.md` |
| CampusLoop | https://campusloop.space/ | @campusloop.space | Students at Indian colleges | `brands/campusloop/brand.md` |

Each `brand.md` lists the only facts a video may state and a "Never" section. Follow both. Re-check numbers and prices on the site before showing them.

## Map

```
videos-skill/
  AGENTS.md                    this file
  .claude/skills/              56 motion-graphics skills (from github.com/iart-ai, 19 packs)
  brands/<brand>/
    brand.md                   voice, allowed facts, things never to claim
    calendar.csv               one reel format per weekday
    assets/                    logo files
    reels/<date>-<format>/     src/ (page that draws the reel), out/ (final.mp4, caption.txt)
  shared/
    scripts/reelkit.js         helpers for 2D canvas reels (text, easing, scenes, code-made music)
    fonts/                     Inter, Familjen Grotesk, IBM Plex Sans, JetBrains Mono (woff2)
  engine/storyreel/            3D narrated story-reel engine (see its README.md)
    ANALYSIS.md                measured breakdown of the reference story format
    reference/                 raw analysis data
    stories/                   one JSON file per story
    build/<story>/             outputs
  instagram/<account>/         reference reels downloaded from other creators, for study only
  pipeline/
    RUNBOOK.md                 the exact steps of the daily job
    publish-log.jsonl          one line per reel made or published (created on first run)
```

## Two ways to make a reel

| | 2D motion-graphics reel | 3D story reel |
|---|---|---|
| Use for | Product hooks, demos, tips, offers | "In this college…" narrated stories |
| Made with | One HTML page drawing on a canvas, using `shared/scripts/reelkit.js` | `engine/storyreel/build.mjs` and a story JSON |
| Render | `node .claude/skills/javascript-animation/scripts/render.mjs <page> <out.mp4>` | `node engine/storyreel/build.mjs <story.json>` |
| Example | `brands/indexfast/reels/2026-11-13-problem-hook/` | `engine/storyreel/stories/balloon-secrets.json` |
| Docs | The `javascript-animation` skill | `engine/storyreel/README.md` |

Both render with headless Chrome, frame by frame. Every frame must be a pure function of the frame number.

## Specs every reel must meet

- 1080x1920, 30 fps, H.264 + AAC, `yuv420p`, TV colour range, `+faststart`, under 30 MB.
- Hook readable in the first second.
- Text stays clear of the top 250 px and bottom 420 px.
- Music is code-made or silent. No trending or copyrighted audio.
- Look at a contact sheet before calling a reel done. Check for clipped text, typos, and claims not in `brand.md`.

## Content rules

- CampusLoop confessions, polls and counts shown in a reel are written for the reel and are fictional. Label them as samples. Never show a real student, a real confession, or a real college as the source.
- IndexFast reels never promise Google indexing and never state a speed or traffic number.
- Reference reels in `instagram/` and the analysed YouTube compilation are for studying format only. Do not reuse their footage, scripts, characters or audio, and do not repost them.
- The 3D characters are this project's own design. Do not model them on Roblox avatars or any other existing game's characters.

## Publishing

- Both Instagram accounts are connected through the Composio connector (aliases `indexfast` and `campusloop.space`).
- Publishing is two calls: `INSTAGRAM_POST_IG_USER_MEDIA` (creates a container from a public MP4 URL), then `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH`.
- Hosting: Instagram needs the MP4 at a public URL. `pipeline/transport.md` gives the route (the public GitHub repo's raw file URL). It has not been proven end to end yet.
- Both Instagram connections returned "session invalidated" on 2026-11-13 and must be reconnected in Composio before anything can publish.
- The owner chose fully automatic publishing once hosting works, at about 7 pm IST for CampusLoop and 9 pm IST for IndexFast.
- At most one reel per brand per day.

## State on 2026-11-13

| Item | State |
|---|---|
| First 2D reels (one per brand) | Rendered, not published |
| Story engine | Working; one demo story rendered |
| Daily schedule | Two in-session jobs; they expire after 7 days and need renewing |
| Reference downloads | In `instagram/`; see `instagram/README.md` for counts |

## Machine notes

- Node 22, ffmpeg 8, Chrome and `python3.11` are installed. The default `python3` is 3.6; use `python3.11`.
- No GPU: WebGL runs in software, so 3D renders take about 3 s of wall time per second of video with 12 workers.
- Text-to-speech uses `edge-tts` from `engine/storyreel/.venv` and needs network access.
