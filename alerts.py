import os
import json
import re
import time
import threading
from urllib.parse import urlsplit
import urllib.request
import urllib.error

from database import get_data_dir

CONFIG_FILE = str(get_data_dir() / "alerts_config.json")
LEGACY_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alerts_config.json")

DEFAULT_CONFIG = {
    "enabled": False,
    "channel": "discord",  # "discord" veya "telegram"
    "discord_webhook": "",
    "telegram_token": "",
    "telegram_chat_id": "",
    "cpu_threshold": 90,
    "ram_threshold": 90,
    "disk_threshold": 90,
    "gpu_temp_threshold": 85,
    "cooldown_minutes": 15
}

_last_alert_time = 0
_alert_lock = threading.Lock()

def load_config():
    """Load thresholds from user data; webhook credentials come only from environment."""
    cfg = DEFAULT_CONFIG.copy()
    source = CONFIG_FILE if os.path.exists(CONFIG_FILE) else LEGACY_CONFIG_FILE
    try:
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
        allowed = {"enabled", "channel", "cpu_threshold", "ram_threshold", "disk_threshold",
                   "gpu_temp_threshold", "cooldown_minutes"}
        if isinstance(data, dict):
            cfg.update({key: data[key] for key in allowed if key in data})
    except (OSError, ValueError, TypeError):
        pass
    cfg["discord_webhook"] = os.environ.get("PYTOP_DISCORD_WEBHOOK", "").strip()
    cfg["telegram_token"] = os.environ.get("PYTOP_TELEGRAM_BOT_TOKEN", "").strip()
    cfg["telegram_chat_id"] = os.environ.get("PYTOP_TELEGRAM_CHAT_ID", "").strip()
    return cfg

def save_config(new_config):
    """Persist validated non-secret thresholds; credentials are environment-only."""
    if not isinstance(new_config, dict):
        return False, "Geçersiz ayar biçimi."
    secret_keys = ("discord_webhook", "telegram_token", "telegram_chat_id")
    if any(str(new_config.get(key, "")).strip() for key in secret_keys):
        return False, "Webhook ve bot sırları dosyaya kaydedilmez. Ortam değişkenlerini kullanın."
    allowed = {"enabled", "channel", "cpu_threshold", "ram_threshold", "disk_threshold",
               "gpu_temp_threshold", "cooldown_minutes"}
    cfg = load_config()
    candidate = {key: new_config[key] for key in allowed if key in new_config}
    if "enabled" in candidate and not isinstance(candidate["enabled"], bool):
        return False, "enabled alanı boolean olmalı."
    if "channel" in candidate and candidate["channel"] not in {"discord", "telegram"}:
        return False, "Kanal discord veya telegram olmalı."
    limits = {"cpu_threshold": (1, 100), "ram_threshold": (1, 100), "disk_threshold": (1, 100),
              "gpu_temp_threshold": (40, 120), "cooldown_minutes": (1, 180)}
    for key, (minimum, maximum) in limits.items():
        if key in candidate:
            try:
                candidate[key] = int(candidate[key])
            except (TypeError, ValueError):
                return False, f"{key} sayısal olmalı."
            if not minimum <= candidate[key] <= maximum:
                return False, f"{key} {minimum}-{maximum} arasında olmalı."
    cfg.update(candidate)
    cfg.pop("discord_webhook", None)
    cfg.pop("telegram_token", None)
    cfg.pop("telegram_chat_id", None)
    try:
        temp_file = CONFIG_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        if os.name != "nt":
            os.chmod(temp_file, 0o600)
        os.replace(temp_file, CONFIG_FILE)
        return True, "Ayarlar başarıyla kaydedildi."
    except Exception as e:
        return False, str(e)

def send_discord_notification(webhook_url, title, description, fields=None, is_test=False):
    """Discord Webhook üzerinden şık bir embed mesajı gönderir."""
    parsed = urlsplit(webhook_url or "")
    if parsed.scheme != "https" or parsed.hostname not in {"discord.com", "discordapp.com"} or not parsed.path.startswith("/api/webhooks/"):
        return False, "Geçersiz Discord Webhook URL'si."

    color = 3066993 if is_test else 15158332  # Yeşil (Test) veya Kırmızı (Uyarı)

    payload = {
        "username": "pyTOP Pro Monitor",
        "avatar_url": "https://raw.githubusercontent.com/kkaan-42/Pytop-Html/main/static/favicon.png",
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
                "fields": fields or [],
                "footer": {
                    "text": f"pyTOP Pro • {time.strftime('%Y-%m-%d %H:%M:%S')}"
                }
            }
        ]
    }

    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "pyTOP-Pro/2.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status in (200, 204):
                return True, "Discord bildirimi başarıyla iletildi."
            return False, f"Sunucu yanıtı: {response.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP Hatası: {e.code} {e.reason}"
    except Exception as e:
        return False, f"Gönderim hatası: {str(e)}"

