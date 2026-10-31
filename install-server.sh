#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Linux ]]; then
  echo "pyTOP Server kurulumu Linux içindir." >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "Kurulum için sudo ile çalıştırın: sudo ./install-server.sh" >&2
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${PYTOP_SERVER_DIR:-/opt/pytop-server}"
SERVICE_USER="pytop"

command -v python3 >/dev/null || { echo "Python 3 gerekli." >&2; exit 1; }
command -v systemctl >/dev/null || { echo "systemd gerekli." >&2; exit 1; }

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
install -d -o "$SERVICE_USER" -g "$SERVICE_USER" "$INSTALL_DIR"
tar --exclude=.git --exclude=.venv --exclude=__pycache__ -C "$SOURCE_DIR" -cf - . | tar -C "$INSTALL_DIR" -xf -
python3 -m venv "$INSTALL_DIR/.venv"
"$INSTALL_DIR/.venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/.venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt"

if [[ ! -f "$INSTALL_DIR/server.env" ]]; then
  TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(36))')"
  cat > "$INSTALL_DIR/server.env" <<EOF
PYTOP_BIND=0.0.0.0
PYTOP_PORT=5000
PYTOP_REMOTE_TOKEN=$TOKEN
PYTOP_NO_BROWSER=1
PYTHONUNBUFFERED=1
EOF
  chmod 600 "$INSTALL_DIR/server.env"
fi

cat > /etc/systemd/system/pytop-server.service <<EOF
[Unit]
Description=pyTOP Server system monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/server.env
ExecStart=$INSTALL_DIR/.venv/bin/python app.py
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOF

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
systemctl daemon-reload
systemctl enable --now pytop-server.service
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "pyTOP Server çalışıyor: http://${IP:-SUNUCU_IP}:5000"
echo "İlk giriş tokeni: sudo cat $INSTALL_DIR/server.env"
echo "Tokeni parola gibi saklayın; sadece güvendiğiniz LAN/VPN üzerinden erişin."
