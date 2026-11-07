// pyTOP Pro — Sunucu (pyTOP Server) görünümü
// Kenar çubuğundaki "Sunucu" düğmesiyle açılır: bu makinenin sunucu durumu,
// kayıtlı uzak sunucu profilleri (masaüstü uygulaması) ve Linux kurulum adımları.
(function () {
    'use strict';

    const view = document.getElementById('server-view');
    if (!view) return;

    const $ = (id) => document.getElementById(id);
    const bridge = window.pyTopServer; // yalnızca Electron masaüstü uygulamasında tanımlı
    let active = false;

    function setText(id, text, state) {
        const el = $(id);
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('is-ok', state === 'ok');
        el.classList.toggle('is-warn', state === 'warn');
    }

    async function copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const old = button.textContent;
            button.textContent = 'Kopyalandı';
            setTimeout(() => { button.textContent = old; }, 1500);
        } catch {
            button.textContent = 'Kopyalanamadı';
        }
    }

    // ------------------------------------------------------- bu makine
    async function loadLocalInfo() {
        let info;
        try {
            const res = await fetch('/api/server/info', { cache: 'no-store' });
            if (!res.ok) throw new Error(String(res.status));
            info = await res.json();
        } catch (err) {
            setText('sv-remote-pill', 'Bilgi alınamadı', 'warn');
            $('sv-addresses').replaceChildren(Object.assign(document.createElement('li'), { className: 'sv-empty', textContent: 'Sunucu bilgisi okunamadı.' }));
            return;
        }

        setText('sv-hostname', info.hostname || '—');
        setText('sv-version', info.version || '—');
        setText('sv-os', info.os || '—');
        setText('sv-bind', `${info.bind}${info.port ? ':' + info.port : ''}`);
        setText('sv-mode', info.systemd_service ? 'systemd servisi' : 'Uygulama içi');
        setText('sv-token', info.token_configured ? 'Ayarlı' : 'Ayarlı değil', info.token_configured ? 'ok' : (info.remote_enabled ? 'warn' : null));

        const pill = $('sv-remote-pill');
        pill.textContent = info.remote_enabled ? 'Uzak erişim açık' : 'Yalnızca yerel';
        pill.className = `sv-pill ${info.remote_enabled ? 'is-ok' : ''}`;

        const list = $('sv-addresses');
        const port = info.port || 5000;
        const rows = (info.addresses || []).map((a) => {
            const li = document.createElement('li');
            const url = `http://${a.address}:${port}`;
            const addr = Object.assign(document.createElement('span'), { className: 'sv-addr', textContent: url });
            const iface = Object.assign(document.createElement('span'), { className: 'sv-iface', textContent: `${a.interface}${a.private ? '' : ' · genel IP'}` });
            const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'sv-copy', textContent: 'Kopyala' });
            btn.setAttribute('aria-label', `${url} adresini kopyala`);
            btn.addEventListener('click', () => copyText(url, btn));
            li.append(addr, iface, btn);
            return li;
        });
        list.replaceChildren(...(rows.length ? rows : [Object.assign(document.createElement('li'), { className: 'sv-empty', textContent: 'Ağ adresi bulunamadı.' })]));

        const note = $('sv-local-note');
        if (info.remote_enabled && info.token_configured) {
            note.textContent = 'Diğer cihazlar bu adreslerden bağlanıp erişim tokeniyle giriş yapabilir.';
        } else if (info.remote_enabled) {
            note.textContent = 'Uzak erişim açık ama geçerli bir token yok; uzak bağlantılar reddedilir. PYTOP_REMOTE_TOKEN en az 24 karakter olmalı.';
        } else {
            note.textContent = 'Bu makine şu an yalnızca kendi üzerinden izlenebilir. Ağdan erişim için uygulamayı PYTOP_BIND=0.0.0.0 ve en az 24 karakterlik PYTOP_REMOTE_TOKEN ile başlatın ya da Linux için aşağıdaki kurulumu kullanın.';
        }
    }

    // ------------------------------------------------- kayıtlı sunucular
    const form = $('sv-profile-form');
    const status = $('sv-profile-status');
    const profileList = $('sv-profile-list');

    function renderProfiles(profiles = []) {
        $('sv-profile-count').textContent = String(profiles.length);
        if (!profiles.length) {
            profileList.replaceChildren(Object.assign(document.createElement('li'), { className: 'sv-empty', textContent: 'Henüz kayıtlı sunucu yok.' }));
            return;
        }
        profileList.replaceChildren(...profiles.map((profile) => {
            const li = document.createElement('li');
            const text = Object.assign(document.createElement('span'), { className: 'sv-profile-text' });
            text.append(Object.assign(document.createElement('strong'), { textContent: profile.name }), Object.assign(document.createElement('small'), { textContent: profile.url }));
            const actions = Object.assign(document.createElement('span'), { className: 'sv-profile-actions' });
            const connect = Object.assign(document.createElement('button'), { type: 'button', className: 'sv-btn sv-btn-primary', textContent: 'Bağlan' });
            connect.setAttribute('aria-label', `${profile.name} sunucusuna bağlan`);
            connect.addEventListener('click', async () => {
                status.textContent = `${profile.name} sunucusuna bağlanılıyor…`;
                try { await bridge.connect(profile.url); } catch (error) { status.textContent = error.message; }
            });
            const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'sv-btn', textContent: 'Sil' });
            remove.setAttribute('aria-label', `${profile.name} profilini sil`);
            remove.addEventListener('click', async () => {
                try { renderProfiles(await bridge.remove(profile.id)); status.textContent = 'Profil silindi.'; } catch (error) { status.textContent = error.message; }
            });
            actions.append(connect, remove);
            li.append(text, actions);
            return li;
        }));
    }

    if (bridge && bridge.list) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                renderProfiles(await bridge.save({ name: $('sv-profile-name').value, url: $('sv-profile-url').value }));
                form.reset();
                status.textContent = 'Sunucu profili kaydedildi.';
            } catch (error) {
                status.textContent = error.message;
            }
        });
    } else {
        form.setAttribute('aria-disabled', 'true');
        form.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
        profileList.replaceChildren(Object.assign(document.createElement('li'), {
            className: 'sv-empty',
            textContent: 'Sunucu profilleri pyTOP Pro masaüstü uygulamasında kullanılabilir. Tarayıcıdan bağlanmak için sunucu adresini doğrudan açın.'
        }));
    }

    async function loadProfiles() {
        if (!bridge || !bridge.list) return;
        try { renderProfiles(await bridge.list()); } catch (error) { status.textContent = error.message; }
    }

    // -------------------------------------------------------- kurulum
    view.querySelectorAll('.sv-code').forEach((box) => {
        const btn = box.querySelector('.sv-copy');
        btn.addEventListener('click', () => copyText(box.querySelector('code').textContent, btn));
    });

    // --------------------------------------------------- aç / kapat
    function show() {
        active = true;
        view.hidden = false;
        document.body.classList.add('sview-active');
        document.querySelector('.terminal-root')?.scrollTo({ top: 0 });
        loadLocalInfo();
        loadProfiles();
    }
    function hide() {
        if (!active) return;
        active = false;
        view.hidden = true;
        document.body.classList.remove('sview-active');
    }

    document.querySelectorAll('[data-sidebar-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.sidebarAction;
            if (action === 'server') show();
            else if (action === 'overview' || action === 'processes' || action === 'system-map') hide();
        }, true);
    });

    if (location.hash === '#server') {
        document.querySelector('[data-sidebar-action="server"]')?.click();
    }
})();
