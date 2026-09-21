import os
import json
import time
import urllib.request
import urllib.error

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alerts_config.json")

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

def load_config():
    """Mevcut uyarı yapılandırmasını yükler veya varsayılanı döner."""
    if not os.path.exists(CONFIG_FILE):
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Eksik alanları varsayılanla tamamla
            cfg = DEFAULT_CONFIG.copy()
            cfg.update(data)
            return cfg
    except Exception:
        return DEFAULT_CONFIG.copy()

def save_config(new_config):
    """Uyarı yapılandırmasını dosyaya kaydeder."""
    cfg = load_config()
    cfg.update(new_config)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        return True, "Ayarlar başarıyla kaydedildi."
    except Exception as e:
        return False, str(e)

def send_discord_notification(webhook_url, title, description, fields=None, is_test=False):
    """Discord Webhook üzerinden şık bir embed mesajı gönderir."""
    if not webhook_url or not webhook_url.startswith("http"):
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
    if not bot_token or not chat_id:
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
        if g_temp >= gpu_thresh:
            active_warnings.append(f"GPU Sıcaklığı ({g.get('name')}): {g_temp}°C (Eşik: {gpu_thresh}°C)")

    # Eğer uyarı sistemi aktifse ve aşım varsa bildirim gönder
    now = time.time()
    cooldown_seconds = cfg.get("cooldown_minutes", 15) * 60

    if cfg.get("enabled") and active_warnings and (now - _last_alert_time > cooldown_seconds):
        _last_alert_time = now
        channel = cfg.get("channel", "discord")

        if channel == "discord":
            fields = [{"name": "⚠️ Aşım Tespit Edildi", "value": w, "inline": False} for w in active_warnings]
            fields.append({"name": "Makine", "value": machine_name, "inline": True})
            fields.append({"name": "Uptime", "value": stats.get("uptime", "-"), "inline": True})
            send_discord_notification(
                cfg.get("discord_webhook", ""),
                "🚨 pyTOP Pro — Donanım Eşik Uyarısı!",
                f"**{machine_name}** makinesinde belirlenen limitler aşıldı:",
                fields,
                is_test=False
            )
        elif channel == "telegram":
            warnings_text = "\n".join([f"• {w}" for w in active_warnings])
            msg = (
                f"🚨 *pyTOP Pro — Donanım Eşik Uyarısı!*\n\n"
                f"Makine: *{machine_name}*\n"
                f"Uptime: *{stats.get('uptime', '-')}*\n\n"
                f"*Aşım Detayları:*\n{warnings_text}\n\n"
                f"Lütfen sunucunuzu kontrol edin."
            )
            send_telegram_notification(
                cfg.get("telegram_token", ""),
                cfg.get("telegram_chat_id", ""),
                msg
            )

    return active_warnings
