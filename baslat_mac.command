#!/usr/bin/env bash
# ==============================================================================
# pyTOP Pro — macOS Çift Tıklanabilir Başlatıcı (Double-Clickable Finder Launcher)
# Finder üzerinden çift tıklandığında Terminal uygulamasında otomatik başlar.
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "   🍏 pyTOP Pro (Beta v2.1) — macOS Başlatıcı"
echo "========================================================"
echo ""

chmod +x baslat.sh 2>/dev/null || true
./baslat.sh
