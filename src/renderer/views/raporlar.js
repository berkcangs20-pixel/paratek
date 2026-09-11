import { iconEl } from '../icons.js';
import { openModal, field, btn } from '../ui.js';
import { fmtMoney, fmtDate, todayISO } from '../format.js';

const DONEM_SECENEKLERI = ['Bugün', 'Bu Hafta', 'Bu Ay', 'Bu Yıl', 'Tümü'];
const KATEGORILER = ['Tümü', 'Müşteri', 'Tedarikçi', 'Personel'];

function donemAraligi(donem) {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (donem === 'Bugün') return { baslangic: iso(now), bitis: iso(now) };
  if (donem === 'Bu Hafta') {
    const d = new Date(now);
    const gun = (d.getDay() + 6) % 7; // pazartesi=0
    d.setDate(d.getDate() - gun);
    return { baslangic: iso(d), bitis: iso(now) };
  }
  if (donem === 'Bu Ay') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { baslangic: iso(d), bitis: iso(now) };
  }
  if (donem === 'Bu Yıl') {
    const d = new Date(now.getFullYear(), 0, 1);
    return { baslangic: iso(d), bitis: iso(now) };
  }
  return { baslangic: null, bitis: null };
}

export async function renderRaporlar(container) {
  const filterState = { donem: 'Tümü', kategori: 'Tümü' };
  let rows = [];
  let selectedIdx = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function load() {
    const { baslangic, bitis } = donemAraligi(filterState.donem);
    rows = await window.api.rapor({ baslangic, bitis, kategori: filterState.kategori });
  }

  function draw() {
    view.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('raporlar'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Raporlar';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);
    view.appendChild(header);

    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    filterBar.appendChild(selectFilter(DONEM_SECENEKLERI, filterState.donem, async (v) => { filterState.donem = v; await load(); drawTable(); }));
    filterBar.appendChild(selectFilter(KATEGORILER, filterState.kategori, async (v) => { filterState.kategori = v; await load(); drawTable(); }));
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
      table.innerHTML = `<thead><tr><th>Tarih</th><th>Tür</th><th>Unvan</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      if (!rows.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Kayıt bulunamadı</td></tr>`;
      rows.forEach((r, idx) => {
        const tr = document.createElement('tr');
        if (idx === selectedIdx) tr.classList.add('selected');
        tr.innerHTML = `
          <td>${fmtDate(r.tarih)}</td><td>${r.tur}</td><td>${r.unvan}</td>
          <td style="text-align:right" class="amount ${r.borc ? 'pos' : ''}">${r.borc ? fmtMoney(r.borc, r.pBirim) : '-'}</td>
          <td style="text-align:right" class="amount ${r.alacak ? 'neg' : ''}">${r.alacak ? fmtMoney(r.alacak, r.pBirim) : '-'}</td>`;
        tr.onclick = () => { selectedIdx = idx; drawTable(); drawBottom(); };
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    function drawBottom() {
      bottomBar.innerHTML = '';
      const detayBtn = btn('İşlem Detayı', '', 'search');
      detayBtn.disabled = selectedIdx === null;
      detayBtn.onclick = () => {
        const r = rows[selectedIdx];
        const body = document.createElement('div');
        body.innerHTML = `
          <div class="totals-list">
            <div class="totals-row"><span>Tarih</span><b>${fmtDate(r.tarih)}</b></div>
            <div class="totals-row"><span>Tür</span><b>${r.tur}</b></div>
            <div class="totals-row"><span>Unvan</span><b>${r.unvan}</b></div>
            <div class="totals-row"><span>Açıklama</span><b>${r.aciklama || '-'}</b></div>
            <div class="totals-row"><span>Borç</span><b>${fmtMoney(r.borc, r.pBirim)}</b></div>
            <div class="totals-row"><span>Alacak</span><b>${fmtMoney(r.alacak, r.pBirim)}</b></div>
          </div>`;
        openModal({ title: 'İşlem Detayı', size: 'narrow', bodyEl: body });
      };

      const spacer = document.createElement('div');
      spacer.className = 'spacer';
      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = `${rows.length} Kayıt`;

      const topluBtn = btn('Listeyi Topla', 'primary', 'calc');
      topluBtn.onclick = () => {
        const byCurrency = {};
        for (const r of rows) {
          if (!byCurrency[r.pBirim]) byCurrency[r.pBirim] = { borc: 0, alacak: 0 };
          byCurrency[r.pBirim].borc += r.borc;
          byCurrency[r.pBirim].alacak += r.alacak;
        }
        const body = document.createElement('div');
        body.className = 'totals-list';
        const currencies = Object.keys(byCurrency);
        if (!currencies.length) body.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:20px;">Kayıt yok</div>`;
        currencies.forEach((cur) => {
          const t = byCurrency[cur];
          body.innerHTML += `
            <div class="totals-row section">${cur}</div>
            <div class="totals-row"><span>Toplam Borç</span><b>${fmtMoney(t.borc, cur)}</b></div>
            <div class="totals-row"><span>Toplam Alacak</span><b>${fmtMoney(t.alacak, cur)}</b></div>
            <div class="totals-row grand"><span>Fark</span><b>${fmtMoney(t.borc - t.alacak, cur)}</b></div>`;
        });
        openModal({ title: 'Liste Toplamı', bodyEl: body });
      };

      bottomBar.append(detayBtn, spacer, count, topluBtn);
    }

    drawTable();
    drawBottom();
  }

  await load();
  draw();
}

function selectFilter(options, value, onChange) {
  const box = document.createElement('div');
  box.className = 'select-box';
  box.appendChild(iconEl('filter', 'lead'));
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
