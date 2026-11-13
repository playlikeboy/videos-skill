# Daily reel runbook

One reel per brand per day. The scheduled job names the brand; follow these steps in order.

## 1. Pick today's reel

1. Read `brands/<brand>/brand.md` and `brands/<brand>/calendar.csv`.
2. Take the row for today's weekday (IST). Read `pipeline/publish-log.jsonl` and choose a hook that has not been used before for this brand.
3. If `brand.md` still says the visual style is not recorded, read the site's CSS, record colors and fonts in `brand.md`, and save a logo and screenshots to `brands/<brand>/assets/`.
4. Re-read the site for any number, price or limit the reel will show. Use only facts listed in `brand.md` and still true on the site. Obey the "Never" section.

## 2. Build

1. Create `brands/<brand>/reels/<YYYY-MM-DD>-<format>/` with `brief.md`, `src/`, `out/`.
2. Load the skill named in the calendar row, plus `short-form-video` for hook and pacing and `video-delivery-specs` for the export.
3. If `shared/templates/<format>/` exists, copy it and change the content. If not, build the reel, then save the reusable part there.
4. Music: code-synthesized with the `soundtrack` skill, or silence. No trending or copyrighted audio.

## 3. Spec

- 1080x1920, 30 fps, 12–30 s, H.264 + AAC, `yuv420p`, `+faststart`, under 30 MB.
- Hook readable in the first second. Text inside the Reels safe area (clear of the top 250 px and bottom 420 px).
- Last 2 s: logo, CTA from `brand.md`, "link in bio".

## 4. Verify before publishing

1. Run the skill's verify scripts: freeze frames, contact sheet, probe the MP4.
2. Look at the contact sheet. Check for clipped text, wrong brand, typos, unreadable contrast, a claim not in `brand.md`.
3. If any check fails, fix and re-render. If it still fails, do not publish; log the failure.

## 5. Publish

Write `out/caption.txt`: hook line, two lines of value, CTA, 5–8 hashtags.

1. Stage the MP4 using the route in `pipeline/transport.md`. If that file does not exist, stop here, log `status: rendered-not-published`, and do not upload the file anywhere.
2. `INSTAGRAM_POST_IG_USER_MEDIA` with the brand's Composio account, `media_type: REELS`, `share_to_feed: true`, the caption, and the video.
3. `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` with `max_wait_seconds: 300`. Never publish the same `creation_id` twice. On container error, create a new container once; on a second failure, stop and log.
4. `INSTAGRAM_GET_IG_MEDIA` for the permalink.

## 6. Log

Append one JSON line to `pipeline/publish-log.jsonl`: date, brand, format, hook, reel folder, status, media id, permalink, error if any. Publish at most one reel per brand per day; if today's line already says `published`, do nothing.
