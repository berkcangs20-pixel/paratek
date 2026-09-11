import { iconEl } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, withErrorToast, confirmDialog, field, row, btn, openContextMenu, menuItem, menuDivider } from '../ui.js';
import { fmtMoney, fmtDate, todayISO, parseTRNumber } from '../format.js';

const KATEGORILER = ['Demirbaş', 'Araç', 'Gayrimenkul', 'Makine', 'Diğer'];
const DURUMLAR = ['Aktif', 'Pasif', 'Satıldı'];
const PARA_BIRIMLERI = ['TL', 'USD', 'EUR'];

function durumTip(durum) {
  if (durum === 'Aktif') return 'tamam';
  if (durum === 'Satıldı') return 'gecikti';
  return 'bekliyor';
}

export async function renderVarliklar(container) {
  let varliklar = await window.api.listVarliklar();
  let selectedId = null;
  const filterState = { search: '', durum: 'Tümü', kategori: 'Tümü' };

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() { varliklar = await window.api.listVarliklar(); draw(); }

  function filtered() {
    return varliklar
      .filter((v) => !filterState.search || v.ad.toLowerCase().includes(filterState.search.toLowerCase()))
      .filter((v) => filterState.durum === 'Tümü' || v.durum === filterState.durum)
      .filter((v) => filterState.kategori === 'Tümü' || v.kategori === filterState.kategori);
  }

  function draw() {
    view.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('assets'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Varlıklarım';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const menuBtn = document.createElement('div');
    menuBtn.className = 'icon-btn primary';
    menuBtn.title = 'Toplamlar';
    menuBtn.appendChild(iconEl('calc'));
    menuBtn.onclick = showToplamlar;
    actions.appendChild(menuBtn);
    header.appendChild(actions);
    view.appendChild(header);

    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.appendChild(iconEl('search', 'lead'));
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Ad ile Hızlı Ara';
    searchInput.value = filterState.search;
    searchInput.oninput = () => { filterState.search = searchInput.value; drawTable(); drawBottom(); };
    searchBox.appendChild(searchInput);
    filterBar.appendChild(searchBox);
    filterBar.appendChild(selectFilter(['Tümü', ...DURUMLAR], filterState.durum, (v) => { filterState.durum = v; drawTable(); drawBottom(); }));
    filterBar.appendChild(selectFilter(['Tümü', ...KATEGORILER], filterState.kategori, (v) => { filterState.kategori = v; drawTable(); drawBottom(); }));
    view.appendChild(filterBar);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    view.appendChild(bottomBar);

    function drawTable() {
      tableWrap.innerHTML = '';
      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>Kod</th><th>Ad</th><th>Kategori</th><th>Durum</th><th>Alış Tarihi</th><th style="text-align:right">Değer</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      const rows = filtered();
      if (!rows.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Kayıt bulunamadı</td></tr>`;
      for (const v of rows) {
        const tr = document.createElement('tr');
        if (v.id === selectedId) tr.classList.add('selected');
        const deger = v.durum === 'Satıldı' ? (v.satisDegeri || 0) : v.guncelDeger;
        tr.innerHTML = `
          <td>${v.kod}</td>
          <td>${escapeHtml(v.ad)}</td>
          <td>${v.kategori}</td>
          <td><span class="status-pill ${durumTip(v.durum)}">${v.durum}</span></td>
          <td>${fmtDate(v.alisTarihi)}</td>
          <td style="text-align:right" class="amount pos">${fmtMoney(deger, v.pBirim)}</td>
        `;
        tr.onclick = () => { selectedId = v.id; drawTable(); drawBottom(); };
        tr.oncontextmenu = (e) => {
          e.preventDefault();
          selectedId = v.id; drawTable(); drawBottom();
          openContextMenu(e.clientX, e.clientY, (panel, close) => {
            panel.append(
              menuItem({ icon: 'swap', label: 'Değiştir', onClick: () => { close(); openVarlikForm(v, refresh); } }),
              menuDivider(),
              menuItem({ icon: 'close', label: 'Sil', onClick: () => withErrorToast(async () => {
                close();
                const ok = await confirmDialog(`"${v.ad}" varlığını silmek istediğinize emin misiniz?`);
                if (ok) { await window.api.deleteVarlik(v.id); selectedId = null; toast('Varlık silindi.'); await refresh(); }
              }) }),
            );
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
      ekleBtn.onclick = () => openVarlikForm(null, refresh);

      const degistirBtn = btn('Değiştir', '', 'swap');
      degistirBtn.disabled = !selectedId;
      degistirBtn.onclick = () => {
        const v = varliklar.find((x) => x.id === selectedId);
        if (v) openVarlikForm(v, refresh);
      };

      const silBtn = btn('Sil', 'danger', 'close');
      silBtn.disabled = !selectedId;
      silBtn.onclick = () => withErrorToast(async () => {
        const v = varliklar.find((x) => x.id === selectedId);
        if (!v) return;
        const ok = await confirmDialog(`"${v.ad}" varlığını silmek istediğinize emin misiniz?`);
        if (ok) { await window.api.deleteVarlik(v.id); selectedId = null; toast('Varlık silindi.'); await refresh(); }
      });

      const spacer = document.createElement('div');
      spacer.className = 'spacer';
      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = `${filtered().length} / ${varliklar.length}`;

      bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count);
    }

    drawTable();
    drawBottom();
  }

  async function showToplamlar() {
    const totals = await window.api.varlikToplamlar();
    const body = document.createElement('div');
    body.className = 'totals-list';
    const currencies = Object.keys(totals);
    if (!currencies.length) body.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:20px;">Kayıt yok</div>`;
    currencies.forEach((cur) => {
      const t = totals[cur];
      body.innerHTML += `
        <div class="totals-row section">${cur}</div>
        <div class="totals-row"><span>Aktif Varlıklar</span><b>${fmtMoney(t.aktif, cur)}</b></div>
        <div class="totals-row"><span>Pasif Varlıklar</span><b>${fmtMoney(t.pasif, cur)}</b></div>
        <div class="totals-row"><span>Satılan Varlık Sayısı</span><b>${t.satildi}</b></div>
        <div class="totals-row"><span>Satıştan Elde Edilen</span><b>${fmtMoney(t.satisGeliri, cur)}</b></div>
        <div class="totals-row grand"><span>Toplam Varlık Değeri</span><b>${fmtMoney(t.toplamDeger, cur)}</b></div>
      `;
    });
    openModal({ title: 'Varlık Toplamları', bodyEl: body });
  }

  draw();
}

function selectFilter(options, value, onChange) {
  const box = document.createElement('div');
  box.className = 'select-box';
  box.appendChild(iconEl('filter', 'lead'));
  const select = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt; o.textContent = opt;
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

function openVarlikForm(existing, onSaved) {
  const isEdit = !!existing;
  const body = document.createElement('div');

  const kodField = field({ label: 'Kod', value: isEdit ? existing.kod : '(otomatik)' });
  kodField.input.disabled = true;
  const adField = field({ label: 'Ad', value: existing?.ad || '' });
  body.appendChild(row(kodField, adField));

  const kategoriField = field({ label: 'Kategori', options: KATEGORILER, value: existing?.kategori || KATEGORILER[0] });
  const durumField = field({ label: 'Durum', options: DURUMLAR, value: existing?.durum || 'Aktif' });
  body.appendChild(row(kategoriField, durumField));

  const alisTarihiField = field({ label: 'Alış Tarihi', type: 'date', value: existing?.alisTarihi || todayISO() });
  const alisDegeriField = field({ label: 'Alış Değeri', type: 'money', value: existing?.alisDegeri || 0 });
  body.appendChild(row(alisTarihiField, alisDegeriField));

  const guncelDegerField = field({ label: 'Güncel Değer', type: 'money', value: existing?.guncelDeger ?? existing?.alisDegeri ?? 0 });
  const pBirimField = field({ label: 'P.Birim', options: PARA_BIRIMLERI, value: existing?.pBirim || 'TL' });
  body.appendChild(row(guncelDegerField, pBirimField));

  const satisWrap = document.createElement('div');
  const satisTarihiField = field({ label: 'Satış Tarihi', type: 'date', value: existing?.satisTarihi || todayISO() });
  const satisDegeriField = field({ label: 'Satış Değeri', type: 'money', value: existing?.satisDegeri || 0 });
  satisWrap.appendChild(row(satisTarihiField, satisDegeriField));
  body.appendChild(satisWrap);

  function toggleSatis() {
    satisWrap.style.display = durumField.input.value === 'Satıldı' ? 'block' : 'none';
  }
  durumField.input.addEventListener('change', toggleSatis);
  toggleSatis();

  const aciklamaField = field({ label: 'Açıklama', value: existing?.aciklama || '' });
  body.appendChild(row(aciklamaField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    if (!adField.input.value.trim()) { toast('Ad alanı zorunludur.'); return; }
    const data = {
      ad: adField.input.value.trim(), kategori: kategoriField.input.value, durum: durumField.input.value,
      alisTarihi: alisTarihiField.input.value, alisDegeri: parseTRNumber(alisDegeriField.input.value),
      guncelDeger: parseTRNumber(guncelDegerField.input.value), pBirim: pBirimField.input.value,
      aciklama: aciklamaField.input.value,
      satisTarihi: durumField.input.value === 'Satıldı' ? satisTarihiField.input.value : null,
      satisDegeri: durumField.input.value === 'Satıldı' ? parseTRNumber(satisDegeriField.input.value) : null,
    };
    if (isEdit) { await window.api.updateVarlik(existing.id, data); toastSuccess('Varlık güncellendi.'); }
    else { await window.api.addVarlik(data); toastSuccess('Varlık eklendi.'); }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);

  openModal({ title: isEdit ? 'Varlık Kart' : 'Varlık Ekle', bodyEl: body, footerEl: footer });
}
