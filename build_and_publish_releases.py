"""
pyTOP Pro — Otomatik Sürüm Paketleyici & GitHub Releases Yükleyicisi
Windows, Linux ve macOS için özel açılış dosyalarıyla donatılmış ayrı paketler üretir
ve GitHub Releases'a yükler.
"""

import os
import sys
import json
import zipfile
import tarfile
import shutil
import urllib.request
import urllib.error

# Windows cp1254 konsol unicode hatasini onle
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "kkaan-42/Pytop-Html"
TAG = "v2.1-beta"
RELEASE_NAME = "pyTOP Pro v2.1-beta (Beta Sürümü) — Windows, Linux & macOS Paketleri"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

COMMON_FILES = [
    "app.py",
    "docker_monitor.py",
    "sys_info.py",
    "net_monitor.py",
    "gpu_monitor.py",
    "alerts.py",
    "report_generator.py",
    "database.py",
    "requirements.txt",
    "README.md",
    "alerts_config.json"
]

COMMON_DIRS = [
    "static",
    "templates"
]


def create_release_archives():
    """Windows, Linux ve macOS için ayrı arşiv paketleri oluşturur."""
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)

    print("==================================================")
    print(" 📦 pyTOP Pro İşletim Sistemine Özel Paketler Üretiliyor...")
    print("==================================================")

    # 1. WINDOWS PAKETİ (.zip)
    win_zip_name = f"pytop-{TAG}-windows.zip"
    win_zip_path = os.path.join(DIST_DIR, win_zip_name)
    print(f"\n[1/3] Windows paketi oluşturuluyor: {win_zip_name}")
    with zipfile.ZipFile(win_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Windows Başlatıcı
        zf.write(os.path.join(BASE_DIR, "baslat.bat"), "baslat.bat")
        
        # Ortak Dosyalar
        for f in COMMON_FILES:
            fp = os.path.join(BASE_DIR, f)
            if os.path.exists(fp):
                zf.write(fp, f)
        # Dizinler
        for d in COMMON_DIRS:
            dp = os.path.join(BASE_DIR, d)
            for root, _, files in os.walk(dp):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, BASE_DIR)
                    zf.write(full_p, rel_p)
    print(f"  ✓ Windows paketi hazır ({os.path.getsize(win_zip_path) / 1024:.1f} KB)")

    # 2. LINUX PAKETİ (.tar.gz)
    linux_tar_name = f"pytop-{TAG}-linux.tar.gz"
    linux_tar_path = os.path.join(DIST_DIR, linux_tar_name)
    print(f"\n[2/3] Linux paketi oluşturuluyor: {linux_tar_name}")
    with tarfile.open(linux_tar_path, "w:gz") as tf:
        # Linux Başlatıcılar
        for f in ["baslat.sh", "baslat_linux.sh", "start.sh", "pytop.service", "Dockerfile", "docker-compose.yml"]:
            fp = os.path.join(BASE_DIR, f)
            if os.path.exists(fp):
                ti = tf.gettarinfo(fp, arcname=f)
                if f.endswith(".sh"):
                    ti.mode = 0o755  # Çalıştırma izni
                tf.addfile(ti, open(fp, "rb"))

        # Ortak Dosyalar
        for f in COMMON_FILES:
            fp = os.path.join(BASE_DIR, f)
            if os.path.exists(fp):
                tf.add(fp, arcname=f)
        # Dizinler
        for d in COMMON_DIRS:
            dp = os.path.join(BASE_DIR, d)
            tf.add(dp, arcname=d)
    print(f"  ✓ Linux paketi hazır ({os.path.getsize(linux_tar_path) / 1024:.1f} KB)")

    # 3. MACOS PAKETİ (.zip)
    mac_zip_name = f"pytop-{TAG}-macos.zip"
    mac_zip_path = os.path.join(DIST_DIR, mac_zip_name)
    print(f"\n[3/3] macOS paketi oluşturuluyor: {mac_zip_name}")
    with zipfile.ZipFile(mac_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # macOS Başlatıcılar
        if os.path.exists(os.path.join(BASE_DIR, "baslat_mac.command")):
            zf.write(os.path.join(BASE_DIR, "baslat_mac.command"), "baslat_mac.command")
        if os.path.exists(os.path.join(BASE_DIR, "baslat.sh")):
            zf.write(os.path.join(BASE_DIR, "baslat.sh"), "baslat.sh")

        # Ortak Dosyalar
        for f in COMMON_FILES:
            fp = os.path.join(BASE_DIR, f)
            if os.path.exists(fp):
                zf.write(fp, f)
        # Dizinler
        for d in COMMON_DIRS:
            dp = os.path.join(BASE_DIR, d)
            for root, _, files in os.walk(dp):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, BASE_DIR)
                    zf.write(full_p, rel_p)
    print(f"  ✓ macOS paketi hazır ({os.path.getsize(mac_zip_path) / 1024:.1f} KB)")

    return {
        "windows": win_zip_path,
        "linux": linux_tar_path,
        "macos": mac_zip_path
    }


