/**
 * pyTOP Pro — Terminal & Sistem Monitörü İstemci Mantığı
 */

// ======================================================================
// 0. Eski PWA Service Worker ve Cache Storage Kalıntılarını Temizle
// ======================================================================
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister();
        }
    }).catch(() => {});
}
if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then((names) => {
        for (const name of names) {
            caches.delete(name);
        }
    }).catch(() => {});
}

// Eski mobil buton ve modal kalıntılarını DOM'dan tamamen söküp at
function purgeLegacyMobile() {
    const btn = document.getElementById('btn-mobile-modal');
    if (btn) btn.remove();
    const modal = document.getElementById('mobile-modal');
    if (modal) modal.remove();
    document.querySelectorAll('.btn-mobile-trigger, #btn-mobile-modal, #mobile-modal').forEach((el) => el.remove());
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', purgeLegacyMobile);
} else {
    purgeLegacyMobile();
}

document.addEventListener('DOMContentLoaded', () => {


    // ======================================================================
    // 1. Durum Değişkenleri
    // ======================================================================
    let isPaused = false;
    let currentSort = 'cpu';
    let sortOrder = 'desc';
    let currentCategory = 'all';
    let refreshRate = 2000;
    let timerId = null;

    let selectedRowPid = null;
    let inspectedPid = null;
    let currentProcessList = [];

    // Ağ Geçmişi (Sparkline Grafiği İçin - Son 25 nokta)
    const netHistory = {
        rx: new Array(25).fill(0),
        tx: new Array(25).fill(0)
    };

    // ======================================================================
    // 2. DOM Elemanları
    // ======================================================================
    const themeSelect = document.getElementById('theme-select');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const liveBadge = document.getElementById('live-badge');
    const liveText = document.getElementById('live-text');

    const valUptime = document.getElementById('val-uptime');
    const valTasks = document.getElementById('val-tasks');
    const cpuTotalPct = document.getElementById('cpu-total-pct');
    const cpuFreqVal = document.getElementById('cpu-freq-val');
    const cpuUsr = document.getElementById('cpu-usr');
    const cpuSys = document.getElementById('cpu-sys');
    const cpuIdle = document.getElementById('cpu-idle');
    const coresLeft = document.getElementById('cores-left');
    const coresRight = document.getElementById('cores-right');

    const ramTextDetail = document.getElementById('ram-text-detail');
    const ramBarFill = document.getElementById('ram-bar-fill');
    const ramAvail = document.getElementById('ram-avail');
    const ramUsed = document.getElementById('ram-used');

    const swapTextDetail = document.getElementById('swap-text-detail');
    const swapBarFill = document.getElementById('swap-bar-fill');

    const diskDriveLabel = document.getElementById('disk-drive-label');
    const diskTextDetail = document.getElementById('disk-text-detail');
    const diskBarFill = document.getElementById('disk-bar-fill');
    const diskFreeVal = document.getElementById('disk-free-val');
    const diskIoVal = document.getElementById('disk-io-val');

    const netRxSpeed = document.getElementById('net-rx-speed');
    const netTxSpeed = document.getElementById('net-tx-speed');
    const netRxTotal = document.getElementById('net-rx-total');
    const netTxTotal = document.getElementById('net-tx-total');
    const netCanvas = document.getElementById('netSparkline');

    const procSearch = document.getElementById('proc-search');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const catBtns = document.querySelectorAll('.cat-btn');
    const sortKeyBtns = document.querySelectorAll('.sort-key-btn');
    const rateSelect = document.getElementById('rate-select');
    const btnPauseToggle = document.getElementById('btn-pause-toggle');
    const procTbody = document.getElementById('proc-tbody');
    const tableHeaders = document.querySelectorAll('#main-proc-table th.sortable');

    // Inspector Drawer
    const inspectorDrawer = document.getElementById('inspector-drawer');
    const btnCloseInspector = document.getElementById('btn-close-inspector');
    const inspPidName = document.getElementById('insp-pid-name');
    const inspExe = document.getElementById('insp-exe');
    const inspCmdline = document.getElementById('insp-cmdline');
    const inspCwd = document.getElementById('insp-cwd');
    const inspUser = document.getElementById('insp-user');
    const inspStatus = document.getElementById('insp-status');
    const inspThreads = document.getElementById('insp-threads');
    const inspCreated = document.getElementById('insp-created');
    const inspRss = document.getElementById('insp-rss');
    const inspVms = document.getElementById('insp-vms');
    const inspCpu = document.getElementById('insp-cpu');
    const inspConns = document.getElementById('insp-conns');
    const btnInspTerm = document.getElementById('btn-insp-term');
    const btnInspKill = document.getElementById('btn-insp-kill');

    // Help Modal
    const helpModal = document.getElementById('help-modal');
    const btnCloseHelp = document.getElementById('btn-close-help');

    // Layout Customizer Modal
    const layoutModal = document.getElementById('layout-modal');
    const btnLayoutModal = document.getElementById('btn-layout-modal');
    const btnCloseLayout = document.getElementById('btn-close-layout');
    const btnSaveLayout = document.getElementById('btn-save-layout');
    const btnResetLayout = document.getElementById('btn-reset-layout');
    const hardwareGrid = document.getElementById('main-hardware-grid');

    // ======================================================================
    // 3. Tema ve Tam Ekran Yönetimi
    // ======================================================================
    const savedTheme = localStorage.getItem('pytop_theme') || 'btop';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pytop_theme', theme);
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    // ======================================================================
    // 3.5 Sürükle-Bırak & Özelleştirilebilir Panel Düzeni (Customizable Widget Grid)
    // ======================================================================
    const DEFAULT_LAYOUT = {
        order: ['cpu', 'gpu', 'mem', 'net', 'sys'],
        collapsed: { cpu: false, gpu: false, mem: false, net: false, sys: false },
        hidden: { cpu: false, gpu: false, mem: false, net: false, sys: false }
    };

    let currentLayout = loadLayout();

    function loadLayout() {
        try {
            const raw = localStorage.getItem('pytop_dashboard_layout_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    order: Array.isArray(parsed.order) && parsed.order.length ? parsed.order : [...DEFAULT_LAYOUT.order],
                    collapsed: Object.assign({}, DEFAULT_LAYOUT.collapsed, parsed.collapsed || {}),
                    hidden: Object.assign({}, DEFAULT_LAYOUT.hidden, parsed.hidden || {})
                };
            }
        } catch (e) {}
        return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    }

    function saveLayout(layout) {
        try {
            localStorage.setItem('pytop_dashboard_layout_v1', JSON.stringify(layout));
        } catch (e) {}
    }

    function applyLayout(layout) {
        if (!hardwareGrid) return;

        // 1. Panel Sıralamasını Uygula
        layout.order.forEach(id => {
            const box = hardwareGrid.querySelector(`.hw-box[data-widget-id="${id}"]`);
            if (box) hardwareGrid.appendChild(box);
        });

        // 2. Daraltma (Collapsed) Durumlarını Uygula
        hardwareGrid.querySelectorAll('.hw-box[data-widget-id]').forEach(box => {
            const id = box.getAttribute('data-widget-id');
            const isCol = !!layout.collapsed[id];
            box.classList.toggle('collapsed', isCol);
            const btn = box.querySelector('.btn-widget-collapse');
            if (btn) btn.textContent = isCol ? '+' : '—';
        });

        // 3. Gizleme (Hidden) Durumlarını Uygula
        hardwareGrid.querySelectorAll('.hw-box[data-widget-id]').forEach(box => {
            const id = box.getAttribute('data-widget-id');
            const isHid = !!layout.hidden[id];
            box.classList.toggle('hidden-widget', isHid);
            const chk = document.getElementById(`toggle-widget-${id}`);
            if (chk) chk.checked = !isHid;
        });

        // Ağ grafiği çizimini tetikle
        if (typeof drawNetSparkline === 'function') {
            setTimeout(drawNetSparkline, 80);
        }
    }

    // HTML5 Sürükle ve Bırak (Drag & Drop) Mekanizması
    let draggedWidget = null;

    function initDragAndDrop() {
        if (!hardwareGrid) return;
        const boxes = hardwareGrid.querySelectorAll('.hw-box[data-widget-id]');

        boxes.forEach(box => {
            box.addEventListener('dragstart', (e) => {
                draggedWidget = box;
                box.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', box.getAttribute('data-widget-id'));
            });

            box.addEventListener('dragend', () => {
                box.classList.remove('dragging');
                boxes.forEach(b => b.classList.remove('drag-over'));
                // Yeni sıralamayı kaydet
                const newOrder = Array.from(hardwareGrid.querySelectorAll('.hw-box[data-widget-id]'))
                    .map(b => b.getAttribute('data-widget-id'));
                currentLayout.order = newOrder;
                saveLayout(currentLayout);
                if (typeof drawNetSparkline === 'function') drawNetSparkline();
            });

            box.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            box.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (draggedWidget && box !== draggedWidget) {
                    box.classList.add('drag-over');
                }
            });

            box.addEventListener('dragleave', () => {
                box.classList.remove('drag-over');
            });

            box.addEventListener('drop', (e) => {
                e.preventDefault();
                box.classList.remove('drag-over');
                if (draggedWidget && box !== draggedWidget) {
                    const allBoxes = Array.from(hardwareGrid.querySelectorAll('.hw-box[data-widget-id]'));
                    const fromIdx = allBoxes.indexOf(draggedWidget);
                    const toIdx = allBoxes.indexOf(box);
                    if (fromIdx < toIdx) {
                        box.after(draggedWidget);
                    } else {
                        box.before(draggedWidget);
                    }
                }
            });
        });

        // Panel Aksiyon Butonları (Daralt / Kapat)
        hardwareGrid.addEventListener('click', (e) => {
            const collapseBtn = e.target.closest('.btn-widget-collapse');
            if (collapseBtn) {
                const box = collapseBtn.closest('.hw-box');
                if (box) {
                    const id = box.getAttribute('data-widget-id');
                    box.classList.toggle('collapsed');
                    const isCol = box.classList.contains('collapsed');
                    collapseBtn.textContent = isCol ? '+' : '—';
                    currentLayout.collapsed[id] = isCol;
                    saveLayout(currentLayout);
                }
                return;
            }

            const closeBtn = e.target.closest('.btn-widget-close');
            if (closeBtn) {
                const box = closeBtn.closest('.hw-box');
                if (box) {
                    const id = box.getAttribute('data-widget-id');
                    box.classList.add('hidden-widget');
                    currentLayout.hidden[id] = true;
                    saveLayout(currentLayout);
                    const chk = document.getElementById(`toggle-widget-${id}`);
                    if (chk) chk.checked = false;
                }
                return;
            }
        });
    }

    // Layout Modalı Kontrolleri
    function openLayoutModal() {
        if (layoutModal) {
            DEFAULT_LAYOUT.order.forEach(id => {
                const chk = document.getElementById(`toggle-widget-${id}`);
                if (chk) chk.checked = !currentLayout.hidden[id];
            });
            layoutModal.classList.remove('hidden');
        }
    }

    function closeLayoutModal() {
        if (layoutModal) layoutModal.classList.add('hidden');
    }

    if (btnLayoutModal) btnLayoutModal.addEventListener('click', openLayoutModal);
    if (btnCloseLayout) btnCloseLayout.addEventListener('click', closeLayoutModal);
    if (btnSaveLayout) btnSaveLayout.addEventListener('click', closeLayoutModal);

    if (layoutModal) {
        layoutModal.addEventListener('click', (e) => {
            if (e.target === layoutModal) closeLayoutModal();
        });

        // Anahtarların (Toggle switches) değişimini dinle
        layoutModal.querySelectorAll('.switch-toggle input').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-widget');
                const isVisible = input.checked;
                currentLayout.hidden[id] = !isVisible;
                const box = hardwareGrid.querySelector(`.hw-box[data-widget-id="${id}"]`);
                if (box) box.classList.toggle('hidden-widget', !isVisible);
                saveLayout(currentLayout);
            });
        });
    }

    if (btnResetLayout) {
        btnResetLayout.addEventListener('click', () => {
            currentLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
            saveLayout(currentLayout);
            applyLayout(currentLayout);
        });
    }

    // Başlangıç Düzenini Uygula & Sürükleme Olaylarını Başlat
    applyLayout(currentLayout);
    initDragAndDrop();

    // ======================================================================
    // 4. Donanım İstatistiklerini Çekme & Render (CPU, RAM, Disk, Ağ)
    // ======================================================================
    async function fetchHardwareStats() {
        if (isPaused) return;

        try {
            const res = await fetch('/api/stats');
            if (!res.ok) throw new Error('API Hatası');
            const data = await res.json();

            // Genel Bilgiler
            valUptime.textContent = data.uptime;
            valTasks.textContent = data.tasks_total;

            // CPU
            cpuTotalPct.textContent = `${data.cpu.total.toFixed(1)}%`;
            cpuFreqVal.textContent = `${data.cpu.freq_mhz} MHz`;
            cpuUsr.textContent = `${data.cpu.user}%`;
            cpuSys.textContent = `${data.cpu.system}%`;
            cpuIdle.textContent = `${data.cpu.idle}%`;

            renderCoresMatrix(data.cpu.cores);

            // RAM
            ramTextDetail.textContent = `${data.mem.used_gb} / ${data.mem.total_gb} GB (${data.mem.percent}%)`;
            ramBarFill.style.width = `${data.mem.percent}%`;
            ramAvail.textContent = `${data.mem.free_gb} GB`;
            ramUsed.textContent = `${data.mem.used_gb} GB`;

            // SWAP
            swapTextDetail.textContent = `${data.swap.used_gb} / ${data.swap.total_gb} GB (${data.swap.percent}%)`;
            swapBarFill.style.width = `${data.swap.percent}%`;

            // DISK
            diskDriveLabel.textContent = data.disk.drive;
            diskTextDetail.textContent = `${data.disk.used_gb} / ${data.disk.total_gb} GB (${data.disk.percent}%)`;
            diskBarFill.style.width = `${data.disk.percent}%`;
            diskFreeVal.textContent = `${data.disk.free_gb} GB`;
            diskIoVal.textContent = `R: ${formatSpeed(data.disk.read_kbs)} | W: ${formatSpeed(data.disk.write_kbs)}`;

            // NETWORK
            netRxSpeed.textContent = formatSpeed(data.net.rx_kbs);
            netTxSpeed.textContent = formatSpeed(data.net.tx_kbs);
            netRxTotal.textContent = `Total: ${data.net.total_rx_mb} MB`;
            netTxTotal.textContent = `Total: ${data.net.total_tx_mb} MB`;

            // Ağ Geçmişi Ekle & Çiz
            netHistory.rx.shift();
            netHistory.rx.push(data.net.rx_kbs);
            netHistory.tx.shift();
            netHistory.tx.push(data.net.tx_kbs);
            drawNetSparkline();

            // GPU & POWER (Fikir 1)
            const gpuNameLabel = document.getElementById('gpu-name-label');
            const gpuTempBadge = document.getElementById('gpu-temp-badge');
            const gpuLoadLabel = document.getElementById('gpu-load-label');
            const vramTextDetail = document.getElementById('vram-text-detail');
            const vramBarFill = document.getElementById('vram-bar-fill');

            if (data.gpus && data.gpus.length > 0) {
                const gpu = data.gpus[0];
                gpuNameLabel.textContent = gpu.name;
                gpuTempBadge.textContent = `${gpu.temp}°C`;
                gpuLoadLabel.textContent = `${gpu.load}% LOAD`;
                vramTextDetail.textContent = `${gpu.used_mb} / ${gpu.total_mb} MB (${gpu.percent}%)`;
                vramBarFill.style.width = `${gpu.percent}%`;
            } else {
                gpuNameLabel.textContent = "Standart GPU / Sensör Yok";
                gpuTempBadge.textContent = "N/A";
                gpuLoadLabel.textContent = "-";
                vramTextDetail.textContent = "Sensör verisi okunamadı";
                vramBarFill.style.width = "0%";
            }

            // Batarya
            const batteryBlock = document.getElementById('battery-block');
            const batteryStatusText = document.getElementById('battery-status-text');
            const batteryBarFill = document.getElementById('battery-bar-fill');

            if (data.battery) {
                batteryBlock.classList.remove('hidden');
                batteryStatusText.textContent = `${data.battery.percent}% (${data.battery.status})`;
                batteryBarFill.style.width = `${data.battery.percent}%`;
            } else {
                batteryBlock.classList.add('hidden');
            }

            // Akıllı Uyarı Şeridi (Fikir 2)
            const alertBanner = document.getElementById('active-alert-banner');
            const alertBannerText = document.getElementById('alert-banner-text');
            const alertsStatusIcon = document.getElementById('alerts-status-icon');

            if (data.active_warnings && data.active_warnings.length > 0) {
                alertBanner.classList.remove('hidden');
                alertBannerText.textContent = "DİKKAT: " + data.active_warnings.join("  |  ");
            } else {
                alertBanner.classList.add('hidden');
            }

            if (alertsStatusIcon) {
                alertsStatusIcon.textContent = data.alerts_enabled ? '🔔' : '🔕';
            }

            liveText.textContent = 'LIVE';
            liveBadge.style.opacity = '1';
        } catch (err) {
            liveText.textContent = 'ERR';
            liveBadge.style.opacity = '0.5';
        }
    }

    // 16 Çekirdek Matrisi (Kompakt Blok Barlar)
    function renderCoresMatrix(cores) {
        if (!cores) return;

        let leftHtml = '';
        let rightHtml = '';

        cores.forEach((pct, i) => {
            let fillClass = 'core-fill';
            if (pct > 85) fillClass += ' crit';
            else if (pct > 65) fillClass += ' warn';

            const itemHtml = `
                <div class="core-bar-item">
                    <span class="core-id">${i}</span>
                    <div class="core-track">
                        <div class="${fillClass}" style="width: ${pct}%"></div>
                        <span class="core-pct-text">${pct.toFixed(0)}%</span>
                    </div>
                </div>
            `;

            if (i % 2 === 0) leftHtml += itemHtml;
            else rightHtml += itemHtml;
        });

        coresLeft.innerHTML = leftHtml;
        coresRight.innerHTML = rightHtml;
    }

    // Canlı Ağ Sparkline Çizimi
    function drawNetSparkline() {
        if (!netCanvas) return;
        const ctx = netCanvas.getContext('2d');
        const w = netCanvas.width = netCanvas.parentElement.clientWidth;
        const h = netCanvas.height = 55;

        ctx.clearRect(0, 0, w, h);

        const allValues = [...netHistory.rx, ...netHistory.tx];
        const maxVal = Math.max(10, ...allValues);

        // Download Çizgisi (Yeşil)
        ctx.beginPath();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        netHistory.rx.forEach((val, i) => {
            const x = (i / (netHistory.rx.length - 1)) * w;
            const y = h - (val / maxVal) * (h - 6) - 3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Upload Çizgisi (Camgöbeği)
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        netHistory.tx.forEach((val, i) => {
            const x = (i / (netHistory.tx.length - 1)) * w;
            const y = h - (val / maxVal) * (h - 6) - 3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function formatSpeed(kbs) {
        if (kbs >= 1024) {
            return `${(kbs / 1024).toFixed(1)} MB/s`;
        }
        return `${kbs.toFixed(1)} KB/s`;
    }

    // ======================================================================
    // 5. Süreç Listesini Çekme & Render
    // ======================================================================
    async function fetchProcesses() {
        if (isPaused) return;

        const filterVal = procSearch.value.trim();
        const url = `/api/processes?sort=${currentSort}&order=${sortOrder}&filter=${encodeURIComponent(filterVal)}&cat=${currentCategory}&limit=50`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Süreçler alınamadı');
            currentProcessList = await res.json();

            renderProcessTable(currentProcessList);
        } catch (err) {
            console.warn('Süreç yenileme hatası:', err);
        }
    }

    function renderProcessTable(procs) {
        if (procs.length === 0) {
            procTbody.innerHTML = '<tr><td colspan="11" class="text-center c-muted py-4">Filtre kriterine uygun süreç bulunamadı.</td></tr>';
            return;
        }

        let html = '';
        procs.forEach(p => {
            const isSelected = (selectedRowPid === p.pid);
            let statusColor = 'var(--c-muted)';
            if (p.status === 'running') statusColor = 'var(--c-green)';

            html += `
                <tr class="${isSelected ? 'row-selected' : ''}" data-pid="${p.pid}">
                    <td class="col-pid">${p.pid}</td>
                    <td class="col-user">${escapeHtml(p.user)}</td>
                    <td class="col-status" style="color: ${statusColor}">${p.status}</td>
                    <td class="col-cpu text-right">${p.cpu.toFixed(1)}%</td>
                    <td class="col-mem text-right">${p.mem.toFixed(1)}%</td>
                    <td class="col-rss text-right font-bold">${p.rss_mb}</td>
                    <td class="col-vms text-right">${p.vms_mb}</td>
                    <td class="col-thr text-center">${p.threads}</td>
                    <td class="col-time">${p.uptime}</td>
                    <td class="col-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</td>
                    <td class="col-ops text-center">
                        <div class="ops-group">
                            <button type="button" class="mini-btn btn-inspect" data-pid="${p.pid}">Inspect</button>
                            <button type="button" class="mini-btn btn-terminate" data-pid="${p.pid}" data-name="${escapeHtml(p.name)}">Kill</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        procTbody.innerHTML = html;

        // Satır Tıklama (Seçim & Çift Tıklama ile Detay Açma)
        procTbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', (e) => {
                // Buton tıklaması değilse
                if (e.target.closest('.mini-btn')) return;
                const pid = parseInt(tr.getAttribute('data-pid'));
                selectRowByPid(pid);
            });

            tr.addEventListener('dblclick', () => {
                const pid = parseInt(tr.getAttribute('data-pid'));
                openInspector(pid);
            });
        });

        // Inspect Butonları
        procTbody.querySelectorAll('.btn-inspect').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pid = parseInt(btn.getAttribute('data-pid'));
                openInspector(pid);
            });
        });

        // Terminate Butonları
        procTbody.querySelectorAll('.btn-terminate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pid = parseInt(btn.getAttribute('data-pid'));
                const name = btn.getAttribute('data-name');
                confirmAndKill(pid, name, false);
            });
        });
    }

    function selectRowByPid(pid) {
        selectedRowPid = pid;
        procTbody.querySelectorAll('tr').forEach(tr => {
            if (parseInt(tr.getAttribute('data-pid')) === pid) {
                tr.classList.add('row-selected');
                tr.scrollIntoView({ block: 'nearest' });
            } else {
                tr.classList.remove('row-selected');
            }
        });
    }

    // ======================================================================
    // 6. Process Inspector (Süreç Denetleyici Çekmecesi)
    // ======================================================================
    async function openInspector(pid) {
        inspectedPid = pid;
        inspectorDrawer.classList.remove('hidden');

        inspPidName.textContent = `PID: ${pid} — Yükleniyor...`;
        inspExe.textContent = '...';
        inspCmdline.textContent = '...';
        inspCwd.textContent = '...';

        try {
            const res = await fetch(`/api/process/${pid}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Süreç bilgisi alınamadı');
            }
            const data = await res.json();

            inspPidName.textContent = `PID: ${data.pid} — ${data.name}`;
            inspExe.textContent = data.exe;
            inspCmdline.textContent = data.cmdline;
            inspCwd.textContent = data.cwd;
            inspUser.textContent = data.user;
            inspStatus.textContent = data.status;
            inspThreads.textContent = data.threads;
            inspCreated.textContent = data.create_time;
            inspRss.textContent = `${data.rss_mb} MB`;
            inspVms.textContent = `${data.vms_mb} MB`;
            inspCpu.textContent = `${data.cpu}%`;
            inspConns.textContent = data.connections;
        } catch (err) {
            inspPidName.textContent = `PID: ${pid} — Hata`;
            inspCmdline.textContent = err.message;
        }
    }

    function closeInspector() {
        inspectorDrawer.classList.add('hidden');
        inspectedPid = null;
    }

    btnCloseInspector.addEventListener('click', closeInspector);

    btnInspTerm.addEventListener('click', () => {
        if (!inspectedPid) return;
        confirmAndKill(inspectedPid, inspPidName.textContent, false);
    });

    btnInspKill.addEventListener('click', () => {
        if (!inspectedPid) return;
        confirmAndKill(inspectedPid, inspPidName.textContent, true);
    });

    // Süreç Sonlandırma İsteği
    async function confirmAndKill(pid, name, force) {
        const actionName = force ? 'ZORLA KAPATMA (SIGKILL)' : 'SONLANDIRMA (SIGTERM)';
        const confirmed = confirm(`${name} (PID: ${pid}) için ${actionName} işlemi onaylansın mı?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/kill/${pid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            });
            const data = await res.json();
            alert(data.message);
            if (inspectedPid === pid) closeInspector();
            fetchProcesses();
        } catch (err) {
            alert('Hata: ' + err.message);
        }
    }

    // ======================================================================
    // 7. Etkileşimler (Filtre, Kategori, Sıralama, Hız, Pause)
    // ======================================================================
    // Arama Girişi
    procSearch.addEventListener('input', () => {
        if (procSearch.value.length > 0) {
            btnClearSearch.classList.remove('hidden');
        } else {
            btnClearSearch.classList.add('hidden');
        }
        fetchProcesses();
    });

    btnClearSearch.addEventListener('click', () => {
        procSearch.value = '';
        btnClearSearch.classList.add('hidden');
        procSearch.focus();
        fetchProcesses();
    });

    // Kategori Filtreleri (ALL, USER, PYTHON, BROWSERS)
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-cat');
            fetchProcesses();
        });
    });

    // Kontrol Barındaki Sıralama Butonları
    sortKeyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sortKey = btn.getAttribute('data-sort');
            setSort(sortKey);
        });
    });

    // Tablo Başlıklarına Tıklayarak Sıralama
    tableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            if (currentSort === sortKey) {
                sortOrder = (sortOrder === 'desc') ? 'asc' : 'desc';
            } else {
                currentSort = sortKey;
                sortOrder = 'desc';
            }
            updateSortUI();
            fetchProcesses();
        });
    });

    function setSort(sortKey) {
        if (currentSort === sortKey) {
            sortOrder = (sortOrder === 'desc') ? 'asc' : 'desc';
        } else {
            currentSort = sortKey;
            sortOrder = 'desc';
        }
        updateSortUI();
        fetchProcesses();
    }

    function updateSortUI() {
        sortKeyBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-sort') === currentSort);
        });

        tableHeaders.forEach(th => {
            const key = th.getAttribute('data-sort');
            if (key === currentSort) {
                th.classList.add('active-sort');
                th.textContent = th.textContent.replace(/[▲▼]/g, '').trim() + (sortOrder === 'desc' ? ' ▼' : ' ▲');
            } else {
                th.classList.remove('active-sort');
                th.textContent = th.textContent.replace(/[▲▼]/g, '').trim();
            }
        });
    }

    // Yenileme Hızı
    rateSelect.addEventListener('change', (e) => {
        refreshRate = parseInt(e.target.value, 10);
        restartLoop();
    });

    // Duraklat / Devam Et
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            btnPauseToggle.textContent = 'RESUME';
            btnPauseToggle.style.background = 'var(--c-yellow)';
            btnPauseToggle.style.color = '#000';
            liveText.textContent = 'PAUSED';
            liveBadge.style.borderColor = 'var(--c-yellow)';
            liveBadge.style.color = 'var(--c-yellow)';
        } else {
            btnPauseToggle.textContent = 'PAUSE';
            btnPauseToggle.style.background = '';
            btnPauseToggle.style.color = '';
            liveText.textContent = 'LIVE';
            liveBadge.style.borderColor = '';
            liveBadge.style.color = '';
            tick();
        }
    }

    btnPauseToggle.addEventListener('click', togglePause);

    // ======================================================================
    // 8. Klavye Kısayolları (htop Tarzı Tam Kontrol)
    // ======================================================================
    document.addEventListener('keydown', (e) => {
        // Eğer arama kutusundaysak ve Escape değilse kısayolları engelle
        if (document.activeElement === procSearch && e.key !== 'Escape') {
            return;
        }

        if (e.key === '/') {
            e.preventDefault();
            procSearch.focus();
            procSearch.select();
        } else if (e.key === 'Escape') {
            if (layoutModal && !layoutModal.classList.contains('hidden')) {
                closeLayoutModal();
            } else if (dockerLogModal && !dockerLogModal.classList.contains('hidden')) {
                closeDockerLog();
            } else if (dockerModal && !dockerModal.classList.contains('hidden')) {
                closeDockerModal();
            } else if (sysModal && !sysModal.classList.contains('hidden')) {
                closeSysModal();
            } else if (!netModal.classList.contains('hidden')) {
                closeNetModal();
            } else if (!reportModal.classList.contains('hidden')) {
                closeReportModal();
            } else if (!alertsModal.classList.contains('hidden')) {
                closeAlertsModal();
            } else if (!inspectorDrawer.classList.contains('hidden')) {
                closeInspector();
            } else if (!helpModal.classList.contains('hidden')) {
                helpModal.classList.add('hidden');
            } else if (procSearch.value) {
                procSearch.value = '';
                btnClearSearch.classList.add('hidden');
                procSearch.blur();
                fetchProcesses();
            }
        } else if (e.code === 'Space') {
            e.preventDefault();
            togglePause();
        } else if (e.key === 'c' || e.key === 'C') {
            setSort('cpu');
        } else if (e.key === 'm' || e.key === 'M') {
            setSort('mem');
        } else if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            if (layoutModal && !layoutModal.classList.contains('hidden')) {
                closeLayoutModal();
            } else {
                openLayoutModal();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateRow(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateRow(-1);
        } else if (e.key === 'Enter') {
            if (selectedRowPid) {
                openInspector(selectedRowPid);
            }
        } else if (e.key === 'F1') {
            e.preventDefault();
            helpModal.classList.remove('hidden');
        } else if (e.key === 'F2') {
            e.preventDefault();
            cycleTheme();
        } else if (e.key === 'F6') {
            e.preventDefault();
            openNetModal();
        } else if (e.key === 'F7') {
            e.preventDefault();
            openReportModal();
        } else if (e.key === 'F8') {
            e.preventDefault();
            openAlertsModal();
        } else if (e.key === 'F10') {
            e.preventDefault();
            toggleSysModal();
        } else if (e.key === 'F12') {
            e.preventDefault();
            toggleDockerModal();
        }
    });

    // Ok Tuşlarıyla Satır Gezinme
    function navigateRow(direction) {
        if (currentProcessList.length === 0) return;
        let currentIndex = currentProcessList.findIndex(p => p.pid === selectedRowPid);

        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            currentIndex += direction;
            if (currentIndex < 0) currentIndex = 0;
            if (currentIndex >= currentProcessList.length) currentIndex = currentProcessList.length - 1;
        }

        selectRowByPid(currentProcessList[currentIndex].pid);
    }

    function cycleTheme() {
        const themes = ['btop', 'htop', 'monokai', 'matrix'];
        const current = document.documentElement.getAttribute('data-theme') || 'btop';
        const nextIdx = (themes.indexOf(current) + 1) % themes.length;
        const next = themes[nextIdx];
        document.documentElement.setAttribute('data-theme', next);
        themeSelect.value = next;
        localStorage.setItem('pytop_theme', next);
    }

    // Alt F-Tuşları Tıklamaları
    document.getElementById('fk-help').addEventListener('click', () => helpModal.classList.remove('hidden'));
    document.getElementById('fk-theme').addEventListener('click', cycleTheme);
    document.getElementById('fk-search').addEventListener('click', () => procSearch.focus());
    document.getElementById('fk-sort-cpu').addEventListener('click', () => setSort('cpu'));
    document.getElementById('fk-sort-mem').addEventListener('click', () => setSort('mem'));
    document.getElementById('fk-pause').addEventListener('click', togglePause);
    document.getElementById('fk-kill').addEventListener('click', () => {
        if (selectedRowPid) {
            const proc = currentProcessList.find(p => p.pid === selectedRowPid);
            confirmAndKill(selectedRowPid, proc ? proc.name : 'Seçili Süreç', false);
        } else {
            alert('Önce tablodan bir süreç seçmelisiniz (Ok tuşları veya tıklayarak).');
        }
    });

    btnCloseHelp.addEventListener('click', () => helpModal.classList.add('hidden'));

    // ======================================================================
    // 8.1. Akıllı Uyarı & Webhook Ayarları (Fikir 2)
    // ======================================================================
    const alertsModal = document.getElementById('alerts-modal');
    const btnAlertsModal = document.getElementById('btn-alerts-modal');
    const btnCloseAlerts = document.getElementById('btn-close-alerts');
    const btnSaveAlerts = document.getElementById('btn-save-alerts');
    const btnTestAlert = document.getElementById('btn-test-alert');
    const testAlertSpin = document.getElementById('test-alert-spin');
    const chkAlertsEnabled = document.getElementById('chk-alerts-enabled');
    const radioChannels = document.querySelectorAll('input[name="alert_channel"]');
    const discordFields = document.getElementById('discord-fields');
    const telegramFields = document.getElementById('telegram-fields');
    const cfgDiscordWebhook = document.getElementById('cfg-discord-webhook');
    const cfgTelegramToken = document.getElementById('cfg-telegram-token');
    const cfgTelegramChat = document.getElementById('cfg-telegram-chat');
    const cfgCpuThresh = document.getElementById('cfg-cpu-thresh');
    const cfgRamThresh = document.getElementById('cfg-ram-thresh');
    const cfgDiskThresh = document.getElementById('cfg-disk-thresh');
    const cfgGpuThresh = document.getElementById('cfg-gpu-thresh');
    const cfgCooldown = document.getElementById('cfg-cooldown');

    function toggleChannelFields(channel) {
        if (channel === 'discord') {
            discordFields.classList.remove('hidden');
            telegramFields.classList.add('hidden');
        } else {
            discordFields.classList.add('hidden');
            telegramFields.classList.remove('hidden');
        }
    }

    radioChannels.forEach(r => {
        r.addEventListener('change', () => toggleChannelFields(r.value));
    });

    async function openAlertsModal() {
        alertsModal.classList.remove('hidden');
        try {
            const res = await fetch('/api/alerts/config');
            const cfg = await res.json();
            chkAlertsEnabled.checked = !!cfg.enabled;
            const channel = cfg.channel || 'discord';
            const radio = document.querySelector(`input[name="alert_channel"][value="${channel}"]`);
            if (radio) radio.checked = true;
            toggleChannelFields(channel);

            if (cfg.discord_webhook) cfgDiscordWebhook.value = cfg.discord_webhook;
            if (cfg.telegram_token) cfgTelegramToken.value = cfg.telegram_token;
            if (cfg.telegram_chat_id) cfgTelegramChat.value = cfg.telegram_chat_id;

            cfgCpuThresh.value = cfg.cpu_threshold || 90;
            cfgRamThresh.value = cfg.ram_threshold || 90;
            cfgDiskThresh.value = cfg.disk_threshold || 90;
            cfgGpuThresh.value = cfg.gpu_temp_threshold || 85;
            cfgCooldown.value = cfg.cooldown_minutes || 15;
        } catch (err) {
            console.error('Uyarı ayarları okunamadı:', err);
        }
    }

    function closeAlertsModal() {
        alertsModal.classList.add('hidden');
    }

    if (btnAlertsModal) btnAlertsModal.addEventListener('click', openAlertsModal);
    if (btnCloseAlerts) btnCloseAlerts.addEventListener('click', closeAlertsModal);
    const fkAlerts = document.getElementById('fk-alerts');
    if (fkAlerts) fkAlerts.addEventListener('click', openAlertsModal);

    btnSaveAlerts.addEventListener('click', async () => {
        const selectedChannel = document.querySelector('input[name="alert_channel"]:checked').value;
        const payload = {
            enabled: chkAlertsEnabled.checked,
            channel: selectedChannel,
            discord_webhook: cfgDiscordWebhook.value.trim(),
            telegram_token: cfgTelegramToken.value.trim(),
            telegram_chat_id: cfgTelegramChat.value.trim(),
            cpu_threshold: parseFloat(cfgCpuThresh.value) || 90,
            ram_threshold: parseFloat(cfgRamThresh.value) || 90,
            disk_threshold: parseFloat(cfgDiskThresh.value) || 90,
            gpu_temp_threshold: parseFloat(cfgGpuThresh.value) || 85,
            cooldown_minutes: parseInt(cfgCooldown.value, 10) || 15
        };

        btnSaveAlerts.disabled = true;
        btnSaveAlerts.textContent = 'Kaydediliyor...';
        try {
            const res = await fetch('/api/alerts/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            alert(d.message || 'Ayarlar kaydedildi.');
            closeAlertsModal();
            fetchHardwareStats();
        } catch (err) {
            alert('Hata: ' + err.message);
        } finally {
            btnSaveAlerts.disabled = false;
            btnSaveAlerts.textContent = 'Ayarları Kaydet';
        }
    });

    btnTestAlert.addEventListener('click', async () => {
        btnTestAlert.disabled = true;
        testAlertSpin.textContent = '⏳ ';
        try {
            const res = await fetch('/api/alerts/test', { method: 'POST' });
            const d = await res.json();
            alert(d.message);
        } catch (err) {
            alert('Test başarısız: ' + err.message);
        } finally {
            btnTestAlert.disabled = false;
            testAlertSpin.textContent = '';
        }
    });

    // ======================================================================
    // 8.2. Sistem Sağlık Raporu Modalı (Fikir 6)
    // ======================================================================
    const reportModal = document.getElementById('report-modal');
    const btnReportModal = document.getElementById('btn-report-modal');
    const btnCloseReport = document.getElementById('btn-close-report');
    const modalScoreBadge = document.getElementById('modal-score-badge');
    const modalScoreStatus = document.getElementById('modal-score-status');
    const modalScoreDesc = document.getElementById('modal-score-desc');
    const modalFindingsPreview = document.getElementById('modal-findings-preview');

    function closeReportModal() {
        if (reportModal) reportModal.classList.add('hidden');
    }

    async function openReportModal() {
        if (!reportModal) return;
        reportModal.classList.remove('hidden');
        if (modalScoreBadge) {
            modalScoreBadge.textContent = '...';
            modalScoreBadge.style.color = 'var(--c-cyan)';
            modalScoreBadge.style.borderColor = 'var(--c-cyan)';
            modalScoreBadge.style.background = 'rgba(56, 189, 248, 0.1)';
        }
        if (modalScoreStatus) modalScoreStatus.textContent = 'Analiz Ediliyor...';
        if (modalFindingsPreview) modalFindingsPreview.innerHTML = '<p class="c-muted">Donanım, bellek ve süreç yükü hesaplanıyor...</p>';

        try {
            const res = await fetch('/api/report/data');
            const data = await res.json();
            const hs = data.health_score;

            if (modalScoreBadge) {
                modalScoreBadge.textContent = hs.score;
                modalScoreBadge.style.color = hs.color;
                modalScoreBadge.style.borderColor = hs.color;
                modalScoreBadge.style.background = hs.color + '18';
            }

            if (modalScoreStatus) {
                modalScoreStatus.textContent = hs.status;
                modalScoreStatus.style.color = hs.color;
            }
            if (modalScoreDesc) {
                modalScoreDesc.textContent = `${data.metadata.hostname} • ${data.metadata.os} • ${data.metadata.total_tasks} Süreç`;
            }

            if (modalFindingsPreview) {
                if (hs.findings && hs.findings.length > 0) {
                    modalFindingsPreview.innerHTML = '<ul>' + hs.findings.map(f => `<li>• ${escapeHtml(f)}</li>`).join('') + '</ul>';
                } else {
                    modalFindingsPreview.innerHTML = '<p class="c-green">Herhangi bir donanım darboğazı tespit edilmedi.</p>';
                }
            }
        } catch (err) {
            if (modalScoreStatus) modalScoreStatus.textContent = 'Hata';
            if (modalFindingsPreview) modalFindingsPreview.innerHTML = `<p class="c-red">Rapor verisi alınamadı: ${escapeHtml(err.message)}</p>`;
        }
    }

    if (btnReportModal) {
        btnReportModal.addEventListener('click', openReportModal);
    }
    if (btnCloseReport) {
        btnCloseReport.addEventListener('click', closeReportModal);
    }
    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) closeReportModal();
        });
    }

    // ======================================================================
    // 8.4. Canlı Ağ Bağlantıları & Açık Port Dedektörü (Fikir 1)
    // ======================================================================
    const netModal = document.getElementById('net-modal');
    const btnNetModal = document.getElementById('btn-net-modal');
    const btnCloseNet = document.getElementById('btn-close-net');
    const btnRefreshNet = document.getElementById('btn-refresh-net');
    const netRefreshSpin = document.getElementById('net-refresh-spin');
    const tabBtnListening = document.getElementById('tab-btn-listening');
    const tabBtnEstablished = document.getElementById('tab-btn-established');
    const netSearchInput = document.getElementById('net-search-input');
    const netKpiListen = document.getElementById('net-kpi-listen');
    const netKpiEst = document.getElementById('net-kpi-est');
    const netKpiTotal = document.getElementById('net-kpi-total');
    const tabCntListen = document.getElementById('tab-cnt-listen');
    const tabCntEst = document.getElementById('tab-cnt-est');
    const netSocketCounter = document.getElementById('net-socket-counter');
    const netTableHead = document.getElementById('net-table-head');
    const netTableBody = document.getElementById('net-table-body');

    let currentNetTab = 'listening';
    let cachedNetData = null;

    function closeNetModal() {
        if (netModal) netModal.classList.add('hidden');
    }

    async function fetchNetworkConnections() {
        if (btnRefreshNet) btnRefreshNet.disabled = true;
        if (netRefreshSpin) netRefreshSpin.textContent = '⏳ ';
        try {
            const res = await fetch('/api/network/connections');
            const data = await res.json();
            cachedNetData = data;

            if (netKpiListen) netKpiListen.textContent = data.summary.total_listening;
            if (netKpiEst) netKpiEst.textContent = data.summary.total_established;
            if (netKpiTotal) netKpiTotal.textContent = data.summary.total_sockets;
            if (tabCntListen) tabCntListen.textContent = data.summary.total_listening;
            if (tabCntEst) tabCntEst.textContent = data.summary.total_established;
            if (netSocketCounter) netSocketCounter.textContent = `${data.summary.total_sockets} SOKET`;

            renderNetTable();
        } catch (err) {
            console.error('Ağ bağlantıları alınamadı:', err);
            if (netTableBody) {
                netTableBody.innerHTML = `<tr><td colspan="7" class="c-red text-center">Bağlantılar yüklenirken hata oluştu: ${escapeHtml(err.message)}</td></tr>`;
            }
        } finally {
            if (btnRefreshNet) btnRefreshNet.disabled = false;
            if (netRefreshSpin) netRefreshSpin.textContent = '';
        }
    }

    function renderNetTable() {
        if (!cachedNetData || !netTableHead || !netTableBody) return;

        const query = (netSearchInput ? netSearchInput.value.trim().toLowerCase() : '');

        if (currentNetTab === 'listening') {
            netTableHead.innerHTML = `
                <tr>
                    <th style="width: 80px;">Port</th>
                    <th style="width: 70px;">Protokol</th>
                    <th>Süreç Adı</th>
                    <th style="width: 80px;">PID</th>
                    <th>Yerel Adres</th>
                    <th>Kullanıcı</th>
                    <th style="width: 70px; text-align: right;">Eylem</th>
                </tr>
            `;

            let items = cachedNetData.listening || [];
            if (query) {
                items = items.filter(it => 
                    String(it.port).includes(query) ||
                    (it.name && it.name.toLowerCase().includes(query)) ||
                    String(it.pid).includes(query) ||
                    (it.laddr && it.laddr.toLowerCase().includes(query))
                );
            }

            if (items.length === 0) {
                netTableBody.innerHTML = `<tr><td colspan="7" class="c-muted text-center" style="padding: 1.5rem;">Eşleşen açık port bulunamadı.</td></tr>`;
                return;
            }

            netTableBody.innerHTML = items.map(it => {
                const protoCls = it.proto === 'TCP' ? 'proto-tcp' : 'proto-udp';
                const pidHtml = it.pid ? `<span class="mono">${it.pid}</span>` : '<span class="c-muted">-</span>';
                const actionBtn = it.pid ? `<button type="button" class="btn-detail-sm" data-pid="${it.pid}" title="Süreç Detayı">Detay</button>` : '';

                return `
                    <tr>
                        <td><strong class="c-green mono">${it.port}</strong></td>
                        <td><span class="proto-badge ${protoCls}">${it.proto}</span></td>
                        <td><strong>${escapeHtml(it.name)}</strong></td>
                        <td>${pidHtml}</td>
                        <td class="mono c-muted">${escapeHtml(it.laddr)}</td>
                        <td class="text-truncate" style="max-width: 140px;">${escapeHtml(it.user)}</td>
                        <td style="text-align: right;">${actionBtn}</td>
                    </tr>
                `;
            }).join('');

        } else {
            netTableHead.innerHTML = `
                <tr>
                    <th>Süreç Adı</th>
                    <th style="width: 80px;">PID</th>
                    <th style="width: 70px;">Protokol</th>
                    <th>Yerel Soket</th>
                    <th>Uzak Adres (Hedef)</th>
                    <th style="width: 90px;">Durum</th>
                    <th>Kullanıcı</th>
                    <th style="width: 70px; text-align: right;">Eylem</th>
                </tr>
            `;

            let items = cachedNetData.established || [];
            if (query) {
                items = items.filter(it => 
                    (it.name && it.name.toLowerCase().includes(query)) ||
                    String(it.pid).includes(query) ||
                    (it.raddr && it.raddr.toLowerCase().includes(query)) ||
                    (it.laddr && it.laddr.toLowerCase().includes(query)) ||
                    String(it.port).includes(query)
                );
            }

            if (items.length === 0) {
                netTableBody.innerHTML = `<tr><td colspan="8" class="c-muted text-center" style="padding: 1.5rem;">Eşleşen aktif bağlantı bulunamadı.</td></tr>`;
                return;
            }

            netTableBody.innerHTML = items.map(it => {
                const protoCls = it.proto === 'TCP' ? 'proto-tcp' : 'proto-udp';
                const pidHtml = it.pid ? `<span class="mono">${it.pid}</span>` : '<span class="c-muted">-</span>';
                const actionBtn = it.pid ? `<button type="button" class="btn-detail-sm" data-pid="${it.pid}" title="Süreç Detayı">Detay</button>` : '';
                const statusBadge = it.status === 'ESTABLISHED' 
                    ? '<span class="net-status-badge status-est">ESTABLISHED</span>' 
                    : `<span class="net-status-badge status-other">${escapeHtml(it.status)}</span>`;

                return `
                    <tr>
                        <td><strong>${escapeHtml(it.name)}</strong></td>
                        <td>${pidHtml}</td>
                        <td><span class="proto-badge ${protoCls}">${it.proto}</span></td>
                        <td class="mono c-muted">${escapeHtml(it.laddr)}</td>
                        <td class="mono" style="color: var(--c-cyan); font-weight: 600;">${escapeHtml(it.raddr)}</td>
                        <td>${statusBadge}</td>
                        <td class="text-truncate" style="max-width: 140px;">${escapeHtml(it.user)}</td>
                        <td style="text-align: right;">${actionBtn}</td>
                    </tr>
                `;
            }).join('');
        }

        netTableBody.querySelectorAll('.btn-detail-sm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pid = parseInt(btn.getAttribute('data-pid'), 10);
                if (pid) {
                    closeNetModal();
                    openInspector(pid);
                }
            });
        });
    }

    function openNetModal() {
        if (!netModal) return;
        netModal.classList.remove('hidden');
        fetchNetworkConnections();
        if (netSearchInput) {
            netSearchInput.value = '';
            netSearchInput.focus();
        }
    }

    if (btnNetModal) btnNetModal.addEventListener('click', openNetModal);
    if (btnCloseNet) btnCloseNet.addEventListener('click', closeNetModal);
    if (btnRefreshNet) btnRefreshNet.addEventListener('click', fetchNetworkConnections);
    if (netModal) {
        netModal.addEventListener('click', (e) => {
            if (e.target === netModal) closeNetModal();
        });
    }

    if (tabBtnListening) {
        tabBtnListening.addEventListener('click', () => {
            currentNetTab = 'listening';
            tabBtnListening.classList.add('active');
            if (tabBtnEstablished) tabBtnEstablished.classList.remove('active');
            renderNetTable();
        });
    }

    if (tabBtnEstablished) {
        tabBtnEstablished.addEventListener('click', () => {
            currentNetTab = 'established';
            tabBtnEstablished.classList.add('active');
            if (tabBtnListening) tabBtnListening.classList.remove('active');
            renderNetTable();
        });
    }

    if (netSearchInput) {
        netSearchInput.addEventListener('input', () => renderNetTable());
    }

    // ======================================================================
    // 8.5. Bilgisayar & Donanım Bilgileri Modalı (F10)
    // ======================================================================
    const sysModal = document.getElementById('sys-modal');
    const btnSysModal = document.getElementById('btn-sys-modal');
    const btnSysDetail = document.getElementById('btn-sys-detail');
    const btnCloseSys = document.getElementById('btn-close-sys');
    const btnRefreshSysInfo = document.getElementById('btn-refresh-sys-info');

    function openSysModal() {
        if (!sysModal) return;
        sysModal.classList.remove('hidden');
        fetchSystemInfo();
    }

    function closeSysModal() {
        if (sysModal) sysModal.classList.add('hidden');
    }

    function toggleSysModal() {
        if (!sysModal) return;
        if (sysModal.classList.contains('hidden')) {
            openSysModal();
        } else {
            closeSysModal();
        }
    }

    async function fetchSystemInfo() {
        try {
            const res = await fetch('/api/system/info');
            if (!res.ok) return;
            const data = await res.json();

            // Modal elemanlarını güncelle
            const setTxt = (id, txt) => {
                const el = document.getElementById(id);
                if (el) el.textContent = txt;
            };
            const setTitle = (id, txt) => {
                const el = document.getElementById(id);
                if (el) { el.textContent = txt; el.title = txt; }
            };

            setTxt('spec-mfr', data.manufacturer);
            setTxt('spec-prod', data.product);
            setTxt('spec-bios', data.bios_version);
            setTxt('spec-host', data.hostname);
            setTitle('spec-cpu', data.processor);
            setTxt('spec-cores', `${data.cores_physical} Fiziksel / ${data.cores_logical} Mantıksal`);
            setTxt('spec-arch', data.architecture);
            setTxt('spec-freq', `${data.cpu_freq_max} MHz`);
            setTitle('spec-gpu', data.gpu_detail);
            setTxt('spec-gpu-count', `${(data.gpus || []).length} Adet`);
            setTxt('spec-ram', `${data.ram_total_gb} GB`);
            setTxt('spec-swap', `${data.swap_total_gb} GB`);
            setTxt('spec-disk', `${data.disk_total_gb} GB (${data.disk_free_gb} GB Boş)`);
            setTxt('spec-os', data.os);
            setTxt('spec-os-ver', data.os_version);
            setTxt('spec-uptime', data.uptime);
            setTxt('spec-boot', data.boot_time);
            setTxt('spec-ip', data.local_ip);
            setTxt('spec-user', data.username);
            setTxt('spec-py', `v${data.python_version}`);

            // Dashboard panelini de senkronize et
            setTitle('dash-sys-model', data.display_model);
            setTitle('dash-sys-cpu', data.processor);
            setTitle('dash-sys-gpu', data.gpu_name);
            setTitle('dash-sys-os', data.os);
            setTxt('dash-sys-ip', data.local_ip);
            setTxt('dash-sys-user', `${data.username}@${data.hostname}`);
        } catch (err) {
            console.error('Sistem bilgileri alınamadı:', err);
        }
    }

    if (btnSysModal) btnSysModal.addEventListener('click', openSysModal);
    if (btnSysDetail) btnSysDetail.addEventListener('click', openSysModal);
    if (btnCloseSys) btnCloseSys.addEventListener('click', closeSysModal);
    if (btnRefreshSysInfo) btnRefreshSysInfo.addEventListener('click', fetchSystemInfo);
    if (sysModal) {
        sysModal.addEventListener('click', (e) => {
            if (e.target === sysModal) closeSysModal();
        });
    }

    // ======================================================================
    // 8.6. Docker & Konteyner Yöneticisi (F12)
    // ======================================================================
    const dockerModal = document.getElementById('docker-modal');
    const btnDockerModal = document.getElementById('btn-docker-modal');
    const btnCloseDocker = document.getElementById('btn-close-docker');
    const btnRefreshDocker = document.getElementById('btn-refresh-docker');
    const btnRetryDocker = document.getElementById('btn-retry-docker');
    const dockerSearchInput = document.getElementById('docker-search-input');
    const dockerTableBody = document.getElementById('docker-table-body');
    const dockerRefreshSpin = document.getElementById('docker-refresh-spin');

    const dockerKpiTotal = document.getElementById('docker-kpi-total');
    const dockerKpiRunning = document.getElementById('docker-kpi-running');
    const dockerKpiStopped = document.getElementById('docker-kpi-stopped');
    const dockerKpiPaused = document.getElementById('docker-kpi-paused');
    const dockerKpiVersion = document.getElementById('docker-kpi-version');
    const dockerDaemonAlert = document.getElementById('docker-daemon-alert');
    const dockerAlertMsg = document.getElementById('docker-alert-msg');
    const dockerStatusSubtitle = document.getElementById('docker-status-subtitle');

    // Log Modal
    const dockerLogModal = document.getElementById('docker-log-modal');
    const btnCloseDockerLog = document.getElementById('btn-close-docker-log');
    const logContainerName = document.getElementById('log-container-name');
    const dockerLogText = document.getElementById('docker-log-text');
    const btnCopyDockerLog = document.getElementById('btn-copy-docker-log');
    const btnRefreshDockerLog = document.getElementById('btn-refresh-docker-log');

    let cachedDockerData = null;
    let activeLogCid = null;
    let activeLogCname = null;

    function openDockerModal() {
        if (!dockerModal) return;
        dockerModal.classList.remove('hidden');
        fetchDockerContainers();
        if (dockerSearchInput) {
            dockerSearchInput.value = '';
            dockerSearchInput.focus();
        }
    }

    function closeDockerModal() {
        if (dockerModal) dockerModal.classList.add('hidden');
    }

    function toggleDockerModal() {
        if (!dockerModal) return;
        if (dockerModal.classList.contains('hidden')) {
            openDockerModal();
        } else {
            closeDockerModal();
        }
    }

    async function fetchDockerContainers() {
        if (btnRefreshDocker) btnRefreshDocker.disabled = true;
        if (dockerRefreshSpin) dockerRefreshSpin.textContent = '⏳ ';
        try {
            const res = await fetch('/api/docker/containers');
            const data = await res.json();
            cachedDockerData = data;

            const st = data.status || {};
            const sum = data.summary || {};

            if (dockerKpiTotal) dockerKpiTotal.textContent = sum.total || 0;
            if (dockerKpiRunning) dockerKpiRunning.textContent = sum.running || 0;
            if (dockerKpiStopped) dockerKpiStopped.textContent = sum.stopped || 0;
            if (dockerKpiPaused) dockerKpiPaused.textContent = sum.paused || 0;
            if (dockerKpiVersion) dockerKpiVersion.textContent = st.version ? `v${st.version}` : 'v--';

            if (!st.daemon_running) {
                if (dockerDaemonAlert) dockerDaemonAlert.classList.remove('hidden');
                if (dockerAlertMsg) dockerAlertMsg.textContent = st.error || "Docker servisi veya Docker Desktop soketine bağlanılamadı.";
                if (dockerStatusSubtitle) dockerStatusSubtitle.textContent = "Bağlantı Kesildi • Daemon Kapalı";
            } else {
                if (dockerDaemonAlert) dockerDaemonAlert.classList.add('hidden');
                if (dockerStatusSubtitle) dockerStatusSubtitle.textContent = `${st.server_version ? 'Docker Engine ' + st.server_version : 'Docker Aktif'} • ${sum.running} Çalışan Konteyner`;
            }

            renderDockerTable();
        } catch (err) {
            console.error('Docker verisi alınamadı:', err);
            if (dockerTableBody) {
                dockerTableBody.innerHTML = `<tr><td colspan="7" class="c-red text-center">Docker API hatası: ${escapeHtml(err.message)}</td></tr>`;
            }
        } finally {
            if (btnRefreshDocker) btnRefreshDocker.disabled = false;
            if (dockerRefreshSpin) dockerRefreshSpin.textContent = '';
        }
    }

    function renderDockerTable() {
        if (!cachedDockerData || !dockerTableBody) return;

        const query = (dockerSearchInput ? dockerSearchInput.value.trim().toLowerCase() : '');
        let items = cachedDockerData.containers || [];

        if (query) {
            items = items.filter(c => 
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.image && c.image.toLowerCase().includes(query)) ||
                (c.id && c.id.toLowerCase().includes(query))
            );
        }

        if (items.length === 0) {
            if (cachedDockerData.status && !cachedDockerData.status.daemon_running) {
                dockerTableBody.innerHTML = '<tr><td colspan="7" class="c-muted text-center" style="padding: 2rem;">Docker servisi çalışmıyor. Lütfen Docker Desktop veya Docker Daemon başlatın.</td></tr>';
            } else if (query) {
                dockerTableBody.innerHTML = '<tr><td colspan="7" class="c-muted text-center" style="padding: 2rem;">Aramanızla eşleşen konteyner bulunamadı.</td></tr>';
            } else {
                dockerTableBody.innerHTML = '<tr><td colspan="7" class="c-muted text-center" style="padding: 2rem;">Henüz oluşturulmuş bir konteyner bulunmuyor.</td></tr>';
            }
            return;
        }

        dockerTableBody.innerHTML = items.map(c => {
            let stateCls = 'state-exited';
            if (c.state === 'running') stateCls = 'state-running';
            else if (c.state === 'paused') stateCls = 'state-paused';

            // Eylem butonları
            let actionBtns = '';
            if (c.state === 'running') {
                actionBtns += `<button type="button" class="docker-btn btn-docker-stop" data-cid="${c.id}" data-act="stop" title="Durdur (Stop)">⏹ Durdur</button>`;
                actionBtns += `<button type="button" class="docker-btn btn-docker-restart" data-cid="${c.id}" data-act="restart" title="Yeniden Başlat">🔄 Yeniden Başlat</button>`;
            } else {
                actionBtns += `<button type="button" class="docker-btn btn-docker-start" data-cid="${c.id}" data-act="start" title="Başlat (Start)">▶ Başlat</button>`;
            }
            actionBtns += `<button type="button" class="docker-btn btn-docker-logs" data-cid="${c.id}" data-cname="${escapeHtml(c.name)}" title="Logları Gör">📜 Loglar</button>`;

            return `
                <tr>
                    <td><span class="c-state-badge ${stateCls}">${escapeHtml(c.state)}</span></td>
                    <td>
                        <strong class="c-text">${escapeHtml(c.name)}</strong>
                        <div class="text-xs c-muted mono">${c.id}</div>
                    </td>
                    <td class="c-cyan text-truncate" style="max-width: 180px;" title="${escapeHtml(c.image)}">${escapeHtml(c.image)}</td>
                    <td class="mono text-xs c-yellow text-truncate" style="max-width: 170px;" title="${escapeHtml(c.ports)}">${escapeHtml(c.ports || '-')}</td>
                    <td class="mono ${parseFloat(c.cpu_percent) > 50 ? 'c-red' : 'c-green'}">${c.cpu_percent || '0%'}</td>
                    <td class="mono c-purple">${c.mem_usage || '0 MB'}</td>
                    <td style="text-align: right;">
                        <div class="docker-actions-group">${actionBtns}</div>
                    </td>
                </tr>
            `;
        }).join('');

        // Buton dinleyicilerini bağla
        dockerTableBody.querySelectorAll('.docker-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cid = btn.getAttribute('data-cid');
                const act = btn.getAttribute('data-act');
                const cname = btn.getAttribute('data-cname');

                if (act) {
                    await handleDockerAction(cid, act, btn);
                } else if (cname) {
                    openDockerLog(cid, cname);
                }
            });
        });
    }

    async function handleDockerAction(cid, action, btn) {
        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ ...';
        try {
            const res = await fetch(`/api/docker/action/${cid}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                btn.textContent = '✓ Tamam';
                setTimeout(() => fetchDockerContainers(), 600);
            } else {
                alert(`İşlem Başarısız: ${data.message || 'Bilinmeyen hata'}`);
                btn.textContent = origText;
                btn.disabled = false;
            }
        } catch (e) {
            alert(`Hata: ${e.message}`);
            btn.textContent = origText;
            btn.disabled = false;
        }
    }

    async function openDockerLog(cid, cname) {
        if (!dockerLogModal) return;
        activeLogCid = cid;
        activeLogCname = cname;
        if (logContainerName) logContainerName.textContent = `Konteyner: ${cname} (${cid})`;
        if (dockerLogText) dockerLogText.textContent = 'Loglar yükleniyor...';
        dockerLogModal.classList.remove('hidden');
        await refreshDockerLog();
    }

    function closeDockerLog() {
        if (dockerLogModal) dockerLogModal.classList.add('hidden');
    }

    async function refreshDockerLog() {
        if (!activeLogCid || !dockerLogText) return;
        try {
            const res = await fetch(`/api/docker/logs/${activeLogCid}?tail=150`);
            const data = await res.json();
            dockerLogText.textContent = data.logs || '(Boş log)';
            dockerLogText.scrollTop = dockerLogText.scrollHeight;
        } catch (e) {
            dockerLogText.textContent = `Loglar alınamadı: ${e.message}`;
        }
    }

    if (btnDockerModal) btnDockerModal.addEventListener('click', openDockerModal);
    if (btnCloseDocker) btnCloseDocker.addEventListener('click', closeDockerModal);
    if (btnRefreshDocker) btnRefreshDocker.addEventListener('click', fetchDockerContainers);
    if (btnRetryDocker) btnRetryDocker.addEventListener('click', fetchDockerContainers);
    if (dockerSearchInput) dockerSearchInput.addEventListener('input', () => renderDockerTable());

    if (dockerModal) {
        dockerModal.addEventListener('click', (e) => {
            if (e.target === dockerModal) closeDockerModal();
        });
    }

    if (btnCloseDockerLog) btnCloseDockerLog.addEventListener('click', closeDockerLog);
    if (btnRefreshDockerLog) btnRefreshDockerLog.addEventListener('click', refreshDockerLog);
    if (btnCopyDockerLog) {
        btnCopyDockerLog.addEventListener('click', () => {
            if (dockerLogText) {
                navigator.clipboard.writeText(dockerLogText.textContent).then(() => {
                    const prev = btnCopyDockerLog.textContent;
                    btnCopyDockerLog.textContent = '✓ Kopyalandı!';
                    setTimeout(() => btnCopyDockerLog.textContent = prev, 1500);
                }).catch(() => {});
            }
        });
    }
    if (dockerLogModal) {
        dockerLogModal.addEventListener('click', (e) => {
            if (e.target === dockerLogModal) closeDockerLog();
        });
    }

    // ======================================================================
    // 9. Ana Döngü
    // ======================================================================


    function tick() {
        fetchHardwareStats();
        fetchProcesses();
    }

    function restartLoop() {
        if (timerId) clearInterval(timerId);
        tick();
        timerId = setInterval(tick, refreshRate);
    }

    // Başlat
    restartLoop();

    // Yardımcı: HTML Kaçış
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

});
