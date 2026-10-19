const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('padron', {
  getBaseUrl: () => ipcRenderer.sendSync('padron:get-base-url'),
  getApiUrl: () => ipcRenderer.sendSync('padron:get-api-url'),
});
