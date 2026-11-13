# videos-skill

Make vertical promo reels with code and an AI coding agent. Two pipelines, 56 motion-graphics skills, and the context files an agent needs to run them.

Built to promote two startups, [IndexFast](https://indexfast.co/) and [CampusLoop](https://campusloop.space/); their brand files and first reels are included as worked examples.

## What is in here

| Path | What it is |
|---|---|
| `engine/storyreel/` | A 3D story-reel engine: one JSON story in, a narrated, captioned 1080x1920 MP4 out |
| `shared/scripts/reelkit.js` | Helpers for 2D motion-graphics reels drawn on a canvas |
| `.claude/skills/` | 56 motion-graphics skills for Claude Code and other agents |
| `brands/` | Brand fact sheets, weekly content calendars, and reel sources for the two example brands |
| `pipeline/RUNBOOK.md` | The steps of a daily make-and-publish job |
| `AGENTS.md` | Project context for any agent picking this up |

## Quick start

```bash
git clone https://github.com/playlikeboy/videos-skill && cd videos-skill
npm install
python3.11 -m venv engine/storyreel/.venv && engine/storyreel/.venv/bin/pip install edge-tts
```

You also need ffmpeg and Chrome (or run `npx playwright install chromium`).

### A 3D story reel

```bash
npm run story:demo                      # builds engine/storyreel/build/balloon-secrets/balloon-secrets.mp4
npm run story -- engine/storyreel/stories/balloon-secrets.json --sheet    # one frame per shot, to check before a full build
```

Write your own story by copying `engine/storyreel/stories/balloon-secrets.json`. The file format is documented in [`engine/storyreel/README.md`](engine/storyreel/README.md). A finished example is at `engine/storyreel/examples/balloon-secrets-720p.mp4`.

### A 2D motion-graphics reel

```bash
npm run reel -- brands/indexfast/reels/2026-11-13-problem-hook/src/reel.html out.mp4
```

Each reel is one HTML page that draws every frame from the frame number. Copy either example under `brands/*/reels/` and change the content.

### With an agent

Open the folder in Claude Code (or any agent that reads `AGENTS.md`) and ask for a reel. The skills in `.claude/skills/` load on their own when the request matches, for example "make a kinetic typography reel for IndexFast" or "write a new story reel about a college where lies turn you invisible".

## How the story format was designed

[`engine/storyreel/ANALYSIS.md`](engine/storyreel/ANALYSIS.md) is a measured breakdown of a popular narrated story-reel format: script skeleton, words per minute, shot length, camera moves, captions and loudness. The engine's defaults come from those numbers. The engine uses its own character design and you write your own stories; it does not reuse anyone's characters, footage or scripts.

## Rules worth keeping

- 1080x1920, 30 fps, H.264 + AAC, hook readable in the first second, text clear of the top 250 px and bottom 420 px.
- Only state facts you can back up. Each brand keeps its allowed facts in `brands/<brand>/brand.md`.
- Sample posts, polls and counts in a reel are fictional and labelled as samples.
- Use music you have the rights to. With none set, the engine writes its own bed in code.

## Credits and licences

- This project: MIT, see `LICENSE`.
- Skills in `.claude/skills/`: from the [iart-ai motion skill packs](https://github.com/iart-ai/motion-skills), MIT, licence text in `.claude/skills/LICENSE-iart-ai.txt`. One skill is renamed here (`tiktok-lower-thirds`) to avoid a name clash.
- Fonts in `shared/fonts/`: SIL Open Font License 1.1, see `shared/fonts/README.md`.
- 3D rendering: [three.js](https://threejs.org/) (MIT). Narration: [edge-tts](https://github.com/rany2/edge-tts), which sends the script text to Microsoft's online speech service.
- The IndexFast and CampusLoop names and logos belong to their owner and are not covered by the MIT licence.
