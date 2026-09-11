import { iconEl, Icon } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, toastError, withErrorToast, confirmDialog, confirmDeleteRich, field, row, btn, openDropdown, openContextMenu, menuItem, menuDivider, menuCheckbox, menuSubmenu, menuColorItem, quickAddButton, setShortcuts } from '../ui.js';
import { fmtMoney, moneyClass, fmtDate, todayISO, nowTimeHM, parseTRNumber, formatTRNumberInput } from '../format.js';
import { openHatirlatmaForm, yonOf, isaretHtml, buildHatirlatmaIsaretleSubmenu } from './hatirlatmalar.js';

const KATEGORILER = ['Müşteri', 'Tedarikçi', 'Personel'];
const PARA_BIRIMLERI = ['TL', 'USD', 'EUR'];
const HAREKET_TURLERI = ['Borç', 'Alacak', 'Açılış Borç', 'Açılış Alacak'];
const ODEME_TURLERI = ['Nakit Tahsilat', 'Nakit Ödeme', 'K.Kartı ile Tahsilat', 'K.Kartı ile Ödeme', 'Gelen Havale/EFT', 'Gönderilen Havale/EFT'];

function tagClass(kategori) {
  if (kategori === 'Müşteri') return 'tag-musteri';
  if (kategori === 'Tedarikçi') return 'tag-tedarikci';
  return 'tag-personel';
}

export const MARK_COLORS = { red: '#e05a5a', orange: '#d99a3d', green: '#4caf6f', purple: '#9d6fd1' };
const MARK_LABELS = { red: 'Kırmızı', orange: 'Turuncu', green: 'Yeşil', purple: 'Mor' };

function tagBarHtml(cari) {
  if (cari.isaret && MARK_COLORS[cari.isaret]) {
    return `<span class="tag-bar" style="background:${MARK_COLORS[cari.isaret]}"></span>`;
  }
  return `<span class="tag-bar ${tagClass(cari.kategori)}"></span>`;
}

export function buildIsaretleSubmenu(current, onPick) {
  return menuSubmenu({
    icon: 'tag', label: 'İşaretle',
    buildItems: (subPanel) => {
      subPanel.append(
        menuColorItem({ label: 'Yok', color: null, selected: !current, onClick: () => onPick(null) }),
        ...Object.keys(MARK_COLORS).map((key) => menuColorItem({
          label: MARK_LABELS[key], color: MARK_COLORS[key], selected: current === key, onClick: () => onPick(key),
        })),
      );
    },
  });
}

export async function renderCari(container, params, navigate) {
  if (params.cariId) {
    return renderDetay(container, params.cariId, navigate);
  }
  return renderListe(container, navigate);
}

// =================== LISTE ===================

