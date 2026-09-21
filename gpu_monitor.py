import os
import platform
import subprocess
import shutil
import psutil

def get_gpu_stats():
    """
    NVIDIA, AMD, Intel veya Apple Silicon GPU bilgilerini çeker.
    Windows, tüm Linux dağıtımları ve macOS üzerinde güvenle çalışır.
    """
    gpus = []
    sys_name = platform.system()

    # 1. NVIDIA Kontrolü (nvidia-smi - Windows & Linux)
    if shutil.which("nvidia-smi"):
        try:
            cmd = [
                "nvidia-smi",
                "--query-gpu=name,temperature.gpu,utilization.gpu,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits"
            ]
            startupinfo = None
            if hasattr(subprocess, "STARTUPINFO"):
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1.5,
                startupinfo=startupinfo
            )

            if res.returncode == 0 and res.stdout.strip():
                for line in res.stdout.strip().splitlines():
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 6:
                        tot_mb = float(parts[3])
                        usd_mb = float(parts[4])
                        pct = round((usd_mb / tot_mb) * 100, 1) if tot_mb > 0 else 0
                        gpus.append({
                            "name": parts[0],
                            "temp": int(parts[1]),
                            "load": int(parts[2]),
                            "total_mb": tot_mb,
                            "used_mb": usd_mb,
                            "free_mb": float(parts[5]),
                            "percent": pct,
                            "type": "NVIDIA"
                        })
                if gpus:
                    return gpus
        except Exception:
            pass

    # 2. macOS (Apple Silicon / Intel Mac)
    if sys_name == "Darwin":
        try:
            arch = platform.machine().lower()
            soc_name = "Apple Silicon GPU"
            try:
                cpu_brand = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=1).stdout.strip()
                if cpu_brand:
                    soc_name = f"{cpu_brand} GPU"
            except Exception:
                pass

            if arch in ("arm64", "aarch64") or "apple" in soc_name.lower():
                # Apple Silicon (M1/M2/M3/M4) Birleşik Bellek ve Entegre GPU
                mem = psutil.virtual_memory()
                total_mb = round(mem.total / (1024 * 1024), 0)
                used_mb = round(mem.used / (1024 * 1024), 0)
                gpus.append({
                    "name": soc_name,
                    "temp": 0,
                    "load": 0,
                    "total_mb": total_mb,
                    "used_mb": used_mb,
                    "free_mb": max(0.0, total_mb - used_mb),
                    "percent": mem.percent,
                    "type": "Apple Unified"
                })
                return gpus
            else:
                # Intel Mac
                gpus.append({
                    "name": soc_name if soc_name != "Apple Silicon GPU" else "Intel Iris / Mac GPU",
                    "temp": 0,
                    "load": 0,
                    "total_mb": 0,
                    "used_mb": 0,
                    "free_mb": 0,
                    "percent": 0,
                    "type": "macOS Generic"
                })
                return gpus
        except Exception:
            pass

    # 3. Linux Sysfs (AMD Radeon / Intel i915 / Mesa)
    if sys_name == "Linux":
        try:
            drm_path = "/sys/class/drm"
            if os.path.exists(drm_path):
                cards = [d for d in os.listdir(drm_path) if d.startswith("card") and "-" not in d]
                for card in cards:
                    device_path = os.path.join(drm_path, card, "device")
                    gpu_busy_file = os.path.join(device_path, "gpu_busy_percent")
                    vram_total_file = os.path.join(device_path, "mem_info_vram_total")
                    vram_used_file = os.path.join(device_path, "mem_info_vram_used")

                    load = 0
                    if os.path.exists(gpu_busy_file):
                        try:
                            with open(gpu_busy_file, "r") as f:
                                load = int(f.read().strip())
                        except Exception:
                            pass

                    total_mb = 0.0
                    used_mb = 0.0
                    if os.path.exists(vram_total_file) and os.path.exists(vram_used_file):
                        try:
                            with open(vram_total_file, "r") as f:
                                total_mb = round(int(f.read().strip()) / (1024 * 1024), 1)
                            with open(vram_used_file, "r") as f:
                                used_mb = round(int(f.read().strip()) / (1024 * 1024), 1)
                        except Exception:
                            pass

                    temp = 0
                    hwmon_dir = os.path.join(device_path, "hwmon")
                    if os.path.exists(hwmon_dir):
                        try:
                            for h in os.listdir(hwmon_dir):
                                temp_file = os.path.join(hwmon_dir, h, "temp1_input")
                                if os.path.exists(temp_file):
                                    with open(temp_file, "r") as f:
                                        temp = int(int(f.read().strip()) / 1000)
                                        break
                        except Exception:
                            pass

                    pct = round((used_mb / total_mb) * 100, 1) if total_mb > 0 else load
                    if load > 0 or total_mb > 0 or os.path.exists(device_path):
                        gpus.append({
                            "name": f"AMD/Intel GPU ({card})",
                            "temp": temp,
                            "load": load,
                            "total_mb": total_mb,
                            "used_mb": used_mb,
                            "free_mb": max(0.0, total_mb - used_mb),
                            "percent": pct,
                            "type": "Linux DRM"
                        })
                        return gpus
        except Exception:
            pass

    return gpus

def get_battery_stats():
    """Laptop batarya durumunu (şarj %, fişe takılı mı, kalan süre) döner."""
    try:
        b = psutil.sensors_battery()
        if not b:
            return None

        status_text = "Dolu / Fişe Takılı" if b.power_plugged else "Pilde Çalışıyor"
        time_left_str = ""
        if b.secsleft > 0:
            m, s = divmod(b.secsleft, 60)
            h, m = divmod(m, 60)
            time_left_str = f" ({h}s {m}d kaldı)"
        elif b.power_plugged:
            time_left_str = " (Şarj Oluyor / Dolu)"

        return {
            "percent": b.percent,
            "plugged": b.power_plugged,
            "status": f"{status_text}{time_left_str}"
        }
    except Exception:
        return None

def get_cpu_temperatures():
    """Linux ve destekleyen sistemlerde CPU çekirdek sıcaklıklarını döner."""
    temps = []
    if hasattr(psutil, "sensors_temperatures"):
        try:
            raw_temps = psutil.sensors_temperatures()
            if raw_temps:
                for name, entries in raw_temps.items():
                    for entry in entries:
                        temps.append({
                            "label": entry.label or name,
                            "current": entry.current,
                            "high": entry.high,
                            "critical": entry.critical
                        })
        except Exception:
            pass
    return temps
