const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./dataDir');

const DB_PATH = path.join(DATA_DIR, 'db.json');

function pad(n) {
  return String(n).padStart(8, '0');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function sureMetni(gun) {
  if (gun < 30) return `${gun} gün`;
  const ay = Math.floor(gun / 30);
  const kalanGun = gun % 30;
  return kalanGun > 0 ? `${ay} ay ${kalanGun} gün` : `${ay} ay`;
}

const PARA_BIRIMLERI = ['TL', 'USD', 'EUR', 'GBP'];

function requireText(value, fieldName) {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error(`${fieldName} alanı boş olamaz.`);
  return trimmed;
}

function requireNumber(value, fieldName, { allowNegative = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${fieldName} geçerli bir sayı olmalıdır.`);
  if (!allowNegative && n < 0) throw new Error(`${fieldName} negatif olamaz.`);
  return n;
}

function requireDate(value, fieldName) {
  const v = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(v).getTime())) {
    throw new Error(`${fieldName} geçerli bir tarih olmalıdır.`);
  }
  return v;
}

function normalizeCurrency(value) {
  const v = String(value || 'TL').toUpperCase();
  return PARA_BIRIMLERI.includes(v) ? v : 'TL';
}

function emptyState() {
  return {
    seq: { cari: 0, kasa: 0, banka: 0, islem: 0, hatirlatma: 0, varlik: 0 },
    cariler: [],
    cariHareketler: [],
    kasalar: [],
    kasaHareketleri: [],
    bankalar: [],
    bankaHareketleri: [],
    hatirlatmalar: [],
    varliklar: [],
  };
}

let state = null;

function load() {
  if (state) return state;
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    state = JSON.parse(raw);
    let migrated = false;
    if (!state.varliklar) { state.varliklar = []; migrated = true; }
    if (state.seq.varlik === undefined) { state.seq.varlik = 0; migrated = true; }
    if (migrated) save();
  } catch (e) {
    state = emptyState();
    save();
  }
  return state;
}

function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

// ---------- Hesaplamalar ----------

function cariBakiye(cariId) {
  const s = load();
  return s.cariHareketler
    .filter(h => h.cariId === cariId)
    .reduce((sum, h) => sum + h.tutar, 0);
}

function cariSonIslem(cariId) {
  const s = load();
  const hs = s.cariHareketler.filter(h => h.cariId === cariId);
  if (!hs.length) return null;
  return hs.reduce((a, b) => (a.tarih > b.tarih ? a : b)).tarih;
}

function kasaBakiye(kasaId) {
  const s = load();
  const hs = s.kasaHareketleri.filter(h => h.kasaId === kasaId);
  const gelir = hs.filter(h => h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0);
  const gider = hs.filter(h => h.tur === 'Gider').reduce((a, h) => a + h.tutar, 0);
  return { gelir, gider, bakiye: gelir - gider };
}

function bankaBakiye(bankaId) {
  const s = load();
  const hs = s.bankaHareketleri.filter(h => h.bankaId === bankaId);
  const gelir = hs.filter(h => h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0);
  const gider = hs.filter(h => h.tur === 'Gider').reduce((a, h) => a + h.tutar, 0);
  return { gelir, gider, bakiye: gelir - gider };
}

// ---------- API ----------

const api = {
  // Cari
  listCariler() {
    const s = load();
    return s.cariler.map(c => ({
      ...c,
      bakiye: cariBakiye(c.id),
      sonIslem: cariSonIslem(c.id),
    }));
  },
  getCari(id) {
    const s = load();
    const c = s.cariler.find(x => x.id === id);
    if (!c) return null;
    return { ...c, bakiye: cariBakiye(id), sonIslem: cariSonIslem(id) };
  },
  addCari(data) {
    const s = load();
    const unvan = requireText(data.unvan, 'Unvan');
    if (s.cariler.some(c => c.unvan.trim().toLowerCase() === unvan.toLowerCase())) {
      throw new Error(`"${unvan}" unvanlı bir cari hesap zaten mevcut.`);
    }
    s.seq.cari += 1;
    const c = {
      id: 'c' + Date.now() + s.seq.cari, kod: pad(s.seq.cari),
      unvan, kategori: data.kategori || 'Müşteri',
      pBirim: normalizeCurrency(data.pBirim), yetkili: data.yetkili || '', gsm: data.gsm || '',
      telefon: data.telefon || '', faks: data.faks || '', adres: data.adres || '',
      il: data.il || '', ilce: data.ilce || '', ozelKod: data.ozelKod || '',
      riskLimiti: requireNumber(data.riskLimiti || 0, 'Risk Limiti', { allowNegative: false }),
      aktif: data.aktif !== false,
      notlar: '', createdAt: todayISO(),
    };
    s.cariler.push(c);
    if (data.acilisBakiye) {
      api.addCariHareket(c.id, {
        tur: data.acilisBakiye > 0 ? 'Açılış Borç' : 'Açılış Alacak',
        aciklama: 'Açılış Bakiyesi', tutar: Math.abs(data.acilisBakiye),
        pBirim: c.pBirim, isNegative: data.acilisBakiye < 0,
      });
    }
    save();
    return api.getCari(c.id);
  },
  updateCari(id, data) {
    const s = load();
    const c = s.cariler.find(x => x.id === id);
    if (!c) throw new Error('Cari hesap bulunamadı.');
    const unvan = data.unvan !== undefined ? requireText(data.unvan, 'Unvan') : c.unvan;
    if (s.cariler.some(x => x.id !== id && x.unvan.trim().toLowerCase() === unvan.toLowerCase())) {
      throw new Error(`"${unvan}" unvanlı başka bir cari hesap zaten mevcut.`);
    }
    Object.assign(c, data, {
      unvan,
      riskLimiti: requireNumber(data.riskLimiti != null ? data.riskLimiti : c.riskLimiti, 'Risk Limiti', { allowNegative: false }),
      pBirim: data.pBirim ? normalizeCurrency(data.pBirim) : c.pBirim,
    });
    save();
    return api.getCari(id);
  },
  deleteCari(id) {
    const s = load();
    const c = s.cariler.find(x => x.id === id);
    if (!c) throw new Error('Cari hesap bulunamadı.');
    if (s.cariHareketler.some(h => h.cariId === id)) {
      throw new Error(`"${c.unvan}" hesabının işlem geçmişi olduğu için silinemez. Önce hareketlerini silin veya hesabı pasif yapın.`);
    }
    s.cariler = s.cariler.filter(x => x.id !== id);
    s.hatirlatmalar = s.hatirlatmalar.filter(x => x.cariId !== id);
    save();
    return true;
  },
  setCariNot(id, text) {
    const s = load();
    const c = s.cariler.find(x => x.id === id);
    if (!c) throw new Error('Cari hesap bulunamadı.');
    c.notlar = text;
    save();
    return true;
  },

  // Cari Hareketler
  listCariHareketler(cariId) {
    const s = load();
    const hs = s.cariHareketler
      .filter(h => h.cariId === cariId)
      .sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
    let running = 0;
    return hs.map(h => {
      running += h.tutar;
      return { ...h, bakiye: running };
    });
  },
  addCariHareket(cariId, data) {
    const s = load();
    const cari = s.cariler.find(x => x.id === cariId);
    if (!cari) throw new Error('Cari hesap bulunamadı.');
    requireText(data.tur, 'Hareket Türü');
    const tutar = requireNumber(data.tutar, 'İşlem Tutarı');
    if (tutar === 0) throw new Error('İşlem Tutarı sıfır olamaz.');
    const tarih = requireDate(data.tarih || todayISO(), 'Tarih');
    s.seq.islem += 1;
    const sign = data.isNegative ? -1 : 1;
    const rec = {
      id: 'h' + Date.now() + s.seq.islem, cariId, islemNo: pad(s.seq.islem),
      tarih, saat: data.saat || nowTime(),
      tur: data.tur, aciklama: data.aciklama || '',
      tutar: sign * Math.abs(tutar),
      pBirim: normalizeCurrency(data.pBirim || cari.pBirim), ozelKod: data.ozelKod || '',
    };
    s.cariHareketler.push(rec);
    save();
    return rec;
  },
  updateCariHareket(hareketId, data) {
    const s = load();
    const h = s.cariHareketler.find(x => x.id === hareketId);
    if (!h) throw new Error('Hareket bulunamadı.');
    const sign = data.isNegative ? -1 : (h.tutar < 0 ? -1 : 1);
    if (data.tarih) h.tarih = requireDate(data.tarih, 'Tarih');
    if (data.aciklama !== undefined) h.aciklama = data.aciklama;
    if (data.tur) h.tur = requireText(data.tur, 'Hareket Türü');
    if (data.tutar !== undefined) {
      const tutar = requireNumber(data.tutar, 'İşlem Tutarı');
      if (tutar === 0) throw new Error('İşlem Tutarı sıfır olamaz.');
      h.tutar = sign * Math.abs(tutar);
    }
    save();
    return h;
  },
  deleteCariHareket(hareketId) {
    const s = load();
    const h = s.cariHareketler.find(x => x.id === hareketId);
    if (!h) throw new Error('Hareket bulunamadı.');
    s.cariHareketler = s.cariHareketler.filter(x => x.id !== hareketId);
    save();
    return true;
  },

  // Tahsilat / Ödeme (Kasa veya Banka üzerinden, cari hareket + kasa/banka hareket birlikte)
  tahsilatOdeme(cariId, payload) {
    // payload: { yon: 'Tahsilat'|'Odeme', odemeTuru: 'Nakit'|'Kredi Kartı'|'Havale/EFT', hesapTipi:'Kasa'|'Banka', hesapId, tutar, aciklama, tarih }
    const s = load();
    const cari = s.cariler.find(c => c.id === cariId);
    if (!cari) throw new Error('Cari hesap bulunamadı.');
    requireNumber(payload.tutar, 'İşlem Tutarı', { allowNegative: false });
    if (Number(payload.tutar) <= 0) throw new Error('İşlem Tutarı sıfırdan büyük olmalıdır.');
    if (payload.hesapTipi === 'Kasa' && !s.kasalar.some(k => k.id === payload.hesapId)) {
      throw new Error('Seçilen kasa bulunamadı.');
    }
    if (payload.hesapTipi === 'Banka' && !s.bankalar.some(b => b.id === payload.hesapId)) {
      throw new Error('Seçilen banka hesabı bulunamadı.');
    }
    const isNegative = payload.yon === 'Tahsilat';
    const isTahsilat = payload.yon === 'Tahsilat';
    const turAdi = {
      'Nakit': isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme',
      'Kredi Kartı': isTahsilat ? 'K.Kartı ile Tahsilat' : 'K.Kartı ile Ödeme',
      'Havale/EFT': isTahsilat ? 'Gelen Havale/EFT' : 'Gönderilen Havale/EFT',
    }[payload.odemeTuru] || 'Nakit';

    const cariRec = api.addCariHareket(cariId, {
      tur: turAdi,
      aciklama: payload.aciklama || `${payload.odemeTuru} ${payload.yon}`,
      tutar: payload.tutar, pBirim: cari.pBirim, isNegative,
      tarih: payload.tarih,
    });

    if (payload.hesapTipi === 'Kasa' && payload.hesapId) {
      s.kasaHareketleri.push({
        id: 'kh' + Date.now(), kasaId: payload.hesapId, tarih: payload.tarih || todayISO(),
        tur: isNegative ? 'Gider' : 'Gelir',
        aciklama: `${payload.yon} - ${cari.unvan}`, tutar: Math.abs(Number(payload.tutar) || 0),
        cariId,
      });
    } else if (payload.hesapTipi === 'Banka' && payload.hesapId) {
      s.bankaHareketleri.push({
        id: 'bh' + Date.now(), bankaId: payload.hesapId, tarih: payload.tarih || todayISO(),
        tur: isNegative ? 'Gider' : 'Gelir',
        aciklama: `${payload.yon} - ${cari.unvan}`, tutar: Math.abs(Number(payload.tutar) || 0),
        cariId,
      });
    }
    save();
    return cariRec;
  },

  totals() {
    const s = load();
    const byCurrency = {};
    for (const c of s.cariler) {
      const bal = cariBakiye(c.id);
      if (!byCurrency[c.pBirim]) {
        byCurrency[c.pBirim] = { borc: 0, alacak: 0, tahsilEdilecek: 0, odenecek: 0, bakiye: 0 };
      }
      const hs = s.cariHareketler.filter(h => h.cariId === c.id);
      const borc = hs.filter(h => h.tutar > 0).reduce((a, h) => a + h.tutar, 0);
      const alacak = hs.filter(h => h.tutar < 0).reduce((a, h) => a + h.tutar, 0);
      byCurrency[c.pBirim].borc += borc;
      byCurrency[c.pBirim].alacak += alacak;
      byCurrency[c.pBirim].bakiye += bal;
      if (bal > 0) byCurrency[c.pBirim].tahsilEdilecek += bal;
      if (bal < 0) byCurrency[c.pBirim].odenecek += bal;
    }
    return byCurrency;
  },

  // Kasa
  listKasalar() {
    const s = load();
    return s.kasalar.map(k => ({ ...k, ...kasaBakiye(k.id) }));
  },
  addKasa(data) {
    const s = load();
    const kasaAdi = requireText(data.kasaAdi, 'Kasa Adı');
    s.seq.kasa += 1;
    const k = { id: 'k' + Date.now(), kod: pad(s.seq.kasa), kasaAdi, pBirim: normalizeCurrency(data.pBirim), aktif: data.aktif !== false };
    s.kasalar.push(k);
    save();
    return k;
  },
  updateKasa(id, data) {
    const s = load();
    const k = s.kasalar.find(x => x.id === id);
    if (!k) throw new Error('Kasa bulunamadı.');
    Object.assign(k, data, { kasaAdi: data.kasaAdi !== undefined ? requireText(data.kasaAdi, 'Kasa Adı') : k.kasaAdi });
    save();
    return k;
  },
  deleteKasa(id) {
    const s = load();
    const k = s.kasalar.find(x => x.id === id);
    if (!k) throw new Error('Kasa bulunamadı.');
    if (s.kasaHareketleri.some(h => h.kasaId === id)) {
      throw new Error(`"${k.kasaAdi}" kasasının işlem geçmişi olduğu için silinemez.`);
    }
    s.kasalar = s.kasalar.filter(x => x.id !== id);
    save();
    return true;
  },
  listKasaHareketleri(kasaId) {
    const s = load();
    const hs = s.kasaHareketleri.filter(h => h.kasaId === kasaId).sort((a, b) => a.tarih.localeCompare(b.tarih));
    let running = 0;
    return hs.map(h => {
      running += h.tur === 'Gelir' ? h.tutar : -h.tutar;
      return { ...h, bakiye: running };
    });
  },
  addKasaHareket(kasaId, data) {
    const s = load();
    if (!s.kasalar.some(k => k.id === kasaId)) throw new Error('Kasa bulunamadı.');
    if (!['Gelir', 'Gider'].includes(data.tur)) throw new Error('Tür Gelir veya Gider olmalıdır.');
    const tutar = requireNumber(data.tutar, 'İşlem Tutarı', { allowNegative: false });
    if (tutar === 0) throw new Error('İşlem Tutarı sıfır olamaz.');
    const rec = { id: 'kh' + Date.now(), kasaId, tarih: requireDate(data.tarih || todayISO(), 'Tarih'), tur: data.tur, aciklama: data.aciklama || '', tutar: Math.abs(tutar), cariId: null };
    s.kasaHareketleri.push(rec);
    save();
    return rec;
  },
  deleteKasaHareket(id) {
    const s = load();
    s.kasaHareketleri = s.kasaHareketleri.filter(x => x.id !== id);
    save();
    return true;
  },

  // Banka
  listBankalar() {
    const s = load();
    return s.bankalar.map(b => ({ ...b, ...bankaBakiye(b.id) }));
  },
  addBanka(data) {
    const s = load();
    const bankaAdi = requireText(data.bankaAdi, 'Banka Adı');
    s.seq.banka += 1;
    const b = { id: 'b' + Date.now(), kod: pad(s.seq.banka), bankaAdi, hesapAdi: data.hesapAdi || '', ibanNo: data.ibanNo || '', pBirim: normalizeCurrency(data.pBirim), aktif: data.aktif !== false };
    s.bankalar.push(b);
    save();
    return b;
  },
  updateBanka(id, data) {
    const s = load();
    const b = s.bankalar.find(x => x.id === id);
    if (!b) throw new Error('Banka hesabı bulunamadı.');
    Object.assign(b, data, { bankaAdi: data.bankaAdi !== undefined ? requireText(data.bankaAdi, 'Banka Adı') : b.bankaAdi });
    save();
    return b;
  },
  deleteBanka(id) {
    const s = load();
    const b = s.bankalar.find(x => x.id === id);
    if (!b) throw new Error('Banka hesabı bulunamadı.');
    if (s.bankaHareketleri.some(h => h.bankaId === id)) {
      throw new Error(`"${b.bankaAdi}" banka hesabının işlem geçmişi olduğu için silinemez.`);
    }
    s.bankalar = s.bankalar.filter(x => x.id !== id);
    save();
    return true;
  },
  listBankaHareketleri(bankaId) {
    const s = load();
    const hs = s.bankaHareketleri.filter(h => h.bankaId === bankaId).sort((a, b) => a.tarih.localeCompare(b.tarih));
    let running = 0;
    return hs.map(h => {
      running += h.tur === 'Gelir' ? h.tutar : -h.tutar;
      return { ...h, bakiye: running };
    });
  },
  addBankaHareket(bankaId, data) {
    const s = load();
    if (!s.bankalar.some(b => b.id === bankaId)) throw new Error('Banka hesabı bulunamadı.');
    if (!['Gelir', 'Gider'].includes(data.tur)) throw new Error('Tür Gelir veya Gider olmalıdır.');
    const tutar = requireNumber(data.tutar, 'İşlem Tutarı', { allowNegative: false });
    if (tutar === 0) throw new Error('İşlem Tutarı sıfır olamaz.');
    const rec = { id: 'bh' + Date.now(), bankaId, tarih: requireDate(data.tarih || todayISO(), 'Tarih'), tur: data.tur, aciklama: data.aciklama || '', tutar: Math.abs(tutar), cariId: null };
    s.bankaHareketleri.push(rec);
    save();
    return rec;
  },
  deleteBankaHareket(id) {
    const s = load();
    s.bankaHareketleri = s.bankaHareketleri.filter(x => x.id !== id);
    save();
    return true;
  },

  // Hatırlatmalar
  listHatirlatmalar(cariId) {
    const s = load();
    const today = todayISO();
    let rows = s.hatirlatmalar;
    if (cariId) rows = rows.filter(r => r.cariId === cariId);
    return rows.map(r => {
      const cari = s.cariler.find(c => c.id === r.cariId);
      const gunFark = Math.round((new Date(r.vade) - new Date(today)) / 86400000);
      let durumMetni = r.durum;
      let durumTip = 'bekliyor';
      if (r.durum === 'Tamamlandı') { durumMetni = 'Tamamlandı'; durumTip = 'tamam'; }
      else if (gunFark < 0) { durumMetni = `${sureMetni(-gunFark)} geçti`; durumTip = 'gecikti'; }
      else { durumMetni = `${sureMetni(gunFark)} kaldı`; durumTip = 'bekliyor'; }
      return { ...r, cariUnvan: cari ? cari.unvan : '', durumMetni, durumTip };
    }).sort((a, b) => a.vade.localeCompare(b.vade));
  },
  addHatirlatma(data) {
    const s = load();
    if (!s.cariler.some(c => c.id === data.cariId)) throw new Error('Cari hesap bulunamadı.');
    requireDate(data.vade, 'Vade');
    const toplamTutarCheck = requireNumber(data.tutar, 'Tutar', { allowNegative: false });
    if (toplamTutarCheck <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.');
    const taksitSayisi = Math.max(1, Number(data.taksitSayisi) || 1);
    const toplamTutar = Number(data.tutar) || 0;
    const taksitTutar = Math.round((toplamTutar / taksitSayisi) * 100) / 100;
    const grupId = 'g' + Date.now();
    const created = [];
    for (let i = 0; i < taksitSayisi; i++) {
      s.seq.hatirlatma += 1;
      const vadeTarihi = new Date(data.vade);
      vadeTarihi.setMonth(vadeTarihi.getMonth() + i);
      const r = {
        id: 'r' + Date.now() + '_' + i, cariId: data.cariId, tur: data.tur, aciklama: data.aciklama || '',
        vade: vadeTarihi.toISOString().slice(0, 10),
        tutar: i === taksitSayisi - 1 ? Math.round((toplamTutar - taksitTutar * (taksitSayisi - 1)) * 100) / 100 : taksitTutar,
        pBirim: data.pBirim || 'TL', durum: 'Bekliyor',
        taksitNo: i + 1, taksitSayisi, grupId,
      };
      s.hatirlatmalar.push(r);
      created.push(r);
    }
    save();
    return created;
  },
  updateHatirlatma(id, data) {
    const s = load();
    const r = s.hatirlatmalar.find(x => x.id === id);
    if (!r) throw new Error('Hatırlatma bulunamadı.');
    if (data.vade) requireDate(data.vade, 'Vade');
    if (data.tutar !== undefined) requireNumber(data.tutar, 'Tutar', { allowNegative: false });
    Object.assign(r, data);
    save();
    return r;
  },
  deleteHatirlatma(id) {
    const s = load();
    const before = s.hatirlatmalar.length;
    s.hatirlatmalar = s.hatirlatmalar.filter(x => x.id !== id);
    if (s.hatirlatmalar.length === before) throw new Error('Hatırlatma bulunamadı.');
    save();
    return true;
  },
  tamamlaHatirlatma(id) {
    const s = load();
    const r = s.hatirlatmalar.find(x => x.id === id);
    if (!r) throw new Error('Hatırlatma bulunamadı.');
    r.durum = 'Tamamlandı';
    save();
    return r;
  },

  // Raporlar
  rapor(filter) {
    const s = load();
    let rows = [];
    for (const h of s.cariHareketler) {
      const c = s.cariler.find(x => x.id === h.cariId);
      if (!c) continue;
      if (filter.baslangic && h.tarih < filter.baslangic) continue;
      if (filter.bitis && h.tarih > filter.bitis) continue;
      if (filter.kategori && filter.kategori !== 'Tümü' && c.kategori !== filter.kategori) continue;
      rows.push({
        tarih: h.tarih, tur: h.tur, unvan: c.unvan,
        borc: h.tutar > 0 ? h.tutar : 0, alacak: h.tutar < 0 ? -h.tutar : 0,
        pBirim: h.pBirim, aciklama: h.aciklama,
      });
    }
    rows.sort((a, b) => b.tarih.localeCompare(a.tarih));
    return rows;
  },

  // Varlıklarım
  listVarliklar() {
    const s = load();
    return [...s.varliklar].sort((a, b) => b.kod.localeCompare(a.kod));
  },
  addVarlik(data) {
    const s = load();
    const ad = requireText(data.ad, 'Ad');
    const alisDegeri = requireNumber(data.alisDegeri || 0, 'Alış Değeri', { allowNegative: false });
    s.seq.varlik += 1;
    const v = {
      id: 'v' + Date.now(), kod: pad(s.seq.varlik),
      ad, kategori: data.kategori || 'Demirbaş', durum: data.durum || 'Aktif',
      alisTarihi: requireDate(data.alisTarihi || todayISO(), 'Alış Tarihi'), alisDegeri,
      guncelDeger: data.guncelDeger != null ? requireNumber(data.guncelDeger, 'Güncel Değer', { allowNegative: false }) : alisDegeri,
      pBirim: normalizeCurrency(data.pBirim),
      satisTarihi: data.satisTarihi || null, satisDegeri: data.satisDegeri != null ? Number(data.satisDegeri) : null,
      aciklama: data.aciklama || '',
    };
    s.varliklar.push(v);
    save();
    return v;
  },
  updateVarlik(id, data) {
    const s = load();
    const v = s.varliklar.find(x => x.id === id);
    if (!v) throw new Error('Varlık bulunamadı.');
    Object.assign(v, data, {
      ad: data.ad !== undefined ? requireText(data.ad, 'Ad') : v.ad,
      alisDegeri: data.alisDegeri != null ? requireNumber(data.alisDegeri, 'Alış Değeri', { allowNegative: false }) : v.alisDegeri,
      guncelDeger: data.guncelDeger != null ? requireNumber(data.guncelDeger, 'Güncel Değer', { allowNegative: false }) : v.guncelDeger,
      satisDegeri: data.satisDegeri != null && data.satisDegeri !== '' ? Number(data.satisDegeri) : v.satisDegeri,
    });
    save();
    return v;
  },
  deleteVarlik(id) {
    const s = load();
    const before = s.varliklar.length;
    s.varliklar = s.varliklar.filter(x => x.id !== id);
    if (s.varliklar.length === before) throw new Error('Varlık bulunamadı.');
    save();
    return true;
  },
  varlikToplamlar() {
    const s = load();
    const byCurrency = {};
    for (const v of s.varliklar) {
      if (!byCurrency[v.pBirim]) byCurrency[v.pBirim] = { aktif: 0, pasif: 0, satildi: 0, satisGeliri: 0, toplamDeger: 0 };
      const grp = byCurrency[v.pBirim];
      if (v.durum === 'Aktif') { grp.aktif += v.guncelDeger; grp.toplamDeger += v.guncelDeger; }
      else if (v.durum === 'Pasif') { grp.pasif += v.guncelDeger; grp.toplamDeger += v.guncelDeger; }
      else if (v.durum === 'Satıldı') { grp.satildi += 1; grp.satisGeliri += v.satisDegeri || 0; }
    }
    return byCurrency;
  },
};

module.exports = api;
