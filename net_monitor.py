import os
import platform
import socket
import subprocess
import psutil

def get_network_connections():
    """
    Sistemdeki açık / dinlenen portları (LISTEN) ve
    aktif kurulan dış bağlantıları (ESTABLISHED) detaylı olarak çeker.
    Windows, tüm Linux dağıtımları ve macOS üzerinde güvenle çalışır.
    """
    listening = []
    established = []
    other_conns = []

    # Süreç PID -> İsim haritasını hızlıca oluştur
    proc_map = {}
    try:
        for p in psutil.process_iter(['pid', 'name', 'username']):
            try:
                proc_map[p.pid] = {
                    "name": p.info.get('name') or "Bilinmiyor",
                    "user": p.info.get('username') or "-"
                }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception:
        pass

    raw_conns = []
    access_denied = False

    try:
        raw_conns = psutil.net_connections(kind='inet')
    except (psutil.AccessDenied, PermissionError):
        access_denied = True
        # macOS veya kısıtlı Linux'ta lsof / netstat yedeği
        if platform.system() == "Darwin":
            try:
                # lsof ile dinlenen TCP portlarını çekmeyi dene
                res = subprocess.run(
                    ["lsof", "-iTCP", "-sTCP:LISTEN", "-n", "-P"],
                    capture_output=True, text=True, timeout=2
                )
                if res.returncode == 0 and res.stdout.strip():
                    lines = res.stdout.strip().splitlines()[1:]
                    for line in lines:
                        parts = line.split()
                        if len(parts) >= 9:
                            p_name = parts[0]
                            p_pid = int(parts[1]) if parts[1].isdigit() else None
                            p_user = parts[2]
                            addr_info = parts[8] # örn: *:5000 veya 127.0.0.1:5000
                            port = int(addr_info.split(":")[-1]) if ":" in addr_info else 0
                            listening.append({
                                "pid": p_pid,
                                "name": p_name,
                                "user": p_user,
                                "proto": "TCP",
                                "port": port,
                                "laddr": addr_info,
                                "raddr": "-",
                                "status": "LISTEN"
                            })
            except Exception:
                pass

    if raw_conns:
        for c in raw_conns:
            try:
                pid = c.pid
                p_info = proc_map.get(pid, {"name": "-", "user": "-"}) if pid else {"name": "-", "user": "-"}
                proto = "TCP" if c.type == socket.SOCK_STREAM else "UDP"

                lip = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "-"
                rip = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "-"
                port_num = c.laddr.port if c.laddr else 0
                status = c.status or ("UDP" if proto == "UDP" else "NONE")

                item = {
                    "pid": pid,
                    "name": p_info["name"],
                    "user": p_info["user"],
                    "proto": proto,
                    "port": port_num,
                    "laddr": lip,
                    "raddr": rip,
                    "status": status
                }

                if status == "LISTEN":
                    listening.append(item)
                elif status == "ESTABLISHED":
                    established.append(item)
                else:
                    other_conns.append(item)
            except Exception:
                continue

    # Port numarasına göre sırala
    listening.sort(key=lambda x: x.get("port") or 0)
    # Aktif bağlantıları ada göre sırala
    established.sort(key=lambda x: (x.get("name") or "", x.get("port") or 0))

    return {
        "listening": listening,
        "established": established,
        "summary": {
            "total_listening": len(listening),
            "total_established": len(established),
            "total_sockets": len(listening) + len(established) + len(other_conns),
            "access_denied": access_denied
        }
    }
