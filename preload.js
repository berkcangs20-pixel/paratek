const { contextBridge, ipcRenderer } = require('electron');

const methods = [
  'getMachineId', 'hasValidLicense', 'activateLicense',
  'listCariler', 'getCari', 'addCari', 'updateCari', 'deleteCari', 'setCariNot',
  'listCariHareketler', 'addCariHareket', 'updateCariHareket', 'deleteCariHareket', 'tahsilatOdeme', 'totals',
  'listKasalar', 'addKasa', 'updateKasa', 'deleteKasa', 'listKasaHareketleri', 'addKasaHareket', 'deleteKasaHareket',
  'listBankalar', 'addBanka', 'updateBanka', 'deleteBanka', 'listBankaHareketleri', 'addBankaHareket', 'deleteBankaHareket',
  'listHatirlatmalar', 'addHatirlatma', 'updateHatirlatma', 'deleteHatirlatma', 'tamamlaHatirlatma',
  'rapor',
  'listVarliklar', 'addVarlik', 'updateVarlik', 'deleteVarlik', 'varlikToplamlar',
  'authHasPassword', 'authSetPassword', 'authVerifyPassword', 'authChangePassword',
  'getSettings', 'updateGenelAyarlar', 'resetGenelAyarlar', 'updateTemaAyarlari', 'updateEpostaAyarlari',
  'listKategoriler', 'addKategori', 'renameKategori', 'deleteKategori',
  'listAciklamalar', 'addAciklama', 'updateFirma',
  'backupData', 'restoreData', 'restartApp', 'getAppVersion',
  'checkForUpdates', 'downloadUpdate', 'installUpdate',
  'getDovizKurlari', 'updateDovizKurlari', 'fetchLiveDovizKurlari',
];

const api = {};
for (const m of methods) {
  api[m] = (...args) => ipcRenderer.invoke(m, ...args);
}
api.onNavigateHatirlatmalar = (cb) => ipcRenderer.on('navigate-hatirlatmalar', () => cb());
api.onUpdateDownloadProgress = (cb) => ipcRenderer.on('update-download-progress', (event, percent) => cb(percent));
api.onUpdateDownloaded = (cb) => ipcRenderer.on('update-downloaded', () => cb());

contextBridge.exposeInMainWorld('api', api);

contextBridge.exposeInMainWorld('winControls', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onStateChange: (cb) => ipcRenderer.on('window-state', (event, state) => cb(state)),
});
