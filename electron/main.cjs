const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs/promises');

let backend;
let windowRef;
let stopping = false;
let updateCheckInProgress = false;
const trustedOrigins = new Set();

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.logger = console;

async function checkForUpdates(manual = false) {
  const supportsAutoUpdate = process.platform === 'win32' || (process.platform === 'linux' && Boolean(process.env.APPIMAGE));
  if (!app.isPackaged || !supportsAutoUpdate) {
    if (manual) await dialog.showMessageBox(windowRef, {
      type: 'info', title: 'pyTOP Pro güncellemesi',
      message: 'Otomatik güncelleme Windows ve AppImage paketlerinde kullanılabilir. Debian paketi için dağıtımınızın paket yöneticisini kullanın.'
    });
    return { status: 'unsupported' };
  }
  if (updateCheckInProgress) return { status: 'checking' };

  updateCheckInProgress = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.isUpdateAvailable) {
      if (manual) await dialog.showMessageBox(windowRef, {
        type: 'info', title: 'pyTOP Pro güncellemesi', message: `Uygulamanız güncel (v${app.getVersion()}).`
      });
      return { status: 'current' };
    }

    const version = result.updateInfo.version;
    windowRef?.webContents.send('updates:status', { state: 'available', version });
    return { status: 'available', version };
  } catch (error) {
    console.error('pyTOP update check:', error);
    if (manual) await dialog.showMessageBox(windowRef, {
      type: 'error', title: 'Güncelleme kontrolü başarısız', message: error.message || 'GitHub Release kontrol edilemedi.'
    });
    return { status: 'error' };
  } finally {
    updateCheckInProgress = false;
  }
}

ipcMain.handle('updates:check', () => checkForUpdates(true));
ipcMain.handle('updates:download', async () => {
  windowRef?.webContents.send('updates:status', { state: 'downloading' });
  await autoUpdater.downloadUpdate();
  windowRef?.webContents.send('updates:status', { state: 'downloaded' });
  return { status: 'downloaded' };
});
ipcMain.handle('updates:install', () => autoUpdater.quitAndInstall());

async function readServerProfiles() {
  try { return JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'server-profiles.json'), 'utf8')); }
  catch { return []; }
}
ipcMain.handle('servers:list', readServerProfiles);
ipcMain.handle('servers:save', async (_event, profile) => {
  if (!profile || typeof profile.name !== 'string' || typeof profile.url !== 'string') throw new Error('Profil adı ve adres gerekli.');
  const name = profile.name.trim().slice(0, 48);
  let url;
  try { url = new URL(profile.url.trim()); } catch { throw new Error('Sunucu adresi geçersiz.'); }
  if (!name || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Profil adı ve geçerli http(s) adresi girin.');
  const profiles = await readServerProfiles();
  const id = profile.id || require('node:crypto').randomUUID();
  const next = [...profiles.filter(item => item.id !== id), { id, name, url: url.origin }].slice(-20);
  await fs.writeFile(path.join(app.getPath('userData'), 'server-profiles.json'), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
});
ipcMain.handle('servers:delete', async (_event, id) => {
  const next = (await readServerProfiles()).filter(item => item.id !== id);
  await fs.writeFile(path.join(app.getPath('userData'), 'server-profiles.json'), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
});

ipcMain.handle('server:connect', async (_event, address) => {
  if (typeof address !== 'string' || address.length > 2048) throw new Error('Geçerli bir sunucu adresi girin.');
  let target;
  try { target = new URL(address); } catch { throw new Error('Sunucu adresi https:// veya http:// ile başlamalı.'); }
  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
    throw new Error('Adres yalnızca http(s) sunucu adresi olabilir; kullanıcı bilgisi veya ek parametre içeremez.');
  }
  target.pathname = target.pathname.replace(/\/$/, '') || '/';
  trustedOrigins.add(target.origin);
  await windowRef.loadURL(target.toString());
  return { status: 'connected', origin: target.origin };
});

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function backendHealthy(port) {
  return new Promise(resolve => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/healthz', timeout: 800 }, response => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function waitForBackend(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await backendHealthy(port)) return;
    if (!backend || backend.exitCode !== null) throw new Error('pyTOP servis süreci başlatılamadı.');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('pyTOP servisi zamanında hazır olmadı.');
}

function startBackend(port) {
  const executableName = process.platform === 'win32' ? 'pyTOP-Backend.exe' : 'pyTOP-Backend';
  const executable = path.join(process.resourcesPath, 'backend', executableName);
  if (!app.isPackaged) {
    const python = process.env.PYTOP_PYTHON || 'python';
    const projectRoot = path.resolve(__dirname, '..');
    backend = spawn(python, ['app.py'], {
      cwd: projectRoot,
      windowsHide: true,
      env: { ...process.env, PYTOP_BIND: '127.0.0.1', PYTOP_PORT: String(port), PYTOP_NO_BROWSER: '1' },
      stdio: 'ignore'
    });
  } else {
    backend = spawn(executable, [], {
      cwd: app.getPath('userData'),
      windowsHide: true,
      env: { ...process.env, PYTOP_BIND: '127.0.0.1', PYTOP_PORT: String(port), PYTOP_NO_BROWSER: '1' },
      stdio: 'ignore'
    });
  }
  backend.once('error', error => console.error('pyTOP backend:', error));
  backend.once('exit', () => { if (!stopping && windowRef) windowRef.webContents.send('backend-exited'); });
}

function createWindow(url) {
  trustedOrigins.add(new URL(url).origin);
  windowRef = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0d1117',
    title: 'pyTOP Pro',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  windowRef.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith('https://github.com/kkaan-42/Pytop-Html/releases/')) {
      shell.openExternal(target);
    }
    return { action: 'deny' };
  });
  windowRef.webContents.on('will-navigate', (event, target) => {
    try {
      if (!trustedOrigins.has(new URL(target).origin)) event.preventDefault();
    } catch { event.preventDefault(); }
  });
  windowRef.once('ready-to-show', () => windowRef.show());
  windowRef.on('closed', () => { windowRef = null; });
  windowRef.loadURL(url);
}

async function stopBackend() {
  stopping = true;
  if (backend && backend.exitCode === null) backend.kill();
}

app.whenReady().then(async () => {
  try {
    const port = await reservePort();
    startBackend(port);
    await waitForBackend(port);
    createWindow(`http://127.0.0.1:${port}/`);
    setTimeout(() => checkForUpdates(false), 10000);
  } catch (error) {
    await dialog.showMessageBox({ type: 'error', title: 'pyTOP Pro başlatılamadı', message: error.message });
    await stopBackend();
    app.quit();
  }
});

app.on('before-quit', stopBackend);
app.on('window-all-closed', () => app.quit());
