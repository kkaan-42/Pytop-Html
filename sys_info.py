"""
pyTOP Pro — Çapraz Platform Bilgisayar & Donanım Bilgi Modülü (sys_info.py)
Windows, Linux ve macOS sistemlerindeki üretici, model, CPU, GPU, RAM ve ağ özelliklerini tespit eder.
"""

import os
import time
import socket
import getpass
import platform
import datetime
import psutil

try:
    import winreg
except ImportError:
    winreg = None

import gpu_monitor


def get_detailed_os():
    """İşletim sistemi ve dağıtım adını detaylı tespit eder."""
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


def get_friendly_cpu_name():
    """İşlemcinin tam ticari/pazarlama adını çeker (örn: 13th Gen Intel Core i7-13620H)."""
    sys_name = platform.system()

    # Windows: Registry üzerinden tam ismi anında alır
    if sys_name == "Windows" and winreg:
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            val, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            if val and val.strip():
                return val.strip()
        except Exception:
            pass

    # Linux: /proc/cpuinfo üzerinden model name
    elif sys_name == "Linux":
        if os.path.exists("/proc/cpuinfo"):
            try:
                with open("/proc/cpuinfo", encoding="utf-8") as f:
                    for line in f:
                        if "model name" in line:
                            return line.split(":", 1)[1].strip()
            except Exception:
                pass

    # macOS: sysctl machdep.cpu.brand_string
    elif sys_name == "Darwin":
        try:
            import subprocess
            res = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass

    return platform.processor() or platform.machine() or "Bilinmiyor"


def get_hardware_product_info():
    """Cihaz üreticisi, model adı ve BIOS sürümünü tespit eder."""
    sys_name = platform.system()
    mfr = "Bilinmiyor"
    product = "Standart Bilgisayar"
    bios = "Bilinmiyor"

    if sys_name == "Windows" and winreg:
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\BIOS")
            try:
                m, _ = winreg.QueryValueEx(key, "SystemManufacturer")
                if m and m.strip():
                    mfr = m.strip()
            except Exception:
                pass

            try:
                p, _ = winreg.QueryValueEx(key, "SystemProductName")
                if p and p.strip():
                    product = p.strip()
            except Exception:
                pass

            try:
                b, _ = winreg.QueryValueEx(key, "BIOSVersion")
                if b and b.strip():
                    bios = b.strip()
            except Exception:
                pass
        except Exception:
            pass

    elif sys_name == "Linux":
        # Linux DMI sysfs
        def _read_dmi(name):
            path = f"/sys/class/dmi/id/{name}"
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        val = f.read().strip()
                        if val:
                            return val
                except Exception:
                    pass
            return None

        m = _read_dmi("sys_vendor")
        p = _read_dmi("product_name")
        b = _read_dmi("bios_version")
        if m:
            mfr = m
        if p:
            product = p
        if b:
            bios = b

    elif sys_name == "Darwin":
        mfr = "Apple Inc."
        try:
            import subprocess
            res = subprocess.run(["sysctl", "-n", "hw.model"], capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and res.stdout.strip():
                product = res.stdout.strip()
            res_kern = subprocess.run(["sysctl", "-n", "kern.osversion"], capture_output=True, text=True, timeout=1)
            if res_kern.returncode == 0 and res_kern.stdout.strip():
                bios = f"Build {res_kern.stdout.strip()}"
        except Exception:
            pass

    # Eğer manufacturer ürünün içinde geçiyorsa temizleme (örn: Casper Casper Excalibur)
    display_model = product
    if mfr != "Bilinmiyor" and not product.lower().startswith(mfr.lower()[:5]):
        display_model = f"{mfr} {product}".strip()

    return {
        "manufacturer": mfr,
        "product": product,
        "display_model": display_model,
        "bios_version": bios
    }


def get_primary_ip():
    """Ağdaki birincil yerel IPv4 adresini çözer (örn: 192.168.1.50)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def get_system_specifications():
    """Dashboard ve detay modalı için eksiksiz bilgisayar donanım ve sistem verisini üretir."""
    hw_info = get_hardware_product_info()
    friendly_cpu = get_friendly_cpu_name()
    detailed_os = get_detailed_os()
    local_ip = get_primary_ip()

    # Kullanıcı
    try:
        current_user = getpass.getuser()
    except Exception:
        current_user = "Kullanıcı"

    # Boot & Uptime
    try:
        boot_ts = psutil.boot_time()
        boot_str = datetime.datetime.fromtimestamp(boot_ts).strftime("%Y-%m-%d %H:%M:%S")
        uptime_sec = int(time.time() - boot_ts)
        days, rem = divmod(uptime_sec, 86400)
        hours, rem = divmod(rem, 3600)
        mins, _ = divmod(rem, 60)
        uptime_str = f"{days}g {hours}s {mins}d" if days > 0 else f"{hours}s {mins}d"
    except Exception:
        boot_str = "Bilinmiyor"
        uptime_str = "0s 0d"

    # RAM & Swap
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    ram_total_gb = round(mem.total / (1024 ** 3), 1)
    swap_total_gb = round(swap.total / (1024 ** 3), 1)

    # Disk
    if platform.system() == "Windows":
        drive = os.path.splitdrive(os.path.abspath("."))[0] + "\\"
    else:
        drive = "/"
    try:
        disk = psutil.disk_usage(drive)
        disk_total_gb = round(disk.total / (1024 ** 3), 1)
        disk_free_gb = round(disk.free / (1024 ** 3), 1)
    except Exception:
        disk_total_gb = 0
        disk_free_gb = 0

    # GPU
    gpus = gpu_monitor.get_gpu_stats()
    if gpus:
        gpu_name = gpus[0]["name"]
        gpu_detail = f"{gpu_name} ({gpus[0].get('vram_total_mb', 0)} MB)" if gpus[0].get('vram_total_mb') else gpu_name
    else:
        gpu_name = "Entegre / Yazılımsal GPU"
        gpu_detail = "Harici GPU bulunamadı"

    # CPU Frekans ve Çekirdek
    cpu_cores_p = psutil.cpu_count(logical=False) or 1
    cpu_cores_l = psutil.cpu_count(logical=True) or 1
    freq = psutil.cpu_freq()
    freq_max = round(freq.max, 0) if freq and freq.max else 0

    return {
        "hostname": platform.node(),
        "username": current_user,
        "os": detailed_os,
        "os_family": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "manufacturer": hw_info["manufacturer"],
        "product": hw_info["product"],
        "display_model": hw_info["display_model"],
        "bios_version": hw_info["bios_version"],
        "processor": friendly_cpu,
        "cores_physical": cpu_cores_p,
        "cores_logical": cpu_cores_l,
        "cpu_freq_max": freq_max,
        "gpu_name": gpu_name,
        "gpu_detail": gpu_detail,
        "gpus": gpus,
        "ram_total_gb": ram_total_gb,
        "swap_total_gb": swap_total_gb,
        "disk_drive": drive,
        "disk_total_gb": disk_total_gb,
        "disk_free_gb": disk_free_gb,
        "local_ip": local_ip,
        "boot_time": boot_str,
        "uptime": uptime_str,
        "python_version": platform.python_version()
    }
