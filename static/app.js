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
            if (!inspectorDrawer.classList.contains('hidden')) {
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
