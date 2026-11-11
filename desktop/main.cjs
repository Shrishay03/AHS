const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

let storageFile;
let storedValues = {};

function loadStorage() {
  try {
    storedValues = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    if (!storedValues || typeof storedValues !== 'object' || Array.isArray(storedValues)) storedValues = {};
  } catch {
    storedValues = {};
  }
}

function saveStorage() {
  const temporary = storageFile + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(storedValues), 'utf8');
  fs.renameSync(temporary, storageFile);
}

app.whenReady().then(() => {
  storageFile = path.join(app.getPath('userData'), 'ahs-local-storage.json');
  loadStorage();

  ipcMain.on('ahs-storage:get', (event, key) => {
    event.returnValue = Object.prototype.hasOwnProperty.call(storedValues, key) ? storedValues[key] : null;
  });
  ipcMain.on('ahs-storage:set', (event, key, value) => {
    storedValues[key] = String(value);
    saveStorage();
    event.returnValue = true;
  });
  ipcMain.on('ahs-storage:remove', (event, key) => {
    delete storedValues[key];
    saveStorage();
    event.returnValue = true;
  });
  ipcMain.on('ahs-storage:clear', event => {
    storedValues = {};
    saveStorage();
    event.returnValue = true;
  });
  ipcMain.on('ahs-storage:get-all', event => { event.returnValue = JSON.stringify(storedValues); });
  ipcMain.on('ahs-storage:key', (event, index) => {
    event.returnValue = Object.keys(storedValues)[index] ?? null;
  });

  const packagedSite = path.join(process.resourcesPath, 'site', 'index.html');
  const developmentSite = path.join(__dirname, '..', 'site', 'index.html');
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    backgroundColor: '#f4f6f4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  window.loadFile(app.isPackaged ? packagedSite : developmentSite);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
