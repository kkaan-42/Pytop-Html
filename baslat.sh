#!/usr/bin/env bash
# ==============================================================================
# pyTOP Pro — Evrensel Linux (Tüm Dağıtımlar) & macOS Başlatıcı Betiği
# Desteklenen Sistemler:
#   - Debian, Ubuntu, Linux Mint, Pop!_OS, Kali, Elementary, Raspberry Pi OS
#   - Arch Linux, Manjaro, EndeavourOS, Garuda, Artix
#   - Fedora, Red Hat Enterprise Linux (RHEL), CentOS Stream, Rocky, AlmaLinux
#   - openSUSE Leap & Tumbleweed
#   - Alpine Linux
#   - Void Linux, Gentoo, NixOS
#   - macOS (Apple Silicon M1/M2/M3/M4 & Intel Mac)
# ==============================================================================

set -e

# Betiğin bulunduğu dizine geç
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "      🚀 pyTOP Pro — Terminal & Web Sistem Monitörü"
echo "=================================================================="

OS_TYPE="$(uname -s)"
DISTRO_NAME="Bilinmeyen Dağıtım"

if [ "$OS_TYPE" = "Darwin" ]; then
    DISTRO_NAME="macOS $(sw_vers -productVersion 2>/dev/null || echo '')"
elif [ -f /etc/os-release ]; then
    DISTRO_NAME="$(grep -E '^PRETTY_NAME=' /etc/os-release | cut -d= -f2 | tr -d '\"')"
fi

echo "[✓] Tespit Edilen Sistem: $DISTRO_NAME ($OS_TYPE $(uname -m))"

# 1. Python 3 Kontrolü
PY_CMD=""
for cmd in python3 python python3.12 python3.11 python3.10; do
    if command -v "$cmd" &>/dev/null; then
        if "$cmd" -c "import sys; exit(0 if sys.version_info >= (3, 7) else 1)" &>/dev/null; then
            PY_CMD="$cmd"
            break
        fi
    fi
done

if [ -z "$PY_CMD" ]; then
    echo ""
    echo "[HATA] Sisteminizde Python 3.7+ bulunamadı!"
    echo "Lütfen dağıtımınıza uygun komutla Python'ı kurun:"
    echo ""
    if command -v apt-get &>/dev/null; then
        echo "  sudo apt update && sudo apt install -y python3 python3-pip python3-venv python3-flask python3-psutil"
    elif command -v pacman &>/dev/null; then
        echo "  sudo pacman -Sy python python-pip python-flask python-psutil"
    elif command -v dnf &>/dev/null; then
        echo "  sudo dnf install -y python3 python3-pip python3-flask python3-psutil"
    elif command -v zypper &>/dev/null; then
        echo "  sudo zypper install -y python3 python3-pip python3-Flask python3-psutil"
    elif command -v apk &>/dev/null; then
        echo "  apk add python3 py3-pip py3-flask py3-psutil"
    elif command -v xbps-install &>/dev/null; then
        echo "  sudo xbps-install -S python3 python3-pip python3-flask python3-psutil"
    elif [ "$OS_TYPE" = "Darwin" ]; then
        echo "  brew install python"
    else
        echo "  Lütfen sisteminizin paket yöneticisiyle Python 3 ve pip kurun."
    fi
    echo ""
    exit 1
fi

echo "[✓] Python Yolu: $(command -v "$PY_CMD") ($($PY_CMD --version))"

# 2. Flask ve psutil Kütüphane Kontrolü (PEP 668 & Sanal Ortam Uyumluluğu)
USE_VENV=0
VENV_DIR=".venv"

if $PY_CMD -c "import flask, psutil" &>/dev/null; then
    RUNNER="$PY_CMD"
else
    echo "[!] Gerekli Python kütüphaneleri (flask, psutil) sistem seviyesinde bulunamadı."
    
    # Mevcut sanal ortam var mı?
    if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/python" ]; then
        RUNNER="$VENV_DIR/bin/python"
    else
        echo "[BİLGİ] İzolasyon ve PEP 668 uyumluluğu için sanal ortam ($VENV_DIR) oluşturuluyor..."
        if $PY_CMD -m venv "$VENV_DIR" 2>/dev/null; then
            RUNNER="$VENV_DIR/bin/python"
            echo "[✓] Sanal ortam başarıyla oluşturuldu."
        else
            echo "[UYARI] 'python3 -m venv' çalıştırılamadı. Doğrudan pip denenecek."
            RUNNER="$PY_CMD"
        fi
    fi

    # Kütüphaneleri kur
    echo "[BİLGİ] Bağımlılıklar (requirements.txt) yükleniyor..."
    if [ -f "$VENV_DIR/bin/pip" ]; then
        "$VENV_DIR/bin/pip" install --upgrade pip -q 2>/dev/null || true
        "$VENV_DIR/bin/pip" install -r requirements.txt
    else
        $RUNNER -m pip install -r requirements.txt --user 2>/dev/null || \
        $RUNNER -m pip install -r requirements.txt --break-system-packages 2>/dev/null || \
        $RUNNER -m pip install -r requirements.txt
    fi
fi

# 3. Yerel Ağ IP Adresini Belirle
LOCAL_IP=""
if command -v hostname &>/dev/null && hostname -I &>/dev/null; then
    LOCAL_IP="$(hostname -I | awk '{print $1}')"
elif command -v ip &>/dev/null; then
    LOCAL_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')"
elif command -v ifconfig &>/dev/null; then
    LOCAL_IP="$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)"
fi

PORT=5000
echo ""
echo "------------------------------------------------------------------"
echo " pyTOP Pro Başlatıldı!"
echo "   ▶ Yerel Bağlantı:   http://localhost:$PORT veya http://127.0.0.1:$PORT"
if [ -n "$LOCAL_IP" ]; then
    echo "   ▶ Yerel Ağ (LAN):   http://$LOCAL_IP:$PORT"
fi
echo "   (Not: macOS AirPlay port 5000'i kullanıyorsa pyTOP otomatik olarak 5001'e geçer)"
echo "   Durdurmak için: CTRL + C"
echo "------------------------------------------------------------------"
echo ""

# 4. Tarayıcıyı Aç (Masaüstü/GUI Ortamı Varsa)
IS_HEADLESS=0
if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
    IS_HEADLESS=1
elif [ "$OS_TYPE" = "Linux" ] && [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    IS_HEADLESS=1
fi

if [ "$IS_HEADLESS" -eq 1 ]; then
    echo "[BİLGİ] Sunucu / SSH (Headless) oturumu tespit edildi. Otomatik tarayıcı açılmadı."
    echo "[BİLGİ] Monitöre başka bir cihazdan http://${LOCAL_IP:-<SUNUCU_IP>}:$PORT ile erişebilirsiniz."
    echo ""
else
    if [ "$OS_TYPE" = "Darwin" ] && command -v open &>/dev/null; then
        (sleep 1.2 && open "http://127.0.0.1:$PORT") &
    elif command -v xdg-open &>/dev/null; then
        (sleep 1.2 && xdg-open "http://127.0.0.1:$PORT" 2>/dev/null) &
    fi
fi

# 5. Uygulamayı Başlat
exec $RUNNER app.py
