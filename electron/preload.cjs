const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pyTopUpdater', {
  check: () => ipcRenderer.invoke('updates:check'),
  download: () => ipcRenderer.invoke('updates:download'),
  install: () => ipcRenderer.invoke('updates:install'),
  onStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  }
});

contextBridge.exposeInMainWorld('pyTopServer', {
  connect: address => ipcRenderer.invoke('server:connect', address),
  list: () => ipcRenderer.invoke('servers:list'),
  save: profile => ipcRenderer.invoke('servers:save', profile),
  remove: id => ipcRenderer.invoke('servers:delete', id)
});
