import os
import time
import platform
import datetime
import socket
from flask import Flask, render_template, jsonify, request, Response
import json
import psutil

import gpu_monitor
import alerts
import report_generator

app = Flask(__name__)

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
    try:
        boot_ts = psutil.boot_time()
        boot_str = datetime.datetime.fromtimestamp(boot_ts).strftime("%Y-%m-%d %H:%M")
    except Exception:
        boot_str = "Bilinmiyor"

    system_info = {
        "hostname": platform.node(),
        "os": get_detailed_os(),
        "machine": platform.machine(),
        "processor": get_cpu_model(),
        "python_version": platform.python_version(),
        "cores_logical": psutil.cpu_count(logical=True) or 1,
        "cores_physical": psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True) or 1,
        "boot_time": boot_str
    }
    return render_template("index.html", sys=system_info)

@app.route("/api/stats")
def get_stats():
    """Çekirdek bazlı CPU, RAM, Disk, Ağ, GPU, Batarya ve sistem özetini anlık hızlarla döndürür."""
    global _last_io

    now = time.time()
    dt = max(0.1, now - _last_io["time"])

    # 1. CPU
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)
    total_cpu = psutil.cpu_percent(interval=None)
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
    except Exception:
        disk = psutil.disk_usage("/")
        drive = "/"
    
    disk_total_gb = round(disk.total / (1024 ** 3), 1)
    disk_used_gb = round(disk.used / (1024 ** 3), 1)
    disk_free_gb = round(disk.free / (1024 ** 3), 1)

    # 4. Ağ ve Disk I/O Hızları
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

    # Güncelle
    _last_io = {
        "net": current_net,
        "disk": current_disk,
        "time": now
    }

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
            "percent": disk.percent,
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
    sort_order = request.args.get("order", "desc")
    filter_q = request.args.get("filter", "").lower().strip()
    category = request.args.get("cat", "all")
    limit = int(request.args.get("limit", 60))

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
    data = request.get_json() or {}
    force = data.get("force", False)

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
        data = request.get_json() or {}
        success, msg = alerts.save_config(data)
        return jsonify({"success": success, "message": msg})
    else:
        cfg = alerts.load_config()
        # Güvenlik için tokenları kısmen maskeleme
        safe_cfg = cfg.copy()
        if safe_cfg.get("discord_webhook"):
            safe_cfg["discord_webhook_masked"] = safe_cfg["discord_webhook"][:28] + "..."
        if safe_cfg.get("telegram_token"):
            safe_cfg["telegram_token_masked"] = safe_cfg["telegram_token"][:8] + "..."
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

def find_available_port(start_port=5000, max_tries=20):
    """Port 5000 meşgulse çökmemesi için sıradaki boş portu bulur."""
    for p in range(start_port, start_port + max_tries):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", p))
                return p
        except OSError:
            continue
    return start_port

if __name__ == "__main__":
    port = find_available_port(5000)
    print("==================================================")
    print(" pyTOP Pro — Terminal Sistem & Süreç Monitörü")
    print(f" Yerel Erişim:  http://127.0.0.1:{port}")
    print(f" Ağ Erişimi:    http://0.0.0.0:{port}")
    print("==================================================")
    app.run(host="0.0.0.0", port=port, debug=False)
