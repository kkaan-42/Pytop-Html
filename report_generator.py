import os
import platform
import datetime
import socket
import psutil

import gpu_monitor

def generate_health_report():
    """
    Sistemin anlık sağlık, donanım, süreç ve performans durumunu
    analiz ederek kapsamlı bir sağlık raporu sözlüğü üretir.
    """
    now = datetime.datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # 1. Temel Sistem Bilgileri
    try:
        boot_ts = psutil.boot_time()
        boot_str = datetime.datetime.fromtimestamp(boot_ts).strftime("%Y-%m-%d %H:%M:%S")
        uptime_secs = int(now.timestamp() - boot_ts)
        hours, remainder = divmod(uptime_secs, 3600)
        minutes, seconds = divmod(remainder, 60)
        uptime_str = f"{hours:02d}s {minutes:02d}d {seconds:02d}sn"
    except Exception:
        boot_str = "Bilinmiyor"
        uptime_str = "Bilinmiyor"

    # CPU Modeli
    from app import get_detailed_os, get_cpu_model
    os_name = get_detailed_os()
    cpu_model = get_cpu_model()

    # 2. CPU Analizi
    per_cpu = psutil.cpu_percent(interval=0.1, percpu=True)
    total_cpu = round(sum(per_cpu) / len(per_cpu), 1) if per_cpu else psutil.cpu_percent(interval=None)
    cpu_freq = psutil.cpu_freq()
    freq_current = round(cpu_freq.current, 1) if cpu_freq else 0
    freq_max = round(cpu_freq.max, 1) if cpu_freq and cpu_freq.max > 0 else 0
    cpu_times = psutil.cpu_times_percent()

    # 3. Bellek (RAM & Swap)
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    mem_data = {
        "total_gb": round(mem.total / (1024 ** 3), 2),
        "used_gb": round(mem.used / (1024 ** 3), 2),
        "available_gb": round(mem.available / (1024 ** 3), 2),
        "free_gb": round(mem.free / (1024 ** 3), 2),
        "percent": mem.percent,
        "swap_total_gb": round(swap.total / (1024 ** 3), 2),
        "swap_used_gb": round(swap.used / (1024 ** 3), 2),
        "swap_percent": swap.percent
    }

    # 4. Disk Bölümleri ve I/O
    disk_partitions = []
    try:
        parts = psutil.disk_partitions(all=False)
        for p in parts:
            try:
                usage = psutil.disk_usage(p.mountpoint)
                disk_partitions.append({
                    "device": p.device,
                    "mountpoint": p.mountpoint,
                    "fstype": p.fstype,
                    "total_gb": round(usage.total / (1024 ** 3), 2),
                    "used_gb": round(usage.used / (1024 ** 3), 2),
                    "free_gb": round(usage.free / (1024 ** 3), 2),
                    "percent": usage.percent
                })
            except (PermissionError, OSError):
                continue
    except Exception:
        pass

    disk_io = {}
    if hasattr(psutil, "disk_io_counters"):
        try:
            dio = psutil.disk_io_counters()
            if dio:
                disk_io = {
                    "read_bytes_mb": round(dio.read_bytes / (1024 ** 2), 1),
                    "write_bytes_mb": round(dio.write_bytes / (1024 ** 2), 1),
                    "read_count": dio.read_count,
                    "write_count": dio.write_count
                }
        except Exception:
            pass

    # 5. Ağ Kartları ve I/O
    net_io = {}
    try:
        nio = psutil.net_io_counters()
        net_io = {
            "bytes_sent_mb": round(nio.bytes_sent / (1024 ** 2), 2),
            "bytes_recv_mb": round(nio.bytes_recv / (1024 ** 2), 2),
            "packets_sent": nio.packets_sent,
            "packets_recv": nio.packets_recv
        }
    except Exception:
        pass

    net_addrs = {}
    try:
        for iface, addrs in psutil.net_if_addrs().items():
            ip_list = []
            for a in addrs:
                if a.family == socket.AF_INET and not a.address.startswith("127."):
                    ip_list.append(a.address)
            if ip_list:
                net_addrs[iface] = ip_list
    except Exception:
        pass

    # 6. GPU & Batarya
    gpus = gpu_monitor.get_gpu_stats()
    battery = gpu_monitor.get_battery_stats()
    cpu_temps = gpu_monitor.get_cpu_temperatures()

    # 7. Süreç Analizi (Top CPU & Top RAM)
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'memory_info', 'status', 'num_threads']):
        try:
            info = proc.info
            info['memory_rss_mb'] = round((info['memory_info'].rss / (1024 * 1024)), 1) if info.get('memory_info') else 0
            processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    total_tasks = len(processes)
    top_cpu = sorted(processes, key=lambda x: x.get('cpu_percent') or 0, reverse=True)[:10]
    top_mem = sorted(processes, key=lambda x: x.get('memory_percent') or 0, reverse=True)[:10]

    # 8. Akıllı Sağlık Skoru & Teşhis Bulguları
    health_score = 100
    deductions = []
    findings = []

    # CPU kontrolü
    if total_cpu >= 90:
        health_score -= 25
        deductions.append(f"Kritik CPU kullanımı (%{total_cpu})")
        findings.append(f"İşlemci yükü aşırı yüksek (%{total_cpu}). En çok yük bindiren süreç: {top_cpu[0]['name'] if top_cpu else 'Bilinmiyor'} (PID: {top_cpu[0]['pid'] if top_cpu else '-'})")
    elif total_cpu >= 75:
        health_score -= 10
        deductions.append(f"Yüksek CPU kullanımı (%{total_cpu})")
        findings.append(f"İşlemci yükü normalin üzerinde (%{total_cpu}).")
    else:
        findings.append(f"İşlemci yükü sağlıklı (%{total_cpu}).")

    # RAM kontrolü
    if mem_data["percent"] >= 90:
        health_score -= 25
        deductions.append(f"Kritik Bellek kullanımı (%{mem_data['percent']})")
        findings.append(f"RAM doluluk oranı kritik seviyede (%{mem_data['percent']}). Sistem takas alanına (Swap) başvurabilir.")
    elif mem_data["percent"] >= 80:
        health_score -= 10
        deductions.append(f"Yüksek Bellek kullanımı (%{mem_data['percent']})")
        findings.append(f"RAM kullanımı yüksek (%{mem_data['percent']}). Kullanılabilir bellek: {mem_data['available_gb']} GB.")
    else:
        findings.append(f"Bellek kullanımı ideal seviyede (%{mem_data['percent']}). Kullanılabilir: {mem_data['available_gb']} GB.")

    # Disk kontrolü
    for d in disk_partitions:
        if d["percent"] >= 92:
            health_score -= 15
            deductions.append(f"Kritik Disk Doluluğu: {d['mountpoint']} (%{d['percent']})")
            findings.append(f"Sürücü {d['mountpoint']} dolmak üzere (%{d['percent']} dolu). En az {d['free_gb']} GB boş alan kaldı, temizlik önerilir.")
        elif d["percent"] >= 85:
            health_score -= 5
            findings.append(f"Sürücü {d['mountpoint']} doluluğu dikkat çekici (%{d['percent']} dolu).")

    # GPU kontrolü
    for g in gpus:
        if g.get("temp", 0) >= 85:
            health_score -= 15
            deductions.append(f"Yüksek GPU Sıcaklığı ({g['temp']}°C)")
            findings.append(f"Ekran kartı ({g['name']}) sıcaklığı yüksek ({g['temp']}°C). Havalandırma ve fan hızını kontrol edin.")

    # Swap kontrolü
    if mem_data["swap_percent"] >= 70:
        health_score -= 10
        findings.append(f"Takas alanı (Swap) yoğun kullanılıyor (%{mem_data['swap_percent']}). Fiziksel RAM yetersiz kalıyor olabilir.")

    health_score = max(5, min(100, health_score))

    if health_score >= 90:
        health_status = "Mükemmel (Sağlıklı)"
        health_color = "#22c55e" # Yeşil
    elif health_score >= 75:
        health_status = "İyi (Hafif Yük)"
        health_color = "#eab308" # Sarı
    elif health_score >= 50:
        health_status = "Dikkat (Yüksek Yük)"
        health_color = "#f97316" # Turuncu
    else:
        health_status = "Kritik (Müdahale Gerekli)"
        health_color = "#ef4444" # Kırmızı

    return {
        "metadata": {
            "title": "pyTOP Pro — Sistem Sağlık ve Performans Raporu",
            "hostname": platform.node(),
            "os": os_name,
            "architecture": platform.machine(),
            "processor": cpu_model,
            "python_version": platform.python_version(),
            "generated_at": timestamp_str,
            "boot_time": boot_str,
            "uptime": uptime_str,
            "total_tasks": total_tasks
        },
        "health_score": {
            "score": health_score,
            "status": health_status,
            "color": health_color,
            "findings": findings,
            "deductions": deductions
        },
        "cpu": {
            "model": cpu_model,
            "total_percent": total_cpu,
            "cores_logical": psutil.cpu_count(logical=True) or 1,
            "cores_physical": psutil.cpu_count(logical=False) or 1,
            "frequency_mhz": freq_current,
            "frequency_max_mhz": freq_max,
            "per_core_percent": per_cpu,
            "times": {
                "user": getattr(cpu_times, 'user', 0),
                "system": getattr(cpu_times, 'system', 0),
                "idle": getattr(cpu_times, 'idle', 0)
            },
            "temperatures": cpu_temps
        },
        "memory": mem_data,
        "disks": {
            "partitions": disk_partitions,
            "io": disk_io
        },
        "network": {
            "io": net_io,
            "interfaces": net_addrs
        },
        "gpus": gpus,
        "battery": battery,
        "top_processes": {
            "by_cpu": top_cpu,
            "by_memory": top_mem
        }
    }
