// pyTOP Pro — Canlı Sistem Haritası
// Sidebar'daki "Sistem haritası" düğmesiyle açılır; mevcut /api uçlarından canlı veri çeker.
(function () {
    'use strict';

    const view = document.getElementById('system-map-view');
    if (!view) return;

    const PROC_REFRESH_MS = 3000;
    const DOCKER_REFRESH_MS = 15000;
    const HISTORY_LEN = 40;
    const BASE_W = 800;
    const BASE_H = 600;

    const PATHS = {
        cpu: ['top-trunk', 'top-left', 'drop-cpu'],
        mem: ['top-trunk', 'drop-mem'],
        gpu: ['top-trunk', 'top-right', 'drop-gpu'],
        disk: ['link-disk'],
        net: ['link-net'],
        docker: ['bot-trunk', 'bot-left', 'drop-docker'],
        proc: ['bot-trunk', 'drop-proc'],
        bat: ['bot-trunk', 'bot-right', 'drop-bat'],
        host: []
    };
    const BASE_STATUS_COLORS = { ok: '#77d5a7', warn: '#f5b45a', crit: '#f87171', off: '#7f9089', flow: '#6aa7d8', hub: '#9fd9bd' };
    const GRAPHITE_STATUS_COLORS = { ok: '#d4d4d8', warn: '#e3a857', crit: '#ef7d7d', off: '#8b8b93', flow: '#9fb3c8', hub: '#e4e4e7' };
    const STATUS_COLORS = new Proxy({}, {
        get: (_, key) => (document.documentElement.getAttribute('data-theme') === 'graphite' ? GRAPHITE_STATUS_COLORS : BASE_STATUS_COLORS)[key]
    });
    const STATUS_TEXT = { ok: 'Normal', warn: 'Yüksek', crit: 'Kritik', off: 'Veri yok', flow: 'Normal' };

    const host = document.getElementById('smap-host');
    const stage = document.getElementById('smap-stage');
    const scroller = document.getElementById('smap-scroll');
    const nodes = {};
    view.querySelectorAll('.smap-node').forEach((el) => { nodes[el.dataset.node] = el; });
    const links = {};
    view.querySelectorAll('.smap-link').forEach((el) => { links[el.dataset.link] = el; });

    const detail = {
        title: document.getElementById('smap-detail-title'),
        pill: document.getElementById('smap-detail-pill'),
        value: document.getElementById('smap-detail-value'),
        trend: document.getElementById('smap-detail-trend'),
        spark: document.getElementById('smap-spark'),
        sparkLine: document.getElementById('smap-spark-line'),
        stats: document.getElementById('smap-detail-stats'),
        topWrap: document.getElementById('smap-top-wrap'),
        topTitle: document.getElementById('smap-top-title'),
        topList: document.getElementById('smap-top-list'),
        primary: document.getElementById('smap-action-primary'),
        alert: document.getElementById('smap-action-alert')
    };

    const state = {
        active: false,
        paused: false,
        selected: 'cpu',
        filter: 'all',
        zoom: 1,
        timer: null,
        lastDockerFetch: 0,
        stats: null,
        docker: null,
        topCpu: [],
        topMem: [],
        info: {},
        history: {}
    };

    // ------------------------------------------------------------------ helpers
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const fmt = (v, digits = 0) => (num(v) === null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
    const pct = (v) => (num(v) === null ? '—' : `${fmt(v, v < 10 ? 1 : 0)}%`);
    const level = (v) => (num(v) === null ? 'off' : v >= 85 ? 'crit' : v >= 60 ? 'warn' : 'ok');
    function speed(kbs) {
        if (num(kbs) === null) return '—';
        if (kbs >= 1024 * 1024) return `${fmt(kbs / 1024 / 1024, 1)} GB/s`;
        if (kbs >= 1024) return `${fmt(kbs / 1024, 1)} MB/s`;
        return `${fmt(kbs, 0)} KB/s`;
    }
    function el(tag, text, cls) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (cls) node.className = cls;
        return node;
    }
    function pushHistory(key, value) {
        if (num(value) === null) return;
        const list = state.history[key] || (state.history[key] = []);
        list.push(value);
        if (list.length > HISTORY_LEN) list.shift();
    }

    // ------------------------------------------------------------- node models
    function buildInfo() {
        const s = state.stats;
        if (!s) return {};
        const info = {};
        const cpu = s.cpu || {};
        const temps = Array.isArray(s.cpu_temps) ? s.cpu_temps.map((t) => num(t && (t.current ?? t.temp))).filter((t) => t !== null) : [];
        const cpuTemp = temps.length ? Math.max(...temps) : null;
        info.cpu = {
            title: 'CPU', status: level(cpu.total), value: pct(cpu.total), metric: cpu.total,
            meta: `${num(cpu.freq_mhz) ? fmt(cpu.freq_mhz / 1000, 1) + ' GHz · ' : ''}${Array.isArray(cpu.cores) ? cpu.cores.length + ' iş parçacığı' : ''}`,
            stats: [['Frekans', num(cpu.freq_mhz) ? `${fmt(cpu.freq_mhz / 1000, 2)} GHz` : '—'], ['Sıcaklık', cpuTemp !== null ? `${fmt(cpuTemp)}°C` : '—'], ['Kullanıcı / sistem', `${fmt(cpu.user, 0)} / ${fmt(cpu.system, 0)}%`], ['Bağlı işlemler', fmt(s.tasks_total)]],
            top: { title: 'En çok CPU kullananlar', rows: state.topCpu.map((p) => [p.name, pct(p.cpu)]) },
            action: 'processes'
        };
        const mem = s.mem || {};
        const swap = s.swap || {};
        info.mem = {
            title: 'Bellek', status: level(mem.percent), value: pct(mem.percent), metric: mem.percent,
            meta: `${fmt(mem.used_gb, 1)} / ${fmt(mem.total_gb, 0)} GB · takas ${pct(swap.percent)}`,
            stats: [['Kullanılan', `${fmt(mem.used_gb, 1)} GB`], ['Boş', `${fmt(mem.free_gb, 1)} GB`], ['Takas', `${fmt(swap.used_gb, 1)} / ${fmt(swap.total_gb, 1)} GB`], ['Toplam', `${fmt(mem.total_gb, 1)} GB`]],
            top: { title: 'En çok bellek kullananlar', rows: state.topMem.map((p) => [p.name, `${fmt(p.rss_mb, 0)} MB`]) },
            action: 'processes'
        };
        const gpu = Array.isArray(s.gpus) && s.gpus.length ? s.gpus[0] : null;
        info.gpu = gpu ? {
            title: 'GPU', status: level(gpu.load), value: num(gpu.load) !== null ? pct(gpu.load) : 'Telemetri yok', metric: gpu.load,
            meta: [num(gpu.temp) && gpu.temp > 0 ? `${fmt(gpu.temp)}°C` : null, num(gpu.used_mb) !== null ? `VRAM ${fmt(gpu.used_mb / 1024, 1)} GB` : null].filter(Boolean).join(' · ') || (gpu.name || 'GPU'),
            stats: [['Model', gpu.name || '—'], ['Sıcaklık', num(gpu.temp) && gpu.temp > 0 ? `${fmt(gpu.temp)}°C` : '—'], ['VRAM', num(gpu.used_mb) !== null && num(gpu.total_mb) !== null ? `${fmt(gpu.used_mb)} / ${fmt(gpu.total_mb)} MB` : '—'], ['VRAM %', pct(gpu.percent)]],
            action: 'system'
        } : { title: 'GPU', status: 'off', value: 'Sensör yok', meta: 'Telemetri okunamadı', stats: [['Durum', 'GPU sensörü bulunamadı']], action: 'system' };
        const disk = s.disk || {};
        info.disk = {
            title: 'Disk', status: level(disk.percent), value: `%${fmt(disk.percent, 0)} dolu`, big: pct(disk.percent), metric: disk.percent,
            meta: `${disk.drive || ''} · ${fmt(disk.used_gb, 0)} / ${fmt(disk.total_gb, 0)} GB`,
            stats: [['Okuma', speed(disk.read_kbs)], ['Yazma', speed(disk.write_kbs)], ['Boş alan', `${fmt(disk.free_gb, 1)} GB`], ['Sürücü', disk.drive || '—']],
            action: 'system'
        };
        const net = s.net || {};
        const netTotal = (num(net.rx_kbs) || 0) + (num(net.tx_kbs) || 0);
        info.net = {
            title: 'Ağ', status: 'flow', value: `↓${shortSpeed(net.rx_kbs)} ↑${shortSpeed(net.tx_kbs)}`, big: speed(netTotal), metric: netTotal, unitless: true,
            meta: 'MB/s · indirme / yükleme',
            stats: [['İndirme', speed(net.rx_kbs)], ['Yükleme', speed(net.tx_kbs)], ['Toplam alınan', `${fmt(net.total_rx_mb, 0)} MB`], ['Toplam gönderilen', `${fmt(net.total_tx_mb, 0)} MB`]],
            action: 'network'
        };
        const dk = state.docker;
        if (!dk) {
            info.docker = { title: 'Docker', status: 'off', value: '…', meta: 'Durum alınıyor', stats: [['Durum', 'Yükleniyor']], action: 'docker' };
        } else {
            const sum = dk.summary || {};
            const st = dk.status && typeof dk.status === 'object' ? dk.status : {};
            const daemonOk = st.daemon_running === true || sum.total > 0;
            const daemonText = st.daemon_running ? 'Çalışıyor' : st.installed === false ? 'Kurulu değil' : 'Çalışmıyor';
            const stopped = num(sum.stopped) || 0;
            info.docker = {
                title: 'Docker', status: !daemonOk ? 'off' : stopped > 0 ? 'warn' : 'ok',
                statusText: !daemonOk ? 'Kapalı' : stopped > 0 ? 'Dikkat' : 'Normal',
                value: daemonOk ? `${fmt(sum.running)} / ${fmt(sum.total)}` : '—',
                meta: daemonOk ? `konteyner${stopped ? ` · ${stopped} durdu` : ''}` : `Docker ${daemonText.toLowerCase()}`,
                stats: [['Çalışan', fmt(sum.running)], ['Durmuş', fmt(sum.stopped)], ['Duraklatılmış', fmt(sum.paused)], ['Daemon', daemonText], ['Sürüm', st.version || '—']],
                top: { title: 'Konteynerler', rows: (dk.containers || []).slice(0, 5).map((c) => [c.name || c.id, c.state || c.status || '']) },
                action: 'docker'
            };
        }
        info.proc = {
            title: 'İşlemler', status: 'ok', value: fmt(s.tasks_total), metric: s.tasks_total, unitless: true,
            meta: 'çalışan işlem',
            stats: [['Toplam işlem', fmt(s.tasks_total)], ['Çalışma süresi', s.uptime || '—'], ['CPU', pct(cpu.total)], ['Bellek', pct(mem.percent)]],
            top: { title: 'En çok CPU kullananlar', rows: state.topCpu.map((p) => [p.name, pct(p.cpu)]) },
            action: 'processes'
        };
        const bat = s.battery;
        if (bat && num(bat.percent) !== null) {
            const low = !bat.plugged && bat.percent < 20 ? 'crit' : !bat.plugged && bat.percent < 40 ? 'warn' : 'ok';
            info.bat = {
                title: 'Batarya', status: low, statusText: bat.plugged ? 'Şarjda' : low === 'ok' ? 'Pilde' : STATUS_TEXT[low],
                value: pct(bat.percent), metric: bat.percent, meta: bat.status || (bat.plugged ? 'Fişe takılı' : 'Pilde'),
                stats: [['Şarj', pct(bat.percent)], ['Güç', bat.plugged ? 'Fişe takılı' : 'Pil'], ['Durum', bat.status || '—']],
                action: 'system'
            };
        } else {
            info.bat = { title: 'Batarya', status: 'off', statusText: 'Yok', value: 'AC güç', meta: 'Batarya algılanmadı', stats: [['Durum', 'Masaüstü / batarya yok']], action: 'system' };
        }
        info.host = {
            title: nodes.host.querySelector('.smap-node-name').textContent.trim(), status: 'ok', statusText: 'Çevrimiçi', value: s.uptime || '—', unitless: true,
            meta: `çalışma ${s.uptime || '—'}`,
            stats: [['CPU', pct(cpu.total)], ['Bellek', pct(mem.percent)], ['Disk', pct(disk.percent)], ['Uyarılar', String((s.active_warnings || []).length)]],
            top: (s.active_warnings || []).length ? { title: 'Etkin uyarılar', rows: s.active_warnings.slice(0, 5).map((w) => [w, '']) } : null,
            action: 'report'
        };
        return info;
    }
    function shortSpeed(kbs) {
        if (num(kbs) === null) return '—';
        return fmt(kbs / 1024, kbs >= 10240 ? 0 : 1);
    }

    // ------------------------------------------------------------------ render
    function renderNodes() {
        const info = state.info;
        Object.entries(nodes).forEach(([key, node]) => {
            const m = info[key];
            if (!m) return;
            node.classList.remove('is-warn', 'is-crit', 'is-off', 'is-flow');
            if (key !== 'host' && m.status !== 'ok') node.classList.add(`is-${m.status}`);
            const statusEl = node.querySelector('[data-status]');
            if (statusEl) statusEl.textContent = m.statusText || STATUS_TEXT[m.status];
            const valueEl = node.querySelector('[data-value]');
            if (valueEl) valueEl.textContent = m.value;
            const metaEl = node.querySelector('[data-meta]');
            if (metaEl) metaEl.textContent = m.meta;
            node.setAttribute('aria-label', `${m.title}: ${m.value}, ${m.statusText || STATUS_TEXT[m.status]}`);
        });
        const s = state.stats;
        if (s) {
            document.getElementById('smap-flow-disk').textContent = speed((num(s.disk?.read_kbs) || 0) + (num(s.disk?.write_kbs) || 0));
            document.getElementById('smap-flow-net').textContent = speed((num(s.net?.rx_kbs) || 0) + (num(s.net?.tx_kbs) || 0));
        }
        document.getElementById('smap-meta').textContent = `${Object.keys(nodes).length} düğüm · ${state.paused ? 'duraklatıldı' : 'canlı'}`;
    }

    function renderSelection() {
        const key = state.selected;
        Object.entries(nodes).forEach(([k, node]) => {
            node.classList.toggle('is-selected', k === key);
            node.setAttribute('aria-pressed', k === key ? 'true' : 'false');
        });
        const m = state.info[key];
        const color = m ? (key === 'host' ? STATUS_COLORS.hub : STATUS_COLORS[m.status]) : STATUS_COLORS.ok;
        const pathColor = m && (m.status === 'ok' || m.status === 'off') ? STATUS_COLORS.hub : color;
        const path = new Set(PATHS[key] || []);
        Object.entries(links).forEach(([id, link]) => {
            const onPath = path.has(id);
            link.classList.toggle('is-path', onPath);
            link.style.setProperty('--smap-path', pathColor);
        });
        view.style.setProperty('--smap-c', color);
        if (!m) return;

        detail.title.textContent = m.title;
        detail.pill.textContent = m.statusText || (m.status === 'warn' ? 'Yüksek yük' : m.status === 'crit' ? 'Kritik yük' : STATUS_TEXT[m.status]);
        detail.pill.className = `smap-pill${m.status === 'warn' || m.status === 'crit' || m.status === 'off' ? ' is-' + m.status : ''}`;
        detail.value.textContent = m.big || m.value;

        const hist = state.history[key] || [];
        if (hist.length >= 2 && !m.unitless) {
            const delta = hist[hist.length - 1] - hist[0];
            detail.trend.textContent = `${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta), 0)} puan · son ${hist.length} örnek`;
            detail.trend.className = `smap-mono ${delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : ''}`;
        } else {
            detail.trend.textContent = '';
        }
        renderSpark(hist, m);

        detail.stats.replaceChildren(...(m.stats || []).map(([label, value]) => {
            const box = el('div');
            box.append(el('dt', label), el('dd', value));
            box.lastChild.title = value;
            return box;
        }));

        if (m.top) {
            detail.topWrap.hidden = false;
            detail.topTitle.textContent = m.top.title;
            const rows = m.top.rows.length ? m.top.rows.slice(0, 5).map(([a, b]) => {
                const li = el('li');
                li.append(el('span', a), el('span', b));
                li.firstChild.title = a;
                return li;
            }) : [el('li', 'Veri bekleniyor…', 'empty')];
            detail.topList.replaceChildren(...rows);
        } else {
            detail.topWrap.hidden = true;
        }

        const actions = {
            processes: 'İşlemlerde aç', network: 'Bağlantıları aç', docker: 'Docker yöneticisini aç', system: 'Donanım bilgisi', report: 'Sağlık raporu'
        };
        detail.primary.textContent = actions[m.action] || 'Aç';
        detail.primary.dataset.action = m.action;
    }

    function renderSpark(hist, m) {
        const W = 264, H = 72, pad = 6;
        if (!hist.length) { detail.sparkLine.setAttribute('points', ''); return; }
        let min = 0, max = 100;
        if (m.unitless) {
            min = Math.min(...hist);
            max = Math.max(...hist);
            if (max - min < 1) { max += 1; min = Math.max(0, min - 1); }
        }
        const step = W / (HISTORY_LEN - 1);
        const offset = HISTORY_LEN - hist.length;
        const points = hist.map((v, i) => {
            const x = (offset + i) * step;
            const y = H - pad - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (H - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        detail.sparkLine.setAttribute('points', points.join(' '));
        detail.spark.setAttribute('aria-label', `${m.title} geçmişi: son ${hist.length} örnek, şu an ${m.big || m.value}`);
    }

    function render() {
        state.info = buildInfo();
        renderNodes();
        renderSelection();
    }

    // ------------------------------------------------------------------- data
    async function fetchJSON(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${url} → ${res.status}`);
        return res.json();
    }

    // Donanım verisi app.js'in zaten yaptığı /api/stats çağrısından gelir (pytop:stats olayı);
    // böylece yavaş sistemlerde aynı uç noktaya ikinci bir istek yığılmaz.
    window.addEventListener('pytop:stats', (event) => {
        if (state.paused) return;
        state.stats = event.detail;
        const info = buildInfo();
        Object.entries(info).forEach(([key, m]) => pushHistory(key, m.metric));
        state.lastStatsAt = Date.now();
        if (state.active) render();
    });

    // İşlem listesi de app.js'in mevcut /api/processes çağrısından gelir.
    window.addEventListener('pytop:processes', (event) => {
        if (state.paused || !Array.isArray(event.detail)) return;
        const list = event.detail.slice();
        state.topCpu = list.slice().sort((a, b) => (b.cpu || 0) - (a.cpu || 0)).slice(0, 5);
        if (!state.memFromServer) state.topMem = list.slice().sort((a, b) => (b.rss_mb || 0) - (a.rss_mb || 0)).slice(0, 5);
        if (state.active && state.stats) render();
    });

    let memInFlight = false;
    let dockerInFlight = false;
    let lastMemFetch = 0;
    async function poll() {
        if (!state.active || state.paused || document.hidden) return;
        // Bellek sıralaması yalnızca Bellek düğümü seçiliyken ve seyrek olarak sunucudan istenir.
        if (state.selected === 'mem' && !memInFlight && Date.now() - lastMemFetch > DOCKER_REFRESH_MS) {
            memInFlight = true;
            fetchJSON('/api/processes?sort=rss&order=desc&limit=5')
                .then((rows) => {
                    if (Array.isArray(rows)) { state.topMem = rows.slice(0, 5); state.memFromServer = true; }
                    if (state.active && state.stats) render();
                })
                .catch(() => {})
                .finally(() => { memInFlight = false; lastMemFetch = Date.now(); });
        }
        if (!dockerInFlight && Date.now() - state.lastDockerFetch > DOCKER_REFRESH_MS) {
            dockerInFlight = true;
            fetchJSON('/api/docker/containers')
                .then((d) => { state.docker = d; })
                .catch(() => { state.docker = { status: 'Erişilemiyor', containers: [], summary: {} }; })
                .finally(() => {
                    dockerInFlight = false;
                    state.lastDockerFetch = Date.now();
                    if (state.active && state.stats) render();
                });
        }
    }

    function start() {
        stop();
        poll();
        state.timer = setInterval(poll, PROC_REFRESH_MS);
    }
    function stop() {
        if (state.timer) clearInterval(state.timer);
        state.timer = null;
    }

    // ------------------------------------------------------------------ zoom
    function applyZoom() {
        stage.style.width = `${Math.round(BASE_W * state.zoom)}px`;
        stage.style.height = `${Math.round(BASE_H * state.zoom)}px`;
        host.style.transform = `scale(${state.zoom})`;
    }
    function fitZoom() {
        const avail = scroller.clientWidth - 16;
        state.zoom = Math.max(0.5, Math.min(1.25, avail / BASE_W));
        applyZoom();
    }

    // ------------------------------------------------------------- show/hide
    function show() {
        if (state.active) return;
        state.active = true;
        view.hidden = false;
        document.body.classList.add('smap-active');
        document.querySelector('.terminal-root')?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
        if (scroller.clientWidth - 16 < BASE_W) fitZoom(); else applyZoom();
        render();
        start();
    }
    function hide() {
        if (!state.active) return;
        state.active = false;
        view.hidden = true;
        document.body.classList.remove('smap-active');
        stop();
    }

    // ---------------------------------------------------------------- events
    document.querySelectorAll('[data-sidebar-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.sidebarAction;
            if (action === 'system-map') show();
            else if (action === 'overview' || action === 'processes' || action === 'server') hide();
        }, true); // capture: harita, app.js kaydırmadan önce gizlenir
    });

    Object.entries(nodes).forEach(([key, node]) => {
        node.addEventListener('click', () => { state.selected = key; renderSelection(); poll(); });
    });

    view.querySelectorAll('[data-smap-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.filter = btn.dataset.smapFilter;
            view.querySelectorAll('[data-smap-filter]').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
            const groups = { hardware: ['hardware'], processes: ['processes'], docker: ['docker'] };
            const allowed = groups[state.filter];
            const visibleNodes = new Set();
            Object.entries(nodes).forEach(([key, node]) => {
                const visible = !allowed || node.dataset.group === 'all' || allowed.includes(node.dataset.group);
                node.classList.toggle('is-dim', !visible);
                if (visible) visibleNodes.add(key);
            });
            const visibleLinks = new Set();
            Object.entries(PATHS).forEach(([key, ids]) => { if (visibleNodes.has(key)) ids.forEach((id) => visibleLinks.add(id)); });
            Object.entries(links).forEach(([id, link]) => link.classList.toggle('is-dim', !!allowed && !visibleLinks.has(id)));
        });
    });

    const pauseBtn = document.getElementById('smap-pause');
    pauseBtn.addEventListener('click', () => {
        state.paused = !state.paused;
        pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
        pauseBtn.querySelector('span').textContent = state.paused ? 'Devam et' : 'Duraklat';
        view.classList.toggle('is-paused', state.paused);
        document.getElementById('smap-live-label').textContent = state.paused ? 'DURAKLATILDI' : 'CANLI';
        renderNodes();
        if (!state.paused) poll();
    });

    view.querySelectorAll('[data-smap-zoom]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.smapZoom;
            if (mode === 'fit') { fitZoom(); return; }
            state.zoom = Math.max(0.5, Math.min(1.6, +(state.zoom + (mode === 'in' ? 0.1 : -0.1)).toFixed(2)));
            applyZoom();
        });
    });

    detail.primary.addEventListener('click', () => {
        const action = detail.primary.dataset.action;
        const triggers = { network: 'btn-net-modal', docker: 'btn-docker-modal', system: 'btn-sys-modal', report: 'btn-report-modal' };
        if (action === 'processes') {
            document.querySelector('[data-sidebar-action="processes"]')?.click();
        } else if (triggers[action]) {
            document.getElementById(triggers[action])?.click();
        }
    });
    detail.alert.addEventListener('click', () => document.getElementById('btn-alerts-modal')?.click());

    document.addEventListener('visibilitychange', () => {
        if (!state.active) return;
        if (document.hidden) stop(); else start();
    });

    if (location.hash === '#system-map') {
        document.querySelector('[data-sidebar-action="system-map"]')?.click();
    }
})();
