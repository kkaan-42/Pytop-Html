# 🖥️ pyTOP Pro — Terminal Sistem & Süreç Monitörü

`pyTOP Pro`, Python'ın sistem kütüphanelerini (`psutil`) ve web teknolojilerini (HTML/CSS/JS) kullanarak **Linux'un `btop++` ve `htop` araçlarının web üzerinde çalışan profesyonel sürümüdür.**

Hem **Linux**, hem **Windows**, hem de **macOS** üzerinde tam uyumlu olarak çalışır.

---

## 🐧 Linux Desteği ve Çalıştırma

Linux (Ubuntu, Debian, Arch, Fedora, Raspberry Pi veya WSL) üzerinde çalıştırmak için:

### 1. Adım: Gerekli Paketleri Yükleyin
```bash
sudo apt update
sudo apt install python3 python3-pip python3-psutil python3-flask
```
*(veya `pip install -r requirements.txt`)*

### 2. Adım: Başlatın
Terminalde proje klasörüne gidin ve çalıştırın:
```bash
chmod +x baslat.sh
./baslat.sh
```
veya doğrudan:
```bash
python3 app.py
```
Tarayıcınızdan **`http://127.0.0.1:5000`** (veya yerel ağ IP'nizle `http://<linux-ip>:5000`) adresine girin.

---

## 🪟 Windows Üzerinde Çalıştırma

Klasördeki **`baslat.bat`** dosyasına çift tıklamanız yeterlidir.
Otomatik olarak tarayıcınız açılacaktır.

---

## 🛠️ Uygulama Çalışmıyorsa / Olası Sorunlar ve Çözümleri

1. **Port 5000 Meşgul Uyarısı:**
   - Yeni güncellemede `app.py`, eğer 5000 portu meşgulse çökmez; otomatik olarak sıradaki boş portu (5001, 5002...) seçer ve konsolda adresi bildirir.
2. **Kütüphane Eksikliği:**
   - Terminalde `pip install -r requirements.txt` komutunu çalıştırarak `flask` ve `psutil` paketlerinin kurulu olduğundan emin olun.
3. **Linux İzinleri:**
   - Bazı sistem süreçlerinin detaylarını ve bellek dökümünü görmek için Linux'ta `sudo python3 app.py` olarak çalıştırabilirsiniz.
