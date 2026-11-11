const { contextBridge, ipcRenderer } = require('electron');

const storage = Object.freeze({
  getItem(key) {
    return ipcRenderer.sendSync('ahs-storage:get', String(key));
  },
  setItem(key, value) {
    ipcRenderer.sendSync('ahs-storage:set', String(key), String(value));
  },
  removeItem(key) {
    ipcRenderer.sendSync('ahs-storage:remove', String(key));
  },
  clear() {
    ipcRenderer.sendSync('ahs-storage:clear');
  },
  key(index) {
    return ipcRenderer.sendSync('ahs-storage:key', Number(index));
  },
  get length() {
    return Object.keys(JSON.parse(ipcRenderer.sendSync('ahs-storage:get-all') || '{}')).length;
  }
});

contextBridge.exposeInMainWorld('ahsDesktopStorage', storage);
contextBridge.exposeInMainWorld('ahsDesktop', Object.freeze({ isDesktop: true }));