def send_telegram_notification(bot_token, chat_id, message):
    """Telegram Bot API üzerinden Markdown mesajı gönderir."""
    if not bot_token or not chat_id or not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", bot_token.strip()):
        return False, "Telegram Bot Token veya Chat ID eksik."

    url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
    payload = {
        "chat_id": chat_id.strip(),
        "text": message,
        "parse_mode": "Markdown"
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "pyTOP-Pro/2.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("ok"):
                return True, "Telegram bildirimi başarıyla iletildi."
            return False, res_data.get("description", "Bilinmeyen hata")
    except urllib.error.HTTPError as e:
        return False, f"HTTP Hatası: {e.code} {e.reason}"
    except Exception as e:
        return False, f"Gönderim hatası: {str(e)}"

def send_test_alert():
    """Kullanıcının seçtiği kanala anında test bildirimi gönderir."""
    cfg = load_config()
    channel = cfg.get("channel", "discord")

    if channel == "discord":
        fields = [
            {"name": "Durum", "value": "✅ Bağlantı Başarılı", "inline": True},
            {"name": "Kanal", "value": "Discord Webhook", "inline": True},
            {"name": "Mesaj", "value": "pyTOP Pro donanım uyarıları bu kanala iletilecektir.", "inline": False}
        ]
        return send_discord_notification(
            cfg.get("discord_webhook", ""),
            "🔔 pyTOP Pro — Test Bildirimi",
            "Webhook entegrasyonu sorunsuz çalışıyor!",
            fields,
            is_test=True
        )
    elif channel == "telegram":
        msg = (
            "🔔 *pyTOP Pro — Test Bildirimi*\n\n"
            "✅ *Bağlantı Başarılı!*\n"
            "Telegram bot entegrasyonu sorunsuz çalışıyor.\n"
            "Donanım eşik aşımları bu sohbete iletilecektir."
        )
        return send_telegram_notification(
            cfg.get("telegram_token", ""),
            cfg.get("telegram_chat_id", ""),
            msg
        )
    return False, "Geçersiz bildirim kanalı."

def check_and_trigger_alerts(stats, machine_name="Bilinmiyor"):
    """
    Donanım istatistiklerini kontrol eder.
    Eğer eşik aşımı varsa ve bekleme süresi (cooldown) dolmuşsa bildirim gönderir.
    Aktif uyarı mesajları listesini döner.
    """
    global _last_alert_time

    cfg = load_config()
    active_warnings = []

    # 1. CPU Kontrolü
    cpu_pct = stats.get("cpu", {}).get("total", 0.0)
    cpu_thresh = cfg.get("cpu_threshold", 90)
    if cpu_pct >= cpu_thresh:
        active_warnings.append(f"CPU Kullanımı: %{cpu_pct:.1f} (Eşik: %{cpu_thresh})")

    # 2. RAM Kontrolü
    ram_pct = stats.get("mem", {}).get("percent", 0.0)
    ram_thresh = cfg.get("ram_threshold", 90)
    if ram_pct >= ram_thresh:
        active_warnings.append(f"RAM Doluluğu: %{ram_pct:.1f} (Eşik: %{ram_thresh})")

    # 3. Disk Kontrolü
    disk_pct = stats.get("disk", {}).get("percent", 0.0)
    disk_thresh = cfg.get("disk_threshold", 90)
    if disk_pct >= disk_thresh:
        active_warnings.append(f"Disk Doluluğu: %{disk_pct:.1f} (Eşik: %{disk_thresh})")

    # 4. GPU Sıcaklık Kontrolü
    gpus = stats.get("gpus", [])
    gpu_thresh = cfg.get("gpu_temp_threshold", 85)
    for g in gpus:
        g_temp = g.get("temp", 0)
        if isinstance(g_temp, (int, float)) and g_temp >= gpu_thresh:
            active_warnings.append(f"GPU Sıcaklığı ({g.get('name')}): {g_temp}°C (Eşik: {gpu_thresh}°C)")

    # Eğer uyarı sistemi aktifse ve aşım varsa bildirim gönder
    now = time.time()
    cooldown_seconds = cfg.get("cooldown_minutes", 15) * 60

    should_dispatch = False
    if cfg.get("enabled") and active_warnings:
        with _alert_lock:
            if now - _last_alert_time > cooldown_seconds:
                _last_alert_time = now
                should_dispatch = True

    if should_dispatch:
        channel = cfg.get("channel", "discord")

        if channel == "discord":
            fields = [{"name": "⚠️ Aşım Tespit Edildi", "value": w, "inline": False} for w in active_warnings]
            fields.append({"name": "Makine", "value": machine_name, "inline": True})
            fields.append({"name": "Uptime", "value": stats.get("uptime", "-"), "inline": True})
            threading.Thread(
                target=send_discord_notification,
                args=(cfg.get("discord_webhook", ""), "🚨 pyTOP Pro — Donanım Eşik Uyarısı!",
                      f"**{machine_name}** makinesinde belirlenen limitler aşıldı:", fields),
                kwargs={"is_test": False}, daemon=True
            ).start()
        elif channel == "telegram":
            warnings_text = "\n".join([f"• {w}" for w in active_warnings])
            msg = (
                f"🚨 *pyTOP Pro — Donanım Eşik Uyarısı!*\n\n"
                f"Makine: *{machine_name}*\n"
                f"Uptime: *{stats.get('uptime', '-')}*\n\n"
                f"*Aşım Detayları:*\n{warnings_text}\n\n"
                f"Lütfen sunucunuzu kontrol edin."
            )
            threading.Thread(
                target=send_telegram_notification,
                args=(cfg.get("telegram_token", ""), cfg.get("telegram_chat_id", ""), msg),
                daemon=True
            ).start()

    return active_warnings
