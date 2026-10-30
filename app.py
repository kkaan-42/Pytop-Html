import os
import time
import platform
import datetime
import socket
import hmac
import ipaddress
import secrets
import threading
import webbrowser
from flask import Flask, render_template, jsonify, request, Response, session, redirect, url_for, abort
from werkzeug.middleware.proxy_fix import ProxyFix
import json
import psutil

import gpu_monitor
import alerts
import report_generator
import net_monitor
import sys_info
import docker_monitor
import database
import updater

APP_VERSION = "v2.2.1"

app = Flask(__name__)
app.secret_key = os.environ.get("PYTOP_SESSION_SECRET") or secrets.token_hex(32)
app.config["PYTOP_REMOTE_TOKEN"] = os.environ.get("PYTOP_REMOTE_TOKEN", "")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("PYTOP_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
if os.environ.get("PYTOP_TRUST_PROXY", "").lower() in {"1", "true", "yes"}:
    # Enable only when direct access is blocked and a trusted proxy overwrites these headers.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
database.init_db()
_io_lock = threading.Lock()


def _is_loopback(address):
    try:
        parsed = ipaddress.ip_address(address or "")
        return parsed.is_loopback or bool(parsed.ipv4_mapped and parsed.ipv4_mapped.is_loopback)
    except ValueError:
        return False


@app.before_request
def protect_remote_access():
    remote = request.remote_addr
    host = request.host
    try:
        from urllib.parse import urlsplit
        host = urlsplit("//" + request.host).hostname or ""
    except ValueError:
        host = ""

    if _is_loopback(remote):
        # Reject DNS-rebinding hostnames while allowing the usual local names.
        allowed_hosts = {"localhost", "127.0.0.1", "::1", socket.gethostname().lower(), platform.node().lower()}
        if host.lower() not in allowed_hosts and not app.testing:
            abort(400, description="Bu Host başlığı yerel arayüz için kabul edilmiyor.")
    elif remote:
        if request.endpoint == "remote_login" or request.path.startswith("/static/"):
            pass
        elif len(app.config.get("PYTOP_REMOTE_TOKEN", "")) < 24:
            abort(403, description="Uzak erişim için en az 24 karakterlik PYTOP_REMOTE_TOKEN gerekli.")
        elif not session.get("pytop_authenticated"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "Uzak oturum açma gerekli."}), 401
            return redirect(url_for("remote_login"))

    if remote and not _is_loopback(remote) and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("Origin")
        if origin:
            from urllib.parse import urlsplit
            origin_parts = urlsplit(origin)
            host_parts = urlsplit(request.host_url)
            if origin_parts.netloc != host_parts.netloc:
                abort(403, description="İstek kaynağı doğrulanamadı.")


@app.route("/login", methods=["GET", "POST"])
def remote_login():
    if _is_loopback(request.remote_addr) or session.get("pytop_authenticated"):
        return redirect(url_for("index"))
    expected = app.config.get("PYTOP_REMOTE_TOKEN", "")
    error = None
    if request.method == "POST":
        supplied = request.form.get("token", "")
        if len(expected) >= 24 and hmac.compare_digest(supplied, expected):
            session.clear()
            session["pytop_authenticated"] = True
            return redirect(url_for("index"))
        error = "Anahtar doğrulanamadı veya uzak erişim sunucuda etkin değil."
    return render_template("login.html", error=error, token_configured=len(expected) >= 24)


# Başlangıç donanım ölçümünü ısıt
psutil.cpu_percent(interval=None, percpu=True)

# I/O Hız Takipçisi (Network & Disk)
_last_io = {
    "net": psutil.net_io_counters(),
    "disk": psutil.disk_io_counters() if hasattr(psutil, 'disk_io_counters') else None,
    "time": time.time()
}


