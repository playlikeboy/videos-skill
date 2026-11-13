# How a rendered reel reaches Instagram

Instagram fetches the video from a public URL. This project uses the public GitHub repo as that host.

1. Commit the reel's `out/final.mp4` and `out/caption.txt` and push to `main`.
2. The video URL is `https://raw.githubusercontent.com/playlikeboy/videos-skill/main/<path to final.mp4>`.
3. Pass that URL as `video_url` to `INSTAGRAM_POST_IG_USER_MEDIA` with `media_type: REELS`.

Proven on 2026-11-13: three reels were published this way. `shared/scripts/publish.py <account> <reel folder>` does steps 2 and 3 and prints the permalink.
