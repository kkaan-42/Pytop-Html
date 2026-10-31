"""Apply the GitHub release tag to the backend and Electron package metadata."""

import json
import re
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: sync_release_version.py <release-tag>")

    tag = sys.argv[1].strip()
    match = re.fullmatch(r"v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)", tag)
    if not match:
        raise SystemExit(f"Invalid release tag: {tag!r}")

    version = match.group(1)
    root = Path(__file__).resolve().parents[1]

    app_path = root / "app.py"
    app_source = app_path.read_text(encoding="utf-8")
    app_source, replacements = re.subn(
        r'^APP_VERSION\s*=\s*"[^"]+"$',
        f'APP_VERSION = "v{version}"',
        app_source,
        count=1,
        flags=re.MULTILINE,
    )
    if replacements != 1:
        raise SystemExit("Could not locate APP_VERSION in app.py")
    app_path.write_text(app_source, encoding="utf-8")

    package_path = root / "electron" / "package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    package["version"] = version
    package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

    print(f"Release version synchronized: v{version}")


if __name__ == "__main__":
    main()
