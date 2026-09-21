# 🖥️ pyTOP Pro — Terminal Sistem & Süreç Monitörü

`pyTOP Pro`, Python'ın sistem kütüphanelerini (`psutil`) ve web teknolojilerini (HTML/CSS/JS) kullanarak **Linux'un `btop++` ve `htop` araçlarının web üzerinde çalışan profesyonel sürümüdür.**

Hem **Linux**, hem **Windows**, hem de **macOS** üzerinde tam uyumlu olarak çalışır.

---

## 🚀 Yeni Eklenen Özellikler

### 1. 🎮 GPU & Batarya / Güç Takibi
* **NVIDIA / AMD / Intel GPU Desteği:** Ekran kartınızın anlık sıcaklığı (`°C`), GPU çekirdek yükü (`%`) ve VRAM doluluk oranı (`Kullanılan / Toplam MB`) canlı olarak izlenir.
* **Laptop Bataryası:** Kalan şarj yüzdesi (`%`), adaptör fişe takılı mı ve tahmini kalan çalışma süresi gösterilir.

### 2. 🔔 Akıllı Eşik Uyarıları & Discord / Telegram Bildirimleri
* **Otomatik Uyarı Sistemi:** CPU, RAM, Disk doluluğu veya GPU sıcaklığı belirlediğiniz eşik değerlerini (örn: %90 CPU veya 85°C GPU) aştığında otomatik uyarı tetiklenir.
* **Webhook Entegrasyonu:**
  * **Discord Webhook:** Discord kanalınıza zengin içerikli (Embed) alarm mesajları gönderir.
  * **Telegram Bot:** Telegram sohbetinize anında Markdown uyarı mesajı iletir.
* **Spam Koruması (Cooldown):** Aynı uyarı belirlenen bekleme süresi (örn: 15 dakika) boyunca tekrar gönderilmez.
* **Arayüzde Canlı Alarm Şeridi:** Eşik aşımı olduğunda tarayıcı üstünde kırmızı yanıp sönen dikkat şeridi çıkar.

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

## ⌨️ Klavye Kısayolları

* `F1`: Yardım rehberi
* `F2`: Terminal temaları arasında geçiş (Btop, Htop, Monokai, Matrix)
* `F3` / `/`: Süreç arama ve filtreleme kutusuna odaklan
* `F4` / `C`: CPU'ya göre sırala
* `F5` / `M`: Belleğe (RAM) göre sırala
* `F8`: Akıllı Uyarı & Webhook ayarları penceresini aç
* `F9`: Seçili süreci sonlandır (Kill)
* `Space`: Canlı akışı dondur (PAUSE) / devam ettir (LIVE)
* `↑` / `↓`: Tablo satırları arasında gezin
* `Enter`: Seçili sürecin derinlemesine detaylarını (Process Inspector) aç
* `F11`: Tam ekran modu
