#!/usr/bin/env bash
# ========================================================
# pyTOP Pro — Linux & macOS Başlatıcı Betiği
# ========================================================

# Betiğin bulunduğu dizine geç
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "        pyTOP Pro Linux Başlatılıyor..."
echo "========================================================"

# Python 3 Kontrolü
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python &>/dev/null; then
    PY_CMD="python"
else
    echo "[HATA] Python 3 bulunamadı!"
    echo "Lütfen kurun: sudo apt update && sudo apt install python3 python3-pip python3-psutil python3-flask"
    exit 1
fi

echo "[BİLGİ] Python tespit edildi: $($PY_CMD --version)"

# Flask ve psutil kütüphanelerini kontrol et
$PY_CMD -c "import flask, psutil" &>/dev/null
if [ $? -ne 0 ]; then
    echo "[BİLGİ] Gerekli Python kütüphaneleri (flask, psutil) kuruluyor..."
    $PY_CMD -m pip install -r requirements.txt --user || pip install -r requirements.txt
fi

# Tarayıcıyı aç (Desktop ortamı varsa)
if command -v xdg-open &>/dev/null; then
    (sleep 1.5 && xdg-open "http://127.0.0.1:5000") &
elif command -v open &>/dev/null; then # macOS için
    (sleep 1.5 && open "http://127.0.0.1:5000") &
fi

echo "[BİLGİ] Sunucu başlatılıyor: http://127.0.0.1:5000"
echo "Durdurmak için CTRL + C tuşlarına basın."
echo ""

$PY_CMD app.py