def publish_github_release(archives: dict):
    """GitHub REST API aracılığıyla Release oluşturur ve 3 paketi yükler."""
    print("\n==================================================")
    print(" 🚀 GitHub Releases Yayını Yapılıyor...")
    print("==================================================")

    release_body = f"""# 🚀 pyTOP Pro {TAG} (Beta Sürümü)

pyTOP Pro resmi olarak **Beta** aşamasına geçmiştir! Bu sürüm ile birlikte sisteme Canlı Docker & Konteyner Yöneticisi, HOST & SPECS Donanım Envanteri, Canlı Açık Port / Soket Dedektörü ve performans optimizasyonları eklenmiştir.

---

## 📥 İşletim Sistemine Özel İndirme Paketleri (Releases)

Her işletim sistemi için özel başlatıcı içeren ayrı paketler aşağıda listelenmiştir:

| İşletim Sistemi | İndirme Dosyası | Başlatma Yöntemi |
| :--- | :--- | :--- |
| 🪟 **Microsoft Windows** | [`pytop-{TAG}-windows.zip`](https://github.com/{REPO}/releases/download/{TAG}/pytop-{TAG}-windows.zip) | İndirin, zipten çıkarın ve **`baslat.bat`** dosyasına çift tıklayın. |
| 🐧 **Linux (Tüm Dağıtımlar)** | [`pytop-{TAG}-linux.tar.gz`](https://github.com/{REPO}/releases/download/{TAG}/pytop-{TAG}-linux.tar.gz) | `tar -xzf pytop-{TAG}-linux.tar.gz && cd pytop-* && ./baslat.sh` |
| 🍏 **Apple macOS** | [`pytop-{TAG}-macos.zip`](https://github.com/{REPO}/releases/download/{TAG}/pytop-{TAG}-macos.zip) | İndirin, zipten çıkarın ve **`baslat_mac.command`** dosyasına çift tıklayın. |

---

### ✨ v2.1-beta Yenilikleri
* 🐳 **Canlı Docker & Konteyner Yöneticisi (F12):** Konteynerlerin CPU/RAM tüketimi, durumları, Start/Stop/Restart yönetimi ve canlı 150 satırlık log akışı.
* 💻 **Bilgisayar Donanım & Sistem Bilgileri (F10):** Cihaz üreticisi, model adı, BIOS sürümü, tam işlemci adı ve yerel ağ IP adresi.
* 🌐 **Canlı Ağ Bağlantıları & Port Dedektörü (F6):** Dinlenen açık TCP/UDP portları (`LISTEN`) ve aktif dış bağlantılar (`ESTABLISHED`).
* ⚡ **Önbellek & Performans:** HTTP No-Cache başlıkları ve dinamik cache buster mekanizmaları.
"""

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "pytop-release-bot"
    }

    # 1. Mevcut release var mı kontrol et
    list_url = f"https://api.github.com/repos/{REPO}/releases"
    req = urllib.request.Request(list_url, headers=headers)
    release_id = None
    upload_url_tpl = None

    try:
        with urllib.request.urlopen(req) as resp:
            rels = json.loads(resp.read().decode("utf-8"))
            for r in rels:
                if r.get("tag_name") == TAG:
                    release_id = r.get("id")
                    upload_url_tpl = r.get("upload_url")
                    print(f"[✓] Mevcut '{TAG}' release bulundu (ID: {release_id}).")
                    break
    except Exception as e:
        print(f"[!] Release listesi sorgulanırken hata: {e}")

    # 2. Yoksa yeni release oluştur
    if not release_id:
        print(f"[+] '{TAG}' için yeni GitHub Release oluşturuluyor...")
        payload = {
            "tag_name": TAG,
            "target_commitish": "main",
            "name": RELEASE_NAME,
            "body": release_body,
            "draft": False,
            "prerelease": True  # Beta olduğu için prerelease işaretlenir
        }
        create_req = urllib.request.Request(
            list_url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(create_req) as resp:
                new_rel = json.loads(resp.read().decode("utf-8"))
                release_id = new_rel.get("id")
                upload_url_tpl = new_rel.get("upload_url")
                print(f"[✓] GitHub Release başarıyla oluşturuldu (ID: {release_id})!")
        except urllib.error.HTTPError as he:
            err_text = he.read().decode("utf-8")
            print(f"[HATA] Release oluşturulamadı: {he.code} - {err_text}")
            return False

    # 3. Arşivleri Yükle (Assets)
    upload_base = upload_url_tpl.split("{")[0]  # {?name,label} kısmını temizle
    print(f"\n[+] Paketler Release'e yükleniyor...")

    # Önce mevcut assetleri kontrol et (tekrar yüklemede çakışmasın)
    assets_url = f"https://api.github.com/repos/{REPO}/releases/{release_id}/assets"
    existing_assets = {}
    try:
        with urllib.request.urlopen(urllib.request.Request(assets_url, headers=headers)) as a_resp:
            for a in json.loads(a_resp.read().decode("utf-8")):
                existing_assets[a.get("name")] = a.get("id")
    except Exception:
        pass

    for os_name, path in archives.items():
        fname = os.path.basename(path)
        content_type = "application/gzip" if fname.endswith(".tar.gz") else "application/zip"
        
        # Eğer asset zaten varsa önce sil
        if fname in existing_assets:
            del_url = f"https://api.github.com/repos/{REPO}/releases/assets/{existing_assets[fname]}"
            del_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
            try:
                urllib.request.urlopen(del_req)
                print(f"  [-] Eski asset silindi: {fname}")
            except Exception:
                pass

        # Yükle
        print(f"  [↑] Yükleniyor: {fname} ({os.path.getsize(path) / 1024:.1f} KB)...")
        up_url = f"{upload_base}?name={fname}"
        with open(path, "rb") as af:
            file_data = af.read()

        up_headers = headers.copy()
        up_headers["Content-Type"] = content_type
        up_req = urllib.request.Request(up_url, data=file_data, headers=up_headers, method="POST")

        try:
            with urllib.request.urlopen(up_req) as up_resp:
                if up_resp.status in (200, 201):
                    print(f"  [✓] Başarıyla yüklendi: {fname}")
        except urllib.error.HTTPError as ue:
            print(f"  [!] {fname} yüklenirken hata: {ue.code} - {ue.read().decode('utf-8')}")

    print("\n==================================================")
    print(f" 🎉 Releases Başarıyla Yayınlandı!")
    print(f" 🔗 Adres: https://github.com/{REPO}/releases/tag/{TAG}")
    print("==================================================")
    return True


if __name__ == "__main__":
    archives = create_release_archives()
    publish_github_release(archives)
