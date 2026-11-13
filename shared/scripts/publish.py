"""Publish one rendered reel to Instagram through the Composio MCP server.

usage: python3.11 shared/scripts/publish.py <composio account id or alias> <reel folder>
The reel folder must hold out/final.mp4 and out/caption.txt, already pushed to the public repo
(see pipeline/transport.md). Always name the account: the Composio default may be a different one.
Reads the Composio key from ~/.claude.json (mcpServers.composio). Prints the permalink.
"""
import json, re, subprocess, sys, os

REPO_RAW = "https://raw.githubusercontent.com/playlikeboy/videos-skill/main/"
account, folder = sys.argv[1], sys.argv[2].rstrip("/")
key = json.load(open(os.path.expanduser("~/.claude.json")))["mcpServers"]["composio"]["headers"]["x-consumer-api-key"]


def run(slug, args):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "COMPOSIO_MULTI_EXECUTE_TOOL", "arguments": {
        "sync_response_to_workbench": False, "tools": [{"tool_slug": slug, "account": account, "arguments": args}]}}})
    raw = subprocess.run(["curl", "-sS", "-m", "400", "-X", "POST", "https://connect.composio.dev/mcp", "-H", f"x-consumer-api-key: {key}",
                          "-H", "content-type: application/json", "-H", "accept: application/json, text/event-stream", "-d", body], capture_output=True, text=True).stdout
    m = re.search(r"^data: (.*)$", raw, re.M)
    if not m: sys.exit(f"{slug}: no response: {raw[:300]}")
    r = json.loads(json.loads(m.group(1))["result"]["content"][0]["text"])["data"]["results"][0]["response"]
    if not r.get("successful"): sys.exit(f"{slug} failed: {json.dumps(r)[:600]}")
    return r.get("data") or r.get("data_preview") or {}


caption = open(f"{folder}/out/caption.txt").read().strip()
url = REPO_RAW + f"{folder}/out/final.mp4"
if subprocess.run(["curl", "-sfIL", "-m", "30", "-o", "/dev/null", url]).returncode: sys.exit(f"video is not public yet: {url}")
box = run("INSTAGRAM_POST_IG_USER_MEDIA", {"ig_user_id": "me", "media_type": "REELS", "video_url": url, "caption": caption, "share_to_feed": True})
cid = box.get("id") or sys.exit(f"no container id: {box}")
pub = run("INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", {"ig_user_id": "me", "creation_id": cid, "max_wait_seconds": 300})
mid = pub.get("id") or sys.exit(f"no media id: {pub}")
info = run("INSTAGRAM_GET_IG_MEDIA", {"ig_media_id": mid, "fields": "id,permalink,caption,timestamp"})
print(json.dumps({"account": account, "folder": folder, "media_id": mid, "permalink": info.get("permalink"), "caption_start": (info.get("caption") or "")[:80], "timestamp": info.get("timestamp")}))
