/**
 * pyTOP Pro — Terminal & Sistem Monitörü İstemci Mantığı
 */

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
            if (!mobileModal.classList.contains('hidden')) {
                closeMobileModal();
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
            openMobileModal();
        } else if (e.key === 'F7') {
            e.preventDefault();
            openReportModal();
        } else if (e.key === 'F8') {
            e.preventDefault();
            openAlertsModal();
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
    // 8.3. Mobil PWA & QR Kod Modalı (Fikir 5)
    // ======================================================================
    const mobileModal = document.getElementById('mobile-modal');
    const btnMobileModal = document.getElementById('btn-mobile-modal');
    const btnCloseMobile = document.getElementById('btn-close-mobile');
    const btnCopyUrl = document.getElementById('btn-copy-url');
    const copyFeedback = document.getElementById('copy-feedback');
    const mobileLanUrl = document.getElementById('mobile-lan-url');
    const mobileQrImg = document.getElementById('mobile-qr-img');

    function closeMobileModal() {
        if (mobileModal) mobileModal.classList.add('hidden');
        if (copyFeedback) copyFeedback.classList.add('hidden');
    }

    async function openMobileModal() {
        if (!mobileModal) return;
        mobileModal.classList.remove('hidden');

        try {
            const res = await fetch('/api/network/local_ip');
            const d = await res.json();
            if (d && d.url) {
                if (mobileLanUrl) mobileLanUrl.textContent = d.url;
                if (mobileQrImg) {
                    mobileQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(d.url)}`;
                }
            }
        } catch (e) {
            console.error('Local IP okunamadı:', e);
        }
    }

    if (btnMobileModal) btnMobileModal.addEventListener('click', openMobileModal);
    if (btnCloseMobile) btnCloseMobile.addEventListener('click', closeMobileModal);
    if (mobileModal) {
        mobileModal.addEventListener('click', (e) => {
            if (e.target === mobileModal) closeMobileModal();
        });
    }

    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', async () => {
            const urlText = mobileLanUrl ? mobileLanUrl.textContent.trim() : '';
            if (!urlText) return;
            try {
                await navigator.clipboard.writeText(urlText);
                if (copyFeedback) {
                    copyFeedback.classList.remove('hidden');
                    setTimeout(() => copyFeedback.classList.add('hidden'), 2500);
                }
            } catch (err) {
                prompt('Mobil adresi kopyalayın:', urlText);
            }
        });
    }

    // PWA Service Worker Kaydı
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    console.log('pyTOP PWA Service Worker hazır. Kapsam:', reg.scope);
                })
                .catch((err) => {
                    console.warn('PWA Service Worker kaydedilemedi:', err);
                });
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
