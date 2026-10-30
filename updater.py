"""Read-only check for the latest GitHub release; never downloads or installs code."""
import json
import os
import re
import urllib.error
import urllib.request

DEFAULT_REPOSITORY = "kkaan-42/Pytop-Html"


def check_release(current_version="v2.2.1"):
    repository = os.environ.get("PYTOP_GITHUB_REPOSITORY", DEFAULT_REPOSITORY).strip().strip("/")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        return {"available": False, "reason": "PYTOP_GITHUB_REPOSITORY owner/repo biçiminde olmalı."}
    url = f"https://api.github.com/repos/{repository}/releases/latest"
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "pyTOP-Pro/2.2.1",
    })
    try:
        with urllib.request.urlopen(request, timeout=4) as response:
            release = json.loads(response.read(1_000_000))
        tag = release.get("tag_name", "")
        release_url = release.get("html_url")
        if release_url and not release_url.startswith("https://github.com/"):
            release_url = None
        return {
            "available": True,
            "current": current_version,
            "latest": tag,
            "update_available": bool(tag and tag != current_version),
            "url": release_url,
            "published_at": release.get("published_at"),
        }
    except urllib.error.HTTPError as exc:
        return {"available": False, "reason": "GitHub Release bilgisi alınamadı (HTTP %d)." % exc.code}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        return {"available": False, "reason": "Sürüm kontrolü başarısız: %s" % str(exc)[:160]}
