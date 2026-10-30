"""Compile the Windows installer using Inno Setup 6."""
import os
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).resolve().with_name("installer.iss")


def main():
    compiler = os.environ.get("INNO_SETUP_COMPILER") or shutil.which("ISCC.exe") or shutil.which("iscc")
    if not compiler:
        raise SystemExit("Inno Setup 6 bulunamadı. ISCC.exe yolunu PATH veya INNO_SETUP_COMPILER ile belirtin.")
    subprocess.run([compiler, str(SCRIPT)], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
