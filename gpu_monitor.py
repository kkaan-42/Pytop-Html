import subprocess
import shutil
import psutil

def get_gpu_stats():
    """
    NVIDIA / AMD / Intel GPU bilgilerini çeker.
    NVIDIA kartlar için 'nvidia-smi' kullanır, yoksa güvenli boş liste döner.
    """
    gpus = []

    # 1. NVIDIA Kontrolü (nvidia-smi)
    if shutil.which("nvidia-smi"):
        try:
            cmd = [
                "nvidia-smi",
                "--query-gpu=name,temperature.gpu,utilization.gpu,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits"
            ]
            # Windows'ta konsol penceresi fırlamasını engelle
            startupinfo = None
            if hasattr(subprocess, 'STARTUPINFO'):
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
                            "percent": pct
                        })
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