def get_detailed_os():
    """Tüm Linux dağıtımlarını, macOS ve Windows sürümlerini detaylı tespit eder."""
    sys_name = platform.system()
    if sys_name == "Linux":
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("PRETTY_NAME="):
                            return line.split("=", 1)[1].strip().strip('"')
            except Exception:
                pass
        return f"Linux {platform.release()}"
    elif sys_name == "Darwin":
        mac_ver = platform.mac_ver()[0]
        arch = platform.machine()
        chip = "Apple Silicon" if arch.lower() in ("arm64", "aarch64") else "Intel"
        return f"macOS {mac_ver} ({chip})"
    elif sys_name == "Windows":
        return f"Windows {platform.release()} ({platform.machine()})"
    return sys_name

def get_cpu_model():
    """İşlemci marka ve modelini platforma göre çeker."""
    sys_name = platform.system()
    if sys_name == "Darwin":
        try:
            import subprocess
            res = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass
    elif sys_name == "Linux":
        if os.path.exists("/proc/cpuinfo"):
            try:
                with open("/proc/cpuinfo", encoding="utf-8") as f:
                    for line in f:
                        if "model name" in line:
                            return line.split(":", 1)[1].strip()
            except Exception:
                pass
    return platform.processor() or platform.machine() or "Bilinmiyor"

@app.route("/")
def index():
    """Terminal arayüzünü sunar."""
    system_info = sys_info.get_system_specifications()
    system_info["cache_bust"] = int(time.time())
    system_info["app_version"] = APP_VERSION
    return render_template("index.html", sys=system_info)



