# 🖥️ pyTOP Pro v2.3.0 — Windows & Linux Masaüstü Sistem Monitörü

<div align="center">

![Version](https://img.shields.io/badge/Version-v2.3.0-4f9f83?style=for-the-badge)
![Status](https://img.shields.io/badge/Edition-Windows%20%26%20Linux%20Desktop-4f9f83?style=for-the-badge)
![Python Version](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/Desktop-Windows%20%7C%20Linux-blue?style=for-the-badge&logo=linux&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Linux'un efsanevi `btop++` ve `htop` araçlarının web üzerinde çalışan, ultra hafif ve modern sürümü.**  
*Windows ve yaygın x86_64 Linux dağıtımlarında masaüstü uygulaması olarak çalışır; Python kurulumu gerekmez.*

[Yenilikler](#-v21-beta-sürümü-yenilikleri) • [İndir (Releases)](#-işletim-sistemine-özel-indirme-paketleri-releases) • [Özellikler](#-öne-çıkan-özellikler) • [Platform Desteği](#-desteklenen-dağıtımlar-ve-sistemler) • [Kurulum](#-hızlı-kurulum-ve-çalıştırma) • [Kısayollar](#-klavye-kısayolları-tablosu) • [Docker](#-docker--docker-compose-ile-çalıştırma)

</div>

> [!IMPORTANT]
> 🚀 **pyTOP Pro v2.3.0 — Windows & Linux Masaüstü Sürümü**
> Electron penceresinde çalışan yerel sistem monitörü. Kurulum paketleri Python gerektirmez.

---

## 📥 İşletim Sistemine Özel İndirme Paketleri (Releases)

pyTOP Pro masaüstü paketlerini [GitHub Releases sayfasından](https://github.com/kkaan-42/Pytop-Html/releases/tag/v2.3.0) indirin:

| İşletim Sistemi | Paket | Release indirme adı | Kurulum |
| :--- | :--- | :--- | :--- |
| **🪟 Windows 10 / 11 x64** | NSIS kurulum `.exe` | `pyTOP-Pro-Setup-2.3.0.exe` | Kurulum sihirbazını çalıştırın. |
| **🐧 Linux x86_64** | AppImage | `pyTOP-Pro-2.3.0-Linux-x86_64.AppImage` | `chmod +x pyTOP-Pro-2.3.0-Linux-x86_64.AppImage` çalıştırıp açın; FUSE 2 gerekebilir. |
| **🐧 Debian / Ubuntu x86_64** | `.deb` | `pyTOP-Pro-2.3.0-Linux-amd64.deb` | Paketi yazılım yükleyicinizle açın veya `sudo apt install ./pyTOP-Pro-2.3.0-Linux-amd64.deb` çalıştırın. |

> [!TIP]
> AppImage, Ubuntu, Debian, Linux Mint, Fedora ve Arch gibi x86_64 dağıtımlarını hedefler. Debian paketi Debian ve Ubuntu tabanlı dağıtımlar içindir. AppImage sürümü otomatik güncellenir; `.deb` paketini dağıtımınızın paket yöneticisiyle güncelleyin.

---

## 🚀 v2.1-beta Sürümü Yenilikleri

Bu sürümle birlikte pyTOP Pro'ya eklenen önemli özellikler:
* 🎛️ **Özelleştirilebilir Sürükle-Bırak Panel Düzeni (<kbd>L</kbd>):** CPU, GPU, RAM/Disk, Ağ ve Host panellerini fare ile tutarak istediğiniz sıraya sürükleyin, tek tıkla gövdelerini daraltın (`—`) veya gizleyin. Tüm tercihleriniz tarayıcınızda (`localStorage`) otomatik saklanır.
* ✨ **Yeni Nesil Siber & Cam Tasarım (Glassmorphism & Cyber Tech UI):** Yarı saydam cam efektli paneller, siber ızgara arka planı, canlı neon gradyan ilerleme çubukları, pulsing durum rozetleri ve modern mikro-etkileşimler.
* 🐳 **Canlı Docker & Konteyner Yöneticisi (<kbd>F12</kbd>):** Konteynerlerin anlık CPU/RAM tüketimi, durumları, web üzerinden Start/Stop/Restart yönetimi ve son 150 satırlık canlı log çıktısı.
* 💻 **Bilgisayar Donanım & Sistem Bilgileri Bölmesi (<kbd>F10</kbd>):** Cihaz üreticisi, model adı, BIOS sürümü, tam işlemci ticari adı ve yerel ağ IP adresi.
* 🌐 **Canlı Ağ Bağlantıları & Port Dedektörü (<kbd>F6</kbd>):** Dinlenen açık TCP/UDP portları (`LISTEN`) ve aktif dış bağlantılar (`ESTABLISHED`).
* ⚡ **Önbellek & Performans Optimizasyonları:** HTTP No-Cache başlıkları, dinamik cache buster ve anında yenilenen arayüz mimarisi.


---

## 📖 Proje Hakkında

`pyTOP Pro`, modern web teknolojileri (HTML5, CSS Glassmorphism, Vanilla JavaScript) ile Python'ın donanım seviyesi sistem kütüphanelerini (`psutil`, `sysfs`, `nvidia-smi`) birleştiren **yeni nesil bir sistem ve süreç izleme platformudur**.

Geleneksel terminal monitörlerinin aksine:
* Ağdaki herhangi bir cihazdan (telefon, tablet veya başka bir bilgisayar) **tarayıcı üzerinden** uzaktan izlenebilir.
* **X11 veya grafik arayüz (GUI) gerektirmez**; SSH veya VPS / Dedicated sunucularda "headless" modda arka planda kusursuz çalışır.
* Akıllı bildirim motoru sayesinde sistem aşırı yüklendiğinde **Discord ve Telegram kanallarınıza canlı uyarı mesajları gönderir**.

---

## ✨ Öne Çıkan Özellikler

### 1. ⚡ İşlemci (CPU) & Bellek (RAM / Swap) Matrisi
* **Çekirdek Başına Canlı Yük:** Mantıksal ve fiziksel tüm çekirdeklerin anlık yüzdeleri renkli çubuklarla gösterilir.
* **Frekans & Donanım Modeli:** Anlık CPU çalışma frekansı (MHz/GHz) ve işlemci tam model ismi.
* **Sıcaklık Sensörleri:** Destekleyen Linux/macOS sistemlerde çekirdek sıcaklıkları (`°C`) ve kritik eşik takibi.
* **RAM & Takas Alanı:** Aktif kullanılan, serbest bırakılabilir (buffers/cache) ve Swap detayları.

### 2. 🎮 Gelişmiş GPU & VRAM Takibi
* **NVIDIA Ekran Kartları:** `nvidia-smi` üzerinden GPU çekirdek yükü (`%`), sıcaklık (`°C`), kullanılan ve toplam VRAM (`MB/GB`).
* **Apple Silicon (M1 / M2 / M3 / M4):** Apple Tümleşik Bellek (Unified Memory) mimarisi ve SoC grafik birimi tespiti.
* **Linux AMD Radeon & Intel Iris/Arc:** Linux DRM sysfs (`/sys/class/drm`) üzerinden çekirdek yükü ve VRAM okuma.

### 3. 🔋 Laptop Batarya & Güç Yönetimi
* Anlık şarj yüzdesi, priz adaptör bağlantı durumu ve kalan tahmini pil süresi.

### 4. 🌐 Disk I/O & Canlı Ağ Trafiği
* Sistemdeki tüm bağlı sürücülerin doluluk oranları (`GB / TB`).
* Canlı saniyelik indirme (Download) ve yükleme (Upload) hızları (`KB/s`, `MB/s`).
* Ağ trafiğini görselleştiren **Canlı Sparkline Mini Hız Grafiği**.

### 5. 🔍 Derinlemesine Süreç Yöneticisi (Process Inspector)
* **Canlı Arama & Filtreleme:** Süreç adı veya PID ile anında filtreleme (`F3` veya `/`).
* **Akıllı Sıralama:** CPU (`F4`), Bellek (`F5`), PID veya Ada göre tek tıkla sıralama.
* **Süreç Detay Kartı (Modal):** Süreç sahibi (User), thread sayısı, nice/öncelik seviyesi, bellek detayı ve başlangıç saati.
* **Güvenli & Zorla Sonlandırma:** Tek tuşla kibar kapatma (`SIGTERM`) veya zorla öldürme (`SIGKILL` - `F9`).

### 6. 🔔 Akıllı Eşik Uyarıları & Discord / Telegram Webhook
* CPU, RAM, Disk doluluğu veya GPU sıcaklığı belirlediğiniz eşiği aştığında otomatik alarm üretir.
* **Discord Webhook:** Renkli gömülü (Embed) alarm kartları iletir.
* **Telegram Bot:** Telegram grubunuza veya özel sohbetinize anında bildirim gönderir.
* **Spam Koruması (Cooldown):** Aynı alarm belirlenen süre boyunca (örn: 15 dakika) tekrarlanmaz.
* **Canlı Arayüz Şeridi:** Eşik aşımı olduğunda tarayıcı üstünde kırmızı yanıp sönen şerit belirir.

### 7. 📄 Tek Tıkla Sistem Sağlık & Performans Raporu (PDF & JSON)
* **Otomatik Teşhis & Sağlık Skoru (0-100):** Donanım yükü, bellek baskısı, disk doluluğu ve süreçler analiz edilerek anlık bir sistem puanı (örn: `98/100 Mükemmel`) üretilir.
* **Yazdırılabilir / PDF Kaydetme:** `@media print` uyumlu şık rapor sayfası (`/report`) üzerinden tek tıkla A4 formatında PDF olarak kaydedilebilir veya doğrudan yazdırılabilir.
* **Ham JSON Dışa Aktarma:** Sistem envanteri, donanım metrikleri ve en çok kaynak tüketen ilk süreçler tek tıkla indirilebilir `.json` dosyası olarak arşivlenebilir.
* **Hızlı Erişim:** Üst bardaki `[REPORT]` butonu veya <kbd>F7</kbd> kısayolu ile hızlı rapor önizleme penceresi açılır.

### 8. 🌐 Canlı Ağ Bağlantıları & Açık Port Dedektörü (`netstat` / `ss`)
* **Dinlenen Portlar (LISTEN):** Sunucunuzda dışarıya veya yerel ağa açık tüm TCP/UDP portları, hangi PID ve hangi servis (örn: `nginx`, `sshd`, `docker`, `python`) tarafından dinlendiği anında listelenir.
* **Aktif Bağlantılar (ESTABLISHED):** Sisteme bağlı olan istemciler, dış sunucular ve uzak IP/port çiftleri canlı takip edilir.
* **Hızlı Port Arama & Süreç Entegrasyonu:** Port numarası, IP, protokol veya servis adına göre anında filtreleme; tek tıkla ilgili sürecin detay kartına (Process Inspector) geçiş imkanı.
* **Hızlı Erişim:** Üst bardaki `[🌐 PORTS]` butonu veya <kbd>F6</kbd> kısayolu ile anında açılır.

### 9. 💻 Bilgisayar & Donanım Bilgileri Bölmesi (Host & Specs)
* **Özel Donanım Bölmesi (Dashboard):** Bilgisayarın üreticisi, model adı, tam işlemci ismi, ekran kartı, işletim sistemi dağıtımı, yerel IP ve oturum açan kullanıcı ana ekranda bağımsız bir donanım kartı olarak sunulur.
* **Detaylı Sistem Özellikleri Modalı (<kbd>F10</kbd>):** Anakart üreticisi, model adı, BIOS sürümü, CPU çekirdekleri (fiziksel/mantıksal), mimari (x86_64 / ARM64), maksimum frekans, toplam RAM, Swap ve disk kapasitesi tek ekranda incelenebilir.
* **Hızlı Erişim:** Üst bardaki `[💻 SYSTEM]` butonu veya <kbd>F10</kbd> kısayolu ile anında açılır.

### 10. 🐳 Canlı Docker & Konteyner Yöneticisi
* **Konteyner Durumu & Envanteri:** Çalışan (`RUNNING`), durdurulmuş (`EXITED`) veya duraklatılmış (`PAUSED`) tüm Docker ve Podman konteynerlerini anında listeler.
* **Canlı Kaynak Tüketimi:** Konteyner bazında anlık CPU (%) ve bellek (RAM MB) kullanımını gösterir.
* **Tek Tıkla Konteyner Yönetimi:** Konteynerleri doğrudan web arayüzünden Başlatma (`Start`), Durdurma (`Stop`) ve Yeniden Başlatma (`Restart`) imkanı.
* **Canlı Log İzleyici:** Konteynerin son 150 satırlık konsol çıktılarını (`stdout`/`stderr`) terminal görünümünde izleme ve panoya kopyalama.
* **Hızlı Erişim:** Üst bardaki `[🐳 DOCKER]` butonu veya <kbd>F12</kbd> kısayolu ile anında açılır.

### 11. 🎨 4 Farklı Terminal Teması
* **Btop Dark (Varsayılan):** Modern neon mor/camgöbeği cam estetiği.
* **Htop Classic:** Geleneksel Linux terminal yeşili/mavisi.
* **Monokai Pro:** Kodlayıcılar için amber ve sıcak kontrast.
* **Matrix Cyberpunk:** Fütüristik terminal yeşili ve koyu siyah.




---

## 🐧 Desteklenen Dağıtımlar ve Sistemler

pyTOP Pro, test edilmiş ve aşağıdaki platformlarda yerel olarak desteklenmektedir:

| Kategori | Desteklenen Dağıtım / İşletim Sistemi | Paket Yöneticisi |
| :--- | :--- | :--- |
| **Debian Ailesi** | Debian 11+, Ubuntu 22.04+, Linux Mint ve Ubuntu tabanlı dağıtımlar | `.deb` veya AppImage |
| **Arch Ailesi** | Arch Linux, Manjaro, EndeavourOS ve x86_64 türevleri | AppImage |
| **Red Hat Ailesi** | Fedora, Rocky Linux, AlmaLinux ve x86_64 türevleri | AppImage |
| **SUSE Ailesi** | openSUSE Leap / Tumbleweed x86_64 | AppImage |
| **Yerel kaynak çalıştırma** | Linux, macOS ve Windows (Python ortamı gerekir) | `baslat.sh` / `baslat.bat` |
| **Konteyner** | Docker ve Docker Compose destekleyen sistemler | `docker` |

---

## 🚀 Hızlı Kurulum ve Çalıştırma

### Yöntem A: Evrensel Başlatıcı ile (Önerilen)

Evrensel başlatıcı betik (`baslat.sh`), işletim sisteminizi ve paket yöneticinizi otomatik olarak tespit eder; sanal ortamı (`.venv`) yapılandırır ve tarayıcınızı otomatik açar.

```bash
# Depoyu klonlayın
git clone https://github.com/kkaan-42/Pytop-Html.git
cd Pytop-Html

# Çalıştırma izni verin ve başlatın
chmod +x baslat.sh
./baslat.sh
```

---

### Yöntem B: Dağıtıma Özel Manuel Kurulum

Sistem paket yöneticinizle doğrudan kurmak isterseniz:

#### 1. Ubuntu, Debian, Linux Mint, Pop!_OS & Raspberry Pi
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv python3-flask python3-psutil

python3 app.py
```

#### 2. Arch Linux, Manjaro & EndeavourOS
```bash
sudo pacman -Syu python python-pip python-flask python-psutil

python app.py
```

#### 3. Fedora, RHEL, CentOS Stream, Rocky Linux & AlmaLinux
```bash
sudo dnf install -y python3 python3-pip python3-flask python3-psutil

python3 app.py
```

#### 4. openSUSE (Leap / Tumbleweed)
```bash
sudo zypper install -y python3 python3-pip python3-Flask python3-psutil

python3 app.py
```

#### 5. Alpine Linux (Ultra Hafif Sunucular / Docker)
```bash
apk update
apk add python3 py3-pip py3-flask py3-psutil

python3 app.py
```

#### 6. Void Linux
```bash
sudo xbps-install -S python3 python3-pip python3-flask python3-psutil

python3 app.py
```

---

### 🍏 macOS Kurulumu (Apple Silicon & Intel)

macOS üzerinde Homebrew kullanarak saniyeler içinde kurabilirsiniz:

```bash
# 1. Python kurulu değilse Homebrew ile kurun:
brew install python

# 2. Proje dizininde başlatın:
chmod +x baslat.sh
./baslat.sh
```

> [!NOTE]  
> **macOS AirPlay Port 5000 Çakışması:** macOS Monterey, Ventura ve Sonoma'da Apple'ın AirPlay Receiver servisi varsayılan olarak `5000` portunu dinler. pyTOP Pro bunu otomatik olarak algılar ve çökmek yerine kendiliğinden boş olan ilk porta (`http://127.0.0.1:5001`) geçer. Dilerseniz macOS Sistem Ayarları -> Paylaşım -> AirPlay Alıcısı'nı kapatabilirsiniz.

---

### 🪟 Windows 10 & 11 Kurulumu

1. Klasördeki **`baslat.bat`** dosyasına çift tıklayın.
2. Gerekli kütüphaneler yoksa otomatik yüklenir ve varsayılan tarayıcınızda `http://127.0.0.1:5000` açılır.

Manuel başlatmak için PowerShell / CMD:
```powershell
pip install -r requirements.txt
python app.py
```

---

## 🐳 Docker & Docker Compose ile Çalıştırma

Host makineye hiçbir bağımlılık kurmadan pyTOP Pro'yu izole çalıştırmak için:

### Tek Komutla Docker Run:
```bash
export PYTOP_REMOTE_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
docker run -d \
  --name pytop-pro \
  --restart unless-stopped \
  --pid host \
  -p 127.0.0.1:5000:5000 \
  -e PYTOP_BIND=0.0.0.0 \
  -e PYTOP_REMOTE_TOKEN="$PYTOP_REMOTE_TOKEN" \
  -e PYTOP_DATA_DIR=/data \
  -v pytop-data:/data \
  kkaan-42/pytop-html:latest
```
Docker içindeki servis uzak erişim anahtarı ister. Host portu varsayılan olarak yalnızca yerel makineye açılır.

### Docker Compose ile:
```bash
# Bir defa üretip shell ortamında tutun:
export PYTOP_REMOTE_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
# Arka planda başlatın:
docker compose up -d

# Logları takip edin:
docker compose logs -f
```

---

## ⚙️ Linux Servisi (Systemd) Olarak Çalıştırma

Sunucunuz her açıldığında pyTOP Pro'nun arka planda 7/24 çalışmasını istiyorsanız:

```bash
# 1. Projeyi sunucu dizinine taşıyın:
sudo mv Pytop-Html /opt/pytop

# 2. Servis dosyasını kopyalayın:
sudo cp /opt/pytop/pytop.service /etc/systemd/system/

# 3. Servisi aktifleştirin ve başlatın:
sudo systemctl daemon-reload
sudo systemctl enable --now pytop.service

# 4. Servis durumunu kontrol edin:
sudo systemctl status pytop.service
```

Servis varsayılan olarak yalnızca yerel bağlantılara açık kalır. Uzak kullanım için systemd unit dosyasına `PYTOP_BIND=0.0.0.0` ve güçlü bir `PYTOP_REMOTE_TOKEN` ortam değişkeni ekleyin; dış erişimi HTTPS proxy veya VPN ile koruyun.

Artık sunucunuz yeniden başlasa bile monitörünüz `http://<sunucu-ip>:5000` adresinde her an hazır olacaktır!

---

## ⌨️ Klavye Kısayolları Tablosu

pyTOP Pro, fareye ihtiyaç duymadan saf terminal hızıyla kontrol edilebilir:

| Kısayol | İşlev | Açıklama |
| :---: | :--- | :--- |
| <kbd>F1</kbd> | **Yardım Menüsü** | Kısayol kılavuzunu ve sistem bilgilerini açar / kapatır. |
| <kbd>F2</kbd> | **Tema Değiştir** | Btop Dark ➔ Htop ➔ Monokai ➔ Matrix temaları arasında geçiş yapar. |
| <kbd>F3</kbd> veya <kbd>/</kbd> | **Süreç Arama** | Anında arama çubuğuna odaklanır, filtreleme yapmanızı sağlar. |
| <kbd>F4</kbd> veya <kbd>C</kbd> | **CPU'ya Göre Sırala** | En çok işlemci tüketen süreçleri en üste taşır. |
| <kbd>F5</kbd> veya <kbd>M</kbd> | **RAM'e Göre Sırala** | En çok bellek tüketen süreçleri en üste taşır. |
| <kbd>F6</kbd> | **Canlı Ağ Bağlantıları & Portlar** | Dinlenen açık portları ve aktif dış bağlantıları (`netstat` / `ss`) listeler. |
| <kbd>F7</kbd> | **Sistem Sağlık Raporu** | Teşhis penceresini açar, PDF/JSON rapor oluşturur. |
| <kbd>F8</kbd> | **Uyarı & Webhook** | Akıllı Alarm & Discord/Telegram ayar penceresini açar. |
| <kbd>F9</kbd> | **Süreç Öldür (Kill)** | Seçili süreci `SIGKILL` ile anında sonlandırır. |
| <kbd>F10</kbd> | **Bilgisayar Donanım Özellikleri** | Cihaz modeli, anakart, BIOS, CPU, RAM ve donanım envanterini açar. |
| <kbd>F11</kbd> | **Tam Ekran** | Tarayıcıyı tam ekran terminal moduna geçirir. |
| <kbd>F12</kbd> | **Docker & Konteyner Yöneticisi** | Konteyner listesi, kaynak kullanımı, start/stop/restart ve canlı logları açar. |
| <kbd>L</kbd> | **Panel Düzeni &amp; Özelleştirme** | Dashboard widget panellerinin yerleşim ve görünüm penceresini açar. |
| <kbd>Space</kbd> | **Akışı Duraklat** | Canlı metrik akışını dondurur (`PAUSE`) veya devam ettirir (`LIVE`). |
| <kbd>↑</kbd> / <kbd>↓</kbd> | **Satır Gezinme** | Süreç listesinde yukarı/aşağı seçim yapar. |
| <kbd>Enter</kbd> | **Süreç Detayı** | Seçili sürecin derinlemesine detaylarını (Process Inspector) açar. |
| <kbd>Esc</kbd> | **Kapat / Temizle** | Açık modalları kapatır, filtrelemeyi sıfırlar. |

---

## 🔔 Akıllı Uyarılar & Webhook Kurulumu

pyTOP Pro, sunucunuz başında değilken bile donanımınızı korur.

### 🟣 Discord Webhook Kurulumu:
1. Discord sunucunuzda bildirim almak istediğiniz metin kanalının **Ayarlar ➔ Entegrasyonlar ➔ Webhook'lar** bölümüne gidin.
2. **Yeni Webhook** oluşturun ve Webhook URL'sini kopyalayın.
3. Gizli URL'yi ortam değişkeni olarak ayarlayın; Linux/macOS: `export PYTOP_DISCORD_WEBHOOK='https://discord.com/api/webhooks/...'`, PowerShell: `$env:PYTOP_DISCORD_WEBHOOK='https://discord.com/api/webhooks/...'`.
4. Uygulamayı yeniden başlatın, arayüzde <kbd>F8</kbd> ile alarmı etkinleştirip eşiği seçin ve **Test Et** butonuna basın.

### 🔵 Telegram Bot Kurulumu:
1. Telegram'da `@BotFather` ile konuşarak `/newbot` komutuyla bir bot oluşturun ve **Bot Token**'ınızı alın.
2. Botunuzu bildirim almak istediğiniz gruba ekleyin veya bota `/start` mesajı atın.
3. Chat ID'nizi öğrenmek için `@userinfobot` veya `@getidsbot` botunu kullanın.
4. Token ve Chat ID'yi `PYTOP_TELEGRAM_BOT_TOKEN` ve `PYTOP_TELEGRAM_CHAT_ID` ortam değişkenleri olarak tanımlayın. Arayüzden alarmı etkinleştirip test bildirimi gönderin.

Webhook ve bot sırları tarayıcıdan API'ye gönderilmez ve yapılandırma dosyasına yazılmaz. Eski `alerts_config.json` dosyalarındaki sırlar yeni sürüm tarafından içe aktarılmaz; yeni ortam değişkenlerini ayarladıktan sonra eski dosyanızı kendiniz güvenle kaldırın.

Örnek ortam değişkenleri `.env.example` içindedir. Uygulama bu dosyayı otomatik yüklemez; systemd, Docker Compose veya çalıştırdığınız shell'in ortamına ekleyin.

### Sürüm kontrolü

Üst araç çubuğundaki **UPDATE** düğmesi GitHub Releases içindeki son sürümü okur ve yeni sürüm varsa yayın sayfasını açar. Uygulama kendi kendine dosya indirmez veya güncelleme kurmaz. Depo farklıysa `PYTOP_GITHUB_REPOSITORY=owner/repo` tanımlayın.

---

## 🏗️ Proje Mimarisi

```
Pytop-Html/
├── app.py                 # Flask çekirdek sunucusu, donanım API uçları, port yönetimi
├── docker_monitor.py      # Çapraz platform Docker CLI / Daemon denetimi, konteyner yönetimi & log akışı
├── sys_info.py            # Çapraz platform bilgisayar üretici, model, BIOS, CPU ve donanım envanteri
├── net_monitor.py         # Çapraz platform canlı ağ bağlantıları, port tarama ve PID servis eşleştirici
├── gpu_monitor.py         # Çapraz platform GPU (NVIDIA, Apple Silicon, AMD/Intel DRM) & batarya
├── alerts.py              # Eşik kontrol motoru, cooldown yöneticisi, Discord & Telegram entegrasyonu
├── report_generator.py    # Sistem sağlık skoru motoru, donanım teşhisi ve raporlayıcı
├── database.py            # Platform kullanıcı dizininde SQLite görev/not verisi
├── updater.py             # GitHub Releases salt okunur sürüm kontrolü
├── installer_build/       # Inno Setup 6 Windows kurulum dosyası üretimi
├── baslat.sh              # Evrensel Linux (tüm dağıtımlar) & macOS başlatıcı
├── start.sh               # Kısayol başlatıcı betiği
├── baslat.bat             # Windows başlatıcı betiği
├── pytop.service          # Systemd Linux servis birimi
├── Dockerfile             # Konteyner imaj tanımı
├── docker-compose.yml     # Docker compose yapılandırması
├── requirements.txt       # Python bağımlılıkları (flask, psutil)
├── static/
│   ├── style.css          # Glassmorphism terminal temaları & animasyonlar
│   └── app.js             # Saniyelik WebSocket/polling, klavye yönetimi, süreç, port & docker motoru
└── templates/
    ├── index.html         # Terminal Dashboard arayüz şablonu (Beta Edition)
    └── report.html        # Yazdırılabilir (PDF) profesyonel sistem sağlık raporu
```

Windows ve Linux v2.3.0 Electron uygulaması `electron/` içinde yer alır. Uygulama açılışta yeni sürümü denetler; Windows ve Linux AppImage paketlerinde indirme onayından sonra güncellemeyi indirip yeniden başlatma sırasında kurar. Debian `.deb` paketleri dağıtımın paket yöneticisiyle güncellenir. Geliştirme için `cd electron; npm install` ve `npm start` komutlarını çalıştırın; Python ortamı Flask backend'ini yerelde başlatır.

Yeni bir masaüstü sürümü yayımlamak için `v2.x.x` etiketi gönderin. `.github/workflows/release-windows.yml` Windows ve Linux backend'lerini PyInstaller ile ayrı ayrı paketler; NSIS, AppImage ve Debian paketlerini tek GitHub Release'e ekler.

---

## ❓ Sıkça Sorulan Sorular (SSS)

<details>
<summary><b>1. Süreç sonlandırırken (Kill) "Erişim engellendi" hatası alıyorum, neden?</b></summary>
<br>
Root (Linux/macOS) veya Administrator (Windows) tarafından başlatılan kritik sistem süreçlerini kapatmak için çalıştırma yetkisine sahip olmanız gerekir. Linux'ta süreci yönetici olarak kapatmak için:
<code>sudo ./baslat.sh</code> veya <code>sudo python3 app.py</code> olarak çalıştırın.
</details>

<details>
<summary><b>2. Uzak sunucumda (VPS / Dedicated) web arayüzüne nasıl bağlanırım?</b></summary>
<br>
pyTOP Pro varsayılan olarak yalnızca <code>127.0.0.1</code> üzerinde dinler. Uzak erişim gerekiyorsa sunucuyu en az 24 karakterlik güçlü bir anahtarla başlatın:
<pre>PYTOP_BIND=0.0.0.0
PYTOP_REMOTE_TOKEN=&lt;uzun-rastgele-anahtar&gt;
python app.py</pre>
Panel, tarayıcıyı anahtar giriş sayfasına yönlendirir. Anahtar ve oturum çerezleri ağ üzerinden iletileceğinden, uzak sunucuya doğrudan HTTP açmak yerine HTTPS kullanan bir reverse proxy veya VPN arkasından erişin. Reverse proxy kullanırken yalnızca güvendiğiniz proxy'nin bu servise ulaşmasına izin verin; `PYTOP_TRUST_PROXY=1` seçeneğini ancak proxy `X-Forwarded-*` başlıklarını kendisi yazıp uygulama portuna doğrudan erişimi engelliyorsa etkinleştirin. HTTPS proxy arkasında güvenli çerez için `PYTOP_COOKIE_SECURE=1` ayarlayın. Güvenlik duvarında yalnızca gereken istemcilere izin verin:
<br><br>
<b>UFW (Ubuntu/Debian):</b> <code>sudo ufw allow 5000/tcp</code><br>
<b>Firewalld (Fedora/RHEL):</b> <code>sudo firewall-cmd --add-port=5000/tcp --permanent && sudo firewall-cmd --reload</code><br>
Ardından tarayıcınızdan <code>https://&lt;sunucu-adresiniz&gt;</code> adresini ziyaret edip giriş yapın. Uzak oturumlar HTTP-only, SameSite çerezi kullanır; sunucu yeniden başladığında geçersiz olur.
</details>

<details>
<summary><b>3. Debian 12 veya Ubuntu 24.04 üzerinde "externally-managed-environment (PEP 668)" uyarısı alıyorum?</b></summary>
<br>
Yeni Linux dağıtımları sistem Python paketlerini korumak için doğrudan global pip kurulumunu engeller. <code>./baslat.sh</code> betiğimiz bunu otomatik olarak algılar ve güvenli bir şekilde <code>.venv</code> sanal ortamı oluşturur. Manuel olarak sistem paketleriyle kurmak isterseniz:
<code>sudo apt install python3-flask python3-psutil</code> komutunu kullanabilirsiniz.
</details>

---

## 📄 Lisans & Katkı

Bu proje **MIT Lisansı** ile lisanslanmıştır. Her türlü katkı, hata bildirimi (Issue) ve özellik önerisi (Pull Request) memnuniyetle karşılanır!

<div align="center">
Geliştirici: <b>Kaan Öcal</b> • GitHub: <a href="https://github.com/kkaan-42">@kkaan-42</a>
</div>
