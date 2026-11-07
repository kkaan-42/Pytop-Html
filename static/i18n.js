// pyTOP Pro — arayüz dili (Türkçe / English)
// Dil, bilgisayarın diline göre otomatik seçilir (Türkçe sistemde Türkçe, diğerlerinde İngilizce).
// Kullanıcı üst çubuktaki "Dil" menüsünden Otomatik / Türkçe / English seçebilir (localStorage: pytop_lang).
// Arayüz Türkçe yazılmıştır; İngilizcede sayfadaki metinler ve sonradan eklenen/güncellenen metinler
// aşağıdaki sözlük ve kalıplarla çevrilir. alert/confirm mesajları da çevrilir.
(function () {
    'use strict';

    const STORE_KEY = 'pytop_lang';
    const SUPPORTED = ['tr', 'en'];

    function readPreference() {
        try {
            const value = localStorage.getItem(STORE_KEY);
            return SUPPORTED.includes(value) ? value : 'auto';
        } catch {
            return 'auto';
        }
    }

    function detectSystemLanguage() {
        const list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
        for (const item of list) {
            const code = String(item || '').toLowerCase().slice(0, 2);
            if (SUPPORTED.includes(code)) return code;
        }
        return 'en';
    }

    const preference = readPreference();
    const lang = preference === 'auto' ? detectSystemLanguage() : preference;
    document.documentElement.lang = lang;

    function bindSelector() {
        const select = document.getElementById('lang-select');
        if (!select || select.dataset.bound) return;
        select.dataset.bound = '1';
        select.value = preference;
        select.addEventListener('change', () => {
            try { localStorage.setItem(STORE_KEY, select.value); } catch { /* yalnızca bu oturum */ }
            location.reload();
        });
    }

    const api = { lang, preference, system: detectSystemLanguage(), t: (s) => s };
    window.pytopI18n = api;

    if (lang === 'tr') {
        document.addEventListener('DOMContentLoaded', bindSelector);
        return;
    }

    // ------------------------------------------------------------------ sözlük
    const PAIRS = [
        // Genel
        ['pyTOP Pro • Sistem Genel Bakışı', 'pyTOP Pro • System Overview'],
        ['Ana gezinme', 'Main navigation'],
        ['ÇALIŞMA ALANI', 'WORKSPACE'],
        ['Genel bakış', 'Overview'],
        ['Sistem haritası', 'System map'],
        ['İşlemler', 'Processes'],
        ['Ağ', 'Network'],
        ['Raporlar', 'Reports'],
        ['Sunucu', 'Server'],
        ['Ayarlar', 'Settings'],
        ['Bağlı', 'Connected'],
        ['Sistem durumu', 'System status'],
        ['Dil', 'Language'],
        ['DİL:', 'LANGUAGE:'],
        ['Otomatik', 'Automatic'],
        ['Arayüz dili', 'Interface language'],
        ['Grafit Gri', 'Graphite Gray'],
        ['Rahat görünüm', 'Comfortable view'],
        ['Kompakt görünüm', 'Compact view'],
        ['Kart yoğunluğunu değiştir', 'Change card density'],
        ['CANLI', 'LIVE'],
        ['Kapat', 'Close'],
        ['Yenile', 'Refresh'],
        ['🔄 Yenile', '🔄 Refresh'],
        ['Kopyala', 'Copy'],
        ['📋 Kopyala', '📋 Copy'],
        ['Kopyalandı', 'Copied'],
        ['✓ Kopyalandı!', '✓ Copied!'],
        ['Kopyalanamadı', 'Copy failed'],
        ['Yükleniyor…', 'Loading…'],
        ['Yükleniyor', 'Loading'],
        ['Hata', 'Error'],
        ['Aç', 'Open'],
        ['Sil', 'Delete'],
        ['Bağlan', 'Connect'],
        ['Tümü', 'All'],
        ['Filtre', 'Filter'],
        ['Durum', 'Status'],
        ['Sürüm', 'Version'],
        ['Yok', 'None'],
        ['Boş', 'Free'],
        ['Daha sonra', 'Later'],
        ['Yeniden başlat', 'Restart'],

        // Üst çubuk
        ['Bilgisayar Donanım & Sistem Bilgileri (F10)', 'Computer Hardware & System Info (F10)'],
        ['Docker Konteyner Yöneticisi (F12)', 'Docker Container Manager (F12)'],
        ['Canlı Ağ Bağlantıları & Açık Portlar (F6)', 'Live Network Connections & Open Ports (F6)'],
        ['Sistem Sağlık Raporu (F7)', 'System Health Report (F7)'],
        ['GitHub Releases sürüm kontrolü', 'GitHub Releases version check'],
        ['Discord / Telegram Uyarı Ayarları (F8)', 'Discord / Telegram Alert Settings (F8)'],
        ['Panel Düzenini & Görünümünü Özelleştir (L)', 'Customize Panel Layout & Appearance (L)'],
        ['Tam Ekran (F11)', 'Full Screen (F11)'],

        // Giriş ve özet kartları
        ['Gösterge paneli özeti', 'Dashboard summary'],
        ['SİSTEM DURUMU · CANLI', 'SYSTEM STATUS · LIVE'],
        ['Sistem genel bakışı', 'System overview'],
        ['Kaynak kullanımı ve etkin işlemler, tek bir görünümde.', 'Resource usage and active processes, in a single view.'],
        ['Anlık kaynak özeti', 'Live resource summary'],
        ['Bellek', 'Memory'],
        ['Toplam kullanım', 'Total usage'],
        ['RAM kullanımı', 'RAM usage'],
        ['Donanım telemetrisi', 'Hardware telemetry'],
        ['İndirme hızı', 'Download speed'],
        ['UYARI: Donanım eşik değeri aşıldı!', 'WARNING: Hardware threshold exceeded!'],

        // Donanım panelleri
        ['Sürükleyip Bırakarak Yer Değiştirin', 'Drag and drop to rearrange'],
        ['Daralt / Genişlet', 'Collapse / Expand'],
        ['Paneli Gizle', 'Hide panel'],
        ['Standart GPU / Sensör Yok', 'Standard GPU / No sensor'],
        ['Sensör verisi okunamadı', 'Sensor data unavailable'],
        ['VRAM kullanımı bu donanımda ölçülemiyor', 'VRAM usage cannot be measured on this hardware'],
        ['TELEMETRİ YOK', 'NO TELEMETRY'],
        ['Fişe Takılı', 'Plugged in'],
        ['Dolu / Fişe Takılı', 'Full / Plugged in'],
        ['Pilde Çalışıyor', 'On battery'],
        ['Sanal Bellek / Swap:', 'Virtual memory / Swap:'],
        ['Avail:', 'Avail:'],
        ['Yerel IP (LAN):', 'Local IP (LAN):'],
        ['Detaylı Donanım Özellikleri (F10)', 'Detailed Hardware Specs (F10)'],
        ['Kernel / Build:', 'Kernel / Build:'],
        ['Son Başlatma:', 'Last boot:'],
        ['Aktif Kullanıcı:', 'Active user:'],
        ['Çalışma Süresi:', 'Uptime:'],
        ['Python Çekirdeği:', 'Python runtime:'],
        ['Hesaplanıyor...', 'Calculating...'],

        // Süreç tablosu
        ['Type to filter process or PID... (\'/\' to focus)', 'Type to filter process or PID... (\'/\' to focus)'],
        ['Süreçler taranıyor...', 'Scanning processes...'],
        ['Filtre kriterine uygun süreç bulunamadı.', 'No processes match the filter.'],
        ['Seçili Süreç', 'Selected process'],
        ['Önce tablodan bir süreç seçmelisiniz (Ok tuşları veya tıklayarak).', 'Select a process in the table first (arrow keys or click).'],
        ['SONLANDIRMA (SIGTERM)', 'TERMINATE (SIGTERM)'],
        ['ZORLA KAPATMA (SIGKILL)', 'FORCE KILL (SIGKILL)'],
        ['Süreç bilgisi alınamadı', 'Could not load process details'],
        ['Süreç artık mevcut değil.', 'The process no longer exists.'],
        ['Bu sürecin detaylarını görmek için yönetici / root yetkisi gerekir.', 'Administrator / root privileges are required to view this process.'],
        ['İşlemi sonlandırmak için confirm=true gerekli.', 'confirm=true is required to end the process.'],
        ['Sistem süreci veya pyTOP Pro\'nun kendisi sonlandırılamaz.', 'System processes and pyTOP Pro itself cannot be ended.'],
        ['Süreç zaten kapanmış veya bulunamadı.', 'The process has already exited or was not found.'],
        ['Erişim engellendi. Bu süreci sonlandırmak için Yönetici (Windows Admin) veya root (Linux/macOS sudo) yetkisi gerekir.', 'Access denied. Administrator (Windows) or root (Linux/macOS sudo) privileges are required to end this process.'],
        ['Bilinmeyen hata', 'Unknown error'],

        // Alt F-tuşları ve yardım
        ['pyTOP Pro — Klavye Kısayolları ve Rehber', 'pyTOP Pro — Keyboard Shortcuts & Guide'],
        ['pyTOP Pro, doğrudan işletim sistemi çekirdeğinden gerçek donanım, GPU ve süreç verilerini toplayan canlı bir terminal sistem monitörüdür.', 'pyTOP Pro is a live terminal-style system monitor that reads real hardware, GPU and process data directly from the operating system.'],
        ['Arama / Filtreleme kutusuna odaklanır.', 'Focuses the search / filter box.'],
        ['Aramayı temizler, denetleyiciyi veya pencereleri kapatır.', 'Clears the search and closes the inspector or dialogs.'],
        ['Canlı veri akışını dondurur (PAUSE) / devam ettirir (LIVE).', 'Pauses (PAUSE) / resumes (LIVE) the live data stream.'],
        ['Süreç tablosunda satırlar arasında gezinir.', 'Moves between rows in the process table.'],
        ['Seçili sürecin detaylarını (Process Inspector) açar.', 'Opens the selected process details (Process Inspector).'],
        ['İşlemci (CPU) kullanımına göre sıralar.', 'Sorts by processor (CPU) usage.'],
        ['Bellek (RAM) kullanımına göre sıralar.', 'Sorts by memory (RAM) usage.'],
        ['Panel Düzeni & Görünüm Ayarları penceresini açar.', 'Opens the Panel Layout & Appearance settings.'],
        ['Canlı Ağ Bağlantıları ve Açık Portlar penceresini açar.', 'Opens Live Network Connections and Open Ports.'],
        ['Sistem Sağlık Raporu penceresini açar (PDF & JSON).', 'Opens the System Health Report (PDF & JSON).'],
        ['Discord / Telegram uyarı ayarları penceresini açar.', 'Opens Discord / Telegram alert settings.'],
        ['Bilgisayar Donanım & Sistem Bilgileri penceresini açar.', 'Opens Computer Hardware & System Info.'],
        ['Tam ekran moduna geçer.', 'Switches to full screen.'],
        ['Docker & Konteyner Yöneticisi penceresini açar.', 'Opens the Docker & Container Manager.'],

        // Uyarı ayarları
        ['🔔 Akıllı Uyarı & Webhook Bildirimleri', '🔔 Smart Alerts & Webhook Notifications'],
        ['Donanım eşikleri aşıldığında Discord veya Telegram\'a anlık mesaj atar.', 'Sends an instant message to Discord or Telegram when hardware thresholds are exceeded.'],
        ['Otomatik Eşik Bildirimlerini Aktif Et', 'Enable automatic threshold notifications'],
        ['Bildirim Kanalı:', 'Notification channel:'],
        ['CPU Eşiği (%):', 'CPU threshold (%):'],
        ['RAM Eşiği (%):', 'RAM threshold (%):'],
        ['Disk Eşiği (%):', 'Disk threshold (%):'],
        ['GPU Sıcaklık (°C):', 'GPU temperature (°C):'],
        ['Tekrar Uyarı Bekleme Süresi (Cooldown - Dakika):', 'Repeat alert cooldown (minutes):'],
        ['Spam engellemek için aynı uyarı bu süre dolmadan tekrar gönderilmez.', 'To prevent spam, the same alert is not re-sent before this period ends.'],
        ['Webhook ve bot sırları uygulama içinden saklanmaz. Sunucuyu başlatan ortamda', 'Webhook and bot secrets are not stored in the app. In the environment that starts the server, set'],
        ['ve', 'and'],
        ['değişkenlerini ayarlayın.', '.'],
        ['Discord Webhook URL:', 'Discord Webhook URL:'],
        ['PYTOP_DISCORD_WEBHOOK ile ayarlanır', 'Set with PYTOP_DISCORD_WEBHOOK'],
        ['PYTOP_TELEGRAM_BOT_TOKEN ile ayarlanır', 'Set with PYTOP_TELEGRAM_BOT_TOKEN'],
        ['PYTOP_TELEGRAM_CHAT_ID ile ayarlanır', 'Set with PYTOP_TELEGRAM_CHAT_ID'],
        ['Test Bildirimi Gönder', 'Send test notification'],
        ['Ayarları Kaydet', 'Save settings'],
        ['Kaydediliyor...', 'Saving...'],
        ['Ayarlar kaydedildi.', 'Settings saved.'],
        ['Ayarlar kaydedilemedi.', 'Settings could not be saved.'],
        ['Uyarı ayarları alınamadı.', 'Could not load alert settings.'],
        ['hazır', 'ready'],
        ['ayarlı değil', 'not set'],

        // Rapor
        ['📄 Sistem Sağlık & Teşhis Raporu', '📄 System Health & Diagnostics Report'],
        ['Sistem donanım, bellek ve süreç analizi yapılıyor.', 'Analyzing system hardware, memory and processes.'],
        ['Donanım, bellek ve süreç yükü hesaplanıyor...', 'Calculating hardware, memory and process load...'],
        ['Analiz Ediliyor...', 'Analyzing...'],
        ['🖨️ Raporu Aç & PDF Olarak Kaydet', '🖨️ Open report & save as PDF'],
        ['👁️ Raporu Yeni Sekmede İncele', '👁️ View report in a new tab'],
        ['💾 Ham Raporu İndir (JSON)', '💾 Download raw report (JSON)'],
        ['📄 Tam Performans Raporunu Görüntüle', '📄 View full performance report'],
        ['Mükemmel (Sağlıklı)', 'Excellent (Healthy)'],
        ['İyi (Hafif Yük)', 'Good (Light load)'],
        ['Dikkat (Yüksek Yük)', 'Attention (High load)'],
        ['Kritik (Müdahale Gerekli)', 'Critical (Action needed)'],
        ['Herhangi bir donanım darboğazı tespit edilmedi.', 'No hardware bottlenecks detected.'],

        // Ağ bağlantıları
        ['🌐 Canlı Ağ Bağlantıları & Açık Port Dedektörü', '🌐 Live Network Connections & Open Port Detector'],
        ['🔌 Açık Portlar (LISTEN):', '🔌 Open ports (LISTEN):'],
        ['🚀 Aktif Bağlantılar (ESTABLISHED):', '🚀 Active connections (ESTABLISHED):'],
        ['🔌 Açık Portlar (', '🔌 Open ports ('],
        ['🚀 Aktif Bağlantılar (', '🚀 Active connections ('],
        ['Port, süreç adı veya IP ara...', 'Search port, process name or IP...'],
        ['Bağlantıları Yenile', 'Refresh connections'],
        ['Port Eşleşmeleri', 'Port matches'],
        ['Protokol', 'Protocol'],
        ['Süreç Adı', 'Process name'],
        ['Yerel Adres', 'Local address'],
        ['Yerel Soket', 'Local socket'],
        ['Uzak Adres (Hedef)', 'Remote address (target)'],
        ['Kullanıcı', 'User'],
        ['Eylem', 'Action'],
        ['Detay', 'Details'],
        ['Süreç Detayı', 'Process details'],
        ['[Detay]', '[Details]'],
        ['[Loglar]', '[Logs]'],
        ['API Hatası', 'API error'],
        ['Süreçler alınamadı', 'Could not load processes'],
        ['Eşleşen açık port bulunamadı.', 'No matching open ports.'],
        ['Eşleşen aktif bağlantı bulunamadı.', 'No matching active connections.'],
        ['💡 Bir sürecin detaylarını incelemek için sağdaki', '💡 To inspect a process, click the'],
        ['butonuna tıklayabilirsiniz.', 'button on the right.'],

        // Donanım bilgileri
        ['💻 BİLGİSAYAR DONANIM ÖZELLİKLERİ', '💻 COMPUTER HARDWARE SPECIFICATIONS'],
        ['🏷️ Cihaz & Anakart', '🏷️ Device & Motherboard'],
        ['Üretici:', 'Manufacturer:'],
        ['Bilgisayar Adı:', 'Computer name:'],
        ['BIOS Sürümü:', 'BIOS version:'],
        ['⚡ İşlemci (CPU)', '⚡ Processor (CPU)'],
        ['Çekirdekler:', 'Cores:'],
        ['Mimari:', 'Architecture:'],
        ['🎮 Grafik & Ekran Kartı', '🎮 Graphics & Display adapter'],
        ['Kart Sayısı:', 'Card count:'],
        ['Grafik Birimi:', 'Graphics unit:'],
        ['💾 Bellek & Disk', '💾 Memory & Disk'],
        ['🖥️ İşletim Sistemi & Çekirdek', '🖥️ Operating System & Kernel'],
        ['Dağıtım:', 'Distribution:'],
        ['🌐 Ağ & Ortam', '🌐 Network & Environment'],
        ['🔄 Bilgileri Yenile', '🔄 Refresh info'],
        ['Sistem bilgileri alınamadı:', 'Could not load system info:'],

        // Docker
        ['🐳 DOCKER & KONTEYNER YÖNETİCİSİ', '🐳 DOCKER & CONTAINER MANAGER'],
        ['Canlı Konteyner Durumu & Kaynak Tüketimi', 'Live container status & resource usage'],
        ['ÇALIŞAN (RUNNING)', 'RUNNING'],
        ['DURAKLATILAN (PAUSED)', 'PAUSED'],
        ['DOCKER SÜRÜMÜ', 'DOCKER VERSION'],
        ['Konteyner adı, imaj veya ID ile ara...', 'Search by container name, image or ID...'],
        ['Konteynerleri Yenile', 'Refresh containers'],
        ['Konteyner Adı', 'Container name'],
        ['İmaj', 'Image'],
        ['Docker Daemon Çalışmıyor:', 'Docker daemon is not running:'],
        ['Sistemde Docker servisine veya Docker Desktop soketine bağlanılamadı.', 'Could not connect to the Docker service or Docker Desktop socket.'],
        ['Docker servisi veya Docker Desktop soketine bağlanılamadı.', 'Could not connect to the Docker service or Docker Desktop socket.'],
        ['Docker servisi çalışmıyor. Lütfen Docker Desktop veya Docker Daemon başlatın.', 'Docker is not running. Please start Docker Desktop or the Docker daemon.'],
        ['Henüz oluşturulmuş bir konteyner bulunmuyor.', 'No containers have been created yet.'],
        ['Aramanızla eşleşen konteyner bulunamadı.', 'No containers match your search.'],
        ['Bağlantı Kesildi • Daemon Kapalı', 'Disconnected • Daemon stopped'],
        ['💡 Konteynerleri tek tıkla', '💡 With one click you can'],
        ['Başlatabilir', 'start'],
        ['Durdurabilir', 'stop'],
        ['veya son konsol çıktılarını', 'containers, or follow their recent console output with the'],
        ['butonu ile izleyebilirsiniz.', 'button.'],
        ['▶ Başlat', '▶ Start'],
        ['⏹ Durdur', '⏹ Stop'],
        ['🔄 Yeniden Başlat', '🔄 Restart'],
        ['📜 Loglar', '📜 Logs'],
        ['Loglar', 'Logs'],
        ['📜 KONTEYNER LOGLARI', '📜 CONTAINER LOGS'],
        ['Son 150 konsol çıktısı (stdout / stderr):', 'Last 150 console lines (stdout / stderr):'],
        ['Loglar yükleniyor...', 'Loading logs...'],
        ['(Boş log)', '(Empty log)'],
        ['Docker kurulu değil.', 'Docker is not installed.'],
        ['Geçersiz konteyner kimliği (ID).', 'Invalid container ID.'],
        ['Sistemde Docker komut satırı aracı (CLI) bulunamadı. Lütfen Docker veya Docker Desktop kurun.', 'The Docker command-line tool (CLI) was not found. Please install Docker or Docker Desktop.'],
        ['Docker daemon yanıt vermiyor (Zaman aşımı).', 'The Docker daemon is not responding (timeout).'],
        ['🔄 Yeniden Dene', '🔄 Try again'],

        // Düzen ve ayarlar penceresi
        ['⚙ AYARLAR & GÖRÜNÜM', '⚙ SETTINGS & APPEARANCE'],
        ['Uygulama sürümü ve panel tercihleri', 'App version and panel preferences'],
        ['Uygulama sürümü', 'App version'],
        ['PYTOP PRO SÜRÜMÜ', 'PYTOP PRO VERSION'],
        ['Kurulu uygulama sürümü', 'Installed app version'],
        ['UZAK PYTOP SERVER', 'REMOTE PYTOP SERVER'],
        ['Sunucu profili ekleyin; Bağlan ile paneli bu pencerede açın. Token sunucunun giriş ekranında istenir.', 'Add a server profile; Connect opens its dashboard in this window. The token is requested on the server\'s sign-in screen.'],
        ['Sunucu adı', 'Server name'],
        ['Sunucu profili adı', 'Server profile name'],
        ['pyTOP Server adresi', 'pyTOP Server address'],
        ['https://pytop.example.com veya http://192.168.1.20:5000', 'https://pytop.example.com or http://192.168.1.20:5000'],
        ['Profili kaydet', 'Save profile'],
        ['Kayıtlı sunucular', 'Saved servers'],
        ['Yalnızca güvendiğiniz LAN/VPN sunucularına bağlanın.', 'Only connect to LAN/VPN servers you trust.'],
        ['Sunucu profili kaydedildi.', 'Server profile saved.'],
        ['Panelleri fare ile', 'You can reorder panels by'],
        ['sürükleyip bırakarak', 'dragging and dropping'],
        ['sıralayabilir veya aşağıdaki anahtarlarla görünürlüklerini açıp kapatabilirsiniz. Tüm tercihleriniz tarayıcınızda otomatik saklanır.', 'them with the mouse, or toggle their visibility with the switches below. All preferences are saved automatically in your browser.'],
        ['GÖRÜNÜR PANELLER', 'VISIBLE PANELS'],
        ['İşlemci Matrisi (CPU)', 'Processor matrix (CPU)'],
        ['Çekirdek yükleri, frekans ve CPU süreleri', 'Core loads, frequency and CPU times'],
        ['GPU & Batarya / Güç', 'GPU & Battery / Power'],
        ['Ekran kartı, VRAM ve pil durumu', 'Graphics card, VRAM and battery status'],
        ['Bellek & Depolama (RAM / Disk)', 'Memory & Storage (RAM / Disk)'],
        ['RAM, Swap, Disk doluluğu ve I/O hızları', 'RAM, swap, disk usage and I/O speeds'],
        ['Ağ Trafiği & Sparkline Grafiği', 'Network traffic & sparkline chart'],
        ['Canlı download/upload ve mini aktivite grafiği', 'Live download/upload and mini activity chart'],
        ['Host & Donanım Bilgileri', 'Host & Hardware info'],
        ['Cihaz modeli, işlemci, IP adresi ve kullanıcı', 'Device model, processor, IP address and user'],
        ['🔄 Varsayılan Düzene Sıfırla', '🔄 Reset to default layout'],

        // Güncelleme
        ['Yeni güncelleme geldi', 'A new update is available'],
        ['Yeni bir pyTOP Pro sürümü hazır.', 'A new pyTOP Pro version is ready.'],
        ['Güncellemeyi indirip uygulamayı yeniden başlatabilirsiniz.', 'You can download the update and restart the app.'],
        ['Güncellemeyi indir', 'Download update'],
        ['Güncelleme indiriliyor…', 'Downloading update…'],
        ['İndiriliyor…', 'Downloading…'],
        ['Güncelleme indirilemedi.', 'The update could not be downloaded.'],
        ['İndirme tamamlandı. Kurulumu bitirmek için yeniden başlatın.', 'Download complete. Restart to finish installing.'],
        ['Sürüm kontrolü yapılamadı.', 'Version check failed.'],
        ['GitHub Releases sayfası açılsın mı?', 'Open the GitHub Releases page?'],
        ['PYTOP_GITHUB_REPOSITORY owner/repo biçiminde olmalı.', 'PYTOP_GITHUB_REPOSITORY must be in owner/repo format.'],

        // Sistem haritası
        ['SİSTEM HARİTASI ·', 'SYSTEM MAP ·'],
        ['DURAKLATILDI', 'PAUSED'],
        ['Canlı sistem haritası', 'Live system map'],
        ['Donanım, ağ, Docker ve işlemler arasındaki ilişki tek bir görünümde. Bir düğüme tıklayıp ayrıntısını açın.', 'How hardware, network, Docker and processes connect, in one view. Click a node to see its details.'],
        ['Harita denetimleri', 'Map controls'],
        ['Donanım', 'Hardware'],
        ['Duraklat', 'Pause'],
        ['Devam et', 'Resume'],
        ['Yakınlaştırma', 'Zoom'],
        ['Uzaklaştır', 'Zoom out'],
        ['Yakınlaştır', 'Zoom in'],
        ['Ekrana sığdır', 'Fit to screen'],
        ['Sistem topolojisi', 'System topology'],
        ['Topoloji', 'Topology'],
        ['Bu makine · çevrimiçi', 'This machine · online'],
        ['Normal · %60 altı', 'Normal · below 60%'],
        ['Yüksek · %60–85', 'High · 60–85%'],
        ['Kritik · %85 üstü', 'Critical · above 85%'],
        ['Veri akışı (G/Ç)', 'Data flow (I/O)'],
        ['Kalın çizgi = seçili düğümün yolu', 'Thick line = path to the selected node'],
        ['Seçili düğüm ayrıntısı', 'Selected node details'],
        ['SEÇİLİ DÜĞÜM', 'SELECTED NODE'],
        ['Son ölçümlerin geçmişi', 'Recent measurement history'],
        ['son 40 ölçüm', 'last 40 samples'],
        ['şimdi', 'now'],
        ['En çok CPU kullananlar', 'Top CPU consumers'],
        ['En çok bellek kullananlar', 'Top memory consumers'],
        ['İşlemlerde aç', 'Open in Processes'],
        ['Uyarı kuralı ekle', 'Add alert rule'],
        ['Bağlantıları aç', 'Open connections'],
        ['Docker yöneticisini aç', 'Open Docker manager'],
        ['Donanım bilgisi', 'Hardware info'],
        ['Sağlık raporu', 'Health report'],
        ['Veri bekleniyor…', 'Waiting for data…'],
        ['Normal', 'Normal'],
        ['Yüksek', 'High'],
        ['Kritik', 'Critical'],
        ['Veri yok', 'No data'],
        ['Yüksek yük', 'High load'],
        ['Kritik yük', 'Critical load'],
        ['Dikkat', 'Attention'],
        ['Kapalı', 'Off'],
        ['Çevrimiçi', 'Online'],
        ['Şarjda', 'Charging'],
        ['Pilde', 'On battery'],
        ['AC güç', 'AC power'],
        ['Batarya', 'Battery'],
        ['Batarya algılanmadı', 'No battery detected'],
        ['Masaüstü / batarya yok', 'Desktop / no battery'],
        ['Sensör yok', 'No sensor'],
        ['Telemetri yok', 'No telemetry'],
        ['Telemetri okunamadı', 'Telemetry unavailable'],
        ['GPU sensörü bulunamadı', 'No GPU sensor found'],
        ['Frekans', 'Frequency'],
        ['Sıcaklık', 'Temperature'],
        ['Kullanıcı / sistem', 'User / system'],
        ['Bağlı işlemler', 'Linked processes'],
        ['Kullanılan', 'Used'],
        ['Takas', 'Swap'],
        ['Toplam', 'Total'],
        ['Model', 'Model'],
        ['VRAM %', 'VRAM %'],
        ['Okuma', 'Read'],
        ['Yazma', 'Write'],
        ['Boş alan', 'Free space'],
        ['Sürücü', 'Drive'],
        ['İndirme', 'Download'],
        ['Yükleme', 'Upload'],
        ['Toplam alınan', 'Total received'],
        ['Toplam gönderilen', 'Total sent'],
        ['MB/s · indirme / yükleme', 'MB/s · download / upload'],
        ['Durum alınıyor', 'Fetching status'],
        ['Çalışan', 'Running'],
        ['Durmuş', 'Stopped'],
        ['Duraklatılmış', 'Paused'],
        ['Daemon', 'Daemon'],
        ['Çalışıyor', 'Running'],
        ['Çalışmıyor', 'Not running'],
        ['Kurulu değil', 'Not installed'],
        ['Erişilemiyor', 'Unreachable'],
        ['Konteynerler', 'Containers'],
        ['çalışan işlem', 'running processes'],
        ['Toplam işlem', 'Total processes'],
        ['Çalışma süresi', 'Uptime'],
        ['Uyarılar', 'Alerts'],
        ['Etkin uyarılar', 'Active alerts'],
        ['Şarj', 'Charge'],
        ['Güç', 'Power'],
        ['Pil', 'Battery'],
        ['Fişe takılı', 'Plugged in'],

        // Sunucu bölümü
        ['PYTOP SERVER', 'PYTOP SERVER'],
        ['Bu makineyi ağdan izlenebilir hale getirin, uzaktaki pyTOP Server\'lara bağlanın veya bir Linux sunucusuna kurun.', 'Make this machine monitorable over the network, connect to remote pyTOP Servers, or install on a Linux server.'],
        ['Bu makine', 'This machine'],
        ['Denetleniyor…', 'Checking…'],
        ['Dinleme adresi', 'Listening address'],
        ['Erişim tokeni', 'Access token'],
        ['Çalışma şekli', 'Run mode'],
        ['İşletim sistemi', 'Operating system'],
        ['Ağdan bağlantı adresleri', 'Network addresses to connect from'],
        ['Bilgi alınamadı', 'Unavailable'],
        ['Sunucu bilgisi okunamadı.', 'Could not read server info.'],
        ['Ayarlı', 'Set'],
        ['Ayarlı değil', 'Not set'],
        ['systemd servisi', 'systemd service'],
        ['Uygulama içi', 'In-app'],
        ['Uzak erişim açık', 'Remote access on'],
        ['Yalnızca yerel', 'Local only'],
        ['Ağ adresi bulunamadı.', 'No network address found.'],
        ['Diğer cihazlar bu adreslerden bağlanıp erişim tokeniyle giriş yapabilir.', 'Other devices can connect at these addresses and sign in with the access token.'],
        ['Uzak erişim açık ama geçerli bir token yok; uzak bağlantılar reddedilir. PYTOP_REMOTE_TOKEN en az 24 karakter olmalı.', 'Remote access is on but there is no valid token, so remote connections are refused. PYTOP_REMOTE_TOKEN must be at least 24 characters.'],
        ['Bu makine şu an yalnızca kendi üzerinden izlenebilir. Ağdan erişim için uygulamayı PYTOP_BIND=0.0.0.0 ve en az 24 karakterlik PYTOP_REMOTE_TOKEN ile başlatın ya da Linux için aşağıdaki kurulumu kullanın.', 'This machine can currently only be monitored locally. For network access, start the app with PYTOP_BIND=0.0.0.0 and a PYTOP_REMOTE_TOKEN of at least 24 characters, or use the Linux installation below.'],
        ['Ev sunucusu', 'Home server'],
        ['Adres', 'Address'],
        ['Henüz kayıtlı sunucu yok.', 'No saved servers yet.'],
        ['Profil silindi.', 'Profile deleted.'],
        ['Token, bağlandığınızda sunucunun giriş ekranında istenir. Yalnızca güvendiğiniz LAN/VPN sunucularına bağlanın.', 'The token is requested on the server\'s sign-in screen when you connect. Only connect to LAN/VPN servers you trust.'],
        ['Sunucu profilleri pyTOP Pro masaüstü uygulamasında kullanılabilir. Tarayıcıdan bağlanmak için sunucu adresini doğrudan açın.', 'Server profiles are available in the pyTOP Pro desktop app. To connect from a browser, open the server address directly.'],
        ['Linux sunucusuna kur', 'Install on a Linux server'],
        ['Depoyu sunucuya indirin', 'Download the repository to the server'],
        ['Komutu kopyala', 'Copy command'],
        ['Servisi kurun ve başlatın', 'Install and start the service'],
        ['Python sanal ortamını kurar,', 'Sets up a Python virtual environment, enables the'],
        ['servisini etkinleştirir ve rastgele bir erişim tokeni üretir.', 'service and generates a random access token.'],
        ['Erişim tokenini görüntüleyin', 'View the access token'],
        ['Bağlanın', 'Connect'],
        ['bölümüne', 'add'],
        ['adresini ekleyip', 'to'],
        ['\'ı seçin ve tokeni girin. Günlükler:', ', then enter the token. Logs:'],
        ['Sunucuyu internete doğrudan açmayın; 5000 numaralı portu güvenlik duvarında yalnızca kendi ağınıza izin verecek şekilde sınırlayın.', 'Do not expose the server directly to the internet; restrict port 5000 in your firewall to your own network.'],
        ['http://SUNUCU_IP:5000', 'http://SERVER_IP:5000'],

        // Uzak oturum açma sayfası
        ['pyTOP Pro · Uzak oturum', 'pyTOP Pro · Remote sign-in'],
        ['pyTOP PRO / UZAK ERİŞİM', 'pyTOP PRO / REMOTE ACCESS'],
        ['Oturum aç', 'Sign in'],
        ['Sunucuda uzak erişim anahtarı ayarlı değil. Güvenli erişim için sunucuyu', 'No remote access key is set on the server. For secure access, restart the server with'],
        ['ile yeniden başlatın.', '.'],
        ['pyTOP Pro yönetim paneline erişmek için sunucu yöneticisinin verdiği anahtarı girin.', 'Enter the key provided by the server administrator to access the pyTOP Pro dashboard.'],
        ['Uzak erişim anahtarı', 'Remote access key'],
        ['Giriş yap', 'Sign in'],
        ['Anahtar doğrulanamadı veya uzak erişim sunucuda etkin değil.', 'The key could not be verified, or remote access is not enabled on the server.'],
        ['Uzak oturum açma gerekli.', 'Remote sign-in required.'],

        // Masaüstü uygulaması (Electron) hata mesajları
        ['Profil adı ve adres gerekli.', 'A profile name and address are required.'],
        ['Sunucu adresi geçersiz.', 'The server address is invalid.'],
        ['Profil adı ve geçerli http(s) adresi girin.', 'Enter a profile name and a valid http(s) address.'],
        ['Geçerli bir sunucu adresi girin.', 'Enter a valid server address.'],
        ['Sunucu adresi https:// veya http:// ile başlamalı.', 'The server address must start with https:// or http://.'],
        ['Adres yalnızca http(s) sunucu adresi olabilir; kullanıcı bilgisi veya ek parametre içeremez.', 'The address must be a plain http(s) server address without credentials or extra parameters.']
    ];
    const DICT = new Map(PAIRS.map(([tr, en]) => [tr, en]));

    // Değişken içeren metinler: [düzenli ifade, değiştirme]
    const T = (s) => translate(s) ?? s;
    const PATTERNS = [
        [/^(\d+) düğüm · (canlı|duraklatıldı)$/, (m, n, st) => `${n} nodes · ${st === 'canlı' ? 'live' : 'paused'}`],
        [/^Discord: (hazır|ayarlı değil) · Telegram: (hazır|ayarlı değil)$/, (m, a, b) => `Discord: ${T(a)} · Telegram: ${T(b)}`],
        [/^(.*) · genel IP$/, '$1 · public IP'],
        [/^(\d+) Fiziksel \/ (\d+) Mantıksal$/, '$1 physical / $2 logical'],
        [/^(\d+) mantıksal işlemci$/, '$1 logical processors'],
        [/^Sistem Diski \((.+)\):$/, 'System disk ($1):'],
        [/^(.+) · (\d+) mantıksal çekirdek$/, '$1 · $2 logical cores'],
        [/^(.+) GB \((.+) GB Boş\)$/, '$1 GB ($2 GB free)'],
        [/^(.*) • (\d+) Süreç$/, '$1 • $2 processes'],
        [/^([▲▼]) (.+) puan · son (\d+) örnek$/, '$1 $2 pts · last $3 samples'],
        [/^%([\d.,]+) dolu$/, '$1% full'],
        [/^(.+) MB sistemle paylaşılan bellek · GPU kullanımı ayrı ölçülemiyor$/, '$1 MB shared with system memory · GPU usage cannot be measured separately'],
        [/^(CPU|Bellek|GPU|Disk|Ağ|Docker|İşlemler|Batarya|.+): (.+), (Normal|Yüksek|Kritik|Veri yok|Dikkat|Kapalı|Yok|Şarjda|Pilde|Çevrimiçi)$/, (m, a, b, c) => `${T(a)}: ${T(b)}, ${T(c)}`],
        [/^(.+) geçmişi: son (\d+) örnek, şu an (.+)$/, (m, a, n, v) => `${T(a)} history: last ${n} samples, now ${v}`],
        [/^(.+) \(PID: (\d+)\) için (.+) işlemi onaylansın mı\?$/, (m, a, p, act) => `Confirm ${T(act)} for ${a} (PID: ${p})?`],
        [/^(.+) \(PID: (\d+)\) zorla sonlandırıldı \(SIGKILL\)\.$/, '$1 (PID: $2) was force-killed (SIGKILL).'],
        [/^(.+) \(PID: (\d+)\) başarıyla kapatıldı \(SIGTERM\)\.$/, '$1 (PID: $2) was terminated (SIGTERM).'],
        [/^(.+) profilini sil$/, 'Delete profile $1'],
        [/^(.+) sunucusuna bağlan$/, 'Connect to $1'],
        [/^(.+) sunucusuna bağlanılıyor…$/, 'Connecting to $1…'],
        [/^(.+) adresini kopyala$/, 'Copy $1'],
        [/^(Docker Aktif|Docker Engine .+) • (\d+) Çalışan Konteyner$/, (m, a, n) => `${a === 'Docker Aktif' ? 'Docker active' : a} • ${n} running containers`],
        [/^Güncelsiniz \((.+)\)\.$/, 'You\'re up to date ($1).'],
        [/^Yeni sürüm bulundu: (.+)$/, 'New version found: $1'],
        [/^Konteyner: (.+)$/, 'Container: $1'],
        [/^PID: (\d+) — Hata$/, 'PID: $1 — Error'],
        [/^PID: (\d+) — Yükleniyor\.\.\.$/, 'PID: $1 — Loading...'],
        [/^çalışma (.+)$/, 'uptime $1'],
        [/^(.+) GHz · (\d+) iş parçacığı$/, '$1 GHz · $2 threads'],
        [/^(\d+) iş parçacığı$/, '$1 threads'],
        [/^konteyner · (\d+) durdu$/, 'containers · $1 stopped'],
        [/^konteyner$/, 'containers'],
        [/^Docker (çalışıyor|çalışmıyor|kurulu değil)$/, (m, s) => `Docker ${({ 'çalışıyor': 'running', 'çalışmıyor': 'not running', 'kurulu değil': 'not installed' })[s]}`],
        [/^(.+) · takas (.+)$/, '$1 · swap $2'],
        [/^([\d.,]+)% \((.+)\)$/, (m, p, s) => `${p}% (${T(s)})`],
        [/^(.+) \((\d+)s (\d+)d kaldı\)$/, (m, s, h, mi) => `${T(s)} (${h}h ${mi}m left)`],
        [/^CPU Kullanımı: %([\d.]+) \(Eşik: %([\d.]+)\)$/, 'CPU usage: $1% (threshold: $2%)'],
        [/^RAM Doluluğu: %([\d.]+) \(Eşik: %([\d.]+)\)$/, 'RAM usage: $1% (threshold: $2%)'],
        [/^Disk Doluluğu: %([\d.]+) \(Eşik: %([\d.]+)\)$/, 'Disk usage: $1% (threshold: $2%)'],
        [/^GPU Sıcaklığı \((.+)\): (.+)°C \(Eşik: (.+)°C\)$/, 'GPU temperature ($1): $2°C (threshold: $3°C)'],
        [/^DİKKAT: (.*)$/s, (m, rest) => `WARNING: ${rest.split('  |  ').map(T).join('  |  ')}`],
        [/^İşlemci yükü aşırı yüksek \(%(.+)\)\. En çok yük bindiren süreç: (.+) \(PID: (.+)\)$/, 'CPU load is very high ($1%). Heaviest process: $2 (PID: $3)'],
        [/^İşlemci yükü normalin üzerinde \(%(.+)\)\.$/, 'CPU load is above normal ($1%).'],
        [/^İşlemci yükü sağlıklı \(%(.+)\)\.$/, 'CPU load is healthy ($1%).'],
        [/^RAM doluluk oranı kritik seviyede \(%(.+)\)\. Sistem takas alanına \(Swap\) başvurabilir\.$/, 'RAM usage is critical ($1%). The system may start using swap.'],
        [/^RAM kullanımı yüksek \(%(.+)\)\. Kullanılabilir bellek: (.+) GB\.$/, 'RAM usage is high ($1%). Available memory: $2 GB.'],
        [/^Bellek kullanımı ideal seviyede \(%(.+)\)\. Kullanılabilir: (.+) GB\.$/, 'Memory usage is healthy ($1%). Available: $2 GB.'],
        [/^Sürücü (.+) dolmak üzere \(%(.+) dolu\)\. En az (.+) GB boş alan kaldı, temizlik önerilir\.$/, 'Drive $1 is almost full ($2% used). Only $3 GB free; cleanup recommended.'],
        [/^Sürücü (.+) doluluğu dikkat çekici \(%(.+) dolu\)\.$/, 'Drive $1 usage is notable ($2% used).'],
        [/^Ekran kartı \((.+)\) sıcaklığı yüksek \((.+)°C\)\. Havalandırma ve fan hızını kontrol edin\.$/, 'Graphics card ($1) temperature is high ($2°C). Check airflow and fan speed.'],
        [/^Takas alanı \(Swap\) yoğun kullanılıyor \(%(.+)\)\. Fiziksel RAM yetersiz kalıyor olabilir\.$/, 'Swap is heavily used ($1%). Physical RAM may be insufficient.'],
        [/^Konteyner \((.+)\) '(.+)' komutu ile başarıyla tetiklendi\.$/, 'Container ($1) \'$2\' command ran successfully.'],
        [/^'(.+)' komutu zaman aşımına uğradı \(10s\)\.$/, '\'$1\' command timed out (10s).'],
        [/^Docker servisi \/ Docker Desktop çalışmıyor\. \((.*)\)$/s, 'Docker service / Docker Desktop is not running. ($1)'],
        [/^GitHub Release bilgisi alınamadı \(HTTP (\d+)\)\.$/, 'Could not load GitHub Release info (HTTP $1).']
    ];

    // Önek + değişken metin: önek çevrilir, kalan kısım ayrıca çevrilmeye çalışılır.
    const PREFIXES = [
        ['Hata: ', 'Error: '],
        ['Test başarısız: ', 'Test failed: '],
        ['İşlem Başarısız: ', 'Operation failed: '],
        ['İşlem başarısız: ', 'Operation failed: '],
        ['Güncelleme kontrolü başarısız: ', 'Update check failed: '],
        ['Sürüm kontrolü başarısız: ', 'Version check failed: '],
        ['Loglar alınamadı: ', 'Could not load logs: '],
        ['Ağ bağlantıları alınamadı:', 'Could not load network connections:'],
        ['Docker verisi alınamadı:', 'Could not load Docker data:'],
        ['Sistem bilgileri alınamadı:', 'Could not load system info:'],
        ['Uyarı ayarları okunamadı:', 'Could not read alert settings:'],
        ['Gönderim hatası: ', 'Delivery error: '],
        ['HTTP Hatası: ', 'HTTP error: '],
        ['Sunucu yanıtı: ', 'Server response: '],
        ['Konteynerler listelenirken hata oluştu: ', 'Error while listing containers: '],
        ['Geçersiz eylem: ', 'Invalid action: '],
        ['Hata kodu: ', 'Error code: ']
    ];

    // Electron IPC hataları "Error invoking remote method '...': Error: <mesaj>" biçiminde gelir.
    const IPC_ERROR = /^(Error invoking remote method '[^']+': (?:Error: )?)(.+)$/s;

    function translate(input) {
        if (input == null) return null;
        const raw = String(input);
        if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(raw)) return null;
        const norm = raw.replace(/\s+/g, ' ').trim();
        if (!norm) return null;

        const exact = DICT.get(norm);
        if (exact !== undefined) return exact;

        const ipc = IPC_ERROR.exec(norm);
        if (ipc) return T(ipc[2]);

        for (const [re, rep] of PATTERNS) {
            if (re.test(norm)) return norm.replace(re, rep);
        }
        for (const [tr, en] of PREFIXES) {
            if (norm.startsWith(tr)) return en + T(norm.slice(tr.length));
        }
        return null;
    }

    function translateMessage(msg) {
        const text = String(msg ?? '');
        const whole = translate(text);
        if (whole !== null) return whole;
        if (!text.includes('\n')) return text;
        return text.split('\n').map((line) => (line.trim() ? T(line) : line)).join('\n');
    }

    api.t = (s) => translateMessage(s);

    // ------------------------------------------------------------- DOM çevirisi
    const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
    const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

    function translateTextNode(node) {
        const parent = node.parentNode;
        if (!parent || SKIP.has(parent.nodeName) || (parent.closest && parent.closest('[translate="no"]'))) return;
        const value = node.nodeValue;
        const out = translate(value);
        if (out === null || out === value.trim()) return;
        const lead = value.match(/^\s*/)[0];
        const trail = value.match(/\s*$/)[0];
        const next = lead + out + trail;
        if (next !== value) node.nodeValue = next;
    }

    function translateAttrs(el) {
        for (const name of ATTRS) {
            const value = el.getAttribute(name);
            if (!value) continue;
            const out = translate(value);
            if (out !== null && out !== value) el.setAttribute(name, out);
        }
    }

    function walk(root) {
        if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (SKIP.has(root.nodeName)) return;
        translateAttrs(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
            else translateAttrs(node);
            node = walker.nextNode();
        }
    }

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'characterData') translateTextNode(m.target);
            else if (m.type === 'attributes') translateAttrs(m.target);
            else m.addedNodes.forEach(walk);
        }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

    function translateTitle() {
        const out = translate(document.title);
        if (out !== null && out !== document.title) document.title = out;
    }

    document.addEventListener('DOMContentLoaded', () => {
        translateTitle();
        walk(document.body);
        bindSelector();
    });

    // ------------------------------------------------------- tarayıcı pencereleri
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const nativePrompt = window.prompt.bind(window);
    window.alert = (msg) => nativeAlert(translateMessage(msg));
    window.confirm = (msg) => nativeConfirm(translateMessage(msg));
    window.prompt = (msg, def) => nativePrompt(translateMessage(msg), def);
})();