@app.route("/api/stats")
def get_stats():
    """Çekirdek bazlı CPU, RAM, Disk, Ağ, GPU, Batarya ve sistem özetini anlık hızlarla döndürür."""
    global _last_io

    with _io_lock:
        now = time.time()
        dt = max(0.1, now - _last_io["time"])
        current_net = psutil.net_io_counters()
        current_disk = psutil.disk_io_counters() if hasattr(psutil, 'disk_io_counters') else None
        rx_speed_kbs = 0.0
        tx_speed_kbs = 0.0
        if current_net and _last_io.get("net"):
            rx_speed_kbs = round(max(0, (current_net.bytes_recv - _last_io["net"].bytes_recv) / dt / 1024), 1)
            tx_speed_kbs = round(max(0, (current_net.bytes_sent - _last_io["net"].bytes_sent) / dt / 1024), 1)
        read_speed_kbs = 0.0
        write_speed_kbs = 0.0
        if current_disk and _last_io.get("disk"):
            read_speed_kbs = round(max(0, (current_disk.read_bytes - _last_io["disk"].read_bytes) / dt / 1024), 1)
            write_speed_kbs = round(max(0, (current_disk.write_bytes - _last_io["disk"].write_bytes) / dt / 1024), 1)
        _last_io = {"net": current_net, "disk": current_disk, "time": now}

    # 1. CPU
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)
    total_cpu = round(sum(per_cpu) / len(per_cpu), 1) if per_cpu else psutil.cpu_percent(interval=None)
    cpu_times = psutil.cpu_times_percent()
    cpu_freq = psutil.cpu_freq()
    current_freq = round(cpu_freq.current, 1) if cpu_freq else 0

    # 2. RAM & SWAP
    mem = psutil.virtual_memory()
    mem_total_gb = round(mem.total / (1024 ** 3), 2)
    mem_used_gb = round(mem.used / (1024 ** 3), 2)
    mem_avail_gb = round(mem.available / (1024 ** 3), 2)

    swap = psutil.swap_memory()
    swap_total_gb = round(swap.total / (1024 ** 3), 2)
    swap_used_gb = round(swap.used / (1024 ** 3), 2)

    # 3. Disk Alanı (Windows / Linux / macOS Uyumluluğu)
    if platform.system() == "Windows":
        drive = os.path.splitdrive(os.path.abspath("."))[0] + "\\"
    else:
        drive = "/"

    try:
        disk = psutil.disk_usage(drive)
    except (OSError, PermissionError):
        disk = None
        try:
            for partition in psutil.disk_partitions(all=False):
                try:
                    disk = psutil.disk_usage(partition.mountpoint)
                    drive = partition.mountpoint
                    break
                except (OSError, PermissionError):
                    continue
        except (OSError, PermissionError):
            pass

    disk_total_gb = round(disk.total / (1024 ** 3), 1) if disk else 0.0
    disk_used_gb = round(disk.used / (1024 ** 3), 1) if disk else 0.0
    disk_free_gb = round(disk.free / (1024 ** 3), 1) if disk else 0.0
    disk_percent = disk.percent if disk else 0.0

    # 5. Uptime
    uptime_seconds = int(now - psutil.boot_time())
    days, rem = divmod(uptime_seconds, 86400)
    hours, rem = divmod(rem, 3600)
    mins, secs = divmod(rem, 60)
    if days > 0:
        uptime_str = f"{days}d {hours:02d}:{mins:02d}:{secs:02d}"
    else:
        uptime_str = f"{hours:02d}:{mins:02d}:{secs:02d}"

    # 6. GPU & Batarya & Sıcaklıklar (Fikir 1)
    gpus = gpu_monitor.get_gpu_stats()
    battery = gpu_monitor.get_battery_stats()
    cpu_temps = gpu_monitor.get_cpu_temperatures()

    stats_payload = {
        "timestamp": time.strftime("%H:%M:%S"),
        "uptime": uptime_str,
        "cpu": {
            "total": total_cpu,
            "cores": per_cpu,
            "freq_mhz": current_freq,
            "user": round(getattr(cpu_times, 'user', 0.0), 1),
            "system": round(getattr(cpu_times, 'system', 0.0), 1),
            "idle": round(getattr(cpu_times, 'idle', 0.0), 1)
        },
        "mem": {
            "total_gb": mem_total_gb,
            "used_gb": mem_used_gb,
            "free_gb": mem_avail_gb,
            "percent": mem.percent
        },
        "swap": {
            "total_gb": swap_total_gb,
            "used_gb": swap_used_gb,
            "percent": swap.percent
        },
        "disk": {
            "drive": drive,
            "total_gb": disk_total_gb,
            "used_gb": disk_used_gb,
            "free_gb": disk_free_gb,
            "percent": disk_percent,
            "read_kbs": read_speed_kbs,
            "write_kbs": write_speed_kbs
        },
        "net": {
            "rx_kbs": rx_speed_kbs,
            "tx_kbs": tx_speed_kbs,
            "total_rx_mb": round((current_net.bytes_recv if current_net else 0) / (1024 ** 2), 1),
            "total_tx_mb": round((current_net.bytes_sent if current_net else 0) / (1024 ** 2), 1)
        },
        "gpus": gpus,
        "battery": battery,
        "cpu_temps": cpu_temps,
        "tasks_total": len(psutil.pids())
    }

    # 7. Akıllı Eşik & Webhook Uyarı Kontrolü (Fikir 2)
    active_warnings = alerts.check_and_trigger_alerts(stats_payload, platform.node())
    stats_payload["active_warnings"] = active_warnings
    stats_payload["alerts_enabled"] = alerts.load_config().get("enabled", False)

    return jsonify(stats_payload)

