const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pyTopUpdater', {
  check: () => ipcRenderer.invoke('updates:check'),
  onStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  }
});
