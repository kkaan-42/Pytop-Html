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
        if "$cmd" -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" &>/dev/null; then
            PY_CMD="$cmd"
            break
        fi
    fi
done

if [ -z "$PY_CMD" ]; then
    echo ""
    echo "[HATA] Sisteminizde Python 3.8+ bulunamadı!"
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

# 2. İzole sanal ortam (sistem Python paketlerine dokunmadan)
VENV_DIR=".venv"
if [ ! -x "$VENV_DIR/bin/python" ]; then
    echo "[BİLGİ] İzole sanal ortam ($VENV_DIR) oluşturuluyor..."
    if ! "$PY_CMD" -m venv "$VENV_DIR"; then
        echo "[HATA] Sanal ortam oluşturulamadı. Python venv paketini kurup yeniden deneyin."
        exit 1
    fi
fi
RUNNER="$VENV_DIR/bin/python"
if ! "$RUNNER" -c "import flask, psutil" &>/dev/null; then
    echo "[BİLGİ] Bağımlılıklar sanal ortama yükleniyor..."
    "$RUNNER" -m pip install -r requirements.txt
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

PORT="${PYTOP_PORT:-5000}"
echo ""
echo "------------------------------------------------------------------"
echo " pyTOP Pro Başlatıldı!"
echo "   ▶ Yerel bağlantı adresi sunucu başladığında gösterilir (varsayılan port: $PORT)."
case "${PYTOP_BIND:-127.0.0.1}" in
    127.0.0.1|localhost|::1)
        echo "   ▶ Uzak ağ erişimi kapalı. Açmak için PYTOP_BIND ve PYTOP_REMOTE_TOKEN ayarlayın." ;;
    *)
        if [ -n "${PYTOP_REMOTE_TOKEN:-}" ] && [ -n "$LOCAL_IP" ]; then
            echo "   ▶ Korunan ağ erişimi: http://${LOCAL_IP}:${PYTOP_PORT:-$PORT} (giriş anahtarı gerekli)"
        else
            echo "   ▶ Uzak erişim için PYTOP_REMOTE_TOKEN gerekli."
        fi ;;
esac
echo "   (Not: macOS AirPlay port 5000'i kullanıyorsa pyTOP otomatik olarak 5001'e geçer)"
echo "   Durdurmak için: CTRL + C"
echo "------------------------------------------------------------------"
echo ""

# 4. Uygulamayı Başlat; app.py doğru portu seçip yerel tarayıcıyı açar.
exec $RUNNER app.py
