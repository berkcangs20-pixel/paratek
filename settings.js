const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./dataDir');

const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

function defaults() {
  return {
    genel: {
      oturumSuresi: 30,
      hatirlatma: 'Vade günü hatırlat',
      varsayilanSiralamaAlan: 'İşlem Sırası',
      varsayilanSiralamaYon: 'Azalan',
      varsayilanSorgu: 'Unvan ile Hızlı Ara',
      varsayilanKategori: 'Tümü',
      icerikArama: 'Tüm içerikte ara',
      pasifHesaplariGoster: true,
      silmeSifreSor: false,
      aciklamalarGoster: true,
      altToplamlarGoster: true,
    },
    tema: {
      mod: 'Koyu',
      otomatikBaslangic: '07:00',
      otomatikBitis: '19:00',
      vurgu: 'green',
    },
    eposta: {
      sunucu: '', port: '', kullaniciAdi: '', sifre: '', gonderenAdi: '',
    },
    kategoriler: ['Müşteri', 'Tedarikçi', 'Personel'],
    aciklamalar: {},
    firma: { ad: '' },
    dovizKurlari: {
      USD: { alis: 34.10, satis: 34.35 },
      EUR: { alis: 37.05, satis: 37.35 },
      GBP: { alis: 43.20, satis: 43.60 },
      guncellenme: null,
    },
  };
}

let state = null;

function load() {
  if (state) return state;
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    state = { ...defaults(), ...JSON.parse(raw) };
  } catch (e) {
    state = defaults();
    save();
  }
  return state;
}

function save() {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

module.exports = {
  getSettings() {
    return load();
  },
  updateGenelAyarlar(data) {
    const s = load();
    Object.assign(s.genel, data);
    save();
    return s.genel;
  },
  updateTemaAyarlari(data) {
    const s = load();
    Object.assign(s.tema, data);
    save();
    return s.tema;
  },
  updateEpostaAyarlari(data) {
    const s = load();
    Object.assign(s.eposta, data);
    save();
    return s.eposta;
  },
  resetGenelAyarlar() {
    const s = load();
    s.genel = defaults().genel;
    save();
    return s.genel;
  },
  listKategoriler(cariler) {
    const s = load();
    return s.kategoriler.map((name) => ({
      name,
      count: cariler ? cariler.filter((c) => c.kategori === name).length : 0,
    }));
  },
  addKategori(name) {
    const s = load();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Kategori adı boş olamaz.');
    if (s.kategoriler.includes(trimmed)) throw new Error('Bu kategori zaten mevcut.');
    s.kategoriler.push(trimmed);
    save();
    return s.kategoriler;
  },
  renameKategori(oldName, newName) {
    const s = load();
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new Error('Kategori adı boş olamaz.');
    const idx = s.kategoriler.indexOf(oldName);
    if (idx === -1) throw new Error('Kategori bulunamadı.');
    s.kategoriler[idx] = trimmed;
    save();
    return { oldName, newName: trimmed };
  },
  updateDovizKurlari(data) {
    const s = load();
    s.dovizKurlari = { ...s.dovizKurlari, ...data, guncellenme: new Date().toISOString() };
    save();
    return s.dovizKurlari;
  },
  updateFirma(data) {
    const s = load();
    if (!s.firma) s.firma = { ad: '' };
    Object.assign(s.firma, data);
    save();
    return s.firma;
  },
  listAciklamalar(key) {
    const s = load();
    if (!s.aciklamalar) s.aciklamalar = {};
    return s.aciklamalar[key] || [];
  },
  addAciklama(key, text) {
    const s = load();
    if (!s.aciklamalar) s.aciklamalar = {};
    const trimmed = (text || '').trim();
    if (!trimmed) return s.aciklamalar[key] || [];
    if (!s.aciklamalar[key]) s.aciklamalar[key] = [];
    if (!s.aciklamalar[key].includes(trimmed)) {
      s.aciklamalar[key].unshift(trimmed);
      s.aciklamalar[key] = s.aciklamalar[key].slice(0, 30);
      save();
    }
    return s.aciklamalar[key];
  },
  deleteKategori(name, cariler) {
    const s = load();
    const inUse = cariler && cariler.some((c) => c.kategori === name);
    if (inUse) throw new Error('Bu kategoriye ait cari hesaplar var, önce onları başka bir kategoriye taşıyın.');
    s.kategoriler = s.kategoriler.filter((k) => k !== name);
    save();
    return s.kategoriler;
  },
};
