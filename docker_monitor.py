"""
pyTOP Pro — Çapraz Platform Canlı Docker & Konteyner Yöneticisi (docker_monitor.py)
Docker CLI ve Daemon durumunu denetler; konteynerleri listeler, kaynak tüketimini ölçer,
başlatma/durdurma/yeniden başlatma eylemlerini yürütür ve canlı logları çeker.
"""

import json
import shutil
import subprocess
import time


def is_docker_installed() -> bool:
    """Sistemde Docker CLI komutunun kurulu olup olmadığını kontrol eder."""
    return shutil.which("docker") is not None


def get_docker_daemon_status() -> dict:
    """Docker daemon'ın çalışıp çalışmadığını ve sürüm bilgilerini tespit eder."""
    if not is_docker_installed():
        return {
            "installed": False,
            "daemon_running": False,
            "version": None,
            "error": "Sistemde Docker komut satırı aracı (CLI) bulunamadı. Lütfen Docker veya Docker Desktop kurun."
        }

    try:
        # Hızlı sürüm kontrolü (CLI çalışıyor mu?)
        ver_res = subprocess.run(
            ["docker", "version", "--format", "{{.Client.Version}}"],
            capture_output=True,
            text=True,
            timeout=2
        )
        client_version = ver_res.stdout.strip() if ver_res.returncode == 0 else "Bilinmiyor"
    except Exception:
        client_version = "Bilinmiyor"

    try:
        # Daemon bağlantısını test et
        info_res = subprocess.run(
            ["docker", "info", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
            timeout=3
        )

        if info_res.returncode == 0 and info_res.stdout.strip():
            info_data = json.loads(info_res.stdout.strip())
            return {
                "installed": True,
                "daemon_running": True,
                "version": client_version,
                "server_version": info_data.get("ServerVersion", "Bilinmiyor"),
                "containers_total": info_data.get("Containers", 0),
                "containers_running": info_data.get("ContainersRunning", 0),
                "containers_paused": info_data.get("ContainersPaused", 0),
                "containers_stopped": info_data.get("ContainersStopped", 0),
                "images_total": info_data.get("Images", 0),
                "os": info_data.get("OperatingSystem", ""),
                "error": None
            }
        else:
            err_msg = info_res.stderr.strip() or "Docker daemon'a bağlanılamadı."
            return {
                "installed": True,
                "daemon_running": False,
                "version": client_version,
                "error": f"Docker servisi / Docker Desktop çalışmıyor. ({err_msg[:120]})"
            }
    except subprocess.TimeoutExpired:
        return {
            "installed": True,
            "daemon_running": False,
            "version": client_version,
            "error": "Docker daemon yanıt vermiyor (Zaman aşımı)."
        }
    except Exception as e:
        return {
            "installed": True,
            "daemon_running": False,
            "version": client_version,
            "error": str(e)
        }


def get_containers_summary() -> dict:
    """Tüm konteynerleri, durumlarını, portlarını ve canlı CPU/RAM kullanımını döner."""
    daemon_status = get_docker_daemon_status()
    if not daemon_status.get("daemon_running"):
        return {
            "status": daemon_status,
            "containers": [],
            "summary": {
                "total": 0,
                "running": 0,
                "stopped": 0,
                "paused": 0
            }
        }

    containers = []
    try:
        # 1. Tüm Konteynerleri JSON formatında listele
        ps_res = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if ps_res.returncode == 0 and ps_res.stdout.strip():
            for line in ps_res.stdout.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    c_json = json.loads(line)
                    cid = c_json.get("ID", "")[:12]
                    names = c_json.get("Names", "").lstrip("/")
                    state = c_json.get("State", "unknown").lower()
                    status = c_json.get("Status", "")
                    image = c_json.get("Image", "")
                    ports = c_json.get("Ports", "")
                    created = c_json.get("CreatedAt", "") or c_json.get("RunningFor", "")

                    containers.append({
                        "id": cid,
                        "name": names,
                        "image": image,
                        "state": state,
                        "status": status,
                        "ports": ports,
                        "created": created,
                        "cpu_percent": "0.0%",
                        "mem_usage": "0 MB",
                        "mem_percent": "0.0%"
                    })
                except Exception:
                    continue
    except Exception as e:
        daemon_status["error"] = f"Konteynerler listelenirken hata oluştu: {str(e)}"
        return {
            "status": daemon_status,
            "containers": [],
            "summary": {"total": 0, "running": 0, "stopped": 0, "paused": 0}
        }

    # 2. Çalışan Konteynerlerin Canlı CPU & RAM Metriklerini Çek (İsteğe bağlı hızlı sorgu)
    running_cids = [c["id"] for c in containers if c["state"] == "running"]
    if running_cids:
        try:
            stats_res = subprocess.run(
                ["docker", "stats", "--no-stream", "--format", "{{json .}}"] + running_cids[:15],
                capture_output=True,
                text=True,
                timeout=4
            )
            if stats_res.returncode == 0 and stats_res.stdout.strip():
                stats_map = {}
                for sline in stats_res.stdout.strip().splitlines():
                    sline = sline.strip()
                    if not sline:
                        continue
                    try:
                        s_json = json.loads(sline)
                        sid = s_json.get("ID", "")[:12]
                        stats_map[sid] = {
                            "cpu": s_json.get("CPUPerc", "0.0%"),
                            "mem_usage": s_json.get("MemUsage", "0 MB").split("/")[0].strip(),
                            "mem_percent": s_json.get("MemPerc", "0.0%")
                        }
                    except Exception:
                        continue

                for c in containers:
                    if c["id"] in stats_map:
                        st = stats_map[c["id"]]
                        c["cpu_percent"] = st["cpu"]
                        c["mem_usage"] = st["mem_usage"]
                        c["mem_percent"] = st["mem_percent"]
        except Exception:
            pass  # Stats başarısız olsa bile konteyner listesi eksiksiz sunulur

    # İstatistik Özetleri
    running_count = sum(1 for c in containers if c["state"] == "running")
    paused_count = sum(1 for c in containers if c["state"] == "paused")
    stopped_count = sum(1 for c in containers if c["state"] in ("exited", "created", "dead"))

    return {
        "status": daemon_status,
        "containers": containers,
        "summary": {
            "total": len(containers),
            "running": running_count,
            "stopped": stopped_count,
            "paused": paused_count
        }
    }


def execute_container_action(container_id: str, action: str) -> dict:
    """Belirtilen konteyner üzerinde start, stop, restart işlemlerini yürütür."""
    allowed_actions = ["start", "stop", "restart", "pause", "unpause"]
    if action not in allowed_actions:
        return {"success": False, "message": f"Geçersiz eylem: {action}. İzin verilenler: {', '.join(allowed_actions)}"}

    if not is_docker_installed():
        return {"success": False, "message": "Docker kurulu değil."}

    # ID güvenliği (alfasayısal ve tire kontrolü)
    clean_id = "".join(c for c in container_id if c.isalnum() or c in "-_")
    if not clean_id:
        return {"success": False, "message": "Geçersiz konteyner kimliği (ID)."}

    try:
        res = subprocess.run(
            ["docker", action, clean_id],
            capture_output=True,
            text=True,
            timeout=10
        )
        if res.returncode == 0:
            return {
                "success": True,
                "message": f"Konteyner ({clean_id}) '{action}' komutu ile başarıyla tetiklendi."
            }
        else:
            err = res.stderr.strip() or f"Hata kodu: {res.returncode}"
            return {"success": False, "message": f"İşlem başarısız: {err}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "message": f"'{action}' komutu zaman aşımına uğradı (10s)."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def get_container_logs(container_id: str, tail: int = 150) -> dict:
    """Belirtilen konteynerin son konsol loglarını döner."""
    if not is_docker_installed():
        return {"success": False, "logs": "Docker bulunamadı.", "container_id": container_id}

    clean_id = "".join(c for c in container_id if c.isalnum() or c in "-_")
    if not clean_id:
        return {"success": False, "logs": "Geçersiz konteyner kimliği.", "container_id": container_id}

    try:
        res = subprocess.run(
            ["docker", "logs", "--tail", str(min(tail, 500)), clean_id],
            capture_output=True,
            text=True,
            timeout=5
        )
        # docker logs çıktısı stdout veya stderr'de gelebilir
        logs = res.stdout if res.stdout else res.stderr
        return {
            "success": res.returncode == 0,
            "logs": logs if logs.strip() else "(Bu konteyner için henüz log çıktısı bulunmuyor)",
            "container_id": clean_id
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "logs": "Loglar alınırken zaman aşımı oluştu.", "container_id": clean_id}
    except Exception as e:
        return {"success": False, "logs": f"Hata: {str(e)}", "container_id": clean_id}
