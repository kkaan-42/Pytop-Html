const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const http = require('node:http');

let backend;
let windowRef;
let stopping = false;
let updateCheckInProgress = false;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.logger = console;

async function checkForUpdates(manual = false) {
  if (!app.isPackaged || process.platform !== 'win32') {
    if (manual) await dialog.showMessageBox(windowRef, {
      type: 'info', title: 'pyTOP Pro güncellemesi', message: 'Otomatik güncellemeler Windows masaüstü sürümünde kullanılabilir.'
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
    const { response } = await dialog.showMessageBox(windowRef, {
      type: 'info', title: 'pyTOP Pro güncellemesi bulundu',
      message: `pyTOP Pro v${version} bulundu. Güncelleme indirilsin mi?`,
      buttons: ['İndir', 'Daha sonra'], defaultId: 0, cancelId: 1
    });
    if (response !== 0) return { status: 'deferred', version };

    if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send('updates:status', { state: 'downloading', version });
    await autoUpdater.downloadUpdate();
    if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send('updates:status', { state: 'downloaded', version });
    const install = await dialog.showMessageBox(windowRef, {
      type: 'info', title: 'Güncelleme hazır',
      message: `pyTOP Pro v${version} indirildi. Kurulumu tamamlamak için uygulamayı yeniden başlatın.`,
      buttons: ['Şimdi yeniden başlat', 'Daha sonra'], defaultId: 0, cancelId: 1
    });
    if (install.response === 0) autoUpdater.quitAndInstall();
    return { status: 'downloaded', version };
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
  const executable = path.join(process.resourcesPath, 'backend', 'pyTOP-Backend.exe');
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
    if (!target.startsWith(url)) event.preventDefault();
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
