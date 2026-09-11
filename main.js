const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const auth = require('./auth');
const settings = require('./settings');
const license = require('./license');
const { DATA_DIR } = require('./dataDir');

let win;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.paratek.app');
  app.commandLine.appendSwitch('high-dpi-support', '1');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[renderer] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.log(`[did-fail-load] ${code} ${desc}`);
  });
  win.on('maximize', () => win.webContents.send('window-state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('window-state', { maximized: false }));
  if (process.env.MUHASEBEE_DEBUG) win.webContents.openDevTools();
}

function showStartupNotification() {
  if (!Notification.isSupported()) return;
  const list = db.listHatirlatmalar();
  const gecikti = list.filter((r) => r.durumTip === 'gecikti');
  const bekliyor = list.filter((r) => r.durumTip === 'bekliyor');
  if (!gecikti.length && !bekliyor.length) return;

  let body;
  if (gecikti.length) {
    body = `${gecikti.length} hatırlatmanın vadesi geçti`;
    if (bekliyor.length) body += `, ${bekliyor.length} hatırlatma bekliyor`;
  } else {
    body = `${bekliyor.length} bekleyen hatırlatmanız var`;
  }

  const notification = new Notification({
    title: 'Paratek - Hatırlatmalar',
    body,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
  });
  notification.on('click', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.send('navigate-hatirlatmalar');
  });
  notification.show();
}

app.whenReady().then(() => {
  createWindow();
  showStartupNotification();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Pencere kontrolleri
ipcMain.handle('window-minimize', () => win.minimize());
ipcMain.handle('window-maximize-toggle', () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.handle('window-close', () => win.close());
ipcMain.handle('window-is-maximized', () => win.isMaximized());

// Lisans
ipcMain.handle('getMachineId', () => license.getMachineId());
ipcMain.handle('hasValidLicense', () => license.hasValidLicense());
ipcMain.handle('activateLicense', (event, key) => license.activate(key));

// Kimlik doğrulama
ipcMain.handle('authHasPassword', () => auth.hasPassword());
ipcMain.handle('authSetPassword', (event, password) => auth.setPassword(password));
ipcMain.handle('authVerifyPassword', (event, password) => auth.verifyPassword(password));
ipcMain.handle('authChangePassword', (event, oldPassword, newPassword) => auth.changePassword(oldPassword, newPassword));

// Ayarlar
ipcMain.handle('getSettings', () => settings.getSettings());
ipcMain.handle('updateGenelAyarlar', (event, data) => settings.updateGenelAyarlar(data));
ipcMain.handle('resetGenelAyarlar', () => settings.resetGenelAyarlar());
ipcMain.handle('updateTemaAyarlari', (event, data) => settings.updateTemaAyarlari(data));
ipcMain.handle('updateEpostaAyarlari', (event, data) => settings.updateEpostaAyarlari(data));
ipcMain.handle('listKategoriler', () => settings.listKategoriler(db.listCariler()));
ipcMain.handle('addKategori', (event, name) => settings.addKategori(name));
ipcMain.handle('renameKategori', (event, oldName, newName) => settings.renameKategori(oldName, newName));
ipcMain.handle('deleteKategori', (event, name) => settings.deleteKategori(name, db.listCariler()));
ipcMain.handle('updateFirma', (event, data) => settings.updateFirma(data));
ipcMain.handle('listAciklamalar', (event, key) => settings.listAciklamalar(key));
ipcMain.handle('addAciklama', (event, key, text) => settings.addAciklama(key, text));
ipcMain.handle('getDovizKurlari', () => settings.getSettings().dovizKurlari);
ipcMain.handle('updateDovizKurlari', (event, data) => settings.updateDovizKurlari(data));
ipcMain.handle('fetchLiveDovizKurlari', async () => {
  const res = await fetch('https://open.er-api.com/v6/latest/TRY');
  if (!res.ok) throw new Error('Kur servisine ulaşılamadı.');
  const data = await res.json();
  if (!data.rates || !data.rates.USD) throw new Error('Kur verisi okunamadı.');
  const round2 = (n) => Math.round(n * 100) / 100;
  const invert = (r) => 1 / r;
  const update = {
    USD: { alis: round2(invert(data.rates.USD) * 0.997), satis: round2(invert(data.rates.USD) * 1.003) },
    EUR: { alis: round2(invert(data.rates.EUR) * 0.997), satis: round2(invert(data.rates.EUR) * 1.003) },
    GBP: { alis: round2(invert(data.rates.GBP) * 0.997), satis: round2(invert(data.rates.GBP) * 1.003) },
  };
  return settings.updateDovizKurlari(update);
});

// Yedekleme
ipcMain.handle('backupData', async () => {
  const result = await dialog.showSaveDialog(win, {
    title: 'Yedek Al',
    defaultPath: `paratek-yedek-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'Paratek Yedek Dosyası', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const readJson = (name) => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8')); }
    catch (e) { return null; }
  };
  const bundle = {
    tip: 'paratek-yedek',
    surum: 1,
    tarih: new Date().toISOString(),
    db: readJson('db.json'),
    settings: readJson('settings.json'),
    auth: readJson('auth.json'),
  };
  fs.writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8');
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('restoreData', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Yedekten Geri Yükle',
    filters: [{ name: 'Paratek Yedek Dosyası', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };

  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
  } catch (e) {
    return { canceled: false, error: 'Dosya okunamadı veya bozuk.' };
  }
  if (bundle.tip !== 'paratek-yedek' || !bundle.db || !bundle.settings) {
    return { canceled: false, error: 'Bu dosya geçerli bir Paratek yedeği değil.' };
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'db.json'), JSON.stringify(bundle.db, null, 2), 'utf-8');
  fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(bundle.settings, null, 2), 'utf-8');
  if (bundle.auth) {
    fs.writeFileSync(path.join(DATA_DIR, 'auth.json'), JSON.stringify(bundle.auth, null, 2), 'utf-8');
  }
  return { canceled: false, success: true };
});

ipcMain.handle('getAppVersion', () => app.getVersion());

ipcMain.handle('restartApp', () => {
  app.relaunch();
  app.exit(0);
});

// Tüm db.js fonksiyonlarını IPC üzerinden expose et
for (const key of Object.keys(db)) {
  if (typeof db[key] === 'function') {
    ipcMain.handle(key, (event, ...args) => db[key](...args));
  }
}