@app.route("/api/processes")
def get_processes():
    """Çalışan gerçek sistem süreçlerini listeler, kategorize eder ve sıralar."""
    sort_by = request.args.get("sort", "cpu")
    if sort_by not in {"cpu", "mem", "rss", "pid", "name", "threads"}:
        sort_by = "cpu"
    sort_order = request.args.get("order", "desc")
    if sort_order not in {"asc", "desc"}:
        sort_order = "desc"
    filter_q = request.args.get("filter", "").lower().strip()
    category = request.args.get("cat", "all")
    if category not in {"all", "python", "browser", "user"}:
        category = "all"
    limit = max(1, min(request.args.get("limit", 60, type=int) or 60, 250))

    procs = []
    attrs = ['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status', 'memory_info', 'num_threads', 'create_time']

    for p in psutil.process_iter(attrs):
        try:
            info = p.info
            pid = info['pid']

            # Windows'ta PID 0 "System Idle Process" boşta kalma oranını gösterir, normal süreç listesine ekleme
            if pid == 0:
                continue

            p_name = info['name'] or 'unknown'
            p_lower = p_name.lower()

            # Kategori filtreleme
            if category == "python" and "python" not in p_lower:
                continue
            elif category == "browser" and not any(b in p_lower for b in ["chrome", "firefox", "msedge", "brave", "opera", "safari"]):
                continue
            elif category == "user":
                user_str = (info.get('username') or '').lower()
                if any(sys_name in user_str for sys_name in ["system", "local service", "network service", "root", "daemon"]):
                    continue

            # Arama filtreleme
            if filter_q:
                pid_str = str(pid)
                if filter_q not in p_lower and filter_q not in pid_str:
                    continue

            rss_mb = 0
            vms_mb = 0
            if info.get('memory_info'):
                rss_mb = round(info['memory_info'].rss / (1024 * 1024), 1)
                vms_mb = round(info['memory_info'].vms / (1024 * 1024), 1)

            # Kullanıcı adı (Linux / Windows uyumlu)
            raw_user = info.get('username') or ''
            clean_user = raw_user.split('\\')[-1] or ('root' if pid == 1 else 'system')

            # Çalışma süresi
            uptime_str = "-"
            if info.get('create_time'):
                elapsed = max(0, int(time.time() - info['create_time']))
                m, s = divmod(elapsed, 60)
                h, m = divmod(m, 60)
                uptime_str = f"{h:02d}:{m:02d}:{s:02d}"

            procs.append({
                "pid": pid,
                "name": p_name,
                "user": clean_user,
                "cpu": round(info.get('cpu_percent') or 0.0, 1),
                "mem": round(info.get('memory_percent') or 0.0, 1),
                "rss_mb": rss_mb,
                "vms_mb": vms_mb,
                "threads": info.get('num_threads') or 1,
                "uptime": uptime_str,
                "status": info.get('status') or 'running'
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    reverse = (sort_order == "desc")
    if sort_by == "cpu":
        procs.sort(key=lambda x: x['cpu'], reverse=reverse)
    elif sort_by == "mem":
        procs.sort(key=lambda x: x['mem'], reverse=reverse)
    elif sort_by == "rss":
        procs.sort(key=lambda x: x['rss_mb'], reverse=reverse)
    elif sort_by == "pid":
        procs.sort(key=lambda x: x['pid'], reverse=reverse)
    elif sort_by == "name":
        procs.sort(key=lambda x: x['name'].lower(), reverse=reverse)
    elif sort_by == "threads":
        procs.sort(key=lambda x: x['threads'], reverse=reverse)

    return jsonify(procs[:limit])

@app.route("/api/process/<int:pid>")
def get_process_detail(pid):
    """Belirli bir sürecin detaylı bilgilerini döndürür (Process Inspector)."""
    try:
        p = psutil.Process(pid)
        with p.oneshot():
            name = p.name()
            status = p.status()
            raw_user = p.username() if hasattr(p, 'username') else ''
            user = (raw_user or '').split('\\')[-1] or 'system'
            cpu_p = round(p.cpu_percent(), 1)
            mem_p = round(p.memory_percent(), 1)
            mem_info = p.memory_info()
            threads_count = p.num_threads()
            try:
                create_t = datetime.datetime.fromtimestamp(p.create_time()).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                create_t = "-"

            try:
                exe = p.exe()
            except Exception:
                exe = "Erişim kısıtlı / Sistem süreci"

            try:
                cmdline = " ".join(p.cmdline()) or name
            except Exception:
                cmdline = name

            try:
                cwd = p.cwd()
            except Exception:
                cwd = "Erişim kısıtlı"

            try:
                connections = len(p.net_connections())
            except Exception:
                connections = 0

        return jsonify({
            "pid": pid,
            "name": name,
            "status": status,
            "user": user,
            "cpu": cpu_p,
            "mem": mem_p,
            "rss_mb": round(mem_info.rss / (1024 * 1024), 2),
            "vms_mb": round(mem_info.vms / (1024 * 1024), 2),
            "threads": threads_count,
            "create_time": create_t,
            "exe": exe,
            "cmdline": cmdline,
            "cwd": cwd,
            "connections": connections
        })
    except psutil.NoSuchProcess:
        return jsonify({"error": "Süreç artık mevcut değil."}), 404
    except psutil.AccessDenied:
        return jsonify({"error": "Bu sürecin detaylarını görmek için yönetici / root yetkisi gerekir."}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/kill/<int:pid>", methods=["POST"])
def kill_process(pid):
    """Belirtilen PID numaralı süreci sonlandırır (SIGTERM veya SIGKILL)."""
    data = request.get_json(silent=True) or {}
    if data.get("confirm") is not True:
        return jsonify({"success": False, "message": "İşlemi sonlandırmak için confirm=true gerekli."}), 400
    if pid <= 1 or pid == os.getpid():
        return jsonify({"success": False, "message": "Sistem süreci veya pyTOP Pro'nun kendisi sonlandırılamaz."}), 400
    force = data.get("force") is True

    try:
        p = psutil.Process(pid)
        p_name = p.name()
        if force:
            p.kill()
            msg = f"{p_name} (PID: {pid}) zorla sonlandırıldı (SIGKILL)."
        else:
            p.terminate()
            msg = f"{p_name} (PID: {pid}) başarıyla kapatıldı (SIGTERM)."
        return jsonify({"success": True, "message": msg})
    except psutil.NoSuchProcess:
        return jsonify({"success": False, "message": "Süreç zaten kapanmış veya bulunamadı."}), 404
    except psutil.AccessDenied:
        return jsonify({"success": False, "message": "Erişim engellendi. Bu süreci sonlandırmak için Yönetici (Windows Admin) veya root (Linux/macOS sudo) yetkisi gerekir."}), 403
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ======================================================================
# Uyarı & Webhook API Uç Noktaları (Fikir 2)
# ======================================================================
@app.route("/api/alerts/config", methods=["GET", "POST"])
def alert_config():
    """Uyarı ayarlarını okur veya günceller."""
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        success, msg = alerts.save_config(data)
        return jsonify({"success": success, "message": msg}), (200 if success else 400)
    else:
        cfg = alerts.load_config()
        safe_cfg = cfg.copy()
        safe_cfg["discord_configured"] = bool(safe_cfg.pop("discord_webhook", ""))
        safe_cfg["telegram_configured"] = bool(safe_cfg.pop("telegram_token", "") and safe_cfg.pop("telegram_chat_id", ""))
        safe_cfg.pop("telegram_token", None)
        safe_cfg.pop("telegram_chat_id", None)
        return jsonify(safe_cfg)

@app.route("/api/alerts/test", methods=["POST"])
def alert_test():
    """Seçili kanala test bildirimi tetikler."""
    success, msg = alerts.send_test_alert()
    return jsonify({"success": success, "message": msg})

# ======================================================================
# Sistem Sağlık Raporu Uç Noktaları (Fikir 6)
# ======================================================================
@app.route("/report")
def system_report():
    """Gelişmiş, yazdırılabilir (Print/PDF) sistem sağlık raporunu görüntüler."""
    rep = report_generator.generate_health_report()
    return render_template("report.html", r=rep)

@app.route("/api/report/data")
def api_report_data():
    """Sistem sağlık raporunun anlık JSON verisini döner."""
    rep = report_generator.generate_health_report()
    return jsonify(rep)

@app.route("/api/report/download/json")
def api_report_download_json():
    """Sistem sağlık raporunu indirilebilir JSON dosyası olarak sunar."""
    rep = report_generator.generate_health_report()
    hostname = rep["metadata"]["hostname"]
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"pytop_report_{hostname}_{now_str}.json"

    json_bytes = json.dumps(rep, ensure_ascii=False, indent=2).encode("utf-8")
    return Response(
        json_bytes,
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ======================================================================
# Canlı Ağ Bağlantıları & Port Dedektörü (Fikir 1)
# ======================================================================
@app.route("/api/network/connections")
def api_network_connections():
    """Sistemdeki açık portları ve aktif ağ bağlantılarını döner."""
    data = net_monitor.get_network_connections()
    return jsonify(data)

# ======================================================================
# Bilgisayar & Donanım Bilgileri API Ucu
# ======================================================================
@app.route("/api/system/info")
def api_system_info():
    """Detaylı bilgisayar donanım, model ve sistem özelliklerini döner."""
    data = sys_info.get_system_specifications()
    return jsonify(data)

# ======================================================================
# Docker & Konteyner Yöneticisi API Uç Noktaları (Fikir 1)
# ======================================================================
@app.route("/api/docker/containers")
def api_docker_containers():
    """Tüm Docker konteynerlerini, kaynak tüketimini ve daemon durumunu döner."""
    data = docker_monitor.get_containers_summary()
    return jsonify(data)

@app.route("/api/docker/action/<container_id>/<action>", methods=["POST"])
def api_docker_action(container_id, action):
    """Konteyner üzerinde start, stop, restart, pause, unpause işlemlerini yürütür."""
    res = docker_monitor.execute_container_action(container_id, action)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/docker/logs/<container_id>")
def api_docker_logs(container_id):
    """Konteynerin son konsol loglarını döner."""
    tail = request.args.get("tail", 150, type=int)
    res = docker_monitor.get_container_logs(container_id, tail=tail)
    return jsonify(res)


@app.route("/api/update")
def api_update_check():
    """Check the configured GitHub repository's latest release without installing it."""
    return jsonify(updater.check_release(APP_VERSION))


@app.route("/healthz")
def health_check():
    return jsonify({"ok": True, "version": APP_VERSION})



@app.after_request
def add_cache_control_headers(response):
    """Tarayıcının eski HTML, CSS veya JS dosyalarını önbellekte tutmasını engeller."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response

@app.route("/sw.js")
def cleanup_service_worker():
    """Eski PWA Service Worker kalıntılarını yok eder ve istemci önbelleklerini temizler."""
    code = """self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
});
"""
    return Response(code, mimetype="application/javascript")


def find_available_port(start_port=5000, max_tries=20, host="127.0.0.1"):
    """Port 5000 meşgulse çökmemesi için sıradaki boş portu bulur."""
    for p in range(start_port, start_port + max_tries):
        try:
            family = socket.AF_INET6 if ":" in host else socket.AF_INET
            with socket.socket(family, socket.SOCK_STREAM) as s:
                s.bind((host, p))
                return p
        except OSError:
            continue
    return start_port

if __name__ == "__main__":
    host = os.environ.get("PYTOP_BIND", "127.0.0.1").strip()
    port_value = os.environ.get("PYTOP_PORT", "")
    remote_token = os.environ.get("PYTOP_REMOTE_TOKEN", "")
    if host not in {"localhost", "127.0.0.1", "::1"} and len(remote_token) < 24:
        raise SystemExit("Uzak erişim için en az 24 karakterlik PYTOP_REMOTE_TOKEN ayarlayın; aksi halde PYTOP_BIND=127.0.0.1 kullanın.")
    port = int(port_value) if port_value else find_available_port(5000, host=host)
    print("==================================================")
    print(f" pyTOP Pro ({APP_VERSION}) — Terminal Sistem & Süreç Monitörü")
    print(f" Yerel Erişim:  http://127.0.0.1:{port}")
    if host not in {"localhost", "127.0.0.1", "::1"}:
        print(f" Ağ Erişimi:    http://{host}:{port} (oturum açma ve token gerekli)")
    else:
        print(" Uzak ağ erişimi kapalıdır. Gerekiyorsa PYTOP_BIND ve PYTOP_REMOTE_TOKEN ayarlayın.")
    print("==================================================")
    has_desktop = os.name == "nt" or (platform.system() == "Darwin" and not os.environ.get("SSH_CLIENT")) or bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))
    if host in {"localhost", "127.0.0.1", "::1"} and has_desktop and os.environ.get("PYTOP_NO_BROWSER") != "1":
        threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(host=host, port=port, debug=False, threaded=True)