async function renderListe(container, navigate) {
  const appSettings = await window.api.getSettings();
  const filterState = { search: '', kategori: appSettings.genel.varsayilanKategori || 'Tümü', pBirim: 'Tümü' };
  let selectedId = null;
  let cariler = await window.api.listCariler();
  let kategoriler = (await window.api.listKategoriler()).map((k) => k.name);
  let pendingCariIds = new Set();

  async function loadPending() {
    const all = await window.api.listHatirlatmalar();
    pendingCariIds = new Set(all.filter((r) => r.durumTip !== 'tamam').map((r) => r.cariId));
  }
  await loadPending();

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  function filtered() {
    return cariler
      .filter((c) => appSettings.genel.pasifHesaplariGoster !== false || c.aktif !== false)
      .filter((c) => !filterState.search || c.unvan.toLowerCase().includes(filterState.search.toLowerCase()))
      .filter((c) => filterState.kategori === 'Tümü' || c.kategori === filterState.kategori)
      .filter((c) => filterState.pBirim === 'Tümü' || c.pBirim === filterState.pBirim);
  }

  async function refresh() {
    cariler = await window.api.listCariler();
    kategoriler = (await window.api.listKategoriler()).map((k) => k.name);
    await loadPending();
    draw();
  }

  function draw() {
    view.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('cari'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Cari Hesaplar';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);

    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const searchBtn = document.createElement('div');
    searchBtn.className = 'icon-btn';
    searchBtn.appendChild(iconEl('search'));
    searchBtn.onclick = () => filterBar.querySelector('input')?.focus();
    const printBtn = document.createElement('div');
    printBtn.className = 'icon-btn';
    printBtn.appendChild(iconEl('print'));
    printBtn.onclick = () => window.print();
    function buildCariMenuItems(close, c) {
      const items = [];
      items.push(menuItem({ icon: 'arrowRight', label: 'Hesap Hareketleri', shortcut: 'Enter', onClick: () => { close(); if (c) navigate('cari', { cariId: c.id }); else toast('Önce bir cari hesap seçin.'); } }));
      items.push(menuDivider());
      items.push(menuItem({ icon: 'refresh', label: 'Yenile', shortcut: 'F5', onClick: () => { close(); refresh(); } }));
      items.push(menuItem({ icon: 'search', label: 'Hızlı Ara', shortcut: 'F3', onClick: () => { close(); filterBar.querySelector('input')?.focus(); } }));
      items.push(menuItem({ icon: 'filter', label: 'Detaylı Ara', shortcut: 'Ctrl+F3', onClick: () => { close(); openListeDetayliAra(filterState, () => { drawTable(); drawBottom(); }); } }));
      items.push(menuDivider());
      items.push(menuItem({ icon: 'note', label: 'Notlar', shortcut: 'Ctrl+N', onClick: () => { close(); if (c) openNotlar(c, refresh); else toast('Önce bir cari hesap seçin.'); } }));
      items.push(menuItem({ icon: 'hatirlatma', label: 'Hatırlatmalar', shortcut: 'Ctrl+H', onClick: () => { close(); navigate('hatirlatmalar'); } }));
      items.push(menuDivider());
      items.push(menuItem({ icon: 'plus', label: 'Cari Kart Ekle', shortcut: 'Ctrl+E', onClick: () => { close(); openCariForm(null, refresh, kategoriler); } }));
      items.push(menuItem({ icon: 'swap', label: 'Cari Kart Değiştir', shortcut: 'Ctrl+D', onClick: () => { close(); if (c) openCariForm(c, refresh, kategoriler); else toast('Önce bir cari hesap seçin.'); } }));
      items.push(menuItem({ icon: 'close', label: 'Cari Kart Sil', shortcut: 'Ctrl+S', onClick: () => withErrorToast(async () => {
        close();
        if (!c) { toast('Önce bir cari hesap seçin.'); return; }
        const ok = await confirmDialog(`"${c.unvan}" cari hesabını silmek istediğinize emin misiniz?`);
        if (ok) { await window.api.deleteCari(c.id); selectedId = null; toast('Cari hesap silindi.'); await refresh(); }
      }) }));
      items.push(menuDivider());
      items.push(menuItem({ icon: 'calc', label: 'Listeyi Topla', shortcut: 'Ctrl+T', onClick: () => { close(); showToplamlar(); } }));
      items.push(menuItem({ icon: 'print', label: 'Listeyi Yazdır', shortcut: 'Ctrl+Y', onClick: () => { close(); window.print(); } }));
      items.push(menuDivider());
      items.push(menuItem({ icon: 'raporlar', label: 'Ayrıntılar', shortcut: 'Ctrl+A', onClick: () => { close(); if (c) openAyrintilar(c); else toast('Önce bir cari hesap seçin.'); } }));
      items.push(menuDivider());
      items.push(buildIsaretleSubmenu(c?.isaret, (key) => withErrorToast(async () => {
        close();
        if (!c) { toast('Önce bir cari hesap seçin.'); return; }
        await window.api.updateCari(c.id, { isaret: key });
        toastSuccess(key ? 'Cari işaretlendi.' : 'İşaret kaldırıldı.');
        await refresh();
      })));
      return items;
    }

    const menuBtn = document.createElement('div');
    menuBtn.className = 'icon-btn primary';
    menuBtn.appendChild(iconEl('menu'));
    menuBtn.onclick = () => openDropdown(menuBtn, (panel, close) => {
      const selected = cariler.find((x) => x.id === selectedId);
      panel.append(...buildCariMenuItems(close, selected));
    });
    actions.append(searchBtn, printBtn, menuBtn);
    header.appendChild(actions);
    view.appendChild(header);

    // Filter bar
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';

    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.appendChild(iconEl('search', 'lead'));
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Unvan ile Hızlı Ara';
    searchInput.value = filterState.search;
    searchInput.oninput = () => { filterState.search = searchInput.value; drawTable(); drawBottom(); };
    searchBox.appendChild(searchInput);
    filterBar.appendChild(searchBox);

    filterBar.appendChild(selectFilter(['Tümü', ...kategoriler], filterState.kategori, (v) => { filterState.kategori = v; drawTable(); drawBottom(); }));
    filterBar.appendChild(selectFilter(['Tümü', ...PARA_BIRIMLERI], filterState.pBirim, (v) => { filterState.pBirim = v; drawTable(); drawBottom(); }));
    view.appendChild(filterBar);

    // Table
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    view.appendChild(bottomBar);

    function drawTable() {
      tableWrap.innerHTML = '';
      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>Kod</th><th>Unvan</th><th>Kategori</th><th>Son İşlem</th><th style="text-align:right">Bakiye</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      const rows = filtered();
      if (!rows.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Kayıt bulunamadı</td></tr>`;
      }
      for (const c of rows) {
        const tr = document.createElement('tr');
        if (c.id === selectedId) tr.classList.add('selected');
        const badges = [
          pendingCariIds.has(c.id) ? `<span class="row-mini-icon" title="Bekleyen hatırlatma">${Icon.clock}</span>` : '',
          c.notlar && c.notlar.trim() ? `<span class="row-mini-icon note" title="Not var">${Icon.note}</span>` : '',
        ].join('');
        tr.innerHTML = `
          <td>${c.kod}</td>
          <td>${tagBarHtml(c)}${escapeHtml(c.unvan)}${badges}</td>
          <td>${c.kategori}</td>
          <td>${c.sonIslem ? fmtDate(c.sonIslem) : '-'}</td>
          <td style="text-align:right" class="amount ${moneyClass(c.bakiye)}">${fmtMoney(c.bakiye, c.pBirim)}</td>
        `;
        tr.onclick = () => { selectedId = c.id; drawTable(); drawBottom(); };
        tr.ondblclick = () => navigate('cari', { cariId: c.id });
        tr.oncontextmenu = (e) => {
          e.preventDefault();
          selectedId = c.id; drawTable(); drawBottom();
          openContextMenu(e.clientX, e.clientY, (panel, close) => {
            panel.append(...buildCariMenuItems(close, c));
          });
        };
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    function drawBottom() {
      bottomBar.innerHTML = '';
      const ekleBtn = btn('Ekle', 'primary', 'plus');
      ekleBtn.onclick = () => openCariForm(null, async () => { await refresh(); }, kategoriler);

      const degistirBtn = btn('Değiştir', '', 'swap');
      degistirBtn.disabled = !selectedId;
      degistirBtn.onclick = () => {
        const c = cariler.find((x) => x.id === selectedId);
        if (c) openCariForm(c, async () => { await refresh(); }, kategoriler);
      };

      const silBtn = btn('Sil', 'danger', 'close');
      silBtn.disabled = !selectedId;
      silBtn.onclick = () => withErrorToast(async () => {
        const c = cariler.find((x) => x.id === selectedId);
        if (!c) return;
        const ok = await confirmDialog(`"${c.unvan}" cari hesabını silmek istediğinize emin misiniz?`);
        if (ok) {
          await window.api.deleteCari(c.id);
          selectedId = null;
          toast('Cari hesap silindi.');
          await refresh();
        }
      });

      const spacer = document.createElement('div');
      spacer.className = 'spacer';

      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = `${filtered().length} / ${cariler.length}`;

      const toplaBtn = document.createElement('div');
      toplaBtn.className = 'icon-btn';
      toplaBtn.title = 'Listeyi Topla';
      toplaBtn.appendChild(iconEl('calc'));
      toplaBtn.onclick = () => showToplamlar();

      const hareketBtn = btn('Hesap Hareketleri', 'primary', 'arrowRight');
      hareketBtn.disabled = !selectedId;
      hareketBtn.onclick = () => navigate('cari', { cariId: selectedId });

      bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count, toplaBtn, hareketBtn);
    }

    drawTable();
    drawBottom();

    setShortcuts({
      F5: () => refresh(),
      F3: () => filterBar.querySelector('input')?.focus(),
      'Ctrl+F3': () => openListeDetayliAra(filterState, () => { drawTable(); drawBottom(); }),
      'Ctrl+N': () => { const c = cariler.find((x) => x.id === selectedId); if (c) openNotlar(c, refresh); else toast('Önce bir cari hesap seçin.'); },
      'Ctrl+H': () => navigate('hatirlatmalar'),
      'Ctrl+E': () => openCariForm(null, refresh, kategoriler),
      'Ctrl+D': () => { const c = cariler.find((x) => x.id === selectedId); if (c) openCariForm(c, refresh, kategoriler); else toast('Önce bir cari hesap seçin.'); },
      'Ctrl+S': () => withErrorToast(async () => {
        const c = cariler.find((x) => x.id === selectedId);
        if (!c) { toast('Önce bir cari hesap seçin.'); return; }
        const ok = await confirmDialog(`"${c.unvan}" cari hesabını silmek istediğinize emin misiniz?`);
        if (ok) { await window.api.deleteCari(c.id); selectedId = null; toast('Cari hesap silindi.'); await refresh(); }
      }),
      'Ctrl+T': () => showToplamlar(),
      'Ctrl+Y': () => window.print(),
      'Ctrl+A': () => { const c = cariler.find((x) => x.id === selectedId); if (c) openAyrintilar(c); else toast('Önce bir cari hesap seçin.'); },
      Enter: () => { if (selectedId) navigate('cari', { cariId: selectedId }); },
    });
  }

  async function showToplamlar() {
    const totals = await window.api.totals();
    const body = document.createElement('div');
    body.className = 'totals-list';
    const currencies = Object.keys(totals);
    if (!currencies.length) {
      body.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:20px;">Kayıt yok</div>`;
    }
    currencies.forEach((cur, idx) => {
      const t = totals[cur];
      body.innerHTML += `
        <div class="totals-row section">${cur} Hesapları</div>
        <div class="totals-row"><span>Toplam Borç</span><b>${fmtMoney(t.borc, cur)}</b></div>
        <div class="totals-row"><span>Toplam Alacak</span><b>${fmtMoney(t.alacak, cur)}</b></div>
        <div class="totals-row bold"><span>Toplam Tahsil Edilecek</span><b>${fmtMoney(t.tahsilEdilecek, cur)}</b></div>
        <div class="totals-row bold"><span>Toplam Ödenecek</span><b>${fmtMoney(t.odenecek, cur)}</b></div>
        <div class="totals-row grand"><span>Toplam Bakiye</span><b>${fmtMoney(t.bakiye, cur)}</b></div>
      `;
    });
    openModal({ title: 'Toplamlar', bodyEl: body });
  }

  draw();
}

async function openListeDetayliAra(filterState, onApply) {
  const kategoriler = (await window.api.listKategoriler()).map((k) => k.name);
  const body = document.createElement('div');
  const unvanField = field({ label: 'Unvan', value: filterState.search });
  body.appendChild(row(unvanField));
  const kategoriField = field({ label: 'Kategori', options: ['Tümü', ...kategoriler], value: filterState.kategori });
  const pBirimField = field({ label: 'P.Birim', options: ['Tümü', ...PARA_BIRIMLERI], value: filterState.pBirim });
  body.appendChild(row(kategoriField, pBirimField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const temizleBtn = btn('Temizle', '', 'close');
  temizleBtn.onclick = () => {
    filterState.search = ''; filterState.kategori = 'Tümü'; filterState.pBirim = 'Tümü';
    closeModal(); onApply();
  };
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const araBtn = btn('Şimdi Ara', 'primary', 'search');
  araBtn.onclick = () => {
    filterState.search = unvanField.input.value;
    filterState.kategori = kategoriField.input.value;
    filterState.pBirim = pBirimField.input.value;
    closeModal(); onApply();
  };
  footer.append(temizleBtn, spacer, araBtn);
  openModal({ title: 'Detaylı Ara', size: 'narrow', bodyEl: body, footerEl: footer });
}

function openAyrintilar(c) {
  const body = document.createElement('div');
  body.className = 'totals-list';
  body.innerHTML = `
    <div class="totals-row"><span>Unvan</span><b>${escapeHtml(c.unvan)}</b></div>
    <div class="totals-row"><span>Kategori</span><b>${c.kategori}</b></div>
    <div class="totals-row"><span>Yetkili</span><b>${c.yetkili || '-'}</b></div>
    <div class="totals-row"><span>Gsm</span><b>${c.gsm || '-'}</b></div>
    <div class="totals-row"><span>Telefon</span><b>${c.telefon || '-'}</b></div>
    <div class="totals-row"><span>Adres</span><b>${c.adres || '-'}</b></div>
    <div class="totals-row"><span>İl / İlçe</span><b>${[c.il, c.ilce].filter(Boolean).join(' / ') || '-'}</b></div>
    <div class="totals-row"><span>Risk Limiti</span><b>${fmtMoney(c.riskLimiti, c.pBirim)}</b></div>
    <div class="totals-row"><span>Oluşturulma Tarihi</span><b>${c.createdAt ? fmtDate(c.createdAt) : '-'}</b></div>
    <div class="totals-row grand"><span>Bakiye</span><b>${fmtMoney(c.bakiye, c.pBirim)}</b></div>
  `;
  openModal({ title: `Ayrıntılar - ${c.unvan}`, size: 'narrow', bodyEl: body });
}

function selectFilter(options, value, onChange) {
  const box = document.createElement('div');
  box.className = 'select-box';
  box.appendChild(iconEl('search', 'lead'));
  const select = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  }
  select.value = value;
  select.onchange = () => onChange(select.value);
  box.appendChild(select);
  box.appendChild(iconEl('chevronDown', 'trail'));
  return box;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// =================== CARI KART FORM ===================

function openCariForm(existing, onSaved, kategoriler = KATEGORILER) {
  const isEdit = !!existing;
  const body = document.createElement('div');

  const kodField = field({ label: 'Kod', value: isEdit ? existing.kod : '(otomatik)' });
  kodField.input.disabled = true;
  const ozelKodField = field({ label: 'Özel Kod', value: existing?.ozelKod || '' });
  body.appendChild(row(kodField, ozelKodField));

  const unvanField = field({ label: 'Unvan', value: existing?.unvan || '', placeholder: 'Firma / Kişi unvanı' });
  body.appendChild(row(unvanField));

  const yetkiliField = field({ label: 'Yetkili', value: existing?.yetkili || '' });
  const gsmField = field({ label: 'Gsm', value: existing?.gsm || '' });
  body.appendChild(row(yetkiliField, gsmField));

  const telField = field({ label: 'Telefon', value: existing?.telefon || '' });
  const faksField = field({ label: 'Faks', value: existing?.faks || '' });
  body.appendChild(row(telField, faksField));

  const adresField = field({ label: 'Adres', value: existing?.adres || '' });
  body.appendChild(row(adresField));

  const ilField = field({ label: 'İl', value: existing?.il || '' });
  const ilceField = field({ label: 'İlçe', value: existing?.ilce || '' });
  body.appendChild(row(ilField, ilceField));

  const kategoriField = field({ label: 'Kategori', options: kategoriler, value: existing?.kategori || kategoriler[0] || 'Müşteri' });
  const riskField = field({ label: 'Risk Limiti', type: 'money', value: existing?.riskLimiti || 0 });
  body.appendChild(row(kategoriField, riskField));

  const pBirimField = field({ label: 'P.Birim', options: PARA_BIRIMLERI, value: existing?.pBirim || 'TL' });
  const bakiyeField = isEdit
    ? field({ label: 'Bakiye', value: fmtMoney(existing.bakiye, existing.pBirim) })
    : field({ label: 'Açılış Bakiyesi', type: 'money', value: 0 });
  if (isEdit) bakiyeField.input.disabled = true;
  body.appendChild(row(pBirimField, bakiyeField));

  const aktifWrap = document.createElement('div');
  aktifWrap.className = 'checkbox-row';
  const aktifCheck = document.createElement('input');
  aktifCheck.type = 'checkbox';
  aktifCheck.checked = existing ? existing.aktif !== false : true;
  const aktifLabel = document.createElement('span');
  aktifLabel.textContent = 'Aktif';
  aktifWrap.append(aktifCheck, aktifLabel);
  body.appendChild(aktifWrap);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    if (!unvanField.input.value.trim()) { toast('Unvan alanı zorunludur.'); return; }
    const data = {
      ozelKod: ozelKodField.input.value,
      unvan: unvanField.input.value.trim(),
      yetkili: yetkiliField.input.value,
      gsm: gsmField.input.value,
      telefon: telField.input.value,
      faks: faksField.input.value,
      adres: adresField.input.value,
      il: ilField.input.value,
      ilce: ilceField.input.value,
      kategori: kategoriField.input.value,
      riskLimiti: parseTRNumber(riskField.input.value),
      pBirim: pBirimField.input.value,
      aktif: aktifCheck.checked,
    };
    if (isEdit) {
      await window.api.updateCari(existing.id, data);
      toastSuccess('Cari hesap güncellendi.');
    } else {
      data.acilisBakiye = parseTRNumber(bakiyeField.input.value);
      await window.api.addCari(data);
      toastSuccess('Cari hesap eklendi.');
    }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);

  openModal({ title: isEdit ? 'Cari Kart' : 'Cari Kart Ekle', bodyEl: body, footerEl: footer });
}

// =================== DETAY (Hesap Hareketleri) ===================

async function renderDetay(container, cariId, navigate) {
  let cari = await window.api.getCari(cariId);
  if (!cari) { navigate('cari'); return; }
  let hareketler = await window.api.listCariHareketler(cariId);
  let bekleyenHatirlatmalar = (await window.api.listHatirlatmalar(cariId)).filter((r) => r.durumTip !== 'tamam');
  let selectedHareketId = null;
  const searchState = { text: '', tur: 'Tümü', ilkTarih: '', sonTarih: '' };

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() {
    cari = await window.api.getCari(cariId);
    hareketler = await window.api.listCariHareketler(cariId);
    bekleyenHatirlatmalar = (await window.api.listHatirlatmalar(cariId)).filter((r) => r.durumTip !== 'tamam');
    draw();
  }

  function filteredHareketler() {
    return hareketler
      .filter((h) => !searchState.text || h.aciklama.toLowerCase().includes(searchState.text.toLowerCase()))
      .filter((h) => searchState.tur === 'Tümü' || h.tur === searchState.tur)
      .filter((h) => !searchState.ilkTarih || h.tarih >= searchState.ilkTarih)
      .filter((h) => !searchState.sonTarih || h.tarih <= searchState.sonTarih);
  }

  function draw() {
    view.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    const backBtn = document.createElement('div');
    backBtn.className = 'icon-btn back';
    backBtn.appendChild(iconEl('chevronLeft'));
    backBtn.onclick = () => navigate('cari');
    titleGroup.appendChild(backBtn);
    const h1 = document.createElement('h1');
    h1.textContent = cari.unvan;
    titleGroup.appendChild(h1);
    const sub = document.createElement('span');
    sub.className = 'sub amount ' + moneyClass(cari.bakiye);
    sub.textContent = fmtMoney(cari.bakiye, cari.pBirim);
    titleGroup.appendChild(sub);
    header.appendChild(titleGroup);

    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const searchIconBtn = document.createElement('div');
    searchIconBtn.className = 'icon-btn';
    searchIconBtn.title = 'Detaylı Ara';
    searchIconBtn.appendChild(iconEl('search'));
    searchIconBtn.onclick = () => openDetayliAra(searchState, () => drawTable());
    const printBtn = document.createElement('div');
    printBtn.className = 'icon-btn';
    printBtn.appendChild(iconEl('print'));
    printBtn.onclick = () => window.print();
    function openListeyiTopla() {
      const rowsNow = filteredHareketler();
      const borc = rowsNow.filter((x) => x.tutar > 0).reduce((a, x) => a + x.tutar, 0);
      const alacak = rowsNow.filter((x) => x.tutar < 0).reduce((a, x) => a - x.tutar, 0);
      const modalBody = document.createElement('div');
      modalBody.className = 'totals-list';
      modalBody.innerHTML = `
        <div class="totals-row"><span>Kayıt Sayısı</span><b>${rowsNow.length}</b></div>
        <div class="totals-row"><span>Toplam Borç</span><b>${fmtMoney(borc, cari.pBirim)}</b></div>
        <div class="totals-row"><span>Toplam Alacak</span><b>${fmtMoney(alacak, cari.pBirim)}</b></div>
        <div class="totals-row grand"><span>Fark</span><b>${fmtMoney(borc - alacak, cari.pBirim)}</b></div>
      `;
      openModal({ title: 'Listeyi Topla', size: 'narrow', bodyEl: modalBody });
    }

    function buildDetayMenuItems(close, rowHareket) {
      function getSelected() { return rowHareket || hareketler.find((x) => x.id === selectedHareketId); }
      return [
        menuItem({ icon: 'chevronLeft', label: 'Geri', shortcut: 'BkSp', onClick: () => { close(); navigate('cari'); } }),
        menuItem({ icon: 'refresh', label: 'Yenile', shortcut: 'F5', onClick: () => { close(); refresh(); } }),
        menuItem({ icon: 'search', label: 'Hızlı Ara', shortcut: 'F3', onClick: () => { close(); view.querySelector('.search-box input')?.focus(); } }),
        menuItem({ icon: 'filter', label: 'Detaylı Ara', shortcut: 'Ctrl+F3', onClick: () => { close(); openDetayliAra(searchState, () => drawTable()); } }),
        menuItem({ icon: 'building', label: 'Kart Bilgileri', shortcut: 'Ctrl+K', onClick: async () => { close(); const kats = (await window.api.listKategoriler()).map((k) => k.name); openCariForm(cari, refresh, kats); } }),
        menuDivider(),
        menuItem({ icon: 'plus', label: 'Ekle', shortcut: 'Ctrl+E', onClick: () => { close(); openEkleMenu(menuBtn, cari, refresh); } }),
        menuItem({ icon: 'swap', label: 'Değiştir', shortcut: 'Ctrl+D', onClick: () => {
          close();
          const h = getSelected();
          if (h) openHareketForm(cari, h, async () => { await refresh(); }); else toast('Önce bir hareket seçin.');
        } }),
        menuItem({ icon: 'close', label: 'Sil', shortcut: 'Ctrl+S', onClick: () => withErrorToast(async () => {
          close();
          const h = getSelected();
          if (!h) { toast('Önce bir hareket seçin.'); return; }
          const ok = await confirmDialog('Bu hareketi silmek istediğinize emin misiniz?');
          if (ok) { await window.api.deleteCariHareket(h.id); selectedHareketId = null; toast('Hareket silindi.'); await refresh(); }
        }) }),
        menuItem({ icon: 'note', label: 'Kopyala', shortcut: 'Ctrl+C', onClick: () => withErrorToast(async () => {
          close();
          const h = getSelected();
          if (!h) { toast('Önce bir hareket seçin.'); return; }
          await window.api.addCariHareket(cari.id, { tur: h.tur, aciklama: h.aciklama, tutar: Math.abs(h.tutar), pBirim: h.pBirim, isNegative: h.tutar < 0, tarih: todayISO() });
          toast('Hareket kopyalandı.');
          await refresh();
        }) }),
        menuDivider(),
        menuItem({ icon: 'note', label: 'Notlar', shortcut: 'Ctrl+N', onClick: () => { close(); openNotlar(cari, refresh); } }),
        menuItem({ icon: 'calc', label: 'Listeyi Topla', shortcut: 'Ctrl+T', onClick: () => { close(); openListeyiTopla(); } }),
        menuItem({ icon: 'print', label: 'Listeyi Yazdır', shortcut: 'Ctrl+Y', onClick: () => { close(); window.print(); } }),
        menuDivider(),
        menuItem({ icon: 'raporlar', label: 'Ayrıntılar', shortcut: 'Ctrl+A', onClick: () => { close(); openAyrintilar(cari); } }),
        menuDivider(),
        buildIsaretleSubmenu(cari.isaret, (key) => withErrorToast(async () => {
          close();
          await window.api.updateCari(cari.id, { isaret: key });
          toastSuccess(key ? 'Cari işaretlendi.' : 'İşaret kaldırıldı.');
          await refresh();
        })),
      ];
    }

    const menuBtn = document.createElement('div');
    menuBtn.className = 'icon-btn primary';
    menuBtn.appendChild(iconEl('menu'));
    menuBtn.onclick = () => openDropdown(menuBtn, (panel, close) => {
      panel.append(...buildDetayMenuItems(close, null));
    });
    actions.append(searchIconBtn, printBtn, menuBtn);
    header.appendChild(actions);
    view.appendChild(header);

    // filter bar
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.appendChild(iconEl('search', 'lead'));
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Açıklama ile Hızlı Ara';
    searchInput.value = searchState.text;
    searchInput.oninput = () => { searchState.text = searchInput.value; drawTable(); };
    searchBox.appendChild(searchInput);
    filterBar.appendChild(searchBox);
    filterBar.appendChild(selectFilter(['Tümü', ...HAREKET_TURLERI, ...ODEME_TURLERI], searchState.tur, (v) => { searchState.tur = v; drawTable(); }));
    view.appendChild(filterBar);

    const tahsilatBekleyen = bekleyenHatirlatmalar.filter((r) => yonOf(r.tur) === 'Tahsilat');
    const odemeBekleyen = bekleyenHatirlatmalar.filter((r) => yonOf(r.tur) === 'Odeme');
    for (const [grp, kelime] of [[tahsilatBekleyen, 'tahsilat'], [odemeBekleyen, 'ödeme']]) {
      if (!grp.length) continue;
      const toplam = grp.reduce((a, r) => a + r.tutar, 0);
      const banner = document.createElement('div');
      banner.className = 'banner';
      banner.style.cursor = 'pointer';
      banner.title = 'Hatırlatmaları görüntüle';
      banner.appendChild(iconEl('hatirlatma'));
      const span = document.createElement('span');
      span.innerHTML = `Toplam <b>${fmtMoney(toplam, cari.pBirim)}</b> ${kelime} bekleyen <b>${grp.length}</b> hatırlatma mevcut`;
      banner.appendChild(span);
      banner.onclick = () => openCariHatirlatmalarModal(cari, refresh);
      view.appendChild(banner);
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    view.appendChild(tableWrap);

    const footerSummary = document.createElement('div');
    footerSummary.className = 'footer-summary';
    view.appendChild(footerSummary);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    view.appendChild(bottomBar);

    function drawTable() {
      tableWrap.innerHTML = '';
      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>Tarih</th><th>İşlem No</th><th>Tür</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      const rows = filteredHareketler();
      if (!rows.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Hareket bulunamadı</td></tr>`;
      }
      for (const h of rows) {
        const tr = document.createElement('tr');
        if (h.id === selectedHareketId) tr.classList.add('selected');
        tr.innerHTML = `
          <td>${fmtDate(h.tarih)}</td>
          <td>${h.islemNo}</td>
          <td>${h.tur}</td>
          <td>${escapeHtml(h.aciklama)}</td>
          <td style="text-align:right" class="amount ${moneyClass(h.tutar)}">${fmtMoney(h.tutar, h.pBirim)}</td>
          <td style="text-align:right" class="amount ${moneyClass(h.bakiye)}">${fmtMoney(h.bakiye, h.pBirim)}</td>
        `;
        tr.onclick = () => { selectedHareketId = h.id; drawTable(); drawBottom(); };
        tr.oncontextmenu = (e) => {
          e.preventDefault();
          selectedHareketId = h.id; drawTable(); drawBottom();
          openContextMenu(e.clientX, e.clientY, (panel, close) => {
            panel.append(...buildDetayMenuItems(close, h));
          });
        };
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);

      const rows2 = hareketler;
      const toplamBorc = rows2.filter((h) => h.tutar > 0).reduce((a, h) => a + h.tutar, 0);
      const toplamAlacak = rows2.filter((h) => h.tutar < 0).reduce((a, h) => a - h.tutar, 0);
      footerSummary.innerHTML = `
        <span>Kategori: <b>${cari.kategori}</b></span>
        <span>Toplam Borç: <b>${fmtMoney(toplamBorc, cari.pBirim)}</b></span>
        <span>Toplam Alacak: <b>${fmtMoney(toplamAlacak, cari.pBirim)}</b></span>
        <span>Bakiye: <b class="amount ${moneyClass(cari.bakiye)}">${fmtMoney(cari.bakiye, cari.pBirim)}</b></span>
      `;
    }

    function drawBottom() {
      bottomBar.innerHTML = '';
      const ekleBtn = btn('Ekle', 'primary', 'plus');
      ekleBtn.onclick = () => openEkleMenu(ekleBtn, cari, refresh);

      const degistirBtn = btn('Değiştir', '', 'swap');
      degistirBtn.disabled = !selectedHareketId;
      degistirBtn.onclick = () => {
        const h = hareketler.find((x) => x.id === selectedHareketId);
        if (h) openHareketForm(cari, h, async () => { await refresh(); });
      };

      const silBtn = btn('Sil', 'danger', 'close');
      silBtn.disabled = !selectedHareketId;
      silBtn.onclick = () => withErrorToast(async () => {
        const ok = await confirmDialog('Bu hareketi silmek istediğinize emin misiniz?');
        if (ok) {
          await window.api.deleteCariHareket(selectedHareketId);
          selectedHareketId = null;
          toast('Hareket silindi.');
          await refresh();
        }
      });

      const spacer = document.createElement('div');
      spacer.className = 'spacer';

      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = `${filteredHareketler().length} / ${hareketler.length}`;

      const hatirlatmaBtn = document.createElement('div');
      hatirlatmaBtn.className = 'icon-btn';
      hatirlatmaBtn.title = 'Hatırlatmalar';
      hatirlatmaBtn.appendChild(iconEl('clock'));
      hatirlatmaBtn.onclick = () => openCariHatirlatmalarModal(cari, refresh);

      const notlarBtn = document.createElement('div');
      notlarBtn.className = 'icon-btn';
      notlarBtn.title = 'Notlar';
      notlarBtn.appendChild(iconEl('note'));
      notlarBtn.onclick = () => openNotlar(cari, refresh);

      const grafikBtn = document.createElement('div');
      grafikBtn.className = 'icon-btn';
      grafikBtn.title = 'Bakiye Grafiği';
      grafikBtn.appendChild(iconEl('chart'));
      grafikBtn.onclick = () => openBakiyeGrafigi(cari, hareketler);

      const geriBtn = btn('Geri', 'primary', 'chevronLeft');
      geriBtn.onclick = () => navigate('cari');

      bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count, hatirlatmaBtn, notlarBtn, grafikBtn, geriBtn);
    }

    drawTable();
    drawBottom();

    setShortcuts({
      Backspace: () => navigate('cari'),
      F5: () => refresh(),
      F3: () => view.querySelector('.search-box input')?.focus(),
      'Ctrl+F3': () => openDetayliAra(searchState, () => drawTable()),
      'Ctrl+K': () => withErrorToast(async () => {
        const kats = (await window.api.listKategoriler()).map((k) => k.name);
        openCariForm(cari, refresh, kats);
      }),
      'Ctrl+E': () => openEkleMenu(menuBtn, cari, refresh),
      F9: () => openHareketForm(cari, null, refresh, 'Borç'),
      F10: () => openOdemeTuru(cari, 'Tahsilat', refresh),
      F11: () => openHareketForm(cari, null, refresh, 'Alacak'),
      F12: () => openOdemeTuru(cari, 'Odeme', refresh),
      'Ctrl+D': () => {
        const h = hareketler.find((x) => x.id === selectedHareketId);
        if (h) openHareketForm(cari, h, async () => { await refresh(); }); else toast('Önce bir hareket seçin.');
      },
      'Ctrl+S': () => withErrorToast(async () => {
        const h = hareketler.find((x) => x.id === selectedHareketId);
        if (!h) { toast('Önce bir hareket seçin.'); return; }
        const ok = await confirmDialog('Bu hareketi silmek istediğinize emin misiniz?');
        if (ok) { await window.api.deleteCariHareket(h.id); selectedHareketId = null; toast('Hareket silindi.'); await refresh(); }
      }),
      'Ctrl+C': () => withErrorToast(async () => {
        const h = hareketler.find((x) => x.id === selectedHareketId);
        if (!h) { toast('Önce bir hareket seçin.'); return; }
        await window.api.addCariHareket(cari.id, { tur: h.tur, aciklama: h.aciklama, tutar: Math.abs(h.tutar), pBirim: h.pBirim, isNegative: h.tutar < 0, tarih: todayISO() });
        toast('Hareket kopyalandı.');
        await refresh();
      }),
      'Ctrl+N': () => openNotlar(cari, refresh),
      'Ctrl+T': () => openListeyiTopla(),
      'Ctrl+Y': () => window.print(),
      'Ctrl+A': () => openAyrintilar(cari),
    });
  }

  draw();
}

function openEkleMenu(anchorEl, cari, onDone) {
  openDropdown(anchorEl, (panel, close) => {
    let acilisBorc = false;
    let acilisAlacak = false;
    const acilisBorcCb = menuCheckbox({ label: 'Açılış Borç', onChange: (v) => { acilisBorc = v; } });
    const acilisAlacakCb = menuCheckbox({ label: 'Açılış Alacak', onChange: (v) => { acilisAlacak = v; } });

    panel.append(
      menuItem({
        icon: 'plus', label: 'Borç Ekle', shortcut: 'F9', sub: 'Müşteri', onClick: () => {
          close();
          openHareketForm(cari, null, onDone, acilisBorc ? 'Açılış Borç' : 'Borç');
        },
      }),
      menuItem({
        icon: 'cash', label: 'Tahsilat Yap', shortcut: 'F10', sub: 'Müşteri', onClick: () => {
          close();
          openOdemeTuru(cari, 'Tahsilat', onDone);
        },
      }),
      menuDivider(),
      menuItem({
        icon: 'plus', label: 'Alacak Ekle', shortcut: 'F11', sub: 'Tedarikçi', onClick: () => {
          close();
          openHareketForm(cari, null, onDone, acilisAlacak ? 'Açılış Alacak' : 'Alacak');
        },
      }),
      menuItem({
        icon: 'transfer', label: 'Ödeme Yap', shortcut: 'F12', sub: 'Tedarikçi', onClick: () => {
          close();
          openOdemeTuru(cari, 'Odeme', onDone);
        },
      }),
      menuDivider(),
      acilisBorcCb,
      acilisAlacakCb,
    );
  });
}

function openDetayliAra(searchState, onApply) {
  const body = document.createElement('div');
  const ilkTarihField = field({ label: 'İlk Tarih', type: 'date', value: searchState.ilkTarih || '' });
  const sonTarihField = field({ label: 'Son Tarih', type: 'date', value: searchState.sonTarih || '' });
  body.appendChild(row(ilkTarihField, sonTarihField));

  const turField = field({ label: 'İşlem Türü', options: ['Tümü', ...HAREKET_TURLERI, ...ODEME_TURLERI], value: searchState.tur });
  body.appendChild(row(turField));

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const temizleBtn = btn('Temizle', '', 'close');
  temizleBtn.onclick = () => {
    searchState.ilkTarih = ''; searchState.sonTarih = ''; searchState.tur = 'Tümü'; searchState.text = '';
    closeModal();
    onApply();
  };
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const araBtn = btn('Şimdi Ara', 'primary', 'search');
  araBtn.onclick = () => {
    searchState.ilkTarih = ilkTarihField.input.value;
    searchState.sonTarih = sonTarihField.input.value;
    searchState.tur = turField.input.value;
    closeModal();
    onApply();
  };
  footer.append(temizleBtn, spacer, araBtn);

  openModal({ title: 'Detaylı Hareket Ara', bodyEl: body, footerEl: footer });
}

function openBakiyeGrafigi(cari, hareketler) {
  const body = document.createElement('div');
  if (!hareketler.length) {
    body.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:30px;">Grafik için yeterli hareket yok.</div>`;
    openModal({ title: `Bakiye Grafiği - ${cari.unvan}`, size: 'wide', bodyEl: body });
    return;
  }
  const w = 680, h = 280, padL = 60, padR = 20, padT = 20, padB = 34;
  const values = hareketler.map((h) => h.bakiye);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const range = maxV - minV || 1;
  const x = (i) => padL + (i / Math.max(1, values.length - 1)) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - minV) / range) * (h - padT - padB);

  const linePoints = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const zeroY = y(0);
  const isPos = cari.bakiye >= 0;
  const strokeColor = isPos ? 'var(--red)' : 'var(--blue)';

  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const v = minV + (range * i) / 4;
    const gy = y(v);
    gridLines += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="var(--border-soft)" stroke-width="1"/>`;
    gridLines += `<text x="${padL - 8}" y="${gy + 4}" text-anchor="end" font-size="10.5" fill="var(--text-faint)">${Math.round(v).toLocaleString('tr-TR')}</text>`;
  }

  const dateLabels = [];
  const step = Math.max(1, Math.floor(values.length / 6));
  hareketler.forEach((hh, i) => {
    if (i % step === 0 || i === values.length - 1) {
      dateLabels.push(`<text x="${x(i)}" y="${h - padB + 16}" text-anchor="middle" font-size="10" fill="var(--text-faint)">${fmtDate(hh.tarih)}</text>`);
    }
  });

  body.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${gridLines}
      <line x1="${padL}" y1="${zeroY}" x2="${w - padR}" y2="${zeroY}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="3,3"/>
      <polyline points="${linePoints}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${strokeColor}"/>`).join('')}
      ${dateLabels.join('')}
    </svg>
    <div style="text-align:center; color:var(--text-dim); font-size:13px; margin-top:6px;">
      Güncel Bakiye: <b class="amount ${moneyClass(cari.bakiye)}" style="font-size:15px;">${fmtMoney(cari.bakiye, cari.pBirim)}</b>
    </div>
  `;
  openModal({ title: `Bakiye Grafiği - ${cari.unvan}`, size: 'wide', bodyEl: body });
}

async function openCariHatirlatmalarModal(cari, onDone) {
  let list = await window.api.listHatirlatmalar(cari.id);
  let selectedId = null;

  const body = document.createElement('div');
  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  tableWrap.style.minHeight = '440px';
  tableWrap.style.maxHeight = '60vh';
  body.appendChild(tableWrap);

  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = 'display:flex; align-items:center; gap:10px; margin-top:14px;';
  body.appendChild(bottomBar);

  async function refresh() {
    list = await window.api.listHatirlatmalar(cari.id);
    draw();
    onDone && onDone();
  }

  async function odemeYap(r) {
    const yon = yonOf(r.tur);
    openOdemeTuru({ ...cari, pBirim: r.pBirim }, yon, () => withErrorToast(async () => {
      await window.api.tamamlaHatirlatma(r.id);
      await refresh();
    }));
  }

  async function silKayit(r) {
    const detail = `${fmtDate(r.vade)} - ${r.tur} - ${fmtMoney(r.tutar, r.pBirim)} - ${r.aciklama}`;
    const hasGroup = r.taksitSayisi > 1;
    const { confirmed, deleteGroup } = await confirmDeleteRich({
      title: 'Hatırlatma Sil',
      detailLine: detail,
      taksitCheckboxLabel: hasGroup ? 'Bu hatırlatma ile ilişkili tüm taksitleri sil' : null,
    });
    if (!confirmed) return;
    if (deleteGroup) {
      for (const x of list.filter((y) => y.grupId === r.grupId)) await window.api.deleteHatirlatma(x.id);
    } else {
      await window.api.deleteHatirlatma(r.id);
    }
    selectedId = null;
    toastSuccess('Hatırlatma silindi.');
    await refresh();
  }

  function ekleItems(close) {
    return [
      menuItem({ icon: 'plus', label: 'Tahsilat', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Tahsilat'); } }),
      menuItem({ icon: 'plus', label: 'Alınan Çek', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Alınan Çek'); } }),
      menuItem({ icon: 'plus', label: 'Alınan Senet', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Alınan Senet'); } }),
      menuDivider(),
      menuItem({ icon: 'minus', label: 'Ödeme', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Ödeme'); } }),
      menuItem({ icon: 'minus', label: 'Verilen Çek', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Verilen Çek'); } }),
      menuItem({ icon: 'minus', label: 'Verilen Senet', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cari.id, 'Verilen Senet'); } }),
    ];
  }

  function draw() {
    tableWrap.innerHTML = '';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Vade</th><th>Tür</th><th>Açıklama</th><th>Taksit</th><th>Durum</th><th style="text-align:right">Tutar</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    if (!list.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Kayıt bulunamadı</td></tr>`;

    for (const r of list) {
      const tr = document.createElement('tr');
      if (r.id === selectedId) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${fmtDate(r.vade)}</td><td>${isaretHtml(r)}${r.tur}</td><td>${escapeHtml(r.aciklama)}</td>
        <td>${r.taksitSayisi > 1 ? `${r.taksitNo} / ${r.taksitSayisi}` : '-'}</td>
        <td><span class="durum-text ${r.durumTip}">${r.durumMetni}</span></td>
        <td style="text-align:right" class="amount ${r.durumTip === 'tamam' ? 'pos' : ''}">${fmtMoney(r.tutar, r.pBirim)}</td>`;
      tr.onclick = () => { selectedId = r.id; draw(); };
      tr.oncontextmenu = (e) => {
        e.preventDefault();
        selectedId = r.id; draw();
        openContextMenu(e.clientX, e.clientY, (panel, close) => {
          panel.append(
            menuItem({ icon: 'transfer', label: 'Tahsilat / Ödeme', shortcut: 'Ctrl+O', onClick: () => { close(); withErrorToast(() => odemeYap(r)); } }),
            menuDivider(),
            menuItem({ icon: 'plus', label: 'Ekle', shortcut: 'Ctrl+E', onClick: () => {
              close();
              openContextMenu(e.clientX, e.clientY, (subPanel, subClose) => { subPanel.append(...ekleItems(subClose)); });
            } }),
            menuItem({ icon: 'swap', label: 'Değiştir', shortcut: 'Ctrl+D', onClick: () => { close(); openHatirlatmaForm(r, refresh, cari.id); } }),
            menuItem({ icon: 'close', label: 'Sil', shortcut: 'Ctrl+S', onClick: () => withErrorToast(() => silKayit(r)) }),
            menuDivider(),
            buildHatirlatmaIsaretleSubmenu(r, refresh, close),
          );
        });
      };
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    bottomBar.innerHTML = '';
    const ekleBtn = document.createElement('div');
    ekleBtn.className = 'icon-btn primary';
    ekleBtn.title = 'Ekle';
    ekleBtn.appendChild(iconEl('plus'));
    ekleBtn.onclick = () => openDropdown(ekleBtn, (panel, close) => {
      panel.append(...ekleItems(close));
    });

    const yenileBtn = document.createElement('div');
    yenileBtn.className = 'icon-btn';
    yenileBtn.title = 'Yenile';
    yenileBtn.appendChild(iconEl('refresh'));
    yenileBtn.onclick = () => refresh();

    const silBtn = document.createElement('div');
    silBtn.className = 'icon-btn';
    silBtn.title = 'Sil';
    silBtn.appendChild(iconEl('close'));
    silBtn.onclick = () => withErrorToast(async () => {
      const r = list.find((x) => x.id === selectedId);
      if (r) await silKayit(r);
    });

    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `${list.length} Kayıt`;

    const odemeBtn = btn('Tahsilat / Ödeme', 'primary', 'transfer');
    const secili = list.find((x) => x.id === selectedId);
    odemeBtn.disabled = !secili || secili.durumTip === 'tamam';
    odemeBtn.onclick = () => withErrorToast(async () => {
      if (!secili) return;
      await odemeYap(secili);
    });

    bottomBar.append(ekleBtn, yenileBtn, silBtn, spacer, count, odemeBtn);

    setShortcuts({
      'Ctrl+O': () => { const r = list.find((x) => x.id === selectedId); if (r) withErrorToast(() => odemeYap(r)); else toast('Önce bir hatırlatma seçin.'); },
      'Ctrl+E': () => openDropdown(ekleBtn, (panel, close) => { panel.append(...ekleItems(close)); }),
      'Ctrl+D': () => { const r = list.find((x) => x.id === selectedId); if (r) openHatirlatmaForm(r, refresh, cari.id); else toast('Önce bir hatırlatma seçin.'); },
      'Ctrl+S': () => withErrorToast(async () => {
        const r = list.find((x) => x.id === selectedId);
        if (r) await silKayit(r); else toast('Önce bir hatırlatma seçin.');
      }),
    }, { allowInModal: true });
  }

  openModal({ title: 'Hatırlatmalar', size: 'xwide', bodyEl: body });
  draw();
}

function openNotlar(cari, onSaved) {
  const body = document.createElement('div');
  const ta = field({ label: '', textarea: true, value: cari.notlar || '', placeholder: 'Bu cari hesap ile ilgili notunuzu yazın...' });
  ta.querySelector('label').remove();
  ta.input.style.minHeight = '180px';
  body.appendChild(ta);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    await window.api.setCariNot(cari.id, ta.input.value);
    toastSuccess('Not kaydedildi.');
    closeModal();
    onSaved();
  };
  footer.append(kapatBtn, spacer, onaylaBtn);

  openModal({ title: `Notlar - ${cari.unvan}`, bodyEl: body, footerEl: footer });
}

const ALACAK_FAMILY = ['Alacak', 'Açılış Alacak', 'Nakit Tahsilat', 'K.Kartı ile Tahsilat', 'Gelen Havale/EFT', 'Alınan Çek'];
function turIsNegative(tur) {
  return ALACAK_FAMILY.includes(tur);
}

function openHareketForm(cari, existing, onSaved, presetTur) {
  const isEdit = !!existing;
  const tur = existing?.tur || presetTur || 'Borç';
  const body = document.createElement('div');

  const tarihField = field({ label: 'Tarih', type: 'date', value: existing?.tarih || todayISO() });
  const saatField = field({ label: 'Saat', type: 'time', value: (existing?.saat || nowTimeHM()) });
  body.appendChild(row(tarihField, saatField));

  const islemNoField = field({ label: 'İşlem No', value: existing?.islemNo || '(otomatik)' });
  islemNoField.input.disabled = true;
  const ozelKodField = field({ label: 'Özel Kod', value: existing?.ozelKod || '' });
  body.appendChild(row(islemNoField, ozelKodField));

  const aciklamaField = field({ label: 'Açıklama', value: existing?.aciklama || '' });
  quickAddButton(aciklamaField, 'cariHareket');
  body.appendChild(row(aciklamaField));

  const miktarField = field({ label: 'Miktar', type: 'money', value: 1 });
  const birimFiyatField = field({ label: 'Birim Fiyat', type: 'money', value: 0 });
  const miktarRow = row(miktarField, birimFiyatField);
  miktarRow.style.display = 'none';
  body.appendChild(miktarRow);

  const tutarField = field({ label: 'İşlem Tutarı', type: 'money', value: existing ? Math.abs(existing.tutar) : 0 });
  body.appendChild(row(tutarField));

  const bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between;';
  let hatirlatmaField = null;
  if (!isEdit) {
    const hatirlatmaWrap = document.createElement('div');
    hatirlatmaWrap.className = 'checkbox-row';
    const hatirlatmaCheck = document.createElement('input');
    hatirlatmaCheck.type = 'checkbox';
    const hatirlatmaLabel = document.createElement('span');
    hatirlatmaLabel.textContent = 'Hatırlatma Ekle';
    hatirlatmaWrap.append(hatirlatmaCheck, hatirlatmaLabel);
    hatirlatmaField = hatirlatmaCheck;
    bottomRow.appendChild(hatirlatmaWrap);
  } else {
    bottomRow.appendChild(document.createElement('span'));
  }

  const toggleLink = document.createElement('div');
  toggleLink.style.cssText = 'color:var(--green); font-size:12.5px; cursor:pointer;';
  toggleLink.textContent = 'Miktar ve Birim Fiyat Göster';
  toggleLink.title = 'Göster / Gizle ( Ctrl+M )';
  let miktarAcik = false;
  function syncMiktarTutar() {
    const m = parseTRNumber(miktarField.input.value);
    const bf = parseTRNumber(birimFiyatField.input.value);
    tutarField.input.value = formatTRNumberInput(Math.round(m * bf * 100) / 100);
  }
  toggleLink.onclick = () => {
    miktarAcik = !miktarAcik;
    miktarRow.style.display = miktarAcik ? 'flex' : 'none';
    tutarField.input.disabled = miktarAcik;
    toggleLink.textContent = miktarAcik ? 'Miktar ve Birim Fiyat Gizle' : 'Miktar ve Birim Fiyat Göster';
    if (miktarAcik) syncMiktarTutar();
  };
  miktarField.input.addEventListener('input', syncMiktarTutar);
  birimFiyatField.input.addEventListener('input', syncMiktarTutar);
  bottomRow.appendChild(toggleLink);
  body.appendChild(bottomRow);

  let vadeField = null;
  if (!isEdit) {
    vadeField = field({ label: 'Vade Tarihi', type: 'date', value: todayISO() });
    const vadeRow = row(vadeField);
    vadeRow.style.display = 'none';
    body.appendChild(vadeRow);
    hatirlatmaField.addEventListener('change', () => {
      vadeRow.style.display = hatirlatmaField.checked ? 'flex' : 'none';
    });
  }

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const notlarBtn = document.createElement('div');
  notlarBtn.className = 'icon-btn';
  notlarBtn.title = 'Notlar';
  notlarBtn.appendChild(iconEl('note'));
  notlarBtn.onclick = () => openNotlar(cari, () => {});
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const yazdirBtn = document.createElement('div');
  yazdirBtn.className = 'icon-btn';
  yazdirBtn.title = 'Yazdır';
  yazdirBtn.appendChild(iconEl('print'));
  yazdirBtn.onclick = () => window.print();
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    const isNegative = turIsNegative(tur);
    const data = {
      tur, tarih: tarihField.input.value, saat: saatField.input.value ? saatField.input.value + ':00' : undefined,
      aciklama: aciklamaField.input.value,
      tutar: parseTRNumber(tutarField.input.value), pBirim: cari.pBirim, ozelKod: ozelKodField.input.value, isNegative,
    };
    if (isEdit) {
      await window.api.updateCariHareket(existing.id, data);
      toastSuccess('Hareket güncellendi.');
    } else {
      await window.api.addCariHareket(cari.id, data);
      if (hatirlatmaField && hatirlatmaField.checked) {
        await window.api.addHatirlatma({
          cariId: cari.id,
          tur: isNegative ? 'Verilen Senet' : 'Alınan Senet',
          aciklama: aciklamaField.input.value || tur,
          vade: vadeField.input.value, tutar: parseTRNumber(tutarField.input.value), pBirim: cari.pBirim,
        });
      }
      toastSuccess('Hareket eklendi.');
    }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, notlarBtn, spacer, yazdirBtn, onaylaBtn);

  const title = HAREKET_TURLERI.includes(tur) ? `${tur} Ekle` : (isEdit ? 'Hareket Düzenle' : 'Hareket Ekle');
  openModal({ title, bodyEl: body, footerEl: footer });
}

// =================== ODEME SIHIRBAZI ===================

function optionCard(iconName, label, selected) {
  const card = document.createElement('div');
  card.className = 'option-card' + (selected ? ' selected' : '');
  card.appendChild(iconEl(iconName));
  const span = document.createElement('span');
  span.className = 'label';
  span.textContent = label;
  card.appendChild(span);
  card.appendChild(iconEl('chevronRight', 'chev'));
  return card;
}

const ODEME_TURU_LABELS = {
  Tahsilat: { Nakit: 'Nakit Tahsilat', 'Kredi Kartı': 'Kredi Kartı ile Tahsilat', 'Havale/EFT': 'Gelen Havale / EFT' },
  Odeme: { Nakit: 'Nakit Ödeme', 'Kredi Kartı': 'Kredi Kartı ile Ödeme', 'Havale/EFT': 'Gönderilen Havale / EFT' },
};

export function openOdemeTuru(cari, yon, onDone) {
  const labels = ODEME_TURU_LABELS[yon];
  const types = [
    { key: 'Nakit', icon: 'cash' },
    { key: 'Kredi Kartı', icon: 'card' },
    { key: 'Havale/EFT', icon: 'transfer' },
  ];
  let selected = 'Nakit';

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';

  const cards = {};
  types.forEach((t) => {
    const card = optionCard(t.icon, labels[t.key], t.key === selected);
    card.onclick = () => {
      selected = t.key;
      types.forEach((o) => cards[o.key].classList.toggle('selected', o.key === selected));
    };
    card.ondblclick = () => {
      selected = t.key;
      closeModal();
      openOdemeDetay(cari, yon, selected, onDone);
    };
    cards[t.key] = card;
    body.appendChild(card);
  });

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const ileriBtn = btn('İleri', 'primary', 'arrowRight');
  ileriBtn.onclick = () => { closeModal(); openOdemeDetay(cari, yon, selected, onDone); };
  footer.append(kapatBtn, spacer, ileriBtn);

  openModal({ title: yon === 'Tahsilat' ? 'Tahsilat Türünü Seçiniz' : 'Ödeme Türünü Seçiniz', bodyEl: body, footerEl: footer });
}

async function openOdemeDetay(cari, yon, odemeTuru, onDone) {
  const [kasalar, bankalar] = await Promise.all([window.api.listKasalar(), window.api.listBankalar()]);
  const uygunKasalar = kasalar.filter((k) => k.pBirim === cari.pBirim);
  const uygunBankalar = bankalar.filter((b) => b.pBirim === cari.pBirim);
  const hesapTipi = odemeTuru === 'Nakit' ? 'Kasa' : 'Banka';

  const body = document.createElement('div');

  const tarihField = field({ label: 'Tarih', type: 'date', value: todayISO() });
  const saatField = field({ label: 'Saat', type: 'time', value: nowTimeHM() });
  body.appendChild(row(tarihField, saatField));

  const islemNoField = field({ label: 'İşlem No', value: '(otomatik)' });
  islemNoField.input.disabled = true;
  const ozelKodField = field({ label: 'Özel Kod', value: '' });
  body.appendChild(row(islemNoField, ozelKodField));

  let hesapField;
  if (hesapTipi === 'Kasa') {
    hesapField = field({ label: `${cari.pBirim} Kasa`, options: uygunKasalar.map((k) => ({ value: k.id, label: k.kasaAdi })) });
  } else {
    hesapField = field({ label: `${cari.pBirim} Banka`, options: uygunBankalar.map((b) => ({ value: b.id, label: `${b.bankaAdi} - ${b.hesapAdi}` })) });
  }
  body.appendChild(row(hesapField));

  const hatirlaWrap = document.createElement('div');
  hatirlaWrap.className = 'checkbox-row';
  const hatirlaCheck = document.createElement('input');
  hatirlaCheck.type = 'checkbox';
  const hatirlaLabel = document.createElement('span');
  hatirlaLabel.textContent = `Seçimi Hatırla`;
  const hatirlaHint = document.createElement('span');
  hatirlaHint.style.cssText = 'color:var(--text-faint); font-size:12px; margin-left:6px;';
  hatirlaHint.textContent = `Eğer seçili ise bu işlemi ${hesapTipi === 'Kasa' ? 'kasaya' : 'bankaya'} aktarır`;
  hatirlaWrap.append(hatirlaCheck, hatirlaLabel, hatirlaHint);
  body.appendChild(hatirlaWrap);

  const aciklamaField = field({ label: 'Açıklama', value: `${ODEME_TURU_LABELS[yon][odemeTuru]} ${yon === 'Tahsilat' ? 'Tahsilatı' : 'Ödemesi'}` });
  body.appendChild(row(aciklamaField));

  const tutarField = field({ label: 'İşlem Tutarı', type: 'money', value: 0 });
  body.appendChild(row(tutarField));

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.width = '100%';
  footer.style.gap = '10px';
  const geriBtn = btn('Geri', '', 'chevronLeft');
  geriBtn.onclick = () => { closeModal(); openOdemeTuru(cari, yon, onDone); };
  const notlarBtn = document.createElement('div');
  notlarBtn.className = 'icon-btn';
  notlarBtn.title = 'Notlar';
  notlarBtn.appendChild(iconEl('note'));
  notlarBtn.onclick = () => openNotlar(cari, () => {});
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const yazdirBtn = document.createElement('div');
  yazdirBtn.className = 'icon-btn';
  yazdirBtn.title = 'Yazdır';
  yazdirBtn.appendChild(iconEl('print'));
  yazdirBtn.onclick = () => window.print();
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    const tutar = parseTRNumber(tutarField.input.value);
    if (tutar <= 0) { toast('Lütfen geçerli bir tutar girin.'); return; }
    if (!hesapField.input.value) { toast(`Uygun ${hesapTipi === 'Kasa' ? 'kasa' : 'banka hesabı'} bulunamadı. Önce ${cari.pBirim} para biriminde bir hesap oluşturun.`); return; }
    await window.api.tahsilatOdeme(cari.id, {
      yon, odemeTuru, hesapTipi,
      hesapId: hesapField.input.value, tutar, aciklama: aciklamaField.input.value,
      tarih: tarihField.input.value, ozelKod: ozelKodField.input.value,
    });
    toastSuccess(yon === 'Tahsilat' ? 'Tahsilat kaydedildi.' : 'Ödeme kaydedildi.');
    closeModal();
    onDone();
  });
  footer.append(geriBtn, notlarBtn, spacer, yazdirBtn, onaylaBtn);

  openModal({ title: `${ODEME_TURU_LABELS[yon][odemeTuru]} Ekle`, bodyEl: body, footerEl: footer });
}
